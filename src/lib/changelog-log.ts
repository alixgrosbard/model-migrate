import type { ChangeRecord, ModelRecord, Provider } from "../schema.ts";
import { addDays, type FaqItem } from "./format.ts";
import { publicName } from "./growth.ts";

const LOG_FIELDS = new Set(["shutdown_date", "deprecation_date", "announced_date", "status", "replacements"]);

export interface ChangelogLink {
  href: string;
  label: string;
}

export interface ChangelogEntry {
  date: string;
  providerId: string;
  providerName: string;
  modelId: string;
  field: string;
  sentence: string;
  links: ChangelogLink[];
  sourceUrl: string;
}

export function changelogEntries(changes: ChangeRecord[], models: ModelRecord[], providers: Provider[]): ChangelogEntry[] {
  const seen = new Set<string>();
  const entries: ChangelogEntry[] = [];
  for (const change of changes) {
    if (!LOG_FIELDS.has(change.field)) continue;
    if (sameValue(change.old, change.new)) continue;
    const key = [change.date, change.provider, change.model_id, change.field, JSON.stringify(change.old), JSON.stringify(change.new)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const name = providers.find((provider) => provider.id === change.provider)?.name ?? change.provider;
    entries.push({
      date: change.date,
      providerId: change.provider,
      providerName: name,
      modelId: change.model_id,
      field: change.field,
      sentence: changeSentence(name, change),
      links: modelLinks(change, models),
      sourceUrl: change.source_url,
    });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date) || a.providerName.localeCompare(b.providerName) || a.modelId.localeCompare(b.modelId) || a.field.localeCompare(b.field));
}

export function changelogFaqs(entries: ChangelogEntry[], day: string): FaqItem[] {
  const start = addDays(day, -6);
  const week = entries.filter((entry) => entry.date >= start && entry.date <= day);
  const newest = entries[0];
  const weekAnswer = week.length
    ? `${week.length} deprecation ${week.length === 1 ? "change was" : "changes were"} recorded from ${start} through ${day}. ${fieldSummary(week)} The changelog page lists each one.`
    : `No shutdown date, deprecation date, status, or replacement change was recorded from ${start} through ${day}.`;
  const newestAnswer = newest
    ? `The newest recorded day is ${newest.date}. ${countOnDay(entries, newest.date)} deprecation ${countOnDay(entries, newest.date) === 1 ? "change was" : "changes were"} recorded that day. ${fieldSummary(entries.filter((entry) => entry.date === newest.date))}`
    : "No deprecation change is recorded yet.";
  return [
    { question: "What changed in AI model deprecations this week?", answer: weekAnswer },
    { question: "What is the newest recorded deprecation change?", answer: newestAnswer },
  ];
}

export function groupChangelogByDate(entries: ChangelogEntry[]): { date: string; entries: ChangelogEntry[] }[] {
  const map = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return [...map.keys()].sort((a, b) => b.localeCompare(a)).map((date) => ({ date, entries: map.get(date)! }));
}

function changeSentence(providerName: string, change: ChangeRecord): string {
  const model = change.model_id;
  const previous = showValue(change.old);
  const next = showValue(change.new);
  if (change.field === "shutdown_date") return dateSentence(providerName, model, "shutdown date", change.old, change.new, previous, next);
  if (change.field === "deprecation_date") return dateSentence(providerName, model, "deprecation date", change.old, change.new, previous, next);
  if (change.field === "announced_date") return dateSentence(providerName, model, "announced date", change.old, change.new, previous, next);
  if (change.field === "status") {
    return blank(change.old)
      ? `${providerName} recorded ${model} as ${next}. No previous status was stored.`
      : `${providerName} recorded ${model} as ${next}. The previous status was ${previous}.`;
  }
  if (change.field === "replacements") {
    return blank(change.old)
      ? `${providerName} published replacements for ${model}: ${next}.`
      : `${providerName} changed the published replacements for ${model} from ${previous} to ${next}.`;
  }
  return `${providerName} changed ${change.field} for ${model} from ${previous} to ${next}.`;
}

function dateSentence(providerName: string, model: string, label: string, oldValue: unknown, newValue: unknown, previous: string, next: string): string {
  if (blank(oldValue) && !blank(newValue)) return `${providerName} newly recorded a ${label} of ${next} for ${model}.`;
  if (!blank(oldValue) && blank(newValue)) return `${providerName} removed the published ${label} for ${model}. The previous date was ${previous}.`;
  return `${providerName} changed the ${label} for ${model} from ${previous} to ${next}.`;
}

function modelLinks(change: ChangeRecord, models: ModelRecord[]): ChangelogLink[] {
  const matches = models
    .filter((model) => model.provider === change.provider && model.id === change.model_id)
    .sort((a, b) => a.slug.length - b.slug.length || a.slug.localeCompare(b.slug));
  if (!matches.length) return [];
  if (matches.length === 1) {
    const model = matches[0];
    return [{ href: `/models/${model.provider}/${model.slug}/`, label: publicName(model) }];
  }
  return matches.map((model) => ({
    href: `/models/${model.provider}/${model.slug}/`,
    label: `${model.id} (${model.shutdown_date ?? model.slug})`,
  }));
}

function fieldSummary(entries: ChangelogEntry[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.field, (counts.get(entry.field) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([field, count]) => `${count} ${fieldLabel(field, count)}`);
  if (!parts.length) return "";
  return `${parts.join(", ")}.`;
}

function fieldLabel(field: string, count: number): string {
  const labels: Record<string, [string, string]> = {
    shutdown_date: ["shutdown date", "shutdown dates"],
    deprecation_date: ["deprecation date", "deprecation dates"],
    announced_date: ["announced date", "announced dates"],
    status: ["status change", "status changes"],
    replacements: ["replacement change", "replacement changes"],
  };
  const pair = labels[field] ?? [field, field];
  return count === 1 ? pair[0] : pair[1];
}

function countOnDay(entries: ChangelogEntry[], date: string): number {
  return entries.filter((entry) => entry.date === date).length;
}

function sameValue(oldValue: unknown, newValue: unknown): boolean {
  return JSON.stringify(oldValue) === JSON.stringify(newValue);
}

function blank(value: unknown): boolean {
  return value == null || value === "";
}

function showValue(value: unknown): string {
  if (blank(value)) return "not published";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
