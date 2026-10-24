import { describe, expect, it } from "vitest";
import { questionGraph } from "../src/jsonld.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { loadChanges, loadModels, loadProviders } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";
import {
  changelogDocument,
  deadlineWindow,
  deprecationsCsv,
  deprecationsFeed,
  deprecatedAnswer,
  deprecatedFaqs,
  escapeRegex,
  isRetiring,
  retiringIdPattern,
  retiringIds,
  shutdownMonths,
  topRetiringModels,
} from "../src/lib/growth.ts";

const day = "2026-10-18";

describe("growth pages", () => {
  it("ranks 40 retiring models from published shutdown dates", async () => {
    const models = await loadModels();
    const top = topRetiringModels(models, day, 40);
    expect(top).toHaveLength(40);
    for (const model of top) {
      expect(isRetiring(model)).toBe(true);
      expect(model.shutdown_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const months = shutdownMonths(models);
    expect(months.length).toBeGreaterThan(0);
    for (const month of months) expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("escapes model ids in the scan pattern and leaves blanks empty", async () => {
    const models = await loadModels();
    const dotted = retiringIds(models).find((id) => id.includes("."));
    expect(dotted).toBeTruthy();
    const pattern = retiringIdPattern(models);
    expect(pattern.startsWith("\\b(?:")).toBe(true);
    expect(pattern.endsWith(")\\b")).toBe(true);
    expect(pattern).toContain(escapeRegex(dotted!));
    expect(pattern.includes(dotted!)).toBe(false);

    const blank = stub();
    const csv = deprecationsCsv([blank]);
    const cells = csv.trim().split("\n")[1].split(",");
    expect(cells[5]).toBe('""');
    expect(cells[6]).toBe('""');
    expect(cells[7]).toBe('"2026-12-01"');
  });

  it("answers with the recorded status and shutdown date", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const model = topRetiringModels(models, day, 40)[0];
    const provider = providers.find((item) => item.id === model.provider);
    expect(provider).toBeTruthy();
    const answer = deprecatedAnswer(model, provider!);
    expect(answer).toContain(model.status);
    expect(answer).toContain(model.shutdown_date!);
    expect(answer).not.toContain("2099-01-01");
    const faqs = deprecatedFaqs(model, provider!);
    const graph = questionGraph("https://sunsetdiff.com/", model, provider!, "deprecated");
    const faq = graph.find((node) => node["@type"] === "FAQPage") as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(faqs[0].answer);
    expect(faq.mainEntity[0].name).toBe(faqs[0].question);
  });

  it("keeps not-sooner-than dates out of the deadline window and feed items on recorded values", async () => {
    const floor = stub();
    floor.shutdown_date_kind = "not_before";
    expect(deadlineWindow([floor], day, 365)).toHaveLength(0);
    const changes = await loadChanges();
    const sample = changes.find((change) => change.field === "shutdown_date" || change.field === "status");
    expect(sample).toBeTruthy();
    const feed = deprecationsFeed([sample!], [], "https://sunsetdiff.com");
    expect(feed).toContain(JSON.stringify(sample!.new).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    expect(feed).toContain("https://sunsetdiff.com/feed.xml");
    const changelog = changelogDocument(changes);
    expect(changelog.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(changelog.publisher).toBe("SunsetDiff");
    expect(changelog.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lists the new pages in llms.txt", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const months = shutdownMonths(models);
    const questions = topRetiringModels(models, day, 40);
    const text = llmsTxt("https://sunsetdiff.com", providers, [], { months, questions });
    expect(text).toContain("/deadlines/");
    expect(text).toContain("/deadlines.ics");
    expect(text).toContain("/feed.xml");
    expect(text).toContain("/scan/");
    expect(text).toContain("/questions/");
    expect(text).toContain("/data/models.json");
    expect(text).toContain("/data/deprecations.csv");
    expect(text).toContain("/data/changelog.json");
    expect(text).toContain(`/deadlines/${months[0]}/`);
    expect(text).toContain(`/questions/${questions[0].provider}/${questions[0].slug}/deprecated/`);
    expect(text).toContain(`/questions/${questions[0].provider}/${questions[0].slug}/shutdown-date/`);
    const full = llmsFull("https://sunsetdiff.com", models.slice(0, 1));
    expect(full).toContain("/data/models.json");
    expect(full).toContain("/feed.xml");
  });
});

function stub(): ModelRecord {
  return modelSchema.parse({
    id: "gpt-3.5-turbo",
    slug: "gpt-3-5-turbo",
    provider: "openai",
    display_name: "GPT-3.5 Turbo",
    family: null,
    status: "deprecated",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: "2026-12-01",
    shutdown_date_kind: "exact",
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
