import { PageHeader, card, pageBody } from "@/components/ui";
import { ScanQRCardButton } from "@/components/QRScannerModal";
import Link from "next/link";
import { Camera, QrCode, ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export default function ScanPage() {
  return (
    <>
      <PageHeader
        title="Scan QR card"
        meta="Check a patient in from her health pass QR code"
        actions={
          <Link href="/patients" className="flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] hover:underline">
            <ArrowLeft size={14} /> Back to Patients
          </Link>
        }
      />

      <div className={pageBody}>
        <div className={`mx-auto max-w-xl space-y-5 p-8 text-center ${card}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
            <Camera size={32} weight="bold" />
          </div>

          <div>
            <h2 className="text-[18px] font-semibold text-[var(--color-foreground)]">Scan Patient QR Health Pass</h2>
            <p className="text-[13px] text-[var(--color-charcoal)] max-w-sm mx-auto mt-1.5">
              Hold the mother&apos;s health card QR code or WhatsApp photo in front of the camera to instantly pull up her pregnancy timeline and ANC records.
            </p>
          </div>

          <div className="pt-2">
            <ScanQRCardButton primary className="mx-auto min-h-12 px-6" />
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-center gap-4 text-[12px] text-[var(--color-charcoal)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[var(--color-on-track)]" />
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
