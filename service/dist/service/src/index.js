import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp.js";
import { THANK_YOU, hashIp, rateLimited, validEmail } from "./subscribe.js";
import { postgresVisitStore, visitDatabaseUrl } from "./visit-db.js";
import { SITE_ORIGIN, bearerMatches, cleanPath, cleanReferrer, cleanSource, clientIp, isCountableBrowser, memoryVisitStore, personHash, utcDay, visitorHash, } from "./visits.js";
import { readUnsubscribeToken, sendWelcomeEmail, unsubscribeSecret } from "./welcome.js";
const CONTACTS_URL = "https://api.resend.com/contacts";
const GENERIC_FAILURE = "Signup could not be saved.";
const SUBSCRIBE_ORIGINS = [SITE_ORIGIN, "https://sunsetdiff.onrender.com"];
export const app = new Hono();
let visits = openVisitStore();
function openVisitStore() {
    const databaseUrl = visitDatabaseUrl();
    return databaseUrl ? postgresVisitStore(databaseUrl) : memoryVisitStore();
}
export function setVisitStore(store) {
    visits = store;
}
app.use("/api/subscribe", cors({
    origin: SUBSCRIBE_ORIGINS,
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["content-type"],
}));
app.use("/api/hit", cors({
    origin: SITE_ORIGIN,
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["content-type"],
}));
app.use("/api/stats", cors({
    origin: SITE_ORIGIN,
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["authorization", "content-type"],
}));
app.get("/health", (c) => c.json({
    ok: true,
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_SEGMENT_ID),
    service: "sunsetdiff",
    visits: visitDatabaseUrl() ? "postgres" : "memory",
}));
app.post("/api/hit", async (c) => {
    const origin = c.req.header("origin");
    if (origin && origin !== SITE_ORIGIN)
        return c.json({ ok: false, counted: false }, 403);
    if (!isCountableBrowser(c.req.header("user-agent")))
        return c.json({ ok: true, counted: false });
    const text = await c.req.text();
    if (text.length > 2048)
        return c.json({ ok: false, counted: false }, 413);
    let body;
    try {
        body = JSON.parse(text);
    }
    catch {
        return c.json({ ok: false, counted: false }, 400);
    }
    const record = body && typeof body === "object" ? body : {};
    const page = cleanPath(record.path);
    if (!page)
        return c.json({ ok: false, counted: false }, 400);
    const userAgent = c.req.header("user-agent") ?? "";
    const ip = clientIp(c.req.header("x-forwarded-for"));
    try {
        await visits.record({
            day: utcDay(),
            visitorHash: visitorHash(ip, userAgent),
            personHash: personHash(ip, userAgent),
            path: page,
            referrer: cleanReferrer(record.referrer),
            source: cleanSource(record.utm_source),
        });
    }
    catch {
        console.error("Visit storage failed");
        return c.json({ ok: false, counted: false }, 503);
    }
    return c.json({ ok: true, counted: true });
});
app.get("/api/stats", async (c) => {
    const token = process.env.STATS_TOKEN;
    if (!token)
        return c.json({ message: "Stats are not configured." }, 503);
    if (!bearerMatches(c.req.header("authorization"), token))
        return c.json({ message: "Unauthorized." }, 401);
    try {
        return c.json(await visits.stats(utcDay()));
    }
    catch {
        console.error("Visit stats failed");
        return c.json({ message: "Stats are unavailable." }, 503);
    }
});
app.post("/api/subscribe", async (c) => {
    const body = (await c.req.json().catch(() => ({})));
    if (typeof body.company === "string" && body.company.trim()) {
        return c.json({ message: THANK_YOU });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!validEmail(email))
        return c.json({ message: "Enter a valid email." }, 400);
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (rateLimited(hashIp(ip)))
        return c.json({ message: "Too many signups from this network. Try again later." }, 429);
    const key = process.env.RESEND_API_KEY;
    const segment = process.env.RESEND_SEGMENT_ID;
    if (!key || !segment)
        return c.json({ message: "Signup storage is not configured yet." }, 503);
    try {
        const created = await fetch(CONTACTS_URL, {
            method: "POST",
            headers: {
                authorization: `Bearer ${key}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment }] }),
        });
        if (created.ok) {
            try {
                await sendWelcomeEmail({ email, apiKey: key, origin: new URL(c.req.url).origin });
            }
            catch {
                console.error("Welcome email status 0");
            }
            return c.json({ message: THANK_YOU });
        }
        if (await contactAlreadyExists(created)) {
            const added = await fetch(`${CONTACTS_URL}/${encodeURIComponent(email)}/segments/${encodeURIComponent(segment)}`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${key}`,
                    "content-type": "application/json",
                },
            });
            if (added.ok)
                return c.json({ message: THANK_YOU });
            console.error(`Resend status ${added.status}`);
            return c.json({ message: GENERIC_FAILURE }, 502);
        }
        console.error(`Resend status ${created.status}`);
        return c.json({ message: GENERIC_FAILURE }, 502);
    }
    catch {
        console.error("Resend status 0");
        return c.json({ message: GENERIC_FAILURE }, 502);
    }
});
async function contactAlreadyExists(response) {
    if (response.status === 409)
        return true;
    const text = await response.text().catch(() => "");
    return /already exists/i.test(text);
}
app.on(["GET", "POST"], "/unsubscribe", async (c) => {
    const token = c.req.query("token") ?? "";
    const secret = unsubscribeSecret();
    const key = process.env.RESEND_API_KEY;
    if (!secret || !key)
        return c.html(page("Unsubscribe is not configured yet."), 503);
    const email = readUnsubscribeToken(token, secret);
    if (!email)
        return c.html(page("This unsubscribe link is not valid."), 400);
    try {
        const updated = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
            method: "PATCH",
            headers: {
                authorization: `Bearer ${key}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ unsubscribed: true }),
        });
        if (!updated.ok) {
            console.error(`Unsubscribe status ${updated.status}`);
            return c.html(page("Unsubscribe could not be saved."), 502);
        }
    }
    catch {
        console.error("Unsubscribe status 0");
        return c.html(page("Unsubscribe could not be saved."), 502);
    }
    return c.html(page("You are unsubscribed. SunsetDiff will not email this address."));
});
app.all("/mcp", async (c) => {
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
});
function page(message, extra = "") {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unsubscribe</title></head><body><p>${message}</p>${extra}</body></html>`;
}
const calledDirectly = process.argv[1] ? path.resolve(process.argv[1]).includes(`${path.sep}index.`) : false;
if (calledDirectly) {
    if (!visitDatabaseUrl()) {
        console.error("SUNSETDIFF_STATS_DATABASE_URL is unset. Visit counts stay in memory and reset when the service restarts.");
    }
    if (!process.env.STATS_TOKEN) {
        console.error("STATS_TOKEN is unset. GET /api/stats returns 503 until it is set.");
    }
    const port = Number(process.env.PORT || 8787);
    serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
        console.log(`SunsetDiff service listening on 0.0.0.0:${port}`);
    });
}
