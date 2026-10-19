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
  return bedrockHeadline(providerName, event, day) ?? batchExtras(event).headline ?? shutdownEventTitle(providerName, event, day);
}

export function batchDescription(providerName: string, event: ShutdownEvent, day: string): string {
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
  return shutdownEventDescription(providerName, event, day);
}

/** Bedrock dates on these pages are not worldwide. The headline says so. */
function bedrockHeadline(providerName: string, event: ShutdownEvent, day: string): string | null {
  if (event.provider !== "aws-bedrock") return null;
  if (event.date === "2026-11-13") return "Bedrock Claude 3, 3.5 and 3.7 End of Life: Nov 13, 2026 in some Regions";
  const when = longDate(event.date);
  if (isPastShutdown(event.date, day)) return `${providerName} models shut down on ${when} in some Regions`;
  return `${providerName} models shutting down ${when} in some Regions`;
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
  if (isModelIdBatch(event)) return openAiShortAnswer(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") return bedrockShortAnswer(day);
  return batchExtras(event).lead ?? shutdownEventLead(providerName, event, day);
}

export function batchChecklist(event: ShutdownEvent, day: string): string[] {
  const steps = shutdownEventChecklist(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13" && !isPastShutdown(event.date, day)) {
    steps[0] = "Find every request that still uses these model ids before November 13, 2026 in some Regions.";
  }
  return steps;
}

export function batchFaqs(providerName: string, event: ShutdownEvent, day: string): FaqItem[] {
  const extras = batchExtras(event);
  if (isModelIdBatch(event)) return openAiOct23Faqs(event, day);
  if (event.provider === "aws-bedrock" && event.date === "2026-11-13") return bedrockNov13Faqs(day);
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
  if (event.provider === "aws-bedrock") return { ...EMPTY_EXTRAS, showRegions: true };
  return EMPTY_EXTRAS;
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
