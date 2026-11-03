import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  CHANGELOG_URL,
  CLOUDFLARE_RUN_URL,
  POST_URL,
  REST_URL,
  assembleCloudflare,
  parseCloudflare,
} from "../scrapers/cloudflare-workers-ai.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-30";
const post = readFileSync("snapshots/fixtures/cloudflare-workers-ai/planned-model-deprecations-2026-10-30.md", "utf8");
const changelog = readFileSync("snapshots/fixtures/cloudflare-workers-ai/changelog-2026-10-30.md", "utf8");

const MAY30 = [
  "@cf/defog/sqlcoder-7b-2",
  "@cf/facebook/bart-large-cnn",
  "@cf/google/gemma-3-12b-it",
  "@cf/meta/llama-2-7b-chat-fp16",
  "@cf/meta/llama-2-7b-chat-int8",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/meta/llama-3-8b-instruct-awq",
  "@cf/meta/llama-3.1-70b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-awq",
  "@cf/microsoft/phi-2",
  "@cf/mistral/mistral-7b-instruct-v0.1",
  "@cf/moonshotai/kimi-k2.5",
  "@cf/unum/uform-gen2-qwen-500m",
  "@hf/google/gemma-7b-it",
  "@hf/meta-llama/meta-llama-3-8b-instruct",
  "@hf/mistral/mistral-7b-instruct-v0.2",
  "@hf/nousresearch/hermes-2-pro-mistral-7b",
];

const ACTIVE = [
  "@cf/google/gemma-2b-it-lora",
  "@cf/google/gemma-7b-it-lora",
  "@cf/meta-llama/llama-2-7b-chat-hf-lora",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/mistral/mistral-7b-instruct-v0.2-lora",
];

const OCTOBER = [
  "@cf/deepseek-ai/deepseek-math-7b-instruct",
  "@cf/fblgit/una-cybertron-7b-v2-bf16",
  "@cf/openchat/openchat-3.5-0106",
  "@cf/qwen/qwen1.5-0.5b-chat",
  "@cf/qwen/qwen1.5-1.8b-chat",
  "@cf/qwen/qwen1.5-14b-chat-awq",
  "@cf/qwen/qwen1.5-7b-chat-awq",
  "@cf/thebloke/discolm-german-7b-v1-awq",
  "@cf/tiiuae/falcon-7b-instruct",
  "@cf/tinyllama/tinyllama-1.1b-chat-v1.0",
  "@hf/nexusflow/starling-lm-7b-beta",
  "@hf/thebloke/deepseek-coder-6.7b-base-awq",
  "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
  "@hf/thebloke/llama-2-13b-chat-awq",
  "@hf/thebloke/llamaguard-7b-awq",
  "@hf/thebloke/mistral-7b-instruct-v0.1-awq",
  "@hf/thebloke/neural-chat-7b-v3-1-awq",
  "@hf/thebloke/openhermes-2.5-mistral-7b-awq",
  "@hf/thebloke/zephyr-7b-beta-awq",
];

