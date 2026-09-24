"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { assignDocument, searchPatientsForAssign, getOpenCareEvents, type ActionResult } from "@/app/(app)/documents/actions";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-11 rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "…" : "Assign"}
    </button>
  );
}

export function AssignDocumentForm({ documentId }: { documentId: string }) {
  const action = assignDocument.bind(null, documentId);
  const [state, formAction] = useActionState(action, initialState);
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
    <form action={formAction} className="space-y-2 border-t border-[var(--color-border)] pt-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Search patient by name…"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} w-full`}
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-none">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectPatient(p)}
                  className="block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-1)]"
                >
                  {p.name} {p.phone ? `· ${p.phone}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input type="hidden" name="patientId" value={selected?.id ?? ""} />
      </div>

      <div className="flex flex-wrap gap-2">
        <select name="docType" defaultValue="other" className={inputClass}>
          <option value="report">Report</option>
          <option value="scan">Scan</option>
          <option value="prescription">Prescription</option>
          <option value="case_paper">Case paper</option>
          <option value="register_page">Register page</option>
          <option value="other">Other</option>
        </select>
        <input type="date" name="docDate" className={inputClass} />
        {selected && careEvents.length > 0 && (
          <select name="careEventId" defaultValue="" className={inputClass}>
            <option value="">Not linked to a schedule item</option>
            {careEvents.map((ce) => (
              <option key={ce.id} value={ce.id ?? ""}>
                Complete: {ce.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {state.error && <p className="text-sm text-[var(--color-overdue)]">{state.error}</p>}

      <SaveButton />
    </form>
  );
}
