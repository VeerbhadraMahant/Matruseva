// Dictionary-agnostic translation core. Imports NO message catalogue, so the
// client bundle only ever carries the active locale's dictionary (passed in by
// the root layout through <I18nProvider>).

import { DEFAULT_LOCALE, type Locale } from "./config";

export type Params = Record<string, string | number>;
export type Dict = Readonly<Record<string, string>>;

const pluralRules = new Map<Locale, Intl.PluralRules>();
function pluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules.select(count);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Pick the message for `key`. If `params.count` is a number, plural variants
 * are tried first: `key_zero` (only when count === 0), then `key_<category>`
 * from Intl.PluralRules (zero|one|two|few|many|other), then `key_other`, then
 * the bare `key`. Lookup order per dictionary; `fallback` (English) is tried
 * after the active dictionary. Last resort is the key itself.
 */
function lookup(dict: Dict, key: string, params?: Params, locale: Locale = DEFAULT_LOCALE): string | undefined {
  const count = params?.count;
  if (typeof count === "number") {
    if (count === 0 && dict[`${key}_zero`] !== undefined) return dict[`${key}_zero`];
    const cat = dict[`${key}_${pluralCategory(locale, count)}`];
    if (cat !== undefined) return cat;
    if (dict[`${key}_other`] !== undefined) return dict[`${key}_other`];
  }
  return dict[key];
}

export function translateWith(
  locale: Locale,
  dict: Dict,
  key: string,
  params?: Params,
  fallbackDict?: Dict,
): string {
  const found =
    lookup(dict, key, params, locale) ??
    (fallbackDict ? lookup(fallbackDict, key, params, DEFAULT_LOCALE) : undefined);
  return interpolate(found ?? key, params);
}
