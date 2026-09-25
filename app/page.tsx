import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
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
import { Reveal } from "@/components/marketing/Reveal";
import {
  HeroBackdrop,
  FeatureBackdrop,
  ShowcaseBackdrop,
  TrustBackdrop,
  CtaBackdrop,
  WaveDivider,
} from "@/components/marketing/Backdrops";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-landing",
});

export const metadata: Metadata = {
  title: "MatruSetu — Antenatal care, organised",
  description:
    "MatruSetu helps OB-GYN clinics track every pregnancy's ANC schedule, catch patients who are falling behind, and digitise the OPD register — without the spreadsheets.",
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Automatic ANC scheduling",
    body: "Enter a patient's LMP once and MatruSetu builds her full antenatal care schedule — scans, blood tests, injections, and visits — each one tracked as due, upcoming, or overdue.",
  },
  {
    icon: ShieldWarning,
    title: "Follow-up risk detection",
    body: "Every patient is scored on-track, at-risk, or lost based on overdue critical items and missed contact attempts, so staff know exactly who to chase before a pregnancy falls through the cracks.",
  },
  {
    icon: ChatCircleDots,
    title: "One-tap staff call queue",
    body: "Overdue and at-risk patients land in a single worklist with one-tap WhatsApp and call links, so your front desk can work through follow-ups in minutes, not a notebook.",
  },
  {
    icon: FileMagnifyingGlass,
    title: "Searchable document capture",
    body: "Scan lab reports and prescriptions from the browser. In-browser OCR makes every document full-text searchable — no more digging through folders for an old report.",
  },
  {
    icon: ScanSmiley,
    title: "OPD register, digitised",
    body: "Capture your paper OPD register with a phone camera. Every page is tagged by date and searchable, so the register stops being a physical bottleneck.",
  },
  {
    icon: UsersThree,
    title: "Built for the whole clinic",
    body: "Doctor and staff roles, per-clinic settings, and multi-staff accounts — so the person on reception and the doctor in consult are always looking at the same patient record.",
  },
];

const SHOWCASE = [
  {
    src: "/marketing/screenshot-today.jpg",
    title: "Today",
    caption:
      "A dense, at-a-glance dashboard of the clinic's day — stat tiles and a worklist of every overdue patient, ready when staff walk in.",
  },
  {
    src: "/marketing/screenshot-calls.jpg",
    title: "Call queue",
    caption:
      "Overdue and at-risk patients in one queue, with a WhatsApp and phone link for each — staff-initiated outreach, no automation required.",
  },
  {
    src: "/marketing/screenshot-patient-detail.jpg",
    title: "Patient timeline",
    caption:
      "GA, EDD, and risk alerts up top, with a visual ANC timeline below showing exactly which scans, tests, and visits are done, due, or overdue.",
  },
  {
    src: "/marketing/screenshot-patients.jpg",
    title: "Patient list",
    caption:
      "Every patient in the clinic, searchable and filterable — find the record you need without flipping through a register.",
  },
];

