"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { CheckCircle, PaperPlaneTilt, ArrowClockwise, X, Robot, ShieldCheck, WhatsappLogo } from "@phosphor-icons/react";
import { dispatchBotReminder, processBotReply } from "@/app/(app)/calls/actions";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/whatsapp";

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

function getCurrentTimeString(): string {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function WhatsAppBotSimulator({
  patients,
  initialPatientId,
  initialLang = "en",
  onClose,
}: {
  patients: BotSimulatorPatient[];
  initialPatientId?: string;
  initialLang?: SupportedLanguage;
  onClose: () => void;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatientId || patients[0]?.id || ""
  );
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dbUpdateNotice, setDbUpdateNotice] = useState<string | null>(null);

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial trigger of reminder when opening or changing patient/language
  useEffect(() => {
    if (!currentPatient) return;
    let isCancelled = false;

    startTransition(async () => {
      const res = await dispatchBotReminder(
        currentPatient.id,
        currentPatient.name,
        currentPatient.careEventName,
        currentPatient.reason,
        lang
      );
      if (isCancelled) return;
      if (res.reminderText) {
        setMessages([
          {
            id: nextMessageId("msg"),
            sender: "bot",
            text: res.reminderText,
            time: getCurrentTimeString(),
            status: "read",
          },
        ]);
        setDbUpdateNotice("Dispatched automated WhatsApp reminder → Logged to Supabase contact_log");
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPatient, lang]);

  const handleSendPatientReply = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentPatient || isPending) return;

    const userMsgId = nextMessageId("usr");
    const userTime = getCurrentTimeString();

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
      const replyTime = getCurrentTimeString();

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
          setDbUpdateNotice("⚡ Supabase contact_log updated: OUTCOME = 'will_visit' (Confirmed)");
        } else if (res.result.actionTaken === "reschedule_requested") {
          setDbUpdateNotice("⚡ Supabase contact_log updated: OUTCOME = 'reached' (Callback Requested)");
        } else {
          setDbUpdateNotice("⚡ Bot replied with clinical preparation guidelines");
        }
      } else if (res.error) {
        setDbUpdateNotice(`Error: ${res.error}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[92vh] w-full max-w-2xl flex-col border border-[var(--color-border-strong)] bg-[var(--color-background)] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-[#25D366] text-white">
              <WhatsappLogo size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                  WhatsApp Business Bot Simulator
                </h3>
                <span className="flex items-center gap-1 bg-[#E7F8EE] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#128C7E]">
                  <ShieldCheck size={12} weight="bold" />
                  Meta Webhook Ready
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-charcoal)]">
                Live 2-way patient simulation · Syncs with Supabase RLS & Call Queue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-[var(--color-charcoal)] hover:bg-[var(--color-surface-1)] hover:text-black"
            aria-label="Close simulator"
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Bar: Patient & Language Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-[12px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-[var(--color-charcoal)] whitespace-nowrap">Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="max-w-[260px] truncate border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 text-[12px] font-medium"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.careEventName || p.reason})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--color-charcoal)]">Language:</span>
            <div className="inline-flex border border-[var(--color-border-strong)] bg-[var(--color-background)] p-0.5">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
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
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[#F0FDF4] px-4 py-1.5 text-[11px] font-medium text-[#166534]">
            <CheckCircle size={14} weight="fill" className="shrink-0 text-[#16a34a]" />
            <span className="truncate">{dbUpdateNotice}</span>
          </div>
        )}

        {/* Phone Chat Simulator Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#ECE5DD] relative">
          {/* Chat WhatsApp Header */}
          <div className="flex items-center justify-between bg-[#075E54] px-3.5 py-2 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center bg-white/20 text-white font-bold text-[12px] rounded-full">
                {currentPatient ? currentPatient.name.charAt(0) : "P"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold tracking-wide">
                    {currentPatient?.name || "Patient"}
                  </span>
                  <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">
                    {currentPatient?.phone || "+91 98765 43210"}
                  </span>
                </div>
                <p className="text-[10px] text-white/80">Online · MatruSetu Verified Care Companion</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  if (!currentPatient) return;
                  const res = await dispatchBotReminder(
                    currentPatient.id,
                    currentPatient.name,
                    currentPatient.careEventName,
                    currentPatient.reason,
                    lang
                  );
                  if (res.reminderText) {
                    setMessages([
                      {
                        id: nextMessageId("msg"),
                        sender: "bot",
                        text: res.reminderText,
                        time: getCurrentTimeString(),
                        status: "read",
                      },
                    ]);
                    setDbUpdateNotice("Re-dispatched automated reminder");
                  }
                });
              }}
              className="flex items-center gap-1 text-[11px] text-white/90 hover:text-white bg-white/10 px-2 py-1"
              title="Restart simulation"
            >
              <ArrowClockwise size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex justify-center my-1">
              <span className="rounded bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 shadow-xs uppercase tracking-wider">
                TODAY · 256-BIT END-TO-END ENCRYPTED
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
                        ? "bg-white text-gray-900 border border-black/5"
                        : "bg-[#DCF8C6] text-gray-900"
                    }`}
                  >
                    {isBot && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-[#075E54] mb-1">
                        <Robot size={12} weight="bold" />
                        <span>MatruSetu Clinic Bot</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                      <span>{m.time}</span>
                      {isBot && m.status === "read" && (
                        <span className="text-[#34B7F1] font-bold">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Simulated Response Chips */}
          <div className="border-t border-[#d1d7db] bg-[#f0f2f5] p-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Quick Patient Responses (Click to test):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getQuickReplies().map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSendPatientReply(chip.text)}
                  className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-800 shadow-2xs hover:bg-[#E7F8EE] hover:border-[#128C7E] hover:text-[#128C7E] transition-all disabled:opacity-50"
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
            className="flex items-center gap-2 border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-2"
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
              className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] outline-none focus:border-[#128C7E]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isPending}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#128C7E] text-white shadow-sm hover:bg-[#075E54] disabled:opacity-40 transition-colors"
              title="Send reply"
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2 text-[11px] text-[var(--color-charcoal)]">
          <span>
            Webhook Route: <code className="font-mono bg-[var(--color-surface-2)] px-1">/api/whatsapp/webhook</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-1 font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
