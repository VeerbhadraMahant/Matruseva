import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { joinOutputs, partFileName, signJobToken, verifyJobToken } from "./consultation";

describe("job token", () => {
  beforeEach(() => vi.stubEnv("SARVAM_API_KEY", "test-key"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const payload = { jobId: "20261124_abc", patientId: "p2-sunita-verma", clinicId: "demo-clinic-id" };

  it("round-trips a genuine token", () => {
    expect(verifyJobToken(signJobToken(payload))).toMatchObject(payload);
  });

  it("rejects tampered, foreign-key and expired tokens", () => {
    const token = signJobToken(payload);
    const [data, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, clinicId: "other", exp: 9e9 })).toString("base64url");
    expect(verifyJobToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyJobToken(`${data}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verifyJobToken("garbage")).toBeNull();
    expect(verifyJobToken(undefined)).toBeNull();

    vi.stubEnv("SARVAM_API_KEY", "rotated-key");
    expect(verifyJobToken(token)).toBeNull();

    vi.stubEnv("SARVAM_API_KEY", "test-key");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
    expect(verifyJobToken(token)).toBeNull();
  });
});

describe("joinOutputs", () => {
  const entry = (speaker_id: string, start: number, end: number, transcript: string) => ({
    speaker_id,
    start_time_seconds: start,
    end_time_seconds: end,
    transcript,
  });

  it("keeps a single part's speaker ids and timestamps", () => {
    const segs = joinOutputs([{ diarized_transcript: { entries: [entry("0", 0, 4, "नमस्ते"), entry("1", 4.5, 9, "BP 140/92")] } }]);
    expect(segs).toEqual([
      { speaker: "0", start: 0, text: "नमस्ते" },
      { speaker: "1", start: 4.5, text: "BP 140/92" },
    ]);
  });

  it("offsets later parts, scopes speakers per part, and falls back to the plain transcript", () => {
    const segs = joinOutputs([
      { diarized_transcript: { entries: [entry("0", 0, 300, "part one")] } },
      { transcript: "part two", diarized_transcript: { entries: [] } },
      { diarized_transcript: { entries: [entry("1", 2, 5, "  "), entry("0", 6, 8, "part three")] } },
    ]);
    expect(segs).toEqual([
      { speaker: "1.0", start: 0, text: "part one" },
      { speaker: "2.0", start: 300, text: "part two" },
      { speaker: "3.0", start: 306, text: "part three" },
    ]);
  });
});

describe("partFileName", () => {
  it("names parts by the recorder's container", () => {
    expect(partFileName(0, "audio/webm;codecs=opus")).toBe("0.webm");
    expect(partFileName(3, "audio/mp4")).toBe("3.mp4");
    expect(partFileName(1, "audio/ogg;codecs=opus")).toBe("1.ogg");
  });
});