export default function LandingPage() {
  return (
    <div
      className={`${montserrat.variable} bg-[#f8f3eb] text-[#080331]`}
      style={{ fontFamily: "var(--font-landing), sans-serif" }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#080331]/10 bg-[#f8f3eb]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-[20px] font-bold tracking-tight">
            MatruSetu
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[14px] font-medium text-[#080331] transition-colors hover:bg-[#080331]/5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#0f3e17] px-5 py-2 text-[14px] font-semibold text-white shadow-[0_8px_16px_0_rgba(15,62,23,0.25)] transition-colors hover:bg-[#0a2b10]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <HeroBackdrop />
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-[#e6f1e8] px-4 py-1.5 text-[13px] font-semibold text-[#0f3e17]">
              Built for OB-GYN clinics in India
            </span>
            <h1 className="mt-6 text-[36px] font-bold leading-[1.1] tracking-tight sm:text-[48px] lg:text-[56px]">
              Every pregnancy, tracked. Every follow-up,
              <span className="text-[#0f3e17]"> caught.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.6] text-[#333333] sm:text-[18px]">
              MatruSetu is the clinical worklist for OB-GYN practices —
              automatic ANC schedules from LMP, a risk score for patients who
              are drifting away, and a digitised OPD register your staff can
              actually search.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-[#0f3e17] px-7 py-3.5 text-center text-[16px] font-semibold text-white shadow-[0_12px_24px_0_rgba(15,62,23,0.25)] transition-colors hover:bg-[#0a2b10] sm:w-auto"
              >
                Create your clinic account
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-[#080331]/15 bg-white px-7 py-3.5 text-center text-[16px] font-semibold text-[#080331] transition-colors hover:bg-[#080331]/5 sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </Reveal>

          {/* Hero product shot */}
          <Reveal delay={150} className="mx-auto mt-16 max-w-4xl">
            <BrowserFrame>
              <Image
                src="/marketing/screenshot-today.jpg"
                alt="MatruSetu Today dashboard showing clinic stat tiles and a worklist of overdue patients"
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
          className="relative border-t border-[#080331]/10 bg-white py-20 sm:py-28"
        >
          <FeatureBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                Everything an OPD desk needs, nothing it doesn&apos;t
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[#333333]">
                MatruSetu replaces the register and the spreadsheet with one
                worklist doctors and staff both trust.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={(i % 3) * 80}>
                  <div className="h-full rounded-2xl border border-[#080331]/10 bg-[#f8f3eb] p-8 shadow-[rgba(75,68,57,0.05)_0px_4px_4px_0px,rgba(75,68,57,0.08)_0px_32px_16px_0px]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f3e17]/10 text-[#0f3e17]">
                      <Icon size={22} weight="bold" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#333333]">
                      {body}
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
          className="relative border-t border-[#080331]/10 py-20 sm:py-28"
        >
          <ShowcaseBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                A worklist built for how a clinic actually runs
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[#333333]">
                Four screens your doctors and staff will live in every day.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-20">
              {SHOWCASE.map((item, i) => (
                <Reveal key={item.title} delay={(i % 2) * 120} className="flex flex-col">
                  <BrowserFrame>
                    <Image
                      src={item.src}
                      alt={item.caption}
                      width={958}
                      height={958}
                      loading={i < 2 ? "eager" : "lazy"}
                      className="w-full"
                    />
                  </BrowserFrame>
                  <h3 className="mt-6 text-[18px] font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#333333]">
                    {item.caption}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <WaveDivider from="#f8f3eb" to="#0f3e17" />

        {/* Trust / how it works strip */}
        <section className="relative bg-[#0f3e17] py-20 text-white sm:py-24">
          <TrustBackdrop />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              <Reveal>
                <MagnifyingGlass
                  size={28}
                  weight="bold"
                  className="text-[#7cc47f]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  No manual scheduling
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  ANC due dates are generated automatically from LMP, following
                  standard antenatal care timelines.
                </p>
              </Reveal>
              <Reveal delay={80}>
                <ShieldWarning
                  size={28}
                  weight="bold"
                  className="text-[#7cc47f]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  Nobody falls through
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  Patients drifting off-track are flagged before a missed scan
                  becomes a missed pregnancy.
                </p>
              </Reveal>
              <Reveal delay={160}>
                <DeviceMobile
                  size={28}
                  weight="bold"
                  className="text-[#7cc47f]"
                  aria-hidden
                />
                <h3 className="mt-4 text-[18px] font-semibold">
                  Works on the desk you have
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/70">
                  Installs as a PWA on any staff phone or desktop — the app
                  shell keeps working even when the network doesn&apos;t.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <WaveDivider from="#0f3e17" to="#f8f3eb" />

        {/* Final CTA */}
        <section className="relative py-20 sm:py-28">
          <CtaBackdrop />
          <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
              Bring your OPD onto one worklist
            </h2>
            <p className="mt-4 text-[16px] leading-[1.6] text-[#333333]">
              Set up your clinic in minutes. Doctors and staff sign in with
              their own accounts from day one.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-[#0f3e17] px-7 py-3.5 text-center text-[16px] font-semibold text-white shadow-[0_12px_24px_0_rgba(15,62,23,0.25)] transition-colors hover:bg-[#0a2b10] sm:w-auto"
              >
                Create your clinic account
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-[#080331]/15 bg-white px-7 py-3.5 text-center text-[16px] font-semibold text-[#080331] transition-colors hover:bg-[#080331]/5 sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#080331]/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-[13px] text-[#333333] sm:px-6">
          MatruSetu — antenatal care and OPD digitisation for OB-GYN clinics.
        </div>
      </footer>
    </div>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#080331]/10 bg-white shadow-[rgba(75,68,57,0.1)_0px_12px_24px_0px,rgba(75,68,57,0.1)_0px_48px_48px_0px]">
      <div className="flex items-center gap-1.5 border-b border-[#080331]/10 bg-[#f8f3eb] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6d39]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f098d7]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#328a3b]" />
      </div>
      {children}
    </div>
  );
}
