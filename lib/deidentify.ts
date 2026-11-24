/**
 * De-identification for consultation transcripts before they reach the
 * summary LLM. Runs on our server only; the LLM never sees the raw text.
 *
 * Layers:
 *  1. Known identifiers from the record (patient/doctor names, address words,
 *     clinic patient number), matched in Latin and Devanagari. Names are
 *     compared by consonant skeleton so spelling and transliteration variants
 *     (Sunita / Suneeta / सुनीता / सुनित) all match.
 *  2. Patterns: phone / Aadhaar / any long digit run, email addresses.
 *
 * shortcut: names NOT in the record (a relative, a neighbour) are not caught;
 * add a multilingual NER pass before using this on real patients.
 */

export type Placeholder = "[PATIENT]" | "[DOCTOR]" | "[PLACE]" | "[ID]" | "[PHONE]" | "[EMAIL]";

export interface KnownTerm {
  /** Latin or Devanagari word, e.g. "Sunita" or "सुनीता". */
  word: string;
  placeholder: Placeholder;
}

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
// Devanagari dependent vowel signs, virama, nukta, anusvara, chandrabindu, visarga.
const DEVANAGARI_MARKS = /[ऀ-ःऺ-ॏॕ-ॗॢॣ]/g;
// Independent Devanagari vowels carry no consonant information either.
const DEVANAGARI_VOWELS = /[ऄ-औॠॡॲ-ॷ]/g;
const LATIN_VOWELS = /[aeiouy]/g;
const DEVANAGARI_DIGITS = /[०-९]/g;

/** Consonant skeleton used for fuzzy name matching. */
export function skeleton(word: string): string {
  const w = word.normalize("NFC").toLowerCase();
  if (/[ऀ-ॿ]/.test(w)) return w.replace(DEVANAGARI_MARKS, "").replace(DEVANAGARI_VOWELS, "");
  // "h" after a consonant is aspiration in romanised Indic names (Deshmukh / Desmuk).
  return w.replace(/([^aeiou])h/g, "$1").replace(LATIN_VOWELS, "").replace(/(.)\1+/g, "$1");
}

function toAsciiDigits(text: string): string {
  return text.replace(DEVANAGARI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0966));
}

// 10+ digits, optionally split by spaces or dashes: phones, Aadhaar, ABHA numbers.
const LONG_NUMBER = /(?<![\d.])\d(?:[\s-]?\d){9,}(?![\d.])/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

function buildMatcher(terms: KnownTerm[]) {
  const fuzzy = new Map<string, Placeholder>();
  const exact = new Map<string, Placeholder>();
  for (const { word, placeholder } of terms) {
    for (const part of word.match(WORD) ?? []) {
      const sk = skeleton(part);
      // Short skeletons ("Demo" -> "dm") would match ordinary words, so they must match exactly.
      if (sk.length >= 3) fuzzy.set(sk, placeholder);
      else if (part.length >= 2) exact.set(part.normalize("NFC").toLowerCase(), placeholder);
    }
  }
  const lookup = (t: string) => exact.get(t.normalize("NFC").toLowerCase()) ?? fuzzy.get(skeleton(t));
  // Honorifics glued to names: "Sunitaji", "सुनीताजी", "Kavitatai".
  return (token: string): Placeholder | undefined => {
    const bare = token.replace(/(?:ji|jee|tai|bai|जी|ताई|बाई)$/iu, "");
    return lookup(token) ?? (bare !== token && bare.length >= 3 ? lookup(bare) : undefined);
  };
}

/** Replaces identifiers with placeholders. Clinical numbers (BP 140/92, Hb 9.8) are kept. */
export function deidentify(text: string, terms: KnownTerm[]): string {
  const match = buildMatcher(terms);
  return toAsciiDigits(text)
    .replace(EMAIL, "[EMAIL]")
    .replace(LONG_NUMBER, "[PHONE]")
    .replace(WORD, (token) => match(token) ?? token);
}

/**
 * Independent check on the scrubbed text (plain substring search, not the
 * tokenizer above). Non-empty result means the caller must not send the text.
 */
export function findLeaks(scrubbed: string, terms: KnownTerm[]): string[] {
  const haystack = toAsciiDigits(scrubbed).normalize("NFC").toLowerCase();
  const leaks = [...(haystack.match(LONG_NUMBER) ?? []), ...(haystack.match(EMAIL) ?? [])];
  for (const { word } of terms) {
    for (const part of word.match(WORD) ?? []) {
      const p = part.normalize("NFC").toLowerCase();
      if (p.length >= 4 && haystack.includes(p)) leaks.push(part);
    }
  }
  return leaks;
}
