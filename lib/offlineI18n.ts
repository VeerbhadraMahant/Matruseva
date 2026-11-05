import type { Translator } from "@/lib/i18n/translate-client";

/**
 * Non-React client code (offline queue, submit helpers) cannot call useT().
 * <OfflineSync> registers the active translator here on mount; until then (and
 * in unit tests that do not register one) lookups return the message key.
 */
let current: Translator | null = null;

export function setOfflineTranslator(t: Translator | null): void {
  current = t;
}

export const offlineT: Translator = (key, params) => (current ? current(key, params) : key);
