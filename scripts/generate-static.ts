import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { migrationSchema, modelSchema, providerSchema } from "../src/schema.ts";
import { loadChanges, loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import { addDays, isSoon, today } from "../src/lib/format.ts";

const site = process.env.SITE_URL || "https://sunsetdiff.onrender.com";
const publicDir = path.join(process.cwd(), "public");
const day = today();

async function main() {
  const [providers, models, migrations, changes] = await Promise.all([
    loadProviders(),
    loadModels(),
    loadMigrations(),
    loadChanges(),
  ]);
  await mkdir(path.join(publicDir, "api/v1/models"), { recursive: true });
  await mkdir(path.join(publicDir, "api/v1/migrations"), { recursive: true });
  await mkdir(path.join(publicDir, "api/v1/lookup"), { recursive: true });
  await mkdir(path.join(publicDir, "dataset"), { recursive: true });
  await mkdir(path.join(publicDir, "calendar"), { recursive: true });

  const generatedAt = new Date().toISOString();
  const compact = models.map((model) => ({
    id: model.id,
    slug: model.slug,
    provider: model.provider,
    display_name: model.display_name,
    status: model.status,
    shutdown_date: model.shutdown_date,
    shutdown_date_kind: model.shutdown_date_kind,
    replacement: model.replacements[0]?.model_id ?? null,
    source_url: model.sources[0]?.url ?? null,
    last_checked: model.sources[0]?.last_checked ?? null,
  }));
  const upcoming = models
    .filter((model) => isSoon(model, day, 90))
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? ""))
    .map((model) => compact.find((row) => row.provider === model.provider && row.id === model.id));

  await writeJson(path.join(publicDir, "api/v1/index.json"), {
    version: "v1",
    generated_at: generatedAt,
    counts: { models: models.length, migrations: migrations.length, providers: providers.length },
    links: {
      providers: "/api/v1/providers.json",
      models: "/api/v1/models.json",
      upcoming: "/api/v1/upcoming.json",
      changes: "/api/v1/changes.json",
      schema: "/api/v1/schema.json",
      dataset_json: "/dataset/sunsetdiff.json",
      dataset_csv: "/dataset/sunsetdiff.csv",
    },
  });
  await writeJson(path.join(publicDir, "api/v1/providers.json"), providers);
  await writeJson(path.join(publicDir, "api/v1/models.json"), compact);
  await writeJson(path.join(publicDir, "api/v1/upcoming.json"), upcoming);
  await writeJson(path.join(publicDir, "api/v1/changes.json"), changes.slice(-500));
  await writeJson(path.join(publicDir, "api/v1/schema.json"), {
    model: zodToJsonSchema(modelSchema, "Model"),
    provider: zodToJsonSchema(providerSchema, "Provider"),
    migration: zodToJsonSchema(migrationSchema, "Migration"),
  });
  await writeJson(path.join(publicDir, "dataset/sunsetdiff.json"), { generated_at: generatedAt, providers, models, migrations });
  await writeFile(path.join(publicDir, "dataset/sunsetdiff.csv"), toCsv(compact));
  await writeFile(path.join(publicDir, "search-index.json"), JSON.stringify(compact.map((model) => ({
    id: model.id,
    provider: model.provider,
    slug: model.slug,
    display_name: model.display_name,
    status: model.status,
  }))));

  for (const model of models) {
    const folder = path.join(publicDir, "api/v1/models", model.provider);
    await mkdir(folder, { recursive: true });
    await writeJson(path.join(folder, `${model.slug}.json`), model);
  }
  for (const migration of migrations) {
    const key = `${migration.from.provider}__${migration.from.slug}__to__${migration.to.provider}__${migration.to.slug}`;
    await writeJson(path.join(publicDir, "api/v1/migrations", `${key}.json`), migration);
  }
  const byId = new Map<string, typeof models>();
  for (const model of models) {
    const list = byId.get(model.id) ?? [];
    list.push(model);
    byId.set(model.id, list);
  }
  for (const [id, list] of byId) {
    const body = list.length === 1 ? list[0] : list;
    await writeJson(path.join(publicDir, "api/v1/lookup", `${encodeURIComponent(id)}.json`), body);
  }

  const lines = models.map((model) => {
    const source = model.sources[0];
    return [
      model.id,
      model.provider,
      model.status,
      model.shutdown_date ?? "not published",
      model.replacements[0]?.model_id ?? "not published",
      source?.url ?? "",
      source?.last_checked ?? "",
    ].join("\t");
  });
  await writeFile(
    path.join(publicDir, "llms-full.txt"),
    ["# SunsetDiff models", "id, provider, status, shutdown date, official replacement, source, last checked", ...lines].join("\n") + "\n",
  );
  const providerLinks = providers
    .map((provider) => `- [${provider.name}](${site}/providers/${provider.id}/)`)
    .join("\n");
  await writeFile(
    path.join(publicDir, "llms.txt"),
    `# SunsetDiff

> SunsetDiff tracks AI model retirements and the migration diff: shutdown date, official replacement, and published changes in price, context, and code.

## API
- [Index](${site}/api/v1/index.json)
- [Upcoming shutdowns](${site}/api/v1/upcoming.json)
- [JSON dataset](${site}/dataset/sunsetdiff.json)
- [CSV dataset](${site}/dataset/sunsetdiff.csv)

## Providers
${providerLinks}

## Method
- [How we check](${site}/about/)
- [Full model list](${site}/llms-full.txt)
`,
  );
  await writeFile(
    path.join(publicDir, "robots.txt"),
    `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${site}/sitemap-index.xml
`,
  );
  await writeFile(path.join(publicDir, "calendar.ics"), ics(models, "all"));
  for (const provider of providers) {
    await writeFile(
      path.join(publicDir, "calendar", `${provider.id}.ics`),
      ics(models.filter((model) => model.provider === provider.id), provider.id),
    );
  }
  const recent = changes.slice(-100).reverse();
  const items = recent
    .map((change) => `    <item>
      <title>${escapeXml(`${change.provider} ${change.model_id} ${change.field}`)}</title>
      <pubDate>${new Date(`${change.date}T00:00:00Z`).toUTCString()}</pubDate>
      <link>${escapeXml(change.source_url)}</link>
      <description>${escapeXml(`${change.field}: ${JSON.stringify(change.old)} -> ${JSON.stringify(change.new)}`)}</description>
    </item>`)
    .join("\n");
  await writeFile(
    path.join(publicDir, "changes.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>SunsetDiff changes</title>
    <link>${site}/changes/</link>
    <description>Changes detected on official AI model deprecation pages.</description>
${items}
  </channel>
</rss>
`,
  );
  await mkdir(path.join(process.cwd(), "action/snapshot"), { recursive: true });
  await writeJson(path.join(process.cwd(), "action/snapshot/models.json"), compact);
  console.log(`Static API generated for ${models.length} models. Window ends ${addDays(day, 90)}.`);
}

function ics(models: Awaited<ReturnType<typeof loadModels>>, name: string) {
  const events = models
    .filter((model) => model.shutdown_date && model.shutdown_date_kind !== "none")
    .map((model) => {
      const stamp = model.shutdown_date!.replace(/-/g, "");
      const summary = model.shutdown_date_kind === "not_before" ? `${model.id} not before this date` : `${model.id} shutdown`;
      return `BEGIN:VEVENT
UID:${model.provider}-${model.slug}@sunsetdiff
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z
DTSTART;VALUE=DATE:${stamp}
SUMMARY:${summary}
DESCRIPTION:${model.sources[0]?.url ?? ""}
URL:${site}/models/${model.provider}/${model.slug}/
END:VEVENT`;
    })
    .join("\n");
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SunsetDiff//${name}//EN
CALSCALE:GREGORIAN
${events}
END:VCALENDAR
`;
}

function toCsv(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? { id: "" });
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csv(row[header])).join(","));
  }
  return lines.join("\n") + "\n";
}

function csv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
