import { describe, expect, it } from "vitest";
import { collectionGraph } from "../src/jsonld.ts";
import { isUpcomingShutdown } from "../src/lib/format.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import {
  HUBS,
  countByStatus,
  migratePairPath,
  migrationsForProvider,
  modelsForProvider,
  nextUpcomingShutdown,
  replacementLinkText,
  statusCountLabel,
} from "../src/lib/hubs.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

describe("section hubs", () => {
  it("gives each hub a unique title, description, and path", () => {
    expect(HUBS.map((hub) => hub.path)).toEqual(["/models/", "/replace/", "/migrate/", "/providers/"]);
    expect(new Set(HUBS.map((hub) => hub.title)).size).toBe(HUBS.length);
    expect(new Set(HUBS.map((hub) => hub.description)).size).toBe(HUBS.length);
    for (const hub of HUBS) {
      expect(hub.title.endsWith("| SunsetDiff")).toBe(true);
      expect(hub.description.length).toBeGreaterThan(40);
      expect(hub.description.length).toBeLessThanOrEqual(160);
      expect(JSON.stringify(hub)).not.toMatch(/[—–]/);
    }
  });

  it("lists the hubs in llms.txt and llms-full.txt", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    for (const hub of HUBS) {
      expect(text).toContain(`](https://sunsetdiff.com${hub.path})`);
      expect(text).toContain(hub.description);
      expect(full).toContain(`${hub.nav}: https://sunsetdiff.com${hub.path}`);
      expect(lastmodForUrl(`https://sunsetdiff.com${hub.path}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("builds collection JSON-LD with one item per child", () => {
    const items = [
      { name: "OpenAI", path: "/providers/openai/" },
      { name: "Anthropic", path: "/providers/anthropic/" },
    ];
    const graph = collectionGraph("https://sunsetdiff.com/", { path: "/providers/", name: "Providers", description: HUBS[3].description }, items);
    expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "ItemList"]);
    const list = graph[1] as { numberOfItems: number; itemListElement: { position: number; url: string }[] };
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement[1].position).toBe(2);
    expect(list.itemListElement[0].url).toBe("https://sunsetdiff.com/providers/openai/");
    expect(JSON.stringify(graph)).not.toMatch(/[—–]/);
  });

  it("counts models and picks the next real shutdown", async () => {
    const floor = stub("floor", "2026-12-01", "not_before");
    const past = stub("past", "2020-01-01", "exact");
    const later = stub("later", "2026-12-01", "exact");
    const soonerB = stub("sooner-b", "2026-11-01", "exact");
    const soonerA = stub("sooner-a", "2026-11-01", "exact");
    const month = stub("month", "2026-10-01", "month_only");
    const day = "2026-10-21";
    const next = nextUpcomingShutdown([floor, past, later, soonerB, soonerA], day);
    expect(next).toMatchObject({ date: "2026-11-01", count: 2, label: "2026-11-01", model: { id: "sooner-a" } });
    expect(next && isUpcomingShutdown(next.model, day)).toBe(true);
    expect(nextUpcomingShutdown([floor, past], day)).toBeNull();
    expect(nextUpcomingShutdown([month], day)?.label).toBe("During 2026-10");
    expect(nextUpcomingShutdown([stub("old-month", "2026-09-01", "month_only")], day)).toBeNull();

    const counts = countByStatus([soonerA, later]);
    soonerA.status = "deprecated";
    later.status = "active";
    expect(statusCountLabel([soonerA, later])).toBe("2 (deprecated 1, legacy 0, retired 0, active 1)");
    expect(counts.active + counts.deprecated).toBe(2);

    const empty = stub("plain", null, "none");
    empty.replacements = [];
    expect(replacementLinkText(empty)).toBe("Not published");
    empty.replacements = [
      { model_id: "gpt-5", provider: "openai", kind: "official", source_url: "https://developers.openai.com/api/docs/deprecations" },
      { model_id: "gpt-4.1", provider: "openai", kind: "editorial", source_url: "https://developers.openai.com/api/docs/deprecations" },
    ];
    expect(replacementLinkText(empty)).toBe("gpt-5 (official), gpt-4.1 (editorial suggestion)");
  });

  it("groups the dataset without dropping records", async () => {
    const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
    const day = new Date().toISOString().slice(0, 10);
    expect(providers.reduce((sum, provider) => sum + modelsForProvider(models, provider.id).length, 0)).toBe(models.length);
    expect(providers.reduce((sum, provider) => sum + migrationsForProvider(migrations, provider.id).length, 0)).toBe(migrations.length);
    for (const provider of providers) {
      const rows = modelsForProvider(models, provider.id);
      const counts = countByStatus(rows);
      expect(counts.active + counts.legacy + counts.deprecated + counts.retired).toBe(rows.length);
      const next = nextUpcomingShutdown(rows, day);
      if (!next) continue;
      expect(next.model.shutdown_date_kind === "exact" || next.model.shutdown_date_kind === "month_only").toBe(true);
      expect(isUpcomingShutdown(next.model, day)).toBe(true);
      expect(rows.filter((model) => model.shutdown_date === next.date && isUpcomingShutdown(model, day)).length).toBe(next.count);
    }
    const sample = migrations[0];
    expect(migratePairPath(sample.from, sample.to)).toBe(
      `/migrate/${sample.from.provider}__${sample.from.slug}__to__${sample.to.provider}__${sample.to.slug}/`,
    );
  });
});

function stub(id: string, date: string | null, kind: ModelRecord["shutdown_date_kind"]): ModelRecord {
  return modelSchema.parse({
    id,
    slug: id,
    provider: "openai",
    display_name: id,
    family: null,
    status: "deprecated",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: date,
    shutdown_date_kind: kind,
    region_or_platform_notes: null,
    replacements: [],
    sources: [{ url: "https://developers.openai.com/api/docs/deprecations", label: "OpenAI", last_checked: "2026-10-17", excerpt: "example" }],
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
    updated_at: "2026-10-17T00:00:00.000Z",
  });
}
