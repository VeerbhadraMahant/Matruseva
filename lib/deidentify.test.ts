import { describe, expect, it } from "vitest";
import { deidentify, findLeaks, skeleton, type KnownTerm } from "./deidentify";

const terms: KnownTerm[] = [
  { word: "Sunita Verma", placeholder: "[PATIENT]" },
  { word: "सुनीता वर्मा", placeholder: "[PATIENT]" },
  { word: "Pooja Deshmukh", placeholder: "[DOCTOR]" },
  { word: "Kothrud", placeholder: "[PLACE]" },
];

// Real Sarvam codemix output for the test consultation (e2e/fixtures/consultation.wav).
const SARVAM_SAMPLE =
  "नमस्ते सुनीता जी, आज कैसे हो? Doctor साहब, दो दिन से सिर में दर्द है। मेरा number 9845012345 है। आपका BP 140/92 आ रहा है। hemoglobin 9.8 है। baby की heartbeat 146 है।";

describe("skeleton", () => {
  it("collapses spelling and transliteration variants", () => {
    expect(skeleton("Sunita")).toBe(skeleton("Suneeta"));
    expect(skeleton("सुनीता")).toBe(skeleton("सुनित"));
    expect(skeleton("Deshmukh")).toBe(skeleton("Desmuk"));
    for (const [a, b] of [["Riya", "Ria"], ["Aarti", "Arti"], ["Anoo", "Anu"], ["Patel", "Patil"], ["Ram", "Rama"]]) expect(skeleton(a)).toBe(skeleton(b));
  });

  it("keeps Latin vowels so common words do not collide with names", () => {
    expect(skeleton("sugar")).not.toBe(skeleton("Sagar"));
    expect(skeleton("sent")).not.toBe(skeleton("Sunita"));
  });
});

describe("deidentify", () => {
  it("scrubs names, phone numbers and keeps clinical values in real transcript text", () => {
    const out = deidentify(SARVAM_SAMPLE, terms);
    expect(out).not.toContain("सुनीता");
    expect(out).not.toContain("9845012345");
    expect(out).toContain("[PATIENT] जी");
    expect(out).toContain("[PHONE]");
    for (const clinical of ["140/92", "9.8", "146"]) expect(out).toContain(clinical);
    expect(findLeaks(out, terms)).toEqual([]);
  });

  it("catches spelling variants, honorifics and Latin names", () => {
    const out = deidentify("Suneeta ji and Sunitaji met Dr Desmuk in Kothrud.", terms);
    expect(out).toBe("[PATIENT] ji and [PATIENT] met Dr [DOCTOR] in [PLACE].");
  });

  it("scrubs Aadhaar-style spaced numbers, Devanagari digits and emails", () => {
    const out = deidentify("Aadhaar 1234 5678 9012, फोन ९८४५०१२३४५, mail sunita.v@gmail.com", terms);
    expect(out).toBe("Aadhaar [PHONE], फोन [PHONE], mail [EMAIL]");
  });

  it("does not scrub short numbers or dosages", () => {
    const out = deidentify("BP 110/70, iron 100 mg, 28 weeks, FHR 146", terms);
    expect(out).toBe("BP 110/70, iron 100 mg, 28 weeks, FHR 146");
  });

  it("scrubs a phone number at the end of a sentence or glued to \"no.\"", () => {
    expect(deidentify("call 9845012345.", terms)).toBe("call [PHONE].");
    expect(deidentify("mobile no.9845012345 ok", terms)).toBe("mobile no.[PHONE] ok");
  });

  it("leaves clinical words that sound like record names alone", () => {
    const withSagar: KnownTerm[] = [...terms, { word: "Sagar Patil", placeholder: "[DOCTOR]" }];
    expect(deidentify("sugar 110 fasting, Dr sent her for USG", withSagar)).toBe("sugar 110 fasting, Dr sent her for USG");
  });

  it("matches short Latin names exactly only", () => {
    expect(deidentify("Ann came, an hour late", [{ word: "Ann", placeholder: "[PATIENT]" }])).toBe("[PATIENT] came, an hour late");
  });

  it("over-scrubs a long space-separated series of readings (accepted, privacy first)", () => {
    expect(deidentify("FHR 146 148 150 144", terms)).toBe("FHR [PHONE]");
  });

  it("does not catch names that are not in the record (known limitation, needs NER)", () => {
    expect(deidentify("Kavita stayed", terms)).toBe("Kavita stayed");
  });
});

describe("findLeaks", () => {
  it("flags a name the tokenizer missed and long numbers", () => {
    expect(findLeaks("met sunitabehen at 98450 12345", terms).sort()).toEqual(["98450 12345", "Sunita"].sort());
  });
});
