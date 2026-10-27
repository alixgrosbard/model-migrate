import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carryForwardDocumentedModels } from "../scrapers/carry.ts";
import { parseCohere, DEPRECATIONS_URL as COHERE_DEPRECATIONS, MODELS_URL as COHERE_MODELS } from "../scrapers/cohere.ts";
import { buildMigration } from "../scrapers/migrations.ts";
import { sanityCheck } from "../scrapers/sanity.ts";
import {
  MAY15_URL,
  MODELS_URL as XAI_MODELS,
  NOV2_URL,
  RELEASE_URL,
  parseXai,
} from "../scrapers/xai.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { modelGraph } from "../src/jsonld.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { modelSchema } from "../src/schema.ts";

const read = (file: string) => readFileSync(file, "utf8");

function xaiPages() {
  return parseXai(
    {
      models: read("snapshots/fixtures/xai/models-2026-10-27.md"),
      pricing: read("snapshots/fixtures/xai/pricing-2026-10-27.md"),
      may15: read("snapshots/fixtures/xai/may-15-2026-10-27.md"),
      nov2: read("snapshots/fixtures/xai/nov-2-2026-10-27.md"),
      releaseNotes: read("snapshots/fixtures/xai/release-notes-2026-10-27.md"),
    },
    "2026-10-27",
  );
}

function coherePages() {
  return parseCohere(
    read("snapshots/fixtures/cohere/deprecations-2026-10-27.md"),
    read("snapshots/fixtures/cohere/models-2026-10-27.md"),
    "2026-10-27",
  );
}

describe("xAI docs", () => {
  it("stores the models page, the May 15 table, the November 2 retirement, and release-note rows", () => {
    const models = xaiPages();
    expect(models).toHaveLength(27);
    expect(models.map((model) => model.id)).not.toContain("grok-4.7-fast");
    const current = models.find((model) => model.id === "grok-4.7");
    expect(current?.status).toBe("active");
    expect(current?.shutdown_date).toBeNull();
    expect(current?.specs.input_price_per_mtok).toBe(2);
    expect(current?.specs.cached_input_price_per_mtok).toBe(0.5);
    expect(current?.specs.output_price_per_mtok).toBe(6);
    expect(current?.specs.context_window_tokens).toBe(500000);
    expect(current?.specs.batch_discount_pct).toBe(20);
    expect(current?.specs.supports_prompt_caching).toBe(true);
    expect(current?.specs.knowledge_cutoff).toBe("May 2026");
    expect(current?.specs.reasoning).toBe("optional");
    expect(current?.specs.modalities_in).toEqual(["text", "image"]);
    expect(current?.specs.modalities_out).toEqual(["text"]);
    expect(current?.specs.max_output_tokens).toBeNull();
    expect(current?.region_or_platform_notes).toContain("200k");
    expect(current?.region_or_platform_notes).toContain("not available on the public xAI API");
    expect(current?.sources[0]?.url).toBe(XAI_MODELS);

    const retired = models.find((model) => model.id === "grok-3");
    expect(retired?.status).toBe("retired");
    expect(retired?.shutdown_date).toBe("2026-05-15");
    expect(retired?.announced_date).toBeNull();
    expect(retired?.replacements.map((item) => item.model_id)).toEqual(["grok-4.3"]);
    expect(retired?.sources[0]?.url).toBe(MAY15_URL);

    const code = models.find((model) => model.id === "grok-code-fast-1");
    expect(code?.replacements.map((item) => item.model_id)).toEqual(["grok-build-0.1"]);
    expect(code?.region_or_platform_notes).toContain("redirect table");

    const pro = models.find((model) => model.id === "grok-imagine-image-pro");
    expect(pro?.replacements.map((item) => item.model_id)).toEqual(["grok-imagine-image-quality"]);
    expect(pro?.region_or_platform_notes).toContain("grok-imagine-image-2.0");
    expect(pro?.specs.input_price_per_mtok).toBeNull();

    const quality = models.find((model) => model.id === "grok-imagine-image-quality");
    expect(quality?.status).toBe("deprecated");
    expect(quality?.shutdown_date).toBe("2026-11-02");
    expect(quality?.announced_date).toBe("2026-09-02");
    expect(quality?.replacements.map((item) => item.model_id)).toEqual(["grok-imagine-image-2.0"]);
    expect(quality?.specs.input_price_per_mtok).toBeNull();
    expect(quality?.specs.batch_discount_pct).toBe(0);
    expect(quality?.sources.some((source) => source.url === NOV2_URL)).toBe(true);

    const image = models.find((model) => model.id === "grok-imagine-image");
    expect(image?.status).toBe("active");
    expect(image?.shutdown_date).toBeNull();
    expect(image?.region_or_platform_notes).toContain("not affected");

    const voice = models.find((model) => model.id === "grok-voice-2.0");
    expect(voice?.status).toBe("deprecated");
    expect(voice?.shutdown_date).toBeNull();
    expect(voice?.replacements.map((item) => item.model_id)).toEqual(["grok-voice-3.0", "grok-voice-latest"]);
    expect(voice?.specs.input_price_per_mtok).toBeNull();
    expect(voice?.specs.modalities_in).toEqual(["audio"]);

    const transcribe = models.find((model) => model.id === "grok-voice-transcribe-1.0");
    expect(transcribe?.status).toBe("retired");
    expect(transcribe?.shutdown_date).toBe("2026-10-02");
    expect(transcribe?.replacements.map((item) => item.model_id)).toEqual(["grok-voice-transcribe-2.0"]);
    expect(transcribe?.sources[0]?.url).toBe(RELEASE_URL);
    expect(transcribe?.specs.input_price_per_mtok).toBeNull();

    const build = models.find((model) => model.id === "grok-build-0.1");
    expect(build?.specs.input_price_per_mtok).toBe(1);
    expect(build?.specs.context_window_tokens).toBe(256000);
    expect(build?.specs.supports_batch).toBeNull();
    expect(build?.region_or_platform_notes).toContain("no batch discount");
    expect(parseXai({ models: "", pricing: "", may15: "", nov2: "", releaseNotes: "" }, "2026-10-27")).toEqual([]);
    expect(JSON.stringify(models)).not.toMatch(/[—–]/);
  });
});

