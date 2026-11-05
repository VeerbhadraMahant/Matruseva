import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getClinicSnapshot } from "@/lib/snapshot";
import { formatGALocalized, trimester } from "@/lib/pregnancy";
import { getT } from "@/lib/i18n/server";
import { daysBetween, formatDate, formatGravidaPara, parseLocalDate, relativeDays } from "@/lib/format";
import { PageHeader, buttonPrimary, pageBody } from "@/components/ui";
import { PatientTable, type PatientFilter, type PatientListRow } from "@/components/PatientTable";
import { ScanQRCardButton } from "@/components/QRScannerModal";

const FILTER_IDS: PatientFilter[] = ["all", "t1", "t2", "t3", "overdue", "at_risk", "lost", "alerts", "term"];

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const [{ f }, { rows, today }, { t, locale }] = await Promise.all([searchParams, getClinicSnapshot(), getT()]);
  const initialFilter = FILTER_IDS.includes(f as PatientFilter) ? (f as PatientFilter) : "all";

  const list: PatientListRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    clinicNo: r.clinicNo,
    age: r.age,
    gp: formatGravidaPara(r.gravida, r.para),
    gaDays: r.ga?.days ?? null,
    gaLabel: r.ga ? formatGALocalized(r.ga, t) : "—",
    trimester: r.ga ? trimester(r.ga) : null,
    edd: r.edd,
    eddLabel: formatDate(r.edd, locale),
    eddInDays: r.edd ? daysBetween(today, parseLocalDate(r.edd)) : null,
    nextVisit: r.nextVisitDate,
    nextVisitLabel: r.nextVisitDate ? relativeDays(r.nextVisitDate, today, locale) : "—",
    risk: r.risk,
    overdueCount: r.overdue.length,
    flags: r.flags,
    createdAt: r.createdAt,
  }));

  return (
    <>
      <PageHeader
        title={t("patients.title")}
        meta={t("patients.meta", { count: rows.length })}
        actions={
          <div className="flex items-center gap-2">
            <ScanQRCardButton />
            <Link href="/patients/new" className={buttonPrimary}>
              <Plus size={15} weight="bold" aria-hidden /> {t("patients.newPatient")}
            </Link>
          </div>
        }
      />
      <div className={pageBody}>
        <PatientTable rows={list} initialFilter={initialFilter} />
      </div>
    </>
  );
}
