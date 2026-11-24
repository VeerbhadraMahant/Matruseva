import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { deidentify, findLeaks, type KnownTerm } from "@/lib/deidentify";

/**
 * Consultation scribe: Sarvam batch speech-to-text (raw transcript, doctor only)
 * and a Gemini summary built from the de-identified transcript only.
 */

const SARVAM = "https://api.sarvam.ai";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
// Tried in order; free-tier models return 503 under load, so fall through.
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
export const MAX_PARTS = 20; // Sarvam batch limit: files per job.

export class ScribeError extends Error {}

function sarvamKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new ScribeError("Transcription is not configured (SARVAM_API_KEY missing).");
  return key;
}

async function sarvam<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SARVAM}${path}`, {
    ...init,
    headers: { "api-subscription-key": sarvamKey(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (body as { error?: { code?: string } }).error?.code;
    throw new ScribeError(code === "insufficient_quota_error" ? "Sarvam credits are exhausted." : `Sarvam request failed (${res.status}).`);
  }
  return body as T;
}

// ---- Job token: binds a Sarvam job to one patient and clinic -------------

interface TokenPayload {
  jobId: string;
  patientId: string;
  clinicId: string;
  exp: number;
}

// The Sarvam key is the one secret this feature always has, so it doubles as the HMAC key.
const mac = (data: string) => createHmac("sha256", `consult-token:${sarvamKey()}`).update(data).digest();

export function signJobToken(p: Omit<TokenPayload, "exp">, ttlSeconds = 6 * 60 * 60): string {
  const data = Buffer.from(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${data}.${mac(data).toString("base64url")}`;
}

export function verifyJobToken(token: unknown): TokenPayload | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const given = Buffer.from(sig, "base64url");
  const expected = mac(data);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    return p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}

// ---- Sarvam batch job ------------------------------------------------------

type JobState = "Accepted" | "Pending" | "Running" | "Completed" | "Failed";

export async function createJob(): Promise<string> {
  const res = await sarvam<{ job_id: string }>("/speech-to-text/job/v1", {
    method: "POST",
    // language "unknown" = auto-detect; codemix keeps English medical words in Latin script.
    body: JSON.stringify({ job_parameters: { model: "saaras:v4", mode: "codemix", language_code: "unknown", with_diarization: true } }),
  });
  return res.job_id;
}

export function partFileName(index: number, mimeType: string): string {
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
  return `${index}.${ext}`;
}

/** Sarvam's upload links are S3 URLs without CORS, so audio goes browser -> our route -> S3. */
export async function uploadPart(jobId: string, fileName: string, audio: ArrayBuffer, mimeType: string): Promise<void> {
  const res = await sarvam<{ upload_urls: Record<string, { file_url: string }> }>("/speech-to-text/job/v1/upload-files", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, files: [fileName] }),
  });
  const url = res.upload_urls[fileName]?.file_url;
  if (!url) throw new ScribeError("Sarvam did not return an upload link.");
  const put = await fetch(url, { method: "PUT", body: audio, headers: { "Content-Type": mimeType, "x-ms-blob-type": "BlockBlob" } });
  if (!put.ok) throw new ScribeError(`Audio upload failed (${put.status}).`);
}

export async function startJob(jobId: string): Promise<void> {
  await sarvam(`/speech-to-text/job/v1/${encodeURIComponent(jobId)}/start`, { method: "POST" });
}

interface JobStatus {
  job_state: JobState;
  error_message?: string;
  job_details?: { outputs?: { file_name: string }[]; state?: string }[];
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return sarvam<JobStatus>(`/speech-to-text/job/v1/${encodeURIComponent(jobId)}/status`);
}

export interface Segment {
  speaker: string;
  start: number;
  text: string;
}

interface SarvamOutput {
  transcript?: string;
  diarized_transcript?: { entries?: { transcript: string; start_time_seconds: number; end_time_seconds: number; speaker_id: string }[] };
}

/** Joins per-part outputs (in part order) into one timeline. Speaker ids are only meaningful within a part. */
export function joinOutputs(outputs: SarvamOutput[]): Segment[] {
  const segments: Segment[] = [];
  let offset = 0;
  outputs.forEach((out, part) => {
    const entries = out.diarized_transcript?.entries ?? [];
    if (!entries.length && out.transcript?.trim()) entries.push({ transcript: out.transcript, start_time_seconds: 0, end_time_seconds: 0, speaker_id: "0" });
    for (const e of entries) {
      if (!e.transcript?.trim()) continue;
      segments.push({ speaker: outputs.length > 1 ? `${part + 1}.${e.speaker_id}` : e.speaker_id, start: offset + e.start_time_seconds, text: e.transcript.trim() });
    }
    offset += entries.at(-1)?.end_time_seconds ?? 0;
  });
  return segments;
}

