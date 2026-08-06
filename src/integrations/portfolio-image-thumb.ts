import sharp from "sharp";

/** Longest edge for portfolio thumbs (covers ~2x CSS tiles and discovery cards). */
export const PORTFOLIO_THUMB_MAX_EDGE = 480;

/**
 * Create a durable WebP thumbnail from original portfolio image bytes.
 * Applies EXIF orientation, fits inside a square bound without enlarging.
 */
export async function createPortfolioThumbBytes(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const output = await sharp(Buffer.from(bytes))
    .rotate()
    .resize(PORTFOLIO_THUMB_MAX_EDGE, PORTFOLIO_THUMB_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
  return new Uint8Array(output);
}
