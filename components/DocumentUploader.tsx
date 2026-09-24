"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { preprocessImage, recognizeImage, extractPdfText } from "@/lib/ocr";
import type { DocSource } from "@/lib/supabase/enums";

interface UploadItem {
  fileName: string;
  status: "uploading" | "ocr" | "done" | "failed";
}

function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "application/pdf" ? "pdf" : "jpg";
}

export function DocumentUploader({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<DocSource>("camera");
  const [items, setItems] = useState<UploadItem[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = createClient();
    const fileArray = Array.from(files);
    setItems(fileArray.map((f) => ({ fileName: f.name, status: "uploading" })));

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const setStatus = (status: UploadItem["status"]) =>
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status } : it)));

      try {
        const isPdf = file.type === "application/pdf";
        const uploadBlob = isPdf ? file : await preprocessImage(file);
        const path = `${clinicId}/inbox/${crypto.randomUUID()}.${extOf(file)}`;

        const { error: uploadError } = await supabase.storage.from("documents").upload(path, uploadBlob, {
          contentType: isPdf ? "application/pdf" : "image/jpeg",
        });
        if (uploadError) throw uploadError;

        const { data: doc, error: insertError } = await supabase
          .from("documents")
          .insert({
            clinic_id: clinicId,
            doc_type: "other",
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

  return (
    <div className="rounded-[var(--radius-cards)] border border-[var(--color-border)] p-[var(--space-21)]">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="doc-source">
          Source
        </label>
        <select
          id="doc-source"
          value={source}
          onChange={(e) => setSource(e.target.value as DocSource)}
          className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm"
        >
          <option value="camera">Photographed (case paper / register)</option>
          <option value="whatsapp">WhatsApp image</option>
          <option value="paper">Other paper</option>
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="block w-full text-sm"
      />
      <p className="mt-2 text-xs text-[var(--color-charcoal)]">
        Handwriting recognition is limited — tag documents by hand (patient, date, type) so they stay searchable.
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.fileName} className="flex justify-between">
              <span>{it.fileName}</span>
              <span className="text-[var(--color-charcoal)]">
                {it.status === "uploading" && "Uploading…"}
                {it.status === "ocr" && "Reading text…"}
                {it.status === "done" && "Done"}
                {it.status === "failed" && "Failed"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
