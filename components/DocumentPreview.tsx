import { PdfThumbnail } from "@/components/PdfThumbnail";
import { FilePdf, FileText, ImageSquare } from "@phosphor-icons/react/dist/ssr";

export function DocumentPreview({
  url, path, title, text, className,
}: {
  url: string | null;
  path: string;
  title: string;
  text: string | null;
  className: string;
}) {
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
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {isPdf ? <PdfThumbnail url={url} title={title} className={className}>{preview}</PdfThumbnail> : preview}
    </a>
  );
}
