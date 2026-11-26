"use client";

import { useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { card, helpClass, inputClass, labelClass } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

export interface ObstetricQuestionnaireFieldsProps {
  defaultValues?: {
    previousDeliveryMode?: string;
    priorComplications?: string[];
    pastPregnancyLoss?: string;
    pastBirthWeight?: string;
    interpregnancyInterval?: string;
    familyComplications?: string[];
    chronicConditions?: string[];
    doctorNotes?: string;
  };
}

interface Option {
  id: string;
  label: string;
  desc?: string;
  alert?: boolean;
}

const optionClass = (selected: boolean, alert?: boolean) =>
  `press flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-[var(--radius-buttons)] border px-3 py-2 text-left text-[13px] transition-colors md:min-h-10 ${
    selected
      ? alert
        ? "border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] font-semibold text-[var(--color-overdue)]"
        : "border-[var(--color-primary)] bg-[var(--color-primary-surface)] font-semibold text-[var(--color-primary)]"
      : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
  }`;

function Mark({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
      {selected && <Check size={14} weight="bold" />}
    </span>
  );
}

/** One question: a fieldset so the group name is announced with each option. */
function Question({ legend, cols, children }: { legend: string; cols: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[14px] font-semibold text-[var(--color-foreground)]">{legend}</legend>
      <div className={`grid gap-2 ${cols}`}>{children}</div>
    </fieldset>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h3 className="border-b border-[var(--color-border)]/70 pb-2 text-[15px] font-semibold text-[var(--color-foreground)]">{title}</h3>
      {children}
    </div>
  );
}

export function ObstetricQuestionnaireFields({ defaultValues }: ObstetricQuestionnaireFieldsProps) {
  const t = useT();
  const [deliveryMode, setDeliveryMode] = useState(defaultValues?.previousDeliveryMode || "Primi");
  const [complications, setComplications] = useState<string[]>(defaultValues?.priorComplications || ["none"]);
  const [pregnancyLoss, setPregnancyLoss] = useState(defaultValues?.pastPregnancyLoss || "0");
  const [birthWeight, setBirthWeight] = useState(defaultValues?.pastBirthWeight || "na");
  const [interval, setInterval] = useState(defaultValues?.interpregnancyInterval || "na");
  const [familyComp, setFamilyComp] = useState<string[]>(defaultValues?.familyComplications || ["none"]);
  const [chronic, setChronic] = useState<string[]>(defaultValues?.chronicConditions || ["none"]);
  const [doctorNotes, setDoctorNotes] = useState(defaultValues?.doctorNotes || "");

  const toggleMultiSelect = (currentList: string[], setFn: (val: string[]) => void, item: string) => {
    if (item === "none") {
      setFn(["none"]);
      return;
    }
    const filtered = currentList.filter((x) => x !== "none");
    if (filtered.includes(item)) {
      const next = filtered.filter((x) => x !== item);
      setFn(next.length === 0 ? ["none"] : next);
    } else {
      setFn([...filtered, item]);
    }
  };

  const isPrimi = deliveryMode === "Primi";

  const single = (opts: Option[], value: string, onPick: (id: string) => void) =>
    opts.map((o) => (
      <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onPick(o.id)} className={optionClass(value === o.id, o.alert)}>
        <Mark selected={value === o.id} />
        <span>
          {o.label}
          {o.desc && <span className="block text-[12px] font-normal opacity-80">{o.desc}</span>}
        </span>
      </button>
    ));

  const multi = (opts: Option[], list: string[], setFn: (val: string[]) => void) =>
    opts.map((o) => {
      const selected = list.includes(o.id);
      return (
        <label key={o.id} className={`${optionClass(selected, o.alert)} focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-primary)]`}>
          <input type="checkbox" checked={selected} onChange={() => toggleMultiSelect(list, setFn, o.id)} className="sr-only" />
          <Mark selected={selected} />
          <span>{o.label}</span>
        </label>
      );
    });

  return (
    <details open className={`${card} group overflow-hidden`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 md:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-[var(--color-foreground)]">{t("patients.new.questionnaireTitle")}</span>
          <span className="block text-[13px] text-[var(--color-charcoal)]">{t("patients.new.questionnaireHelp")}</span>
        </span>
        <CaretDown size={18} aria-hidden className="shrink-0 text-[var(--color-charcoal)] transition-transform duration-200 group-open:rotate-180" />
      </summary>

      {/* Hidden inputs to feed formData cleanly */}
      <input type="hidden" name="q_previousDeliveryMode" value={deliveryMode} />
      <input type="hidden" name="q_priorComplications" value={JSON.stringify(complications)} />
      <input type="hidden" name="q_pastPregnancyLoss" value={pregnancyLoss} />
      <input type="hidden" name="q_pastBirthWeight" value={birthWeight} />
      <input type="hidden" name="q_interpregnancyInterval" value={interval} />
      <input type="hidden" name="q_familyComplications" value={JSON.stringify(familyComp)} />
      <input type="hidden" name="q_chronicConditions" value={JSON.stringify(chronic)} />

      <div className="space-y-8 border-t border-[var(--color-border)] px-4 py-5 md:px-5">
        <Group title={t("patients.new.sectionPast")}>
          <Question legend="1. Previous Delivery Mode & Type" cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {single(
              [
                { id: "Primi", label: "First Pregnancy (Primi)", desc: "No prior deliveries" },
                { id: "NVD", label: "Normal Vaginal (NVD)", desc: "Spontaneous vaginal" },
                { id: "LSCS", label: "Previous C-Section (LSCS)", desc: "Scarred uterus", alert: true },
                { id: "Instrumental", label: "Instrumental", desc: "Vacuum / Forceps" },
              ],
              deliveryMode,
              (id) => {
                setDeliveryMode(id);
                if (id === "Primi") {
                  setBirthWeight("na");
                  setInterval("na");
                } else if (birthWeight === "na") {
                  setBirthWeight("normal");
                  setInterval("18m-5y");
                }
              }
            )}
          </Question>

          {!isPrimi && (
            <Question legend="2. Prior Obstetric Complications" cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {multi(
                [
                  { id: "none", label: "None / Uneventful" },
                  { id: "preeclampsia", label: "Preeclampsia / High BP", alert: true },
                  { id: "gdm", label: "Gestational Diabetes (GDM)", alert: true },
                  { id: "pph", label: "Severe Bleeding (PPH)", alert: true },
                  { id: "preterm", label: "Preterm Delivery (<37w)", alert: true },
                ],
                complications,
                setComplications
              )}
            </Question>
          )}

          <Question legend={`${isPrimi ? 2 : 3}. Past Pregnancy Loss`} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {single(
              [
                { id: "0", label: "0 (None)" },
                { id: "1", label: "1 Miscarriage / Abortion" },
                { id: "2+", label: "2+ Miscarriages (BOH)", alert: true },
                { id: "stillbirth", label: "Prior Stillbirth / IUFD", alert: true },
              ],
              pregnancyLoss,
              setPregnancyLoss
            )}
          </Question>

          {!isPrimi && (
            <Question legend="4. Previous Baby Birth Weight" cols="grid-cols-1 sm:grid-cols-3">
              {single(
                [
                  { id: "normal", label: "Normal (2.5 – 3.5 kg)" },
                  { id: "low", label: "Low Birth Weight (< 2.5 kg)", alert: true },
                  { id: "high", label: "Large Baby (> 3.5 kg / Macrosomia)", alert: true },
                ],
                birthWeight,
                setBirthWeight
              )}
            </Question>
          )}

          {!isPrimi && (
            <Question legend="5. Interpregnancy Interval" cols="grid-cols-1 sm:grid-cols-3">
              {single(
                [
                  { id: "<18m", label: "Short (< 18 Months)", alert: deliveryMode === "LSCS" },
                  { id: "18m-5y", label: "Optimal (18m – 5 Years)" },
                  { id: ">5y", label: "Long (> 5 Years)" },
                ],
                interval,
                setInterval
              )}
            </Question>
          )}
        </Group>

        <Group title={t("patients.new.sectionRisk")}>
          <Question legend={`${isPrimi ? 3 : 6}. Family Pregnancy & Genetic History`} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {multi(
              [
                { id: "none", label: "None / No Family Risk" },
                { id: "preeclampsia", label: "Familial Preeclampsia (High BP)" },
                { id: "diabetes", label: "Family Diabetes / GDM" },
                { id: "twins", label: "Family Twins / Multiple Gestation" },
                { id: "anemia", label: "Hereditary Anemia / Thalassemia" },
              ],
              familyComp,
              setFamilyComp
            )}
          </Question>

          <Question legend={`${isPrimi ? 4 : 7}. Pre-existing Chronic Medical Conditions`} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {multi(
              [
                { id: "none", label: "None / Healthy" },
                { id: "hypertension", label: "Chronic Hypertension (Pre-pregnancy)", alert: true },
                { id: "thyroid", label: "Thyroid Disorder (Hypo/Hyper)" },
                { id: "cardiac", label: "Cardiac / Heart Disease", alert: true },
                { id: "asthma_epilepsy", label: "Asthma / Epilepsy" },
              ],
              chronic,
              setChronic
            )}
          </Question>
        </Group>

        <Group title={t("patients.new.sectionNotes")}>
          <div>
            <label htmlFor="q_doctorNotes" className={labelClass}>
              Clinician High-Risk Observations / Notes (Optional)
            </label>
            <input
              id="q_doctorNotes"
              name="q_doctorNotes"
              type="text"
              aria-describedby="q_doctorNotes-help"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              className={inputClass}
            />
            <p id="q_doctorNotes-help" className={helpClass}>
              e.g. Scar tenderness checked, advised aspirin 75mg prophylaxis
            </p>
          </div>
        </Group>
      </div>
    </details>
  );
}
