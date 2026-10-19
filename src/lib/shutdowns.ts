import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { clipMeta, type FaqItem } from "./format.ts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A batch page exists only when this many models share one provider and one exact shutdown date. */
export const SHUTDOWN_BATCH_MIN = 3;

export interface ShutdownEvent {
  provider: string;
  date: string;
  slug: string;
  models: ModelRecord[];
}

export interface ReplacementLink {
  id: string;
  modelPath: string | null;
  migratePath: string | null;
}

export function longDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function isPastShutdown(date: string, day: string): boolean {
  return date < day;
}

export function shutdownEventSlug(provider: string, date: string): string {
  return `${provider}-${date}`;
}

export function shutdownEventPath(event: Pick<ShutdownEvent, "slug">): string {
  return `/shutdowns/${event.slug}/`;
}

/**
 * One event per provider and exact shutdown date with at least three model records.
 * "Not sooner than" dates are floors, so they are not events. Month-only dates are not a single day.
 */
export function shutdownEvents(models: ModelRecord[]): ShutdownEvent[] {
  const groups = new Map<string, ModelRecord[]>();
  for (const model of models) {
    if (!model.shutdown_date || model.shutdown_date_kind !== "exact") continue;
    const key = `${model.provider}|${model.shutdown_date}`;
    const list = groups.get(key) ?? [];
    list.push(model);
    groups.set(key, list);
  }
  const events: ShutdownEvent[] = [];
  for (const list of groups.values()) {
    if (list.length < SHUTDOWN_BATCH_MIN) continue;
    const modelsInEvent = [...list].sort((a, b) => a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug));
    const date = modelsInEvent[0].shutdown_date!;
    const provider = modelsInEvent[0].provider;
    events.push({ provider, date, slug: shutdownEventSlug(provider, date), models: modelsInEvent });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.provider.localeCompare(b.provider));
}

/** Upcoming events first (soonest date), then past events (most recent date). */
export function orderShutdownEvents(events: ShutdownEvent[], day: string): ShutdownEvent[] {
  const upcoming = events
    .filter((event) => event.date >= day)
    .sort((a, b) => a.date.localeCompare(b.date) || a.provider.localeCompare(b.provider));
  const past = events
    .filter((event) => event.date < day)
    .sort((a, b) => b.date.localeCompare(a.date) || a.provider.localeCompare(b.provider));
  return [...upcoming, ...past];
}

export function shutdownEventTitle(providerName: string, event: ShutdownEvent, day: string): string {
  const when = longDate(event.date);
  if (isPastShutdown(event.date, day)) return `${providerName} models shut down on ${when}`;
  return `${providerName} models shutting down ${when}`;
}

export function shutdownEventLead(providerName: string, event: ShutdownEvent, day: string): string {
  const when = longDate(event.date);
  const past = isPastShutdown(event.date, day);
  const ids = event.models.map((model) => model.id);
  const action = past
    ? `${providerName} shut down ${event.models.length} models on ${when}`
    : `${providerName} shuts down ${event.models.length} models on ${when}`;
  const failing = past
    ? "Requests to these models started failing on that date."
    : "Requests to these models start failing on that date.";
  return `${action}: ${joinAnd(ids)}. ${replacementSummary(event.models)} ${failing}`;
}

export function shutdownEventDescription(providerName: string, event: ShutdownEvent, day: string): string {
  const title = shutdownEventTitle(providerName, event, day);
  const past = isPastShutdown(event.date, day);
  const failing = past ? "Requests started failing on that date." : "Requests start failing on that date.";
  return clipMeta(`${title}. ${event.models.length} models. ${shortReplacement(event.models)} ${failing}`);
}

export function shutdownEventFaqs(providerName: string, event: ShutdownEvent, day: string): FaqItem[] {
  const when = longDate(event.date);
  const past = isPastShutdown(event.date, day);
  const ids = event.models.map((model) => model.id);
  const which = past
    ? `Which ${providerName} models shut down on ${when}?`
    : `Which ${providerName} models are shutting down on ${when}?`;
  const whichAnswer = past
    ? `${providerName} shut down these ${event.models.length} models on ${when}: ${joinAnd(ids)}.`
    : `${providerName} shuts down these ${event.models.length} models on ${when}: ${joinAnd(ids)}.`;
  const replace = past
    ? `What replaces the ${providerName} models that shut down on ${when}?`
    : `What replaces the ${providerName} models shutting down on ${when}?`;
  const failingQuestion = past ? "On what date did requests to these models fail?" : "When do requests to these models start failing?";
  const failingAnswer = past
    ? `These models shut down on ${when}. Requests started failing on that date.`
    : `${providerName} shuts these models down on ${when}. Requests start failing on that date.`;
  return [
    { question: which, answer: whichAnswer },
    { question: replace, answer: `${replacementSummary(event.models)} The table lists the replacement for each model.` },
    { question: failingQuestion, answer: failingAnswer },
  ];
}

