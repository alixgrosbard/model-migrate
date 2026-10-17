import { readFileSync } from "node:fs";
import { mkdtemp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";
import { graph, modelGraph } from "../src/jsonld.ts";
import { answerSentence } from "../src/lib/format.ts";
import { scanRepo, loadModels, type ModelHit } from "../action/src/scan.ts";
import { THANK_YOU, rateLimited, resetRateLimits, validEmail } from "../service/src/subscribe.ts";

describe("migrations and json-ld", () => {
  it("has at least 20 migration files with code snippets", async () => {
    const files = (await readdir("data/migrations")).filter((file) => file.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(20);
    const sample = JSON.parse(await readFile(path.join("data/migrations", files[0]), "utf8"));
    expect(sample.code_change.snippets.python.before).toContain("model");
    expect(sample.code_change.snippets.curl.after.length).toBeGreaterThan(10);
  });

  it("builds FAQ text that matches the visible answer", () => {
    const raw = JSON.parse(readFileSync("data/models/openai/gpt-4o-2024-08-06.json", "utf8"));
    const model = modelSchema.parse(raw);
    const provider = {
      id: model.provider,
      name: "OpenAI",
      deprecations_url: "https://developers.openai.com/api/docs/deprecations",
      pricing_url: "https://developers.openai.com/api/docs/pricing",
      models_url: "https://developers.openai.com/api/docs/models",
    };
    const answer = answerSentence(model, provider);
    const json = graph(modelGraph("https://sunsetdiff.onrender.com/", model, provider));
    const faq = json["@graph"].find((node) => node["@type"] === "FAQPage") as { mainEntity: { acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(answer);
    expect(JSON.stringify(json)).toContain("TechArticle");
    expect(JSON.stringify(json)).toContain("SoftwareApplication");
  });

  it("computes a price diff from published numbers", () => {
    const from = stub("old", 1, 2);
    const to = stub("new", 2, 4);
    const diff = buildMigration(from, to, "2026-10-17");
    expect(diff.price_diff.input_pct_change).toBe(100);
    expect(diff.price_diff.example_monthly_cost_old).toBe(14);
  });
});

describe("action", () => {
  it("flags a deprecated model id in a fixture repo", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "sunsetdiff-"));
    await writeFile(path.join(dir, "app.py"), 'model = "gpt-4o-2024-08-06"\n');
    const models: ModelHit[] = [
      {
        id: "gpt-4o-2024-08-06",
        provider: "openai",
        slug: "gpt-4o-2024-08-06",
        status: "deprecated",
        shutdown_date: "2026-10-23",
        shutdown_date_kind: "exact",
        replacement: "gpt-6-luna",
      },
    ];
    const findings = await scanRepo(dir, models, 60, 14, "**/*.py", "2026-10-17");
    expect(findings[0]?.level).toBe("error");
    expect(findings[0]?.message).toContain("gpt-6-luna");
    const offline = await loadModels("http://127.0.0.1:9/missing.json", models);
    expect(offline[0]?.id).toBe("gpt-4o-2024-08-06");
    await rm(dir, { recursive: true, force: true });
  });
});

describe("newsletter", () => {
  it("validates email, rate limits, and never describes sending mail", () => {
    expect(validEmail("person@example.com")).toBe(true);
    expect(validEmail("nope")).toBe(false);
    resetRateLimits();
    const hash = "ip";
    expect(rateLimited(hash, 0)).toBe(false);
    expect(rateLimited(hash, 1)).toBe(false);
    expect(rateLimited(hash, 2)).toBe(false);
    expect(rateLimited(hash, 3)).toBe(false);
    expect(rateLimited(hash, 4)).toBe(false);
    expect(rateLimited(hash, 5)).toBe(true);
    expect(THANK_YOU).toBe("You're on the list. We'll start sending updates soon.");
  });
});

function stub(id: string, input: number, output: number): ModelRecord {
  return modelSchema.parse({
    id,
    slug: id,
    provider: "openai",
    display_name: id,
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
      input_price_per_mtok: input,
      output_price_per_mtok: output,
      cached_input_price_per_mtok: null,
      batch_discount_pct: null,
      currency: "USD",
      context_window_tokens: 1000,
      max_output_tokens: 100,
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
      specs_sources: {
        input_price_per_mtok: { url: "https://developers.openai.com/api/docs/pricing", last_checked: "2026-10-17" },
        context_window_tokens: { url: "https://developers.openai.com/api/docs/pricing", last_checked: "2026-10-17" },
      },
    },
    first_seen: "2026-10-17T00:00:00.000Z",
    updated_at: "2026-10-17T00:00:00.000Z",
  });
}
