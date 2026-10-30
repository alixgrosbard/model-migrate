import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { applyAliasSnapshotShutdowns } from "../../src/lib/aliases.ts";
import type { ModelRecord } from "../../src/schema.ts";

export interface ModelRow {
  id: string;
  slug: string;
  provider: string;
  display_name: string;
  status: string;
  shutdown_date: string | null;
  shutdown_date_kind: string;
  replacements: { model_id: string; provider: string; kind: string; source_url: string }[];
  sources: { url: string; label: string; last_checked: string; excerpt: string }[];
  specs: Record<string, unknown>;
}

let cache: Promise<ModelRow[]> | undefined;

export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data", "models");
}

export async function loadModelRows(): Promise<ModelRow[]> {
  cache ??= readAll();
  return cache;
}

async function readAll(): Promise<ModelRow[]> {
  const dir = dataDir();
  const providers = await readdir(dir);
  const models: ModelRow[] = [];
  for (const provider of providers) {
    const folder = path.join(dir, provider);
    const files = await readdir(folder);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      models.push(JSON.parse(await readFile(path.join(folder, file), "utf8")) as ModelRow);
    }
  }
  return applyAliasSnapshotShutdowns(models as ModelRecord[]);
}

export async function loadMigrations() {
  const dir = path.join(path.dirname(dataDir()), "migrations");
  const files = await readdir(dir);
  const rows = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    rows.push(JSON.parse(await readFile(path.join(dir, file), "utf8")));
  }
  return rows;
}
