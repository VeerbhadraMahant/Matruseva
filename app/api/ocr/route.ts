import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SarvamOcrError, sarvamDocsConfigured, sarvamParse } from "@/lib/sarvamDocs";

export const maxDuration = 60;

// Vercel rejects function bodies over 4.5 MB.
const MAX_BYTES = 4_400_000;
const TYPES = new Set(["image/jpeg", "image/png", "image/tiff", "application/pdf"]);

/** Server-side handwriting OCR (Sarvam Document AI). The client falls back to local Tesseract on any non-200. */
export async function POST(request: Request) {
  try {
    await getCurrentUser();
    if (!sarvamDocsConfigured()) return Response.json({ code: "not_configured" }, { status: 501 });

    // Reject oversized bodies before buffering them (the multipart envelope adds a little overhead).
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 65_536) return Response.json({ code: "too_large" }, { status: 413 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ code: "bad_file" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ code: "too_large" }, { status: 413 });
    if (!TYPES.has(file.type)) return Response.json({ code: "bad_file" }, { status: 415 });

    const text = await sarvamParse(new Uint8Array(await file.arrayBuffer()), file.type, file.name || "document");
    return Response.json({ engine: "sarvam", text });
  } catch (e) {
    unstable_rethrow(e);
    // Detail stays in the server log (SarvamOcrError messages carry only a status, never keys); the client gets a code.
    console.error("[ocr]", e instanceof Error ? e.message : "unknown error");
    return Response.json({ code: "failed" }, { status: e instanceof SarvamOcrError ? 502 : 500 });
  }
}
