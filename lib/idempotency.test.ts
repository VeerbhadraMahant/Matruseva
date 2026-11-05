import { describe, expect, it } from "vitest";
import { isDuplicateRequest } from "./idempotency";

const dup = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "visits_client_request_id_uidx"',
};

describe("isDuplicateRequest", () => {
  it("accepts a unique violation on the idempotency index", () => {
    expect(isDuplicateRequest(dup, "k")).toBe(true);
  });
  it("ignores other unique violations, other codes, and calls without a key", () => {
    expect(isDuplicateRequest({ code: "23505", message: 'violates unique constraint "patients_phone_key"' }, "k")).toBe(false);
    expect(isDuplicateRequest({ code: "42501", message: "client_request_id" }, "k")).toBe(false);
    expect(isDuplicateRequest(dup, undefined)).toBe(false);
    expect(isDuplicateRequest(null, "k")).toBe(false);
  });
});
