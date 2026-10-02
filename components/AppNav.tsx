"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Users,
  PhoneCall,
  Tray,
  BookOpenText,
  Gear,
  MagnifyingGlass,
  SignOut,
  QrCode,
  House,
  X,
} from "@phosphor-icons/react";
import { logout } from "@/app/(auth)/actions";
import { openCommandPalette } from "@/components/CommandPalette";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/scan", label: "Scan QR Card", short: "Scan", icon: QrCode },
  { href: "/calls", label: "Call queue", short: "Calls", icon: PhoneCall },
  { href: "/documents", label: "Documents", short: "Docs", icon: Tray },
  { href: "/opd", label: "OPD register", short: "OPD", icon: BookOpenText },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.jpg"
      alt="MatruSetu"
      className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-[0_4px_12px_-4px_rgba(62,42,92,0.4)] border border-white/20"
    />
  );
}

function initials(name: string): string {
  const parts = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function AppTopBar({
  clinicName,
  userName,
  isDoctor,
}: {
  clinicName: string;
  userName: string;
  isDoctor: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const items = isDoctor ? [...NAV_ITEMS, { href: "/settings", label: "Settings", icon: Gear }] : NAV_ITEMS;

  const close = useCallback(() => {
    setOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Esc closes; page scroll is locked while the menu is open.
  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <header className="pc-glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 !rounded-none !border-x-0 !border-t-0 px-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-menu"
            title="Menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-surface)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
          >
            <House size={22} weight="fill" aria-hidden />
          </button>
          <Link href="/today" className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <span className="text-[17px] font-semibold tracking-tight text-[var(--color-foreground)]">MatruSetu</span>
            <span className="hidden truncate text-[13px] text-[var(--color-charcoal)] sm:inline">· {clinicName}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden min-h-10 w-64 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-left text-[13px] text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)] md:flex"
          >
            <MagnifyingGlass size={16} aria-hidden />
            <span className="flex-1">Find patient…</span>
            <kbd className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-charcoal)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] md:hidden"
            aria-label="Find patient"
          >
            <MagnifyingGlass size={21} aria-hidden />
          </button>
          <span
            aria-hidden
            title={userName}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)] sm:flex"
          >
            {initials(userName)}
          </span>
        </div>
      </header>

      {/* Slide-in menu */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-[rgb(34_27_43/0.32)] backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="app-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[var(--color-background)] shadow-[0_24px_60px_-12px_rgb(62_42_92/0.45)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold tracking-tight text-[var(--color-foreground)]">MatruSetu</p>
              <p className="truncate text-[12px] text-[var(--color-charcoal)]">{clinicName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-charcoal)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openCommandPalette();
          }}
          className="mx-4 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-left text-[13px] text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)]"
        >
          <MagnifyingGlass size={16} aria-hidden />
          <span className="flex-1">Find patient…</span>
          <kbd className="rounded-md bg-[var(--color-background)] px-1.5 py-0.5 text-[11px] font-medium">Ctrl K</kbd>
        </button>

        <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Primary">
          {items.map(({ href, label, icon: Icon }, i) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-150 ${
                  active
                    ? "bg-[var(--color-primary)] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(62_42_92/0.7)]"
                    : "text-[var(--color-charcoal)] hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]"
                }`}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-2xl bg-[var(--color-surface-1)] p-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)]"
          >
            {initials(userName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[var(--color-foreground)]">{userName}</p>
            <p className="text-[12px] text-[var(--color-charcoal)]">{isDoctor ? "Doctor" : "Staff"}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--color-charcoal)] transition-colors hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)]"
              aria-label="Sign out"
              title="Sign out"
            >
              <SignOut size={18} aria-hidden />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="pc-glass fixed inset-x-0 bottom-0 z-20 flex !rounded-none !border-x-0 !border-b-0 px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, short, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
              active ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-charcoal)]"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                active ? "bg-[var(--color-primary-surface)]" : ""
              }`}
            >
              <Icon size={21} weight={active ? "fill" : "regular"} aria-hidden />
            </span>
            {short ?? label}
          </Link>
        );
      })}
    </nav>
  );
}
