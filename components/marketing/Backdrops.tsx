// Decorative, non-photographic section backgrounds — layered gradient blobs
// and dot-grid texture in the app's own forest-green/cream palette. All
// aria-hidden and pointer-events-none; they carry no content.

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#0f3e17]/15 blur-3xl" />
      <div className="absolute -right-32 top-10 h-[380px] w-[380px] rounded-full bg-[#7cc47f]/25 blur-3xl" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(15,62,23,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

export function FeatureBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-28 -top-32 h-[360px] w-[360px] rounded-full bg-[#e6f1e8] blur-3xl" />
    </div>
  );
}

export function ShowcaseBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-[#0f3e17]/10 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-[380px] w-[380px] rounded-full bg-[#7cc47f]/20 blur-3xl" />
    </div>
  );
}

export function TrustBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute bottom-[-96px] left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#7cc47f]/20 blur-3xl" />
    </div>
  );
}

export function CtaBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-[#0f3e17]/10 blur-3xl" />
    </div>
  );
}

// `from` is the color of the section above (painted as this element's own
// background, so it reads correctly regardless of what's behind it in the
// DOM) and `to` is the section below, which the wave shape fades into.
export function WaveDivider({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden className="-mb-px" style={{ backgroundColor: from }}>
      <svg viewBox="0 0 1440 80" className="block h-10 w-full sm:h-16" preserveAspectRatio="none">
        <path
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,72 1440,24 L1440,80 L0,80 Z"
          fill={to}
        />
      </svg>
    </div>
  );
}