describe("Cohere docs", () => {
  it("stores deprecations and live model rows without invented prices or replacements", () => {
    const models = coherePages();
    expect(models).toHaveLength(49);
    const command = models.find((model) => model.id === "command-r-03-2024");
    expect(command?.status).toBe("deprecated");
    expect(command?.deprecation_date).toBe("2025-09-15");
    expect(command?.shutdown_date).toBeNull();
    expect(command?.replacements.map((item) => item.model_id)).toEqual([
      "command-r-08-2024",
      "command-r-plus-08-2024",
      "command-a-03-2025",
    ]);
    expect(command?.region_or_platform_notes).toContain("2025-03-08");
    expect(command?.region_or_platform_notes).toContain("not the base model shutdown");
    expect(command?.specs.supports_tools).toBe(true);
    expect(command?.specs.input_price_per_mtok).toBeNull();
    expect(command?.sources[0]?.url).toBe(COHERE_DEPRECATIONS);

    const summarize = models.find((model) => model.id === "summarize");
    expect(summarize?.status).toBe("deprecated");
    expect(summarize?.shutdown_date).toBeNull();
    expect(summarize?.replacements).toEqual([]);
    expect(summarize?.region_or_platform_notes).toContain("does not name one replacement model id");

    const embed = models.find((model) => model.id === "embed-english-v2.0");
    expect(embed?.status).toBe("retired");
    expect(embed?.shutdown_date).toBe("2026-04-04");
    expect(embed?.replacements.map((item) => item.model_id)).toEqual([
      "embed-english-v3.0",
      "embed-multilingual-v3.0",
      "embed-v4.0",
    ]);

    const aya = models.find((model) => model.id === "c4ai-aya-expanse-8b");
    expect(aya?.status).toBe("retired");
    expect(aya?.replacements.map((item) => item.model_id)).toEqual([
      "command-r7b-12-2024",
      "command-a-03-2025",
      "command-a-reasoning-08-2025",
    ]);

    const rerank = models.find((model) => model.id === "rerank-english-v2.0");
    expect(rerank?.shutdown_date).toBe("2025-04-30");
    expect(rerank?.announced_date).toBe("2024-12-02");
    expect(rerank?.replacements.map((item) => item.model_id)).toEqual(["rerank-v3.5"]);
    expect(rerank?.specs.input_price_per_mtok).toBeNull();
    expect(rerank?.region_or_platform_notes).toContain("1K searches");

    const v4 = models.find((model) => model.id === "rerank-v4.0-pro");
    expect(v4?.status).toBe("active");
    expect(v4?.replacements).toEqual([]);
    expect(v4?.region_or_platform_notes).toContain("not stored as a deprecation replacement");

    const live = models.find((model) => model.id === "command-a-03-2025");
    expect(live?.status).toBe("active");
    expect(live?.shutdown_date).toBeNull();
    expect(live?.specs.context_window_tokens).toBe(256000);
    expect(live?.specs.max_output_tokens).toBe(8000);
    expect(live?.sources[0]?.url).toBe(COHERE_MODELS);

    expect(models.find((model) => model.id === "embed-english-v3.0")?.specs.context_window_tokens).toBe(512);
    expect(models.find((model) => model.id === "command-nightly")?.status).toBe("active");
    expect(models.find((model) => model.id === "command-light-nightly")?.shutdown_date).toBeNull();
    expect(models.some((model) => model.id.startsWith("cohere."))).toBe(false);
    expect(models.some((model) => model.id.includes("classify"))).toBe(false);
    expect(parseCohere("", "", "2026-10-27")).toEqual([]);
    expect(JSON.stringify(models)).not.toMatch(/[—–]/);
  });
});

