"use client";

import { useState, useTransition, useRef, useEffect, useEffectEvent } from "react";
import { CheckCircle, PaperPlaneTilt, ArrowClockwise, X, Robot, ShieldCheck, WhatsappLogo } from "@phosphor-icons/react";
import { dispatchBotReminder, processBotReply } from "@/app/(app)/calls/actions";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/whatsapp";
import { useT, useLocale } from "@/lib/i18n/provider";
import { intlLocale } from "@/lib/i18n/intl";
import { careEventName } from "@/lib/clinicalLabels";

export interface BotSimulatorPatient {
  id: string;
  name: string;
  phone: string | null;
  careEventName?: string;
  reason: "overdue" | "due_soon" | "at_risk" | "lost";
}

interface Message {
  id: string;
  sender: "bot" | "patient";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

let globalMsgSeq = 0;
function nextMessageId(prefix: string): string {
  globalMsgSeq += 1;
  return `${prefix}-${globalMsgSeq}`;
}

function getCurrentTimeString(tag: string): string {
  return new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function WhatsAppBotSimulator({
  patients: queuePatients,
  initialPatientId,
  initialLang = "en",
  onClose,
}: {
  patients: BotSimulatorPatient[];
  initialPatientId?: string;
  initialLang?: SupportedLanguage;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeTag = intlLocale(locale);
  // Logging a reminder refreshes the underlying queue. Keep the open
  // conversation on the selected patient even if they leave the worklist.
  const [patients] = useState(queuePatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatientId || patients[0]?.id || ""
  );
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dbUpdateNotice, setDbUpdateNotice] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // An effect replay must reuse the in-flight request for this selection.
  const requestRef = useRef<{ key: string; result: ReturnType<typeof dispatchBotReminder> } | null>(null);
  const [restart, setRestart] = useState(0);
  const showReminder = useEffectEvent((text: string) => {
    setMessages([{ id: nextMessageId("msg"), sender: "bot", text, time: getCurrentTimeString(timeTag), status: "read" }]);
    setDbUpdateNotice(t(restart ? "calls.bot.noticeRedispatched" : "calls.bot.noticeDispatched"));
  });
  const showReminderError = useEffectEvent((error?: string) => {
    setDbUpdateNotice(t("calls.bot.noticeError", { error: error || t("calls.error.db") }));
  });
  useEffect(() => {
    if (!currentPatient) return;
    let active = true;
    startTransition(async () => {
      try {
        const key = JSON.stringify([currentPatient.id, lang, restart]);
        if (requestRef.current?.key !== key) {
          const result = dispatchBotReminder(currentPatient.id, currentPatient.name, currentPatient.careEventName, currentPatient.reason, lang);
          requestRef.current = { key, result };
        }
        const res = await requestRef.current.result;
        if (!active) return;
        if (res.reminderText) {
          showReminder(res.reminderText);
        } else if (res.error) {
          showReminderError(res.error);
        }
      } catch (error) {
        if (active) showReminderError(error instanceof Error ? error.message : undefined);
      }
    });
    return () => { active = false; };
  }, [currentPatient, lang, restart]);

  const handleSendPatientReply = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentPatient || isPending) return;

    const userMsgId = nextMessageId("usr");
    const userTime = getCurrentTimeString(timeTag);

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "patient",
        text,
        time: userTime,
      },
    ]);
    setInputText("");

    // Process via Bot action
    startTransition(async () => {
      const res = await processBotReply(currentPatient.id, text, lang);
      const replyTime = getCurrentTimeString(timeTag);

      if (res.result) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId("bot"),
            sender: "bot",
            text: res.result!.replyText,
            time: replyTime,
            status: "read",
          },
        ]);

        if (res.result.actionTaken === "confirmed_visit") {
          setDbUpdateNotice(t("calls.bot.noticeConfirmed"));
        } else if (res.result.actionTaken === "reschedule_requested") {
          setDbUpdateNotice(t("calls.bot.noticeCallback"));
        } else {
          setDbUpdateNotice(t("calls.bot.noticeInfo"));
        }
      } else if (res.error) {
        setDbUpdateNotice(t("calls.bot.noticeError", { error: res.error }));
      }
    });
  };

  const getQuickReplies = () => {
    if (lang === "mr") {
      return [
        { label: "1️⃣ हो, मी येईन (Confirm)", text: "1 - होय, मी या आठवड्यात तपासणीसाठी नक्की येणार आहे." },
        { label: "2️⃣ कॉल हवा आहे (Reschedule)", text: "2 - मला तारीख बदलायची आहे, कृपया कॉल करा." },
        { label: "3️⃣ स्कॅन पूर्वतयारी माहिती", text: "3 - सोनोग्राफी स्कॅनची काय पूर्वतयारी करावी लागेल?" },
      ];
    }
    if (lang === "hi") {
      return [
        { label: "1️⃣ हां, मैं आऊंगी (Confirm)", text: "1 - हां, मैं इस सप्ताह क्लिनिक जांच के लिए आऊंगी।" },
        { label: "2️⃣ कॉल चाहिए (Reschedule)", text: "2 - मुझे नई तारीख चाहिए, कृपया क्लिनिक से कॉल करें।" },
        { label: "3️⃣ जांच पूर्व तैयारी", text: "3 - सोनोग्राफी जांच के लिए क्या तैयारी करनी होगी?" },
      ];
    }
    return [
      { label: "1️⃣ Confirm Visit (Yes)", text: "1 - Yes, I will visit the clinic this week." },
      { label: "2️⃣ Reschedule / Callback", text: "2 - I need to reschedule, please have staff call me." },
      { label: "3️⃣ Scan Preparation Tips", text: "3 - What are the instructions and preparation for my scan?" },
    ];
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("calls.bot.title")}
      onCancel={onClose}
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-sm border-0 bg-transparent p-0 text-[var(--color-foreground)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-[92dvh] max-h-[760px] w-full flex-col overflow-hidden rounded-[28px] border-[6px] border-[var(--color-pc-ink)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-[var(--color-on-track)] text-white rounded-full">
              <WhatsappLogo size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                  {t("calls.bot.title")}
                </h3>
                <span className="flex items-center gap-1 bg-[var(--color-on-track-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-track)] rounded-full">
                  <ShieldCheck size={12} weight="bold" />
                  {t("calls.bot.badge")}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-charcoal)]">
                {t("calls.bot.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-[var(--color-charcoal)] hover:bg-[var(--color-surface-1)] hover:text-black"
            aria-label={t("calls.bot.closeAria")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Bar: Patient & Language Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-[12px]">
          <div className="flex items-center gap-2 min-w-0">
            <label htmlFor="bot-patient" className="font-semibold text-[var(--color-charcoal)] whitespace-nowrap">{t("calls.bot.patient")}</label>
            <select
              id="bot-patient"
              disabled={isPending}
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setMessages([]);
                setInputText("");
                setDbUpdateNotice(null);
                setRestart(0);
              }}
              className="rounded-xl max-w-[260px] truncate border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 text-[12px] font-medium"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.careEventName ? careEventName(p.careEventName.split("(")[0].trim(), t) : t(`calls.reason.${p.reason}`)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--color-charcoal)]">{t("calls.toolbar.language")}</span>
            <div className="rounded-xl inline-flex border border-[var(--color-border-strong)] bg-[var(--color-background)] p-0.5">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={lang === l.code}
                  disabled={isPending}
                  onClick={() => {
                    if (lang === l.code) return;
                    setLang(l.code);
                    setMessages([]);
                    setInputText("");
                    setDbUpdateNotice(null);
                    setRestart(0);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    lang === l.code
                      ? "bg-[var(--color-foreground)] text-white font-semibold"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {l.nativeLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time DB Sync Status Banner */}
        {dbUpdateNotice && (
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-on-track-surface)] px-4 py-1.5 text-[11px] font-medium text-[var(--color-on-track)]">
            <CheckCircle size={14} weight="fill" className="shrink-0 text-[var(--color-on-track)]" />
            <span className="truncate">{dbUpdateNotice}</span>
          </div>
        )}

        {/* Phone Chat Simulator Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-surface-2)] relative">
          {/* Chat WhatsApp Header */}
          <div className="flex items-center justify-between bg-[var(--color-primary)] px-3.5 py-2 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center bg-white/20 text-white font-bold text-[12px] rounded-full">
                {currentPatient ? currentPatient.name.charAt(0) : "P"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold tracking-wide">
                    {currentPatient?.name || t("calls.bot.patientFallback")}
                  </span>
                  <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">
                    {currentPatient?.phone || "+91 98765 43210"}
                  </span>
                </div>
                <p className="text-[10px] text-white/80">{t("calls.bot.online")}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setRestart((count) => count + 1)}
              className="flex items-center gap-1 text-[11px] text-white/90 hover:text-white bg-white/10 px-2 py-1"
              title={t("calls.bot.resetTitle")}
            >
              <ArrowClockwise size={13} />
              <span>{t("calls.bot.reset")}</span>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex justify-center my-1">
              <span className="rounded bg-[var(--color-background)]/80 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-charcoal)] shadow-xs">
                {t("calls.bot.encrypted")}
              </span>
            </div>

            {messages.map((m) => {
              const isBot = m.sender === "bot";
              return (
                <div
                  key={m.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-[13px] leading-relaxed shadow-sm relative ${
                      isBot
                        ? "bg-[var(--color-background)] text-[var(--color-foreground)] border border-[var(--color-border)]"
                        : "bg-[var(--color-primary-surface)] text-[var(--color-foreground)]"
                    }`}
                  >
                    {isBot && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-primary)] mb-1">
                        <Robot size={12} weight="bold" />
                        <span>{t("calls.bot.name")}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--color-charcoal)]">
                      <span>{m.time}</span>
                      {isBot && m.status === "read" && (
                        <span className="text-[var(--color-info)] font-bold">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Simulated Response Chips */}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)] p-2">
            <div className="mb-1 text-[10px] font-bold text-[var(--color-charcoal)]">
              {t("calls.bot.quickTitle")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getQuickReplies().map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSendPatientReply(chip.text)}
                  className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-on-track-surface)] hover:border-[var(--color-on-track)] hover:text-[var(--color-on-track)] transition-all disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Text Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPatientReply();
            }}
            className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === "mr"
                  ? "मराठीत उत्तर टाईप करा (उदा. 1 किंवा 'मी येणार')..."
                  : lang === "hi"
                  ? "हिंदी में उत्तर लिखें (उदा. 1 या 'मैं आऊंगी')..."
                  : "Type simulated reply in English (or 1, 2, 3)..."
              }
              className="flex-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-4 py-2 text-[16px] md:text-[13px] focus:border-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isPending}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-40 transition-colors"
              title={t("calls.bot.send")}
              aria-label={t("calls.bot.send")}
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2 text-[11px] text-[var(--color-charcoal)]">
          <span>
            {t("calls.bot.webhook")} <code className="font-mono bg-[var(--color-surface-2)] px-1">/api/whatsapp/webhook</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-1 font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          >
            {t("common.done")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
