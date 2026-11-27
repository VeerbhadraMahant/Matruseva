import "server-only";

export type SttLang = "hi-IN" | "mr-IN" | "en-IN";
export const STT_LANGS: readonly SttLang[] = ["hi-IN", "mr-IN", "en-IN"];

/** Sarvam's synchronous endpoint takes clips under 30 s; the client auto-stops earlier. */
export const MAX_CLIP_BYTES = 3_000_000; // Vercel rejects bodies over 4.5 MB
const TIMEOUT_MS = 25_000;

export type SttErrorCode = "not_configured" | "busy" | "timeout" | "bad_audio" | "failed";

export class SttError extends Error {
  constructor(readonly code: SttErrorCode, message: string) {
    super(message);
  }
}

const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/aac": "aac", "audio/x-m4a": "m4a" };

// Bias recognition toward the terms ASHA dictation uses (saaras:v4 only).
const KEYTERMS = ["BP", "blood pressure", "hemoglobin", "Hb", "FHR", "fundal height", "weight", "kilo"];

/** Transcribes one short clip. Never logs audio or transcript. */
export async function transcribeClip(audio: Blob, mime: string, lang: SttLang): Promise<string> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SttError("not_configured", "SARVAM_API_KEY missing");

  const base = mime.split(";")[0].trim().toLowerCase();
  const form = new FormData();
  form.append("file", new File([audio], `clip.${EXT[base] ?? "webm"}`, { type: base }));
  form.append("model", "saaras:v4");
  form.append("mode", "codemix");
  form.append("language_code", lang);
  form.append("keyterms", JSON.stringify(KEYTERMS));

  let res: Response;
  try {
    res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new SttError("timeout", "Sarvam timed out");
    throw new SttError("failed", "Sarvam unreachable");
  }

  if (res.ok) {
    const body = (await res.json().catch(() => null)) as { transcript?: unknown } | null;
    return typeof body?.transcript === "string" ? body.transcript.trim() : "";
  }
  if (res.status === 429) throw new SttError("busy", "Sarvam rate limited");
  if (res.status === 400 || res.status === 413 || res.status === 422) throw new SttError("bad_audio", `Sarvam rejected audio (${res.status})`);
  // 401/403/5xx and quota exhaustion: nothing the user can fix, they type instead.
  throw new SttError("failed", `Sarvam error ${res.status}`);
}
