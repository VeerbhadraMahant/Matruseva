"use client";

import { useState } from "react";
import {
  Phone,
  WhatsappLogo,
  Columns,
  NotePencil,
  FileText,
} from "@phosphor-icons/react";
import {
  SplitScreenVisitWorkspace,
  type PatientDocument,
} from "@/components/SplitScreenVisitWorkspace";

interface PatientDetailInteractiveProps {
  patientId: string;
  patientName: string;
  gaLabel: string | null;
  phone: string | null;
  tel: string | null;
  wa: string | null;
  documents: PatientDocument[];
}

export function PatientDetailInteractive({
  patientId,
  patientName,
  gaLabel,
  phone,
  tel,
  wa,
  documents,
}: PatientDetailInteractiveProps) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleOpenSplit = (docId?: string) => {
    if (docId) setSelectedDocId(docId);
    setSplitOpen(true);
  };

  return (
    <>
      {/* Button placed inside Record Visit section header or document list */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 mb-3">
        <span className="text-[12px] text-[var(--color-charcoal)]">
          Have an ultrasound scan or lab report to enter?
        </span>
        <button
          type="button"
          onClick={() => handleOpenSplit()}
          className="inline-flex items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-foreground)] hover:border-[var(--color-foreground)] cursor-pointer"
        >
          <Columns size={15} className="text-[var(--color-primary)]" />
          <span>Open Split-Screen Review</span>
        </button>
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

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center justify-center min-w-[56px] py-1 text-center hover:text-white"
          >
            <WhatsappLogo size={18} weight="fill" className="text-[#25D366]" />
            <span className="text-[10px] mt-0.5 font-medium tracking-tight">WhatsApp</span>
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
