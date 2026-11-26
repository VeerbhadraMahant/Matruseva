"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Files, UploadSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { preprocessImage, recognizeImage, extractPdfText, renderPdfPreview } from "@/lib/ocr";
import type { DocSource, DocType } from "@/lib/supabase/enums";
import { useT } from "@/lib/i18n/provider";
import { createUuid } from "@/lib/uuid";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { uploadDemoDocumentAction } from "@/app/(app)/documents/actions";
import { Tag, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

interface UploadItem {
  fileName: string;
  status: "uploading" | "ocr" | "done" | "failed";
}

function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "application/pdf" ? "pdf" : "jpg";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
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
}

export function DocumentUploader({
  clinicId,
  folder = "inbox",
  fixedDocType,
  showDateInput = false,
  isDemo = false,
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

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const setStatus = (status: UploadItem["status"]) =>
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status } : it)));

      try {
        const isPdf = file.type === "application/pdf";
        const uploadBlob = isPdf ? file : await preprocessImage(file);

        if (isDemo) {
          setStatus("ocr");
          let text = "";
          try {
            text = isPdf ? await extractPdfText(file) : await recognizeImage(uploadBlob);
          } catch {
            // OCR failure shouldn't block the upload
          }

          const dataUrl = isPdf ? await renderPdfPreview(file).catch(() => "") : await blobToDataUrl(uploadBlob);
          const res = await uploadDemoDocumentAction({
            clinicId,
            folder,
            fixedDocType,
            docDate,
            source: isPdf ? "pdf" : source,
            fileName: file.name,
            dataUrl,
            ocrText: text,
          });

          if (res.error) throw new Error(res.error);
          setStatus("done");
          continue;
        }

        const path = `${clinicId}/${folder}/${createUuid()}.${extOf(file)}`;

        if (!supabase) return;
        const { error: uploadError } = await supabase.storage.from("documents").upload(path, uploadBlob, {
          contentType: isPdf ? "application/pdf" : "image/jpeg",
        });
        if (uploadError) throw uploadError;

        const { data: doc, error: insertError } = await supabase
          .from("documents")
          .insert({
            clinic_id: clinicId,
            doc_type: fixedDocType ?? "other",
            doc_date: docDate || null,
            source: isPdf ? "pdf" : source,
            storage_path: path,
            ocr_status: "pending",
          })
          .select("id")
          .single();
        if (insertError || !doc) throw insertError;

        setStatus("ocr");
        let text = "";
        try {
          text = isPdf ? await extractPdfText(file) : await recognizeImage(uploadBlob);
        } catch {
          // OCR failure shouldn't block the upload — the document is still
          // filed and searchable by whatever tags staff add manually.
        }

        await supabase
          .from("documents")
          .update({ ocr_text: text || null, ocr_status: text ? "done" : "failed" })
          .eq("id", doc.id);

        setStatus("done");
      } catch {
        setStatus("failed");
      }
    }

    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  const [dragging, setDragging] = useState(false);
  const finished = items.filter((it) => it.status === "done" || it.status === "failed").length;
  const STATUS_TONE = { uploading: "neutral", ocr: "info", done: "ok", failed: "critical" } as const;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-[var(--radius-cards)] border-2 border-dashed p-5 transition-colors duration-150 ${
        dragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface-1)]/60"
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <UploadSimple size={28} className="text-[var(--color-primary)]" aria-hidden />
        <p className="text-[14px] font-medium">{dragging ? t("documents.uploader.dropActive") : t("documents.uploader.drop")}</p>

        <div className="flex w-full flex-wrap justify-center gap-2">
          <input
            id={`${fileInputId}-camera`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = ""; // FileList was copied synchronously; allows re-taking the same photo
            }}
            className="peer/cam sr-only"
          />
          <label
            htmlFor={`${fileInputId}-camera`}
            className={`${buttonPrimary} cursor-pointer max-sm:flex-1 peer-focus-visible/cam:outline-2`}
          >
            <Camera size={20} weight="regular" aria-hidden /> {t("documents.uploader.camera")}
          </label>
          <input
            ref={inputRef}
            id={fileInputId}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="peer/file sr-only"
          />
          <label htmlFor={fileInputId} className={`${buttonSecondary} cursor-pointer max-sm:flex-1 peer-focus-visible/file:outline-2`}>
            <Files size={20} weight="regular" aria-hidden /> {t("documents.uploader.choose")}
          </label>
        </div>
        <p className="max-w-md text-[12px] text-[var(--color-charcoal)]">
          {t(fixedDocType === "register_page" ? "opd.capture.hint" : "documents.uploader.hint")}
        </p>
      </div>

      {(!fixedDocType || showDateInput) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--color-border)]/70 pt-4">
          {!fixedDocType && (
            <div className="flex items-center gap-2">
              <label className="text-[13px] font-medium text-[var(--color-charcoal)]" htmlFor="doc-source">
                {t("documents.uploader.source")}
              </label>
              <select id="doc-source" value={source} onChange={(e) => setSource(e.target.value as DocSource)} className={`${inputClass} !w-auto`}>
                <option value="camera">{t("documents.uploader.sourceCamera")}</option>
                <option value="whatsapp">{t("documents.uploader.sourceWhatsapp")}</option>
                <option value="paper">{t("documents.uploader.sourcePaper")}</option>
              </select>
            </div>
          )}
          {showDateInput && (
            <div className="flex items-center gap-2">
              <label className="text-[13px] font-medium text-[var(--color-charcoal)]" htmlFor="doc-date">
                {t("documents.uploader.date")}
              </label>
              <input id="doc-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={`${inputClass} !w-auto`} />
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-2" aria-live="polite">
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={items.length}
              aria-valuenow={finished}
              aria-label={t("documents.uploader.progress", { done: finished, total: items.length })}
              className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
            >
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200 ease-[var(--ease-out)]"
                style={{ width: `${(finished / items.length) * 100}%` }}
              />
            </div>
            <span className="num text-[12px] text-[var(--color-charcoal)]">
              {t("documents.uploader.progress", { done: finished, total: items.length })}
            </span>
          </div>
          <ul className="space-y-1.5 text-[13px]">
            {items.map((it, idx) => (
              <li key={`${idx}-${it.fileName}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{it.fileName}</span>
                <Tag tone={STATUS_TONE[it.status]}>
                  {it.status === "uploading" && t("documents.uploader.uploading")}
                  {it.status === "ocr" && t("documents.uploader.reading")}
                  {it.status === "done" && t("documents.uploader.done")}
                  {it.status === "failed" && t("documents.uploader.failed")}
                </Tag>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
