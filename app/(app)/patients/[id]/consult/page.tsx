import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDemoStore } from "@/lib/demo-data";
import { getT } from "@/lib/i18n/server";
import { PageHeader, buttonSecondary, pageBody } from "@/components/ui";
import { ConsultationRecorder } from "@/components/ConsultationRecorder";

// Server Actions on this page download the transcript and wait on the summary model.
export const maxDuration = 60;

export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, { t }] = await Promise.all([params, getCurrentUser(), getT()]);

  const name = me.isDemo
    ? getDemoStore().patients.find((p) => p.id === id)?.name
    : (await (await createClient()).from("patients").select("name").eq("id", id).maybeSingle()).data?.name;
  if (!name) notFound();

  return (
    <>
      <PageHeader
        title={t("consult.title")}
        meta={name}
        actions={
          <Link href={`/patients/${id}`} className={buttonSecondary}>
            {t("consult.back")}
          </Link>
        }
      />
      <div className={pageBody}>
        <ConsultationRecorder patientId={id} />
      </div>
    </>
  );
}
