"use client";

import Link from "next/link";
import { FileText, Warning } from "@phosphor-icons/react";
import { Panel, buttonSecondary } from "@/components/ui";
import { formatShortDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";
import { dayOfLife } from "@/lib/postnatal";
import type { PatientPostnatal } from "@/lib/postnatalData";
import { BabyCard } from "./BabyCard";
import { VisitSchedule } from "./VisitSchedule";
import { FlagChips, babyLabel } from "./shared";

/** Plain-words reasons behind the urgent flag, naming the visit where each was recorded. */
function urgentReasons(data: PatientPostnatal, motherName: string, t: Translator): string[] {
  const done = data.visits.filter((v) => v.completed_at);
  const visitName = (code: PatientPostnatal["visits"][number]["code"]) => t(`postnatal.panel.visit.${code}` as const);
  const reasons: string[] = [];

  for (const n of data.newborns) {
    if (!n.flags.includes("danger_sign")) continue;
    const v = done.filter((x) => x.baby_findings[n.id]).at(-1);
    if (!v) continue;
    reasons.push(t("postnatal.panel.urgent.babyDanger", {
      baby: babyLabel(n, data.newborns.length, motherName, t),
      visit: visitName(v.code),
      signs: v.baby_findings[n.id].danger_signs.map((s) => t(`postnatal.panel.danger.${s}` as const)).join(", "),
    }));
  }

  const mv = done.filter((x) => x.mother_findings).at(-1);
  if (mv) {
    const visit = visitName(mv.code);
    if (data.motherFlags.includes("heavy_bleeding")) reasons.push(t("postnatal.panel.urgent.heavyBleeding", { visit }));
    if (data.motherFlags.includes("high_bp")) {
      const f = mv.mother_findings!;
      reasons.push(t("postnatal.panel.urgent.highBp", { visit, bp: `${f.bp_systolic ?? "?"}/${f.bp_diastolic ?? "?"}` }));
    }
  }
  return reasons;
}

export function PostnatalPanel({
  patientId, motherName, data,
}: {
  patientId: string;
  motherName: string;
  data: PatientPostnatal;
}) {
  const t = useT();
  const locale = useLocale();
  const reasons = data.urgent ? urgentReasons(data, motherName, t) : [];
  const mode = data.deliveryMode ? t(`clinical.delivery.${data.deliveryMode}` as const) : null;
  const date = formatShortDate(data.deliveryDate, locale);

  return (
    <div id="postnatal" className="scroll-mt-20">
      <Panel title={t("postnatal.title")}>
        <div className="space-y-5 p-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px]">
              <span className="num font-semibold">{t("postnatal.panel.dayAfter", { n: dayOfLife(data.deliveryDate, data.todayIso) })}</span>
              <span className="text-[var(--color-charcoal)]">
                {" · "}
                {mode ? t("postnatal.panel.deliveredOn", { mode, date }) : date}
              </span>
            </p>
            <Link href={`/patients/${patientId}/postnatal-summary`} className={buttonSecondary}>
              <FileText size={15} weight="bold" aria-hidden className="text-[var(--color-primary)]" />
              {t("postnatal.panel.summaryLink")}
            </Link>
          </div>

          {reasons.length > 0 && (
            <section aria-labelledby="postnatal-urgent" className="rounded-xl border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] p-3">
              <h3 id="postnatal-urgent" className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-overdue)]">
                <Warning size={16} weight="fill" aria-hidden />
                {t("postnatal.panel.urgent.title")}
              </h3>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] text-[var(--color-foreground)]">
                {reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </section>
          )}

          {data.motherFlags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[13px] font-semibold">{t("postnatal.panel.mother.title")}</span>
              <FlagChips flags={data.motherFlags} />
            </div>
          )}

          <div className={`grid gap-4 ${data.newborns.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {data.newborns.map((n) => (
              <BabyCard
                key={n.id}
                baby={n}
                vaccines={data.vaccines.filter((v) => v.newborn_id === n.id)}
                count={data.newborns.length}
                motherName={motherName}
                patientId={patientId}
                todayIso={data.todayIso}
              />
            ))}
          </div>

          <section aria-labelledby="postnatal-visits">
            <h3 id="postnatal-visits" className="mb-2 text-[14px] font-semibold">{t("postnatal.panel.visits.title")}</h3>
            <VisitSchedule visits={data.visits} newborns={data.newborns} patientId={patientId} motherName={motherName} todayIso={data.todayIso} />
          </section>
        </div>
      </Panel>
    </div>
  );
}
