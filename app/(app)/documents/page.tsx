import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { DocumentPreview } from "@/components/DocumentPreview";
import { documentTypeLabel } from "@/lib/clinicalLabels";
import { DocumentUploader } from "@/components/DocumentUploader";
import { AssignDocumentForm } from "@/components/AssignDocumentForm";
import { ExtractedValues } from "@/components/ExtractedValues";
import { OcrRetryButton } from "@/components/OcrRetryButton";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { PageHeader, Panel, Tag, type Tone, pageBody } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { getDemoDocuments } from "@/lib/demo-data";

const OCR_STATUS = {
  pending: { labelKey: "documents.ocr.pending", tone: "neutral" },
  done: { labelKey: "documents.ocr.done", tone: "ok" },
  failed: { labelKey: "documents.ocr.failed", tone: "warning" },
  skipped: { labelKey: "documents.ocr.skipped", tone: "neutral" },
} as const satisfies Record<string, { labelKey: string; tone: Tone }>;

const SOURCE_KEY = {
  camera: "documents.sourceTag.camera",
  whatsapp: "documents.sourceTag.whatsapp",
  paper: "documents.sourceTag.paper",
  pdf: "documents.sourceTag.pdf",
} as const;

/** A "pending" row older than this had its browser tab closed mid-read; offer a retry instead of "Reading...". */
const STALLED_AFTER_MS = 3 * 60 * 1000;
const isStalled = (createdAt: string) => Date.now() - new Date(createdAt).getTime() > STALLED_AFTER_MS;
const PROCESSED_LIMIT = 24;
const LIST_COLUMNS = "id, doc_type, source, storage_path, ocr_status, ocr_text, created_at, patient_id, patients(name)";

interface DocRow {
  id: string;
  doc_type: string;
  source: string;
  storage_path: string;
  ocr_status: string | null;
  ocr_text: string | null;
  created_at: string;
  patient_id: string | null;
  patients?: { name: string } | null;
  data_url?: string | null;
  ocr_engine?: string | null;
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, me, { t, locale }] = await Promise.all([searchParams, getCurrentUser(), getT()]);
  const searching = Boolean(q && q.trim());
  // Demo sessions use the in-memory/persisted demo store; never hit Supabase.
  const supabase = me.isDemo ? null : await createClient();

  let inbox: DocRow[] = [];
  let processed: DocRow[] = [];
  if (me.isDemo) {
    const all = getDemoDocuments(undefined, q) as DocRow[];
    const filing = all.filter((d) => d.doc_type !== "register_page");
    inbox = searching ? all : filing.filter((d) => !d.patient_id);
    processed = searching ? [] : filing.filter((d) => d.patient_id).slice(0, PROCESSED_LIMIT);
  } else if (supabase) {
    const base = () => supabase.from("documents").select(LIST_COLUMNS).order("created_at", { ascending: false });
    const [inboxRes, processedRes] = await Promise.all([
      searching
        ? base().textSearch("search", q!, { type: "websearch", config: "simple" }).limit(50)
        : base().is("patient_id", null).neq("doc_type", "register_page").limit(50),
      searching ? null : base().not("patient_id", "is", null).neq("doc_type", "register_page").limit(PROCESSED_LIMIT),
    ]);
    inbox = (inboxRes.data ?? []) as unknown as DocRow[];
    processed = (processedRes?.data ?? []) as unknown as DocRow[];
  }

  const all = [...inbox, ...processed];
  const { data: signed } = supabase && all.length
    ? await supabase.storage.from("documents").createSignedUrls(all.map((d) => d.storage_path), 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const card = (doc: DocRow) => {
    const url = me.isDemo ? (doc.data_url ?? null) : (urlByPath.get(doc.storage_path) ?? null);
    const stalled = doc.ocr_status === "pending" && isStalled(doc.created_at);
    const status = OCR_STATUS[(doc.ocr_status ?? "pending") as keyof typeof OCR_STATUS] ?? OCR_STATUS.pending;
    const statusLabel = stalled ? t("documents.ocr.stalled") : t(status.labelKey);
    const sourceKey = SOURCE_KEY[doc.source as keyof typeof SOURCE_KEY];
    const canRetry = Boolean(url) && (stalled || doc.ocr_status === "failed" || doc.ocr_status === "skipped");
    return (
      <li key={doc.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
        <DocumentPreview url={url} path={doc.storage_path} title={documentTypeLabel(doc.doc_type, t)} text={doc.ocr_text} className="h-44" />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="num text-[var(--color-charcoal)]">{formatShortDate(doc.created_at, locale)}</span>
            <span className="text-[var(--color-charcoal)]">· {sourceKey ? t(sourceKey) : doc.source}</span>
            <Tag tone={stalled ? "warning" : status.tone}>{statusLabel}</Tag>
            {doc.ocr_engine && doc.ocr_status === "done" && (
              <span className="text-[var(--color-charcoal)]">· {t(`documents.engine.${doc.ocr_engine as "sarvam" | "tesseract" | "pdf-text"}`)}</span>
            )}
            {doc.patient_id && doc.patients?.name && (
              <Link href={`/patients/${doc.patient_id}`}>
                <Tag tone="info">{doc.patients.name}</Tag>
              </Link>
            )}
          </div>
          <ExtractedValues text={doc.ocr_text} />
          {((canRetry && url) || me.role === "doctor") && (
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
              {canRetry && url ? (
                <OcrRetryButton documentId={doc.id} url={url} path={doc.storage_path} isDemo={Boolean(me.isDemo)} />
              ) : (
                <span />
              )}
              {me.role === "doctor" && <DeleteDocumentButton documentId={doc.id} />}
            </div>
          )}
          {!doc.patient_id && <AssignDocumentForm documentId={doc.id} />}
        </div>
      </li>
    );
  };

  const grid = "grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3";
  const empty = (key: string) => <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">{t(key as "documents.empty.inbox")}</p>;

  return (
    <>
      <PageHeader title={t("documents.title")} meta={t("documents.meta")} />

      <div className={pageBody}>
        <Panel title={t("documents.upload.panel")}>
          <div className="p-4 pt-1">
            <DocumentUploader clinicId={me.clinicId} isDemo={me.isDemo} />
          </div>
        </Panel>

        <Panel
          title={searching ? t("documents.results", { query: q ?? "" }) : t("documents.inbox")}
          count={inbox.length}
          action={
            <form action="/documents" className="flex items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] focus-within:border-[var(--color-primary)]">
              <MagnifyingGlass size={15} className="ml-2 text-[var(--color-charcoal)]" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder={t("documents.search.placeholder")}
                aria-label={t("documents.search.aria")}
                className="min-h-9 w-56 border-0 bg-transparent px-2 text-[13px] shadow-none outline-none focus:shadow-none"
              />
            </form>
          }
        >
          {inbox.length === 0 ? empty(searching ? "documents.empty.search" : "documents.empty.inbox") : <ul className={grid}>{inbox.map(card)}</ul>}
        </Panel>

        {!searching && (
          <Panel title={t("documents.processed")} count={processed.length}>
            {processed.length === 0 ? empty("documents.empty.processed") : <ul className={grid}>{processed.map(card)}</ul>}
          </Panel>
        )}
      </div>
    </>
  );
}
