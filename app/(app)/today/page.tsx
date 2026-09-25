import Link from "next/link";
import { Phone, Plus } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth";
import { getClinicSnapshot, daysOverdue, needsFollowUp, followUpPriority, type PatientRow } from "@/lib/snapshot";
import { formatGA, trimester } from "@/lib/pregnancy";
import { daysBetween, formatShortDate, parseLocalDate, relativeDays } from "@/lib/format";
import { telLink } from "@/lib/whatsapp";
import { PageHeader, Panel, Stat, Tag, Empty, SEVERITY_TONE, buttonPrimary, buttonSecondary, th, td } from "@/components/ui";

function PatientCell({ row }: { row: PatientRow }) {
  return (
    <div className="min-w-0">
      <Link href={`/patients/${row.id}`} className="font-medium text-[var(--color-foreground)] hover:underline">
        {row.name}
      </Link>
      <p className="num text-[12px] text-[var(--color-charcoal)]">
        {row.ga ? `${formatGA(row.ga)} · T${trimester(row.ga)}` : "No LMP"}
        {row.age ? ` · ${row.age}y` : ""}
      </p>
    </div>
  );
}

function ReasonTags({ row }: { row: PatientRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.risk === "lost" && <Tag tone="critical">Lost to follow-up</Tag>}
      {row.flags
        .filter((f) => f.severity !== "info")
        .map((f) => (
          <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
            {f.label}
          </Tag>
        ))}
      {row.overdue.length > 0 && (
        <Tag tone="warning">
          {row.overdue[0].name.split("(")[0].trim()}
          {row.overdue.length > 1 ? ` +${row.overdue.length - 1}` : ""}
        </Tag>
      )}
      {row.risk === "at_risk" && row.overdue.length === 0 && (
        <Tag tone="warning">{row.noAnswerStreak >= 2 ? "Unreachable" : "Missed visit"}</Tag>
      )}
    </div>
  );
}

