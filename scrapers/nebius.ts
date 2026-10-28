import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../src/schema.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Markdown Nebius publishes. Stored sources use the page without .md. */
export const NOVEMBER_MD_URL = "https://docs.tokenfactory.nebius.com/model-deprecations-november-2026.md";
export const AUGUST_MD_URL = "https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice.md";
export const NOVEMBER_URL = "https://docs.tokenfactory.nebius.com/model-deprecations-november-2026";
export const AUGUST_URL = "https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice";
export const QUICKSTART_URL = "https://docs.tokenfactory.nebius.com/quickstart";
export const QUICKSTART_MD_URL = "https://docs.tokenfactory.nebius.com/quickstart.md";

export const NOVEMBER_FIXTURE = "snapshots/fixtures/nebius/november-2026-10-28.md";
export const AUGUST_FIXTURE = "snapshots/fixtures/nebius/august-2026-10-28.md";

const DOC_LABEL = "Nebius Token Factory model deprecations";
const STUB_LABEL = "Named as an official replacement";

/** Sentences copied only when the notice prints them. */
const SCOPE_SENTENCES = [
  "This change only affects Serverless usage.",
  "Dedicated Endpoints are unaffected.",
  "Token Factory does not automatically reroute requests from deprecated models.",
];

const BASE_URL = "https://api.tokenfactory.nebius.com/v1/";
const CHAT_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";

export interface NebiusPages {
  november: string | null;
  august: string | null;
}

/**
 * One notice page. null means the page is not the two-column removal table.
 * An empty array means the table was there and had no model rows.
 */
export function parseNebiusNotice(markdown: string, pageUrl: string, checked: string): ScrapedModel[] | null {
  const shutdown = removalDate(markdown);
  const table = replacementTable(markdown);
  if (!shutdown || !table) return null;
  const note = scopeNote(markdown);
  const models: ScrapedModel[] = [];
  const seen = new Set<string>();
  for (const row of table) {
    const from = idsInCell(row[0] ?? "");
    const to = idsInCell(row[1] ?? "");
    if (from.length !== 1 || to.length !== 1) return null;
    const id = from[0];
    const replacement = to[0];
    if (seen.has(id)) return null;
    seen.add(id);
    const line = markdown.split("\n").find((item) => item.includes(`\`${id}\``) && item.includes(`\`${replacement}\``));
    models.push(
      baseModel({
        id,
        provider: "nebius",
        status: compareDate(shutdown, checked) < 0 ? "retired" : "deprecated",
        shutdown,
        kind: "exact",
        notes: note || null,
        replacements: [
          {
            model_id: replacement,
            provider: "nebius",
            kind: "official",
            source_url: pageUrl,
          },
        ],
        sourceUrl: pageUrl,
        sourceLabel: DOC_LABEL,
        checked,
        excerpt: excerpt([line ?? `${id} | ${replacement}`]),
      }),
    );
  }
  return models;
}

/**
 * null means keep the stored Nebius rows.
 * A list is safe to write: the November table parsed, and no still-upcoming stored id disappeared.
 */
export function assembleNebius(
  novemberMd: string | null,
  augustMd: string | null,
  checked: string,
  previous: ModelRecord[] = [],
): ScrapedModel[] | null {
  if (novemberMd == null) return null;
  const november = parseNebiusNotice(novemberMd, NOVEMBER_URL, checked);
  if (november == null) return null;
  const august = augustMd == null ? null : parseNebiusNotice(augustMd, AUGUST_URL, checked);

  const dated = new Map<string, ScrapedModel>();
  for (const model of november) dated.set(model.id, model);
  if (august) {
    for (const model of august) {
      const existing = dated.get(model.id);
      if (existing && existing.shutdown_date !== model.shutdown_date) return null;
      if (!existing) dated.set(model.id, model);
    }
  }

  const stored = previous.filter((model) => model.provider === "nebius");
  const upcomingGone = stored.filter(
    (model) => model.shutdown_date && model.shutdown_date >= checked && !dated.has(model.id),
  );
  if (upcomingGone.length) return null;
  const nextUpcoming = [...dated.values()].filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;

  if (!august) {
    for (const model of stored) {
      if (dated.has(model.id)) continue;
      if (!model.sources.some((source) => source.url === AUGUST_URL)) continue;
      dated.set(model.id, toScraped(model));
    }
  } else {
    for (const model of stored) {
      if (dated.has(model.id)) continue;
      const retired = model.status === "retired" || (model.shutdown_date != null && model.shutdown_date < checked);
      if (!retired) continue;
      if (!model.sources.some((source) => source.url === AUGUST_URL || source.url === NOVEMBER_URL)) continue;
      dated.set(model.id, toScraped(model));
    }
  }

  const models = addStubs([...dated.values()], checked);
  if (models.length === 0) return null;
  if (stored.length > 0 && models.length < stored.length * 0.7) return null;
  return models;
}

export async function loadNebiusPages(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<NebiusPages> {
  const november = await readPage(options, NOVEMBER_MD_URL, NOVEMBER_FIXTURE, "november");
  const august = await readPage(options, AUGUST_MD_URL, AUGUST_FIXTURE, "august");
  return { november, august };
}

export const NEBIUS_BASE_URL = BASE_URL;
export const NEBIUS_CHAT_URL = CHAT_URL;

function toScraped(model: ModelRecord): ScrapedModel {
  const { first_seen, updated_at, ...rest } = model;
  void first_seen;
  void updated_at;
  return rest;
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
  for (const [id, info] of named) {
    const parents = [...info.parents].sort();
    const record = baseModel({
      id,
      provider: "nebius",
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
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function removalDate(page: string): string | null {
  const plain = page.replace(/\*\*/g, "");
  const found = new Set<string>();
  for (const match of plain.matchAll(/\bOn ([A-Za-z]+ \d{1,2}, \d{4})\b/g)) {
    const date = parseDate(match[1]).date;
    if (date) found.add(date);
  }
  for (const match of plain.matchAll(/removed from Token Factory(?: Serverless)? on ([A-Za-z]+ \d{1,2}, \d{4})/g)) {
    const date = parseDate(match[1]).date;
    if (date) found.add(date);
  }
  if (found.size !== 1) return null;
  return [...found][0];
}

function scopeNote(page: string): string {
  const plain = page.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "");
  return SCOPE_SENTENCES.filter((sentence) => plain.includes(sentence)).join(" ");
}

function replacementTable(page: string): string[][] | null {
  const tables = markdownTables(page).filter((table) => {
    const header = table[0]?.map(normalizeHeader) ?? [];
    return header.length === 2 && header[0] === "deprecating model" && header[1] === "recommended replacement";
  });
  if (tables.length !== 1) return null;
  return tables[0].slice(1);
}

function normalizeHeader(cell: string): string {
  return cell
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function idsInCell(cell: string): string[] {
  const found = [...cell.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((id): id is string => Boolean(id && isModelId(id)));
  return [...new Set(found)];
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
    const dir = path.join(options.root, "snapshots", "nebius");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}-${options.checked}.md`), body);
    return body;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}
