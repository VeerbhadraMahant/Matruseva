"use client";

import { useState } from "react";
import {
  Phone,
  WhatsappLogo,
  Columns,
  NotePencil,
  Translate,
} from "@phosphor-icons/react";
import {
  SplitScreenVisitWorkspace,
  type PatientDocument,
} from "@/components/SplitScreenVisitWorkspace";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/whatsapp";

interface PatientDetailInteractiveProps {
  patientId: string;
  patientName: string;
  gaLabel: string | null;
  phone: string | null;
  tel: string | null;
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
  tel,
  wa,
  whatsappByLang,
  messagesByLang,
  defaultLang = "en",
  documents,
}: PatientDetailInteractiveProps) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(defaultLang);

  const handleOpenSplit = (docId?: string) => {
    if (docId) setSelectedDocId(docId);
    setSplitOpen(true);
  };

  const currentWaLink = whatsappByLang?.[selectedLang] ?? wa;
  const currentMessage = messagesByLang?.[selectedLang];

  return (
    <>
      {/* Top Banner with Split-Screen button and Multi-lingual WhatsApp Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 mb-3 bg-[var(--color-surface-1)] p-2.5">
        <div className="flex items-center gap-2">
          <Columns size={16} className="text-[var(--color-primary)] shrink-0" />
          <span className="text-[12px] text-[var(--color-charcoal)]">
            Consultation Desk:
          </span>
          <button
            type="button"
            onClick={() => handleOpenSplit()}
            className="rounded-xl inline-flex items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-foreground)] hover:border-[var(--color-foreground)] cursor-pointer"
          >
            <span>Open Split-Screen Review</span>
          </button>
        </div>

        {/* Multi-lingual WhatsApp Reminder Trigger */}
        {currentWaLink && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-charcoal)]">
              <Translate size={13} className="text-[var(--color-primary)]" />
              <span>WA Language:</span>
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
              <span>Send {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel}</span>
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
        initialDocId={selectedDocId}
        isOpen={splitOpen}
        onClose={() => setSplitOpen(false)}
      />

      {/* Sticky Bottom Action Bar for Mobile & Tablet (md:hidden) */}
      <nav
        aria-label="Mobile quick actions"
        className="fixed bottom-0 inset-x-0 z-30 flex h-14 items-center justify-around border-t border-white/10 bg-[var(--color-rail)] px-2 text-white shadow-2xl md:hidden"
      >
        {tel ? (
          <a
            href={tel}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center hover:text-white"
          >
            <Phone size={18} weight="fill" className="text-[var(--color-rail-accent)]" />
            <span className="text-[10px] mt-0.5 font-medium tracking-tight">Call</span>
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center opacity-40">
            <Phone size={18} />
            <span className="text-[10px] mt-0.5">No phone</span>
          </span>
        )}

        {currentWaLink ? (
          <a
            href={currentWaLink}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center hover:text-white"
          >
            <WhatsappLogo size={18} weight="fill" className="text-[#25D366]" />
            <span className="text-[10px] mt-0.5 font-medium tracking-tight">
              WA ({selectedLang.toUpperCase()})
            </span>
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center opacity-40">
            <WhatsappLogo size={18} />
            <span className="text-[10px] mt-0.5">No WA</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => handleOpenSplit()}
          className="flex flex-col items-center justify-center min-w-[64px] py-1 text-center hover:text-white"
        >
          <Columns size={18} weight="bold" className="text-[var(--color-rail-accent)]" />
          <span className="text-[10px] mt-0.5 font-medium tracking-tight">Split Review</span>
        </button>

        <a
          href="#record-visit"
          className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center hover:text-white"
        >
          <NotePencil size={18} weight="fill" className="text-white" />
          <span className="text-[10px] mt-0.5 font-medium tracking-tight">Log Visit</span>
        </a>
      </nav>
    </>
  );
}
