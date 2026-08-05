import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deletePortfolioImageBytes,
  getPortfolioImageBytes,
  putPortfolioImageBytes,
} from "@/src/integrations/portfolio-image-memory";

export type PortfolioImageBytes = {
  mimeType: string;
  bytes: Uint8Array;
};

const LOCAL_PREFIX = "local/";
const MEMORY_PREFIX = "memory/";

function localRoot(): string {
  return path.join(process.cwd(), ".data", "portfolio");
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

/**
 * Persist portfolio image bytes for local/dev (and as fallback when Vercel Blob
 * is not provisioned). Survives Next.js restarts unlike the in-memory map.
 */
export async function savePortfolioImage(input: {
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
  // Keep memory hot-path in the same process for immediate reads.
  putPortfolioImageBytes(blobKey, input.mimeType, input.bytes);
  return { blobKey };
}

export async function loadPortfolioImage(
  blobKey: string,
): Promise<PortfolioImageBytes | null> {
  const memory = getPortfolioImageBytes(blobKey);
  if (memory) return memory;

  if (blobKey.startsWith(MEMORY_PREFIX)) {
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
