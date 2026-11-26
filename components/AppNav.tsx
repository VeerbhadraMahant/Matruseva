"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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
  List,
  X,
  SidebarSimple,
  UserPlus,
  DotsThree,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { logout } from "@/app/(auth)/actions";
import { discardQueueForLogout } from "@/lib/offlineQueue";
import { openCommandPalette } from "@/components/CommandPalette";
import { useSidebar } from "@/components/AppShell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { buttonSecondary, iconButton } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

/** Sign out, first wiping the offline queue (patient data must not outlive the session). */
async function logoutAndClearQueue() {
  if (await discardQueueForLogout()) await logout();
}

const noopSubscribe = () => () => {};
/** "⌘K" on Apple platforms; server and first client render use "Ctrl K" (no hydration mismatch). */
function useModKeyLabel() {
  const apple = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
  return { search: apple ? "⌘K" : "Ctrl K", toggle: apple ? "⌘B" : "Ctrl+B" };
}

type NavItem = { href: string; label: MessageKey; short?: MessageKey; icon: Icon };

/** Daily work, in the order staff reach for it. */
const DAILY_ITEMS: NavItem[] = [
  { href: "/today", label: "shell.nav.today", icon: CalendarCheck },
  { href: "/calls", label: "shell.nav.calls", short: "shell.nav.calls.short", icon: PhoneCall },
  { href: "/patients", label: "shell.nav.patients", icon: Users },
  { href: "/opd", label: "shell.nav.opd", short: "shell.nav.opd.short", icon: BookOpenText },
  { href: "/documents", label: "shell.nav.documents", short: "shell.nav.documents.short", icon: Tray },
];
const SCAN_ITEM: NavItem = { href: "/scan", label: "shell.nav.scan", short: "shell.nav.scan.short", icon: QrCode };
const SETTINGS_ITEM: NavItem = { href: "/settings", label: "shell.nav.settings", icon: Gear };
/** Phone bottom bar: four destinations plus "More" (the menu drawer holds everything). */
const MOBILE_NAV_HREFS = ["/today", "/calls", "/patients", "/documents"];
const MOBILE_NAV_ITEMS = DAILY_ITEMS.filter((item) => MOBILE_NAV_HREFS.includes(item.href));
const OPEN_MENU_EVENT = "matrusetu:open-menu";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-80.jpg"
      alt="MatruSetu"
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-xl border border-white/20 object-cover shadow-[var(--shadow-card)]"
    />
  );
}

function initials(name: string): string {
  const parts = name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// The global plum focus outline would vanish on the plum rail, so use the light rail accent there.
const RAIL_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-rail-accent)]";

