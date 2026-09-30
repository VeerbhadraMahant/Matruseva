"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  error: string | null;
  inviteLink?: string;
}

/** Doctor-only guard: every action here mutates clinic-wide settings. */
async function requireDoctor() {
  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);
  if (me.role !== "doctor") {
    return { supabase, profile: null, error: "Only the clinic's doctor can change this." };
  }
  return { supabase, profile: { clinic_id: me.clinicId, role: me.role }, error: null };
}

const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Enter the clinic's name"),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export async function updateClinicDetails(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  const parsed = clinicDetailsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ name: parsed.data.name, city: parsed.data.city || null, phone: parsed.data.phone || null })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
  return { error: null };
}

const riskThresholdsSchema = z.object({
  riskAtRiskDays: z.coerce.number().int().positive().max(90),
  riskLostDays: z.coerce.number().int().positive().max(180),
});

export async function updateRiskThresholds(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  const parsed = riskThresholdsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.riskAtRiskDays >= parsed.data.riskLostDays) {
    return { error: "The at-risk threshold must be smaller than the lost threshold." };
  }

  const { error: updateError } = await supabase
    .from("clinics")
    .update({ risk_at_risk_days: parsed.data.riskAtRiskDays, risk_lost_days: parsed.data.riskLostDays })
    .eq("id", profile.clinic_id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/settings");
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
  const { supabase, profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  const parsed = messageTemplatesSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Fetch current clinic message_templates to merge
  const { data: clinic } = await supabase
    .from("clinics")
    .select("message_templates")
    .eq("id", profile.clinic_id)
    .single();

  const current = ((clinic?.message_templates ?? {}) as Record<string, any>);
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
    .update({ message_templates: merged })
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
  const { supabase, profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  const parsed = scheduleItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.windowStartWeek > parsed.data.windowEndWeek) {
    return { error: "The start week must be before the end week." };
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
  return { error: null };
}

const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  fullName: z.string().min(2, "Enter the staff member's name"),
});

/**
 * Creates the staff member's account and profile directly (service role),
 * then returns a one-time password-recovery link for the doctor to share
 * manually (call, SMS, WhatsApp) — this project has no SMTP configured yet,
 * so Supabase's invite/magic-link emails would not actually be delivered.
 * See memory: matrusetu-supabase-auth-autoconfirm.
 */
export async function inviteStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (createError || !created.user) return { error: createError?.message ?? "Could not create the account." };

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    clinic_id: profile.clinic_id,
    full_name: parsed.data.fullName,
    role: "staff",
  });
  if (profileError) return { error: profileError.message };

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
  });
  if (linkError) return { error: linkError.message };

  revalidatePath("/settings");
  return { error: null, inviteLink: linkData.properties.action_link };
}

export async function removeStaff(staffProfileId: string): Promise<ActionResult> {
  const { supabase, profile, error } = await requireDoctor();
  if (error || !profile) return { error };

  // createAdminClient() bypasses RLS entirely, so this check is the only
  // thing standing between "delete my own clinic's staff" and "delete any
  // user account in the system" — it must happen with the RLS-scoped
  // client (profiles_select only returns rows in the caller's own clinic),
  // not the admin client.
  const { data: target } = await supabase.from("profiles").select("clinic_id, role").eq("id", staffProfileId).maybeSingle();
  if (!target || target.clinic_id !== profile.clinic_id) {
    return { error: "That staff member was not found in your clinic." };
  }
  if (target.role === "doctor") {
    return { error: "The clinic's doctor account can't be removed here." };
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(staffProfileId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function applyStandardFogsiSchedule(): Promise<ActionResult> {
  const { supabase, profile, error } = await requireDoctor();
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
    return { error: tmplErr?.message || "Default schedule template not found" };
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
  const { supabase, profile, error } = await requireDoctor();
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

