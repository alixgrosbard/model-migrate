import { describe, expect, it } from "vitest";
import { datasetGraph, shutdownEventGraph } from "../src/jsonld.ts";
import { deprecationsFeed } from "../src/lib/growth.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";
import { visibleName } from "../src/lib/format.ts";
import {
  batchExtras,
  batchLead,
  isPastShutdown,
  openAiIdGroups,
  orderShutdownEvents,
  publishedReplacementIds,
  replacementLinks,
  shutdownEventDescription,
  shutdownEventFaqs,
  shutdownEventLead,
  shutdownEventPath,
  shutdownEventTitle,
  shutdownEvents,
} from "../src/lib/shutdowns.ts";

const day = "2026-10-19";

describe("shutdown batches", () => {
  it("groups an exact provider date only when at least three models share it", () => {
    const lone = [stub("openai", "gpt-4", "2026-10-23"), stub("openai", "gpt-4-turbo", "2026-10-23")];
    expect(shutdownEvents(lone)).toHaveLength(0);
    const batch = [
      ...lone,
      stub("openai", "o1", "2026-10-23", "gpt-5.6-sol"),
      stub("anthropic", "claude-3", "2026-10-23"),
      stub("openai", "floor-a", "2026-10-23"),
    ];
    batch[4].shutdown_date_kind = "not_before";
    const monthOnly = stub("openai", "month-a", "2026-10-01");
    monthOnly.shutdown_date_kind = "month_only";
    const events = shutdownEvents([...batch, monthOnly, stub("openai", "other", "2026-11-01"), stub("openai", "other-b", "2026-11-01")]);
    expect(events.map((event) => event.slug)).toEqual(["openai-2026-10-23"]);
    expect(events[0].models.map((model) => model.id)).toEqual(["gpt-4", "gpt-4-turbo", "o1"]);
    expect(publishedReplacementIds(events[0].models[2])).toEqual(["gpt-5.6-sol"]);
    expect(publishedReplacementIds(events[0].models[0])).toEqual([]);
  });

  it("matches every exact batch in the published dataset and ignores smaller groups", async () => {
    const models = await loadModels();
    const events = shutdownEvents(models);
    const expected = new Map<string, number>();
    for (const model of models) {
      if (model.shutdown_date_kind !== "exact" || !model.shutdown_date) continue;
      const key = `${model.provider}|${model.shutdown_date}`;
      expected.set(key, (expected.get(key) ?? 0) + 1);
    }
    const keys = [...expected.entries()].filter(([, count]) => count >= 3).map(([key]) => key).sort();
    expect(events.map((event) => `${event.provider}|${event.date}`).sort()).toEqual(keys);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.models.length).toBeGreaterThanOrEqual(3);
      expect(event.models.every((model) => model.shutdown_date === event.date && model.shutdown_date_kind === "exact")).toBe(true);
      expect(new Set(event.models.map((model) => model.provider))).toEqual(new Set([event.provider]));
    }
  });

  it("uses future wording before the date and past wording after it", () => {
    const event = shutdownEvents([
      stub("openai", "gpt-4", "2026-10-23", "gpt-5.6-sol"),
      stub("openai", "gpt-4-turbo", "2026-10-23", "gpt-5.6-sol"),
      stub("openai", "gpt-3.5-turbo", "2026-10-23"),
    ])[0];
    const futureLead = shutdownEventLead("OpenAI", event, day);
    const pastLead = shutdownEventLead("OpenAI", event, "2026-10-24");
    expect(shutdownEventTitle("OpenAI", event, day)).toBe("OpenAI models shutting down October 23, 2026");
    expect(shutdownEventTitle("OpenAI", event, "2026-10-24")).toBe("OpenAI models shut down on October 23, 2026");
    expect(futureLead).toContain("shuts down 3 models on October 23, 2026");
    expect(futureLead).toContain("gpt-4");
    expect(futureLead).toContain("The official replacement is gpt-5.6-sol where one is published.");
    expect(futureLead).toContain("1 model has no published replacement.");
    expect(futureLead).toContain("Requests to these models start failing on that date.");
    expect(pastLead).toContain("OpenAI shut down 3 models on October 23, 2026");
    expect(pastLead).toContain("Requests to these models started failing on that date.");
    expect(futureLead).not.toMatch(/[—–]/);
    expect(pastLead).not.toMatch(/[—–]/);
    expect(isPastShutdown(event.date, day)).toBe(false);
    expect(isPastShutdown(event.date, "2026-10-23")).toBe(false);
    expect(isPastShutdown(event.date, "2026-10-24")).toBe(true);
    const futureFaqs = shutdownEventFaqs("OpenAI", event, day);
    const pastFaqs = shutdownEventFaqs("OpenAI", event, "2026-10-24");
    expect(futureFaqs[0].question).toBe("Which OpenAI models are shutting down on October 23, 2026?");
    expect(pastFaqs[0].question).toBe("Which OpenAI models shut down on October 23, 2026?");
    expect(pastFaqs[2].answer).toContain("shut down on October 23, 2026");
    expect(futureFaqs.map((item) => `${item.question} ${item.answer}`).join(" ")).not.toContain("shut down on");
    expect(visibleName({ display_name: "| (gpt-4)", id: "gpt-4" })).toBe("gpt-4");
    expect(shutdownEventDescription("OpenAI", event, day).length).toBeLessThanOrEqual(160);
    const ordered = orderShutdownEvents(
      shutdownEvents([
        ...event.models,
        stub("openai", "old-a", "2026-01-04"),
        stub("openai", "old-b", "2026-01-04"),
        stub("openai", "old-c", "2026-01-04"),
      ]),
      day,
    );
    expect(ordered.map((item) => item.date)).toEqual(["2026-10-23", "2026-01-04"]);
  });

  it("describes the OpenAI October 23 batch as model IDs and keeps Bedrock regions", async () => {
    const models = await loadModels();
    const events = shutdownEvents(models);
    const openai = events.find((event) => event.slug === "openai-2026-10-23");
    const bedrock = events.find((event) => event.slug === "aws-bedrock-2026-11-13");
    const vertex = events.find((event) => event.slug === "google-vertex-2026-10-20");
    expect(openai).toBeTruthy();
    expect(bedrock).toBeTruthy();
    expect(vertex).toBeTruthy();
    const openaiExtras = batchExtras(openai!);
    const lead = batchLead("OpenAI", openai!, day);
    expect(openaiExtras.headline).toContain("model IDs");
    expect(lead).toContain("snapshots, aliases, and fine-tunes");
    expect(lead).toContain("start failing");
    expect(lead).not.toContain("shut down on");
    const grouped = openAiIdGroups(openai!.models).flatMap((group) => [group.snapshot, ...group.aliases, ...group.fineTunes]);
    expect(new Set(grouped)).toEqual(new Set(openai!.models.map((model) => model.id)));
    const bedrockExtras = batchExtras(bedrock!);
    expect(bedrockExtras.note).toContain("eu-central-2");
    expect(bedrockExtras.note).toContain("sa-east-1");
    expect(bedrockExtras.note).toContain("ca-central-1");
    expect(bedrockExtras.note).toContain("September 10, 2026");
    expect(bedrockExtras.note).not.toContain("shut down on");
    expect(bedrockExtras.showRegions).toBe(true);
    const vertexExtras = batchExtras(vertex!);
    expect(vertexExtras.note).toContain("Verified");
    expect(vertexExtras.note).toContain("October 20, 2026");
    expect(`${vertexExtras.note} ${vertexExtras.faqs.map((item) => item.answer).join(" ")}`).not.toMatch(/[—–]/);
  });

  it("links a migrate page only when that migration was published", () => {
    const model = stub("openai", "gpt-4", "2026-10-23", "gpt-5.6-sol");
    model.replacements.push({
      model_id: "editorial-model",
      provider: "openai",
      kind: "editorial",
      source_url: "https://developers.openai.com/api/docs/deprecations",
    });
    const target = stub("openai", "gpt-5.6-sol", "2027-01-01");
    const links = replacementLinks(model, [model, target], [
      {
        from: { provider: "openai", model_id: "gpt-4", slug: "gpt-4" },
        to: { provider: "openai", model_id: "gpt-5.6-sol", slug: "gpt-5-6-sol" },
      } as never,
    ]);
    expect(links).toEqual([
      {
        id: "gpt-5.6-sol",
        modelPath: "/models/openai/gpt-5-6-sol/",
        migratePath: "/migrate/openai__gpt-4__to__openai__gpt-5-6-sol/",
      },
    ]);
  });

  it("puts the pages in llms.txt, the feed, sitemap lastmod, and dataset JSON-LD", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const events = orderShutdownEvents(shutdownEvents(models), day);
    expect(events.length).toBeGreaterThan(0);
    const sample = events[0];
    const name = providers.find((provider) => provider.id === sample.provider)!.name;
    const path = shutdownEventPath(sample);
    const title = shutdownEventTitle(name, sample, day);
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      shutdowns: events.map((event) => ({
        title: shutdownEventTitle(providers.find((provider) => provider.id === event.provider)!.name, event, day),
        path: shutdownEventPath(event),
      })),
    });
    expect(text).toContain("/shutdowns/");
    expect(text).toContain(path);
    expect(text).toContain(title);
    expect(llmsFull("https://sunsetdiff.com", models.slice(0, 1))).toContain("/shutdowns/");
    const feed = deprecationsFeed([], models, "https://sunsetdiff.com", [
      {
        title,
        link: `https://sunsetdiff.com${path}`,
        guid: `https://sunsetdiff.com${path}`,
        pubDate: "2026-10-18",
        description: shutdownEventLead(name, sample, day),
      },
    ]);
    expect(feed).toContain(`https://sunsetdiff.com${path}`);
    expect(feed).toContain(title);
    expect(feed).not.toContain("—");
    const faqs = shutdownEventFaqs(name, sample, day);
    const graph = shutdownEventGraph("https://sunsetdiff.com/", title, "desc", path, "2026-10-01", "2026-10-18", ["https://example.com/source"], faqs);
    expect(graph.map((node) => node["@type"])).toEqual(["Article", "FAQPage"]);
    const faq = graph[1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity[0].name).toBe(faqs[0].question);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(faqs[0].answer);
    const dataset = datasetGraph("https://sunsetdiff.com/", "2026-10-18")[0] as {
      license: string;
      sameAs: string;
      distribution: { encodingFormat: string; contentUrl: string }[];
    };
    expect(dataset.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(dataset.sameAs).toBe("https://huggingface.co/datasets/sunsetdiff/ai-model-deprecations");
    const downloads = dataset.distribution.map((item) => `${item.encodingFormat} ${item.contentUrl}`);
    expect(downloads).toContain("application/json https://sunsetdiff.com/dataset/sunsetdiff.json");
    expect(downloads).toContain("text/csv https://sunsetdiff.com/dataset/sunsetdiff.csv");
    expect(lastmodForUrl(`https://sunsetdiff.com${path}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl("https://sunsetdiff.com/shutdowns/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

function stub(provider: ModelRecord["provider"], id: string, date: string, replacement?: string): ModelRecord {
  return modelSchema.parse({
    id,
    slug: id.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(),
    provider,
    display_name: id,
    family: null,
    status: "deprecated",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: date,
    shutdown_date_kind: "exact",
    region_or_platform_notes: null,
    replacements: replacement
      ? [{ model_id: replacement, provider, kind: "official", source_url: "https://developers.openai.com/api/docs/deprecations" }]
      : [],
    sources: [{ url: "https://developers.openai.com/api/docs/deprecations", label: "OpenAI", last_checked: "2026-10-18", excerpt: "example" }],
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
    updated_at: "2026-10-18T00:00:00.000Z",
  });
}
