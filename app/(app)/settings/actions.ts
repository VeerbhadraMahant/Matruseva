"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { setDemoDoctorProfile } from "@/lib/demo-data";

export interface ActionResult {
  error: string | null;
}

/** Doctor-only guard for live clinic settings. */
async function requireDoctor(t: Awaited<ReturnType<typeof getT>>["t"]): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; profile: { id: string; clinic_id: string; role: CurrentUser["role"] }; error: null }
  | { supabase: null; profile: null; error: string }
> {
  const me = await getCurrentUser();
  if (me.isDemo) {
    return { supabase: null, profile: null, error: t("settings.error.demo") };
  }
  if (me.role !== "doctor") {
    return { supabase: null, profile: null, error: t("settings.error.doctorOnly") };
  }
  const supabase = await createClient();
  return { supabase, profile: { id: me.userId, clinic_id: me.clinicId, role: me.role }, error: null };
}

const doctorProfileSchema = z.object({
  fullName: z.string().trim().min(2),
  degree: z.string().trim(),
  yearsOfExperience: z.string().trim()
    .transform((value) => value === "" ? null : Number(value))
    .pipe(z.int32().nonnegative().nullable()),
});

export async function updateDoctorProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const [{ t }, me] = await Promise.all([getT(), getCurrentUser()]);
  if (me.role !== "doctor") return { error: t("settings.error.doctorOnly") };
  const parsed = doctorProfileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: t(parsed.error.issues[0].path[0] === "fullName" ? "settings.profile.invalidName" : "settings.profile.invalid") };
  }

  const { fullName, degree, yearsOfExperience } = parsed.data;
  if (me.isDemo) {
    setDemoDoctorProfile({ fullName, degree: degree || null, yearsOfExperience });
  } else {
    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, degree: degree || null, years_of_experience: yearsOfExperience })
      .eq("id", me.userId)
      .eq("clinic_id", me.clinicId)
      .eq("role", "doctor")
      .select("id")
      .maybeSingle();

    if (error || !updated) return { error: t("settings.profile.saveFailed") };
  }
  revalidatePath("/(app)", "layout");
  revalidatePath("/settings");
  return { error: null };
}

const clinicDetailsSchema = (msg: string) => z.object({
  name: z.string().min(2, msg),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export async function updateClinicDetails(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const parsed = clinicDetailsSchema(t("settings.error.clinicName")).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ name: parsed.data.name, city: parsed.data.city || null, phone: parsed.data.phone || null })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  revalidatePath("/patients");
  revalidatePath("/today");
  revalidatePath("/calls");
  return { error: null };
}

const riskThresholdsSchema = z.object({
  riskAtRiskDays: z.coerce.number().int().positive().max(90),
  riskLostDays: z.coerce.number().int().positive().max(180),
});

export async function updateRiskThresholds(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const parsed = riskThresholdsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: t("settings.error.thresholdNumber") };
  if (parsed.data.riskAtRiskDays >= parsed.data.riskLostDays) {
    return { error: t("settings.error.thresholdOrder") };
  }

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ risk_at_risk_days: parsed.data.riskAtRiskDays, risk_lost_days: parsed.data.riskLostDays })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  revalidatePath("/patients");
  revalidatePath("/today");
  revalidatePath("/calls");
  return { error: null };
}

const messageTemplatesSchema = z.object({
  lang: z.enum(["en", "hi", "mr"]).default("en"),
  defaultLang: z.enum(["en", "hi", "mr"]).optional(),
  overdue: z.string().max(500).optional(),
  due_soon: z.string().max(500).optional(),
  at_risk: z.string().max(500).optional(),
  lost: z.string().max(500).optional(),
});

export async function updateMessageTemplates(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const parsed = messageTemplatesSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: t("settings.error.templateInvalid") };

  // Fetch current clinic message_templates to merge
  const { data: clinic } = await supabase
    .from("clinics")
    .select("message_templates")
    .eq("id", profile.clinic_id)
    .single();

  const current = (clinic?.message_templates ?? {}) as Record<string, unknown>;
  const activeLang = parsed.data.lang;

  // Store non-empty templates for this language
  const langOverrides: Record<string, string> = {};
  if (parsed.data.overdue?.trim()) langOverrides.overdue = parsed.data.overdue.trim();
  if (parsed.data.due_soon?.trim()) langOverrides.due_soon = parsed.data.due_soon.trim();
  if (parsed.data.at_risk?.trim()) langOverrides.at_risk = parsed.data.at_risk.trim();
  if (parsed.data.lost?.trim()) langOverrides.lost = parsed.data.lost.trim();

  const merged = {
    ...current,
    [activeLang]: langOverrides,
    default_lang: parsed.data.defaultLang || current.default_lang || "en",
  };

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ message_templates: merged as unknown as import("@/lib/supabase/types").Json })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  revalidatePath("/calls");
  return { error: null };
}

