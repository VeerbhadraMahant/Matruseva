"use client";

import type { EditPatientData } from "@/components/EditPatientModal";
import { useState, useMemo, useEffect, useRef, useActionState } from "react";
import { NotePencil, X, Calendar, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { buttonSecondary, iconButton, inputClass, labelClass } from "@/components/ui";
import { updatePatient, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { eddFromLmp, formatGALocalized, gestationalAge, trimester } from "@/lib/pregnancy";
import { useT } from "@/lib/i18n/provider";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";


const initialState: ActionResult = { error: null };


function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


export function EditPatientModal({
  patient,
  onClose,
}: {
  patient: EditPatientData;
  onClose: () => void;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(withSuccessToast(updatePatient.bind(null, patient.id), t("patients.edit.toast")), initialState);
  const prevPendingRef = useRef(false);

  const [lmp, setLmp] = useState(patient.lmp || "");
  const [edd, setEdd] = useState(patient.edd || "");
  const [eddSource, setEddSource] = useState<"lmp" | "scan" | "manual">(patient.eddSource || "lmp");
  const [rhNegative, setRhNegative] = useState<boolean>(patient.rhNegative || false);

  const handleLmpChange = (newLmp: string) => {
    setLmp(newLmp);
    if (eddSource === "lmp" && newLmp) {
      const lmpDate = parseLocalDate(newLmp);
      if (lmpDate) {
        setEdd(toISODate(eddFromLmp(lmpDate)));
      }
    }
  };

  const handleEddSourceChange = (newSource: "lmp" | "scan" | "manual") => {
    setEddSource(newSource);
    if (newSource === "lmp" && lmp) {
      const lmpDate = parseLocalDate(lmp);
      if (lmpDate) {
        setEdd(toISODate(eddFromLmp(lmpDate)));
      }
    }
  };

  // Close modal only after a real form submission completes successfully
  useEffect(() => {
    if (prevPendingRef.current && !isPending && state.error === null) {
      onClose();
    }
    prevPendingRef.current = isPending;
  }, [isPending, state.error, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const lmpChanged = Boolean(patient.lmp && lmp && patient.lmp !== lmp);
  const rhChanged = patient.rhNegative !== rhNegative;

  const datingPreview = useMemo(() => {
    const lmpDate = parseLocalDate(lmp);
    if (!lmpDate) return null;
    const ga = gestationalAge(lmpDate, new Date());
    return {
      ga: formatGALocalized(ga, t),
      trimester: trimester(ga),
    };
  }, [lmp, t]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("patients.edit.dialogLabel")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-foreground)]/50 md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[100dvh] w-full max-w-2xl animate-[pc-sheet_260ms_var(--ease-out)_both] flex-col overflow-hidden rounded-t-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)] motion-reduce:animate-none md:max-h-[90dvh] md:animate-[pc-pop_var(--dur)_var(--ease-out)_both] md:rounded-[var(--radius-cards)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 md:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <NotePencil size={16} weight="bold" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-foreground)]">{t("patients.edit.title")}</h2>
              <p className="text-[12px] text-[var(--color-charcoal)]">
                {t("patients.edit.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("patients.edit.close")}
            className={iconButton}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
          {state.error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] p-3 text-[13px] font-medium text-[var(--color-overdue)]">
              <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{state.error}</span>
            </div>
          )}

          {/* Section 1: Dating & Schedule Recalculation */}
          <div className="rounded-[var(--radius-buttons)] border border-[var(--color-primary)]/30 bg-[var(--color-surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-primary)]">
                <Calendar size={15} weight="bold" />
                {t("patients.edit.sectionDating")}
              </span>
              {datingPreview && (
                <span className="num rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[12px] text-[var(--color-foreground)]">
                  {t("patients.edit.gaPreview", { ga: datingPreview.ga, trimester: t("patients.trimesterShort", { trimester: datingPreview.trimester }) })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="eddSource" className={labelClass}>
                  {t("patients.edit.datingBasis")}
                </label>
                <select
                  id="eddSource"
                  name="eddSource"
                  className={inputClass}
                  value={eddSource}
                  onChange={(e) => handleEddSourceChange(e.target.value as "lmp" | "scan" | "manual")}
                >
                  <option value="lmp">{t("patients.edit.basisLmp")}</option>
                  <option value="scan">{t("patients.edit.basisScan")}</option>
                  <option value="manual">{t("patients.edit.basisManual")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="lmp" className={labelClass}>
                  {t("patients.edit.lmpDate")}
                </label>
                <input
                  id="lmp"
                  name="lmp"
                  type="date"
                  required
                  value={lmp}
                  onChange={(e) => handleLmpChange(e.target.value)}
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="edd" className={labelClass}>
                  {t("patients.edit.edd")}
                </label>
                <input
                  id="edd"
                  name="edd"
                  type="date"
                  value={edd}
                  onChange={(e) => setEdd(e.target.value)}
                  readOnly={eddSource === "lmp"}
                  className={`${inputClass} num ${eddSource === "lmp" ? "bg-[var(--color-surface-2)] opacity-85 cursor-not-allowed" : ""}`}
                />
              </div>
            </div>

            {(lmpChanged || rhChanged) && (
              <div className="flex items-start gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-due)]/40 bg-[var(--color-due-surface)] p-2.5 text-[13px] text-[var(--color-due)]">
                <Sparkle size={15} className="mt-0.5 shrink-0" aria-hidden />
                <div>
                  <strong>{t("patients.edit.autoAdjustTitle")}</strong> {t("patients.edit.autoAdjustBody")}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Patient Identity */}
          <div className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 space-y-3">
            <span className="block border-b border-[var(--color-border)] pb-1.5 text-[13px] font-semibold text-[var(--color-foreground)]">
              {t("patients.edit.sectionDemographics")}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  {t("patients.edit.fullName")}
                </label>
                <input id="name" name="name" type="text" required defaultValue={patient.name} className={inputClass} />
              </div>

              <div>
                <label htmlFor="clinicPatientNo" className={labelClass}>
                  {t("patients.edit.cardNo")}
                </label>
                <input
                  id="clinicPatientNo"
                  name="clinicPatientNo"
                  type="text"
                  defaultValue={patient.clinicPatientNo || ""}
                  className={`${inputClass} num`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="phone" className={labelClass}>
                  {t("patients.edit.primaryMobile")}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={patient.phone || ""}
                  placeholder={t("patients.edit.mobilePlaceholder")}
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="altPhone" className={labelClass}>
                  {t("patients.edit.altMobile")}
                </label>
                <input
                  id="altPhone"
                  name="altPhone"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={patient.altPhone || ""}
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="age" className={labelClass}>
                  {t("patients.edit.ageYears")}
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min={10}
                  max={70}
                  defaultValue={patient.age ?? ""}
                  className={`${inputClass} num`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>
                {t("patients.edit.address")}
              </label>
              <input
                id="address"
                name="address"
                type="text"
                defaultValue={patient.address || ""}
                className={inputClass}
              />
            </div>
          </div>

          {/* Section 3: Obstetric History & Blood Group */}
          <div className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 space-y-3">
            <span className="block border-b border-[var(--color-border)] pb-1.5 text-[13px] font-semibold text-[var(--color-foreground)]">
              {t("patients.edit.sectionObstetric")}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="gravida" className={labelClass}>
                  {t("patients.edit.gravida")}
                </label>
                <input
                  id="gravida"
                  name="gravida"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={patient.gravida ?? ""}
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="para" className={labelClass}>
                  {t("patients.edit.para")}
                </label>
                <input
                  id="para"
                  name="para"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={patient.para ?? ""}
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="bloodGroup" className={labelClass}>
                  {t("patients.edit.bloodGroup")}
                </label>
                <select id="bloodGroup" name="bloodGroup" className={inputClass} defaultValue={patient.bloodGroup || ""}>
                  <option value="">{t("patients.edit.unknown")}</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex min-h-11 items-center gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] px-3 text-[14px] md:min-h-10">
                <input
                  id="rhNegative"
                  type="checkbox"
                  name="rhNegative"
                  checked={rhNegative}
                  onChange={(e) => setRhNegative(e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-primary)]"
                />
                <label htmlFor="rhNegative" className="cursor-pointer font-medium text-[var(--color-foreground)] select-none">
                  {t("patients.edit.rhNegative")}
                </label>
              </div>
            </div>

            {rhNegative && (
              <p className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 text-[13px] text-[var(--color-primary)]">
                <strong>{t("patients.edit.rhProtocolTitle")}</strong> {t("patients.edit.rhProtocolBody")}
              </p>
            )}
          </div>

          </div>

          {/* Sticky footer: always reachable while the body scrolls */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 md:px-5 max-md:[&>*]:flex-1">
            <button type="button" onClick={onClose} className={buttonSecondary}>
              {t("patients.edit.cancel")}
            </button>
            <div className="md:w-40">
              <SubmitButton>{t("patients.edit.save")}</SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
