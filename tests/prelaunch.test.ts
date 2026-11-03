import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLOSED_NOTE,
  PRO_BILLING_QUESTION,
  PRO_CTA,
  PRO_DESCRIPTION,
  PRO_EARLY_ACCESS,
  PRO_FEATURES,
  PRO_FOOTER,
  PRO_NO_CHECKOUT,
  PRO_TITLE,
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

  it("says early access is free until launch, then $19 a month", () => {
    expect(PRO_EARLY_ACCESS).toBe(
      "Pro is in early access. Join free today. You won't be charged until Pro launches, and we'll email you before your first charge. After that it's $19 a month, and you can cancel anytime.",
    );
    expect(PRO_DESCRIPTION).toContain("You won't be charged until Pro launches");
    expect(PRO_DESCRIPTION).toContain("$19 a month");
    expect(PRO_FOOTER).toContain("You won't be charged until Pro launches");
    expect(PRO_CTA).toBe("Start free early access");
    expect(PRO_NO_CHECKOUT).toContain("does not charge you");
    expect(PRO_TITLE).not.toMatch(/\$19/);
    expect(PRO_BILLING_QUESTION).toContain("charged");
    expect(PRO_FEATURES.filter((feature) => feature.status === "Coming at launch").map((feature) => feature.text)).toEqual([
      "Alerts only for the models in your code.",
      "Earlier warnings.",
      "Pro API access.",
    ]);
    expect(PRO_FEATURES.find((feature) => feature.status === "Available now")?.text).toContain("Public JSON files");
    const joined = [PRO_EARLY_ACCESS, PRO_DESCRIPTION, PRO_FOOTER, PRO_CTA, PRO_NO_CHECKOUT, PRO_TITLE].join("\n");
    expect(joined).not.toMatch(/[\u2013\u2014]/);
    expect(joined).not.toContain("Nothing on this list");
    expect(joined).not.toContain("Subscribe for $19");
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
