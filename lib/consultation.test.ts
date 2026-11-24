import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { joinOutputs, knownTerms, partFileName, signJobToken, summarize, verifyJobToken, type Segment } from "./consultation";
import type { KnownTerm } from "./deidentify";

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

describe("summarize", () => {
  const terms: KnownTerm[] = [{ word: "Sunita Verma", placeholder: "[PATIENT]" }];
  const segments: Segment[] = [{ speaker: "0", start: 0, text: "Sunita ji, BP 140/92, call 9845012345." }];
  const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "g-key");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends only placeholders to the model and normalises the reply", async () => {
    fetchMock.mockResolvedValueOnce(ok(JSON.stringify({ findings: ["BP 140/92"], plan: "not a list" })));
    const summary = await summarize(segments, terms);
    const sent = fetchMock.mock.calls[0][1].body as string;
    expect(sent).toContain("[PATIENT]");
    expect(sent).toContain("[PHONE]");
    expect(sent).not.toMatch(/sunita|9845012345/i);
    expect(summary.findings).toEqual(["BP 140/92"]);
    expect(summary.plan).toEqual([]);
  });

  it("never calls the model when an identifier survives scrubbing", async () => {
    // "Sunitabehen" is one token the matcher misses, but the substring check catches it.
    await expect(summarize([{ speaker: "0", start: 0, text: "Sunitabehen came" }], terms)).rejects.toThrow(/withheld/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls through to the next model on rate limits, outages and network errors", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(ok(JSON.stringify({ advice: ["rest"] })));
    expect((await summarize(segments, terms)).advice).toEqual(["rest"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports the rate limit when every model fails", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    await expect(summarize(segments, terms)).rejects.toThrow(/rate limit/);
  });

  it("tries the next model after a reply that is not JSON, and refuses without a key", async () => {
    fetchMock.mockResolvedValueOnce(ok("not json")).mockResolvedValueOnce(ok(JSON.stringify({ plan: ["iron"] })));
    expect((await summarize(segments, terms)).plan).toEqual(["iron"]);
    fetchMock.mockResolvedValue(ok("not json"));
    await expect(summarize(segments, terms)).rejects.toThrow(/not valid/);
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(summarize(segments, terms)).rejects.toThrow(/not configured/);
  });
});

describe("knownTerms", () => {
  beforeEach(() => {
    vi.stubEnv("SARVAM_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ transliterated_text: "x" }), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps only distinctive address words and strips the doctor title", async () => {
    const terms = await knownTerms({ patientName: "Sunita Verma", doctorName: "Dr. Pooja Deshmukh", address: "Flat No. 4, Near Kothrud Road, Pune" });
    const latin = terms.filter((t) => t.word !== "x");
    expect(latin).toEqual([
      { word: "Sunita Verma", placeholder: "[PATIENT]" },
      { word: "Pooja Deshmukh", placeholder: "[DOCTOR]" },
      { word: "Kothrud Pune", placeholder: "[PLACE]" },
    ]);
  });

  it("keeps Devanagari address words whole", async () => {
    const terms = await knownTerms({ patientName: "Sunita", doctorName: "Dr Demo", address: "कोथरूड, पुणे" });
    expect(terms.find((t) => t.placeholder === "[PLACE]" && t.word !== "x")?.word).toBe("कोथरूड पुणे");
  });

  it("refuses a record without a patient name", async () => {
    await expect(knownTerms({ patientName: " ", doctorName: "Dr Demo" })).rejects.toThrow(/no name/);
  });
});
