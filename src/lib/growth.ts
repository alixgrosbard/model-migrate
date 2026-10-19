import type { ChangeRecord, MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { addDays, answerSentence, formatWhen, isSoon, officialReplacement, replacementSentence, shutdownSentence, type FaqItem } from "./format.ts";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DEPRECATION_FIELDS = new Set(["shutdown_date", "deprecation_date", "announced_date", "status"]);

export function publicName(model: ModelRecord): string {
  const name = model.display_name.trim();
  if (/^[A-Za-z0-9]/.test(name)) return name;
  return model.id;
}

export function isDatedShutdown(model: ModelRecord): boolean {
  return Boolean(model.shutdown_date) && (model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "month_only");
}

export function isRetiring(model: ModelRecord): boolean {
  if (!isDatedShutdown(model)) return false;
  return model.status === "deprecated" || model.status === "retired" || model.status === "legacy";
}

/** One row per provider and model id. A shorter slug is the same id without a duplicate suffix. */
export function retiringModels(models: ModelRecord[]): ModelRecord[] {
  const best = new Map<string, ModelRecord>();
  for (const model of models) {
    if (!isRetiring(model)) continue;
    const key = `${model.provider}:${model.id}`;
    const previous = best.get(key);
    if (!previous || model.slug.length < previous.slug.length) best.set(key, model);
  }
  return [...best.values()];
}

/**
 * Retiring models named most often on official deprecation pages, then the soonest published shutdown.
 * This is not a search-volume ranking. Dates come from the model records.
 */
export function topRetiringModels(models: ModelRecord[], day: string, limit = 40): ModelRecord[] {
  const inbound = new Map<string, number>();
  for (const model of models) {
    for (const replacement of model.replacements) {
      const key = `${replacement.provider}:${replacement.model_id}`;
      inbound.set(key, (inbound.get(key) ?? 0) + 1);
    }
  }
  const horizon = addDays(day, 365);
  return retiringModels(models)
    .map((model) => {
      const key = `${model.provider}:${model.id}`;
      const degree = (inbound.get(key) ?? 0) + model.replacements.length;
      const upcoming = model.shutdown_date! >= day && model.shutdown_date! <= horizon ? 1 : 0;
      return { model, score: degree * 10 + upcoming * 3 };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const byDate = (a.model.shutdown_date ?? "").localeCompare(b.model.shutdown_date ?? "");
      if (byDate !== 0) return byDate;
      return `${a.model.provider}:${a.model.id}`.localeCompare(`${b.model.provider}:${b.model.id}`);
    })
    .slice(0, limit)
    .map((row) => row.model);
}

export function shutdownMonths(models: ModelRecord[]): string[] {
  const months = new Set<string>();
  for (const model of models) {
    if (!model.shutdown_date || model.shutdown_date_kind === "none") continue;
    const month = model.shutdown_date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
  }
  return [...months].sort();
}

export function monthLabel(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return month;
  const name = MONTH_NAMES[Number(match[2]) - 1];
  return name ? `${name} ${match[1]}` : month;
}

export function modelsInMonth(models: ModelRecord[], month: string): ModelRecord[] {
  return models
    .filter((model) => model.shutdown_date && model.shutdown_date_kind !== "none" && model.shutdown_date.slice(0, 7) === month)
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
}

export function deadlineWindow(models: ModelRecord[], day: string, days: number): ModelRecord[] {
  return models
    .filter((model) => isSoon(model, day, days))
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
}

export function questionPath(model: ModelRecord, kind: "deprecated" | "shutdown-date"): string {
  return `/questions/${model.provider}/${model.slug}/${kind}/`;
}

export function deprecatedAnswer(model: ModelRecord, provider: Provider): string {
  return `The official status is ${model.status}. ${shutdownSentence(model, provider)} ${replacementSentence(model)}`;
}

export function deprecatedFaqs(model: ModelRecord, provider: Provider): FaqItem[] {
  const name = publicName(model);
  return [
    { question: `Is ${name} being deprecated?`, answer: deprecatedAnswer(model, provider) },
    { question: `When is ${name} shut down?`, answer: shutdownSentence(model, provider) },
    { question: `What replaces ${name}?`, answer: replacementSentence(model) },
  ];
}

export function shutdownFaqs(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): FaqItem[] {
  const name = publicName(model);
  return [
    { question: `What is the ${name} shutdown date?`, answer: answerSentence(model, provider, migration) },
    { question: `Is ${name} being deprecated?`, answer: deprecatedAnswer(model, provider) },
    { question: `What replaces ${name}?`, answer: replacementSentence(model) },
  ];
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function retiringIds(models: ModelRecord[]): string[] {
  return [...new Set(models.filter((model) => isDatedShutdown(model) && model.status !== "active").map((model) => model.id))].sort();
}

export function retiringIdPattern(models: ModelRecord[]): string {
  const ids = retiringIds(models);
  if (!ids.length) return "";
  return `\\b(?:${ids.map(escapeRegex).join("|")})\\b`;
}

export function deprecationChanges(changes: ChangeRecord[]): ChangeRecord[] {
  return changes
    .filter((change) => DEPRECATION_FIELDS.has(change.field))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.model_id.localeCompare(b.model_id));
}

export function deadlinesIcs(models: ModelRecord[], day: string, site: string): string {
  const origin = site.replace(/\/+$/, "");
  const events = deadlineWindow(models, day, 365).map((model) => {
    const stamp = model.shutdown_date!.replace(/-/g, "").slice(0, 8);
    const summary = model.shutdown_date_kind === "month_only" ? `${model.id} shutdown month` : `${model.id} shutdown`;
    const description = `Official source: ${model.sources[0]?.url ?? ""}. Checked ${model.sources[0]?.last_checked ?? ""}. Status ${model.status}.`;
    return `BEGIN:VEVENT
UID:${icsText(model.provider)}-${icsText(model.slug)}@sunsetdiff
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z
DTSTART;VALUE=DATE:${stamp}
SUMMARY:${icsText(summary)}
DESCRIPTION:${icsText(description)}
URL:${origin}/models/${model.provider}/${model.slug}/
END:VEVENT`;
  });
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SunsetDiff//deadlines//EN
CALSCALE:GREGORIAN
X-WR-CALNAME:SunsetDiff deadlines
${events.join("\n")}
END:VCALENDAR
`;
}

export interface FeedEntry {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
}

export function deprecationsFeed(changes: ChangeRecord[], models: ModelRecord[], site: string, extras: FeedEntry[] = []): string {
  const origin = site.replace(/\/+$/, "");
  const byKey = new Map(models.map((model) => [`${model.provider}:${model.id}`, model]));
  const extraItems = extras.map((entry) => `  <item>
    <title>${xmlText(entry.title)}</title>
    <link>${xmlText(entry.link)}</link>
    <guid>${xmlText(entry.guid)}</guid>
    <pubDate>${new Date(`${entry.pubDate}T00:00:00Z`).toUTCString()}</pubDate>
    <description>${xmlText(entry.description)}</description>
  </item>`);
  const items = deprecationChanges(changes).slice(0, 100).map((change) => {
    const model = byKey.get(`${change.provider}:${change.model_id}`);
    const link = model ? `${origin}/models/${model.provider}/${model.slug}/` : change.source_url;
    const title = `${change.model_id} ${change.field}`;
    const description = `${change.field} recorded as ${JSON.stringify(change.new)} (previous ${JSON.stringify(change.old)}). Source: ${change.source_url}`;
    return `  <item>
    <title>${xmlText(title)}</title>
    <link>${xmlText(link)}</link>
    <guid>${xmlText(`${change.date}:${change.provider}:${change.model_id}:${change.field}`)}</guid>
    <pubDate>${new Date(`${change.date}T00:00:00Z`).toUTCString()}</pubDate>
    <description>${xmlText(description)}</description>
  </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>SunsetDiff new deprecations</title>
  <link>${origin}/deadlines/</link>
  <description>Deprecation and shutdown changes recorded from official provider pages. Blank values were not published.</description>
  <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
${[...extraItems, ...items].join("\n")}
</channel>
</rss>
`;
}

export function deprecationsCsv(models: ModelRecord[]): string {
  const headers = ["provider", "id", "slug", "display_name", "status", "announced_date", "deprecation_date", "shutdown_date", "shutdown_date_kind", "replacement_id", "replacement_provider", "source_url", "last_checked"];
  const rows = models
    .filter((model) => model.status !== "active" || isDatedShutdown(model) || Boolean(model.deprecation_date))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug));
  const lines = [headers.join(",")];
  for (const model of rows) {
    const replacement = officialReplacement(model);
    const source = model.sources[0];
    lines.push(
      [
        model.provider,
        model.id,
        model.slug,
        model.display_name,
        model.status,
        model.announced_date ?? "",
        model.deprecation_date ?? "",
        model.shutdown_date ?? "",
        model.shutdown_date_kind,
        replacement?.model_id ?? "",
        replacement?.provider ?? "",
        source?.url ?? "",
        source?.last_checked ?? "",
      ].map(csvCell).join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export function changelogDocument(changes: ChangeRecord[]) {
  const grouped = new Map<string, ChangeRecord[]>();
  for (const change of changes) {
    const list = grouped.get(change.date) ?? [];
    list.push(change);
    grouped.set(change.date, list);
  }
  const versions = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([version, entries]) => ({
      version,
      changes: entries.map((change) => ({
        provider: change.provider,
        model_id: change.model_id,
        field: change.field,
        old: change.old,
        new: change.new,
        source_url: change.source_url,
      })),
    }));
  return {
    name: "SunsetDiff model retirement dataset",
    publisher: "SunsetDiff",
    license: "https://creativecommons.org/licenses/by/4.0/",
    version: versions.at(-1)?.version ?? "",
    versions,
  };
}

export function datasetVersion(changes: ChangeRecord[]): string {
  return changelogDocument(changes).version;
}

export function formatWindowDate(model: ModelRecord): string {
  return formatWhen(model);
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function xmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
