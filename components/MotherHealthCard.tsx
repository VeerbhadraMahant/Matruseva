"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { QrCode } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

// Modal body is loaded on demand (first open / hover / focus) to keep it out of the page's initial JS.
const loadModal = () => import("@/components/MotherHealthCardBody");
const MotherHealthCardModal = dynamic(() => loadModal().then((m) => m.MotherHealthCardModal), { ssr: false });

export function MotherHealthCardButton({ patient }: { patient: MotherCardData }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => void loadModal()}
        onFocus={() => void loadModal()}
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5`}
        title={t("patients.card.buttonTitle")}
      >
        <QrCode size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>{t("patients.card.button")}</span>
      </button>

      {isOpen && <MotherHealthCardModal patient={patient} onClose={() => setIsOpen(false)} />}
    </>
  );
}
export interface MotherCardData {
  id: string;
  name: string;
  clinicPatientNo?: string | null;
  age?: number | null;
  phone?: string | null;
  altPhone?: string | null;
  bloodGroup?: string | null;
  rhNegative?: boolean;
  edd?: string | null;
  gaLabel?: string | null;
  gravida?: number | null;
  para?: number | null;
  clinicName?: string;
}
