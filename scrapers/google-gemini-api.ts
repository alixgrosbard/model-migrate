import { GEMINI_25_RESTRICTED_IDS } from "../src/lib/access.ts";
import { SOURCES_DISAGREE } from "../src/lib/conflicts.ts";
import { compareDate, monthEnd, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml, tableRows } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Cited on each row. This URL 301s to the AI Studio page. */
export const DEPRECATIONS_URL = "https://ai.google.dev/gemini-api/docs/deprecations";
/**
 * The body the refresh reads. The HTML URL above redirects to an AI Studio
 * shell with no table. Appending .md returns the deprecation tables.
 */
export const DEPRECATIONS_MD_URL = "https://aistudio.google.com/docs/deprecations.md";
export const PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing";
/** Same move as the deprecations page. The .md URL is the document. */
export const PRICING_MD_URL = "https://aistudio.google.com/docs/pricing.md";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(DEPRECATIONS_MD_URL);
  const pricing = await politeFetch(PRICING_MD_URL);
  return parseGemini(html, pricing, checked);
}

interface DepTable {
  rows: string[][];
  note: string | null;
}

export function parseGemini(html: string, pricing = "", checked = todayISO()): ScrapedModel[] {
  const tables = deprecationTables(html);
  const models: ScrapedModel[] = [];
  const shutdownTextById = new Map<string, string>();
  for (const table of tables) {
    const rows = table.rows;
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    const modelIdx = header.findIndex((cell) => cell === "model" || cell === "agent");
    const releaseIdx = header.findIndex((cell) => cell.includes("release"));
    const shutdownIdx = header.findIndex((cell) => cell.includes("shutdown"));
    const replacementIdx = header.findIndex((cell) => cell.includes("replacement"));
    if (modelIdx < 0 || shutdownIdx < 0) continue;
    for (const row of rows.slice(1)) {
      const id = (row[modelIdx] ?? "").trim();
      if (!isModelId(id)) continue;
      const shutdownCell = (row[shutdownIdx] ?? "").replace(/\s+/g, " ").trim();
      if (!shutdownTextById.has(id)) shutdownTextById.set(id, shutdownCell);
      const shutdown = parseDate(shutdownCell);
      const release = releaseIdx >= 0 ? parseDate(row[releaseIdx] ?? "") : { date: null, kind: "none" as const };
      const cell = row[replacementIdx] ?? "";
      const parsedReplacement = replacementIds(cell);
      const replacements = parsedReplacement.ids.map((modelId) => ({
        model_id: modelId,
        provider: "google-gemini-api" as const,
        kind: "official" as const,
        source_url: DEPRECATIONS_URL,
      }));
      const autoRouted = parsedReplacement.autoRouteId != null && shutdown.kind === "none";
      const releaseNote = release.date ? `Release date on the deprecations page: ${release.date}.` : null;
      const routeNote = autoRouted
        ? `Deprecated, requests auto-routed to ${parsedReplacement.autoRouteId}, no shutdown date.`
        : null;
      models.push(
        baseModel({
          id,
          provider: "google-gemini-api",
          status: autoRouted ? "deprecated" : geminiStatus(shutdown.date, shutdown.kind, checked),
          announced: null,
          shutdown: shutdown.date,
          kind: shutdown.kind,
          notes: [releaseNote, routeNote].filter(Boolean).join(" ") || null,
          replacements,
          sourceUrl: DEPRECATIONS_URL,
          sourceLabel: "Gemini API deprecations",
          checked,
          excerpt: excerpt(row),
        }),
      );
    }
  }

  const prices = parseGeminiPricing(pricing);
  for (const model of models) {
    const price = prices.get(model.id);
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, PRICING_URL, checked);
    if (price.context) {
      model.specs.context_window_tokens = price.context;
      model.specs.specs_sources.context_window_tokens = { url: PRICING_URL, last_checked: checked };
    }
  }
  const unique = dedupe(models);
  if (html.includes("{% table %}")) applyMarkdownAccessNotes(tables, unique);
  else applyGemini25AccessNotes(loadHtml(html), unique);
  applyPricingShutdownWarnings(unique, pricing, shutdownTextById, checked);
  return unique;
}

function deprecationTables(html: string): DepTable[] {
  if (html.includes("{% table %}")) return markdownDeprecationTables(html);
  return htmlDeprecationTables(html);
}

