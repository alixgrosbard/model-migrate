import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../service/src/index.ts";
import { resetRateLimits } from "../service/src/subscribe.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_SEGMENT_ID;
  resetRateLimits();
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
  it("creates a new Resend contact and sends no mail", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "con_1" }), { status: 201 });
    }) as typeof fetch;

    const response = await post("Person@Example.com", {}, "203.0.113.21");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "You're on the list." });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts");
    expect(calls[0]?.init?.method).toBe("POST");
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      email: "person@example.com",
      unsubscribed: false,
      segments: [{ id: "seg_test" }],
    });
    expect(JSON.stringify(calls)).not.toMatch(/emails/);
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
});
