"use client";

import { useState, useActionState } from "react";
import { recordVisit, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { VoiceScribeModal } from "@/components/VoiceScribeModal";
import type { ParsedVitals } from "@/lib/voiceScribe";
import { Microphone, ShieldWarning, Warning, Heartbeat } from "@phosphor-icons/react";
import { buttonSecondary } from "@/components/ui";

const initialState: ActionResult = { error: null };
const inputClass =
  "num min-h-9 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[13px] text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none";
const labelClass = "mb-1 block text-[11px] font-semibold text-[var(--color-charcoal)]";

export function VisitForm({ patientId }: { patientId: string }) {
  const action = recordVisit.bind(null, patientId);
  const [state, formAction] = useActionState(withSuccessToast(action, "Visit saved"), initialState);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Controlled values for live CDSS protocol evaluation and voice auto-fill
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bpSys, setBpSys] = useState<string>("");
  const [bpDia, setBpDia] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [hb, setHb] = useState<string>("");
  const [fhr, setFhr] = useState<string>("");
  const [fundalHeight, setFundalHeight] = useState<string>("");
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleApplyVoiceVitals = (v: ParsedVitals) => {
    if (v.bpSys) setBpSys(String(v.bpSys));
    if (v.bpDia) setBpDia(String(v.bpDia));
    if (v.weight) setWeight(String(v.weight));
    if (v.hb) setHb(String(v.hb));
    if (v.fhr) setFhr(String(v.fhr));
    if (v.fundalHeight) setFundalHeight(String(v.fundalHeight));

    if (v.symptoms.length > 0) {
      const symptomNote = `[Voice Scribe] Symptoms: ${v.symptoms.join(", ")}`;
      setNotes((prev) => (prev ? `${prev}\n${symptomNote}` : symptomNote));
    }
  };

  const sysNum = Number(bpSys);
  const diaNum = Number(bpDia);
  const hbNum = Number(hb);
  const fhrNum = Number(fhr);

  const isSevereHTN = sysNum >= 160 || diaNum >= 110;
  const isGestationalHTN = (sysNum >= 140 || diaNum >= 90) && !isSevereHTN;
  const isSevereAnemia = hbNum > 0 && hbNum < 7.0;
  const isAbnormalFHR = fhrNum > 0 && (fhrNum < 110 || fhrNum > 160);

  return (
    <div className="space-y-3">
      {/* Voice Scribe Bar */}
      <div className="flex items-center justify-between rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-surface)] text-[var(--color-primary)]">
            <Microphone size={15} weight="bold" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[var(--color-foreground)]">
              ASHA Vernacular Voice Scribe
            </div>
            <div className="text-[10px] text-[var(--color-charcoal)]">
              Speak vitals in Hindi / English / Marathi to auto-fill
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsVoiceOpen(true)}
          className={`${buttonSecondary} min-h-8 px-3 text-[12px] gap-1.5`}
        >
          <Microphone size={14} weight="bold" className="text-[var(--color-primary)]" />
          <span>Dictate Vitals</span>
        </button>
      </div>

      <VoiceScribeModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onApplyVitals={handleApplyVoiceVitals}
      />

      {/* Clinical Decision Support (CDSS) Dynamic Alert Banners */}
      {(isSevereHTN || isGestationalHTN || isSevereAnemia || isAbnormalFHR) && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          {isSevereHTN && (
            <div className="flex items-start gap-2 rounded-[var(--radius-cards)] border border-[var(--color-overdue)]/40 bg-[var(--color-overdue-surface)] p-2.5 text-[11px] text-[var(--color-foreground)]">
              <ShieldWarning size={16} weight="fill" className="shrink-0 text-[var(--color-overdue)] mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wider block text-[var(--color-overdue)]">
                  PMSMA CRITICAL: Severe Hypertension ({sysNum}/{diaNum} mmHg)
                </strong>
                Preeclampsia protocol: Administer loading dose Inj. Magnesium Sulfate (MgSO4) 4g IV/IM + Tab Nifedipine 10mg. Urgent FRU Emergency Referral required.
              </div>
            </div>
          )}

          {isGestationalHTN && (
            <div className="flex items-start gap-2 rounded-[var(--radius-cards)] border border-[var(--color-due)]/40 bg-[var(--color-due-surface)] p-2.5 text-[11px] text-[var(--color-foreground)]">
              <Warning size={15} weight="fill" className="shrink-0 text-[var(--color-due)] mt-0.5" />
              <div>
                <strong className="font-bold block text-[var(--color-due)]">CDSS Alert: Gestational Hypertension ({sysNum}/{diaNum} mmHg)</strong>
                Follow PMSMA protocol: Test urine albumin for proteinuria. Re-check BP in 4 hours. Do not administer Ergometrine during active labor.
              </div>
            </div>
          )}

          {isSevereAnemia && (
            <div className="flex items-start gap-2 rounded-[var(--radius-cards)] border border-[var(--color-overdue)]/40 bg-[var(--color-overdue-surface)] p-2.5 text-[11px] text-[var(--color-foreground)]">
              <ShieldWarning size={16} weight="fill" className="shrink-0 text-[var(--color-overdue)] mt-0.5" />
              <div>
                <strong className="font-bold uppercase tracking-wider block text-[var(--color-overdue)]">
                  CRITICAL: Severe Anemia (Hb {hbNum} g/dL &lt; 7.0)
                </strong>
                High risk of Postpartum Hemorrhage (PPH). Oral iron is insufficient; immediate IV Iron Sucrose or PRBC blood transfusion referral indicated.
              </div>
            </div>
          )}

          {isAbnormalFHR && (
            <div className="flex items-start gap-2 rounded-[var(--radius-cards)] border border-[var(--color-due)]/40 bg-[var(--color-due-surface)] p-2.5 text-[11px] text-[var(--color-foreground)]">
              <Heartbeat size={16} weight="fill" className="shrink-0 text-[var(--color-due)] mt-0.5" />
              <div>
                <strong className="font-bold block text-[var(--color-due)]">Fetal Distress Warning: FHR {fhrNum} bpm (Target: 110–160 bpm)</strong>
                Reposition mother to left lateral position, administer maternal oxygen, and prepare immediate Doppler/USG evaluation.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      <form action={formAction} className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4" noValidate>
        <div>
          <label htmlFor="visitDate" className={labelClass}>
            Visit date
          </label>
          <input
            id="visitDate"
            name="visitDate"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bpSys" className={labelClass}>
            BP sys (mmHg)
          </label>
          <input
            id="bpSys"
            name="bpSys"
            type="number"
            value={bpSys}
            onChange={(e) => setBpSys(e.target.value)}
            placeholder="120"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bpDia" className={labelClass}>
            BP dia (mmHg)
          </label>
          <input
            id="bpDia"
            name="bpDia"
            type="number"
            value={bpDia}
            onChange={(e) => setBpDia(e.target.value)}
            placeholder="80"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="weight" className={labelClass}>
            Weight (kg)
          </label>
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="54.0"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="hb" className={labelClass}>
            Hb (g/dL)
          </label>
          <input
            id="hb"
            name="hb"
            type="number"
            step="0.1"
            value={hb}
            onChange={(e) => setHb(e.target.value)}
            placeholder="11.5"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="fhr" className={labelClass}>
            FHR (bpm)
          </label>
          <input
            id="fhr"
            name="fhr"
            type="number"
            value={fhr}
            onChange={(e) => setFhr(e.target.value)}
            placeholder="140"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="fundalHeight" className={labelClass}>
            Fundal ht (cm)
          </label>
          <input
            id="fundalHeight"
            name="fundalHeight"
            type="number"
            step="0.1"
            value={fundalHeight}
            onChange={(e) => setFundalHeight(e.target.value)}
            placeholder="28"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="nextVisitDate" className={labelClass}>
            Next visit
          </label>
          <input
            id="nextVisitDate"
            name="nextVisitDate"
            type="date"
            value={nextVisitDate}
            onChange={(e) => setNextVisitDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-4 xl:col-span-2 2xl:col-span-4">
          <label htmlFor="notes" className={labelClass}>
            Clinical Notes & Observations
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical observations, prescribed IFA/calcium, or dictation notes..."
            className={inputClass.replace("num ", "")}
          />
        </div>

        {state.error && (
          <p role="alert" className="col-span-2 text-[13px] text-[var(--color-overdue)] sm:col-span-4 xl:col-span-2 2xl:col-span-4 font-semibold">
            {state.error}
          </p>
        )}

        <div className="col-span-2 sm:col-span-4 xl:col-span-2 2xl:col-span-4">
          <SubmitButton>Save visit</SubmitButton>
        </div>
      </form>
    </div>
  );
}
