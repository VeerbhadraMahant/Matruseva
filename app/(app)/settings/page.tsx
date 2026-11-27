import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClinicDetailsForm } from "@/components/settings/ClinicDetailsForm";
import { DoctorProfessionalDetailsForm } from "@/components/settings/DoctorProfessionalDetailsForm";
import { RiskThresholdsForm } from "@/components/settings/RiskThresholdsForm";
import { ScheduleItemRow } from "@/components/settings/ScheduleItemRow";
import { StaffInviteForm } from "@/components/settings/StaffInviteForm";
import { RemoveStaffButton } from "@/components/settings/RemoveStaffButton";
import { MessageTemplatesForm } from "@/components/settings/MessageTemplatesForm";
import { ClinicalProtocolSignOff } from "@/components/settings/ClinicalProtocolSignOff";
import Link from "next/link";
import { GearSix, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, Panel, Tag, buttonSecondary, card, pageBody } from "@/components/ui";
import type { MessageTemplates } from "@/lib/whatsapp";
import { getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/intl";
import { DEMO_SCHEDULE_ITEMS, getDemoDoctorProfile } from "@/lib/demo-data";
import { CLINICAL_RISK_THRESHOLDS } from "@/lib/clinicalProtocols";
import { careEventName } from "@/lib/clinicalLabels";

export default async function SettingsPage() {
  const [me, { t, locale }] = await Promise.all([getCurrentUser(), getT()]);
  if (me.role !== "doctor") redirect("/today");

  const supabase = me.isDemo ? null : await createClient();
  const [{ data: clinic }, { data: staff }, { data: template }, { data: professionalDetails }] = supabase
    ? await Promise.all([
        supabase.from("clinics").select("*").eq("id", me.clinicId).single(),
        supabase.from("profiles").select("id, full_name, role").eq("clinic_id", me.clinicId).order("full_name"),
        supabase
          .from("schedule_templates")
          .select("id, schedule_template_items(id, name, window_start_week, window_end_week, is_critical, sort_order)")
          .eq("clinic_id", me.clinicId)
          .eq("is_default", true)
          .maybeSingle(),
        supabase.from("profiles").select("degree, years_of_experience").eq("id", me.userId).maybeSingle(),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }];
  const { degree, yearsOfExperience } = me.isDemo ? getDemoDoctorProfile() : {
    degree: professionalDetails?.degree ?? null,
    yearsOfExperience: professionalDetails?.years_of_experience ?? null,
  };
  const items = me.isDemo ? DEMO_SCHEDULE_ITEMS : [...(template?.schedule_template_items ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id, name: item.name, windowStartWeek: item.window_start_week,
      windowEndWeek: item.window_end_week, isCritical: item.is_critical,
    }));
  const clinicName = clinic?.name ?? me.clinicName;
  const joined = me.profileCreatedAt ? new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(me.profileCreatedAt)) : null;

  const settingsContent = !clinic && !me.isDemo ? (
    <div className={`mx-auto max-w-lg space-y-3 p-8 text-center ${card}`}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
        <GearSix size={28} aria-hidden />
      </span>
      <h3 className="text-[18px] font-semibold">{t("settings.demo.title")}</h3>
      <p className="text-[14px] text-[var(--color-charcoal)]">{t("settings.demo.body")}</p>
      <Link href="/today" className={`${buttonSecondary} mt-2`}>
        {t("settings.demo.back")}
      </Link>
    </div>
  ) : (
      <div className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-2">
          <Panel title={t("settings.panel.clinic")}>
            <fieldset disabled={me.isDemo} className="p-4 pt-1">
              <ClinicDetailsForm name={clinicName} city={clinic?.city ?? null} phone={clinic?.phone ?? null} />
            </fieldset>
          </Panel>

          <Panel title={t("settings.panel.thresholds")}>
            <fieldset disabled={me.isDemo} className="p-4 pt-1">
              <RiskThresholdsForm
                atRiskDays={clinic?.risk_at_risk_days ?? CLINICAL_RISK_THRESHOLDS.atRiskDays}
                lostDays={clinic?.risk_lost_days ?? CLINICAL_RISK_THRESHOLDS.lostDays}
              />
            </fieldset>
          </Panel>

          <Panel title={t("settings.panel.staff")} count={(staff ?? []).length}>
            <ul>
              {(staff ?? []).map((s) => (
                <li key={s.id} className="flex min-h-12 items-center justify-between border-t border-[var(--color-border)]/70 px-4 text-[14px]">
                  <span className="flex items-center gap-2">
                    {s.full_name}
                    <Tag tone={s.role === "doctor" ? "info" : "neutral"}>{s.role === "doctor" ? t("settings.role.doctor") : t("settings.role.staff")}</Tag>
                    {s.id === me.userId && <span className="text-[12px] text-[var(--color-charcoal)]">{t("settings.staff.you")}</span>}
                  </span>
                  {s.role !== "doctor" && <RemoveStaffButton profileId={s.id} />}
                </li>
              ))}
            </ul>
            {!me.isDemo && <div className="p-4 pt-1"><StaffInviteForm /></div>}
          </Panel>
          {!me.isDemo && (
            <Panel title={t("settings.panel.signoff")}>
              <div className="p-4 pt-1"><ClinicalProtocolSignOff /></div>
            </Panel>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-2">
          <Panel title={t("settings.panel.schedule")} count={items.length}>
            <p className="px-4 pb-2 text-[13px] text-[var(--color-charcoal)]">
              {t("settings.schedule.help")}
            </p>
            <fieldset disabled={me.isDemo} className="px-4 pb-2">
              {items.map((item) => (
                <ScheduleItemRow
                  key={item.id}
                  id={item.id}
                  name={careEventName(item.name, t)}
                  windowStartWeek={item.windowStartWeek}
                  windowEndWeek={item.windowEndWeek}
                  isCritical={item.isCritical}
                />
              ))}
            </fieldset>
          </Panel>

          <Panel title={t("settings.panel.templates")}>
            <div className="p-4 pt-1">
              <MessageTemplatesForm templates={(clinic?.message_templates ?? {}) as MessageTemplates} readOnly={me.isDemo} />
            </div>
          </Panel>
        </div>
      </div>
  );

  return (
    <>
      <PageHeader title={t("settings.profile.title")} />
      <div className={pageBody}>
        <section aria-labelledby="doctor-profile-name" className={`${card} p-4 sm:p-5`}>
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
              <UserCircle size={27} aria-hidden />
            </span>
            <div className="min-w-0 wrap-anywhere">
              <h2 id="doctor-profile-name" className="text-lg font-semibold">{me.fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-charcoal)]">
                <span>{t("settings.role.doctor")}</span>
                {me.isDemo && <Tag tone="neutral">{t("settings.profile.demo")}</Tag>}
              </div>
            </div>
          </div>
          <dl className="mt-4 grid gap-4 border-t border-[var(--color-border)] pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 wrap-anywhere">
              <dt className="text-[var(--color-charcoal)]">{t("settings.profile.clinic")}</dt>
              <dd className="mt-1 font-medium">{clinicName}</dd>
            </div>
            <div className="min-w-0 wrap-anywhere">
              <dt className="text-[var(--color-charcoal)]">{t("settings.profile.degree")}</dt>
              <dd className="mt-1 font-medium">{degree ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-charcoal)]">{t("settings.profile.experience")}</dt>
              <dd className="mt-1 font-medium">
                {yearsOfExperience === null ? "—" : new Intl.NumberFormat(intlLocale(locale)).format(yearsOfExperience)}
              </dd>
            </div>
            {me.email && (
              <div className="min-w-0 wrap-anywhere">
                <dt className="text-[var(--color-charcoal)]">{t("settings.profile.email")}</dt>
                <dd className="mt-1 font-medium">{me.email}</dd>
              </div>
            )}
            {joined && (
              <div>
                <dt className="text-[var(--color-charcoal)]">{t("settings.profile.joined")}</dt>
                <dd className="mt-1 font-medium">{joined}</dd>
              </div>
            )}
          </dl>
          <details className="mt-4 border-t border-[var(--color-border)] pt-4">
            <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)]">
              {t("settings.profile.edit")}
            </summary>
            <DoctorProfessionalDetailsForm fullName={me.fullName} degree={degree} yearsOfExperience={yearsOfExperience} />
          </details>
        </section>

        <section aria-labelledby="application-settings" className="space-y-4">
          <div>
            <h2 id="application-settings" className="text-xl font-semibold">{t("settings.title")}</h2>
            {me.isDemo && <p className="mt-1 text-sm text-[var(--color-charcoal)]">{t("settings.demo.readOnly")}</p>}
          </div>
          {settingsContent}
        </section>
      </div>
    </>
  );
}
