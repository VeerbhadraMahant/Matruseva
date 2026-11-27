import { describe, expect, it } from "vitest";
import { inRange, normalizeTranscript, parseVoiceToVitals, validBp } from "./voiceScribe";

const p = parseVoiceToVitals;

describe("normalizeTranscript number words", () => {
  const cases: [string, string][] = [
    ["ek sau bees", "120"],
    ["ek sau assi", "180"],
    ["one twenty", "120"],
    ["one hundred and twenty", "120"],
    ["one forty", "140"],
    ["fifty eight", "58"],
    ["twenty one", "21"],
    ["ek sau pachaas", "150"],
    ["do sau", "200"],
    ["assi", "80"],
    ["अट्ठावन", "58"],
    ["एक सौ बीस", "120"],
    ["एक सौ चालीस", "140"],
    ["ten point five", "10.5"],
    ["nau point paanch", "9.5"],
    ["ग्यारह दशमलव दो", "11.2"],
    ["10 point 5", "10.5"],
    ["१२० बाय ८०", "120 बाय 80"],
    ["शंभर वीस", "120"],
  ];
  it.each(cases)("%s -> %s", (input, expected) => {
    expect(normalizeTranscript(input)).toBe(expected);
  });

  it("keeps separate numbers apart", () => {
    expect(normalizeTranscript("one twenty eighty")).toBe("120 80");
    expect(normalizeTranscript("ek sau bees assi")).toBe("120 80");
  });
});

describe("blood pressure", () => {
  const ok: [string, number, number][] = [
    ["BP 120 by 80", 120, 80],
    ["bp ek sau bees by assi", 120, 80],
    ["बीपी 130/85", 130, 85],
    ["BP 130 80", 130, 80],
    ["BP 145 over 95", 145, 95],
    ["blood pressure is 110 by 70", 110, 70],
    ["ब्लड प्रेशर १२० बाय ८०", 120, 80],
    ["बीपी एक सौ बीस बटा अस्सी", 120, 80],
    ["bp one twenty over eighty", 120, 80],
    ["B.P. 140/90.", 140, 90],
    ["130 over 85", 130, 85],
    ["120 / 80", 120, 80],
    ["रक्तदाब 110 वर 70", 110, 70],
  ];
  it.each(ok)("%s", (text, sys, dia) => {
    const r = p(text);
    expect([r.bpSys, r.bpDia]).toEqual([sys, dia]);
    expect(r.rejected).toEqual([]);
  });

  it("rejects out-of-range or inverted BP and reports it", () => {
    for (const t of ["bp 300/80", "bp 80/120", "bp 120/20", "bp 50/30", "bp 120 120"]) {
      const r = p(t);
      expect(r.bpSys).toBeNull();
      expect(r.bpDia).toBeNull();
      expect(r.rejected.map((x) => x.field)).toEqual(["bp"]);
    }
    expect(p("bp 300/80").rejected[0].text).toBe("300/80");
  });

  it("ignores a lone BP number", () => {
    expect(p("bp 120").bpSys).toBeNull();
  });

  it("validBp rules", () => {
    expect(validBp(120, 80)).toBe(true);
    expect(validBp(80, 80)).toBe(false);
    expect(validBp(251, 80)).toBe(false);
    expect(validBp(120, 29)).toBe(false);
  });
});

describe("weight", () => {
  it.each([
    ["वजन 58 किलो", 58],
    ["weight 58 kg", 58],
    ["weight is 62.5", 62.5],
    ["vajan 54 kilo", 54],
    ["58 kilo", 58],
    ["वजन अट्ठावन किलो", 58],
    ["weight fifty eight kilo", 58],
    ["वज़न ५८ किलो", 58],
    ["वजन 50 किलो आहे", 50],
  ])("%s", (text, expected) => {
    expect(p(text).weight).toBe(expected);
  });

  it("rejects implausible weights", () => {
    for (const [t, raw] of [["weight 8", "8"], ["weight 250", "250"], ["weight 24", "24"]]) {
      const r = p(t);
      expect(r.weight).toBeNull();
      expect(r.rejected).toEqual([{ field: "weight", text: raw }]);
    }
  });

  it("accepts the boundaries 25 and 200", () => {
    expect(p("weight 25").weight).toBe(25);
    expect(p("weight 200").weight).toBe(200);
  });
});

describe("haemoglobin", () => {
  it.each([
    ["हीमोग्लोबिन 10.5", 10.5],
    ["hemoglobin 9", 9],
    ["haemoglobin is 11.2", 11.2],
    ["Hb 8.4", 8.4],
    ["hb ten point five", 10.5],
    ["एचबी ९.५", 9.5],
    ["हिमोग्लोबिन दस दशमलव पाँच", 10.5],
    ["hemoglobin 10.5 g/dl", 10.5],
  ])("%s", (text, expected) => {
    expect(p(text).hb).toBe(expected);
  });

  it("rejects out-of-range Hb", () => {
    expect(p("hb 2").hb).toBeNull();
    expect(p("hb 21").hb).toBeNull();
    expect(p("hb 21").rejected).toEqual([{ field: "hb", text: "21" }]);
    expect(p("hb 3").hb).toBe(3);
    expect(p("hb 20").hb).toBe(20);
  });
});

