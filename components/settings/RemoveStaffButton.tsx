"use client";

import { useTransition } from "react";
import { removeStaff } from "@/app/(app)/settings/actions";
import { useRouter } from "next/navigation";

export function RemoveStaffButton({ profileId }: { profileId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      className="text-sm text-[var(--color-overdue)] hover:underline disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
