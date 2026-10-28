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
import { modelSchema } from "../src/schema.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";

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
  });
});

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
    expect(text).toContain("/providers/openrouter/");
    expect(text).toContain("/models/openrouter/poolside-laguna-s-2-1-free/");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("OpenRouter models API could not be read. Stored OpenRouter rows stay.");
    expect(run).toContain("if (provider === \"openrouter\") continue;");
  });
});
