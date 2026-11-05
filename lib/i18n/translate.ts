import { DEFAULT_LOCALE, type Locale } from "./config";
import { translateWith, type Params } from "./core";
import { messages, type MessageKey } from "./messages";
import type { Translator } from "./translate-client";

export type { Translator, Params };

/**
 * Translate against the FULL catalogue (server, tests, scripts). Falls back to
 * English, then to the key itself. Do not import this from client components:
 * it pulls every locale into the bundle. Use useT() there.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return translateWith(locale, messages[locale], key, params, messages[DEFAULT_LOCALE]);
}

/** Bind a translator to one locale using the full catalogue (server side). */
export function makeTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}
