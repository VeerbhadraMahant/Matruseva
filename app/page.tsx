import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  ChatCircleDots,
  DeviceMobile,
  FileMagnifyingGlass,
  MagnifyingGlass,
  ScanSmiley,
  ShieldWarning,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { isDemoModeEnabled } from "@/lib/demo";
import { loginDemo } from "./(auth)/actions";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate-client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Reveal } from "@/components/marketing/Reveal";
import { HeroBackdrop, TrustBackdrop, CtaBackdrop } from "@/components/marketing/Backdrops";
import { Tag, StatusDot, buttonPrimary, buttonSecondary, card, type Tone } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("landing.meta.title"), description: t("landing.meta.description") };
}

const FEATURES = [
  { icon: CalendarCheck, key: "schedule" },
  { icon: ShieldWarning, key: "risk" },
  { icon: ChatCircleDots, key: "calls" },
  { icon: FileMagnifyingGlass, key: "documents" },
  { icon: ScanSmiley, key: "opd" },
  { icon: UsersThree, key: "team" },
] as const;

const SHOWCASE = [
  { src: "/marketing/screenshot-today-720.webp", key: "today" },
  { src: "/marketing/screenshot-calls-720.webp", key: "calls" },
  { src: "/marketing/screenshot-patient-detail-720.webp", key: "detail" },
  { src: "/marketing/screenshot-patients-720.webp", key: "patients" },
] as const;

const ctaPrimary = `${buttonPrimary} min-h-12! px-6 text-[16px]`;
const ctaSecondary = `${buttonSecondary} min-h-12! px-6 text-[16px]`;

