import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDemoActive } from "@/lib/auth";
import { getDemoPatientDetail } from "@/lib/demo-data";
import { getPatientPostnatal } from "@/lib/postnatalData";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatDate } from "@/lib/format";
import { POSTNATAL_VISITS } from "@/lib/postnatal";
import { PostnatalSummaryPrintButton } from "@/components/postnatal/PostnatalSummaryPrintButton";

const CARD = "rpt-card rounded-xl border border-[var(--color-border)] bg-white p-3.5";
const H2 = "mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-primary)]";

export default async function PostnatalSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isDemo = isDemoActive(await cookies());
  const { t, locale } = await getT();
  const [me, pn] = await Promise.all([getCurrentUser(), getPatientPostnatal(id)]);
  if (!pn) notFound();

  let patient: { name: string; age: number | null; clinic_patient_no: string | null } | null;
  if (isDemo) {
    patient = (getDemoPatientDetail(id)?.patient as unknown as typeof patient) ?? null;
  } else {
    const supabase = await createClient();
    patient = (await supabase.from("patients").select("name, age, clinic_patient_no").eq("id", id).maybeSingle()).data;
  }
  if (!patient) notFound();

  const d = (iso: string | null | undefined) => formatDate(iso, locale);
  const flag = (f: string) => t(`postnatalSummary.flag.${f}` as MessageKey);
  const visitName = (code: string) => t("postnatalSummary.visit", { day: POSTNATAL_VISITS.find((v) => v.code === code)!.day });
  const babyLabel = (i: number) => {
    const b = pn.newborns[i];
    return b.name ? t("postnatalSummary.babyNamed", { n: i + 1, name: b.name }) : t("postnatalSummary.baby", { n: i + 1 });
  };
  const vaccineText = (v: (typeof pn.vaccines)[number]) =>
    v.given_on
      ? t("postnatalSummary.vaccine.given", { date: d(v.given_on) })
      : v.given_elsewhere
        ? t("postnatalSummary.vaccine.elsewhere")
        : t(v.status === "overdue" ? "postnatalSummary.vaccine.overdue" : "postnatalSummary.vaccine.pending");

  const doneVisits = pn.visits.filter((v) => v.completed_at);
  const pendingVaccines = pn.vaccines.filter((v) => v.status !== "given");
  const pendingVisits = pn.visits.filter((v) => v.status !== "done");
  const clinic = me.clinicName;

  return (
    <div className="min-h-screen bg-[var(--color-surface-1)]/60 px-3 py-6 text-[var(--color-foreground)] sm:px-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 shadow-xs print:hidden">
        <Link href={`/patients/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-charcoal)] hover:text-[var(--color-primary)]">
          <ArrowLeft size={16} weight="bold" />
          <span>{t("postnatalSummary.back")}</span>
        </Link>
        <PostnatalSummaryPrintButton />
      </div>

      <div className="rpt-doc mx-auto max-w-4xl space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-md sm:p-8 print:max-w-none print:space-y-2 print:rounded-none print:border-none print:p-0 print:shadow-none">
        <header className="rpt-card border-b-2 border-[var(--color-primary)] pb-3">
          <span className="font-serif text-[20px] font-bold tracking-tight text-[var(--color-primary)]">MATRUSETU</span>
          <h1 className="mt-0.5 text-[16px] font-semibold text-slate-800">{t("postnatalSummary.title")}</h1>
          <p className="mt-0.5 text-[11px] text-[var(--color-charcoal)]">
            {t("postnatalSummary.subtitle", { clinic })} · {t("postnatalSummary.doctor", { name: me.fullName })}
          </p>
        </header>

        <section className={CARD}>
          <h2 className={H2}>{t("postnatalSummary.mother")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4 print:grid-cols-4">
            <div>
              <dt className="text-[10px] text-slate-500">{t("postnatalSummary.mother")}</dt>
              <dd className="font-semibold">
                {patient.name}
                {patient.age != null && <span className="font-normal"> · {t("postnatalSummary.age", { age: patient.age })}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-500">{t("postnatalSummary.clinicNo")}</dt>
              <dd className="font-semibold">{patient.clinic_patient_no ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-500">{t("postnatalSummary.deliveryDate")}</dt>
              <dd className="font-semibold">{d(pn.deliveryDate)}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-slate-500">{t("postnatalSummary.deliveryMode")}</dt>
              <dd className="font-semibold">{pn.deliveryMode ? t(`postnatalSummary.mode.${pn.deliveryMode}` as MessageKey) : "-"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px]">
            <span className="font-semibold">{t("postnatalSummary.motherFlags")}: </span>
            {pn.motherFlags.length ? pn.motherFlags.map(flag).join(", ") : t("postnatalSummary.none")}
            <span className="text-slate-500"> · {t("postnatalSummary.dayAfter", { day: pn.newborns[0].dayOfLife })}</span>
          </p>
        </section>

        {pn.newborns.map((b, i) => {
          const vaccines = pn.vaccines.filter((v) => v.newborn_id === b.id);
          // Latest completed visit that recorded this baby's findings.
          const latest = [...doneVisits].reverse().find((v) => v.baby_findings[b.id])?.baby_findings[b.id];
          return (
            <section key={b.id} className={CARD}>
              <h2 className={H2}>{babyLabel(i)}</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4 print:grid-cols-4">
                <Field label={t("postnatalSummary.sex")} value={b.sex ? t(`postnatalSummary.sex.${b.sex}` as MessageKey) : "-"} />
                <Field label={t("postnatalSummary.birthWeight")} value={t("postnatalSummary.visit.weight", { value: b.birth_weight_kg })} />
                <Field label={t("postnatalSummary.gaAtBirth")} value={b.gestational_age_weeks != null ? t("postnatalSummary.weeks", { count: b.gestational_age_weeks }) : "-"} />
                <Field label={t("postnatalSummary.nicu")} value={t(b.nicu_admission ? "postnatalSummary.yes" : "postnatalSummary.no")} />
                <Field label={t("postnatalSummary.latestWeight")} value={latest?.weight_kg != null ? t("postnatalSummary.visit.weight", { value: latest.weight_kg }) : t("postnatalSummary.notRecorded")} />
                <Field label={t("postnatalSummary.feeding")} value={latest?.feeding ? t(`postnatalSummary.feeding.${latest.feeding}` as MessageKey) : t("postnatalSummary.notRecorded")} />
                <Field label={t("postnatalSummary.riskFlags")} value={b.flags.length ? b.flags.map(flag).join(", ") : t("postnatalSummary.none")} wide />
              </dl>
              <p className="mt-2 text-[12px]">
                <span className="font-semibold">{t("postnatalSummary.birthDoses")}: </span>
                {vaccines.map((v) => `${t(`postnatalSummary.vaccine.${v.vaccine}` as MessageKey)} - ${vaccineText(v)}`).join("; ")}
              </p>
            </section>
          );
        })}

        <section className={CARD}>
          <h2 className={H2}>{t("postnatalSummary.visits")}</h2>
          <ul className="space-y-1 text-[12px]">
            {pn.visits.map((v) => {
              const mf = v.mother_findings;
              const parts: string[] = [];
              if (mf?.bp_systolic != null && mf.bp_diastolic != null) parts.push(t("postnatalSummary.visit.bp", { sys: mf.bp_systolic, dia: mf.bp_diastolic }));
              if (mf?.temperature_c != null) parts.push(t("postnatalSummary.visit.temp", { value: mf.temperature_c }));
              const babyParts = pn.newborns.flatMap((b, i) => {
                const bf = v.baby_findings[b.id];
                if (!bf) return [];
                const bits = [
                  bf.weight_kg != null ? t("postnatalSummary.visit.weight", { value: bf.weight_kg }) : null,
                  bf.feeding ? t(`postnatalSummary.feeding.${bf.feeding}` as MessageKey) : null,
                  bf.danger_signs?.length
                    ? t("postnatalSummary.visit.dangerSigns", { signs: bf.danger_signs.map((s) => t(`postnatalSummary.danger.${s}` as MessageKey)).join(", ") })
                    : null,
                ].filter(Boolean);
                return bits.length ? [`${pn.newborns.length > 1 ? `${babyLabel(i)}: ` : ""}${bits.join(", ")}`] : [];
              });
              return (
                <li key={v.id} className="rpt-card">
                  <span className="font-semibold">{visitName(v.code)}</span>
                  {" - "}
                  {v.completed_at ? t("postnatalSummary.visit.done", { date: d(v.completed_at) }) : t("postnatalSummary.visit.notDone")}
                  {parts.length > 0 && <span> · {t("postnatalSummary.visit.mother")}: {parts.join(", ")}</span>}
                  {babyParts.length > 0 && <span> · {t("postnatalSummary.visit.baby")}: {babyParts.join("; ")}</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${CARD} border-red-200`}>
          <h2 className={H2}>{t("postnatalSummary.pending")}</h2>
          {pendingVaccines.length + pendingVisits.length === 0 ? (
            <p className="text-[12px]">{t("postnatalSummary.pending.none")}</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-4 text-[12px]">
              {pendingVaccines.map((v) => (
                <li key={v.id}>
                  {t("postnatalSummary.pending.vaccine", {
                    vaccine: t(`postnatalSummary.vaccine.${v.vaccine}` as MessageKey),
                    baby: babyLabel(pn.newborns.findIndex((b) => b.id === v.newborn_id)),
                  })}
                </li>
              ))}
              {pendingVisits.map((v) => (
                <li key={v.id}>
                  {t("postnatalSummary.pending.visit", {
                    visit: visitName(v.code),
                    window: t("postnatalSummary.visit.window", { from: d(v.due_from), to: d(v.due_to) }),
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="border-t border-slate-300 pt-1 text-[10px] text-slate-600">
          {t("postnatalSummary.footer", { clinic, name: patient.name })}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 print:col-span-2" : undefined}>
      <dt className="text-[10px] text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
