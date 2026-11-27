import { ClinicDetailsForm } from "@/components/settings/ClinicDetailsForm";
import { RiskThresholdsForm } from "@/components/settings/RiskThresholdsForm";
import { ScheduleItemRow } from "@/components/settings/ScheduleItemRow";
import { StaffInviteForm } from "@/components/settings/StaffInviteForm";
import { RemoveStaffButton } from "@/components/settings/RemoveStaffButton";
import { MessageTemplatesForm } from "@/components/settings/MessageTemplatesForm";
import { ClinicalProtocolSignOff } from "@/components/settings/ClinicalProtocolSignOff";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { Tag, card } from "@/components/ui";
import {
  Buildings,
  CalendarBlank,
  ChatCircleText,
  Gauge,
  SealCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
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

const SECTION_ICONS = {
  clinic: Buildings,
  thresholds: Gauge,
  staff: UsersThree,
  schedule: CalendarBlank,
  templates: ChatCircleText,
  signoff: SealCheck,
};

function Section({
  id,
  title,
  description,
  count,
  paired,
  children,
}: {
  id: keyof typeof SECTION_ICONS;
  title: string;
  description: string;
  count?: number;
  /** Sits beside another section: headers share a height so the cards start on one line. */
  paired?: boolean;
  children: React.ReactNode;
}) {
  const Icon = SECTION_ICONS[id];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-32 flex-col lg:scroll-mt-20">
      <div className={`mb-3 flex items-start gap-3 ${paired ? "lg:min-h-[5.25rem]" : ""}`}>
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-nav)] bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-[17px] font-semibold leading-9 tracking-[-0.01em] text-[var(--color-foreground)]">
            {title}
            {count !== undefined && (
              <span className="num rounded-full bg-[var(--color-surface-2)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-charcoal)]">
                {count}
              </span>
            )}
          </h2>
          <p className="max-w-prose text-[13px] leading-relaxed text-[var(--color-charcoal)]">{description}</p>
        </div>
      </div>
      <div className={`flex-1 overflow-hidden ${card}`}>{children}</div>
    </section>
  );
}

function initial(name: string) {
  return (Array.from(name.trim())[0] ?? "?").toUpperCase();
}

