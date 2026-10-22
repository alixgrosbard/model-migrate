import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelRecord } from "../schema.ts";
import { today } from "./format.ts";
import { COMPARISON_CHECKED, comparisonPath, comparisons } from "./comparisons.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guidePath, guides } from "./guides.ts";
import { BREAKING_CHANGES_CSV, BREAKING_CHANGES_JSON, BREAKING_CHANGES_PATH, breakingChangesChecked } from "./breaking-changes.ts";
import { REQUEST_ERRORS_INDEX, requestErrorChecked, requestErrorPath, requestErrors, requestErrorsIndexChecked } from "./request-errors.ts";
import { BADGES_PATH } from "./badges.ts";
import { modelsInMonth, questionPath, shutdownMonths, topRetiringModels } from "./growth.ts";
import { migrateHub, modelsHub, providersHub, replaceHub } from "./hubs.ts";
import { OPENAPI_PATH } from "./openapi.ts";
import { providerStatusPath, statusHubPath } from "./status-hubs.ts";
import { shutdownEventPath, shutdownEvents } from "./shutdowns.ts";
import {
  CHANGELOG_PATH,
  datedShutdowns,
  FAQ_PATH,
  monthKeyPath,
  newestUpdated,
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
  if (!existsSync(modelsDir)) return map;
  for (const provider of readdirSync(modelsDir)) {
    const folder = path.join(modelsDir, provider);
    let newest = "";
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      const model = JSON.parse(readFileSync(path.join(folder, file), "utf8")) as ModelRecord;
      all.push(model);
      const day = dateOf(model.updated_at);
      if (!day) continue;
      map.set(`/models/${provider}/${model.slug}/`, day);
      map.set(`/replace/${provider}/${model.slug}/`, day);
      if (day > newest) newest = day;
    }
    if (newest) map.set(`/providers/${provider}/`, newest);
  }
  const newestModel = newestDate(all.map((model) => model.updated_at));
  map.set("/alternatives/", COMPARISON_CHECKED);
  map.set(BREAKING_CHANGES_PATH, breakingChangesChecked());
  map.set(BREAKING_CHANGES_JSON, breakingChangesChecked());
  map.set(BREAKING_CHANGES_CSV, breakingChangesChecked());
  map.set(REQUEST_ERRORS_INDEX, requestErrorsIndexChecked());
  for (const page of requestErrors) map.set(requestErrorPath(page.slug), requestErrorChecked(page));
  map.set(GUIDES_INDEX, GUIDES_CHECKED);
  for (const guide of guides) map.set(guidePath(guide.slug), GUIDES_CHECKED);
  for (const comparison of comparisons) map.set(comparisonPath(comparison.slug), COMPARISON_CHECKED);
  if (newestModel) {
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
    const newest = newestDate(modelsInMonth(all, month).map((model) => model.updated_at));
    if (newest) map.set(`/deadlines/${month}/`, newest);
  }
  const dated = datedShutdowns(all);
  const datedModified = newestUpdated(dated);
  if (datedModified) {
    map.set(TIMELINE_PATH, datedModified);
    map.set(FAQ_PATH, datedModified);
  }
  const upcomingModified = newestUpdated(upcomingShutdowns(all, today()));
  if (upcomingModified) map.set(UPCOMING_PATH, upcomingModified);
  for (const year of shutdownYearList(all)) {
    const newest = newestUpdated(shutdownsInYear(all, year));
    if (newest) map.set(yearPath(year), newest);
  }
  for (const month of shutdownMonthList(all)) {
    const newest = newestUpdated(shutdownsInMonth(all, month));
    if (newest) map.set(monthKeyPath(month), newest);
  }
  const events = shutdownEvents(all);
  const newestEvent = newestDate(events.flatMap((event) => event.models.map((model) => model.updated_at)));
  if (newestEvent) map.set("/shutdowns/", newestEvent);
  for (const event of events) {
    const newest = newestDate(event.models.map((model) => model.updated_at));
    if (newest) map.set(shutdownEventPath(event), newest);
  }
  for (const model of topRetiringModels(all, today(), 40)) {
    const day = dateOf(model.updated_at);
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
      const row = JSON.parse(readFileSync(path.join(migrations, file), "utf8")) as { last_checked?: string };
      const day = dateOf(row.last_checked);
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
