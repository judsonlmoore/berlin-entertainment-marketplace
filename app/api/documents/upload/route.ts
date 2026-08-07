import { auth } from "@/src/auth";
import { getDb } from "@/src/db/client";
import {
  auditEvents,
  bookings,
  entertainerProfiles,
  riderFiles,
  venues,
} from "@/src/db/schema/marketplace";
import { can } from "@/src/domain/permissions";
import {
  PROFILE_DOCUMENT_MAX,
  titleFromFilename,
  validateProfileDocumentUpload,
} from "@/src/domain/profile-document";
import { sanitizeRiderFilename } from "@/src/domain/rider";
import {
  deleteDocumentFile,
  isDocumentStoreConfigured,
  saveDocumentFile,
} from "@/src/integrations/document-file-store";
import { resolveEffectiveActor } from "@/src/lib/effective-actor";
import { and, count, eq, isNull, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

class DocumentLimitError extends Error {
  constructor() {
    super("document_limit");
    this.name = "DocumentLimitError";
  }
}

type DocumentOwner =
  | {
      kind: "entertainer";
      lockId: string;
      ownerFilter: SQL;
      insert: {
        entertainerProfileId: string;
        bookingId?: string;
      };
    }
  | {
      kind: "venue";
      lockId: string;
      ownerFilter: SQL;
      insert: {
        venueId: string;
        bookingId?: string;
      };
    };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!isDocumentStoreConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "blob_unconfigured",
        message:
          "Document storage is not configured. Set BLOB_READ_WRITE_TOKEN (or use local disk in development).",
      },
      { status: 503 },
    );
  }

  const resolved = await resolveEffectiveActor(session.user.id);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }
  const { actor, auditUserId } = resolved;

  const form = await request.formData();
  const entertainerProfileIdRaw = String(
    form.get("entertainerProfileId") ?? "",
  ).trim();
  const venueIdRaw = String(form.get("venueId") ?? "").trim();
  const bookingIdRaw = String(form.get("bookingId") ?? "").trim();
  const rawTitle = String(form.get("title") ?? "");
  const visibility = String(form.get("visibility") ?? "engagement");
  const locale = String(form.get("locale") ?? "en");
  const file = form.get("file");

  const hasProfile = Boolean(entertainerProfileIdRaw);
  const hasVenue = Boolean(venueIdRaw);
  if (hasProfile === hasVenue) {
    return NextResponse.json(
      { ok: false, error: "owner_required" },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "file_required" },
      { status: 400 },
    );
  }

  const originalFilename = sanitizeRiderFilename(file.name);
  const check = validateProfileDocumentUpload({
    title: rawTitle.trim(),
    visibility,
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
  });
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: check.reason },
      { status: 400 },
    );
  }

  const db = getDb();
  let owner: DocumentOwner;
  let bookingId: string | undefined;

  if (bookingIdRaw) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingIdRaw),
      columns: {
        id: true,
        venueId: true,
        entertainerProfileId: true,
      },
    });
    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "booking_not_found" },
        { status: 404 },
      );
    }

    if (hasProfile) {
      if (entertainerProfileIdRaw !== booking.entertainerProfileId) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      const profile = await db.query.entertainerProfiles.findFirst({
        where: eq(entertainerProfiles.id, entertainerProfileIdRaw),
      });
      if (!profile || profile.userId !== actor.userId) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      bookingId = booking.id;
      owner = {
        kind: "entertainer",
        lockId: booking.id,
        ownerFilter: eq(riderFiles.bookingId, booking.id),
        insert: {
          entertainerProfileId: profile.id,
          bookingId: booking.id,
        },
      };
    } else {
      if (venueIdRaw !== booking.venueId) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      if (!can(actor, "venue.manage", { venueId: venueIdRaw })) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
      bookingId = booking.id;
      owner = {
        kind: "venue",
        lockId: booking.id,
        ownerFilter: eq(riderFiles.bookingId, booking.id),
        insert: {
          venueId: venueIdRaw,
          bookingId: booking.id,
        },
      };
    }
  } else if (hasProfile) {
    if (!can(actor, "entertainer.manage_own_profile")) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    const profile = await db.query.entertainerProfiles.findFirst({
      where: eq(entertainerProfiles.id, entertainerProfileIdRaw),
    });
    if (!profile || profile.userId !== actor.userId) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    owner = {
      kind: "entertainer",
      lockId: profile.id,
      ownerFilter: and(
        eq(riderFiles.entertainerProfileId, profile.id),
        isNull(riderFiles.bookingId),
      )!,
      insert: { entertainerProfileId: profile.id },
    };
  } else {
    if (!can(actor, "venue.manage", { venueId: venueIdRaw })) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    owner = {
      kind: "venue",
      lockId: venueIdRaw,
      ownerFilter: and(
        eq(riderFiles.venueId, venueIdRaw),
        isNull(riderFiles.bookingId),
      )!,
      insert: { venueId: venueIdRaw },
    };
  }

  const title = check.title || titleFromFilename(originalFilename);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/pdf";

  let storedBlobKey: string | null = null;
  try {
    const stored = await saveDocumentFile({
      ownerUserId: actor.userId,
      mimeType,
      bytes,
    });
    storedBlobKey = stored.blobKey;

    const created = await db.transaction(async (tx) => {
      if (bookingId) {
        await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.id, bookingId))
          .for("update");
      } else if (owner.kind === "entertainer") {
        await tx
          .select({ id: entertainerProfiles.id })
          .from(entertainerProfiles)
          .where(eq(entertainerProfiles.id, owner.lockId))
          .for("update");
      } else {
        await tx
          .select({ id: venues.id })
          .from(venues)
          .where(eq(venues.id, owner.lockId))
          .for("update");
      }

      const [docCount] = await tx
        .select({ value: count() })
        .from(riderFiles)
        .where(owner.ownerFilter);
      if ((docCount?.value ?? 0) >= PROFILE_DOCUMENT_MAX) {
        throw new DocumentLimitError();
      }

      const [maxSort] = await tx
        .select({
          value: sql<number>`coalesce(max(${riderFiles.sortOrder}), -1)`,
        })
        .from(riderFiles)
        .where(owner.ownerFilter);
      const nextSort = Number(maxSort?.value ?? -1) + 1;

      const [row] = await tx
        .insert(riderFiles)
        .values({
          ownerUserId: actor.userId,
          ...owner.insert,
          blobKey: stored.blobKey,
          title,
          visibility: check.visibility,
          sortOrder: nextSort,
          originalFilename,
          mimeType,
          sizeBytes: file.size,
          checksum: "0".repeat(64),
          scanStatus: "clean",
        })
        .returning();

      if (!row) {
        throw new Error("create_failed");
      }

      await tx.insert(auditEvents).values({
        actorUserId: auditUserId,
        action: bookingId
          ? "booking_document.uploaded"
          : "profile_document.uploaded",
        subjectType: "rider_file",
        subjectId: row.id,
        metadata: {
          title: row.title,
          visibility: row.visibility,
          sizeBytes: row.sizeBytes,
          ...(bookingId ? { bookingId } : {}),
        },
      });

      return row;
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      title: created.title,
      originalFilename: created.originalFilename,
      visibility: created.visibility,
      sortOrder: created.sortOrder,
      sizeBytes: created.sizeBytes,
      locale,
      ...(bookingId ? { bookingId } : {}),
    });
  } catch (error) {
    if (storedBlobKey) {
      try {
        await deleteDocumentFile(storedBlobKey);
      } catch {
        // best-effort orphan cleanup
      }
    }
    if (error instanceof DocumentLimitError) {
      return NextResponse.json(
        { ok: false, error: "document_limit" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "create_failed" },
      { status: 500 },
    );
  }
}
