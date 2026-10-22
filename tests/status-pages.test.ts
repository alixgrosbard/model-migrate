import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { ENDPOINTS } from "../src/lib/endpoints.ts";
import { datasetVersion } from "../src/lib/growth.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { loadChanges, loadModels, loadProviders } from "../src/lib/load.ts";
import { OPENAPI_PATH, OPENAPI_SERVER, openApiDocument, openApiPath } from "../src/lib/openapi.ts";
import { shortcutFiles } from "../src/lib/shortcuts.ts";
import { statusHubGraph } from "../src/jsonld.ts";
import {
  buildStatusHub,
  providerStatusPath,
  providerStatusTargets,
  statusLlmsEntries,
} from "../src/lib/status-hubs.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

describe("deprecated and retired hubs", () => {
  it("sorts by shutdown date and keeps only the requested status", async () => {
    const providers = [
      { id: "openai" as const, name: "OpenAI", deprecations_url: "https://developers.openai.com/api/docs/deprecations", pricing_url: "https://developers.openai.com/api/docs/pricing", models_url: "https://developers.openai.com/api/docs/models" },
      { id: "anthropic" as const, name: "Anthropic", deprecations_url: "https://platform.claude.com/docs/en/about-claude/model-deprecations", pricing_url: "https://platform.claude.com/docs/en/about-claude/pricing", models_url: "https://platform.claude.com/docs/en/about-claude/models/overview" },
    ];
    const later = stub("later", "openai", "2026-12-01");
    const sooner = stub("sooner", "openai", "2026-11-01");
    const undated = stub("undated", "anthropic", null);
    undated.shutdown_date_kind = "none";
    const retired = stub("gone", "openai", "2024-01-01");
    retired.status = "retired";
    const active = stub("live", "openai", null);
    active.status = "active";
    const page = buildStatusHub({
      kind: "deprecated",
      models: [later, undated, sooner, retired, active],
      providers,
      version: "2026-10-22",
      day: "2026-10-22",
    });
    expect(page.count).toBe(3);
    expect(page.groups.map((group) => group.provider.id)).toEqual(["openai", "anthropic"]);
    expect(page.groups[0].rows.map((row) => row.model.id)).toEqual(["sooner", "later"]);
    expect(page.groups[1].rows.map((row) => row.model.id)).toEqual(["undated"]);
    expect(page.intro).toContain("Last updated 2026-10-22");
    expect(page.intro).toContain("None of these records has an exact shutdown date before 2026-10-22.");
    expect(page.faqs.map((faq) => faq.question)).toContain("How many AI models are deprecated?");
    expect(page.faqs.map((faq) => faq.question)).toContain("Which provider has the most deprecated models?");
    expect(JSON.stringify(page.faqs)).not.toMatch(/[—–]/);
    expect(page.intro).not.toMatch(/[—–]/);
    const graph = statusHubGraph("https://sunsetdiff.com/", page);
    expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "ItemList", "FAQPage"]);
    const list = graph[1] as { numberOfItems: number };
    expect(list.numberOfItems).toBe(3);
  });

  it("matches the dataset and stays out of the shortcut list", async () => {
    const [models, providers, changes] = await Promise.all([loadModels(), loadProviders(), loadChanges()]);
    const version = datasetVersion(changes);
    const deprecated = buildStatusHub({ kind: "deprecated", models, providers, version, day: "2026-10-22" });
    const retired = buildStatusHub({ kind: "retired", models, providers, version, day: "2026-10-22" });
    expect(deprecated.count).toBe(models.filter((model) => model.status === "deprecated").length);
    expect(retired.count).toBe(models.filter((model) => model.status === "retired").length);
    expect(deprecated.count).toBeGreaterThan(0);
    expect(retired.count).toBeGreaterThan(0);
    expect(deprecated.items).toHaveLength(deprecated.count);
    expect(providerStatusTargets(models).some((target) => target.provider === "aws-bedrock" && target.status === "deprecated")).toBe(false);
    expect(providerStatusTargets(models).some((target) => target.provider === "openai" && target.status === "deprecated")).toBe(true);
    const openai = buildStatusHub({
      kind: "deprecated",
      providerId: "openai",
      models,
      providers,
      version,
      day: "2026-10-22",
    });
    expect(openai.path).toBe(providerStatusPath("openai", "deprecated"));
    expect(openai.crumbs.map((crumb) => crumb.name)).toEqual(["Home", "Providers", "OpenAI", "Deprecated"]);
    expect(openai.intro).toContain("https://developers.openai.com/api/docs/deprecations");
    for (const page of [deprecated, retired, openai]) {
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(160);
      expect(`${page.title} ${page.description} ${page.intro} ${page.faqs.map((faq) => faq.question + faq.answer).join(" ")}`).not.toMatch(/[—–]/);
    }
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      statusPages: statusLlmsEntries(models, providers).filter((page) => page.path.startsWith("/providers/")),
    });
    const full = llmsFull("https://sunsetdiff.com", models, providers);
    expect(text).toContain("https://sunsetdiff.com/deprecated/");
    expect(text).toContain("https://sunsetdiff.com/retired/");
    expect(text).toContain("https://sunsetdiff.com/openapi.json");
    expect(text).toContain(providerStatusPath("openai", "deprecated"));
    expect(full).toContain("https://sunsetdiff.com/openapi.json");
    expect(full).toContain(`https://sunsetdiff.com${providerStatusPath("openai", "retired")}`);
    expect(lastmodForUrl("https://sunsetdiff.com/deprecated/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl("https://sunsetdiff.com/retired/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl(`https://sunsetdiff.com${OPENAPI_PATH}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl(`https://sunsetdiff.com${providerStatusPath("openai", "deprecated")}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("provider shortcuts", () => {
  it("refreshes each provider id to its provider page", async () => {
    const providers = await loadProviders();
    const files = shortcutFiles("https://sunsetdiff.com", providers);
    expect(files.map((file) => file.slug).sort()).toEqual(providers.map((provider) => provider.id).sort());
    const openai = files.find((file) => file.slug === "openai");
    expect(openai?.html).toContain('rel="canonical" href="https://sunsetdiff.com/providers/openai/"');
    expect(openai?.html).toContain('http-equiv="refresh" content="0; url=/providers/openai/"');
    expect(openai?.html).not.toMatch(/[—–]/);
    expect(files.some((file) => file.slug === "google")).toBe(false);
  });
});

