"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, Stop, Copy, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useT } from "@/lib/i18n/provider";
import { Panel, buttonPrimary, buttonSecondary } from "@/components/ui";
import { showToast } from "@/components/Toaster";
import {
  checkConsultation,
  finishConsultation,
  startConsultation,
  type CheckResult,
} from "@/app/(app)/patients/[id]/consult/actions";
import type { ConsultSummary } from "@/lib/consultation";

type Done = Extract<CheckResult, { state: "done" }>;
type Phase =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "uploading" }
  | { kind: "processing" }
  | { kind: "done"; token: string; result: Done }
  | { kind: "error"; message: string };

interface Session {
  token: string;
  stream: MediaStream;
  mimeType: string;
  parts: number;
  uploads: Promise<void>[];
  partStopped: Promise<void>;
  recorder: MediaRecorder | null;
  wakeLock: WakeLockSentinel | null;
  stopping: boolean;
}

// Each part is uploaded as its own request; Vercel caps request bodies at 4.5 MB.
const PART_BYTES = 3_000_000;
const MAX_PARTS = 20; // Sarvam: files per job
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];
const POLL_MS = 4000;
const POLL_LIMIT = 150; // ~10 minutes
const SECTIONS: (keyof ConsultSummary)[] = ["redFlags", "complaints", "findings", "history", "assessment", "plan", "advice", "followUp"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

async function uploadPart(token: string, index: number, blob: Blob): Promise<void> {
  let error = "Upload failed.";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    try {
      const res = await fetch("/api/consultations/upload", {
        method: "POST",
        body: blob,
        headers: { "x-consult-token": token, "x-part-index": String(index), "Content-Type": blob.type },
      });
      if (res.ok) return;
      error = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? error;
      if (res.status < 500) break; // retrying won't fix a rejected part
    } catch {
      error = "Network error while uploading. Check the connection.";
    }
  }
  throw new Error(error);
}

