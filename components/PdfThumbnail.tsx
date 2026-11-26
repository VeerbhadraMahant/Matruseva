"use client";

import { useEffect, useRef, useState } from "react";

export function PdfThumbnail({ url, title, className, children }: {
  url: string;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [thumbnail, setThumbnail] = useState<{ url: string; image: string } | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let mounted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void import("@/lib/ocr").then(({ renderPdfPreview }) => renderPdfPreview(url))
        .then((image) => { if (mounted) setThumbnail({ url, image }); })
        .catch(() => {});
    });
    observer.observe(element);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [url]);

  return (
    <div ref={container}>
      {thumbnail?.url === url ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated from a private PDF
        <img src={thumbnail.image} alt={title} className={`w-full object-cover ${className}`} />
      ) : children}
    </div>
  );
}
