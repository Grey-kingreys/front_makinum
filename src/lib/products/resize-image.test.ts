import { afterEach, describe, expect, it, vi } from "vitest";

import { resizeImageFile } from "./resize-image";

/**
 * jsdom n'implémente ni `createImageBitmap` ni un vrai contexte canvas 2D —
 * on mocke ces deux API navigateur plutôt que d'affaiblir resize-image.ts
 * pour le rendre « testable ».
 */
function stubImageBitmap(width: number, height: number) {
  const close = vi.fn();
  const createImageBitmapMock = vi.fn().mockResolvedValue({ width, height, close });
  vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  return { createImageBitmapMock, close };
}

function stubCanvas(blobResult: Blob | null) {
  const drawImage = vi.fn();
  const getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  const toBlobSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation(function toBlob(this: HTMLCanvasElement, callback: BlobCallback) {
      callback(blobResult);
    });
  return { drawImage, getContextSpy, toBlobSpy };
}

function makeFile(name = "photo.jpg", type = "image/jpeg"): File {
  return new File(["binary"], name, { type });
}

describe("resizeImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downscales an oversized image, capping the longest side at 1600px, and re-encodes as JPEG", async () => {
    stubImageBitmap(3200, 2400);
    const resizedBlob = new Blob(["resized"], { type: "image/jpeg" });
    const { drawImage } = stubCanvas(resizedBlob);
    const original = makeFile("pagne.png", "image/png");

    const result = await resizeImageFile(original);

    expect(result).not.toBe(original);
    expect(result.name).toBe("pagne.png");
    expect(result.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
  });

  it("never upscales — an image already under 1600px is returned unchanged", async () => {
    stubImageBitmap(800, 600);
    const { getContextSpy, toBlobSpy } = stubCanvas(new Blob(["x"]));
    const original = makeFile();

    const result = await resizeImageFile(original);

    expect(result).toBe(original);
    expect(getContextSpy).not.toHaveBeenCalled();
    expect(toBlobSpy).not.toHaveBeenCalled();
  });

  it("falls back to the original file when createImageBitmap is unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const original = makeFile();

    const result = await resizeImageFile(original);

    expect(result).toBe(original);
  });

  it("falls back to the original file when createImageBitmap throws (exotic format)", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("Unsupported source")),
    );
    const original = makeFile();

    const result = await resizeImageFile(original);

    expect(result).toBe(original);
  });

  it("falls back to the original file when canvas has no 2D context", async () => {
    stubImageBitmap(3200, 2400);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const original = makeFile();

    const result = await resizeImageFile(original);

    expect(result).toBe(original);
  });

  it("falls back to the original file when toBlob yields an empty canvas", async () => {
    stubImageBitmap(3200, 2400);
    stubCanvas(null);
    const original = makeFile();

    const result = await resizeImageFile(original);

    expect(result).toBe(original);
  });
});
