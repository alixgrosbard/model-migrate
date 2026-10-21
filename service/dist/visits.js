import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
const SPAN = 30;
const TOP = 10;
const BOT = /googlebot|adsbot-google|mediapartners-google|apis-google|bingbot|curl|python|aiohttp|go-http-client|headlesschrome|headless|spider|crawler|\bcrawl\b|slurp|wget|scrapy|httpie|postman|insomnia|ahrefs|semrush|petalbot|bytespider|gptbot|claudebot|amazonbot|facebookexternalhit|uptimerobot|pingdom|datadog|newrelic|kube-probe|phantomjs|selenium|puppeteer|playwright|node-fetch|undici|axios|libwww|okhttp|java\/|monitoring|lighthouse|pagespeed|applebot|duckduckbot|baiduspider|yandexbot|embedly|whatsapp|telegrambot|slackbot|discordbot|ia_archiver|mj12bot|dotbot|\bbot\b/i;
const BROWSER = /Mozilla\/5\.0[\s\S]{0,360}(Chrome|CriOS|Safari|Firefox|FxiOS|Edg|EdgiOS|OPR|SamsungBrowser)\//;
export const SITE_ORIGIN = "https://sunsetdiff.com";
let saltDay = "";
let saltValue = "";
export function resetDailySalt() {
    saltDay = "";
    saltValue = "";
}
export function utcDay(now = new Date()) {
    return now.toISOString().slice(0, 10);
}
export function addDays(day, count) {
    const date = new Date(`${day}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
}
export function daysAgo(day, count) {
    return addDays(day, -count);
}
export function isCountableBrowser(userAgent) {
    if (!userAgent)
        return false;
    const ua = userAgent.trim();
    if (!ua || ua.length > 400)
        return false;
    if (BOT.test(ua))
        return false;
    return BROWSER.test(ua);
}
export function cleanPath(value) {
    if (typeof value !== "string")
        return null;
    const pathOnly = value.trim().split(/[?#]/, 1)[0] ?? "";
    if (!pathOnly.startsWith("/") || pathOnly.startsWith("//") || pathOnly.length > 180)
        return null;
    if (pathOnly.includes("\\") || pathOnly.includes("..") || pathOnly.includes("\0"))
        return null;
    if (!/^\/[A-Za-z0-9._~%!$&'()*+,;=:@/-]*$/.test(pathOnly))
        return null;
    return pathOnly;
}
export function cleanReferrer(value) {
    if (typeof value !== "string")
        return "";
    const trimmed = value.trim();
    if (!trimmed)
        return "";
    if (trimmed.includes("://") || trimmed.includes("/")) {
        try {
            const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
            return cleanHost(new URL(withScheme).hostname);
        }
        catch {
            return "";
        }
    }
    return cleanHost(trimmed);
}
export function cleanSource(value) {
    if (typeof value !== "string")
        return "";
    const source = value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(source))
        return "";
    return source;
}
export function dailySalt(now = new Date()) {
    const day = utcDay(now);
    if (day !== saltDay || !saltValue) {
        saltDay = day;
        saltValue = randomBytes(32).toString("hex");
    }
    return saltValue;
}
export function visitorHash(ip, userAgent, now = new Date()) {
    return createHash("sha256").update(`${dailySalt(now)}\n${ip}\n${userAgent.slice(0, 400)}`).digest("hex");
}
export function clientIp(forwardedFor) {
    const parts = (forwardedFor ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    return parts[parts.length - 1] || "0.0.0.0";
}
export function bearerMatches(header, token) {
    const given = Buffer.from(header ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (given.length !== expected.length)
        return false;
    return timingSafeEqual(given, expected);
}
export function fillDaily(today, rows) {
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const start = daysAgo(today, SPAN - 1);
    const series = [];
    for (let i = 0; i < SPAN; i++) {
        const day = addDays(start, i);
        const row = byDay.get(day);
        series.push({ day, pageviews: row?.pageviews ?? 0, uniques: row?.uniques ?? 0 });
    }
    return series;
}
export function memoryVisitStore() {
    const days = new Map();
    return {
        async record(visit) {
            const bucket = days.get(visit.day) ?? emptyBucket();
            bucket.pageviews += 1;
            bucket.visitors.add(visit.visitorHash);
            addCount(bucket.pages, visit.path);
            if (visit.referrer)
                addCount(bucket.referrers, visit.referrer);
            if (visit.source)
                addCount(bucket.sources, visit.source);
            days.set(visit.day, bucket);
            const cutoff = daysAgo(visit.day, SPAN - 1);
            for (const day of days.keys()) {
                if (day < cutoff)
                    days.delete(day);
            }
        },
        async stats(today) {
            const start = daysAgo(today, SPAN - 1);
            const pages = new Map();
            const referrers = new Map();
            const sources = new Map();
            const rows = [];
            for (const [day, bucket] of days) {
                if (day < start || day > today)
                    continue;
                rows.push({ day, pageviews: bucket.pageviews, uniques: bucket.visitors.size });
                mergeCounts(pages, bucket.pages);
                mergeCounts(referrers, bucket.referrers);
                mergeCounts(sources, bucket.sources);
            }
            return {
                days: fillDaily(today, rows),
                topPages: ranked(pages, "path"),
                topReferrers: ranked(referrers, "host"),
                topSources: ranked(sources, "source"),
            };
        },
    };
}
function emptyBucket() {
    return { pageviews: 0, visitors: new Set(), pages: new Map(), referrers: new Map(), sources: new Map() };
}
function addCount(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}
function mergeCounts(target, source) {
    for (const [key, views] of source)
        target.set(key, (target.get(key) ?? 0) + views);
}
function ranked(map, key) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP)
        .map(([name, views]) => ({ [key]: name, views }));
}
function cleanHost(value) {
    const host = value.trim().toLowerCase().replace(/\.+$/, "");
    if (!host || host.length > 253 || host.includes(".."))
        return "";
    if (!/^[a-z0-9.-]+$/.test(host))
        return "";
    if (host.startsWith(".") || host.startsWith("-") || host.endsWith("-"))
        return "";
    return host;
}
