import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { minimatch } from "minimatch";

export interface ModelHit {
  id: string;
  provider: string;
  slug: string;
  status: string;
  shutdown_date: string | null;
  shutdown_date_kind: string;
  replacement: string | null;
}

export interface Finding {
  file: string;
  line: number;
  model: ModelHit;
  level: "warning" | "error";
  message: string;
}

export async function loadModels(apiUrl: string, snapshot: ModelHit[]): Promise<ModelHit[]> {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as ModelHit[];
    if (!Array.isArray(data) || !data.length) throw new Error("empty");
    return data;
  } catch {
    return snapshot;
  }
}

export async function scanRepo(
  root: string,
  models: ModelHit[],
  warnDays: number,
  failDays: number,
  glob = "**/*.{py,ts,js,json,yaml,yml,toml,env.example}",
  today = new Date().toISOString().slice(0, 10),
): Promise<Finding[]> {
  const files = await walk(root, glob);
  const findings: Finding[] = [];
  const ordered = [...models].sort((a, b) => b.id.length - a.id.length);
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split("\n");
    for (const model of ordered) {
      if (!interesting(model, warnDays, failDays, today)) continue;
      const escaped = model.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[^A-Za-z0-9._:-])${escaped}(?=$|[^A-Za-z0-9._:-])`);
      lines.forEach((line, index) => {
        if (!pattern.test(line)) return;
        const days = model.shutdown_date ? daysUntil(today, model.shutdown_date) : null;
        const level = model.status === "retired" || (days != null && days <= failDays) ? "error" : "warning";
        const when = model.shutdown_date ? `shuts down ${model.shutdown_date}` : `status ${model.status}`;
        const replacement = model.replacement ? ` Replacement: ${model.replacement}.` : "";
        findings.push({
          file: path.relative(root, file),
          line: index + 1,
          model,
          level,
          message: `${model.id} ${when}.${replacement} https://sunsetdiff.onrender.com/models/${model.provider}/${model.slug}/`,
        });
      });
    }
  }
  return findings;
}

function interesting(model: ModelHit, warnDays: number, failDays: number, today: string): boolean {
  if (model.status === "retired" || model.status === "deprecated" || model.status === "legacy") return true;
  if (!model.shutdown_date || model.shutdown_date_kind === "not_before" || model.shutdown_date_kind === "none") return false;
  return daysUntil(today, model.shutdown_date) <= warnDays;
}

function daysUntil(today: string, date: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${date}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

async function walk(dir: string, glob: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "snapshots") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full, glob, base)));
    else if (minimatch(path.relative(base, full), glob, { dot: true })) files.push(full);
  }
  return files;
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}