function MenuBody({
  pathname,
  daily,
  utility,
  clinicName,
  userName,
  isDoctor,
  onClose,
  onNavigate,
  firstLinkRef,
  hideSearch,
  hideLanguage,
  collapsed = false,
  onToggleCollapse,
  callBadge,
}: {
  pathname: string;
  daily: NavItem[];
  utility: NavItem[];
  clinicName: string;
  userName: string;
  isDoctor: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
  hideSearch?: boolean;
  hideLanguage?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  callBadge?: React.ReactNode;
}) {
  const keys = useModKeyLabel();
  const t = useT();
  const callBadgeId = useId();

  const renderLink = ({ href, label: labelKey, icon: Icon }: NavItem, ref?: React.Ref<HTMLAnchorElement>) => {
    const label = t(labelKey);
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        ref={ref}
        href={href}
        prefetch={true}
        onClick={onNavigate}
        aria-label={label}
        aria-describedby={href === "/calls" && callBadge ? callBadgeId : undefined}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={`group/link relative flex min-h-11 items-center rounded-[var(--radius-buttons)] text-[15px] transition-colors duration-150 ${RAIL_FOCUS} ${
          collapsed ? "justify-center" : "gap-3 px-3"
        } ${
          active
            ? "bg-white/15 font-semibold text-white"
            : "text-[var(--color-rail-text)] hover:bg-white/10 hover:text-white"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--color-rail-accent)]" />
        )}
        <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden />
        <span className={collapsed ? "sr-only" : "min-w-0 flex-1 leading-snug"}>{label}</span>
        {/* The badge component is plum-on-plum here; recolour it for the rail. */}
        {href === "/calls" && callBadge && (
          <span
            id={callBadgeId}
            className="contents [&>span]:!bg-white [&>span]:!text-[var(--color-primary)] [&>span]:!ring-[var(--color-rail)]"
          >
            {callBadge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className={`flex items-center gap-3 pb-4 pt-5 ${collapsed ? "justify-center" : "justify-between px-5"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[16px] font-semibold tracking-tight text-white">MatruSetu</p>
            <p className="truncate text-[12px] text-[var(--color-rail-text)]">{clinicName}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("shell.nav.closeMenu")}
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-buttons)] text-[var(--color-rail-text)] hover:bg-white/10 hover:text-white ${RAIL_FOCUS}`}
          >
            <X size={20} aria-hidden />
          </button>
        )}
      </div>

      {!hideSearch && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            openCommandPalette();
          }}
          className={`mx-4 flex min-h-11 items-center gap-2 rounded-[var(--radius-buttons)] bg-white/10 px-3 text-left text-[13px] text-[var(--color-rail-text)] transition-colors hover:bg-white/15 hover:text-white ${RAIL_FOCUS}`}
        >
          <MagnifyingGlass size={16} aria-hidden />
          <span className="flex-1">{t("shell.nav.findPatient")}</span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium">{keys.search}</kbd>
        </button>
      )}

      <nav
        className={`mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden ${collapsed ? "px-2" : "px-3"}`}
        aria-label={t("shell.nav.primary")}
      >
        {daily.map((item, i) => renderLink(item, i === 0 ? firstLinkRef : undefined))}
        <div className="flex-1" />
        <div role="separator" className="my-1 h-px bg-white/15" />
        {utility.map((item) => renderLink(item))}
      </nav>

      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("shell.nav.expand") : t("shell.nav.collapse")}
          title={t(collapsed ? "shell.nav.expandTitle" : "shell.nav.collapseTitle", { shortcut: keys.toggle })}
          className={`mx-3 mt-2 flex min-h-10 items-center rounded-[var(--radius-buttons)] text-[13px] text-[var(--color-rail-text)] transition-colors hover:bg-white/10 hover:text-white ${RAIL_FOCUS} ${
            collapsed ? "justify-center" : "gap-3 px-3"
          }`}
        >
          <SidebarSimple size={20} weight={collapsed ? "fill" : "regular"} aria-hidden />
          {!collapsed && <span>{t("shell.nav.collapseLabel")}</span>}
        </button>
      )}

      {!hideLanguage && (
        <div className={collapsed ? "px-2 pt-2" : "px-3 pt-2"}>
          <LanguageSwitcher
            variant={collapsed ? "icon" : "row"}
            placement="top"
            align="start"
            className="!text-[var(--color-rail-text)] hover:!bg-white/10 hover:!text-white"
          />
        </div>
      )}

      <div className={`m-3 flex items-center rounded-2xl bg-white/10 ${collapsed ? "flex-col gap-2 p-2" : "gap-3 p-3"}`}>
        <span
          aria-hidden
          title={collapsed ? userName : undefined}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)]"
        >
          {initials(userName)}
        </span>
        <div className={`min-w-0 flex-1 ${collapsed ? "hidden" : ""}`}>
          <p className="truncate text-[13px] font-medium text-white">{userName}</p>
          <p className="text-[12px] text-[var(--color-rail-text)]">{isDoctor ? t("shell.nav.role.doctor") : t("shell.nav.role.staff")}</p>
        </div>
        <form action={logoutAndClearQueue}>
          <button
            type="submit"
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-rail-text)] transition-colors hover:bg-white/10 hover:text-white md:min-h-9 md:min-w-9 ${RAIL_FOCUS}`}
            aria-label={t("shell.nav.signOut")}
            title={t("shell.nav.signOut")}
          >
            <SignOut size={18} aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}

