"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Baby, X, Warning, CheckCircle, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { closePregnancy } from "@/app/(app)/patients/[id]/actions";

export interface ClosePregnancyFormProps {
  patient: {
    id: string;
    name: string;
    clinicPatientNo: string | null;
    lmp: string | null;
    edd: string | null;
  };
  todayIso: string;
}

export function ClosePregnancyForm({ patient, todayIso }: ClosePregnancyFormProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
    setStep("form");
    setError(null);
  }, [isPending]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!deliveryDate) {
      setError("Please select the delivery date.");
      return;
    }

    if (deliveryDate > todayIso) {
      setError("Delivery date cannot be in the future.");
      return;
    }

    if (patient.lmp && deliveryDate < patient.lmp) {
      setError(`Delivery date cannot be earlier than LMP date (${patient.lmp}).`);
      return;
    }

    const weightNum = parseFloat(birthWeightKg);
    if (isNaN(weightNum) || weightNum < 0.5 || weightNum > 6.5) {
      setError("Birth weight must be between 0.50 kg and 6.50 kg.");
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSuccess(false);
          setStep("form");
          setError(null);
        }}
        className={`${buttonSecondary} gap-1.5 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-surface-1)]`}
        title="Record delivery and close ANC schedule"
      >
        <Baby size={16} weight="bold" />
        <span>Record Delivery / Close</span>
      </button>

      {isOpen && (
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
                    Record Delivery Outcome
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
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success state */}
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <CheckCircle size={48} weight="fill" className="text-[var(--color-on-track)] animate-bounce" />
                <h3 className="text-base font-bold text-[var(--color-foreground)]">Delivery Recorded Successfully</h3>
                <p className="text-xs text-[var(--color-charcoal)]">
                  Active ANC record closed. Patient updated to delivered.
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
                        Delivery Date <span className="text-[var(--color-overdue)]">*</span>
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
                          LMP: {patient.lmp} · Must be on or after LMP
                        </p>
                      )}
                    </div>

                    {/* Delivery Mode */}
                    <div>
                      <label htmlFor="delivery-mode" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                        Delivery Mode <span className="text-[var(--color-overdue)]">*</span>
                      </label>
                      <select
                        id="delivery-mode"
                        required
                        value={deliveryMode}
                        onChange={(e) => setDeliveryMode(e.target.value as "NVD" | "LSCS")}
                        className="rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      >
                        <option value="NVD">NVD — Normal Vaginal Delivery</option>
                        <option value="LSCS">LSCS — Lower Segment Cesarean Section</option>
                      </select>
                    </div>

                    {/* Birth Weight (kg) */}
                    <div>
                      <label htmlFor="birth-weight" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                        Birth Weight (kg) <span className="text-[var(--color-overdue)]">*</span>
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
                        className="rounded-xl mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        placeholder="e.g. 3.10"
                      />
                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                        Standard clinical range: 0.50 kg to 6.50 kg
                      </p>
                    </div>

                    {/* Optional Notes */}
                    <div>
                      <label htmlFor="closure-notes" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                        Clinical Remarks / Neonatal Notes (Optional)
                      </label>
                      <textarea
                        id="closure-notes"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Baby sex, APGAR score, pediatrician remarks, etc."
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
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={buttonPrimary}
                      >
                        <span>Next: Confirm</span>
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
                        <span>Confirm Pregnancy Closure</span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-[var(--color-charcoal)] leading-relaxed">
                        Recording this delivery will mark the pregnancy as <strong>delivered</strong> and close all open ANC schedule items. The mother will stop appearing as &quot;at risk&quot; or &quot;overdue&quot; on the daily OPD worklist and call queue.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 space-y-2 text-[13px]">
                      <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                        <span className="text-[var(--color-charcoal)]">Patient:</span>
                        <span className="font-semibold">{patient.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                        <span className="text-[var(--color-charcoal)]">Delivery Date:</span>
                        <span className="font-semibold">{deliveryDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                        <span className="text-[var(--color-charcoal)]">Mode:</span>
                        <span className="font-semibold">{deliveryMode === "NVD" ? "Normal Vaginal (NVD)" : "Cesarean (LSCS)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-charcoal)]">Baby Birth Weight:</span>
                        <span className="font-semibold font-mono">{birthWeightKg} kg</span>
                      </div>
                      {notes && (
                        <div className="pt-1.5 border-t border-[var(--color-border)] text-xs text-[var(--color-charcoal)]">
                          <span className="font-medium">Remarks:</span> {notes}
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
                        <span>Back to Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={isPending}
                        className={`${buttonPrimary} bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]`}
                      >
                        {isPending ? (
                          <span>Closing pregnancy...</span>
                        ) : (
                          <>
                            <CheckCircle size={15} weight="bold" />
                            <span>Confirm & Close Record</span>
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
      )}
    </>
  );
}
