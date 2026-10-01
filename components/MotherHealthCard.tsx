"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Printer, Download, X, Heart, ShieldCheck, Calendar, Phone } from "@phosphor-icons/react";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

export interface MotherCardData {
  id: string;
  name: string;
  clinicPatientNo?: string | null;
  age?: number | null;
  phone?: string | null;
  altPhone?: string | null;
  bloodGroup?: string | null;
  rhNegative?: boolean;
  edd?: string | null;
  gaLabel?: string | null;
  gravida?: number | null;
  para?: number | null;
  clinicName?: string;
}

export function MotherHealthCardButton({ patient }: { patient: MotherCardData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${buttonSecondary} gap-1.5`}
        title="View and print Mother's QR Health ID Card"
      >
        <QrCode size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
        <span>Health Card & QR</span>
      </button>

      {isOpen && <MotherHealthCardModal patient={patient} onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function MotherHealthCardModal({
  patient,
  onClose,
}: {
  patient: MotherCardData;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate QR code pointing to patient profile
    const targetUrl = typeof window !== "undefined"
      ? `${window.location.origin}/patients/${patient.id}`
      : `/patients/${patient.id}`;

    // Payload can be scanned either as a direct URL or interpreted by our reception scanner
    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: "#1c1528",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [patient.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${patient.name.replace(/\s+/g, "_")}_${patient.clinicPatientNo || "Card"}.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mother's Digital Health Card"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--color-background)] shadow-2xl overflow-hidden border border-[var(--color-border)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <QrCode size={16} weight="bold" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--color-foreground)]">Mother & Child QR Health Pass</h2>
              <p className="text-[11px] text-[var(--color-charcoal)]">OPD Fast-Track Check-in ID</p>
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

        {/* Printable Card Area */}
        <div className="p-6">
          <div
            id="mother-health-card-print"
            ref={cardRef}
            className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-[#baadca] bg-gradient-to-br from-[#ffffff] via-[#f8f6fb] to-[#efe9f5] p-5 shadow-lg text-[var(--color-foreground)]"
            style={{
              boxShadow: "0 10px 25px -5px rgba(82, 58, 108, 0.12), 0 8px 10px -6px rgba(82, 58, 108, 0.08)",
            }}
          >
            {/* Watermark / Background Accent */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 opacity-5 text-[#baadca]">
              <Heart size={160} weight="fill" />
            </div>

            {/* Top Clinic Branding */}
            <div className="flex items-center justify-between border-b border-[#e2d9ec] pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#523a6c] text-white font-bold text-xs shadow-xs">
                  MS
                </div>
                <div>
                  <p className="text-[13px] font-bold tracking-tight text-[#1c1528] leading-tight">
                    {patient.clinicName || "MatruSetu Maternal Health"}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#645a70]">
                    Mother & Child Health Pass
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ede5f4] px-2.5 py-0.5 text-[10px] font-bold text-[#523a6c] border border-[#baadca]">
                  <ShieldCheck size={12} weight="fill" />
                  VERIFIED
                </span>
                {patient.clinicPatientNo && (
                  <p className="text-[10px] font-mono text-[#645a70] mt-0.5">#{patient.clinicPatientNo}</p>
                )}
              </div>
            </div>

            {/* Card Content: Details & QR Code */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#645a70]">Mother's Name</p>
                  <h3 className="truncate text-[17px] font-bold tracking-tight text-[#1c1528] leading-snug">
                    {patient.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {patient.age && (
                    <div>
                      <p className="text-[10px] text-[#645a70]">Age</p>
                      <p className="font-semibold text-[#1c1528]">{patient.age} yrs</p>
                    </div>
                  )}

                  {patient.bloodGroup && (
                    <div>
                      <p className="text-[10px] text-[#645a70]">Blood Group</p>
                      <p className="font-semibold text-[#1c1528]">
                        {patient.bloodGroup}
                        {patient.rhNegative ? " (Rh-)" : ""}
                      </p>
                    </div>
                  )}

                  {patient.gaLabel && (
                    <div>
                      <p className="text-[10px] text-[#645a70]">Gestational Age</p>
                      <p className="font-semibold text-[#523a6c]">{patient.gaLabel}</p>
                    </div>
                  )}

                  {patient.edd && (
                    <div>
                      <p className="text-[10px] text-[#645a70]">Est. Due Date (EDD)</p>
                      <p className="font-semibold text-[#1c1528]">{patient.edd}</p>
                    </div>
                  )}
                </div>

                {patient.phone && (
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#645a70] font-mono">
                    <Phone size={12} className="text-[#523a6c]" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Right QR Code Box */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative rounded-xl border border-[#baadca] bg-white p-2 shadow-xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${patient.name}`}
                      className="h-28 w-28 object-contain"
                    />
                  ) : (
                    <div className="h-28 w-28 animate-pulse rounded bg-[#f0ecf5]" />
                  )}
                </div>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#523a6c]">
                  Scan at OPD Desk
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 pt-2.5 border-t border-[#e2d9ec] flex items-center justify-between text-[10px] text-[#645a70]">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Bring to every OPD visit
              </span>
              <span className="font-mono text-[9px] opacity-75">ID: {patient.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-6 py-4">
          <p className="text-[12px] text-[var(--color-charcoal)]">
            Print this card or save the QR image to share on WhatsApp with the mother.
          </p>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDownload} className={buttonSecondary}>
              <Download size={14} />
              <span>Save QR Image</span>
            </button>
            <button type="button" onClick={handlePrint} className={buttonPrimary}>
              <Printer size={14} />
              <span>Print Health Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the health card */
          body * {
            visibility: hidden !important;
          }
          #mother-health-card-print,
          #mother-health-card-print * {
            visibility: visible !important;
          }
          #mother-health-card-print {
            position: fixed !important;
            left: 50% !important;
            top: 20% !important;
            transform: translate(-50%, 0) !important;
            box-shadow: none !important;
            border: 2px solid #523a6c !important;
            width: 400px !important;
            max-width: 90% !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
