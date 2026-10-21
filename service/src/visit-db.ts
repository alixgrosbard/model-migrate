import pg from "pg";
import { fillDaily, type VisitRecord, type VisitStats, type VisitStore } from "./visits.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS visit_days (
    day date PRIMARY KEY,
    pageviews integer NOT NULL DEFAULT 0,
    uniques integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS visit_seen (
    day date NOT NULL,
    visitor_hash text NOT NULL,
    PRIMARY KEY (day, visitor_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS visit_pages (
    day date NOT NULL,
    path text NOT NULL,
    views integer NOT NULL DEFAULT 0,
    PRIMARY KEY (day, path)
  )`,
  `CREATE TABLE IF NOT EXISTS visit_referrers (
    day date NOT NULL,
    host text NOT NULL,
    views integer NOT NULL DEFAULT 0,
    PRIMARY KEY (day, host)
  )`,
  `CREATE TABLE IF NOT EXISTS visit_sources (
    day date NOT NULL,
    source text NOT NULL,
    views integer NOT NULL DEFAULT 0,
    PRIMARY KEY (day, source)
  )`,
];

export function databaseSsl(connectionString: string): false | { rejectUnauthorized: false } {
  const external = connectionString.includes("sslmode=require") || connectionString.includes(".render.com");
  return external ? { rejectUnauthorized: false } : false;
}

export function postgresVisitStore(connectionString: string): VisitStore {
  const pool = new pg.Pool({
    connectionString,
    max: 2,
    ssl: databaseSsl(connectionString),
  });
  pool.on("error", () => {
    console.error("Visit storage connection failed");
  });
  let ready: Promise<void> | undefined;
  const ensure = () => {
    ready ??= (async () => {
      for (const statement of SCHEMA) await pool.query(statement);
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  };
  return {
    async record(visit) {
      await ensure();
      await writeVisit(pool, visit);
    },
    async stats(today) {
      await ensure();
      return readStats(pool, today);
    },
  };
}

async function writeVisit(pool: pg.Pool, visit: VisitRecord): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO visit_days (day, pageviews, uniques) VALUES ($1, 1, 0)
       ON CONFLICT (day) DO UPDATE SET pageviews = visit_days.pageviews + 1`,
      [visit.day],
    );
    const seen = await client.query(
      `INSERT INTO visit_seen (day, visitor_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [visit.day, visit.visitorHash],
    );
    if (seen.rowCount === 1) {
      await client.query(`UPDATE visit_days SET uniques = uniques + 1 WHERE day = $1`, [visit.day]);
    }
    await client.query(
      `INSERT INTO visit_pages (day, path, views) VALUES ($1, $2, 1)
       ON CONFLICT (day, path) DO UPDATE SET views = visit_pages.views + 1`,
      [visit.day, visit.path],
    );
    if (visit.referrer) {
      await client.query(
        `INSERT INTO visit_referrers (day, host, views) VALUES ($1, $2, 1)
         ON CONFLICT (day, host) DO UPDATE SET views = visit_referrers.views + 1`,
        [visit.day, visit.referrer],
      );
    }
    if (visit.source) {
      await client.query(
        `INSERT INTO visit_sources (day, source, views) VALUES ($1, $2, 1)
         ON CONFLICT (day, source) DO UPDATE SET views = visit_sources.views + 1`,
        [visit.day, visit.source],
      );
    }
    const cutoff = cutoffDay(visit.day);
    await client.query(`DELETE FROM visit_seen WHERE day < $1`, [cutoff]);
    await client.query(`DELETE FROM visit_pages WHERE day < $1`, [cutoff]);
    await client.query(`DELETE FROM visit_referrers WHERE day < $1`, [cutoff]);
    await client.query(`DELETE FROM visit_sources WHERE day < $1`, [cutoff]);
    await client.query(`DELETE FROM visit_days WHERE day < $1`, [cutoff]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readStats(pool: pg.Pool, today: string): Promise<VisitStats> {
  const cutoff = cutoffDay(today);
  const days = await pool.query<{ day: string; pageviews: number; uniques: number }>(
    `SELECT day::text AS day, pageviews, uniques FROM visit_days WHERE day >= $1 AND day <= $2 ORDER BY day`,
    [cutoff, today],
  );
  const pages = await pool.query<{ path: string; views: number }>(
    `SELECT path, SUM(views)::int AS views FROM visit_pages
     WHERE day >= $1 AND day <= $2 GROUP BY path ORDER BY views DESC, path ASC LIMIT 10`,
    [cutoff, today],
  );
  const referrers = await pool.query<{ host: string; views: number }>(
    `SELECT host, SUM(views)::int AS views FROM visit_referrers
     WHERE day >= $1 AND day <= $2 GROUP BY host ORDER BY views DESC, host ASC LIMIT 10`,
    [cutoff, today],
  );
  const sources = await pool.query<{ source: string; views: number }>(
    `SELECT source, SUM(views)::int AS views FROM visit_sources
     WHERE day >= $1 AND day <= $2 GROUP BY source ORDER BY views DESC, source ASC LIMIT 10`,
    [cutoff, today],
  );
  return {
    days: fillDaily(today, days.rows),
    topPages: pages.rows,
    topReferrers: referrers.rows,
    topSources: sources.rows,
  };
}

function cutoffDay(today: string): string {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}