export async function downloadTranscript(jobId: string, status: JobStatus): Promise<Segment[]> {
  const files = (status.job_details ?? [])
    .flatMap((d) => d.outputs ?? [])
    .map((o) => o.file_name)
    .sort((a, b) => parseInt(a) - parseInt(b));
  if (!files.length) throw new ScribeError("Sarvam returned no transcript.");
  const res = await sarvam<{ download_urls: Record<string, { file_url: string }> }>("/speech-to-text/job/v1/download-files", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, files }),
  });
  const outputs = await Promise.all(
    files.map(async (f) => {
      const r = await fetch(res.download_urls[f].file_url, { cache: "no-store" });
      if (!r.ok) throw new ScribeError(`Transcript download failed (${r.status}).`);
      return (await r.json()) as SarvamOutput;
    })
  );
  return joinOutputs(outputs);
}

// ---- Known identifiers -----------------------------------------------------

export interface PersonalDetails {
  patientName: string;
  doctorName: string;
  address?: string | null;
  clinicPatientNo?: string | null;
}

/** Record identifiers in Latin plus their Devanagari transliterations (Hindi and Marathi differ). */
export async function knownTerms(d: PersonalDetails): Promise<KnownTerm[]> {
  const doctor = d.doctorName.replace(/^\s*dr\.?\s+/i, "");
  // Address numbers would collide with clinical values (flat 140 vs BP 140), so only words.
  const place = (d.address ?? "").replace(/[\d]/g, " ");
  const latin = ([
    { word: d.patientName, placeholder: "[PATIENT]" },
    { word: doctor, placeholder: "[DOCTOR]" },
    { word: place, placeholder: "[PLACE]" },
    { word: d.clinicPatientNo ?? "", placeholder: "[ID]" },
  ] satisfies KnownTerm[]).filter((t) => t.word.trim()) as KnownTerm[];

  // One request per term: the API collapses newlines, so a batched call can't be split back reliably.
  const devanagari = await Promise.all(
    latin.flatMap((t) =>
      ["hi-IN", "mr-IN"].map(async (lang) => {
        const res = await sarvam<{ transliterated_text: string }>("/transliterate", {
          method: "POST",
          body: JSON.stringify({ input: t.word, source_language_code: "en-IN", target_language_code: lang }),
        });
        return { word: res.transliterated_text, placeholder: t.placeholder };
      })
    )
  );
  return [...latin, ...devanagari];
}

// ---- Summary ---------------------------------------------------------------

export interface ConsultSummary {
  complaints: string[];
  history: string[];
  findings: string[];
  assessment: string[];
  plan: string[];
  advice: string[];
  followUp: string[];
  redFlags: string[];
}

const LIST = { type: "ARRAY", items: { type: "STRING" } };
const SUMMARY_KEYS = ["complaints", "history", "findings", "assessment", "plan", "advice", "followUp", "redFlags"] as const;
const SUMMARY_SCHEMA = {
  type: "OBJECT",
  properties: Object.fromEntries(SUMMARY_KEYS.map((k) => [k, LIST])),
  required: [...SUMMARY_KEYS],
};

const INSTRUCTIONS = `You summarise antenatal (pregnancy) consultations at an Indian OB-GYN clinic for the treating doctor.
The transcript is speech-to-text output in Hindi, Marathi and/or English and may contain recognition errors.
Personal details were replaced with placeholders such as [PATIENT], [DOCTOR], [PLACE], [PHONE]; never guess what they stand for.
Write concise clinical English. Use only what was actually said; never invent values, diagnoses or medicines. Leave a list empty when nothing was said about it.
- complaints: symptoms or concerns the patient raised
- history: past or current medical/obstetric history mentioned
- findings: vitals, measurements and examination findings with their values (BP, Hb, weight, FHR, fundal height)
- assessment: the doctor's stated impressions or concerns
- plan: medicines (name, dose, frequency if stated), tests ordered, referrals
- advice: counselling and instructions given to the patient
- followUp: when and why to return
- redFlags: danger signs the patient was told to watch for, or worrying findings`;

/** Summarises the de-identified transcript. Throws if anything identifying survived scrubbing. */
export async function summarize(segments: Segment[], terms: KnownTerm[]): Promise<ConsultSummary> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ScribeError("Summary is not configured (GEMINI_API_KEY missing).");
  const scrubbed = deidentify(segments.map((s) => s.text).join("\n"), terms);
  if (findLeaks(scrubbed, terms).length) throw new ScribeError("Summary withheld: personal details could not be fully removed.");

  let lastError = "Summary service unavailable.";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`${GEMINI}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: scrubbed }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: SUMMARY_SCHEMA },
      }),
      cache: "no-store",
    });
    if (res.status === 429 || res.status >= 500) {
      lastError = res.status === 429 ? "Summary rate limit reached; try again in a minute." : lastError;
      continue;
    }
    const body = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    if (!res.ok) throw new ScribeError(`Summary request failed (${res.status}).`);
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      const parsed = JSON.parse(text ?? "") as Partial<ConsultSummary>;
      return Object.fromEntries(SUMMARY_KEYS.map((k) => [k, Array.isArray(parsed[k]) ? parsed[k].map(String) : []])) as unknown as ConsultSummary;
    } catch {
      throw new ScribeError("Summary response was not valid.");
    }
  }
  throw new ScribeError(lastError);
}
