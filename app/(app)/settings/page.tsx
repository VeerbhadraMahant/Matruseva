import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClinicDetailsForm } from "@/components/settings/ClinicDetailsForm";
import { RiskThresholdsForm } from "@/components/settings/RiskThresholdsForm";
import { ScheduleItemRow } from "@/components/settings/ScheduleItemRow";
import { StaffInviteForm } from "@/components/settings/StaffInviteForm";
import { RemoveStaffButton } from "@/components/settings/RemoveStaffButton";
import { MessageTemplatesForm } from "@/components/settings/MessageTemplatesForm";
import type { MessageTemplates } from "@/lib/whatsapp";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("clinic_id, role").eq("id", user.id).single();
  if (!me || me.role !== "doctor") redirect("/today");

  const [{ data: clinic }, { data: staff }, { data: template }] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", me.clinic_id).single(),
    supabase.from("profiles").select("id, full_name, role").eq("clinic_id", me.clinic_id).order("full_name"),
    supabase.from("schedule_templates").select("id").eq("clinic_id", me.clinic_id).eq("is_default", true).maybeSingle(),
  ]);

  const { data: items } = template
    ? await supabase
        .from("schedule_template_items")
        .select("id, name, window_start_week, window_end_week, is_critical")
        .eq("template_id", template.id)
        .order("sort_order")
    : { data: [] };

  if (!clinic) return null;

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-8 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        Settings
      </h1>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Clinic details</h2>
        <ClinicDetailsForm name={clinic.name} city={clinic.city} phone={clinic.phone} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Follow-up thresholds</h2>
        <RiskThresholdsForm atRiskDays={clinic.risk_at_risk_days} lostDays={clinic.risk_lost_days} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Reminder message templates</h2>
        <MessageTemplatesForm templates={(clinic.message_templates ?? {}) as MessageTemplates} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">ANC schedule template</h2>
        <p className="mb-3 text-sm text-[var(--color-charcoal)]">
          Adjust the default due-date windows (in weeks of pregnancy). Changes apply to newly registered patients and to any
          existing patient whose schedule is regenerated after an LMP correction.
        </p>
        <div className="rounded-[var(--radius-cards)] border border-[var(--color-border)] px-4">
          {(items ?? []).map((item) => (
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
      </section>

      <section>
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Staff</h2>
        <ul className="mb-4 divide-y divide-[var(--color-border)] rounded-[var(--radius-cards)] border border-[var(--color-border)]">
          {(staff ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {s.full_name} <span className="text-[var(--color-charcoal)]">· {s.role}</span>
              </span>
              {s.role !== "doctor" && <RemoveStaffButton profileId={s.id} />}
            </li>
          ))}
        </ul>
        <StaffInviteForm />
      </section>
    </div>
  );
}
