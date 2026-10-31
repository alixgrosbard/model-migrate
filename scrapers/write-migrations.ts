import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { migrationSchema, type MigrationRecord, type ModelRecord } from "../src/schema.ts";
import { buildMigration, mergeCuratedMigration, migrationKey, officialMigrationTargets } from "./migrations.ts";

export async function writeMigrations(models: ModelRecord[], checkedOn: string, root = process.cwd()): Promise<number> {
  const dir = path.join(root, "data/migrations");
  const previous = new Map<string, MigrationRecord>();
  try {
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      const row = migrationSchema.parse(JSON.parse(await readFile(path.join(dir, file), "utf8")));
      previous.set(file.slice(0, -".json".length), row);
    }
  } catch {
    // The first scrape has no migration folder yet.
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const byKey = new Map(models.map((model) => [`${model.provider}:${model.id}`, model]));
  let count = 0;
  for (const model of models) {
    const targets = officialMigrationTargets(model);
    const undatedProvider =
      model.provider === "xai" ||
      model.provider === "cohere" ||
      model.provider === "together" ||
      model.provider === "fireworks";
    if (!model.shutdown_date && !undatedProvider) continue;
    if (!targets.length) continue;
    for (const official of targets) {
      const target = byKey.get(`${official.provider}:${official.model_id}`);
      if (!target) continue;
      const key = migrationKey(model, target);
      const fresh = buildMigration(model, target, checkedOn);
      const migration = migrationSchema.parse(mergeCuratedMigration(previous.get(key), fresh));
      await writeFile(path.join(dir, `${key}.json`), JSON.stringify(migration, null, 2) + "\n");
      count += 1;
    }
  }
  console.log(`Migrations: ${count}`);
  return count;
}
