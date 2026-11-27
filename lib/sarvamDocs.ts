import "server-only";

/**
 * Sarvam Document AI (Sarvam Vision) "parse" job: submit, poll, read JSON blocks.
 * API shape from https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/how-to/parse
 *   POST /doc-ai/v1/job/parse (multipart: file, language, output_format)
 *   GET  /doc-ai/v1/job/{id}/status
 *   GET  /doc-ai/v1/job/{id}/results
 * The key stays on the server.
 */

const BASE = "https://api.sarvam.ai/doc-ai/v1";
const TERMINAL = new Set(["completed", "partially_completed", "failed", "rejected"]);

export class SarvamOcrError extends Error {}

export const sarvamDocsConfigured = () => Boolean(process.env.SARVAM_API_KEY);

async function call(path: string, init: RequestInit, signal: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY ?? "" },
    signal,
  });
  if (!res.ok) throw new SarvamOcrError(`Sarvam ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

const stripTags = (s: string) =>
  s.replace(/<\/(?:tr|p|div|h\d)>/gi, "\n").replace(/<\/t[dh]>/gi, " | ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

interface ResultsShape {
  documents?: { pages?: { blocks?: { text?: string; reading_order?: number }[] }[]; error?: { message?: string } }[];
}

/** Returns the page text in reading order. Throws SarvamOcrError on any failure or timeout. */
export async function sarvamParse(bytes: Uint8Array<ArrayBuffer>, mime: string, fileName: string, timeoutMs = 50_000): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), fileName);
    form.append("language", "en-IN");
    form.append("output_format", "json");
    const job = await call("/job/parse", { method: "POST", body: form }, signal);
    const id = encodeURIComponent(String(job.job_id ?? ""));
    if (!id) throw new SarvamOcrError("Sarvam returned no job id");

    let status = String(job.status ?? "pending");
    while (!TERMINAL.has(status)) {
      await new Promise((r) => setTimeout(r, 1500));
      status = String((await call(`/job/${id}/status`, {}, signal)).status ?? "");
    }
    if (status === "failed" || status === "rejected") throw new SarvamOcrError(`Sarvam job ${status}`);

    const results = (await call(`/job/${id}/results`, {}, signal)) as ResultsShape;
    const text = (results.documents ?? [])
      .flatMap((d) => d.pages ?? [])
      .map((p) =>
        [...(p.blocks ?? [])]
          .sort((a, b) => (a.reading_order ?? 0) - (b.reading_order ?? 0))
          .map((b) => stripTags(b.text ?? "").trim())
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n")
      .trim();
    if (!text) throw new SarvamOcrError("Sarvam found no text");
    return text;
  } catch (e) {
    if (e instanceof SarvamOcrError) throw e;
    throw new SarvamOcrError(e instanceof Error ? e.message : "Sarvam request failed");
  }
}
