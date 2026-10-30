import pg from "pg";
import { daysAgo, fillDaily } from "./visits.js";
const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS visit_days (
    day date PRIMARY KEY,
    pageviews integer NOT NULL DEFAULT 0,
    uniques integer NOT NULL DEFAULT 0
  )`,
    `CREATE TABLE IF NOT EXISTS visit_seen (
    day date NOT NULL,
    visitor_hash text NOT NULL,
    person_hash text NOT NULL DEFAULT '',
    PRIMARY KEY (day, visitor_hash)
  )`,
    `ALTER TABLE visit_seen ADD COLUMN IF NOT EXISTS person_hash text NOT NULL DEFAULT ''`,
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
export function databaseSsl(connectionString) {
    const external = connectionString.includes("sslmode=require") || connectionString.includes(".render.com");
    return external ? { rejectUnauthorized: false } : false;
}
export function visitDatabaseUrl(env = process.env) {
    const preferred = env.SUNSETDIFF_STATS_DATABASE_URL?.trim();
    if (preferred)
        return preferred;
    return env.DATABASE_URL?.trim() ?? "";
}
export function postgresVisitStore(connectionString) {
    const pool = new pg.Pool({
        connectionString,
        max: 2,
        ssl: databaseSsl(connectionString),
    });
    pool.on("error", () => {
        console.error("Visit storage connection failed");
    });
    let ready;
    let closed = false;
    const ensure = () => {
        ready ??= (async () => {
            for (const statement of SCHEMA)
                await pool.query(statement);
        })().catch((error) => {
            ready = undefined;
            throw error;
        });
        return ready;
    };
    return {
        kind: "postgres",
        async record(visit) {
            await ensure();
            await writeVisit(pool, visit);
        },
        async stats(today) {
            await ensure();
            return readStats(pool, today);
        },
        async close() {
            if (closed)
                return;
            closed = true;
            await pool.end();
        },
    };
}
async function writeVisit(pool, visit) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO visit_days (day, pageviews, uniques) VALUES ($1, 1, 0)
       ON CONFLICT (day) DO UPDATE SET pageviews = visit_days.pageviews + 1`, [visit.day]);
        const seen = await client.query(`INSERT INTO visit_seen (day, visitor_hash, person_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [visit.day, visit.visitorHash, visit.personHash || visit.visitorHash]);
        if (seen.rowCount === 1) {
            await client.query(`UPDATE visit_days SET uniques = uniques + 1 WHERE day = $1`, [visit.day]);
        }
        await client.query(`INSERT INTO visit_pages (day, path, views) VALUES ($1, $2, 1)
       ON CONFLICT (day, path) DO UPDATE SET views = visit_pages.views + 1`, [visit.day, visit.path]);
        if (visit.referrer) {
            await client.query(`INSERT INTO visit_referrers (day, host, views) VALUES ($1, $2, 1)
         ON CONFLICT (day, host) DO UPDATE SET views = visit_referrers.views + 1`, [visit.day, visit.referrer]);
        }
        if (visit.source) {
            await client.query(`INSERT INTO visit_sources (day, source, views) VALUES ($1, $2, 1)
         ON CONFLICT (day, source) DO UPDATE SET views = visit_sources.views + 1`, [visit.day, visit.source]);
        }
        const cutoff = cutoffDay(visit.day);
        await client.query(`DELETE FROM visit_seen WHERE day < $1`, [cutoff]);
        await client.query(`DELETE FROM visit_pages WHERE day < $1`, [cutoff]);
        await client.query(`DELETE FROM visit_referrers WHERE day < $1`, [cutoff]);
        await client.query(`DELETE FROM visit_sources WHERE day < $1`, [cutoff]);
        await client.query(`DELETE FROM visit_days WHERE day < $1`, [cutoff]);
        await client.query("COMMIT");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
async function readStats(pool, today) {
    const cutoff = cutoffDay(today);
    const week = daysAgo(today, 6);
    const days = await pool.query(`SELECT day::text AS day, pageviews, uniques FROM visit_days WHERE day >= $1 AND day <= $2 ORDER BY day`, [cutoff, today]);
    const pages = await rankedQuery(pool, "visit_pages", "path", cutoff, today);
    const referrers = await rankedQuery(pool, "visit_referrers", "host", cutoff, today);
    const sources = await rankedQuery(pool, "visit_sources", "source", cutoff, today);
    const weekPages = await rankedQuery(pool, "visit_pages", "path", week, today);
    const weekReferrers = await rankedQuery(pool, "visit_referrers", "host", week, today);
    const weekTotals = await pool.query(`SELECT
       (SELECT COUNT(DISTINCT CASE WHEN person_hash <> '' THEN person_hash ELSE visitor_hash END)::int
        FROM visit_seen WHERE day >= $1 AND day <= $2) AS visitors,
       (SELECT COALESCE(SUM(pageviews), 0)::int FROM visit_days WHERE day >= $1 AND day <= $2) AS pageviews`, [week, today]);
    const totals = weekTotals.rows[0] ?? { visitors: 0, pageviews: 0 };
    return {
        week: {
            visitors: Number(totals.visitors ?? 0),
            pageviews: Number(totals.pageviews ?? 0),
            topPages: weekPages,
            topReferrers: weekReferrers,
        },
        days: fillDaily(today, days.rows),
        topPages: pages,
        topReferrers: referrers,
        topSources: sources,
    };
}
async function rankedQuery(pool, table, column, start, today) {
    const result = await pool.query(`SELECT ${column}, SUM(views)::int AS views FROM ${table}
     WHERE day >= $1 AND day <= $2 GROUP BY ${column} ORDER BY views DESC, ${column} ASC LIMIT 10`, [start, today]);
    return result.rows;
}
function cutoffDay(today) {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 29);
    return date.toISOString().slice(0, 10);
}