const scheduleItemSchema = z.object({
  itemId: z.uuid(),
  windowStartWeek: z.coerce.number().min(0).max(45),
  windowEndWeek: z.coerce.number().min(0).max(45),
  isCritical: z.string().optional().transform((v) => v === "on"),
});

export async function updateScheduleItem(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const parsed = scheduleItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: t("settings.error.weeks") };
  if (parsed.data.windowStartWeek > parsed.data.windowEndWeek) {
    return { error: t("settings.error.weekOrder") };
  }

  const { error: updateError } = await supabase
    .from("schedule_template_items")
    .update({
      window_start_week: parsed.data.windowStartWeek,
      window_end_week: parsed.data.windowEndWeek,
      is_critical: parsed.data.isCritical,
    })
    .eq("id", parsed.data.itemId);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  revalidatePath("/patients");
  revalidatePath("/today");
  revalidatePath("/calls");
  return { error: null };
}

const inviteSchema = (msg: { email: string; name: string }) => z.object({
  email: z.email(msg.email),
  fullName: z.string().trim().min(2, msg.name),
});

export async function inviteStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const { profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const parsed = inviteSchema({ email: t("settings.error.email"), name: t("settings.error.staffName") }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");
  const inviteUrl = siteUrl && URL.parse("/auth/staff-invite", siteUrl);
  if (!inviteUrl || !["https:", "http:"].includes(inviteUrl.protocol)) {
    return { error: t("settings.error.inviteUnavailable") };
  }
  const admin = createAdminClient();
  const inviteId = crypto.randomUUID();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: inviteUrl.toString(),
    data: { matrusetu_staff_invite: inviteId },
  });
  if (inviteError || !invited.user) return { error: inviteError?.message ?? t("settings.error.createAccount") };
  // Supabase may return an existing unconfirmed account. Only attach or clean up a user created by this request.
  if (invited.user.user_metadata?.matrusetu_staff_invite !== inviteId) {
    return { error: t("settings.error.inviteExisting") };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    clinic_id: profile.clinic_id,
    full_name: parsed.data.fullName,
    role: "staff",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/settings");
  return { error: null };
}

export async function removeStaff(staffProfileId: string): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  // createAdminClient() bypasses RLS entirely, so this check is the only
  // thing standing between "delete my own clinic's staff" and "delete any
  // user account in the system" — it must happen with the RLS-scoped
  // client (profiles_select only returns rows in the caller's own clinic),
  // not the admin client.
  const { data: target } = await supabase.from("profiles").select("clinic_id, role").eq("id", staffProfileId).maybeSingle();
  if (!target || target.clinic_id !== profile.clinic_id) {
    return { error: t("settings.error.staffNotFound") };
  }
  if (target.role === "doctor") {
    return { error: t("settings.error.doctorRemove") };
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(staffProfileId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function applyStandardFogsiSchedule(): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const { FOGSI_MOHFW_SCHEDULE_ITEMS, CLINICAL_RISK_THRESHOLDS } = await import("@/lib/clinicalProtocols");

  // 1. Update clinic risk thresholds to standard 7 and 21 days
  const { error: clinicErr } = await supabase
    .from("clinics")
    .update({
      risk_at_risk_days: CLINICAL_RISK_THRESHOLDS.atRiskDays,
      risk_lost_days: CLINICAL_RISK_THRESHOLDS.lostDays,
    })
    .eq("id", profile.clinic_id);

  if (clinicErr) return { error: clinicErr.message };

  // 2. Fetch default schedule template
  const { data: template, error: tmplErr } = await supabase
    .from("schedule_templates")
    .select("id, schedule_template_items(id, code)")
    .eq("clinic_id", profile.clinic_id)
    .eq("is_default", true)
    .maybeSingle();

  if (tmplErr || !template) {
    return { error: tmplErr?.message || t("settings.error.noTemplate") };
  }

  // 3. Update existing items to match FOGSI windows
  const items = template.schedule_template_items || [];
  for (const std of FOGSI_MOHFW_SCHEDULE_ITEMS) {
    const existing = items.find((it) => it.code === std.code);
    if (existing) {
      await supabase
        .from("schedule_template_items")
        .update({
          window_start_week: std.windowStartWeek,
          window_end_week: std.windowEndWeek,
          is_critical: std.isCritical,
        })
        .eq("id", existing.id);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/calls");
  return { error: null };
}

export async function resetMessageTemplatesToCertified(): Promise<ActionResult> {
  const { t } = await getT();
  const { supabase, profile, error } = await requireDoctor(t);
  if (error || !profile) return { error };

  const { DEFAULT_TEMPLATES } = await import("@/lib/whatsapp");

  const { error: updateError } = await supabase
    .from("clinics")
    .update({
      message_templates: {
        en: DEFAULT_TEMPLATES.en,
        hi: DEFAULT_TEMPLATES.hi,
        mr: DEFAULT_TEMPLATES.mr,
        default_lang: "en",
        certified_at: new Date().toISOString(),
        certified_by: "Clinical Directorate (FOGSI / MoHFW Aligned)",
      },
    })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  revalidatePath("/calls");
  return { error: null };
}

