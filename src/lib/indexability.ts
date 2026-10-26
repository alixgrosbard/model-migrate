import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelRecord } from "../schema.ts";
import { modelsInMonth, shutdownMonths } from "./growth.ts";
import { monthKeyPath, shutdownMonthList, shutdownsInMonth } from "./schedule.ts";

let cache: Set<string> | null = null;

/**
 * Pages that stay on the site but should not be indexed.
 * A replacement page with no named successor repeats the model page.
 * A month page with one row repeats that one model.
 */
export function excludeFromSitemap(url: string): boolean {
  if (!cache) cache = excludedPaths(readModels());
  try {
    return cache.has(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function excludedPathnames(): string[] {
  if (!cache) cache = excludedPaths(readModels());
  return [...cache].sort();
}

export function isThinReplace(model: { replacements: unknown[] }): boolean {
  return model.replacements.length === 0;
}

export function excludedPaths(models: ModelRecord[]): Set<string> {
  const paths = new Set<string>();
  for (const model of models) {
    if (isThinReplace(model)) paths.add(`/replace/${model.provider}/${model.slug}/`);
  }
  for (const month of shutdownMonths(models)) {
    if (modelsInMonth(models, month).length === 1) paths.add(`/deadlines/${month}/`);
  }
  for (const month of shutdownMonthList(models)) {
    if (shutdownsInMonth(models, month).length === 1) paths.add(monthKeyPath(month));
  }
  return paths;
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
  return models;
}
