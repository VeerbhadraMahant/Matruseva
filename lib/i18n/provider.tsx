"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import type { Dict } from "./core";
import { makeDictTranslator, type Translator } from "./translate-client";

type Ctx = { locale: Locale; t: Translator };
const I18nContext = createContext<Ctx | null>(null);

/** Receives ONLY the active locale's merged messages from the root layout. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: makeDictTranslator(locale, messages) }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider> (mounted in app/layout.tsx).");
  return ctx;
}

/** Client-component translator; same call syntax as server getT(): t("key", { x }). */
export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
