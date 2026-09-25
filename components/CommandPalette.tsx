"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, ArrowRight, UserPlus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

const OPEN_EVENT = "matrusetu:open-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface PatientHit {
  id: string;
  name: string;
  phone: string | null;
  clinic_patient_no: string | null;
}

interface Item {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: "patient" | "page" | "action";
}

const PAGES: Item[] = [
  { id: "p-today", label: "Today", hint: "Worklist", href: "/today", kind: "page" },
  { id: "p-patients", label: "Patients", hint: "All active pregnancies", href: "/patients", kind: "page" },
  { id: "p-calls", label: "Call queue", hint: "Follow-up calls", href: "/calls", kind: "page" },
  { id: "p-docs", label: "Documents", hint: "Unfiled inbox + search", href: "/documents", kind: "page" },
  { id: "p-opd", label: "OPD register", hint: "Register pages", href: "/opd", kind: "page" },
  { id: "a-new", label: "Register new patient", hint: "Action", href: "/patients/new", kind: "action" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientHit[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback(() => {
    setOpen(true);
    setQuery("");
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [show]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // One fetch per open; filtering then happens locally on every keystroke.
    createClient()
      .from("patients")
      .select("id, name, phone, clinic_patient_no")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setPatients(data ?? []));
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const patientItems: Item[] = (patients ?? [])
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && (p.phone ?? "").includes(digits)) ||
          (p.clinic_patient_no ?? "").toLowerCase().includes(q)
      )
      .slice(0, q ? 8 : 5)
      .map((p) => ({
        id: p.id,
        label: p.name,
        hint: [p.clinic_patient_no, p.phone].filter(Boolean).join(" · "),
        href: `/patients/${p.id}`,
        kind: "patient" as const,
      }));
    const pageItems = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q));
    return [...patientItems, ...pageItems];
  }, [patients, query]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div role="dialog" aria-modal="true" aria-label="Find patient or page" className="w-full max-w-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
          <MagnifyingGlass size={18} className="text-[var(--color-charcoal)]" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") go(items[cursor]);
            }}
            placeholder="Name, phone number, or page…"
            aria-label="Search"
            className="min-h-12 flex-1 bg-transparent text-[15px] outline-none"
          />
          <kbd className="num border border-[var(--color-border)] px-1 text-[10px] text-[var(--color-charcoal)]">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {patients === null && <li className="px-3 py-2 text-[13px] text-[var(--color-charcoal)]">Loading patients…</li>}
          {items.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(item)}
                className={`flex min-h-10 w-full items-center gap-3 px-3 text-left ${i === cursor ? "bg-[var(--color-surface-2)]" : ""}`}
              >
                {item.kind === "action" ? (
                  <UserPlus size={16} aria-hidden />
                ) : (
                  <ArrowRight size={16} className={item.kind === "page" ? "" : "opacity-0"} aria-hidden />
                )}
                <span className="flex-1 text-[14px]">{item.label}</span>
                <span className="num text-[12px] text-[var(--color-charcoal)]">{item.hint}</span>
              </button>
            </li>
          ))}
          {patients !== null && items.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-[var(--color-charcoal)]">No matches.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
