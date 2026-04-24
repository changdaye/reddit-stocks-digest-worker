export function toInt(value: string | undefined, fallback: number, min = 1): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}
