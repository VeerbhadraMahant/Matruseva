"use client";

import { useState } from "react";
import {
  WhatsappLogo,
  Columns,
  Translate,
} from "@phosphor-icons/react";
import {
  SplitScreenVisitWorkspace,
  type PatientDocument,
} from "@/components/SplitScreenVisitWorkspace";
import { useT } from "@/lib/i18n/provider";
import { buttonSecondary, chipClass } from "@/components/ui";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/whatsapp";

interface PatientDetailInteractiveProps {
  patientId: string;
  patientName: string;
  gaLabel: string | null;
  wa: string | null;
  whatsappByLang?: Record<SupportedLanguage, string | null>;
  messagesByLang?: Record<SupportedLanguage, string>;
  defaultLang?: SupportedLanguage;
  documents: PatientDocument[];
}

export function PatientDetailInteractive({
  patientId,
  patientName,
  gaLabel,
  wa,
  whatsappByLang,
  messagesByLang,
  defaultLang = "en",
  documents,
}: PatientDetailInteractiveProps) {
  const t = useT();
  const [splitOpen, setSplitOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(defaultLang);

  const currentWaLink = whatsappByLang?.[selectedLang] ?? wa;
  const currentMessage = messagesByLang?.[selectedLang];

  return (
    <>
      <button type="button" onClick={() => setSplitOpen(true)} className={buttonSecondary} title={t("patientDetail.interactive.desk")}>
        <Columns size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        {t("patientDetail.interactive.openSplit")}
      </button>

      {currentWaLink && (
        <div className="space-y-2 border-t border-[var(--color-border)]/70 pt-2">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-charcoal)]">
            <Translate size={14} className="text-[var(--color-primary)]" aria-hidden />
            {t("patientDetail.interactive.waLanguage")}
          </p>
          <div role="group" aria-label={t("patientDetail.interactive.waLanguage")} className="flex flex-wrap gap-1.5">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={selectedLang === l.code}
                onClick={() => setSelectedLang(l.code)}
                className={chipClass(selectedLang === l.code)}
              >
                {l.nativeLabel}
              </button>
            ))}
          </div>
          <a href={currentWaLink} target="_blank" rel="noreferrer" title={currentMessage ?? undefined} className={buttonSecondary}>
            <WhatsappLogo size={16} weight="fill" className="text-[var(--color-primary)]" aria-hidden />
            {t("patientDetail.interactive.sendLang", { language: SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel ?? "" })}
          </a>
        </div>
      )}

      {/* Split-Screen Workspace Modal */}
      <SplitScreenVisitWorkspace
        patientId={patientId}
        patientName={patientName}
        gaLabel={gaLabel}
        documents={documents}
        isOpen={splitOpen}
        onClose={() => setSplitOpen(false)}
      />

    </>
  );
}
