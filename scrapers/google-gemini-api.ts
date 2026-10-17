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
      const shutdown = parseDate(row[shutdownIdx] ?? "");
      const release = releaseIdx >= 0 ? parseDate(row[releaseIdx] ?? "") : { date: null, kind: "none" as const };
      const replacements = (row[replacementIdx] ?? "")
        .split(/\s+or\s+|,/i)
        .map((part) => part.trim())
        .filter(isModelId)
        .map((modelId) => ({
          model_id: modelId,
          provider: "google-gemini-api" as const,
          kind: "official" as const,
          source_url: DEPRECATIONS_URL,
        }));
      models.push(
        baseModel({
          id,
          provider: "google-gemini-api",
          status: geminiStatus(shutdown.date, shutdown.kind, checked),
          announced: null,
          shutdown: shutdown.date,
          kind: shutdown.kind,
          notes: release.date ? `Release date on the deprecations page: ${release.date}.` : null,
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
  return dedupe(models);
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
  let expect: "input" | "output" | null = null;
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
    if (expect && line.startsWith("$")) {
      const amount = line.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (amount) {
        const row = map.get(current)!;
        if (expect === "input" && row.input == null) row.input = Number(amount[1]);
        if (expect === "output" && row.output == null) row.output = Number(amount[1]);
      }
      expect = null;
    }
  }
  return map;
}

function dedupe(models: ScrapedModel[]): ScrapedModel[] {
  const map = new Map<string, ScrapedModel>();
  for (const model of models) {
    if (!map.has(model.id)) map.set(model.id, model);
  }
  return [...map.values()];
}
