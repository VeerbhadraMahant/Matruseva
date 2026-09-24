"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error: string | null;
}

const assignSchema = z.object({
  patientId: z.uuid("Choose a patient"),
  docType: z.enum(["report", "scan", "prescription", "case_paper", "register_page", "other"]),
  docDate: z.iso.date().optional().or(z.literal("")),
  careEventId: z.uuid().optional().or(z.literal("")),
});

export async function assignDocument(documentId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { patientId, docType, docDate, careEventId } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({
      patient_id: patientId,
      doc_type: docType,
      doc_date: docDate || null,
      care_event_id: careEventId || null,
    })
    .eq("id", documentId);

  if (error) return { error: error.message };

  if (careEventId) {
    const { error: careEventError } = await supabase
      .from("care_events")
      .update({ completed_at: new Date().toISOString(), document_id: documentId })
      .eq("id", careEventId);
    if (careEventError) return { error: careEventError.message };
  }

  revalidatePath("/documents");
  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

const patientSearchSchema = z.string().min(1);

export async function searchPatientsForAssign(query: string) {
  const parsed = patientSearchSchema.safeParse(query);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, name, phone")
    .eq("status", "active")
    .ilike("name", `%${parsed.data}%`)
    .order("name")
    .limit(10);

  return data ?? [];
}

export async function getOpenCareEvents(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("care_event_status")
    .select("id, name, status")
    .eq("patient_id", patientId)
    .neq("status", "done")
    .order("due_from");

  return (data ?? []).filter((ce): ce is typeof ce & { id: string } => ce.id !== null);
}
