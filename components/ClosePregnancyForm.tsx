"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Baby } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

export interface ClosePregnancyFormProps {
  patient: {
    id: string;
    name: string;
    clinicPatientNo: string | null;
    lmp: string | null;
    edd: string | null;
  };
  todayIso: string;
}

// Modal body (form + confirm step + server action) loads on first open / hover / focus.
const loadModal = () => import("@/components/ClosePregnancyModal");
const ClosePregnancyModal = dynamic(() => loadModal().then((m) => m.ClosePregnancyModal), { ssr: false });

export function ClosePregnancyForm({ patient, todayIso }: ClosePregnancyFormProps) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => void loadModal()}
        onFocus={() => void loadModal()}
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-surface-1)]`}
        title={t("patientDetail.closure.buttonTitle")}
      >
        <Baby size={16} weight="bold" />
        <span>{t("patientDetail.closure.button")}</span>
      </button>


      {isOpen && <ClosePregnancyModal patient={patient} todayIso={todayIso} onClose={() => setIsOpen(false)} />}
    </>
  );
}
