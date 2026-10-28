import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptySpecs, type Specs } from "../src/schema.ts";

type Modality = "text" | "image" | "audio" | "video" | "pdf";
import { politeFetch } from "./lib/fetch.ts";
import { excerpt } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Full catalog. The default list omits models whose output is not text. */
export const MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=all";
/** Field table that calls expiration_date the deprecation date. */
export const MODELS_DOC_URL = "https://openrouter.ai/docs/guides/overview/models";
/** Model schema that says the date is when the model may be removed. */
export const MODEL_SCHEMA_URL = "https://openrouter.ai/docs/client-sdks/python/components/model";

export const DEPRECATION_QUOTE = "Deprecation date for the model endpoint (null if not deprecated)";
export const REMOVAL_QUOTE =
  "The date after which the model may be removed. ISO 8601 date string (YYYY-MM-DD) or null if no expiration.";

const API_LABEL = "OpenRouter models API";
const DOC_LABEL = "OpenRouter models guide";
const SCHEMA_LABEL = "OpenRouter model schema";

const MODALITY: Record<string, Modality> = {
  text: "text",
  image: "image",
  audio: "audio",
  video: "video",
  pdf: "pdf",
};

export interface OpenRouterDocs {
  guide: string;
  schemaDoc: string;
}

export interface OpenRouterPrior {
  id: string;
  deprecation_date: string | null;
  shutdown_date: string | null;
}

/**
 * null means the body is not a usable models list.
 * An empty array means the list was usable and no row had an expiration date.
 */
