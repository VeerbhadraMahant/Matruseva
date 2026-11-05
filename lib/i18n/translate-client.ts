// Bundle-safe half of the translator: no catalogue import (type-only below).
import type { Locale } from "./config";
import { translateWith, type Dict, type Params } from "./core";
import type { MessageKey } from "./messages";

/** Same call syntax on server (getT) and client (useT). */
export type Translator = (key: MessageKey, params?: Params) => string;

/** Bind a translator to one already-selected dictionary (client provider). */
export function makeDictTranslator(locale: Locale, dict: Dict): Translator {
  return (key, params) => translateWith(locale, dict, key, params);
}
