import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { clipMeta, visibleName, type FaqItem } from "./format.ts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A batch page exists only when this many models share one provider and one exact shutdown date. */
export const SHUTDOWN_BATCH_MIN = 3;

/**
 * Exact dates that still get a /shutdowns/ page with fewer than SHUTDOWN_BATCH_MIN rows.
 * shutdownEvents reads the current dataset. A reroute note or a region limit does not
 * drop a row when shutdown_date_kind is exact. These two dates have two exact rows each,
 * which is why the three-model rule hid them. Other two-row dates stay unpublished.
 */
export const SMALL_SHUTDOWN_BATCHES = new Set([
  "google-gemini-api|2026-12-01",
  "aws-bedrock|2026-11-27",
]);

/** GitHub changelog post for the November 16, 2026 Copilot retirements. */
export const COPILOT_NOV16_SLUG = "github-copilot-2026-11-16";
export const COPILOT_NOV16_PATH = `/shutdowns/${COPILOT_NOV16_SLUG}/`;
export const COPILOT_NOV16_TITLE = "Claude Opus 4.8, Opus 5, GPT-5.6 Terra leave GitHub Copilot Nov 16, 2026";
export const COPILOT_NOV16_DESCRIPTION =
  "Claude Opus 4.8, Claude Opus 5 and GPT-5.6 Terra are removed from GitHub Copilot on Nov 16, 2026. Replacements and source.";
export const COPILOT_NOV16_CHANGELOG =
  "https://github.blog/changelog/2026-10-15-upcoming-deprecation-of-selected-github-copilot-models-in-mid-november";

/** The only November 30, 2026 URL. OpenAI did not publish a /shutdowns/ page for this date. */
export const OPENAI_NOV30_PATH = "/openai-evals-agent-builder-prompts-shutdown-nov-30-2026/";
export const OPENAI_NOV30_DATE = "2026-11-30";
export const OPENAI_NOV30_CHECKED = "2026-10-19";
export const OPENAI_NOV30_LABEL = "OpenAI Evals, Agent Builder, and stored prompts shut down November 30, 2026";

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
 * SMALL_SHUTDOWN_BATCHES also publishes the named two-row dates.
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
  for (const [key, list] of groups) {
    if (list.length < SHUTDOWN_BATCH_MIN && !SMALL_SHUTDOWN_BATCHES.has(key)) continue;
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

export interface IdGroup {
  snapshot: string;
  aliases: string[];
  fineTunes: string[];
}

export interface BatchExtras {
  headline: string | null;
  lead: string | null;
  faqs: FaqItem[];
  groups: IdGroup[] | null;
  note: string | null;
  showRegions: boolean;
  /** Brief answer block, early signup form, and last-checked line. */
  answerFirst: boolean;
  checkedUrl: string | null;
}

const EMPTY_EXTRAS: BatchExtras = {
  headline: null,
  lead: null,
  faqs: [],
  groups: null,
  note: null,
  showRegions: false,
  answerFirst: false,
  checkedUrl: null,
};

/** The October 23 OpenAI page counts model IDs (snapshots, aliases, fine-tunes), not separate models. */
export function isModelIdBatch(event: ShutdownEvent): boolean {
  return event.provider === "openai" && event.date === "2026-10-23" && event.models.length >= 10;
}

export function eventCountLabel(event: ShutdownEvent): string {
  if (isModelIdBatch(event)) return `${event.models.length} model IDs`;
  return `${event.models.length} models`;
}

export function batchHeadline(providerName: string, event: ShutdownEvent, day: string): string {
  if (event.slug === COPILOT_NOV16_SLUG) return shutdownEventTitle(providerName, event, day);
  return bedrockHeadline(providerName, event, day) ?? batchExtras(event).headline ?? modelLedOrGenericTitle(providerName, event, day);
}

/** Document title. Copilot November 16 keeps its hand-tuned title. Other future pages use the same line as the H1. */
export function batchDocumentTitle(providerName: string, event: ShutdownEvent, day: string): string {
  if (event.slug === COPILOT_NOV16_SLUG) return COPILOT_NOV16_TITLE;
  return batchHeadline(providerName, event, day);
}

/** dateModified for the page. Copilot uses the day the GitHub source was checked. */
export function batchDateModified(event: ShutdownEvent): string {
  if (event.slug === COPILOT_NOV16_SLUG) return eventLastChecked(event);
  return eventDateModified(event);
}

export function batchDescription(providerName: string, event: ShutdownEvent, day: string): string {
  if (event.slug === COPILOT_NOV16_SLUG) return COPILOT_NOV16_DESCRIPTION;
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") {
    const past = isPastShutdown(event.date, day);
    return clipMeta(
      past
        ? "Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet shut down on Nov 13, 2026 in some Regions."
        : "Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, Claude 3.7 Sonnet. Nov 13, 2026 end of life in some Regions: ap-south-1, ca-central-1.",
    );
  }
  const regional = bedrockHeadline(providerName, event, day);
  if (regional) {
    const failing = isPastShutdown(event.date, day) ? "Requests started failing on that date." : "Requests start failing on that date.";
    return clipMeta(`${regional}. ${failing}`);
  }
  if (isModelIdBatch(event)) {
    const when = longDate(event.date);
    return clipMeta(
      isPastShutdown(event.date, day)
        ? `${event.models.length} OpenAI model IDs, including gpt-4, gpt-3.5-turbo, and o1, shut down on ${when}. Replacements include gpt-5.6-sol.`
        : `gpt-4, gpt-3.5-turbo, and o1 are ${event.models.length} OpenAI model IDs shutting down ${when}. Replacements include gpt-5.6-sol, gpt-5.6-terra, and gpt-5.6-luna.`,
    );
  }
  if (!isPastShutdown(event.date, day)) return modelLedDescription(providerName, event);
  return shutdownEventDescription(providerName, event, day);
}

