import { parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, loadHtml, nextElement, tableRows } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const DEPRECATIONS_URL = "https://platform.claude.com/docs/en/about-claude/model-deprecations";
export const PRICING_URL = "https://platform.claude.com/docs/en/about-claude/pricing";

const STATE: Record<string, ScrapedModel["status"]> = {
  active: "active",
  legacy: "legacy",
  deprecated: "deprecated",
  retired: "retired",
};

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(DEPRECATIONS_URL);
  const pricing = await politeFetch(PRICING_URL);
  return parseAnthropic(html, pricing, checked);
}

export function parseAnthropic(html: string, pricing = "", checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const models = new Map<string, ScrapedModel>();
  const statusHeading = $("h2")
    .filter((_, node) => $(node).text().includes("Model status"))
    .get(0);
  const statusTable = statusHeading ? nextElement($, statusHeading, "table") : undefined;
  if (!statusTable) return [];
  for (const row of tableRows($, statusTable).slice(1)) {
    const id = row[0]?.trim();
    if (!id || !id.startsWith("claude-")) continue;
    const state = STATE[(row[1] ?? "").trim().toLowerCase()] ?? "active";
    const deprecated = parseDate(row[2] ?? "");
    const retirement = parseDate(row[3] ?? "");
    models.set(
      id,
      baseModel({
        id,
        provider: "anthropic",
        status: state,
        deprecated: deprecated.date,
        shutdown: retirement.date,
        kind: retirement.kind,
        sourceUrl: DEPRECATIONS_URL,
        sourceLabel: "Anthropic model deprecations",
        checked,
        excerpt: excerpt(row),
      }),
    );
  }

  $("h3").each((_, heading) => {
    const title = $(heading).text();
    const announced = parseDate(title);
    const table = nextElement($, heading, "table");
    if (!table) return;
    const rows = tableRows($, table);
    const header = (rows[0] ?? []).join(" ").toLowerCase();
    if (!header.includes("retirement") || !header.includes("model")) return;
    for (const row of rows.slice(1)) {
      const id = row[1]?.trim();
      const replacement = row[2]?.trim();
      if (!id || !models.has(id)) continue;
      const model = models.get(id)!;
      if (announced.date) model.announced_date = announced.date;
      if (replacement && /^claude-/.test(replacement) && !model.replacements.some((item) => item.model_id === replacement)) {
        model.replacements.push({
          model_id: replacement,
          provider: "anthropic",
          kind: "official",
          source_url: DEPRECATIONS_URL,
        });
      }
    }
  });

  const prices = parseAnthropicPricing(pricing);
  for (const model of models.values()) {
    const price = matchPrice(model.id, prices);
    if (!price) continue;
    model.specs = applyPrice(model.specs, price, PRICING_URL, checked);
  }
  return [...models.values()];
}

export function parseAnthropicPricing(html: string): Map<string, { input: number | null; output: number | null; cached: number | null }> {
  const map = new Map<string, { input: number | null; output: number | null; cached: number | null }>();
  if (!html) return map;
  const $ = loadHtml(html);
  const heading = $("h2, h3")
    .filter((_, node) => $(node).text().includes("Model pricing"))
    .get(0);
  const tableNode = heading ? nextElement($, heading, "table") : undefined;
  if (!tableNode) return map;
  $(tableNode).find("tr").each((_, tr) => {
    const link = $(tr).find("a[href*='/models/']").first();
    const href = link.attr("href") ?? "";
    const slug = href.split("/models/")[1]?.split("/")[0];
    if (!slug) return;
    const cells = $(tr)
      .find("td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();
    const input = firstMoney(cells[1]);
    const output = firstMoney(cells[2]);
    const cached = firstMoney(cells[5]);
    map.set(slug, { input, output, cached });
  });
  return map;
}

const MODELS_URL = "https://platform.claude.com/docs/en/about-claude/models/overview";

export function applyAnthropicOverview(models: ScrapedModel[], html: string, checked: string): void {
  if (!html) return;
  const $ = loadHtml(html);
  const table = $("table").first();
  const rows = tableRows($, table.get(0)!);
  const idRow = rows.find((row) => row[0]?.toLowerCase().includes("api id"));
  if (!idRow) return;
  const ids = idRow.slice(1);
  const byLabel = new Map(rows.map((row) => [row[0]?.toLowerCase() ?? "", row.slice(1)]));
  const context = byLabel.get("context window") ?? [];
  const output = byLabel.get("max output") ?? [];
  const cutoff = byLabel.get("reliable knowledge cutoff") ?? [];
  const thinking = byLabel.get("thinking") ?? [];
  ids.forEach((id, index) => {
    const model = models.find((item) => item.provider === "anthropic" && item.id === id);
    if (!model) return;
    const contextTokens = tokenCount(context[index]);
    const outputTokens = tokenCount(output[index]);
    if (contextTokens) {
      model.specs.context_window_tokens = contextTokens;
      model.specs.specs_sources.context_window_tokens = { url: MODELS_URL, last_checked: checked };
    }
    if (outputTokens) {
      model.specs.max_output_tokens = outputTokens;
      model.specs.specs_sources.max_output_tokens = { url: MODELS_URL, last_checked: checked };
    }
    if (cutoff[index]) {
      model.specs.knowledge_cutoff = cutoff[index];
      model.specs.specs_sources.knowledge_cutoff = { url: MODELS_URL, last_checked: checked };
    }
    const think = (thinking[index] ?? "").toLowerCase();
    if (think.includes("always")) model.specs.reasoning = "always";
    else if (think.includes("adaptive")) model.specs.reasoning = "optional";
    if (model.specs.reasoning) {
      model.specs.specs_sources.reasoning = { url: MODELS_URL, last_checked: checked };
    }
    model.specs.modalities_in = ["text", "image"];
    model.specs.modalities_out = ["text"];
    model.specs.supports_vision = true;
    model.specs.supports_tools = true;
    for (const field of ["modalities_in", "modalities_out", "supports_vision", "supports_tools"] as const) {
      model.specs.specs_sources[field] = { url: MODELS_URL, last_checked: checked };
    }
    model.sources.push({
      url: MODELS_URL,
      label: "Anthropic models overview",
      last_checked: checked,
      excerpt: excerpt([
        id,
        context[index] ? `Context window ${context[index]}` : "",
        output[index] ? `Max output ${output[index]}` : "",
        "Text and image input, text output, vision, and tool use.",
      ]),
    });
  });
}

function tokenCount(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)\s*([km])?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "m") return Math.round(amount * 1_000_000);
  if (unit === "k") return Math.round(amount * 1_000);
  return Math.round(amount);
}

export function priceForAnthropicId(
  id: string,
  prices: Map<string, { input: number | null; output: number | null; cached: number | null }>,
): { input: number | null; output: number | null; cached: number | null } | null {
  return matchPrice(id, prices);
}

function matchPrice(
  id: string,
  prices: Map<string, { input: number | null; output: number | null; cached: number | null }>,
): { input: number | null; output: number | null; cached: number | null } | null {
  const body = id.replace(/^claude-/, "");
  const dated = body.replace(/-\d{8}$/, "");
  let best: string | null = null;
  for (const slug of prices.keys()) {
    if (dated === slug || body === slug) {
      if (!best || slug.length > best.length) best = slug;
    }
  }
  return best ? prices.get(best)! : null;
}

function firstMoney(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}
