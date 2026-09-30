import { SupportedLanguage } from "@/lib/whatsapp";

export interface BotProcessResult {
  success: boolean;
  replyText: string;
  actionTaken: "confirmed_visit" | "reschedule_requested" | "info_provided" | "menu_sent" | "fallback";
  patientId: string;
  patientName: string;
  outcomeLogged?: string;
  error?: string;
}

export interface BotPromptOptions {
  patientId: string;
  patientName: string;
  careEventName?: string;
  reason: "overdue" | "due_soon" | "at_risk" | "lost";
  lang?: SupportedLanguage;
  clinicName?: string;
}

/** Formats an interactive automated WhatsApp reminder with 1/2/3 quick reply prompts */
export function buildAutomatedReminderMessage(opts: BotPromptOptions): string {
  const lang = opts.lang || "en";
  const clinic = opts.clinicName || "MatruSetu Clinic";
  const item = opts.careEventName || (lang === "mr" ? "नियमित तपासणी" : lang === "hi" ? "नियमित जांच" : "ANC checkup");
  const name = opts.patientName;

  if (lang === "mr") {
    return (
      `🏥 *${clinic} - माता व बाल आरोग्य*\n\n` +
      `नमस्कार *${name}* ताई, आपली *${item}* तपासणीची वेळ जवळ आली आहे. वेळेवर तपासणी माता आणि बाळाच्या निरोगी वाढीसाठी अत्यंत आवश्यक आहे.\n\n` +
      `कृपया खालील पर्यायांपैकी क्रमांक टाईप करून उत्तर द्या:\n` +
      `1️⃣ - मी या आठवड्यात क्लिनिकला भेट देईन (पुष्टी करा)\n` +
      `2️⃣ - मला नवीन तारीख हवी आहे (क्लिनिकमधून कॉल हवा)\n` +
      `3️⃣ - तपासणीची पूर्वतयारी व माहिती हवी आहे\n\n` +
      `_आपण थेट संदेश पाठवूनही संपर्क साधू शकता._`
    );
  }

  if (lang === "hi") {
    return (
      `🏥 *${clinic} - मातृ एवं शिशु स्वास्थ्य*\n\n` +
      `नमस्ते *${name}* जी, आपकी *${item}* की जांच का समय नजदीक है। समय पर जांच आपके और शिशु के सुरक्षित स्वास्थ्य के लिए आवश्यक है।\n\n` +
      `कृपया नीचे दिए गए विकल्पों में से नंबर लिखकर उत्तर दें:\n` +
      `1️⃣ - मैं इस सप्ताह क्लिनिक आऊंगी (पुष्टि करें)\n` +
      `2️⃣ - मुझे नई तारीख चाहिए (क्लिनिक से कॉल प्राप्त करें)\n` +
      `3️⃣ - जांच की तैयारी व जानकारी चाहिए\n\n` +
      `_आप सीधे संदेश लिखकर भी संपर्क कर सकती हैं।_`
    );
  }

  // English (default)
  return (
    `🏥 *${clinic} - Maternal Health Companion*\n\n` +
    `Hello *${name}*, your scheduled *${item}* is due soon. Regular antenatal visits protect you and your baby's healthy development.\n\n` +
    `Please reply with a number:\n` +
    `1️⃣ - I will visit this week (Confirm)\n` +
    `2️⃣ - Request a callback to reschedule\n` +
    `3️⃣ - Get scan instructions & preparation\n\n` +
    `_Or reply in your preferred language._`
  );
}

