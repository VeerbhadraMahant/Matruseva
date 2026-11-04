"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BowlFood } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";

// Modal body is loaded on demand (first open / hover / focus) to keep it out of the page's initial JS.
const loadModal = () => import("@/components/NutritionDietModalBody");
const NutritionDietModal = dynamic(() => loadModal().then((m) => m.NutritionDietModal), { ssr: false });

export function NutritionDietButton({ data }: { data: NutritionPatientData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => void loadModal()}
        onFocus={() => void loadModal()}
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5`}
        title="View personalized trimester & anemia diet plan"
      >
        <BowlFood size={15} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>Nutrition & Diet Plan</span>
      </button>

      {isOpen && <NutritionDietModal data={data} onClose={() => setIsOpen(false)} />}
    </>
  );
}
export interface NutritionPatientData {
  patientId: string;
  patientName: string;
  phone?: string | null;
  gaWeeks?: number | null;
  trimester?: 1 | 2 | 3;
  hb?: number | null;
  clinicName?: string;
}
