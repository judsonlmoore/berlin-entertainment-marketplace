import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/src/domain/errors";
import {
  deletePrivateBlob,
  getPrivateBlob,
  hasBlobToken,
  isPrivateBlobKey,
  putPrivateBlob,
} from "@/src/integrations/private-blob";

const LOCAL_PREFIX = "local-doc/";

function localRoot(): string {
  return path.join(process.cwd(), ".data", "documents");
}

function allowsLocalDisk(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isDocumentStoreConfigured(): boolean {
  return hasBlobToken() || allowsLocalDisk();
}

function safeKeyToPath(blobKey: string): string | null {
  if (!blobKey.startsWith(LOCAL_PREFIX)) return null;
  const relative = blobKey.slice(LOCAL_PREFIX.length);
  if (
    !relative ||
    relative.includes("..") ||
    path.isAbsolute(relative) ||
    relative.includes("\0")
  ) {
    return null;
  }
  return path.join(localRoot(), relative);
}

export async function saveDocumentFile(input: {
  ownerUserId: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ blobKey: string }> {
  if (hasBlobToken()) {
    const id = randomUUID();
    const pathname = `documents/${input.ownerUserId}/${id}.pdf`;
    return putPrivateBlob({
      pathname,
      mimeType: input.mimeType,
      bytes: input.bytes,
    });
  }
  if (!allowsLocalDisk()) {
    throw new AppError(
      "integration_unconfigured",
      "Document storage is not configured for production. Set BLOB_READ_WRITE_TOKEN.",
    );
  }
  const id = randomUUID();
  const relative = path.join(input.ownerUserId, `${id}.pdf`);
  const blobKey = `${LOCAL_PREFIX}${relative.split(path.sep).join("/")}`;
  const filePath = path.join(localRoot(), relative);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.bytes);
  await writeFile(
    `${filePath}.meta.json`,
    JSON.stringify({ mimeType: input.mimeType }),
    "utf8",
  );
  return { blobKey };
}

export async function loadDocumentFile(
  blobKey: string,
): Promise<{ mimeType: string; bytes: Uint8Array } | null> {
  if (isPrivateBlobKey(blobKey)) {
    return getPrivateBlob(blobKey);
  }
  if (!allowsLocalDisk() && blobKey.startsWith(LOCAL_PREFIX)) {
    return null;
  }
  const filePath = safeKeyToPath(blobKey);
  if (!filePath) return null;
  try {
    const [bytes, metaRaw] = await Promise.all([
      readFile(filePath),
      readFile(`${filePath}.meta.json`, "utf8").catch(() => null),
    ]);
    let mimeType = "application/pdf";
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as { mimeType?: string };
        if (meta.mimeType) mimeType = meta.mimeType;
      } catch {
        // fall through
      }
    }
    return { mimeType, bytes: new Uint8Array(bytes) };
  } catch {
    return null;
  }
}

export async function deleteDocumentFile(blobKey: string): Promise<void> {
  if (isPrivateBlobKey(blobKey)) {
    await deletePrivateBlob(blobKey);
    return;
  }
  const filePath = safeKeyToPath(blobKey);
  if (!filePath) return;
  await Promise.allSettled([unlink(filePath), unlink(`${filePath}.meta.json`)]);
}
