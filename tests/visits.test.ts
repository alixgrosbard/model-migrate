import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { app, setVisitStore } from "../service/src/index.ts";
import { databaseSsl, visitDatabaseUrl } from "../service/src/visit-db.ts";
import {
  cleanPath,
  cleanReferrer,
  cleanSource,
  isCountableBrowser,
  memoryVisitStore,
  personHash,
  resetDailySalt,
  utcDay,
  visitorHash,
} from "../service/src/visits.ts";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
const SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

afterEach(() => {
  delete process.env.STATS_TOKEN;
  delete process.env.SUNSETDIFF_VISITOR_SALT;
  delete process.env.SUNSETDIFF_STATS_DATABASE_URL;
  delete process.env.DATABASE_URL;
  resetDailySalt();
  setVisitStore(memoryVisitStore());
});

function hit(body: unknown, headers: Record<string, string> = {}) {
  return app.request("/api/hit", {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "user-agent": CHROME,
      origin: "https://sunsetdiff.com",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("browser filter", () => {
  it("counts real browsers and drops crawlers, monitors, and empty agents", () => {
    expect(isCountableBrowser(CHROME)).toBe(true);
    expect(isCountableBrowser(FIREFOX)).toBe(true);
    expect(isCountableBrowser(SAFARI)).toBe(true);
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (Linux; Android 6.0.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "curl/8.5.0",
      "python-requests/2.32.0",
      "Python-urllib/3.12",
      "Go-http-client/1.1",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)",
      "",
    ]) {
      expect(isCountableBrowser(ua), ua).toBe(false);
    }
    expect(isCountableBrowser(undefined)).toBe(false);
  });

  it("keeps only a path, a referrer host, and a coarse source", () => {
    expect(cleanPath("/models/openai/gpt-4o/?q=1")).toBe("/models/openai/gpt-4o/");
    expect(cleanPath("https://sunsetdiff.com/")).toBeNull();
    expect(cleanPath("/../secret")).toBeNull();
    expect(cleanReferrer("https://news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
    expect(cleanReferrer("news.ycombinator.com")).toBe("news.ycombinator.com");
    expect(cleanSource("Newsletter")).toBe("newsletter");
    expect(cleanSource("https://evil.example/path?x=1")).toBe("");
  });

  it("changes the visitor hash when the UTC day changes and never returns the salt", () => {
    const first = visitorHash("203.0.113.10", CHROME, new Date("2026-10-21T12:00:00Z"));
    const same = visitorHash("203.0.113.10", CHROME, new Date("2026-10-21T18:00:00Z"));
    const next = visitorHash("203.0.113.10", CHROME, new Date("2026-10-22T01:00:00Z"));
    expect(first).toBe(same);
    expect(next).not.toBe(first);
    expect(first).not.toContain("203.0.113.10");
    expect(personHash("203.0.113.10", CHROME)).toBe(personHash("203.0.113.10", CHROME));
    expect(personHash("203.0.113.10", CHROME)).not.toBe(first);
  });
});

describe("POST /api/hit and GET /api/stats", () => {
  it("counts a browser hit once per visitor per day and ignores curl", async () => {
    const stored = memoryVisitStore();
    setVisitStore(stored);
    process.env.STATS_TOKEN = "test-token";

    const first = await hit({
      path: "/models/openai/gpt-4o/?utm_source=newsletter",
      referrer: "https://news.ycombinator.com/item?id=1",
      utm_source: "Newsletter",
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, counted: true });

    const again = await hit({ path: "/guides/", referrer: "https://news.ycombinator.com/item?id=1", utm_source: "newsletter" });
    expect(await again.json()).toEqual({ ok: true, counted: true });

    const other = await hit(
      { path: "/", referrer: "", utm_source: "" },
      { "user-agent": FIREFOX, "x-forwarded-for": "198.51.100.8, 203.0.113.50" },
    );
    expect(await other.json()).toEqual({ ok: true, counted: true });

    const bot = await hit({ path: "/" }, { "user-agent": "curl/8.5.0" });
    expect(bot.status).toBe(200);
    expect(await bot.json()).toEqual({ ok: true, counted: false });
    const missing = await app.request("/api/hit", { method: "POST", body: JSON.stringify({ path: "/" }) });
    expect(await missing.json()).toEqual({ ok: true, counted: false });

    const blocked = await hit({ path: "/" }, { origin: "https://evil.example" });
    expect(blocked.status).toBe(403);

    const stats = await app.request("/api/stats", { headers: { authorization: "Bearer test-token" } });
    expect(stats.status).toBe(200);
    const body = await stats.json();
    expect(body.days).toHaveLength(30);
    expect(body.days.at(-1)).toMatchObject({ day: utcDay(), pageviews: 3, uniques: 2 });
    expect(body.week).toEqual({
      visitors: 2,
      pageviews: 3,
      topPages: [
        { path: "/", views: 1 },
        { path: "/guides/", views: 1 },
        { path: "/models/openai/gpt-4o/", views: 1 },
      ],
      topReferrers: [{ host: "news.ycombinator.com", views: 2 }],
    });
    expect(body.topPages).toEqual([
      { path: "/", views: 1 },
      { path: "/guides/", views: 1 },
      { path: "/models/openai/gpt-4o/", views: 1 },
    ]);
    expect(body.topReferrers).toEqual([{ host: "news.ycombinator.com", views: 2 }]);
    expect(body.topSources).toEqual([{ source: "newsletter", views: 2 }]);
    const text = JSON.stringify(body);
    expect(text).not.toContain("203.0.113");
    expect(text).not.toContain("198.51.100");
    expect(text).not.toContain("news.ycombinator.com/item");
    expect(text).not.toContain("Mozilla");
  });

  it("hides stats unless STATS_TOKEN matches", async () => {
    const missing = await app.request("/api/stats");
    expect(missing.status).toBe(503);
    process.env.STATS_TOKEN = "test-token";
    const denied = await app.request("/api/stats", { headers: { authorization: "Bearer nope" } });
    expect(denied.status).toBe(401);
    const open = await app.request("/api/stats", { headers: { authorization: "Bearer test-token" } });
    expect(open.status).toBe(200);
  });

  it("allows sunsetdiff.com on the hit route and keeps subscribe CORS", async () => {
    const site = await app.request("/api/hit", {
      method: "OPTIONS",
      headers: {
        origin: "https://sunsetdiff.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(site.headers.get("access-control-allow-origin")).toBe("https://sunsetdiff.com");

    const other = await app.request("/api/hit", {
      method: "OPTIONS",
      headers: {
        origin: "https://sunsetdiff.onrender.com",
        "access-control-request-method": "POST",
      },
    });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();

    const subscribe = await app.request("/api/subscribe", {
      method: "OPTIONS",
      headers: {
        origin: "https://sunsetdiff.onrender.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(subscribe.headers.get("access-control-allow-origin")).toBe("https://sunsetdiff.onrender.com");
    const health = await app.request("/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, service: "sunsetdiff", visits: "memory" });

    process.env.SUNSETDIFF_STATS_DATABASE_URL = "postgres://stats.example/db";
    const configured = await app.request("/health");
    expect(await configured.json()).toMatchObject({ visits: "postgres" });
  });
});

describe("page beacon", () => {
  it("is an inline load handler with no stored id", async () => {
    const layout = await readFile("src/layouts/Base.astro", "utf8");
    expect(layout).toContain("navigator.sendBeacon");
    expect(layout).toContain('new URL("/api/hit", service)');
    expect(layout).toContain("keepalive: true");
    expect(layout).toContain("new URL(document.referrer).hostname");
    expect(layout).toContain('get("utm_source")');
    expect(layout).not.toContain("localStorage");
    expect(layout).not.toContain("document.cookie");
  });
});

describe("week of real visitors", () => {
  it("counts one browser once across two days", async () => {
    const stored = memoryVisitStore();
    const person = personHash("203.0.113.10", CHROME);
    await stored.record({
      day: "2026-10-25",
      visitorHash: visitorHash("203.0.113.10", CHROME, new Date("2026-10-25T12:00:00Z")),
      personHash: person,
      path: "/",
      referrer: "news.ycombinator.com",
      source: "",
    });
    await stored.record({
      day: "2026-10-26",
      visitorHash: visitorHash("203.0.113.10", CHROME, new Date("2026-10-26T12:00:00Z")),
      personHash: person,
      path: "/guides/",
      referrer: "",
      source: "newsletter",
    });
    const stats = await stored.stats("2026-10-26");
    expect(stats.week.visitors).toBe(1);
    expect(stats.week.pageviews).toBe(2);
    expect(stats.week.topPages).toEqual([
      { path: "/", views: 1 },
      { path: "/guides/", views: 1 },
    ]);
    expect(stats.week.topReferrers).toEqual([{ host: "news.ycombinator.com", views: 1 }]);
    expect(stats.days.at(-1)).toMatchObject({ day: "2026-10-26", pageviews: 1, uniques: 1 });
    expect(stats.days.at(-2)).toMatchObject({ day: "2026-10-25", pageviews: 1, uniques: 1 });
    expect(JSON.stringify(stats)).not.toContain(person);
  });
});

describe("database url", () => {
  it("prefers the stats database url and does not print it", () => {
    expect(visitDatabaseUrl({})).toBe("");
    expect(visitDatabaseUrl({ DATABASE_URL: "postgres://fallback.example/db" })).toBe("postgres://fallback.example/db");
    expect(
      visitDatabaseUrl({
        SUNSETDIFF_STATS_DATABASE_URL: "postgres://stats.example/db",
        DATABASE_URL: "postgres://fallback.example/db",
      }),
    ).toBe("postgres://stats.example/db");
  });

  it("uses TLS only for the external Render hostname", () => {
    expect(databaseSsl("postgres://user:secret@dpg-abc-a/sunsetdiff_stats")).toBe(false);
    expect(databaseSsl("postgres://user:secret@dpg-abc-a.ohio-postgres.render.com/sunsetdiff_stats")).toEqual({
      rejectUnauthorized: false,
    });
  });
});
