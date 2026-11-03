import type { MigrationRecord, ModelRecord } from "../schema.ts";
import { formatWhen, isUpcomingShutdown } from "./format.ts";

export interface HubPage {
  path: string;
  nav: string;
  title: string;
  description: string;
  h1: string;
}

export const modelsHub: HubPage = {
  path: "/models/",
  nav: "Models",
  title: "All AI models | SunsetDiff",
  description: "Every AI model SunsetDiff tracks, grouped by provider, with status and shutdown date.",
  h1: "Models",
};

export const replaceHub: HubPage = {
  path: "/replace/",
  nav: "Replacements",
  title: "Replacement diffs | SunsetDiff",
  description: "Replacement pages for every AI model SunsetDiff tracks, grouped by provider.",
  h1: "Replacement pages",
};

export const migrateHub: HubPage = {
  path: "/migrate/",
  nav: "Migrations",
  title: "Migration diffs | SunsetDiff",
  description: "Migration pages that compare a model with a named replacement, grouped by provider.",
  h1: "Migration pages",
};

export const providersHub: HubPage = {
  path: "/providers/",
  nav: "Providers",
  title: "AI providers | SunsetDiff",
  description: "AI providers SunsetDiff tracks, with a model count and the next upcoming shutdown.",
  h1: "Providers",
};

export const HUBS: HubPage[] = [modelsHub, replaceHub, migrateHub, providersHub];

export function modelPath(model: { provider: string; slug: string }): string {
  return `/models/${model.provider}/${model.slug}/`;
}

export function replacePath(model: { provider: string; slug: string }): string {
  return `/replace/${model.provider}/${model.slug}/`;
}

export function migratePairPath(from: { provider: string; slug: string }, to: { provider: string; slug: string }): string {
  return `/migrate/${from.provider}__${from.slug}__to__${to.provider}__${to.slug}/`;
}

export function modelsForProvider(models: ModelRecord[], providerId: string): ModelRecord[] {
  return models
    .filter((model) => model.provider === providerId)
    .sort((a, b) => (a.shutdown_date ?? "9999-99-99").localeCompare(b.shutdown_date ?? "9999-99-99") || a.id.localeCompare(b.id));
}

export function countByStatus(models: ModelRecord[]): Record<ModelRecord["status"], number> {
  const counts: Record<ModelRecord["status"], number> = { active: 0, legacy: 0, deprecated: 0, retired: 0 };
  for (const model of models) counts[model.status] += 1;
  return counts;
}

export function statusCountLabel(models: ModelRecord[]): string {
  const counts = countByStatus(models);
  return `${models.length} (deprecated ${counts.deprecated}, legacy ${counts.legacy}, retired ${counts.retired}, active ${counts.active})`;
}

export interface NextShutdown {
  date: string;
  label: string;
  count: number;
  model: ModelRecord;
}

/** Earliest exact date or shutdown month that is still ahead. Not-sooner-than floors are left out. */
export function nextUpcomingShutdown(models: ModelRecord[], day: string): NextShutdown | null {
  const upcoming = models.filter((model) => isUpcomingShutdown(model, day));
  if (!upcoming.length) return null;
  upcoming.sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const date = upcoming[0].shutdown_date;
  if (!date) return null;
  const same = upcoming.filter((model) => model.shutdown_date === date);
  return { date, label: formatWhen(same[0]), count: same.length, model: same[0] };
}

export function replacementLinkText(model: ModelRecord): string {
  if (!model.replacements.length) return "Not published";
  return model.replacements
    .map((item) => `${item.model_id} (${item.kind === "editorial" ? "editorial suggestion" : "official"})`)
    .join(", ");
}

export function migrationsForProvider(migrations: MigrationRecord[], providerId: string): MigrationRecord[] {
  return migrations
    .filter((migration) => migration.from.provider === providerId)
    .sort((a, b) => a.from.model_id.localeCompare(b.from.model_id) || a.to.model_id.localeCompare(b.to.model_id));
}

export function filterText(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ").toLowerCase();
}
