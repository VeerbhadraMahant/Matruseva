import { defineArea } from "../define";

// Area: public landing page (app/page.tsx). Keys are prefixed "landing.".
// See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const landing = defineArea({
  en: {
    "landing.meta.title": "MatruSetu — Antenatal care, organised",
    "landing.meta.description":
      "MatruSetu helps OB-GYN clinics track every pregnancy's ANC schedule, catch patients who are falling behind, and digitise the OPD register — without the spreadsheets.",

    "landing.nav.signIn": "Sign in",
    "landing.nav.getStarted": "Get started",

    "landing.hero.badge": "Built for OB-GYN clinics in India",
    "landing.hero.title": "Every pregnancy, tracked. Every follow-up,",
    "landing.hero.titleAccent": " caught.",
    "landing.hero.body":
      "MatruSetu is the clinical worklist for OB-GYN practices — automatic ANC schedules from LMP, a risk score for patients who are drifting away, and a digitised OPD register your staff can actually search.",
    "landing.cta.create": "Create your clinic account",
    "landing.cta.signIn": "Sign in",
    "landing.hero.imageAlt":
      "MatruSetu Today dashboard showing patients due today, a week strip and the follow-up worklist",

    "landing.features.title": "Everything an OPD desk needs, nothing it doesn't",
    "landing.features.body":
      "MatruSetu replaces the register and the spreadsheet with one worklist doctors and staff both trust.",
    "landing.feature.schedule.title": "Automatic ANC scheduling",
    "landing.feature.schedule.body":
      "Enter a patient's LMP once and MatruSetu builds her full antenatal care schedule — scans, blood tests, injections, and visits — each one tracked as due, upcoming, or overdue.",
    "landing.feature.risk.title": "Follow-up risk detection",
    "landing.feature.risk.body":
      "Every patient is scored on-track, at-risk, or lost based on overdue critical items and missed contact attempts, so staff know exactly who to chase before a pregnancy falls through the cracks.",
    "landing.feature.calls.title": "One-tap staff call queue",
    "landing.feature.calls.body":
      "Overdue and at-risk patients land in a single worklist with one-tap WhatsApp and call links, so your front desk can work through follow-ups in minutes, not a notebook.",
    "landing.feature.documents.title": "Searchable document capture",
    "landing.feature.documents.body":
      "Scan lab reports and prescriptions from the browser. In-browser OCR makes every document full-text searchable — no more digging through folders for an old report.",
    "landing.feature.opd.title": "OPD register, digitised",
    "landing.feature.opd.body":
      "Capture your paper OPD register with a phone camera. Every page is tagged by date and searchable, so the register stops being a physical bottleneck.",
    "landing.feature.team.title": "Built for the whole clinic",
    "landing.feature.team.body":
      "Doctor and staff roles, per-clinic settings, and multi-staff accounts — so the person on reception and the doctor in consult are always looking at the same patient record.",

    "landing.showcase.title": "A worklist built for how a clinic actually runs",
    "landing.showcase.body": "Four screens your doctors and staff will live in every day.",
    "landing.showcase.today.title": "Today",
    "landing.showcase.today.caption":
      "A calm view of the clinic's day — patients due today, a week strip, and a worklist of everyone who needs follow-up, ready when staff walk in.",
    "landing.showcase.calls.title": "Call queue",
    "landing.showcase.calls.caption":
      "Overdue and at-risk patients in one queue, with a WhatsApp and phone link for each — staff-initiated outreach, no automation required.",
    "landing.showcase.detail.title": "Patient timeline",
    "landing.showcase.detail.caption":
      "GA, EDD, and risk alerts up top, with a visual ANC timeline below showing exactly which scans, tests, and visits are done, due, or overdue.",
    "landing.showcase.patients.title": "Patient list",
    "landing.showcase.patients.caption":
      "Every patient in the clinic, searchable and filterable — find the record you need without flipping through a register.",

    "landing.trust.schedule.title": "No manual scheduling",
    "landing.trust.schedule.body":
      "ANC due dates are generated automatically from LMP, following standard antenatal care timelines.",
    "landing.trust.safety.title": "Nobody falls through",
    "landing.trust.safety.body":
      "Patients drifting off-track are flagged before a missed scan becomes a missed pregnancy.",
    "landing.trust.pwa.title": "Works on the desk you have",
    "landing.trust.pwa.body":
      "Installs as a PWA on any staff phone or desktop — the app shell keeps working even when the network doesn't.",

    "landing.final.title": "Bring your OPD onto one worklist",
    "landing.final.body":
      "Set up your clinic in minutes. Doctors and staff sign in with their own accounts from day one.",

    "landing.footer": "MatruSetu — antenatal care and OPD digitisation for OB-GYN clinics.",
  },
  hi: {
    "landing.meta.title": "MatruSetu — प्रसवपूर्व देखभाल, व्यवस्थित",
    "landing.meta.description":
      "MatruSetu OB-GYN क्लिनिक को हर गर्भावस्था का ANC शेड्यूल ट्रैक करने, पिछड़ रहे मरीज़ों को पकड़ने और OPD रजिस्टर को डिजिटल बनाने में मदद करता है — स्प्रेडशीट के बिना।",

    "landing.nav.signIn": "साइन इन करें",
    "landing.nav.getStarted": "शुरू करें",

    "landing.hero.badge": "भारत के OB-GYN क्लिनिक के लिए बनाया गया",
    "landing.hero.title": "हर गर्भावस्था पर नज़र। हर फ़ॉलो-अप",
    "landing.hero.titleAccent": " समय पर।",
    "landing.hero.body":
      "MatruSetu OB-GYN क्लिनिक की क्लिनिकल कार्य-सूची है — LMP से अपने आप बनने वाला ANC शेड्यूल, दूर होते मरीज़ों के लिए जोखिम स्कोर, और डिजिटल OPD रजिस्टर जिसमें आपका स्टाफ़ सचमुच खोज सकता है।",
    "landing.cta.create": "अपने क्लिनिक का खाता बनाएँ",
    "landing.cta.signIn": "साइन इन करें",
    "landing.hero.imageAlt":
      "MatruSetu का आज वाला डैशबोर्ड, जिसमें आज देय मरीज़, सप्ताह की पट्टी और फ़ॉलो-अप कार्य-सूची दिख रही है",

    "landing.features.title": "OPD डेस्क को जो चाहिए, सब कुछ — और कुछ फ़ालतू नहीं",
    "landing.features.body":
      "MatruSetu रजिस्टर और स्प्रेडशीट की जगह एक ऐसी कार्य-सूची देता है जिस पर डॉक्टर और स्टाफ़ दोनों भरोसा करते हैं।",
    "landing.feature.schedule.title": "स्वचालित ANC शेड्यूल",
    "landing.feature.schedule.body":
      "मरीज़ की LMP एक बार दर्ज करें और MatruSetu उसका पूरा प्रसवपूर्व देखभाल शेड्यूल बना देता है — स्कैन, ख़ून की जाँच, इंजेक्शन और विज़िट — हर एक देय, आगामी या विलंबित के रूप में ट्रैक होती है।",
    "landing.feature.risk.title": "फ़ॉलो-अप जोखिम की पहचान",
    "landing.feature.risk.body":
      "विलंबित ज़रूरी चीज़ों और छूटे संपर्क प्रयासों के आधार पर हर मरीज़ को समय पर, जोखिम में या संपर्क टूटा के रूप में दर्शाया जाता है, ताकि स्टाफ़ को पता रहे कि गर्भावस्था हाथ से निकलने से पहले किसे फ़ोन करना है।",
    "landing.feature.calls.title": "एक टैप में स्टाफ़ कॉल सूची",
    "landing.feature.calls.body":
      "विलंबित और जोखिम वाले मरीज़ एक ही कार्य-सूची में आते हैं, जिसमें एक टैप पर WhatsApp और कॉल लिंक हैं — आपका फ़्रंट डेस्क नोटबुक के बजाय कुछ ही मिनटों में फ़ॉलो-अप निपटा सकता है।",
    "landing.feature.documents.title": "खोजने योग्य दस्तावेज़ संग्रह",
    "landing.feature.documents.body":
      "ब्राउज़र से लैब रिपोर्ट और पर्चे स्कैन करें। ब्राउज़र में चलने वाला OCR हर दस्तावेज़ को पूरे टेक्स्ट में खोजने योग्य बना देता है — पुरानी रिपोर्ट के लिए फ़ोल्डर खंगालने की ज़रूरत नहीं।",
    "landing.feature.opd.title": "डिजिटल OPD रजिस्टर",
    "landing.feature.opd.body":
      "फ़ोन कैमरे से अपना काग़ज़ी OPD रजिस्टर कैप्चर करें। हर पन्ना तारीख़ के साथ टैग होता है और खोजा जा सकता है, इसलिए रजिस्टर अब रुकावट नहीं रहता।",
    "landing.feature.team.title": "पूरे क्लिनिक के लिए",
    "landing.feature.team.body":
      "डॉक्टर और स्टाफ़ की भूमिकाएँ, क्लिनिक-वार सेटिंग्स और कई स्टाफ़ खाते — ताकि रिसेप्शन पर बैठा व्यक्ति और परामर्श कक्ष में डॉक्टर, दोनों एक ही मरीज़ रिकॉर्ड देखें।",

    "landing.showcase.title": "क्लिनिक जैसे सचमुच चलता है, उसी के लिए बनी कार्य-सूची",
    "landing.showcase.body": "चार स्क्रीन, जिन पर आपके डॉक्टर और स्टाफ़ रोज़ काम करेंगे।",
    "landing.showcase.today.title": "आज",
    "landing.showcase.today.caption":
      "क्लिनिक के दिन की शांत झलक — आज देय मरीज़, सप्ताह की पट्टी और फ़ॉलो-अप की ज़रूरत वाले सभी लोगों की कार्य-सूची, स्टाफ़ के आते ही तैयार।",
    "landing.showcase.calls.title": "कॉल सूची",
    "landing.showcase.calls.caption":
      "विलंबित और जोखिम वाले मरीज़ एक सूची में, हर किसी के लिए WhatsApp और फ़ोन लिंक के साथ — स्टाफ़ ख़ुद संपर्क करता है, किसी ऑटोमेशन की ज़रूरत नहीं।",
    "landing.showcase.detail.title": "मरीज़ की समयरेखा",
    "landing.showcase.detail.caption":
      "ऊपर GA, EDD और जोखिम चेतावनियाँ, और नीचे ANC समयरेखा जिसमें साफ़ दिखता है कि कौन-से स्कैन, जाँच और विज़िट पूर्ण, देय या विलंबित हैं।",
    "landing.showcase.patients.title": "मरीज़ सूची",
    "landing.showcase.patients.caption":
      "क्लिनिक का हर मरीज़, खोज और फ़िल्टर के साथ — रजिस्टर पलटे बिना ज़रूरी रिकॉर्ड पाएँ।",

    "landing.trust.schedule.title": "हाथ से शेड्यूल बनाने की ज़रूरत नहीं",
    "landing.trust.schedule.body":
      "मानक प्रसवपूर्व देखभाल समयरेखा के अनुसार ANC की तारीख़ें LMP से अपने आप बन जाती हैं।",
    "landing.trust.safety.title": "कोई छूटता नहीं",
    "landing.trust.safety.body":
      "जो मरीज़ पटरी से उतर रहे हैं, उन्हें स्कैन छूटने से पहले ही चिह्नित कर दिया जाता है।",
    "landing.trust.pwa.title": "आपके मौजूदा डेस्क पर चलता है",
    "landing.trust.pwa.body":
      "किसी भी स्टाफ़ फ़ोन या डेस्कटॉप पर PWA की तरह इंस्टॉल होता है — नेटवर्क न होने पर भी ऐप का ढाँचा चलता रहता है।",

    "landing.final.title": "अपना OPD एक कार्य-सूची में लाएँ",
    "landing.final.body":
      "कुछ ही मिनटों में अपना क्लिनिक सेट अप करें। डॉक्टर और स्टाफ़ पहले दिन से अपने-अपने खातों से साइन इन करते हैं।",

    "landing.footer": "MatruSetu — OB-GYN क्लिनिक के लिए प्रसवपूर्व देखभाल और OPD डिजिटलीकरण।",
  },
  mr: {
    "landing.meta.title": "MatruSetu — प्रसूतीपूर्व काळजी, व्यवस्थित",
    "landing.meta.description":
      "MatruSetu OB-GYN क्लिनिकना प्रत्येक गर्भावस्थेचे ANC वेळापत्रक ट्रॅक करण्यास, मागे पडणाऱ्या रुग्णांना ओळखण्यास आणि OPD नोंदवही डिजिटल करण्यास मदत करते — स्प्रेडशीटशिवाय.",

    "landing.nav.signIn": "साइन इन करा",
    "landing.nav.getStarted": "सुरू करा",

    "landing.hero.badge": "भारतातील OB-GYN क्लिनिकसाठी बनवलेले",
    "landing.hero.title": "प्रत्येक गर्भावस्थेवर लक्ष. प्रत्येक पाठपुरावा",
    "landing.hero.titleAccent": " वेळेवर.",
    "landing.hero.body":
      "MatruSetu ही OB-GYN क्लिनिकची क्लिनिकल कामाची यादी आहे — LMP वरून आपोआप तयार होणारे ANC वेळापत्रक, दूर जाणाऱ्या रुग्णांसाठी जोखीम स्कोअर आणि तुमचा स्टाफ खरोखर शोधू शकेल अशी डिजिटल OPD नोंदवही.",
    "landing.cta.create": "तुमच्या क्लिनिकचे खाते तयार करा",
    "landing.cta.signIn": "साइन इन करा",
    "landing.hero.imageAlt":
      "MatruSetu चा आजचा डॅशबोर्ड, ज्यात आज देय रुग्ण, आठवड्याची पट्टी आणि पाठपुरावा कामाची यादी दिसत आहे",

    "landing.features.title": "OPD डेस्कला जे हवे ते सर्व — आणि अनावश्यक काहीच नाही",
    "landing.features.body":
      "MatruSetu नोंदवही आणि स्प्रेडशीटच्या जागी अशी एक कामाची यादी देते, जिच्यावर डॉक्टर आणि स्टाफ दोघेही विश्वास ठेवतात.",
    "landing.feature.schedule.title": "स्वयंचलित ANC वेळापत्रक",
    "landing.feature.schedule.body":
      "रुग्णाची LMP एकदा नोंदवा आणि MatruSetu तिचे संपूर्ण प्रसूतीपूर्व काळजीचे वेळापत्रक तयार करते — स्कॅन, रक्त तपासणी, इंजेक्शन आणि भेटी — प्रत्येक गोष्ट देय, आगामी किंवा उशीर झालेली म्हणून ट्रॅक होते.",
    "landing.feature.risk.title": "पाठपुराव्यातील जोखमीची ओळख",
    "landing.feature.risk.body":
      "उशीर झालेल्या महत्त्वाच्या गोष्टी आणि चुकलेल्या संपर्क प्रयत्नांच्या आधारे प्रत्येक रुग्णाला नियमित, जोखमीत किंवा संपर्क तुटला असे दर्शवले जाते, म्हणजे गर्भावस्था हातातून निसटण्यापूर्वी कोणाला फोन करायचा हे स्टाफला नेमके कळते.",
    "landing.feature.calls.title": "एका टॅपमध्ये स्टाफ कॉल यादी",
    "landing.feature.calls.body":
      "उशीर झालेले आणि जोखमीतील रुग्ण एकाच कामाच्या यादीत येतात, ज्यात एका टॅपवर WhatsApp आणि कॉल लिंक आहेत — तुमचा फ्रंट डेस्क वहीऐवजी काही मिनिटांत पाठपुरावा पूर्ण करू शकतो.",
    "landing.feature.documents.title": "शोधता येणारा कागदपत्र संग्रह",
    "landing.feature.documents.body":
      "ब्राउझरमधून लॅब रिपोर्ट आणि प्रिस्क्रिप्शन स्कॅन करा. ब्राउझरमधील OCR प्रत्येक कागदपत्र संपूर्ण मजकुरात शोधता येईल असे करते — जुन्या रिपोर्टसाठी फोल्डर धुंडाळायची गरज नाही.",
    "landing.feature.opd.title": "डिजिटल OPD नोंदवही",
    "landing.feature.opd.body":
      "फोनच्या कॅमेऱ्याने तुमची कागदी OPD नोंदवही कॅप्चर करा. प्रत्येक पान तारखेसह टॅग होते आणि शोधता येते, त्यामुळे नोंदवही अडथळा राहत नाही.",
    "landing.feature.team.title": "संपूर्ण क्लिनिकसाठी",
    "landing.feature.team.body":
      "डॉक्टर आणि स्टाफच्या भूमिका, क्लिनिकनुसार सेटिंग्ज आणि अनेक स्टाफची खाती — म्हणजे रिसेप्शनवरील व्यक्ती आणि तपासणी कक्षातील डॉक्टर दोघेही एकाच रुग्ण रेकॉर्डकडे पाहतात.",

    "landing.showcase.title": "क्लिनिक प्रत्यक्षात जसे चालते, त्यासाठी बनवलेली कामाची यादी",
    "landing.showcase.body": "चार स्क्रीन, ज्यावर तुमचे डॉक्टर आणि स्टाफ रोज काम करतील.",
    "landing.showcase.today.title": "आज",
    "landing.showcase.today.caption":
      "क्लिनिकच्या दिवसाचे शांत चित्र — आज देय रुग्ण, आठवड्याची पट्टी आणि पाठपुरावा हवा असलेल्या सर्वांची कामाची यादी, स्टाफ येताच तयार.",
    "landing.showcase.calls.title": "कॉल यादी",
    "landing.showcase.calls.caption":
      "उशीर झालेले आणि जोखमीतील रुग्ण एकाच यादीत, प्रत्येकासाठी WhatsApp आणि फोन लिंकसह — स्टाफ स्वतः संपर्क साधतो, कोणत्याही ऑटोमेशनची गरज नाही.",
    "landing.showcase.detail.title": "रुग्णाची कालरेषा",
    "landing.showcase.detail.caption":
      "वर GA, EDD आणि जोखमीच्या सूचना, आणि खाली ANC कालरेषा, ज्यात कोणते स्कॅन, तपासण्या आणि भेटी पूर्ण, देय किंवा उशीर झालेल्या आहेत हे स्पष्ट दिसते.",
    "landing.showcase.patients.title": "रुग्ण यादी",
    "landing.showcase.patients.caption":
      "क्लिनिकमधील प्रत्येक रुग्ण, शोध आणि फिल्टरसह — नोंदवही चाळल्याशिवाय हवा तो रेकॉर्ड मिळवा.",

    "landing.trust.schedule.title": "हाताने वेळापत्रक बनवायची गरज नाही",
    "landing.trust.schedule.body":
      "प्रमाणित प्रसूतीपूर्व काळजीच्या कालरेषेनुसार ANC च्या तारखा LMP वरून आपोआप तयार होतात.",
    "landing.trust.safety.title": "कोणीही सुटत नाही",
    "landing.trust.safety.body":
      "रुळावरून घसरणाऱ्या रुग्णांना स्कॅन चुकण्यापूर्वीच चिन्हांकित केले जाते.",
    "landing.trust.pwa.title": "तुमच्याकडे असलेल्या डेस्कवर चालते",
    "landing.trust.pwa.body":
      "कोणत्याही स्टाफ फोनवर किंवा डेस्कटॉपवर PWA म्हणून इन्स्टॉल होते — नेटवर्क नसतानाही अ‍ॅपची चौकट चालू राहते.",

    "landing.final.title": "तुमची OPD एका कामाच्या यादीत आणा",
    "landing.final.body":
      "काही मिनिटांत तुमचे क्लिनिक सेट अप करा. डॉक्टर आणि स्टाफ पहिल्या दिवसापासून आपापल्या खात्यांनी साइन इन करतात.",

    "landing.footer": "MatruSetu — OB-GYN क्लिनिकसाठी प्रसूतीपूर्व काळजी आणि OPD डिजिटायझेशन.",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
