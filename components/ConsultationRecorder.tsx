"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, Stop, Copy, Check, ArrowCounterClockwise } from "@phosphor-icons/react";
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
  | { kind: "error"; message: string; retry?: { label: string; run: () => void } };

interface Part {
  index: number;
  blob: Blob;
  ok?: boolean;
  error?: string;
  expired?: boolean;
}

interface Session {
  token: string;
  stream: MediaStream;
  mimeType: string;
  parts: number;
  list: Part[];
  uploads: Promise<void>[];
  stopped: Promise<void>[];
  recorder: MediaRecorder | null;
  wakeLock: WakeLockSentinel | null;
  stopping: boolean;
}

// Each part is uploaded as its own request; Vercel caps request bodies at 4.5 MB.
const PART_BYTES = 3_000_000;
const MAX_PARTS = 20; // Sarvam: files per job. Must equal MAX_PARTS in lib/consultation.ts.
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];
const POLL_MS = 4000;
const POLL_LIMIT = 150; // ~10 minutes
const SECTIONS: (keyof ConsultSummary)[] = ["redFlags", "complaints", "findings", "history", "assessment", "plan", "advice", "followUp"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Never rejects: the outcome is recorded on the part so failed parts can be retried alone.
async function uploadPart(token: string, part: Part): Promise<void> {
  part.ok = false;
  part.error = undefined;
  part.expired = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    try {
      // "manual": a session-expiry redirect must not be followed and mistaken for success.
      const res = await fetch("/api/consultations/upload", {
        method: "POST",
        body: part.blob,
        redirect: "manual",
        headers: { "x-consult-token": token, "x-part-index": String(part.index), "Content-Type": part.blob.type },
      });
      if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) {
        part.expired = true;
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok === true) {
        part.ok = true;
        return;
      }
      part.error = body?.error;
      if (res.status < 500 && !res.ok) break; // retrying won't fix a rejected part
    } catch {
      part.error = "Network error while uploading. Check the connection.";
    }
  }
}

