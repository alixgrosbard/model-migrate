import { compareDate, normalizeDashes, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const UPDATES_URL = "https://api-docs.deepseek.com/updates/";
export const PRICING_URL = "https://api-docs.deepseek.com/quick_start/pricing";
export const NEWS_URL = "https://api-docs.deepseek.com/news/news260424/";

const LEGACY_DISCONTINUED =
  /legacy API model names,?\s+deepseek-chat and deepseek-reasoner,?\s+will be discontinued in three months \((\d{4}-\d{2}-\d{2})\)/i;
const LEGACY_ROUTING = /point to the non-thinking mode and thinking mode of (deepseek-v4-flash)/i;
const NEWS_RETIRED =
  /deepseek-chat\s*&\s*deepseek-reasoner will be fully retired and inaccessible after ([^.]+)\./i;
const FLASH_RETIRED =
  /model names (deepseek-v4-flash) and (deepseek-v4-flash-vision-exp) are temporarily routed/i;
const PRICING_LEGACY =
  /legacy names (deepseek-v4-flash) and (deepseek-v4-flash-vision-exp) are still accepted, but the corresponding models have been retired/i;
const USE_FLASH = /(?:Change the model name to|Use) (deepseek-flash)/i;

interface PriceBand {
  input: number | null;
  output: number | null;
  cached: number | null;
}

interface ListedModel {
  id: string;
  version: string | null;
  context: number | null;
  maxOutput: number | null;
  tools: boolean | null;
  json: boolean | null;
  vision: boolean | null;
  price: PriceBand;
}

export function parseDeepSeek(updatesHtml: string, pricingHtml: string, newsHtml = "", checked = "2026-10-25"): ScrapedModel[] {
  const updates = plain(updatesHtml);
  const pricing = plain(pricingHtml);
  const news = plain(newsHtml);
  const models: ScrapedModel[] = [];
  const seen = new Set<string>();

  for (const listed of parsePricingTable(pricingHtml)) {
    seen.add(listed.id);
    const offPeak =
      "Stored prices are the peak cache-miss input, peak cache-hit cached input, and peak output from the pricing table. That page says off-peak rates are half of the peak rates. Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday through Friday, excluding Chinese public holidays.";
    const continued = updates.match(/continue providing API services for DeepSeek V4 Pro after September 14, 2026/i);
    const continueNote =
      listed.id === "deepseek-v4-pro" && continued
        ? "The 2026-09-10 changelog says API service for DeepSeek V4 Pro continues after September 14, 2026, with the same billing. No shutdown date is published."
        : null;
    const versionNote = listed.version ? `Model version on the pricing page: ${listed.version}.` : null;
    models.push(
      withSpecs(
        baseModel({
          id: listed.id,
          provider: "deepseek",
          displayName: listed.version ? `${listed.id} (${listed.version})` : listed.id,
          status: "active",
          announced: announcedOn(updates, listed.id),
          kind: "none",
          notes: [versionNote, continueNote, offPeak].filter(Boolean).join(" "),
          sourceUrl: PRICING_URL,
          sourceLabel: "DeepSeek models and pricing",
          checked,
          excerpt: excerpt([
            listed.id,
            listed.version ?? "",
            listed.context ? `context ${listed.context}` : "",
            listed.maxOutput ? `max output ${listed.maxOutput}` : "",
            listed.price.input != null ? `peak cache miss $${listed.price.input}` : "",
            listed.price.output != null ? `peak output $${listed.price.output}` : "",
          ]),
        }),
        listed,
        checked,
      ),
    );
  }

  const legacyParagraph = paragraphContaining(updates, "will be discontinued in three months");
  const discontinued = legacyParagraph.match(LEGACY_DISCONTINUED);
  const routingSentence =
    updates.match(
      /During the current period, these two model names point to the non-thinking mode and thinking mode of (deepseek-v4-flash), respectively\./i,
    )?.[0] ?? "";
  const routedTo = routingSentence.match(LEGACY_ROUTING)?.[1] ?? null;
  const newsSentence = news.match(NEWS_RETIRED)?.[0]?.trim() ?? "";
  const newsDate = newsDateOf(newsSentence);
  const shutdown = discontinued?.[1] ?? null;
  if (shutdown && isModelId("deepseek-chat") && isModelId("deepseek-reasoner")) {
    const timeNote = /15:59/.test(newsSentence)
      ? "The V4 preview note says these names are fully retired and inaccessible after Jul 24th, 2026, 15:59 (UTC Time)."
      : null;
    const dateNote =
      newsDate && newsDate !== shutdown
        ? `The preview note's date text parses as ${newsDate}, which is not the changelog date ${shutdown}.`
        : null;
    const pair: [string, string][] = [
      ["deepseek-chat", "non-thinking mode of deepseek-v4-flash"],
      ["deepseek-reasoner", "thinking mode of deepseek-v4-flash"],
    ];
    for (const [id, mode] of pair) {
      seen.add(id);
      const row = baseModel({
        id,
        provider: "deepseek",
        status: shutdownStatus(shutdown, checked),
        shutdown,
        kind: "exact",
        notes: [
          routedTo
            ? `The changelog says this name is discontinued on ${shutdown} and, until then, points to the ${mode}.`
            : `The changelog says this name is discontinued on ${shutdown}.`,
          timeNote,
          dateNote,
          routedTo ? `Replacement named on that sentence: ${routedTo}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        replacements: routedTo
          ? [{ model_id: routedTo, provider: "deepseek", kind: "official", source_url: UPDATES_URL }]
          : [],
        sourceUrl: UPDATES_URL,
        sourceLabel: "DeepSeek API changelog",
        checked,
        excerpt: excerpt([legacyParagraph, routingSentence]),
      });
      if (newsSentence) {
        row.sources.push({
          url: NEWS_URL,
          label: "DeepSeek V4 preview note",
          last_checked: checked,
          excerpt: excerpt([newsSentence]),
        });
      }
      models.push(row);
    }
  }

  const flashParagraph = paragraphContaining(updates, "temporarily routed");
  const pricingParagraph = paragraphContaining(pricing, "legacy names");
  const flashMatch = flashParagraph.match(FLASH_RETIRED) ?? pricingParagraph.match(PRICING_LEGACY);
  const replacement =
    flashParagraph.match(USE_FLASH)?.[1] ??
    pricingParagraph.match(USE_FLASH)?.[1] ??
    updates.match(USE_FLASH)?.[1] ??
    pricing.match(USE_FLASH)?.[1] ??
    null;
  if (flashMatch) {
    const ids = [flashMatch[1], flashMatch[2]].filter((id): id is string => Boolean(id && isModelId(id)));
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const note = [
        flashParagraph
          ? "The 2026-09-10 changelog says this model has been retired and the old name is temporarily routed to V4.1 Flash."
          : null,
        pricingParagraph
          ? "The pricing page says the name is still accepted, the model has been retired, and requests are served by DeepSeek-V4.1-Flash-1017 at the Flash price."
          : null,
        "No shutdown day is printed.",
        replacement ? `The pages say to use ${replacement}.` : null,
      ]
        .filter(Boolean)
        .join(" ");
      const row = baseModel({
        id,
        provider: "deepseek",
        status: "retired",
        announced: announcedOn(updates, id),
        kind: "none",
        notes: note,
        replacements: replacement
          ? [{ model_id: replacement, provider: "deepseek", kind: "official", source_url: flashParagraph ? UPDATES_URL : PRICING_URL }]
          : [],
        sourceUrl: flashParagraph ? UPDATES_URL : PRICING_URL,
        sourceLabel: flashParagraph ? "DeepSeek API changelog" : "DeepSeek models and pricing",
        checked,
        excerpt: excerpt([flashParagraph || pricingParagraph]),
      });
      if (flashParagraph && pricingParagraph) {
        row.sources.push({
          url: PRICING_URL,
          label: "DeepSeek models and pricing",
          last_checked: checked,
          excerpt: excerpt([pricingParagraph]),
        });
      }
      models.push(row);
    }
  }

  return models;
}

function withSpecs(model: ScrapedModel, listed: ListedModel, checked: string): ScrapedModel {
  model.specs = applyPrice(model.specs, listed.price, PRICING_URL, checked);
  const flags: [keyof ScrapedModel["specs"], boolean | number | null][] = [
    ["context_window_tokens", listed.context],
    ["max_output_tokens", listed.maxOutput],
    ["supports_tools", listed.tools],
    ["supports_json_schema", listed.json],
    ["supports_vision", listed.vision],
    ["supports_prompt_caching", listed.price.cached != null ? true : null],
    ["reasoning", listed.tools == null && listed.context == null ? null : "optional"],
  ];
  for (const [field, value] of flags) {
    if (value == null) continue;
    if (field === "reasoning") {
      model.specs.reasoning = "optional";
      model.specs.specs_sources.reasoning = { url: PRICING_URL, last_checked: checked };
      continue;
    }
    (model.specs[field] as boolean | number | null) = value as never;
    model.specs.specs_sources[field] = { url: PRICING_URL, last_checked: checked };
  }
  return model;
}

function announcedOn(updates: string, id: string): string | null {
  if (id === "deepseek-v4-flash-vision-exp" && updates.includes("Date: 2026-08-21") && updates.includes(id)) return "2026-08-21";
  if (id === "deepseek-flash" && /Change the model name to deepseek-flash/i.test(updates)) return "2026-09-10";
  if ((id === "deepseek-v4-pro" || id === "deepseek-v4-flash") && /model parameter should be set to deepseek-v4-pro or deepseek-v4-flash/i.test(updates)) {
    return "2026-04-24";
  }
  return null;
}

function shutdownStatus(date: string, today: string): ScrapedModel["status"] {
  return compareDate(date, today) < 0 ? "retired" : "deprecated";
}

function newsDateOf(sentence: string): string | null {
  if (!sentence) return null;
  const withoutOrdinal = sentence.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  return parseDate(withoutOrdinal).date;
}

function parsePricingTable(html: string): ListedModel[] {
  if (!html) return [];
  const $ = loadHtml(html);
  let ids: string[] = [];
  const rows: string[][] = [];
  $("table")
    .first()
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr)
        .find("td, th")
        .map((__, cell) => normalizeDashes($(cell).text()).replace(/\s+/g, " ").trim())
        .get()
        .filter((cell) => cell.length > 0);
      if (cells.length) rows.push(cells);
    });
  const header = rows.find((row) => row[0]?.replace(/\(\d+\)/g, "").trim().toUpperCase() === "MODEL");
  if (!header) return [];
  ids = header
    .slice(1)
    .map(cleanId)
    .filter(isModelId);
  if (!ids.length) return [];
  const listed = new Map<string, ListedModel>(
    ids.map((id) => [
      id,
      {
        id,
        version: null,
        context: null,
        maxOutput: null,
        tools: null,
        json: null,
        vision: null,
        price: { input: null, output: null, cached: null },
      },
    ]),
  );
  let priceKind: "hit" | "miss" | "output" | null = null;
  for (const row of rows) {
    const joined = row.join(" ");
    if (/MODEL VERSION/i.test(joined)) assignText(listed, ids, row, (model, value) => {
      model.version = value;
    });
    if (/CONTEXT LENGTH/i.test(joined)) assignText(listed, ids, row, (model, value) => {
      model.context = tokens(value);
    });
    if (/MAX OUTPUT/i.test(joined)) assignText(listed, ids, row, (model, value) => {
      model.maxOutput = tokens(value);
    });
    if (/Json Output/i.test(joined)) assignFlag(listed, ids, row, (model, value) => {
      model.json = value;
    });
    if (/Tool Calls/i.test(joined)) assignFlag(listed, ids, row, (model, value) => {
      model.tools = value;
    });
    if (/^Vision\b/i.test(row[0] ?? "") || /\bVision\b/.test(joined)) {
      const flags = flagCells(row);
      if (flags.length) assignFlag(listed, ids, row, (model, value) => {
        model.vision = value;
      });
    }
    if (/CACHE HIT/i.test(joined)) priceKind = "hit";
    else if (/CACHE MISS/i.test(joined)) priceKind = "miss";
    else if (/OUTPUT TOKENS/i.test(joined)) priceKind = "output";
    if (!priceKind) continue;
    const band = row.find((cell) => cell === "PEAK" || cell === "OFF-PEAK");
    if (band !== "PEAK") continue;
    const amounts = row.map(money).filter((value): value is number => value != null);
    ids.forEach((id, index) => {
      const amount = amounts[index];
      const model = listed.get(id);
      if (!model || amount == null) return;
      if (priceKind === "hit") model.price.cached = amount;
      if (priceKind === "miss") model.price.input = amount;
      if (priceKind === "output") model.price.output = amount;
    });
  }
  return ids.map((id) => listed.get(id)!).filter(Boolean);
}

function assignText(listed: Map<string, ListedModel>, ids: string[], row: string[], write: (model: ListedModel, value: string) => void) {
  const values = row.slice(1).filter((cell) => !/MODEL VERSION|CONTEXT LENGTH|MAX OUTPUT/i.test(cell));
  ids.forEach((id, index) => {
    const model = listed.get(id);
    const value = values[index] ?? values[0];
    if (!model || !value) return;
    write(model, value);
  });
}

function assignFlag(listed: Map<string, ListedModel>, ids: string[], row: string[], write: (model: ListedModel, value: boolean) => void) {
  const flags = flagCells(row);
  ids.forEach((id, index) => {
    const model = listed.get(id);
    const value = flags[index] ?? flags[0];
    if (!model || value == null) return;
    write(model, value);
  });
}

function flagCells(row: string[]): Array<boolean | null> {
  return row
    .filter((cell) => cell === "✓" || /not supported/i.test(cell) || cell === "✗")
    .map((cell) => (cell === "✓" ? true : /not supported/i.test(cell) || cell === "✗" ? false : null));
}

function cleanId(value: string): string {
  return value.replace(/\(\d+\)/g, "").trim();
}

function tokens(value: string): number | null {
  const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)\s*([KM])?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2]?.toUpperCase();
  if (unit === "M") return Math.round(amount * 1_000_000);
  if (unit === "K") return Math.round(amount * 1_000);
  return Math.round(amount);
}

function money(value: string): number | null {
  const match = value.match(/^\$([0-9]+(?:\.[0-9]+)?)$/);
  return match ? Number(match[1]) : null;
}

function plain(html: string): string {
  if (!html) return "";
  const $ = loadHtml(html);
  $("script, style").remove();
  return normalizeDashes($.root().text()).replace(/\s+/g, " ").trim();
}

function paragraphContaining(text: string, needle: string): string {
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return "";
  const prev = text.lastIndexOf(". ", index);
  const from = prev < 0 ? 0 : prev + 2;
  let cursor = index;
  let end = text.length;
  while (cursor < text.length) {
    const dot = text.indexOf(".", cursor);
    if (dot < 0) break;
    const before = text[dot - 1] ?? "";
    const after = text[dot + 1] ?? "";
    if (/[0-9]/.test(before) && /[0-9]/.test(after)) {
      cursor = dot + 1;
      continue;
    }
    end = dot + 1;
    break;
  }
  return text.slice(from, end).trim();
}
