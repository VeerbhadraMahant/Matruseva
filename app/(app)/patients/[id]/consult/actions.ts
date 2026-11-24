"use server";

import { unstable_rethrow } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDemoStore } from "@/lib/demo-data";
import {
  ScribeError,
  createJob,
  downloadTranscript,
  getJobStatus,
  knownTerms,
  signJobToken,
  startJob,
  summarize,
  verifyJobToken,
  type ConsultSummary,
  type Segment,
} from "@/lib/consultation";

export type CheckResult =
  | { state: "processing" }
  | { state: "done"; segments: Segment[]; summary: ConsultSummary | null; summaryError: string | null }
  | { state: "error"; error: string };

/** Patient fields used for de-identification. RLS limits real rows to the caller's clinic. */
async function loadPatient(patientId: string, me: CurrentUser) {
  if (me.isDemo) {
    const p = getDemoStore().patients.find((x) => x.id === patientId);
    return p ? { name: p.name, address: p.address ?? null } : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("name, address").eq("id", patientId).maybeSingle();
  if (error) throw error; // a DB outage must not read as "patient not found"
  return data ? { name: data.name, address: data.address } : null;
}

function message(e: unknown): string {
  unstable_rethrow(e); // let getCurrentUser's login/onboarding redirects through
  if (e instanceof ScribeError) return e.message;
  console.error("[consult]", e);
  return "Something went wrong. Please try again.";
}

async function authorize(token: string) {
  const me = await getCurrentUser();
  const job = verifyJobToken(token);
  if (!job || job.clinicId !== me.clinicId) throw new ScribeError("This recording session has expired. Please record again.");
  return { me, job };
}

export async function startConsultation(patientId: string): Promise<{ token: string } | { error: string }> {
  try {
    const me = await getCurrentUser();
    if (typeof patientId !== "string" || !(await loadPatient(patientId, me))) return { error: "Patient not found." };
    const jobId = await createJob();
    return { token: signJobToken({ jobId, patientId, clinicId: me.clinicId }) };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function finishConsultation(token: string): Promise<{ error: string | null }> {
  try {
    const { job } = await authorize(token);
    await startJob(job.jobId);
    return { error: null };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Polled by the client. Stateless: once Sarvam is done, it rebuilds transcript and summary on each call. */
export async function checkConsultation(token: string): Promise<CheckResult> {
  try {
    const { me, job } = await authorize(token);
    const status = await getJobStatus(job.jobId);
    if (status.job_state === "Failed") {
      return { state: "error", error: status.error_message || "Transcription failed. Please record again." };
    }
    if (status.job_state !== "Completed") return { state: "processing" };

    const segments = await downloadTranscript(job.jobId, status);
    if (!segments.length) return { state: "done", segments, summary: null, summaryError: "No speech was detected in the recording." };

    try {
      // Inside the inner try so a DB hiccup costs only the summary, not the transcript.
      const patient = await loadPatient(job.patientId, me);
      if (!patient) throw new ScribeError("Patient not found.");
      const terms = await knownTerms({ patientName: patient.name, doctorName: me.fullName, address: patient.address });
      return { state: "done", segments, summary: await summarize(segments, terms), summaryError: null };
    } catch (e) {
      // The doctor still gets the raw transcript when the summary step fails or is withheld.
      return { state: "done", segments, summary: null, summaryError: message(e) };
    }
  } catch (e) {
    return { state: "error", error: message(e) };
  }
}
