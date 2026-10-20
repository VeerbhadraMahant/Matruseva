"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Warning, PhoneCall, Printer, X, ShieldWarning } from "@phosphor-icons/react";

export interface EmergencyReferralData {
  patientId: string;
  patientName: string;
  clinicPatientNo?: string | null;
  age?: number | null;
  phone?: string | null;
  bloodGroup?: string | null;
  rhNegative?: boolean;
  edd?: string | null;
  gaWeeks?: number | null;
  gravida?: number | null;
  para?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  hb?: number | null;
  fhr?: number | null;
  riskReasons?: string[];
  clinicName?: string;
}

export function EmergencyReferralButton({ data }: { data: EmergencyReferralData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-1.5 text-[12px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-xs transition"
        title="Generate Government FRU Emergency Referral Slip & 108 Dispatch Pass"
      >
        <ShieldWarning size={16} weight="fill" className="text-rose-600 animate-pulse" />
        <span>1-Click Emergency Referral Slip</span>
      </button>

      {isOpen && <EmergencyReferralModal data={data} onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function EmergencyReferralModal({
  data,
  onClose,
}: {
  data: EmergencyReferralData;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [referralCenter, setReferralCenter] = useState("District Hospital / First Referral Unit (FRU)");
  const [mgso4Given, setMgso4Given] = useState(Boolean((data.bpSys && data.bpSys >= 160) || (data.bpDia && data.bpDia >= 110)));
  const [nifedipineGiven, setNifedipineGiven] = useState(Boolean(data.bpSys && data.bpSys >= 140));
  const [ivCannulaGiven, setIvCannulaGiven] = useState(true);
  const [oxygenGiven, setOxygenGiven] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://matruseva.vercel.app"}/patients/${data.patientId}`;
    QRCode.toDataURL(url, { width: 140, margin: 1 }, (err, urlString) => {
      if (!err && urlString) setQrDataUrl(urlString);
    });
  }, [data.patientId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="High Risk Emergency Referral Slip"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-2xl rounded-2xl bg-[var(--color-background)] border border-rose-300 dark:border-rose-900 shadow-2xl overflow-hidden">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-rose-500 text-white px-5 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldWarning size={20} weight="fill" />
            <span className="text-[14px] font-bold">Government FRU Emergency Referral Pass</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1 text-[12px] font-semibold text-white transition"
            >
              <Printer size={15} weight="bold" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-white/20 text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Referral Slip Document */}
        <div ref={printRef} className="p-6 space-y-4 print:p-0 text-[var(--color-foreground)] bg-white text-black font-sans">
          {/* Header */}
          <div className="border-b-2 border-rose-600 pb-3 text-center space-y-1">
            <div className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">
              Ministry of Health & Family Welfare · Maternal Health Division
            </div>
            <h1 className="text-[18px] font-extrabold uppercase tracking-tight text-neutral-900">
              Emergency Obstetric Referral Slip (PMSMA / FRU)
            </h1>
            <p className="text-[12px] text-neutral-600">
              Issuing Health Facility: <strong>{data.clinicName || "MatruSetu Sub-Center / PHC"}</strong> · Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Critical Danger Flags Banner */}
          <div className="rounded-xl border-2 border-rose-600 bg-rose-50 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-[13px] uppercase">
              <Warning size={18} weight="fill" className="text-rose-600" />
              <span>Urgent Clinical Indication for Referral</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {data.bpSys && data.bpSys >= 140 && (
                <span className="rounded-md bg-rose-600 text-white font-bold px-2.5 py-0.5 text-[11px]">
                  Severe Hypertension: {data.bpSys}/{data.bpDia || 90} mmHg
                </span>
              )}
              {data.hb && data.hb < 7 && (
                <span className="rounded-md bg-rose-600 text-white font-bold px-2.5 py-0.5 text-[11px]">
                  Severe Anemia: {data.hb} g/dL
                </span>
              )}
              {data.rhNegative && (
                <span className="rounded-md bg-rose-600 text-white font-bold px-2.5 py-0.5 text-[11px]">
                  Rh Negative Pregnancy
                </span>
              )}
              {(data.riskReasons ?? []).map((r, i) => (
                <span key={i} className="rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-semibold px-2 py-0.5 text-[11px]">
                  {r}
                </span>
              ))}
              {!data.bpSys && !data.hb && (
                <span className="rounded-md bg-rose-600 text-white font-bold px-2.5 py-0.5 text-[11px]">
                  High Risk Pregnancy Alert (Urgent Evaluation Required)
                </span>
              )}
            </div>
          </div>

          {/* Two-Column Patient & Clinical Summary */}
          <div className="grid grid-cols-3 gap-4 border border-neutral-300 rounded-xl p-3.5 text-[12px]">
            <div className="space-y-1">
              <div className="text-neutral-500 font-medium">Mother Name</div>
              <div className="font-bold text-[14px] text-neutral-900">{data.patientName}</div>
              <div className="text-neutral-600">Age: <strong>{data.age ?? "—"} yrs</strong></div>
              <div className="text-neutral-600">RCH / Reg: <strong>{data.clinicPatientNo || "—"}</strong></div>
            </div>

            <div className="space-y-1">
              <div className="text-neutral-500 font-medium">Obstetric History</div>
              <div className="text-neutral-800">
                Gestational Age: <strong>{data.gaWeeks ? `${data.gaWeeks} weeks` : "—"}</strong>
              </div>
              <div className="text-neutral-800">Gravida: <strong>G{data.gravida ?? 1} P{data.para ?? 0}</strong></div>
              <div className="text-neutral-800">
                Blood Group: <strong className="text-rose-700">{data.bloodGroup || "—"} {data.rhNegative ? "(Rh Neg)" : ""}</strong>
              </div>
              <div className="text-neutral-800">EDD: <strong>{data.edd || "—"}</strong></div>
            </div>

            <div className="flex flex-col items-center justify-center border-l border-neutral-200 pl-2 text-center">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Patient Medical QR Pass" className="h-20 w-20 border border-neutral-300 rounded-lg p-0.5" />
              )}
              <span className="text-[10px] text-neutral-500 mt-1">Scan for Digital History</span>
            </div>
          </div>

          {/* Pre-Referral Stabilization Measures Given */}
          <div className="space-y-2">
            <div className="text-[12px] font-bold uppercase tracking-wider text-neutral-800">
              Pre-Referral Stabilization Administered by Health Worker:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] border border-neutral-200 rounded-xl p-3 bg-neutral-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nifedipineGiven}
                  onChange={(e) => setNifedipineGiven(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Tab Nifedipine 10mg orally</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mgso4Given}
                  onChange={(e) => setMgso4Given(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Inj. Magnesium Sulfate (MgSO4) 4g IV/IM</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ivCannulaGiven}
                  onChange={(e) => setIvCannulaGiven(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Wide-bore IV line (18G) secured with Ringer Lactate</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={oxygenGiven}
                  onChange={(e) => setOxygenGiven(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Maternal Oxygen (4-6 L/min via mask)</span>
              </label>
            </div>
          </div>

          {/* Referral Destination & 108 Dispatch Hotline */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-300 p-3 bg-neutral-100">
            <div>
              <div className="text-[11px] font-semibold text-neutral-500 uppercase">Referral Destination Facility:</div>
              <input
                type="text"
                value={referralCenter}
                onChange={(e) => setReferralCenter(e.target.value)}
                className="font-bold text-[13px] bg-transparent text-neutral-900 border-b border-neutral-400 focus:outline-none w-full max-w-sm"
              />
            </div>

            <a
              href="tel:108"
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-rose-700 transition print:hidden"
            >
              <PhoneCall size={16} weight="fill" />
              <span>Call 108 Emergency Ambulance</span>
            </a>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-neutral-600 border-t border-neutral-200">
            <div>
              <div className="h-8 border-b border-neutral-400 w-44" />
              <div className="mt-1 font-semibold">Referring Doctor / ANM Signature & Stamp</div>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-neutral-400 w-44 ml-auto" />
              <div className="mt-1 font-semibold">Receiving FRU Medical Officer Signature</div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3 print:hidden">
          <div className="text-[12px] text-[var(--color-charcoal)]">
            Compliant with NHM / PMSMA High-Risk Referral Guidelines
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] px-4 py-1.5 text-[12px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-[12px] font-bold text-white hover:bg-rose-700 shadow-sm transition"
            >
              <Printer size={15} weight="bold" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
