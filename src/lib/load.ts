import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  changeSchema,
  migrationSchema,
  modelSchema,
  providerSchema,
  sponsorSchema,
  type ChangeRecord,
  type MigrationRecord,
  type ModelRecord,
  type Provider,
} from "../schema.ts";
import { applyAliasSnapshotShutdowns } from "./aliases.ts";
import { compareModels } from "./stable-export.ts";

const root = process.cwd();
let providerCache: Promise<Provider[]> | undefined;
let modelCache: Promise<ModelRecord[]> | undefined;
let migrationCache: Promise<MigrationRecord[]> | undefined;
let changeCache: Promise<ChangeRecord[]> | undefined;

export async function loadProviders(): Promise<Provider[]> {
  providerCache ??= (async () => {
    const raw = JSON.parse(await readFile(path.join(root, "data/providers.json"), "utf8"));
    return providerSchema.array().parse(raw);
  })();
  return providerCache;
}

export async function loadModels(): Promise<ModelRecord[]> {
  modelCache ??= readModels();
  return modelCache;
}

async function readModels(): Promise<ModelRecord[]> {
  const dir = path.join(root, "data/models");
  const providers = await readdir(dir);
  const models: ModelRecord[] = [];
  for (const provider of providers) {
    const folder = path.join(dir, provider);
    const files = await readdir(folder);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = JSON.parse(await readFile(path.join(folder, file), "utf8"));
      models.push(modelSchema.parse(raw));
    }
  }
  return applyAliasSnapshotShutdowns(models.sort(compareModels));
}

export async function loadMigrations(): Promise<MigrationRecord[]> {
  migrationCache ??= readMigrations();
  return migrationCache;
}

async function readMigrations(): Promise<MigrationRecord[]> {
  const dir = path.join(root, "data/migrations");
  const files = await readdir(dir);
  const rows: MigrationRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    rows.push(migrationSchema.parse(JSON.parse(await readFile(path.join(dir, file), "utf8"))));
  }
  return rows;
}

export async function loadChanges(): Promise<ChangeRecord[]> {
  changeCache ??= readChanges();
  return changeCache;
}

async function readChanges(): Promise<ChangeRecord[]> {
  const text = await readFile(path.join(root, "data/changes.jsonl"), "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => changeSchema.parse(JSON.parse(line)));
}

export async function loadSponsors() {
  const raw = JSON.parse(await readFile(path.join(root, "data/sponsors.json"), "utf8"));
  return sponsorSchema.array().parse(raw);
}

export function providerName(providers: Provider[], id: string): string {
  return providers.find((provider) => provider.id === id)?.name ?? id;
}

export function migrationKey(fromProvider: string, fromSlug: string, toProvider: string, toSlug: string): string {
  return `${fromProvider}__${fromSlug}__to__${toProvider}__${toSlug}`;
}