/** Keep the model list near this length. The page adds " | SunsetDiff" after it. */
const MODEL_LED_TITLE_MAX = 65;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const month = SHORT_MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function modelLedOrGenericTitle(providerName: string, event: ShutdownEvent, day: string): string {
  if (isPastShutdown(event.date, day)) return shutdownEventTitle(providerName, event, day);
  return modelLedTitle(providerName, event, day);
}

/**
 * Names to lead with. These strings are display names from the rows.
 * A dated snapshot stays behind its alias when that alias is also in the batch.
 * Then an id other rows use as their family, then the family with more rows.
 * An id that contains a year, or ends in a 4-digit version, comes after a plain id.
 */
function rankedModels(event: ShutdownEvent): ModelRecord[] {
  const ids = new Set(event.models.map((model) => model.id));
  const childCount = new Map<string, number>();
  const familySize = new Map<string, number>();
  const lineKey = (model: ModelRecord) => (model.family && model.family !== model.id ? model.family : model.id);
  const datedId = (id: string) => /(?:19|20)\d{2}/.test(id) || /-\d{4}$/.test(id);
  const snapshotInBatch = (model: ModelRecord) => Boolean(model.family && model.family !== model.id && ids.has(model.family));
  for (const model of event.models) {
    if (model.family && model.family !== model.id) childCount.set(model.family, (childCount.get(model.family) ?? 0) + 1);
    const key = lineKey(model);
    familySize.set(key, (familySize.get(key) ?? 0) + 1);
  }
  return [...event.models].sort((a, b) => {
    const snapshot = Number(snapshotInBatch(a)) - Number(snapshotInBatch(b));
    if (snapshot) return snapshot;
    const children = (childCount.get(b.id) ?? 0) - (childCount.get(a.id) ?? 0);
    if (children) return children;
    const line = (familySize.get(lineKey(b)) ?? 0) - (familySize.get(lineKey(a)) ?? 0);
    if (line) return line;
    const dated = Number(datedId(a.id)) - Number(datedId(b.id));
    if (dated) return dated;
    return a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug);
  });
}