export function ConsultationRecorder({ patientId }: { patientId: string }) {
  const t = useT();
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const session = useRef<Session | null>(null);
  const alive = useRef(true);
  const starting = useRef(false);

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

  function micStopped(s: Session) {
    if (s.stopping) return;
    setNotice(t("consult.micStopped"));
    void stop();
  }

  function startPart(s: Session) {
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
      try {
        startPart(s);
      } catch {
        micStopped(s);
      }
    };
    rec.onerror = () => micStopped(s);
    rec.start(1000); // may throw; nothing below runs then, so no part is counted
    const index = s.parts++;
    s.stopped.push(
      new Promise<void>((resolve) => {
        rec.onstop = () => {
          const type = (rec.mimeType || s.mimeType || "audio/webm").split(";")[0];
          if (chunks.length) {
            const part: Part = { index, blob: new Blob(chunks, { type }) };
            s.list.push(part);
            s.uploads.push(uploadPart(s.token, part));
          }
          resolve();
        };
      }),
    );
    s.recorder = rec;
  }

  async function start() {
    if (starting.current) return;
    starting.current = true;
    try {
      await begin();
    } finally {
      starting.current = false;
    }
  }

  async function begin() {
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

    let res: Awaited<ReturnType<typeof startConsultation>>;
    try {
      res = await startConsultation(patientId);
    } catch {
      res = { error: t("consult.genericError") };
    }
    if ("error" in res) {
      stream.getTracks().forEach((tr) => tr.stop());
      return setPhase({ kind: "error", message: res.error });
    }

    const s: Session = {
      token: res.token,
      stream,
      mimeType: MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "",
      parts: 0,
      list: [],
      uploads: [],
      stopped: [],
      recorder: null,
      wakeLock: (await navigator.wakeLock?.request("screen").catch(() => null)) ?? null,
      stopping: false,
    };
    if (!alive.current) {
      // Left the page during the permission prompt or the server round trip: release the mic.
      stream.getTracks().forEach((tr) => tr.stop());
      void s.wakeLock?.release().catch(() => {});
      return;
    }
    session.current = s;
    try {
      startPart(s);
    } catch {
      stream.getTracks().forEach((tr) => tr.stop());
      void s.wakeLock?.release().catch(() => {});
      return setPhase({ kind: "error", message: t("consult.unsupported") });
    }
    stream.getAudioTracks()[0].onended = () => micStopped(s);
    setPhase({ kind: "recording" });
  }

  async function stop() {
    const s = session.current;
    if (!s || s.stopping) return;
    s.stopping = true;
    if (s.recorder?.state === "recording") s.recorder.stop();
    await Promise.all(s.stopped);
    s.stream.getTracks().forEach((tr) => tr.stop());
    void s.wakeLock?.release().catch(() => {});
    if (!s.list.length) return setPhase({ kind: "error", message: t("consult.tooShort") });
    await submit(s);
  }

  async function submit(s: Session) {
    setPhase({ kind: "uploading" });
    await Promise.all(s.uploads); // never rejects; outcomes are on each part
    const failed = s.list.filter((p) => !p.ok);
    if (failed.length) {
      const message = failed.some((p) => p.expired) ? t("consult.sessionExpired") : (failed.find((p) => p.error)?.error ?? t("consult.uploadFailed"));
      return setPhase({ kind: "error", message, retry: { label: t("consult.retryUploads"), run: () => retryUploads(s) } });
    }
    let fin: { error: string | null };
    try {
      fin = await finishConsultation(s.token);
    } catch {
      fin = { error: t("consult.genericError") };
    }
    if (fin.error) return setPhase({ kind: "error", message: fin.error });
    await poll(s.token);
  }

  function retryUploads(s: Session) {
    s.uploads = s.list.filter((p) => !p.ok).map((p) => uploadPart(s.token, p));
    void submit(s);
  }

  async function poll(token: string) {
    setPhase({ kind: "processing" });
    let fails = 0;
    for (let i = 0; i < POLL_LIMIT && alive.current; i++) {
      let r: CheckResult | null = null;
      try {
        r = await checkConsultation(token);
      } catch {
        // transient; counted below
      }
      if (!alive.current) return;
      if (r) {
        fails = 0;
        if (r.state === "done") return setPhase({ kind: "done", token, result: r });
        if (r.state === "error") return setPhase({ kind: "error", message: r.error });
      } else if (++fails >= 3) {
        return setPhase({ kind: "error", message: t("consult.genericError") });
      }
      await sleep(POLL_MS);
    }
    // Keep the token: the job may still finish, so offer to resume polling.
    if (alive.current) setPhase({ kind: "error", message: t("consult.slow"), retry: { label: t("consult.checkAgain"), run: () => void poll(token) } });
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
      showToast(t("consult.copyFailed"));
    }
  }

  const stepIdx = phase.kind === "done" ? 2 : phase.kind === "uploading" || phase.kind === "processing" ? 1 : 0;
  const steps = (
    <ol aria-label={t("consult.steps")} className="flex items-center gap-2 text-[13px]">
      {(["record", "transcribe", "summary"] as const).map((k, i) => (
        <li key={k} aria-current={i === stepIdx ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
              i < stepIdx
                ? "bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]"
                : i === stepIdx
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]"
            }`}
          >
            {i < stepIdx ? <Check size={14} weight="bold" aria-hidden /> : i + 1}
          </span>
          <span className={i === stepIdx ? "font-semibold" : "text-[var(--color-charcoal)]"}>{t(`consult.step.${k}`)}</span>
          {i < 2 && <span aria-hidden className="h-px w-4 bg-[var(--color-border-strong)]/50 sm:w-8" />}
        </li>
      ))}
    </ol>
  );

  if (phase.kind === "done") {
    const { segments, summary, summaryError } = phase.result;
    const filled = summary ? SECTIONS.filter((k) => summary[k].length) : [];
    return (
      <div className="space-y-4 md:space-y-5">
        {steps}
        <Panel
          title={t("consult.summary")}
          action={
            summary && filled.length ? (
              <button type="button" className={buttonPrimary} onClick={() => copySummary(summary)}>
                <Copy size={16} aria-hidden />
                {t("consult.copy")}
              </button>
            ) : null
          }
        >
          <div className="space-y-4 px-4 py-4">
            <p className="text-[13px] text-[var(--color-charcoal)]">{t("consult.summaryNote")}</p>
            {summaryError ? (
              <div className="space-y-3">
                <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-due-surface)] px-3 py-2 text-[14px] text-[var(--color-foreground)]">
                  {summaryError}
                </p>
                {segments.length > 0 && (
                  <button type="button" className={buttonSecondary} onClick={() => poll(phase.token)}>
                    <ArrowCounterClockwise size={16} aria-hidden />
                    {t("consult.retrySummary")}
                  </button>
                )}
              </div>
            ) : filled.length ? (
              <div className="max-w-prose space-y-4">
                {filled.map((k) => (
                  <section key={k}>
                    <h3 className={`text-[14px] font-semibold ${k === "redFlags" ? "text-[var(--color-overdue)]" : "text-[var(--color-foreground)]"}`}>
                      {t(`consult.section.${k}`)}
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
                      {summary![k].map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="text-[14px]">{t("consult.summaryEmpty")}</p>
            )}
          </div>
        </Panel>

        <Panel title={t("consult.transcript")} count={segments.length}>
          <div className="px-4 py-4">
            <p className="mb-3 text-[13px] text-[var(--color-charcoal)]">{t("consult.transcriptNote")}</p>
            <ol className="max-w-prose space-y-3">
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

  const working = phase.kind === "uploading" || phase.kind === "processing";
  const recording = phase.kind === "recording";
  const stateLabel = recording
    ? t("consult.recording")
    : working
      ? t(phase.kind === "uploading" ? "consult.uploading" : "consult.processing")
      : t("consult.ready");

  return (
    <div className="space-y-4 md:space-y-5">
      {steps}
      <Panel title={t("consult.title")}>
        <div className="space-y-4 px-4 py-5" aria-live="polite">
          {notice && <p className="text-[14px] text-[var(--color-charcoal)]">{notice}</p>}
          {phase.kind === "error" && (
            <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] px-3 py-2 text-[14px] text-[var(--color-foreground)]">
              {phase.message}
            </p>
          )}
          {phase.kind === "error" && phase.retry && (
            <button type="button" className={buttonSecondary} onClick={phase.retry.run}>
              <ArrowCounterClockwise size={16} aria-hidden />
              {phase.retry.label}
            </button>
          )}

          <div className="flex flex-col items-center gap-3 py-2 text-center">
            {working ? (
              <span className="h-24 w-24 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={recording ? stop : start}
                disabled={!recording && !consent}
                aria-label={recording ? t("consult.stop") : t("consult.start")}
                className={`press flex h-24 w-24 items-center justify-center rounded-full text-white shadow-[var(--shadow-overlay)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  recording ? "bg-[var(--color-overdue)] hover:opacity-90" : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                }`}
              >
                {recording ? <Stop size={40} weight="fill" aria-hidden /> : <Microphone size={44} weight="fill" aria-hidden />}
              </button>
            )}
            <p className="flex items-center gap-2 text-[18px] font-semibold" role="status">
              {recording && <span aria-hidden className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-overdue)]" />}
              {stateLabel}
            </p>
            {recording && <p className="num text-[32px] font-semibold leading-none">{clock(elapsed)}</p>}
            {recording && <p className="max-w-sm text-[13px] text-[var(--color-charcoal)]">{t("consult.keepScreenOn")}</p>}
            {!working && (
              <p className={`text-[15px] font-medium ${!recording && !consent ? "text-[var(--color-charcoal)]" : "text-[var(--color-primary)]"}`}>
                {recording ? t("consult.stop") : t("consult.start")}
              </p>
            )}
          </div>

          {(phase.kind === "idle" || phase.kind === "error") && (
            <label className="mx-auto flex min-h-11 max-w-sm cursor-pointer items-start gap-3 text-[14px]">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t("consult.consent")}</span>
            </label>
          )}
        </div>
      </Panel>
    </div>
  );
}
