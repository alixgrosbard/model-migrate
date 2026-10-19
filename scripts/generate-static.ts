import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { migrationSchema, modelSchema, providerSchema } from "../src/schema.ts";
import { loadChanges, loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import { addDays, formatWhen, isSoon, officialReplacement, today } from "../src/lib/format.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { changelogDocument, deadlinesIcs, deprecationsCsv, deprecationsFeed, shutdownMonths, topRetiringModels, type FeedEntry } from "../src/lib/growth.ts";
import {
  eventDateModified,
  orderShutdownEvents,
  providerDisplayName,
  shutdownEventLead,
  shutdownEventPath,
  shutdownEventTitle,
  shutdownEvents,
} from "../src/lib/shutdowns.ts";
import { siteOrigin } from "../src/lib/site.ts";

const site = siteOrigin();
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
      models_json: "/data/models.json",
      deprecations_csv: "/data/deprecations.csv",
      changelog_json: "/data/changelog.json",
      deadlines_ics: "/deadlines.ics",
      deprecations_feed: "/feed.xml",
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

  const soonForLlms = models
    .filter((model) => isSoon(model, day, 90))
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? ""))
    .slice(0, 20);
  const questionModels = topRetiringModels(models, day, 40);
  const months = shutdownMonths(models);
  const events = orderShutdownEvents(shutdownEvents(models), day);
  const shutdownLinks = events.map((event) => ({
    title: shutdownEventTitle(providerDisplayName(providers, event.provider), event, day),
    path: shutdownEventPath(event),
  }));
  await writeFile(path.join(publicDir, "llms-full.txt"), llmsFull(site, models));
  await writeFile(path.join(publicDir, "llms.txt"), llmsTxt(site, providers, soonForLlms, { months, questions: questionModels, shutdowns: shutdownLinks }));
  const changelog = changelogDocument(changes);
  await mkdir(path.join(publicDir, "data"), { recursive: true });
  await writeJson(path.join(publicDir, "data/models.json"), {
    name: "SunsetDiff model retirement dataset",
    publisher: "SunsetDiff",
    license: "https://creativecommons.org/licenses/by/4.0/",
    version: changelog.version,
    models,
  });
  await writeFile(path.join(publicDir, "data/deprecations.csv"), deprecationsCsv(models));
  await writeJson(path.join(publicDir, "data/changelog.json"), changelog);
  await writeFile(path.join(publicDir, "deadlines.ics"), deadlinesIcs(models, day, site));
  const feedEvents: FeedEntry[] = events.map((event) => {
    const name = providerDisplayName(providers, event.provider);
    const pathName = shutdownEventPath(event);
    return {
      title: shutdownEventTitle(name, event, day),
      link: `${site}${pathName}`,
      guid: `${site}${pathName}`,
      pubDate: eventDateModified(event),
      description: shutdownEventLead(name, event, day),
    };
  });
  await writeFile(path.join(publicDir, "feed.xml"), deprecationsFeed(changes, models, site, feedEvents));
  await writeOgImages(publicDir, models, providers);
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
  const indexNow = await readFile(path.join(publicDir, "1dca852797e5cb64a5ab78151e91938f.txt"));
  if (!indexNow.equals(Buffer.from("1dca852797e5cb64a5ab78151e91938f"))) {
    throw new Error("IndexNow key file is missing or was changed by the static generator");
  }
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

async function writeOgImages(
  dir: string,
  models: Awaited<ReturnType<typeof loadModels>>,
  providers: Awaited<ReturnType<typeof loadProviders>>,
) {
  await mkdir(path.join(dir, "og/providers"), { recursive: true });
  await writeFile(path.join(dir, "og/sunsetdiff.svg"), ogSvg("SunsetDiff", "AI model shutdowns", "Price, context, and code diffs"));
  for (const provider of providers) {
    await writeFile(path.join(dir, "og/providers", `${provider.id}.svg`), ogSvg(provider.name, "Model shutdowns", "Official dates and replacements"));
  }
  for (const model of models) {
    const replacement = officialReplacement(model);
    await mkdir(path.join(dir, "og/models", model.provider), { recursive: true });
    await writeFile(
      path.join(dir, "og/models", model.provider, `${model.slug}.svg`),
      ogSvg(
        model.display_name,
        `Shutdown: ${formatWhen(model)}`,
        replacement ? `Replacement: ${replacement.model_id}` : "No published replacement",
      ),
    );
  }
}

function ogSvg(title: string, line2: string, line3: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1c1917"/>
  <rect width="18" height="630" fill="#c2410c"/>
  <text x="72" y="150" fill="#fdba74" font-size="36" font-family="Georgia, serif">SunsetDiff</text>
  <text x="72" y="280" fill="#fffaf5" font-size="54" font-family="Georgia, serif">${xml(clip(title, 42))}</text>
  <text x="72" y="380" fill="#fffaf5" font-size="36" font-family="Georgia, serif">${xml(clip(line2, 64))}</text>
  <text x="72" y="450" fill="#e7e5e4" font-size="32" font-family="Georgia, serif">${xml(clip(line3, 70))}</text>
</svg>
`;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function xml(value: string): string {
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
