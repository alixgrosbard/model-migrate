import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../service/src/index.ts";
import { resetRateLimits } from "../service/src/subscribe.ts";
import { readUnsubscribeToken, resetWelcomeCache, signUnsubscribeToken } from "../service/src/welcome.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_SEGMENT_ID;
  resetRateLimits();
  resetWelcomeCache();
  vi.restoreAllMocks();
});

function post(email: string, extra: Record<string, unknown> = {}, ip = "203.0.113.10") {
  return app.request("/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email, ...extra }),
  });
}

describe("POST /api/subscribe", () => {
  it("creates a new Resend contact and sends one welcome email", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const href = String(url);
      if (href.includes("/emails")) return new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
      if (href.endsWith("/data/models.json")) {
        return new Response(JSON.stringify({ models: [model("gpt-4o-2024-08-06", "2026-10-23")] }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "con_1" }), { status: 201 });
    }) as typeof fetch;

    const response = await post("Person@Example.com", {}, "203.0.113.21");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "You're on the list." });
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts");
    expect(calls[0]?.init?.method).toBe("POST");
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      email: "person@example.com",
      unsubscribed: false,
      segments: [{ id: "seg_test" }],
    });
    const welcome = calls.find((call) => call.url === "https://api.resend.com/emails");
    expect(welcome?.init?.method).toBe("POST");
    const welcomeHeaders = new Headers(welcome?.init?.headers);
    expect(welcomeHeaders.get("Idempotency-Key")).toMatch(/^welcome-email\/[a-f0-9]{64}$/);
    const mail = JSON.parse(String(welcome?.init?.body));
    expect(mail.from).toBe("SunsetDiff <alerts@send.sunsetdiff.com>");
    expect(mail.to).toEqual(["person@example.com"]);
    expect(mail.subject.startsWith("Welcome to SunsetDiff:")).toBe(true);
    expect(mail.headers["List-Unsubscribe"]).toContain("/unsubscribe?token=");
    expect(mail.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(mail.text).toContain("Thanks for signing up.");
    expect(mail.text).not.toMatch(/[\u2013\u2014]/);
    expect(calls.filter((call) => call.url === "https://api.resend.com/emails")).toHaveLength(1);
  });

  it("adds an existing contact to the segment", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      if (urls.length === 1) return new Response(JSON.stringify({ message: "Contact already exists" }), { status: 409 });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const response = await post("person@example.com", {}, "203.0.113.22");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "You're on the list." });
    expect(urls).toEqual([
      "https://api.resend.com/contacts",
      "https://api.resend.com/contacts/person%40example.com/segments/seg_test",
    ]);
    expect(urls.some((url) => url.includes("/emails"))).toBe(false);
  });

  it("returns 503 when either Resend env var is missing and does not call fetch", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    for (const [ip, env] of [
      ["203.0.113.23", {}],
      ["203.0.113.26", { RESEND_API_KEY: "re_test_key" }],
      ["203.0.113.27", { RESEND_SEGMENT_ID: "seg_test" }],
    ] as const) {
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_SEGMENT_ID;
      Object.assign(process.env, env);
      const response = await post("person@example.com", {}, ip);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ message: "Signup storage is not configured yet." });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a honeypot submission without calling Resend", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const response = await post("person@example.com", { company: "Acme" }, "203.0.113.24");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "You're on the list." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 and logs only the status code", async () => {
    process.env.RESEND_API_KEY = "re_secret_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post("person@example.com", {}, "203.0.113.25");
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "Signup could not be saved." });
    expect(error).toHaveBeenCalledWith("Resend status 500");
    expect(JSON.stringify(error.mock.calls)).not.toContain("re_secret_key");
  });

  it("returns success when the welcome email fails", async () => {
    process.env.RESEND_API_KEY = "re_secret_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    globalThis.fetch = (async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("/emails")) return new Response("nope", { status: 500 });
      if (href.endsWith("/data/models.json")) return new Response(JSON.stringify({ models: [] }), { status: 200 });
      return new Response(JSON.stringify({ id: "con_1" }), { status: 201 });
    }) as typeof fetch;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post("person@example.com", {}, "203.0.113.28");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "You're on the list." });
    expect(error).toHaveBeenCalledWith("Welcome email status 500");
    expect(JSON.stringify(error.mock.calls)).not.toContain("re_secret_key");
  });
});

describe("GET and POST /unsubscribe", () => {
  it("marks a signed contact unsubscribed and rejects a bad token", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const token = signUnsubscribeToken("person@example.com", "re_test_key");
    const calls: { url: string; method: string; body: string }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method), body: String(init?.body ?? "") });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const bad = await app.request("/unsubscribe?token=nope");
    expect(bad.status).toBe(400);
    expect(calls).toHaveLength(0);

    const ok = await app.request(`/unsubscribe?token=${encodeURIComponent(token)}`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain("You are unsubscribed.");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts/person%40example.com");
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ unsubscribed: true });

    const posted = await app.request(`/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" });
    expect(posted.status).toBe(200);
    expect(readUnsubscribeToken(`${token}x`, "re_test_key")).toBeNull();
  });
});

function model(id: string, shutdown: string) {
  return {
    id,
    slug: id,
    provider: "openai",
    display_name: id,
    shutdown_date: shutdown,
    shutdown_date_kind: "exact",
  };
}
