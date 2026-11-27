import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsSections } from "@/components/settings/SettingsSections";
import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, buttonSecondary, card, pageBody } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { DEMO_SCHEDULE_ITEMS } from "@/lib/demo-data";
import { CLINICAL_RISK_THRESHOLDS } from "@/lib/clinicalProtocols";

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

  return (
    <>
      <PageHeader title={t("settings.title")} meta={me.isDemo ? t("settings.demo.readOnly") : clinicName} />
      <div className={pageBody}>
        <SettingsSections
          clinic={{
            name: clinicName,
            city: clinic?.city ?? null,
            phone: clinic?.phone ?? null,
            atRiskDays: clinic?.risk_at_risk_days ?? CLINICAL_RISK_THRESHOLDS.atRiskDays,
            lostDays: clinic?.risk_lost_days ?? CLINICAL_RISK_THRESHOLDS.lostDays,
            messageTemplates: clinic?.message_templates ?? {},
          }}
          staff={staff ?? []}
          items={items}
          currentUserId={me.userId}
          readOnly={!!me.isDemo}
        />
      </div>
    </>
  );
}
