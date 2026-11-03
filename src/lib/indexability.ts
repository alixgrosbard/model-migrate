import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelRecord } from "../schema.ts";
import { applyAliasSnapshotShutdowns } from "./aliases.ts";
import { today } from "./format.ts";
import { modelsInMonth, questionPath, shutdownMonths, topRetiringModels } from "./growth.ts";
import { monthKeyPath, shutdownMonthList, shutdownsInMonth } from "./schedule.ts";

/**
 * Consolidation rule for near-duplicate templates.
 *
 * /migrate/*, /replace/*, and /questions/* leaf pages get noindex,follow.
 * A canonical to "the model page" does not fit: a migrate page compares two
 * models, so there is no single URL to point at. One robots directive covers
 * all three families. The pages stay on the site and return 200. Links on
 * them still pass equity because the directive is follow, not nofollow.
 * The hubs /migrate/, /replace/, and /questions/ stay indexable.
 *
 * Model pages use modelPageIndexable. A shutdown date on or after the build
 * day minus STALE_SHUTDOWN_MONTHS stays indexable (future and recent).
 * Older shutdown dates are noindex,follow. A record with no shutdown date
 * is noindex,follow when it has nothing unique. Nothing unique means
 * region_or_platform_notes is null or blank. Replacement ids and the spec
 * table are the shared template, so they do not keep a page indexable.
 * A note does: it is a region exception, a source disagreement, an auto-route,
 * or another fact the template does not repeat.
 *
 * The build day is today() in format.ts, the UTC day the site is generated.
 */
export const NOINDEX_FOLLOW = "noindex,follow";

/** Months before the build day. A shutdown on the cutoff day is still recent. */
export const STALE_SHUTDOWN_MONTHS = 6;

/** Alias pages that point canonical at another URL. They stay out of the sitemap. */
export const CANONICAL_ALIAS_PATHS = new Set([
  "/google/",
  "/models/openai/gpt-4-1-2/",
  "/migrate/openai__gpt-4-5-preview__to__openai__gpt-4-1-2/",
]);

/**
 * Section 2 of the 2026-10-29 crawl audit. These HTML pages stay indexable
 * and must appear in the sitemap.
 */
export const PRIORITY_SITEMAP_PATHS = [
  "/shutdowns/aws-bedrock-2026-11-13/",
  "/shutdowns/github-copilot-2026-11-16/",
  "/shutdowns/google-gemini-api-2026-11-17/",
  "/shutdowns/azure-openai-2026-11-19/",
  "/openai-evals-agent-builder-prompts-shutdown-nov-30-2026/",
  "/shutdowns/openai-2026-12-01/",
  "/shutdowns/openai-2026-12-11/",
  "/shutdowns/openai-2027-01-14/",
  "/models/github-copilot/claude-opus-4-8/",
  "/models/github-copilot/claude-opus-5/",
  "/models/github-copilot/gpt-5-6-terra/",
  "/",
  "/upcoming/",
  "/deadlines/",
  "/deadlines/2026-11/",
  "/deadlines/2026-12/",
  "/deadlines/2027-01/",
  "/calendar/",
  "/providers/",
  "/providers/github-copilot/",
  "/providers/openai/",
  "/providers/aws-bedrock/",
  "/providers/google-gemini-api/",
  "/guides/what-happens-on-model-shutdown-day/",
  "/guides/swap-a-deprecated-model/",
  "/guides/why-shutdown-dates-differ-by-platform/",
  "/guides/check-model-shutdown-dates-programmatically/",
  "/errors/openai-model-has-been-deprecated/",
] as const;

const NON_HTML_ASSET = /\.(csv|json|ics|xml)$/i;

let cache: Set<string> | null = null;

export interface IndexModel {
  shutdown_date: string | null;
  shutdown_date_kind: ModelRecord["shutdown_date_kind"];
  region_or_platform_notes: string | null;
}

/** First day that still counts as a recent shutdown for this build day. */
export function staleShutdownCutoff(buildDay: string): string {
  const date = new Date(`${buildDay}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - STALE_SHUTDOWN_MONTHS);
  return date.toISOString().slice(0, 10);
}

export function modelPageIndexable(model: IndexModel, buildDay: string): boolean {
  const dated = Boolean(model.shutdown_date) && model.shutdown_date_kind !== "none";
  if (dated) return model.shutdown_date! >= staleShutdownCutoff(buildDay);
  return Boolean(model.region_or_platform_notes?.trim());
}

export function modelRobots(model: IndexModel, buildDay = today()): string | undefined {
  return modelPageIndexable(model, buildDay) ? undefined : NOINDEX_FOLLOW;
}

/** .csv, .json, .ics, and .xml files are not HTML pages. They stay on the site and out of the sitemap. */
export function isNonHtmlAsset(pathname: string): boolean {
  return NON_HTML_ASSET.test(pathname);
}

/** Leaf migrate, replace, and question pages. Hubs do not match. */
export function isConsolidatedLeaf(pathname: string): boolean {
  if (/^\/migrate\/[^/]+\/$/.test(pathname)) return true;
  if (/^\/replace\/[^/]+\/[^/]+\/$/.test(pathname)) return true;
  if (/^\/questions\/[^/]+\/[^/]+\/[^/]+\/$/.test(pathname)) return true;
  return false;
}

export function excludeFromSitemap(url: string): boolean {
  const pathname = pathnameOf(url);
  if (!pathname) return false;
  if (isNonHtmlAsset(pathname)) return true;
  if (isConsolidatedLeaf(pathname)) return true;
  if (CANONICAL_ALIAS_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/.well-known/")) return true;
  if (!cache) cache = excludedPaths(readModels());
  return cache.has(pathname);
}

export function includeInSitemap(url: string): boolean {
  return !excludeFromSitemap(url);
}

export function excludedPathnames(): string[] {
  if (!cache) cache = excludedPaths(readModels());
  return [...cache].sort();
}

export function isThinReplace(model: { replacements: unknown[] }): boolean {
  return model.replacements.length === 0;
}

export function excludedPaths(models: ModelRecord[]): Set<string> {
  const paths = new Set<string>(CANONICAL_ALIAS_PATHS);
  const day = today();
  for (const model of models) {
    paths.add(`/replace/${model.provider}/${model.slug}/`);
    if (!modelPageIndexable(model, day)) paths.add(`/models/${model.provider}/${model.slug}/`);
  }
  for (const model of topRetiringModels(models, day, 40)) {
    paths.add(questionPath(model, "deprecated"));
    paths.add(questionPath(model, "shutdown-date"));
  }
  for (const leaf of migrationLeaves()) paths.add(leaf);
  for (const month of shutdownMonths(models)) {
    if (modelsInMonth(models, month).length === 1) paths.add(`/deadlines/${month}/`);
  }
  for (const month of shutdownMonthList(models)) {
    if (shutdownsInMonth(models, month).length === 1) paths.add(monthKeyPath(month));
  }
  return paths;
}

function pathnameOf(url: string): string | null {
  if (url.startsWith("/")) return url;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function migrationLeaves(): string[] {
  const dir = path.join(process.cwd(), "data/migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => `/migrate/${file.replace(/\.json$/, "")}/`);
}

function readModels(): ModelRecord[] {
  const models: ModelRecord[] = [];
  const dir = path.join(process.cwd(), "data/models");
  if (!existsSync(dir)) return models;
  for (const provider of readdirSync(dir)) {
    const folder = path.join(dir, provider);
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      models.push(JSON.parse(readFileSync(path.join(folder, file), "utf8")) as ModelRecord);
    }
  }
  return applyAliasSnapshotShutdowns(models);
}
