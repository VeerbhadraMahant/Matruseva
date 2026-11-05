/**
 * True when a Postgres/PostgREST error is a unique violation (23505) on the
 * `client_request_id` idempotency index, i.e. this exact request was already
 * applied. Only counts when the caller actually sent a key, so unrelated
 * unique violations still surface as errors.
 */
export function isDuplicateRequest(
  error: { code?: string; message?: string; details?: string | null } | null | undefined,
  clientRequestId: string | undefined,
): boolean {
  if (!error || !clientRequestId || error.code !== "23505") return false;
  return `${error.message ?? ""} ${error.details ?? ""}`.includes("client_request_id");
}
