import { compareDate, monthEnd, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, idsFromCell, loadHtml, parseTokenPrice, tableRows } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";
import { emptySpecs } from "../src/schema.ts";

export const DEPRECATIONS_URL = "https://developers.openai.com/api/docs/deprecations";
export const PRICING_URL = "https://developers.openai.com/api/docs/pricing.md";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(DEPRECATIONS_URL);
  const pricing = await politeFetch(PRICING_URL);
  return parseOpenAI(html, pricing, checked);
}

export function parseOpenAI(html: string, pricing = "", checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  let started = false;
  let announced: string | null = null;
  const found: ScrapedModel[] = [];

  $("h1, h2, h3, table").each((_, node) => {
    const tag = node.tagName;
    const text = $(node).text().replace(/\s+/g, " ").trim();
    if (tag === "h1" && text === "Deprecations") {
      started = true;
      return;
    }
    if (!started) return;
    if (tag === "h2" && /docs agent/i.test(text)) {
      started = false;
      return;
    }
    if (tag === "h3") {
      const parsed = parseDate(text);
      announced = parsed.date;
      return;
    }
    if (tag !== "table") return;
    const trs = $(node).find("tr").toArray();
    if (trs.length < 2) return;
    const header = $(trs[0])
      .find("th, td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim().toLowerCase())
      .get();
    const shutdownIdx = header.findIndex((cell) => cell.includes("shutdown"));
    const modelIdx = header.findIndex((cell) => cell.includes("model") && !cell.includes("price"));
    const replacementIdx = header.findIndex((cell) => cell.includes("replacement") || cell.includes("substitute"));
    const priceIdx = header.findIndex((cell) => cell.includes("price") && !cell.includes("training"));
    if (shutdownIdx < 0 || modelIdx < 0) return;

    for (const tr of trs.slice(1)) {
      const cells = $(tr).find("th, td").toArray();
      const texts = cells.map((cell) => $(cell).text().replace(/\s+/g, " ").trim());
      const ids = cells[modelIdx] ? idsFromCell($, cells[modelIdx]) : [];
      if (!ids.length) continue;
      const shutdown = parseDate(texts[shutdownIdx] ?? "");
      const replacementIds = cells[replacementIdx] ? idsFromCell($, cells[replacementIdx]) : [];
      const price = priceIdx >= 0 ? parseTokenPrice(texts[priceIdx] ?? "") : { input: null, output: null };
      const status = statusFromShutdown(shutdown.date, shutdown.kind, checked);
      for (const id of ids) {
        let specs = emptySpecs();
        if (price.input != null || price.output != null) {
          specs = applyPrice(specs, price, DEPRECATIONS_URL, checked);
        }
        const labelNode = $(cells[modelIdx]).clone();
        labelNode.find("code").remove();
        const label = labelNode.text().replace(/[(),|]/g, " ").replace(/\s+/g, " ").trim();
        const usable = /^[A-Za-z0-9]/.test(label) ? label : "";
        found.push(
          baseModel({
            id,
            provider: "openai",
            displayName: usable && usable.toLowerCase() !== id.toLowerCase() ? `${usable} (${id})` : id,
            status,
            announced,
            shutdown: shutdown.date,
            kind: shutdown.kind,
            replacements: replacementIds.map((modelId) => ({
              model_id: modelId,
              provider: "openai",
              kind: "official" as const,
              source_url: DEPRECATIONS_URL,
            })),
            sourceUrl: DEPRECATIONS_URL,
            sourceLabel: "OpenAI deprecations",
            checked,
            excerpt: excerpt(texts),
            specs,
          }),
        );
      }
    }
  });

  const prices = parseOpenAIPricing(pricing);
  for (const model of found) {
    const price = prices.get(model.id);
    if (!price) continue;
    model.specs = applyPrice(
      model.specs,
      { input: price.input, output: price.output, cached: price.cached },
      "https://developers.openai.com/api/docs/pricing",
      checked,
    );
  }
  return dedupe(found);
}

export function parseOpenAIPricing(markdown: string): Map<string, { input: number | null; output: number | null; cached: number | null }> {
  const map = new Map<string, { input: number | null; output: number | null; cached: number | null }>();
  const start = markdown.indexOf("### Standard pricing data");
  if (start < 0) return map;
  const end = markdown.indexOf("### Batch pricing data", start);
  const section = markdown.slice(start, end < 0 ? undefined : end);
  for (const line of section.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.toLowerCase().includes("model |")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5) continue;
    const id = cells[0].replace(/\s*\(.*$/, "").trim();
    if (!/^[a-z0-9][a-z0-9._:-]+$/i.test(id)) continue;
    map.set(id, {
      input: numberOrNull(cells[1]),
      cached: numberOrNull(cells[2]),
      output: numberOrNull(cells[4]),
    });
  }
  return map;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value || value === "-" || value === "—") return null;
  const match = value.replace(/[$,]/g, "").match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? Number(match[0]) : null;
}

function statusFromShutdown(date: string | null, kind: ScrapedModel["shutdown_date_kind"], today: string): ScrapedModel["status"] {
  if (!date || kind === "none" || kind === "not_before") return "deprecated";
  const compare = kind === "month_only" ? monthEnd(date) : date;
  return compareDate(compare, today) < 0 ? "retired" : "deprecated";
}

function dedupe(models: ScrapedModel[]): ScrapedModel[] {
  const map = new Map<string, ScrapedModel>();
  for (const model of models) {
    const existing = map.get(model.id);
    if (!existing) {
      map.set(model.id, model);
      continue;
    }
    if (!existing.shutdown_date && model.shutdown_date) existing.shutdown_date = model.shutdown_date;
    if (existing.shutdown_date_kind === "none") existing.shutdown_date_kind = model.shutdown_date_kind;
    if (!existing.replacements.length) existing.replacements = model.replacements;
    if (model.specs.input_price_per_mtok != null) existing.specs = model.specs;
  }
  return [...map.values()];
}
