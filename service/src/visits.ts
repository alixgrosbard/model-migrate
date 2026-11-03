import { createHash, timingSafeEqual } from "node:crypto";

const SPAN = 30;
const WEEK = 7;
const TOP = 10;
const FALLBACK_SALT = "sunsetdiff-v1";

const BOT =
  /googlebot|adsbot-google|mediapartners-google|apis-google|bingbot|curl|python|aiohttp|go-http-client|headlesschrome|headless|spider|crawler|\bcrawl\b|slurp|wget|scrapy|httpie|postman|insomnia|ahrefs|semrush|petalbot|bytespider|gptbot|claudebot|amazonbot|facebookexternalhit|uptimerobot|pingdom|datadog|newrelic|kube-probe|phantomjs|selenium|puppeteer|playwright|node-fetch|undici|axios|libwww|okhttp|java\/|monitoring|lighthouse|pagespeed|applebot|duckduckbot|baiduspider|yandexbot|embedly|whatsapp|telegrambot|slackbot|discordbot|ia_archiver|mj12bot|dotbot|\bbot\b/i;

const BROWSER = /Mozilla\/5\.0[\s\S]{0,360}(Chrome|CriOS|Safari|Firefox|FxiOS|Edg|EdgiOS|OPR|SamsungBrowser)\//;

export const SITE_ORIGIN = "https://sunsetdiff.com";

export interface VisitRecord {
  day: string;
  visitorHash: string;
  personHash: string;
  path: string;
  referrer: string;
  source: string;
}

export interface DailyCount {
  day: string;
  pageviews: number;
  uniques: number;
}

export interface WeekReport {
  visitors: number;
  pageviews: number;
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
}

export interface VisitStats {
  week: WeekReport;
  days: DailyCount[];
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  topSources: { source: string; views: number }[];
}

export type VisitStorage = "postgres" | "memory";

export interface VisitStore {
  kind: VisitStorage;
  record(visit: VisitRecord): Promise<void>;
  stats(today: string): Promise<VisitStats>;
  close?(): Promise<void>;
}

interface DayBucket {
  pageviews: number;
  visitors: Set<string>;
  people: Set<string>;
  pages: Map<string, number>;
  referrers: Map<string, number>;
  sources: Map<string, number>;
}

export function resetDailySalt(): void {
  // The salt comes from the environment so a restart keeps the same visitor ids.
}

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function daysAgo(day: string, count: number): string {
  return addDays(day, -count);
}

export function isCountableBrowser(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.trim();
  if (!ua || ua.length > 400) return false;
  if (BOT.test(ua)) return false;
  return BROWSER.test(ua);
}

export function cleanPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const pathOnly = value.trim().split(/[?#]/, 1)[0] ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//") || pathOnly.length > 180) return null;
  if (pathOnly.includes("\\") || pathOnly.includes("..") || pathOnly.includes("\0")) return null;
  if (!/^\/[A-Za-z0-9._~%!$&'()*+,;=:@/-]*$/.test(pathOnly)) return null;
  return pathOnly;
}

export function cleanReferrer(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("://") || trimmed.includes("/")) {
    try {
      const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      return cleanHost(new URL(withScheme).hostname);
    } catch {
      return "";
    }
  }
  return cleanHost(trimmed);
}

export function cleanSource(value: unknown): string {
  if (typeof value !== "string") return "";
  const source = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(source)) return "";
  return source;
}

export function visitorSalt(): string {
  return process.env.SUNSETDIFF_VISITOR_SALT || process.env.STATS_TOKEN || FALLBACK_SALT;
}

export function dailySalt(now = new Date()): string {
  return `${visitorSalt()}\n${utcDay(now)}`;
}

export function personHash(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${visitorSalt()}\n${ip}\n${userAgent.slice(0, 400)}`).digest("hex");
}

export function visitorHash(ip: string, userAgent: string, now = new Date()): string {
  return createHash("sha256").update(`${dailySalt(now)}\n${ip}\n${userAgent.slice(0, 400)}`).digest("hex");
}

export function clientIp(forwardedFor: string | undefined): string {
  const parts = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "0.0.0.0";
}

export function bearerMatches(header: string | undefined, token: string): boolean {
  const given = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

export function fillDaily(today: string, rows: DailyCount[]): DailyCount[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const start = daysAgo(today, SPAN - 1);
  const series: DailyCount[] = [];
  for (let i = 0; i < SPAN; i++) {
    const day = addDays(start, i);
    const row = byDay.get(day);
    series.push({ day, pageviews: row?.pageviews ?? 0, uniques: row?.uniques ?? 0 });
  }
  return series;
}

export function memoryVisitStore(): VisitStore {
  const days = new Map<string, DayBucket>();
  return {
    kind: "memory",
    async record(visit) {
      const bucket = days.get(visit.day) ?? emptyBucket();
      bucket.pageviews += 1;
      bucket.visitors.add(visit.visitorHash);
      bucket.people.add(visit.personHash || visit.visitorHash);
      addCount(bucket.pages, visit.path);
      if (visit.referrer) addCount(bucket.referrers, visit.referrer);
      if (visit.source) addCount(bucket.sources, visit.source);
      days.set(visit.day, bucket);
      const cutoff = daysAgo(visit.day, SPAN - 1);
      for (const day of days.keys()) {
        if (day < cutoff) days.delete(day);
      }
    },
    async stats(today) {
      const full = collect(days, today, SPAN);
      const week = collect(days, today, WEEK);
      return {
        week: {
          visitors: week.people,
          pageviews: week.pageviews,
          topPages: ranked(week.pages, "path"),
          topReferrers: ranked(week.referrers, "host"),
        },
        days: fillDaily(today, full.rows),
        topPages: ranked(full.pages, "path"),
        topReferrers: ranked(full.referrers, "host"),
        topSources: ranked(full.sources, "source"),
      };
    },
  };
}

function collect(days: Map<string, DayBucket>, today: string, span: number) {
  const start = daysAgo(today, span - 1);
  const pages = new Map<string, number>();
  const referrers = new Map<string, number>();
  const sources = new Map<string, number>();
  const people = new Set<string>();
  const rows: DailyCount[] = [];
  let pageviews = 0;
  for (const [day, bucket] of days) {
    if (day < start || day > today) continue;
    rows.push({ day, pageviews: bucket.pageviews, uniques: bucket.visitors.size });
    pageviews += bucket.pageviews;
    for (const person of bucket.people) people.add(person);
    mergeCounts(pages, bucket.pages);
    mergeCounts(referrers, bucket.referrers);
    mergeCounts(sources, bucket.sources);
  }
  return { rows, pageviews, people: people.size, pages, referrers, sources };
}

function emptyBucket(): DayBucket {
  return {
    pageviews: 0,
    visitors: new Set(),
    people: new Set(),
    pages: new Map(),
    referrers: new Map(),
    sources: new Map(),
  };
}

function addCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mergeCounts(target: Map<string, number>, source: Map<string, number>): void {
  for (const [key, views] of source) target.set(key, (target.get(key) ?? 0) + views);
}

function ranked<K extends string>(map: Map<string, number>, key: K): ({ views: number } & Record<K, string>)[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP)
    .map(([name, views]) => ({ [key]: name, views }) as { views: number } & Record<K, string>);
}

function cleanHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/\.+$/, "");
  if (!host || host.length > 253 || host.includes("..")) return "";
  if (!/^[a-z0-9.-]+$/.test(host)) return "";
  if (host.startsWith(".") || host.startsWith("-") || host.endsWith("-")) return "";
  return host;
}
