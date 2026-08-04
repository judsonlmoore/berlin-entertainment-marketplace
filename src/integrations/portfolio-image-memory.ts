/**
 * Process-local portfolio image bytes for sandbox / local preview.
 * Production Blob adapter replaces this once provisioned.
 */

type StoredImage = {
  mimeType: string;
  bytes: Uint8Array;
};

const store = new Map<string, StoredImage>();

export function putPortfolioImageBytes(
  key: string,
  mimeType: string,
  bytes: Uint8Array,
): void {
  store.set(key, { mimeType, bytes });
}

export function getPortfolioImageBytes(key: string): StoredImage | null {
  return store.get(key) ?? null;
}

export function deletePortfolioImageBytes(key: string): void {
  store.delete(key);
}
