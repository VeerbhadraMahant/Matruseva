"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryOcr } from "@/lib/ocrSave";
import { useT } from "@/lib/i18n/provider";

/** Re-reads a stored document whose OCR failed, was interrupted, or never ran. */
export function OcrRetryButton({ documentId, url, path, isDemo }: { documentId: string; url: string; path: string; isDemo: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await retryOcr(isDemo, documentId, url, path.split("/").pop() ?? "document");
    setBusy(false);
    if (res.error) setError(res.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="min-h-9 self-start rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] px-3 text-[13px] font-medium hover:bg-[var(--color-surface-1)] disabled:opacity-60"
      >
        {busy ? t("documents.uploader.reading") : t("documents.ocr.retry")}
      </button>
      {error && <p role="alert" className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}
