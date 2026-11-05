"use client";

import dynamic from "next/dynamic";
import type { ParsedVitals } from "@/lib/voiceScribe";

interface VoiceScribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVitals: (vitals: ParsedVitals) => void;
}

// Loaded only once the modal is first opened.
const VoiceScribeModalContent = dynamic(
  () => import("@/components/VoiceScribeModalContent").then((m) => m.VoiceScribeModalContent),
  { ssr: false },
);

export function VoiceScribeModal({ isOpen, onClose, onApplyVitals }: VoiceScribeModalProps) {
  if (!isOpen) return null;
  return <VoiceScribeModalContent onClose={onClose} onApplyVitals={onApplyVitals} />;
}
