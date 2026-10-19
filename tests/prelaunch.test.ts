import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLOSED_NOTE,
  SENDING_NOTE,
  STORED_NOTE,
  alertNote,
  alertsSending,
  htmlContainsOwnerPlaceholder,
  proCheckoutUrl,
} from "../src/lib/public-copy.ts";

describe("alert copy", () => {
  it("sends the live alert note unless PUBLIC_ALERTS_SENDING is off", () => {
    expect(alertsSending(undefined)).toBe(true);
    expect(alertsSending("")).toBe(true);
    expect(alertsSending("true")).toBe(true);
    expect(alertsSending("false")).toBe(false);
    expect(alertsSending("0")).toBe(false);
    expect(alertNote(false, false)).toBe(CLOSED_NOTE);
    expect(alertNote(false, true)).toBe(STORED_NOTE);
    expect(alertNote(true, true)).toBe(SENDING_NOTE);
    expect(alertNote(true, false)).toBe("We email you before models shut down. Unsubscribe anytime.");
  });
});

describe("pro checkout", () => {
  it("hides the button until a checkout URL is set", () => {
    expect(proCheckoutUrl(undefined)).toBeNull();
    expect(proCheckoutUrl("")).toBeNull();
    expect(proCheckoutUrl("javascript:alert(1)")).toBeNull();
    expect(proCheckoutUrl("https://example.com/checkout")).toBe("https://example.com/checkout");
  });
});

describe("owner placeholder", () => {
  it("fails when built HTML contains <owner>", async () => {
    expect(htmlContainsOwnerPlaceholder("npx github:&lt;owner&gt;/model-migrate mcp")).toBe(true);
    expect(htmlContainsOwnerPlaceholder("npx github:<owner>/model-migrate mcp")).toBe(true);
    expect(htmlContainsOwnerPlaceholder("npx github:alixgrosbard/model-migrate mcp")).toBe(false);
    const page = await readFile("src/pages/data/index.astro", "utf8");
    expect(htmlContainsOwnerPlaceholder(page)).toBe(false);
    expect(page).toContain("alixgrosbard/model-migrate");

    const dist = path.join(process.cwd(), "dist");
    if (!existsSync(dist)) return;
    const files = await walkHtml(dist);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const html = await readFile(file, "utf8");
      expect(htmlContainsOwnerPlaceholder(html), file).toBe(false);
    }
  });
});

async function walkHtml(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtml(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}
