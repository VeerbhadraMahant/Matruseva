import { createClient } from "@/lib/supabase/server";
import { DocumentUploader } from "@/components/DocumentUploader";
import { AssignDocumentForm } from "@/components/AssignDocumentForm";

const OCR_STATUS_LABEL: Record<string, string> = {
  pending: "Reading…",
  done: "Text found",
  failed: "No text recognized",
  skipped: "Not processed",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user!.id).single();
  const clinicId = profile!.clinic_id;

  let query = supabase
    .from("documents")
    .select("id, doc_type, source, storage_path, ocr_status, created_at, patient_id")
    .order("created_at", { ascending: false })
    .limit(50);

  query = q && q.trim() ? query.textSearch("search", q, { type: "websearch", config: "simple" }) : query.is("patient_id", null);

  const { data: documents } = await query;

  const withUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 300);
      return { ...doc, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-1 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        Documents
      </h1>
      <p className="mb-6 text-sm text-[var(--color-charcoal)]">
        Photograph or upload OPD case papers, reports and WhatsApp images, then assign them to a patient.
      </p>

      <div className="mb-8">
        <DocumentUploader clinicId={clinicId} />
      </div>

      <form className="mb-6" action="/documents">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search document text…"
          className="w-full max-w-md rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </form>

      <h2 className="mb-3 text-[var(--text-subheading)] font-medium">
        {q ? `Search results for "${q}"` : "Inbox — unfiled documents"}
      </h2>

      {withUrls.length === 0 ? (
        <p className="text-sm text-[var(--color-charcoal)]">
          {q ? "No documents matched." : "Nothing waiting to be filed."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withUrls.map((doc) => (
            <li key={doc.id} className="space-y-3 rounded-[var(--radius-cards)] border border-[var(--color-border)] p-[var(--space-21)]">
              {doc.url && doc.storage_path.match(/\.(jpe?g|png|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                <img src={doc.url} alt="" className="h-40 w-full rounded-[var(--radius-nav)] object-cover" />
              ) : doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer" className="block text-sm text-[var(--color-primary)] underline">
                  Open PDF
                </a>
              ) : null}
              <div className="text-xs text-[var(--color-charcoal)]">
                {new Date(doc.created_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                {OCR_STATUS_LABEL[doc.ocr_status ?? "pending"]}
              </div>
              {!doc.patient_id && <AssignDocumentForm documentId={doc.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
