import { PageHeader } from "@/components/ui";
import { ScanQRCardButton } from "@/components/QRScannerModal";
import Link from "next/link";
import { Camera, QrCode, ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export default function ScanPage() {
  return (
    <>
      <PageHeader
        title="OPD Reception QR Scanner"
        meta="Fast-track patient check-in using Mother&apos;s Health Pass QR Code"
        actions={
          <Link href="/patients" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Patients
          </Link>
        }
      />

      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-sm text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-primary)]">
            <Camera size={32} weight="bold" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-foreground)]">Scan Patient QR Health Pass</h2>
            <p className="text-xs text-[var(--color-charcoal)] max-w-sm mx-auto mt-1">
              Hold the mother&apos;s health card QR code or WhatsApp photo in front of the camera to instantly pull up her pregnancy timeline and ANC records.
            </p>
          </div>

          <div className="pt-2">
            <ScanQRCardButton className="mx-auto text-sm px-5 py-2.5 shadow-sm" />
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-center gap-4 text-xs text-[var(--color-charcoal)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Instant OPD Match</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <QrCode size={16} className="text-[var(--color-primary)]" />
              <span>Zero-Type Check-in</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
