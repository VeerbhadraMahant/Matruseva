/**
 * AI Vernacular Patient Counseling Generator
 * Produces personalized, medically sound, and compassionate antenatal counseling
 * scripts in Hindi, Marathi, Gujarati, and English for pregnant mothers and families.
 */

export type CounselingLanguage = "hi" | "mr" | "gu" | "en";

export interface CounselingPatientData {
  patientId: string;
  patientName: string;
  phone?: string | null;
  age?: number | null;
  gaWeeks?: number | null;
  trimester?: 1 | 2 | 3 | null;
  bpSys?: number | null;
  bpDia?: number | null;
  hb?: number | null;
  fhr?: number | null;
  riskFlags?: string[];
  nextVisitDate?: string | null;
  clinicName?: string | null;
  doctorOrAshaName?: string | null;
  doctorCustomNote?: string | null;
}

export interface CounselingSection {
  title: string;
  content: string;
}

export interface GeneratedCounseling {
  language: CounselingLanguage;
  languageLabel: string;
  nativeLabel: string;
  speechText: string;
  sections: CounselingSection[];
  whatsappMessage: string;
  dangerSigns: string[];
}

export const COUNSELING_LANGUAGES: { code: CounselingLanguage; label: string; nativeLabel: string }[] = [
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "en", label: "English", nativeLabel: "English" },
];

/**
 * Calculates current pregnancy month from weeks
 */
export function getPregnancyMonth(weeks: number): number {
  if (weeks <= 4) return 1;
  if (weeks <= 8) return 2;
  if (weeks <= 13) return 3;
  if (weeks <= 17) return 4;
  if (weeks <= 21) return 5;
  if (weeks <= 26) return 6;
  if (weeks <= 30) return 7;
  if (weeks <= 35) return 8;
  return 9;
}

/**
 * Generates structured counseling content based on clinical vitals & language.
 */
