const units = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.345, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
] as const;

export function relativeTime(iso: string, now = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.valueOf())) return "未知";
  let value = (target.valueOf() - now.valueOf()) / 1000;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [threshold, candidate] of units) {
    unit = candidate;
    if (Math.abs(value) < threshold) break;
    value /= threshold;
  }
  return new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" }).format(
    Math.round(value),
    unit,
  );
}

export function isStale(
  generatedAt: string,
  intervalMinutes = 60,
  now = new Date(),
): boolean {
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.valueOf())) return true;
  return now.valueOf() - generated.valueOf() > intervalMinutes * 2 * 60_000;
}