export default async function TodayPage() {
  const [me, { rows, today, todayIso }] = await Promise.all([getCurrentUser(), getClinicSnapshot()]);

  const attention = rows.filter(needsFollowUp).sort((a, b) => followUpPriority(a, today) - followUpPriority(b, today));
  const overduePatients = rows.filter((r) => r.overdue.length > 0);
  const atRisk = rows.filter((r) => r.risk === "at_risk");
  const lost = rows.filter((r) => r.risk === "lost");

  const dueThisWeek = rows
    .flatMap((r) => r.due.map((e) => ({ row: r, event: e, closesIn: daysBetween(today, parseLocalDate(e.dueTo)) })))
    .filter((x) => x.closesIn <= 7)
    .sort((a, b) => a.closesIn - b.closesIn);

  const expectedToday = rows.filter((r) => r.nextVisitDate === todayIso);

  const deliveries = rows
    .filter((r) => r.edd)
    .map((r) => ({ row: r, inDays: daysBetween(today, parseLocalDate(r.edd!)) }))
    .filter((x) => x.inDays <= 30)
    .sort((a, b) => a.inDays - b.inDays);

  const alerts = rows
    .filter((r) => r.flags.some((f) => f.severity !== "info"))
    .sort((a, b) => followUpPriority(a, today) - followUpPriority(b, today));

  const dateLabel = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Today"
        meta={
          <>
            {dateLabel} · {me.fullName}
          </>
        }
        actions={
          <>
            <Link href="/calls" className={buttonSecondary}>
              <Phone size={15} aria-hidden /> Start calls
            </Link>
            <Link href="/patients/new" className={buttonPrimary}>
              <Plus size={15} weight="bold" aria-hidden /> New patient
            </Link>
          </>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 border-l border-t border-[var(--color-border)] sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Active pregnancies" value={rows.length} href="/patients" />
          <Stat label="Needs follow-up" value={attention.length} href="/calls" tone="warning" sub="Call queue" />
          <Stat label="Overdue items" value={overduePatients.length} href="/calls?f=overdue" tone="warning" sub="patients" />
          <Stat label="At risk" value={atRisk.length} href="/calls?f=at_risk" tone="warning" />
          <Stat label="Lost" value={lost.length} href="/calls?f=lost" tone="critical" />
          <Stat label="EDD ≤ 30 days" value={deliveries.length} href="/patients?f=term" tone="ok" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel
              title="Needs attention"
              count={attention.length}
              action={
                <Link href="/calls" className="text-[13px] font-medium text-[var(--color-primary)] hover:underline">
                  Open call queue →
                </Link>
              }
            >
              {attention.length === 0 ? (
                <Empty>Every active patient is on track.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr>
                        <th className={th}>Patient</th>
                        <th className={th}>Reason</th>
                        <th className={`${th} text-right`}>Overdue</th>
                        <th className={`${th} w-12`}>
                          <span className="sr-only">Call</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.slice(0, 12).map((row) => {
                        const od = daysOverdue(row, today);
                        return (
                          <tr key={row.id} className="hover:bg-[var(--color-surface-1)]">
                            <td className={td}>
                              <PatientCell row={row} />
                            </td>
                            <td className={td}>
                              <ReasonTags row={row} />
                            </td>
                            <td className={`${td} num text-right ${od > 14 ? "text-[var(--color-overdue)]" : ""}`}>
                              {od > 0 ? `${od}d` : "—"}
                            </td>
                            <td className={td}>
                              {row.phone && (
                                <a
                                  href={telLink(row.phone) ?? undefined}
                                  className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] hover:border-[var(--color-foreground)]"
                                  aria-label={`Call ${row.name}`}
                                  title={row.phone}
                                >
                                  <Phone size={15} aria-hidden />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {attention.length > 12 && (
                    <Link href="/calls" className="block px-3 py-2 text-[13px] text-[var(--color-primary)] hover:underline">
                      {attention.length - 12} more in the call queue →
                    </Link>
                  )}
                </div>
              )}
            </Panel>

            <Panel title="Due this week" count={dueThisWeek.length}>
              {dueThisWeek.length === 0 ? (
                <Empty>No scheduled items close in the next 7 days.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr>
                        <th className={th}>Patient</th>
                        <th className={th}>Item</th>
                        <th className={th}>Kind</th>
                        <th className={`${th} text-right`}>Window closes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueThisWeek.map(({ row, event, closesIn }) => (
                        <tr key={event.id} className="hover:bg-[var(--color-surface-1)]">
                          <td className={td}>
                            <PatientCell row={row} />
                          </td>
                          <td className={td}>{event.name}</td>
                          <td className={`${td} capitalize text-[var(--color-charcoal)]`}>{event.kind}</td>
                          <td className={`${td} num text-right ${closesIn <= 2 ? "font-semibold text-[var(--color-due)]" : ""}`}>
                            {closesIn === 0 ? "today" : `${closesIn}d`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Expected today" count={expectedToday.length}>
              {expectedToday.length === 0 ? (
                <Empty>No follow-up visits booked for today.</Empty>
              ) : (
                <ul>
                  {expectedToday.map((row) => (
                    <li key={row.id} className="border-b border-[var(--color-border)] px-3 py-2 last:border-0">
                      <PatientCell row={row} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Clinical alerts" count={alerts.length}>
              {alerts.length === 0 ? (
                <Empty>No abnormal vitals or post-dates pregnancies.</Empty>
              ) : (
                <ul>
                  {alerts.slice(0, 10).map((row) => (
                    <li key={row.id} className="space-y-1 border-b border-[var(--color-border)] px-3 py-2 last:border-0">
                      <PatientCell row={row} />
                      <div className="flex flex-wrap gap-1">
                        {row.flags
                          .filter((f) => f.severity !== "info")
                          .map((f) => (
                            <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                              {f.label}
                            </Tag>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Deliveries · next 30 days" count={deliveries.length}>
              {deliveries.length === 0 ? (
                <Empty>No EDDs in the next 30 days.</Empty>
              ) : (
                <table className="w-full text-[14px]">
                  <tbody>
                    {deliveries.map(({ row, inDays }) => (
                      <tr key={row.id} className="hover:bg-[var(--color-surface-1)]">
                        <td className={td}>
                          <PatientCell row={row} />
                        </td>
                        <td className={`${td} num text-right`}>
                          <p>{formatShortDate(row.edd)}</p>
                          <p className={`text-[12px] ${inDays < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-charcoal)]"}`}>
                            {relativeDays(row.edd!, today)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
