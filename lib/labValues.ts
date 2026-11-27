/**
 * Pulls key clinical values out of OCR text for a "please verify" view.
 * Pure and conservative: it only reports what the text literally says, flags
 * implausible or out-of-range readings, and never writes to the clinical
 * record. OCR misreads digits, so every value is for a human to confirm.
 */

export type ValueKey = "hb" | "bp" | "fasting_glucose" | "pp_glucose" | "random_glucose" | "tsh" | "platelets" | "date";
/** ok = plausible and within the usual range; review = plausible but outside it; implausible = likely an OCR/unit error. */
export type ValueStatus = "ok" | "review" | "implausible";

export interface ExtractedValue {
  key: ValueKey;
  label: string;
  /** Value as it should be displayed, with unit. */
  display: string;
  status: ValueStatus;
  /** Short reason shown next to a flagged value. */
  note?: string;
}

const NUM = String.raw`(\d{1,3}(?:[.,]\d{1,3})?)`;
const SEP = String.raw`\s*[:=\-]?\s*`;

function num(s: string): number {
  return Number(s.replace(",", "."));
}

function rangeStatus(v: number, plausible: [number, number], usual: [number, number]): { status: ValueStatus; note?: string } {
  if (v < plausible[0] || v > plausible[1]) return { status: "implausible", note: "Outside the physically plausible range - check the scan" };
  if (v < usual[0] || v > usual[1]) return { status: "review", note: `Outside usual range ${usual[0]}-${usual[1]}` };
  return { status: "ok" };
}

function first(text: string, re: RegExp): RegExpMatchArray | null {
  return text.match(re);
}

function hemoglobin(text: string): ExtractedValue | null {
  const m = first(text, new RegExp(String.raw`\b(?:h(?:a)?emoglobin|hgb|hb)\b(?:\s*\(?\s*(?:g/dl|gm/dl|g%)\s*\)?)?${SEP}${NUM}`, "i"));
  if (!m) return null;
  const v = num(m[1]);
  // Pregnancy anaemia threshold is 11 g/dL; 5-18 is the usual spread of readings.
  const r = rangeStatus(v, [2, 25], [11, 16]);
  return { key: "hb", label: "Hemoglobin", display: `${v} g/dL`, ...r, note: r.status === "review" && v < 11 ? "Below 11 g/dL (anaemia in pregnancy)" : r.note };
}

function bloodPressure(text: string): ExtractedValue | null {
  const m = first(text, new RegExp(String.raw`\b(?:bp|b\.p\.?|blood\s*pressure)\b${SEP}(\d{2,3})\s*[/\\]\s*(\d{2,3})`, "i"));
  if (!m) return null;
  const sys = Number(m[1]);
  const dia = Number(m[2]);
  const display = `${sys}/${dia} mmHg`;
  if (sys < 60 || sys > 260 || dia < 30 || dia > 160 || sys <= dia) {
    return { key: "bp", label: "Blood pressure", display, status: "implausible", note: "Not a plausible BP - check the scan" };
  }
  if (sys >= 140 || dia >= 90) return { key: "bp", label: "Blood pressure", display, status: "review", note: "140/90 or above" };
  if (sys < 90 || dia < 60) return { key: "bp", label: "Blood pressure", display, status: "review", note: "Below 90/60" };
  return { key: "bp", label: "Blood pressure", display, status: "ok" };
}

function glucose(text: string, key: ValueKey, label: string, re: RegExp, usual: [number, number]): ExtractedValue | null {
  const m = first(text, re);
  if (!m) return null;
  const v = num(m[1]);
  const r = rangeStatus(v, [20, 800], usual);
  return { key, label, display: `${v} mg/dL`, ...r };
}

