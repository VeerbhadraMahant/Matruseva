import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getClinicSnapshot } from "@/lib/snapshot";
import { formatGA, trimester } from "@/lib/pregnancy";
import { daysBetween, formatDate, formatGravidaPara, parseLocalDate, relativeDays } from "@/lib/format";
import { PageHeader, buttonPrimary } from "@/components/ui";
import { PatientTable, type PatientFilter, type PatientListRow } from "@/components/PatientTable";

const FILTER_IDS: PatientFilter[] = ["all", "t1", "t2", "t3", "overdue", "at_risk", "lost", "alerts", "term"];

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [{ f }, { rows, today }] = await Promise.all([searchParams, getClinicSnapshot()]);
  const initialFilter = FILTER_IDS.includes(f as PatientFilter) ? (f as PatientFilter) : "all";

  const list: PatientListRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    clinicNo: r.clinicNo,
    age: r.age,
    gp: formatGravidaPara(r.gravida, r.para),
    gaDays: r.ga?.days ?? null,
    gaLabel: r.ga ? formatGA(r.ga) : "—",
    trimester: r.ga ? trimester(r.ga) : null,
    edd: r.edd,
    eddLabel: formatDate(r.edd),
    eddInDays: r.edd ? daysBetween(today, parseLocalDate(r.edd)) : null,
    nextVisit: r.nextVisitDate,
    nextVisitLabel: r.nextVisitDate ? relativeDays(r.nextVisitDate, today) : "—",
    risk: r.risk,
    overdueCount: r.overdue.length,
    flags: r.flags,
  }));

  return (
    <>
      <PageHeader
        title="Patients"
        meta={`${rows.length} active ${rows.length === 1 ? "pregnancy" : "pregnancies"}`}
        actions={
          <Link href="/patients/new" className={buttonPrimary}>
            <Plus size={15} weight="bold" aria-hidden /> New patient
          </Link>
        }
      />
      <div className="p-4 md:p-6">
        <PatientTable rows={list} initialFilter={initialFilter} />
      </div>
    </>
  );
}
