"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  WhatsappLogo,
  Copy,
  Check,
  Sparkle,
  Heartbeat,
  Pill,
  Baby,
  CalendarCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  generateCounseling,
  COUNSELING_LANGUAGES,
  type CounselingLanguage,
  type CounselingPatientData,
} from "@/lib/voiceCounselor";
import { whatsAppLink } from "@/lib/whatsapp";
import { createListenLink } from "@/app/(app)/patients/[id]/actions";
import { useLocale, useT } from "@/lib/i18n/provider";
import { OverlayShell } from "@/components/OverlayShell";
import { buttonGhost, buttonPrimary, buttonSecondary, chipClass, inputClass, labelClass } from "@/components/ui";



export function VoiceCounselorModal({
  data,
  onClose,
}: {
  data: CounselingPatientData;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [lang, setLang] = useState<CounselingLanguage>("hi");
  const [customNote, setCustomNote] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.92); // Slightly slower, calm cadence
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Signed public listen link for the selected language (fetched from the server;
  // the message omits the link until it is ready, never falls back to a login-only URL).
  const [listenLink, setListenLink] = useState<{ lang: CounselingLanguage; url: string | null } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    createListenLink(data.patientId, lang)
      .then((r) => {
        if (cancelled) return;
        setListenLink({ lang, url: r.url });
        setLinkError(r.error);
      })
      .catch(() => {
        if (cancelled) return;
        setListenLink({ lang, url: null });
        setLinkError(t("patientDetail.listen.createFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [data.patientId, lang, t]);
  const linkReady = listenLink?.lang === lang;
  const audioListenUrl = linkReady ? listenLink.url : null;

  // Generate the counseling object dynamically based on inputs
  const counseling = useMemo(() => {
    return generateCounseling({ ...data, doctorCustomNote: customNote, audioListenUrl }, lang);
  }, [data, customNote, lang, audioListenUrl]);

  // Estimated duration in seconds (based on word count & speech rate)
  const estimatedDuration = useMemo(() => {
    const wordCount = counseling.speechText.split(/\s+/).length;
    // Average speech rate is ~2.2 words per second at rate 1.0
    return Math.max(15, Math.round(wordCount / (2.2 * speechRate)));
  }, [counseling.speechText, speechRate]);

  // Clean up speech synthesis when unmounting or switching languages
  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Find best regional voice
  const findRegionalVoice = (langCode: CounselingLanguage): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const langTags: Record<CounselingLanguage, string[]> = {
      hi: ["hi-IN", "hi_IN", "hi", "hin"],
      mr: ["mr-IN", "mr_IN", "mr", "mar", "hi-IN"], // Fallback to Indian voice if Marathi not installed
      gu: ["gu-IN", "gu_IN", "gu", "guj", "hi-IN"], // Fallback to Indian voice if Gujarati not installed
      en: ["en-IN", "en_IN", "en-GB", "en-US", "en"],
    };

    const targetTags = langTags[langCode];
    for (const tag of targetTags) {
      const match = voices.find((v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(tag.toLowerCase()));
      if (match) return match;
    }

    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  };

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert(t("patientDetail.counselor.ttsUnsupported"));
      return;
    }

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      startTimer();
      return;
    }

    // Start fresh speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(counseling.speechText);
    utteranceRef.current = utterance;

    const voice = findRegionalVoice(lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      const defaultLangs: Record<CounselingLanguage, string> = {
        hi: "hi-IN",
        mr: "mr-IN",
        gu: "gu-IN",
        en: "en-IN",
      };
      utterance.lang = defaultLangs[lang];
    }

    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentTime(0);
      startTimer();
    };

    utterance.onend = () => {
      stopSpeech();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error or canceled:", e);
      stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= estimatedDuration) {
          return estimatedDuration;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleCopy = async () => {
    if (!linkReady) return;
    try {
      await navigator.clipboard.writeText(counseling.whatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const waLink = data.phone ? whatsAppLink(data.phone, counseling.whatsappMessage) : null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = Math.min(100, (currentTime / estimatedDuration) * 100);

  const getSectionIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Baby size={18} className="text-[var(--color-primary)]" />;
      case 1:
        return <Pill size={18} className="text-[var(--color-on-track)]" />;
      case 2:
        return <Heartbeat size={18} className="text-[var(--color-info)]" />;
      case 3:
        return <WarningCircle size={18} className="text-[var(--color-overdue)]" />;
      default:
        return <CalendarCheck size={18} className="text-[var(--color-charcoal)]" />;
    }
  };

  const closeAll = () => {
    stopSpeech();
    onClose();
  };
  const playing = isPlaying && !isPaused;
  const playLabel = playing ? t("patientDetail.counselor.pause") : t("patientDetail.counselor.play");
  const stateLabel = playing
    ? t("patientDetail.counselor.speaking")
    : isPaused
      ? t("patientDetail.counselor.paused")
      : t("patientDetail.counselor.preview");

  return (
    <OverlayShell
      title={t("patientDetail.counselor.title")}
      subtitle={t("patientDetail.counselor.subtitle", { name: data.patientName, weeks: data.gaWeeks ?? 24 })}
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
          <Sparkle size={12} weight="fill" aria-hidden />
          {t("patientDetail.counselor.badge")}
        </span>
      }
      closeLabel={t("common.close")}
      onClose={closeAll}
      size="lg"
      footer={
        <>
          <button type="button" onClick={handleCopy} className={`${buttonSecondary} sm:mr-auto`}>
            {copied ? (
              <>
                <Check size={16} weight="bold" aria-hidden />
                <span>{t("patientDetail.counselor.copied")}</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden />
                <span>{t("patientDetail.counselor.copyText")}</span>
              </>
            )}
          </button>
          {linkError && linkReady && (
            <span role="alert" className="text-[13px] text-[var(--color-overdue)]">
              {linkError}
            </span>
          )}
          {!linkReady && <span className="text-[13px] text-[var(--color-charcoal)]">{t("patientDetail.counselor.preparing")}</span>}
          {waLink ? (
            <a
              href={linkReady ? waLink : undefined}
              aria-disabled={!linkReady}
              target="_blank"
              rel="noreferrer"
              className={`${buttonPrimary} ${linkReady ? "" : "pointer-events-none opacity-50"}`}
            >
              <WhatsappLogo size={18} weight="fill" aria-hidden />
              <span>{t("patientDetail.counselor.sendWa")}</span>
            </a>
          ) : (
            <button type="button" onClick={handleCopy} className={buttonPrimary}>
              <WhatsappLogo size={18} weight="fill" aria-hidden />
              <span>{t("patientDetail.counselor.copyWa")}</span>
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-[var(--color-charcoal)]">{t("patientDetail.counselor.chooseLang")}</span>
          <div className="flex flex-wrap gap-2">
            {COUNSELING_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={lang === l.code}
                onClick={() => {
                  stopSpeech();
                  setLang(l.code);
                }}
                className={chipClass(lang === l.code)}
              >
                <span>{l.nativeLabel}</span>
                {locale === "en" && <span className="text-[12px] font-normal opacity-80">({l.label})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}
              title={playLabel}
              aria-label={playLabel}
            >
              {playing ? <Pause size={26} weight="fill" aria-hidden /> : <Play size={26} weight="fill" className="ml-0.5" aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold" role="status">
                  {stateLabel}
                </span>
                <span className="rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
                  {counseling.nativeLabel}
                </span>
              </div>
              <p className="num text-[13px] text-[var(--color-charcoal)]">
                {t("patientDetail.counselor.tone", { time: formatTimer(currentTime), duration: formatTimer(estimatedDuration) })}
              </p>
            </div>
          </div>

          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={t("patientDetail.counselor.title")}
          >
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)]/70 pt-3 text-[13px] text-[var(--color-charcoal)]">
            <div className="flex flex-wrap items-center gap-2">
              <span>{t("patientDetail.counselor.speed")}</span>
              {[
                { rate: 0.82, label: t("patientDetail.counselor.speedSlow") },
                { rate: 0.95, label: t("patientDetail.counselor.speedNormal") },
                { rate: 1.15, label: t("patientDetail.counselor.speedFast") },
              ].map((s) => (
                <button
                  key={s.rate}
                  type="button"
                  aria-pressed={speechRate === s.rate}
                  onClick={() => {
                    setSpeechRate(s.rate);
                    if (isPlaying) stopSpeech();
                  }}
                  className={chipClass(speechRate === s.rate)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {isPlaying && (
              <button type="button" onClick={stopSpeech} className={buttonGhost}>
                <ArrowCounterClockwise size={16} aria-hidden />
                <span>{t("patientDetail.counselor.stop")}</span>
              </button>
            )}
          </div>
        </div>

        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-semibold">{t("patientDetail.counselor.overview")}</h3>
            <span className="text-[13px] text-[var(--color-charcoal)]">{t("patientDetail.counselor.guidelines")}</span>
          </div>
          <ul className="divide-y divide-[var(--color-border)]/70 rounded-[var(--radius-buttons)] border border-[var(--color-border)]">
            {counseling.sections.map((section, idx) => (
              <li key={idx} className="px-3.5 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="shrink-0">{getSectionIcon(idx)}</span>
                  <h4 className="text-[14px] font-semibold">{section.title}</h4>
                </div>
                <p className="whitespace-pre-line pl-7 text-[14px] leading-relaxed text-[var(--color-charcoal)]">{section.content}</p>
              </li>
            ))}
          </ul>
        </section>

        <div>
          <label htmlFor="doctor-note" className={labelClass}>
            {t("patientDetail.counselor.noteLabel")}
          </label>
          <input
            id="doctor-note"
            type="text"
            placeholder={t("patientDetail.counselor.notePlaceholder")}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </OverlayShell>
  );
}
