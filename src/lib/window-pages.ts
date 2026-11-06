import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { addDays, clipMeta, formatWhen, today, type FaqItem } from "./format.ts";
import { publicName } from "./growth.ts";
import { guidePath, guides, guidesForModel, type ModelGuideLink } from "./guides.ts";
import {
  longDate,
  providerDisplayName,
  replacementLinks,
  shutdownEventPath,
  shutdownEvents,
  type ReplacementLink,
} from "./shutdowns.ts";

/** Rolling window from the build day through that many days later. Both ends count. */
export const THIS_WEEK_DAYS = 7;
export const NEXT_30_DAYS_COUNT = 30;
export const THIS_WEEK_PATH = "/this-week/";
export const NEXT_7_DAYS_PATH = "/next-7-days/";
export const NEXT_30_DAYS_PATH = "/next-30-days/";

/**
 * Guides that are not a dated shutdown wave. guidesForModel also returns these
 * for almost every dated model. The window pages link a wave guide only.
 */
const EVERGREEN_GUIDE_SLUGS = new Set([
  "custom-gpt-retirement",
  "model-aliases-vs-pinned-snapshots",
  "pre-migration-test-checklist",
  "why-shutdown-dates-differ-by-platform",
  "get-notified-before-a-model-shuts-down",
  "how-much-notice-before-an-ai-model-shuts-down",
  "swap-a-deprecated-model",
  "what-happens-on-model-shutdown-day",
  "find-model-ids-in-your-codebase",
  "check-model-shutdown-dates-programmatically",
  "silent-failures-after-model-shutdown",
  "move-function-calling-to-responses-api",
  "codex-chatgpt-sign-in-model-retirements",
  "nvidia-hosted-api-vs-nim-containers",
  "catch-a-retired-model-before-your-users-do",
]);

const WAVE_GUIDE_HREFS = new Set(
  guides.map((guide) => guide.slug).filter((slug) => !EVERGREEN_GUIDE_SLUGS.has(slug)).map((slug) => guidePath(slug)),
);

export interface WindowRow {
  model: ModelRecord;
  providerName: string;
  modelLabel: string;
  modelPath: string;
  when: string;
  replacements: ReplacementLink[];
  shutdownPath: string | null;
  shutdownLabel: string | null;
  guides: ModelGuideLink[];
  notes: string | null;
}

export interface WindowProviderGroup {
  providerId: string;
  providerName: string;
  shutdownPath: string | null;
  rows: WindowRow[];
}

export interface WindowDateGroup {
  date: string;
  label: string;
  providers: WindowProviderGroup[];
}

export interface WindowLink {
  href: string;
  label: string;
}

export interface WindowPageModel {
  days: number;
  day: string;
  end: string;
  path: string;
  title: string;
  h1: string;
  crumb: string;
  description: string;
  datasetName: string;
  intro: string;
  empty: boolean;
  groups: WindowDateGroup[];
  rows: WindowRow[];
  faqs: FaqItem[];
  related: WindowLink[];
  modified: string;
}

export function rollingShutdowns(models: ModelRecord[], day: string, days: number): ModelRecord[] {
  const end = addDays(day, days);
  const groups = new Map<string, ModelRecord>();
  for (const model of models) {
    if (!model.shutdown_date) continue;
    if (model.shutdown_date_kind !== "exact" && model.shutdown_date_kind !== "not_before") continue;
    if (model.shutdown_date < day || model.shutdown_date > end) continue;
    const key = [
      model.provider,
      model.id,
      model.shutdown_date,
      model.shutdown_date_kind,
      model.status,
      model.region_or_platform_notes ?? "",
      officialIds(model).join(","),
    ].join("|");
    const previous = groups.get(key);
    if (!previous || model.slug.length < previous.slug.length || (model.slug.length === previous.slug.length && model.slug < previous.slug)) {
      groups.set(key, model);
    }
  }
  return [...groups.values()].sort(compareWindow);
}

export function windowIndexLinks(): WindowLink[] {
  return [
    { href: THIS_WEEK_PATH, label: "AI models shutting down this week" },
    { href: NEXT_30_DAYS_PATH, label: "AI models shutting down in the next 30 days" },
  ];
}

