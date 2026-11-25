export function formatVisitDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

export function normalizeVisitDate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split("/").reverse().join("-") : value;
}
