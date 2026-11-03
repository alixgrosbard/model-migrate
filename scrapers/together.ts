import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../src/schema.ts";
import { emptySpecs } from "../src/schema.ts";
import { SOURCES_DISAGREE } from "../src/lib/conflicts.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Markdown Together publishes. Stored sources use the page without .md. */
export const DEPRECATIONS_MD_URL = "https://docs.together.ai/docs/deprecations.md";
export const CHANGELOG_MD_URL = "https://docs.together.ai/docs/changelog.md";
export const MODELS_MD_URL = "https://docs.together.ai/docs/serverless/models.md";
export const DEPRECATIONS_URL = "https://docs.together.ai/docs/deprecations";
export const CHANGELOG_URL = "https://docs.together.ai/docs/changelog";
export const MODELS_URL = "https://docs.together.ai/docs/serverless/models";
export const QUICKSTART_URL = "https://docs.together.ai/docs/quickstart";

export const DEPRECATIONS_FIXTURE = "snapshots/fixtures/together/deprecations-2026-10-28.md";
export const CHANGELOG_FIXTURE = "snapshots/fixtures/together/changelog-2026-10-28.md";
export const MODELS_FIXTURE = "snapshots/fixtures/together/models-2026-10-28.md";

export const TOGETHER_BASE_URL = "https://api.together.ai/v1";
export const TOGETHER_CHAT_URL = "https://api.together.ai/v1/chat/completions";

const DOC_LABEL = "Together AI deprecations";
const CHANGELOG_LABEL = "Together AI changelog";
const MODELS_LABEL = "Together AI serverless models";
const STUB_LABEL = "Named as an official replacement";

const DEDICATED_YES =
  'Models marked "Yes" can be deployed as on-demand dedicated endpoints, either under the listed ID or as the underlying base model of a serving variant (for example, a deprecated -FP8 or -Turbo ID).';
const DEDICATED_NO =
  'Models marked "No" are not available as on-demand endpoints and require migration to a different model or a monthly reserved dedicated endpoint.';
const REDIRECT_NOTE =
  "Requests to the original model ID are automatically routed to the upgraded version. The old version remains available via dedicated endpoints.";
const FINETUNE_NOTE = "These models can no longer be used as a base model for a fine-tuning job.";

const SCHEDULED_HEADER = [
  "removal date",
  "model",
  "recommended replacement",
  "supported by on-demand dedicated endpoints",
];
const INFERENCE_HEADER = ["removal date", "model", "supported by on-demand dedicated endpoints"];
const FINETUNE_HEADER = ["removal date", "model", "suggested replacement"];
const REDIRECT_HEADER = ["original model", "redirects to", "notes"];

type Dedicated = "Yes" | "No" | null;
type Surface = "inference" | "finetune" | "redirect";

interface DatedRow {
  date: string;
  id: string;
  replacement: string | null;
  dedicated: Dedicated;
  line: string;
}

interface RedirectRow {
  id: string;
  replacement: string;
  note: string;
  line: string;
}

interface CatalogPrice {
  input: number | null;
  output: number | null;
  cached: number | null;
  context: number | null;
  tools: boolean | null;
  schema: boolean | null;
}

interface Built {
  id: string;
  surface: Surface;
  shutdown: string | null;
  replacements: { id: string; source: string }[];
  notes: string[];
  excerpt: string;
  dedicated: Dedicated;
}

export interface TogetherPages {
  deprecations: string | null;
  changelog: string | null;
  models: string | null;
}

/**
 * null means the deprecations page is not the four tables this parser knows.
 * Changelog and the serverless models page are optional. A missing one leaves
 * replacements and prices that come only from that page unset.
 */
export function parseTogether(
  deprecations: string,
  changelog: string | null,
  modelsPage: string | null,
  checked: string,
): ScrapedModel[] | null {
  const scheduled = datedTable(deprecations, SCHEDULED_HEADER, true);
  const inference = datedTable(deprecations, INFERENCE_HEADER, false);
  const finetune = datedTable(deprecations, FINETUNE_HEADER, true);
  const redirects = redirectTable(deprecations);
  if (!scheduled || !inference || !finetune || !redirects) return null;
  if (!scheduled.length || !inference.length) return null;

  const byId = new Map<string, Built>();
  for (const row of inference) addInference(byId, row);
  for (const row of scheduled) addScheduled(byId, row);
  for (const row of finetune) addFinetune(byId, row);
  for (const row of redirects) addRedirect(byId, row);
  if (changelog) applyChangelog(byId, changelog);

  const models = addStubs([...byId.values()].map((row) => toScraped(row, checked)), checked);
  if (modelsPage) applyCatalogPrices(models, modelsPage, checked);
  return models;
}

