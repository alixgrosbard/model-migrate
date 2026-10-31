import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  CHANGELOG_URL,
  DEPRECATIONS_URL,
  MODELS_URL,
  QUICKSTART_URL,
  TOGETHER_BASE_URL,
  TOGETHER_CHAT_URL,
  assembleTogether,
  parseTogether,
} from "../scrapers/together.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-28";
const deprecations = readFileSync("snapshots/fixtures/together/deprecations-2026-10-28.md", "utf8");
const changelog = readFileSync("snapshots/fixtures/together/changelog-2026-10-28.md", "utf8");
const modelsPage = readFileSync("snapshots/fixtures/together/models-2026-10-28.md", "utf8");

function rows() {
  const models = parseTogether(deprecations, changelog, modelsPage, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: ReturnType<typeof rows>[number]): ModelRecord {
  return modelSchema.parse({
    ...model,
    slug: model.slug,
    first_seen: "2026-10-28T00:00:00.000Z",
    updated_at: "2026-10-28T00:00:00.000Z",
  });
}

describe("Together AI deprecations", () => {
  it("stores the four deprecations tables and changelog replacements the table omits", () => {
    const models = rows();
    expect(models).toHaveLength(339);
    expect(models.filter((model) => model.status === "retired")).toHaveLength(309);
    expect(models.filter((model) => model.status === "deprecated")).toHaveLength(2);
    expect(models.filter((model) => model.status === "active")).toHaveLength(28);
    const upcoming = models.find((model) => model.id === "MiniMaxAI/MiniMax-M3");
    expect(upcoming?.status).toBe("deprecated");
    expect(upcoming?.shutdown_date).toBe("2026-11-06");
    expect(upcoming?.shutdown_date_kind).toBe("exact");
    expect(upcoming?.replacements.map((item) => item.model_id)).toEqual(["MiniMaxAI/MiniMax-M3.1-Flash"]);
    expect(upcoming?.replacements[0]?.source_url).toBe(DEPRECATIONS_URL);
    expect(deprecations).toContain("`MiniMaxAI/MiniMax-M3`");
    const gpt = models.find((model) => model.id === "openai/gpt-oss-20b");
    expect(gpt?.status).toBe("retired");
    expect(gpt?.shutdown_date).toBe("2026-09-15");
    expect(gpt?.replacements.map((item) => item.model_id)).toEqual(["Qwen/Qwen3.5-9B"]);
    expect(gpt?.region_or_platform_notes).toContain("Sources disagree.");
    expect(gpt?.region_or_platform_notes).toContain("2026-09-14");
    const bert = models.find((model) => model.id === "bert-base-uncased");
    expect(bert?.shutdown_date).toBe("2025-02-06");
    expect(bert?.region_or_platform_notes).toContain("2024-08-22");
    const llama = models.find((model) => model.id === "meta-llama/Llama-3.3-70B-Instruct-Turbo");
    expect(llama?.replacements.map((item) => item.model_id)).toEqual(["meta-models/Muse-Glimmer-30B"]);
    expect(llama?.replacements[0]?.source_url).toBe(CHANGELOG_URL);
    expect(llama?.region_or_platform_notes).toContain("meta-llama/Llama-3.3-70B-Instruct");
    expect(changelog).toContain("`meta-models/Muse-Glimmer-30B`");
    const redirect = models.find((model) => model.id === "Kimi-K2");
    expect(redirect?.status).toBe("active");
    expect(redirect?.shutdown_date).toBeNull();
    expect(redirect?.replacements.map((item) => item.model_id)).toEqual(["Kimi-K2-0905"]);
    expect(redirect?.region_or_platform_notes).toContain("automatically routed");
    const finetune = models.find((model) => model.id === "Qwen/Qwen3-0.6B");
    expect(finetune?.status).toBe("retired");
    expect(finetune?.shutdown_date).toBe("2026-07-29");
    expect(finetune?.region_or_platform_notes).toContain("fine-tuning service, not serverless inference");
    expect(finetune?.replacements.map((item) => item.model_id)).toEqual(["Qwen/Qwen3.5-0.8B"]);
    const muse = models.find((model) => model.id === "meta-models/Muse-Glimmer-30B");
    expect(muse?.status).toBe("active");
    expect(muse?.specs.input_price_per_mtok).toBe(0.35);
    expect(muse?.specs.output_price_per_mtok).toBe(1.5);
    expect(muse?.specs.cached_input_price_per_mtok).toBe(0.04);
    expect(muse?.specs.context_window_tokens).toBe(131072);
    expect(muse?.specs.supports_tools).toBe(true);
    expect(muse?.sources.some((source) => source.url === MODELS_URL)).toBe(true);
    for (const model of models) {
      expect(model.provider).toBe("together");
      expect(model.sources[0]?.excerpt.length).toBeLessThanOrEqual(300);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
  });

  it("keeps stored rows when the deprecations page no longer matches", () => {
    const models = rows().map(asRecord);
    expect(assembleTogether({ deprecations: null, changelog, models: modelsPage }, checked, models)).toBeNull();
    expect(assembleTogether({ deprecations: "not a table", changelog, models: modelsPage }, checked, models)).toBeNull();
    const withoutPrices = parseTogether(deprecations, null, null, checked);
    expect(withoutPrices?.find((model) => model.id === "meta-llama/Llama-3.3-70B-Instruct-Turbo")?.replacements).toEqual([]);
    expect(withoutPrices?.find((model) => model.id === "meta-models/Muse-Glimmer-30B")).toBeUndefined();
    expect(withoutPrices?.find((model) => model.id === "MiniMaxAI/MiniMax-M3.1-Flash")?.specs.input_price_per_mtok).toBeNull();
  });

  it("uses the quickstart host and does not invent an error page", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "MiniMaxAI/MiniMax-M3")!;
    const to = models.find((model) => model.id === "MiniMaxAI/MiniMax-M3.1-Flash")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.after).toContain(TOGETHER_CHAT_URL);
    expect(migration.code_change.snippets.curl.after).toContain("MiniMaxAI/MiniMax-M3.1-Flash");
    expect(migration.code_change.snippets.python.after).toContain(TOGETHER_BASE_URL);
    expect(migration.api_changes[0]?.source_url).toBe(QUICKSTART_URL);
    expect(migration.migration_checklist.join(" ")).toContain("serverless inference");
    const redirect = models.find((model) => model.id === "Kimi-K2")!;
    const target = models.find((model) => model.id === "Kimi-K2-0905")!;
    const redirectMove = buildMigration(redirect, target, checked);
    expect(redirectMove.migration_checklist.join(" ")).toContain("automatically routed");
    expect(requestErrorsForProvider("together")).toEqual([]);
  });
});

describe("Together records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("together");
    const models = (await loadModels()).filter((model) => model.provider === "together");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      togetherPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/together/");
    expect(text).toContain("/models/together/minimaxai-minimax-m3/");
    expect(text).toContain("inference table date");
    expect(sitemapSection("/providers/together/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/together/minimaxai-minimax-m3/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/together/minimaxai-minimax-m3/")).toBe("sitemap-replace.xml");
    expect(sitemapSection("/migrate/together__minimaxai-minimax-m3__to__together__minimaxai-minimax-m3-1-flash/")).toBe(
      "sitemap-migrate.xml",
    );
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("Together deprecations page was not applied. Stored Together rows stay.");
    expect(run).toContain('if (provider === "together") continue;');
  });
});
