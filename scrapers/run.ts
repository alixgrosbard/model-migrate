import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { changeSchema, modelSchema, type ChangeRecord, type ModelRecord, type Provider } from "../src/schema.ts";
import { emptySpecs } from "../src/schema.ts";
import { nowISO, todayISO } from "./lib/dates.ts";
import { politeFetch, readSnapshot, saveSnapshot } from "./lib/fetch.ts";
import { missingAliasModels } from "../src/lib/aliases.ts";
import { carryForwardDocumentedModels } from "./carry.ts";
import { slugify } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";
import { applyAnthropicOverview, parseAnthropic, parseAnthropicPricing, priceForAnthropicId, PRICING_URL as ANTHROPIC_PRICING } from "./anthropic.ts";
import { DEPRECATIONS_URL as ANTHROPIC_URL } from "./anthropic.ts";
import { parseAzure, POLICY_URL as AZURE_POLICY, SCHEDULE_URL as AZURE_SCHEDULE } from "./azure-openai.ts";
import { LEGACY_URL as AWS_LEGACY, parseBedrock, POLICY_URL as AWS_POLICY } from "./aws-bedrock.ts";
import { DEPRECATIONS_URL as GEMINI_URL, parseGemini, parseGeminiPricing, PRICING_URL as GEMINI_PRICING } from "./google-gemini-api.ts";
import { DEPRECATIONS_URL as VERTEX_URL, parseVertex } from "./google-vertex.ts";
import { MODELS_URL as MISTRAL_URL, parseMistral, PRICING_URL as MISTRAL_PRICING } from "./mistral.ts";
import { NEWS_URL as DEEPSEEK_NEWS, PRICING_URL as DEEPSEEK_PRICING, UPDATES_URL as DEEPSEEK_UPDATES, parseDeepSeek } from "./deepseek.ts";
import { DEPRECATIONS_URL as OPENAI_URL, parseOpenAI, parseOpenAIPricing, PRICING_URL as OPENAI_PRICING } from "./openai.ts";
import { addDocumentedOpenAIModels, applyCodexPlatformNotes, OPENAI_MODELS_INDEX_URL } from "./openai-catalog.ts";
import { canonicalizeModel, realContentKey, recordIdentity } from "../src/lib/stable-export.ts";
import { writeMigrations } from "./write-migrations.ts";
import { sanityCheck } from "./sanity.ts";
import { enrichSpecs } from "./enrich.ts";

const root = process.cwd();
const fromSnapshots = process.argv.includes("--from-snapshots");
const checked = todayISO();
const stamped = nowISO();

async function main() {
  const providers = JSON.parse(await readFile(path.join(root, "data/providers.json"), "utf8")) as Provider[];
  const previous = await readModels();
  const previousCounts = new Map<string, number>();
  for (const model of previous) previousCounts.set(model.provider, (previousCounts.get(model.provider) ?? 0) + 1);

  const scraped = await scrapeAll();
  const failures: string[] = [];
  for (const [provider, models] of scraped) {
    const result = sanityCheck(provider, models.length, previousCounts.get(provider) ?? 0);
    if (!result.ok && result.reason) failures.push(result.reason);
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
    return;
  }

  const merged = merge(previous, scraped, stamped, checked);
  validate(merged.models);
  await writeModels(merged.models);
  await writeMigrations(merged.models, checked);
  await writeChanges(merged.changes);
  console.log(`Wrote ${merged.models.length} models and ${merged.changeCount} new change rows.`);
}