function rows() {
  const models = parseCloudflare(post, changelog, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: ReturnType<typeof rows>[number]): ModelRecord {
  return modelSchema.parse({
    ...model,
    first_seen: "2026-10-30T00:00:00.000Z",
    updated_at: "2026-10-30T00:00:00.000Z",
  });
}

describe("Cloudflare Workers AI changelog", () => {
  it("stores the May 30 list, the active variants, and the October 1 list", () => {
    const models = rows();
    expect(models).toHaveLength(MAY30.length + ACTIVE.length + OCTOBER.length + 1);
    for (const id of MAY30) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("retired");
      expect(model?.shutdown_date).toBe("2026-05-30");
      expect(model?.shutdown_date_kind).toBe("exact");
      expect(model?.deprecation_date).toBeNull();
      expect(model?.sources[0]?.url).toBe(POST_URL);
      expect(model?.sources[0]?.last_checked).toBe(checked);
      expect(post).toContain(id);
      if (id === "@cf/moonshotai/kimi-k2.5") {
        expect(model?.replacements.map((item) => item.model_id)).toEqual(["@cf/moonshotai/kimi-k2.6"]);
        expect(model?.region_or_platform_notes).toContain("May 10, 2026");
        expect(model?.region_or_platform_notes).toContain("automatically aliased");
        expect(model?.region_or_platform_notes).toContain("higher price");
      } else {
        expect(model?.replacements).toEqual([]);
        expect(model?.region_or_platform_notes).toContain("deprecated on May 30, 2026");
      }
    }
    for (const id of ACTIVE) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("active");
      expect(model?.shutdown_date).toBeNull();
      expect(model?.replacements).toEqual([]);
      expect(model?.region_or_platform_notes).toContain("remains active");
      expect(post).toContain(id);
    }
    const stub = models.find((model) => model.id === "@cf/moonshotai/kimi-k2.6");
    expect(stub?.status).toBe("active");
    expect(stub?.shutdown_date).toBeNull();
    for (const id of OCTOBER) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("retired");
      expect(model?.shutdown_date).toBe("2025-10-01");
      expect(model?.replacements).toEqual([]);
      expect(model?.sources[0]?.url).toBe(CHANGELOG_URL);
      expect(model?.region_or_platform_notes).toContain("October 1, 2025");
      expect(model?.region_or_platform_notes).toContain("does not name one replacement");
      expect(changelog).toContain(id);
    }
    expect(models.some((model) => model.id === "@cf/zai-org/glm-4.7-flash")).toBe(false);
    expect(models.some((model) => model.id === "@cf/google/gemma-4-26b-a4b-it")).toBe(false);
    for (const model of models) {
      expect(model.provider).toBe("cloudflare-workers-ai");
      expect(model.specs.input_price_per_mtok).toBeNull();
      expect(model.sources[0]?.excerpt.length).toBeLessThanOrEqual(300);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
      expect(JSON.stringify(model)).not.toContain("reccommend");
    }
  });

  it("keeps stored rows when the changelog no longer matches", () => {
    const models = rows();
    const previous = models.map(asRecord);
    expect(assembleCloudflare({ post: "not a changelog", changelog }, checked, previous)).toBeNull();
    expect(assembleCloudflare({ post: null, changelog }, checked, previous)).toBeNull();
    const dropped = post.replace("`@cf/moonshotai/kimi-k2.5`", "not-an-id");
    expect(assembleCloudflare({ post: dropped, changelog }, checked, previous)).toBeNull();
  });

  it("uses the REST run path for the named alias", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "@cf/moonshotai/kimi-k2.5")!;
    const to = models.find((model) => model.id === "@cf/moonshotai/kimi-k2.6")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.after).toContain(`${CLOUDFLARE_RUN_URL}@cf/moonshotai/kimi-k2.6`);
    expect(migration.code_change.snippets.curl.before).toContain("@cf/moonshotai/kimi-k2.5");
    expect(migration.code_change.snippets.curl.after).toContain("Where did the phrase Hello World come from");
    expect(migration.api_changes.map((change) => change.source_url)).toEqual([REST_URL, POST_URL]);
    expect(migration.migration_checklist.join(" ")).toContain("higher price");
    expect(requestErrorsForProvider("cloudflare-workers-ai").map((page) => page.slug)).toEqual([
      "cloudflare-workers-ai-model-deprecated-410",
    ]);
  });
});

describe("Cloudflare Workers AI records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("cloudflare-workers-ai");
    const models = (await loadModels()).filter((model) => model.provider === "cloudflare-workers-ai");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      cloudflarePages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/cloudflare-workers-ai/");
    expect(text).toContain("/models/cloudflare-workers-ai/cf-moonshotai-kimi-k2-5/");
    expect(text).toContain("no separate deprecations index");
    expect(sitemapSection("/providers/cloudflare-workers-ai/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/cloudflare-workers-ai/retired/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/cloudflare-workers-ai/cf-moonshotai-kimi-k2-5/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/cloudflare-workers-ai/cf-moonshotai-kimi-k2-5/")).toBe("sitemap-replace.xml");
    expect(
      sitemapSection("/migrate/cloudflare-workers-ai__cf-moonshotai-kimi-k2-5__to__cloudflare-workers-ai__cf-moonshotai-kimi-k2-6/"),
    ).toBe("sitemap-migrate.xml");
    expect(sitemapSection("/shutdowns/cloudflare-workers-ai-2026-05-30/")).toBe("sitemap-dates.xml");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("Cloudflare Workers AI changelog was not applied. Stored Cloudflare Workers AI rows stay.");
    expect(run).toContain('if (provider === "cloudflare-workers-ai") continue;');
  });
});
