"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { NotePencil } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";

// Modal body is loaded on demand (first open / hover / focus) to keep it out of the page's initial JS.
const loadModal = () => import("@/components/EditPatientModalBody");
const EditPatientModal = dynamic(() => loadModal().then((m) => m.EditPatientModal), { ssr: false });

export function EditPatientButton({ patient }: { patient: EditPatientData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => void loadModal()}
        onFocus={() => void loadModal()}
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5`}
        title="Edit patient demographics or update pregnancy dating from scan"
      >
        <NotePencil size={15} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>Edit Patient & Dating</span>
      </button>

      {isOpen && <EditPatientModal patient={patient} onClose={() => setIsOpen(false)} />}
    </>
  );
}
export interface EditPatientData {
  id: string;
  name: string;
  clinicPatientNo?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  age?: number | null;
  address?: string | null;
  gravida?: number | null;
  para?: number | null;
  bloodGroup?: string | null;
  rhNegative: boolean;
  lmp: string | null;
  edd?: string | null;
  eddSource?: "lmp" | "scan" | "manual" | null;
}
