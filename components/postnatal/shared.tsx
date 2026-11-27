"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, type Tone } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";
import type { MotherFlag, NewbornFlag } from "@/lib/postnatal";
import type { NewbornView, PostnatalVisitView } from "@/lib/postnatalData";

/** Urgent flags are red; the rest are amber, grey or blue. */
export const FLAG_TONE: Record<NewbornFlag | MotherFlag, Tone> = {
  danger_sign: "critical",
  heavy_bleeding: "critical",
  high_bp: "critical",
  vlbw: "warning",
  very_preterm: "warning",
  poor_feeding: "warning",
  weight_not_regained: "warning",
  fever: "warning",
  low_mood: "warning",
  wound_problem: "warning",
  breast_problem: "warning",
  lbw: "neutral",
  preterm: "neutral",
  nicu: "info",
};

/** Same mapping as the antenatal schedule table on this page. */
export const VISIT_TONE: Record<PostnatalVisitView["status"], Tone> = {
  done: "ok",
  due: "warning",
  overdue: "critical",
  upcoming: "neutral",
};

export function FlagChips({ flags }: { flags: (NewbornFlag | MotherFlag)[] }) {
  const t = useT();
  return (
    <>
      {flags.map((f) => (
        <Tag key={f} tone={FLAG_TONE[f]}>
          {t(`postnatal.panel.flag.${f}` as const)}
        </Tag>
      ))}
    </>
  );
}

export function babyLabel(n: Pick<NewbornView, "name" | "birth_order">, count: number, mother: string, t: Translator) {
  if (n.name) return n.name;
  return count > 1
    ? t("postnatal.panel.baby.fallback", { n: n.birth_order })
    : t("postnatal.panel.baby.ofMother", { mother });
}

/** Runs a server action; on success calls `onDone` and refreshes the page data. Errors arrive already translated. */
export function useAction() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error: string | null }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.error) {
          setError(res.error);
          return;
        }
        onDone?.();
        router.refresh();
      } catch {
        setError(t("common.error.generic"));
      }
    });
  }
  return { pending, error, run };
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[12px] font-medium text-[var(--color-overdue)]">
      {message}
    </p>
  );
}

/** Compact action button sizes (44px touch target) layered on the shared button styles. */
export const smallButton = "min-h-11 px-3 text-[13px] whitespace-nowrap";
