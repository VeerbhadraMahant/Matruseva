"use client";

import Link from "next/link";
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
} from "@phosphor-icons/react";
import { logout } from "@/app/(auth)/actions";
import { openCommandPalette } from "@/components/CommandPalette";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/calls", label: "Call queue", short: "Calls", icon: PhoneCall },
  { href: "/documents", label: "Documents", short: "Docs", icon: Tray },
  { href: "/opd", label: "OPD register", short: "OPD", icon: BookOpenText },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  clinicName,
  userName,
  isDoctor,
}: {
  clinicName: string;
  userName: string;
  isDoctor: boolean;
}) {
  const pathname = usePathname();
  const items = isDoctor ? [...NAV_ITEMS, { href: "/settings", label: "Settings", icon: Gear }] : NAV_ITEMS;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-[var(--color-rail)] text-[var(--color-rail-text)] md:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-[15px] font-semibold tracking-tight text-white">MatruSetu</p>
        <p className="mt-0.5 truncate text-[12px]">{clinicName}</p>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mx-3 mt-3 flex min-h-9 items-center gap-2 border border-white/15 px-2.5 text-left text-[13px] hover:border-white/40 hover:text-white"
      >
        <MagnifyingGlass size={15} aria-hidden />
        <span className="flex-1">Find patient…</span>
        <kbd className="num border border-white/20 px-1 text-[10px]">Ctrl K</kbd>
      </button>

      <nav className="mt-3 flex flex-1 flex-col" aria-label="Primary">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-10 items-center gap-3 px-4 text-[14px] ${
                active ? "bg-[var(--color-rail-hover)] font-medium text-white" : "hover:bg-[var(--color-rail-hover)] hover:text-white"
              }`}
            >
              {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--color-rail-accent)]" aria-hidden />}
              <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white">{userName}</p>
          <p className="text-[11px] uppercase tracking-[0.06em]">{isDoctor ? "Doctor" : "Staff"}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="flex min-h-9 min-w-9 items-center justify-center hover:text-white" aria-label="Sign out" title="Sign out">
            <SignOut size={18} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AppMobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-[var(--color-rail)] px-4 py-2 text-white md:hidden">
      <span className="text-[15px] font-semibold">MatruSetu</span>
      <div className="flex items-center">
        <button type="button" onClick={openCommandPalette} className="flex min-h-11 min-w-11 items-center justify-center" aria-label="Find patient">
          <MagnifyingGlass size={20} aria-hidden />
        </button>
        <form action={logout}>
          <button type="submit" className="flex min-h-11 min-w-11 items-center justify-center" aria-label="Sign out">
            <SignOut size={20} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border-strong)] bg-[var(--color-background)] md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, short, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-charcoal)]"
            }`}
          >
            {active && <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--color-primary)]" aria-hidden />}
            <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
            {short ?? label}
          </Link>
        );
      })}
    </nav>
  );
}
