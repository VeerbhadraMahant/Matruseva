import Link from "next/link";
import { ClipboardText, PhoneCall, UserPlus } from "@phosphor-icons/react/dist/ssr";

const ACTIONS = [
  { href: "/patients/new", label: "Register patient", caption: "Register", Icon: UserPlus },
  { href: "/calls", label: "Call queue", caption: "Calls", Icon: PhoneCall },
  { href: "/patients?f=term", label: "Record delivery", caption: "Delivery", Icon: ClipboardText },
] as const;

/** Shortcut tiles: icon plus a one-word caption; the full label is the accessible name and tooltip. */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ href, label, caption, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          title={label}
          className="pc-glass group flex aspect-square max-h-32 flex-col items-center justify-center gap-2 rounded-[24px] transition-[transform,box-shadow] duration-200 hover:shadow-[0_18px_40px_-18px_rgb(62_42_92/0.35)] motion-safe:hover:-translate-y-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pc-lilac text-pc-plum transition-colors duration-200 group-hover:bg-pc-plum group-hover:text-white">
            <Icon size={26} aria-hidden />
          </span>
          <span aria-hidden className="text-[13px] font-medium text-[var(--color-pc-ink)]">
            {caption}
          </span>
        </Link>
      ))}
    </nav>
  );
}
