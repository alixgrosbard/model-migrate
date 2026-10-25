import type { ModelRecord, Source, Specs } from "../schema.ts";
import { emptySpecs } from "../schema.ts";

const DATED_SUFFIX = /^(.+)-(\d{4}-\d{2}-\d{2})$/;
const DEFAULT_SNAPSHOT = /Default snapshot:?\s*`?([A-Za-z0-9._:/-]+)`?/i;
const MODEL_ID = /Model ID:\s*`?([A-Za-z0-9._:/-]+)`?/i;

/** A dated snapshot id is `{alias}-YYYY-MM-DD`. Other suffixes are different products. */
export function aliasIdOf(id: string): string | null {
  return id.match(DATED_SUFFIX)?.[1] ?? null;
}

export function isDeprecationsSource(source: { url: string; label: string }): boolean {
  return /deprecat/i.test(source.url) || /deprecat/i.test(source.label);
}

export interface AliasSnapshotRow {
  model: ModelRecord;
  shutdownDate: string;
  replacementIds: string[];
  sourceUrl: string;
  checked: string;
  excerpt: string;
}

export interface AliasDefaultSnapshot {
  id: string;
  url: string;
  checked: string;
}

export interface AliasSnapshotView {
  snapshots: AliasSnapshotRow[];
  /** Set when every dated snapshot shares one shutdown date. */
  sharedDate: string | null;
  /** Latest snapshot shutdown date. The badge uses this and does not write it onto the alias. */
  badgeDate: string;
  replacementIds: string[];
  defaultSnapshot: AliasDefaultSnapshot | null;
  deprecationsUrl: string;
  checked: string;
  label: string;
  badgeMessage: string;
}

