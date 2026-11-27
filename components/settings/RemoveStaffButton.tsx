"use client";

import { useTransition } from "react";
import { removeStaff } from "@/app/(app)/settings/actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";

export function RemoveStaffButton({ profileId }: { profileId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useT();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeStaff(profileId);
          router.refresh();
        })
      }
      className="flex min-h-11 items-center rounded-[var(--radius-buttons)] px-3 text-[13px] font-medium text-[var(--color-overdue)] transition-colors hover:bg-[var(--color-overdue-surface)] disabled:opacity-50"
    >
      {pending ? t("settings.staff.removing") : t("settings.staff.remove")}
    </button>
  );
}