export function generateCounseling(
  data: CounselingPatientData,
  lang: CounselingLanguage = "hi"
): GeneratedCounseling {
  const name = data.patientName.trim();
  const weeks = data.gaWeeks ?? 24;
  const month = getPregnancyMonth(weeks);
  const trimester = data.trimester ?? (weeks <= 12 ? 1 : weeks <= 27 ? 2 : 3);
  const hb = data.hb ?? 10.5;
  const isAnemic = hb < 11.0;
  const isSeverelyAnemic = hb < 7.0;
  const bpSys = data.bpSys ?? 120;
  const bpDia = data.bpDia ?? 80;
  const isHighBp = bpSys >= 140 || bpDia >= 90;
  const clinic = data.clinicName || "मातृसेतु क्लिनिक";
  const customNote = data.doctorCustomNote?.trim() ? ` ${data.doctorCustomNote.trim()}` : "";

  if (lang === "hi") {
    const dangerSigns = [
      "तेज सिरदर्द, चक्कर आना या आंखों के सामने धुंधलापन",
      "चेहरे, हाथों या पैरों पर अचानक बहुत ज्यादा सूजन",
      "योनि से रक्तस्त्राव (ब्लीडिंग) या पानी जैसा तरल बहना",
      "पेट के निचले हिस्से में तेज या असहनीय दर्द",
      "शिशु की हलचल (किक) का कम होना या बंद होना",
      "तेज बुखार या ठंड लगना",
    ];

    const greeting = `नमस्ते ${name} जी, यह संदेश ${clinic} की तरफ से आपके और आपके गर्भस्थ शिशु के स्वास्थ्य के लिए है।`;
    
    let statusText = `आपकी गर्भावस्था का ${weeks}वां सप्ताह (${month}वां महीना) चल रहा है। इस समय शिशु का शारीरिक विकास तेजी से हो रहा है।`;
    if (trimester === 1) {
      statusText = `आपकी गर्भावस्था का ${weeks}वां सप्ताह (${month}वां महीना) चल रहा है। यह पहला तिमाही शिशु के मुख्य अंगों के निर्माण का सबसे नाजुक समय है।`;
    } else if (trimester === 3) {
      statusText = `आपकी गर्भावस्था का ${weeks}वां सप्ताह (${month}वां महीना) चल रहा है। आप गर्भावस्था के अंतिम चरण में हैं और शिशु का वजन लगातार बढ़ रहा है।`;
    }

    let medicationAdvice = `अपनी दैनिक दवाएं नियमित समय पर लें।`;
    if (isSeverelyAnemic) {
      medicationAdvice = `जांच में आपका हीमोग्लोबिन ${hb} g/dL पाया गया है, जो बहुत कम है। डॉक्टर द्वारा बताई गई लाल आयरन की गोलियां दिन में दो बार लें। इसे चाय या दूध के साथ न लें, बल्कि नींबू पानी या सादे पानी के साथ लें। साथ ही हरी पत्तेदार सब्जियां, पालक, गुड़ और भुना चना जरूर खाएं।`;
    } else if (isAnemic) {
      medicationAdvice = `आपका हीमोग्लोबिन ${hb} g/dL है। खून की कमी से बचने के लिए आयरन की लाल गोली रोजाना दोपहर के भोजन के 1 घंटे बाद नींबू पानी के साथ लें। कैल्शियम की सफेद गोली सुबह नाश्ते के बाद लें—याद रखें कि आयरन और कैल्शियम की गोली कभी एक साथ न लें।`;
    } else {
      medicationAdvice = `आपका हीमोग्लोबिन ${hb} g/dL बहुत अच्छा और सामान्य है। इसे बनाए रखने के लिए रोजाना आयरन और कैल्शियम की गोलियां समय पर लें, और भोजन में दाल, मौसमी फल और हरी सब्जियां शामिल रखें।`;
    }

    if (isHighBp) {
      medicationAdvice += ` आज आपका रक्तचाप (BP) ${bpSys}/${bpDia} mmHg आया है जो सामान्य से थोड़ा अधिक है। खाने में नमक, पापड़, और अचार कम करें, चिंता न करें और डॉक्टर द्वारा दी गई बीपी की दवा समय पर लें।`;
    }

    let fetalAdvice = `दिन भर में कम से कम 8 से 10 गिलास पानी पिएं और रोजाना दोपहर में 2 घंटे बाईं करवट (left side) लेटकर आराम करें।`;
    if (weeks >= 24) {
      fetalAdvice += ` भोजन के बाद शिशु की हलचल (किक) पर विशेष ध्यान दें। 2 घंटे में कम से कम 3 से 4 बार हलचल महसूस होनी चाहिए।`;
    }

    const dangerIntro = `यदि आपको इनमें से कोई भी खतरे का लक्षण दिखाई दे तो तुरंत अस्पताल आएं: अचानक तेज सिरदर्द, आंखों में धुंधलापन, चेहरे पर सूजन, रक्तस्त्राव या पानी छूटना, या बच्चे का हिलना-डुलना कम होना।`;

    const nextVisitText = data.nextVisitDate
      ? `आपकी अगली जांच की तारीख ${data.nextVisitDate} तय की गई है। कृपया अपने सभी पुराने पर्चे और रिपोर्ट्स साथ लेकर आएं।`
      : `कृपया अगले चेकअप के लिए समय पर क्लिनिक पधारें।`;

    const closing = `आप और आपका शिशु दोनों स्वस्थ रहें, यही हमारी प्रार्थना है। कोई भी परेशानी होने पर तुरंत क्लिनिक से संपर्क करें।${customNote}`;

    const speechText = `${greeting} ${statusText} ${medicationAdvice} ${fetalAdvice} ${dangerIntro} ${nextVisitText} ${closing}`;

    const sections: CounselingSection[] = [
      { title: "१. गर्भावस्था स्थिति व शिशु विकास", content: statusText },
      { title: "२. दवाइयां एवं खानपान का सही तरीका", content: medicationAdvice },
      { title: "३. आराम व शिशु की हलचल (किक काउंट)", content: fetalAdvice },
      { title: "४. तुरंत अस्पताल आने के खतरे के संकेत (Red Flags)", content: dangerSigns.join("\n• ") },
      { title: "५. अगली जांच व संपर्क", content: `${nextVisitText} ${closing}` },
    ];

    const whatsappMessage = `*🌸 ${clinic} — मातृत्व परामर्श संदेश 🌸*\n\n` +
      `नमस्ते *${name} जी*,\n` +
      `🤰 *गर्भावस्था स्थिति:* ${weeks}वां सप्ताह (${month}वां महीना, T${trimester})\n` +
      `🩺 *आज के आंकड़े:* BP: ${bpSys}/${bpDia} mmHg · Hb: ${hb} g/dL\n\n` +
      `*💊 दवा व पोषण निर्देश:*\n${medicationAdvice}\n\n` +
      `*👶 शिशु की हलचल व आराम:*\n${fetalAdvice}\n\n` +
      `*⚠️ तुरंत अस्पताल आने के खतरे के लक्षण:*\n• ` + dangerSigns.join("\n• ") + `\n\n` +
      `*📅 अगली जांच:* ${data.nextVisitDate || "नियत समय पर"}\n` +
      `_मातृसेतु द्वारा स्वचालित मातृत्व स्वास्थ्य सेवा_`;

    return {
      language: "hi",
      languageLabel: "Hindi",
      nativeLabel: "हिंदी",
      speechText,
      sections,
      whatsappMessage,
      dangerSigns,
    };
  }

  if (lang === "mr") {
    const dangerSigns = [
      "तीव्र डोकेदुखी, चक्कर येणे किंवा डोळ्यांसमोर अंधारी येणे",
      "चेहऱ्यावर, हातावर किंवा पायांवर अचानक खूप जास्त सूज येणे",
      "योनीतून रक्तस्राव होणे किंवा पांढरे/पाण्यासारखे पातळ पाणी जाणे",
      "पोटाच्या खालच्या भागात तीव्र दुखणे किंवा कळा येणे",
      "बाळाची हालचाल कमी होणे किंवा अचानक थांबणे",
      "तीव्र ताप किंवा थंडी वाजून येणे",
    ];

    const greeting = `नमस्कार ${name} ताई, हा संदेश ${clinic} कडून आपल्या आणि आपल्या बाळाच्या चांगल्या आरोग्यासाठी आहे.`;

    let statusText = `आपल्या गरोदरपणाचा ${weeks}वा आठवडा (${month}वा महिना) सुरू आहे. या काळात बाळाचा विकास वेगाने होत असतो.`;
    if (trimester === 1) {
      statusText = `आपल्या गरोदरपणाचा ${weeks}वा आठवडा सुरू आहे. हा पहिला त्रैमासिक काळ बाळाच्या मुख्य अवयवांच्या वाढीसाठी अत्यंत संवेदनशील असतो.`;
    } else if (trimester === 3) {
      statusText = `आपल्या गरोदरपणाचा ${weeks}वा आठवडा (${month}वा महिना) सुरू आहे. आपण प्रसूतीच्या जवळ येत असून बाळाचे वजन वाढत आहे.`;
    }

    let medicationAdvice = `आपल्या गोळ्या नियमित वेळेवर घ्या.`;
    if (isSeverelyAnemic) {
      medicationAdvice = `तपासणीमध्ये आपले हिमोग्लोबिन ${hb} g/dL आले आहे, जे खूप कमी आहे. डॉक्टरांनी दिलेल्या लाल रंगाच्या आयर्नच्या गोळ्या दिवसातून २ वेळा घ्या. ही गोळी चहा किंवा दुधासोबत घेऊ नका; लिंबू पाणी किंवा साध्या पाण्यासोबत घ्या. आहारात शेवग्याची पाने, पालक, गूळ आणि फुटाणे यांचा समावेश करा.`;
    } else if (isAnemic) {
      medicationAdvice = `आपले हिमोग्लोबिन ${hb} g/dL आहे. रक्त वाढवण्यासाठी लाल रंगाची आयर्नची गोळी दररोज दुपारच्या जेवणानंतर १ तासाने लिंबू पाण्यासोबत घ्या. कॅल्शियमची पांढरी गोळी सकाळी नाश्त्यानंतर घ्या. आयर्न आणि कॅल्शियमच्या गोळ्या कधीही एकत्र घेऊ नका.`;
    } else {
      medicationAdvice = `आपले हिमोग्लोबिन ${hb} g/dL उत्तम आहे. हे टिकवून ठेवण्यासाठी आयर्न आणि कॅल्शियमच्या गोळ्या दररोज वेळेवर घेत राहा आणि आहारात हिरव्या पालेभाज्या, डाळी आणि फळे खा.`;
    }

    if (isHighBp) {
      medicationAdvice += ` आज आपला रक्तदाब (BP) ${bpSys}/${bpDia} mmHg आला आहे, जो थोडा जास्त आहे. जेवणातील मीठ, पापड, लोणचे कमी करा आणि बीपीच्या गोळ्या वेळेवर घ्या.`;
    }

    let fetalAdvice = `दिवसातून किमान ८ ते १० ग्लास पाणी प्या आणि दुपारी २ तास डाव्या कुशीवर झोपून विश्रांती घ्या.`;
    if (weeks >= 24) {
      fetalAdvice += ` जेवणानंतर बाळाच्या हालचालींकडे (किक) लक्ष द्या. २ तासांत किमान ३ ते ४ वेळा हालचाल जाणवली पाहिजे.`;
    }

    const dangerIntro = `खालीलपैकी कोणताही धोक्याचा इशारा दिसल्यास त्वरित दवाखान्यात या: अचानक तीव्र डोकेदुखी, डोळ्यांसमोर अंधारी, अंगावर सूज, रक्तस्राव किंवा पाणी जाणे, अथवा बाळाची हालचाल मंदावणे.`;

    const nextVisitText = data.nextVisitDate
      ? `आपल्या पुढच्या तपासणीची तारीख ${data.nextVisitDate} आहे. जुने सर्व कागदपत्रे व तपासणी रिपोर्ट्स सोबत आणा.`
      : `पुढच्या तपासणीसाठी वेळेवर दवाखान्यात भेट द्या.`;

    const closing = `आपण आणि आपले बाळ दोघेही निरोगी राहोत हीच सदिच्छा. काहीही अडचण असल्यास त्वरित संपर्क करा.${customNote}`;

    const speechText = `${greeting} ${statusText} ${medicationAdvice} ${fetalAdvice} ${dangerIntro} ${nextVisitText} ${closing}`;

    const sections: CounselingSection[] = [
      { title: "१. गरोदरपणाची स्थिती व बाळाची वाढ", content: statusText },
      { title: "२. औषधे आणि आहाराचा योग्य नियम", content: medicationAdvice },
      { title: "३. विश्रांती व बाळाची हालचाल (किक काउंट)", content: fetalAdvice },
      { title: "४. धोक्याची लक्षणे दिसताच तात्काळ दवाखान्यात या", content: dangerSigns.join("\n• ") },
      { title: "५. पुढील तपासणी व संपर्क", content: `${nextVisitText} ${closing}` },
    ];

    const whatsappMessage = `*🌸 ${clinic} — मातृत्व आरोग्य सल्ला 🌸*\n\n` +
      `नमस्कार *${name} ताई*,\n` +
      `🤰 *गरोदरपणाची स्थिती:* ${weeks}वा आठवडा (${month}वा महिना, T${trimester})\n` +
      `🩺 *आजची तपासणी:* BP: ${bpSys}/${bpDia} mmHg · Hb: ${hb} g/dL\n\n` +
      `*💊 औषधे व पोषण सल्ला:*\n${medicationAdvice}\n\n` +
      `*👶 बाळाची हालचाल व विश्रांती:*\n${fetalAdvice}\n\n` +
      `*⚠️ तात्काळ दवाखान्यात येण्याची धोक्याची लक्षणे:*\n• ` + dangerSigns.join("\n• ") + `\n\n` +
      `*📅 पुढील तपासणी:* ${data.nextVisitDate || "नियत वेळेवर"}\n` +
      `_मातृसेतु डिजिटल आरोग्य सेवा_`;

    return {
      language: "mr",
      languageLabel: "Marathi",
      nativeLabel: "मराठी",
      speechText,
      sections,
      whatsappMessage,
      dangerSigns,
    };
  }

  if (lang === "gu") {
    const dangerSigns = [
      "તીવ્ર માથાનો દુખાવો, ચક્કર આવવા અથવા આંખો આગળ અંધારા આવવા",
      "ચહેરા, હાથ કે પગ પર અચાનક વધારે સોજો આવવો",
      "યોનિમાંથી રક્તસ્ત્રાવ (બ્લીડિંગ) થવું અથવા પાણી જેવું પ્રવાહી વહેવું",
      "પેટના નીચેના ભાગમાં તીવ્ર દુખાવો થવો",
      "બાળકની હિલચાલ ઓછી થવી અથવા બંધ થવી",
      "તીવ્ર તાવ અથવા ધ્રુજારી સાથે ઠંડી લાગવી",
    ];

    const greeting = `નમસ્તે ${name} બહેન, આ સંદેશ ${clinic} તરફથી તમારા અને તમારા આવનાર બાળકના ઉત્તમ સ્વાસ્થ્ય માટે છે.`;

    let statusText = `તમારી ગર્ભાવસ્થાનું ${weeks}મું અઠવાડિયું (${month}મો મહિનો) ચાલી રહ્યું છે. આ સમયે બાળકનો વિકાસ ઝડપથી થઈ રહ્યો છે.`;
    if (trimester === 1) {
      statusText = `તમારી ગર્ભાવસ્થાનું ${weeks}મું અઠવાડિયું ચાલી રહ્યું છે. આ પ્રથમ ત્રણ મહિના બાળકના અંગોના નિર્માણનો ખૂબ નાજુક સમય છે.`;
    } else if (trimester === 3) {
      statusText = `તમારી ગર્ભાવસ્થાનું ${weeks}મું અઠવાડિયું (${month}મો મહિનો) ચાલી રહ્યું છે. તમે ડિલિવરીના અંતિમ તબક્કામાં છો.`;
    }

    let medicationAdvice = `તમારી દવાઓ નિયમિત સમયે લો.`;
    if (isSeverelyAnemic) {
      medicationAdvice = `તપાસમાં તમારું હિમોગ્લોબિન ${hb} g/dL આવ્યું છે જે ખૂબ ઓછું છે. ડૉક્ટર દ્વારા આપેલી લાલ આયર્નની ગોળીઓ દિવસમાં ૨ વખત લો. આ ગોળી ચા કે દૂધ સાથે ન લેવી, લીંબુ પાણી અથવા સાદા પાણી સાથે લેવી. સાથે પાલક, સરગવાના પાન, ગોળ અને શેકેલા ચણા જરૂર ખાઓ.`;
    } else if (isAnemic) {
      medicationAdvice = `તમારું હિમોગ્લોબિન ${hb} g/dL છે. લોહીની ઉણપ દૂર કરવા આયર્નની લાલ ગોળી બપોરે જમ્યાના ૧ કલાક પછી લીંબુ પાણી સાથે લો. કેલ્શિયમની સફેદ ગોળી સવારે નાસ્તા પછી લો—યાદ રાખો કે આયર્ન અને કેલ્શિયમ ક્યારેય સાથે ન લેવા.`;
    } else {
      medicationAdvice = `તમારું હિમોગ્લોબિન ${hb} g/dL સામાન્ય અને સરસ છે. આ જાળવી રાખવા રોજ આયર્ન અને કેલ્શિયમની ગોળીઓ સમયસર લો, અને લીલા શાકભાજી અને ફળો ખાઓ.`;
    }

    if (isHighBp) {
      medicationAdvice += ` આજે તમારું બ્લડ પ્રેશર (BP) ${bpSys}/${bpDia} mmHg આવ્યું છે જે થોડું વધારે છે. ખોરાકમાં મીઠું ઓછું કરો અને બીપીની દવા નિયમિત લો.`;
    }

    let fetalAdvice = `દિવસમાં ૮ થી ૧૦ ગ્લાસ પાણી પીઓ અને બપોરે ૨ કલાક ડાબી બાજુ પડખું ફરીને આરામ કરો.`;
    if (weeks >= 24) {
      fetalAdvice += ` જમ્યા પછી બાળકની હિલચાલ પર ધ્યાન આપો. ૨ કલાકમાં ઓછામાં ઓછી ૩ થી ૪ વાર હિલચાલ થવી જોઈએ.`;
    }

    const dangerIntro = `જો તમને અચાનક તીવ્ર માથાનો દુખાવો, આંખે અંધારા, ચહેરા પર સોજો, રક્તસ્ત્રાવ કે બાળકની હલનચલન ઓછી લાગે તો તરત જ હોસ્પિટલ પહોંચો.`;

    const nextVisitText = data.nextVisitDate
      ? `તમારી આગામી તપાસની તારીખ ${data.nextVisitDate} છે. જૂના તમામ રિપોર્ટ્સ સાથે લાવશો.`
      : `તપાસ માટે સમયસર ક્લિનિક પધારશો.`;

    const closing = `તમે અને તમારું બાળક બંને સ્વસ્થ રહો એવી શુભેચ્છા. કોઈપણ તકલીફ હોય તો તરત અમારો સંપર્ક કરો.${customNote}`;

    const speechText = `${greeting} ${statusText} ${medicationAdvice} ${fetalAdvice} ${dangerIntro} ${nextVisitText} ${closing}`;

    const sections: CounselingSection[] = [
      { title: "૧. ગર્ભાવસ્થા સ્થિતિ અને બાળકની વૃદ્ધિ", content: statusText },
      { title: "૨. દવાઓ અને પૌષ્ટિક આહારની રીત", content: medicationAdvice },
      { title: "૩. આરામ અને બાળકની હલનચલન", content: fetalAdvice },
      { title: "૪. તાત્કાલિક હોસ્પિટલ આવવાના ભયજનક લક્ષણો", content: dangerSigns.join("\n• ") },
      { title: "૫. આગામી તપાસ અને સંપર્ક", content: `${nextVisitText} ${closing}` },
    ];

    const whatsappMessage = `*🌸 ${clinic} — માતૃત્વ આરોગ્ય સલાહ 🌸*\n\n` +
      `નમસ્તે *${name} બહેન*,\n` +
      `🤰 *ગર્ભાવસ્થા સ્થિતિ:* ${weeks}મું અઠવાડિયું (${month}મો મહિનો, T${trimester})\n` +
      `🩺 *આજની તપાસ:* BP: ${bpSys}/${bpDia} mmHg · Hb: ${hb} g/dL\n\n` +
      `*💊 દવા અને પોષણ માર્ગદર્શન:*\n${medicationAdvice}\n\n` +
      `*👶 બાળકની હિલચાલ અને આરામ:*\n${fetalAdvice}\n\n` +
      `*⚠️ તાત્કાલિક હોસ્પિટલ પહોંચવાના જોખમી ચિહ્નો:*\n• ` + dangerSigns.join("\n• ") + `\n\n` +
      `*📅 આગામી તપાસ:* ${data.nextVisitDate || "નિયત સમયે"}\n` +
      `_માતૃસેતુ ડિજિટલ હેલ્થ_`;

    return {
      language: "gu",
      languageLabel: "Gujarati",
      nativeLabel: "ગુજરાતી",
      speechText,
      sections,
      whatsappMessage,
      dangerSigns,
    };
  }

  // Fallback: English
  const dangerSigns = [
    "Severe persistent headache, dizziness, or blurred/double vision",
    "Sudden extreme swelling of the face, hands, or feet",
    "Any vaginal bleeding or fluid leaking",
    "Severe continuous pain in the lower abdomen",
    "Noticeable decrease or cessation of baby's kicks/movements",
    "High fever or chills",
  ];

  const greeting = `Hello ${name}, this personalized care guidance is from ${clinic} for you and your baby.`;
  
  let statusText = `You are currently at ${weeks} weeks of pregnancy (${month}th month, Trimester ${trimester}). Your baby's growth and development are progressing actively.`;
  if (trimester === 1) {
    statusText = `You are at ${weeks} weeks of pregnancy. The first trimester is a vital period for your baby's organ formation.`;
  } else if (trimester === 3) {
    statusText = `You are at ${weeks} weeks of pregnancy (${month}th month). You are in your final trimester preparing towards a safe delivery.`;
  }

  let medicationAdvice = `Please take all prescribed supplements consistently.`;
  if (isSeverelyAnemic) {
    medicationAdvice = `Your hemoglobin is ${hb} g/dL, which indicates severe anemia. Take your iron tablets twice daily as advised. Take iron with water or lemon juice—never with milk or tea. Add drumstick leaves (moringa), spinach, jaggery, and roasted chickpeas to your daily meals.`;
  } else if (isAnemic) {
    medicationAdvice = `Your hemoglobin is ${hb} g/dL. To rebuild healthy blood levels, take your iron tablet 1 hour after lunch with lemon water (vitamin C enhances absorption). Take your calcium tablet separately after breakfast. Never take iron and calcium at the same time.`;
  } else {
    medicationAdvice = `Your hemoglobin is ${hb} g/dL, which is within the healthy range. Continue your routine iron and calcium supplements daily alongside nutrient-dense meals.`;
  }

  if (isHighBp) {
    medicationAdvice += ` Your blood pressure today recorded at ${bpSys}/${bpDia} mmHg, which is elevated. Please minimize dietary table salt, papad, and pickles, and take your prescribed antihypertensive medication without missing a dose.`;
  }

  let fetalAdvice = `Drink 8 to 10 glasses of clean water daily and rest on your left side for at least 2 hours every afternoon to maximize blood flow to the placenta.`;
  if (weeks >= 24) {
    fetalAdvice += ` Monitor fetal kick counts after meals—you should feel at least 3 to 4 distinct movements within a 2-hour window.`;
  }

  const dangerIntro = `Seek immediate emergency care at the hospital if you experience: sudden severe headaches, visual disturbances, facial puffiness, vaginal bleeding, fluid leakage, or reduced fetal kicks.`;

  const nextVisitText = data.nextVisitDate
    ? `Your next antenatal checkup is scheduled for ${data.nextVisitDate}. Please bring all prior records and scan reports.`
    : `Please return for your scheduled antenatal visit on time.`;

  const closing = `We wish you and your little one great health and safe motherhood.${customNote}`;

  const speechText = `${greeting} ${statusText} ${medicationAdvice} ${fetalAdvice} ${dangerIntro} ${nextVisitText} ${closing}`;

  const sections: CounselingSection[] = [
    { title: "1. Pregnancy Status & Baby Development", content: statusText },
    { title: "2. Medication Timing & Nutrition Protocol", content: medicationAdvice },
    { title: "3. Rest Position & Fetal Kick Count (DFMC)", content: fetalAdvice },
    { title: "4. Red-Flag Danger Signs Requiring Immediate Hospitalization", content: dangerSigns.join("\n• ") },
    { title: "5. Next Antenatal Visit & Contact", content: `${nextVisitText} ${closing}` },
  ];

  const whatsappMessage = `*🌸 ${clinic} — Antenatal Care Audio Guidance 🌸*\n\n` +
    `Hello *${name}*,\n` +
    `🤰 *Pregnancy Status:* ${weeks} Weeks (${month}th Month, T${trimester})\n` +
    `🩺 *Vitals Today:* BP: ${bpSys}/${bpDia} mmHg · Hb: ${hb} g/dL\n\n` +
    `*💊 Medication & Diet Protocol:*\n${medicationAdvice}\n\n` +
    `*👶 Fetal Movements & Rest:*\n${fetalAdvice}\n\n` +
    `*⚠️ Immediate Danger Signs (Red Flags):*\n• ` + dangerSigns.join("\n• ") + `\n\n` +
    `*📅 Next ANC Visit:* ${data.nextVisitDate || "As scheduled"}\n` +
    `_MatruSetu Digital Maternal Health Platform_`;

  return {
    language: "en",
    languageLabel: "English",
    nativeLabel: "English",
    speechText,
    sections,
    whatsappMessage,
    dangerSigns,
  };
}
