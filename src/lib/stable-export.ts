import type { ChangeRecord, ModelRecord, Source } from "../schema.ts";

/**
 * Rows that share a provider and model id are separate records when the
 * display name or region notes differ (a second region schedule, or two
 * catalog rows that publish one API id). The "-2" slug is the collision
 * suffix from that pair. Dates stay out of this key so a real date change
 * still matches the same row.
 */
export function recordIdentity(
  model: Pick<ModelRecord, "id" | "display_name" | "region_or_platform_notes">,
): string {
  return [model.id, model.display_name, model.region_or_platform_notes ?? ""].join("\u0000");
}

export function compareModels(a: ModelRecord, b: ModelRecord): number {
  return (
    a.provider.localeCompare(b.provider) ||
    a.id.localeCompare(b.id) ||
    a.slug.localeCompare(b.slug) ||
    (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") ||
    a.display_name.localeCompare(b.display_name)
  );
}

export function compareChanges(a: ChangeRecord, b: ChangeRecord): number {
  return (
    a.date.localeCompare(b.date) ||
    a.provider.localeCompare(b.provider) ||
    a.model_id.localeCompare(b.model_id) ||
    a.field.localeCompare(b.field) ||
    a.source_url.localeCompare(b.source_url) ||
    JSON.stringify(a.old).localeCompare(JSON.stringify(b.old)) ||
    JSON.stringify(a.new).localeCompare(JSON.stringify(b.new))
  );
}

function compareSources(a: Source, b: Source): number {
  return a.url.localeCompare(b.url) || a.label.localeCompare(b.label) || a.excerpt.localeCompare(b.excerpt);
}

/** Sort nested source lists so a refresh does not reshuffle the same URLs. */
export function canonicalizeModel<T extends ModelRecord>(model: T): T {
  const specs_sources = Object.fromEntries(
    Object.entries(model.specs.specs_sources).sort(([a], [b]) => a.localeCompare(b)),
  );
  return {
    ...model,
    sources: [...model.sources].sort(compareSources),
    specs: { ...model.specs, specs_sources },
  };
}

/**
 * Facts that should move updated_at. Check dates and list order are not facts.
 * A different specs source URL is a fact, so a flip still counts.
 */
export function realContentKey(model: ModelRecord): string {
  const canonical = canonicalizeModel(model);
  const sources = canonical.sources.map(({ url, label, excerpt }) => ({ url, label, excerpt }));
  const specs_sources = Object.fromEntries(
    Object.entries(canonical.specs.specs_sources).map(([field, source]) => [field, source.url]),
  );
  const { updated_at, first_seen, ...rest } = canonical;
  void updated_at;
  void first_seen;
  return JSON.stringify({ ...rest, sources, specs: { ...canonical.specs, specs_sources } });
}