describe("openapi", () => {
  it("describes every documented static file and validates as OpenAPI 3.1", async () => {
    const version = datasetVersion(await loadChanges());
    const doc = openApiDocument(version);
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers).toEqual([{ url: OPENAPI_SERVER, description: "SunsetDiff" }]);
    expect(doc.security).toEqual([]);
    expect(JSON.stringify(doc)).not.toMatch(/securitySchemes/);
    expect(JSON.stringify(doc)).not.toMatch(/[—–]/);
    expect(Object.keys(doc.paths).sort()).toEqual(ENDPOINTS.map((endpoint) => openApiPath(endpoint.path)).sort());
    for (const endpoint of ENDPOINTS) {
      const item = doc.paths[openApiPath(endpoint.path)] as { get: { security: []; responses: { "200": { content: Record<string, unknown> } } } };
      expect(item.get.security).toEqual([]);
      expect(item.get.responses["200"].content[endpoint.format]).toBeTruthy();
    }
    const lookup = openApiPath("/api/v1/lookup/<model-id>.json");
    expect(lookup).toBe("/api/v1/lookup/{model-id}.json");
    await SwaggerParser.validate(doc as never);
  });
});

function stub(id: string, provider: ModelRecord["provider"], date: string | null): ModelRecord {
  return modelSchema.parse({
    id,
    slug: id,
    provider,
    display_name: id,
    family: null,
    status: "deprecated",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: date,
    shutdown_date_kind: date ? "exact" : "none",
    region_or_platform_notes: null,
    replacements: [],
    sources: [{ url: "https://developers.openai.com/api/docs/deprecations", label: "OpenAI", last_checked: "2026-10-22", excerpt: "example" }],
    specs: {
      input_price_per_mtok: null,
      output_price_per_mtok: null,
      cached_input_price_per_mtok: null,
      batch_discount_pct: null,
      currency: null,
      context_window_tokens: null,
      max_output_tokens: null,
      modalities_in: null,
      modalities_out: null,
      supports_tools: null,
      supports_json_schema: null,
      supports_vision: null,
      supports_streaming: null,
      supports_batch: null,
      supports_prompt_caching: null,
      reasoning: null,
      knowledge_cutoff: null,
      endpoints: null,
      specs_sources: {},
    },
    first_seen: "2026-10-17T00:00:00.000Z",
    updated_at: "2026-10-22T00:00:00.000Z",
  });
}
