/**
 * Voice-to-Vitals parser for ASHA / ANM dictation (English, Hindi, Marathi, Hinglish).
 * Input is a speech-to-text transcript (or typed text); output is structured vitals.
 * Every number is range-checked: a value outside the plausible range is NOT returned
 * as a vital, it is listed in `rejected` so the UI can ask for a re-check.
 */

export type VitalField = "bp" | "weight" | "hb" | "fhr" | "fundalHeight";

export interface RejectedValue {
  field: VitalField;
  /** What was heard, e.g. "300/80" or "8". */
  text: string;
}

export interface ParsedVitals {
  bpSys: number | null;
  bpDia: number | null;
  weight: number | null;
  hb: number | null;
  fhr: number | null;
  fundalHeight: number | null;
  symptoms: string[];
  rawTranscript: string;
  rejected: RejectedValue[];
}

/** Plausible clinical ranges, inclusive. Shared with the verification UI. */
export const VITAL_RANGES = {
  bpSys: { min: 60, max: 250 },
  bpDia: { min: 30, max: 160 },
  weight: { min: 25, max: 200 },
  hb: { min: 3, max: 20 },
  fhr: { min: 60, max: 220 },
  fundalHeight: { min: 5, max: 50 },
} as const;

export function inRange(key: keyof typeof VITAL_RANGES, value: number): boolean {
  const r = VITAL_RANGES[key];
  return Number.isFinite(value) && value >= r.min && value <= r.max;
}

export function validBp(sys: number, dia: number): boolean {
  return inRange("bpSys", sys) && inRange("bpDia", dia) && sys > dia;
}

// ---------------------------------------------------------------------------
// Number words -> digits
// ---------------------------------------------------------------------------

// Hindi 0-99, Devanagari. Index = value; "/" separates spelling variants.
const HI_DEV =
  "शून्य एक दो तीन चार पाँच/पांच छह/छः/छे सात आठ नौ दस " +
  "ग्यारह बारह तेरह चौदह पंद्रह/पन्द्रह सोलह सत्रह अठारह उन्नीस बीस " +
  "इक्कीस बाईस/बाइस तेईस/तेइस चौबीस पच्चीस छब्बीस सत्ताईस/सत्ताइस अट्ठाईस/अठाईस उनतीस तीस " +
  "इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस " +
  "इकतालीस बयालीस तैंतालीस चौवालीस/चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास " +
  "इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन/अठावन उनसठ साठ " +
  "इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर " +
  "इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी " +
  "इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी/अठासी नवासी नब्बे " +
  "इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे";

// Hindi / Hinglish romanisation plus English words, same indexing ("|" separates variants).
const ROMAN =
  "shunya|zero ek|one do|two teen|three char|chaar|four paanch|panch|paach|five chhe|chhah|chah|che|six saat|seven aath|ath|eight nau|nine das|ten " +
  "gyarah|eleven barah|twelve terah|thirteen chaudah|fourteen pandrah|fifteen solah|sixteen satrah|seventeen atharah|eighteen unnis|nineteen bees|twenty " +
  "ikkis|ikkees|ikhees baees|baais teis|teeis|taees chaubis|chaubees pachchis|pachees|pachhees|pacchis chhabbis|chhabees sattais|sattaees atthais|atthaees|athais untis|untees tees|tis|thirty " +
  "iktis|ikatees battis|battees taintis|tentees chauntis|chautees paintis|paintees chhattis|chhattees saintis|saintees adtis|adtees untalis|untalees chalis|chaalees|chaalis|forty " +
  "iktalis|iktaalees bayalis|bayaalees taintalis|tentaalees chauvalis|chauwaalees paintalis|paintaalees chhiyalis|chhiyaalees saintalis|saintaalees adtalis|adtaalees unchas|unchaas pachas|pachaas|fifty " +
  "ikyavan|ikyaawan bavan|baawan|bawan tirpan|tirepan chauvan|chawwan pachpan chhappan sattavan|sattawan atthavan|atthaawan|athavan unsath saath|sath|sixty " +
  "iksath|iksaath baasath|basath tirsath|tirasath chausath painsath chhiyasath|chhiyaasath sadsath adsath unhattar sattar|seventy " +
  "ikhattar bahattar tihattar chauhattar pachhattar|pachattar chhihattar satattar athattar unasi assi|eighty " +
  "ikyasi|ikyaasi bayasi|bayaasi tirasi|tiraasi chaurasi|chauraasi pachasi|pachaasi chhiyasi|chhiyaasi sattasi|sattaasi atthasi|atthaasi navasi|nawaasi nabbe|nave|ninety " +
  "ikyanve|ikyaanwe baanve|baanwe tiranve|tiraanwe chauranve|chauraanwe pachanve|pachaanwe chhiyanve|chhiyaanwe sattanve|sattaanwe atthanve|atthaanwe ninyanve|ninyaanwe";

