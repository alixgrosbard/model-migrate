import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Pool } from "pg";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp.js";
import { THANK_YOU, cleanProviders, hashIp, rateLimited, validEmail } from "./subscribe.js";

const app = new Hono();
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      email text PRIMARY KEY,
      providers text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      source_page text,
      ip_hash text
    )
  `);
}

app.get("/health", (c) => c.json({ ok: true, db: Boolean(pool), service: "sunsetdiff" }));

app.post("/api/subscribe", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.company === "string" && body.company.trim()) {
    return c.json({ message: THANK_YOU });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) return c.json({ message: "Enter a valid email." }, 400);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ipHash = hashIp(ip);
  if (rateLimited(ipHash)) return c.json({ message: "Too many signups from this network. Try again later." }, 429);
  if (!pool) return c.json({ message: "Signup storage is not configured yet." }, 503);
  await ensureTable();
  await pool.query(
    `INSERT INTO subscribers (email, providers, source_page, ip_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET providers = EXCLUDED.providers, source_page = EXCLUDED.source_page, ip_hash = EXCLUDED.ip_hash`,
    [email, cleanProviders(body.providers), String(body.source_page ?? "").slice(0, 500), ipHash],
  );
  return c.json({ message: THANK_YOU });
});

app.all("/mcp", async (c) => {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

const port = Number(process.env.PORT || 8787);
ensureTable().catch((error) => console.error(error));
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`SunsetDiff service listening on 0.0.0.0:${port}`);
});