async function loadOpenAIModelIndex(): Promise<string> {
  const fixture = path.join(root, "snapshots/fixtures/openai/models-2026-10-26.md");
  if (!fromSnapshots) {
    try {
      const body = await politeFetch(OPENAI_MODELS_INDEX_URL);
      await mkdir(path.join(root, "snapshots", "openai"), { recursive: true });
      await writeFile(path.join(root, "snapshots", "openai", `models-index-${checked}.md`), body);
      return body;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
  try {
    return await readFile(fixture, "utf8");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return "";
  }
}

async function loadText(url: string, snapshot: string, provider: string, suffix = ""): Promise<string> {
  if (fromSnapshots) return readSnapshot(path.join(root, snapshot));
  const body = await politeFetch(url);
  const ext = snapshot.endsWith(".md") ? "" : suffix;
  if (!snapshot.endsWith(".md")) await saveSnapshot(provider, body, checked, ext);
  else {
    const { mkdir: mk, writeFile: wf } = await import("node:fs/promises");
    await mk(path.join(root, "snapshots", provider), { recursive: true });
    await wf(path.join(root, "snapshots", provider, `pricing-${checked}.md`), body);
  }
  return body;
}

async function scrapeAll(): Promise<Map<string, ScrapedModel[]>> {
  const openaiHtml = await loadText(OPENAI_URL, "snapshots/fixtures/openai/2026-10-17.html", "openai");
  const openaiPricing = await loadText(OPENAI_PRICING, "snapshots/fixtures/openai/pricing-2026-10-17.md", "openai");
  const anthropicHtml = await loadText(ANTHROPIC_URL, "snapshots/fixtures/anthropic/2026-10-17.html", "anthropic");
  const anthropicPricing = await loadText(ANTHROPIC_PRICING, "snapshots/fixtures/anthropic/pricing-2026-10-17.html", "anthropic", "-pricing");
  const anthropicModels = await loadText(
    "https://platform.claude.com/docs/en/about-claude/models/overview",
    "snapshots/fixtures/anthropic/models-2026-10-17.html",
    "anthropic",
    "-models",
  );
  const geminiHtml = await loadText(GEMINI_URL, "snapshots/fixtures/google-gemini-api/2026-10-17.html", "google-gemini-api");
  const geminiPricing = await loadText(GEMINI_PRICING, "snapshots/fixtures/google-gemini-api/pricing-2026-10-17.html", "google-gemini-api", "-pricing");
  const vertexHtml = await loadText(VERTEX_URL, "snapshots/fixtures/google-vertex/2026-10-17.html", "google-vertex");
  const awsHtml = await loadText(AWS_LEGACY, "snapshots/fixtures/aws-bedrock/2026-10-17-legacy.html", "aws-bedrock", "-legacy");
  if (!fromSnapshots) {
    const policy = await politeFetch(AWS_POLICY);
    await saveSnapshot("aws-bedrock", policy, checked);
  }
  const azureSchedule = await loadText(AZURE_SCHEDULE, "snapshots/fixtures/azure-openai/2026-10-17-schedule.html", "azure-openai", "-schedule");
  const azurePolicy = await loadText(AZURE_POLICY, "snapshots/fixtures/azure-openai/2026-10-17.html", "azure-openai");
  const mistralHtml = await loadText(MISTRAL_URL, "snapshots/fixtures/mistral/2026-10-17.html", "mistral");
  const mistralPricing = await loadText(MISTRAL_PRICING, "snapshots/fixtures/mistral/pricing-2026-10-17.html", "mistral", "-pricing");
  const deepseekUpdates = await loadText(DEEPSEEK_UPDATES, "snapshots/fixtures/deepseek/updates-2026-10-25.html", "deepseek");
  const deepseekPricing = await loadText(DEEPSEEK_PRICING, "snapshots/fixtures/deepseek/pricing-2026-10-25.html", "deepseek", "-pricing");
  const deepseekNews = await loadText(DEEPSEEK_NEWS, "snapshots/fixtures/deepseek/news-2026-04-24.html", "deepseek", "-news");

  const openai = parseOpenAI(openaiHtml, openaiPricing, checked);
  const anthropic = parseAnthropic(anthropicHtml, anthropicPricing, checked);
  applyAnthropicOverview(anthropic, anthropicModels, checked);
  const gemini = parseGemini(geminiHtml, geminiPricing, checked);
  const vertex = parseVertex(vertexHtml, checked);
  const aws = parseBedrock(awsHtml, checked);
  const azure = parseAzure(azureSchedule, azurePolicy, checked);
  const mistral = parseMistral(mistralHtml, mistralPricing, checked);
  const deepseek = parseDeepSeek(deepseekUpdates, deepseekPricing, deepseekNews, checked);

  const groups = new Map<string, ScrapedModel[]>([
    ["openai", openai],
    ["anthropic", anthropic],
    ["google-gemini-api", gemini],
    ["google-vertex", vertex],
    ["aws-bedrock", aws],
    ["azure-openai", azure],
    ["mistral", mistral],
    ["deepseek", deepseek],
  ]);
  addReplacementStubs(groups, checked);
  attachStubPrices(groups, openaiPricing, anthropicPricing, geminiPricing, checked);
  // The deprecations tables skip ids that have no shutdown row. The models
  // index is the list that names them. Add those ids to this array before
  // enrichSpecs copies it, or the copy cannot put them in the group merge writes.
  const openaiModels = groups.get("openai");
  if (openaiModels) {
    const index = await loadOpenAIModelIndex();
    addDocumentedOpenAIModels(openaiModels, index, checked);
    applyCodexPlatformNotes(openaiModels, checked);
  }
  if (!fromSnapshots) {
    const flat = [...groups.values()].flat();
    await enrichSpecs(flat, checked);
  }
  // A dated snapshot starts with only its deprecations row. The model-doc
  // page that names the undated alias is attached by enrichSpecs. Building
  // the alias before that page is attached drops it, and the next refresh
  // deletes the saved alias record.
  addUndatedAliasStubs(groups, checked);
  return groups;
}

function addReplacementStubs(groups: Map<string, ScrapedModel[]>, checkedOn: string) {
  for (const models of groups.values()) {
    const ids = new Set(models.map((model) => model.id));
    for (const model of [...models]) {
      for (const replacement of model.replacements) {
        if (replacement.provider !== model.provider || ids.has(replacement.model_id)) continue;
        ids.add(replacement.model_id);
        models.push(
          baseModel({
            id: replacement.model_id,
            provider: model.provider,
            status: "active",
            kind: "none",
            sourceUrl: replacement.source_url,
            sourceLabel: "Named as an official replacement",
            checked: checkedOn,
            excerpt: `Named as an official replacement for ${model.id}. No shutdown date was published for this id on that page.`,
          }),
        );
      }
    }
  }
}

function addUndatedAliasStubs(groups: Map<string, ScrapedModel[]>, checkedOn: string) {
  const now = `${checkedOn}T00:00:00.000Z`;
  for (const [provider, list] of groups) {
    const present = new Set(list.map((model) => model.id));
    const added = missingAliasModels(
      list.map((model) => ({ ...model, slug: model.slug || slugify(model.id) })),
      now,
    ).filter((model) => model.provider === provider && !present.has(model.id));
    for (const model of added) {
      const { first_seen, updated_at, ...scraped } = model;
      void first_seen;
      void updated_at;
      list.push(scraped);
    }
  }
}

function attachStubPrices(
  groups: Map<string, ScrapedModel[]>,
  openaiPricing: string,
  anthropicPricing: string,
  geminiPricing: string,
  checkedOn: string,
) {
  const openaiPrices = parseOpenAIPricing(openaiPricing);
  for (const model of groups.get("openai") ?? []) {
    const price = openaiPrices.get(model.id);
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, "https://developers.openai.com/api/docs/pricing", checkedOn);
  }
  const anthropicPrices = parseAnthropicPricing(anthropicPricing);
  for (const model of groups.get("anthropic") ?? []) {
    if (model.specs.input_price_per_mtok != null) continue;
    const price = priceForAnthropicId(model.id, anthropicPrices);
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, ANTHROPIC_PRICING, checkedOn);
  }
  const geminiPrices = parseGeminiPricing(geminiPricing);
  for (const model of groups.get("google-gemini-api") ?? []) {
    const price = geminiPrices.get(model.id);
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, GEMINI_PRICING, checkedOn);
  }
}

