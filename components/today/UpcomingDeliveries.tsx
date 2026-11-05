import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getT } from "@/lib/i18n/server";
import { Badge } from "./StatusBadge";

export interface DeliveryItem {
  id: string;
  name: string;
  inDays: number;
  eddLabel: string;
  relative: string;
}

export async function UpcomingDeliveries({ items, total }: { items: DeliveryItem[]; total: number }) {
  const { t } = await getT();
  return (
    <section aria-labelledby="deliveries-title" className="pc-glass overflow-hidden rounded-[22px]">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h2 id="deliveries-title" className="text-[15px] font-semibold">
          {t("today.deliveries.title")} <span className="font-normal text-pc-muted">· {t("today.deliveries.window")}</span>
        </h2>
        <span className="rounded-full bg-pc-lilac px-2 text-[12px] font-semibold leading-5 text-pc-plum tabular-nums">
          {total}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-5 pt-1 text-[13px] text-pc-muted">{t("today.deliveries.empty")}</p>
      ) : (
        <ul>
          {items.map((d) => (
            <li key={d.id} className="border-t border-pc-line/70 first:border-0">
              <Link
                href={`/patients/${d.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-pc-lilac/35"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{d.name}</span>
                  <span className="block text-[12px] text-pc-muted tabular-nums">{t("today.deliveries.edd", { date: d.eddLabel })}</span>
                </span>
                <Badge tone={d.inDays < 0 ? "overdue" : "delivered"}>{d.inDays < 0 ? t("today.deliveries.postDates", { when: d.relative }) : d.relative}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > items.length && (
        <Link
          href="/patients?f=term"
          className="flex min-h-11 items-center justify-center gap-1 border-t border-pc-line/70 text-[13px] font-semibold text-pc-plum hover:bg-pc-lilac/35"
        >
          {t("today.deliveries.viewAll", { count: total })} <ArrowRight size={13} aria-hidden />
        </Link>
      )}
    </section>
  );
}
