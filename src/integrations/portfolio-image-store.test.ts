import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("portfolio-image-store", () => {
  let tmp: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "salon-portfolio-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmp, { recursive: true, force: true });
  });

  it("round-trips image bytes on disk", async () => {
    const {
      deletePortfolioImage,
      loadPortfolioImage,
      savePortfolioImage,
    } = await import("@/src/integrations/portfolio-image-store");

    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const { blobKey } = await savePortfolioImage({
      ownerUserId: "user-1",
      mimeType: "image/png",
      bytes,
    });
    expect(blobKey.startsWith("local/user-1/")).toBe(true);

    const loaded = await loadPortfolioImage(blobKey);
    expect(loaded?.mimeType).toBe("image/png");
    expect(Array.from(loaded?.bytes ?? [])).toEqual([1, 2, 3, 4, 5]);

    await deletePortfolioImage(blobKey);
    expect(await loadPortfolioImage(blobKey)).toBeNull();
  });
});
