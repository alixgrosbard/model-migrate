export interface ParsedDate {
  date: string | null;
  kind: "exact" | "not_before" | "month_only" | "none";
}

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export function normalizeDashes(value: string): string {
  return value.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDate(raw: string | null | undefined): ParsedDate {
  if (!raw) return { date: null, kind: "none" };
  const text = normalizeDashes(raw).replace(/,/g, "");
  const lower = text.toLowerCase();
  if (
    !lower ||
    lower === "—" ||
    lower === "-" ||
    lower === "n/a" ||
    lower === "na" ||
    lower.includes("to be announced") ||
    lower.includes("no shutdown") ||
    lower.includes("no retirement") ||
    lower.includes("not announced") ||
    lower.includes("no date")
  ) {
    return { date: null, kind: "none" };
  }

  const notBefore =
    /not sooner than|no sooner than|or later|at earliest|no earlier than|not before/.test(lower);

  const iso = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return {
      date: ymd(Number(iso[1]), Number(iso[2]), Number(iso[3])),
      kind: notBefore ? "not_before" : "exact",
    };
  }

  const mdy = lower.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (mdy) {
    return {
      date: ymd(Number(mdy[3]), Number(mdy[1]), Number(mdy[2])),
      kind: notBefore ? "not_before" : "exact",
    };
  }

  const monthDayYear = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|sept|sep|october|oct|november|nov|december|dec|jan|feb|mar|apr|jun|jul|aug)\.?\s+(\d{1,2})\s+(\d{4})\b/,
  );
  if (monthDayYear) {
    const month = MONTHS[monthDayYear[1].replace(".", "")];
    return {
      date: ymd(Number(monthDayYear[3]), month, Number(monthDayYear[2])),
      kind: notBefore ? "not_before" : "exact",
    };
  }

  const monthYear = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{4})\b/,
  );
  if (monthYear) {
    const month = MONTHS[monthYear[1].replace(".", "")];
    return { date: ymd(Number(monthYear[2]), month, 1), kind: "month_only" };
  }

  return { date: null, kind: "none" };
}

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nowISO(now = new Date()): string {
  return now.toISOString();
}

export function compareDate(date: string, today: string): number {
  return date < today ? -1 : date > today ? 1 : 0;
}

export function monthEnd(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}
