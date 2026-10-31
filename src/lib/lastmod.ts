import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelRecord } from "../schema.ts";
import { today } from "./format.ts";
import { COMPARISON_CHECKED, comparisonPath, comparisons } from "./comparisons.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guideChecked, guidePath, guides } from "./guides.ts";
import { FRAMEWORKS_CHECKED, FRAMEWORKS_INDEX, frameworkPath, frameworks } from "./frameworks.ts";
import { GLOSSARY_CHECKED, GLOSSARY_INDEX, glossaryPath, glossaryTerms } from "./glossary.ts";
import { BREAKING_CHANGES_CSV, BREAKING_CHANGES_JSON, BREAKING_CHANGES_PATH, breakingChangesChecked } from "./breaking-changes.ts";
import { REQUEST_ERRORS_INDEX, requestErrorChecked, requestErrorPath, requestErrors, requestErrorsIndexChecked } from "./request-errors.ts";
import { BADGES_PATH } from "./badges.ts";
import { CONFLICTS_PATH, disagreementNote } from "./conflicts.ts";
import { newestSourceCheck } from "./cited-sources.ts";
import { ALERTS_PATH, GITHUB_ACTION_PATH, METHODOLOGY_PATH, SOURCES_PATH } from "./trust-pages.ts";
import { modelsInMonth, questionPath, shutdownMonths, topRetiringModels } from "./growth.ts";
import { migrateHub, modelsHub, providersHub, replaceHub } from "./hubs.ts";
import { INTEGRATIONS_PATH, MCP_DOCS_CHECKED, MCP_PATH, MCP_SERVER_JSON_PATH } from "./mcp-docs.ts";
import { OPENAPI_PATH } from "./openapi.ts";
import { providerStatusPath, statusHubPath } from "./status-hubs.ts";
import { OPENAI_NOV30_CHECKED, OPENAI_NOV30_PATH, shutdownEventPath, shutdownEvents } from "./shutdowns.ts";
import {
  CHANGELOG_PATH,
  datedShutdowns,
  FAQ_PATH,
  monthKeyPath,
  shutdownMonthList,
  shutdownsInMonth,
  shutdownsInYear,
  shutdownYearList,
  TIMELINE_PATH,
  UPCOMING_PATH,
  upcomingShutdowns,
  yearPath,
} from "./schedule.ts";

let cache: Map<string, string> | null = null;

function dateOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function build(): Map<string, string> {
  const map = new Map<string, string>();
  const root = process.cwd();
  const modelsDir = path.join(root, "data/models");
  const all: ModelRecord[] = [];
  const changes = changeDays(root);
  const contentDay = (model: ModelRecord): string | undefined =>
    changes.get(`${model.provider}/${model.id}`) ?? dateOf(model.first_seen);
  if (!existsSync(modelsDir)) return map;
  for (const provider of readdirSync(modelsDir)) {
    const folder = path.join(modelsDir, provider);
    let newest = "";
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      const model = JSON.parse(readFileSync(path.join(folder, file), "utf8")) as ModelRecord;
      all.push(model);
      const day = contentDay(model);
      if (!day) continue;
      map.set(`/models/${provider}/${model.slug}/`, day);
      map.set(`/replace/${provider}/${model.slug}/`, day);
      if (day > newest) newest = day;
    }
    if (newest) map.set(`/providers/${provider}/`, newest);
  }
  const bySlug = new Map(all.map((model) => [`${model.provider}/${model.slug}`, model]));
  const newestModel = newestDate(all.map(contentDay));
  map.set(MCP_PATH, MCP_DOCS_CHECKED);
  map.set(INTEGRATIONS_PATH, MCP_DOCS_CHECKED);
  map.set(MCP_SERVER_JSON_PATH, MCP_DOCS_CHECKED);
  map.set("/alternatives/", COMPARISON_CHECKED);
  map.set(BREAKING_CHANGES_PATH, breakingChangesChecked());
  map.set(BREAKING_CHANGES_JSON, breakingChangesChecked());
  map.set(BREAKING_CHANGES_CSV, breakingChangesChecked());
  map.set(REQUEST_ERRORS_INDEX, requestErrorsIndexChecked());
  for (const page of requestErrors) map.set(requestErrorPath(page.slug), requestErrorChecked(page));
  map.set(GUIDES_INDEX, GUIDES_CHECKED);
  for (const guide of guides) map.set(guidePath(guide.slug), guideChecked(guide));
  map.set(FRAMEWORKS_INDEX, FRAMEWORKS_CHECKED);
  for (const page of frameworks) map.set(frameworkPath(page.slug), FRAMEWORKS_CHECKED);
  map.set(GLOSSARY_INDEX, GLOSSARY_CHECKED);
  for (const term of glossaryTerms) map.set(glossaryPath(term.slug), GLOSSARY_CHECKED);
  for (const comparison of comparisons) map.set(comparisonPath(comparison.slug), COMPARISON_CHECKED);
  const conflictStamp = newestDate(
    all.filter((model) => disagreementNote(model.region_or_platform_notes)).map((model) => model.updated_at),
  );
  if (conflictStamp) map.set(CONFLICTS_PATH, conflictStamp);
  const sourceCheck = newestSourceCheck(all);
  if (sourceCheck) {
    map.set(METHODOLOGY_PATH, sourceCheck);
    map.set(SOURCES_PATH, sourceCheck);
    map.set(ALERTS_PATH, sourceCheck);
    map.set(GITHUB_ACTION_PATH, sourceCheck);
  }
  if (newestModel) {
    map.set("/", newestModel);
    map.set(modelsHub.path, newestModel);
    map.set(replaceHub.path, newestModel);
    map.set(providersHub.path, newestModel);
    map.set("/api/", newestModel);
    map.set("/deadlines/", newestModel);
    map.set("/deadlines.ics", newestModel);
    map.set("/scan/", newestModel);
    map.set("/questions/", newestModel);
    map.set("/data/models.json", newestModel);
    map.set("/data/deprecations.csv", newestModel);
    map.set(BADGES_PATH, newestModel);
  }
  for (const month of shutdownMonths(all)) {
    const newest = newestDate(modelsInMonth(all, month).map(contentDay));
    if (newest) map.set(`/deadlines/${month}/`, newest);
  }
  const dated = datedShutdowns(all);
  const datedModified = newestDate(dated.map(contentDay));
  if (datedModified) {
    map.set(TIMELINE_PATH, datedModified);
    map.set(FAQ_PATH, datedModified);
  }
  const upcomingModified = newestDate(upcomingShutdowns(all, today()).map(contentDay));
  if (upcomingModified) {
    map.set(UPCOMING_PATH, upcomingModified);
    map.set("/calendar/", upcomingModified);
  }
  map.set(OPENAI_NOV30_PATH, OPENAI_NOV30_CHECKED);
  for (const year of shutdownYearList(all)) {
    const newest = newestDate(shutdownsInYear(all, year).map(contentDay));
    if (newest) map.set(yearPath(year), newest);
  }
  for (const month of shutdownMonthList(all)) {
    const newest = newestDate(shutdownsInMonth(all, month).map(contentDay));
    if (newest) map.set(monthKeyPath(month), newest);
  }
  const events = shutdownEvents(all);
  const newestEvent = newestDate(events.flatMap((event) => event.models.map(contentDay)));
  if (newestEvent) map.set("/shutdowns/", newestEvent);
  for (const event of events) {
    const newest = newestDate(event.models.map(contentDay));
    if (newest) map.set(shutdownEventPath(event), newest);
  }
  for (const model of topRetiringModels(all, today(), 40)) {
    const day = contentDay(model);
    if (!day) continue;
    map.set(questionPath(model, "deprecated"), day);
    map.set(questionPath(model, "shutdown-date"), day);
  }
  const changeDay = latestChangeDate(root);
  const statusStamp = changeDay ?? newestModel;
  if (statusStamp) {
    map.set(statusHubPath("deprecated"), statusStamp);
    map.set(statusHubPath("retired"), statusStamp);
    map.set(OPENAPI_PATH, statusStamp);
    for (const model of all) {
      if (model.status === "deprecated" || model.status === "retired") {
        map.set(providerStatusPath(model.provider, model.status), statusStamp);
      }
    }
  }
  if (changeDay) {
    map.set("/feed.xml", changeDay);
    map.set("/data/changelog.json", changeDay);
    map.set(CHANGELOG_PATH, changeDay);
  }
  const migrations = path.join(root, "data/migrations");
  let newestMigration = "";
  if (existsSync(migrations)) {
    for (const file of readdirSync(migrations)) {
      if (!file.endsWith(".json")) continue;
      const row = JSON.parse(readFileSync(path.join(migrations, file), "utf8")) as {
        last_checked?: string;
        from?: { provider?: string; slug?: string };
        to?: { provider?: string; slug?: string };
      };
      const from = row.from?.provider && row.from.slug ? bySlug.get(`${row.from.provider}/${row.from.slug}`) : undefined;
      const to = row.to?.provider && row.to.slug ? bySlug.get(`${row.to.provider}/${row.to.slug}`) : undefined;
      const day = newestDate([from ? contentDay(from) : undefined, to ? contentDay(to) : undefined]) ?? dateOf(row.last_checked);
      if (!day) continue;
      map.set(`/migrate/${file.replace(/\.json$/, "")}/`, day);
      if (day > newestMigration) newestMigration = day;
    }
  }
  if (newestMigration) map.set(migrateHub.path, newestMigration);
  return map;
}

function newestDate(values: Array<string | undefined>): string | undefined {
  let newest = "";
  for (const value of values) {
    const day = dateOf(value);
    if (day && day > newest) newest = day;
  }
  return newest || undefined;
}

/** Newest changelog day for a model, else the day the record was first stored. Not the scrape rewrite time. */
function changeDays(root: string): Map<string, string> {
  const map = new Map<string, string>();
  const file = path.join(root, "data/changes.jsonl");
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { date?: string; provider?: string; model_id?: string };
    if (!row.provider || !row.model_id) continue;
    const day = dateOf(row.date);
    if (!day) continue;
    const key = `${row.provider}/${row.model_id}`;
    const previous = map.get(key);
    if (!previous || day > previous) map.set(key, day);
  }
  return map;
}

function latestChangeDate(root: string): string | undefined {
  const file = path.join(root, "data/changes.jsonl");
  if (!existsSync(file)) return undefined;
  let newest = "";
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { date?: string };
    const day = dateOf(row.date);
    if (day && day > newest) newest = day;
  }
  return newest || undefined;
}

export function lastmodForUrl(url: string): string | undefined {
  if (!cache) cache = build();
  try {
    const pathname = new URL(url).pathname;
    return cache.get(pathname);
  } catch {
    return undefined;
  }
}
