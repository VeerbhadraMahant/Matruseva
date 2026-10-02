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
import { PageHeader, Panel, Tag, pageBody } from "@/components/ui";
import type { MessageTemplates } from "@/lib/whatsapp";

export default async function SettingsPage() {
  const [me, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (me.role !== "doctor") redirect("/today");

  const [{ data: clinic }, { data: staff }, { data: template }] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", me.clinicId).single(),
    supabase.from("profiles").select("id, full_name, role").eq("clinic_id", me.clinicId).order("full_name"),
    supabase
      .from("schedule_templates")
      .select("id, schedule_template_items(id, name, window_start_week, window_end_week, is_critical, sort_order)")
      .eq("clinic_id", me.clinicId)
      .eq("is_default", true)
      .maybeSingle(),
  ]);
  if (!clinic) return null;

  const items = [...(template?.schedule_template_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <PageHeader title="Settings" meta={clinic.name} />
      <div className={`${pageBody} grid grid-cols-[minmax(0,1fr)] gap-5 space-y-0 xl:grid-cols-2`}>
        <div className="space-y-5">
          <Panel title="Clinic details">
            <div className="p-4 pt-1">
              <ClinicDetailsForm name={clinic.name} city={clinic.city} phone={clinic.phone} />
            </div>
          </Panel>

          <Panel title="Follow-up thresholds">
            <div className="p-4 pt-1">
              <RiskThresholdsForm atRiskDays={clinic.risk_at_risk_days} lostDays={clinic.risk_lost_days} />
            </div>
          </Panel>

          <Panel title="Staff" count={(staff ?? []).length}>
            <ul>
              {(staff ?? []).map((s) => (
                <li key={s.id} className="flex min-h-12 items-center justify-between border-t border-[var(--color-border)]/70 px-4 text-[14px]">
                  <span className="flex items-center gap-2">
                    {s.full_name}
                    <Tag tone={s.role === "doctor" ? "info" : "neutral"}>{s.role}</Tag>
                    {s.id === me.userId && <span className="text-[12px] text-[var(--color-charcoal)]">(you)</span>}
                  </span>
                  {s.role !== "doctor" && <RemoveStaffButton profileId={s.id} />}
                </li>
              ))}
            </ul>
            <div className="p-4 pt-1">
              <StaffInviteForm />
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Clinical Lead Protocol Sign-Off (FOGSI / MoHFW)">
            <div className="p-4 pt-1">
              <ClinicalProtocolSignOff />
            </div>
          </Panel>

          <Panel title="ANC schedule template" count={items.length}>
            <p className="px-4 pb-2 text-[13px] text-[var(--color-charcoal)]">
              Due-date windows in weeks of pregnancy. Applies to newly registered patients and to schedules regenerated after an LMP
              correction.
            </p>
            <div className="px-4 pb-2">
              {items.map((item) => (
                <ScheduleItemRow
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  windowStartWeek={item.window_start_week}
                  windowEndWeek={item.window_end_week}
                  isCritical={item.is_critical}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Reminder message templates">
            <div className="p-4 pt-1">
              <MessageTemplatesForm templates={(clinic.message_templates ?? {}) as MessageTemplates} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
