"use client";

import type { MotherCardData } from "@/components/MotherHealthCard";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer, Download, Heart, ShieldCheck, Calendar, Phone } from "@phosphor-icons/react";
import { OverlayShell } from "@/components/OverlayShell";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";



export function MotherHealthCardModal({
  patient,
  onClose,
}: {
  patient: MotherCardData;
  onClose: () => void;
}) {
  const t = useT();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate QR code pointing to patient profile
    const targetUrl = typeof window !== "undefined"
      ? `${window.location.origin}/patients/${patient.id}/report`
      : `/patients/${patient.id}/report`;

    // Payload can be scanned either as a direct URL or interpreted by our reception scanner
    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 1,
      color: {
        // shortcut: QR lib needs literal colours (cannot read CSS vars); matches --color-pc-ink and white.
        dark: "#221b2b",
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
    <>
    <OverlayShell
      title={t("patients.card.title")}
      subtitle={t("patients.card.subtitle")}
      closeLabel={t("patients.card.close")}
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto text-[13px] text-[var(--color-charcoal)]">{t("patients.card.printHint")}</p>
          <button type="button" onClick={handleDownload} className={buttonSecondary}>
            <Download size={16} aria-hidden />
            <span>{t("patients.card.saveQr")}</span>
          </button>
          <button type="button" onClick={handlePrint} className={buttonPrimary}>
            <Printer size={16} aria-hidden />
            <span>{t("patients.card.print")}</span>
          </button>
        </>
      }
    >
        {/* Printable Card Area */}
        <div>
          <div
            id="mother-health-card-print"
            ref={cardRef}
            className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-[var(--color-pc-lilac-strong)] bg-[var(--color-background)] p-5 shadow-[var(--shadow-card)] text-[var(--color-foreground)]"
          >
            {/* Watermark / Background Accent */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 opacity-5 text-[var(--color-pc-lilac-strong)]">
              <Heart size={160} weight="fill" />
            </div>

            {/* Top Clinic Branding */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-80.jpg"
                  width={32}
                  height={32}
                  loading="lazy"
                  alt="MatruSetu"
                  className="h-8 w-8 rounded-xl object-cover shadow-xs border border-[var(--color-pc-lilac-strong)]/40"
                />
                <div>
                  <p className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] leading-tight">
                    {patient.clinicName || t("patients.card.clinicFallback")}
                  </p>
                  <p className="text-[11px] font-medium text-[var(--color-charcoal)]">
                    {t("patients.card.passTitle")}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-surface)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary)] border border-[var(--color-pc-lilac-strong)]">
                  <ShieldCheck size={12} weight="fill" />
                  {t("patients.card.verified")}
                </span>
                {patient.clinicPatientNo && (
                  <p className="text-[11px] font-mono text-[var(--color-charcoal)] mt-0.5">#{patient.clinicPatientNo}</p>
                )}
              </div>
            </div>

            {/* Card Content: Details & QR Code */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-charcoal)]">{t("patients.card.motherName")}</p>
                  <h3 className="truncate text-[17px] font-bold tracking-tight text-[var(--color-foreground)] leading-snug">
                    {patient.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {patient.age && (
                    <div>
                      <p className="text-[11px] text-[var(--color-charcoal)]">{t("patients.card.age")}</p>
                      <p className="font-semibold text-[var(--color-foreground)]">{t("patients.card.ageYears", { age: patient.age })}</p>
                    </div>
                  )}

                  {patient.bloodGroup && (
                    <div>
                      <p className="text-[11px] text-[var(--color-charcoal)]">{t("patients.card.bloodGroup")}</p>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {patient.bloodGroup}
                        {patient.rhNegative ? " (Rh-)" : ""}
                      </p>
                    </div>
                  )}

                  {patient.gaLabel && (
                    <div>
                      <p className="text-[11px] text-[var(--color-charcoal)]">{t("patients.card.gestationalAge")}</p>
                      <p className="font-semibold text-[var(--color-primary)]">{patient.gaLabel}</p>
                    </div>
                  )}

                  {patient.edd && (
                    <div>
                      <p className="text-[11px] text-[var(--color-charcoal)]">{t("patients.card.edd")}</p>
                      <p className="font-semibold text-[var(--color-foreground)]">{patient.edd}</p>
                    </div>
                  )}
                </div>

                {patient.phone && (
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)] font-mono">
                    <Phone size={12} className="text-[var(--color-primary)]" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Right QR Code Box */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative rounded-xl border border-[var(--color-pc-lilac-strong)] bg-white p-2 shadow-xs">
                  {qrDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrDataUrl}
                      alt={t("patients.card.qrAlt", { name: patient.name })}
                      className="h-28 w-28 object-contain"
                    />
                  ) : (
                    <div className="h-28 w-28 animate-pulse rounded bg-[var(--color-surface-2)]" />
                  )}
                </div>
                <span className="mt-1 text-[11px] font-bold text-[var(--color-primary)]">
                  {t("patients.card.scanAtDesk")}
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-charcoal)]">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {t("patients.card.bringEveryVisit")}
              </span>
              <span className="font-mono text-[11px] opacity-75">{t("patients.card.idLabel", { id: patient.id.slice(0, 8).toUpperCase() })}</span>
            </div>
          </div>
        </div>

    </OverlayShell>
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
            border: 2px solid var(--color-primary) !important;
            width: 400px !important;
            max-width: 90% !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
