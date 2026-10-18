import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp.js";
import { THANK_YOU, hashIp, rateLimited, validEmail } from "./subscribe.js";
const CONTACTS_URL = "https://api.resend.com/contacts";
const GENERIC_FAILURE = "Signup could not be saved.";
export const app = new Hono();
app.use("/api/*", cors({
    origin: ["https://sunsetdiff.com", "https://sunsetdiff.onrender.com"],
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["content-type"],
}));
app.get("/health", (c) => c.json({
    ok: true,
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_SEGMENT_ID),
    service: "sunsetdiff",
}));
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
        if (created.ok)
            return c.json({ message: THANK_YOU });
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
app.all("/mcp", async (c) => {
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
});
const calledDirectly = process.argv[1] ? path.resolve(process.argv[1]).includes(`${path.sep}index.`) : false;
if (calledDirectly) {
    const port = Number(process.env.PORT || 8787);
    serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
        console.log(`SunsetDiff service listening on 0.0.0.0:${port}`);
    });
}
