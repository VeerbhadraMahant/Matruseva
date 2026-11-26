"use client";

import { useState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/provider";
import { chipClass } from "@/components/ui";
import Link from "next/link";
import {
  Play,
  Pause,
  Heart,
  Baby,
  Pill,
  WarningCircle,
  PhoneCall,
  ArrowLeft,
} from "@phosphor-icons/react";
import {
  generateCounseling,
  COUNSELING_LANGUAGES,
  type CounselingLanguage,
  type CounselingPatientData,
} from "@/lib/voiceCounselor";

/**
 * Mother-facing chrome. The page is read by the mother (often on the public
 * token link, where there is no staff language), so its labels follow the
 * counselling language she picks, not the staff UI locale. Kept local because
 * the staff catalogue only carries the active staff locale and has no Gujarati.
 */
const CHROME: Record<
  CounselingLanguage,
  {
    week: string;
    defaultClinic: string;
    play: string;
    pause: string;
    speaking: string;
    paused: string;
    idle: string;
    speed: string;
    slow: string;
    normal: string;
    summary: string;
    emergencyLead: string;
    ambulance: string;
    ttsUnsupported: string;
  }
> = {
  hi: {
    week: "सप्ताह {n}",
    defaultClinic: "मातृसेतु क्लिनिक",
    play: "आवाज़ में परामर्श सुनें",
    pause: "आवाज़ रोकें",
    speaking: "आवाज़ में संदेश चल रहा है…",
    paused: "रोका गया है",
    idle: "यहाँ दबाकर आवाज़ में सुनिए",
    speed: "गति:",
    slow: "धीमी (0.8x)",
    normal: "सामान्य (1.0x)",
    summary: "परामर्श विवरण",
    emergencyLead: "कोई भी परेशानी होने पर तुरंत अस्पताल या आशा दीदी से संपर्क करें:",
    ambulance: "आपातकालीन एम्बुलेंस (108) को कॉल करें",
    ttsUnsupported: "इस फ़ोन के ब्राउज़र में आवाज़ सुनाने की सुविधा उपलब्ध नहीं है।",
  },
  mr: {
    week: "आठवडा {n}",
    defaultClinic: "मातृसेतू क्लिनिक",
    play: "आवाजात समुपदेशन ऐका",
    pause: "आवाज थांबवा",
    speaking: "संदेश आवाजात ऐकवला जात आहे…",
    paused: "थांबवले आहे",
    idle: "आवाजात ऐकण्यासाठी येथे दाबा",
    speed: "गती:",
    slow: "हळू (0.8x)",
    normal: "सामान्य (1.0x)",
    summary: "समुपदेशनाचा तपशील",
    emergencyLead: "कोणताही त्रास झाल्यास त्वरित रुग्णालयात किंवा आशा ताईंशी संपर्क साधा:",
    ambulance: "आपत्कालीन रुग्णवाहिका (108) ला कॉल करा",
    ttsUnsupported: "या फोनच्या ब्राउझरमध्ये आवाज ऐकवण्याची सुविधा उपलब्ध नाही.",
  },
  gu: {
    week: "અઠવાડિયું {n}",
    defaultClinic: "માતૃસેતુ ક્લિનિક",
    play: "અવાજમાં પરામર્શ સાંભળો",
    pause: "અવાજ અટકાવો",
    speaking: "સંદેશ અવાજમાં ચાલી રહ્યો છે…",
    paused: "અટકાવ્યું છે",
    idle: "અવાજમાં સાંભળવા અહીં દબાવો",
    speed: "ઝડપ:",
    slow: "ધીમી (0.8x)",
    normal: "સામાન્ય (1.0x)",
    summary: "પરામર્શની વિગત",
    emergencyLead: "કોઈપણ તકલીફ થાય તો તરત હોસ્પિટલ અથવા આશા દીદીનો સંપર્ક કરો:",
    ambulance: "ઇમરજન્સી એમ્બ્યુલન્સ (108) ને કૉલ કરો",
    ttsUnsupported: "આ ફોનના બ્રાઉઝરમાં અવાજ સંભળાવવાની સુવિધા ઉપલબ્ધ નથી.",
  },
  en: {
    week: "Week {n}",
    defaultClinic: "MatruSetu Clinic",
    play: "Listen to the counselling",
    pause: "Pause audio",
    speaking: "Playing the message…",
    paused: "Paused",
    idle: "Tap here to listen",
    speed: "Speed:",
    slow: "Slow (0.8x)",
    normal: "Normal (1.0x)",
    summary: "Counselling summary",
    emergencyLead: "If you have any problem, contact the hospital or your ASHA worker right away:",
    ambulance: "Call emergency ambulance (108)",
    ttsUnsupported: "Text-to-speech is not supported in this browser.",
  },
};

export interface MotherAudioPlayerProps {
  patientData: CounselingPatientData;
  initialLang?: CounselingLanguage;
  /** Public (token) view for mothers: hides the staff-only "Back" link. */
  publicView?: boolean;
}

export function MotherAudioPlayer({
  patientData,
  initialLang = "hi",
  publicView = false,
}: MotherAudioPlayerProps) {
  const t = useT();
  const [lang, setLang] = useState<CounselingLanguage>(initialLang);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [ttsMissing, setTtsMissing] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const counseling = generateCounseling(patientData, lang);
  const ui = CHROME[lang];

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
      setTtsMissing(true);
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

  const playing = isPlaying && !isPaused;
  const sectionIcons = [
    <Baby key="b" size={22} className="text-[var(--color-primary)]" aria-hidden />,
    <Pill key="p" size={22} className="text-[var(--color-on-track)]" aria-hidden />,
    <Heart key="h" size={22} className="text-[var(--color-info)]" aria-hidden />,
    <WarningCircle key="w" size={22} weight="fill" className="text-[var(--color-overdue)]" aria-hidden />,
  ];

  return (
    <div lang={lang} className="min-h-screen bg-[var(--color-surface-1)] px-4 py-6 text-[var(--color-foreground)] sm:px-6">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex min-h-11 items-center justify-between gap-3">
          {publicView ? (
            <span />
          ) : (
            <Link
              href={`/patients/${patientData.patientId}`}
              className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-[var(--color-charcoal)] hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={18} aria-hidden />
              <span>{t("common.back")}</span>
            </Link>
          )}
          <span className="text-[14px] font-semibold text-[var(--color-primary)]">MatruSetu</span>
        </div>

        <header className="rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-balance text-[24px] font-semibold leading-snug">{patientData.patientName}</h1>
          <p className="mt-1 text-[16px] text-[var(--color-charcoal)]">
            <span className="num">{ui.week.replace("{n}", String(patientData.gaWeeks ?? 24))}</span> · {patientData.clinicName || ui.defaultClinic}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label={ui.summary}>
            {COUNSELING_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                lang={l.code}
                aria-pressed={lang === l.code}
                onClick={() => {
                  stopSpeech();
                  setLang(l.code);
                }}
                className={`${chipClass(lang === l.code)} min-h-11 px-4 text-[16px] md:min-h-11`}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>
        </header>

        <section className="space-y-4 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] p-6 text-center shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={handlePlayPause}
            className="press mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-overlay)] hover:bg-[var(--color-primary-hover)]"
            title={playing ? ui.pause : ui.play}
            aria-label={playing ? ui.pause : ui.play}
          >
            {playing ? <Pause size={44} weight="fill" aria-hidden /> : <Play size={44} weight="fill" className="ml-1" aria-hidden />}
          </button>

          <div role="status">
            <p className="text-[18px] font-semibold">{playing ? ui.speaking : isPaused ? ui.paused : ui.idle}</p>
            <p className="num mt-0.5 text-[15px] text-[var(--color-charcoal)]">
              {formatTimer(currentTime)} / {formatTimer(estimatedDuration)}
            </p>
          </div>
          {ttsMissing && (
            <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-due-surface)] px-3 py-2 text-[15px]">
              {ui.ttsUnsupported}
            </p>
          )}

          <div className="flex h-8 items-center justify-center gap-1.5" aria-hidden>
            {[40, 70, 50, 90, 60, 85, 45, 95, 75, 50, 80, 65].map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full bg-[var(--color-primary)] transition-[height,opacity] duration-200 ${playing ? "animate-pulse" : "opacity-30"}`}
                style={{ height: playing ? `${h}%` : "30%", animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={ui.summary}
          >
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[15px] text-[var(--color-charcoal)]">
            <span>{ui.speed}</span>
            {[
              { rate: 0.82, label: ui.slow },
              { rate: 0.95, label: ui.normal },
            ].map((s) => (
              <button
                key={s.rate}
                type="button"
                aria-pressed={speechRate === s.rate}
                onClick={() => {
                  setSpeechRate(s.rate);
                  if (isPlaying) stopSpeech();
                }}
                className={`${chipClass(speechRate === s.rate)} min-h-11 text-[15px] md:min-h-11`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[18px] font-semibold">{ui.summary}</h2>
          {counseling.sections.map((sec, idx) => (
            <article
              key={idx}
              className={`rounded-[var(--radius-cards)] border p-4 ${
                idx === 3 ? "border-[var(--color-overdue)]/40 bg-[var(--color-overdue-surface)]" : "border-[var(--color-border)] bg-[var(--color-background)]"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {sectionIcons[idx]}
                <h3 className="text-[17px] font-semibold">{sec.title}</h3>
              </div>
              <p className="whitespace-pre-line pl-8 text-[16px] leading-relaxed">{sec.content}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-center">
          <p className="text-[16px] font-medium">{ui.emergencyLead}</p>
          <a
            href="tel:108"
            className="press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-buttons)] bg-[var(--color-overdue)] px-5 text-[16px] font-semibold text-white hover:opacity-90"
          >
            <PhoneCall size={22} weight="fill" aria-hidden />
            <span>{ui.ambulance}</span>
          </a>
        </section>
      </div>
    </div>
  );
}
