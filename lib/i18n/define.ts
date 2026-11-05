export type AreaMessages<E extends Record<string, string>> = {
  readonly en: E;
  readonly hi: Record<keyof E, string>;
  readonly mr: Record<keyof E, string>;
};

/**
 * Declares one area's catalogue. `en` defines the key set; `hi` and `mr` must
 * contain exactly the same keys (missing or extra keys are compile errors).
 */
export function defineArea<const E extends Record<string, string>>(area: AreaMessages<E>): AreaMessages<E> {
  return area;
}
