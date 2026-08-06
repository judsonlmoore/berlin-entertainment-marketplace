import { put, del, get } from "@vercel/blob";
import { AppError } from "@/src/domain/errors";

export const PRIVATE_BLOB_PREFIX = "blob/";

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export type PrivateBlobBytes = {
  mimeType: string;
  bytes: Uint8Array;
};

/**
 * Store bytes in private Vercel Blob. Returns a keyed handle `blob:<url>`.
 */
export async function putPrivateBlob(input: {
  pathname: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ blobKey: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new AppError(
      "integration_unconfigured",
      "BLOB_READ_WRITE_TOKEN is required for private Blob storage",
    );
  }
  const result = await put(input.pathname, Buffer.from(input.bytes), {
    access: "private",
    contentType: input.mimeType,
    token,
  });
  return { blobKey: `${PRIVATE_BLOB_PREFIX}${result.url}` };
}

export async function getPrivateBlob(
  blobKey: string,
): Promise<PrivateBlobBytes | null> {
  if (!blobKey.startsWith(PRIVATE_BLOB_PREFIX)) return null;
  const raw = blobKey.slice(PRIVATE_BLOB_PREFIX.length);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  let urlOrPath: string;
  try {
    const parsed = new URL(raw);
    parsed.search = "";
    urlOrPath = parsed.toString();
  } catch {
    urlOrPath = raw.split("?")[0] ?? raw;
  }

  try {
    const result = await get(urlOrPath, { access: "private", token });
    if (!result) return null;
    const mimeType = result.blob.contentType ?? "application/octet-stream";
    const buffer = await new Response(result.stream).arrayBuffer();
    return { mimeType, bytes: new Uint8Array(buffer) };
  } catch {
    try {
      const pathname = new URL(urlOrPath).pathname.replace(/^\//, "");
      const result = await get(pathname, { access: "private", token });
      if (!result) return null;
      const mimeType = result.blob.contentType ?? "application/octet-stream";
      const buffer = await new Response(result.stream).arrayBuffer();
      return { mimeType, bytes: new Uint8Array(buffer) };
    } catch {
      return null;
    }
  }
}

export async function deletePrivateBlob(blobKey: string): Promise<void> {
  if (!blobKey.startsWith(PRIVATE_BLOB_PREFIX)) return;
  const url = blobKey.slice(PRIVATE_BLOB_PREFIX.length);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  try {
    await del(url, { token });
  } catch {
    // best-effort
  }
}

export function isPrivateBlobKey(blobKey: string): boolean {
  return blobKey.startsWith(PRIVATE_BLOB_PREFIX);
}
