import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { daysBetween, parseLocalDate } from "@/lib/format";
import type { PostnatalDueRow } from "@/lib/postnatalData";
import { Badge } from "@/components/today/StatusBadge";

/** Today card: recent deliveries needing a postnatal visit, birth dose or urgent review. Hidden when empty. */
export async function PostnatalDueCard({ rows, todayIso }: { rows: PostnatalDueRow[]; todayIso: string }) {
  if (rows.length === 0) return null;
  const { t } = await getT();
  const flagLabel = (f: string) => t(`postnatalSummary.flag.${f}` as MessageKey);

  return (
    // order-6: sits after Upcoming deliveries (order-5) in the Today column; no wrapper div so a hidden card leaves no gap.
    <section aria-labelledby="postnatal-title" className="pc-glass order-6 overflow-hidden rounded-[22px]">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 id="postnatal-title" className="text-[15px] font-semibold">
          {t("postnatalSummary.card.title")}
        </h2>
        <span className="rounded-full bg-pc-lilac px-2 text-[12px] font-semibold leading-5 text-pc-plum tabular-nums">
          {rows.length}
        </span>
      </div>
      <ul>
        {rows.map((r) => {
          const v = r.nextVisit;
          const inDays = v ? daysBetween(parseLocalDate(todayIso), parseLocalDate(v.due_from)) : 0;
          return (
            <li key={r.patientId} className="border-t border-pc-line/70 first:border-0">
              <Link
                href={`/patients/${r.patientId}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-pc-lilac/35"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    {r.name}
                    {r.clinicPatientNo && <span className="font-normal text-pc-muted"> · {r.clinicPatientNo}</span>}
                  </span>
                  <span className="block text-[12px] text-pc-muted tabular-nums">
                    {t("postnatalSummary.dayAfter", { day: r.dayOfLife })}
                    {" · "}
                    {v
                      ? t("postnatalSummary.card.next", { visit: t("postnatalSummary.visit", { day: Number(v.code.replace(/\D/g, "")) }) })
                      : t("postnatalSummary.card.allDone")}
                  </span>
                  {r.pendingVaccines > 0 && (
                    <span className="block text-[12px] text-pc-muted">
                      {t("postnatalSummary.card.dosesPending", { count: r.pendingVaccines })}
                      {r.overdueVaccines > 0 && ` (${t("postnatalSummary.card.dosesOverdue", { count: r.overdueVaccines })})`}
                    </span>
                  )}
                  {r.urgent && (
                    <span className="block text-[12px] font-semibold text-pc-overdue">
                      {t("postnatalSummary.card.urgent", { flags: r.flags.map(flagLabel).join(", ") })}
                    </span>
                  )}
                </span>
                {v && (
                  <Badge tone={v.status === "overdue" ? "overdue" : v.status === "due" ? "plum" : "delivered"}>
                    {v.status === "overdue"
                      ? t("postnatalSummary.card.statusOverdue")
                      : v.status === "due"
                        ? t("postnatalSummary.card.statusDue")
                        : t("postnatalSummary.card.statusIn", { count: inDays })}
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
