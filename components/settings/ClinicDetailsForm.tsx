"use client";

import { useActionState } from "react";
import { updateClinicDetails, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { errorClass, inputClass, labelClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

export function ClinicDetailsForm({ name, city, phone }: { name: string; city: string | null; phone: string | null }) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateClinicDetails, t("settings.clinic.toast")), initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="name" className={labelClass}>
          {t("settings.clinic.name")}
        </label>
        <input id="name" name="name" defaultValue={name} className={inputClass} required />
      </div>
      <div>
        <label htmlFor="city" className={labelClass}>
          {t("settings.clinic.city")}
        </label>
        <input id="city" name="city" defaultValue={city ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>
          {t("settings.clinic.phone")}
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} className={inputClass} />
      </div>
      {state.error && (
        <p role="alert" className={`${errorClass} sm:col-span-3`}>
          {state.error}
        </p>
      )}
      <div className="sm:col-span-3 sm:max-w-56">
        <SubmitButton>{t("settings.clinic.save")}</SubmitButton>
      </div>
    </form>
  );
}
