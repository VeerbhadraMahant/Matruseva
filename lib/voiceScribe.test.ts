import { describe, expect, it } from "vitest";
import { parseVoiceToVitals } from "./voiceScribe";

describe("parseVoiceToVitals", () => {
  it("parses standard English clinical dictation", () => {
    const input = "BP 130 over 80, weight 54 kg, hemoglobin 9.5, mild swelling";
    const res = parseVoiceToVitals(input);
    expect(res.bpSys).toBe(130);
    expect(res.bpDia).toBe(80);
    expect(res.weight).toBe(54);
    expect(res.hb).toBe(9.5);
    expect(res.symptoms).toContain("Pedal Edema (Swelling)");
  });

  it("parses Hindi / Hinglish spoken dictation with words", () => {
    const input = "BP ek sau chaalees nabbe, vajan 58 kilo, hemoglobin 10.2, sir dard ahe";
    const res = parseVoiceToVitals(input);
    expect(res.bpSys).toBe(140);
    expect(res.bpDia).toBe(90);
    expect(res.weight).toBe(58);
    expect(res.hb).toBe(10.2);
    expect(res.symptoms).toContain("Severe Headache");
  });

  it("parses slash formatted BP and FHR", () => {
    const input = "BP 120/80, fhr 142, fundal height 28";
    const res = parseVoiceToVitals(input);
    expect(res.bpSys).toBe(120);
    expect(res.bpDia).toBe(80);
    expect(res.fhr).toBe(142);
    expect(res.fundalHeight).toBe(28);
  });

  it("detects danger symptoms like bleeding and decreased movement", () => {
    const input = "patient says bleeding ahe and baby not moving";
    const res = parseVoiceToVitals(input);
    expect(res.symptoms).toContain("Vaginal Bleeding");
    expect(res.symptoms).toContain("Decreased Fetal Movement");
  });
});
