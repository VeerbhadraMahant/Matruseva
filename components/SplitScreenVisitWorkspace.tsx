"use client";

import { useState, useActionState, useEffect } from "react";
import {
  X,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  FileText,
  FilePdf,
  Check,
  ClipboardText,
  Columns,
  Warning,
} from "@phosphor-icons/react";
import { recordVisit, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { bpFlag, hbFlag, fhrFlag } from "@/lib/clinical";
import { formatShortDate } from "@/lib/format";

export interface PatientDocument {
  id: string;
  doc_type: string;
  doc_date: string | null;
  storage_path: string;
  ocr_text: string | null;
  url: string | null;
  created_at: string;
}

interface SplitScreenVisitWorkspaceProps {
  patientId: string;
  patientName: string;
  gaLabel: string | null;
  documents: PatientDocument[];
  initialDocId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const initialState: ActionResult = { error: null };
const inputClass =
  "num min-h-9 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 text-[14px] focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";

const DOC_TYPE_LABEL: Record<string, string> = {
  report: "Lab Report",
  scan: "Ultrasound Scan",
  prescription: "Prescription",
  case_paper: "Case Paper",
  register_page: "Register Page",
  other: "Document",
};

export function SplitScreenVisitWorkspace({
  patientId,
  patientName,
  gaLabel,
  documents,
  initialDocId,
  isOpen,
  onClose,
}: SplitScreenVisitWorkspaceProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocId ?? (documents[0]?.id || "")
  );
  const [zoom, setZoom] = useState<number>(1);
  const [showOcr, setShowOcr] = useState<boolean>(false);
  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);

  // Form states for real-time clinical checks
  const [bpSys, setBpSys] = useState<string>("");
  const [bpDia, setBpDia] = useState<string>("");
  const [hb, setHb] = useState<string>("");
  const [fhr, setFhr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const action = recordVisit.bind(null, patientId);
  const [state, formAction] = useActionState(action, initialState);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId) ?? documents[0];
  const isImage = currentDoc ? /\.(jpe?g|png|webp)$/i.test(currentDoc.storage_path) : false;

  // Real-time clinical alerts
  const sysNum = bpSys ? parseInt(bpSys, 10) : null;
  const diaNum = bpDia ? parseInt(bpDia, 10) : null;
  const hbNum = hb ? parseFloat(hb) : null;
  const fhrNum = fhr ? parseInt(fhr, 10) : null;

  const currentBpAlert = bpFlag(sysNum, diaNum);
  const currentHbAlert = hbFlag(hbNum);
  const currentFhrAlert = fhrFlag(fhrNum);

  const handleCopyOcrToNotes = () => {
    if (!currentDoc?.ocr_text) return;
    const textSnippet = currentDoc.ocr_text.slice(0, 300);
    setNotes((prev) => (prev ? `${prev}\n[Scan/Report Text]: ${textSnippet}` : `[Scan/Report Text]: ${textSnippet}`));
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Split-Screen Document Review & Visit Entry"
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs"
    >
      {/* Workspace Header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-rail)] px-4 text-white">
        <div className="flex items-center gap-3">
          <Columns size={20} className="text-[var(--color-rail-accent)]" aria-hidden />
          <div>
            <h2 className="text-[14px] font-semibold flex items-center gap-2">
              <span>Split-Screen Review & Visit Entry</span>
              <span className="text-[12px] font-normal text-[var(--color-rail-text)]">
                · {patientName} {gaLabel ? `(${gaLabel})` : ""}
              </span>
            </h2>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-[var(--color-rail-text)]">
            Review scan/report on left, enter visit vitals on right
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-white/20 text-white hover:bg-white/10"
            aria-label="Close split screen"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)] overflow-hidden bg-[var(--color-canvas)]">
        {/* =========================================================================
            LEFT HALF: Document Viewer & OCR Drawer
            ========================================================================= */}
        <div className="flex flex-col h-full overflow-hidden bg-[var(--color-surface-2)]">
          {/* Document selection bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Document:
              </span>
              {documents.length > 0 ? (
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    setZoom(1);
                  }}
                  className="min-h-8 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 text-[13px] font-medium text-[var(--color-foreground)] flex-1 max-w-xs"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type} · {formatShortDate(d.doc_date ?? d.created_at)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[12px] text-[var(--color-charcoal)]">No documents uploaded</span>
              )}
            </div>

            {/* Viewer Controls */}
            {currentDoc && (
              <div className="flex items-center gap-1">
                {isImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                      className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-1)] text-[var(--color-foreground)]"
                      title="Zoom Out"
                    >
                      <MagnifyingGlassMinus size={15} />
                    </button>
                    <span className="num px-1.5 text-[11px] text-[var(--color-charcoal)]">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-1)] text-[var(--color-foreground)]"
                      title="Zoom In"
                    >
                      <MagnifyingGlassPlus size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      className="h-8 px-2 border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-1)] text-[11px] text-[var(--color-charcoal)]"
                      title="Reset Zoom"
                    >
                      Reset
                    </button>
                  </>
                )}

                {currentDoc.ocr_text && (
                  <button
                    type="button"
                    onClick={() => setShowOcr((s) => !s)}
                    className={`h-8 px-2.5 border text-[11px] font-medium flex items-center gap-1.5 ${
                      showOcr
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-1)] text-[var(--color-foreground)]"
                    }`}
                  >
                    <FileText size={14} />
                    {showOcr ? "Hide OCR" : "View OCR"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Document Content Viewport */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
            {currentDoc ? (
              isImage && currentDoc.url ? (
                <div
                  className="transition-transform duration-100 flex items-center justify-center min-h-full"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentDoc.url}
                    alt="Ultrasound scan or report preview"
                    className="max-w-full max-h-[70vh] object-contain shadow-md border border-[var(--color-border)] bg-black"
                  />
                </div>
              ) : currentDoc.url ? (
                <div className="w-full h-full min-h-[400px] border border-[var(--color-border)] bg-white shadow-xs">
                  <iframe
                    src={currentDoc.url}
                    title="PDF Document Preview"
                    className="w-full h-full min-h-[450px]"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-[var(--color-charcoal)]">
                  <FilePdf size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Document URL expired or unavailable.</p>
                </div>
              )
            ) : (
              <div className="text-center p-8 text-[var(--color-charcoal)] max-w-sm">
                <FileText size={48} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium text-[14px]">No attached documents</p>
                <p className="text-[12px] mt-1">
                  Upload patient ultrasound reports, WhatsApp lab slips, or OPD cards in the Documents section to review
                  them side-by-side with consultation entry.
                </p>
              </div>
            )}

            {/* Collapsible OCR Text Panel Drawer */}
            {showOcr && currentDoc?.ocr_text && (
              <div className="absolute inset-x-3 bottom-3 top-auto max-h-[45%] border border-[var(--color-border-strong)] bg-[var(--color-background)] shadow-xl p-3 z-10 flex flex-col">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1.5 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-foreground)] flex items-center gap-1.5">
                    <FileText size={14} className="text-[var(--color-primary)]" />
                    Indexed OCR Text Layer
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyOcrToNotes}
                      className="inline-flex items-center gap-1 text-[11px] bg-[var(--color-primary)] text-white px-2 py-0.5 font-medium hover:bg-[var(--color-primary-hover)]"
                    >
                      {copiedOcr ? <Check size={12} /> : <ClipboardText size={12} />}
                      {copiedOcr ? "Copied to Notes!" : "Insert into Visit Notes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOcr(false)}
                      className="text-[var(--color-charcoal)] hover:text-black"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <pre className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed text-[var(--color-charcoal)] whitespace-pre-wrap bg-[var(--color-surface-1)] p-2">
                  {currentDoc.ocr_text}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT HALF: Consultation Visit Entry Form
            ========================================================================= */}
        <div className="flex flex-col h-full overflow-y-auto bg-[var(--color-background)] p-4 sm:p-6">
          <div className="border-b border-[var(--color-border)] pb-3 mb-4">
            <h3 className="text-[16px] font-semibold text-[var(--color-foreground)]">
              Consultation Visit Entry
            </h3>
            <p className="text-[12px] text-[var(--color-charcoal)]">
              Document clinical findings from today&apos;s OPD and ultrasound scan review.
            </p>
          </div>

          {/* Real-time Clinical Alerts Banner */}
          {(currentBpAlert || currentHbAlert || currentFhrAlert) && (
            <div className="mb-4 p-2.5 border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] text-[12px] space-y-1">
              <div className="font-semibold text-[var(--color-overdue)] flex items-center gap-1.5">
                <Warning size={15} weight="fill" />
                Abnormal Vitals Detected in Form:
              </div>
              <ul className="list-disc list-inside text-[var(--color-foreground)] space-y-0.5">
                {currentBpAlert && <li>{currentBpAlert.label} ({bpSys}/{bpDia} mmHg)</li>}
                {currentHbAlert && <li>{currentHbAlert.label} ({hb} g/dL)</li>}
                {currentFhrAlert && <li>{currentFhrAlert.label} ({fhr} bpm)</li>}
              </ul>
            </div>
          )}

          <form action={formAction} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="splitVisitDate" className={labelClass}>
                  Visit date
                </label>
                <input
                  id="splitVisitDate"
                  name="visitDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="splitBpSys" className={labelClass}>
                  BP sys (mmHg)
                </label>
                <input
                  id="splitBpSys"
                  name="bpSys"
                  type="number"
                  placeholder="120"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                  className={`${inputClass} ${currentBpAlert ? "border-[var(--color-overdue)] font-semibold" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="splitBpDia" className={labelClass}>
                  BP dia (mmHg)
                </label>
                <input
                  id="splitBpDia"
                  name="bpDia"
                  type="number"
                  placeholder="80"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                  className={`${inputClass} ${currentBpAlert ? "border-[var(--color-overdue)] font-semibold" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="splitWeight" className={labelClass}>
                  Weight (kg)
                </label>
                <input
                  id="splitWeight"
                  name="weight"
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="splitHb" className={labelClass}>
                  Hb (g/dL)
                </label>
                <input
                  id="splitHb"
                  name="hb"
                  type="number"
                  step="0.1"
                  placeholder="11.0"
                  value={hb}
                  onChange={(e) => setHb(e.target.value)}
                  className={`${inputClass} ${currentHbAlert ? "border-[var(--color-overdue)] font-semibold" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="splitFhr" className={labelClass}>
                  FHR (bpm)
                </label>
                <input
                  id="splitFhr"
                  name="fhr"
                  type="number"
                  placeholder="140"
                  value={fhr}
                  onChange={(e) => setFhr(e.target.value)}
                  className={`${inputClass} ${currentFhrAlert ? "border-[var(--color-overdue)] font-semibold" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="splitFundalHeight" className={labelClass}>
                  Fundal ht (cm)
                </label>
                <input
                  id="splitFundalHeight"
                  name="fundalHeight"
                  type="number"
                  step="0.1"
                  placeholder="24.0"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="splitNextVisitDate" className={labelClass}>
                  Next visit
                </label>
                <input
                  id="splitNextVisitDate"
                  name="nextVisitDate"
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Notes Section with Quick Measurement Insertion */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="splitNotes" className={labelClass}>
                  Clinical Notes & Scan Findings
                </label>
                {currentDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = `[Reviewed ${DOC_TYPE_LABEL[currentDoc.doc_type] ?? currentDoc.doc_type} dated ${formatShortDate(currentDoc.doc_date ?? currentDoc.created_at)}]: `;
                      setNotes((prev) => (prev ? `${prev}\n${prefix}` : prefix));
                    }}
                    className="text-[11px] text-[var(--color-primary)] hover:underline"
                  >
                    + Tag selected doc in notes
                  </button>
                )}
              </div>
              <textarea
                id="splitNotes"
                name="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ultrasound biometric observations, lab report findings, prescribed supplements (IFA, Calcium), patient complaints..."
                className="w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] p-2 text-[13px] font-sans focus:border-[var(--color-primary)] outline-none"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-[13px] text-[var(--color-overdue)] font-medium">
                {state.error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 border border-[var(--color-border-strong)] text-[13px] font-medium hover:bg-[var(--color-surface-1)]"
              >
                Cancel
              </button>
              <SubmitButton>Save Visit & Update Trajectory</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