function notableDisplayNames(event: ShutdownEvent): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const model of rankedModels(event)) {
    const name = visibleName(model);
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

/** Official replacement ids for the display names actually written in the sentence, in that order. */
function replacementIdsForNames(event: ShutdownEvent, names: string[]): string[] {
  const wanted = new Set(names);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const model of rankedModels(event)) {
    if (!wanted.has(visibleName(model))) continue;
    for (const id of publishedReplacementIds(model)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function nameList(shown: string[], rest: number): string {
  if (rest > 0) {
    const more = `${rest} more`;
    if (shown.length === 1) return `${shown[0]} and ${more}`;
    return `${shown.join(", ")} and ${more}`;
  }
  if (shown.length <= 1) return shown[0] ?? "";
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

function modelLedTitle(providerName: string, event: ShutdownEvent, day: string): string {
  const names = notableDisplayNames(event);
  if (!names.length) return shutdownEventTitle(providerName, event, day);
  const regional = event.provider === "aws-bedrock" ? " in some Regions" : "";
  const tail = ` on ${providerName} ${shortDate(event.date)}${regional}`;
  const form = (count: number) => `${nameList(names.slice(0, count), names.length - count)}${tail}`;
  let count = Math.min(3, names.length);
  while (count > 1 && form(count).length > MODEL_LED_TITLE_MAX) count -= 1;
  return form(count);
}

function modelLedDescription(providerName: string, event: ShutdownEvent): string {
  const names = notableDisplayNames(event);
  const anyReplacement = event.models.some((model) => publishedReplacementIds(model).length > 0);
  const regional = event.provider === "aws-bedrock" ? " in some Regions" : "";
  const when = shortDate(event.date);
  const sentence = (shownCount: number, repCount: number): string => {
    const count = Math.min(shownCount, names.length);
    const shown = names.slice(0, count);
    const rest = names.length - count;
    const verb = shown.length + rest === 1 ? "is" : "are";
    let text = `${nameList(shown, rest)} ${verb} shutting down on ${providerName} ${when}${regional}.`;
    const reps = replacementIdsForNames(event, shown);
    const picked = reps.slice(0, repCount);
    if (picked.length) {
      const repRest = reps.length - picked.length;
      const label = picked.length === 1 && repRest === 0 ? "Replacement" : "Replacements";
      text += ` ${label}: ${nameList(picked, repRest)}.`;
    }
    return text;
  };
  const attempts: [number, number][] = [];
  const seenAttempt = new Set<string>();
  const addAttempt = (shown: number, repCount: number) => {
    const key = `${shown}:${repCount}`;
    if (seenAttempt.has(key)) return;
    seenAttempt.add(key);
    attempts.push([shown, repCount]);
  };
  if (anyReplacement) {
    for (const repCount of [3, 2, 1]) {
      for (const shown of [3, 2, 1]) addAttempt(shown, repCount);
    }
  }
  for (const shown of [3, 2, 1]) addAttempt(shown, 0);
  for (const [shown, repCount] of attempts) {
    const text = sentence(shown, repCount);
    if (text.length <= 160) return text;
  }
  return clipMeta(sentence(1, 0));
}

/** Bedrock dates on these pages are not worldwide. The headline says so. Future pages name the models instead. */
function bedrockHeadline(providerName: string, event: ShutdownEvent, day: string): string | null {
  if (event.provider !== "aws-bedrock") return null;
  if (event.date === "2026-11-13") return "Bedrock Claude 3, 3.5 and 3.7 End of Life: Nov 13, 2026 in some Regions";
  const when = longDate(event.date);
  if (isPastShutdown(event.date, day)) return `${providerName} models shut down on ${when} in some Regions`;
  return null;
}

export function limitBedrockAnswer(event: ShutdownEvent, answer: string): string {
  if (event.provider !== "aws-bedrock") return answer;
  if (/some AWS Regions/i.test(answer)) return answer;
  const when = longDate(event.date);
  const mentionsDate = answer.includes(when) || answer.includes(event.date) || (event.date === "2026-11-13" && answer.includes("Nov 13, 2026"));
  if (!mentionsDate) return answer;
  return `${answer} This date applies in some AWS Regions only.`;
}

export function batchLead(providerName: string, event: ShutdownEvent, day: string): string {
  if (event.slug === COPILOT_NOV16_SLUG) return copilotNov16Lead();
  if (isModelIdBatch(event)) return openAiShortAnswer(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") return bedrockShortAnswer(day);
  if (event.provider === "google-gemini-api" && event.date === "2026-12-01") return geminiDec1Lead(day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-27") return bedrockNov27Lead(day);
  return batchExtras(event).lead ?? shutdownEventLead(providerName, event, day);
}

export function batchChecklist(event: ShutdownEvent, day: string): string[] {
  if (event.slug === COPILOT_NOV16_SLUG) return copilotNov16Checklist();
  if (event.provider === "google-gemini-api" && event.date === "2026-12-01") return geminiDec1Checklist();
  const steps = shutdownEventChecklist(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13" && !isPastShutdown(event.date, day)) {
    steps[0] = "Find every request that still uses these model ids before November 13, 2026 in some Regions.";
  }
  return steps;
}

export function batchFaqs(providerName: string, event: ShutdownEvent, day: string): FaqItem[] {
  if (event.slug === COPILOT_NOV16_SLUG) return copilotNov16Faqs();
  const extras = batchExtras(event);
  if (isModelIdBatch(event)) return openAiOct23Faqs(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") return bedrockNov13Faqs(day);
  if (event.provider === "google-gemini-api" && event.date === "2026-12-01") return geminiDec1Faqs(day);
  const generic = shutdownEventFaqs(providerName, event, day);
  const items = [...generic, ...extras.faqs];
  return items.map((item) => ({ ...item, answer: limitBedrockAnswer(event, item.answer) }));
}

export function replacementSuffix(modelId: string): string | null {
  if (modelId === "o1-pro" || modelId === "o1-pro-2025-03-19") return "reasoning.mode: pro";
  return null;
}

export function eventLastChecked(event: ShutdownEvent): string {
  let newest = "";
  for (const model of event.models) {
    for (const source of model.sources) {
      if (source.last_checked > newest) newest = source.last_checked;
    }
  }
  return newest;
}

/**
 * Wording is from GitHub's October 15, 2026 changelog and the supported-models page.
 * GitHub lists model names, not a separate API id. GPT-5.6 Terra's alternatives are
 * "GPT-6.1 Sol or GPT-6 Luna", with no preference. SunsetDiff is not GitHub.
 */
function copilotNov16Lead(): string {
  return "GitHub will deprecate Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra across all GitHub Copilot experiences (including Copilot Chat, inline edits, ask and agent modes, and code completions) on November 16, 2026. GitHub lists Claude Opus 5.5 as the suggested alternative for the two Opus models. For GPT-5.6 Terra, GitHub lists GPT-6.1 Sol or GPT-6 Luna and does not prefer one. The supported-models page lists these model names and does not publish a separate API id. GitHub says Claude Opus 4.8 stays available to individual subscribers on annual plans. SunsetDiff is not GitHub.";
}

function copilotNov16Checklist(): string[] {
  return [
    "Update workflows and integrations to a supported model before November 16, 2026. That is what GitHub's changelog asks.",
    "Under default model enablement, GitHub says the suggested alternatives are automatically enabled for Copilot Enterprise and Copilot Business unless an administrator turned off the global default or explicitly disabled the model.",
    "If the global default is off, enable the alternative models through their model policies in Copilot settings. GitHub says users then see the model in the Copilot Chat model selector.",
    "GitHub says no action is required to remove the models after they have been deprecated.",
  ];
}

function copilotNov16Faqs(): FaqItem[] {
  return [
    {
      question: "Which models leave GitHub Copilot on November 16, 2026?",
      answer:
        "GitHub's changelog names Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra. The deprecation date is November 16, 2026. GitHub says Claude Opus 4.8 stays available to individual subscribers on annual plans.",
    },
    {
      question: "Which Copilot surfaces lose these models?",
      answer:
        "GitHub's October 15, 2026 changelog says it will deprecate them across all GitHub Copilot experiences, including Copilot Chat, inline edits, ask and agent modes, and code completions.",
    },
    {
      question: "What does GitHub suggest instead of GPT-5.6 Terra?",
      answer:
        "GitHub's changelog lists GPT-6.1 Sol or GPT-6 Luna. It does not say which one to pick. Claude Opus 4.8 and Claude Opus 5 both list Claude Opus 5.5.",
    },
    {
      question: "What should a Copilot admin do before November 16, 2026?",
      answer:
        "GitHub says to update workflows and integrations before that date. Under default model enablement, the suggested alternatives are enabled for Copilot Enterprise and Copilot Business unless an administrator turned off the global default or disabled the model. If the global default is off, enable the alternatives in their model policies in Copilot settings. GitHub says users then see the model in the Copilot Chat model selector. GitHub says no action is required to remove the deprecated models.",
    },
  ];
}

export interface DeadlineAnchor {
  href: string;
  label: string;
  date: string;
}

/** Upcoming /shutdowns/ pages, plus the November 30 OpenAI landing page. Anchor text includes model or product names. */
export function nextDeadlineAnchors(events: ShutdownEvent[], providers: Provider[], day: string): DeadlineAnchor[] {
  const links: DeadlineAnchor[] = orderShutdownEvents(events, day)
    .filter((event) => event.date >= day)
    .map((event) => ({
      href: shutdownEventPath(event),
      label: deadlineAnchorLabel(event, providers),
      date: event.date,
    }));
  if (OPENAI_NOV30_DATE >= day) {
    links.push({ href: OPENAI_NOV30_PATH, label: OPENAI_NOV30_LABEL, date: OPENAI_NOV30_DATE });
  }
  return links.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

function deadlineAnchorLabel(event: ShutdownEvent, providers: Provider[]): string {
  if (event.slug === COPILOT_NOV16_SLUG) return COPILOT_NOV16_TITLE;
  const provider = providerDisplayName(providers, event.provider);
  const names = [...new Set(event.models.map((model) => model.display_name.trim()).filter(Boolean))];
  const shown = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? `, and ${names.length - 3} more` : "";
  return `${shown}${more} on ${provider}, ${longDate(event.date)}`;
}

export function copilotNov16Hit(models: ModelRecord[]): boolean {
  return shutdownEvents(models).some((event) => event.slug === COPILOT_NOV16_SLUG);
}

function openAiShortAnswer(event: ShutdownEvent, day: string): string {
  const when = longDate(event.date);
  const models = "gpt-3.5-turbo, gpt-4, gpt-4-turbo, gpt-4o-2024-05-13, gpt-4.1-nano, o1, o1-pro, o3-mini, o4-mini, gpt-image-1, and fine-tunes built on gpt-3.5-turbo, gpt-4, gpt-4.1-nano, o4-mini, babbage-002 and davinci-002";
  const replacements = "OpenAI recommends gpt-5.6-sol, gpt-5.6-terra or gpt-5.6-luna for text models and gpt-image-2.5-sunburst or gpt-image-2.5-flare for gpt-image-1. Source: OpenAI deprecations page.";
  if (isPastShutdown(event.date, day)) {
    return `These ${event.models.length} OpenAI model IDs shut down on ${when}, according to its published deprecations page. These include ${models}. Requests to these IDs stopped on that date. ${replacements}`;
  }
  return `OpenAI shuts down ${event.models.length} legacy model IDs on ${when}, according to its published deprecations page. These include ${models}. After that date, requests to these IDs stop working. ${replacements}`;
}

function bedrockShortAnswer(day: string): string {
  if (isPastShutdown("2026-11-13", day)) {
    return "These Claude models shut down on November 13, 2026 in some Regions. Amazon Bedrock lists that end of life for Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2 and Claude 3.7 Sonnet in specific AWS Regions such as ap-south-1, ap-southeast-1, ap-northeast-2, ca-central-1, sa-east-1, eu-west-2 and eu-central-2. In several other Regions, including us-east-1, Claude 3 Haiku already reached end of life on September 10, 2026. Requests failed after end of life. Check your Region in the table below or call GetFoundationModel and read modelLifecycle. Source: AWS Bedrock model lifecycle page.";
  }
  return "Amazon Bedrock lists November 13, 2026 as the end-of-life date for Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2 and Claude 3.7 Sonnet, but only in specific AWS Regions such as ap-south-1, ap-southeast-1, ap-northeast-2, ca-central-1, sa-east-1, eu-west-2 and eu-central-2. In several other Regions, including us-east-1, Claude 3 Haiku already reached end of life on September 10, 2026. After end of life, requests fail. Check your Region in the table below or call GetFoundationModel and read modelLifecycle. Source: AWS Bedrock model lifecycle page.";
}

function openAiOct23Faqs(event: ShutdownEvent, day: string): FaqItem[] {
  const when = longDate(event.date);
  const past = isPastShutdown(event.date, day);
  const which = past
    ? `Which OpenAI model IDs shut down on ${when}?`
    : `Which OpenAI model IDs are shutting down on ${when}?`;
  const whichAnswer = past
    ? `These ${event.models.length} OpenAI model IDs shut down on ${when}. The rows are snapshots, aliases, and fine-tunes, not ${event.models.length} separate models.`
    : `OpenAI is shutting down ${event.models.length} model IDs on ${when}. The rows are snapshots, aliases, and fine-tunes, not ${event.models.length} separate models. Requests start failing on that date.`;
  return [
    { question: which, answer: whichAnswer },
    {
      question: past ? `Did OpenAI shut down ${event.models.length} separate models on ${when}?` : `Is OpenAI shutting down ${event.models.length} separate models on ${when}?`,
      answer: `No. The ${event.models.length} rows are model IDs: snapshots, aliases, and fine-tunes. Several IDs point at the same snapshot.`,
    },
    {
      question: "Does the alias gpt-4 stop working too?",
      answer: past
        ? "Yes. gpt-4 is an alias of the snapshot gpt-4-0613. Both IDs shut down on October 23, 2026."
        : "Yes. gpt-4 is an alias of the snapshot gpt-4-0613. OpenAI lists both in this batch, so requests to either ID start failing on October 23, 2026.",
    },
    {
      question: "Will my fine-tuned gpt-3.5-turbo stop working?",
      answer:
        "OpenAI says inference on a fine-tuned model is disabled when the base model is deprecated. ft-gpt-3.5-turbo is in this batch. See the [gpt-3.5-turbo shutdown date](/questions/openai/gpt-3-5-turbo/shutdown-date/).",
    },
    {
      question: past ? `What replaced the model IDs that shut down on ${when}?` : `What replaces the model IDs shutting down on ${when}?`,
      answer:
        "OpenAI names gpt-5.6-sol, gpt-5.6-terra, or gpt-5.6-luna for the text IDs. For o1-pro and o1-pro-2025-03-19, OpenAI names gpt-5.6-sol with reasoning.mode: pro. For gpt-image-1, OpenAI names gpt-image-2.5-sunburst or gpt-image-2.5-flare. See the [gpt-image-1 shutdown date](/questions/openai/gpt-image-1/shutdown-date/).",
    },
    {
      question: "What happens to API calls after the shutdown date?",
      answer: past
        ? 'OpenAI says: "At the time of the shut down, the model or endpoint will no longer be accessible." These model IDs shut down on October 23, 2026.'
        : 'OpenAI says: "At the time of the shut down, the model or endpoint will no longer be accessible." Requests to these model IDs start failing on October 23, 2026.',
    },
    {
      question: "How can I check which models my code uses?",
      answer:
        "GET /v1/models can return an optional shutdown_date for each model. The value is a YYYY-MM-DD date, or null when OpenAI has not set one. You can also [scan your code](/scan/) and read the [calendar](/calendar/).",
    },
  ];
}

function bedrockNov13Faqs(day: string): FaqItem[] {
  const past = isPastShutdown("2026-11-13", day);
  const which = past
    ? "Which Claude models shut down on Bedrock on November 13, 2026?"
    : "Which Claude models reach end of life on Bedrock on November 13, 2026?";
  const whichAnswer = past
    ? "In some AWS Regions only, Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet shut down on November 13, 2026."
    : "In some AWS Regions only, Amazon Bedrock lists November 13, 2026 as the end of life for Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet.";
  return [
    { question: which, answer: whichAnswer },
    {
      question: "What replaces these Claude models on Bedrock?",
      answer:
        "AWS does not name a replacement on its lifecycle page. Links marked SunsetDiff suggestion are not an AWS recommendation. See the replace pages for each model ID, plus the Anthropic suggestions for [Claude 3 Haiku](/migrate/anthropic__claude-3-haiku-20240307__to__anthropic__claude-haiku-4-5-20251001/) and [Claude 3.7 Sonnet](/migrate/anthropic__claude-3-7-sonnet-20250219__to__anthropic__claude-sonnet-5-5/).",
    },
    {
      question: past ? "On what date did requests to these models fail?" : "When do requests to these models start failing?",
      answer: past
        ? "In some AWS Regions only, these models shut down on November 13, 2026. Requests started failing on that date. A Region that is not listed on the row keeps its own date."
        : "In some AWS Regions only, requests start failing on November 13, 2026. A Region that is not listed on the row keeps its own date.",
    },
    {
      question: "Does November 13, 2026 apply in every AWS Region?",
      answer:
        "No. This date applies in some AWS Regions only. November 13, 2026 for Claude 3 Haiku applies in ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1, and ca-central-1. Claude 3 Haiku already reached end of life on September 10, 2026 in ap-northeast-1, ap-southeast-2, eu-central-1, eu-west-1, eu-west-2, eu-west-3, us-east-1, us-east-2, us-west-2, us-gov-east-1, and us-gov-west-1.",
    },
    {
      question: "Why did Claude 3 Haiku already stop working in us-east-1?",
      answer:
        "AWS lists an earlier end of life for Claude 3 Haiku in us-east-1. That date is September 10, 2026, and the same row also lists ap-northeast-1, ap-southeast-2, eu-central-1, eu-west-1, eu-west-2, eu-west-3, us-east-2, us-west-2, us-gov-east-1, and us-gov-west-1. See the [Claude 3 Haiku regions that already reached end of life](/models/aws-bedrock/anthropic-claude-3-haiku-20240307-v1-0-2/).",
    },
    {
      question: "What is Bedrock public extended access and does it cost more?",
      answer:
        "Public extended access is the window AWS lists after Legacy on the lifecycle page. New customers cannot use a Legacy model. Existing customers may lose access after 15 days of inactivity. You cannot buy new Provisioned Throughput. AWS says extended access pricing is set by the provider. This page does not list a price.",
    },
    {
      question: "What should I migrate to from Claude 3.5 Sonnet on Bedrock?",
      answer:
        "AWS does not name a replacement on its lifecycle page. A SunsetDiff suggestion is not an AWS recommendation. See the [Claude 3.5 Sonnet replace page](/replace/aws-bedrock/anthropic-claude-3-5-sonnet-20240620-v1-0/).",
    },
    {
      question: "How do I check a model's lifecycle state in my region?",
      answer:
        "Call ListFoundationModels or GetFoundationModel in that Region and read modelLifecycle. The state can differ by Region. This date applies in some AWS Regions only.",
    },
  ];
}

export function batchExtras(event: ShutdownEvent): BatchExtras {
  if (isModelIdBatch(event)) {
    return {
      headline: `OpenAI Model Retirement October 23, 2026: ${event.models.length} Model IDs (gpt-4, gpt-3.5-turbo, o1)`,
      lead: null,
      faqs: [],
      groups: openAiIdGroups(event.models),
      note: "Use the snapshot column when you migrate. An alias in the same row uses that snapshot's date.",
      showRegions: false,
      answerFirst: true,
      checkedUrl: "https://developers.openai.com/api/docs/deprecations",
    };
  }
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") {
    return {
      headline: null,
      lead: null,
      faqs: [],
      groups: null,
      note: "Claude 3 Haiku already reached end of life on September 10, 2026 in ap-northeast-1, ap-southeast-2, eu-central-1, eu-west-1, eu-west-2, eu-west-3, us-east-1, us-east-2, us-west-2, us-gov-east-1, and us-gov-west-1. November 13, 2026 applies in some AWS Regions only: ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1, and ca-central-1 for Claude 3 Haiku. Legacy dates differ by Region and are in the Region column.",
      showRegions: true,
      answerFirst: true,
      checkedUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html",
    };
  }
  if (event.provider === "google-vertex" && event.date === "2026-10-20") {
    return {
      headline: null,
      lead: null,
      faqs: [
        {
          question: "Are the October 20, 2026 Vertex dates verified?",
          answer:
            "Yes. Google's Gemini Enterprise Agent Platform model versions page lists October 20, 2026 as the retirement date for gemini-2.5-flash, gemini-2.5-flash-lite, and gemini-2.5-pro. SunsetDiff checked that page on October 19, 2026. The same page also lists Gemma 4 as a replacement for gemini-2.5-flash-lite.",
        },
      ],
      groups: null,
      note: "Verified on Google's model versions page on October 19, 2026: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions. That page lists retirement on October 20, 2026 for gemini-2.5-pro, gemini-2.5-flash, and gemini-2.5-flash-lite.",
      showRegions: false,
      answerFirst: false,
      checkedUrl: null,
    };
  }
  if (event.slug === "openai-2026-12-01") {
    return {
      ...EMPTY_EXTRAS,
      note: "This page is the GPT Image model IDs OpenAI is removing on December 1, 2026. gpt-image-1 is on the October 23, 2026 page.",
    };
  }
  if (event.slug === "openai-2026-12-11") {
    return {
      ...EMPTY_EXTRAS,
      note: "This page is the GPT-5 and o3 snapshots OpenAI is removing on December 11, 2026.",
    };
  }
  if (event.slug === "openai-2027-01-14") {
    return {
      ...EMPTY_EXTRAS,
      note: "This page is the GPT-4o and GPT-4.1 snapshots OpenAI is removing on January 14, 2027. Earlier GPT-4o and GPT-4.1 snapshots are on the October 23, 2026 page.",
    };
  }
  if (event.provider === "aws-bedrock" && event.date === "2026-11-27") {
    return {
      ...EMPTY_EXTRAS,
      showRegions: true,
      note: "November 27, 2026 is the end-of-life date the legacy lifecycle page lists for Claude 3 Haiku and Claude 3 Sonnet in ca-central-1. The same model ids use other dates in other Regions. November 13, 2026 is a different batch. Claude 3 Haiku already reached end of life on September 10, 2026 in another set of Regions.",
      checkedUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html",
    };
  }
  if (event.provider === "google-gemini-api" && event.date === "2026-12-01") {
    return {
      ...EMPTY_EXTRAS,
      note: "The deprecations page also says the shutdown dates in the table are the earliest possible dates, and that Google will communicate the exact shutdown date with advance notice. The caution for these two ids says the route is effective December 1, 2026. gemini-2.5-flash-lite is not in this batch.",
      checkedUrl: "https://aistudio.google.com/docs/deprecations",
    };
  }
  if (event.provider === "aws-bedrock") return { ...EMPTY_EXTRAS, showRegions: true };
  return EMPTY_EXTRAS;
}

function geminiDec1Lead(day: string): string {
  const when = longDate("2026-12-01");
  const past = isPastShutdown("2026-12-01", day);
  const route = past
    ? `On ${when}, requests to gemini-2.5-pro automatically routed to gemini-3.8-flash and were billed at Gemini 3.8 Flash rates. Requests to gemini-2.5-flash automatically routed to gemini-3.5-flash-lite and were billed at Gemini 3.5 Flash-Lite rates.`
    : `On ${when}, requests to gemini-2.5-pro automatically route to gemini-3.8-flash and are billed at Gemini 3.8 Flash rates. Requests to gemini-2.5-flash automatically route to gemini-3.5-flash-lite and are billed at Gemini 3.5 Flash-Lite rates.`;
  const access = past ? "Access was already limited to existing users." : "Access is already limited to existing users.";
  return `${route} The response comes from the replacement model. ${access} gemini-2.5-flash-lite stays available. Google says that id is not deprecated. Source: Gemini API deprecations page.`;
}

function bedrockNov27Lead(day: string): string {
  const past = isPastShutdown("2026-11-27", day);
  if (past) {
    return "Claude 3 Haiku and Claude 3 Sonnet reached end of life on November 27, 2026 in ca-central-1. The same model ids use other dates in other Regions. AWS does not name a replacement on the lifecycle page. Requests failed after end of life in the Regions on the row. Source: AWS Bedrock legacy lifecycle page.";
  }
  return "Amazon Bedrock lists November 27, 2026 as the end of life for Claude 3 Haiku and Claude 3 Sonnet in ca-central-1. The same model ids use other dates in other Regions. AWS does not name a replacement on the lifecycle page. After end of life, requests fail in the Regions on the row. Source: AWS Bedrock legacy lifecycle page.";
}

function geminiDec1Checklist(): string[] {
  return [
    "Search the repository for gemini-2.5-pro and gemini-2.5-flash before December 1, 2026.",
    "Send one real request to gemini-3.8-flash and one real request to gemini-3.5-flash-lite before that date. Read the migration guide for that id first.",
    "Set the model id in the request to the replacement. An old id left in place is the id Google routes, and the bill follows the replacement, on December 1, 2026.",
    "Leave calls that use gemini-2.5-flash-lite on gemini-2.5-flash-lite. Google says that id is not deprecated.",
  ];
}

function geminiDec1Faqs(day: string): FaqItem[] {
  const when = longDate("2026-12-01");
  const past = isPastShutdown("2026-12-01", day);
  return [
    {
      question: past ? `Which Gemini API models routed on ${when}?` : `Which Gemini API models route on ${when}?`,
      answer:
        "gemini-2.5-pro routes to gemini-3.8-flash. gemini-2.5-flash routes to gemini-3.5-flash-lite. gemini-2.5-flash-lite has no shutdown date on the deprecations page.",
    },
    {
      question: past ? `What happened to an API request on ${when}?` : `What happens to an API request on ${when}?`,
      answer: past
        ? `Google says the request automatically routed to the replacement model and was billed at that model's rates. The caution does not say the call started returning an error on ${when}.`
        : `Google says the request automatically routes to the replacement model and is billed at that model's rates. The caution does not say the call starts returning an error on ${when}.`,
    },
    {
      question: "Does the bill change?",
      answer:
        "Yes. gemini-2.5-pro requests are billed at Gemini 3.8 Flash rates. gemini-2.5-flash requests are billed at Gemini 3.5 Flash-Lite rates. This page does not print a dollar amount. The pricing links are on the deprecations page.",
    },
    {
      question: "Is gemini-2.5-flash-lite in this batch?",
      answer:
        "No. The deprecations page says gemini-2.5-flash-lite is not deprecated and remains available through the API until further notice. Its shutdown cell says no shutdown date announced.",
    },
  ];
}

const OPENAI_OCT23_GROUPS: IdGroup[] = [
  { snapshot: "gpt-3.5-turbo-0125", aliases: ["gpt-3.5-turbo", "gpt-3.5-turbo-completions"], fineTunes: ["ft-gpt-3.5-turbo"] },
  { snapshot: "gpt-4-0613", aliases: ["gpt-4", "gpt-4-0613-completions", "gpt-4-completions"], fineTunes: ["ft-gpt-4"] },
  { snapshot: "gpt-4-1106-preview", aliases: [], fineTunes: [] },
  { snapshot: "gpt-4-turbo-2024-04-09", aliases: ["gpt-4-turbo", "gpt-4-turbo-completions"], fineTunes: [] },
  { snapshot: "gpt-4.1-nano-2025-04-14", aliases: ["gpt-4.1-nano"], fineTunes: ["ft-gpt-4.1-nano-2025-04-14"] },
  { snapshot: "gpt-4o-2024-05-13", aliases: [], fineTunes: [] },
  { snapshot: "o1-2024-12-17", aliases: ["o1"], fineTunes: [] },
  { snapshot: "o1-pro-2025-03-19", aliases: ["o1-pro"], fineTunes: [] },
  { snapshot: "o3-mini-2025-01-31", aliases: ["o3-mini"], fineTunes: [] },
  { snapshot: "o4-mini-2025-04-16", aliases: ["o4-mini"], fineTunes: ["ft-o4-mini-2025-04-16"] },
  { snapshot: "ft-babbage-002", aliases: [], fineTunes: [] },
  { snapshot: "ft-davinci-002", aliases: [], fineTunes: [] },
  { snapshot: "gpt-image-1", aliases: [], fineTunes: [] },
];

export function openAiIdGroups(models: ModelRecord[]): IdGroup[] {
  const ids = new Set(models.map((model) => model.id));
  const used = new Set<string>();
  const groups: IdGroup[] = [];
  for (const group of OPENAI_OCT23_GROUPS) {
    const present = [group.snapshot, ...group.aliases, ...group.fineTunes].filter((id) => ids.has(id));
    if (!present.length) continue;
    for (const id of present) used.add(id);
    groups.push({
      snapshot: ids.has(group.snapshot) ? group.snapshot : present[0],
      aliases: group.aliases.filter((id) => ids.has(id) && id !== (ids.has(group.snapshot) ? group.snapshot : present[0])),
      fineTunes: group.fineTunes.filter((id) => ids.has(id)),
    });
  }
  for (const id of [...ids].sort((a, b) => a.localeCompare(b))) {
    if (!used.has(id)) groups.push({ snapshot: id, aliases: [], fineTunes: id.startsWith("ft-") ? [id] : [] });
  }
  return groups;
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