describe("xAI and Cohere refresh guard", () => {
  it("puts omitted official rows back and fails a silent wipe", async () => {
    const models = await loadModels();
    const xai = models.filter((model) => model.provider === "xai");
    const cohere = models.filter((model) => model.provider === "cohere");
    expect(xai).toHaveLength(27);
    expect(cohere).toHaveLength(49);
    for (const model of [...xai, ...cohere]) {
      expect(modelSchema.parse(model)).toBeTruthy();
      expect(model.sources.length).toBeGreaterThan(0);
      expect(model.sources.every((source) => source.excerpt.length > 0 && source.excerpt.length <= 300)).toBe(true);
    }
    const dropped = new Set(["xai:grok-3", "xai:grok-imagine-image-quality", "cohere:command"]);
    const scraped = models.filter((model) => !dropped.has(`${model.provider}:${model.id}`));
    const kept = carryForwardDocumentedModels(models, scraped, "2026-10-27");
    expect(kept.find((model) => model.id === "grok-3" && model.provider === "xai")?.status).toBe("retired");
    expect(kept.find((model) => model.id === "grok-imagine-image-quality")?.shutdown_date).toBe("2026-11-02");
    expect(kept.find((model) => model.provider === "cohere" && model.id === "command")?.status).toBe("deprecated");
    expect(sanityCheck("xai", 0, xai.length).ok).toBe(false);
    expect(sanityCheck("cohere", Math.floor(cohere.length * 0.69), cohere.length).ok).toBe(false);
    expect(sanityCheck("xai", xai.length, xai.length).ok).toBe(true);
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("parseXai");
    expect(run).toContain("parseCohere");
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toEqual(expect.arrayContaining(["xai", "cohere"]));
  });

  it("builds migrations that only change the model field and have no bearer token", async () => {
    const models = (await loadModels()).map((model) => modelSchema.parse(model));
    const grok3 = models.find((model) => model.provider === "xai" && model.id === "grok-3");
    const grok43 = models.find((model) => model.provider === "xai" && model.id === "grok-4.3");
    const quality = models.find((model) => model.provider === "xai" && model.id === "grok-imagine-image-quality");
    const image2 = models.find((model) => model.provider === "xai" && model.id === "grok-imagine-image-2.0");
    const voice = models.find((model) => model.provider === "xai" && model.id === "grok-voice-2.0");
    const voice3 = models.find((model) => model.provider === "xai" && model.id === "grok-voice-3.0");
    const stt = models.find((model) => model.provider === "xai" && model.id === "grok-voice-transcribe-1.0");
    const stt2 = models.find((model) => model.provider === "xai" && model.id === "grok-voice-transcribe-2.0");
    const command = models.find((model) => model.provider === "cohere" && model.id === "command");
    const commandA = models.find((model) => model.provider === "cohere" && model.id === "command-a-03-2025");
    const embed = models.find((model) => model.provider === "cohere" && model.id === "embed-english-v2.0");
    const embedV4 = models.find((model) => model.provider === "cohere" && model.id === "embed-v4.0");
    const rerank = models.find((model) => model.provider === "cohere" && model.id === "rerank-english-v2.0");
    const rerankNext = models.find((model) => model.provider === "cohere" && model.id === "rerank-v3.5");
    if (!grok3 || !grok43 || !quality || !image2 || !voice || !voice3 || !stt || !stt2 || !command || !commandA || !embed || !embedV4 || !rerank || !rerankNext) {
      throw new Error("missing pair");
    }
    const text = buildMigration(grok3, grok43, "2026-10-27");
    expect(text.code_change.snippets.curl.after).toContain("https://api.x.ai/v1/responses");
    expect(text.code_change.snippets.curl.after).toContain("grok-4.3");
    expect(text.code_change.snippets.python.after).toContain('base_url="https://api.x.ai/v1"');
    expect(text.migration_checklist.join(" ")).toContain("Ship the change before the published shutdown date.");
    const image = buildMigration(quality, image2, "2026-10-27");
    expect(image.code_change.snippets.curl.after).toContain("https://api.x.ai/v1/images/generations");
    const speech = buildMigration(voice, voice3, "2026-10-27");
    expect(speech.code_change.snippets.curl.after).toContain("wss://api.x.ai/v1/realtime?model=grok-voice-3.0");
    expect(speech.migration_checklist.join(" ")).not.toContain("Ship the change before the published shutdown date.");
    const audio = buildMigration(stt, stt2, "2026-10-27");
    expect(audio.code_change.snippets.curl.after).toContain("https://api.x.ai/v1/stt");
    const chat = buildMigration(command, commandA, "2026-10-27");
    expect(chat.code_change.snippets.curl.after).toContain("https://api.cohere.com/v2/chat");
    expect(chat.migration_checklist.join(" ")).not.toContain("Ship the change before the published shutdown date.");
    expect(buildMigration(embed, embedV4, "2026-10-27").code_change.snippets.curl.after).toContain("https://api.cohere.com/v2/embed");
    expect(buildMigration(rerank, rerankNext, "2026-10-27").code_change.snippets.curl.after).toContain("https://api.cohere.com/v2/rerank");
    const blob = JSON.stringify([text, image, speech, audio, chat]);
    expect(blob).not.toContain("Bearer");
    expect(blob).not.toMatch(/api_key|apiKey|YOUR_API_KEY/);
    expect(blob).not.toMatch(/[—–]/);

    const providers = await loadProviders();
    const xai = providers.find((provider) => provider.id === "xai");
    const graph = modelGraph("https://sunsetdiff.com", grok3, xai!, text, models);
    expect(JSON.stringify(graph)).toContain(MAY15_URL);
    const textLlms = llmsTxt("https://sunsetdiff.com", providers, [], {
      xaiPages: models.filter((model) => model.provider === "xai"),
      coherePages: models.filter((model) => model.provider === "cohere"),
    });
    expect(textLlms).toContain("/providers/xai/");
    expect(textLlms).toContain("/providers/cohere/");
    expect(textLlms).toContain("/models/xai/grok-4-7/");
    expect(textLlms).toContain("/models/cohere/command-a-03-2025/");
    expect(sitemapSection("/providers/xai/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/xai/grok-3/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/xai/grok-3/")).toBe("sitemap-replace.xml");
    expect(sitemapSection("/migrate/xai__grok-3__to__xai__grok-4-3/")).toBe("sitemap-migrate.xml");
    expect(lastmodForUrl("https://sunsetdiff.com/models/xai/grok-3/")).toBe("2026-10-27");
    expect(lastmodForUrl("https://sunsetdiff.com/models/cohere/command/")).toBe("2026-10-27");
    expect(lastmodForUrl("https://sunsetdiff.com/providers/xai/")).toBe("2026-10-27");
  });
});
