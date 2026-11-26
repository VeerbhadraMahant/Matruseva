import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { PhoneCall, UserPlus } from "@phosphor-icons/react/dist/ssr";

/** Primary + secondary page actions. Rendered in the desktop header and the phone ActionBar. */
export async function QuickActions() {
  const { t } = await getT();
  return (
    <>
      <Link href="/calls" className={buttonSecondary}>
        <PhoneCall size={18} aria-hidden /> {t("today.quick.calls")}
      </Link>
      <Link href="/patients/new" className={buttonPrimary}>
        <UserPlus size={18} aria-hidden /> {t("today.quick.register")}
      </Link>
    </>
  );
}
