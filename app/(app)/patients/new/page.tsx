"use client";

import { useActionState, useMemo, useState } from "react";
import { createPatient, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { eddFromLmp, gestationalAge, formatGA, trimester } from "@/lib/pregnancy";

const initialState: ActionResult = { error: null };

const inputClass =
  "w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-sm font-medium";

function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function NewPatientPage() {
  const [state, formAction] = useActionState(createPatient, initialState);
  const [lmp, setLmp] = useState("");

  const preview = useMemo(() => {
    const lmpDate = parseLocalDate(lmp);
    if (!lmpDate) return null;
    const today = new Date();
    const edd = eddFromLmp(lmpDate);
    const ga = gestationalAge(lmpDate, today);
    return {
      edd: edd.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      ga: formatGA(ga),
      trimester: trimester(ga),
    };
  }, [lmp]);

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-6 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        New patient
      </h1>

      <form action={formAction} className="max-w-xl space-y-4" noValidate>
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input id="name" name="name" type="text" required className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input id="phone" name="phone" type="tel" className={inputClass} />
          </div>
          <div>
            <label htmlFor="altPhone" className={labelClass}>
              Alternate phone
            </label>
            <input id="altPhone" name="altPhone" type="tel" className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Address / village
          </label>
          <input id="address" name="address" type="text" className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="age" className={labelClass}>
              Age
            </label>
            <input id="age" name="age" type="number" min={10} max={70} className={inputClass} />
          </div>
          <div>
            <label htmlFor="gravida" className={labelClass}>
              Gravida
            </label>
            <input id="gravida" name="gravida" type="number" min={0} max={20} className={inputClass} />
          </div>
          <div>
            <label htmlFor="para" className={labelClass}>
              Para
            </label>
            <input id="para" name="para" type="number" min={0} max={20} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 items-end gap-4">
          <div>
            <label htmlFor="bloodGroup" className={labelClass}>
              Blood group
            </label>
            <select id="bloodGroup" name="bloodGroup" className={inputClass} defaultValue="">
              <option value="">Unknown</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          <label className="mb-3 flex items-center gap-2">
            <input type="checkbox" name="rhNegative" className="h-5 w-5" />
            Rh negative
          </label>
        </div>

        <div>
          <label htmlFor="lmp" className={labelClass}>
            Last menstrual period (LMP)
          </label>
          <input
            id="lmp"
            name="lmp"
            type="date"
            required
            className={inputClass}
            value={lmp}
            onChange={(e) => setLmp(e.target.value)}
          />
          {preview && (
            <p className="mt-2 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] px-4 py-3 text-sm">
              EDD <strong>{preview.edd}</strong> · currently <strong>{preview.ga}</strong> · trimester{" "}
              {preview.trimester}
            </p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-[var(--color-overdue)]">
            {state.error}
          </p>
        )}

        <SubmitButton>Register patient</SubmitButton>
      </form>
    </div>
  );
}