interface AliasInput {
  id: string;
  provider: ModelRecord["provider"];
  slug?: string;
  shutdown_date: string | null;
  shutdown_date_kind: ModelRecord["shutdown_date_kind"];
  sources: Source[];
  replacements: ModelRecord["replacements"];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function datedSnapshotsOf(aliasId: string, provider: string, models: AliasInput[]): AliasInput[] {
  const pattern = new RegExp(`^${escapeRegex(aliasId)}-\\d{4}-\\d{2}-\\d{2}$`);
  return models.filter((model) => model.provider === provider && pattern.test(model.id));
}

function snapshotRows(snaps: AliasInput[]): AliasSnapshotRow[] | null {
  if (!snaps.length) return null;
  const rows: AliasSnapshotRow[] = [];
  for (const snap of snaps) {
    if (!snap.shutdown_date || snap.shutdown_date_kind === "none" || snap.shutdown_date_kind === "not_before") return null;
    const source = snap.sources.find(isDeprecationsSource);
    if (!source) return null;
    rows.push({
      model: snap as ModelRecord,
      shutdownDate: snap.shutdown_date,
      replacementIds: snap.replacements.filter((item) => item.kind === "official").map((item) => item.model_id),
      sourceUrl: source.url,
      checked: source.last_checked,
      excerpt: source.excerpt,
    });
  }
  rows.sort((a, b) => a.shutdownDate.localeCompare(b.shutdownDate) || a.model.id.localeCompare(b.model.id));
  return rows;
}

function publisherPhrase(url: string): string {
  if (url.includes("developers.openai.com")) return "OpenAI's deprecations page";
  if (url.includes("platform.claude.com")) return "Anthropic's deprecations page";
  if (url.includes("ai.google.dev") || url.includes("cloud.google.com")) return "Google's deprecations page";
  return "the deprecations page";
}

function dateClause(rows: AliasSnapshotRow[]): string {
  const byDate = new Map<string, string[]>();
  for (const row of rows) {
    const ids = byDate.get(row.shutdownDate) ?? [];
    ids.push(row.model.id);
    byDate.set(row.shutdownDate, ids);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ids]) => {
      const names = ids.length === 1 ? ids[0] : `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
      return `${names} shut down on ${date}`;
    })
    .join(". ");
}

export function aliasLabel(rows: AliasSnapshotRow[]): string {
  const publisher = publisherPhrase(rows[0].sourceUrl);
  const dates = [...new Set(rows.map((row) => row.shutdownDate))];
  if (dates.length === 1) {
    return `All dated snapshots behind this alias shut down on ${dates[0]} per ${publisher} (the alias itself is not listed by name).`;
  }
  return `Dated snapshots behind this alias are listed on ${publisher} (the alias itself is not listed by name). ${dateClause(rows)}.`;
}

function defaultSnapshot(aliasId: string, alias: AliasInput | undefined, rows: AliasSnapshotRow[]): AliasDefaultSnapshot | null {
  const sources = [...(alias?.sources ?? []), ...rows.flatMap((row) => row.model.sources)];
  const hits: AliasDefaultSnapshot[] = [];
  for (const source of sources) {
    const named = source.excerpt.match(DEFAULT_SNAPSHOT)?.[1];
    if (!named || !rows.some((row) => row.model.id === named)) continue;
    const modelId = source.excerpt.match(MODEL_ID)?.[1];
    const urlNamesAlias = source.url.includes(`/models/${aliasId}.md`) || source.url.includes(`/models/${encodeURIComponent(aliasId)}.md`);
    if (modelId !== aliasId && !urlNamesAlias) continue;
    if (!modelId && !urlNamesAlias) continue;
    hits.push({ id: named, url: source.url.split("?")[0], checked: source.last_checked });
  }
  const ids = new Set(hits.map((hit) => hit.id));
  if (ids.size !== 1) return null;
  hits.sort((a, b) => b.checked.localeCompare(a.checked) || a.url.localeCompare(b.url));
  return hits[0];
}

/**
 * Undated alias whose every `{id}-YYYY-MM-DD` snapshot is on a deprecations page.
 * The returned date is the snapshots' date. It is not a shutdown date for the alias id.
 */
export function aliasSnapshotView(model: AliasInput, models: AliasInput[]): AliasSnapshotView | null {
  if (aliasIdOf(model.id)) return null;
  if (model.shutdown_date || model.shutdown_date_kind !== "none") return null;
  const rows = snapshotRows(datedSnapshotsOf(model.id, model.provider, models));
  if (!rows) return null;
  const dates = [...new Set(rows.map((row) => row.shutdownDate))];
  const badgeDate = dates[dates.length - 1];
  const replacementIds = [...new Set(rows.filter((row) => row.shutdownDate === badgeDate).flatMap((row) => row.replacementIds))];
  const checked = rows.map((row) => row.checked).sort().at(-1) ?? rows[0].checked;
  const deprecationsUrl = rows.find((row) => row.shutdownDate === badgeDate)?.sourceUrl ?? rows[0].sourceUrl;
  return {
    snapshots: rows,
    sharedDate: dates.length === 1 ? dates[0] : null,
    badgeDate,
    replacementIds,
    defaultSnapshot: defaultSnapshot(model.id, model, rows),
    deprecationsUrl,
    checked,
    label: aliasLabel(rows),
    badgeMessage: `snapshots retire ${badgeDate}`,
  };
}

export function aliasLead(view: AliasSnapshotView): string {
  const scope = view.sharedDate ? "those snapshots" : `the snapshots that shut down on ${view.badgeDate}`;
  const replacement = view.replacementIds.length === 0
    ? ""
    : view.replacementIds.length === 1
      ? `The official replacement for ${scope} is ${view.replacementIds[0]}.`
      : `The official replacements for ${scope} are ${view.replacementIds.join(", ")}.`;
  const named = view.defaultSnapshot
    ? `The official model page names ${view.defaultSnapshot.id} as the default snapshot (checked ${view.defaultSnapshot.checked}).`
    : "";
  return [view.label, replacement, named].filter(Boolean).join(" ");
}

export function aliasReplacementSentence(view: AliasSnapshotView): string {
  if (!view.replacementIds.length) return "No official replacement is published for the dated snapshots.";
  const scope = view.sharedDate ? "those dated snapshots" : `the snapshots that shut down on ${view.badgeDate}`;
  if (view.replacementIds.length === 1) return `The official replacement for ${scope} is ${view.replacementIds[0]}. The alias itself is not listed by name.`;
  return `The official replacements for ${scope} are ${view.replacementIds.join(", ")}. The alias itself is not listed by name.`;
}

function modelDocSource(aliasId: string, snaps: AliasInput[]): Source | null {
  const hits = snaps.flatMap((snap) => snap.sources).filter((source) => {
    const named = source.excerpt.match(MODEL_ID)?.[1];
    return named === aliasId || source.url.includes(`/models/${aliasId}.md`) || source.url.includes(`/models/${encodeURIComponent(aliasId)}.md`);
  });
  if (!hits.length) return null;
  hits.sort((a, b) => b.last_checked.localeCompare(a.last_checked) || a.url.localeCompare(b.url));
  return hits[0];
}

function specsFromExcerpt(source: Source): Specs {
  const specs = emptySpecs();
  const context = source.excerpt.match(/context window (\d+)/)?.[1];
  const maxOutput = source.excerpt.match(/max output (\d+)/)?.[1];
  const input = source.excerpt.match(/input \$([0-9]+(?:\.[0-9]+)?)/)?.[1];
  const output = source.excerpt.match(/output \$([0-9]+(?:\.[0-9]+)?)/)?.[1];
  const cached = source.excerpt.match(/cached input \$([0-9]+(?:\.[0-9]+)?)/)?.[1];
  const cite = { url: source.url.split("?")[0], last_checked: source.last_checked };
  if (context) {
    specs.context_window_tokens = Number(context);
    specs.specs_sources.context_window_tokens = cite;
  }
  if (maxOutput) {
    specs.max_output_tokens = Number(maxOutput);
    specs.specs_sources.max_output_tokens = cite;
  }
  if (input) {
    specs.input_price_per_mtok = Number(input);
    specs.currency = "USD";
    specs.specs_sources.input_price_per_mtok = cite;
  }
  if (output) {
    specs.output_price_per_mtok = Number(output);
    specs.currency = "USD";
    specs.specs_sources.output_price_per_mtok = cite;
  }
  if (cached) {
    specs.cached_input_price_per_mtok = Number(cached);
    specs.currency = "USD";
    specs.specs_sources.cached_input_price_per_mtok = cite;
  }
  return specs;
}

/**
 * Alias ids that have qualifying snapshots but no record yet.
 * A model-docs page must name the alias. Fine-tune ids with no model page are not invented.
 */
export function missingAliasModels(models: AliasInput[], now: string): ModelRecord[] {
  const byProvider = new Map<string, AliasInput[]>();
  for (const model of models) {
    const list = byProvider.get(model.provider) ?? [];
    list.push(model);
    byProvider.set(model.provider, list);
  }
  const created: ModelRecord[] = [];
  for (const [provider, rows] of byProvider) {
    const ids = new Set(rows.map((row) => row.id));
    const slugs = new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
    const groups = new Map<string, AliasInput[]>();
    for (const row of rows) {
      const alias = aliasIdOf(row.id);
      if (!alias || ids.has(alias)) continue;
      const list = groups.get(alias) ?? [];
      list.push(row);
      groups.set(alias, list);
    }
    for (const [alias, snaps] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const parsed = snapshotRows(snaps);
      if (!parsed) continue;
      const doc = modelDocSource(alias, snaps);
      if (!doc) continue;
      let slug = slugify(alias);
      while (slugs.has(slug)) slug = `${slug}-2`;
      slugs.add(slug);
      const depSources = [...new Map(parsed.map((row) => [row.excerpt, row])).values()].map((row) => ({
        url: row.sourceUrl,
        label: publisherPhrase(row.sourceUrl) === "OpenAI's deprecations page" ? "OpenAI deprecations" : "Deprecations",
        last_checked: row.checked,
        excerpt: row.excerpt.slice(0, 300),
      }));
      created.push({
        id: alias,
        slug,
        provider: provider as ModelRecord["provider"],
        display_name: alias,
        family: null,
        status: "active",
        announced_date: null,
        deprecation_date: null,
        shutdown_date: null,
        shutdown_date_kind: "none",
        region_or_platform_notes: null,
        replacements: [],
        sources: [...depSources, { ...doc, url: doc.url.split("?")[0] }],
        specs: specsFromExcerpt(doc),
        first_seen: now,
        updated_at: now,
      });
    }
  }
  return created;
}
