import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClinicDetailsForm } from "@/components/settings/ClinicDetailsForm";
import { RiskThresholdsForm } from "@/components/settings/RiskThresholdsForm";
import { ScheduleItemRow } from "@/components/settings/ScheduleItemRow";
import { StaffInviteForm } from "@/components/settings/StaffInviteForm";
import { RemoveStaffButton } from "@/components/settings/RemoveStaffButton";
import { MessageTemplatesForm } from "@/components/settings/MessageTemplatesForm";
import { ClinicalProtocolSignOff } from "@/components/settings/ClinicalProtocolSignOff";
import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, Panel, Tag, buttonSecondary, card, pageBody } from "@/components/ui";
import type { MessageTemplates } from "@/lib/whatsapp";
import { getT } from "@/lib/i18n/server";
import { DEMO_SCHEDULE_ITEMS } from "@/lib/demo-data";
import { CLINICAL_RISK_THRESHOLDS } from "@/lib/clinicalProtocols";
import { careEventName } from "@/lib/clinicalLabels";

export default async function SettingsPage() {
  const [me, { t }] = await Promise.all([getCurrentUser(), getT()]);
  if (me.role !== "doctor") redirect("/today");

  const supabase = me.isDemo ? null : await createClient();
  const [{ data: clinic }, { data: staff }, { data: template }] = supabase
    ? await Promise.all([
        supabase.from("clinics").select("*").eq("id", me.clinicId).single(),
        supabase.from("profiles").select("id, full_name, role").eq("clinic_id", me.clinicId).order("full_name"),
        supabase
          .from("schedule_templates")
          .select("id, schedule_template_items(id, name, window_start_week, window_end_week, is_critical, sort_order)")
          .eq("clinic_id", me.clinicId)
          .eq("is_default", true)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }, { data: null }];
  if (!clinic && !me.isDemo) {
    return (
      <>
        <PageHeader title={t("settings.title")} />
        <div className={pageBody}>
          <div className={`mx-auto max-w-lg space-y-3 p-8 text-center ${card}`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
              <GearSix size={28} aria-hidden />
            </span>
            <h2 className="text-[18px] font-semibold">{t("settings.demo.title")}</h2>
            <p className="text-[14px] text-[var(--color-charcoal)]">
              {t("settings.demo.body")}
            </p>
            <Link href="/today" className={`${buttonSecondary} mt-2`}>
              {t("settings.demo.back")}
            </Link>
          </div>
        </div>
      </>
    );
  }

  const items = me.isDemo ? DEMO_SCHEDULE_ITEMS : [...(template?.schedule_template_items ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id, name: item.name, windowStartWeek: item.window_start_week,
      windowEndWeek: item.window_end_week, isCritical: item.is_critical,
    }));
  const clinicName = clinic?.name ?? me.clinicName;

  const sections = [
    { id: "clinic", label: t("settings.panel.clinic") },
    { id: "staff", label: t("settings.panel.staff") },
    { id: "thresholds", label: t("settings.panel.thresholds") },
    { id: "schedule", label: t("settings.panel.schedule") },
    { id: "templates", label: t("settings.panel.templates") },
    ...(me.isDemo ? [] : [{ id: "signoff", label: t("settings.nav.signoff") }]),
  ];
  const help = "px-4 pb-1 pt-3 text-[13px] text-[var(--color-charcoal)]";
  const navLink =
    "press inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[13px] font-medium hover:border-[var(--color-primary)] lg:min-h-9 lg:rounded-[var(--radius-buttons)] lg:border-transparent lg:bg-transparent lg:px-3 lg:text-[14px] lg:hover:bg-[var(--color-surface-2)]";

  return (
    <>
      <PageHeader title={t("settings.title")} meta={me.isDemo ? t("settings.demo.readOnly") : clinicName} />
      <div className={`${pageBody} grid grid-cols-[minmax(0,1fr)] gap-4 space-y-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8`}>
        <nav aria-label={t("settings.nav.label")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-visible lg:px-0">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={navLink}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="max-w-3xl space-y-5">
          <div id="clinic" className="scroll-mt-6">
            <Panel title={t("settings.panel.clinic")}>
              <p className={help}>{t("settings.help.clinic")}</p>
              <fieldset disabled={me.isDemo} className="p-4 pt-3">
                <ClinicDetailsForm name={clinicName} city={clinic?.city ?? null} phone={clinic?.phone ?? null} />
              </fieldset>
            </Panel>
          </div>

          <div id="staff" className="scroll-mt-6">
            <Panel title={t("settings.panel.staff")} count={(staff ?? []).length}>
              <p className={help}>{t("settings.help.staff")}</p>
              <ul className="mt-2">
                {(staff ?? []).map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-[var(--color-border)]/70 px-4 text-[14px]">
                    <span className="flex flex-wrap items-center gap-2">
                      {s.full_name}
                      <Tag tone={s.role === "doctor" ? "info" : "neutral"}>{s.role === "doctor" ? t("settings.role.doctor") : t("settings.role.staff")}</Tag>
                      {s.id === me.userId && <span className="text-[12px] text-[var(--color-charcoal)]">{t("settings.staff.you")}</span>}
                    </span>
                    {s.role !== "doctor" && <RemoveStaffButton profileId={s.id} />}
                  </li>
                ))}
              </ul>
              {!me.isDemo && <div className="border-t border-[var(--color-border)]/70 p-4"><StaffInviteForm /></div>}
            </Panel>
          </div>

          <div id="thresholds" className="scroll-mt-6">
            <Panel title={t("settings.panel.thresholds")}>
              <p className={help}>{t("settings.help.thresholds")}</p>
              <fieldset disabled={me.isDemo} className="p-4 pt-3">
                <RiskThresholdsForm
                  atRiskDays={clinic?.risk_at_risk_days ?? CLINICAL_RISK_THRESHOLDS.atRiskDays}
                  lostDays={clinic?.risk_lost_days ?? CLINICAL_RISK_THRESHOLDS.lostDays}
                />
              </fieldset>
            </Panel>
          </div>

          <div id="schedule" className="scroll-mt-6">
            <Panel title={t("settings.panel.schedule")} count={items.length}>
              <p className={help}>{t("settings.schedule.help")}</p>
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
          </div>

          <div id="templates" className="scroll-mt-6">
            <Panel title={t("settings.panel.templates")}>
              <div className="p-4 pt-3">
                <MessageTemplatesForm templates={(clinic?.message_templates ?? {}) as MessageTemplates} readOnly={me.isDemo} />
              </div>
            </Panel>
          </div>

          {!me.isDemo && (
            <div id="signoff" className="scroll-mt-6">
              <Panel title={t("settings.panel.signoff")}>
                <div className="p-4 pt-3"><ClinicalProtocolSignOff /></div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
