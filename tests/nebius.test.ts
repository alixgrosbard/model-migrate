import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  AUGUST_URL,
  NEBIUS_BASE_URL,
  NEBIUS_CHAT_URL,
  NOVEMBER_URL,
  QUICKSTART_URL,
  assembleNebius,
  parseNebiusNotice,
} from "../scrapers/nebius.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { replacementNoteText, replacementRetirement } from "../src/lib/replacement-chain.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-28";
const november = readFileSync("snapshots/fixtures/nebius/november-2026-10-28.md", "utf8");
const august = readFileSync("snapshots/fixtures/nebius/august-2026-10-28.md", "utf8");

const NOVEMBER_ROWS: [string, string][] = [
  ["zai-org/GLM-5.1", "zai-org/GLM-5.2"],
  ["nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B", "nvidia/Nemotron-3_5-Lightning"],
  ["nvidia/nemotron-3-super-120b-a12b", "nvidia/Nemotron-3.5-Super-VL"],
  ["deepseek-ai/DeepSeek-V4-Pro", "deepseek-ai/DeepSeek-V4-Pro-0813"],
  ["deepseek-ai/DeepSeek-V4-Flash-0731", "deepseek-ai/DeepSeek-V4.1-Flash-1017"],
  ["deepseek-ai/DeepSeek-V4.1-Flash", "deepseek-ai/DeepSeek-V4.1-Flash-1017"],
  ["Qwen/Qwen3.5-397B-A17B", "Qwen/Qwen3.8-27B"],
  ["Qwen/Qwen3-235B-A22B-Instruct-2507", "Qwen/Qwen3-30B-A3B-Instruct-2507"],
  ["moonshotai/Kimi-K2.6", "moonshotai/Kimi-K3"],
  ["moonshotai/Kimi-K2.7-Code", "moonshotai/Kimi-K3"],
  ["openbmb/MiniCPM-V-4_5", "nvidia/Nemotron-3.5-Super-VL"],
];

const AUGUST_ROWS: [string, string][] = [
  ["deepseek-ai/DeepSeek-V4-Flash", "deepseek-ai/DeepSeek-V4-Flash-0731"],
  ["meta-llama/Llama-3.3-70B-Instruct", "nvidia/Nemotron-3_5-Lightning"],
  ["MiniMaxAI/MiniMax-M2.5", "MiniMaxAI/MiniMax-M3"],
  ["NousResearch/Hermes-4-70B", "nvidia/Nemotron-3_5-Lightning"],
  ["nvidia/Cosmos3-Super-Reasoner", "MiniMaxAI/MiniMax-M3"],
  ["nvidia/Llama-3_1-Nemotron-Ultra-253B-v1", "nvidia/nemotron-3-super-120b-a12b"],
  ["nvidia/Nemotron-3-Nano-Omni", "nvidia/Nemotron-3_5-Lightning"],
  ["Qwen/Qwen2.5-VL-72B-Instruct", "MiniMaxAI/MiniMax-M3"],
  ["Qwen/Qwen3-32B", "nvidia/Nemotron-3_5-Lightning"],
  ["Qwen/Qwen3-Next-80B-A3B-Thinking", "Qwen/Qwen3.5-397B-A17B"],
];

