"use client";

import { useTransition } from "react";
import { removeStaff } from "@/app/(app)/settings/actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { buttonDanger } from "@/components/ui";

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
      className={`${buttonDanger} shrink-0`}
    >
      {pending ? t("settings.staff.removing") : t("settings.staff.remove")}
    </button>
  );
}
