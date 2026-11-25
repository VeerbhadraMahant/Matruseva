"use client";

/**
 * Client-side OCR. Runs in the browser (tesseract.js manages its own
 * worker thread internally) so no server compute is spent on it. Accuracy
 * on handwriting is limited — this is disclosed in the capture UI; search
 * still works on whatever text comes back, plus the tags staff add by hand.
 */

let workerPromise: ReturnType<typeof import("tesseract.js").createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

/** Downscale + grayscale/threshold an image before OCR — measurably improves Tesseract's results. */
export async function preprocessImage(file: File, maxDimension = 2000): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = gray > 150 ? 255 : gray; // light threshold, keep midtones for handwriting
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9);
  });
}

export async function recognizeImage(image: Blob): Promise<string> {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(image);
  return text.trim();
}

async function openPdf(source: File | string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs.getDocument(typeof source === "string" ? { url: source } : { data: await source.arrayBuffer() });
}

/** Digital PDFs: read their selectable text layer. */
export async function extractPdfText(file: File): Promise<string> {
  const task = await openPdf(file);
  try {
    const doc = await task.promise;
    const pageTexts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return pageTexts.join("\n").trim();
  } finally {
    await task.destroy();
  }
}

/** Small first-page image, including scans without a text layer. */
export async function renderPdfPreview(source: File | string): Promise<string> {
  const task = await openPdf(source);
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const size = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 420 / Math.max(size.width, size.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    await task.destroy();
  }
}
