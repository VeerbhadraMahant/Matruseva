import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { ClipboardText, PhoneCall, UserPlus } from "@phosphor-icons/react/dist/ssr";

const ACTIONS = [
  { href: "/patients/new", label: "today.quick.register", caption: "today.quick.registerCaption", Icon: UserPlus },
  { href: "/calls", label: "today.quick.calls", caption: "today.quick.callsCaption", Icon: PhoneCall },
  { href: "/patients?f=term", label: "today.quick.delivery", caption: "today.quick.deliveryCaption", Icon: ClipboardText },
] as const satisfies readonly { href: string; label: MessageKey; caption: MessageKey; Icon: unknown }[];

/** Shortcut tiles: icon plus a one-word caption; the full label is the accessible name and tooltip. */
export async function QuickActions() {
  const { t } = await getT();
  return (
    <nav aria-label={t("today.quick.label")} className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ href, label, caption, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={t(label)}
          title={t(label)}
          className="pc-glass group flex aspect-square max-h-32 flex-col items-center justify-center gap-2 rounded-[24px] transition-[transform,box-shadow] duration-200 hover:shadow-[0_18px_40px_-18px_rgb(62_42_92/0.35)] motion-safe:hover:-translate-y-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pc-lilac text-pc-plum transition-colors duration-200 group-hover:bg-pc-plum group-hover:text-white">
            <Icon size={26} aria-hidden />
          </span>
          <span aria-hidden className="text-[13px] font-medium text-[var(--color-pc-ink)]">
            {t(caption)}
          </span>
        </Link>
      ))}
    </nav>
  );
}
