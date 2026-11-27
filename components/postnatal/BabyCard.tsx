"use client";

import { useState } from "react";
import { NotePencil } from "@phosphor-icons/react";
import { Tag, buttonPrimary, buttonSecondary, inputClass, labelClass } from "@/components/ui";
import { setBirthVaccine, updateNewborn } from "@/app/(app)/patients/[id]/postnatal-actions";
import { formatShortDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { NewbornSex } from "@/lib/supabase/enums";
import type { NewbornView, VaccineView } from "@/lib/postnatalData";
import { BIRTH_VACCINES } from "@/lib/postnatal";
import { ErrorNote, FlagChips, babyLabel, smallButton, useAction } from "./shared";

const SEXES: NewbornSex[] = ["female", "male", "ambiguous"];

function VaccineRow({
  vaccine, birthDate, todayIso, patientId,
}: {
  vaccine: VaccineView;
  birthDate: string;
  todayIso: string;
  patientId: string;
}) {
  const t = useT();
  const locale = useLocale();
  const { pending, error, run } = useAction();
  const [date, setDate] = useState(todayIso);
  const name = t(`postnatal.panel.vaccine.${vaccine.vaccine}` as const);
  const dateId = `vax-${vaccine.id}-date`;
  const set = (input: Parameters<typeof setBirthVaccine>[3]) =>
    run(() => setBirthVaccine(patientId, vaccine.newborn_id, vaccine.vaccine, input));

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--color-border)] py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{name}</p>
        <div className="mt-1">
          {vaccine.status === "given" ? (
            <Tag tone="ok">
              {vaccine.given_on
                ? t("postnatal.panel.vaccine.givenOn", { date: formatShortDate(vaccine.given_on, locale) })
                : t("postnatal.panel.vaccine.givenElsewhere")}
            </Tag>
          ) : (
            <Tag tone={vaccine.status === "overdue" ? "critical" : "warning"}>
              {t(vaccine.status === "overdue" ? "clinical.status.overdue" : "clinical.status.due")}
            </Tag>
          )}
        </div>
        <ErrorNote message={error} />
      </div>

      {vaccine.status === "given" ? (
        <button type="button" className={`${buttonSecondary} ${smallButton}`} disabled={pending} onClick={() => set({ status: "pending" })}>
          {t("postnatal.panel.vaccine.undo")}
          <span className="sr-only"> {name}</span>
        </button>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={dateId} className="mb-1 block text-[12px] font-medium text-[var(--color-charcoal)]">
              {t("postnatal.panel.vaccine.dateLabel")}
              <span className="sr-only"> {name}</span>
            </label>
            <input
              id={dateId}
              type="date"
              value={date}
              min={birthDate}
              max={todayIso}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} w-auto text-[14px]`}
            />
          </div>
          <button type="button" className={`${buttonPrimary} ${smallButton}`} disabled={pending || !date} onClick={() => set({ status: "given", givenOn: date })}>
            {date === todayIso
              ? t("postnatal.panel.vaccine.givenToday")
              : t("postnatal.panel.vaccine.givenOnDate", { date: formatShortDate(date, locale) })}
            <span className="sr-only"> {name}</span>
          </button>
          <button type="button" className={`${buttonSecondary} ${smallButton}`} disabled={pending} onClick={() => set({ status: "given_elsewhere" })}>
            {t("postnatal.panel.vaccine.elsewhereButton")}
            <span className="sr-only"> {name}</span>
          </button>
        </div>
      )}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-[var(--color-charcoal)]">{label}</dt>
      <dd className="num mt-0.5 text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

export function BabyCard({
  baby, vaccines, count, motherName, patientId, todayIso,
}: {
  baby: NewbornView;
  vaccines: VaccineView[];
  count: number;
  motherName: string;
  patientId: string;
  todayIso: string;
}) {
  const t = useT();
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(baby.name ?? "");
  const [sex, setSex] = useState<NewbornSex | "">(baby.sex ?? "");
  const label = babyLabel(baby, count, motherName, t);
  const headingId = `baby-${baby.id}`;
  const order = BIRTH_VACCINES.map((v) => v.code);
  const sorted = [...vaccines].sort((a, b) => order.indexOf(a.vaccine) - order.indexOf(b.vaccine));

  return (
    <article aria-labelledby={headingId} className="@container rounded-xl border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 id={headingId} className="min-w-0 break-words text-[16px] font-semibold">{label}</h3>
        {!editing && (
          <button type="button" className={`${buttonSecondary} ${smallButton} gap-1.5`} onClick={() => { setName(baby.name ?? ""); setSex(baby.sex ?? ""); setEditing(true); }}>
            <NotePencil size={15} weight="bold" aria-hidden className="text-[var(--color-primary)]" />
            {t("postnatal.panel.baby.edit")}
            <span className="sr-only"> {label}</span>
          </button>
        )}
      </div>

      {editing && (
        <form
          className="mt-3 grid gap-3 @md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateNewborn(patientId, baby.id, { name, sex }), () => setEditing(false));
          }}
        >
          <div>
            <label htmlFor={`${headingId}-name`} className={labelClass}>{t("postnatal.panel.baby.name")}</label>
            <input id={`${headingId}-name`} className={inputClass} value={name} maxLength={120} placeholder={t("postnatal.panel.baby.namePlaceholder")} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${headingId}-sex`} className={labelClass}>{t("postnatal.panel.baby.sex")}</label>
            <select id={`${headingId}-sex`} className={inputClass} value={sex} onChange={(e) => setSex(e.target.value as NewbornSex | "")}>
              <option value="">{t("postnatal.panel.baby.sex.unknown")}</option>
              {SEXES.map((s) => <option key={s} value={s}>{t(`postnatal.panel.baby.sex.${s}` as const)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 @md:col-span-2">
            <button type="submit" className={`${buttonPrimary} ${smallButton}`} disabled={pending}>{t("common.save")}</button>
            <button type="button" className={`${buttonSecondary} ${smallButton}`} disabled={pending} onClick={() => setEditing(false)}>{t("common.cancel")}</button>
            <ErrorNote message={error} />
          </div>
        </form>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-4">
        <Fact label={t("postnatal.panel.baby.sex")}>
          {baby.sex ? t(`postnatal.panel.baby.sex.${baby.sex}` as const) : t("postnatal.panel.baby.sex.unknown")}
        </Fact>
        <Fact label={t("postnatal.panel.baby.birthWeight")}>{baby.birth_weight_kg} kg</Fact>
        <Fact label={t("postnatal.panel.baby.gestation")}>
          {baby.gestational_age_weeks != null ? t("common.unit.week", { count: baby.gestational_age_weeks }) : "—"}
        </Fact>
        <Fact label={t("postnatal.panel.baby.dayOfLife")}>{t("postnatal.panel.baby.dayOfLifeValue", { n: baby.dayOfLife })}</Fact>
      </dl>

      {baby.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FlagChips flags={baby.flags} />
        </div>
      )}

      {sorted.length > 0 && (
        <section className="mt-4" aria-label={t("postnatal.panel.vaccine.title")}>
          <h4 className="text-[13px] font-semibold text-[var(--color-charcoal)]">{t("postnatal.panel.vaccine.title")}</h4>
          <ul className="mt-1">
            {sorted.map((v) => (
              <VaccineRow key={v.id} vaccine={v} birthDate={baby.birth_date} todayIso={todayIso} patientId={patientId} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
