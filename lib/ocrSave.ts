"use client";

import { createClient } from "@/lib/supabase/client";
import { updateDemoDocumentOcrAction } from "@/app/(app)/documents/actions";
import { acquireOcrWorker, readDocument, releaseOcrWorker, type OcrResult } from "@/lib/ocr";

/** Persist an OCR outcome (null = failed). Returns an error message, or null when the row was really updated. */
export async function saveOcrResult(isDemo: boolean, id: string, result: OcrResult | null): Promise<string | null> {
  if (isDemo) {
    const res = await updateDemoDocumentOcrAction(id, { status: result ? "done" : "failed", text: result?.text, engine: result?.engine });
    return res.error;
  }
  const { data, error } = await createClient()
    .from("documents")
    .update({ ocr_text: result?.text ?? null, ocr_status: result ? "done" : "failed" })
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  // RLS filters a forbidden update down to zero rows without raising an error.
  return data?.length ? null : "Document could not be updated";
}

/** Re-run OCR on an already stored document (failed, interrupted or never processed). */
export async function retryOcr(isDemo: boolean, id: string, url: string, fileName: string): Promise<{ error: string | null; engine?: string }> {
  acquireOcrWorker();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not open the stored file (${res.status})`);
    const blob = await res.blob();
    let result: OcrResult | null = null;
    try {
      result = await readDocument(new File([blob], fileName, { type: blob.type }));
    } catch {
      result = null;
    }
    const error = await saveOcrResult(isDemo, id, result);
    if (error) return { error };
    return result ? { error: null, engine: result.engine } : { error: "No text could be read from this document" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Retry failed" };
  } finally {
    await releaseOcrWorker();
  }
}
