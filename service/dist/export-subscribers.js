import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is not set. Nothing was exported.");
    process.exit(1);
}
const pool = new Pool({ connectionString: url });
const result = await pool.query("SELECT email, providers, created_at, source_page FROM subscribers ORDER BY created_at");
const lines = ["email,providers,created_at,source_page"];
for (const row of result.rows) {
    const providers = Array.isArray(row.providers) ? row.providers.join("|") : "";
    lines.push([row.email, providers, row.created_at?.toISOString?.() ?? row.created_at, row.source_page ?? ""].map(csv).join(","));
}
await writeFile("subscribers.csv", lines.join("\n") + "\n");
await pool.end();
console.log(`Wrote ${result.rowCount ?? 0} rows to subscribers.csv`);
function csv(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
