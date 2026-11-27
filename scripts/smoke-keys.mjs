// Read-only smoke test for the API keys and secrets MatruSetu depends on.
// Usage: npm run smoke:keys   (loads .env, prints names and statuses only, never values)
import { readFileSync } from "node:fs";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: fall back to the real environment (CI, Vercel).
}

const TIMEOUT_MS = 10_000;
const env = (name) => (process.env[name] ?? "").trim();
const results = [];

async function check(name, required, fn) {
  const t0 = performance.now();
  let status = "OK";
  let code = "-";
  let reason = "";
  try {
    const r = await fn();
    if (r === "skip") status = "SKIP";
    else if (typeof r === "object") ({ status = "OK", code = "-", reason = "" } = r);
  } catch (e) {
    status = "FAIL";
    code = e.code ?? "-";
    reason = e.reason ?? (e.name === "TimeoutError" ? "timeout" : e.name === "TypeError" ? "network error" : "error");
  }
  const ms = Math.round(performance.now() - t0);
  if (status === "SKIP" && !reason) reason = required ? "missing" : "not configured (optional)";
  results.push({ name, required, status, code, ms, reason });
  console.log([name, status, code, `${ms}ms`, reason].join(" | "));
}

const fail = (reason, code) => Object.assign(new Error(reason), { reason, code });

// fetch with timeout; returns the Response. Never include request URLs or headers in errors.
const get = (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

const expectOk = (res, what) => {
  if (!res.ok) throw fail(res.status === 401 || res.status === 403 ? `${what} rejected` : `${what} failed`, res.status);
  return { code: res.status };
};

// JWT role claim of a Supabase key (payload is not secret, but only the role is read).
const jwtRole = (key) => {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
  } catch {
    return null;
  }
};

const sbUrl = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");

await check("NEXT_PUBLIC_SUPABASE_URL", true, () => {
  if (!sbUrl) return "skip";
  if (!/^https:\/\/[^/]+$/.test(sbUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(sbUrl)) throw fail("not a bare https URL");
});

await check("SUPABASE_ANON_KEY", true, async () => {
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!key || !sbUrl) return "skip";
  const role = jwtRole(key);
  if (role && role !== "anon") throw fail(`JWT role is ${role}, expected anon`);
  return expectOk(await get(`${sbUrl}/auth/v1/settings`, { headers: { apikey: key } }), "auth settings");
});

await check("SUPABASE_SERVICE_ROLE_KEY", true, async () => {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key || !sbUrl) return "skip";
  const role = jwtRole(key);
  if (role && role !== "service_role") throw fail(`JWT role is ${role}, expected service_role`);
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const res = await get(`${sbUrl}/rest/v1/clinics?select=id&limit=1`, { headers: h });
  return expectOk(res, "clinics select");
});

const geminiKey = env("GEMINI_API_KEY");
// Model names come from the app source so this cannot drift from lib/consultation.ts.
const models = /GEMINI_MODELS\s*=\s*\[([^\]]*)\]/.exec(readFileSync("lib/consultation.ts", "utf8"))?.[1].match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
if (!models.length) {
  results.push({ name: "GEMINI_MODELS", required: true, status: "FAIL" });
  console.log("GEMINI_MODELS | FAIL | - | 0ms | could not parse model list");
}
for (const model of models) {
  await check(`GEMINI_API_KEY[${model}]`, true, async () => {
    if (!geminiKey) return "skip";
    // models.get is free and proves both the key and that the model name still exists.
    const res = await get(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": geminiKey } });
    if (res.status === 404) throw fail("model not found (retired or renamed)", 404);
    return expectOk(res, "model lookup");
  });
}

await check("SARVAM_API_KEY", true, async () => {
  const key = env("SARVAM_API_KEY");
  if (!key) return "skip";
  // docs.sarvam.ai: POST /text-lid {input}, the cheapest authenticated text call.
  const res = await get("https://api.sarvam.ai/text-lid", {
    method: "POST",
    headers: { "api-subscription-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ input: "hello" }),
  });
  return expectOk(res, "text-lid");
});

await check("WHATSAPP_API_TOKEN+PHONE_NUMBER_ID", false, async () => {
  const token = env("WHATSAPP_API_TOKEN");
  const id = env("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !id) return "skip";
  const res = await get(`https://graph.facebook.com/v21.0/${encodeURIComponent(id)}?fields=id`, { headers: { Authorization: `Bearer ${token}` } });
  return expectOk(res, "phone number lookup");
});

const secretLen = (name, required, min) =>
  check(name, required, () => {
    const n = env(name).length;
    if (!n) return "skip";
    const bucket = n < 16 ? "<16" : n < 32 ? "16-31" : "32+";
    if (n < min) throw fail(`too short (length ${bucket}, need ${min}+)`);
    return { reason: `length ${bucket}` };
  });
await secretLen("LISTEN_LINK_SECRET", true, 32);
await secretLen("WHATSAPP_APP_SECRET", true, 16);
await secretLen("WHATSAPP_VERIFY_TOKEN", true, 16);

await check("NEXT_PUBLIC_SITE_URL", false, () => {
  const v = env("NEXT_PUBLIC_SITE_URL");
  if (!v) return { reason: "not set (reset links fall back to request origin)" };
  let u;
  try {
    u = new URL(v);
  } catch {
    throw fail("not a valid URL");
  }
  if (u.protocol !== "https:" && u.hostname !== "localhost") throw fail("must be https (or http://localhost in dev)");
  return { reason: u.protocol === "https:" ? "https" : "localhost" };
});

await check("DEMO_MODE", false, () => ({ reason: env("DEMO_MODE") === "1" ? "ON (demo data, shared login)" : "off" }));

const failed = results.filter((r) => r.required && r.status !== "OK");
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${count("OK")} ok, ${count("FAIL")} fail, ${count("SKIP")} skip; ${failed.length} required check(s) not passing`);
process.exit(failed.length ? 1 : 0);
