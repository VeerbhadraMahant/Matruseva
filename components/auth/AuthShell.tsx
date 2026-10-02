import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

const POINTS = [
  "ANC schedule built automatically from the LMP",
  "Overdue and at-risk patients surfaced every morning",
  "Searchable case papers and OPD register",
];

/** Split-screen frame for sign-in, sign-up and onboarding. Decorative shapes only, no imagery. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh">
      <aside className="relative isolate hidden w-[42%] max-w-[520px] flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--color-pc-plum)_0%,var(--color-pc-plum-hover)_100%)] px-12 py-12 text-white md:flex">
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="absolute -bottom-24 -right-24 -z-10 h-[420px] w-[420px] text-white opacity-[0.08]"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="100" cy="100" r="96" strokeWidth="1" />
          <circle cx="100" cy="100" r="72" strokeWidth="1" />
          <circle cx="100" cy="100" r="48" strokeWidth="1" />
        </svg>
        <div
          aria-hidden
          className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-[var(--color-pc-plum-mid)] opacity-30 blur-3xl"
        />

        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-[17px] font-semibold">M</span>
          <span className="text-[18px] font-semibold tracking-tight">MatruSetu</span>
        </Link>

        <div>
          <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">
            Every pregnancy tracked.
            <br />
            Every follow-up caught.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[14px] text-[#e6ddef]">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-pc-lilac-strong)]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-[#e6ddef]/80">Antenatal care and OPD digitisation for OB-GYN clinics.</p>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2.5 md:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white">
            M
          </span>
          <span className="text-[17px] font-semibold tracking-tight">MatruSetu</span>
        </Link>
        <div className="w-full max-w-md rounded-[var(--radius-sections)] border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-[0_1px_2px_rgb(34_27_43/0.04),0_24px_48px_-24px_rgb(62_42_92/0.25)]">
          {children}
        </div>
      </div>
    </main>
  );
}