// Marathi forms that differ from Hindi (Devanagari). Only the common round numbers;
// shortcut: Marathi compound numbers (21-99) are not spelled out, speech-to-text emits digits for them.
const MR_DEV: Record<string, number> = {
  दोन: 2, पाच: 5, सहा: 6, नऊ: 9, दहा: 10, अकरा: 11, बारा: 12, तेरा: 13, चौदा: 14, पंधरा: 15, सोळा: 16,
  सतरा: 17, अठरा: 18, एकोणीस: 19, वीस: 20, चाळीस: 40, पन्नास: 50, साठ: 60, ऐंशी: 80, नव्वद: 90, शंभर: 100,
  akra: 11, bara: 12, tera: 13, chauda: 14, pandhra: 15, sola: 16, satra: 17, athra: 18, vis: 20, pannas: 50,
  saha: 6, daha: 10, don: 2, ashi: 80, navvad: 90, shambhar: 100,
};

const HUNDRED = 100;
const POINT = "<pt>";

const WORDS: Record<string, number> = { ...MR_DEV, sau: HUNDRED, सौ: HUNDRED, hundred: HUNDRED };
HI_DEV.split(" ").forEach((group, value) => group.split("/").forEach((w) => (WORDS[w] = value)));
ROMAN.split(" ").forEach((group, value) => group.split("|").forEach((w) => (WORDS[w] = value)));
// English tens already map via ROMAN; English 21-29 etc. are composed below.

const POINT_WORDS = new Set([
  "point", "poin", "dashamlav", "dashamalav", "दशमलव", "पॉइंट", "पॉईंट", "पॉइन्ट", "पाइंट", "पॉईन्ट",
]);

const DEV_DIGITS = "०१२३४५६७८९";

function isTens(v: number): boolean {
  return v >= 20 && v <= 90 && v % 10 === 0;
}