describe("FHR and fundal height", () => {
  it.each([
    ["FHR 140", 140],
    ["fetal heart rate 138", 138],
    ["dhadkan 142", 142],
    ["धड़कन 150", 150],
    ["एफएचआर एक सौ चालीस", 140],
    ["fhr one forty", 140],
    ["fhr ek sau chalis", 140],
  ])("fhr %s", (text, expected) => {
    expect(p(text).fhr).toBe(expected);
  });

  it("rejects out-of-range FHR", () => {
    expect(p("fhr 40").fhr).toBeNull();
    expect(p("fhr 250").fhr).toBeNull();
    expect(p("fhr 60").fhr).toBe(60);
    expect(p("fhr 220").fhr).toBe(220);
    expect(p("fhr 40").rejected[0].field).toBe("fhr");
  });

  it.each([
    ["fundal height 28 cm", 28],
    ["fundal height 28", 28],
    ["SFH 30", 30],
    ["फंडल हाइट 26", 26],
    ["fundal height twenty eight centimetres", 28],
  ])("fundal %s", (text, expected) => {
    expect(p(text).fundalHeight).toBe(expected);
  });

  it("rejects out-of-range fundal height", () => {
    expect(p("fundal height 4").fundalHeight).toBeNull();
    expect(p("fundal height 51").fundalHeight).toBeNull();
    expect(p("fundal height 5").fundalHeight).toBe(5);
    expect(p("fundal height 50").fundalHeight).toBe(50);
  });
});

describe("full dictations", () => {
  it("English TTS-style sentence", () => {
    const r = p("BP one twenty by eighty, weight fifty eight kilo, haemoglobin ten point five");
    expect([r.bpSys, r.bpDia, r.weight, r.hb]).toEqual([120, 80, 58, 10.5]);
  });

  it("real Sarvam saaras:v4 transcripts (en-IN)", () => {
    const a = p("BP one twenty by eighty, weight fifty eight kilo, hemoglobin ten point five, fundal height twenty eight centimeters, FHR one forty.");
    expect([a.bpSys, a.bpDia, a.weight, a.hb, a.fundalHeight, a.fhr]).toEqual([120, 80, 58, 10.5, 28, 140]);
    const b = p("BP 130 over 85. Weight 62 kilo.");
    expect([b.bpSys, b.bpDia, b.weight]).toEqual([130, 85, 62]);
  });

  it("Hinglish with symptoms", () => {
    const r = p("BP 130 80, vajan 54 kilo, hemoglobin 9.5, pairon mein sujan");
    expect([r.bpSys, r.bpDia, r.weight, r.hb]).toEqual([130, 80, 54, 9.5]);
    expect(r.symptoms).toEqual(["Pedal Edema (Swelling)"]);
  });

  it("Devanagari Hindi", () => {
    const r = p("बीपी 130/85, वजन 58 किलो, हीमोग्लोबिन 10.5, एफएचआर 140, फंडल हाइट 28 सेमी");
    expect([r.bpSys, r.bpDia, r.weight, r.hb, r.fhr, r.fundalHeight]).toEqual([130, 85, 58, 10.5, 140, 28]);
    expect(r.rejected).toEqual([]);
  });

  it("Marathi", () => {
    const r = p("रक्तदाब 120 वर 80, वजन 50 किलो, हिमोग्लोबिन 11");
    expect([r.bpSys, r.bpDia, r.weight, r.hb]).toEqual([120, 80, 50, 11]);
  });

  it("does not let a keyword grab another field's number", () => {
    const r = p("hb is low, weight 58 kilo");
    expect(r.hb).toBeNull();
    expect(r.weight).toBe(58);
  });

  it("empty and noise input extract nothing", () => {
    for (const t of ["", "   ", "hello how are you", "ठीक है"]) {
      const r = p(t);
      expect([r.bpSys, r.weight, r.hb, r.fhr, r.fundalHeight]).toEqual([null, null, null, null, null]);
      expect(r.symptoms).toEqual([]);
      expect(r.rejected).toEqual([]);
    }
  });

  it("keeps the raw transcript", () => {
    expect(p("BP 120 80").rawTranscript).toBe("BP 120 80");
  });
});

describe("symptoms", () => {
  it("does not read 'blood pressure' as bleeding", () => {
    expect(p("blood pressure 120/80").symptoms).toEqual([]);
  });

  it("detects danger signs in several languages", () => {
    expect(p("severe headache and blurred vision").symptoms).toEqual(["Severe Headache", "Blurring of Vision"]);
    expect(p("सिरदर्द और बुखार").symptoms).toEqual(["Severe Headache", "High Fever"]);
    expect(p("bleeding ahe").symptoms).toEqual(["Vaginal Bleeding"]);
  });
});

describe("original regression cases", () => {
  it("English dictation", () => {
    const res = p("BP 130 over 80, weight 54 kg, hemoglobin 9.5, mild swelling");
    expect([res.bpSys, res.bpDia, res.weight, res.hb]).toEqual([130, 80, 54, 9.5]);
    expect(res.symptoms).toContain("Pedal Edema (Swelling)");
  });

  it("Hinglish with number words", () => {
    const res = p("BP ek sau chaalees nabbe, vajan 58 kilo, hemoglobin 10.2, sir dard ahe");
    expect([res.bpSys, res.bpDia, res.weight, res.hb]).toEqual([140, 90, 58, 10.2]);
    expect(res.symptoms).toContain("Severe Headache");
  });

  it("slash BP, FHR and fundal height", () => {
    const res = p("BP 120/80, fhr 142, fundal height 28");
    expect([res.bpSys, res.bpDia, res.fhr, res.fundalHeight]).toEqual([120, 80, 142, 28]);
  });

  it("bleeding and decreased movement", () => {
    expect(p("patient says bleeding ahe and baby not moving").symptoms).toEqual(
      expect.arrayContaining(["Vaginal Bleeding", "Decreased Fetal Movement"]),
    );
  });
});

describe("inRange", () => {
  it("is inclusive and rejects NaN", () => {
    expect(inRange("hb", 3)).toBe(true);
    expect(inRange("hb", 20)).toBe(true);
    expect(inRange("hb", Number.NaN)).toBe(false);
  });
});
