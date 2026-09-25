import { FilePdf, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { DocumentUploader } from "@/components/DocumentUploader";
import { PageHeader, Panel, Tag, type Tone } from "@/components/ui";

const OCR_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Reading…", tone: "neutral" },
  done: { label: "Text indexed", tone: "ok" },
  failed: { label: "No text found", tone: "warning" },
  skipped: { label: "Not processed", tone: "neutral" },
};

export default async function OpdRegisterPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, me, supabase] = await Promise.all([searchParams, getCurrentUser(), createClient()]);
  const searching = Boolean(q && q.trim());

  let query = supabase
    .from("documents")
    .select("id, doc_date, storage_path, ocr_status, created_at")
    .eq("doc_type", "register_page")
    .order("doc_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (searching) query = query.textSearch("search", q!, { type: "websearch", config: "simple" });

  const { data: pages } = await query;
  const list = pages ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from("documents").createSignedUrls(list.map((p) => p.storage_path), 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Group pages by register date so a day's pages sit together.
  const byDate = new Map<string, typeof list>();
  for (const p of list) {
    const key = p.doc_date ?? "undated";
    byDate.set(key, [...(byDate.get(key) ?? []), p]);
  }

  return (
    <>
      <PageHeader
        title="OPD register"
        meta="Daily register and case-paper pages. Not tied to one patient — browse by date or search the text."
      />
      <div className="space-y-4 p-4 md:p-6">
        <Panel title="Capture pages">
          <div className="p-3">
            <DocumentUploader clinicId={me.clinicId} folder="opd-register" fixedDocType="register_page" showDateInput />
          </div>
        </Panel>

        <Panel
          title={searching ? `Results for “${q}”` : "Register"}
          count={list.length}
          action={
            <form action="/opd" className="flex items-center border border-[var(--color-border-strong)] focus-within:border-[var(--color-primary)]">
              <MagnifyingGlass size={15} className="ml-2 text-[var(--color-charcoal)]" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search register text"
                aria-label="Search register text"
                className="min-h-8 w-52 bg-transparent px-2 text-[13px] outline-none"
              />
            </form>
          }
        >
          {list.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
              {searching ? "No pages matched." : "No register pages captured yet."}
            </p>
          ) : (
            [...byDate.entries()].map(([date, datePages]) => (
              <div key={date}>
                <p className="num border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-1.5 text-[12px] font-semibold">
                  {date === "undated" ? "No date tagged" : formatDate(date)}
                  <span className="ml-2 font-normal text-[var(--color-charcoal)]">
                    {datePages.length} {datePages.length === 1 ? "page" : "pages"}
                  </span>
                </p>
                <ul className="grid grid-cols-2 gap-px bg-[var(--color-border)] sm:grid-cols-3 xl:grid-cols-5">
                  {datePages.map((p) => {
                    const url = urlByPath.get(p.storage_path) ?? null;
                    const isImage = /\.(jpe?g|png|webp)$/i.test(p.storage_path);
                    const status = OCR_STATUS[p.ocr_status ?? "pending"];
                    return (
                      <li key={p.id} className="bg-[var(--color-background)]">
                        <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block hover:opacity-90">
                          {url && isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                            <img src={url} alt="" loading="lazy" className="h-40 w-full object-cover" />
                          ) : (
                            <div className="flex h-40 items-center justify-center bg-[var(--color-surface-1)]">
                              <FilePdf size={36} className="text-[var(--color-charcoal)]" aria-hidden />
                            </div>
                          )}
                        </a>
                        <div className="p-2">
                          <Tag tone={status.tone}>{status.label}</Tag>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </Panel>
      </div>
    </>
  );
}
