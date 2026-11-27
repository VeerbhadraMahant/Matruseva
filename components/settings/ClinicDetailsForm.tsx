"use client";

import { useActionState } from "react";
import { updateClinicDetails, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { FormError, FormFooter, inputClass, labelClass } from "./fields";

const initialState: ActionResult = { error: null };

export function ClinicDetailsForm({
  name,
  city,
  phone,
  readOnly = false,
}: {
  name: string;
  city: string | null;
  phone: string | null;
  readOnly?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateClinicDetails, t("settings.clinic.toast")), initialState);

  return (
    <form action={formAction} className="grid h-full content-start gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="name" className={labelClass}>
          {t("settings.clinic.name")}
        </label>
        <input id="name" name="name" defaultValue={name} className={inputClass} required />
      </div>
      <div>
        <label htmlFor="city" className={labelClass}>
          {t("settings.clinic.city")}
        </label>
        <input id="city" name="city" defaultValue={city ?? ""} placeholder={readOnly ? t("settings.value.notSet") : undefined} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>
          {t("settings.clinic.phone")}
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder={readOnly ? t("settings.value.notSet") : undefined} className={inputClass} />
      </div>
      {state.error && (
        <div className="sm:col-span-2">
          <FormError>{state.error}</FormError>
        </div>
      )}
      {!readOnly && (
        <div className="sm:col-span-2">
          <FormFooter>
            <SubmitButton>{t("settings.clinic.save")}</SubmitButton>
          </FormFooter>
        </div>
      )}
    </form>
  );
}
