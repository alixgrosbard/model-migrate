import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId, tokenCount } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";
import { emptySpecs, type Specs } from "../src/schema.ts";

/** Markdown Cohere publishes. Stored sources use the page without .md. */
export const DEPRECATIONS_MD_URL = "https://docs.cohere.com/docs/deprecations.md";
export const MODELS_MD_URL = "https://docs.cohere.com/docs/models.md";
export const DEPRECATIONS_URL = "https://docs.cohere.com/docs/deprecations";
export const MODELS_URL = "https://docs.cohere.com/docs/models";

const DEPRECATION_LABEL = "Cohere model deprecations";
const DOC_LABEL = "Cohere model docs";

interface CatalogRow {
  id: string;
  status: string;
  description: string;
  modality: string;
  context: number | null;
  maxOutput: number | null;
  endpoints: string;
  section: string;
}

interface Retirement {
  id: string;
  status: "deprecated" | "retired";
  announced: string | null;
  deprecated: string | null;
  shutdown: string | null;
  replacements: string[];
  notes: string[];
  excerpt: string;
}

export function parseCohere(deprecationsMd: string, modelsMd: string, checked: string): ScrapedModel[] {
  const deprecations = plain(deprecationsMd);
  const modelsPage = plain(modelsMd);
  if (!deprecations.trim() && !modelsPage.trim()) return [];
  if (!/command-|embed-|rerank-|c4ai-|cohere-transcribe|parse-v|north-|tiny-aya|summarize/.test(deprecations + modelsPage)) {
    return [];
  }

  const retired = parseDeprecations(deprecations, checked);
  const catalog = parseCatalog(modelsPage);
  const byId = new Map<string, ScrapedModel>();

  for (const row of retired) {
    byId.set(row.id, fromRetirement(row, catalog.get(row.id), checked));
  }
  for (const row of catalog.values()) {
    if (byId.has(row.id)) continue;
    byId.set(row.id, fromCatalog(row, checked));
  }
  for (const id of ["command-nightly", "command-light-nightly"]) {
    if (byId.has(id) || !modelsPage.includes(`\`${id}\``)) continue;
    byId.set(
      id,
      baseModel({
        id,
        provider: "cohere",
        status: "active",
        kind: "none",
        notes: "The models page lists this id on the platform table and does not print a status or a shutdown date.",
        sourceUrl: MODELS_URL,
        sourceLabel: DOC_LABEL,
        checked,
        excerpt: quoteAround(modelsPage, id),
      }),
    );
  }
  addReplacementStubs(byId, checked);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function fromRetirement(row: Retirement, catalog: CatalogRow | undefined, checked: string): ScrapedModel {
  const notes = [...row.notes];
  if (catalog?.description) notes.push(`The models page says: ${clip(catalog.description)}`);
  if (catalog && /for new projects/i.test(catalog.description)) {
    notes.push("That sentence recommends a model for new projects. It is not stored as a deprecation replacement.");
  }
  const record = baseModel({
    id: row.id,
    provider: "cohere",
    status: row.status,
    announced: row.announced,
    deprecated: row.deprecated,
    shutdown: row.shutdown,
    kind: row.shutdown ? "exact" : "none",
    notes: notes.join(" "),
    replacements: row.replacements.map((modelId) => ({
      model_id: modelId,
      provider: "cohere" as const,
      kind: "official" as const,
      source_url: DEPRECATIONS_URL,
    })),
    sourceUrl: DEPRECATIONS_URL,
    sourceLabel: DEPRECATION_LABEL,
    checked,
    excerpt: row.excerpt,
    specs: catalog ? catalogSpecs(catalog, checked) : emptySpecs(),
  });
  if (catalog) {
    record.sources.push({
      url: MODELS_URL,
      label: DOC_LABEL,
      last_checked: checked,
      excerpt: quoteAround(`${row.id} ${catalog.status} ${catalog.description}`, row.id),
    });
  }
  return record;
}

function fromCatalog(row: CatalogRow, checked: string): ScrapedModel {
  const notes = [
    row.status ? `The models page lists this id as ${row.status}.` : "The models page lists this id and does not print a shutdown date.",
    "The deprecations page does not give this id a shutdown date.",
  ];
  if (/alias for/i.test(row.description)) notes.push(clip(row.description));
  if (/for new projects/i.test(row.description)) {
    notes.push("The models page recommends another id for new projects. That sentence is not stored as a deprecation replacement.");
  }
  if (/tool use/i.test(row.description)) notes.push("The models page says this id supports tool use.");
  return baseModel({
    id: row.id,
    provider: "cohere",
    status: "active",
    kind: "none",
    notes: notes.join(" "),
    sourceUrl: MODELS_URL,
    sourceLabel: DOC_LABEL,
    checked,
    excerpt: quoteAround(`${row.id} ${row.status} ${row.description} ${row.modality} ${row.context ?? ""}`, row.id),
    specs: catalogSpecs(row, checked),
  });
}

function parseDeprecations(page: string, checked: string): Retirement[] {
  const sections = page.split(/^### /m).slice(1);
  const rows: Retirement[] = [];
  for (const section of sections) {
    const title = section.slice(0, section.indexOf("\n"));
    const body = section.slice(section.indexOf("\n") + 1);
    if (title.startsWith("2026-04-04")) rows.push(...aprilRows(body, checked));
    else if (title.startsWith("2025-09-15")) rows.push(...septemberRows(body));
    else if (title.startsWith("2024-12-02")) rows.push(...rerankRows(body, checked));
  }
  const fineTune = sections.find((section) => section.startsWith("2025-03-08"));
  if (fineTune) {
    const base = rows.find((row) => row.id === "command-r-03-2024");
    const sunset = parseDate(fineTune.match(/until ([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? "").date;
    if (base && sunset) {
      base.notes.push(
        `The deprecations page says models fine-tuned with Command-R-03-2024 are supported until ${sunset}. That date is not the base model shutdown.`,
      );
    }
  }
  return rows;
}

function aprilRows(body: string, checked: string): Retirement[] {
  const shutdown = parseLooseDate(body.match(/Effective ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/)?.[1] ?? "");
  if (!shutdown) return [];
  const retiredPart = body.split(/We encourage/i)[0] ?? body;
  const rest = body.slice(body.search(/Embedding tasks/i));
  const embedPart = rest.split(/Chat tasks/i)[0] ?? "";
  const chatPart = (rest.split(/Chat tasks/i)[1] ?? "").split(/Our team/i)[0] ?? "";
  const embedTargets = codes(embedPart);
  const chatTargets = codes(chatPart);
  const status = compareDate(shutdown, checked) < 0 ? "retired" : "deprecated";
  return codes(retiredPart).map((id) => ({
    id,
    status,
    announced: null,
    deprecated: null,
    shutdown,
    replacements: id.startsWith("embed-") ? embedTargets : id.startsWith("c4ai-") ? chatTargets : [],
    notes: [
      `Effective ${shutdown}, the deprecations page says this id will be retired.`,
      id.startsWith("embed-") ? "The embedding replacements are the ids under Embedding tasks alternatives." : "",
      id.startsWith("c4ai-") ? "The chat replacements are the ids under Chat tasks alternatives." : "",
    ].filter(Boolean),
    excerpt: quoteAround(retiredPart, id),
  }));
}

function septemberRows(body: string): Retirement[] {
  const deprecated = parseLooseDate(body.match(/Effective ([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? "");
  if (!deprecated) return [];
  const list = body.split(/For command model replacements/i)[0] ?? body;
  const recommendation = (body.split(/For command model replacements/i)[1] ?? "").split(/Retired Fine-Tuning/i)[0] ?? "";
  const replacements = codes(recommendation);
  return codes(list).map((id) => {
    const command = id === "command" || id.startsWith("command-");
    const notes = [
      "The deprecations page lists this id under Deprecated Models effective September 15, 2025. It does not assign a shutdown date.",
      "The page says a shutdown date will be assigned later, and that requests fail only after a shutdown date.",
    ];
    if (id === "summarize") {
      notes.push(
        "The bullet points at https://docs.cohere.com/docs/summarizing-text#migration-from-summarize-to-chat-endpoint and does not name one replacement model id.",
      );
    }
    return {
      id,
      status: "deprecated" as const,
      announced: null,
      deprecated,
      shutdown: null,
      replacements: command ? replacements : [],
      notes,
      excerpt: quoteAround(list, id),
    };
  });
}

function rerankRows(body: string, checked: string): Retirement[] {
  const announced = parseLooseDate(body.match(/On ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/)?.[1] ?? "");
  const table = markdownTables(body).find((rows) => rows[0]?.[0]?.toLowerCase().includes("shutdown"));
  if (!table) return [];
  const rows: Retirement[] = [];
  for (const row of table.slice(1)) {
    const shutdown = parseDate(row[0] ?? "").date;
    const id = codes(row[1] ?? "")[0];
    const replacement = codes(row[3] ?? "")[0];
    if (!shutdown || !id) continue;
    rows.push({
      id,
      status: compareDate(shutdown, checked) < 0 ? "retired" : "deprecated",
      announced,
      deprecated: announced,
      shutdown,
      replacements: replacement ? [replacement] : [],
      notes: [
        `The deprecations table lists the price as ${plain(row[2] ?? "")}, not per million tokens.`,
        "The page says fine-tuned models created from these base models are not affected by this deprecation.",
      ],
      excerpt: quoteAround(row.join(" "), id),
    });
  }
  return rows;
}

function parseCatalog(page: string): Map<string, CatalogRow> {
  const rows = new Map<string, CatalogRow>();
  const chunks = page.split(/^## /m).slice(1);
  for (const chunk of chunks) {
    const title = chunk.slice(0, chunk.indexOf("\n")).trim();
    if (/platform/i.test(title)) continue;
    const section = title.split("\n")[0] ?? title;
    for (const table of markdownTables(chunk.split(/^### /m)[0] ?? chunk)) {
      const header = table[0]?.map((cell) => cell.toLowerCase()) ?? [];
      if (header.some((cell) => cell.includes("amazon bedrock") || cell.includes("sagemaker"))) continue;
      const idCol = header.findIndex((cell) => cell.includes("model"));
      if (idCol < 0) continue;
      const statusCol = header.findIndex((cell) => cell === "status");
      const descriptionCol = header.findIndex((cell) => cell.includes("description"));
      const modalityCol = header.findIndex((cell) => cell.startsWith("modalit"));
      const contextCol = header.findIndex((cell) => cell.includes("context"));
      const outputCol = header.findIndex((cell) => cell.includes("maximum output"));
      const endpointCol = header.findIndex((cell) => cell.includes("endpoint"));
      for (const row of table.slice(1)) {
        const id = cellId(row[idCol] ?? "");
        if (!id) continue;
        rows.set(id, {
          id,
          status: statusCol >= 0 ? row[statusCol] ?? "" : "",
          description: descriptionCol >= 0 ? row[descriptionCol] ?? "" : "",
          modality: modalityCol >= 0 ? row[modalityCol] ?? "" : "",
          context: contextCol >= 0 ? tokenCount(row[contextCol] ?? "") : null,
          maxOutput: outputCol >= 0 ? tokenCount(row[outputCol] ?? "") : null,
          endpoints: endpointCol >= 0 ? row[endpointCol] ?? "" : "",
          section,
        });
      }
    }
  }
  return rows;
}

function catalogSpecs(row: CatalogRow, checked: string): Specs {
  const specs = emptySpecs();
  const source = { url: MODELS_URL, last_checked: checked };
  if (row.context != null) {
    specs.context_window_tokens = row.context;
    specs.specs_sources.context_window_tokens = source;
  }
  if (row.maxOutput != null) {
    specs.max_output_tokens = row.maxOutput;
    specs.specs_sources.max_output_tokens = source;
  }
  const modalities = modalitiesFrom(row);
  if (modalities.input) {
    specs.modalities_in = modalities.input;
    specs.specs_sources.modalities_in = source;
  }
  if (modalities.output) {
    specs.modalities_out = modalities.output;
    specs.specs_sources.modalities_out = source;
  }
  if (modalities.vision) {
    specs.supports_vision = true;
    specs.specs_sources.supports_vision = source;
  }
  if (/tool use/i.test(row.description)) {
    specs.supports_tools = true;
    specs.specs_sources.supports_tools = source;
  }
  if (row.section === "Audio") {
    specs.modalities_in = ["audio"];
    specs.modalities_out = ["text"];
    specs.specs_sources.modalities_in = source;
    specs.specs_sources.modalities_out = source;
  }
  return specs;
}

function modalitiesFrom(row: CatalogRow): { input: Specs["modalities_in"]; output: Specs["modalities_out"]; vision: boolean } {
  const text = row.modality.toLowerCase();
  if (!text) return { input: null, output: null, vision: false };
  const input: NonNullable<Specs["modalities_in"]> = [];
  if (text.includes("text")) input.push("text");
  if (text.includes("image")) input.push("image");
  if (text.includes("pdf")) input.push("pdf");
  const chat = /chat/i.test(row.endpoints) || row.section === "Command" || row.section === "North" || row.section === "Aya";
  return {
    input: input.length ? input : null,
    output: chat && input.includes("text") ? ["text"] : null,
    vision: input.includes("image"),
  };
}

function addReplacementStubs(byId: Map<string, ScrapedModel>, checked: string) {
  for (const model of [...byId.values()]) {
    for (const replacement of model.replacements) {
      if (byId.has(replacement.model_id)) continue;
      byId.set(
        replacement.model_id,
        baseModel({
          id: replacement.model_id,
          provider: "cohere",
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
}

function codes(text: string): string[] {
  const found = [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]).filter((id): id is string => Boolean(id && isModelId(id)));
  return [...new Set(found)];
}

function cellId(cell: string): string | null {
  const code = cell.match(/`([^`]+)`/)?.[1] ?? cell.trim();
  return isModelId(code) ? code : null;
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

function parseLooseDate(raw: string): string | null {
  return parseDate(raw.replace(/(\d+)(st|nd|rd|th)/gi, "$1")).date;
}

function plain(value: string): string {
  return value
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\\\$/g, "$")
    .replace(/\\&/g, "&");
}

function clip(value: string): string {
  const text = plain(value).replace(/\s+/g, " ").trim();
  return text.length <= 240 ? text : text.slice(0, 239).trimEnd() + "…";
}

function quoteAround(page: string, needle: string): string {
  const text = page.replace(/\|/g, " ").replace(/\s+/g, " ");
  const at = text.indexOf(needle);
  const slice = at < 0 ? needle : text.slice(Math.max(0, at - 30), at + needle.length + 160).trim();
  return excerpt([plain(slice)]);
}
