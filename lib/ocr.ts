"use client";

/**
 * Document reading. Handwriting goes to the server route (Sarvam Document AI)
 * when it is configured; otherwise, or if it fails, local Tesseract in the
 * browser reads a contrast-normalised copy. The stored image is never the
 * processed copy: the original colour scan is kept as the clinical record.
 */

export type OcrEngine = "sarvam" | "tesseract" | "pdf-text";
export interface OcrResult {
  text: string;
  engine: OcrEngine;
}

const STORE_MAX = 2400; // long side of the image kept in storage
const OCR_MIN = 1800; // upscale small photos so letters are ~30px tall
const OCR_MAX = 3200;
const SERVER_OCR_MAX_BYTES = 4_200_000;

type Worker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;
let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker, OEM }) => createWorker("eng", OEM.LSTM_ONLY));
  }
  return workerPromise;
}

let workerUsers = 0;

/** Mark the shared worker in use; pair every call with releaseOcrWorker in a finally. */
export function acquireOcrWorker() {
  workerUsers++;
}

/** Free the Tesseract worker (~30 MB) once its last user is done, so one finishing job cannot kill another's recognition. */
export async function releaseOcrWorker() {
  workerUsers = Math.max(0, workerUsers - 1);
  if (workerUsers > 0) return;
  const pending = workerPromise;
  workerPromise = null;
  if (pending) await (await pending).terminate().catch(() => undefined);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function drawScaled(bitmap: ImageBitmap, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/**
 * Flatten uneven lighting (divide by the local paper brightness) and stretch
 * contrast. Stays greyscale on purpose: a hard global threshold erases thin
 * pen strokes, while Tesseract's LSTM reads soft greys well.
 */
export function normaliseForOcr(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const n = width * height;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];

  // Integral image -> local mean over a window ~1/16 of the page.
  const w1 = width + 1;
  const integral = new Float64Array(w1 * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += gray[y * width + x];
      integral[(y + 1) * w1 + x + 1] = integral[y * w1 + x + 1] + row;
    }
  }
  const r = Math.max(12, Math.round(Math.min(width, height) / 16));
  const flat = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const sum = integral[y1 * w1 + x1] - integral[y0 * w1 + x1] - integral[y1 * w1 + x0] + integral[y0 * w1 + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const v = Math.min(255, (gray[y * width + x] * 255) / (0.92 * mean + 1));
      flat[y * width + x] = v;
      hist[v | 0]++;
    }
  }
  // Black point = 1st percentile of the flattened image.
  let acc = 0;
  let black = 0;
  while (black < 254 && acc + hist[black] < n * 0.01) acc += hist[black++];
  const span = Math.max(1, 255 - black);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((flat[i] - black) * 255) / span));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

export interface PreparedImage {
  /** Colour image to keep in storage and to send to the server OCR. */
  stored: Blob;
  /** Normalised greyscale copy for local Tesseract. */
  ocr: Blob;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const long = Math.max(bitmap.width, bitmap.height);
    const store = drawScaled(bitmap, Math.min(1, STORE_MAX / long));
    const ocrScale = Math.min(OCR_MAX / long, Math.max(Math.min(1, STORE_MAX / long), OCR_MIN / long));
    const ocr = drawScaled(bitmap, ocrScale);
    if (!store || !ocr) return { stored: file, ocr: file };
    normaliseForOcr(ocr.ctx, ocr.canvas.width, ocr.canvas.height);
    const [stored, ocrBlob] = await Promise.all([canvasToBlob(store.canvas, 0.85), canvasToBlob(ocr.canvas, 0.95)]);
    return { stored: stored ?? file, ocr: ocrBlob ?? file };
  } finally {
    bitmap.close();
  }
}

/** Local OCR. PSM 6 (uniform block) suits forms and lab reports; retry with auto layout if confidence is poor. */
export async function recognizeImage(image: Blob): Promise<string> {
  const worker = await getWorker();
  const attempt = async (psm: string) => {
    await worker.setParameters({ tessedit_pageseg_mode: psm as never, preserve_interword_spaces: "1", user_defined_dpi: "300" });
    const { data } = await worker.recognize(image);
    return { text: data.text.trim(), confidence: data.confidence };
  };
  const best = await attempt("6");
  if (best.confidence >= 60 && best.text) return best.text;
  const alt = await attempt("3");
  return alt.confidence > best.confidence && alt.text ? alt.text : best.text;
}

/** Compact JPEG data URL (demo store only; server actions cap request bodies at 1 MB). */
export async function previewDataUrl(blob: Blob, maxSide = 1400, quality = 0.7): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const drawn = drawScaled(bitmap, Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)));
    return drawn ? drawn.canvas.toDataURL("image/jpeg", quality) : "";
  } finally {
    bitmap.close();
  }
}

async function serverOcr(blob: Blob, name: string): Promise<string | null> {
  if (blob.size > SERVER_OCR_MAX_BYTES) return null;
  try {
    const form = new FormData();
    form.append("file", new File([blob], name, { type: blob.type }));
    const res = await fetch("/api/ocr", { method: "POST", body: form, signal: AbortSignal.timeout(58_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: string };
    return body.text?.trim() || null;
  } catch {
    return null;
  }
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

/** Render PDF page 1 to a data URL, `maxSide` px on the long edge. */
async function renderPdfPage(source: File | string, maxSide: number, quality: number): Promise<string> {
  const task = await openPdf(source);
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const size = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: maxSide / Math.max(size.width, size.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    await task.destroy();
  }
}

/** Small first-page image, including scans without a text layer. */
export const renderPdfPreview = (source: File | string) => renderPdfPage(source, 420, 0.8);

/**
 * Read a document. Images: Sarvam (handwriting) first, Tesseract fallback.
 * PDFs: text layer if present, else Sarvam on the PDF, else Tesseract on page 1.
 * Throws if no engine produced text, so the caller can mark the document failed and offer a retry.
 */
export async function readDocument(file: File, prepared?: PreparedImage): Promise<OcrResult> {
  if (file.type === "application/pdf") {
    const layer = await extractPdfText(file).catch(() => "");
    if (layer.replace(/\s/g, "").length >= 20) return { text: layer, engine: "pdf-text" };
    const server = await serverOcr(file, file.name);
    if (server) return { text: server, engine: "sarvam" };
    const page = await fetch(await renderPdfPage(file, 2600, 0.95)).then((r) => r.blob());
    const text = await recognizeImage(page);
    if (!text) throw new Error("No text found");
    return { text, engine: "tesseract" };
  }

  const img = prepared ?? (await prepareImage(file));
  const server = await serverOcr(img.stored, file.name.replace(/\.\w+$/, "") + ".jpg");
  if (server) return { text: server, engine: "sarvam" };
  const text = await recognizeImage(img.ocr);
  if (!text) throw new Error("No text found");
  return { text, engine: "tesseract" };
}
