"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Microphone, Stop, CheckCircle, Sparkle, X, ArrowRight, WarningCircle, CircleNotch } from "@phosphor-icons/react";
import { parseVoiceToVitals, inRange, validBp, VITAL_RANGES, type ParsedVitals } from "@/lib/voiceScribe";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

type Lang = "hi-IN" | "en-IN" | "mr-IN";
type Status = "idle" | "recording" | "transcribing";
type RowKey = "bp" | "weight" | "hb" | "fhr" | "fundalHeight" | "symptoms";
type Vals = { bpSys: string; bpDia: string; weight: string; hb: string; fhr: string; fundalHeight: string };

const MAX_SECONDS = 25; // Sarvam's synchronous endpoint takes clips under 30 s
const MIN_SECONDS = 1;
const UPLOAD_TIMEOUT_MS = 35_000;
// Chrome/Firefox/Android record webm or ogg, Safari/iOS records mp4; Sarvam accepts all three.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const EMPTY: Vals = { bpSys: "", bpDia: "", weight: "", hb: "", fhr: "", fundalHeight: "" };
const SCALAR_ROWS = [
  { key: "weight", label: "visits.scribe.weight", unit: "kg", range: "weight" },
  { key: "hb", label: "visits.scribe.hb", unit: "g/dL", range: "hb" },
  { key: "fhr", label: "visits.scribe.fhr", unit: "bpm", range: "fhr" },
  { key: "fundalHeight", label: "visits.scribe.fundalHeight", unit: "cm", range: "fundalHeight" },
] as const;

const fmt = (n: number | null) => (n === null ? "" : String(n));
const ERROR_BY_CODE: Record<string, MessageKey> = { not_configured: "visits.scribe.errNotConfigured", busy: "visits.scribe.errBusy" };

