import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { postgresVisitStore } from "../service/src/visit-db.ts";
import { personHash, visitorHash, type VisitStore } from "../service/src/visits.ts";

const databaseUrl = process.env.VISIT_TEST_DATABASE_URL;
const localDatabase = Boolean(databaseUrl && /localhost|127\.0\.0\.1/.test(databaseUrl));
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe.skipIf(!localDatabase)("postgres visit store", () => {
  const stores: VisitStore[] = [];

  function open(): VisitStore {
    const store = postgresVisitStore(databaseUrl ?? "");
    stores.push(store);
    return store;
  }

  afterAll(async () => {
    await Promise.all(stores.map((store) => store.close?.()));
  });

  it("keeps the 7-day report after a new connection", async () => {
    const admin = new pg.Pool({ connectionString: databaseUrl, max: 1 });
    await admin.query(
      "DROP TABLE IF EXISTS visit_seen, visit_pages, visit_referrers, visit_sources, visit_days",
    );
    await admin.query(
      `CREATE TABLE visit_seen (
        day date NOT NULL,
        visitor_hash text NOT NULL,
        PRIMARY KEY (day, visitor_hash)
      )`,
    );
    await admin.end();

    const person = personHash("203.0.113.10", CHROME);
    const first = open();
    await first.record({
      day: "2026-10-25",
      visitorHash: visitorHash("203.0.113.10", CHROME, new Date("2026-10-25T12:00:00Z")),
      personHash: person,
      path: "/",
      referrer: "news.ycombinator.com",
      source: "",
    });
    await first.record({
      day: "2026-10-26",
      visitorHash: visitorHash("203.0.113.10", CHROME, new Date("2026-10-26T12:00:00Z")),
      personHash: person,
      path: "/guides/",
      referrer: "news.ycombinator.com",
      source: "newsletter",
    });
    await first.close?.();

    const restarted = open();
    const stats = await restarted.stats("2026-10-26");
    expect(stats.week.visitors).toBe(1);
    expect(stats.week.pageviews).toBe(2);
    expect(stats.week.topPages).toEqual([
      { path: "/", views: 1 },
      { path: "/guides/", views: 1 },
    ]);
    expect(stats.week.topReferrers).toEqual([{ host: "news.ycombinator.com", views: 2 }]);
    expect(stats.days.at(-1)).toMatchObject({ day: "2026-10-26", pageviews: 1, uniques: 1 });
    expect(JSON.stringify(stats)).not.toContain("203.0.113.10");
    expect(JSON.stringify(stats)).not.toContain(person);
  });
});
