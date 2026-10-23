export function toISOString(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString();
}

export function toISOStringRequired(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString();
}