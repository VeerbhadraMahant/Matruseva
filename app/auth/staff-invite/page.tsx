import type { Metadata } from "next";
import Link from "next/link";
import { buttonPrimary, buttonSecondary, card } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { acceptStaffInvite } from "./actions";

export const metadata: Metadata = { referrer: "no-referrer" };

export default async function StaffInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string | string[] }>;
}) {
  const [{ token_hash: tokenHash }, { t }] = await Promise.all([searchParams, getT()]);
  const canAccept = typeof tokenHash === "string" && tokenHash.length > 0;

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className={`${card} w-full max-w-md space-y-4 p-6 sm:p-8`}>
        <h1 className="text-xl font-semibold">{t("settings.invite.acceptTitle")}</h1>
        {canAccept ? (
          <>
            <p className="text-sm text-[var(--color-charcoal)]">{t("settings.invite.acceptHelp")}</p>
            <form action={acceptStaffInvite}>
              <input type="hidden" name="tokenHash" value={tokenHash} />
              <button className={buttonPrimary} type="submit">{t("settings.invite.accept")}</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--color-charcoal)]">{t("settings.invite.expired")}</p>
            <Link className={buttonSecondary} href="/login">{t("settings.invite.signIn")}</Link>
          </>
        )}
      </div>
    </main>
  );
}
