"use client";

import { useState, useMemo, useEffect } from "react";
import { useActionState } from "react";
import { NotePencil, X, Calendar, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";
import { updatePatient, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { eddFromLmp, gestationalAge, formatGA, trimester } from "@/lib/pregnancy";
import { SubmitButton } from "@/components/SubmitButton";

export interface EditPatientData {
  id: string;
  name: string;
  clinicPatientNo?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  age?: number | null;
  address?: string | null;
  gravida?: number | null;
  para?: number | null;
  bloodGroup?: string | null;
  rhNegative: boolean;
  lmp: string | null;
  edd?: string | null;
  eddSource?: "lmp" | "scan" | "manual" | null;
}

const initialState: ActionResult = { error: null };

const inputClass =
  "min-h-9 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[13px] text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";

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

export function EditPatientButton({ patient }: { patient: EditPatientData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5`}
        title="Edit patient demographics or update pregnancy dating from scan"
      >
        <NotePencil size={15} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>Edit Patient & Dating</span>
      </button>

      {isOpen && <EditPatientModal patient={patient} onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function EditPatientModal({
  patient,
  onClose,
}: {
  patient: EditPatientData;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(updatePatient.bind(null, patient.id), initialState);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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

  // Close modal when submission succeeds
  useEffect(() => {
    if (hasSubmitted && state.error === null) {
      onClose();
    }
  }, [state, hasSubmitted, onClose]);

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
      ga: formatGA(ga),
      trimester: trimester(ga),
    };
  }, [lmp]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Patient & Pregnancy Dating"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-[var(--color-background)] shadow-2xl overflow-hidden border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <NotePencil size={16} weight="bold" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--color-foreground)]">Edit Patient & Pregnancy Dating</h2>
              <p className="text-[11px] text-[var(--color-charcoal)]">
                Update demographics, correct LMP from dating scan, or adjust ANC schedule
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          action={(formData) => {
            setHasSubmitted(true);
            formAction(formData);
          }}
          className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {state.error && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--color-overdue-surface)] border border-[var(--color-overdue)] p-2.5 text-xs text-[var(--color-overdue)]">
              <WarningCircle size={16} className="shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Section 1: Dating & Schedule Recalculation */}
          <div className="rounded-xl border-2 border-[var(--color-primary)]/20 bg-[var(--color-surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <Calendar size={15} weight="bold" />
                Pregnancy Dating & Schedule Calibration
              </span>
              {datingPreview && (
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-foreground)]">
                  GA: <strong>{datingPreview.ga}</strong> (T{datingPreview.trimester})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="eddSource" className={labelClass}>
                  Dating Basis
                </label>
                <select
                  id="eddSource"
                  name="eddSource"
                  className={inputClass}
                  value={eddSource}
                  onChange={(e) => handleEddSourceChange(e.target.value as "lmp" | "scan" | "manual")}
                >
                  <option value="lmp">LMP (Natural cycle)</option>
                  <option value="scan">Ultrasound Dating Scan (CRL/USG)</option>
                  <option value="manual">Clinical / Manual Correction</option>
                </select>
              </div>

              <div>
                <label htmlFor="lmp" className={labelClass}>
                  LMP Date *
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
                  Estimated Due Date (EDD)
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
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-300 p-2 text-xs text-amber-900">
                <Sparkle size={15} className="shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <strong>Automatic Schedule Adjustment:</strong> Saving these changes will automatically diff and recalculate target windows for all uncompleted ANC scans, tests, and injections. Completed events remain preserved.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Patient Identity */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-charcoal)] block border-b border-[var(--color-border)] pb-1.5">
              Demographics & Contact
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  Full Name *
                </label>
                <input id="name" name="name" type="text" required defaultValue={patient.name} className={inputClass} />
              </div>

              <div>
                <label htmlFor="clinicPatientNo" className={labelClass}>
                  OPD / Card No.
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
                  Primary Mobile
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={patient.phone || ""}
                  placeholder="10-digit"
                  className={`${inputClass} num`}
                />
              </div>

              <div>
                <label htmlFor="altPhone" className={labelClass}>
                  Alternate Mobile
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
                  Age (years)
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
                Address / Village
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
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-charcoal)] block border-b border-[var(--color-border)] pb-1.5">
              Obstetric History & Blood Group
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="gravida" className={labelClass}>
                  Gravida
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
                  Para
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
                  Blood Group
                </label>
                <select id="bloodGroup" name="bloodGroup" className={inputClass} defaultValue={patient.bloodGroup || ""}>
                  <option value="">Unknown</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex min-h-9 items-center gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] px-2.5 text-[13px]">
                <input
                  id="rhNegative"
                  type="checkbox"
                  name="rhNegative"
                  checked={rhNegative}
                  onChange={(e) => setRhNegative(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <label htmlFor="rhNegative" className="cursor-pointer font-medium text-[var(--color-foreground)] select-none">
                  Rh Negative
                </label>
              </div>
            </div>

            {rhNegative && (
              <p className="text-[11px] text-[var(--color-primary)] bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]">
                ℹ️ <strong>Rh Negative Maternal Protocol:</strong> Anti-D Prophylaxis injection milestone at 28 weeks will be automatically verified in the ANC schedule.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <button type="button" onClick={onClose} className={buttonSecondary}>
              Cancel
            </button>
            <SubmitButton>
              Save & Recalculate
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