function htmlDeprecationTables(html: string): DepTable[] {
  const $ = loadHtml(html);
  const tables: DepTable[] = [];
  $("table").each((_, table) => {
    const rows = tableRows($, table);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    if (!header.includes("model") || !header.some((cell) => cell.includes("shutdown"))) return;
    tables.push({ rows, note: null });
  });
  return tables;
}

/** AI Studio docs print tables as `{% table %}` star rows, not HTML tables. */
function markdownDeprecationTables(text: string): DepTable[] {
  const tables: DepTable[] = [];
  const re = /\{%\s*table\s*%\}([\s\S]*?)\{%\s*\/table\s*%\}/g;
  for (const match of text.matchAll(re)) {
    const rows = markdownTableRows(match[1]);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    const modelIdx = header.findIndex((cell) => cell === "model" || cell === "agent");
    if (modelIdx < 0 || !header.some((cell) => cell.includes("shutdown"))) continue;
    tables.push({ rows, note: calloutBefore(text, match.index ?? 0) });
  }
  return tables;
}

function markdownTableRows(body: string): string[][] {
  const rows: string[][] = [];
  for (const block of body.split(/^\s*---\s*$/m)) {
    const cells: string[] = [];
    for (const line of block.split("\n")) {
      const match = line.match(/^\s*\*\s?(.*)$/);
      if (match) {
        cells.push(match[1]);
        continue;
      }
      // A wrapped table cell continues on the next line without a new star.
      const extra = line.trim();
      if (!extra || !cells.length) continue;
      cells[cells.length - 1] = `${cells[cells.length - 1]} ${extra}`;
    }
    if (cells.length) rows.push(cells.map(cleanMarkdown));
  }
  return rows;
}