/**
 * null means keep the stored Together rows.
 * A list is safe to write: the deprecations tables parsed, and no still-upcoming stored id disappeared.
 */
export function assembleTogether(
  pages: TogetherPages,
  checked: string,
  previous: ModelRecord[] = [],
): ScrapedModel[] | null {
  if (pages.deprecations == null) return null;
  const next = parseTogether(pages.deprecations, pages.changelog, pages.models, checked);
  if (next == null || next.length === 0) return null;
  const stored = previous.filter((model) => model.provider === "together");
  const nextIds = new Set(next.map((model) => model.id));
  const upcomingGone = stored.filter(
    (model) => model.shutdown_date && model.shutdown_date >= checked && !nextIds.has(model.id),
  );
  if (upcomingGone.length) return null;
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const nextUpcoming = next.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;
  if (stored.length > 0 && next.length < stored.length * 0.7) return null;
  return next;
}

export async function loadTogetherPages(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<TogetherPages> {
  const deprecations = await readPage(options, DEPRECATIONS_MD_URL, DEPRECATIONS_FIXTURE, "deprecations");
  const changelog = await readPage(options, CHANGELOG_MD_URL, CHANGELOG_FIXTURE, "changelog");
  const models = await readPage(options, MODELS_MD_URL, MODELS_FIXTURE, "models");
  return { deprecations, changelog, models };
}

function addInference(byId: Map<string, Built>, row: DatedRow) {
  const existing = byId.get(row.id);
  if (existing) {
    if (existing.shutdown && existing.shutdown !== row.date) {
      existing.notes.push(`The inference table also lists removal date ${row.date} for this id.`);
    }
    if (existing.dedicated && row.dedicated && existing.dedicated !== row.dedicated) {
      existing.notes.push(`Another inference row marks on-demand dedicated endpoints ${row.dedicated}.`);
    }
    return;
  }
  byId.set(row.id, {
    id: row.id,
    surface: "inference",
    shutdown: row.date,
    replacements: [],
    notes: ["The inference table lists this id as removed from serverless inference.", dedicatedNote(row.dedicated)].filter(
      (note): note is string => Boolean(note),
    ),
    excerpt: row.line,
    dedicated: row.dedicated,
  });
}

function addScheduled(byId: Map<string, Built>, row: DatedRow) {
  const existing = byId.get(row.id);
  if (!existing) {
    const notes = [
      "The scheduled deprecations table says this model will be removed from serverless inference on the date listed.",
      dedicatedNote(row.dedicated),
    ].filter((note): note is string => Boolean(note));
    byId.set(row.id, {
      id: row.id,
      surface: "inference",
      shutdown: row.date,
      replacements: row.replacement ? [{ id: row.replacement, source: DEPRECATIONS_URL }] : [],
      notes,
      excerpt: row.line,
      dedicated: row.dedicated,
    });
    return;
  }
  if (existing.surface === "redirect") return;
  if (existing.shutdown && existing.shutdown !== row.date) {
    existing.notes.push(
      `${SOURCES_DISAGREE} The scheduled deprecations table lists removal date ${row.date}. The inference table lists removal date ${existing.shutdown}. The stored shutdown date is the inference table date.`,
    );
  }
  if (!existing.replacements.length && row.replacement) {
    existing.replacements.push({ id: row.replacement, source: DEPRECATIONS_URL });
  }
  if (!existing.dedicated && row.dedicated) {
    existing.dedicated = row.dedicated;
    const note = dedicatedNote(row.dedicated);
    if (note) existing.notes.push(note);
  }
}

function addFinetune(byId: Map<string, Built>, row: DatedRow) {
  const existing = byId.get(row.id);
  const replacementNote = row.replacement
    ? `The fine-tuning table lists suggested replacement ${row.replacement} and removal date ${row.date}.`
    : `The fine-tuning table lists removal date ${row.date} and no suggested replacement.`;
  if (existing) {
    existing.notes.push(`${replacementNote} ${FINETUNE_NOTE}`);
    return;
  }
  byId.set(row.id, {
    id: row.id,
    surface: "finetune",
    shutdown: row.date,
    replacements: row.replacement ? [{ id: row.replacement, source: DEPRECATIONS_URL }] : [],
    notes: [
      "This row is the fine-tuning service, not serverless inference. The inference table does not list this id.",
      FINETUNE_NOTE,
      replacementNote,
    ],
    excerpt: row.line,
    dedicated: null,
  });
}

function addRedirect(byId: Map<string, Built>, row: RedirectRow) {
  if (byId.has(row.id)) {
    const existing = byId.get(row.id);
    if (existing && !existing.notes.some((note) => note.includes("automatically routed"))) {
      existing.notes.push(REDIRECT_NOTE);
    }
    return;
  }
  const notes = [REDIRECT_NOTE];
  if (row.note) notes.push(`The redirects table says: ${row.note}.`);
  byId.set(row.id, {
    id: row.id,
    surface: "redirect",
    shutdown: null,
    replacements: [{ id: row.replacement, source: DEPRECATIONS_URL }],
    notes,
    excerpt: row.line,
    dedicated: null,
  });
}

function applyChangelog(byId: Map<string, Built>, changelog: string) {
  const found = changelogReplacements(changelog);
  for (const [id, info] of found) {
    const row = byId.get(id);
    if (!row || row.surface !== "inference" || row.replacements.length) continue;
    if (!isModelId(info.replacement)) continue;
    row.replacements.push({ id: info.replacement, source: CHANGELOG_URL });
    row.notes.push(`The changelog says to use ${info.replacement} instead. The deprecations table does not name a replacement for this id.`);
    if (info.deploy) row.notes.push(info.deploy);
  }
}

function changelogReplacements(page: string): Map<string, { replacement: string; deploy: string | null }> {
  const found = new Map<string, { replacement: string; deploy: string | null }>();
  const parts = page.split(/^## Model deprecations/m).slice(1);
  for (const part of parts) {
    const section = part.split(/^## /m)[0] ?? part;
    const deployMatch = section.match(/For Llama 3\.3 70B, deploy `([^`]+)`/);
    const deployId = deployMatch?.[1];
    const deploy =
      deployId && isModelId(deployId)
        ? `The changelog says for Llama 3.3 70B, deploy ${deployId} on a dedicated endpoint.`
        : null;
    for (const line of section.split("\n")) {
      const match = line.match(/`([^`]+)`\.\s+(?:Use `([^`]+)` instead|Recommended replacement:\s*`([^`]+)`)/);
      const id = match?.[1];
      const replacement = match?.[2] ?? match?.[3];
      if (!id || !replacement || !isModelId(id) || !isModelId(replacement) || found.has(id)) continue;
      const llama = id === "meta-llama/Llama-3.3-70B-Instruct-Turbo" ? deploy : null;
      found.set(id, { replacement, deploy: llama });
    }
  }
  return found;
}

function toScraped(row: Built, checked: string): ScrapedModel {
  const disagree = row.notes.filter((note) => note.includes(SOURCES_DISAGREE));
  const notes = [...row.notes.filter((note) => !note.includes(SOURCES_DISAGREE)), ...disagree];
  row.notes = notes;
  const shutdown = row.shutdown;
  const status = !shutdown ? "active" : compareDate(shutdown, checked) < 0 ? "retired" : "deprecated";
  const sourceUrl = row.replacements[0]?.source === CHANGELOG_URL && row.surface === "inference" ? DEPRECATIONS_URL : DEPRECATIONS_URL;
  const model = baseModel({
    id: row.id,
    provider: "together",
    status,
    shutdown,
    kind: shutdown ? "exact" : "none",
    notes: row.notes.join(" "),
    replacements: row.replacements.map((item) => ({
      model_id: item.id,
      provider: "together",
      kind: "official" as const,
      source_url: item.source,
    })),
    sourceUrl,
    sourceLabel: DOC_LABEL,
    checked,
    excerpt: excerpt([row.excerpt]),
  });
  if (row.replacements.some((item) => item.source === CHANGELOG_URL)) {
    model.sources.push({
      url: CHANGELOG_URL,
      label: CHANGELOG_LABEL,
      last_checked: checked,
      excerpt: excerpt([`Use ${row.replacements.find((item) => item.source === CHANGELOG_URL)?.id ?? row.id}`]),
    });
  }
  return model;
}

function applyCatalogPrices(models: ScrapedModel[], page: string, checked: string) {
  const prices = catalogPrices(page);
  for (const model of models) {
    const price = prices.get(model.id);
    if (!price) continue;
    const specs = emptySpecs();
    if (price.input != null) {
      specs.input_price_per_mtok = price.input;
      specs.currency = "USD";
      specs.specs_sources.input_price_per_mtok = { url: MODELS_URL, last_checked: checked };
    }
    if (price.output != null) {
      specs.output_price_per_mtok = price.output;
      specs.currency = "USD";
      specs.specs_sources.output_price_per_mtok = { url: MODELS_URL, last_checked: checked };
    }
    if (price.cached != null) {
      specs.cached_input_price_per_mtok = price.cached;
      specs.currency = "USD";
      specs.supports_prompt_caching = true;
      specs.specs_sources.cached_input_price_per_mtok = { url: MODELS_URL, last_checked: checked };
      specs.specs_sources.supports_prompt_caching = { url: MODELS_URL, last_checked: checked };
    }
    if (price.context != null) {
      specs.context_window_tokens = price.context;
      specs.specs_sources.context_window_tokens = { url: MODELS_URL, last_checked: checked };
    }
    if (price.tools != null) {
      specs.supports_tools = price.tools;
      specs.specs_sources.supports_tools = { url: MODELS_URL, last_checked: checked };
    }
    if (price.schema != null) {
      specs.supports_json_schema = price.schema;
      specs.specs_sources.supports_json_schema = { url: MODELS_URL, last_checked: checked };
    }
    if (!Object.keys(specs.specs_sources).length) continue;
    model.specs = specs;
    model.sources.push({
      url: MODELS_URL,
      label: MODELS_LABEL,
      last_checked: checked,
      excerpt: excerpt([model.id, price.input != null ? `input ${price.input}` : "", price.output != null ? `output ${price.output}` : ""]),
    });
  }
}

function catalogPrices(page: string): Map<string, CatalogPrice> {
  const found = new Map<string, CatalogPrice>();
  const conflict = new Set<string>();
  for (const table of markdownTables(page)) {
    const header = table[0]?.map(normalizeHeader) ?? [];
    const idAt = header.indexOf("api model string");
    const inputAt = header.findIndex((cell) => cell.startsWith("input pricing (per 1m tokens)"));
    if (idAt < 0 || inputAt < 0) continue;
    const outputAt = header.findIndex((cell) => cell.startsWith("output pricing (per 1m tokens)"));
    const cachedAt = header.findIndex((cell) => cell.startsWith("cached input pricing (per 1m tokens)"));
    const contextAt = header.indexOf("context length");
    const toolsAt = header.indexOf("function calling");
    const schemaAt = header.indexOf("structured outputs");
    for (const cells of table.slice(1)) {
      const id = plainId(cells[idAt] ?? "");
      if (!id) continue;
      const price: CatalogPrice = {
        input: moneyCell(cells[inputAt] ?? ""),
        output: outputAt >= 0 ? moneyCell(cells[outputAt] ?? "") : null,
        cached: cachedAt >= 0 ? moneyCell(cells[cachedAt] ?? "") : null,
        context: contextAt >= 0 ? intCell(cells[contextAt] ?? "") : null,
        tools: toolsAt >= 0 ? yesNo(cells[toolsAt] ?? "") : null,
        schema: schemaAt >= 0 ? yesNo(cells[schemaAt] ?? "") : null,
      };
      const previous = found.get(id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(price)) {
        conflict.add(id);
        continue;
      }
      found.set(id, price);
    }
  }
  for (const id of conflict) found.delete(id);
  return found;
}

function addStubs(models: ScrapedModel[], checked: string): ScrapedModel[] {
  const byId = new Map(models.map((model) => [model.id, model]));
  const named = new Map<string, { urls: string[]; parents: string[] }>();
  for (const model of models) {
    for (const replacement of model.replacements) {
      if (byId.has(replacement.model_id)) continue;
      const row = named.get(replacement.model_id) ?? { urls: [], parents: [] };
      if (!row.parents.includes(model.id)) row.parents.push(model.id);
      if (!row.urls.includes(replacement.source_url)) row.urls.push(replacement.source_url);
      named.set(replacement.model_id, row);
    }
  }
  for (const [id, info] of [...named.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parents = [...info.parents].sort();
    const record = baseModel({
      id,
      provider: "together",
      status: "active",
      kind: "none",
      notes: `Named as an official replacement for ${parents.join(", ")}. No shutdown date was published for this id on that page.`,
      sourceUrl: info.urls[0],
      sourceLabel: STUB_LABEL,
      checked,
      excerpt: excerpt([`Named as an official replacement for ${parents[0]}.`]),
    });
    for (const url of info.urls.slice(1)) {
      record.sources.push({
        url,
        label: STUB_LABEL,
        last_checked: checked,
        excerpt: record.sources[0].excerpt,
      });
    }
    byId.set(id, record);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id) || (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? ""));
}

function dedicatedNote(value: Dedicated): string | null {
  if (value === "Yes") return `Supported by on-demand dedicated endpoints: Yes. ${DEDICATED_YES}`;
  if (value === "No") return `Supported by on-demand dedicated endpoints: No. ${DEDICATED_NO}`;
  return null;
}

function datedTable(page: string, header: string[], withReplacement: boolean): DatedRow[] | null {
  const tables = markdownTables(page).filter((table) => sameHeader(table[0] ?? [], header));
  if (tables.length !== 1) return null;
  const rows: DatedRow[] = [];
  for (const cells of tables[0].slice(1)) {
    const date = isoDate(cells[0] ?? "");
    const id = oneId(cells[1] ?? "");
    if (!date && !id) continue;
    if (!date || !id) return null;
    const replacement = withReplacement ? oneId(cells[2] ?? "") : null;
    const dedicatedCell = withReplacement ? (cells[3] ?? "") : (cells[2] ?? "");
    const dedicated = dedicatedValue(dedicatedCell);
    if (dedicated === "bad") return null;
    if (withReplacement && cells[2] && !replacement && backtickCount(cells[2]) > 0) return null;
    rows.push({
      date,
      id,
      replacement,
      dedicated,
      line: cells.filter(Boolean).join(" | "),
    });
  }
  return rows;
}

function redirectTable(page: string): RedirectRow[] | null {
  const tables = markdownTables(page).filter((table) => sameHeader(table[0] ?? [], REDIRECT_HEADER));
  if (tables.length !== 1) return null;
  const rows: RedirectRow[] = [];
  for (const cells of tables[0].slice(1)) {
    const id = oneId(cells[0] ?? "");
    const replacement = oneId(cells[1] ?? "");
    if (!id && !replacement) continue;
    if (!id || !replacement) return null;
    rows.push({
      id,
      replacement,
      note: plain(cells[2] ?? ""),
      line: cells.filter(Boolean).join(" | "),
    });
  }
  return rows.length ? rows : null;
}

function sameHeader(cells: string[], expected: string[]): boolean {
  const header = cells.map(normalizeHeader);
  return header.length === expected.length && expected.every((cell, index) => header[index] === cell);
}

function normalizeHeader(cell: string): string {
  return plain(cell).toLowerCase();
}

function plain(cell: string): string {
  return cell
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function oneId(cell: string): string | null {
  const ids = [...cell.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1]?.trim() ?? "")
    .filter((id) => isModelId(id));
  const unique = [...new Set(ids)];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return null;
  const text = plain(cell);
  return isModelId(text) ? text : null;
}

function plainId(cell: string): string | null {
  const text = plain(cell);
  return isModelId(text) ? text : null;
}

function backtickCount(cell: string): number {
  return [...cell.matchAll(/`([^`]+)`/g)].length;
}

function dedicatedValue(cell: string): Dedicated | "bad" {
  const text = plain(cell);
  if (!text) return null;
  if (text === "Yes" || text === "No") return text;
  return "bad";
}

function isoDate(cell: string): string | null {
  const text = plain(cell);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = parseDate(text);
  if (parsed.kind !== "exact" || parsed.date !== text) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return text;
}

function moneyCell(cell: string): number | null {
  const text = plain(cell).replace(/[$,]/g, "");
  if (!text || text === "-") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function intCell(cell: string): number | null {
  const text = plain(cell).replace(/,/g, "");
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

function yesNo(cell: string): boolean | null {
  const text = plain(cell);
  if (text === "Yes") return true;
  if (text === "No") return false;
  return null;
}

function markdownTables(page: string): string[][][] {
  const tables: string[][][] = [];
  let current: string[][] | null = null;
  for (const line of page.split("\n")) {
    if (!line.trim().startsWith("|")) {
      if (current) tables.push(current);
      current = null;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.replace(/\s+/g, " ").trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, "")))) continue;
    if (!current) current = [];
    current.push(cells);
  }
  if (current) tables.push(current);
  return tables;
}

async function readPage(
  options: { fromSnapshots: boolean; checked: string; root: string },
  url: string,
  fixture: string,
  name: string,
): Promise<string | null> {
  if (options.fromSnapshots) {
    try {
      return await readFile(path.join(options.root, fixture), "utf8");
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return null;
    }
  }
  try {
    const { politeFetch } = await import("./lib/fetch.ts");
    const body = await politeFetch(url);
    const dir = path.join(options.root, "snapshots", "together");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}-${options.checked}.md`), body);
    return body;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}
