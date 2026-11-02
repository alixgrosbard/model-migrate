import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId } from "./lib/html.ts";
import { applyPrice, baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";
import { emptySpecs, type Specs } from "../src/schema.ts";

/** Markdown Groq publishes for the deprecations page. Stored sources use the page without .md. */
export const DEPRECATIONS_MD_URL = "https://console.groq.com/docs/deprecations.md";
export const MODELS_MD_URL = "https://console.groq.com/docs/models.md";
export const DEPRECATIONS_URL = "https://console.groq.com/docs/deprecations";
export const MODELS_URL = "https://console.groq.com/docs/models";

const ENTERPRISE =
  "This deprecation applies to free and developer-tier usage; enterprise customers with a committed-spend contract are not affected.";
const PREVIEW_NOTE =
  "Preview models are intended for evaluation purposes only and should not be used in production environments as they may be discontinued at short notice.";

interface DeprecationRow {
  id: string;
  shutdown: string;
  announced: string | null;
  replacements: string[];
  textOnly: boolean;
  enterprise: boolean;
  notes: string[];
  excerpt: string;
}

interface ListedModel {
  id: string;
  tier: "production" | "preview";
  enterpriseLabel: boolean;
  price: { input: number | null; output: number | null };
  hourly: string | null;
  perCharacters: string | null;
  context: number | null;
  maxOutput: number | null;
}

export function parseGroq(deprecationsMd: string, modelsMd: string, checked: string): ScrapedModel[] {
  const deprecated = parseDeprecations(deprecationsMd);
  const listed = parseModelsPage(modelsMd);
  const listedById = new Map(listed.map((row) => [row.id, row]));
  const models: ScrapedModel[] = [];
  const seen = new Set<string>();

  for (const row of deprecated) {
    seen.add(row.id);
    const catalog = listedById.get(row.id);
    const notes = [...row.notes];
    if (row.enterprise) notes.push(ENTERPRISE);
    if (row.textOnly) notes.push("The replacement column says one id is for text-only workloads.");
    if (catalog) {
      notes.push(
        catalog.tier === "production"
          ? "The models page still lists this id under Production Models."
          : "The models page still lists this id under Preview Models.",
      );
      if (catalog.enterpriseLabel) notes.push("The models page prints Enterprise next to this id.");
      if (catalog.hourly) notes.push(`The models page lists the price as ${catalog.hourly} per hour, not per million tokens.`);
      if (catalog.perCharacters) notes.push(`The models page lists the price as ${catalog.perCharacters} per 1M characters, not per million tokens.`);
    }
    const record = baseModel({
      id: row.id,
      provider: "groq",
      status: compareDate(row.shutdown, checked) < 0 ? "retired" : "deprecated",
      announced: row.announced,
      shutdown: row.shutdown,
      kind: "exact",
      notes: notes.join(" "),
      replacements: row.replacements.map((modelId) => ({
        model_id: modelId,
        provider: "groq",
        kind: "official" as const,
        source_url: DEPRECATIONS_URL,
      })),
      sourceUrl: DEPRECATIONS_URL,
      sourceLabel: "Groq model deprecations",
      checked,
      excerpt: row.excerpt,
    });
    if (catalog) {
      record.specs = specsFromListing(catalog, checked);
      record.sources.push({
        url: MODELS_URL,
        label: "Groq supported models",
        last_checked: checked,
        excerpt: excerpt([row.id, catalog.tier, catalog.context ? `context ${catalog.context}` : ""]),
      });
    }
    applyCapabilityNotes(record, deprecationsMd, checked);
    models.push(record);
  }

  for (const row of listed) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const notes = [
      row.tier === "preview"
        ? `The models page lists this id under Preview Models. ${PREVIEW_NOTE} No shutdown date is published.`
        : "The models page lists this id under Production Models. The deprecations page does not give this id a shutdown date.",
      row.enterpriseLabel ? "The models page prints Enterprise next to this id." : null,
      row.hourly ? `The models page lists the price as ${row.hourly} per hour, not per million tokens.` : null,
      row.perCharacters ? `The models page lists the price as ${row.perCharacters} per 1M characters, not per million tokens.` : null,
    ]
      .filter(Boolean)
      .join(" ");
    const record = baseModel({
      id: row.id,
      provider: "groq",
      status: "active",
      kind: "none",
      notes,
      sourceUrl: MODELS_URL,
      sourceLabel: "Groq supported models",
      checked,
      excerpt: excerpt([
        row.id,
        row.tier,
        row.context ? `context ${row.context}` : "",
        row.maxOutput ? `max completion ${row.maxOutput}` : "",
        row.price.input != null ? `input $${row.price.input}` : "",
        row.price.output != null ? `output $${row.price.output}` : "",
      ]),
      specs: specsFromListing(row, checked),
    });
    applyCapabilityNotes(record, deprecationsMd, checked);
    models.push(record);
  }

  const known = new Set(models.map((model) => model.id));
  for (const model of [...models]) {
    for (const replacement of model.replacements) {
      if (known.has(replacement.model_id)) continue;
      known.add(replacement.model_id);
      models.push(
        baseModel({
          id: replacement.model_id,
          provider: "groq",
          status: "active",
          kind: "none",
          notes: `Named as an official replacement for ${model.id}. No shutdown date was published for this id on that page.`,
          sourceUrl: replacement.source_url,
          sourceLabel: "Named as an official replacement",
          checked,
          excerpt: excerpt([`Named as an official replacement for ${model.id}.`]),
        }),
      );
    }
  }

  return models;
}

