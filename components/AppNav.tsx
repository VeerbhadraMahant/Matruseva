import Link from "next/link";
import { CalendarCheck, Users, PhoneCall, FileText, BookOpenText } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/app/(auth)/actions";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/opd", label: "OPD", icon: BookOpenText },
];

export function AppSidebar({ clinicName }: { clinicName: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] p-6 md:flex">
      <span className="mb-1 font-[var(--font-heading)] text-xl font-light text-[var(--color-primary)]">
        MatruSetu
      </span>
      <span className="mb-8 truncate text-sm text-[var(--color-charcoal)]">{clinicName}</span>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-[var(--radius-nav)] px-3 py-2 text-[var(--color-foreground)] hover:bg-[var(--color-surface-1)]"
          >
            <Icon size={20} weight="regular" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <form action={logout}>
        <button type="submit" className="mt-4 text-left text-sm text-[var(--color-charcoal)]">
          Sign out
        </button>
      </form>
    </aside>
  );
}

export function AppMobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)] px-6 py-4 md:hidden">
      <span className="font-[var(--font-heading)] text-lg font-light text-[var(--color-primary)]">
        MatruSetu
      </span>
      <form action={logout}>
        <button type="submit" className="text-sm text-[var(--color-charcoal)]">
          Sign out
        </button>
      </form>
    </header>
  );
}

export function AppBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 flex border-t border-[var(--color-border)] bg-[var(--color-background)] md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-[var(--color-foreground)]"
        >
          <Icon size={22} weight="regular" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
