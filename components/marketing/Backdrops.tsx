// Decorative, non-photographic backgrounds for the landing page and the auth
// brand panel: one soft blob plus a dot-grid texture in the plum/cream tokens.
// All aria-hidden and pointer-events-none; they carry no content.

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-[var(--color-pc-lilac-strong)]/50 blur-3xl" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--color-pc-plum) 16%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black 40%, transparent)",
        }}
      />
    </div>
  );
}

/** For dark plum surfaces (landing trust strip, auth brand panel). */
export function TrustBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-pc-card) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -bottom-24 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[var(--color-pc-plum-mid)]/20 blur-3xl" />
    </div>
  );
}

export function CtaBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-[var(--color-pc-lilac-strong)]/40 blur-3xl" />
    </div>
  );
}
