import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("portfolio-image-store", () => {
  let tmp: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "salon-portfolio-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.resetModules();
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    process.env = { ...originalEnv };
    await rm(tmp, { recursive: true, force: true });
  });

  it("round-trips image bytes on disk in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { deletePortfolioImage, loadPortfolioImage, savePortfolioImage } =
      await import("@/src/integrations/portfolio-image-store");

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

  it("supports filenameSuffix for thumb derivatives", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { deletePortfolioImage, loadPortfolioImage, savePortfolioImage } =
      await import("@/src/integrations/portfolio-image-store");

    const bytes = new Uint8Array([9, 8, 7]);
    const { blobKey } = await savePortfolioImage({
      ownerUserId: "user-1",
      mimeType: "image/webp",
      bytes,
      filenameSuffix: "-thumb",
    });
    expect(blobKey).toContain("-thumb.webp");
    expect(Array.from((await loadPortfolioImage(blobKey))?.bytes ?? [])).toEqual(
      [9, 8, 7],
    );
    await deletePortfolioImage(blobKey);
  });

  it("refuses local disk in production without Blob token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { savePortfolioImage } =
      await import("@/src/integrations/portfolio-image-store");

    await expect(
      savePortfolioImage({
        ownerUserId: "user-1",
        mimeType: "image/png",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: "integration_unconfigured",
    });
  });

  it("reports durable store unavailable in production without token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { isPortfolioDurableStoreAvailable } =
      await import("@/src/integrations/portfolio-image-store");
    expect(isPortfolioDurableStoreAvailable()).toBe(false);
  });

  it("reports durable store available when Blob token is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    const { isPortfolioDurableStoreAvailable } =
      await import("@/src/integrations/portfolio-image-store");
    expect(isPortfolioDurableStoreAvailable()).toBe(true);
  });
});
