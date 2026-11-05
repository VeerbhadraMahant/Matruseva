import { describe, expect, it } from "vitest";
import { translateWith } from "./core";
import { translate, makeTranslator } from "./translate";
import { DEFAULT_LOCALE, LOCALES, isLocale, resolveLocale } from "./config";
import { intlLocale } from "./intl";
import { formatDate, formatShortDate, relativeDays } from "../format";
import type { MessageKey } from "./messages";

const k = (s: string) => s as MessageKey;

describe("config", () => {
  it("validates locales", () => {
    expect(LOCALES).toEqual(["en", "hi", "mr"]);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(resolveLocale("mr")).toBe("mr");
    expect(resolveLocale("<script>")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });
  it("forces Latin digits", () => {
    expect(intlLocale("hi")).toBe("hi-IN-u-nu-latn");
    expect(intlLocale()).toBe("en-IN-u-nu-latn");
  });
});

describe("translate", () => {
  it("returns locale text", () => {
    expect(translate("en", "common.save")).toBe("Save");
    expect(translate("hi", "common.save")).toBe("सहेजें");
    expect(translate("mr", "common.save")).toBe("जतन करा");
  });
  it("falls back to the key when unknown", () => {
    expect(translate("hi", k("nope.missing"))).toBe("nope.missing");
  });
  it("interpolates {params} and leaves unknown placeholders", () => {
    const d = { "a.hello": "Hi {name}, {n} items, {x}" };
    expect(translateWith("en", d, "a.hello", { name: "Asha", n: 3 })).toBe("Hi Asha, 3 items, {x}");
  });
  it("selects plural variants by Intl.PluralRules", () => {
    const t = makeTranslator("en");
    expect(t("common.unit.day", { count: 1 })).toBe("1 day");
    expect(t("common.unit.day", { count: 3 })).toBe("3 days");
    expect(makeTranslator("mr")("common.unit.week", { count: 1 })).toBe("1 आठवडा");
    expect(makeTranslator("mr")("common.unit.week", { count: 2 })).toBe("2 आठवडे");
  });
  it("supports _zero and _few", () => {
    const d = { "k_zero": "none", "k_one": "{count} one", "k_few": "{count} few", "k_other": "{count} other" };
    expect(translateWith("en", d, "k", { count: 0 })).toBe("none");
    expect(translateWith("en", d, "k", { count: 1 })).toBe("1 one");
    expect(translateWith("en", d, "k", { count: 5 })).toBe("5 other");
    const ru = { "k_few": "{count} few", "k_other": "{count} other" };
    expect(translateWith("en", ru, "k", { count: 5 })).toBe("5 other");
  });
  it("falls back to _other when the category variant is missing, and to the bare key", () => {
    expect(translateWith("en", { k_other: "many" }, "k", { count: 1 })).toBe("many");
    expect(translateWith("en", { k: "plain {count}" }, "k", { count: 2 })).toBe("plain 2");
  });
  it("falls back to the fallback dictionary", () => {
    expect(translateWith("hi", {}, "x", undefined, { x: "English" })).toBe("English");
  });
});

describe("locale-aware formatting", () => {
  it("keeps English output unchanged by default", () => {
    expect(formatDate("2026-11-04")).toBe("04 Nov 2026");
    expect(formatShortDate("2026-11-04")).toBe("04 Nov");
    expect(formatDate(null)).toBe("—");
    const today = new Date(2026, 10, 4);
    expect(relativeDays("2026-11-07", today)).toBe("in 3d");
    expect(relativeDays("2026-11-01", today)).toBe("3d ago");
  });
  it("localises month names but keeps Latin digits", () => {
    expect(formatDate("2026-11-04", "hi")).toMatch(/^04 .+ 2026$/);
    expect(formatDate("2026-11-04", "hi")).toContain("नव");
    expect(formatDate("2026-11-04", "mr")).toMatch(/04/);
    expect(relativeDays("2026-11-01", new Date(2026, 10, 4), "hi")).toContain("3");
  });
});
