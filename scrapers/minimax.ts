import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../src/schema.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Markdown MiniMax publishes. Stored sources use the page without .md. */
export const MODELS_MD_URL = "https://platform.minimax.io/docs/faq/models.md";
export const MODELS_URL = "https://platform.minimax.io/docs/faq/models";
export const TEXT_GENERATION_URL = "https://platform.minimax.io/docs/guides/text-generation";
export const PRICING_URL = "https://platform.minimax.io/docs/pricing/overview";
export const MODELS_FIXTURE = "snapshots/fixtures/minimax/models-2026-10-30.md";

/** OpenAI-compatible host printed on the text generation guide. */
export const MINIMAX_BASE_URL = "https://api.minimax.io/v1";
export const MINIMAX_CHAT_URL = "https://api.minimax.io/v1/chat/completions";

const DOC_LABEL = "MiniMax model list";
const STUB_LABEL = "Named as an official replacement";

const FAMILY_PREFIXES = ["MiniMax-M2.5", "MiniMax-M2.7"];
const REPLACEMENT_ID = "MiniMax-M3.1-Flash";

/**
 * null means the page is not the model list with the retirement notice and the Retired Models table.
 * The notice date is the shutdown date for the M2.5 and M2.7 rows.
 * The Retired Models table calls those same rows Retired. That disagreement stays in the note.
 * A replacement is stored only when the notice names M3.1 Flash and the Available Models table lists MiniMax-M3.1-Flash.
 */
export function parseMinimax(markdown: string, checked: string): ScrapedModel[] | null {
  const shutdown = noticeDate(markdown, "These models will be retired.");
  const newUsers = noticeDate(markdown, "These models will no longer be available to new users.");
  const table = retiredTable(markdown);
  if (!shutdown || !newUsers || !table) return null;
  if (table.length === 0) return null;

  const routed = /automatically be routed to \*\*M3\.1 Flash\*\*/.test(markdown);
  const available = availableIds(markdown);
  const replacement = routed && available.includes(REPLACEMENT_ID) ? REPLACEMENT_ID : null;
  const retiredIntro = markdown.includes("The following models have been retired and are no longer available.");
  if (!retiredIntro) return null;

  const models: ScrapedModel[] = [];
  const seen = new Set<string>();
  for (const row of table) {
    const id = row.model;
    if (seen.has(id)) return null;
    seen.add(id);
    if (row.status !== "Retired") return null;
    const family = FAMILY_PREFIXES.some((prefix) => id === prefix || id.startsWith(`${prefix}-`));
    const line = `| ${id} | ${row.type} | ${row.status} |`;
    const notes = family
      ? familyNote(newUsers.label, shutdown.label, replacement)
      : `The Retired Models table lists this id as ${row.type} and Retired. The page says these models have been retired and are no longer available. It does not print a shutdown date for this id.`;
    models.push(
      baseModel({
        id,
        provider: "minimax",
        status: family ? (compareDate(shutdown.iso, checked) < 0 ? "retired" : "deprecated") : "retired",
        shutdown: family ? shutdown.iso : null,
        kind: family ? "exact" : "none",
        notes,
        replacements: family && replacement
          ? [{ model_id: replacement, provider: "minimax", kind: "official", source_url: MODELS_URL }]
          : [],
        sourceUrl: MODELS_URL,
        sourceLabel: DOC_LABEL,
        checked,
        excerpt: excerpt([family ? `${shutdown.label}: These models will be retired. ${line}` : line]),
      }),
    );
  }

  for (const model of models) {
    if (model.id === "Music-2.5+") model.slug = "music-2-5-plus";
  }
  if (replacement) models.push(stub(replacement, checked));
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * null means keep the stored MiniMax rows.
 * A list is safe to write when the page parsed and no still-upcoming stored id disappeared.
 */
export function assembleMinimax(markdown: string | null, checked: string, previous: ModelRecord[] = []): ScrapedModel[] | null {
  if (markdown == null) return null;
  const next = parseMinimax(markdown, checked);
  if (next == null || next.length === 0) return null;
  const stored = previous.filter((model) => model.provider === "minimax");
  const nextIds = new Set(next.map((model) => model.id));
  const upcomingGone = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked && !nextIds.has(model.id));
  if (upcomingGone.length) return null;
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const nextUpcoming = next.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;
  if (stored.length > 0 && next.length < stored.length * 0.7) return null;
  return next;
}

