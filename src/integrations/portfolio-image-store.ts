import { put, del, get } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deletePortfolioImageBytes,
  getPortfolioImageBytes,
  putPortfolioImageBytes,
} from "@/src/integrations/portfolio-image-memory";
import { AppError } from "@/src/domain/errors";

export type PortfolioImageBytes = {
  mimeType: string;
  bytes: Uint8Array;
};

const LOCAL_PREFIX = "local/";
const MEMORY_PREFIX = "memory/";
const BLOB_PREFIX = "blob/";

function localRoot(): string {
  return path.join(process.cwd(), ".data", "portfolio");
}

function allowsLocalDisk(): boolean {
  return process.env.NODE_ENV !== "production";
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Durable portfolio storage available: local disk in non-production, or
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 */
export function isPortfolioDurableStoreAvailable(): boolean {
  return allowsLocalDisk() || hasBlobToken();
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

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function saveToLocalDisk(input: {
  ownerUserId: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ blobKey: string }> {
  const id = randomUUID();
  const ext = extensionForMime(input.mimeType);
  const relative = path.join(input.ownerUserId, `${id}.${ext}`);
  const blobKey = `${LOCAL_PREFIX}${relative.split(path.sep).join("/")}`;
  const filePath = path.join(localRoot(), relative);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.bytes);
  await writeFile(
    `${filePath}.meta.json`,
    JSON.stringify({ mimeType: input.mimeType }),
    "utf8",
  );
  putPortfolioImageBytes(blobKey, input.mimeType, input.bytes);
  return { blobKey };
}

async function saveToVercelBlob(input: {
  ownerUserId: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ blobKey: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new AppError(
      "integration_unconfigured",
      "BLOB_READ_WRITE_TOKEN is required for production portfolio storage",
    );
  }
  const id = randomUUID();
  const ext = extensionForMime(input.mimeType);
  const pathname = `portfolio/${input.ownerUserId}/${id}.${ext}`;
  const result = await put(pathname, Buffer.from(input.bytes), {
    access: "private",
    contentType: input.mimeType,
    token,
  });
  // Store remote URL under blob/ prefix so load/delete can route correctly.
  const blobKey = `${BLOB_PREFIX}${result.url}`;
  putPortfolioImageBytes(blobKey, input.mimeType, input.bytes);
  return { blobKey };
}

/**
 * Persist portfolio image bytes.
 * - Development: local disk under `.data/portfolio/` (survives Next restarts).
 * - Production: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise refuse
 *   (never write ephemeral local disk in prod — eng-review 2B).
 */
export async function savePortfolioImage(input: {
  ownerUserId: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ blobKey: string }> {
  if (hasBlobToken()) {
    return saveToVercelBlob(input);
  }
  if (allowsLocalDisk()) {
    return saveToLocalDisk(input);
  }
  throw new AppError(
    "integration_unconfigured",
    "Portfolio image storage is not configured for production. Set BLOB_READ_WRITE_TOKEN.",
  );
}

export async function loadPortfolioImage(
  blobKey: string,
): Promise<PortfolioImageBytes | null> {
  const memory = getPortfolioImageBytes(blobKey);
  if (memory) return memory;

  if (blobKey.startsWith(MEMORY_PREFIX)) {
    return null;
  }

  if (blobKey.startsWith(BLOB_PREFIX)) {
    const url = blobKey.slice(BLOB_PREFIX.length);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return null;
    try {
      const result = await get(url, { access: "private", token });
      if (!result) return null;
      const mimeType =
        result.blob.contentType ?? "application/octet-stream";
      const buffer = await new Response(result.stream).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      putPortfolioImageBytes(blobKey, mimeType, bytes);
      return { mimeType, bytes };
    } catch {
      return null;
    }
  }

  if (!allowsLocalDisk() && blobKey.startsWith(LOCAL_PREFIX)) {
    // Production must not serve leftover local keys as if durable.
    return null;
  }

  const filePath = safeKeyToPath(blobKey);
  if (!filePath) return null;

  try {
    const [bytes, metaRaw] = await Promise.all([
      readFile(filePath),
      readFile(`${filePath}.meta.json`, "utf8").catch(() => null),
    ]);
    let mimeType = "application/octet-stream";
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as { mimeType?: string };
        if (meta.mimeType) mimeType = meta.mimeType;
      } catch {
        // fall through
      }
    } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (filePath.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filePath.endsWith(".webp")) {
      mimeType = "image/webp";
    }
    const image = { mimeType, bytes: new Uint8Array(bytes) };
    putPortfolioImageBytes(blobKey, mimeType, image.bytes);
    return image;
  } catch {
    return null;
  }
}

export async function deletePortfolioImage(blobKey: string): Promise<void> {
  deletePortfolioImageBytes(blobKey);
  if (blobKey.startsWith(BLOB_PREFIX)) {
    const url = blobKey.slice(BLOB_PREFIX.length);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return;
    try {
      await del(url, { token });
    } catch {
      // best-effort
    }
    return;
  }
  const filePath = safeKeyToPath(blobKey);
  if (!filePath) return;
  await Promise.allSettled([
    unlink(filePath),
    unlink(`${filePath}.meta.json`),
  ]);
}

export function isLocalPortfolioKey(blobKey: string): boolean {
  return (
    blobKey.startsWith(LOCAL_PREFIX) || blobKey.startsWith(MEMORY_PREFIX)
  );
}

export function isBlobPortfolioKey(blobKey: string): boolean {
  return blobKey.startsWith(BLOB_PREFIX);
}
