"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Globe } from "@phosphor-icons/react";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_NATIVE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/provider";

type Variant = "row" | "icon" | "pill";

/**
 * Language menu (English / हिन्दी / मराठी). The menu is portalled to <body> with
 * fixed positioning so it is not clipped by the collapsed sidebar's
 * overflow-x-hidden or mispositioned by the mobile drawer's transform.
 *  - row:  full-width sidebar row (globe, current language, chevron-less)
 *  - icon: compact globe button (collapsed sidebar)
 *  - pill: small bordered button for headers
 */
export function LanguageSwitcher({
  variant = "pill",
  placement = "bottom",
  align = "end",
  className = "",
}: {
  variant?: Variant;
  placement?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const vertical = placement === "top" ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 };
    const horizontal = align === "end" ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) };
    setPos({ ...vertical, ...horizontal });
  }, [placement, align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button[aria-checked="true"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // do not also close the mobile drawer behind us
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onViewport = () => setOpen(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    buttonRef.current?.focus();
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const label = t("common.language.change");
  const base =
    "inline-flex items-center rounded-xl text-[var(--color-charcoal)] transition-colors hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60";
  const variants: Record<Variant, string> = {
    row: "min-h-10 w-full gap-3 px-3 text-[13px]",
    icon: "mx-auto h-11 w-11 justify-center",
    pill: "min-h-10 gap-2 border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[13px] font-medium",
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={variant === "icon" ? `${label} (${LOCALE_NATIVE_NAMES[locale]})` : undefined}
        title={label}
        disabled={pending}
        className={`${base} ${variants[variant]} ${className}`}
      >
        <Globe size={variant === "icon" ? 20 : 18} aria-hidden />
        {variant !== "icon" && <span lang={locale}>{LOCALE_NATIVE_NAMES[locale]}</span>}
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            role="radiogroup"
            aria-label={t("common.language")}
            onKeyDown={onMenuKeyDown}
            style={{ position: "fixed", zIndex: 70, ...pos }}
            className="min-w-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-1.5 shadow-[0_18px_40px_-12px_rgb(62_42_92/0.35)]"
          >
            {LOCALES.map((l) => (
              <li key={l} role="presentation">
                <button
                  type="button"
                  role="radio"
                  aria-checked={l === locale}
                  lang={l}
                  onClick={() => choose(l)}
                  className="flex min-h-10 w-full items-center justify-between gap-4 rounded-xl px-3 text-left text-[14px] text-[var(--color-foreground)] hover:bg-[var(--color-primary-surface)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                >
                  <span className={l === locale ? "font-semibold" : ""}>{LOCALE_NATIVE_NAMES[l]}</span>
                  {l === locale && <Check size={16} weight="bold" aria-hidden className="text-[var(--color-primary)]" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