export function windowPage(input: {
  models: ModelRecord[];
  providers: Provider[];
  migrations: MigrationRecord[];
  day?: string;
  days: number;
  path: string;
}): WindowPageModel {
  const day = input.day ?? today();
  const end = addDays(day, input.days);
  const selected = rollingShutdowns(input.models, day, input.days);
  const shutdownPaths = new Map<string, string>();
  for (const event of shutdownEvents(input.models)) {
    shutdownPaths.set(`${event.provider}|${event.date}`, shutdownEventPath(event));
  }
  const rows = selected.map((model) => toRow(model, input.models, input.providers, input.migrations, day, shutdownPaths));
  const groups = groupRows(rows);
  const week = input.path === THIS_WEEK_PATH;
  const h1 = week ? "AI models shutting down this week" : "AI models shutting down in the next 30 days";
  const crumb = week ? "This week" : "Next 30 days";
  const range = `${longDate(day)} through ${longDate(end)}`;
  const description = week
    ? clipMeta(`LLM deprecations this week. AI models shutting down this week, ${range}. Official dates only.`)
    : clipMeta(`AI models shutting down in the next 30 days, ${range}. Official dates only.`);
  const exact = rows.filter((row) => row.model.shutdown_date_kind === "exact").length;
  const floors = rows.filter((row) => row.model.shutdown_date_kind === "not_before").length;
  const intro = rows.length
    ? `${rows.length} models have an exact shutdown date or a not-sooner-than date from ${range}. ${exact} ${exact === 1 ? "model has" : "models have"} an exact date. ${floors} ${floors === 1 ? "model has" : "models have"} a not-sooner-than date. Rows are grouped by shutdown date, then by provider. A not-sooner-than date is the earliest day on the provider page.`
    : `No model in this dataset has an exact shutdown date or a not-sooner-than date from ${range}. This page lists a model only when that date falls in the window.`;
  return {
    days: input.days,
    day,
    end,
    path: input.path,
    title: `${h1} | SunsetDiff`,
    h1,
    crumb,
    description,
    datasetName: week ? "SunsetDiff AI models shutting down this week" : "SunsetDiff AI models shutting down in the next 30 days",
    intro,
    empty: rows.length === 0,
    groups,
    rows,
    faqs: windowFaqs(rows, week, day, end),
    related: relatedLinks(input.path),
    modified: newestUpdated(selected),
  };
}

function toRow(
  model: ModelRecord,
  models: ModelRecord[],
  providers: Provider[],
  migrations: MigrationRecord[],
  day: string,
  shutdownPaths: Map<string, string>,
): WindowRow {
  const shutdownPath = model.shutdown_date ? shutdownPaths.get(`${model.provider}|${model.shutdown_date}`) ?? null : null;
  const guidesForRow = guidesForModel(model, models, day).filter((link) => WAVE_GUIDE_HREFS.has(link.href));
  return {
    model,
    providerName: providerDisplayName(providers, model.provider),
    modelLabel: publicName(model),
    modelPath: `/models/${model.provider}/${model.slug}/`,
    when: formatWhen(model),
    replacements: replacementLinks(model, models, migrations),
    shutdownPath,
    shutdownLabel: shutdownPath && model.shutdown_date
      ? model.shutdown_date_kind === "not_before"
        ? `Not sooner than ${longDate(model.shutdown_date)}`
        : longDate(model.shutdown_date)
      : null,
    guides: guidesForRow,
    notes: model.region_or_platform_notes?.trim() ? model.region_or_platform_notes : null,
  };
}

function groupRows(rows: WindowRow[]): WindowDateGroup[] {
  const groups: WindowDateGroup[] = [];
  for (const row of rows) {
    const date = row.model.shutdown_date!;
    let group = groups.find((item) => item.date === date);
    if (!group) {
      group = { date, label: longDate(date), providers: [] };
      groups.push(group);
    }
    let provider = group.providers.find((item) => item.providerId === row.model.provider);
    if (!provider) {
      provider = {
        providerId: row.model.provider,
        providerName: row.providerName,
        shutdownPath: row.shutdownPath,
        rows: [],
      };
      group.providers.push(provider);
    }
    if (!provider.shutdownPath && row.shutdownPath) provider.shutdownPath = row.shutdownPath;
    provider.rows.push(row);
  }
  for (const group of groups) {
    group.providers.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.providerId.localeCompare(b.providerId));
  }
  return groups;
}

