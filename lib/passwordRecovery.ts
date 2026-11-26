import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_COOKIE = "matrusetu_recovery";
export const RECOVERY_MAX_AGE = 10 * 60;

function signature(sessionId: string, expires: string): Buffer | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createHmac("sha256", key).update(`password-recovery:${sessionId}:${expires}`).digest() : null;
}

export function createRecoveryProof(sessionId: string, now = Date.now()): string | null {
  const expires = String(now + RECOVERY_MAX_AGE * 1000);
  const signed = signature(sessionId, expires);
  return signed ? `${expires}.${signed.toString("hex")}` : null;
}

export function verifyRecoveryProof(proof: string | undefined, sessionId: unknown, now = Date.now()): boolean {
  if (typeof sessionId !== "string" || !proof) return false;
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec(proof);
  if (!match || Number(match[1]) <= now) return false;
  const expected = signature(sessionId, match[1]);
  return Boolean(expected && timingSafeEqual(expected, Buffer.from(match[2], "hex")));
}
