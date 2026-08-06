import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  createPortfolioThumbBytes,
  PORTFOLIO_THUMB_MAX_EDGE,
} from "@/src/integrations/portfolio-image-thumb";

describe("portfolio-image-thumb", () => {
  it("creates a WebP thumb within the max edge", async () => {
    const source = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 40, g: 80, b: 60 },
      },
    })
      .png()
      .toBuffer();

    const thumb = await createPortfolioThumbBytes(new Uint8Array(source));
    const meta = await sharp(Buffer.from(thumb)).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width ?? 0).toBeLessThanOrEqual(PORTFOLIO_THUMB_MAX_EDGE);
    expect(meta.height ?? 0).toBeLessThanOrEqual(PORTFOLIO_THUMB_MAX_EDGE);
    expect(thumb.byteLength).toBeLessThan(source.byteLength);
  });
});
