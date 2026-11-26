"use client";

import { resolvePatientCard } from "@/app/(app)/patients/actions";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, WarningCircle, Image as ImageIcon, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary, iconButton, inputClass } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {
    // Audio might fail if autoplay policy blocks it without prior user gesture
  }
}

export function ScanQRCardButton({ className = "", primary = false }: { className?: string; primary?: boolean }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${primary ? buttonPrimary : buttonSecondary} gap-1.5 ${className}`}
        title={t("patients.qr.buttonTitle")}
      >
        <Camera size={16} weight="bold" className={primary ? "" : "text-[var(--color-primary)]"} />
        <span>{t("patients.qr.button")}</span>
      </button>

      {isOpen && <QRScannerModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function QRScannerModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processing = useRef(false);
  const scannerRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDetected = useCallback(async (decodedText: string) => {
    if (processing.current) return;
    processing.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const patientId = await resolvePatientCard(decodedText);
      if (!patientId) {
        setError(t("patients.qr.noPatient"));
        return;
      }
      playBeep();
      setScannedId(patientId);
      router.push(`/patients/${encodeURIComponent(patientId)}`);
      onClose();
    } catch {
      setError(t("patients.qr.lookupError"));
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  }, [onClose, router, t]);

  useEffect(() => {
    let html5QrCode: unknown = null;
    let isMounted = true;

    // Dynamically import html5-qrcode
    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (!isMounted || !document.getElementById("reader")) return;
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        return (html5QrCode as { start: (config: unknown, options: unknown, onSuccess: (text: string) => void, onError: (err: unknown) => void) => Promise<void> }).start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            void handleDetected(decodedText);
          },
          () => {
            // Frame scan without code — quiet ignore
          }
        );
      })
      .catch((err) => {
        console.warn("Camera start failed:", err);
        if (isMounted) setError((current) => current ?? t("patients.qr.cameraError"));
      });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          (scannerRef.current as { stop?: () => Promise<void>; clear?: () => void }).stop?.()
            .catch(() => {})
            .finally(() => {
              (scannerRef.current as { clear?: () => void }).clear?.();
            });
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [handleDetected, t]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("reader-temp-file");
      const result = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      await handleDetected(result);
    } catch (err) {
      console.error(err);
      setError(t("patients.qr.fileError"));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    void handleDetected(manualInput);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("patients.qr.dialogLabel")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-foreground)]/50 md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[100dvh] w-full max-w-md animate-[pc-sheet_260ms_var(--ease-out)_both] flex-col overflow-hidden rounded-t-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)] motion-reduce:animate-none md:animate-[pc-pop_var(--dur)_var(--ease-out)_both] md:rounded-[var(--radius-cards)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 md:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <Camera size={16} weight="bold" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-foreground)]">{t("patients.qr.title")}</h2>
              <p className="text-[12px] text-[var(--color-charcoal)]">{t("patients.qr.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("patients.qr.close")}
            className={iconButton}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
          {scannedId ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]">
                <CheckCircle size={36} weight="fill" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--color-foreground)]">{t("patients.qr.detected")}</h3>
                <p className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{t("patients.qr.opening")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[var(--radius-cards)] bg-[var(--color-pc-ink)]">
                <div id="reader" className="w-full h-full" />
                <div id="reader-temp-file" className="hidden" />

                {/* Viewfinder guide: corner brackets mark where the code should sit */}
                <div className="pointer-events-none absolute inset-6 rounded-lg border border-[var(--color-pc-lilac-strong)]/50">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[var(--color-pc-card)]" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[var(--color-pc-card)]" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[var(--color-pc-card)]" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[var(--color-pc-card)]" />
                </div>
              </div>

              <p className="text-center text-[13px] text-[var(--color-charcoal)]">{t("patients.qr.frameHint")}</p>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-buttons)] border border-[var(--color-due)]/40 bg-[var(--color-due-surface)] p-3 text-[13px] font-medium text-[var(--color-due)]">
                  <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <div>{error}</div>
                </div>
              )}

              {/* Upload QR Image Fallback */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary)] hover:underline md:min-h-10"
                >
                  <ImageIcon size={16} aria-hidden />
                  <span>{t("patients.qr.upload")}</span>
                </button>

                <span className="text-[12px] text-[var(--color-charcoal)]">{t("patients.qr.orEnterId")}</span>
              </div>

              {/* Manual Input Fallback */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("patients.qr.idPlaceholder")}
                  aria-label={t("patients.qr.idPlaceholder")}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <button type="submit" className={buttonPrimary} disabled={isProcessing}>
                  <span>{t("patients.qr.go")}</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
