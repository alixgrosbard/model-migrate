import type { ModelRecord } from "../src/schema.ts";
import { compareDate, todayISO } from "./lib/dates.ts";

type CarryModel = Pick<ModelRecord, "id" | "provider" | "status" | "shutdown_date" | "shutdown_date_kind" | "sources">;

function isDeprecationsSource(source: { url: string; label: string }): boolean {
  return /deprecat/i.test(source.url) || /deprecat/i.test(source.label);
}

function isOfficialSource(source: { url: string; label: string }): boolean {
  return isDeprecationsSource(source) || /\/models\//i.test(source.url) || /model docs/i.test(source.label);
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

/**
 * A stored retirement whose official page later drops the row.
 * The shutdown already happened, so the missing row is not a retraction.
 */
export function isRetiredOfficialRecord(model: CarryModel, today: string): boolean {
  if (!model.sources.some(isOfficialSource)) return false;
  if (model.status === "retired") return true;
  return Boolean(model.shutdown_date && compareDate(model.shutdown_date, today) < 0);
}

/** Put back official records the latest scrape did not emit. Upcoming deprecations rows stay gone. */
export function carryForwardDocumentedModels<T extends CarryModel>(previous: T[], scraped: T[], today = todayISO()): T[] {
  const have = new Set(scraped.map((model) => `${model.provider}:${model.id}`));
  const extra = previous
    .filter((model) => !have.has(`${model.provider}:${model.id}`) && (isDocumentedActiveModel(model) || isRetiredOfficialRecord(model, today)))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
  return [...scraped, ...extra];
}
