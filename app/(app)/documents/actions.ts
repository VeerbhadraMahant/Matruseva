"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import {
  addDemoDocument,
  assignDemoDocument,
  getDemoPatientDetail,
  getDemoStore,
  updateDemoDocumentOcr,
} from "@/lib/demo-data";

export interface ActionResult {
  error: string | null;
}

const assignSchema = (choosePatient: string) =>
  z.object({
    patientId: z.string().min(1, choosePatient),
    docType: z.enum(["report", "scan", "prescription", "case_paper", "register_page", "other"]),
    docDate: z.iso.date().optional().or(z.literal("")),
    careEventId: z.string().optional().or(z.literal("")),
  });

export async function uploadDemoDocumentAction(data: {
  clinicId: string;
  folder?: string;
  fixedDocType?: string;
  docDate?: string;
  source: string;
  fileName: string;
  dataUrl?: string;
  patientId?: string;
}): Promise<{ error: string | null; id?: string }> {
  const me = await getCurrentUser();
  if (!me.isDemo) {
    return { error: "Demo upload is only available in demo sessions" };
  }
  const doc = addDemoDocument({
    clinicId: me.clinicId,
    folder: data.folder,
    docType: data.fixedDocType ?? "other",
    docDate: data.docDate || null,
    source: data.source,
    dataUrl: data.dataUrl,
    patientId: data.patientId,
    ocrStatus: "pending",
  });
  revalidatePath("/documents");
  if (data.patientId) revalidatePath(`/patients/${data.patientId}`);
  if (data.folder === "opd-register") {
    revalidatePath("/opd");
  }
  return { error: null, id: doc.id };
}

/** Demo-store counterpart of the browser's Supabase update once OCR finishes. */
export async function updateDemoDocumentOcrAction(
  documentId: string,
  ocr: { status: "done" | "failed"; text?: string; engine?: string },
): Promise<{ error: string | null }> {
  const me = await getCurrentUser();
  if (!me.isDemo) return { error: "Demo update is only available in demo sessions" };
  if (!updateDemoDocumentOcr(documentId, ocr)) return { error: "Document not found" };
  revalidatePath("/documents");
  revalidatePath("/opd");
  revalidatePath("/patients/[id]", "page");
  return { error: null };
}

export async function assignDocument(documentId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  const { t } = await getT();
  const raw = Object.fromEntries(formData.entries());
  const parsed = assignSchema(t("documents.error.choosePatient")).safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.path[0] === "patientId" ? t("documents.error.choosePatient") : t("documents.error.invalid") };
  }
  const { patientId, docType, docDate, careEventId } = parsed.data;

  if (me.isDemo) {
    assignDemoDocument(documentId, patientId, docType, docDate, careEventId);
    revalidatePath("/documents");
    revalidatePath(`/patients/${patientId}`);
    return { error: null };
  }

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
  const me = await getCurrentUser();
  const parsed = patientSearchSchema.safeParse(query);
  if (!parsed.success) return [];

  if (me.isDemo) {
    const store = getDemoStore();
    const q = parsed.data.toLowerCase();
    return store.patients
      .filter((p) => (p.status ?? "active") === "active" && p.name.toLowerCase().includes(q))
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, phone: p.phone ?? null }));
  }

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
  const me = await getCurrentUser();
  if (me.isDemo) {
    const detail = getDemoPatientDetail(patientId);
    if (!detail) return [];
    return detail.careEvents
      .filter((ce) => ce.status === "due" || ce.status === "overdue")
      .map((ce) => ({ id: ce.id, name: ce.name, status: ce.status }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("care_event_status")
    .select("id, name, status")
    .eq("patient_id", patientId)
    .neq("status", "done")
    .order("due_from");

  return (data ?? []).filter((ce): ce is typeof ce & { id: string } => ce.id !== null);
}