function rows() {
  const models = assembleNebius(november, august, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: (typeof rows extends () => (infer T)[] ? T : never)): ModelRecord {
  return modelSchema.parse({
    ...model,
    slug: model.slug,
    first_seen: "2026-10-28T00:00:00.000Z",
    updated_at: "2026-10-28T00:00:00.000Z",
  });
}

describe("Nebius Token Factory notices", () => {
  it("stores the November 9 and August 31 tables and nothing else", () => {
    const models = rows();
    const dated = models.filter((model) => model.shutdown_date);
    expect(dated).toHaveLength(NOVEMBER_ROWS.length + AUGUST_ROWS.length);
    for (const [id, replacement] of NOVEMBER_ROWS) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("deprecated");
      expect(model?.shutdown_date).toBe("2026-11-09");
      expect(model?.shutdown_date_kind).toBe("exact");
      expect(model?.deprecation_date).toBeNull();
      expect(model?.replacements.map((item) => item.model_id)).toEqual([replacement]);
      expect(model?.replacements[0]?.kind).toBe("official");
      expect(model?.replacements[0]?.source_url).toBe(NOVEMBER_URL);
      expect(model?.sources[0]?.url).toBe(NOVEMBER_URL);
      expect(november).toContain(`\`${id}\``);
      expect(november).toContain(`\`${replacement}\``);
    }
    for (const [id, replacement] of AUGUST_ROWS) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("retired");
      expect(model?.shutdown_date).toBe("2026-08-31");
      expect(model?.replacements.map((item) => item.model_id)).toEqual([replacement]);
      expect(model?.sources[0]?.url).toBe(AUGUST_URL);
      expect(august).toContain(`\`${id}\``);
      expect(august).toContain(`\`${replacement}\``);
    }
    for (const model of dated) {
      expect(model.provider).toBe("nebius");
      expect(model.region_or_platform_notes).toContain("This change only affects Serverless usage.");
      expect(model.region_or_platform_notes).toContain("Dedicated Endpoints are unaffected.");
      expect(model.region_or_platform_notes).toContain("Token Factory does not automatically reroute requests from deprecated models.");
      expect(model.specs.input_price_per_mtok).toBeNull();
      expect(model.specs.output_price_per_mtok).toBeNull();
      expect(model.sources[0]?.excerpt.length).toBeLessThanOrEqual(300);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
    expect(models.find((model) => model.id === "zai-org/GLM-5.1")?.slug).toBe("zai-org-glm-5-1");
    const stubs = models.filter((model) => !model.shutdown_date);
    expect(stubs.every((model) => model.status === "active")).toBe(true);
    expect(stubs.map((model) => model.id).sort()).toEqual([
      "MiniMaxAI/MiniMax-M3",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3.8-27B",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      "moonshotai/Kimi-K3",
      "nvidia/Nemotron-3.5-Super-VL",
      "nvidia/Nemotron-3_5-Lightning",
      "zai-org/GLM-5.2",
    ]);
  });

  it("keeps the August replacement when that id is itself removed in November", () => {
    const models = rows().map(asRecord);
    const flash = models.find((model) => model.id === "deepseek-ai/DeepSeek-V4-Flash");
    expect(flash?.replacements[0]?.model_id).toBe("deepseek-ai/DeepSeek-V4-Flash-0731");
    const chain = replacementRetirement(flash!, models);
    expect(chain.replacement_also_retiring).toBe(true);
    expect(replacementNoteText(chain.notes[0].parts)).toContain("deepseek-ai/DeepSeek-V4-Flash-0731");
    expect(replacementNoteText(chain.notes[0].parts)).toContain("deepseek-ai/DeepSeek-V4.1-Flash-1017");
  });

  it("does not parse a one-column removed-models table", () => {
    const june = `# Model Deprecations: June 2026

**Effective June 22, 2026:**

The following models were removed from Token Factory Serverless on **June 22, 2026**.

| Deprecated Models |
| - |
| \`deepseek-ai/DeepSeek-V3.2\` |
`;
    expect(parseNebiusNotice(june, "https://docs.tokenfactory.nebius.com/june-2026-deprecation-notice", checked)).toBeNull();
  });

  it("keeps stored rows when the November page no longer matches", () => {
    const models = rows();
    const previous = models.map(asRecord);
    expect(assembleNebius("not a deprecation table", august, checked, previous)).toBeNull();
    const dropped = november.replace("`zai-org/GLM-5.1`", "not-an-id");
    expect(assembleNebius(dropped, august, checked, previous)).toBeNull();
    expect(assembleNebius(november, "no table here", checked, previous)?.some((model) => model.id === "deepseek-ai/DeepSeek-V4-Flash")).toBe(true);
  });

  it("uses the quickstart host and does not invent an error page", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "zai-org/GLM-5.1")!;
    const to = models.find((model) => model.id === "zai-org/GLM-5.2")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.after).toContain(NEBIUS_CHAT_URL);
    expect(migration.code_change.snippets.curl.after).toContain("zai-org/GLM-5.2");
    expect(migration.code_change.snippets.python.after).toContain(NEBIUS_BASE_URL);
    expect(migration.api_changes.map((change) => change.source_url)).toEqual([QUICKSTART_URL, NOVEMBER_URL]);
    expect(migration.migration_checklist.join(" ")).toContain("Dedicated Endpoints are unaffected.");
    expect(requestErrorsForProvider("nebius")).toEqual([]);
  });
});

describe("Nebius records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("nebius");
    const models = (await loadModels()).filter((model) => model.provider === "nebius");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      nebiusPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/nebius/");
    expect(text).toContain("/models/nebius/zai-org-glm-5-1/");
    expect(text).toContain("Dedicated Endpoints are unaffected.");
    expect(sitemapSection("/providers/nebius/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/nebius/zai-org-glm-5-1/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/nebius/zai-org-glm-5-1/")).toBe("sitemap-replace.xml");
    expect(sitemapSection("/migrate/nebius__zai-org-glm-5-1__to__nebius__zai-org-glm-5-2/")).toBe("sitemap-migrate.xml");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("Nebius deprecation pages were not applied. Stored Nebius rows stay.");
    expect(run).toContain('if (provider === "nebius") continue;');
  });
});