export function AppTopBar({
  clinicName,
  userName,
  isDoctor,
  callBadge,
}: {
  clinicName: string;
  userName: string;
  isDoctor: boolean;
  /** Server-rendered (Suspense-wrapped) overdue badge for the Call queue link. */
  callBadge?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const keys = useModKeyLabel();
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const utility = isDoctor ? [SCAN_ITEM, SETTINGS_ITEM] : [SCAN_ITEM];
  const section = [...DAILY_ITEMS, ...utility].find((item) => isActive(pathname, item.href));
  const onNewPatient = pathname === "/patients/new";

  const close = useCallback(() => {
    setOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // The phone bottom bar's "More" item opens this drawer.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MENU_EVENT, onOpen);
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
      <header className="pc-glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 !rounded-none !border-x-0 !border-t-0 px-3 print:hidden md:px-6">
        <div className="flex min-w-0 items-center gap-3 md:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("shell.nav.openMenu")}
            aria-expanded={open}
            aria-controls="app-menu"
            title={t("shell.nav.menu")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-buttons)] bg-[var(--color-primary-surface)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
          >
            <List size={22} weight="bold" aria-hidden />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <span className="truncate text-[17px] font-semibold tracking-tight text-[var(--color-foreground)]">MatruSetu</span>
          </div>
        </div>

        {/* Desktop page context: clinic, then the section you are in. */}
        <p className="hidden min-w-0 items-center gap-2 truncate text-[14px] text-[var(--color-charcoal)] md:flex">
          <span className="truncate">{clinicName}</span>
          {section && (
            <>
              <span aria-hidden>/</span>
              <span className="font-semibold text-[var(--color-foreground)]">{t(section.label)}</span>
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden min-h-10 w-64 items-center gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-left text-[13px] text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)] md:flex lg:w-72"
          >
            <MagnifyingGlass size={16} aria-hidden />
            <span className="flex-1">{t("shell.nav.findPatient")}</span>
            <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 text-[11px] font-medium">{keys.search}</kbd>
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className={`${iconButton} md:hidden`}
            aria-label={t("shell.nav.findPatientShort")}
          >
            <MagnifyingGlass size={21} aria-hidden />
          </button>
          {!onNewPatient && (
            <>
              <Link href="/patients/new" className={`${buttonSecondary} hidden md:inline-flex`}>
                <UserPlus size={18} aria-hidden />
                {t("patients.newPatient")}
              </Link>
              <Link href="/patients/new" aria-label={t("patients.newPatient")} title={t("patients.newPatient")} className={`${iconButton} md:hidden`}>
                <UserPlus size={21} aria-hidden />
              </Link>
            </>
          )}
          <div className="hidden md:block">
            <LanguageSwitcher variant="pill" />
          </div>
          <span
            aria-hidden
            title={`${userName} (${clinicName})`}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)] md:flex"
          >
            {initials(userName)}
          </span>
        </div>
      </header>

      {/* Slide-in menu (phone) */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-[rgb(34_27_43/0.32)] transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="app-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("shell.nav.mainMenu")}
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[var(--color-rail)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-overlay)] transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <MenuBody
          pathname={pathname}
          daily={DAILY_ITEMS}
          utility={utility}
          clinicName={clinicName}
          userName={userName}
          isDoctor={isDoctor}
          onClose={close}
          onNavigate={() => setOpen(false)}
          firstLinkRef={firstLinkRef}
          callBadge={callBadge}
        />
      </aside>

      {/* Permanent plum rail on desktop */}
      <aside
        aria-label={t("shell.nav.mainMenu")}
        data-collapsed={collapsed}
        className="app-sidebar group/sb fixed inset-y-0 left-0 z-30 hidden flex-col overflow-x-hidden bg-[var(--color-rail)] print:hidden md:flex"
      >
        <MenuBody
          pathname={pathname}
          daily={DAILY_ITEMS}
          utility={utility}
          clinicName={clinicName}
          userName={userName}
          isDoctor={isDoctor}
          hideSearch
          hideLanguage
          collapsed={collapsed}
          onToggleCollapse={toggle}
          callBadge={callBadge}
        />
      </aside>
    </>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  const t = useT();
  // "More" owns the pages that are not in the bar (OPD, Scan, Settings).
  const moreActive = !MOBILE_NAV_ITEMS.some((item) => isActive(pathname, item.href));
  const itemClass = (active: boolean) =>
    `flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-center text-[11px] leading-tight ${
      active ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-charcoal)]"
    }`;
  const pill = (active: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-[var(--color-primary-surface)]" : ""}`;
  return (
    <nav
      aria-label={t("shell.nav.primary")}
      className="pc-glass fixed inset-x-0 bottom-0 z-20 flex h-[var(--mobile-nav-height)] !rounded-none !border-x-0 !border-b-0 px-1 pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
    >
      {MOBILE_NAV_ITEMS.map(({ href, label, short, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} prefetch={true} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <span className={pill(active)}>
              <Icon size={21} weight={active ? "fill" : "regular"} aria-hidden />
            </span>
            {t(short ?? label)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
        aria-haspopup="dialog"
        aria-controls="app-menu"
        className={itemClass(moreActive)}
      >
        <span className={pill(moreActive)}>
          <DotsThree size={21} weight="bold" aria-hidden />
        </span>
        {t("shell.nav.more")}
      </button>
    </nav>
  );
}
