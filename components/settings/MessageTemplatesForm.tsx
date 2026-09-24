"use client";

import { useActionState } from "react";
import { updateMessageTemplates, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { MessageTemplates } from "@/lib/whatsapp";

const initialState: ActionResult = { error: null };
const textareaClass =
  "w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

const FIELDS: { name: keyof MessageTemplates; label: string; placeholder: string }[] = [
  {
    name: "overdue",
    label: "Overdue item",
    placeholder: "Hello, this is {name}'s clinic calling. Your {item} is now overdue — please visit us at the earliest.",
  },
  {
    name: "due_soon",
    label: "Due soon",
    placeholder: "Hello, this is a reminder that {name}'s {item} is due soon. Please visit the clinic or call to schedule.",
  },
  {
    name: "at_risk",
    label: "At risk (missed a visit)",
    placeholder: "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay.",
  },
  {
    name: "lost",
    label: "Lost to follow-up",
    placeholder: "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay.",
  },
];

export function MessageTemplatesForm({ templates }: { templates: MessageTemplates }) {
  const [state, formAction] = useActionState(updateMessageTemplates, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-[var(--color-charcoal)]">
        Used as the pre-filled WhatsApp message on the Calls queue. Leave blank to use the default. {"{name}"} and{" "}
        {"{item}"} are replaced with the patient&apos;s name and the schedule item (e.g. &ldquo;NT scan&rdquo;). English
        only for now — Hindi/Marathi wording needs the clinic&apos;s review before it ships.
      </p>
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`template-${field.name}`} className={labelClass}>
            {field.label}
          </label>
          <textarea
            id={`template-${field.name}`}
            name={field.name}
            rows={2}
            defaultValue={templates[field.name] ?? ""}
            placeholder={field.placeholder}
            className={textareaClass}
          />
        </div>
      ))}
      {state.error && <p className="text-sm text-[var(--color-overdue)]">{state.error}</p>}
      <SubmitButton>Save message templates</SubmitButton>
    </form>
  );
}
