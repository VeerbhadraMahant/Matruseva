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
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Reveal } from "@/components/marketing/Reveal";
import {
  HeroBackdrop,
  FeatureBackdrop,
  ShowcaseBackdrop,
  TrustBackdrop,
  CtaBackdrop,
  WaveDivider,
} from "@/components/marketing/Backdrops";

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

export default async function LandingPage() {
  const { t } = await getT();
  return (
    <div
      className="bg-[#faf6ec] text-[#221b2b]"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#221b2b]/10 bg-[#faf6ec]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-80.jpg" alt="MatruSetu" width={36} height={36} className="h-9 w-9 rounded-xl object-cover shadow-[0_2px_8px_rgba(62,42,92,0.15)]" />
            <span className="text-[20px] font-bold tracking-tight">
              MatruSetu
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="pill" placement="bottom" align="end" />
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[14px] font-medium text-[#221b2b] transition-colors hover:bg-[#221b2b]/5"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#3e2a5c] px-5 py-2 text-[14px] font-semibold text-white shadow-[0_8px_16px_0_rgba(62,42,92,0.28)] transition-colors hover:bg-[#2e1f46]"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <HeroBackdrop />
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-[#ebe1f1] px-4 py-1.5 text-[13px] font-semibold text-[#3e2a5c]">
              {t("landing.hero.badge")}
            </span>
            <h1 className="mt-6 text-[36px] font-bold leading-[1.1] tracking-tight sm:text-[48px] lg:text-[56px]">
              {t("landing.hero.title")}
              <span className="text-[#3e2a5c]">{t("landing.hero.titleAccent")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.6] text-[#4a4354] sm:text-[18px]">
              {t("landing.hero.body")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-[#3e2a5c] px-7 py-3.5 text-center text-[16px] font-semibold text-white shadow-[0_12px_24px_0_rgba(62,42,92,0.28)] transition-colors hover:bg-[#2e1f46] sm:w-auto"
              >
                {t("landing.cta.create")}
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-[#221b2b]/15 bg-white px-7 py-3.5 text-center text-[16px] font-semibold text-[#221b2b] transition-colors hover:bg-[#221b2b]/5 sm:w-auto"
              >
                {t("landing.cta.signIn")}
              </Link>
            </div>
          </Reveal>

          {/* Hero product shot */}
          <Reveal delay={150} className="mx-auto mt-16 max-w-4xl">
            <BrowserFrame>
              <Image
                src="/marketing/screenshot-today-958.webp"
                alt={t("landing.hero.imageAlt")}
                width={958}
                height={958}
                priority
                className="w-full"
              />
            </BrowserFrame>
          </Reveal>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className="relative border-t border-[#221b2b]/10 bg-white py-20 sm:py-28"
        >
          <FeatureBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                {t("landing.features.title")}
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[#4a4354]">
                {t("landing.features.body")}
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, key }, i) => (
                <Reveal key={key} delay={(i % 3) * 80}>
                  <div className="h-full rounded-2xl border border-[#221b2b]/10 bg-[#faf6ec] p-8 shadow-[rgba(62,42,92,0.05)_0px_4px_4px_0px,rgba(62,42,92,0.08)_0px_32px_16px_0px]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3e2a5c]/10 text-[#3e2a5c]">
                      <Icon size={22} weight="bold" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold tracking-tight">
                      {t(`landing.feature.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#4a4354]">
                      {t(`landing.feature.${key}.body`)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Product showcase */}
        <section
          id="product"
          className="relative border-t border-[#221b2b]/10 py-20 sm:py-28"
        >
          <ShowcaseBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                {t("landing.showcase.title")}
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[#4a4354]">
                {t("landing.showcase.body")}
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-20">
              {SHOWCASE.map((item, i) => (
                <Reveal key={item.key} delay={(i % 2) * 120} className="flex flex-col">
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
                  <h3 className="mt-6 text-[18px] font-semibold tracking-tight">
                    {t(`landing.showcase.${item.key}.title`)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#4a4354]">
                    {t(`landing.showcase.${item.key}.caption`)}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <WaveDivider from="#faf6ec" to="#3e2a5c" />

        {/* Trust / how it works strip */}
        <section className="relative bg-[#3e2a5c] py-20 text-white sm:py-24">
          <TrustBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              <Reveal>
                <MagnifyingGlass
                  size={28}
                  weight="bold"
                  className="text-[#8c78b3]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  {t("landing.trust.schedule.title")}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  {t("landing.trust.schedule.body")}
                </p>
              </Reveal>
              <Reveal delay={80}>
                <ShieldWarning
                  size={28}
                  weight="bold"
                  className="text-[#8c78b3]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  {t("landing.trust.safety.title")}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  {t("landing.trust.safety.body")}
                </p>
              </Reveal>
              <Reveal delay={160}>
                <DeviceMobile
                  size={28}
                  weight="bold"
                  className="text-[#8c78b3]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  {t("landing.trust.pwa.title")}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  {t("landing.trust.pwa.body")}
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <WaveDivider from="#3e2a5c" to="#faf6ec" />

        {/* Final CTA */}
        <section className="relative py-20 sm:py-28">
          <CtaBackdrop />
          <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              {t("landing.final.title")}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.6] text-[#4a4354]">
              {t("landing.final.body")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-[#3e2a5c] px-7 py-3.5 text-center text-[16px] font-semibold text-white shadow-[0_12px_24px_0_rgba(62,42,92,0.28)] transition-colors hover:bg-[#2e1f46] sm:w-auto"
              >
                {t("landing.cta.create")}
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-[#221b2b]/15 bg-white px-7 py-3.5 text-center text-[16px] font-semibold text-[#221b2b] transition-colors hover:bg-[#221b2b]/5 sm:w-auto"
              >
                {t("landing.cta.signIn")}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#221b2b]/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-[13px] text-[#4a4354] sm:px-6">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#221b2b]/10 bg-white shadow-[rgba(62,42,92,0.1)_0px_12px_24px_0px,rgba(62,42,92,0.1)_0px_48px_48px_0px]">
      <div className="flex items-center gap-1.5 border-b border-[#221b2b]/10 bg-[#faf6ec] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#d9c9e6]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#c9b8dc]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#8c78b3]" />
      </div>
      {children}
    </div>
  );
}