export default async function LandingPage() {
  const { t } = await getT();
  const demo = isDemoModeEnabled();
  return (
    <div className="bg-[var(--color-pc-canvas)] text-[var(--color-foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-pc-canvas)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-80.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-xl border border-[var(--color-border)] object-cover" />
            <span className="text-[20px] font-bold tracking-tight">MatruSetu</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher variant="pill" placement="bottom" align="end" />
            <Link href="/login" className={`${buttonSecondary} border-transparent! bg-transparent! px-3 sm:px-4`}>
              {t("landing.nav.signIn")}
            </Link>
            <Link href="/signup" className={`${buttonPrimary} px-3 sm:px-4`}>
              {t("landing.nav.getStarted")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: what it is, for whom, one hard fact, the product itself */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-14 lg:pb-24 lg:pt-20">
          <HeroBackdrop />
          <div>
            <h1 className="text-balance text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[44px] lg:text-[52px]">
              {t("landing.hero.heading")}
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.6] text-[var(--color-charcoal)] sm:text-[18px]">
              {t("landing.hero.body")}
            </p>
            <p className="mt-6 flex max-w-xl items-start gap-2.5 text-[15px] font-semibold">
              <CalendarCheck size={22} weight="bold" className="mt-px shrink-0 text-[var(--color-primary)]" aria-hidden />
              {t("landing.hero.fact")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/signup" className={ctaPrimary}>
                {t("landing.cta.create")}
              </Link>
              <Link href="/login" className={ctaSecondary}>
                {t("landing.cta.signIn")}
              </Link>
              {demo && (
                <form action={loginDemo} className="contents">
                  <button type="submit" className={ctaSecondary}>
                    {t("landing.cta.demo")}
                  </button>
                </form>
              )}
            </div>
          </div>

          <Reveal delay={120}>
            <WorklistMock t={t} />
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-[var(--color-border)] bg-[var(--color-background)] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-balance text-[28px] font-bold tracking-tight sm:text-[32px]">{t("landing.features.title")}</h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[var(--color-charcoal)]">{t("landing.features.body")}</p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {FEATURES.map(({ icon: Icon, key }) => (
                <div key={key} className={`${card} h-full bg-[var(--color-pc-canvas)] p-6`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
                    <Icon size={22} weight="bold" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{t(`landing.feature.${key}.title`)}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--color-charcoal)]">{t(`landing.feature.${key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product showcase: real screens */}
        <section id="product" className="border-t border-[var(--color-border)] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-balance text-[28px] font-bold tracking-tight sm:text-[32px]">{t("landing.showcase.title")}</h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[var(--color-charcoal)]">{t("landing.showcase.body")}</p>
            </div>

            <Reveal className="mt-12 grid grid-cols-1 gap-x-10 gap-y-14 lg:grid-cols-2">
              {SHOWCASE.map((item) => (
                <figure key={item.key} className="flex flex-col">
                  <BrowserFrame>
                    <Image
                      src={item.src}
                      alt={t(`landing.showcase.${item.key}.caption`)}
                      width={720}
                      height={720}
                      loading="lazy"
                      className="w-full"
                    />
                  </BrowserFrame>
                  <h3 className="mt-5 text-[18px] font-semibold tracking-tight">{t(`landing.showcase.${item.key}.title`)}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--color-charcoal)]">{t(`landing.showcase.${item.key}.caption`)}</p>
                </figure>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Trust strip */}
        <section className="relative isolate overflow-hidden bg-[var(--color-pc-plum)] py-16 text-white sm:py-20">
          <TrustBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              {(
                [
                  { icon: MagnifyingGlass, key: "schedule" },
                  { icon: ShieldWarning, key: "safety" },
                  { icon: DeviceMobile, key: "pwa" },
                ] as const
              ).map(({ icon: Icon, key }) => (
                <div key={key}>
                  <Icon size={28} weight="bold" className="text-[var(--color-pc-lilac-strong)]" aria-hidden />
                  <h3 className="mt-4 text-[18px] font-semibold">{t(`landing.trust.${key}.title`)}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--color-rail-text)]">{t(`landing.trust.${key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden py-20 sm:py-28">
          <CtaBackdrop />
          <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-balance text-[28px] font-bold tracking-tight sm:text-[32px]">{t("landing.final.title")}</h2>
            <p className="mt-4 text-[16px] leading-[1.6] text-[var(--color-charcoal)]">{t("landing.final.body")}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className={ctaPrimary}>
                {t("landing.cta.create")}
              </Link>
              <Link href="/login" className={ctaSecondary}>
                {t("landing.cta.signIn")}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="mx-auto max-w-6xl px-4 text-[13px] text-[var(--color-charcoal)] sm:px-6">{t("landing.footer")}</div>
      </footer>
    </div>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)]">
      <div aria-hidden className="flex items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-pc-canvas)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-pc-lilac-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-pc-lilac-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-pc-plum-mid)]" />
      </div>
      {children}
    </div>
  );
}

/**
 * Styled HTML stand-in for the Today worklist: sample patients, same primitives
 * (StatusDot, Tag) as the signed-in app. Decorative, so it is one image to screen readers.
 */
function WorklistMock({ t }: { t: Translator }) {
  const rows: { name: string; weeks: number; days: number; detail: string; tone: Tone; tag: string }[] = [
    { name: "Pooja Deshmukh", weeks: 24, days: 3, detail: t("landing.mock.row.anomaly"), tone: "critical", tag: t("landing.mock.tag.overdue") },
    { name: "Sunita Verma", weeks: 30, days: 0, detail: t("landing.mock.row.td2"), tone: "warning", tag: t("landing.mock.tag.due") },
    { name: "Rekha Patil", weeks: 19, days: 5, detail: t("landing.mock.row.contact"), tone: "info", tag: t("landing.mock.tag.atRisk") },
    { name: "Anita Joshi", weeks: 12, days: 2, detail: t("landing.mock.row.ontrack"), tone: "ok", tag: t("landing.mock.tag.onTrack") },
  ];
  return (
    <div
      role="img"
      aria-label={t("landing.mock.aria")}
      className={`${card} select-none overflow-hidden shadow-[var(--shadow-overlay)]`}
    >
      <div className="flex min-h-12 items-center justify-between border-b border-[var(--color-border)]/70 px-4">
        <span className="text-[15px] font-semibold">{t("landing.showcase.today.title")}</span>
        <span className="num rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
          {rows.length}
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]/70">
        {rows.map((r) => (
          <li key={r.name} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <StatusDot tone={r.tone} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
                {r.name}
                <span className="num text-[12px] font-medium text-[var(--color-charcoal)]">
                  {t("landing.mock.ga", { weeks: r.weeks, days: r.days })}
                </span>
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{r.detail}</p>
            </div>
            <Tag tone={r.tone}>{r.tag}</Tag>
          </li>
        ))}
      </ul>
    </div>
  );
}
