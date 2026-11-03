import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carryForwardDocumentedModels } from "../scrapers/carry.ts";
import {
  DEPRECATION_QUOTE,
  MODEL_SCHEMA_URL,
  MODELS_DOC_URL,
  MODELS_URL,
  REMOVAL_QUOTE,
  openRouterDecision,
  parseOpenRouter,
  perMillionTokens,
} from "../scrapers/openrouter.ts";
import { GATE_EXEMPT } from "../scrapers/sanity.ts";
import { modelSchema } from "../src/schema.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";

const checked = "2026-10-28";
const body = readFileSync("snapshots/fixtures/openrouter/models-2026-10-28.json", "utf8");
const docs = {
  guide: readFileSync("snapshots/fixtures/openrouter/guide-2026-10-28.txt", "utf8"),
  schemaDoc: readFileSync("snapshots/fixtures/openrouter/schema-2026-10-28.txt", "utf8"),
};

function parsed() {
  const models = parseOpenRouter(body, docs, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

describe("OpenRouter models API", () => {
  it("stores only rows with a real expiration_date", () => {
    const models = parsed();
    expect(models).toHaveLength(17);
    expect(models.some((model) => model.id === "recursive/flint-v1.0:free")).toBe(false);
    expect(models.some((model) => model.id === "openai/gpt-6.1-sol")).toBe(false);
    expect(docs.guide).toContain(DEPRECATION_QUOTE);
    expect(docs.schemaDoc).toContain(REMOVAL_QUOTE);
    for (const model of models) {
      expect(model.provider).toBe("openrouter");
      expect(model.status).toBe("deprecated");
      expect(model.shutdown_date_kind).toBe("not_before");
      expect(model.deprecation_date).toBe(model.shutdown_date);
      expect(model.replacements).toEqual([]);
      expect(model.announced_date).toBeNull();
      expect(model.sources.map((source) => source.url)).toEqual([MODELS_URL, MODELS_DOC_URL, MODEL_SCHEMA_URL]);
      expect(body).toContain(`"id":"${model.id}"`);
      expect(body).toContain(`"expiration_date":"${model.shutdown_date}"`);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
  });

  it("keeps the free Laguna date from the API and does not invent a replacement", () => {
    const free = parsed().find((model) => model.id === "poolside/laguna-s-2.1:free");
    const paid = parsed().find((model) => model.id === "poolside/laguna-s-2.1");
    expect(free?.slug).toBe("poolside-laguna-s-2-1-free");
    expect(free?.display_name).toBe("Poolside: Laguna S 2.1 (free)");
    expect(free?.deprecation_date).toBe("2026-10-31");
    expect(free?.shutdown_date).toBe("2026-10-31");
    expect(free?.specs.input_price_per_mtok).toBe(0);
    expect(free?.specs.output_price_per_mtok).toBe(0);
    expect(free?.specs.context_window_tokens).toBe(262144);
    expect(free?.specs.max_output_tokens).toBe(32768);
    expect(free?.specs.supports_tools).toBe(true);
    expect(free?.specs.supports_vision).toBe(false);
    expect(free?.specs.reasoning).toBe("optional");
    expect(free?.region_or_platform_notes).toContain("may be removed");
    expect(free?.region_or_platform_notes).toContain("does not name a replacement");
    expect(paid?.specs.input_price_per_mtok).toBe(0.09);
    expect(paid?.specs.output_price_per_mtok).toBe(0.18);
    expect(paid?.specs.cached_input_price_per_mtok).toBe(0.009);
    expect(paid?.specs.context_window_tokens).toBe(1048576);
    expect(paid?.specs.supports_prompt_caching).toBe(true);
  });

  it("does not treat non-text prices as per-million-token prices", () => {
    const models = parsed();
    const voice = models.find((model) => model.id === "heygen/heygen-voice-1-turbo:free");
    const transcribe = models.find((model) => model.id === "microsoft/mai-transcribe-1.5");
    const video = models.find((model) => model.id === "bytedance/seedance-1-5-pro");
    expect(voice?.deprecation_date).toBe("2026-11-30");
    expect(voice?.specs.input_price_per_mtok).toBeNull();
    expect(voice?.specs.modalities_out).toBeNull();
    expect(voice?.specs.context_window_tokens).toBe(0);
    expect(voice?.region_or_platform_notes).toContain("speech");
    expect(transcribe?.specs.input_price_per_mtok).toBeNull();
    expect(transcribe?.specs.modalities_in).toEqual(["audio"]);
    expect(transcribe?.region_or_platform_notes).toContain("prompt 0.36");
    expect(video?.specs.modalities_out).toEqual(["video"]);
    expect(video?.specs.input_price_per_mtok).toBeNull();
    const glm = models.find((model) => model.id === "z-ai/glm-4.5");
    expect(glm?.specs.knowledge_cutoff).toBe("2024-12-31");
    expect(glm?.deprecation_date).toBe("2026-12-31");
  });

  it("rejects a bad body and a date that is not a calendar day", () => {
    expect(parseOpenRouter("not json", docs, checked)).toBeNull();
    expect(parseOpenRouter("{}", docs, checked)).toBeNull();
    const payload = JSON.parse(body) as { data: Record<string, unknown>[]; total_count: number; links: { next: string | null } };
    payload.total_count = payload.data.length + 1;
    expect(parseOpenRouter(JSON.stringify(payload), docs, checked)).toBeNull();
    payload.total_count = payload.data.length;
    payload.links.next = "/api/v1/models?offset=500";
    expect(parseOpenRouter(JSON.stringify(payload), docs, checked)).toBeNull();
    payload.links.next = null;
    payload.data.push({ id: "example/not-a-day", name: "Nope", expiration_date: "2026-02-31" });
    payload.data.push({ id: "example/empty", name: "Empty", expiration_date: null });
    payload.data.push(payload.data.find((row) => row.id === "poolside/laguna-s-2.1:free"));
    payload.total_count = payload.data.length;
    const models = parseOpenRouter(JSON.stringify(payload), docs, checked);
    expect(models?.some((model) => model.id === "example/not-a-day")).toBe(false);
    expect(models?.some((model) => model.id === "example/empty")).toBe(false);
    expect(models?.filter((model) => model.id === "poolside/laguna-s-2.1:free")).toHaveLength(1);
    expect(perMillionTokens("0.00000009")).toBe(0.09);
    expect(perMillionTokens("0")).toBe(0);
    expect(perMillionTokens("0.36")).toBe(360000);
  });

  it("keeps stored rows when a drop is not explained by a past expiration date", () => {
    const previous = [
      { id: "poolside/laguna-s-2.1:free", deprecation_date: "2026-10-31", shutdown_date: "2026-10-31" },
      { id: "z-ai/glm-4.5", deprecation_date: "2026-12-31", shutdown_date: "2026-12-31" },
    ];
    expect(openRouterDecision(null, previous, checked)).toBe("keep");
    expect(openRouterDecision([], previous, checked)).toBe("keep");
    expect(openRouterDecision([{ id: "z-ai/glm-4.5" }], previous, checked)).toBe("keep");
    expect(openRouterDecision([{ id: "poolside/laguna-s-2.1:free" }, { id: "z-ai/glm-4.5" }], previous, checked)).toBe("use");
    const expired = previous.map((row) => ({ ...row, deprecation_date: "2026-10-01", shutdown_date: "2026-10-01" }));
    expect(openRouterDecision([], expired, checked)).toBe("use");
    expect(openRouterDecision(null, [], checked)).toBe("keep");
    expect(openRouterDecision([{ id: "z-ai/glm-4.5" }], [], checked)).toBe("use");

    const kept = carryForwardDocumentedModels(
      [
        {
          id: "old/gone",
          provider: "openrouter",
          status: "deprecated",
          shutdown_date: "2026-10-01",
          shutdown_date_kind: "not_before",
          sources: [{ url: MODELS_URL, label: "OpenRouter models API" }],
        },
      ],
      [],
      checked,
    );
    expect(kept.map((model) => model.id)).toEqual(["old/gone"]);
    const dropped = carryForwardDocumentedModels(
      [
        {
          id: "future/still",
          provider: "openrouter",
          status: "deprecated",
          shutdown_date: "2026-12-31",
          shutdown_date_kind: "not_before",
          sources: [{ url: MODELS_URL, label: "OpenRouter models API" }],
        },
      ],
      [],
      checked,
    );
    expect(dropped).toEqual([]);

    const sameDay = carryForwardDocumentedModels(
      [
        {
          id: "nousresearch/hermes-3-llama-3.1-70b",
          provider: "openrouter",
          status: "deprecated",
          shutdown_date: "2026-11-02",
          shutdown_date_kind: "not_before",
          sources: [{ url: MODELS_URL, label: "OpenRouter models API" }],
        },
      ],
      [],
      "2026-11-02",
    );
    expect(sameDay).toMatchObject([
      {
        id: "nousresearch/hermes-3-llama-3.1-70b",
        status: "deprecated",
        shutdown_date: "2026-11-02",
      },
    ]);
  });

  it("keeps a new expiration when an older id leaves the list on its expiration day", () => {
    const checkedDay = "2026-11-02";
    const previous = [
      { id: "nousresearch/hermes-3-llama-3.1-70b", deprecation_date: "2026-11-02", shutdown_date: "2026-11-02" },
      { id: "nousresearch/hermes-3-llama-3.1-405b", deprecation_date: "2026-11-02", shutdown_date: "2026-11-02" },
      { id: "x-ai/grok-imagine-image-quality", deprecation_date: "2026-11-02", shutdown_date: "2026-11-02" },
      { id: "z-ai/glm-4.5", deprecation_date: "2026-12-31", shutdown_date: "2026-12-31" },
    ];
    const next = [
      { id: "z-ai/glm-4.5" },
      { id: "thinkingmachines/inkling:free" },
      { id: "thinkingmachines/inkling-small:free" },
    ];
    expect(openRouterDecision(next, previous, checkedDay)).toBe("use");
    expect(openRouterDecision(next.filter((row) => row.id !== "z-ai/glm-4.5"), previous, checkedDay)).toBe("keep");

    const payload = {
      data: [
        inklingRow("thinkingmachines/inkling:free", "thinkingmachines/inkling-20260715", "Thinking Machines: Inkling (free)"),
        inklingRow(
          "thinkingmachines/inkling-small:free",
          "thinkingmachines/inkling-small-20260730",
          "Thinking Machines: Inkling Small (free)",
        ),
        { id: "thinkingmachines/inkling", name: "Thinking Machines: Inkling", expiration_date: null },
      ],
      total_count: 3,
      links: { next: null },
    };
    const models = parseOpenRouter(JSON.stringify(payload), docs, "2026-11-03");
    expect(models?.map((model) => model.id)).toEqual([
      "thinkingmachines/inkling-small:free",
      "thinkingmachines/inkling:free",
    ]);
    for (const model of models ?? []) {
      expect(model.status).toBe("deprecated");
      expect(model.deprecation_date).toBe("2026-11-04");
      expect(model.shutdown_date).toBe("2026-11-04");
      expect(model.shutdown_date_kind).toBe("not_before");
      expect(model.replacements).toEqual([]);
      expect(model.sources[0]).toMatchObject({ url: MODELS_URL, label: "OpenRouter models API" });
      expect(model.sources.map((source) => source.url)).toEqual([MODELS_URL, MODELS_DOC_URL, MODEL_SCHEMA_URL]);
    }
  });
});

function inklingRow(id: string, canonical: string, name: string) {
  return {
    id,
    canonical_slug: canonical,
    name,
    expiration_date: "2026-11-04",
    context_length: 1048576,
    architecture: { input_modalities: ["text", "image", "audio"], output_modalities: ["text"] },
    pricing: { prompt: "0", completion: "0" },
    top_provider: { max_completion_tokens: 262144 },
    supported_parameters: ["tools", "reasoning"],
    reasoning: { mandatory: false },
  };
}

describe("OpenRouter records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("openrouter");
    const models = (await loadModels()).filter((model) => model.provider === "openrouter");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      openrouterPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    const inkling = models.find((model) => model.id === "thinkingmachines/inkling:free");
    const small = models.find((model) => model.id === "thinkingmachines/inkling-small:free");
    expect(inkling?.shutdown_date).toBe("2026-11-04");
    expect(small?.shutdown_date).toBe("2026-11-04");
    expect(inkling?.shutdown_date_kind).toBe("not_before");
    expect(small?.shutdown_date_kind).toBe("not_before");
    expect(inkling?.sources[0]?.url).toBe(MODELS_URL);
    expect(small?.sources[0]?.url).toBe(MODELS_URL);
    expect(text).toContain("/providers/openrouter/");
    expect(text).toContain("/models/openrouter/poolside-laguna-s-2-1-free/");
    expect(text).toContain("/models/openrouter/thinkingmachines-inkling-free/");
    expect(text).toContain("/models/openrouter/thinkingmachines-inkling-small-free/");
    expect(sitemapSection("/providers/openrouter/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/openrouter/thinkingmachines-inkling-free/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/models/openrouter/thinkingmachines-inkling-small-free/")).toBe("sitemap-models.xml");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("OpenRouter models API could not be read. Stored OpenRouter rows stay.");
    expect(run).toContain("applyProviderGate");
    expect(GATE_EXEMPT.has("openrouter")).toBe(true);
  });
});