export async function loadMinimaxPage(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<string | null> {
  if (options.fromSnapshots) {
    try {
      return await readFile(path.join(options.root, MODELS_FIXTURE), "utf8");
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return null;
    }
  }
  try {
    const { politeFetch } = await import("./lib/fetch.ts");
    const body = await politeFetch(MODELS_MD_URL);
    const dir = path.join(options.root, "snapshots", "minimax");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `models-${options.checked}.md`), body);
    return body;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}

function familyNote(newUsers: string, shutdown: string, replacement: string | null): string {
  const route = replacement
    ? ` Starting ${newUsers}, M Plan and Token Plan requests to M2.5 and M2.7 models are automatically routed to M3.1 Flash, and the existing model names keep working. The notice names M3.1 Flash. The Available Models table lists ${replacement}.`
    : "";
  return `The retirement notice says these models are no longer available to new users on ${newUsers}, and are retired on ${shutdown}. Pay-as-you-go API requests stop working once these models are retired.${route} The Retired Models table on the same page lists this id as Retired and says these models have been retired and are no longer available.`;
}

function stub(id: string, checked: string): ScrapedModel {
  return baseModel({
    id,
    provider: "minimax",
    status: "active",
    kind: "none",
    notes: `The Available Models table lists this id. The retirement notice says M Plan and Token Plan requests to M2.5 and M2.7 models are automatically routed to M3.1 Flash. No shutdown date was published for this id on that page.`,
    sourceUrl: MODELS_URL,
    sourceLabel: STUB_LABEL,
    checked,
    excerpt: excerpt([`${id} is listed under Available Models.`]),
  });
}

function noticeDate(page: string, sentence: string): { iso: string; label: string } | null {
  const match = page.match(new RegExp(`\\*\\*([A-Za-z]+ \\d{1,2}, \\d{4}):\\*\\* ${escapeRegExp(sentence)}`));
  if (!match?.[1]) return null;
  const parsed = parseDate(match[1]);
  if (!parsed.date || parsed.kind !== "exact") return null;
  return { iso: parsed.date, label: match[1] };
}

function retiredTable(page: string): { model: string; type: string; status: string }[] | null {
  const tables = markdownTables(page).filter((table) => {
    const header = table[0]?.map(normalizeHeader) ?? [];
    return header.length === 3 && header[0] === "model" && header[1] === "type" && header[2] === "status";
  });
  if (tables.length !== 1) return null;
  const rows = [];
  for (const cells of tables[0].slice(1)) {
    if (cells.length !== 3) return null;
    const model = cells[0]?.trim() ?? "";
    const type = cells[1]?.trim() ?? "";
    const status = cells[2]?.trim() ?? "";
    if (!isMinimaxId(model) || !type || !status) return null;
    rows.push({ model, type, status });
  }
  return rows;
}

function availableIds(page: string): string[] {
  const heading = page.indexOf("## Available Models");
  const retired = page.indexOf("## Retired Models");
  if (heading < 0 || retired < heading) return [];
  const section = page.slice(heading, retired);
  const ids = new Set<string>();
  for (const match of section.matchAll(/\[([^\]]+)\]\(/g)) {
    const id = match[1]?.trim() ?? "";
    if (isMinimaxId(id)) ids.add(id);
  }
  return [...ids];
}

function isMinimaxId(value: string): boolean {
  if (!value || value.length < 2 || value.length > 80) return false;
  if (/\s/.test(value)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(value);
}

function normalizeHeader(cell: string): string {
  return cell.replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim().toLowerCase();
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
