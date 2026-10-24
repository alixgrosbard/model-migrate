import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { changeSchema, migrationSchema, modelSchema, providerSchema, specsSchema } from "../src/schema.ts";
import { deprecationsCsv } from "../src/lib/growth.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import {
  CHANGE_FIELDS,
  COMPACT_FIELDS,
  DEPRECATIONS_CSV_HEADERS,
  ENDPOINTS,
  MIGRATION_FIELDS,
  MODEL_RECORD_FIELDS,
  PROVIDER_FIELDS,
  REPLACEMENT_FIELDS,
  SOURCE_FIELDS,
  SPEC_FIELDS,
  apiFaqs,
} from "../src/lib/endpoints.ts";
import { COMPARISON_CHECKED, comparisonPath, comparisons, hubFaqs } from "../src/lib/comparisons.ts";

describe("citable comparison pages", () => {
  it("covers the public trackers and dates every source", () => {
    expect(comparisons.map((item) => item.slug)).toEqual([
      "modeldeprecations",
      "quora-model-deprecation-tracker",
      "endoflife-ai",
      "developers-digest",
      "deprecations-info",
      "llmsunset",
      "lastcall",
      "modelsunset",
    ]);
    for (const comparison of comparisons) {
      expect(comparison.sources.length).toBeGreaterThan(0);
      expect(comparison.rows.length).toBeGreaterThan(0);
      expect(comparison.faqs.map((item) => item.question)).toContain("Where can I track AI model deprecations?");
      expect(comparison.faqs.map((item) => item.question)).toContain("Is there an API for LLM model shutdown dates?");
      for (const source of comparison.sources) {
        expect(source.checked).toBe(COMPARISON_CHECKED);
        expect(source.url.startsWith("https://")).toBe(true);
        expect(source.showed.length).toBeGreaterThan(20);
      }
      const blob = JSON.stringify(comparison);
      expect(blob.includes("—")).toBe(false);
      expect(blob.includes("–")).toBe(false);
      expect(blob.toLowerCase().includes("alix")).toBe(false);
    }
    expect(hubFaqs.length).toBeGreaterThanOrEqual(3);
    expect(lastmodForUrl("https://sunsetdiff.com/alternatives/")).toBe(COMPARISON_CHECKED);
    expect(lastmodForUrl(`https://sunsetdiff.com${comparisonPath("lastcall")}`)).toBe(COMPARISON_CHECKED);
  });

  it("lists the new pages in llms.txt", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    expect(text).toContain("/alternatives/");
    expect(text).toContain("/api/");
    for (const comparison of comparisons) expect(text).toContain(comparisonPath(comparison.slug));
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(full).toContain("/alternatives/");
    expect(full).toContain("/api/");
  });
});

describe("static API docs match the repo", () => {
  it("documents the real files and the schema fields", async () => {
    expect(keys(modelSchema.shape)).toEqual([...MODEL_RECORD_FIELDS]);
    expect(keys(specsSchema.shape)).toEqual([...SPEC_FIELDS]);
    expect(keys(providerSchema.shape)).toEqual([...PROVIDER_FIELDS]);
    expect(keys(migrationSchema.shape)).toEqual([...MIGRATION_FIELDS]);
    expect(keys(changeSchema.shape)).toEqual([...CHANGE_FIELDS]);
    const header = deprecationsCsv([]).trim();
    expect(header).toBe(DEPRECATIONS_CSV_HEADERS.join(","));

    const generator = await readFile("scripts/generate-static.ts", "utf8");
    const compact = generator.slice(generator.indexOf("const compact"), generator.indexOf("const upcoming"));
    for (const field of COMPACT_FIELDS) expect(compact).toContain(`${field}:`);
    for (const endpoint of ENDPOINTS) {
      const parts = endpoint.path.split("/").filter((part) => part && !part.includes("<"));
      expect(generator).toContain(parts.at(-1));
    }
    expect(generator).toContain('"/api/v1/upcoming.json"');
    expect(generator).toContain('"/data/models.json"');
    expect(generator).toContain('"/dataset/sunsetdiff.json"');
    expect(generator).toContain('"/feed.xml"');
    expect(generator).toContain('"/deadlines.ics"');
    expect(generator).toContain("api/v1/lookup");
    expect(generator).toContain("api/v1/migrations");
    expect(generator).toContain("__to__");
    expect(apiFaqs.map((item) => item.question)).toContain("Is there an API for LLM model shutdown dates?");
    const replacement = keys(modelSchema.shape.replacements.element.shape);
    expect(replacement).toEqual([...REPLACEMENT_FIELDS]);
    const source = keys(modelSchema.shape.sources.element.shape);
    expect(source).toEqual([...SOURCE_FIELDS]);
  });
});

function keys(shape: Record<string, unknown>): string[] {
  return Object.keys(shape);
}
