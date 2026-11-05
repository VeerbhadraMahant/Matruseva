import { WifiSlash } from "@phosphor-icons/react/dist/ssr";

import { getT } from "@/lib/i18n/server";

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div className="w-full max-w-sm rounded-[var(--radius-sections)] border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-[0_24px_48px_-24px_rgb(62_42_92/0.25)]">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
          <WifiSlash size={28} aria-hidden />
        </span>
        <h1 className="mb-1.5 text-[22px] font-semibold tracking-tight text-[var(--color-foreground)]">{t("shell.offlinePage.title")}</h1>
        <p className="text-[14px] text-[var(--color-charcoal)]">
          {t("shell.offlinePage.body")}
        </p>
      </div>
    </main>
  );
}
