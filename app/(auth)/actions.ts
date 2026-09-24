"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
  checkEmail?: boolean;
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password." };
  }

  redirect("/today");
}

export async function signup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, signUp succeeds but returns no
  // active session — there's nothing to onboard into yet.
  if (!data.session) {
    return { error: null, checkEmail: true };
  }

  redirect("/onboarding");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const onboardingSchema = z.object({
  clinicName: z.string().min(2, "Enter your clinic's name"),
  doctorFullName: z.string().min(2, "Enter your full name"),
});

export async function completeOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse({
    clinicName: formData.get("clinicName"),
    doctorFullName: formData.get("doctorFullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Please log in again." };
  }

  const { error } = await supabase.rpc("create_clinic_and_profile", {
    clinic_name: parsed.data.clinicName,
    doctor_full_name: parsed.data.doctorFullName,
  });
  if (error) {
    return { error: error.message };
  }

  redirect("/today");
}
