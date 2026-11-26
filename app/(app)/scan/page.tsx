import { PageHeader, card, pageBody } from "@/components/ui";
import { ScanQRCardButton } from "@/components/QRScannerModal";
import Link from "next/link";
import { Camera, QrCode, ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { getT } from "@/lib/i18n/server";

export default async function ScanPage() {
  const { t } = await getT();
  return (
    <>
      <PageHeader
        title={t("patients.scan.title")}
        meta={t("patients.scan.meta")}
        actions={
          <Link href="/patients" className="flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] hover:underline">
            <ArrowLeft size={14} aria-hidden /> {t("patients.scan.back")}
          </Link>
        }
      />

      <div className={pageBody}>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <section className={`flex flex-col items-center gap-4 p-6 text-center ${card}`}>
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[var(--radius-cards)] bg-[var(--color-pc-ink)] text-[var(--color-pc-card)]">
              <span aria-hidden className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-[var(--color-pc-card)]" />
              <span aria-hidden className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-[var(--color-pc-card)]" />
              <span aria-hidden className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[var(--color-pc-card)]" />
              <span aria-hidden className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[var(--color-pc-card)]" />
              <QrCode size={44} aria-hidden />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--color-foreground)]">{t("patients.scan.heading")}</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-[var(--color-charcoal)]">{t("patients.scan.body")}</p>
            </div>
            <ScanQRCardButton primary className="min-h-12 w-full px-6 md:w-auto" />
          </section>

          <section className={`p-6 ${card}`}>
            <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">{t("patients.scan.stepsTitle")}</h2>
            <ol className="mt-3 space-y-3">
              {(["patients.scan.step1", "patients.scan.step2", "patients.scan.step3"] as const).map((k, i) => (
                <li key={k} className="flex items-start gap-3 text-[14px]">
                  <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)]">
                    {i + 1}
                  </span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--color-border)]/70 pt-3 text-[12px] text-[var(--color-charcoal)]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[var(--color-on-track)]" aria-hidden />
                {t("patients.scan.perkMatch")}
              </span>
              <span className="flex items-center gap-1.5">
                <Camera size={16} className="text-[var(--color-primary)]" aria-hidden />
                {t("patients.scan.perkNoType")}
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
