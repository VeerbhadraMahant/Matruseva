import { createClient } from "@/lib/supabase/server";
import { DocumentUploader } from "@/components/DocumentUploader";

const OCR_STATUS_LABEL: Record<string, string> = {
  pending: "Reading…",
  done: "Text found",
  failed: "No text recognized",
  skipped: "Not processed",
};

export default async function OpdRegisterPage({
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
    .select("id, doc_date, storage_path, ocr_status, created_at")
    .eq("doc_type", "register_page")
    .order("doc_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (q && q.trim()) {
    query = query.textSearch("search", q, { type: "websearch", config: "simple" });
  }

  const { data: pages } = await query;

  const withUrls = await Promise.all(
    (pages ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(p.storage_path, 300);
      return { ...p, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-1 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        OPD register
      </h1>
      <p className="mb-6 text-sm text-[var(--color-charcoal)]">
        Photograph daily OPD register or case paper pages. They aren&apos;t tied to a single patient — browse or search by date and text.
      </p>

      <div className="mb-8">
        <DocumentUploader clinicId={clinicId} folder="opd-register" fixedDocType="register_page" showDateInput />
      </div>

      <form className="mb-6" action="/opd">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search register text…"
          className="w-full max-w-md rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </form>

      {withUrls.length === 0 ? (
        <p className="text-sm text-[var(--color-charcoal)]">{q ? "No pages matched." : "No register pages captured yet."}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withUrls.map((p) => (
            <li key={p.id} className="space-y-2 rounded-[var(--radius-cards)] border border-[var(--color-border)] p-[var(--space-21)]">
              {p.url && p.storage_path.match(/\.(jpe?g|png|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                <img src={p.url} alt="" className="h-40 w-full rounded-[var(--radius-nav)] object-cover" />
              ) : p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer" className="block text-sm text-[var(--color-primary)] underline">
                  Open PDF
                </a>
              ) : null}
              <p className="text-xs text-[var(--color-charcoal)]">
                {p.doc_date
                  ? new Date(p.doc_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "No date tagged"}{" "}
                · {OCR_STATUS_LABEL[p.ocr_status ?? "pending"]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