function windowFaqs(rows: WindowRow[], week: boolean, day: string, end: string): FaqItem[] {
  const scope = week ? "this week" : "in the next 30 days";
  const range = `${longDate(day)} through ${longDate(end)}`;
  const exact = rows.filter((row) => row.model.shutdown_date_kind === "exact");
  const floors = rows.filter((row) => row.model.shutdown_date_kind === "not_before");
  const which = rows.length
    ? `${rows.length} models have an exact shutdown date or a not-sooner-than date from ${range}. ${countModels(exact.length, "an exact date")}. ${countModels(floors.length, "a not-sooner-than date")}. ${joinAnd(rows.map((row) => `${row.providerName} ${row.model.id}`))}.`
    : `No model in this dataset has an exact shutdown date or a not-sooner-than date from ${range}.`;
  const providers = providerSentences(rows);
  const floorAnswer = floors.length
    ? `${floorSentences(floors)} A not-sooner-than date means the provider said the model will not shut down before that day.`
    : `No model in this window has a not-sooner-than date.`;
  const soonest = rows[0];
  const soonestAnswer = soonest
    ? `The soonest date in this window is ${longDate(soonest.model.shutdown_date!)}. ${sameDateSentence(rows, soonest.model.shutdown_date!)}`
    : `No model in this dataset has an exact shutdown date or a not-sooner-than date from ${range}.`;
  const later = week
    ? `This page ends on ${longDate(end)}. [Upcoming shutdowns](/upcoming/) lists later exact dates and published shutdown months. [Deadlines](/deadlines/) lists the next 30, 60, 90, and 365 days of exact dates. [Next 30 days](/next-30-days/) uses the same rule as this page for 30 days.`
    : `This page ends on ${longDate(end)}. [This week](/this-week/) is the next 7 days. [Upcoming shutdowns](/upcoming/) lists later exact dates and published shutdown months. [Deadlines](/deadlines/) lists the next 60, 90, and 365 days of exact dates as well.`;
  return [
    { question: `Which AI models are shutting down ${scope}?`, answer: which },
    { question: `Which providers have a model shutting down ${scope}?`, answer: providers },
    { question: week ? "Which dates this week are not-sooner-than floors?" : "Which dates in the next 30 days are not-sooner-than floors?", answer: floorAnswer },
    { question: week ? "What is the soonest shutdown date this week?" : "What is the soonest shutdown date in the next 30 days?", answer: soonestAnswer },
    { question: week ? "Where are AI model shutdowns after this week?" : "Where are AI model shutdowns after the next 30 days?", answer: later },
  ];
}

function providerSentences(rows: WindowRow[]): string {
  if (!rows.length) return "No provider in this dataset has an exact shutdown date or a not-sooner-than date in this window.";
  const counts = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    const current = counts.get(row.model.provider) ?? { name: row.providerName, count: 0 };
    current.count += 1;
    counts.set(row.model.provider, current);
  }
  const parts = [...counts.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `${item.name} has ${item.count} ${item.count === 1 ? "model" : "models"}`);
  return `${joinAnd(parts)}.`;
}

function floorSentences(rows: WindowRow[]): string {
  const groups = new Map<string, { date: string; name: string; count: number }>();
  for (const row of rows) {
    const key = `${row.model.provider}|${row.model.shutdown_date}`;
    const current = groups.get(key) ?? { date: row.model.shutdown_date!, name: row.providerName, count: 0 };
    current.count += 1;
    groups.set(key, current);
  }
  const parts = [...groups.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
    .map((item) => `${item.name} lists ${longDate(item.date)} for ${item.count} ${item.count === 1 ? "model" : "models"}`);
  return `${joinAnd(parts)}.`;
}

function sameDateSentence(rows: WindowRow[], date: string): string {
  const same = rows.filter((row) => row.model.shutdown_date === date);
  const names = same.map((row) => `${row.providerName} ${row.model.id}`);
  const kind = same.every((row) => row.model.shutdown_date_kind === "not_before")
    ? "That date is a not-sooner-than floor."
    : same.every((row) => row.model.shutdown_date_kind === "exact")
      ? "That date is an exact shutdown date."
      : "That date mixes an exact shutdown date and a not-sooner-than floor.";
  return `${same.length === 1 ? "1 model has that date" : `${same.length} models have that date`}: ${joinAnd(names)}. ${kind}`;
}

function relatedLinks(path: string): WindowLink[] {
  const links: WindowLink[] = [
    { href: "/upcoming/", label: "Upcoming shutdowns" },
    { href: "/deadlines/", label: "Deadlines" },
  ];
  if (path === THIS_WEEK_PATH) links.unshift({ href: NEXT_30_DAYS_PATH, label: "Next 30 days" });
  else links.unshift({ href: THIS_WEEK_PATH, label: "This week" });
  return links;
}

function newestUpdated(models: ModelRecord[]): string {
  let newest = "";
  for (const model of models) {
    const day = model.updated_at.slice(0, 10);
    if (day > newest) newest = day;
  }
  return newest;
}

function officialIds(model: ModelRecord): string[] {
  const ids: string[] = [];
  for (const replacement of model.replacements) {
    if (replacement.kind !== "official") continue;
    if (!ids.includes(replacement.model_id)) ids.push(replacement.model_id);
  }
  return ids;
}

function compareWindow(a: ModelRecord, b: ModelRecord): number {
  return (
    (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") ||
    a.provider.localeCompare(b.provider) ||
    a.id.localeCompare(b.id) ||
    a.slug.localeCompare(b.slug)
  );
}

function countModels(count: number, rest: string): string {
  if (count === 1) return `1 model has ${rest}`;
  return `${count} models have ${rest}`;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
