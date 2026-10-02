import { FilePdf, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { DocumentUploader } from "@/components/DocumentUploader";
import { AssignDocumentForm } from "@/components/AssignDocumentForm";
import { PageHeader, Panel, Tag, type Tone, pageBody } from "@/components/ui";

const OCR_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Reading…", tone: "neutral" },
  done: { label: "Text indexed", tone: "ok" },
  failed: { label: "No text found", tone: "warning" },
  skipped: { label: "Not processed", tone: "neutral" },
};

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, me, supabase] = await Promise.all([searchParams, getCurrentUser(), createClient()]);
  const searching = Boolean(q && q.trim());

  let query = supabase
    .from("documents")
    .select("id, doc_type, source, storage_path, ocr_status, created_at, patient_id, patients(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  query = searching ? query.textSearch("search", q!, { type: "websearch", config: "simple" }) : query.is("patient_id", null);

  const { data: documents } = await query;
  const docs = documents ?? [];
  const { data: signed } = docs.length
    ? await supabase.storage.from("documents").createSignedUrls(docs.map((d) => d.storage_path), 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <PageHeader title="Documents" meta="Photograph or upload case papers, reports and WhatsApp images, then file them to a patient." />

      <div className={pageBody}>
        <Panel title="Upload">
          <div className="p-4 pt-1">
            <DocumentUploader clinicId={me.clinicId} />
          </div>
        </Panel>

        <Panel
          title={searching ? `Results for “${q}”` : "Inbox · unfiled"}
          count={docs.length}
          action={
            <form action="/documents" className="flex items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] focus-within:border-[var(--color-primary)]">
              <MagnifyingGlass size={15} className="ml-2 text-[var(--color-charcoal)]" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search text in all documents"
                aria-label="Search document text"
                className="min-h-9 w-56 border-0 bg-transparent px-2 text-[13px] shadow-none outline-none focus:shadow-none"
              />
            </form>
          }
        >
          {docs.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
              {searching ? "No documents matched." : "Inbox is clear — nothing waiting to be filed."}
            </p>
          ) : (
            <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
              {docs.map((doc) => {
                const url = urlByPath.get(doc.storage_path) ?? null;
                const isImage = /\.(jpe?g|png|webp)$/i.test(doc.storage_path);
                const status = OCR_STATUS[doc.ocr_status ?? "pending"];
                const patientName = (doc.patients as { name: string } | null)?.name;
                return (
                  <li key={doc.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
                    <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block">
                      {url && isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                        <img src={url} alt="" loading="lazy" className="h-44 w-full object-cover" />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-[var(--color-surface-1)]">
                          <FilePdf size={40} className="text-[var(--color-charcoal)]" aria-hidden />
                        </div>
                      )}
                    </a>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="num text-[var(--color-charcoal)]">{formatShortDate(doc.created_at)}</span>
                        <span className="text-[var(--color-charcoal)]">· {doc.source}</span>
                        <Tag tone={status.tone}>{status.label}</Tag>
                        {patientName && <Tag tone="info">{patientName}</Tag>}
                      </div>
                      {!doc.patient_id && <AssignDocumentForm documentId={doc.id} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