/** Detects user intent from incoming text message in EN/HI/MR */
function detectIntent(text: string): "confirm" | "reschedule" | "info" | "fallback" {
  const t = text.trim().toLowerCase();

  // 1. Confirm intents: "1", "१", "confirm", "yes", "haan", "हो", "येणार", "आएंगे", "आऊंगी", "होय"
  if (
    t === "1" ||
    t === "१" ||
    t.includes("confirm") ||
    t.includes("yes") ||
    t.includes("haan") ||
    t.includes("hanji") ||
    t.includes("हो") ||
    t.includes("येणार") ||
    t.includes("येतो") ||
    t.includes("आएंगे") ||
    t.includes("आऊंगी") ||
    t.includes("visit")
  ) {
    return "confirm";
  }

  // 2. Reschedule intents: "2", "२", "reschedule", "call", "help", "change", "मदत", "कॉल", "तारीख", "बदला", "मदद"
  if (
    t === "2" ||
    t === "२" ||
    t.includes("reschedule") ||
    t.includes("call") ||
    t.includes("help") ||
    t.includes("मदत") ||
    t.includes("मदद") ||
    t.includes("कॉल") ||
    t.includes("तारीख") ||
    t.includes("बदला") ||
    t.includes("फोन")
  ) {
    return "reschedule";
  }

  // 3. Info intents: "3", "३", "scan", "test", "info", "prep", "सोनोग्राफी", "तपासणी", "जांच", "तयारी", "डॉक्युमेंट"
  if (
    t === "3" ||
    t === "३" ||
    t.includes("scan") ||
    t.includes("test") ||
    t.includes("info") ||
    t.includes("prep") ||
    t.includes("सोनोग्राफी") ||
    t.includes("तपासणी") ||
    t.includes("जांच") ||
    t.includes("तयारी") ||
    t.includes("instructions")
  ) {
    return "info";
  }

  return "fallback";
}

/** Auto-detects language from input string */
export function detectLanguage(text: string, fallback: SupportedLanguage = "en"): SupportedLanguage {
  // Check Devanagari Unicode block
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) {
    // Check Marathi specific words/characters: ळ, ताई, येणार, नमस्कार, आहेत
    if (/[\u0933]|ताई|येणार|आहेत|नमस्कार|करा|तपासणी/.test(text)) {
      return "mr";
    }
    return "hi";
  }
  return fallback;
}

/**
 * Handles incoming WhatsApp messages from either live webhook or test simulator.
 * Identifies patient, updates contact_log in Supabase, and returns automated reply.
 */