function parseDeprecations(markdown: string): DeprecationRow[] {
  const text = markdown.replace(/\\/g, "");
  const historyAt = text.search(/^## .*Deprecation History/m);
  const history = historyAt >= 0 ? text.slice(historyAt) : text;
  const sections = history.split(/^### /m).slice(1);
  const tableIds = new Set<string>();
  const parsed: { section: string; rows: { id: string; shutdown: string; replacements: string[]; textOnly: boolean }[] }[] = [];
  for (const section of sections) {
    const rows = tableRows(section);
    if (!rows.length) continue;
    for (const row of rows) tableIds.add(row.id);
    parsed.push({ section, rows });
  }

  const byId = new Map<string, DeprecationRow>();
  for (const { section, rows } of parsed) {
    const prose = section.split("\n").filter((line) => !line.trim().startsWith("|")).join(" ");
    const announced = announcedDate(prose);
    const enterprise = prose.includes(ENTERPRISE);
    const favorIds =
      rows.length === 1
        ? [...prose.matchAll(/in favor of `([A-Za-z0-9][A-Za-z0-9._:/-]*)`/g)]
            .map((match) => match[1])
            .filter((id): id is string => Boolean(id && isModelId(id) && tableIds.has(id)))
        : [];
    for (const row of rows) {
      const existing = byId.get(row.id);
      if (existing) {
        if (existing.shutdown !== row.shutdown && !existing.notes.some((note) => note.includes(row.shutdown))) {
          existing.notes.push(`Another section on this page lists shutdown date ${row.shutdown} for this id.`);
        }
        continue;
      }
      const replacements = [...row.replacements];
      const notes: string[] = [];
      for (const id of favorIds) {
        if (id === row.id || replacements.includes(id)) continue;
        replacements.push(id);
        notes.push(`The paragraph says in favor of ${id}. The recommended replacement column is what the table prints.`);
      }
      if (/will return errors/i.test(prose) && prose.includes(row.id)) {
        notes.push("That section says requests to the model id will return errors from the shutdown date.");
      }
      if (/automatically upgrade/i.test(prose) && prose.includes(row.id)) {
        const upgrade = exactDate(prose.match(/until ([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1] ?? "");
        if (upgrade) notes.push(`The page says these ids automatically upgrade on ${upgrade}, before the shutdown date.`);
      }
      const typo = prose.match(/`(llama-3\.30-70b-versatile)`/);
      if (typo && prose.includes(row.id) && replacements.includes("llama-3.3-70b-versatile")) {
        notes.push("One sentence names llama-3.30-70b-versatile. That id is not in a replacement column. The column names llama-3.3-70b-versatile.");
      }
      byId.set(row.id, {
        id: row.id,
        shutdown: row.shutdown,
        announced,
        replacements,
        textOnly: row.textOnly,
        enterprise,
        notes,
        excerpt: excerpt([row.id, row.shutdown, replacements.join(" ")]),
      });
    }
  }
  return [...byId.values()];
}

function tableRows(section: string): { id: string; shutdown: string; replacements: string[]; textOnly: boolean }[] {
  const rows: { id: string; shutdown: string; replacements: string[]; textOnly: boolean }[] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 3) continue;
    if (/^:?-+:?$/.test(cells[0].replace(/\s/g, ""))) continue;
    const header = cells[0].toLowerCase();
    if (header === "deprecated model" || header === "model id") continue;
    const id = cells[0].replace(/`/g, "").trim();
    if (!isModelId(id)) continue;
    const shutdown = shortDate(cells[1]);
    if (!shutdown) continue;
    const replacementCell = cells[2];
    const textOnly = /text-only/i.test(replacementCell);
    const replacements = replacementIds(replacementCell);
    rows.push({ id, shutdown, replacements, textOnly });
  }
  return rows;
}

function replacementIds(cell: string): string[] {
  const cleaned = cell.replace(/`/g, "").replace(/\([^)]*\)/g, " ").replace(/[—–]/g, " ");
  const parts = cleaned.split(/\s+or\s+|\s+/i).map((part) => part.trim()).filter(Boolean);
  const ids: string[] = [];
  for (const part of parts) {
    if (!isModelId(part) || ids.includes(part)) continue;
    ids.push(part);
  }
  return ids;
}

function shortDate(raw: string): string | null {
  const text = raw.trim();
  const iso = parseDate(text);
  if (iso.kind === "exact" && iso.date) return iso.date;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = 2000 + Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function announcedDate(prose: string): string | null {
  const match = prose.match(/\bon\s+([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/i);
  return match ? exactDate(match[1] ?? "") : null;
}

function exactDate(raw: string): string | null {
  const parsed = parseDate(raw.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1"));
  return parsed.kind === "exact" ? parsed.date : null;
}

function parseModelsPage(markdown: string): ListedModel[] {
  const text = markdown.replace(/\\/g, "");
  const production = sectionBetween(text, "Production Models", "Preview Models");
  const preview = sectionBetween(text, "Preview Models", "Deprecated Models");
  return [...rowsIn(production, "production"), ...rowsIn(preview, "preview")];
}

function sectionBetween(text: string, start: string, end: string): string {
  const startAt = text.indexOf(start);
  if (startAt < 0) return "";
  const rest = text.slice(startAt + start.length);
  const endAt = rest.indexOf(end);
  return endAt < 0 ? rest : rest.slice(0, endAt);
}

function rowsIn(section: string, tier: "production" | "preview"): ListedModel[] {
  const rows: ListedModel[] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    if (/^:?-+:?$/.test(cells[0].replace(/\s/g, ""))) continue;
    if (cells[0].toLowerCase().includes("model id")) continue;
    const link = cells[0].match(/\/docs\/model\/([A-Za-z0-9][A-Za-z0-9._/-]*)\)/);
    const id = link?.[1];
    if (!id || !isModelId(id)) continue;
    const priceCell = cells[2] ?? "";
    const tokenPrice = priceCell.match(/\$(\d+(?:\.\d+)?)\s*input\s*\$(\d+(?:\.\d+)?)\s*output/i);
    const hourly = priceCell.match(/\$(\d+(?:\.\d+)?)\s*per hour/i)?.[1] ?? null;
    const perCharacters = priceCell.match(/\$(\d+(?:\.\d+)?)\s*per 1M characters/i)?.[1] ?? null;
    rows.push({
      id,
      tier,
      enterpriseLabel: /Enterprise/i.test(cells[0]),
      price: {
        input: tokenPrice ? Number(tokenPrice[1]) : null,
        output: tokenPrice ? Number(tokenPrice[2]) : null,
      },
      hourly: hourly ? `$${hourly}` : null,
      perCharacters: perCharacters ? `$${perCharacters}` : null,
      context: tokenCount(cells[4] ?? ""),
      maxOutput: tokenCount(cells[5] ?? ""),
    });
  }
  return rows;
}

function tokenCount(cell: string): number | null {
  const text = cell.replace(/,/g, "").trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function specsFromListing(row: ListedModel, checked: string): Specs {
  const specs = applyPrice(emptySpecs(), row.price, MODELS_URL, checked);
  if (row.context != null) {
    specs.context_window_tokens = row.context;
    specs.specs_sources.context_window_tokens = { url: MODELS_URL, last_checked: checked };
  }
  if (row.maxOutput != null) {
    specs.max_output_tokens = row.maxOutput;
    specs.specs_sources.max_output_tokens = { url: MODELS_URL, last_checked: checked };
  }
  return specs;
}

function applyCapabilityNotes(model: ScrapedModel, deprecationsMd: string, checked: string) {
  if (model.id !== "qwen/qwen3.8-27b") return;
  const plain = deprecationsMd.replace(/\\/g, "");
  if (!/tool use, and JSON mode/i.test(plain)) return;
  model.specs.supports_tools = true;
  model.specs.supports_json_schema = true;
  model.specs.specs_sources.supports_tools = { url: DEPRECATIONS_URL, last_checked: checked };
  model.specs.specs_sources.supports_json_schema = { url: DEPRECATIONS_URL, last_checked: checked };
  const note = "The deprecations page calls qwen/qwen3.8-27b a direct successor with tool use and JSON mode.";
  model.region_or_platform_notes = model.region_or_platform_notes ? `${model.region_or_platform_notes} ${note}` : note;
}
