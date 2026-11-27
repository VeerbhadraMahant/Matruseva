"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, previewDataUrl, readDocument, renderPdfPreview, terminateOcrWorker, type OcrEngine, type OcrResult, type PreparedImage } from "@/lib/ocr";
import { saveOcrResult } from "@/lib/ocrSave";
import type { DocSource, DocType } from "@/lib/supabase/enums";
import { useT } from "@/lib/i18n/provider";
import { createUuid } from "@/lib/uuid";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { uploadDemoDocumentAction } from "@/app/(app)/documents/actions";

interface UploadItem {
  fileName: string;
  /** unread = stored fine, but no engine could read text (retry from the document card). */
  status: "uploading" | "ocr" | "done" | "unread" | "failed";
  engine?: OcrEngine;
  error?: string;
}

function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "application/pdf" ? "pdf" : "jpg";
}

interface DocumentUploaderProps {
  clinicId: string;
  /** e.g. "inbox" or "opd-register" — the second segment of the storage path. */
  folder?: string;
  /** When set, skips the source picker and always files uploads as this doc_type. */
  fixedDocType?: DocType;
  /** When true, shows a date field applied to every file in the batch (OPD register pages). */
  showDateInput?: boolean;
  /** When true, stores files locally in the demo store without hitting Supabase. */
  isDemo?: boolean;
  /** When set, files go straight to this patient instead of the inbox. */
  patientId?: string;
}

export function DocumentUploader({
  clinicId,
  folder = "inbox",
  fixedDocType,
  showDateInput = false,
  isDemo = false,
  patientId,
}: DocumentUploaderProps) {
  const t = useT();
  const router = useRouter();
  const fileInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<DocSource>("camera");
  const [docDate, setDocDate] = useState(() => showDateInput ? toISODate(todayInClinicTimezone()) : "");
  const [items, setItems] = useState<UploadItem[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = isDemo ? null : createClient();
    const fileArray = Array.from(files);
    setItems(fileArray.map((f) => ({ fileName: f.name, status: "uploading" })));

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const patch = (p: Partial<UploadItem>) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
        const isPdf = file.type === "application/pdf";
        const docSource: DocSource = isPdf ? "pdf" : source;

        // 1. Store the file and create the document row (pending). Anything wrong here is a real upload failure.
        let documentId: string;
        let prepared: PreparedImage | undefined;
        try {
          // The colour scan is stored; a separate normalised copy is only used for OCR.
          prepared = isPdf ? undefined : await prepareImage(file).catch(() => ({ stored: file, ocr: file }));
          const stored = prepared?.stored ?? file;

          if (isDemo) {
            const dataUrl = isPdf ? await renderPdfPreview(file).catch(() => "") : await previewDataUrl(stored).catch(() => "");
            const res = await uploadDemoDocumentAction({
              clinicId,
              folder,
              fixedDocType,
              docDate,
              source: docSource,
              fileName: file.name,
              dataUrl,
              patientId,
            });
            if (res.error || !res.id) throw new Error(res.error ?? "Upload failed");
            documentId = res.id;
          } else {
            if (!supabase) throw new Error("Not signed in");
            const ext = isPdf ? "pdf" : stored.type === "image/jpeg" ? "jpg" : extOf(file);
            const path = `${clinicId}/${patientId ?? folder}/${createUuid()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from("documents").upload(path, stored, {
              contentType: isPdf ? "application/pdf" : stored.type || "image/jpeg",
            });
            if (uploadError) throw uploadError;

            const { data: doc, error: insertError } = await supabase
              .from("documents")
              .insert({
                clinic_id: clinicId,
                patient_id: patientId ?? null,
                doc_type: fixedDocType ?? "other",
                doc_date: docDate || null,
                source: docSource,
                storage_path: path,
                ocr_status: "pending",
              })
              .select("id")
              .single();
            if (insertError || !doc) throw insertError ?? new Error("Could not create the document record");
            documentId = doc.id;
          }
        } catch (e) {
          patch({ status: "failed", error: e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Upload failed" });
          continue;
        }

        // The document now exists and shows in the list as "reading".
        router.refresh();
        patch({ status: "ocr" });

        // 2. Read it. A failure here keeps the document and marks it failed so it can be retried.
        let result: OcrResult | null = null;
        try {
          result = await readDocument(file, prepared);
        } catch {
          result = null;
        }
        const saveError = await saveOcrResult(isDemo, documentId, result);
        if (saveError) patch({ status: "failed", error: saveError });
        else patch({ status: result ? "done" : "unread", engine: result?.engine });
        router.refresh();
      }
    } finally {
      await terminateOcrWorker();
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-[var(--radius-cards)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)]/60 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {!fixedDocType && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor={`${fileInputId}-source`}>
              {t("documents.uploader.source")}
            </label>
            <select
              id={`${fileInputId}-source`}
              value={source}
              onChange={(e) => setSource(e.target.value as DocSource)}
              className="min-h-10 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1.5 text-sm"
            >
              <option value="camera">{t("documents.uploader.sourceCamera")}</option>
              <option value="whatsapp">{t("documents.uploader.sourceWhatsapp")}</option>
              <option value="paper">{t("documents.uploader.sourcePaper")}</option>
            </select>
          </div>
        )}
        {showDateInput && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor={`${fileInputId}-date`}>
              {t("documents.uploader.date")}
            </label>
            <input
              id={`${fileInputId}-date`}
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="min-h-10 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />
      <label
        htmlFor={fileInputId}
        className="flex min-h-10 w-full cursor-pointer flex-wrap items-center justify-center gap-2 rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-[var(--space-21)] py-[var(--space-14)] font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
      >
        <Camera size={20} weight="regular" aria-hidden /> {t("documents.uploader.button")}
      </label>
      <p className="mt-2 text-xs text-[var(--color-charcoal)]">
        {t(fixedDocType === "register_page" ? "opd.capture.hint" : "documents.uploader.hint")}
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
          {items.map((it, idx) => (
            <li key={`${idx}-${it.fileName}`} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{it.fileName}</span>
              <span className={it.status === "failed" ? "text-[var(--color-danger,#b42318)]" : "text-[var(--color-charcoal)]"}>
                {it.status === "uploading" && t("documents.uploader.uploading")}
                {it.status === "ocr" && t("documents.uploader.reading")}
                {it.status === "done" && `${t("documents.uploader.done")}${it.engine ? ` · ${t(`documents.engine.${it.engine}`)}` : ""}`}
                {it.status === "unread" && t("documents.uploader.unread")}
                {it.status === "failed" && `${t("documents.uploader.failed")}${it.error ? `: ${it.error}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
