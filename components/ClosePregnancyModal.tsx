"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Baby, X, Warning, CheckCircle, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { closePregnancy } from "@/app/(app)/patients/[id]/actions";
import type { ClosePregnancyFormProps } from "@/components/ClosePregnancyForm";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";
import { gestationalWeeksAtBirth, newbornFlags } from "@/lib/postnatal";

type Baby = { weight: string; sex: string; nicu: boolean };
const newBaby = (): Baby => ({ weight: "3.00", sex: "", nicu: false });
const fieldCls =
  "rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

export function ClosePregnancyModal({
  patient,
  todayIso,
  onClose,
}: ClosePregnancyFormProps & { onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [step, setStep] = useState<"form" | "confirm">("form");

  // Form states
  const [deliveryDate, setDeliveryDate] = useState(todayIso);
  const [deliveryMode, setDeliveryMode] = useState<"NVD" | "LSCS">("NVD");
  const [babies, setBabies] = useState<Baby[]>([newBaby()]);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const setCount = (n: number) => setBabies((b) => Array.from({ length: n }, (_, i) => b[i] ?? newBaby()));
  const setBaby = (i: number, patch: Partial<Baby>) =>
    setBabies((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const gaWeeks = patient.lmp && deliveryDate >= patient.lmp ? gestationalWeeksAtBirth(patient.lmp, deliveryDate) : null;
  const flagsFor = (b: Baby) =>
    newbornFlags(
      { id: "", birth_weight_kg: parseFloat(b.weight), gestational_age_weeks: gaWeeks, nicu_admission: false },
      [],
    ).filter((f) => f === "vlbw" || f === "lbw" || f === "very_preterm" || f === "preterm");

  const handleClose = useCallback(() => {
    if (isPending) return;
    onClose();
  }, [isPending, onClose]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!deliveryDate) {
      setError(t("patientDetail.closure.errSelectDate"));
      return;
    }

    if (deliveryDate > todayIso) {
      setError(t("patientDetail.error.deliveryFuture"));
      return;
    }

    if (patient.lmp && deliveryDate < patient.lmp) {
      setError(t("patientDetail.closure.errBeforeLmp", { lmp: formatDate(patient.lmp, locale) }));
      return;
    }

    if (babies.some((b) => !(parseFloat(b.weight) >= 0.5 && parseFloat(b.weight) <= 6.5))) {
      setError(t("patientDetail.closure.errWeightRange"));
      return;
    }

    setStep("confirm");
  };

  const handleFinalSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await closePregnancy(patient.id, {
        deliveryDate,
        deliveryMode,
        birthWeightKg: parseFloat(babies[0].weight),
        newborns: babies.map((b) => ({
          sex: (b.sex || undefined) as "female" | "male" | "ambiguous" | undefined,
          birth_weight_kg: parseFloat(b.weight),
          nicu_admission: b.nicu,
        })),
        notes: notes.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
        setStep("form");
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          setSuccess(false);
        }, 1200);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-pregnancy-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="rounded-2xl relative w-full max-w-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-[var(--color-primary)] text-white">
              <Baby size={18} weight="bold" />
            </div>
            <div>
              <h2 id="close-pregnancy-title" className="text-[16px] font-bold text-[var(--color-foreground)]">
                {t("patientDetail.closure.title")}
              </h2>
              <p className="text-[12px] text-[var(--color-charcoal)]">
                {patient.name} {patient.clinicPatientNo ? `(${patient.clinicPatientNo})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="p-1 text-[var(--color-charcoal)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <CheckCircle size={48} weight="fill" className="text-[var(--color-on-track)] animate-bounce" />
            <h3 className="text-base font-bold text-[var(--color-foreground)]">{t("patientDetail.closure.successTitle")}</h3>
            <p className="text-xs text-[var(--color-charcoal)]">
              {t("patientDetail.closure.successBody")}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {error && (
              <div className="rounded-xl mb-4 flex items-start gap-2 border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] p-2.5 text-xs text-[var(--color-overdue)]">
                <Warning size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === "form" ? (
              <form onSubmit={handleProceedToConfirm} className="space-y-4">
                {/* Delivery Date */}
                <div>
                  <label htmlFor="delivery-date" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                    {t("patientDetail.closure.deliveryDate")} <span className="text-[var(--color-overdue)]">*</span>
                  </label>
                  <input
                    id="delivery-date"
                    type="date"
                    required
                    max={todayIso}
                    min={patient.lmp || undefined}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  {patient.lmp && (
                    <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                      {t("patientDetail.closure.lmpHint", { lmp: formatDate(patient.lmp, locale) })}
                    </p>
                  )}
                </div>

                {/* Delivery Mode */}
                <div>
                  <label htmlFor="delivery-mode" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                    {t("patientDetail.closure.deliveryMode")} <span className="text-[var(--color-overdue)]">*</span>
                  </label>
                  <select
                    id="delivery-mode"
                    required
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value as "NVD" | "LSCS")}
                    className="rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  >
                    <option value="NVD">{t("clinical.delivery.NVD")}</option>
                    <option value="LSCS">{t("clinical.delivery.LSCS")}</option>
                  </select>
                </div>

                {/* Number of babies */}
                <div>
                  <label htmlFor="baby-count" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                    {t("delivery.babyCount")}
                  </label>
                  <select id="baby-count" value={babies.length} onChange={(e) => setCount(Number(e.target.value))} className={fieldCls}>
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {gaWeeks != null && (
                    <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">{t("delivery.gaAtBirth", { weeks: gaWeeks })}</p>
                  )}
                </div>

                {babies.map((b, i) => {
                  const sfx = i === 0 ? "" : `-${i + 1}`;
                  const flags = flagsFor(b);
                  return (
                    <div key={i} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
                      {babies.length > 1 && (
                        <p className="text-[12px] font-semibold text-[var(--color-foreground)]">{t("delivery.babyN", { n: i + 1 })}</p>
                      )}
                      <div>
                        <label htmlFor={`birth-weight${sfx}`} className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                          {t("patientDetail.closure.birthWeight")} <span className="text-[var(--color-overdue)]">*</span>
                        </label>
                        <input
                          id={`birth-weight${sfx}`}
                          type="number"
                          step="0.01"
                          min="0.5"
                          max="6.5"
                          required
                          aria-describedby={`birth-weight-warn${sfx}`}
                          value={b.weight}
                          onChange={(e) => setBaby(i, { weight: e.target.value })}
                          className={`${fieldCls} font-mono`}
                          placeholder={t("patientDetail.closure.birthWeightPlaceholder")}
                        />
                        {i === 0 && (
                          <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                            {t("patientDetail.closure.birthWeightHint")}
                          </p>
                        )}
                        {/* Always mounted so screen readers announce the warning when it appears. */}
                        <p id={`birth-weight-warn${sfx}`} aria-live="polite" className="mt-1 text-[11px] text-[var(--color-due)] empty:hidden">
                          {flags.map((f) => t(`delivery.flag.${f}`)).join(" ")}
                        </p>
                      </div>
                      <div>
                        <label htmlFor={`baby-sex${sfx}`} className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                          {t("delivery.sex")}
                        </label>
                        <select id={`baby-sex${sfx}`} value={b.sex} onChange={(e) => setBaby(i, { sex: e.target.value })} className={fieldCls}>
                          <option value="">{t("delivery.sex.none")}</option>
                          <option value="female">{t("delivery.sex.female")}</option>
                          <option value="male">{t("delivery.sex.male")}</option>
                          <option value="ambiguous">{t("delivery.sex.ambiguous")}</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-[12px] text-[var(--color-charcoal)]">
                        <input type="checkbox" checked={b.nicu} onChange={(e) => setBaby(i, { nicu: e.target.checked })} />
                        {t("delivery.nicu")}
                      </label>
                    </div>
                  );
                })}

                {/* Optional Notes */}
                <div>
                  <label htmlFor="closure-notes" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                    {t("patientDetail.closure.remarks")}
                  </label>
                  <textarea
                    id="closure-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("patientDetail.closure.remarksPlaceholder")}
                    className="rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className={buttonSecondary}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className={buttonPrimary}
                  >
                    <span>{t("patientDetail.closure.next")}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Confirmation */
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--color-due)] bg-[var(--color-due-surface)] p-3 text-[13px] text-[var(--color-foreground)]">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--color-due)]">
                    <Warning size={16} weight="fill" />
                    <span>{t("patientDetail.closure.confirmTitle")}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-[var(--color-charcoal)] leading-relaxed">
                    {t("patientDetail.closure.confirmBody")}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-1.5">
                    <span className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumPatient")}</span>
                    <span className="font-semibold">{patient.name}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-1.5">
                    <span className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumDate")}</span>
                    <span className="font-semibold">{formatDate(deliveryDate, locale)}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-[var(--color-border)] pb-1.5">
                    <span className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumMode")}</span>
                    <span className="font-semibold">{deliveryMode === "NVD" ? t("clinical.delivery.NVD") : t("clinical.delivery.LSCS")}</span>
                  </div>
                  {babies.map((b, i) => (
                    <div key={i} className="flex justify-between gap-3">
                      <span className="text-[var(--color-charcoal)]">
                        {babies.length > 1 ? t("delivery.babyN", { n: i + 1 }) : t("patientDetail.closure.sumWeight")}
                      </span>
                      <span className="font-semibold font-mono">
                        {b.weight} kg
                        {b.sex ? ` · ${t(`delivery.sex.${b.sex as "female" | "male" | "ambiguous"}`)}` : ""}
                        {b.nicu ? ` · ${t("delivery.nicuShort")}` : ""}
                      </span>
                    </div>
                  ))}
                  {notes && (
                    <div className="pt-1.5 border-t border-[var(--color-border)] text-xs text-[var(--color-charcoal)]">
                      <span className="font-medium">{t("patientDetail.closure.sumRemarks")}</span> {notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    disabled={isPending}
                    className={buttonSecondary}
                  >
                    <ArrowLeft size={14} />
                    <span>{t("patientDetail.closure.backToEdit")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isPending}
                    className={`${buttonPrimary} bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]`}
                  >
                    {isPending ? (
                      <span>{t("patientDetail.closure.closing")}</span>
                    ) : (
                      <>
                        <CheckCircle size={15} weight="bold" />
                        <span>{t("patientDetail.closure.confirm")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
