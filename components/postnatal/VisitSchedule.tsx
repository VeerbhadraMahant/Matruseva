"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tag, buttonPrimary, buttonSecondary } from "@/components/ui";
import { formatShortDate } from "@/lib/format";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { useLocale, useT } from "@/lib/i18n/provider";
import { careStatusLabel } from "@/lib/clinicalLabels";
import type { NewbornView, PostnatalVisitView } from "@/lib/postnatalData";
import { VISIT_TONE, smallButton } from "./shared";

// The form is only needed once a visit is opened; load it on first open / hover / focus.
const loadModal = () => import("./RecordVisitModal");
const RecordVisitModal = dynamic(() => loadModal().then((m) => m.RecordVisitModal), { ssr: false });

export function VisitSchedule({
  visits, newborns, patientId, motherName, todayIso,
}: {
  todayIso: string;
  visits: PostnatalVisitView[];
  newborns: NewbornView[];
  patientId: string;
  motherName: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [openCode, setOpenCode] = useState<PostnatalVisitView["code"] | null>(null);
  const open = visits.find((v) => v.code === openCode);

  return (
    <>
      <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
        {visits.map((v) => {
          const name = t(`postnatal.panel.visit.${v.code}` as const);
          const done = v.status === "done";
          return (
            <li key={v.code} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0">
                <p className={`text-[14px] ${done ? "" : "font-medium"}`}>{name}</p>
                <p className="num text-[13px] text-[var(--color-charcoal)]">
                  {formatShortDate(v.due_from, locale)} – {formatShortDate(v.due_to, locale)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={VISIT_TONE[v.status]}>{careStatusLabel(v.status, t)}</Tag>
                {done && v.completed_at && (
                  <span className="num text-[12px] text-[var(--color-charcoal)]">
                    {formatShortDate(toISODate(todayInClinicTimezone(new Date(v.completed_at))), locale)}
                  </span>
                )}
                {/* A check cannot be recorded before its window opens. */}
                {v.due_from <= todayIso && (
                  <button
                    type="button"
                    className={`${v.status === "due" || v.status === "overdue" ? buttonPrimary : buttonSecondary} ${smallButton}`}
                    onMouseEnter={() => void loadModal()}
                    onFocus={() => void loadModal()}
                    onClick={() => setOpenCode(v.code)}
                  >
                    {t(done ? "postnatal.panel.visits.viewEdit" : "postnatal.panel.visits.record")}
                    <span className="sr-only"> {name}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <RecordVisitModal
          key={open.code}
          visit={open}
          newborns={newborns}
          patientId={patientId}
          motherName={motherName}
          onClose={() => setOpenCode(null)}
        />
      )}
    </>
  );
}
