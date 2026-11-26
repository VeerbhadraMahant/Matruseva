"use client";

import { PatientDetailDialog } from "@/components/PatientDetailDialog";

import type { NutritionPatientData } from "@/components/NutritionDietModal";
import { useState } from "react";
import { BowlFood, WhatsappLogo, X, Heart, Plant, Pill } from "@phosphor-icons/react";
import { whatsAppLink } from "@/lib/whatsapp";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";



export function NutritionDietModal({
  data,
  onClose,
}: {
  data: NutritionPatientData;
  onClose: () => void;
}) {
  const t = useT();
  const [lang, setLang] = useState<"en" | "hi" | "mr">("hi");

  const currentTrimester = data.trimester || 2;
  const hb = data.hb ?? 10.5;

  const anemiaStatus =
    hb < 7.0
      ? { level: t("clinical.flag.hb_severe"), msgKey: "severe" as const, color: "text-[var(--color-overdue)] bg-[var(--color-overdue-surface)] border-[var(--color-overdue)]/30" }
      : hb < 10.0
      ? { level: t("clinical.flag.hb_moderate"), msgKey: "moderate" as const, color: "text-[var(--color-due)] bg-[var(--color-due-surface)] border-[var(--color-due)]/30" }
      : hb < 11.0
      ? { level: t("clinical.flag.hb_mild"), msgKey: "mild" as const, color: "text-[var(--color-due)] bg-[var(--color-due-surface)] border-[var(--color-due)]/30" }
      : { level: t("patientDetail.nutrition.normalHb"), msgKey: "normal" as const, color: "text-[var(--color-on-track)] bg-[var(--color-on-track-surface)] border-[var(--color-on-track)]/30" };

  // The WhatsApp text is written in the language chosen for the mother, not the staff UI language.
  const MSG_LEVEL = {
    en: { severe: "Severe Anemia", moderate: "Moderate Anemia", mild: "Mild Anemia", normal: "Normal Hemoglobin" },
    hi: { severe: "गंभीर खून की कमी", moderate: "मध्यम खून की कमी", mild: "हल्की खून की कमी", normal: "सामान्य हीमोग्लोबिन" },
    mr: { severe: "गंभीर रक्तक्षय", moderate: "मध्यम रक्तक्षय", mild: "सौम्य रक्तक्षय", normal: "सामान्य हिमोग्लोबिन" },
  } as const;
  const msgLevel = MSG_LEVEL[lang][anemiaStatus.msgKey];

  const TRI = {
    1: { title: t("patientDetail.nutrition.tri1.title"), focus: t("patientDetail.nutrition.tri1.focus"), calorieSurplus: t("patientDetail.nutrition.tri1.energy") },
    2: { title: t("patientDetail.nutrition.tri2.title"), focus: t("patientDetail.nutrition.tri2.focus"), calorieSurplus: t("patientDetail.nutrition.tri2.energy") },
    3: { title: t("patientDetail.nutrition.tri3.title"), focus: t("patientDetail.nutrition.tri3.focus"), calorieSurplus: t("patientDetail.nutrition.tri3.energy") },
  } as const;
  const trimesterFocus = TRI[currentTrimester];

  const superfoods = [
    { name: t("patientDetail.nutrition.food1.name"), benefit: t("patientDetail.nutrition.food1.benefit"), usage: t("patientDetail.nutrition.food1.usage") },
    { name: t("patientDetail.nutrition.food2.name"), benefit: t("patientDetail.nutrition.food2.benefit"), usage: t("patientDetail.nutrition.food2.usage") },
    { name: t("patientDetail.nutrition.food3.name"), benefit: t("patientDetail.nutrition.food3.benefit"), usage: t("patientDetail.nutrition.food3.usage") },
    { name: t("patientDetail.nutrition.food4.name"), benefit: t("patientDetail.nutrition.food4.benefit"), usage: t("patientDetail.nutrition.food4.usage") },
  ];

  // Build WhatsApp shareable message
  const generateWhatsAppMessage = () => {
    if (lang === "mr") {
      return (
        `🥗 *${data.clinicName || "मातृसेतू क्लिनिक"} - गरोदरपणातील पोषण व आहार सल्ला*\n\n` +
        `नमस्ते *${data.patientName} ताई*,\n` +
        `आपला हिमोग्लोबिन (Hb): *${hb} g/dL* (${msgLevel})\n` +
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
        `आपका हीमोग्लोबिन (Hb): *${hb} g/dL* (${msgLevel})\n` +
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
        `Your Hemoglobin (Hb): *${hb} g/dL* (${msgLevel})\n` +
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
    <PatientDetailDialog label={t("patientDetail.nutrition.aria")} onClose={onClose}>
      <div className="relative flex h-full max-h-full w-full flex-col overflow-hidden rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl lg:h-[92dvh] lg:w-[85vw]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-4 sm:items-center sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div aria-hidden="true" className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-surface)] text-[var(--color-primary)] sm:flex">
              <BowlFood size={18} weight="bold" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold leading-snug text-[var(--color-foreground)] sm:text-xl">
                  {t("patientDetail.nutrition.title")}
                </h2>
                <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-surface)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                  {t("clinical.trimester.short", { n: currentTrimester })}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-charcoal)]">
                {t("patientDetail.nutrition.tailored", { name: data.patientName })} · Hb: <strong>{hb} g/dL</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-charcoal)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 text-sm leading-relaxed sm:p-6 sm:text-base lg:p-8">
          {/* Anemia Status Banner */}
          <div className={`rounded-[var(--radius-cards)] border p-4 sm:p-5 ${anemiaStatus.color}`}>
            <div className="flex items-center gap-2.5">
              <Heart size={18} weight="fill" className="shrink-0" />
              <div>
                <div className="text-base font-bold sm:text-lg">
                  {anemiaStatus.level} ({hb} g/dL)
                </div>
                <div className="opacity-90">
                  {hb < 7.0
                    ? t("patientDetail.nutrition.adviceSevere")
                    : hb < 11.0
                    ? t("patientDetail.nutrition.adviceAnaemia")
                    : t("patientDetail.nutrition.adviceNormal")}
                </div>
              </div>
            </div>
          </div>

          {/* Trimester Focus Card */}
          <div className="space-y-1.5 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 sm:p-5">
            <div className="text-base font-bold text-[var(--color-foreground)] sm:text-lg">{trimesterFocus.title}</div>
            <div className="text-[var(--color-charcoal)]">
              <strong>{t("patientDetail.nutrition.goal")}</strong> {trimesterFocus.focus}
            </div>
            <div className="font-semibold text-[var(--color-primary)]">
              {t("patientDetail.nutrition.energy", { value: trimesterFocus.calorieSurplus })}
            </div>
          </div>

          {/* Affordable Local Superfoods */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Plant size={18} weight="bold" className="shrink-0 text-[var(--color-primary)]" />
              <h3 className="text-base font-bold text-[var(--color-foreground)] sm:text-lg">
                {t("patientDetail.nutrition.superfoods")}
              </h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {superfoods.map((food, idx) => (
                <div
                  key={idx}
                  className="space-y-1.5 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:p-5"
                >
                  <div className="text-base font-bold text-[var(--color-primary)]">{food.name}</div>
                  <div className="text-[var(--color-foreground)]">{food.benefit}</div>
                  <div className="text-sm italic text-[var(--color-charcoal)]">{t("patientDetail.nutrition.howToEat", { usage: food.usage })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Iron Tablet Rules */}
          <div className="space-y-2 rounded-[var(--radius-cards)] border border-[var(--color-due)]/30 bg-[var(--color-due-surface)] p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-foreground)] sm:text-lg">
              <Pill size={18} weight="bold" className="shrink-0 text-[var(--color-due)]" />
              <span>{t("patientDetail.nutrition.rulesTitle")}</span>
            </h3>
            <ul className="max-w-4xl list-disc space-y-1.5 pl-5 text-[var(--color-foreground)] opacity-90">
              <li>
                <strong>{t("patientDetail.nutrition.rule1.title")}</strong> {t("patientDetail.nutrition.rule1.body")}
              </li>
              <li>
                <strong>{t("patientDetail.nutrition.rule2.title")}</strong> {t("patientDetail.nutrition.rule2.body")}
              </li>
              <li>
                <strong>{t("patientDetail.nutrition.rule3.title")}</strong> {t("patientDetail.nutrition.rule3.body")}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions with WhatsApp Share */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 sm:px-6 lg:px-8">
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-charcoal)]">
            <span>{t("patientDetail.nutrition.waLang")}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "hi" | "mr")}
              className="rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 font-semibold text-[var(--color-foreground)]"
            >
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonPrimary}
              >
                <WhatsappLogo size={14} weight="bold" />
                <span>{t("patientDetail.nutrition.send")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generateWhatsAppMessage());
                  alert(t("patientDetail.nutrition.copied"));
                }}
                className={buttonPrimary}
              >
                <WhatsappLogo size={14} weight="bold" />
                <span>{t("patientDetail.nutrition.copy")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={buttonSecondary}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </PatientDetailDialog>
  );
}
