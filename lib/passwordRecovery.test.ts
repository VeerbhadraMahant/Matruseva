import { afterEach, expect, it, vi } from "vitest";
import { createRecoveryProof, RECOVERY_MAX_AGE, verifyRecoveryProof } from "./passwordRecovery";

afterEach(() => vi.unstubAllEnvs());

it("keeps password recovery bound to its verified session and expiration", () => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "local-test-recovery-key");
  const now = 100_000;
  const proof = createRecoveryProof("recovery-session", now)!;
  expect(verifyRecoveryProof(proof, "recovery-session", now)).toBe(true);
  expect(verifyRecoveryProof(proof, "another-session", now)).toBe(false);
  expect(verifyRecoveryProof(proof.replace(/^\d+/, "99999999"), "recovery-session", now)).toBe(false);
  expect(verifyRecoveryProof(proof, "recovery-session", now + RECOVERY_MAX_AGE * 1000)).toBe(false);
});

it("requires a server signing key for recovery proofs", () => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  expect(createRecoveryProof("session")).toBeNull();
});
