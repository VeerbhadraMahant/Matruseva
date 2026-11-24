import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MAX_PARTS, ScribeError, partFileName, uploadPart, verifyJobToken } from "@/lib/consultation";

// Vercel rejects function bodies over 4.5 MB; the recorder rotates parts well below this.
const MAX_BYTES = 4_400_000;

/** Receives one recorded audio part and forwards it to the Sarvam job (its S3 links block browser CORS). */
export async function POST(request: Request) {
  try {
    const me = await getCurrentUser();
    const job = verifyJobToken(request.headers.get("x-consult-token"));
    if (!job || job.clinicId !== me.clinicId) return Response.json({ error: "Recording session expired." }, { status: 403 });

    const index = Number(request.headers.get("x-part-index"));
    if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) return Response.json({ error: "Invalid part." }, { status: 400 });

    const type = request.headers.get("content-type") ?? "";
    if (!type.startsWith("audio/")) return Response.json({ error: "Expected audio." }, { status: 415 });

    const audio = await request.arrayBuffer();
    if (!audio.byteLength) return Response.json({ error: "Empty recording." }, { status: 400 });
    if (audio.byteLength > MAX_BYTES) return Response.json({ error: "Recording part too large." }, { status: 413 });

    await uploadPart(job.jobId, partFileName(index, type), audio, type.split(";")[0]);
    return Response.json({ ok: true });
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ScribeError) return Response.json({ error: e.message }, { status: 502 });
    console.error("[consult upload]", e);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