export async function handleIncomingWhatsAppMessage({
  phone,
  patientId,
  messageText,
  preferredLang,
}: {
  phone?: string;
  patientId?: string;
  messageText: string;
  preferredLang?: SupportedLanguage;
}): Promise<BotProcessResult> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Find patient by ID or by normalized phone
  let patientQuery = admin.from("patients").select("id, name, clinic_id, phone, status");
  if (patientId) {
    patientQuery = patientQuery.eq("id", patientId);
  } else if (phone) {
    const rawDigits = phone.replace(/\D/g, "");
    const last10 = rawDigits.slice(-10);
    patientQuery = patientQuery.ilike("phone", `%${last10}%`);
  } else {
    return {
      success: false,
      replyText: "Error: No patient identified.",
      actionTaken: "fallback",
      patientId: "",
      patientName: "",
      error: "Missing patient identifier",
    };
  }

  const { data: patients, error: patientErr } = await patientQuery.limit(1);
  if (patientErr || !patients || patients.length === 0) {
    return {
      success: false,
      replyText: "Patient record not found in MatruSetu directory.",
      actionTaken: "fallback",
      patientId: "",
      patientName: "",
      error: patientErr?.message || "Patient not found",
    };
  }

  const patient = patients[0];
  const lang = preferredLang || detectLanguage(messageText, "en");
  const intent = detectIntent(messageText);

  // Get clinic info for context
  const { data: clinic } = await admin.from("clinics").select("name, phone").eq("id", patient.clinic_id).single();
  const clinicName = clinic?.name || "MatruSetu Clinic";

  if (intent === "confirm") {
    // Patient confirmed visit -> update contact_log with will_visit
    await admin.from("contact_log").insert({
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      channel: "whatsapp",
      outcome: "will_visit",
      notes: `Automated WhatsApp Bot: Patient replied "${messageText.trim()}". Confirmed upcoming visit.`,
    });

    let reply = "";
    if (lang === "mr") {
      reply =
        `✅ *धन्यवाद ${patient.name} ताई!* आपल्या तपासणीची नोंद करण्यात आली आहे.\n\n` +
        `🏥 *क्लिनिक वेळ:* सोमवार ते शनिवार, सकाळी 9:00 ते संध्याकाळी 6:00.\n\n` +
        `⚠️ *महत्त्वाची सूचना:* तीव्र डोकेदुखी, अंधुक दिसणे, रक्तस्राव किंवा बाळाची हालचाल कमी जाणवल्यास वाट पाहू नका — त्वरित क्लिनिक किंवा 24x7 प्रसूती कक्षाला भेट द्या.`;
    } else if (lang === "hi") {
      reply =
        `✅ *धन्यवाद ${patient.name} जी!* आपकी नियमित जांच की पुष्टि दर्ज कर ली गई है।\n\n` +
        `🏥 *क्लिनिक समय:* सोमवार से शनिवार, सुबह 9:00 से शाम 6:00 बजे तक।\n\n` +
        `⚠️ *आवश्यक सूचना:* यदि तेज सिरदर्द, धुंधला दिखना, रक्तस्राव या शिशु की हलचल कम लगे, तो प्रतीक्षा न करें — तुरंत क्लिनिक या 24x7 लेबर रूम में पधारें।`;
    } else {
      reply =
        `✅ *Thank you, ${patient.name}!* Your ANC visit confirmation has been recorded.\n\n` +
        `🏥 *Clinic Hours:* Monday to Saturday, 9:00 AM – 6:00 PM.\n\n` +
        `⚠️ *Danger Signs:* If you experience severe headache, blurring of vision, bleeding, or reduced fetal movements, do not wait — visit our 24x7 emergency labor room immediately.`;
    }

    return {
      success: true,
      replyText: reply,
      actionTaken: "confirmed_visit",
      patientId: patient.id,
      patientName: patient.name,
      outcomeLogged: "will_visit",
    };
  }

  if (intent === "reschedule") {
    // Patient requested callback / reschedule -> update contact_log with reached
    await admin.from("contact_log").insert({
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      channel: "whatsapp",
      outcome: "reached",
      notes: `Automated WhatsApp Bot: Patient replied "${messageText.trim()}". Requested callback to reschedule.`,
    });

    let reply = "";
    if (lang === "mr") {
      reply =
        `📞 *समजले ${patient.name} ताई.* आमची क्लिनिक सिस्टर आपल्याला सोयीची नवीन तारीख ठरवण्यासाठी लवकरच कॉल करेल.\n\n` +
        `कोणत्याही तातडीच्या प्रसंगी आमच्या 24x7 आपत्कालीन क्रमांकावर किंवा 108 वर संपर्क साधा.`;
    } else if (lang === "hi") {
      reply =
        `📞 *समझ गए ${patient.name} जी।* हमारी क्लिनिक स्टाफ/सिस्टर आपको कॉल करके आपकी सुविधानुसार नई तारीख तय करेंगी।\n\n` +
        `किसी भी आपातकालीन स्थिति में तुरंत हमारी हेल्पलाइन या 108 पर संपर्क करें।`;
    } else {
      reply =
        `📞 *Understood, ${patient.name}.* Our clinic nurse will call you shortly during OPD hours to help reschedule your appointment.\n\n` +
        `For medical emergencies, please reach our 24x7 maternity desk or dial 108.`;
    }

    return {
      success: true,
      replyText: reply,
      actionTaken: "reschedule_requested",
      patientId: patient.id,
      patientName: patient.name,
      outcomeLogged: "reached",
    };
  }

  if (intent === "info") {
    // Look up upcoming care event
    const { data: upcomingEvents } = await admin
      .from("care_events")
      .select("name, due_from, due_to")
      .eq("patient_id", patient.id)
      .is("completed_at", null)
      .is("skipped_reason", null)
      .order("due_from", { ascending: true })
      .limit(1);

    const eventName = upcomingEvents?.[0]?.name || "Upcoming ANC Scan";

    let reply = "";
    if (lang === "mr") {
      reply =
        `📋 *${eventName} - पूर्वतयारी माहिती:*\n\n` +
        `• *सोनोग्राफी स्कॅन:* स्कॅनच्या 1 तास आधी 3-4 ग्लास पाणी प्यावे (मूत्राशय भरलेले असल्यास स्पष्ट तपासणी होते).\n` +
        `• *रक्त तपासणी / OGTT:* ग्लुकोज चाचणीसाठी उपाशीपोटी येण्याची गरज नाही.\n` +
        `• *कागदपत्रे:* आपले मातृसेतु कार्ड, मागील सर्व स्कॅन रिपोर्ट्स व औषध चिठ्ठी सोबत आणा.\n\n` +
        `पुष्टी करण्यासाठी *1* दाबा, किंवा कॉल हवा असल्यास *2* दाबा.`;
    } else if (lang === "hi") {
      reply =
        `📋 *${eventName} - तैयारी निर्देश:*\n\n` +
        `• *सोनोग्राफी जांच:* जांच से 1 घंटा पहले 3-4 गिलास पानी पिएं (मूत्राशय भरा होने से स्पष्ट इमेज मिलती है)।\n` +
        `• *रक्त जांच / OGTT:* ग्लूकोज जांच के लिए भूखे पेट आने की आवश्यकता नहीं है।\n` +
        `• *दस्तावेज:* अपना मातृसेतु कार्ड, पिछली सभी सोनोग्राफी और ब्लड रिपोर्ट्स साथ लाएं।\n\n` +
        `पुष्टि के लिए *1* लिखें, या कॉल सहायता के लिए *2* लिखें।`;
    } else {
      reply =
        `📋 *${eventName} - Preparation Guidelines:*\n\n` +
        `• *Ultrasound Scans:* Drink 3-4 glasses of water 1 hour prior to scan (moderately full bladder helps soundwave penetration).\n` +
        `• *Glucose Test (OGTT/DIPSI):* Fasting is NOT mandatory for single-step DIPSI.\n` +
        `• *Documents:* Please bring your MatruSetu ANC card, previous ultrasound films, and current medication.\n\n` +
        `Reply *1* to confirm visit, or *2* to request callback.`;
    }

    return {
      success: true,
      replyText: reply,
      actionTaken: "info_provided",
      patientId: patient.id,
      patientName: patient.name,
    };
  }

  // Fallback: Send Interactive Menu
  let fallbackReply = "";
  if (lang === "mr") {
    fallbackReply =
      `नमस्कार ${patient.name} ताई, *${clinicName}* स्वयंचलित WhatsApp सहाय्यक!\n\n` +
      `कृपया खालील पर्यायांपैकी एक निवडा:\n` +
      `1️⃣ - भेटीची पुष्टी करण्यासाठी\n` +
      `2️⃣ - नवीन तारीख ठरवण्यासाठी कॉल मागवण्यासाठी\n` +
      `3️⃣ - पुढील तपासणी व स्कॅन पूर्वतयारी माहितीसाठी`;
  } else if (lang === "hi") {
    fallbackReply =
      `नमस्ते ${patient.name} जी, *${clinicName}* स्वचालित WhatsApp सहायक!\n\n` +
      `कृपया निम्न में से एक विकल्प चुनें:\n` +
      `1️⃣ - जांच की पुष्टि करने के लिए\n` +
      `2️⃣ - नई तारीख के लिए क्लिनिक से कॉल पाने हेतु\n` +
      `3️⃣ - अगली जांच व सोनोग्राफी तैयारी की जानकारी हेतु`;
  } else {
    fallbackReply =
      `Hello ${patient.name}, *${clinicName}* automated WhatsApp companion!\n\n` +
      `Please reply with:\n` +
      `1️⃣ - Confirm upcoming visit\n` +
      `2️⃣ - Request a callback to reschedule\n` +
      `3️⃣ - Get scan instructions & preparation tips`;
  }

  return {
    success: true,
    replyText: fallbackReply,
    actionTaken: "menu_sent",
    patientId: patient.id,
    patientName: patient.name,
  };
}
