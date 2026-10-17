import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

let cache: Map<string, string> | null = null;

function dateOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function build(): Map<string, string> {
  const map = new Map<string, string>();
  const root = process.cwd();
  const modelsDir = path.join(root, "data/models");
  if (!existsSync(modelsDir)) return map;
  for (const provider of readdirSync(modelsDir)) {
    const folder = path.join(modelsDir, provider);
    let newest = "";
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      const model = JSON.parse(readFileSync(path.join(folder, file), "utf8")) as {
        slug: string;
        updated_at?: string;
      };
      const day = dateOf(model.updated_at);
      if (!day) continue;
      map.set(`/models/${provider}/${model.slug}/`, day);
      map.set(`/replace/${provider}/${model.slug}/`, day);
      if (day > newest) newest = day;
    }
    if (newest) map.set(`/providers/${provider}/`, newest);
  }
  const migrations = path.join(root, "data/migrations");
  if (existsSync(migrations)) {
    for (const file of readdirSync(migrations)) {
      if (!file.endsWith(".json")) continue;
      const row = JSON.parse(readFileSync(path.join(migrations, file), "utf8")) as { last_checked?: string };
      const day = dateOf(row.last_checked);
      if (day) map.set(`/migrate/${file.replace(/\.json$/, "")}/`, day);
    }
  }
  return map;
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
