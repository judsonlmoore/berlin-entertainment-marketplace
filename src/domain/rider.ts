export const RIDER_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const RIDER_MAX_BYTES = 10 * 1024 * 1024;

export type RiderScanStatus =
  "pending" | "awaiting_blob" | "clean" | "rejected" | "quarantined";

export function isAllowedRiderMime(mimeType: string): boolean {
  return (RIDER_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isAllowedRiderSize(sizeBytes: number): boolean {
  return (
    Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= RIDER_MAX_BYTES
  );
}

export function validateRiderUploadInput(input: {
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedRiderMime(input.mimeType)) {
    return { ok: false, reason: "Only PDF riders are allowed" };
  }
  if (!isAllowedRiderSize(input.sizeBytes)) {
    return { ok: false, reason: "Rider exceeds 10MB limit" };
  }
  if (!/^[a-f0-9]{64}$/i.test(input.checksum)) {
    return { ok: false, reason: "Checksum must be sha256 hex" };
  }
  return { ok: true };
}

/** Never expose permanent public Blob URLs from rider metadata. */
export function isPrivateRiderKey(blobKey: string): boolean {
  return (
    blobKey.startsWith("sandbox/") ||
    blobKey.startsWith("pending/") ||
    blobKey.startsWith("blob:")
  );
}
