"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SpeakerHigh } from "@phosphor-icons/react";
import type { CounselingPatientData } from "@/lib/voiceCounselor";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

// Modal body is loaded on demand (first open / hover / focus) to keep it out of the page's initial JS.
const loadModal = () => import("@/components/VoiceCounselorModalBody");
const VoiceCounselorModal = dynamic(() => loadModal().then((m) => m.VoiceCounselorModal), { ssr: false });

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
        onMouseEnter={() => void loadModal()}
        onFocus={() => void loadModal()}
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
export interface VoiceCounselorButtonProps {
  data: CounselingPatientData;
  variant?: "primary" | "secondary" | "subtle";
  label?: string;
}