export function VoiceScribeModalContent({
  onClose,
  onApplyVitals,
}: {
  onClose: () => void;
  onApplyVitals: (vitals: ParsedVitals) => void;
}) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");
  const [lang, setLang] = useState<Lang>("hi-IN");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<MessageKey | null>(null);
  const [transcript, setTranscript] = useState("");
  const [vals, setVals] = useState<Vals>(EMPTY);
  const [found, setFound] = useState<RowKey[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [verified, setVerified] = useState<Partial<Record<RowKey, boolean>>>({});

  const alive = useRef(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const meter = useRef<HTMLDivElement>(null);

  /** Stops the clock, level meter and microphone. Safe to call repeatedly. */
  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      const rec = recorder.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      release();
    };
  }, [release]);

  const applyTranscript = (text: string) => {
    const p = parseVoiceToVitals(text);
    const rows: RowKey[] = [];
    if (p.bpSys !== null) rows.push("bp");
    for (const r of SCALAR_ROWS) if (p[r.key] !== null) rows.push(r.key);
    if (p.symptoms.length) rows.push("symptoms");
    setTranscript(text);
    setVals({ bpSys: fmt(p.bpSys), bpDia: fmt(p.bpDia), weight: fmt(p.weight), hb: fmt(p.hb), fhr: fmt(p.fhr), fundalHeight: fmt(p.fundalHeight) });
    setFound(rows);
    setSymptoms(p.symptoms);
    setRejected(p.rejected.map((r) => r.text));
    setVerified({});
  };

  const submit = async (blob: Blob, secs: number) => {
    if (secs < MIN_SECONDS || blob.size < 1500) {
      setError("visits.scribe.errTooShort");
      setStatus("idle");
      return;
    }
    const ctl = new AbortController();
    abort.current = ctl;
    const timeout = setTimeout(() => ctl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "clip");
      fd.append("lang", lang);
      const res = await fetch("/api/voice-vitals", { method: "POST", body: fd, signal: ctl.signal, redirect: "manual" });
      if (!alive.current) return;
      if (res.type === "opaqueredirect") return setError("visits.scribe.errSession");
      const body = (await res.json().catch(() => null)) as { transcript?: string; code?: string } | null;
      if (!res.ok || !body) return setError(ERROR_BY_CODE[body?.code ?? ""] ?? "visits.scribe.errFailed");
      if (!body.transcript) return setError("visits.scribe.errNoSpeech");
      applyTranscript(body.transcript);
    } catch {
      if (alive.current) setError("visits.scribe.errNetwork");
    } finally {
      clearTimeout(timeout);
      if (alive.current) setStatus("idle");
    }
  };

  const stopRecording = () => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return;
    setStatus("transcribing");
    rec.stop(); // onstop releases the mic and uploads
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("visits.scribe.errUnsupported");

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      return setError(name === "NotAllowedError" || name === "SecurityError" ? "visits.scribe.errMicDenied" : name === "NotFoundError" ? "visits.scribe.errNoMic" : "visits.scribe.errMic");
    }
    if (!alive.current) return media.getTracks().forEach((tr) => tr.stop());
    stream.current = media;

    let rec: MediaRecorder;
    try {
      const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
      rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
    } catch {
      release();
      return setError("visits.scribe.errUnsupported");
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      release();
      const secs = (Date.now() - startedAt) / 1000;
      void submit(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), secs);
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setStatus("recording");

    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stopRecording();
    }, 250);

    // Level meter is cosmetic: ignore if the browser lacks Web Audio.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(media).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        if (meter.current) meter.current.style.transform = `scaleX(${Math.min(1, peak / 64)})`;
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  // Validity of each row as currently edited.
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const valid: Record<RowKey, boolean> = {
    bp: validBp(n(vals.bpSys), n(vals.bpDia)),
    weight: inRange("weight", n(vals.weight)),
    hb: inRange("hb", n(vals.hb)),
    fhr: inRange("fhr", n(vals.fhr)),
    fundalHeight: inRange("fundalHeight", n(vals.fundalHeight)),
    symptoms: symptoms.length > 0,
  };
  const chosen = found.filter((k) => verified[k] && valid[k]);

  const handleApply = () => {
    const has = (k: RowKey) => chosen.includes(k);
    onApplyVitals({
      bpSys: has("bp") ? n(vals.bpSys) : null,
      bpDia: has("bp") ? n(vals.bpDia) : null,
      weight: has("weight") ? n(vals.weight) : null,
      hb: has("hb") ? n(vals.hb) : null,
      fhr: has("fhr") ? n(vals.fhr) : null,
      fundalHeight: has("fundalHeight") ? n(vals.fundalHeight) : null,
      symptoms: has("symptoms") ? symptoms : [],
      rawTranscript: transcript,
      rejected: [],
    });
    onClose();
  };

  const setVal = (k: keyof Vals, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const toggle = (k: RowKey, on: boolean) => setVerified((p) => ({ ...p, [k]: on }));
  const busy = status !== "idle";
  const nothingFound = transcript.trim() !== "" && found.length === 0;
  const mmss = `0:${String(seconds).padStart(2, "0")}`;

  const inputCls =
    "num w-16 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 text-[13px] font-bold text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none";
  const rowShell = "rounded-lg border bg-[var(--color-background)] p-2.5";

  const verifyBox = (k: RowKey, label: string) => (
    <input
      type="checkbox"
      checked={!!verified[k] && valid[k]}
      disabled={!valid[k]}
      onChange={(e) => toggle(k, e.target.checked)}
      aria-label={t("visits.scribe.verifyOne", { field: label })}
      className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
    />
  );

  const rangeWarning = (k: RowKey, min: number, max: number, hasInput: boolean) =>
    hasInput && !valid[k] ? (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-overdue)]">
        <WarningCircle size={13} className="shrink-0" />
        {t("visits.scribe.outOfRange", { min, max })}
      </p>
    ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("visits.scribe.dialogAria")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
              <Microphone size={16} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[14px] font-bold text-[var(--color-foreground)]">{t("visits.scribe.title")}</h2>
                <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                  {t("visits.scribe.badge")}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-charcoal)]">{t("visits.scribe.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("visits.scribe.close")}
            className="rounded-lg p-1.5 text-[var(--color-charcoal)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <div className="space-y-2.5 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--color-charcoal)]">{t("visits.scribe.dictLang")}</span>
                <select
                  value={lang}
                  disabled={busy}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-foreground)] focus:outline-none"
                >
                  <option value="hi-IN">{t("visits.scribe.optHi")}</option>
                  <option value="mr-IN">{t("visits.scribe.optMr")}</option>
                  <option value="en-IN">{t("visits.scribe.optEn")}</option>
                </select>
              </label>

              {status === "recording" ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-buttons)] bg-[var(--color-overdue)] px-4 text-[13px] font-semibold text-white shadow-sm"
                >
                  <Stop size={15} weight="fill" />
                  <span>{t("visits.scribe.stop")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={busy}
                  className={`${buttonPrimary} min-h-9 px-4 text-[13px]`}
                >
                  {status === "transcribing" ? <CircleNotch size={15} weight="bold" className="animate-spin" /> : <Microphone size={15} weight="bold" />}
                  <span>{transcript || error ? t("visits.scribe.retry") : t("visits.scribe.start")}</span>
                </button>
              )}
            </div>

            {status === "recording" && (
              <div className="space-y-1.5" role="status">
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-overdue)]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-ping rounded-full bg-[var(--color-overdue)]" />
                    {t("visits.scribe.recording")}
                  </span>
                  <span className="num">{mmss} / 0:{MAX_SECONDS}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div ref={meter} className="h-full origin-left scale-x-0 rounded-full bg-[var(--color-overdue)] transition-transform duration-75" />
                </div>
                <p className="text-[10px] text-[var(--color-charcoal)]">{t("visits.scribe.recHint", { seconds: MAX_SECONDS })}</p>
              </div>
            )}
            {status === "transcribing" && (
              <p className="text-[12px] font-medium text-[var(--color-charcoal)]" role="status">
                {t("visits.scribe.transcribing")}
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-cards)] border border-[var(--color-due)]/30 bg-[var(--color-due-surface)] p-3 text-[12px] text-[var(--color-foreground)]">
              <WarningCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-due)]" />
              <span>{t(error)}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-[var(--color-foreground)]" htmlFor="scribe-transcript">
              {t("visits.scribe.transcript")}
            </label>
            <textarea
              id="scribe-transcript"
              rows={3}
              value={transcript}
              disabled={busy}
              onChange={(e) => applyTranscript(e.target.value)}
              placeholder={t("visits.scribe.transcriptPlaceholder")}
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] p-3 font-mono text-[13px] leading-relaxed text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {transcript.trim() !== "" && (
            <div className="space-y-3 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-foreground)]">
                  <Sparkle size={15} weight="fill" className="text-[var(--color-primary)]" />
                  {t("visits.scribe.extracted")}
                </span>
                {found.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVerified(Object.fromEntries(found.filter((k) => valid[k]).map((k) => [k, true])))}
                    className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-on-track)]"
                  >
                    <CheckCircle size={14} weight="fill" /> {t("visits.scribe.verifyAll")}
                  </button>
                )}
              </div>

              {nothingFound && (
                <p className="text-[12px] text-[var(--color-charcoal)]">{t("visits.scribe.nothingFound")}</p>
              )}
              {rejected.map((r, i) => (
                <p key={i} className="flex items-center gap-1 text-[11px] text-[var(--color-overdue)]">
                  <WarningCircle size={13} className="shrink-0" />
                  {t("visits.scribe.heardRejected", { text: r })}
                </p>
              ))}

              {found.includes("bp") && (
                <div className={`${rowShell} ${valid.bp ? "border-[var(--color-border)]" : "border-[var(--color-overdue)]/50"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {verifyBox("bp", t("visits.scribe.bp"))}
                    <span className="min-w-24 text-[11px] text-[var(--color-charcoal)]">{t("visits.scribe.bp")}</span>
                    <input inputMode="numeric" aria-label={t("visits.form.bpSys")} value={vals.bpSys} onChange={(e) => setVal("bpSys", e.target.value)} className={inputCls} />
                    <span>/</span>
                    <input inputMode="numeric" aria-label={t("visits.form.bpDia")} value={vals.bpDia} onChange={(e) => setVal("bpDia", e.target.value)} className={inputCls} />
                    <span className="text-[10px] text-[var(--color-charcoal)]">mmHg</span>
                  </div>
                  {rangeWarning("bp", VITAL_RANGES.bpDia.min, VITAL_RANGES.bpSys.max, true)}
                </div>
              )}

              {SCALAR_ROWS.filter((r) => found.includes(r.key)).map((r) => (
                <div key={r.key} className={`${rowShell} ${valid[r.key] ? "border-[var(--color-border)]" : "border-[var(--color-overdue)]/50"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {verifyBox(r.key, t(r.label))}
                    <span className="min-w-24 text-[11px] text-[var(--color-charcoal)]">{t(r.label)}</span>
                    <input inputMode="decimal" aria-label={t(r.label)} value={vals[r.key]} onChange={(e) => setVal(r.key, e.target.value)} className={inputCls} />
                    <span className="text-[10px] text-[var(--color-charcoal)]">{r.unit}</span>
                  </div>
                  {rangeWarning(r.key, VITAL_RANGES[r.range].min, VITAL_RANGES[r.range].max, true)}
                </div>
              ))}

              {found.includes("symptoms") && (
                <div className={`${rowShell} border-[var(--color-border)]`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    {verifyBox("symptoms", t("visits.scribe.symptoms"))}
                    <span className="text-[11px] font-semibold text-[var(--color-overdue)]">{t("visits.scribe.symptoms")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {symptoms.map((sym) => (
                      <span key={sym} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-overdue)]/30 bg-[var(--color-overdue-surface)] py-0.5 pl-2.5 pr-1 text-[11px] font-semibold text-[var(--color-overdue)]">
                        {sym}
                        <button type="button" aria-label={t("visits.scribe.removeSymptom", { symptom: sym })} onClick={() => setSymptoms((p) => p.filter((x) => x !== sym))} className="rounded-full p-0.5 hover:bg-[var(--color-overdue)]/15">
                          <X size={11} weight="bold" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3">
          <button type="button" onClick={onClose} className={`${buttonSecondary} min-h-9 px-4 text-[13px]`}>
            {t("visits.scribe.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || chosen.length === 0}
            className={`${buttonPrimary} min-h-9 gap-1.5 px-4 text-[13px]`}
          >
            <span>{chosen.length ? t("visits.scribe.applyN", { n: chosen.length }) : t("visits.scribe.applyNone")}</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
