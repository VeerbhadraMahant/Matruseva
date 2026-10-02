"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, WarningCircle, Image as ImageIcon, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${primary ? buttonPrimary : buttonSecondary} gap-1.5 ${className}`}
        title="Scan Mother's QR Health Card at Reception"
      >
        <Camera size={16} weight="bold" className={primary ? "" : "text-[var(--color-primary)]"} />
        <span>Scan Card</span>
      </button>

      {isOpen && <QRScannerModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function QRScannerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDetected = useCallback((decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    playBeep();

    let patientId = decodedText.trim();

    // Check if it's a URL like https://.../patients/[id] or /patients/[id]
    if (patientId.includes("/patients/")) {
      const parts = patientId.split("/patients/");
      if (parts[1]) {
        patientId = parts[1].split("?")[0].split("/")[0].trim();
      }
    } else {
      // Check if it's JSON
      try {
        const parsed = JSON.parse(patientId);
        if (parsed?.id) patientId = parsed.id;
      } catch {
        // Raw ID or patient number
      }
    }

    setScannedId(patientId);

    // Stop scanner
    if (scannerRef.current) {
      try {
        (scannerRef.current as { stop?: () => Promise<void> }).stop?.();
      } catch (err) {
        console.error(err);
      }
    }

    setTimeout(() => {
      onClose();
      router.push(`/patients/${patientId}`);
    }, 600);
  }, [isProcessing, onClose, router]);

  useEffect(() => {
    let html5QrCode: unknown = null;

    // Dynamically import html5-qrcode
    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
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
            handleDetected(decodedText);
          },
          () => {
            // Frame scan without code — quiet ignore
          }
        );
      })
      .catch((err) => {
        console.warn("Camera start failed:", err);
        setError("Camera access unavailable or permission denied. You can upload an image of the QR card below.");
      });

    return () => {
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
  }, [handleDetected]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = new Html5Qrcode("reader-temp-file");
      const result = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleDetected(result);
    } catch (err) {
      console.error(err);
      setError("Could not find a valid QR code in this image. Please ensure the code is clear and well-lit.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onClose();
    router.push(`/patients/${manualInput.trim()}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan Mother's Health Card"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--color-background)] shadow-2xl overflow-hidden border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <Camera size={16} weight="bold" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--color-foreground)]">Scan Mother&apos;s Health Card</h2>
              <p className="text-[11px] text-[var(--color-charcoal)]">OPD Fast-Track Check-in</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {scannedId ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
                <CheckCircle size={36} weight="fill" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-foreground)]">Mother Card Detected!</h3>
                <p className="text-xs text-[var(--color-charcoal)] font-mono mt-0.5">Opening patient timeline...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div className="relative mx-auto w-full aspect-square max-w-[280px] overflow-hidden rounded-xl border-2 border-dashed border-[#baadca] bg-[#1c1528] flex items-center justify-center">
                <div id="reader" className="w-full h-full" />
                <div id="reader-temp-file" className="hidden" />

                {/* Animated viewfinder guide */}
                <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-[#baadca] opacity-70">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-white" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* Upload QR Image Fallback */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
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
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <ImageIcon size={15} />
                  <span>Upload QR Card photo (WhatsApp)</span>
                </button>

                <span className="text-[11px] text-[var(--color-charcoal)]">or enter ID</span>
              </div>

              {/* Manual Input Fallback */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter UHID or Patient ID..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="min-h-9 flex-1 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button type="submit" className={buttonPrimary}>
                  <span>Go</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
