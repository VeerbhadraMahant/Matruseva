/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Microphone, MicrophoneSlash, CheckCircle, Sparkle, X, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { parseVoiceToVitals, type ParsedVitals } from "@/lib/voiceScribe";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

interface VoiceScribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVitals: (vitals: ParsedVitals) => void;
}

export function VoiceScribeModal({ isOpen, onClose, onApplyVitals }: VoiceScribeModalProps) {
  if (!isOpen) return null;
  return <VoiceScribeModalContent onClose={onClose} onApplyVitals={onApplyVitals} />;
}

function VoiceScribeModalContent({
  onClose,
  onApplyVitals,
}: {
  onClose: () => void;
  onApplyVitals: (vitals: ParsedVitals) => void;
}) {
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
      setErrorMsg("Voice recognition is not supported in this browser. You can type or paste the dictation below.");
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
          setErrorMsg(`Voice input error: ${e.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start microphone.");
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
      title: "Hindi/Hinglish (Common ASHA Visit)",
      text: "BP 130 80, vajan 54 kilo, hemoglobin 9.5, pairon mein sujan",
    },
    {
      title: "English (High Risk Alert)",
      text: "BP 145 over 95, weight 62, hemoglobin 8.4, severe headache and blurred vision",
    },
    {
      title: "Marathi (Rural PHC)",
      text: "BP 120 80, vajan 50 kilo, hemoglobin 11, fhr 140",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ASHA Voice-to-Vitals AI Scribe"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
              <Microphone size={16} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[14px] font-bold text-[var(--color-foreground)]">ASHA Voice-to-Vitals AI Scribe</h2>
                <span className="rounded-full bg-[var(--color-primary-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                  Multilingual AI
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-charcoal)]">
                Speak or dictate clinical vitals in Hindi, Marathi, or English
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Controls: Language and Mic */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[var(--color-charcoal)]">Dictation Language:</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as "hi-IN" | "en-IN" | "mr-IN")}
                className="text-[12px] rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[var(--color-foreground)] font-medium focus:outline-none"
              >
                <option value="hi-IN">Hindi (हिंदी / Hinglish)</option>
                <option value="mr-IN">Marathi (मराठी)</option>
                <option value="en-IN">Indian English</option>
              </select>
            </div>

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={isListening
                ? "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-buttons)] bg-[var(--color-overdue)] px-4 text-[13px] font-semibold text-white animate-pulse shadow-sm"
                : `${buttonPrimary} min-h-9 px-4 text-[13px]`
              }
            >
              {isListening ? (
                <>
                  <MicrophoneSlash size={15} weight="bold" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Microphone size={15} weight="bold" />
                  <span>Start Dictating</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-[var(--radius-cards)] bg-[var(--color-due-surface)] border border-[var(--color-due)]/30 p-3 text-[12px] text-[var(--color-foreground)]">
              <WarningCircle size={16} className="shrink-0 text-[var(--color-due)]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transcript input / display */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[var(--color-foreground)]">
                Spoken Dictation Transcript:
              </label>
              {isListening && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-overdue)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-overdue)] animate-ping" />
                  Listening live...
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => handleManualChange(e.target.value)}
              placeholder='e.g., "BP 130 80, vajan 54 kilo, hemoglobin 9.5, pairon mein sujan"'
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] p-3 text-[13px] text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] leading-relaxed font-mono"
            />
          </div>

          {/* Sample Dictation Badges for Quick Demo */}
          <div>
            <span className="text-[11px] font-medium text-[var(--color-charcoal)] block mb-1.5">
              Click to simulate sample frontline ASHA speech:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleManualChange(s.text)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-foreground)] transition text-left"
                >
                  <span className="font-semibold text-[var(--color-primary)]">{s.title}:</span>{" "}
                  <span className="italic opacity-80">&ldquo;{s.text.slice(0, 35)}...&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Extracted Vitals Preview Card */}
          <div className="rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-foreground)]">
                <Sparkle size={15} weight="fill" className="text-[var(--color-primary)]" />
                AI Extracted Clinical Values:
              </span>
              {parsed && (parsed.bpSys || parsed.weight || parsed.hb || parsed.symptoms.length > 0) ? (
                <span className="text-[11px] font-medium text-[var(--color-on-track)] flex items-center gap-1">
                  <CheckCircle size={14} weight="fill" /> Ready to Apply
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-charcoal)]">Awaiting speech</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg bg-[var(--color-background)] p-2 border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-charcoal)]">Blood Pressure</div>
                <div className="text-[14px] font-bold text-[var(--color-foreground)]">
                  {parsed?.bpSys && parsed?.bpDia ? `${parsed.bpSys} / ${parsed.bpDia}` : "—"}
                  {parsed?.bpSys && parsed?.bpDia && (
                    <span className="text-[10px] text-[var(--color-charcoal)] font-normal ml-1">mmHg</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-[var(--color-background)] p-2 border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-charcoal)]">Weight</div>
                <div className="text-[14px] font-bold text-[var(--color-foreground)]">
                  {parsed?.weight ? `${parsed.weight}` : "—"}
                  {parsed?.weight && <span className="text-[10px] text-[var(--color-charcoal)] font-normal ml-1">kg</span>}
                </div>
              </div>

              <div className="rounded-lg bg-[var(--color-background)] p-2 border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-charcoal)]">Hemoglobin</div>
                <div className="text-[14px] font-bold text-[var(--color-foreground)]">
                  {parsed?.hb ? `${parsed.hb}` : "—"}
                  {parsed?.hb && <span className="text-[10px] text-[var(--color-charcoal)] font-normal ml-1">g/dL</span>}
                </div>
              </div>

              <div className="rounded-lg bg-[var(--color-background)] p-2 border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-charcoal)]">Fetal Heart (FHR)</div>
                <div className="text-[14px] font-bold text-[var(--color-foreground)]">
                  {parsed?.fhr ? `${parsed.fhr}` : "—"}
                  {parsed?.fhr && <span className="text-[10px] text-[var(--color-charcoal)] font-normal ml-1">bpm</span>}
                </div>
              </div>
            </div>

            {parsed && parsed.symptoms.length > 0 && (
              <div className="pt-2 border-t border-[var(--color-border)]">
                <div className="text-[11px] font-semibold text-[var(--color-overdue)] mb-1">
                  Detected Symptoms & Danger Signs:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.symptoms.map((sym, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[var(--color-overdue-surface)] border border-[var(--color-overdue)]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-overdue)]"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className={`${buttonSecondary} min-h-9 px-4 text-[13px]`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!parsed || (!parsed.bpSys && !parsed.weight && !parsed.hb && parsed.symptoms.length === 0)}
            className={`${buttonPrimary} min-h-9 px-4 text-[13px] gap-1.5`}
          >
            <span>Apply to Vitals Form</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
