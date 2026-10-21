import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { migrationSchema, modelSchema } from "../src/schema.ts";
import { buildMigration, mergeCuratedMigration } from "../scrapers/migrations.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { requestErrorGraph } from "../src/jsonld.ts";
import { existsSync } from "node:fs";
import nodePath from "node:path";
import { REQUEST_ERRORS_CHECKED, REQUEST_ERRORS_INDEX, requestErrorChecked, requestErrorPath, requestErrors, requestErrorsIndexChecked } from "../src/lib/request-errors.ts";

const sonnetFile = "data/migrations/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5.json";
const lunaFiles = [
  "data/migrations/openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna.json",
  "data/migrations/openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna.json",
  "data/migrations/openai__gpt-4o-2024-11-20__to__openai__gpt-6-luna.json",
];

describe("migration request changes", () => {
  it("fills Sonnet 4.5 to 5.5 from the migration guide", async () => {
    const row = migrationSchema.parse(JSON.parse(await readFile(sonnetFile, "utf8")));
    expect(row.api_changes.map((change) => change.kind)).toEqual([
      "removed_param",
      "removed_param",
      "behavior_change",
      "behavior_change",
      "behavior_change",
    ]);
    const blob = row.api_changes.map((change) => change.detail).join(" ");
    expect(blob).toContain("non-default temperature, top_p, or top_k");
    expect(blob).toContain("budget_tokens");
    expect(blob).toContain("between_tools");
    expect(blob).toContain("user message");
    expect(blob).toContain("tool_choice");
    for (const change of row.api_changes) {
      expect(change.source_url).toBe("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide");
    }
    for (const language of ["python", "typescript", "curl"] as const) {
      const snippet = row.code_change.snippets[language];
      expect(snippet.before).toContain("claude-sonnet-4-5-20250929");
      expect(snippet.before).toContain("temperature");
      expect(snippet.after).toContain("claude-sonnet-5-5");
      expect(snippet.after).not.toContain("temperature");
      expect(snippet.after).not.toContain("budget_tokens");
      expect(snippet.after).toContain("effort");
    }
    expect(row.code_change.after).toBe(row.code_change.snippets.python.after);
  });

  it("keeps the guide notes when a scrape rebuilds the row", async () => {
    const stored = migrationSchema.parse(JSON.parse(await readFile(sonnetFile, "utf8")));
    const from = modelSchema.parse(JSON.parse(await readFile(`data/models/anthropic/${stored.from.slug}.json`, "utf8")));
    const to = modelSchema.parse(JSON.parse(await readFile(`data/models/anthropic/${stored.to.slug}.json`, "utf8")));
    const fresh = buildMigration(from, to, "2026-10-21");
    expect(fresh.api_changes).toEqual([]);
    const merged = mergeCuratedMigration(stored, fresh);
    expect(merged.api_changes.map((change) => change.kind)).toEqual(stored.api_changes.map((change) => change.kind));
    expect(merged.code_change).toEqual(stored.code_change);
    expect(merged.price_diff).toEqual(fresh.price_diff);
    expect(merged.sources.map((source) => source.url)).toContain("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide");
    const luna = migrationSchema.parse(JSON.parse(await readFile(lunaFiles[1], "utf8")));
    const lunaFrom = modelSchema.parse(JSON.parse(await readFile(`data/models/openai/${luna.from.slug}.json`, "utf8")));
    const lunaTo = modelSchema.parse(JSON.parse(await readFile(`data/models/openai/${luna.to.slug}.json`, "utf8")));
    const lunaFresh = buildMigration(lunaFrom, lunaTo, "2026-10-21");
    expect(lunaFresh.api_changes).toEqual([]);
    const lunaMerged = mergeCuratedMigration(luna, lunaFresh);
    expect(lunaMerged.api_changes.map((change) => change.detail)).toEqual(luna.api_changes.map((change) => change.detail));
    expect(lunaMerged.code_change.snippets.python.after).toContain("reasoning_effort");
  });

  it("fills the GPT-4o to GPT-6 Luna guides from the model page", async () => {
    for (const file of lunaFiles) {
      const row = migrationSchema.parse(JSON.parse(await readFile(file, "utf8")));
      expect(row.api_changes.map((change) => change.detail)).toEqual([
        "Use the Responses API for function calling. Chat Completions supports function calling only with reasoning_effort set to none.",
        "Fine-tuning (v1/fine-tuning) is not supported.",
        "Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.",
      ]);
      for (const change of row.api_changes) {
        expect(change.source_url).toBe("https://developers.openai.com/api/docs/models/gpt-6-luna");
      }
      for (const language of ["python", "typescript", "curl"] as const) {
        const snippet = row.code_change.snippets[language];
        expect(snippet.before).toContain(row.from.model_id);
        expect(snippet.before).toContain("get_weather");
        expect(snippet.before).not.toContain("reasoning_effort");
        expect(snippet.after).toContain("gpt-6-luna");
        expect(snippet.after).toContain("reasoning_effort");
        expect(snippet.after).toContain("none");
        expect(snippet.after).toContain("get_weather");
      }
    }
  });
});

describe("request error pages", () => {
  it("lists both pages in llms.txt, lastmod, and JSON-LD", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(requestErrors.length).toBeGreaterThanOrEqual(8);
    expect(requestErrors.length).toBeLessThanOrEqual(12);
    expect(text).toContain(REQUEST_ERRORS_INDEX);
    expect(full).toContain(REQUEST_ERRORS_INDEX);
    expect(lastmodForUrl(`https://sunsetdiff.com${REQUEST_ERRORS_INDEX}`)).toBe(requestErrorsIndexChecked());
    for (const page of requestErrors) {
      const path = requestErrorPath(page.slug);
      expect(text).toContain(path);
      expect(full).toContain(path);
      expect(lastmodForUrl(`https://sunsetdiff.com${path}`)).toBe(requestErrorChecked(page));
      const graph = requestErrorGraph("https://sunsetdiff.com/", page);
      expect(graph.map((node) => node["@type"])).toEqual(["TechArticle", "FAQPage"]);
      const encoded = JSON.parse(JSON.stringify(graph)) as { headline?: string; description?: string }[];
      expect(encoded[0]?.headline).toBe(page.h1);
      expect(encoded[0]?.description).toContain(page.errorText);
      expect(JSON.stringify(graph)).not.toMatch(/[—–]/);
      expect(JSON.stringify(page)).not.toMatch(/[—–]/);
      expect(page.cause.length).toBeGreaterThan(10);
      expect(page.models.length).toBeGreaterThan(0);
      for (const model of page.models) {
        const file = nodePath.join("data/models", model.provider, `${model.slug}.json`);
        expect(existsSync(file), file).toBe(true);
      }
      for (const guide of page.guides) {
        const file = nodePath.join("data/migrations", `${guide.href.split("/").filter(Boolean).at(-1)}.json`);
        expect(existsSync(file), guide.href).toBe(true);
      }
    }
    const topP = requestErrors.find((page) => page.slug === "claude-sonnet-5-5-top-p-top-k");
    expect(topP?.errorQuoted).toBe(false);
    expect(topP?.errorText).not.toContain("top_p is deprecated for this model");
    expect(requestErrors.filter((page) => page.errorQuoted).length).toBeGreaterThanOrEqual(8);
  });
});
