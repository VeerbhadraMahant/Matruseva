"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  SpeakerHigh,
  Play,
  Pause,
  ArrowCounterClockwise,
  WhatsappLogo,
  Copy,
  Check,
  X,
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
import { buttonPrimary, buttonSecondary } from "@/components/ui";

export interface VoiceCounselorButtonProps {
  data: CounselingPatientData;
  variant?: "primary" | "secondary" | "subtle";
  label?: string;
}

export function VoiceCounselorButton({
  data,
  variant = "secondary",
  label = "AI Voice Counseling",
}: VoiceCounselorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttonStyle =
    variant === "primary"
      ? buttonPrimary
      : variant === "subtle"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-xs cursor-pointer"
      : `${buttonSecondary} gap-1.5`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonStyle}
        title="Generate personalized vernacular audio & counseling for the mother"
      >
        <SpeakerHigh size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>{label}</span>
      </button>

      {isOpen && <VoiceCounselorModal data={data} onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function VoiceCounselorModal({
  data,
  onClose,
}: {
  data: CounselingPatientData;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<CounselingLanguage>("hi");
  const [customNote, setCustomNote] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.92); // Slightly slower, calm cadence
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate the counseling object dynamically based on inputs
  const counseling = useMemo(() => {
    return generateCounseling({ ...data, doctorCustomNote: customNote }, lang);
  }, [data, customNote, lang]);

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
      alert("Text-to-speech is not supported on this browser.");
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
        return <Pill size={18} className="text-emerald-700" />;
      case 2:
        return <Heartbeat size={18} className="text-sky-700" />;
      case 3:
        return <WarningCircle size={18} className="text-red-600" />;
      default:
        return <CalendarCheck size={18} className="text-[var(--color-charcoal)]" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Multilingual Patient Voice Counseling"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopSpeech();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--color-background)] shadow-2xl overflow-hidden border border-[var(--color-border)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-pc-lilac)_85%,transparent)_0%,var(--color-surface-1)_100%)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-xs">
              <SpeakerHigh size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">
                  AI Vernacular Audio Counseling
                </h2>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                  <Sparkle size={10} weight="fill" />
                  Mother Bridge
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-charcoal)]">
                {data.patientName} · GA {data.gaWeeks ?? 24}w · Vitals-tailored counseling in regional language
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="rounded-lg p-1.5 text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Language Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <span className="text-[12px] font-semibold text-[var(--color-charcoal)]">
              Choose Mother&apos;s Language:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COUNSELING_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { stopSpeech(); setLang(l.code); }}
                  className={`px-3 py-1.5 text-[12px] rounded-lg font-semibold transition-all cursor-pointer ${
                    lang === l.code
                      ? "bg-[var(--color-primary)] text-white shadow-xs"
                      : "bg-[var(--color-surface-1)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                  }`}
                >
                  <span>{l.nativeLabel}</span>
                  <span className="ml-1 text-[10px] opacity-75 font-normal">({l.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Voice Player Card */}
          <div className="rounded-xl border border-[var(--color-border-strong)] bg-[linear-gradient(180deg,var(--color-surface-1)_0%,var(--color-background)_100%)] p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 cursor-pointer ${
                    isPlaying && !isPaused
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                  }`}
                  title={isPlaying && !isPaused ? "Pause playback" : "Play Vernacular Counseling Audio"}
                >
                  {isPlaying && !isPaused ? (
                    <Pause size={20} weight="fill" />
                  ) : (
                    <Play size={20} weight="fill" className="ml-0.5" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--color-foreground)]">
                      {isPlaying && !isPaused ? "Speaking to Patient..." : isPaused ? "Paused" : "Listen Audio Preview"}
                    </span>
                    <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.2 text-[10px] font-semibold text-[var(--color-primary)]">
                      {counseling.nativeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-charcoal)]">
                    {formatTimer(currentTime)} / {formatTimer(estimatedDuration)} · Calibrated maternal tone
                  </p>
                </div>
              </div>

              {/* Soundwave Animation */}
              <div className="flex items-center gap-1 h-7 px-2">
                {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65].map((height, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full bg-[var(--color-primary)] transition-all duration-200 ${
                      isPlaying && !isPaused ? "opacity-90 animate-pulse" : "opacity-30"
                    }`}
                    style={{
                      height: isPlaying && !isPaused ? `${Math.max(20, (height * (i % 2 === 0 ? 1 : 0.7)))}%` : "25%",
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--color-surface-2)] h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className="bg-[var(--color-primary)] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Playback Controls (Speed + Reset) */}
            <div className="flex items-center justify-between text-[11px] text-[var(--color-charcoal)] pt-1 border-t border-[var(--color-border)]/60">
              <div className="flex items-center gap-1.5">
                <span>Speed:</span>
                {[
                  { rate: 0.82, label: "0.8x (Calm/Elder)" },
                  { rate: 0.95, label: "1.0x (Normal)" },
                  { rate: 1.15, label: "1.2x (Fast)" },
                ].map((s) => (
                  <button
                    key={s.rate}
                    type="button"
                    onClick={() => {
                      setSpeechRate(s.rate);
                      if (isPlaying) stopSpeech();
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                      speechRate === s.rate
                        ? "bg-[var(--color-primary)] text-white font-bold"
                        : "bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-charcoal)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {isPlaying && (
                <button
                  type="button"
                  onClick={stopSpeech}
                  className="flex items-center gap-1 text-[var(--color-charcoal)] hover:text-red-600 transition cursor-pointer"
                >
                  <ArrowCounterClockwise size={12} />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          {/* Structured Clinical Counseling Sections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-charcoal)]">
                Structured Clinical Advice Overview
              </h3>
              <span className="text-[11px] text-[var(--color-charcoal)]">
                Auto-aligned to FOGSI & GoI ANC guidelines
              </span>
            </div>

            <div className="grid gap-2.5">
              {counseling.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 hover:border-[var(--color-border-strong)] transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="shrink-0">{getSectionIcon(idx)}</span>
                    <h4 className="text-[13px] font-bold text-[var(--color-foreground)]">
                      {section.title}
                    </h4>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--color-charcoal)] whitespace-pre-line pl-6">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Doctor Note Field */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 space-y-1.5">
            <label htmlFor="doctor-note" className="block text-[11px] font-bold text-[var(--color-foreground)]">
              Add Specific Doctor Note to Speech & WhatsApp (Optional):
            </label>
            <input
              id="doctor-note"
              type="text"
              placeholder="e.g. Next USG growth scan scheduled for Monday 10:00 AM..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[12px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-charcoal)]/50"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-charcoal)] hover:border-[var(--color-foreground)] transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" weight="bold" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Counseling Text</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 text-white px-4 py-2 text-[12px] font-semibold hover:bg-emerald-800 transition shadow-xs"
              >
                <WhatsappLogo size={16} weight="fill" />
                <span>Send WhatsApp Voice Summary</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] text-white px-4 py-2 text-[12px] font-semibold hover:bg-[var(--color-primary-hover)] transition shadow-xs cursor-pointer"
              >
                <WhatsappLogo size={16} weight="fill" />
                <span>Copy WhatsApp Note</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
