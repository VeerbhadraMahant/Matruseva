"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  SpeakerHigh,
  Play,
  Pause,
  ArrowCounterClockwise,
  Heart,
  Baby,
  Pill,
  WarningCircle,
  PhoneCall,
  ArrowLeft,
  Sparkle,
} from "@phosphor-icons/react";
import {
  generateCounseling,
  COUNSELING_LANGUAGES,
  type CounselingLanguage,
  type CounselingPatientData,
} from "@/lib/voiceCounselor";

export interface MotherAudioPlayerProps {
  patientData: CounselingPatientData;
  initialLang?: CounselingLanguage;
}

export function MotherAudioPlayer({
  patientData,
  initialLang = "hi",
}: MotherAudioPlayerProps) {
  const [lang, setLang] = useState<CounselingLanguage>(initialLang);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.9);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const counseling = generateCounseling(patientData, lang);

  const estimatedDuration = Math.max(
    20,
    Math.round(counseling.speechText.split(/\s+/).length / (2.2 * speechRate))
  );

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
      stopSpeech();
    };
  }, []);

  const findVoice = (code: CounselingLanguage): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const tags: Record<CounselingLanguage, string[]> = {
      hi: ["hi-IN", "hi_IN", "hi"],
      mr: ["mr-IN", "mr_IN", "mr", "hi-IN"],
      gu: ["gu-IN", "gu_IN", "gu", "hi-IN"],
      en: ["en-IN", "en_IN", "en-GB", "en-US", "en"],
    };

    for (const tag of tags[code]) {
      const match = voices.find((v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(tag.toLowerCase()));
      if (match) return match;
    }
    return voices[0] || null;
  };

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported on this device browser.");
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

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(counseling.speechText);
    utteranceRef.current = utterance;

    const voice = findVoice(lang);
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

    utterance.onerror = () => {
      stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= estimatedDuration) return estimatedDuration;
        return prev + 1;
      });
    }, 1000);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = Math.min(100, (currentTime / estimatedDuration) * 100);

  return (
    <div className="min-h-screen bg-[var(--color-surface-1)] text-[var(--color-foreground)] py-6 px-4 sm:px-6">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/patients/${patientData.patientId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} />
            <span>वापस / Back</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full">
            <Sparkle size={12} weight="fill" />
            <span>MatruSetu Voice Bridge</span>
          </div>
        </div>

        {/* Big Maternal Greeting Card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-pc-lilac)_90%,transparent)_0%,var(--color-background)_100%)] p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
            <SpeakerHigh size={34} weight="fill" />
          </div>

          <h1 className="text-xl font-bold text-[var(--color-foreground)]">
            {patientData.patientName}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-charcoal)] font-medium">
            सप्ताह {patientData.gaWeeks ?? 24} · {patientData.clinicName || "मातृसेतु क्लिनिक"}
          </p>

          {/* Language Selector Buttons */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {COUNSELING_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  stopSpeech();
                  setLang(l.code);
                }}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition cursor-pointer ${
                  lang === l.code
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "bg-[var(--color-background)] text-[var(--color-charcoal)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Prominent Play/Pause Audio Center */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-md text-center space-y-4">
          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-90 cursor-pointer ${
                isPlaying && !isPaused
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              title={isPlaying && !isPaused ? "Pause Audio" : "Play Vernacular Counseling"}
            >
              {isPlaying && !isPaused ? (
                <Pause size={36} weight="fill" />
              ) : (
                <Play size={36} weight="fill" className="ml-1" />
              )}
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              {isPlaying && !isPaused
                ? "आवाज में संदेश चल रहा है..."
                : isPaused
                ? "रोक दिया गया है (Paused)"
                : "▶️ यहाँ दबाकर आवाज में सुनिए"}
            </h2>
            <p className="text-xs text-[var(--color-charcoal)] font-mono mt-0.5">
              {formatTimer(currentTime)} / {formatTimer(estimatedDuration)}
            </p>
          </div>

          {/* Soundwave Bars */}
          <div className="flex items-center justify-center gap-1.5 h-8">
            {[40, 70, 50, 90, 60, 85, 45, 95, 75, 50, 80, 65].map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full bg-emerald-600 transition-all duration-200 ${
                  isPlaying && !isPaused ? "animate-pulse" : "opacity-30"
                }`}
                style={{
                  height: isPlaying && !isPaused ? `${h}%` : "30%",
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--color-surface-2)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Speed Tuning */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-[var(--color-charcoal)]">
            <span>गति (Speed):</span>
            {[
              { rate: 0.82, label: "धीमी (0.8x)" },
              { rate: 0.95, label: "सामान्य (1.0x)" },
            ].map((s) => (
              <button
                key={s.rate}
                type="button"
                onClick={() => {
                  setSpeechRate(s.rate);
                  if (isPlaying) stopSpeech();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  speechRate === s.rate
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Written Advice Cards for Reading */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-charcoal)] px-1">
            परामर्श विवरण (Counseling Summary)
          </h3>

          {counseling.sections.map((sec, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 shadow-2xs ${
                idx === 3
                  ? "border-red-200 bg-red-50/70 text-red-950"
                  : "border-[var(--color-border)] bg-[var(--color-background)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {idx === 0 && <Baby size={18} className="text-[var(--color-primary)]" />}
                {idx === 1 && <Pill size={18} className="text-emerald-700" />}
                {idx === 2 && <Heart size={18} className="text-sky-700" />}
                {idx === 3 && <WarningCircle size={18} className="text-red-600" />}
                <h4 className="text-xs font-bold">{sec.title}</h4>
              </div>
              <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line pl-6">
                {sec.content}
              </p>
            </div>
          ))}
        </div>

        {/* Emergency Help Button */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center space-y-2">
          <p className="text-xs font-semibold text-[var(--color-charcoal)]">
            कोई भी परेशानी होने पर तुरंत अस्पताल या आशा दीदी से संपर्क करें:
          </p>
          <a
            href="tel:108"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition"
          >
            <PhoneCall size={16} weight="fill" />
            <span>आपातकालीन एम्बुलेंस (108) को कॉल करें</span>
          </a>
        </div>
      </div>
    </div>
  );
}