export function shutdownEventChecklist(event: ShutdownEvent, day: string): string[] {
  const when = longDate(event.date);
  const past = isPastShutdown(event.date, day);
  return [
    past
      ? `Find every request that still uses these model ids. They shut down on ${when}.`
      : `Find every request that still uses these model ids before ${when}.`,
    'Point each request at the replacement in the table. If a cell says "Not published", the provider did not name one.',
    "Open the source link on each row and read that page before you switch.",
    "Run the scan page on your code to catch the ids in this table.",
  ];
}

export function publishedReplacementIds(model: ModelRecord): string[] {
  const ids: string[] = [];
  for (const replacement of model.replacements) {
    if (replacement.kind !== "official") continue;
    if (!ids.includes(replacement.model_id)) ids.push(replacement.model_id);
  }
  return ids;
}

export function replacementLinks(model: ModelRecord, models: ModelRecord[], migrations: MigrationRecord[]): ReplacementLink[] {
  const links: ReplacementLink[] = [];
  const seen = new Set<string>();
  for (const replacement of model.replacements) {
    if (replacement.kind !== "official") continue;
    const key = `${replacement.provider}:${replacement.model_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const target = models.find((item) => item.provider === replacement.provider && item.id === replacement.model_id);
    const migration = migrations.find(
      (item) =>
        item.from.provider === model.provider &&
        item.from.slug === model.slug &&
        item.to.provider === replacement.provider &&
        item.to.model_id === replacement.model_id,
    );
    links.push({
      id: replacement.model_id,
      modelPath: target ? `/models/${target.provider}/${target.slug}/` : null,
      migratePath: migration
        ? `/migrate/${migration.from.provider}__${migration.from.slug}__to__${migration.to.provider}__${migration.to.slug}/`
        : null,
    });
  }
  return links;
}

export function providerDisplayName(providers: Provider[], id: string): string {
  return providers.find((provider) => provider.id === id)?.name ?? id;
}

export function eventCitations(event: ShutdownEvent): string[] {
  const urls = new Set<string>();
  for (const model of event.models) {
    for (const source of model.sources) urls.add(source.url);
  }
  return [...urls].sort();
}

export function eventDateModified(event: ShutdownEvent): string {
  let newest = "";
  for (const model of event.models) {
    const day = model.updated_at.slice(0, 10);
    if (day > newest) newest = day;
  }
  return newest;
}

export function eventDatePublished(event: ShutdownEvent): string {
  let oldest = "";
  for (const model of event.models) {
    const day = model.first_seen.slice(0, 10);
    if (!oldest || day < oldest) oldest = day;
  }
  return oldest;
}

function replacementSummary(models: ModelRecord[]): string {
  const names = new Set<string>();
  let missing = 0;
  for (const model of models) {
    const ids = publishedReplacementIds(model);
    if (!ids.length) missing++;
    for (const id of ids) names.add(id);
  }
  const list = [...names].sort((a, b) => a.localeCompare(b));
  if (!list.length) return "No official replacement is published for these models.";
  const phrase = listPhrase(list, 6);
  const gap = missing === 0 ? "" : missing === 1 ? " 1 model has no published replacement." : ` ${missing} models have no published replacement.`;
  if (list.length === 1 && missing === 0) return `The official replacement is ${list[0]}.`;
  if (list.length === 1) return `The official replacement is ${list[0]} where one is published.${gap}`;
  return `Official replacements named by the provider: ${phrase}.${gap}`;
}

function shortReplacement(models: ModelRecord[]): string {
  const names = new Set<string>();
  let missing = 0;
  for (const model of models) {
    const ids = publishedReplacementIds(model);
    if (!ids.length) missing++;
    for (const id of ids) names.add(id);
  }
  if (!names.size) return "No official replacement is published.";
  if (names.size === 1 && missing === 0) return `The official replacement is ${[...names][0]}.`;
  return "The table lists each published replacement.";
}

function listPhrase(items: string[], limit: number): string {
  if (items.length <= limit) return joinAnd(items);
  const rest = items.length - limit;
  return `${joinAnd(items.slice(0, limit))}, plus ${rest} more`;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
