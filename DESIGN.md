# MatruSetu design system: "Plum & Cream, clinical calm"

Read this before changing any screen. Tokens live in `app/globals.css`; primitives in `components/ui.tsx`.

## Who and where
OB-GYN doctors, nurses and front-desk staff in Indian clinics, between patients, often on a phone or a counter tablet, under bright clinic light, in English, Hindi or Marathi. They need to see in two seconds who is overdue or high risk, and to act in one or two taps.

## Rules
1. **Colour:** only the existing tokens (`--color-pc-*`, and the legacy aliases `--color-primary`, `--color-due`, `--color-overdue`, `--color-on-track`, `--color-info`, `--color-surface-*`, `--color-border*`, `--color-charcoal`). No raw hex in components. Plum is the one accent; status colours are for status only.
2. **Status is never colour alone:** `Tag` (dot + text) or `StatusDot` with an sr-only label. Severity order everywhere: overdue/critical, due/warning, info, on track. No coloured bar down one side of a rounded card.
3. **Type:** IBM Plex Sans (Noto Devanagari for hi/mr). Scale 12 / 13 / 14 / 15 / 18 / 22-24 / 26 (stats). One h1 per page (`PageHeader` or `IdentityStrip`). Body 14px desktop, inputs 16px on phones. Numbers that are compared (GA, BP, Hb, weight, dates, counts) use `.num` (tabular). No eyebrow/kicker labels above headings.
4. **Shape:** `--radius-cards` 14px, `--radius-buttons` 10px, chips/tags full pill. Hairline borders (`--color-border`). Shadows: `--shadow-card` resting, `--shadow-overlay` for modals/sheets/popovers. No nested cards: inside a card use dividers or tinted rows (`--color-surface-1`).
5. **Hierarchy per screen:** one primary button (`buttonPrimary`). Desktop: top-right in `PageHeader` actions. Phone: `ActionBar` pinned above the bottom nav. Others are `buttonSecondary` / `buttonGhost`; destructive is `buttonDanger`, separated from the primary.
6. **Patient screens** start with `IdentityStrip`: name, status tag, subtitle (age, phone), facts (GA weeks+days, EDD, risk reasons, last visit). Same order on detail, report, consult, visit workspace.
7. **Lists:** rows use `rowLink` (min 56px tall, full-row link, tinted hover), a leading `StatusDot`, name first, the one fact that decides the action next (what is due, how late), action buttons at the end. Tables only where columns are compared (patient list on desktop); they collapse to rows below md.
8. **Touch and focus:** every control 44px tall on phones (`min-h-11`), 8px apart. Focus ring: the global 2px plum outline; never remove it. Icon-only buttons (`iconButton`) need `aria-label`.
9. **Motion:** `.press` scale 0.97 on buttons (built into button classes). Overlays: `.pc-pop` (modal, centred) or `.pc-sheet` (mobile bottom sheet). Durations `--dur-fast` 140ms / `--dur` 200ms, `--ease-out`. Nothing animates on keyboard toggles (command palette, Ctrl+B sidebar). Lists do not fade in on scroll. Reduced motion stops all of it.
10. **Responsive:** phone (<768) one column, bottom nav, ActionBar; tablet (768-1023) two columns where a screen has a list plus detail; desktop sidebar + max-w-6xl. No horizontal page scroll at 320px.
11. **States:** every list has a helpful `Empty` (what it means + the next action), loading uses `.pc-skeleton` shaped like the content, errors say the problem and the fix, in all three languages.
12. **Marketing and auth only:** `components/marketing/Backdrops.tsx` and `Reveal.tsx` (our React Bits-style pieces), the dot-grid texture, larger type. Never on the signed-in screens.

## Hard constraints
Presentation only: do not change server actions, Supabase queries, data shapes, route paths, form field names, or demo-mode logic. New UI text goes into all three locales (`lib/i18n`). Read `node_modules/next/dist/docs/` before using a Next API.
