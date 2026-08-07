import {
  isAllowedRiderMime,
  isAllowedRiderSize,
  sanitizeRiderFilename,
} from "@/src/domain/rider";

export const PROFILE_DOCUMENT_MAX = 5;
export const PROFILE_DOCUMENT_TITLE_MIN = 1;
export const PROFILE_DOCUMENT_TITLE_MAX = 120;

export type ProfileDocumentVisibility = "marketplace" | "engagement";

export const PROFILE_DOCUMENT_VISIBILITIES = [
  "marketplace",
  "engagement",
] as const satisfies readonly ProfileDocumentVisibility[];

export type ProfileDocumentAccessContext = {
  isOwner: boolean;
  isStaff: boolean;
  /** Opposite-role discovery viewer of an approved profile. */
  canSeeMarketplace: boolean;
  /** Shared booking in shortlisted…confirmed with endsAt not past (or no endsAt yet). */
  canSeeEngagement: boolean;
};

/** XOR owner for rider_files / document ACL (entertainer profile XOR venue). */
export type DocumentOwnerRef =
  | { kind: "entertainer"; entertainerProfileId: string }
  | { kind: "venue"; venueId: string };

/**
 * Resolve document owner from XOR ids.
 *
 *   entertainerProfileId ──┐
 *                          ├── exactly one set → owner ref
 *   venueId ───────────────┘
 *   both or neither → null (invalid / unowned)
 */
export function resolveDocumentOwnerFromIds(input: {
  entertainerProfileId?: string | null;
  venueId?: string | null;
}): DocumentOwnerRef | null {
  const entertainerProfileId = input.entertainerProfileId?.trim() || null;
  const venueId = input.venueId?.trim() || null;
  if (Boolean(entertainerProfileId) === Boolean(venueId)) return null;
  if (entertainerProfileId) {
    return { kind: "entertainer", entertainerProfileId };
  }
  return { kind: "venue", venueId: venueId! };
}

/** Pure flags for marketplace/engagement visibility (after async engagement resolved). */
export function computeDocumentAccessFlags(input: {
  isOwner: boolean;
  isStaff: boolean;
  publicationState: string;
  canDiscoverMarketplace: boolean;
  hasOpenEngagement: boolean;
}): ProfileDocumentAccessContext {
  const approved = input.publicationState === "approved";
  const canSeeMarketplace =
    input.isOwner ||
    input.isStaff ||
    (input.canDiscoverMarketplace && approved);
  const canSeeEngagement =
    input.isOwner || input.isStaff || input.hasOpenEngagement;
  return {
    isOwner: input.isOwner,
    isStaff: input.isStaff,
    canSeeMarketplace,
    canSeeEngagement,
  };
}

export type ProfileDocumentListItem = {
  id: string;
  visibility: ProfileDocumentVisibility;
  title: string;
  sortOrder: number;
  originalFilename: string | null;
  sizeBytes: number;
  createdAt: Date;
};

/** Booking states that unlock engagement-only documents until the gig ends. */
export const DOCUMENT_ENGAGEMENT_BOOKING_STATES = [
  "shortlisted",
  "accepted",
  "terms_agreed",
  "agreement_generated",
  "partially_signed",
  "confirmed",
] as const;

/** Pending states where an open offer may expose the sender’s engagement docs. */
export const DOCUMENT_PENDING_OFFER_BOOKING_STATES = [
  "applied",
  "requested",
] as const;

export function normalizeDocumentTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, PROFILE_DOCUMENT_TITLE_MAX);
}

export function validateProfileDocumentUpload(input: {
  title: string;
  visibility: string;
  mimeType: string;
  sizeBytes: number;
}):
  | { ok: true; title: string; visibility: ProfileDocumentVisibility }
  | {
      ok: false;
      reason: string;
    } {
  // Empty title is allowed on upload; the editor shows originalFilename as placeholder.
  const title = normalizeDocumentTitle(input.title);
  if (
    !(PROFILE_DOCUMENT_VISIBILITIES as readonly string[]).includes(
      input.visibility,
    )
  ) {
    return { ok: false, reason: "Invalid document visibility" };
  }
  if (!isAllowedRiderMime(input.mimeType)) {
    return { ok: false, reason: "Only PDF documents are allowed" };
  }
  if (!isAllowedRiderSize(input.sizeBytes)) {
    return { ok: false, reason: "Document exceeds 10MB limit" };
  }
  return {
    ok: true,
    title,
    visibility: input.visibility as ProfileDocumentVisibility,
  };
}

/** Derive a default title from an uploaded PDF filename. */
export function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() ?? "document.pdf";
  const withoutExt = base.replace(/\.pdf$/i, "").trim();
  return normalizeDocumentTitle(withoutExt || "PDF document");
}

export function canViewDocumentVisibility(
  visibility: ProfileDocumentVisibility,
  ctx: ProfileDocumentAccessContext,
): boolean {
  if (ctx.isOwner || ctx.isStaff) return true;
  if (visibility === "marketplace") return ctx.canSeeMarketplace;
  return ctx.canSeeEngagement;
}

export function filterDocumentsForViewer<T extends { visibility: string }>(
  docs: T[],
  ctx: ProfileDocumentAccessContext,
): T[] {
  return docs.filter((doc) =>
    canViewDocumentVisibility(doc.visibility as ProfileDocumentVisibility, ctx),
  );
}

/**
 * Pure engagement-window check: active if no endsAt yet, or endsAt is still in the future.
 */
export function isEngagementWindowOpen(input: {
  now: Date;
  endsAt: Date | null;
}): boolean {
  if (!input.endsAt) return true;
  return input.endsAt.getTime() > input.now.getTime();
}

export function filenameFromTitle(title: string): string {
  const base = sanitizeRiderFilename(`${title}.pdf`);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}
