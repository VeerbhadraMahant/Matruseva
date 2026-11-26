"use client";

import { useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { errorClass, helpClass, inputClass, labelClass } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

/** Form-level error under the fields: icon plus text, announced to screen readers. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className={`${errorClass} flex items-start gap-1.5 text-[13px]`}>
      <WarningCircle size={16} weight="fill" className="mt-px shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function TextField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  defaultValue,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

/** Password input with a show/hide toggle. Presentation only: the field name and value are unchanged. */
export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  required,
  minLength,
  defaultValue,
  hint,
  labelAside,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  hint?: string;
  labelAside?: React.ReactNode;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-[var(--color-charcoal)]">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          defaultValue={defaultValue}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputClass} pr-16!`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={t(visible ? "auth.reset.hidePassword" : "auth.reset.showPassword")}
          className="absolute inset-y-0 right-0 min-w-14 rounded-r-[var(--radius-buttons)] px-3 text-[13px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)]"
        >
          {t(visible ? "auth.reset.hide" : "auth.reset.show")}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={helpClass}>
          {hint}
        </p>
      )}
    </div>
  );
}
