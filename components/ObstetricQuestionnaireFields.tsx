"use client";

import { useState } from "react";
import {
  ClipboardText,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { card } from "@/components/ui";

export interface ObstetricQuestionnaireFieldsProps {
  defaultValues?: {
    previousDeliveryMode?: string;
    priorComplications?: string[];
    pastPregnancyLoss?: string;
    pastBirthWeight?: string;
    interpregnancyInterval?: string;
    familyComplications?: string[];
    chronicConditions?: string[];
    doctorNotes?: string;
  };
}

export function ObstetricQuestionnaireFields({
  defaultValues,
}: ObstetricQuestionnaireFieldsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [deliveryMode, setDeliveryMode] = useState(
    defaultValues?.previousDeliveryMode || "Primi"
  );
  const [complications, setComplications] = useState<string[]>(
    defaultValues?.priorComplications || ["none"]
  );
  const [pregnancyLoss, setPregnancyLoss] = useState(
    defaultValues?.pastPregnancyLoss || "0"
  );
  const [birthWeight, setBirthWeight] = useState(
    defaultValues?.pastBirthWeight || "na"
  );
  const [interval, setInterval] = useState(
    defaultValues?.interpregnancyInterval || "na"
  );
  const [familyComp, setFamilyComp] = useState<string[]>(
    defaultValues?.familyComplications || ["none"]
  );
  const [chronic, setChronic] = useState<string[]>(
    defaultValues?.chronicConditions || ["none"]
  );
  const [doctorNotes, setDoctorNotes] = useState(
    defaultValues?.doctorNotes || ""
  );

  const toggleMultiSelect = (
    currentList: string[],
    setFn: (val: string[]) => void,
    item: string
  ) => {
    if (item === "none") {
      setFn(["none"]);
      return;
    }
    const filtered = currentList.filter((x) => x !== "none");
    if (filtered.includes(item)) {
      const next = filtered.filter((x) => x !== item);
      setFn(next.length === 0 ? ["none"] : next);
    } else {
      setFn([...filtered, item]);
    }
  };

  const isPrimi = deliveryMode === "Primi";

  return (
    <fieldset className={`${card} overflow-hidden transition-all border-indigo-200/60`}>
      <legend className="sr-only">Obstetric & Past Pregnancy Questionnaire</legend>

      {/* Header bar with toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between p-4 sm:p-5 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-pc-lilac)_80%,transparent)_0%,transparent_100%)] cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-xs">
            <ClipboardText size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <span>Past Pregnancy History & Clinical Questionnaire</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Feeds 1-Page Report
              </span>
            </h3>
            <p className="text-[12px] text-[var(--color-charcoal)]">
              7 clinical questions required for FOGSI risk stratification & the 1-page obstetric dossier
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1 rounded-md text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)]"
        >
          {isOpen ? <CaretUp size={18} /> : <CaretDown size={18} />}
        </button>
      </div>

      {/* Hidden inputs to feed formData cleanly */}
      <input type="hidden" name="q_previousDeliveryMode" value={deliveryMode} />
      <input type="hidden" name="q_priorComplications" value={JSON.stringify(complications)} />
      <input type="hidden" name="q_pastPregnancyLoss" value={pregnancyLoss} />
      <input type="hidden" name="q_pastBirthWeight" value={birthWeight} />
      <input type="hidden" name="q_interpregnancyInterval" value={interval} />
      <input type="hidden" name="q_familyComplications" value={JSON.stringify(familyComp)} />
      <input type="hidden" name="q_chronicConditions" value={JSON.stringify(chronic)} />

      {isOpen && (
        <div className="p-5 space-y-5 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          {/* Question 1: Delivery Mode */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              1. Previous Delivery Mode & Type (पिछला प्रसव प्रकार)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "Primi", label: "First Pregnancy (Primi)", desc: "No prior deliveries" },
                { id: "NVD", label: "Normal Vaginal (NVD)", desc: "Spontaneous vaginal" },
                { id: "LSCS", label: "Previous C-Section (LSCS)", desc: "Scarred uterus", alert: true },
                { id: "Instrumental", label: "Instrumental", desc: "Vacuum / Forceps" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setDeliveryMode(m.id);
                    if (m.id === "Primi") {
                      setBirthWeight("na");
                      setInterval("na");
                    } else if (birthWeight === "na") {
                      setBirthWeight("normal");
                      setInterval("18m-5y");
                    }
                  }}
                  className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                    deliveryMode === m.id
                      ? m.alert
                        ? "border-red-400 bg-red-50/80 text-red-950 font-semibold ring-1 ring-red-400"
                        : "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/70 text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-charcoal)]"
                  }`}
                >
                  <span className="block">{m.label}</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Prior Complications */}
          {!isPrimi && (
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
                2. Prior Obstetric Complications (पिछली गर्भावस्था में जटिलताएं)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "none", label: "None / Uneventful" },
                  { id: "preeclampsia", label: "Preeclampsia / High BP", alert: true },
                  { id: "gdm", label: "Gestational Diabetes (GDM)", alert: true },
                  { id: "pph", label: "Severe Bleeding (PPH)", alert: true },
                  { id: "preterm", label: "Preterm Delivery (<37w)", alert: true },
                ].map((c) => {
                  const selected = complications.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleMultiSelect(complications, setComplications, c.id)}
                      className={`p-2 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                        selected
                          ? c.alert
                            ? "border-amber-400 bg-amber-50/90 text-amber-950 font-semibold ring-1 ring-amber-400"
                            : "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/70 text-[var(--color-foreground)] font-semibold"
                          : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selected}
                          readOnly
                          className="h-3.5 w-3.5 accent-[var(--color-primary)] pointer-events-none"
                        />
                        <span>{c.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question 3: Past Pregnancy Loss */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              3. Past Pregnancy Loss (गर्भपात या मृत प्रसव का इतिहास)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "0", label: "0 (None)" },
                { id: "1", label: "1 Miscarriage / Abortion" },
                { id: "2+", label: "2+ Miscarriages (BOH)", alert: true },
                { id: "stillbirth", label: "Prior Stillbirth / IUFD", alert: true },
              ].map((loss) => (
                <button
                  key={loss.id}
                  type="button"
                  onClick={() => setPregnancyLoss(loss.id)}
                  className={`p-2.5 text-left rounded-xl border text-xs transition cursor-pointer ${
                    pregnancyLoss === loss.id
                      ? loss.alert
                        ? "border-red-400 bg-red-50 text-red-950 font-semibold ring-1 ring-red-400"
                        : "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                  }`}
                >
                  {loss.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 4: Prior Baby Birth Weight */}
          {!isPrimi && (
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
                4. Previous Baby Birth Weight (पिछले बच्चे का जन्म वजन)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "normal", label: "Normal (2.5 – 3.5 kg)" },
                  { id: "low", label: "Low Birth Weight (< 2.5 kg)", alert: true },
                  { id: "high", label: "Large Baby (> 3.5 kg / Macrosomia)", alert: true },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setBirthWeight(w.id)}
                    className={`p-2 text-left rounded-xl border text-xs transition cursor-pointer ${
                      birthWeight === w.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 5: Interpregnancy Spacing */}
          {!isPrimi && (
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
                5. Interpregnancy Interval (दो प्रसवों के बीच का अंतर)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "<18m", label: "Short (< 18 Months)", alert: deliveryMode === "LSCS" },
                  { id: "18m-5y", label: "Optimal (18m – 5 Years)" },
                  { id: ">5y", label: "Long (> 5 Years)" },
                ].map((int) => (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => setInterval(int.id)}
                    className={`p-2 text-left rounded-xl border text-xs transition cursor-pointer ${
                      interval === int.id
                        ? int.alert
                          ? "border-red-400 bg-red-50 text-red-950 font-semibold ring-1 ring-red-400"
                          : "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                    }`}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 6: Family History */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              6. Family Pregnancy & Genetic History (मातृ/पारिवारिक इतिहास - माँ या बहन)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "none", label: "None / No Family Risk" },
                { id: "preeclampsia", label: "Familial Preeclampsia (High BP)" },
                { id: "diabetes", label: "Family Diabetes / GDM" },
                { id: "twins", label: "Family Twins / Multiple Gestation" },
                { id: "anemia", label: "Hereditary Anemia / Thalassemia" },
              ].map((fam) => {
                const selected = familyComp.includes(fam.id);
                return (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => toggleMultiSelect(familyComp, setFamilyComp, fam.id)}
                    className={`p-2 text-left rounded-xl border text-xs transition cursor-pointer ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        className="h-3.5 w-3.5 accent-[var(--color-primary)] pointer-events-none"
                      />
                      <span>{fam.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 7: Pre-Existing Chronic Conditions */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              7. Pre-existing Chronic Medical Conditions (पूर्व-मौजूदा चिकित्सीय स्थितियां)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "none", label: "None / Healthy" },
                { id: "hypertension", label: "Chronic Hypertension (Pre-pregnancy)", alert: true },
                { id: "thyroid", label: "Thyroid Disorder (Hypo/Hyper)" },
                { id: "cardiac", label: "Cardiac / Heart Disease", alert: true },
                { id: "asthma_epilepsy", label: "Asthma / Epilepsy" },
              ].map((chr) => {
                const selected = chronic.includes(chr.id);
                return (
                  <button
                    key={chr.id}
                    type="button"
                    onClick={() => toggleMultiSelect(chronic, setChronic, chr.id)}
                    className={`p-2 text-left rounded-xl border text-xs transition cursor-pointer ${
                      selected
                        ? chr.alert
                          ? "border-red-400 bg-red-50 text-red-950 font-semibold ring-1 ring-red-400"
                          : "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        className="h-3.5 w-3.5 accent-[var(--color-primary)] pointer-events-none"
                      />
                      <span>{chr.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Clinician Notes */}
          <div className="space-y-1">
            <label htmlFor="q_doctorNotes" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
              Clinician High-Risk Observations / Notes (Optional):
            </label>
            <input
              id="q_doctorNotes"
              name="q_doctorNotes"
              type="text"
              placeholder="e.g. Scar tenderness checked, advised aspirin 75mg prophylaxis..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              className="min-h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-xs focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
