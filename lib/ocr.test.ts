import { beforeEach, describe, expect, it, vi } from "vitest";

const terminate = vi.fn(async () => undefined);
const createWorker = vi.fn(async () => ({
  terminate,
  setParameters: async () => undefined,
  recognize: async () => ({ data: { text: "x", confidence: 90 } }),
}));
vi.mock("tesseract.js", () => ({ createWorker, OEM: { LSTM_ONLY: 1 } }));

import { acquireOcrWorker, recognizeImage, releaseOcrWorker } from "./ocr";

describe("shared OCR worker refcount", () => {
  beforeEach(() => {
    terminate.mockClear();
    createWorker.mockClear();
  });

  it("terminates only when the last user releases", async () => {
    acquireOcrWorker();
    acquireOcrWorker();
    await recognizeImage(new Blob(["x"]));
    await releaseOcrWorker();
    expect(terminate).not.toHaveBeenCalled();
    await releaseOcrWorker();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("an extra release does not go negative or terminate twice", async () => {
    await releaseOcrWorker();
    expect(terminate).not.toHaveBeenCalled();
  });
});