/** Clinic identity and the figures that matter at a glance; each figure jumps to its section. */
function ClinicBand({
  clinic,
  staffCount,
  itemCount,
  readOnly,
  labels,
}: {
  clinic: Clinic;
  staffCount: number;
  itemCount: number;
  readOnly: boolean;
  labels: { staff: string; schedule: string; thresholds: string; readOnly: string };
}) {
  const meta = [clinic.city, clinic.phone].filter(Boolean).join("  ·  ");
  const stats = [
    { href: "#staff", label: labels.staff, value: String(staffCount) },
    { href: "#schedule", label: labels.schedule, value: String(itemCount) },
    { href: "#thresholds", label: labels.thresholds, value: `${clinic.atRiskDays} / ${clinic.lostDays}` },
  ];
  return (
    <div className="rounded-[var(--radius-cards)] border border-[var(--color-pc-lilac-strong)] bg-[var(--color-primary-surface)] p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-cards)] bg-[var(--color-primary)] text-[24px] font-semibold text-[var(--color-primary-foreground)]"
        >
          {initial(clinic.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 break-words text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[var(--color-foreground)]">
              {clinic.name}
            </p>
            {readOnly && <Tag tone="info">{labels.readOnly}</Tag>}
          </div>
          {meta && <p className="num mt-1 text-[14px] text-[var(--color-charcoal)]">{meta}</p>}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <li key={s.href}>
            <a
              href={s.href}
              className="flex h-full min-h-11 flex-col justify-between gap-1 rounded-[var(--radius-buttons)] bg-[var(--color-background)] px-3 py-2.5 transition-[background-color,transform] duration-150 hover:bg-[var(--color-surface-1)] active:scale-[0.98] motion-reduce:active:scale-100 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
            >
              <span className="text-[11px] leading-snug text-[var(--color-charcoal)] sm:text-[12px]">{s.label}</span>
              <span className="num text-[16px] font-semibold text-[var(--color-foreground)]">{s.value}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function trimesterOf(week: number): 1 | 2 | 3 {
  return week < 14 ? 1 : week < 28 ? 2 : 3;
}

/** Settings body: identity band, section nav, then the grouped sections. Doctors only; the caller enforces the role. */
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
    { id: "thresholds", title: t("settings.panel.thresholds") },
    { id: "staff", title: t("settings.panel.staff") },
    { id: "schedule", title: t("settings.panel.schedule") },
    { id: "templates", title: t("settings.panel.templates") },
    { id: "signoff", title: t("settings.signoff.title") },
  ].filter((s) => !readOnly || s.id !== "signoff");

  const triLabel = { 1: t("settings.schedule.tri1"), 2: t("settings.schedule.tri2"), 3: t("settings.schedule.tri3") };
  const groups = ([1, 2, 3] as const)
    .map((n) => ({ n, items: items.filter((i) => trimesterOf(i.windowStartWeek) === n) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <ClinicBand
        clinic={clinic}
        staffCount={staff.length}
        itemCount={items.length}
        readOnly={readOnly}
        labels={{
          staff: t("settings.panel.staff"),
          schedule: t("settings.panel.schedule"),
          thresholds: t("settings.panel.thresholds"),
          readOnly: t("settings.readOnly.tag"),
        }}
      />

      <div className="space-y-5 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="sticky top-16 z-10 -mx-4 bg-[var(--color-canvas)]/95 py-2 backdrop-blur md:-mx-8 lg:top-20 lg:mx-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
          <SettingsNav sections={sections} label={t("settings.nav.label")} />
        </div>

        <div className="min-w-0 space-y-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
            <Section id="clinic" paired title={t("settings.panel.clinic")} description={t("settings.section.clinic.desc")}>
              <fieldset disabled={readOnly} className="h-full p-4 sm:p-5">
                <ClinicDetailsForm name={clinic.name} city={clinic.city} phone={clinic.phone} readOnly={readOnly} />
              </fieldset>
            </Section>

            <Section id="thresholds" paired title={t("settings.panel.thresholds")} description={t("settings.section.thresholds.desc")}>
              <fieldset disabled={readOnly} className="h-full p-4 sm:p-5">
                <RiskThresholdsForm atRiskDays={clinic.atRiskDays} lostDays={clinic.lostDays} readOnly={readOnly} />
              </fieldset>
            </Section>
          </div>

          <Section id="staff" title={t("settings.panel.staff")} description={t("settings.section.staff.desc")} count={staff.length}>
            {staff.length === 0 ? (
              <p className="px-4 py-6 text-[14px] text-[var(--color-charcoal)] sm:px-5">{t("settings.staff.empty")}</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {staff.map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-1 text-[14px] sm:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[14px] font-semibold text-[var(--color-primary)]"
                      >
                        {initial(s.full_name)}
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-[var(--color-foreground)]">{s.full_name}</span>
                        <Tag tone={s.role === "doctor" ? "info" : "neutral"}>
                          {s.role === "doctor" ? t("settings.role.doctor") : t("settings.role.staff")}
                        </Tag>
                        {s.id === currentUserId && <span className="text-[13px] text-[var(--color-charcoal)]">{t("settings.staff.you")}</span>}
                      </span>
                    </span>
                    {s.role !== "doctor" && !readOnly && <RemoveStaffButton profileId={s.id} />}
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 sm:p-5">
                <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-foreground)]">{t("settings.invite.add")}</h3>
                <StaffInviteForm />
              </div>
            )}
          </Section>

          <Section id="schedule" title={t("settings.panel.schedule")} description={t("settings.schedule.help")} count={items.length}>
            <fieldset disabled={readOnly}>
              {groups.map((g) => (
                <div key={g.n} role="group" aria-label={triLabel[g.n]}>
                  <p className="flex items-center justify-between border-y border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2 text-[12px] font-semibold text-[var(--color-charcoal)] first:border-t-0 sm:px-5">
                    {triLabel[g.n]}
                    <span className="num font-medium">{g.items.length}</span>
                  </p>
                  <ul className="divide-y divide-[var(--color-border)]">
                    {g.items.map((item) => (
                      <ScheduleItemRow
                        key={item.id}
                        id={item.id}
                        name={careEventName(item.name, t)}
                        windowStartWeek={item.windowStartWeek}
                        windowEndWeek={item.windowEndWeek}
                        isCritical={item.isCritical}
                        readOnly={readOnly}
                      />
                    ))}
                  </ul>
                </div>
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
    </div>
  );
}
