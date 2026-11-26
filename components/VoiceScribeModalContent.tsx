/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Microphone, MicrophoneSlash, CheckCircle, Sparkle, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { OverlayShell } from "@/components/OverlayShell";
import { parseVoiceToVitals, type ParsedVitals } from "@/lib/voiceScribe";
import { buttonDanger, buttonPrimary, buttonSecondary, chipClass, inputClass, labelClass } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

export function VoiceScribeModalContent({
  onClose,
  onApplyVitals,
}: {
  onClose: () => void;
  onApplyVitals: (vitals: ParsedVitals) => void;
}) {
  const t = useT();
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<"hi-IN" | "en-IN" | "mr-IN">("hi-IN");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedVitals | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    setErrorMsg(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(t("visits.scribe.errUnsupported"));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        const clean = currentText.trim();
        setTranscript(clean);
        setParsed(parseVoiceToVitals(clean));
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          setErrorMsg(t("visits.scribe.errVoice", { error: String(e.error) }));
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMsg(err.message || t("visits.scribe.errMic"));
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleManualChange = (text: string) => {
    setTranscript(text);
    setParsed(parseVoiceToVitals(text));
  };

  const handleApply = () => {
    if (parsed) {
      onApplyVitals(parsed);
      onClose();
    }
  };

  const samplePrompts = [
    {
      title: t("visits.scribe.sampleHi"),
      text: "BP 130 80, vajan 54 kilo, hemoglobin 9.5, pairon mein sujan",
    },
    {
      title: t("visits.scribe.sampleEn"),
      text: "BP 145 over 95, weight 62, hemoglobin 8.4, severe headache and blurred vision",
    },
    {
      title: t("visits.scribe.sampleMr"),
      text: "BP 120 80, vajan 50 kilo, hemoglobin 11, fhr 140",
    },
  ];

  const hasVitals = !!parsed && !!(parsed.bpSys || parsed.weight || parsed.hb || parsed.symptoms.length > 0);
  const cells: { label: string; value: string | null; unit: string }[] = [
    { label: t("visits.scribe.bp"), value: parsed?.bpSys && parsed?.bpDia ? `${parsed.bpSys} / ${parsed.bpDia}` : null, unit: "mmHg" },
    { label: t("visits.scribe.weight"), value: parsed?.weight ? `${parsed.weight}` : null, unit: "kg" },
    { label: t("visits.scribe.hb"), value: parsed?.hb ? `${parsed.hb}` : null, unit: "g/dL" },
    { label: t("visits.scribe.fhr"), value: parsed?.fhr ? `${parsed.fhr}` : null, unit: "bpm" },
  ];

  return (
    <OverlayShell
      title={t("visits.scribe.title")}
      subtitle={t("visits.scribe.subtitle")}
      badge={
        <span className="rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
          {t("visits.scribe.badge")}
        </span>
      }
      closeLabel={t("visits.scribe.close")}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonSecondary}>
            {t("visits.scribe.cancel")}
          </button>
          <button type="button" onClick={handleApply} disabled={!hasVitals} className={buttonPrimary}>
            <span>{t("visits.scribe.apply")}</span>
            <ArrowRight size={16} weight="bold" aria-hidden />
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-3">
          <div className="min-w-0 flex-1 sm:max-w-[14rem]">
            <label htmlFor="scribe-lang" className={labelClass}>
              {t("visits.scribe.dictLang")}
            </label>
            <select id="scribe-lang" value={lang} onChange={(e) => setLang(e.target.value as "hi-IN" | "en-IN" | "mr-IN")} className={inputClass}>
              <option value="hi-IN">{t("visits.scribe.optHi")}</option>
              <option value="mr-IN">{t("visits.scribe.optMr")}</option>
              <option value="en-IN">{t("visits.scribe.optEn")}</option>
            </select>
          </div>
          <button type="button" onClick={isListening ? stopListening : startListening} className={isListening ? buttonDanger : buttonPrimary}>
            {isListening ? <MicrophoneSlash size={18} weight="bold" aria-hidden /> : <Microphone size={18} weight="bold" aria-hidden />}
            <span>{isListening ? t("visits.scribe.stop") : t("visits.scribe.start")}</span>
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-center gap-2 rounded-[var(--radius-buttons)] bg-[var(--color-due-surface)] p-3 text-[13px]">
            <WarningCircle size={16} weight="fill" className="shrink-0 text-[var(--color-due)]" aria-hidden />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="scribe-transcript" className="text-[13px] font-medium text-[var(--color-charcoal)]">
              {t("visits.scribe.transcript")}
            </label>
            {isListening && (
              <span role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-overdue)]">
                <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-overdue)]" />
                {t("visits.scribe.listening")}
              </span>
            )}
          </div>
          <textarea
            id="scribe-transcript"
            rows={3}
            value={transcript}
            onChange={(e) => handleManualChange(e.target.value)}
            placeholder={t("visits.scribe.transcriptPlaceholder")}
            className={`${inputClass} py-2 leading-relaxed`}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">{t("visits.scribe.samples")}</span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((s, idx) => (
              <button key={idx} type="button" onClick={() => handleManualChange(s.text)} className={`${chipClass(false)} min-w-0 max-w-full`}>
                <span className="font-semibold text-[var(--color-primary)]">{s.title}</span>
                <span className="truncate text-[var(--color-charcoal)]">&ldquo;{s.text.slice(0, 30)}...&rdquo;</span>
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-3 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[14px] font-semibold">
              <Sparkle size={16} weight="fill" className="text-[var(--color-primary)]" aria-hidden />
              {t("visits.scribe.extracted")}
            </h3>
            {hasVitals ? (
              <span className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-on-track)]">
                <CheckCircle size={16} weight="fill" aria-hidden /> {t("visits.scribe.ready")}
              </span>
            ) : (
              <span className="text-[13px] text-[var(--color-charcoal)]">{t("visits.scribe.awaiting")}</span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cells.map((c) => (
              <div key={c.label} className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] p-2.5">
                <dt className="text-[12px] text-[var(--color-charcoal)]">{c.label}</dt>
                <dd className="num mt-0.5 text-[18px] font-semibold">
                  {c.value ?? "—"}
                  {c.value && <span className="ml-1 text-[12px] font-normal text-[var(--color-charcoal)]">{c.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>

          {parsed && parsed.symptoms.length > 0 && (
            <div className="border-t border-[var(--color-border)]/70 pt-3">
              <div className="mb-1.5 text-[13px] font-semibold text-[var(--color-overdue)]">{t("visits.scribe.symptoms")}</div>
              <div className="flex flex-wrap gap-1.5">
                {parsed.symptoms.map((sym, i) => (
                  <span key={i} className="rounded-full bg-[var(--color-overdue-surface)] px-2.5 py-0.5 text-[13px] font-semibold text-[var(--color-overdue)]">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </OverlayShell>
  );
}
