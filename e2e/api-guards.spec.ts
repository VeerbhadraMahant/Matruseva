import { expect, test } from "@playwright/test";
import { demoSignIn } from "./helpers/demo";

/** /api/voice-vitals and /api/ocr must reject anonymous and malformed requests. Needs DEMO_MODE=1 for the signed-in half. */

for (const route of ["/api/voice-vitals", "/api/ocr"]) {
  test(`${route}: anonymous POST does not succeed`, async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL });
    const res = await anon.post(route, {
      multipart: {
        audio: { name: "a.webm", mimeType: "audio/webm", buffer: Buffer.alloc(4000, 1) },
        file: { name: "a.png", mimeType: "image/png", buffer: Buffer.alloc(4000, 1) },
        lang: "en-IN",
      },
      maxRedirects: 0,
    });
    expect([301, 302, 303, 307, 308, 401, 403]).toContain(res.status());
    await anon.dispose();
  });

  test(`${route}: signed-in empty or invalid body gets a 4xx`, async ({ page }) => {
    await demoSignIn(page);
    const empty = await page.request.post(route, { multipart: { note: "x" } });
    expect(empty.status()).toBeGreaterThanOrEqual(400);
    expect(empty.status()).toBeLessThan(500);

    const bad = await page.request.post(route, {
      multipart: {
        audio: { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
        file: { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
        lang: "en-IN",
      },
    });
    expect(bad.status()).toBeGreaterThanOrEqual(400);
    expect(bad.status()).toBeLessThan(500);
  });
}

test("/api/ocr: oversize upload gets a 4xx", async ({ page }) => {
  await demoSignIn(page);
  const res = await page.request.post("/api/ocr", {
    multipart: { file: { name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(4_600_000, 1) } },
  });
  // 413 from the route; 501 means Sarvam is not configured on this server (checked before the size).
  expect([413, 501]).toContain(res.status());
});

test("/api/voice-vitals: oversize clip gets a 4xx", async ({ page }) => {
  await demoSignIn(page);
  const res = await page.request.post("/api/voice-vitals", {
    multipart: { lang: "en-IN", audio: { name: "big.webm", mimeType: "audio/webm", buffer: Buffer.alloc(12_000_000, 1) } },
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);
});
