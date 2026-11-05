import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

const handle = vi.fn(async () => ({ replyText: "ok" }));
vi.mock("@/lib/whatsappBot", () => ({ handleIncomingWhatsAppMessage: handle }));

import { GET, POST } from "./route";

const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ value: { messages: [{ type: "text", from: "919999999999", text: { body: "1" } }] } }] }],
});
const sign = (b: string, s: string) => "sha256=" + createHmac("sha256", s).update(b).digest("hex");
const post = (b: string, sig?: string) =>
  new NextRequest("http://x/api/whatsapp/webhook", {
    method: "POST",
    body: b,
    headers: sig ? { "x-hub-signature-256": sig } : {},
  });

beforeEach(() => handle.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe("whatsapp webhook", () => {
  it("GET rejects the old default token and an unset token", async () => {
    const url = "http://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=matrusetu_secret&hub.challenge=c";
    expect((await GET(new NextRequest(url))).status).toBe(403);
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "real");
    expect((await GET(new NextRequest(url))).status).toBe(403);
    expect((await GET(new NextRequest(url.replace("matrusetu_secret", "real")))).status).toBe(200);
  });

  it("POST fails closed when no app secret is configured", async () => {
    expect((await POST(post(body, sign(body, "s")))).status).toBe(503);
    expect(handle).not.toHaveBeenCalled();
  });

  it("POST rejects missing or wrong signatures", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "s");
    expect((await POST(post(body))).status).toBe(401);
    expect((await POST(post(body, sign(body, "wrong")))).status).toBe(401);
    expect(handle).not.toHaveBeenCalled();
  });

  it("POST rejects the old unauthenticated simulator payload", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "s");
    const sim = JSON.stringify({ messageText: "1", patientId: "p" });
    expect((await POST(post(sim))).status).toBe(401);
    expect((await POST(post(sim, sign(sim, "s")))).status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });

  it("POST processes a correctly signed Meta payload", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "s");
    expect((await POST(post(body, sign(body, "s")))).status).toBe(200);
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
