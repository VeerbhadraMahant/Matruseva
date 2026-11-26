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
      {/* Top Banner with Split-Screen button and Multi-lingual WhatsApp Switcher */}
      <div className="flex max-w-full flex-wrap items-center gap-3 border-b border-[var(--color-border)] pb-3 mb-3 bg-[var(--color-surface-1)] p-2.5">
        <div className="flex items-center gap-2">
          <Columns size={16} className="text-[var(--color-primary)] shrink-0" />
          <span className="text-[12px] text-[var(--color-charcoal)]">
            {t("patientDetail.interactive.desk")}
          </span>
          <button
            type="button"
            onClick={() => setSplitOpen(true)}
            className="rounded-xl inline-flex items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-foreground)] hover:border-[var(--color-foreground)] cursor-pointer"
          >
            <span>{t("patientDetail.interactive.openSplit")}</span>
          </button>
        </div>

        {/* Multi-lingual WhatsApp Reminder Trigger */}
        {currentWaLink && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-charcoal)]">
              <Translate size={13} className="text-[var(--color-primary)]" />
              <span>{t("patientDetail.interactive.waLanguage")}</span>
            </span>
            <div className="rounded-xl inline-flex border border-[var(--color-border-strong)] bg-[var(--color-background)] p-0.5">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSelectedLang(l.code)}
                  className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    selectedLang === l.code
                      ? "bg-[var(--color-primary)] text-white font-semibold"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {l.nativeLabel}
                </button>
              ))}
            </div>

            <a
              href={currentWaLink}
              target="_blank"
              rel="noreferrer"
              title={currentMessage ?? undefined}
              className="inline-flex items-center gap-1.5 bg-[#25D366] text-black px-2.5 py-1 text-[12px] font-semibold hover:opacity-90"
            >
              <WhatsappLogo size={15} weight="fill" />
              <span>{t("patientDetail.interactive.sendLang", { language: SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel ?? "" })}</span>
            </a>
          </div>
        )}
      </div>

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
