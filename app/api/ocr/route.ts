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
    if (!sarvamDocsConfigured()) return Response.json({ error: "not_configured" }, { status: 501 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "File too large." }, { status: 413 });
    if (!TYPES.has(file.type)) return Response.json({ error: "Unsupported file type." }, { status: 415 });

    const text = await sarvamParse(new Uint8Array(await file.arrayBuffer()), file.type, file.name || "document");
    return Response.json({ engine: "sarvam", text });
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof SarvamOcrError) return Response.json({ error: e.message }, { status: 502 });
    console.error("[ocr]", e);
    return Response.json({ error: "OCR failed." }, { status: 500 });
  }
}
