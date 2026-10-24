import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord, Specs } from "../src/schema.ts";
import { modelSchema, changeSchema, type ChangeRecord } from "../src/schema.ts";
import { excerpt } from "./lib/html.ts";
import { newestRollingName, politeFetch } from "./lib/fetch.ts";
import { todayISO, nowISO } from "./lib/dates.ts";
import { parseGeminiPricing, PRICING_URL as GEMINI_PRICING } from "./google-gemini-api.ts";
import { writeMigrations } from "./write-migrations.ts";
import {
  normalizeName,
  parseAnthropicModelDoc,
  parseGeminiModelDocs,
  parseMistralModelDoc,
  parseOpenAIModelDoc,
  parseVertexModelDoc,
  parseVertexPricing,
  type PublishedSpec,
} from "./docs.ts";

type SpecModel = Pick<ModelRecord, "id" | "provider" | "specs" | "sources">;

const root = process.cwd();

export async function enrichSpecs(models: SpecModel[], checked = todayISO()): Promise<number> {
  let filled = await applySavedGeminiPrices(models, checked);
  const jobs: Array<() => Promise<number>> = [
    () => enrichOpenAI(models, checked),
    () => enrichGeminiDocs(models, checked),
    () => enrichVertex(models, checked),
    () => enrichAnthropic(models, checked),
    () => enrichMistral(models, checked),
  ];
  for (const job of jobs) {
    try {
      filled += await job();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
  return filled;
}

async function readSavedPage(provider: string, suffix: string, fixtureFile: string): Promise<string | null> {
  const dir = path.join(root, "snapshots", provider);
  try {
    const name = newestRollingName(await readdir(dir), suffix);
    if (name) return await readFile(path.join(dir, name), "utf8");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  try {
    return await readFile(path.join(root, "snapshots", "fixtures", provider, fixtureFile), "utf8");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}

export async function applySavedGeminiPrices(models: SpecModel[], checked: string): Promise<number> {
  try {
    const html = await readSavedPage("google-gemini-api", "-pricing", "pricing-2026-10-17.html");
    if (!html) return 0;
    const prices = parseGeminiPricing(html);
    let filled = 0;
    for (const model of models) {
      if (model.provider !== "google-gemini-api") continue;
      const price = prices.get(model.id);
      if (!price) continue;
      filled += fill(model, {
        input: price.input,
        output: price.output,
        cached: price.cached,
        context: price.context,
        maxOutput: null,
      }, GEMINI_PRICING, "Gemini API pricing", checked, excerpt([model.id, "Standard pricing"]));
    }
    return filled;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 0;
  }
}

async function enrichOpenAI(models: SpecModel[], checked: string): Promise<number> {
  const index = await fetchText("https://developers.openai.com/api/docs/models.md");
  const urls = new Set<string>();
  if (index) {
    for (const match of index.matchAll(/\]\((\/api\/docs\/models\/[^)\s]+\.md)\)/g)) {
      urls.add(new URL(match[1], "https://developers.openai.com").href);
    }
  }
  for (const model of models) {
    if (model.provider !== "openai") continue;
    if (model.specs.context_window_tokens != null && model.specs.max_output_tokens != null && model.specs.input_price_per_mtok != null) continue;
    urls.add(`https://developers.openai.com/api/docs/models/${encodeURIComponent(model.id)}.md`);
  }
  return applyDocs(models, "openai", [...urls], checked, "OpenAI model docs", parseOpenAIModelDoc);
}

async function enrichGeminiDocs(models: SpecModel[], checked: string): Promise<number> {
  const index = await fetchText("https://ai.google.dev/gemini-api/docs/models?hl=en");
  const urls = new Set<string>();
  if (index) {
    for (const match of index.matchAll(/href="(\/gemini-api\/docs\/models\/[^"#?]+)"/g)) {
      urls.add(`https://ai.google.dev${match[1]}?hl=en`);
    }
  }
  for (const model of models) {
    if (model.provider !== "google-gemini-api") continue;
    if (model.specs.context_window_tokens != null && model.specs.max_output_tokens != null) continue;
    urls.add(`https://ai.google.dev/gemini-api/docs/models/${encodeURIComponent(model.id)}?hl=en`);
  }
  let filled = 0;
  await mapPool([...urls], 4, async (url) => {
    const html = await fetchText(url);
    if (!html) return;
    for (const spec of parseGeminiModelDocs(html)) {
      filled += applyToIds(models, "google-gemini-api", spec, url.split("?")[0], "Gemini model docs", checked);
    }
  });
  return filled;
}

async function enrichVertex(models: SpecModel[], checked: string): Promise<number> {
  const urls = new Set<string>();
  try {
    const html = await readSavedPage("google-vertex", "", "2026-10-17.html");
    if (html) for (const match of html.matchAll(/href="(\/gemini-enterprise-agent-platform\/models\/gemini\/[^"#?]+)"/g)) {
      urls.add(`https://docs.cloud.google.com${match[1]}?hl=en`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  const docs = new Map<string, { title: string; context: number | null; maxOutput: number | null; excerpt: string; url: string }>();
  await mapPool([...urls], 3, async (url) => {
    const html = await fetchText(url);
    if (!html) return;
    const doc = parseVertexModelDoc(html);
    if (!doc) return;
    docs.set(doc.id, { ...doc, url: url.split("?")[0] });
  });
  let filled = 0;
  for (const model of models) {
    if (model.provider !== "google-vertex") continue;
    const doc = docs.get(model.id);
    if (!doc) continue;
    filled += fill(model, { input: null, output: null, cached: null, context: doc.context, maxOutput: doc.maxOutput }, doc.url, "Vertex model docs", checked, doc.excerpt);
  }
  const pricing = await fetchText("https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing");
  if (pricing) {
    const prices = parseVertexPricing(pricing);
    const url = "https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing";
    for (const doc of docs.values()) {
      const price = prices.get(normalizeName(doc.title));
      if (!price) continue;
      const model = models.find((item) => item.provider === "google-vertex" && item.id === doc.id);
      if (!model) continue;
      filled += fill(model, { input: price.input, output: price.output, cached: price.cached, context: null, maxOutput: null }, url, "Vertex pricing", checked, price.excerpt || doc.excerpt);
    }
  } else {
    console.error("Vertex pricing page was not fetched. Prices stay blank.");
  }
  return filled;
}

async function enrichAnthropic(models: SpecModel[], checked: string): Promise<number> {
  const slugs = new Set<string>();
  const pages = [
    readSavedPage("anthropic", "", "2026-10-17.html"),
    readSavedPage("anthropic", "-pricing", "pricing-2026-10-17.html"),
    readSavedPage("anthropic", "-models", "models-2026-10-17.html"),
  ];
  for (const html of await Promise.all(pages)) {
    if (!html) continue;
    for (const match of html.matchAll(/\/docs\/en\/models\/([a-z0-9-]+)\//g)) slugs.add(match[1]);
  }
  for (const skip of ["overview", "migration-guide", "choosing-a-model", "model-ids-and-versions", "optimizing-for-cost-and-intelligence"]) {
    slugs.delete(skip);
  }
  const urls = [...slugs].map((slug) => `https://platform.claude.com/docs/en/models/${slug}/overview.md`);
  return applyDocs(models, "anthropic", urls, checked, "Anthropic model docs", parseAnthropicModelDoc);
}

async function enrichMistral(models: SpecModel[], checked: string): Promise<number> {
  const urls = new Set<string>();
  try {
    const html = await readSavedPage("mistral", "", "2026-10-17.html");
    if (html) {
      for (const match of html.matchAll(/href=\\"(\/models\/[a-z0-9-]+)\\"/g)) urls.add(`https://docs.mistral.ai${match[1]}`);
      for (const match of html.matchAll(/href="(\/models\/[a-z0-9-]+)"/g)) urls.add(`https://docs.mistral.ai${match[1]}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  let filled = 0;
  await mapPool([...urls], 3, async (url) => {
    const html = await fetchText(url);
    if (!html) return;
    const doc = parseMistralModelDoc(html);
    if (!doc) return;
    for (const model of models) {
      if (model.provider !== "mistral" || model.id !== doc.id) continue;
      filled += fill(model, { input: null, output: null, cached: null, context: doc.context, maxOutput: null }, url, "Mistral model docs", checked, doc.excerpt);
    }
  });
  return filled;
}

async function applyDocs(
  models: SpecModel[],
  provider: string,
  urls: string[],
  checked: string,
  label: string,
  parse: (body: string) => PublishedSpec | null,
): Promise<number> {
  let filled = 0;
  await mapPool(urls, 4, async (url) => {
    const body = await fetchText(url);
    if (!body) return;
    const spec = parse(body);
    if (!spec) return;
    const clean = url.split("?")[0];
    filled += applyToIds(models, provider, spec, clean, label, checked);
    for (const id of spec.limitIds) {
      const model = models.find((item) => item.provider === provider && item.id === id);
      if (!model) continue;
      filled += fill(
        model,
        { input: null, output: null, cached: null, context: spec.context, maxOutput: spec.maxOutput },
        clean,
        label,
        checked,
        excerpt([spec.excerpt, `Default snapshot ${id}`]),
      );
    }
  });
  console.log(`${label}: checked ${urls.length} pages`);
  return filled;
}

function applyToIds(models: SpecModel[], provider: string, spec: PublishedSpec, url: string, label: string, checked: string): number {
  let filled = 0;
  for (const id of spec.ids) {
    const model = models.find((item) => item.provider === provider && item.id === id);
    if (!model) continue;
    filled += fill(model, spec, url, label, checked, spec.excerpt);
  }
  return filled;
}

function fill(
  model: SpecModel,
  spec: { input: number | null; output: number | null; cached: number | null; context: number | null; maxOutput: number | null },
  url: string,
  label: string,
  checked: string,
  note: string,
): number {
  const pairs: [keyof Specs, number | null][] = [
    ["input_price_per_mtok", spec.input],
    ["output_price_per_mtok", spec.output],
    ["cached_input_price_per_mtok", spec.cached],
    ["context_window_tokens", spec.context],
    ["max_output_tokens", spec.maxOutput],
  ];
  let filled = 0;
  for (const [field, value] of pairs) {
    if (value == null || model.specs[field] != null) continue;
    (model.specs[field] as number | null) = value;
    model.specs.specs_sources[field] = { url, last_checked: checked };
    if (field.endsWith("price_per_mtok")) model.specs.currency = "USD";
    filled += 1;
  }
  if (filled && !model.sources.some((source) => source.url === url)) {
    model.sources.push({ url, label, last_checked: checked, excerpt: excerpt([note]) });
  }
  return filled;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    return await politeFetch(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("HTTP 404")) console.error(`skip ${url}: ${message}`);
    return null;
  }
}

async function mapPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function main() {
  const checked = todayISO();
  const stamped = nowISO();
  const models = await readModels();
  const before = new Map(models.map((model) => [`${model.provider}:${model.id}`, JSON.stringify(model.specs)]));
  const filled = await enrichSpecs(models, checked);
  const changes: ChangeRecord[] = [];
  for (const model of models) {
    const key = `${model.provider}:${model.id}`;
    if (before.get(key) === JSON.stringify(model.specs)) continue;
    model.updated_at = stamped;
    const old = JSON.parse(before.get(key) ?? "{}") as Specs;
    for (const field of ["input_price_per_mtok", "output_price_per_mtok", "context_window_tokens", "max_output_tokens"] as const) {
      if (JSON.stringify(old[field]) === JSON.stringify(model.specs[field])) continue;
      changes.push({
        date: checked,
        provider: model.provider,
        model_id: model.id,
        field,
        old: old[field],
        new: model.specs[field],
        source_url: model.specs.specs_sources[field]?.url ?? model.sources.at(-1)?.url ?? model.sources[0].url,
      });
    }
    modelSchema.parse(model);
  }
  await writeModels(models);
  await writeMigrations(models, checked);
  if (changes.length) {
    const file = path.join(root, "data/changes.jsonl");
    const existing = await readFile(file, "utf8").catch(() => "");
    const lines = changes.map((change) => JSON.stringify(changeSchema.parse(change)));
    const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
    await writeFile(file, existing + prefix + lines.join("\n") + "\n");
  }
  console.log(`Filled ${filled} spec fields. Logged ${changes.length} changes.`);
}

async function readModels(): Promise<ModelRecord[]> {
  const dir = path.join(root, "data/models");
  const models: ModelRecord[] = [];
  for (const provider of await readdir(dir)) {
    const folder = path.join(dir, provider);
    for (const file of await readdir(folder)) {
      if (!file.endsWith(".json")) continue;
      models.push(modelSchema.parse(JSON.parse(await readFile(path.join(folder, file), "utf8"))));
    }
  }
  return models;
}

async function writeModels(models: ModelRecord[]) {
  for (const model of models) {
    const folder = path.join(root, "data/models", model.provider);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${model.slug}.json`), JSON.stringify(model, null, 2) + "\n");
  }
}

const calledDirectly = process.argv[1] && path.resolve(process.argv[1]).includes(`${path.sep}enrich.ts`);
if (calledDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
