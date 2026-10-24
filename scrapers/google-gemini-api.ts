import { SOURCES_DISAGREE } from "../src/lib/conflicts.ts";
import { compareDate, monthEnd, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml, tableRows } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const DEPRECATIONS_URL = "https://ai.google.dev/gemini-api/docs/deprecations";
export const PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(DEPRECATIONS_URL);
  const pricing = await politeFetch(PRICING_URL);
  return parseGemini(html, pricing, checked);
}

export function parseGemini(html: string, pricing = "", checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const models: ScrapedModel[] = [];
  const shutdownTextById = new Map<string, string>();
  $("table").each((_, table) => {
    const rows = tableRows($, table);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    if (!header.includes("model") || !header.some((cell) => cell.includes("shutdown"))) return;
    const modelIdx = header.indexOf("model");
    const releaseIdx = header.findIndex((cell) => cell.includes("release"));
    const shutdownIdx = header.findIndex((cell) => cell.includes("shutdown"));
    const replacementIdx = header.findIndex((cell) => cell.includes("replacement"));
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
  });

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
  applyPricingShutdownWarnings(unique, pricing, shutdownTextById, checked);
  return unique;
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
