/** `2024-06-24` → `6/24`. */
export function shortDate(isoDate: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`YYYY-MM-DD 形式ではありません: ${isoDate}`);
  return `${Number(match[1])}/${Number(match[2])}`;
}

/** Page numbers to show around `current`, with null for gaps: 1 … 4 5 6 … 12. */
export function pageWindow(current: number, last: number, radius = 1): (number | null)[] {
  const pages = new Set<number>([1, last]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= last) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push(null);
    result.push(page);
  });
  return result;
}