function merge(
  previous: ModelRecord[],
  scraped: Map<string, ScrapedModel[]>,
  now: string,
  checkedOn: string,
): { models: ModelRecord[]; changes: ChangeRecord[]; changeCount: number } {
  const changes: ChangeRecord[] = [];
  const models: ModelRecord[] = [];
  const scrapedProviders = new Set(scraped.keys());
  for (const old of previous) {
    if (!scrapedProviders.has(old.provider)) models.push(old);
  }
  for (const [provider, list] of scraped) {
    const previousRows = previous.filter((model) => model.provider === provider);
    const claimed = new Set<ModelRecord>();
    const sorted = [...list].sort(compareScraped);
    const pairs = sorted.map((item) => {
      const old = matchPrevious(item, previousRows, claimed);
      if (old) claimed.add(old);
      return { item, old };
    });
    // A second row with the same id is a separate record (another region schedule
    // or another catalog name). The "-2" suffix is that collision, not a race.
    const slugs = new Set(pairs.flatMap(({ old }) => (old ? [old.slug] : [])));
    for (const { item, old } of pairs) {
      let slug = old?.slug || item.slug || slugify(item.id);
      if (!old) {
        while (slugs.has(slug)) slug = `${slug}-2`;
      }
      slugs.add(slug);
      const record = modelSchema.parse({
        ...item,
        slug,
        specs: old ? preserveSpecs(old.specs, item.specs ?? emptySpecs()) : (item.specs ?? emptySpecs()),
        sources: old ? mergeSources(item.sources, old.sources) : item.sources,
        first_seen: old?.first_seen ?? now,
        updated_at: now,
      });
      if (old && realContentKey(old) === realContentKey(record)) record.updated_at = old.updated_at;
      else if (old) pushChanges(changes, old, record, checkedOn);
      else if (record.shutdown_date) {
        changes.push({
          date: checkedOn,
          provider: record.provider,
          model_id: record.id,
          field: "shutdown_date",
          old: null,
          new: record.shutdown_date,
          source_url: record.sources[0].url,
        });
      }
      models.push(canonicalizeModel(record));
    }
  }
  // gpt-6.1-sol and gpt-6-astra are sourced from model pages, not the deprecations table.
  // A scrape that omits them would delete those records and fail the tests.
  return { models: carryForwardDocumentedModels(previous, models), changes, changeCount: changes.length };
}

