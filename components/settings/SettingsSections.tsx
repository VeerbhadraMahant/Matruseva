import { ClinicDetailsForm } from "@/components/settings/ClinicDetailsForm";
import { RiskThresholdsForm } from "@/components/settings/RiskThresholdsForm";
import { ScheduleItemRow } from "@/components/settings/ScheduleItemRow";
import { StaffInviteForm } from "@/components/settings/StaffInviteForm";
import { RemoveStaffButton } from "@/components/settings/RemoveStaffButton";
import { MessageTemplatesForm } from "@/components/settings/MessageTemplatesForm";
import { ClinicalProtocolSignOff } from "@/components/settings/ClinicalProtocolSignOff";
import { Tag, card } from "@/components/ui";
import type { MessageTemplates } from "@/lib/whatsapp";
import { getT } from "@/lib/i18n/server";
import { careEventName } from "@/lib/clinicalLabels";

type Clinic = {
  name: string;
  city: string | null;
  phone: string | null;
  atRiskDays: number;
  lostDays: number;
  messageTemplates: unknown;
};
type StaffMember = { id: string; full_name: string; role: string };
type ScheduleItem = {
  id: string;
  name: string;
  windowStartWeek: number;
  windowEndWeek: number;
  isCritical: boolean;
};

function Section({
  id,
  title,
  description,
  count,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <div className="mb-3">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-[var(--color-foreground)]">
          {title}
          {count !== undefined && (
            <span className="num rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
              {count}
            </span>
          )}
        </h2>
        <p className="mt-1 max-w-prose text-[14px] leading-relaxed text-[var(--color-charcoal)]">{description}</p>
      </div>
      <div className={`overflow-hidden ${card}`}>{children}</div>
    </section>
  );
}

/** Settings body: section nav (wide screens) plus the grouped sections. Doctors only; the caller enforces the role. */
export async function SettingsSections({
  clinic,
  staff,
  items,
  currentUserId,
  readOnly,
}: {
  clinic: Clinic;
  staff: StaffMember[];
  items: ScheduleItem[];
  currentUserId: string;
  /** Demo view: fields disabled; staff invite and protocol sign-off hidden. */
  readOnly: boolean;
}) {
  const { t } = await getT();
  const sections = [
    { id: "clinic", title: t("settings.panel.clinic") },
    { id: "staff", title: t("settings.panel.staff") },
    { id: "thresholds", title: t("settings.panel.thresholds") },
    { id: "schedule", title: t("settings.panel.schedule") },
    { id: "templates", title: t("settings.panel.templates") },
    { id: "signoff", title: t("settings.panel.signoff") },
  ].filter((s) => !readOnly || s.id !== "signoff");

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <nav aria-label={t("settings.nav.label")} className="sticky top-6 hidden lg:block">
        <ul className="space-y-0.5 border-l border-[var(--color-border)]">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="-ml-px flex min-h-11 items-center border-l-2 border-transparent px-3 text-[13px] font-medium leading-snug text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-10">
        <Section id="clinic" title={t("settings.panel.clinic")} description={t("settings.section.clinic.desc")}>
          <fieldset disabled={readOnly} className="p-4 sm:p-5">
            <ClinicDetailsForm name={clinic.name} city={clinic.city} phone={clinic.phone} />
          </fieldset>
        </Section>

        <Section id="staff" title={t("settings.panel.staff")} description={t("settings.section.staff.desc")} count={staff.length}>
          <ul className="divide-y divide-[var(--color-border)]">
            {staff.map((s) => (
              <li key={s.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-1 text-[14px] sm:px-5">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-[var(--color-foreground)]">{s.full_name}</span>
                  <Tag tone={s.role === "doctor" ? "info" : "neutral"}>
                    {s.role === "doctor" ? t("settings.role.doctor") : t("settings.role.staff")}
                  </Tag>
                  {s.id === currentUserId && <span className="text-[13px] text-[var(--color-charcoal)]">{t("settings.staff.you")}</span>}
                </span>
                {s.role !== "doctor" && <RemoveStaffButton profileId={s.id} />}
              </li>
            ))}
          </ul>
          {!readOnly && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 sm:p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-foreground)]">{t("settings.invite.add")}</h3>
              <StaffInviteForm />
            </div>
          )}
        </Section>

        <Section id="thresholds" title={t("settings.panel.thresholds")} description={t("settings.section.thresholds.desc")}>
          <fieldset disabled={readOnly} className="p-4 sm:p-5">
            <RiskThresholdsForm atRiskDays={clinic.atRiskDays} lostDays={clinic.lostDays} />
          </fieldset>
        </Section>

        <Section id="schedule" title={t("settings.panel.schedule")} description={t("settings.schedule.help")} count={items.length}>
          <fieldset disabled={readOnly} className="divide-y divide-[var(--color-border)]">
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
        </Section>

        <Section id="templates" title={t("settings.panel.templates")} description={t("settings.section.templates.desc")}>
          <div className="p-4 sm:p-5">
            <MessageTemplatesForm templates={clinic.messageTemplates as MessageTemplates} readOnly={readOnly} />
          </div>
        </Section>

        {!readOnly && (
          <Section id="signoff" title={t("settings.panel.signoff")} description={t("settings.section.signoff.desc")}>
            <div className="p-4 sm:p-5">
              <ClinicalProtocolSignOff />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
