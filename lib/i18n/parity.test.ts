import { describe, expect, it } from "vitest";
import { AREAS, AREA_UNTRANSLATED } from "./messages";
import { UNTRANSLATED_ALLOWLIST } from "./index";

const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (s: string) => new Set([...s.matchAll(PLACEHOLDER)].map((m) => m[1]));
const sorted = (o: object) => Object.keys(o).sort();

describe.each(Object.entries(AREAS))("area %s", (name, area) => {
  const en = area.en as Record<string, string>;
  const enKeys = sorted(en);

  for (const loc of ["hi", "mr"] as const) {
    const dict = area[loc] as Record<string, string>;

    it(`${loc} has exactly the same keys as en`, () => {
      expect(sorted(dict)).toEqual(enKeys);
    });

    it(`${loc} keeps every {param} placeholder (and adds none)`, () => {
      for (const key of enKeys) {
        if (dict[key] === undefined) continue;
        expect(placeholders(dict[key]), `${name}:${key} (${loc})`).toEqual(placeholders(en[key]));
      }
    });

    it(`${loc} values are non-empty and translated (unless allow-listed)`, () => {
      for (const key of enKeys) {
        const v = dict[key];
        if (v === undefined) continue;
        expect(v.trim(), `${key} (${loc}) is empty`).not.toBe("");
        if (v === en[key]) {
          expect(UNTRANSLATED_ALLOWLIST.has(key), `${key} (${loc}) is identical to en; translate it or add it to this file's \`untranslated\` list`).toBe(true);
        }
      }
    });
  }

  it("prefixes every key with the area name (dotted flat keys)", () => {
    for (const key of enKeys) expect(key).toMatch(/^[a-zA-Z][\w-]*(\.[\w-]+)+$/);
  });

  it("plural keys come in complete sets that include _other", () => {
    const bases = new Set(enKeys.filter((k) => /_(zero|one|two|few|many|other)$/.test(k)).map((k) => k.replace(/_[a-z]+$/, "")));
    for (const base of bases) expect(en[`${base}_other`], `${base}_other missing`).toBeDefined();
  });
});

describe("catalogue", () => {
  it("has no duplicate keys across areas", () => {
    const seen = new Map<string, string>();
    for (const [name, area] of Object.entries(AREAS)) {
      for (const key of Object.keys(area.en)) {
        expect(seen.has(key), `${key} defined in both ${seen.get(key)} and ${name}`).toBe(false);
        seen.set(key, name);
      }
    }
  });

  it("allow-list entries refer to real keys in their own area", () => {
    for (const [name, list] of Object.entries(AREA_UNTRANSLATED)) {
      const keys = AREAS[name as keyof typeof AREAS].en as Record<string, string>;
      for (const key of list) expect(keys[key], `${name}.untranslated has unknown key ${key}`).toBeDefined();
    }
  });
});
