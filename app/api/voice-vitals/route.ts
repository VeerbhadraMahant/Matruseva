import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MAX_CLIP_BYTES, STT_LANGS, SttError, transcribeClip, type SttLang } from "@/lib/sarvamStt";

const HTTP_STATUS = { not_configured: 503, busy: 429, timeout: 504, bad_audio: 422, failed: 502 } as const;

/** Short vitals dictation -> transcript via Sarvam speech-to-text. Signed-in clinic user or demo session only. */
export async function POST(request: Request) {
  try {
    await getCurrentUser();

    const form = await request.formData().catch(() => null);
    const audio = form?.get("audio");
    const lang = form?.get("lang");
    if (!(audio instanceof File) || !STT_LANGS.includes(lang as SttLang)) return Response.json({ code: "bad_audio" }, { status: 400 });
    if (!audio.type.startsWith("audio/")) return Response.json({ code: "bad_audio" }, { status: 415 });
    if (audio.size === 0) return Response.json({ code: "bad_audio" }, { status: 400 });
    if (audio.size > MAX_CLIP_BYTES) return Response.json({ code: "bad_audio" }, { status: 413 });

    const transcript = await transcribeClip(audio, audio.type, lang as SttLang);
    return Response.json({ transcript });
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof SttError) return Response.json({ code: e.code }, { status: HTTP_STATUS[e.code] });
    return Response.json({ code: "failed" }, { status: 500 });
  }
}
