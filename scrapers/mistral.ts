import { compareDate, monthEnd, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const MODELS_URL = "https://docs.mistral.ai/models";
export const PRICING_URL = "https://docs.mistral.ai/models/pricing";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(MODELS_URL);
  const pricing = await politeFetch(PRICING_URL);
  return parseMistral(html, pricing, checked);
}

export function parseMistral(html: string, pricing = "", checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const models: ScrapedModel[] = [];
  const nameToId = new Map<string, string>();
  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 4) return;
        const name = $(cells[0]).text().replace(/\s+/g, " ").replace(/↗/g, "").trim();
        const version = $(cells[1]).text().replace(/\s+/g, " ").trim();
        const id = $(cells[2]).text().replace(/\s+/g, " ").trim();
        if (!isModelId(id)) return;
        const dateSpans = $(cells[3])
          .find("span")
          .map((___, span) => $(span).text().trim())
          .get()
          .filter((text) => /\d/.test(text));
        const deprecated = parseDate(dateSpans[0] ?? "");
        const retirement = parseDate(dateSpans[1] ?? "");
        const alternativeName = $(cells[4]).text().replace(/\s+/g, " ").replace(/↗/g, "").trim();
        nameToId.set(name.toLowerCase(), id);
        const status = mistralStatus(retirement.date, retirement.kind, checked);
        const hosted = name.startsWith("Z.ai") ? "Z.ai model on the Mistral API." : null;
        const replacementNote = alternativeName ? `Replacement named on the models page: ${alternativeName}.` : null;
        models.push(
          baseModel({
            id,
            provider: "mistral",
            displayName: version && !name.toLowerCase().includes(version.toLowerCase()) ? `${name} (${version})` : name,
            status,
            deprecated: deprecated.date,
            shutdown: retirement.date,
            kind: retirement.kind,
            notes: [hosted, replacementNote].filter(Boolean).join(" ") || null,
            sourceUrl: MODELS_URL,
            sourceLabel: "Mistral models",
            checked,
            excerpt: excerpt([name, version, id, dateSpans.join(" "), alternativeName]),
            replacements: [],
          }),
        );
        const current = models[models.length - 1];
        current.replacements = [];
        (current as ScrapedModel & { altName?: string }).altName = alternativeName;
      });
  });

  for (const model of models) {
    const alt = (model as ScrapedModel & { altName?: string }).altName;
    if (!alt) continue;
    const replacementId = nameToId.get(alt.toLowerCase());
    if (replacementId && isModelId(replacementId)) {
      model.replacements = [
        { model_id: replacementId, provider: "mistral", kind: "official", source_url: MODELS_URL },
      ];
    }
    delete (model as ScrapedModel & { altName?: string }).altName;
  }

  const prices = parseMistralPricing(pricing);
  for (const model of models) {
    const price = prices.get(model.display_name.toLowerCase().replace(/\s*\(.*$/, ""));
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, PRICING_URL, checked);
  }
  return models;
}

function mistralStatus(date: string | null, kind: ScrapedModel["shutdown_date_kind"], today: string): ScrapedModel["status"] {
  if (!date || kind === "none") return "legacy";
  const compare = kind === "month_only" ? monthEnd(date) : date;
  if (compareDate(compare, today) < 0) return "retired";
  return "deprecated";
}

export function parseMistralPricing(html: string): Map<string, { input: number | null; output: number | null; cached: number | null }> {
  const map = new Map<string, { input: number | null; output: number | null; cached: number | null }>();
  if (!html) return map;
  const $ = loadHtml(html);
  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr)
          .find("td")
          .map((___, cell) => $(cell).text().replace(/\s+/g, " ").trim())
          .get();
        if (cells.length < 4) return;
        const name = cells[0].replace(/↗/g, "").replace(/sale price.*/i, "").trim();
        if (!name || /model/i.test(name)) return;
        const input = dollar(cells[1]);
        const cached = dollar(cells[2]);
        const output = dollar(cells[3]);
        if (input == null && output == null) return;
        map.set(name.toLowerCase(), { input, output, cached });
      });
  });
  return map;
}

function dollar(value: string): number | null {
  const sale = value.match(/sale price:\s*\$([0-9]+(?:\.[0-9]+)?)/i);
  const match = sale ?? value.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    const plain = value.match(/^([0-9]+(?:\.[0-9]+)?)$/);
    return plain ? Number(plain[1]) : null;
  }
  return Number(match[1]);
}