function preserveSpecs(old: ModelRecord["specs"], next: ModelRecord["specs"]): ModelRecord["specs"] {
  const merged = { ...next, specs_sources: { ...next.specs_sources } };
  const fields = [
    "input_price_per_mtok",
    "output_price_per_mtok",
    "cached_input_price_per_mtok",
    "context_window_tokens",
    "max_output_tokens",
  ] as const;
  for (const field of fields) {
    if (merged[field] == null && old[field] != null) {
      merged[field] = old[field];
      if (old.specs_sources[field]) merged.specs_sources[field] = old.specs_sources[field];
    }
  }
  if (merged.currency == null && old.currency) merged.currency = old.currency;
  return merged;
}

function mergeSources(next: ModelRecord["sources"], old: ModelRecord["sources"]): ModelRecord["sources"] {
  const urls = new Set(next.map((source) => source.url));
  return [...next, ...old.filter((source) => !urls.has(source.url))];
}

function compareScraped(a: ScrapedModel, b: ScrapedModel): number {
  return (
    a.id.localeCompare(b.id) ||
    a.display_name.localeCompare(b.display_name) ||
    (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") ||
    (a.region_or_platform_notes ?? "").localeCompare(b.region_or_platform_notes ?? "")
  );
}

function matchPrevious(item: ScrapedModel, rows: ModelRecord[], claimed: Set<ModelRecord>): ModelRecord | undefined {
  const identity = recordIdentity(item);
  const exact = rows.find((row) => !claimed.has(row) && recordIdentity(row) === identity);
  if (exact) return exact;
  const sameId = rows.filter((row) => !claimed.has(row) && row.id === item.id);
  if (sameId.length === 1) return sameId[0];
  return undefined;
}

function pushChanges(changes: ChangeRecord[], old: ModelRecord, next: ModelRecord, checkedOn: string) {
  const fields: [string, unknown, unknown][] = [
    ["status", old.status, next.status],
    ["shutdown_date", old.shutdown_date, next.shutdown_date],
    ["deprecation_date", old.deprecation_date, next.deprecation_date],
    ["announced_date", old.announced_date, next.announced_date],
    ["replacements", old.replacements.map((item) => item.model_id).join(","), next.replacements.map((item) => item.model_id).join(",")],
    ["input_price_per_mtok", old.specs.input_price_per_mtok, next.specs.input_price_per_mtok],
    ["output_price_per_mtok", old.specs.output_price_per_mtok, next.specs.output_price_per_mtok],
    ["context_window_tokens", old.specs.context_window_tokens, next.specs.context_window_tokens],
    ["max_output_tokens", old.specs.max_output_tokens, next.specs.max_output_tokens],
  ];
  for (const [field, before, after] of fields) {
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes.push({
      date: checkedOn,
      provider: next.provider,
      model_id: next.id,
      field,
      old: before,
      new: after,
      source_url: next.sources[0].url,
    });
  }
}

function validate(models: ModelRecord[]) {
  for (const model of models) modelSchema.parse(model);
}

async function readModels(): Promise<ModelRecord[]> {
  const dir = path.join(root, "data/models");
  const models: ModelRecord[] = [];
  let providers: string[] = [];
  try {
    providers = await readdir(dir);
  } catch {
    return [];
  }
  for (const provider of providers) {
    const folder = path.join(dir, provider);
    const files = await readdir(folder);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      models.push(modelSchema.parse(JSON.parse(await readFile(path.join(folder, file), "utf8"))));
    }
  }
  return models;
}

async function writeModels(models: ModelRecord[]) {
  const dir = path.join(root, "data/models");
  await rm(dir, { recursive: true, force: true });
  for (const model of models) {
    const folder = path.join(dir, model.provider);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${model.slug}.json`), JSON.stringify(model, null, 2) + "\n");
  }
}

async function writeChanges(changes: ChangeRecord[]) {
  if (!changes.length) return;
  const file = path.join(root, "data/changes.jsonl");
  let existing = "";
  try {
    existing = await readFile(file, "utf8");
  } catch {
    existing = "";
  }
  const lines = changes.map((change) => JSON.stringify(changeSchema.parse(change)));
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  await writeFile(file, existing + prefix + lines.join("\n") + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
