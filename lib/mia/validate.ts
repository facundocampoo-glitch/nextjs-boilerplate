// lib/mia/validate.ts

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isWithinMaxChars(value: string, maxChars: number): boolean {
  return value.length <= maxChars;
}

export function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}