"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { assignDocument, searchPatientsForAssign, getOpenCareEvents, type ActionResult } from "@/app/(app)/documents/actions";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { careEventName } from "@/lib/clinicalLabels";
import { buttonPrimary, inputClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${buttonPrimary} w-full`}
    >
      {pending ? "…" : t("documents.assign.submit")}
    </button>
  );
}

export function AssignDocumentForm({ documentId }: { documentId: string }) {
  const t = useT();
  const action = assignDocument.bind(null, documentId);
  const [state, formAction] = useActionState(withSuccessToast(action, t("documents.assign.toast")), initialState);
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [careEvents, setCareEvents] = useState<{ id: string; name: string | null; status: string | null }[]>([]);

  function onSearchChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const found = await searchPatientsForAssign(value);
      setResults(found);
    });
  }

  function selectPatient(p: { id: string; name: string }) {
    setSelected(p);
    setResults([]);
    setQuery(p.name);
    startTransition(async () => {
      const events = await getOpenCareEvents(p.id);
      setCareEvents(events);
    });
  }

  return (
    <form action={formAction} className="space-y-2.5 border-t border-[var(--color-border)] pt-3">
      <div className="relative">
        <input
          type="text"
          placeholder={t("documents.assign.search")}
          aria-label={t("documents.assign.search")}
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          className={inputClass}
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)]">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectPatient(p)}
                  className="block min-h-11 w-full px-3 py-2 text-left text-[14px] hover:bg-[var(--color-surface-1)]"
                >
                  {p.name} {p.phone ? `· ${p.phone}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input type="hidden" name="patientId" value={selected?.id ?? ""} />
      </div>

      <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:basis-36">
        <select name="docType" defaultValue="other" className={inputClass} aria-label={t("documents.assign.typeAria")}>
          <option value="report">{t("documents.type.report")}</option>
          <option value="scan">{t("documents.type.scan")}</option>
          <option value="prescription">{t("documents.type.prescription")}</option>
          <option value="case_paper">{t("documents.type.case_paper")}</option>
          <option value="register_page">{t("documents.type.register_page")}</option>
          <option value="other">{t("documents.type.other")}</option>
        </select>
        <input type="date" name="docDate" className={inputClass} aria-label={t("documents.assign.dateAria")} />
        {selected && careEvents.length > 0 && (
          <select name="careEventId" defaultValue="" className={inputClass} aria-label={t("documents.assign.careEventAria")}>
            <option value="">{t("documents.assign.notLinked")}</option>
            {careEvents.map((ce) => (
              <option key={ce.id} value={ce.id ?? ""}>
                {t("documents.assign.complete", { name: ce.name ? careEventName(ce.name, t) : "" })}
              </option>
            ))}
          </select>
        )}
      </div>

      {state.error && <p role="alert" className="text-[13px] font-medium text-[var(--color-overdue)]">{state.error}</p>}

      <SaveButton />
    </form>
  );
}