function cleanMarkdown(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calloutBefore(text: string, tableStart: number): string | null {
  const before = text.slice(0, tableStart);
  const prevTable = before.lastIndexOf("{% /table %}");
  const chunk = before.slice(prevTable + 1);
  const matches = [...chunk.matchAll(/\{%\s*callout[^%]*%\}([\s\S]*?)\{%\s*\/callout\s*%\}/g)];
  const last = matches.at(-1);
  if (!last) return null;
  const plain = cleanMarkdown(last[1].replace(/\{%\s*\/?[\w-]+[^%]*%\}/g, " "));
  return plain || null;
}

const GEMINI_25_LIMITED = new Set<string>(GEMINI_25_RESTRICTED_IDS);

/**
 * The note above the Gemini 2.5 Pro and Gemini 2.5 Flash tables.
 * Only the three stable ids in the following table get it. Preview rows in
 * those tables keep their own shutdown dates and do not get this sentence.
 * A later scrape that drops the aside drops the note with it.
 */
export function gemini25AccessQuote(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim().replace(/^Note:\s*/i, "");
  const limited =
    flat.includes("limiting access to the 2.5 models") || /access to the 2\.5 models is limited/i.test(flat);
  if (limited && /not deprecated/i.test(flat)) return flat;
  return null;
}

function applyGemini25AccessNotes($: ReturnType<typeof loadHtml>, models: ScrapedModel[]) {
  const byId = new Map(models.map((model) => [model.id, model]));
  let pending: string | null = null;
  $("aside, table").each((_, node) => {
    if (node.tagName === "aside") {
      const text = $(node).text().replace(/\s+/g, " ").trim();
      pending = gemini25AccessQuote(text);
      return;
    }
    const quote = pending;
    pending = null;
    if (!quote) return;
    const rows = tableRows($, node);
    attachAccessQuote(byId, rows, quote);
  });
}

function applyMarkdownAccessNotes(tables: DepTable[], models: ScrapedModel[]) {
  const byId = new Map(models.map((model) => [model.id, model]));
  for (const table of tables) {
    if (!table.note) continue;
    const quote = gemini25AccessQuote(table.note);
    if (!quote) continue;
    attachAccessQuote(byId, table.rows, quote);
  }
}

function attachAccessQuote(byId: Map<string, ScrapedModel>, rows: string[][], quote: string) {
  const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
  const modelIdx = header.findIndex((cell) => cell === "model" || cell === "agent");
  if (modelIdx < 0 || !header.some((cell) => cell.includes("shutdown"))) return;
  const note = `The [Gemini API deprecations](${DEPRECATIONS_URL}) page says: "${quote}"`;
  for (const row of rows.slice(1)) {
    const id = (row[modelIdx] ?? "").trim();
    if (!GEMINI_25_LIMITED.has(id)) continue;
    const model = byId.get(id);
    if (!model || model.region_or_platform_notes?.includes(quote)) continue;
    model.region_or_platform_notes = [model.region_or_platform_notes, note].filter(Boolean).join(" ");
  }
}

/** Official wording: "automatically routes API requests to <id>", plus the shorter "auto-routes to <id>". */
const AUTO_ROUTE =
  /(?:automatically routes API requests to|auto-routes to)\s+([A-Za-z0-9][A-Za-z0-9._:/-]*)/i;

export function autoRouteTarget(text: string): string | null {
  const match = text.match(AUTO_ROUTE);
  if (!match || !isModelId(match[1])) return null;
  return match[1];
}

function replacementIds(cell: string): { ids: string[]; autoRouteId: string | null } {
  const autoRouteId = autoRouteTarget(cell);
  const listed = cell
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+or\s+|,/i)
    .map((part) => part.trim())
    .filter(isModelId);
  const ids = autoRouteId ? unique([autoRouteId, ...listed]) : unique(listed);
  return { ids, autoRouteId };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function geminiStatus(date: string | null, kind: ScrapedModel["shutdown_date_kind"], today: string): ScrapedModel["status"] {
  if (!date || kind === "none" || kind === "not_before") return "active";
  const compare = kind === "month_only" ? monthEnd(date) : date;
  return compareDate(compare, today) < 0 ? "retired" : "deprecated";
}

export function parseGeminiPricing(html: string): Map<string, { input: number | null; output: number | null; cached: number | null; context: number | null }> {
  const map = new Map<string, { input: number | null; output: number | null; cached: number | null; context: number | null }>();
  if (!html) return map;
  // The AI Studio pricing page is {% table %} markdown. This reader expects the
  // older HTML page, where each model id is its own line. Skip rather than
  // invent a price from a table cell.
  if (html.includes("{% table %}") && !/<table[\s>]/i.test(html)) return map;
  const $ = loadHtml(html);
  const text = $("main").text().replace(/\u00a0/g, " ");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  let current: string | null = null;
  let mode: "none" | "standard" | "other" = "none";
  let expect: "input" | "output" | "cached" | null = null;
  for (const line of lines) {
    if (isModelId(line) && (line.startsWith("gemini-") || line.startsWith("text-embedding") || line.startsWith("imagen") || line.startsWith("veo-"))) {
      current = line;
      mode = "none";
      expect = null;
      if (!map.has(line)) map.set(line, { input: null, output: null, cached: null, context: null });
      continue;
    }
    if (!current) continue;
    if (line === "Standard") {
      mode = "standard";
      continue;
    }
    if (line === "Batch" || line === "Flex" || line === "Priority" || line === "Free") {
      mode = "other";
      continue;
    }
    if (mode !== "standard") continue;
    if (/^Input price/i.test(line)) {
      expect = "input";
      continue;
    }
    if (/^Output price/i.test(line)) {
      expect = "output";
      continue;
    }
    if (/^Context caching price/i.test(line)) {
      expect = "cached";
      continue;
    }
    if (expect && line.startsWith("$")) {
      const amount = line.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (amount) {
        const row = map.get(current)!;
        if (expect === "input" && row.input == null) row.input = Number(amount[1]);
        if (expect === "output" && row.output == null) row.output = Number(amount[1]);
        if (expect === "cached" && row.cached == null) row.cached = Number(amount[1]);
      }
      expect = null;
    }
  }
  return map;
}

export interface PricingShutdownWarning {
  id: string;
  date: string;
  dateText: string;
  excerpt: string;
}

const MONTH_WORD =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
const SHUTDOWN_PHRASE = new RegExp(
  `is deprecated and will be shut down on\\s+((?:${MONTH_WORD})\\.?\\s+\\d{1,2},?\\s+\\d{4})`,
  "gi",
);
const PRICING_LABEL = "Gemini API pricing";

/** Pricing-page warnings: "<model> is deprecated and will be shut down on <date>". Dates come only from that sentence. */
export function parseGeminiPricingShutdowns(html: string): PricingShutdownWarning[] {
  if (!html.trim()) return [];
  const text = pageText(html);
  const warnings: PricingShutdownWarning[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(SHUTDOWN_PHRASE)) {
    const dateText = match[1].replace(/\s+/g, " ").trim();
    const parsed = parseDate(dateText);
    if (!parsed.date || parsed.kind !== "exact") continue;
    const phraseStart = match.index ?? 0;
    const dateEnd = phraseStart + match[0].length;
    const quote = warningExcerpt(text, phraseStart, dateEnd).slice(0, 300);
    for (const id of idsBeforePhrase(text, phraseStart)) {
      if (seen.has(id)) continue;
      seen.add(id);
      warnings.push({ id, date: parsed.date, dateText, excerpt: quote });
    }
  }
  return warnings;
}

function applyPricingShutdownWarnings(
  models: ScrapedModel[],
  pricing: string,
  shutdownTextById: Map<string, string>,
  checked: string,
) {
  const warnings = parseGeminiPricingShutdowns(pricing);
  if (!warnings.length) return;
  const byId = new Map(warnings.map((warning) => [warning.id, warning]));
  for (const model of models) {
    const warning = byId.get(model.id);
    if (!warning) continue;
    model.sources = [
      ...model.sources.filter((source) => !(source.url === PRICING_URL && source.label === PRICING_LABEL)),
      { url: PRICING_URL, label: PRICING_LABEL, last_checked: checked, excerpt: warning.excerpt },
    ];
    const prefix = stripDisagreement(model.region_or_platform_notes);
    if (model.shutdown_date === warning.date) {
      model.region_or_platform_notes = prefix;
      continue;
    }
    const printed = shutdownTextById.get(model.id) ?? "";
    const listed = printed
      ? `lists shutdown date ${printed}`
      : "has an empty shutdown cell for this model";
    const said = warning.excerpt.endsWith(".") ? warning.excerpt : `${warning.excerpt}.`;
    const note = `${SOURCES_DISAGREE} The [Gemini API deprecations](${DEPRECATIONS_URL}) page ${listed}. The [Gemini API pricing](${PRICING_URL}) page says "${said}" The stored shutdown_date stays the deprecations-page date.`;
    model.region_or_platform_notes = prefix ? `${prefix} ${note}` : note;
  }
}

function stripDisagreement(notes: string | null): string | null {
  if (!notes) return null;
  const index = notes.indexOf(SOURCES_DISAGREE);
  const kept = (index >= 0 ? notes.slice(0, index) : notes).trim();
  return kept || null;
}

function pageText(html: string): string {
  if (!html.includes("<")) return html.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const $ = loadHtml(html);
  $("script, style, noscript").remove();
  return $.root().text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function idsBeforePhrase(text: string, phraseStart: number): string[] {
  const windowStart = Math.max(0, phraseStart - 500);
  const before = text.slice(windowStart, phraseStart);
  const warningAt = before.lastIndexOf("Warning:");
  const subject = warningAt >= 0 ? before.slice(warningAt) : before.slice(-300);
  const ids: string[] = [];
  for (const match of subject.matchAll(/[A-Za-z0-9][A-Za-z0-9._:/-]*/g)) {
    const id = match[0];
    if (!isModelId(id) || !/[-0-9]/.test(id) || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function warningExcerpt(text: string, phraseStart: number, dateEnd: number): string {
  const windowStart = Math.max(0, phraseStart - 500);
  const before = text.slice(windowStart, phraseStart);
  const warningAt = before.lastIndexOf("Warning:");
  const start = warningAt >= 0 ? windowStart + warningAt : phraseStart;
  const rest = text.slice(dateEnd);
  const sentence = rest.match(/\.(?=\s|$)/);
  const end = sentence?.index == null ? dateEnd : dateEnd + sentence.index + 1;
  const full = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (full.length <= 300) return full;
  return text.slice(start, dateEnd).replace(/\s+/g, " ").trim();
}

function dedupe(models: ScrapedModel[]): ScrapedModel[] {
  const map = new Map<string, ScrapedModel>();
  for (const model of models) {
    if (!map.has(model.id)) map.set(model.id, model);
  }
  return [...map.values()];
}
