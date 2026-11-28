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
    heightCm?: number;
    bookingWeightKg?: number;
    previousCaesareans?: string;
    multiplePregnancy?: string;
    hivStatus?: string;
    syphilisStatus?: string;
    hepBStatus?: string;
  };
}

const SCREENING_OPTIONS = [
  { id: "unknown", label: "Unknown / not tested" },
  { id: "negative", label: "Negative" },
  { id: "positive", label: "Positive", alert: true },
];

/** Single-choice button group in the same look as the questions above; labelled for assistive tech. */
function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string; alert?: boolean }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <span className="block text-[13px] font-bold text-[var(--color-foreground)]">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`p-2 text-left rounded-xl border text-xs transition cursor-pointer ${
              value === o.id
                ? o.alert
                  ? "border-red-400 bg-red-50 text-red-950 font-semibold ring-1 ring-red-400"
                  : "border-[var(--color-primary)] bg-[var(--color-primary-surface)] text-[var(--color-foreground)] font-semibold ring-1 ring-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
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
  const [caesareans, setCaesareans] = useState(defaultValues?.previousCaesareans || "0");
  const [multiple, setMultiple] = useState(defaultValues?.multiplePregnancy || "single");
  const [hiv, setHiv] = useState(defaultValues?.hivStatus || "unknown");
  const [syphilis, setSyphilis] = useState(defaultValues?.syphilisStatus || "unknown");
  const [hepB, setHepB] = useState(defaultValues?.hepBStatus || "unknown");

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
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between text-left p-4 sm:p-5 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-pc-lilac)_80%,transparent)_0%,transparent_100%)] cursor-pointer select-none"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-xs">
            <ClipboardText size={18} weight="bold" />
          </span>
          <span>
            <span className="text-[15px] font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <span>Past Pregnancy History & Clinical Questionnaire</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Feeds 1-Page Report
              </span>
            </span>
            <span className="block text-[12px] text-[var(--color-charcoal)]">
              {isPrimi ? 4 : 7} clinical questions for the 1-page obstetric report
            </span>
          </span>
        </span>

        {isOpen ? <CaretUp size={18} aria-hidden /> : <CaretDown size={18} aria-hidden />}
      </button>

      {/* Hidden inputs to feed formData cleanly */}
      <input type="hidden" name="q_previousDeliveryMode" value={deliveryMode} />
      <input type="hidden" name="q_priorComplications" value={JSON.stringify(complications)} />
      <input type="hidden" name="q_pastPregnancyLoss" value={pregnancyLoss} />
      <input type="hidden" name="q_pastBirthWeight" value={birthWeight} />
      <input type="hidden" name="q_interpregnancyInterval" value={interval} />
      <input type="hidden" name="q_familyComplications" value={JSON.stringify(familyComp)} />
      <input type="hidden" name="q_chronicConditions" value={JSON.stringify(chronic)} />
      <input type="hidden" name="q_previousCaesareans" value={caesareans} />
      <input type="hidden" name="q_multiplePregnancy" value={multiple} />
      <input type="hidden" name="q_hivStatus" value={hiv} />
      <input type="hidden" name="q_syphilisStatus" value={syphilis} />
      <input type="hidden" name="q_hepBStatus" value={hepB} />

      {/* Collapse with `hidden`, not unmount: unmounted inputs would drop out of the form and overwrite saved answers. */}
      {(
        <div hidden={!isOpen} className="p-5 space-y-5 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          {/* Question 1: Delivery Mode */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              1. Previous Delivery Mode & Type
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
                2. Prior Obstetric Complications
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
                    <label
                      key={c.id}
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
                          onChange={() => toggleMultiSelect(complications, setComplications, c.id)}
                          className="h-3.5 w-3.5 accent-[var(--color-primary)] cursor-pointer"
                        />
                        <span>{c.label}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question 3: Past Pregnancy Loss */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              {isPrimi ? 2 : 3}. Past Pregnancy Loss
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
                4. Previous Baby Birth Weight
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
                5. Interpregnancy Interval
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
              {isPrimi ? 3 : 6}. Family Pregnancy & Genetic History
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
                  <label
                    key={fam.id}
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
                        onChange={() => toggleMultiSelect(familyComp, setFamilyComp, fam.id)}
                        className="h-3.5 w-3.5 accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span>{fam.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Question 7: Pre-Existing Chronic Conditions */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-[var(--color-foreground)]">
              {isPrimi ? 4 : 7}. Pre-existing Chronic Medical Conditions
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
                  <label
                    key={chr.id}
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
                        onChange={() => toggleMultiSelect(chronic, setChronic, chr.id)}
                        className="h-3.5 w-3.5 accent-[var(--color-primary)] cursor-pointer"
                      />
                      <span>{chr.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* High-risk intake (MoHFW) */}
          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="text-[13px] font-bold text-[var(--color-primary)]">High-risk intake (MoHFW)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="q_heightCm" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                  Height (cm)
                </label>
                <input
                  id="q_heightCm"
                  name="q_heightCm"
                  type="number"
                  inputMode="decimal"
                  min={120}
                  max={200}
                  step="any"
                  defaultValue={defaultValues?.heightCm ?? ""}
                  placeholder="120 - 200"
                  className="min-h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="q_bookingWeightKg" className="block text-[12px] font-medium text-[var(--color-charcoal)]">
                  Weight at booking (kg)
                </label>
                <input
                  id="q_bookingWeightKg"
                  name="q_bookingWeightKg"
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={200}
                  step="any"
                  defaultValue={defaultValues?.bookingWeightKg ?? ""}
                  placeholder="30 - 200"
                  className="min-h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>
            <Segmented
              label="Number of previous caesareans"
              value={caesareans}
              onChange={setCaesareans}
              options={[
                { id: "0", label: "None" },
                { id: "1", label: "1", alert: true },
                { id: "2+", label: "2 or more", alert: true },
              ]}
            />
            <Segmented
              label="This pregnancy"
              value={multiple}
              onChange={setMultiple}
              options={[
                { id: "single", label: "Single baby" },
                { id: "twins", label: "Twins", alert: true },
                { id: "triplets+", label: "Triplets or more", alert: true },
              ]}
            />
            <h3 className="pt-1 text-[13px] font-bold text-[var(--color-primary)]">Infection screening</h3>
            <Segmented label="HIV" value={hiv} onChange={setHiv} options={SCREENING_OPTIONS} />
            <Segmented label="Syphilis (VDRL / RPR)" value={syphilis} onChange={setSyphilis} options={SCREENING_OPTIONS} />
            <Segmented label="Hepatitis B (HBsAg)" value={hepB} onChange={setHepB} options={SCREENING_OPTIONS} />
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
