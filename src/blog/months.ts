// Month arithmetic on "YYYY-MM" strings, which compare correctly as strings.

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `monthIndex` is 0-based. */
export function yearMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function currentYearMonth(): string {
  const today = new Date();
  return yearMonth(today.getFullYear(), today.getMonth());
}

export function firstDayOf(ym: string): string {
  return `${ym}-01`;
}

export function lastDayOf(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

export function shiftMonths(ym: string, delta: number): string {
  const [year, month] = ym.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  return yearMonth(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

export function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/** Takes YYYY-MM-DD dates. */
export function rangeLabel(from: string | null, to: string | null): string {
  const start = from ? monthLabel(from.slice(0, 7)) : "";
  const end = to ? monthLabel(to.slice(0, 7)) : "";
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "Any time";
}
