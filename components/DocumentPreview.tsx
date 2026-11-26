"use client";

import { useEffect, useRef, useState } from "react";
import { PdfThumbnail } from "@/components/PdfThumbnail";
import { FilePdf, FileText, ImageSquare, X, ArrowSquareOut } from "@phosphor-icons/react";
import { useT } from "@/lib/i18n/provider";
import { buttonSecondary, iconButton } from "@/components/ui";

function PreviewOverlay({ src, title, href, onClose }: { src: string; title: string; href: string; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="pc-pop fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden rounded-[var(--radius-sections)] border border-[var(--color-border)] bg-[var(--color-background)] p-0 text-[var(--color-foreground)] shadow-[var(--shadow-overlay)] backdrop:bg-[var(--color-pc-ink)]/50"
    >
      <div className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] px-4">
        <h2 className="truncate text-[15px] font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <a href={href} target="_blank" rel="noreferrer" className={buttonSecondary}>
            <ArrowSquareOut size={16} aria-hidden /> {t("documents.preview.open")}
          </a>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className={iconButton}>
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>
      <div className="max-h-[calc(92dvh-3.5rem)] overflow-auto bg-[var(--color-surface-1)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private storage URL */}
        <img src={src} alt={title} className="mx-auto block max-w-full" />
      </div>
    </dialog>
  );
}

export function DocumentPreview({
  url, path, title, text, className,
}: {
  url: string | null;
  path: string;
  title: string;
  text: string | null;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const isImage = /\.(jpe?g|png|webp)$/i.test(path);
  const isPdf = /\.pdf$/i.test(path);
  const isRasterPreview = Boolean(url?.startsWith("data:image/"));
  const Icon = isImage ? ImageSquare : isPdf ? FilePdf : FileText;
  const preview = url && (isImage || isRasterPreview) ? (
    // eslint-disable-next-line @next/next/no-img-element -- short-lived private storage URL
    <img src={url} alt={title} loading="lazy" className={`w-full object-cover ${className}`} />
  ) : (
    <div className={`flex flex-col justify-center gap-2 overflow-hidden bg-[var(--color-surface-1)] px-4 py-3 ${className}`}>
      <span className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon size={22} className="shrink-0 text-[var(--color-charcoal)]" aria-hidden /> {title}
      </span>
      {text && <p className="line-clamp-3 text-[12px] text-[var(--color-charcoal)]">{text.slice(0, 200)}</p>}
    </div>
  );
  if (!url || (isPdf && isRasterPreview)) return preview;
  if (!isImage && !isRasterPreview) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {isPdf ? <PdfThumbnail url={url} title={title} className={className}>{preview}</PdfThumbnail> : preview}
      </a>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={title} className="block w-full text-left">
        {preview}
      </button>
      {open && <PreviewOverlay src={url} title={title} href={url} onClose={() => setOpen(false)} />}
    </>
  );
}
