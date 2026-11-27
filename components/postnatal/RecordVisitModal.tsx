"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Warning, X } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary, inputClass, labelClass } from "@/components/ui";
import { recordPostnatalVisit } from "@/app/(app)/patients/[id]/postnatal-actions";
import { useT } from "@/lib/i18n/provider";
import { DANGER_SIGNS, FEEDING, FP_METHODS, type DangerSign } from "@/lib/postnatal";
import type { NewbornView, PostnatalVisitView } from "@/lib/postnatalData";
import { babyLabel, useAction } from "./shared";

type MotherState = {
  bp_systolic: string; bp_diastolic: string; temperature_c: string; fp_method: string;
  heavy_bleeding: boolean; wound_problem: boolean; breast_problem: boolean; low_mood: boolean; loss_of_interest: boolean;
};
type BabyState = { weight_kg: string; feeding: string; danger_signs: DangerSign[] };

const str = (v: number | null | undefined) => (v == null ? "" : String(v));
const sectionClass = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4";

function Check({ id, label, hint, checked, onChange }: {
  id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
      <span>
        <span className="text-[14px]">{label}</span>
        {hint && <span className="block text-[12px] text-[var(--color-charcoal)]">{hint}</span>}
      </span>
    </label>
  );
}

function NumberField({ id, label, value, onChange, min, max, step }: {
  id: string; label: string; value: string; onChange: (v: string) => void; min: number; max: number; step: number;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} num`} />
    </div>
  );
}

export function RecordVisitModal({
  visit, newborns, patientId, motherName, onClose,
}: {
  visit: PostnatalVisitView;
  newborns: NewbornView[];
  patientId: string;
  motherName: string;
  onClose: () => void;
}) {
  const t = useT();
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { pending, error, run } = useAction();
  const isD42 = visit.code === "PNC_D42";
  const title = t(`postnatal.panel.visit.${visit.code}` as const);

  const m = visit.mother_findings;
  const [mother, setMother] = useState<MotherState>({
    bp_systolic: str(m?.bp_systolic), bp_diastolic: str(m?.bp_diastolic), temperature_c: str(m?.temperature_c),
    fp_method: m?.fp_method ?? "",
    heavy_bleeding: !!m?.heavy_bleeding, wound_problem: !!m?.wound_problem, breast_problem: !!m?.breast_problem,
    low_mood: !!m?.low_mood, loss_of_interest: !!m?.loss_of_interest,
  });
  const [babies, setBabies] = useState<Record<string, BabyState>>(() =>
    Object.fromEntries(newborns.map((n) => {
      const b = visit.baby_findings[n.id];
      return [n.id, { weight_kg: str(b?.weight_kg), feeding: b?.feeding ?? "", danger_signs: b?.danger_signs ?? [] }];
    })));
  const [notes, setNotes] = useState(visit.notes ?? "");

  const setM = <K extends keyof MotherState>(k: K, v: MotherState[K]) => setMother((s) => ({ ...s, [k]: v }));
  const setB = (id: string, patch: Partial<BabyState>) => setBabies((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const toggleSign = (id: string, sign: DangerSign, on: boolean) =>
    setB(id, { danger_signs: on ? [...babies[id].danger_signs, sign] : babies[id].danger_signs.filter((s) => s !== sign) });

  const close = () => { if (!pending) onClose(); };
  useEffect(() => dialogRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => recordPostnatalVisit(patientId, visit.code, {
        mother: { ...mother, fp_method: isD42 ? mother.fp_method : "" },
        babies,
        notes,
      }),
      onClose,
    );
  };

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} className="fixed inset-0 z-50 outline-none flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-background)] shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={`${uid}-title`} className="text-[16px] font-bold">
              {t(visit.status === "done" ? "postnatal.panel.form.titleEdit" : "postnatal.panel.form.titleRecord", { visit: title })}
            </h2>
            <p className="text-[12px] text-[var(--color-charcoal)]">{motherName} · {t("postnatal.panel.form.hint")}</p>
          </div>
          <button type="button" onClick={close} disabled={pending} aria-label={t("common.close")} className="p-1 text-[var(--color-charcoal)] hover:text-[var(--color-foreground)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className={sectionClass} aria-labelledby={`${uid}-mother`}>
            <h3 id={`${uid}-mother`} className="text-[14px] font-semibold">{t("postnatal.panel.form.mother")}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <NumberField id={`${uid}-sys`} label={t("postnatal.panel.form.bpSystolic")} value={mother.bp_systolic} onChange={(v) => setM("bp_systolic", v)} min={60} max={250} step={1} />
              <NumberField id={`${uid}-dia`} label={t("postnatal.panel.form.bpDiastolic")} value={mother.bp_diastolic} onChange={(v) => setM("bp_diastolic", v)} min={30} max={160} step={1} />
              <NumberField id={`${uid}-temp`} label={t("postnatal.panel.form.temperature")} value={mother.temperature_c} onChange={(v) => setM("temperature_c", v)} min={34} max={43} step={0.1} />
            </div>
            <div className="mt-2">
              <Check id={`${uid}-bleed`} label={t("postnatal.panel.form.heavyBleeding")} hint={t("postnatal.panel.form.heavyBleedingHint")} checked={mother.heavy_bleeding} onChange={(v) => setM("heavy_bleeding", v)} />
              <Check id={`${uid}-wound`} label={t("postnatal.panel.form.woundProblem")} hint={t("postnatal.panel.form.woundProblemHint")} checked={mother.wound_problem} onChange={(v) => setM("wound_problem", v)} />
              <Check id={`${uid}-breast`} label={t("postnatal.panel.form.breastProblem")} hint={t("postnatal.panel.form.breastProblemHint")} checked={mother.breast_problem} onChange={(v) => setM("breast_problem", v)} />
            </div>
            <fieldset className="mt-2">
              <legend className="text-[13px] font-medium text-[var(--color-charcoal)]">{t("postnatal.panel.form.mood")}</legend>
              <Check id={`${uid}-low`} label={t("postnatal.panel.form.lowMood")} checked={mother.low_mood} onChange={(v) => setM("low_mood", v)} />
              <Check id={`${uid}-interest`} label={t("postnatal.panel.form.lossOfInterest")} checked={mother.loss_of_interest} onChange={(v) => setM("loss_of_interest", v)} />
            </fieldset>
            {isD42 && (
              <div className="mt-3 sm:max-w-xs">
                <label htmlFor={`${uid}-fp`} className={labelClass}>{t("postnatal.panel.form.fpMethod")}</label>
                <select id={`${uid}-fp`} className={inputClass} value={mother.fp_method} onChange={(e) => setM("fp_method", e.target.value)}>
                  <option value="">{t("postnatal.panel.form.notRecorded")}</option>
                  {FP_METHODS.map((f) => <option key={f} value={f}>{t(`postnatal.panel.fp.${f}` as const)}</option>)}
                </select>
              </div>
            )}
          </section>

          {newborns.map((n) => {
            const b = babies[n.id];
            const label = babyLabel(n, newborns.length, motherName, t);
            return (
              <section key={n.id} className={sectionClass} aria-labelledby={`${uid}-${n.id}`}>
                <h3 id={`${uid}-${n.id}`} className="text-[14px] font-semibold">{label}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <NumberField id={`${uid}-${n.id}-w`} label={t("postnatal.panel.form.weight")} value={b.weight_kg} onChange={(v) => setB(n.id, { weight_kg: v })} min={0.5} max={8} step={0.01} />
                  <div>
                    <label htmlFor={`${uid}-${n.id}-f`} className={labelClass}>{t("postnatal.panel.form.feeding")}</label>
                    <select id={`${uid}-${n.id}-f`} className={inputClass} value={b.feeding} onChange={(e) => setB(n.id, { feeding: e.target.value })}>
                      <option value="">{t("postnatal.panel.form.notRecorded")}</option>
                      {FEEDING.map((f) => <option key={f} value={f}>{t(`postnatal.panel.feeding.${f}` as const)}</option>)}
                    </select>
                  </div>
                </div>
                <fieldset className="mt-2">
                  <legend className="text-[13px] font-medium text-[var(--color-charcoal)]">{t("postnatal.panel.form.dangerSigns")}</legend>
                  {DANGER_SIGNS.map((s) => (
                    <Check key={s} id={`${uid}-${n.id}-${s}`} label={t(`postnatal.panel.danger.${s}` as const)} checked={b.danger_signs.includes(s)} onChange={(on) => toggleSign(n.id, s, on)} />
                  ))}
                </fieldset>
              </section>
            );
          })}

          <div>
            <label htmlFor={`${uid}-notes`} className={labelClass}>{t("postnatal.panel.form.notes")}</label>
            <textarea id={`${uid}-notes`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("postnatal.panel.form.notesPlaceholder")} className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-[15px]" />
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] px-5 py-3">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] p-2.5 text-xs text-[var(--color-overdue)]">
              <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button type="button" className={buttonSecondary} disabled={pending} onClick={close}>{t("common.cancel")}</button>
            <button type="submit" className={buttonPrimary} disabled={pending}>{pending ? t("common.saving") : t("postnatal.panel.form.save")}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
