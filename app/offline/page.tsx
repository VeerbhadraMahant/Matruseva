import { CheckCircle, WifiSlash, WifiHigh } from "@phosphor-icons/react/dist/ssr";

import { getT } from "@/lib/i18n/server";
import { buttonPrimary } from "@/components/ui";

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-80.jpg"
            width={40}
            height={40}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
          />
          <span className="text-[18px] font-bold tracking-tight">MatruSetu</span>
        </div>

        <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
          <WifiSlash size={26} aria-hidden />
        </span>
        <h1 className="mt-4 text-balance text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("shell.offlinePage.title")}
        </h1>
        <p className="mt-2 text-[14px] text-[var(--color-charcoal)]">{t("shell.offlinePage.body")}</p>

        <dl className="mt-6 divide-y divide-[var(--color-border)] rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-on-track)]" aria-hidden />
            <div>
              <dt className="text-[14px] font-semibold">{t("landing.offline.works.title")}</dt>
              <dd className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{t("landing.offline.works.body")}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <WifiHigh size={20} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-charcoal)]" aria-hidden />
            <div>
              <dt className="text-[14px] font-semibold">{t("landing.offline.needs.title")}</dt>
              <dd className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{t("landing.offline.needs.body")}</dd>
            </div>
          </div>
        </dl>

        <a href="/today" className={`${buttonPrimary} mt-6 w-full sm:w-auto`}>
          {t("landing.offline.retry")}
        </a>
      </div>
    </main>
  );
}