export function ConsultationRecorder({ patientId }: { patientId: string }) {
  const t = useT();
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const session = useRef<Session | null>(null);
  const alive = useRef(true);

  const busy = phase.kind === "recording" || phase.kind === "uploading";

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const s = session.current;
      if (s) {
        s.stopping = true;
        if (s.recorder?.state === "recording") s.recorder.stop();
        s.stream.getTracks().forEach((tr) => tr.stop());
        void s.wakeLock?.release().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (phase.kind !== "recording") return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(id);
  }, [phase.kind]);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function startPart(s: Session) {
    const index = s.parts++;
    const rec = new MediaRecorder(s.stream, { ...(s.mimeType && { mimeType: s.mimeType }), audioBitsPerSecond: 32000 });
    const chunks: Blob[] = [];
    let size = 0;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      size += e.data.size;
      if (size < PART_BYTES || rec.state !== "recording" || s.stopping) return;
      if (s.parts >= MAX_PARTS) {
        setNotice(t("consult.limitReached"));
        void stop();
        return;
      }
      // Rotate to a fresh recorder so every part is a complete, independently decodable file.
      rec.stop();
      startPart(s);
    };
    s.partStopped = new Promise((resolve) => {
      rec.onstop = () => {
        const type = (rec.mimeType || s.mimeType || "audio/webm").split(";")[0];
        if (chunks.length) s.uploads.push(uploadPart(s.token, index, new Blob(chunks, { type })));
        resolve();
      };
    });
    rec.start(1000);
    s.recorder = rec;
  }

  async function start() {
    setNotice(null);
    setElapsed(0);
    if (!window.isSecureContext) return setPhase({ kind: "error", message: t("consult.insecure") });
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setPhase({ kind: "error", message: t("consult.unsupported") });
    }

    // Ask for the mic first: Safari only allows the prompt directly after the tap.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch {
      return setPhase({ kind: "error", message: t("consult.micDenied") });
    }

    const res = await startConsultation(patientId);
    if ("error" in res) {
      stream.getTracks().forEach((tr) => tr.stop());
      return setPhase({ kind: "error", message: res.error });
    }

    const s: Session = {
      token: res.token,
      stream,
      mimeType: MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "",
      parts: 0,
      uploads: [],
      partStopped: Promise.resolve(),
      recorder: null,
      wakeLock: (await navigator.wakeLock?.request("screen").catch(() => null)) ?? null,
      stopping: false,
    };
    session.current = s;
    startPart(s);
    setPhase({ kind: "recording" });
  }

  async function stop() {
    const s = session.current;
    if (!s || s.stopping) return;
    s.stopping = true;
    if (s.recorder?.state === "recording") s.recorder.stop();
    await s.partStopped;
    s.stream.getTracks().forEach((tr) => tr.stop());
    void s.wakeLock?.release().catch(() => {});
    setPhase({ kind: "uploading" });

    try {
      await Promise.all(s.uploads);
    } catch (e) {
      return setPhase({ kind: "error", message: (e as Error).message });
    }
    const fin = await finishConsultation(s.token);
    if (fin.error) return setPhase({ kind: "error", message: fin.error });
    await poll(s.token);
  }

  async function poll(token: string) {
    setPhase({ kind: "processing" });
    for (let i = 0; i < POLL_LIMIT && alive.current; i++) {
      const r = await checkConsultation(token);
      if (!alive.current) return;
      if (r.state === "done") return setPhase({ kind: "done", token, result: r });
      if (r.state === "error") return setPhase({ kind: "error", message: r.error });
      await sleep(POLL_MS);
    }
    if (alive.current) setPhase({ kind: "error", message: "Transcription is taking too long. Please try again later." });
  }

  function speakerLabel(id: string) {
    return t("consult.speaker", { n: id.includes(".") ? id : Number(id) + 1 });
  }

  async function copySummary(summary: ConsultSummary) {
    const text = SECTIONS.filter((k) => summary[k].length)
      .map((k) => `${t(`consult.section.${k}`)}\n${summary[k].map((x) => `- ${x}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("consult.copied"));
    } catch {
      // Clipboard can be blocked; the summary stays on screen to select by hand.
    }
  }

  if (phase.kind === "done") {
    const { segments, summary, summaryError } = phase.result;
    const filled = summary ? SECTIONS.filter((k) => summary[k].length) : [];
    return (
      <div className="space-y-5">
        <Panel
          title={t("consult.summary")}
          action={
            summary && filled.length ? (
              <button type="button" className={buttonSecondary} onClick={() => copySummary(summary)}>
                <Copy size={16} aria-hidden />
                {t("consult.copy")}
              </button>
            ) : null
          }
        >
          <div className="space-y-4 px-4 pb-4">
            <p className="text-[12px] text-[var(--color-charcoal)]">{t("consult.summaryNote")}</p>
            {summaryError ? (
              <div className="space-y-3">
                <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-due-surface)] px-3 py-2 text-[13px] text-[var(--color-foreground)]">
                  {summaryError}
                </p>
                <button type="button" className={buttonSecondary} onClick={() => poll(phase.token)}>
                  <ArrowCounterClockwise size={16} aria-hidden />
                  {t("consult.retrySummary")}
                </button>
              </div>
            ) : filled.length ? (
              filled.map((k) => (
                <section key={k}>
                  <h3 className={`text-[13px] font-semibold ${k === "redFlags" ? "text-[var(--color-overdue)]" : "text-[var(--color-foreground)]"}`}>
                    {t(`consult.section.${k}`)}
                  </h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[14px]">
                    {summary![k].map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <p className="text-[14px]">{t("consult.summaryEmpty")}</p>
            )}
          </div>
        </Panel>

        <Panel title={t("consult.transcript")} count={segments.length}>
          <div className="px-4 pb-4">
            <p className="mb-3 text-[12px] text-[var(--color-charcoal)]">{t("consult.transcriptNote")}</p>
            <ol className="space-y-3">
              {segments.map((seg, i) => (
                <li key={i} className="text-[14px] leading-relaxed">
                  <span className="num mr-2 text-[12px] font-semibold text-[var(--color-primary)]">
                    {speakerLabel(seg.speaker)} · {clock(seg.start)}
                  </span>
                  <span>{seg.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>

        <button type="button" className={buttonSecondary} onClick={() => setPhase({ kind: "idle" })}>
          <Microphone size={16} aria-hidden />
          {t("consult.again")}
        </button>
      </div>
    );
  }

  return (
    <Panel title={t("consult.title")}>
      <div className="space-y-4 px-4 pb-5" aria-live="polite">
        {notice && <p className="text-[13px] text-[var(--color-charcoal)]">{notice}</p>}
        {phase.kind === "error" && (
          <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] px-3 py-2 text-[13px] text-[var(--color-foreground)]">
            {phase.message}
          </p>
        )}

        {(phase.kind === "idle" || phase.kind === "error") && (
          <>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px]">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-primary)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t("consult.consent")}</span>
            </label>
            <button type="button" className={`${buttonPrimary} w-full sm:w-auto`} disabled={!consent} onClick={start}>
              <Microphone size={18} weight="fill" aria-hidden />
              {t("consult.start")}
            </button>
          </>
        )}

        {phase.kind === "recording" && (
          <>
            <p className="flex items-center gap-2 text-[16px] font-semibold">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-overdue)]" aria-hidden />
              {t("consult.recording")} <span className="num">{clock(elapsed)}</span>
            </p>
            <p className="text-[13px] text-[var(--color-charcoal)]">{t("consult.keepScreenOn")}</p>
            <button type="button" className={`${buttonPrimary} w-full sm:w-auto`} onClick={stop}>
              <Stop size={18} weight="fill" aria-hidden />
              {t("consult.stop")}
            </button>
          </>
        )}

        {(phase.kind === "uploading" || phase.kind === "processing") && (
          <p className="flex items-center gap-2 text-[14px]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
            {t(phase.kind === "uploading" ? "consult.uploading" : "consult.processing")}
          </p>
        )}
      </div>
    </Panel>
  );
}
