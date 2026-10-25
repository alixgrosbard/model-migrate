import type { ModelRecord } from "../src/schema.ts";

type CarryModel = Pick<ModelRecord, "id" | "provider" | "status" | "shutdown_date" | "shutdown_date_kind" | "sources">;

function isDeprecationsSource(source: { url: string; label: string }): boolean {
  return /deprecat/i.test(source.url) || /deprecat/i.test(source.label);
}

/**
 * An active model that exists because an official model page names it.
 * The deprecations scrape does not emit these ids, and it does not give them a shutdown date.
 */
export function isDocumentedActiveModel(model: CarryModel): boolean {
  if (model.status !== "active") return false;
  if (model.shutdown_date || model.shutdown_date_kind !== "none") return false;
  if (model.sources.some(isDeprecationsSource)) return false;
  return model.sources.some((source) => /\/models\//i.test(source.url) || /model docs/i.test(source.label));
}

/** Put back documented active models the latest scrape did not emit. Deprecations rows stay gone. */
export function carryForwardDocumentedModels<T extends CarryModel>(previous: T[], scraped: T[]): T[] {
  const have = new Set(scraped.map((model) => `${model.provider}:${model.id}`));
  const extra = previous
    .filter((model) => !have.has(`${model.provider}:${model.id}`) && isDocumentedActiveModel(model))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
  return [...scraped, ...extra];
}