/** Matches "FBS 88", "Fasting blood sugar: 88" and "Blood Sugar (Fasting): 88 mg/dL". */
function sugarRe(names: string, parenName: string): RegExp {
  return new RegExp(
    String.raw`\b(?:${names}|(?:blood\s*sugar|glucose)\s*\(\s*(?:${parenName})\s*\))\)?(?:\s*\(?\s*mg/dl\s*\)?)?${SEP}${NUM}`,
    "i",
  );
}

function tsh(text: string): ExtractedValue | null {
  const m = text.match(/\btsh\b(?:\s*\(?\s*(?:m?iu\/l|[uµ]iu\/ml)\s*\)?)?\s*[:=\-]?\s*(\d{1,3}(?:[.,]\d{1,3})?)/i);
  if (!m) return null;
  const v = num(m[1]);
  const r = rangeStatus(v, [0.005, 150], [0.1, 4]);
  return { key: "tsh", label: "TSH", display: `${v} mIU/L`, ...r };
}

/** Platelets are reported as lakhs/cumm, x10^3/uL or per uL; normalise to per uL. */
function platelets(text: string): ExtractedValue | null {
  const m = text.match(/\b(?:platelets?(?:\s*count)?|plt)\b\s*[:=\-]?\s*(\d[\d,.]*)\s*(lakhs?|lacs?|lac)?/i);
  if (!m) return null;
  const raw = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(raw)) return null;
  let perUl: number;
  if (m[2] || raw <= 10) perUl = raw * 100000; // 1.5 -> 1.5 lakh
  else if (raw < 1000) perUl = raw * 1000; // 250 -> x10^3/uL
  else perUl = raw;
  const display = `${perUl.toLocaleString("en-IN")} /uL`;
  if (perUl < 5000 || perUl > 1500000) return { key: "platelets", label: "Platelet count", display, status: "implausible", note: "Check units on the scan" };
  if (perUl < 100000) return { key: "platelets", label: "Platelet count", display, status: "review", note: "Below 1 lakh" };
  if (perUl < 150000 || perUl > 450000) return { key: "platelets", label: "Platelet count", display, status: "review", note: "Outside usual range 1.5-4.5 lakh" };
  return { key: "platelets", label: "Platelet count", display, status: "ok" };
}

function validIso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Day-first (Indian) dates and ISO dates, de-duplicated. */
function dates(text: string): ExtractedValue[] {
  const seen = new Set<string>();
  const out: ExtractedValue[] = [];
  const add = (iso: string | null) => {
    if (!iso || seen.has(iso)) return;
    seen.add(iso);
    out.push({ key: "date", label: "Date", display: iso, status: "ok" });
  };
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) add(validIso(+m[1], +m[2], +m[3]));
  for (const m of text.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/g)) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    add(validIso(y, +m[2], +m[1]));
  }
  return out.slice(0, 5);
}

export function extractLabValues(text: string | null | undefined): ExtractedValue[] {
  if (!text) return [];
  const t = text.replace(/[ \t]+/g, " ");
  const found: (ExtractedValue | null)[] = [
    hemoglobin(t),
    bloodPressure(t),
    glucose(t, "fasting_glucose", "Fasting blood sugar", sugarRe(String.raw`fbs|fbg|fasting(?:\s*(?:blood\s*)?(?:sugar|glucose))?`, String.raw`fasting`), [70, 92]),
    glucose(t, "pp_glucose", "Post-prandial blood sugar", sugarRe(String.raw`ppbs|ppbg|pp\s*(?:blood\s*)?(?:sugar|glucose)|post[\s-]*(?:prandial|meal)(?:\s*(?:blood\s*)?(?:sugar|glucose))?`, String.raw`pp|post[\s-]*prandial`), [70, 140]),
    glucose(t, "random_glucose", "Random blood sugar", sugarRe(String.raw`rbs|rbg|random(?:\s*(?:blood\s*)?(?:sugar|glucose))?`, String.raw`random`), [70, 140]),
    tsh(t),
    platelets(t),
  ];
  return [...found.filter((v): v is ExtractedValue => v !== null), ...dates(t)];
}
