"use client";

import type { NutritionPatientData } from "@/components/NutritionDietModal";
import { useState } from "react";
import { WhatsappLogo, Heart, Plant, Pill } from "@phosphor-icons/react";
import { OverlayShell } from "@/components/OverlayShell";
import { showToast } from "@/components/Toaster";
import { whatsAppLink } from "@/lib/whatsapp";
import { buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
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
      ? { level: t("clinical.flag.hb_severe"), msgKey: "severe" as const, color: "text-[var(--color-overdue)] bg-[var(--color-overdue-surface)]" }
      : hb < 10.0
      ? { level: t("clinical.flag.hb_moderate"), msgKey: "moderate" as const, color: "text-[var(--color-due)] bg-[var(--color-due-surface)]" }
      : hb < 11.0
      ? { level: t("clinical.flag.hb_mild"), msgKey: "mild" as const, color: "text-[var(--color-due)] bg-[var(--color-due-surface)]" }
      : { level: t("patientDetail.nutrition.normalHb"), msgKey: "normal" as const, color: "text-[var(--color-on-track)] bg-[var(--color-on-track-surface)]" };

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
    <OverlayShell
      title={t("patientDetail.nutrition.title")}
      subtitle={
        <>
          {t("patientDetail.nutrition.tailored", { name: data.patientName })} · Hb: <strong className="num">{hb} g/dL</strong>
        </>
      }
      badge={
        <span className="rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
          {t("clinical.trimester.short", { n: currentTrimester })}
        </span>
      }
      closeLabel={t("common.close")}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <label htmlFor="nutrition-wa-lang" className="text-[13px] font-medium text-[var(--color-charcoal)]">
              {t("patientDetail.nutrition.waLang")}
            </label>
            <select
              id="nutrition-wa-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "hi" | "mr")}
              className={`${inputClass} !w-auto`}
            >
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
              <option value="en">English</option>
            </select>
          </div>
          <button type="button" onClick={onClose} className={buttonSecondary}>
            {t("common.close")}
          </button>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className={buttonPrimary}>
              <WhatsappLogo size={18} weight="bold" aria-hidden />
              <span>{t("patientDetail.nutrition.send")}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generateWhatsAppMessage());
                showToast(t("patientDetail.nutrition.copied"));
              }}
              className={buttonPrimary}
            >
              <WhatsappLogo size={18} weight="bold" aria-hidden />
              <span>{t("patientDetail.nutrition.copy")}</span>
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div role="status" className={`flex items-start gap-2.5 rounded-[var(--radius-buttons)] p-3 ${anemiaStatus.color}`}>
          <Heart size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <div className="num text-[14px] font-semibold">
              {anemiaStatus.level} ({hb} g/dL)
            </div>
            <div className="text-[13px] text-[var(--color-foreground)]">
              {hb < 7.0
                ? t("patientDetail.nutrition.adviceSevere")
                : hb < 11.0
                  ? t("patientDetail.nutrition.adviceAnaemia")
                  : t("patientDetail.nutrition.adviceNormal")}
            </div>
          </div>
        </div>

        <section className="space-y-1 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-3">
          <h3 className="text-[14px] font-semibold">{trimesterFocus.title}</h3>
          <p className="text-[13px] text-[var(--color-charcoal)]">
            <strong>{t("patientDetail.nutrition.goal")}</strong> {trimesterFocus.focus}
          </p>
          <p className="text-[13px] font-semibold text-[var(--color-primary)]">
            {t("patientDetail.nutrition.energy", { value: trimesterFocus.calorieSurplus })}
          </p>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold">
            <Plant size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
            {t("patientDetail.nutrition.superfoods")}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {superfoods.map((food, idx) => (
              <li key={idx} className="space-y-1 rounded-[var(--radius-buttons)] border border-[var(--color-border)] p-3">
                <div className="text-[14px] font-semibold text-[var(--color-primary)]">{food.name}</div>
                <div className="text-[13px]">{food.benefit}</div>
                <div className="text-[12px] text-[var(--color-charcoal)]">{t("patientDetail.nutrition.howToEat", { usage: food.usage })}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-[var(--radius-buttons)] bg-[var(--color-due-surface)] p-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">
            <Pill size={16} weight="bold" className="text-[var(--color-due)]" aria-hidden />
            <span>{t("patientDetail.nutrition.rulesTitle")}</span>
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
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
        </section>
      </div>
    </OverlayShell>
  );
}