/** Combine a run of number-word values into separate numbers ("one twenty" -> 120, "fifty eight" -> 58). */
function combine(values: number[]): number[] {
  const out: number[] = [];
  let cur: number | null = null;
  let afterHundred = false;
  let hundredUsed = false;
  for (const v of values) {
    if (cur === null) {
      cur = v === HUNDRED ? HUNDRED : v;
      afterHundred = v === HUNDRED;
      hundredUsed = v === HUNDRED;
      continue;
    }
    if (v === HUNDRED && cur < HUNDRED && !hundredUsed) {
      cur *= HUNDRED; // "ek sau"
      afterHundred = true;
      hundredUsed = true;
    } else if (afterHundred && cur % HUNDRED === 0 && v >= 1 && v < HUNDRED) {
      cur += v; // "ek sau bees", "one hundred twenty"
      afterHundred = false;
    } else if (!hundredUsed && isTens(cur) && v >= 1 && v <= 9) {
      cur += v; // "fifty eight"
    } else if (!hundredUsed && cur >= 1 && cur <= 2 && v >= 10 && v < HUNDRED) {
      cur = cur * HUNDRED + v; // "one twenty"
    } else {
      out.push(cur);
      cur = v;
      afterHundred = v === HUNDRED;
      hundredUsed = v === HUNDRED;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

/** Lowercase, Devanagari digits -> ASCII, number words -> digits, decimal words -> ".". */
export function normalizeTranscript(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)));
  s = s
    .replace(/[,;:!?()"'“”‘’।]/g, " ")
    .replace(/([a-zऀ-ॿ])\.(?=\s|$)/g, "$1 ")
    .replace(/hundred and /g, "hundred ")
    .replace(/\s+/g, " ")
    .trim();

  const toks = s.split(" ");
  const out: string[] = [];
  for (let i = 0; i < toks.length; ) {
    const t = toks[i];
    if (POINT_WORDS.has(t)) {
      out.push(POINT);
      i++;
      continue;
    }
    if (WORDS[t] === undefined) {
      out.push(t);
      i++;
      continue;
    }
    const run: number[] = [];
    while (i < toks.length && WORDS[toks[i]] !== undefined) run.push(WORDS[toks[i++]]);
    out.push(...combine(run).map(String));
  }

  return out
    .join(" ")
    // "10 <pt> 5" and "<pt> 2 5" style decimals
    .replace(/(\d+)\s*<pt>\s*(\d(?:\s\d(?!\d))*)/g, (_, whole: string, frac: string) => `${whole}.${frac.replace(/\s/g, "")}`)
    .replace(/<pt>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

const alt = (words: string[]) =>
  words
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

const kw = (words: string[]) => `(?<![a-z])(?:${alt(words)})`;
const FILL = "(?:\\s|is|hai|aahe|ahe|आहे|है|=|-|of|at|about)*";
// Take the whole digit run so "1058" is rejected as 1058 instead of being truncated to 105.
const NUM = "(\\d{1,6}(?:\\.\\d{1,2})?)(?!\\d)";
const BP_SEP = "(?:\\s*(?:\\/|by|over|upon|and|aur|bata|baay|बाय|बटा|ओवर|और|आणि|वर|पर)\\s*|\\s+)";
const BP_STRONG_SEP = "\\s*(?:\\/|by|over|बाय|बटा|ओवर)\\s*";

const KW_BP = kw(["bp", "b p", "blood pressure", "raktachap", "raktdaab", "raktadab", "बीपी", "ब्लड प्रेशर", "रक्तचाप", "रक्तदाब", "रक्त दाब"]);
const KW_WEIGHT = kw(["weight", "wt", "vajan", "wazan", "vazan", "bhaar", "वजन", "वज़न", "वजन", "भार"]);
const KW_HB = kw(["hb", "haemoglobin", "hemoglobin", "hemo", "हीमोग्लोबिन", "हिमोग्लोबिन", "हेमोग्लोबिन", "एचबी", "हिमोग्लोबीन"]);
const KW_FHR = kw([
  "fhr", "fetal heart rate", "fetal heart", "foetal heart", "baby heart", "heart rate", "fhs", "dhadkan", "thoke",
  "एफएचआर", "धड़कन", "धडकन", "ठोके", "हृदय गति",
]);
const KW_FH = kw(["fundal height", "fundus height", "fundal", "fundus", "sfh", "फंडल हाइट", "फंडल हाईट", "फंडल", "फंडस"]);
const UNIT_KG = "(?:kg|kgs|kilo|kilos|kilogram|kilograms|किलो|किग्रा|केजी|किलोग्राम)(?![a-z])";

interface Match {
  a: string;
  b?: string;
  /** Later, different readings of the same field (the first one wins; these are reported, not used). */
  extra: Match[];
}

function first(norm: string, patterns: RegExp[]): Match | null {
  for (const p of patterns) {
    const all = [...norm.matchAll(new RegExp(p.source, "g"))];
    if (!all.length) continue;
    const key = (m: RegExpMatchArray) => `${m[1]}/${m[2] ?? ""}`;
    const seen = new Set([key(all[0])]);
    const extra: Match[] = [];
    for (const m of all.slice(1)) if (!seen.has(key(m))) (seen.add(key(m)), extra.push({ a: m[1], b: m[2], extra: [] }));
    return { a: all[0][1], b: all[0][2], extra };
  }
  return null;
}

const num = (s: string) => parseFloat(s);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Parses spoken clinical dictation into structured vitals. */
export function parseVoiceToVitals(rawText: string): ParsedVitals {
  const norm = normalizeTranscript(rawText);
  const rejected: RejectedValue[] = [];
  let bpSys: number | null = null;
  let bpDia: number | null = null;
  let weight: number | null = null;
  let hb: number | null = null;
  let fhr: number | null = null;
  let fundalHeight: number | null = null;

  // Blood pressure: keyword + two numbers, or an unmistakable "a/b", "a by b", "a over b".
  const bp = first(norm, [
    new RegExp(`${KW_BP}${FILL}(\\d{2,3})${BP_SEP}(\\d{2,3})`),
    new RegExp(`(?<!\\d)(\\d{2,3})${BP_STRONG_SEP}(\\d{2,3})(?!\\d)`),
  ]);
  if (bp) {
    const sys = num(bp.a);
    const dia = num(bp.b!);
    if (validBp(sys, dia)) {
      bpSys = sys;
      bpDia = dia;
    } else rejected.push({ field: "bp", text: `${bp.a}/${bp.b}` });
    for (const x of bp.extra) rejected.push({ field: "bp", text: `${x.a}/${x.b}` });
  }

  const scalar = (
    patterns: RegExp[],
    key: keyof typeof VITAL_RANGES,
    field: VitalField,
    transform: (n: number) => number,
  ): number | null => {
    const m = first(norm, patterns);
    if (!m) return null;
    const v = num(m.a);
    const ok = inRange(key, v);
    if (!ok) rejected.push({ field, text: m.a });
    for (const x of m.extra) rejected.push({ field, text: x.a });
    return ok ? transform(v) : null;
  };

  weight = scalar(
    [new RegExp(`${KW_WEIGHT}${FILL}${NUM}`), new RegExp(`(?<![\\d.])${NUM}\\s*${UNIT_KG}`)],
    "weight", "weight", round1,
  );
  hb = scalar([new RegExp(`${KW_HB}${FILL}${NUM}`)], "hb", "hb", round1);
  fhr = scalar([new RegExp(`${KW_FHR}${FILL}${NUM}`)], "fhr", "fhr", Math.round);
  fundalHeight = scalar([new RegExp(`${KW_FH}${FILL}${NUM}`)], "fundalHeight", "fundalHeight", round1);

  const symptomPatterns: { label: string; keywords: string[] }[] = [
    { label: "Pedal Edema (Swelling)", keywords: ["swelling", "edema", "oedema", "sujan", "sooj", "payaavar suz", "सूजन", "सुजन", "सूज"] },
    { label: "Severe Headache", keywords: ["headache", "sir dard", "seer dard", "dok dukhi", "doke dukhi", "matha dard", "सिरदर्द", "सिर दर्द", "डोकेदुखी", "डोके दुखी"] },
    { label: "Blurring of Vision", keywords: ["blurred vision", "blurring", "dhundhla", "dhundhlapan", "dhisat", "chhakkar", "dizziness", "धुंधला", "धुंधलापन", "चक्कर", "धूसर"] },
    { label: "Vaginal Bleeding", keywords: ["bleeding", "spotting", "khoon aa", "lal paani", "ब्लीडिंग", "रक्तस्राव", "रक्तस्त्राव", "खून आ", "लाल पानी"] },
    { label: "Decreased Fetal Movement", keywords: ["less movement", "no movement", "halchal kami", "halchal kam", "baby not moving", "हलचल कम", "हालचाल कमी", "हलचल नहीं"] },
    { label: "High Fever", keywords: ["fever", "bukhar", "taap", "ang garam", "बुखार", "ताप"] },
    { label: "Abdominal Pain", keywords: ["abdominal pain", "pet dard", "potat dukhne", "cramps", "पेट दर्द", "पेट में दर्द", "पोटदुखी", "पोटात दुखत"] },
  ];
  const symptoms = symptomPatterns.filter((p) => p.keywords.some((k) => norm.includes(k))).map((p) => p.label);

  return { bpSys, bpDia, weight, hb, fhr, fundalHeight, symptoms, rawTranscript: rawText, rejected };
}
