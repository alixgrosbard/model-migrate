import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId, tokenCount } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";
import { emptySpecs, type Specs } from "../src/schema.ts";

/** Page URLs. docs.x.ai returns markdown when Accept is text/markdown. A .md suffix on that host is a 404. */
export const MODELS_URL = "https://docs.x.ai/developers/models";
export const PRICING_URL = "https://docs.x.ai/developers/pricing";
export const MAY15_URL = "https://docs.x.ai/developers/migration/may-15-retirement";
export const NOV2_URL = "https://docs.x.ai/developers/migration/imagine-image-quality-nov-2";
export const RELEASE_URL = "https://docs.x.ai/developers/release-notes";

const DOC_LABEL = "xAI model docs";
const PRICE_LABEL = "xAI model pricing";
const DEPRECATION_LABEL = "xAI model deprecations";
const RELEASE_LABEL = "xAI release notes";

interface TextPrice {
  id: string;
  context: number | null;
  input: number;
  cached: number;
  output: number;
  long: { input: number; cached: number; output: number } | null;
  row: string;
}

interface NamedCost {
  id: string;
  cost: string;
  deprecated: boolean;
  row: string;
}

export function parseXai(
  pages: { models: string; pricing: string; may15: string; nov2: string; releaseNotes: string },
  checked: string,
): ScrapedModel[] {
  const modelsPage = plain(pages.models);
  const pricing = plain(pages.pricing);
  const may15 = plain(pages.may15);
  const nov2 = plain(pages.nov2);
  const notes = plain(pages.releaseNotes);
  if (![modelsPage, pricing, may15, nov2, notes].some((page) => /grok-[a-z0-9]/.test(page))) return [];

  const byId = new Map<string, ScrapedModel>();
  for (const row of textPrices(modelsPage)) {
    const record = baseModel({
      id: row.id,
      provider: "xai",
      status: "active",
      kind: "none",
      notes: textNotes(row),
      sourceUrl: MODELS_URL,
      sourceLabel: DOC_LABEL,
      checked,
      excerpt: quoteAround(modelsPage, row.row),
    });
    record.specs = priceSpecs(row, MODELS_URL, checked);
    byId.set(row.id, record);
  }

  for (const row of imagineRows(modelsPage)) {
    const record = baseModel({
      id: row.id,
      provider: "xai",
      status: "active",
      kind: "none",
      notes: `The models page lists this id at ${row.cost}. That price is not per million tokens.`,
      sourceUrl: MODELS_URL,
      sourceLabel: DOC_LABEL,
      checked,
      excerpt: quoteAround(modelsPage, row.row),
    });
    byId.set(row.id, record);
  }

  for (const row of voiceRows(modelsPage)) {
    const record = baseModel({
      id: row.id,
      provider: "xai",
      status: row.deprecated ? "deprecated" : "active",
      kind: "none",
      notes: [
        `The models page lists Speech to Speech (${row.id})${row.deprecated ? " as Deprecated" : ""} at ${row.cost}.`,
        "Those prices are not per million tokens.",
        "The models page does not print a shutdown date for this id.",
      ].join(" "),
      sourceUrl: MODELS_URL,
      sourceLabel: DOC_LABEL,
      checked,
      excerpt: quoteAround(modelsPage, row.row),
      specs: speechSpecs(RELEASE_URL, checked),
    });
    record.specs = speechSpecs(MODELS_URL, checked);
    byId.set(row.id, record);
  }

  applyMay15(byId, may15, checked);
  applyNov2(byId, nov2, checked);
  applyReleaseNotes(byId, notes, modelsPage, checked);
  applyPricing(byId, pricing, checked);
  addReplacementStubs(byId, checked);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function applyMay15(byId: Map<string, ScrapedModel>, page: string, checked: string) {
  const shutdown = parseDate(page.match(/Effective ([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? "").date;
  if (!shutdown) return;
  const table = markdownTables(page).find((rows) => rows[0]?.[0]?.toLowerCase().includes("model being retired"));
  const targets = new Map<string, string>();
  for (const row of table?.slice(1) ?? []) {
    const id = firstGrokId(row[0] ?? "");
    const target = firstGrokId(row[1] ?? "");
    if (id && target) targets.set(id, target);
  }
  const listed = backtickIds(page.split("Recommended Replacements")[0] ?? page).filter((id) => targets.has(id) || id.startsWith("grok-"));
  const ids = [...new Set([...targets.keys(), ...listed.filter((id) => targets.has(id))])];
  for (const id of ids) {
    const target = targets.get(id);
    if (!target) continue;
    const effort = table?.slice(1).find((row) => firstGrokId(row[0] ?? "") === id)?.[1] ?? "";
    const notes = [
      `Effective ${shutdown} at 12:00 PM PT. The page does not say when the retirement was announced.`,
      effort ? `The redirect table says ${plain(effort)}.` : "",
      target !== "grok-4.3"
        ? "The caution says requests to the retired slugs redirect to grok-4.3. The redirect table names a different target, and that table is the stored replacement."
        : "",
      id === "grok-imagine-image-pro"
        ? "The same page says that on November 2, 2026, grok-imagine-image-quality is itself retired in favor of grok-imagine-image-2.0. The stored replacement is the May 15 table target."
        : "",
    ].filter(Boolean);
    const existing = byId.get(id);
    const record = baseModel({
      id,
      provider: "xai",
      status: compareDate(shutdown, checked) < 0 ? "retired" : "deprecated",
      shutdown,
      kind: "exact",
      notes: notes.join(" "),
      replacements: [{ model_id: target, provider: "xai", kind: "official", source_url: MAY15_URL }],
      sourceUrl: MAY15_URL,
      sourceLabel: DEPRECATION_LABEL,
      checked,
      excerpt: quoteAround(page, id),
      specs: existing?.specs,
    });
    if (existing) record.sources.push(...existing.sources.filter((source) => source.url !== MAY15_URL));
    byId.set(id, record);
  }
}

function applyNov2(byId: Map<string, ScrapedModel>, page: string, checked: string) {
  if (!page.includes("grok-imagine-image-quality")) return;
  const shutdown = parseDate("November 2, 2026").date;
  const announced = parseDate(page.match(/began on ([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? "").date;
  if (!shutdown) return;
  const existing = byId.get("grok-imagine-image-quality");
  const record = baseModel({
    id: "grok-imagine-image-quality",
    provider: "xai",
    status: compareDate(shutdown, checked) < 0 ? "retired" : "deprecated",
    announced,
    shutdown,
    kind: "exact",
    notes: [
      "Its 60-day notice period began on September 2, 2026.",
      "After November 2, 2026, requests are served by grok-imagine-image-2.0 with quality set to low.",
      existing?.region_or_platform_notes ?? "The models page lists this id at $0.05 / image. That price is not per million tokens.",
    ].join(" "),
    replacements: [{ model_id: "grok-imagine-image-2.0", provider: "xai", kind: "official", source_url: NOV2_URL }],
    sourceUrl: NOV2_URL,
    sourceLabel: DEPRECATION_LABEL,
    checked,
    excerpt: quoteAround(page, "grok-imagine-image-quality"),
    specs: existing?.specs,
  });
  if (existing) record.sources.push(...existing.sources.filter((source) => source.url !== NOV2_URL));
  byId.set("grok-imagine-image-quality", record);

  const image = byId.get("grok-imagine-image");
  if (image && page.includes("grok-imagine-image` (1.0) is not affected")) {
    image.region_or_platform_notes = [image.region_or_platform_notes, "The November 2 page says grok-imagine-image (1.0) is not affected by this change."]
      .filter(Boolean)
      .join(" ");
    image.sources.push({
      url: NOV2_URL,
      label: DEPRECATION_LABEL,
      last_checked: checked,
      excerpt: quoteAround(page, "not affected"),
    });
  }
}

function applyReleaseNotes(byId: Map<string, ScrapedModel>, page: string, modelsPage: string, checked: string) {
  const voice2 = byId.get("grok-voice-2.0");
  if (voice2 && page.includes("`grok-voice-2.0` is deprecated")) {
    voice2.status = "deprecated";
    voice2.shutdown_date = null;
    voice2.shutdown_date_kind = "none";
    voice2.replacements = ["grok-voice-3.0", "grok-voice-latest"].map((modelId) => ({
      model_id: modelId,
      provider: "xai" as const,
      kind: "official" as const,
      source_url: RELEASE_URL,
    }));
    voice2.region_or_platform_notes = [
      voice2.region_or_platform_notes,
      "The release notes say grok-voice-2.0 is deprecated and to set model to grok-voice-3.0 or grok-voice-latest. They do not print a shutdown date.",
    ]
      .filter(Boolean)
      .join(" ");
    voice2.sources.unshift({
      url: RELEASE_URL,
      label: DEPRECATION_LABEL,
      last_checked: checked,
      excerpt: quoteAround(page, "`grok-voice-2.0` is deprecated"),
    });
  }

  if (page.includes("`grok-voice-latest` now points to `grok-voice-3.0`")) {
    byId.set(
      "grok-voice-latest",
      baseModel({
        id: "grok-voice-latest",
        provider: "xai",
        status: "active",
        kind: "none",
        notes: "The release notes say grok-voice-latest now points to grok-voice-3.0. No shutdown date is published for this alias.",
        sourceUrl: RELEASE_URL,
        sourceLabel: RELEASE_LABEL,
        checked,
        excerpt: quoteAround(page, "grok-voice-latest"),
        specs: speechSpecs(RELEASE_URL, checked),
      }),
    );
  }

  if (page.includes("`grok-voice-3.0` is now available")) {
    const voice3 = byId.get("grok-voice-3.0");
    if (voice3) {
      voice3.sources.push({
        url: RELEASE_URL,
        label: RELEASE_LABEL,
        last_checked: checked,
        excerpt: quoteAround(page, "grok-voice-3.0"),
      });
    }
  }

  const transcribeShutdown = parseDate(page.match(/end of life on ([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1] ?? "").date;
  if (page.includes("grok-voice-transcribe-1.0") && transcribeShutdown) {
    byId.set(
      "grok-voice-transcribe-1.0",
      baseModel({
        id: "grok-voice-transcribe-1.0",
        provider: "xai",
        status: compareDate(transcribeShutdown, checked) < 0 ? "retired" : "deprecated",
        shutdown: transcribeShutdown,
        kind: "exact",
        notes: [
          "The release notes say this slug reaches end of life on that day and requests are routed to grok-voice-transcribe-2.0.",
          "The models page lists Speech to Text at $0.10 / hr and does not name this slug, so that rate is not stored here.",
        ].join(" "),
        replacements: [{ model_id: "grok-voice-transcribe-2.0", provider: "xai", kind: "official", source_url: RELEASE_URL }],
        sourceUrl: RELEASE_URL,
        sourceLabel: DEPRECATION_LABEL,
        checked,
        excerpt: quoteAround(page, "grok-voice-transcribe-1.0"),
      }),
    );
  }
  if (page.includes("`grok-voice-transcribe-2.0` is now available")) {
    byId.set(
      "grok-voice-transcribe-2.0",
      baseModel({
        id: "grok-voice-transcribe-2.0",
        provider: "xai",
        status: "active",
        kind: "none",
        notes: "The release notes say grok-voice-transcribe-2.0 is available and is the default. No shutdown date is published. The models page Speech to Text rate does not name this slug, so that rate is not stored here.",
        sourceUrl: RELEASE_URL,
        sourceLabel: RELEASE_LABEL,
        checked,
        excerpt: quoteAround(page, "grok-voice-transcribe-2.0"),
      }),
    );
  }

  applyFrontier(byId, "grok-4.7", "Grok 4.7", page, modelsPage, checked, true);
  applyFrontier(byId, "grok-4.6", "Grok 4.6", page, modelsPage, checked, false);
  const fourFive = sectionBody(page, "Grok 4.5");
  const fourFiveRow = byId.get("grok-4.5");
  if (fourFiveRow && /configurable reasoning effort \(low, medium, or high/i.test(fourFive)) {
    fourFiveRow.specs.reasoning = "optional";
    fourFiveRow.specs.specs_sources.reasoning = { url: RELEASE_URL, last_checked: checked };
    fourFiveRow.sources.push({
      url: RELEASE_URL,
      label: RELEASE_LABEL,
      last_checked: checked,
      excerpt: quoteAround(fourFive, "configurable reasoning effort"),
    });
  }
}

function sectionBody(page: string, heading: string): string {
  const parts = page.split(/^### /m);
  return parts.find((part) => part.startsWith(heading + "\n") || part.startsWith(heading + "\r")) ?? "";
}

function applyFrontier(
  byId: Map<string, ScrapedModel>,
  id: string,
  heading: string,
  page: string,
  modelsPage: string,
  checked: string,
  cutoff: boolean,
) {
  const record = byId.get(id);
  const section = sectionBody(page, heading);
  if (!record || !/text and image inputs with text-only output/i.test(section)) return;
  record.specs.modalities_in = ["text", "image"];
  record.specs.modalities_out = ["text"];
  record.specs.supports_vision = true;
  record.specs.reasoning = "optional";
  record.specs.specs_sources.modalities_in = { url: RELEASE_URL, last_checked: checked };
  record.specs.specs_sources.modalities_out = { url: RELEASE_URL, last_checked: checked };
  record.specs.specs_sources.supports_vision = { url: RELEASE_URL, last_checked: checked };
  record.specs.specs_sources.reasoning = { url: RELEASE_URL, last_checked: checked };
  const extra = [
    "The release notes say this id has text and image inputs with text-only output, and no text output limit.",
    id === "grok-4.7" ? "The release notes say Grok 4.7 Fast is not available on the public xAI API, so it is not a separate row." : "",
  ].filter(Boolean);
  record.region_or_platform_notes = [record.region_or_platform_notes, ...extra].filter(Boolean).join(" ");
  record.sources.push({
    url: RELEASE_URL,
    label: RELEASE_LABEL,
    last_checked: checked,
    excerpt: quoteAround(section, "text and image inputs"),
  });
  if (cutoff && /knowledge cut-off date of Grok 4\.7 is May 2026/i.test(modelsPage)) {
    record.specs.knowledge_cutoff = "May 2026";
    record.specs.specs_sources.knowledge_cutoff = { url: MODELS_URL, last_checked: checked };
  }
}

function applyPricing(byId: Map<string, ScrapedModel>, page: string, checked: string) {
  const batch = new Set<string>();
  const block = page.split("20% off standard rates")[1]?.split("Models not listed above")[0] ?? "";
  for (const line of block.split("\n")) {
    const id = line.replace(/^-\s*/, "").trim();
    if (isModelId(id) && id.startsWith("grok-")) batch.add(id);
  }
  for (const id of batch) {
    const record = byId.get(id);
    if (!record) continue;
    record.specs.supports_batch = true;
    record.specs.batch_discount_pct = 20;
    record.specs.specs_sources.supports_batch = { url: PRICING_URL, last_checked: checked };
    record.specs.specs_sources.batch_discount_pct = { url: PRICING_URL, last_checked: checked };
  }
  for (const record of byId.values()) {
    if (!record.id.includes("imagine-image") && !record.id.includes("imagine-video")) continue;
    record.specs.supports_batch = true;
    record.specs.batch_discount_pct = 0;
    record.specs.specs_sources.supports_batch = { url: PRICING_URL, last_checked: checked };
    record.specs.specs_sources.batch_discount_pct = { url: PRICING_URL, last_checked: checked };
    record.region_or_platform_notes = [
      record.region_or_platform_notes,
      "The pricing page says image and video generation are supported in the Batch API but are billed at standard rates.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  const build = byId.get("grok-build-0.1");
  if (build && !batch.has(build.id)) {
    build.region_or_platform_notes = [
      build.region_or_platform_notes,
      "The pricing page says models not listed in the batch discount list have no batch discount. This id is not in that list.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (/US regional endpoint/i.test(page)) {
    for (const id of ["grok-4.7", "grok-4.6"]) {
      const record = byId.get(id);
      if (!record) continue;
      record.region_or_platform_notes = [
        record.region_or_platform_notes,
        "The pricing page says the US regional endpoint https://us.api.x.ai/v1 bills token usage at 1.1x the global token rates, and currently lists this id.",
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
}

function addReplacementStubs(byId: Map<string, ScrapedModel>, checked: string) {
  for (const model of [...byId.values()]) {
    for (const replacement of model.replacements) {
      if (byId.has(replacement.model_id)) continue;
      byId.set(
        replacement.model_id,
        baseModel({
          id: replacement.model_id,
          provider: "xai",
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
  const fourThree = byId.get("grok-4.3");
  const maySource = fourThree?.sources.find((source) => source.url === MAY15_URL);
  if (fourThree && maySource == null) {
    const fromRetired = [...byId.values()].some(
      (model) => model.sources.some((source) => source.url === MAY15_URL) && model.replacements.some((item) => item.model_id === "grok-4.3"),
    );
    if (fromRetired) {
      fourThree.specs.reasoning = "optional";
      fourThree.specs.specs_sources.reasoning = { url: MAY15_URL, last_checked: checked };
      fourThree.region_or_platform_notes = [
        fourThree.region_or_platform_notes,
        "The May 15 page says grok-4.3 has 4 reasoning effort levels (none, low, medium, and high).",
      ]
        .filter(Boolean)
        .join(" ");
      fourThree.sources.push({
        url: MAY15_URL,
        label: DEPRECATION_LABEL,
        last_checked: checked,
        excerpt: excerpt(["4 reasoning effort levels (none, low, medium, and high)"]),
      });
    }
  }
}

function textPrices(page: string): TextPrice[] {
  const table = markdownTables(page).find((rows) => rows[0]?.join(" ").includes("Input / 1M tokens"));
  if (!table) return [];
  const grouped = new Map<string, TextPrice>();
  for (const row of table.slice(1)) {
    const cell = row[0] ?? "";
    const id = cell.match(/^(grok-[A-Za-z0-9][A-Za-z0-9.-]*)/)?.[1];
    if (!id || !isModelId(id)) continue;
    const input = money(row[2] ?? "");
    const cached = money(row[3] ?? "");
    const output = money(row[4] ?? "");
    if (input == null || cached == null || output == null) continue;
    const context = tokenCount(row[1] ?? "");
    const long = /≥|>=/.test(cell);
    const current = grouped.get(id);
    if (!current) {
      grouped.set(id, { id, context, input, cached, output, long: long ? { input, cached, output } : null, row: cell });
      continue;
    }
    if (long) current.long = { input, cached, output };
    else {
      current.input = input;
      current.cached = cached;
      current.output = output;
      current.context = context;
      current.row = cell;
    }
  }
  return [...grouped.values()];
}

function imagineRows(page: string): NamedCost[] {
  const table = markdownTables(page).find((rows) => rows[0]?.[0] === "Model" && (rows[0]?.[1] ?? "").includes("Cost"));
  if (!table) return [];
  const rows: NamedCost[] = [];
  for (const row of table.slice(1)) {
    const id = (row[0] ?? "").trim();
    if (!isModelId(id) || !id.startsWith("grok-imagine-")) continue;
    rows.push({ id, cost: row[1] ?? "", deprecated: false, row: `${id} ${row[1] ?? ""}` });
  }
  return rows;
}

function voiceRows(page: string): NamedCost[] {
  const table = markdownTables(page).find((rows) => rows[0]?.[0] === "Mode");
  if (!table) return [];
  const rows: NamedCost[] = [];
  for (const row of table.slice(1)) {
    const mode = row[0] ?? "";
    const id = mode.match(/\((grok-[A-Za-z0-9][A-Za-z0-9.-]*)\)/)?.[1];
    if (!id || !isModelId(id)) continue;
    rows.push({ id, cost: (row[1] ?? "").replace(/\s+/g, " ").trim(), deprecated: /deprecated/i.test(mode), row: mode });
  }
  return rows;
}

function textNotes(row: TextPrice): string {
  const parts = ["The models page lists this id. The deprecations pages checked for this scrape do not give it a shutdown date."];
  if (row.long) {
    parts.push(
      `The models page lists a second rate when the prompt reaches 200k tokens: input $${row.long.input}, cached input $${row.long.cached}, output $${row.long.output} per million tokens.`,
    );
  }
  return parts.join(" ");
}

function priceSpecs(row: TextPrice, url: string, checked: string): Specs {
  const specs = emptySpecs();
  specs.input_price_per_mtok = row.input;
  specs.cached_input_price_per_mtok = row.cached;
  specs.output_price_per_mtok = row.output;
  specs.currency = "USD";
  specs.context_window_tokens = row.context;
  specs.supports_prompt_caching = true;
  const source = { url, last_checked: checked };
  specs.specs_sources = {
    input_price_per_mtok: source,
    cached_input_price_per_mtok: source,
    output_price_per_mtok: source,
    context_window_tokens: source,
    supports_prompt_caching: source,
  };
  return specs;
}

function speechSpecs(url: string, checked: string): Specs {
  const specs = emptySpecs();
  specs.modalities_in = ["audio"];
  specs.modalities_out = ["audio"];
  const source = { url, last_checked: checked };
  specs.specs_sources = { modalities_in: source, modalities_out: source };
  return specs;
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
      .map((cell) => cell.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, "")))) continue;
    if (!current) current = [];
    current.push(cells);
  }
  if (current) tables.push(current);
  return tables;
}

function backtickIds(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]).filter((id): id is string => Boolean(id && isModelId(id) && id.startsWith("grok-")));
}

function firstGrokId(cell: string): string | null {
  return backtickIds(cell)[0] ?? null;
}

function money(cell: string): number | null {
  const match = cell.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function plain(value: string): string {
  return value
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\\\$/g, "$");
}

function quoteAround(page: string, needle: string): string {
  const text = page.replace(/\|/g, " ").replace(/\s+/g, " ");
  const at = text.indexOf(needle);
  const slice = at < 0 ? needle : text.slice(Math.max(0, at - 20), at + needle.length + 180).trim();
  return excerpt([plain(slice)]);
}
