import {
  getOfflineQueue,
  isNetworkError,
  type OfflineQueue,
  type QueueEntryType,
  type QueuePayload,
  pickPayload,
} from "@/lib/offlineQueue";

export const OFFLINE_SAVED_MESSAGE = "Saved offline — will sync when you're back online";

export interface SubmitResult {
  error: string | null;
  /** True when the change was stored in the offline queue instead of sent. */
  queued?: boolean;
}

interface Options {
  type: QueueEntryType;
  patientId: string;
  /** Serialisable fields to store if we have to queue (whitelisted per type). */
  fields: Record<string, unknown>;
  /** Performs the real server action with the idempotency key. */
  run: (clientRequestId: string) => Promise<{ error: string | null }>;
  /** Called with OFFLINE_SAVED_MESSAGE when the change was queued. */
  notify?: (message: string) => void;
  /** Injected for tests. */
  queue?: OfflineQueue;
  isOnline?: () => boolean;
  uuid?: () => string;
}

/**
 * Queue-or-send. We queue ONLY when the server cannot be reached: the browser
 * reports offline, or the action call throws a network-type error. An `{ error }`
 * returned by the action (validation, auth, RLS) is passed back untouched so the
 * user sees it, exactly as before.
 */
export async function submitOrQueue(o: Options): Promise<SubmitResult> {
  const id = (o.uuid ?? (() => crypto.randomUUID()))();
  const online = (o.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine !== false))();

  const queueIt = async (): Promise<SubmitResult> => {
    try {
      const queue = o.queue ?? getOfflineQueue();
      await queue.enqueue({ id, type: o.type, patientId: o.patientId, payload: pickPayload(o.type, o.fields) as QueuePayload });
    } catch {
      return { error: "You're offline and this could not be saved on the device. Please try again when connected." };
    }
    o.notify?.(OFFLINE_SAVED_MESSAGE);
    return { error: null, queued: true };
  };

  if (!online) return queueIt();
  try {
    return await o.run(id);
  } catch (err) {
    // The request may or may not have reached the server; the shared id makes the replay safe.
    if (isNetworkError(err)) return queueIt();
    throw err;
  }
}

/** Plain string fields of a FormData (files and non-strings are dropped). */
export function formDataFields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
