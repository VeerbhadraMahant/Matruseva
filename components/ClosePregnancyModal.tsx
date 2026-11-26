"use client";

import { useState, useTransition, useCallback } from "react";
import { Warning, CheckCircle, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { OverlayShell } from "@/components/OverlayShell";
import { buttonDanger, buttonPrimary, buttonSecondary, helpClass, inputClass, labelClass } from "@/components/ui";
import { closePregnancy } from "@/app/(app)/patients/[id]/actions";
import type { ClosePregnancyFormProps } from "@/components/ClosePregnancyForm";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";

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
  const [birthWeightKg, setBirthWeightKg] = useState("3.00");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = useCallback(() => {
    if (isPending) return;
    onClose();
  }, [isPending, onClose]);

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

    const weightNum = parseFloat(birthWeightKg);
    if (isNaN(weightNum) || weightNum < 0.5 || weightNum > 6.5) {
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
        birthWeightKg: parseFloat(birthWeightKg),
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

  const formId = "close-pregnancy-form";
  const footer = success ? null : step === "form" ? (
    <>
      <button type="button" onClick={handleClose} disabled={isPending} className={buttonSecondary}>
        {t("common.cancel")}
      </button>
      <button type="submit" form={formId} className={buttonPrimary}>
        <span>{t("patientDetail.closure.next")}</span>
        <ArrowRight size={16} aria-hidden />
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={() => setStep("form")} disabled={isPending} className={`${buttonSecondary} sm:mr-auto`}>
        <ArrowLeft size={16} aria-hidden />
        <span>{t("patientDetail.closure.backToEdit")}</span>
      </button>
      <button type="button" onClick={handleFinalSubmit} disabled={isPending} className={buttonDanger}>
        {isPending ? (
          <span>{t("patientDetail.closure.closing")}</span>
        ) : (
          <>
            <CheckCircle size={16} weight="bold" aria-hidden />
            <span>{t("patientDetail.closure.confirm")}</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <OverlayShell
      title={t("patientDetail.closure.title")}
      subtitle={`${patient.name}${patient.clinicPatientNo ? ` (${patient.clinicPatientNo})` : ""}`}
      closeLabel={t("common.close")}
      onClose={handleClose}
      backdropClose={false}
      footer={footer}
    >
      {success ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-8 text-center" role="status">
          <CheckCircle size={48} weight="fill" className="text-[var(--color-on-track)]" aria-hidden />
          <h3 className="text-[16px] font-semibold">{t("patientDetail.closure.successTitle")}</h3>
          <p className="text-[13px] text-[var(--color-charcoal)]">{t("patientDetail.closure.successBody")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] p-3 text-[13px] text-[var(--color-overdue)]">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {step === "form" ? (
            <form id={formId} onSubmit={handleProceedToConfirm} className="space-y-4">
              <div>
                <label htmlFor="delivery-date" className={labelClass}>
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
                  className={inputClass}
                />
                {patient.lmp && <p className={helpClass}>{t("patientDetail.closure.lmpHint", { lmp: formatDate(patient.lmp, locale) })}</p>}
              </div>

              <div>
                <label htmlFor="delivery-mode" className={labelClass}>
                  {t("patientDetail.closure.deliveryMode")} <span className="text-[var(--color-overdue)]">*</span>
                </label>
                <select
                  id="delivery-mode"
                  required
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value as "NVD" | "LSCS")}
                  className={inputClass}
                >
                  <option value="NVD">{t("clinical.delivery.NVD")}</option>
                  <option value="LSCS">{t("clinical.delivery.LSCS")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="birth-weight" className={labelClass}>
                  {t("patientDetail.closure.birthWeight")} <span className="text-[var(--color-overdue)]">*</span>
                </label>
                <input
                  id="birth-weight"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="6.5"
                  required
                  value={birthWeightKg}
                  onChange={(e) => setBirthWeightKg(e.target.value)}
                  className={`${inputClass} num`}
                  placeholder={t("patientDetail.closure.birthWeightPlaceholder")}
                />
                <p className={helpClass}>{t("patientDetail.closure.birthWeightHint")}</p>
              </div>

              <div>
                <label htmlFor="closure-notes" className={labelClass}>
                  {t("patientDetail.closure.remarks")}
                </label>
                <textarea
                  id="closure-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("patientDetail.closure.remarksPlaceholder")}
                  className={`${inputClass} py-2`}
                />
              </div>
            </form>
          ) : (
            <>
              <div className="rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] p-3 text-[14px]">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--color-overdue)]">
                  <Warning size={16} weight="fill" aria-hidden />
                  <span>{t("patientDetail.closure.confirmTitle")}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-foreground)]">{t("patientDetail.closure.confirmBody")}</p>
              </div>

              <dl className="divide-y divide-[var(--color-border)]/70 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] px-3 text-[14px]">
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumPatient")}</dt>
                  <dd className="font-semibold">{patient.name}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumDate")}</dt>
                  <dd className="num font-semibold">{formatDate(deliveryDate, locale)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumMode")}</dt>
                  <dd className="font-semibold">{deliveryMode === "NVD" ? t("clinical.delivery.NVD") : t("clinical.delivery.LSCS")}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-[var(--color-charcoal)]">{t("patientDetail.closure.sumWeight")}</dt>
                  <dd className="num font-semibold">{birthWeightKg} kg</dd>
                </div>
                {notes && (
                  <div className="py-2 text-[13px] text-[var(--color-charcoal)]">
                    <dt className="inline font-medium">{t("patientDetail.closure.sumRemarks")}</dt> <dd className="inline">{notes}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
      )}
    </OverlayShell>
  );
}