export function parseOpenRouter(body: string, docs: OpenRouterDocs, checked: string): ScrapedModel[] | null {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { data?: unknown; total_count?: unknown; links?: unknown };
  if (!Array.isArray(record.data)) return null;
  if (typeof record.total_count === "number" && record.total_count !== record.data.length) return null;
  if (record.links && typeof record.links === "object" && (record.links as { next?: unknown }).next) return null;

  const guideOk = docs.guide.includes(DEPRECATION_QUOTE);
  const schemaOk = docs.schemaDoc.includes(REMOVAL_QUOTE);
  const seen = new Set<string>();
  const models: ScrapedModel[] = [];
  for (const row of record.data) {
    const parsed = oneModel(row, body, checked, guideOk, schemaOk);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    models.push(parsed);
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

/**
 * A failed or partial OpenRouter read must not wipe stored rows or fail the other providers.
 * A smaller list is applied only when every missing id already had an expiration date before the check day.
 */
export function openRouterDecision(
  next: { id: string }[] | null,
  previous: OpenRouterPrior[],
  checked: string,
): "use" | "keep" {
  if (next == null) return "keep";
  if (previous.length === 0) return next.length === 0 ? "keep" : "use";
  const nextIds = new Set(next.map((row) => row.id));
  const dropped = previous.filter((row) => !nextIds.has(row.id));
  if (dropped.length === 0) return "use";
  if (dropped.every((row) => expiredBefore(row, checked))) return "use";
  return "keep";
}

export async function loadOpenRouterModels(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<ScrapedModel[] | null> {
  try {
    const docs = options.fromSnapshots
      ? await readDocFixtures(options.root)
      : await fetchDocs(options.checked);
    const body = options.fromSnapshots
      ? await readFile(path.join(options.root, "snapshots/fixtures/openrouter/models-2026-10-28.json"), "utf8")
      : await fetchModels(options.checked);
    return parseOpenRouter(body, docs, options.checked);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}

function oneModel(
  row: unknown,
  raw: string,
  checked: string,
  guideOk: boolean,
  schemaOk: boolean,
): ScrapedModel | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  if (typeof item.id !== "string" || !isOpenRouterId(item.id)) return null;
  const expiration = isoDate(item.expiration_date);
  if (!expiration) return null;

  const notes = [
    `The models API sets expiration_date to ${expiration}.`,
    guideOk
      ? "The models guide calls expiration_date the deprecation date for the model endpoint, and null if the endpoint is not deprecated."
      : "",
    schemaOk
      ? "The model schema says this is the date after which the model may be removed, not a day the model is guaranteed to stop."
      : "",
    "This response does not name a replacement.",
  ];
  if (typeof item.canonical_slug === "string" && item.canonical_slug && item.canonical_slug !== item.id) {
    notes.push(`canonical_slug is ${item.canonical_slug}.`);
  }

  const specs = specsFrom(item, checked, notes);
  const sources = [
    {
      url: MODELS_URL,
      label: API_LABEL,
      last_checked: checked,
      excerpt: apiExcerpt(raw, item.id, expiration),
    },
  ];
  if (guideOk) {
    sources.push({
      url: MODELS_DOC_URL,
      label: DOC_LABEL,
      last_checked: checked,
      excerpt: DEPRECATION_QUOTE,
    });
  }
  if (schemaOk) {
    sources.push({
      url: MODEL_SCHEMA_URL,
      label: SCHEMA_LABEL,
      last_checked: checked,
      excerpt: REMOVAL_QUOTE,
    });
  }

  const model = baseModel({
    id: item.id,
    provider: "openrouter",
    displayName: typeof item.name === "string" && item.name.trim() ? item.name.trim() : item.id,
    status: "deprecated",
    deprecated: expiration,
    shutdown: expiration,
    kind: "not_before",
    notes: notes.filter(Boolean).join(" "),
    sourceUrl: MODELS_URL,
    sourceLabel: API_LABEL,
    checked,
    excerpt: sources[0].excerpt,
    specs,
  });
  model.sources = sources;
  return model;
}

function specsFrom(item: Record<string, unknown>, checked: string, notes: string[]): Specs {
  const specs = emptySpecs();
  const architecture = objectOf(item.architecture);
  const top = objectOf(item.top_provider);
  const pricing = objectOf(item.pricing);
  const output = stringList(architecture?.output_modalities);
  const input = stringList(architecture?.input_modalities);
  const textOut = output.length > 0 && output.every((value) => value === "text");
  const mappedIn = mapModalities(input);
  const mappedOut = mapModalities(output);
  if (mappedIn.mapped) {
    specs.modalities_in = mappedIn.mapped;
    specs.specs_sources.modalities_in = { url: MODELS_URL, last_checked: checked };
  }
  if (mappedOut.mapped) {
    specs.modalities_out = mappedOut.mapped;
    specs.specs_sources.modalities_out = { url: MODELS_URL, last_checked: checked };
  }
  if (mappedIn.unmapped.length || mappedOut.unmapped.length) {
    const parts = [];
    if (input.length) parts.push(`input_modalities is ${input.join(", ")}`);
    if (output.length) parts.push(`output_modalities is ${output.join(", ")}`);
    notes.push(`The models API ${parts.join(" and ")}.`);
  }
  if (input.length) {
    specs.supports_vision = input.includes("image");
    specs.specs_sources.supports_vision = { url: MODELS_URL, last_checked: checked };
  }

  const context = integer(item.context_length);
  if (context != null) {
    specs.context_window_tokens = context;
    specs.specs_sources.context_window_tokens = { url: MODELS_URL, last_checked: checked };
  }
  const maxOut = integer(top?.max_completion_tokens);
  if (maxOut != null) {
    specs.max_output_tokens = maxOut;
    specs.specs_sources.max_output_tokens = { url: MODELS_URL, last_checked: checked };
  }
  if (context === 0 || maxOut === 0) {
    const bits = [];
    if (context === 0) bits.push("context_length is 0");
    if (maxOut === 0) bits.push("max_completion_tokens is 0");
    notes.push(`The models API sets ${bits.join(" and ")}.`);
  }

  if (textOut && pricing) {
    const inputPrice = perMillionTokens(pricing.prompt);
    const outputPrice = perMillionTokens(pricing.completion);
    const cached = perMillionTokens(pricing.input_cache_read);
    if (inputPrice != null) {
      specs.input_price_per_mtok = inputPrice;
      specs.currency = "USD";
      specs.specs_sources.input_price_per_mtok = { url: MODELS_URL, last_checked: checked };
    }
    if (outputPrice != null) {
      specs.output_price_per_mtok = outputPrice;
      specs.currency = "USD";
      specs.specs_sources.output_price_per_mtok = { url: MODELS_URL, last_checked: checked };
    }
    if (cached != null) {
      specs.cached_input_price_per_mtok = cached;
      specs.currency = "USD";
      specs.supports_prompt_caching = true;
      specs.specs_sources.cached_input_price_per_mtok = { url: MODELS_URL, last_checked: checked };
      specs.specs_sources.supports_prompt_caching = { url: MODELS_URL, last_checked: checked };
    }
  } else if (pricing) {
    const bits = [];
    if (typeof pricing.prompt === "string") bits.push(`prompt ${pricing.prompt}`);
    if (typeof pricing.completion === "string") bits.push(`completion ${pricing.completion}`);
    if (bits.length) {
      notes.push(
        `The models API pricing is ${bits.join(" and ")}. Output is not text, so those values are not stored as per-million-token prices.`,
      );
    }
  }

  const params = stringList(item.supported_parameters);
  if (Array.isArray(item.supported_parameters)) {
    specs.supports_tools = params.includes("tools");
    specs.supports_json_schema = params.includes("structured_outputs");
    specs.specs_sources.supports_tools = { url: MODELS_URL, last_checked: checked };
    specs.specs_sources.supports_json_schema = { url: MODELS_URL, last_checked: checked };
  }

  const reasoning = objectOf(item.reasoning);
  if (reasoning) {
    specs.reasoning = reasoning.mandatory === true ? "always" : "optional";
    specs.specs_sources.reasoning = { url: MODELS_URL, last_checked: checked };
  }

  const cutoff = isoDate(item.knowledge_cutoff);
  if (cutoff) {
    specs.knowledge_cutoff = cutoff;
    specs.specs_sources.knowledge_cutoff = { url: MODELS_URL, last_checked: checked };
  }
  return specs;
}

/** USD per token string to USD per million tokens, without binary float drift. */
export function perMillionTokens(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(\.\d+)?$/.test(value)) return null;
  const [whole, frac = ""] = value.split(".");
  const combined = `${whole}${frac}`.replace(/^0+/, "") || "0";
  const decimalPlaces = frac.length - 6;
  if (decimalPlaces <= 0) {
    const text = combined === "0" ? "0" : combined + "0".repeat(-decimalPlaces);
    return Number(text);
  }
  const pad = combined.padStart(decimalPlaces + 1, "0");
  const point = pad.length - decimalPlaces;
  return Number(`${pad.slice(0, point)}.${pad.slice(point)}`);
}

function expiredBefore(row: OpenRouterPrior, checked: string): boolean {
  const date = row.deprecation_date ?? row.shutdown_date;
  return Boolean(date && date < checked);
}

function isOpenRouterId(id: string): boolean {
  return /^[~A-Za-z0-9][A-Za-z0-9._:/-]{0,160}$/.test(id);
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
}

function integer(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function objectOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapModalities(values: string[]): { mapped: Specs["modalities_in"]; unmapped: string[] } {
  if (!values.length) return { mapped: null, unmapped: [] };
  const unmapped = values.filter((value) => !MODALITY[value]);
  const mapped = values.flatMap((value) => (MODALITY[value] ? [MODALITY[value]] : []));
  if (!mapped.length) return { mapped: null, unmapped };
  return { mapped, unmapped };
}

function apiExcerpt(raw: string, id: string, date: string): string {
  const idBit = `"id":"${id}"`;
  const dateBit = `"expiration_date":"${date}"`;
  if (raw.includes(idBit) && raw.includes(dateBit)) return excerpt([idBit, dateBit]);
  return excerpt([idBit, dateBit]);
}

async function readDocFixtures(root: string): Promise<OpenRouterDocs> {
  const dir = path.join(root, "snapshots/fixtures/openrouter");
  const [guide, schemaDoc] = await Promise.all([
    readFile(path.join(dir, "guide-2026-10-28.txt"), "utf8"),
    readFile(path.join(dir, "schema-2026-10-28.txt"), "utf8"),
  ]);
  return { guide, schemaDoc };
}

async function fetchDocs(checked: string): Promise<OpenRouterDocs> {
  const guide = await fetchOptional(MODELS_DOC_URL);
  const schemaDoc = await fetchOptional(MODEL_SCHEMA_URL);
  if (guide.includes(DEPRECATION_QUOTE)) await writeSnapshot("guide", checked, DEPRECATION_QUOTE);
  if (schemaDoc.includes(REMOVAL_QUOTE)) await writeSnapshot("schema", checked, REMOVAL_QUOTE);
  return { guide, schemaDoc };
}

async function fetchOptional(url: string): Promise<string> {
  try {
    return await politeFetch(url);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return "";
  }
}

async function fetchModels(checked: string): Promise<string> {
  const firstText = await politeFetch(MODELS_URL);
  const first = JSON.parse(firstText) as { data?: unknown; total_count?: unknown; links?: { next?: unknown } };
  if (!Array.isArray(first.data)) throw new Error("OpenRouter models API did not return a data array");
  const rows = [...first.data];
  const seen = new Set<string>();
  let next = typeof first.links?.next === "string" ? first.links.next : "";
  while (next) {
    if (seen.has(next) || seen.size > 20) throw new Error("OpenRouter models API pagination did not finish");
    seen.add(next);
    const url = next.startsWith("http") ? next : new URL(next, "https://openrouter.ai").href;
    const page = JSON.parse(await politeFetch(url)) as { data?: unknown; links?: { next?: unknown } };
    if (!Array.isArray(page.data)) throw new Error("OpenRouter models API page did not return a data array");
    rows.push(...page.data);
    next = typeof page.links?.next === "string" ? page.links.next : "";
  }
  if (typeof first.total_count === "number" && first.total_count !== rows.length) {
    throw new Error(`OpenRouter models API returned ${rows.length} rows and total_count ${first.total_count}`);
  }
  const body = JSON.stringify({ data: rows, total_count: rows.length, links: { next: null } });
  await writeSnapshot("models", checked, body, ".json");
  return body;
}

async function writeSnapshot(name: string, checked: string, body: string, ext = ".txt"): Promise<void> {
  const dir = path.join("snapshots", "openrouter");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}-${checked}${ext}`), body.endsWith("\n") ? body : `${body}\n`);
  const files = (await readdir(dir)).filter((file) => file.startsWith(`${name}-`) && file.endsWith(ext)).sort();
  for (const file of files.slice(0, Math.max(0, files.length - 10))) {
    await unlink(path.join(dir, file));
  }
}
