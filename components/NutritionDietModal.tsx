"use client";

import { useState } from "react";
import { BowlFood, WhatsappLogo, X, Heart, Plant, Pill } from "@phosphor-icons/react";
import { whatsAppLink } from "@/lib/whatsapp";

export interface NutritionPatientData {
  patientId: string;
  patientName: string;
  phone?: string | null;
  gaWeeks?: number | null;
  trimester?: 1 | 2 | 3;
  hb?: number | null;
  clinicName?: string;
}

export function NutritionDietButton({ data }: { data: NutritionPatientData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs transition"
        title="View personalized trimester & anemia diet plan"
      >
        <BowlFood size={16} weight="bold" className="text-emerald-600" />
        <span>Nutrition & Anemia Plan</span>
      </button>

      {isOpen && <NutritionDietModal data={data} onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function NutritionDietModal({
  data,
  onClose,
}: {
  data: NutritionPatientData;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<"en" | "hi" | "mr">("hi");

  const currentTrimester = data.trimester || 2;
  const hb = data.hb ?? 10.5;

  const anemiaStatus =
    hb < 7.0
      ? { level: "Severe Anemia", tone: "critical", color: "text-rose-600 bg-rose-50 border-rose-300" }
      : hb < 10.0
      ? { level: "Moderate Anemia", tone: "warning", color: "text-amber-700 bg-amber-50 border-amber-300" }
      : hb < 11.0
      ? { level: "Mild Anemia", tone: "caution", color: "text-yellow-800 bg-yellow-50 border-yellow-300" }
      : { level: "Normal Hemoglobin", tone: "ok", color: "text-emerald-700 bg-emerald-50 border-emerald-300" };

  const trimesterFocus = {
    1: {
      title: "Trimester 1 (Weeks 1–12): Neural Tube & Organ Formation",
      focus: "High Folate, Vitamin B6, Hydration & Anti-Nausea Foods",
      calorieSurplus: "+0 kcal (Focus on micro-nutrient density)",
    },
    2: {
      title: "Trimester 2 (Weeks 13–26): Bone Growth & Blood Volume Surge",
      focus: "High Iron, Calcium, Protein & Omega-3 for Fetal Growth",
      calorieSurplus: "+340 kcal/day (1 extra balanced meal)",
    },
    3: {
      title: "Trimester 3 (Weeks 27–40): Fetal Brain & Weight Maturation",
      focus: "Iron replenishment, Pre-delivery stamina, Fiber against constipation",
      calorieSurplus: "+450 kcal/day with frequent small meals",
    },
  }[currentTrimester];

  // Superfoods list
  const superfoods = [
    {
      name: "Moringa / Drumstick Leaves (सहजन / शेवगा)",
      benefit: "Rich in iron, vitamin A, and calcium. 4x more iron than spinach.",
      usage: "Add cooked leaves to dal or make paratha.",
    },
    {
      name: "Jaggery + Roasted Chana (गुड़ और भुना चना)",
      benefit: "Classic Indian iron booster. 100g gives ~5mg bioavailable iron.",
      usage: "Mid-day healthy snack with a glass of water.",
    },
    {
      name: "Sprouted Ragi / Nachni Porridge (नाचणी खीर)",
      benefit: "Unmatched calcium & iron for baby's bone development.",
      usage: "Morning breakfast or evening porridge.",
    },
    {
      name: "Amla, Lemon & Guava (आंवला, नींबू, अमरूद)",
      benefit: "Vitamin C triples intestinal absorption of dietary & medicinal iron.",
      usage: "Squeeze fresh lemon over dal; eat raw amla after meals.",
    },
  ];

  // Build WhatsApp shareable message
  const generateWhatsAppMessage = () => {
    if (lang === "mr") {
      return (
        `🥗 *${data.clinicName || "मातृसेतू क्लिनिक"} - गरोदरपणातील पोषण व आहार सल्ला*\n\n` +
        `नमस्ते *${data.patientName} ताई*,\n` +
        `आपला हिमोग्लोबिन (Hb): *${hb} g/dL* (${anemiaStatus.level})\n` +
        `सध्याचा टप्पा: *तिमाही ${currentTrimester} (${data.gaWeeks || "—"} आठवडे)*\n\n` +
        `🌿 *रक्त वाढवण्यासाठी महत्त्वाचे घरगुती उपाय:*\n` +
        `1. *शेवग्याची पाने:* डाळीत घालून खा, लोह भरपूर वाढते.\n` +
        `2. *गूळ आणि फुटाणे:* दररोज दुपारी नाश्त्यात खा.\n` +
        `3. *नाचणीची खीर किंवा भाकरी:* बाळाच्या हाडांच्या मजबुतीसाठी उत्तम.\n` +
        `4. *लिंबू किंवा आवळा:* जेवणासोबत लिंबू पिळा, ज्यामुळे लोह शरीरात शोषले जाते.\n\n` +
        `⚠️ *महत्त्वाचा नियम:* लोहाची गोळी (IFA) चहा, कॉफी किंवा दुधासोबत घेऊ नका! किमान 1 तासाचे अंतर ठेवा.\n\n` +
        `क्लिनिक हेल्पलाइन: 108`
      );
    } else if (lang === "hi") {
      return (
        `🥗 *${data.clinicName || "मातृसेतु क्लिनिक"} - गर्भावस्था पोषण एवं आहार परामर्श*\n\n` +
        `नमस्ते *${data.patientName} जी*,\n` +
        `आपका हीमोग्लोबिन (Hb): *${hb} g/dL* (${anemiaStatus.level})\n` +
        `वर्तमान अवधि: *तिमाही ${currentTrimester} (${data.gaWeeks || "—"} सप्ताह)*\n\n` +
        `🌿 *खून और ताकत बढ़ाने वाले पौष्टिक आहार:*\n` +
        `1. *सहजन (मोरिंगा) के पत्ते:* दाल या सब्जी में पकाकर खाएं, आयरन का बेहतरीन स्रोत।\n` +
        `2. *गुड़ और भुना चना:* रोजाना दोपहर में नाश्ते के रूप में लें।\n` +
        `3. *रागी (मडुआ) दलिया/रोटी:* कैल्शियम और आयरन से भरपूर।\n` +
        `4. *नींबू और आंवला:* दाल पर नींबू निचोड़ें, इससे आयरन 3 गुना तेजी से पचता है।\n\n` +
        `⚠️ *जरूरी नियम:* आयरन की गोली चाय या दूध के साथ कभी न लें! कम से कम 1 घंटे का अंतराल रखें।\n\n` +
        `शुभकामनाएं, ${data.clinicName || "मातृसेतु"}`
      );
    } else {
      return (
        `🥗 *${data.clinicName || "MatruSetu Clinic"} - Pregnancy Nutrition Guide*\n\n` +
        `Hello *${data.patientName}*,\n` +
        `Your Hemoglobin (Hb): *${hb} g/dL* (${anemiaStatus.level})\n` +
        `Current Stage: *Trimester ${currentTrimester} (${data.gaWeeks || "—"} weeks)*\n\n` +
        `🌿 *Iron-Rich Superfoods for Healthy Baby & Mother:*\n` +
        `1. *Drumstick (Moringa) leaves:* Cook with dal; extremely rich in iron.\n` +
        `2. *Jaggery + Roasted Chana:* Daily natural iron-boosting snack.\n` +
        `3. *Sprouted Ragi / Millet:* Excellent for baby's bone development.\n` +
        `4. *Lemon & Amla (Vitamin C):* Always pair meals with lemon for 3x iron absorption.\n\n` +
        `⚠️ *Golden Rule:* Never take your Iron (IFA) tablet with tea, coffee, or milk! Keep a 1-hour gap.\n\n` +
        `Clinic Helpline: 108`
      );
    }
  };

  const whatsappUrl = data.phone ? whatsAppLink(data.phone, generateWhatsAppMessage()) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personalized Nutrition and Anemia Plan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-2xl rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <BowlFood size={20} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">
                  Personalized Nutrition & Anemia Care Plan
                </h2>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Trimester {currentTrimester}
                </span>
              </div>
              <p className="text-[12px] text-[var(--color-charcoal)]">
                Tailored for {data.patientName} · Hb: <strong>{hb} g/dL</strong>
              </p>
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

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Anemia Status Banner */}
          <div className={`flex items-center justify-between rounded-xl border p-3.5 ${anemiaStatus.color}`}>
            <div className="flex items-center gap-2.5">
              <Heart size={20} weight="fill" className="shrink-0" />
              <div>
                <div className="text-[13px] font-bold">
                  {anemiaStatus.level} ({hb} g/dL)
                </div>
                <div className="text-[11px] opacity-90">
                  {hb < 7.0
                    ? "Emergency: Maternal IV Iron Sucrose or Blood Transfusion referral strongly indicated."
                    : hb < 11.0
                    ? "Target: 2 Iron-Folic Acid (IFA) tablets daily + high iron bioavailable diet."
                    : "Hemoglobin within safe target. Continue 1 prophylactic IFA tablet daily."}
                </div>
              </div>
            </div>
          </div>

          {/* Trimester Focus Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3.5 space-y-1">
            <div className="text-[12px] font-bold text-[var(--color-foreground)]">{trimesterFocus.title}</div>
            <div className="text-[12px] text-[var(--color-charcoal)]">
              <strong>Clinical Goal:</strong> {trimesterFocus.focus}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
              Energy Recommendation: {trimesterFocus.calorieSurplus}
            </div>
          </div>

          {/* Affordable Local Superfoods */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Plant size={16} weight="fill" className="text-emerald-600" />
              <h3 className="text-[13px] font-bold text-[var(--color-foreground)]">
                Indigenous High-Iron Indian Superfoods
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {superfoods.map((food, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 space-y-1"
                >
                  <div className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">{food.name}</div>
                  <div className="text-[11px] text-[var(--color-foreground)]">{food.benefit}</div>
                  <div className="text-[10px] text-[var(--color-charcoal)] italic">How to eat: {food.usage}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Iron Tablet Rules */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-[12px]">
              <Pill size={16} weight="bold" />
              <span>3 Non-Negotiable Iron Tablet Rules (Counseling for Mother)</span>
            </div>
            <ul className="text-[11px] text-amber-900 dark:text-amber-300 space-y-1 pl-4 list-disc">
              <li>
                <strong>No Tea / Chai with Tablets:</strong> Tannins in tea block 80% of iron absorption. Wait 1 hour before or after.
              </li>
              <li>
                <strong>Always Pair with Vitamin C:</strong> Squeeze half a lemon into water or eat an orange/amla with the tablet.
              </li>
              <li>
                <strong>Overcoming Nausea:</strong> If the red iron tablet causes stomach distress, advise taking it immediately after dinner right before bedtime.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions with WhatsApp Share */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-charcoal)] font-medium">WhatsApp Language:</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "hi" | "mr")}
              className="text-[11px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 font-semibold"
            >
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-[12px] font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <WhatsappLogo size={16} weight="bold" />
                <span>Send Diet to Mother on WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generateWhatsAppMessage());
                  alert("Diet Plan copied to clipboard!");
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-[12px] font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <WhatsappLogo size={16} weight="bold" />
                <span>Copy Vernacular Diet Plan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
