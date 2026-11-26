"use client";

import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TrustBackdrop } from "@/components/marketing/Backdrops";
import { useT } from "@/lib/i18n/provider";

const POINTS = ["auth.shell.point1", "auth.shell.point2", "auth.shell.point3"] as const;

/**
 * Split layout for sign-in, sign-up and onboarding: brand panel on desktop,
 * a single column on phones. The form sits straight on the canvas, no card.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <main className="flex min-h-dvh">
      <aside className="relative isolate hidden w-[42%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-[var(--color-pc-plum)] px-12 py-12 text-white md:flex">
        <TrustBackdrop />

        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-120.jpg"
            width={44}
            height={44}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl border border-white/25 object-cover"
          />
          <span className="text-[20px] font-bold tracking-tight">MatruSetu</span>
        </Link>

        <div>
          <p className="text-balance text-[30px] font-semibold leading-tight tracking-[-0.02em]">
            {t("auth.shell.headline1")}
            <br />
            {t("auth.shell.headline2")}
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[14px] text-[var(--color-rail-text)]">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-pc-lilac-strong)]" aria-hidden />
                {t(p)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-[var(--color-rail-text)]">{t("auth.shell.tagline")}</p>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-20 md:px-10">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher variant="pill" placement="bottom" align="end" />
        </div>
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-80.jpg"
              width={40}
              height={40}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
            />
            <span>
              <span className="block text-[18px] font-bold leading-tight tracking-tight">MatruSetu</span>
              <span className="block text-[12px] text-[var(--color-charcoal)]">{t("auth.shell.subtitle")}</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
