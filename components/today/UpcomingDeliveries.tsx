import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getT } from "@/lib/i18n/server";
import { Empty, Panel, Tag, rowLink } from "@/components/ui";

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
    <Panel title={`${t("today.deliveries.title")} · ${t("today.deliveries.window")}`} count={total}>
      {items.length === 0 ? (
        <Empty>{t("today.deliveries.empty")}</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]/70">
          {items.map((d) => (
            <li key={d.id}>
              <Link href={`/patients/${d.id}`} className={rowLink}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{d.name}</span>
                  <span className="num block text-[12px] text-[var(--color-charcoal)]">
                    {t("today.deliveries.edd", { date: d.eddLabel })}
                  </span>
                </span>
                <span className="num shrink-0">
                  <Tag tone={d.inDays < 0 ? "critical" : "info"}>
                    {d.inDays < 0 ? t("today.deliveries.postDates", { when: d.relative }) : d.relative}
                  </Tag>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > 0 && (
        <Link
          href="/patients?f=term"
          className="flex min-h-11 items-center justify-center gap-1 border-t border-[var(--color-border)]/70 text-[13px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-1)]"
        >
          {t("today.deliveries.viewAll", { count: total })} <ArrowRight size={13} aria-hidden />
        </Link>
      )}
    </Panel>
  );
}
