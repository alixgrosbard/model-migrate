import type { ModelRecord, Provider } from "../schema.ts";
import type { FaqItem } from "./format.ts";
import { formatWhen, isUpcomingShutdown } from "./format.ts";
import { publicName } from "./growth.ts";
import { modelPath, replacePath, replacementLinkText } from "./hubs.ts";

export type StatusHubKind = "deprecated" | "retired";

export const DEPRECATED_PATH = "/deprecated/";
export const RETIRED_PATH = "/retired/";

export const STATUS_HUBS: { path: string; nav: string; kind: StatusHubKind }[] = [
  { path: DEPRECATED_PATH, nav: "Deprecated", kind: "deprecated" },
  { path: RETIRED_PATH, nav: "Retired", kind: "retired" },
];

const DESCRIPTIONS: Record<StatusHubKind, string> = {
  deprecated:
    "Every AI model with status deprecated, grouped by provider and sorted by shutdown date, with the model page and the replacement page.",
  retired:
    "Every AI model with status retired, grouped by provider and sorted by shutdown date, with the model page and the replacement page.",
};

export function statusHubPath(kind: StatusHubKind): string {
  return kind === "deprecated" ? DEPRECATED_PATH : RETIRED_PATH;
}

export function providerStatusPath(providerId: string, kind: StatusHubKind): string {
  return `/providers/${providerId}/${kind}/`;
}

export function providerStatusTargets(models: ModelRecord[]): { provider: string; status: StatusHubKind }[] {
  const seen = new Set<string>();
  const targets: { provider: string; status: StatusHubKind }[] = [];
  for (const model of models) {
    if (model.status !== "deprecated" && model.status !== "retired") continue;
    const key = `${model.provider}:${model.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ provider: model.provider, status: model.status });
  }
  return targets.sort((a, b) => a.provider.localeCompare(b.provider) || a.status.localeCompare(b.status));
}

export interface StatusRow {
  model: ModelRecord;
  name: string;
  modelHref: string;
  replaceHref: string;
  replacementText: string;
  when: string;
  sourceUrl: string;
  sourceChecked: string;
}

export interface StatusGroup {
  provider: Provider;
  path: string;
  rows: StatusRow[];
}

export interface StatusPage {
  kind: StatusHubKind;
  path: string;
  nav: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  version: string;
  day: string;
  count: number;
  groups: StatusGroup[];
  items: { name: string; path: string }[];
  faqs: FaqItem[];
  crumbs: { name: string; path: string }[];
  provider: Provider | null;
}

export function buildStatusHub(input: {
  kind: StatusHubKind;
  models: ModelRecord[];
  providers: Provider[];
  version: string;
  day: string;
  providerId?: string;
}): StatusPage {
  const kind = input.kind;
  const provider = input.providerId ? input.providers.find((item) => item.id === input.providerId) ?? null : null;
  if (input.providerId && !provider) throw new Error(`Missing provider ${input.providerId}`);
  const selected = input.models.filter((model) => model.status === kind && (!provider || model.provider === provider.id));
  const groups = groupModels(selected, input.providers, kind);
  const rows = groups.flatMap((group) => group.rows);
  const description = pageDescription(kind, provider);
  if (description.length < 40 || description.length > 160) {
    throw new Error(`Status page description length ${description.length} for ${provider?.id ?? kind}`);
  }
  const nav = kind === "deprecated" ? "Deprecated" : "Retired";
  const h1 = provider ? `${nav} ${provider.name} models` : `${nav} AI models`;
  const path = provider ? providerStatusPath(provider.id, kind) : statusHubPath(kind);
  const page: StatusPage = {
    kind,
    path,
    nav,
    h1,
    title: `${h1} | SunsetDiff`,
    description,
    intro: "",
    version: input.version,
    day: input.day,
    count: rows.length,
    groups,
    items: rows.map((row) => ({ name: `${providerName(input.providers, row.model.provider)}: ${row.name}`, path: row.modelHref })),
    faqs: [],
    crumbs: provider
      ? [
          { name: "Home", path: "/" },
          { name: "Providers", path: "/providers/" },
          { name: provider.name, path: `/providers/${provider.id}/` },
          { name: nav, path },
        ]
      : [
          { name: "Home", path: "/" },
          { name: nav, path },
        ],
    provider,
  };
  page.intro = statusIntro(page, selected);
  page.faqs = statusFaqs(page, selected, input.providers);
  assertPlain(page.intro);
  for (const faq of page.faqs) {
    assertPlain(faq.question);
    assertPlain(faq.answer);
  }
  assertPlain(page.title);
  assertPlain(page.description);
  return page;
}

export function statusLlmsEntries(models: ModelRecord[], providers: Provider[]): { title: string; path: string }[] {
  const entries: { title: string; path: string }[] = [
    { title: "Deprecated models", path: DEPRECATED_PATH },
    { title: "Retired models", path: RETIRED_PATH },
  ];
  for (const target of providerStatusTargets(models)) {
    const provider = providers.find((item) => item.id === target.provider);
    const label = target.status === "deprecated" ? "Deprecated" : "Retired";
    entries.push({
      title: `${label} ${provider?.name ?? target.provider} models`,
      path: providerStatusPath(target.provider, target.status),
    });
  }
  return entries;
}

function statusIntro(page: StatusPage, rows: ModelRecord[]): string {
  const label = page.kind;
  const scope = page.provider
    ? `${page.count} ${page.provider.name} model ${page.count === 1 ? "record has" : "records have"} status ${label}, sorted by shutdown date.`
    : `This page lists every model record with status ${label}: ${page.count} ${page.count === 1 ? "record" : "records"}, grouped by provider and sorted by shutdown date.`;
  const pastExact = rows.filter((model) => model.shutdown_date_kind === "exact" && model.shutdown_date != null && model.shutdown_date < page.day).length;
  const timing = page.kind === "deprecated"
    ? pastExact === 0
      ? `None of these records has an exact shutdown date before ${page.day}.`
      : `${pastExact} of these records ${pastExact === 1 ? "has" : "have"} an exact shutdown date before ${page.day}. The stored status is still deprecated.`
    : "The stored status is retired. The dataset records these models as already shut down.";
  const undated = rows.filter((model) => !model.shutdown_date || model.shutdown_date_kind === "none" || model.shutdown_date_kind === "via_snapshots").length;
  const dates = undated === 0
    ? "Every record on this page has a shutdown date."
    : `${undated} ${undated === 1 ? "record has" : "records have"} no published shutdown date.`;
  const source = page.provider
    ? `The official page is [${page.provider.deprecations_url}](${page.provider.deprecations_url}). The model page records the day that page was checked.`
    : "Each model page links the official source and the day it was checked.";
  const updated = page.version ? `Last updated ${page.version}, the dataset version (the newest changelog date).` : "";
  const more = page.provider
    ? `See [all ${label} models](${statusHubPath(page.kind)}).`
    : `The same records are in [models.json](/data/models.json) and [deprecations.csv](/data/deprecations.csv). See ${page.kind === "deprecated" ? "[retired models](/retired/)" : "[deprecated models](/deprecated/)"} too.`;
  const glossary = page.kind === "deprecated"
    ? "What deprecated means is on [Deprecated](/glossary/deprecated/)."
    : "What retired means is on [Retired](/glossary/retired/).";
  return [scope, timing, dates, "Each row links the model page and the replacement page.", source, updated, more, glossary].filter(Boolean).join(" ");
}

function statusFaqs(page: StatusPage, rows: ModelRecord[], providers: Provider[]): FaqItem[] {
  const label = page.kind;
  const faqs: FaqItem[] = [
    {
      question: page.provider ? `How many ${page.provider.name} models are ${label}?` : `How many AI models are ${label}?`,
      answer: countAnswer(page, rows, providers),
    },
  ];
  if (!page.provider) {
    faqs.push({
      question: `Which provider has the most ${label} models?`,
      answer: leaderAnswer(page, rows, providers),
    });
  }
  if (page.kind === "deprecated") {
    faqs.push({
      question: page.provider
        ? `What is the soonest shutdown date among deprecated ${page.provider.name} models?`
        : "What is the soonest shutdown date among deprecated models?",
      answer: soonestAnswer(page, rows, providers),
    });
  } else {
    faqs.push({
      question: page.provider
        ? `What is the latest shutdown date among retired ${page.provider.name} models?`
        : "What is the latest shutdown date among retired models?",
      answer: latestAnswer(rows, providers),
    });
    faqs.push({
      question: page.provider
        ? `How many retired ${page.provider.name} models list a replacement?`
        : "How many retired models list a replacement?",
      answer: replacementAnswer(rows),
    });
  }
  if (page.kind === "deprecated") {
    const undated = rows.filter((model) => !model.shutdown_date || model.shutdown_date_kind === "none" || model.shutdown_date_kind === "via_snapshots").length;
    faqs.push({
      question: page.provider
        ? `How many deprecated ${page.provider.name} models have no published shutdown date?`
        : "How many deprecated models have no published shutdown date?",
      answer: undated === 0
        ? "Every deprecated model record on this page has a shutdown date."
        : `${undated} deprecated model ${undated === 1 ? "record has" : "records have"} no published shutdown date.`,
    });
  }
  faqs.push({
    question: page.provider
      ? `Where does SunsetDiff read the dates for ${label} ${page.provider.name} models?`
      : "Where do these dates come from?",
    answer: sourceAnswer(page),
  });
  return faqs;
}

function countAnswer(page: StatusPage, rows: ModelRecord[], providers: Provider[]): string {
  if (!rows.length) return `0 model records have status ${page.kind}.`;
  if (page.provider) {
    return `${rows.length} ${page.provider.name} model ${rows.length === 1 ? "record has" : "records have"} status ${page.kind}.`;
  }
  const parts = providerCounts(rows, providers).map((row) => `${row.provider.name} ${row.count}`);
  return `${rows.length} model records have status ${page.kind}. By provider: ${parts.join(", ")}.`;
}

function leaderAnswer(page: StatusPage, rows: ModelRecord[], providers: Provider[]): string {
  const ranked = providerCounts(rows, providers);
  if (!ranked.length) return `No provider has a ${page.kind} model record.`;
  const top = ranked.filter((row) => row.count === ranked[0].count);
  const links = top.map((row) => `[${row.provider.name}](${providerStatusPath(row.provider.id, page.kind)})`);
  const names = joinNames(links);
  const noun = top[0].count === 1 ? "model record" : "model records";
  if (top.length === 1) return `${names} has ${top[0].count} ${page.kind} ${noun}, the most on this page.`;
  return `${names} each have ${top[0].count} ${page.kind} model records, the most on this page.`;
}

function soonestAnswer(page: StatusPage, rows: ModelRecord[], providers: Provider[]): string {
  const upcoming = rows.filter((model) => isUpcomingShutdown(model, page.day));
  if (!upcoming.length) {
    return `No ${page.kind} model has an exact shutdown date or a shutdown month on or after ${page.day}.`;
  }
  upcoming.sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const first = upcoming[0];
  const same = upcoming.filter((model) => model.shutdown_date === first.shutdown_date);
  const link = `[${linkLabel(first)}](${modelPath(first)}) (${providerName(providers, first.provider)})`;
  const when = formatWhen(first);
  if (same.length === 1) return `The soonest shutdown date on or after ${page.day} is ${when}. That date is on ${link}.`;
  return `The soonest shutdown date on or after ${page.day} is ${when}. ${same.length} ${page.kind} model records share that date, including ${link}.`;
}

function latestAnswer(rows: ModelRecord[], providers: Provider[]): string {
  const dated = rows.filter((model) => model.shutdown_date && model.shutdown_date_kind !== "none");
  if (!dated.length) return "No retired model record on this page has a shutdown date.";
  dated.sort((a, b) => (b.shutdown_date ?? "").localeCompare(a.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const first = dated[0];
  const same = dated.filter((model) => model.shutdown_date === first.shutdown_date);
  const link = `[${linkLabel(first)}](${modelPath(first)}) (${providerName(providers, first.provider)})`;
  const when = formatWhen(first);
  if (same.length === 1) return `The latest shutdown date on a retired model record is ${when}. That date is on ${link}.`;
  return `The latest shutdown date on a retired model record is ${when}. ${same.length} retired model records share that date, including ${link}.`;
}

function replacementAnswer(rows: ModelRecord[]): string {
  const listed = rows.filter((model) => model.replacements.length > 0).length;
  if (!rows.length) return "No model records have status retired.";
  return `${listed} of ${rows.length} retired model ${rows.length === 1 ? "record lists" : "records list"} a replacement. The table links each replacement page.`;
}

function sourceAnswer(page: StatusPage): string {
  const version = page.version ? ` Dataset version ${page.version}.` : "";
  if (page.provider) {
    return `The official page is [${page.provider.deprecations_url}](${page.provider.deprecations_url}). Each model page records the day that page was checked.${version}`;
  }
  return `Each model page links the official provider page and the day it was checked. Provider pages are listed at [Providers](/providers/). The records are in [models.json](/data/models.json).${version}`;
}

function providerCounts(rows: ModelRecord[], providers: Provider[]): { provider: Provider; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.provider, (counts.get(row.provider) ?? 0) + 1);
  return providers
    .map((provider) => ({ provider, count: counts.get(provider.id) ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.provider.name.localeCompare(b.provider.name));
}

function groupModels(models: ModelRecord[], providers: Provider[], kind: StatusHubKind): StatusGroup[] {
  const groups: StatusGroup[] = [];
  for (const provider of providers) {
    const rows = models
      .filter((model) => model.provider === provider.id)
      .sort((a, b) => shutdownKey(a).localeCompare(shutdownKey(b)) || a.id.localeCompare(b.id))
      .map((model) => toRow(model));
    if (!rows.length) continue;
    groups.push({ provider, path: providerStatusPath(provider.id, kind), rows });
  }
  groups.sort((a, b) => shutdownKey(a.rows[0].model).localeCompare(shutdownKey(b.rows[0].model)) || a.provider.name.localeCompare(b.provider.name));
  return groups;
}

function toRow(model: ModelRecord): StatusRow {
  const source = model.sources[0];
  return {
    model,
    name: publicName(model),
    modelHref: modelPath(model),
    replaceHref: replacePath(model),
    replacementText: replacementLinkText(model),
    when: formatWhen(model),
    sourceUrl: source.url,
    sourceChecked: source.last_checked,
  };
}

function shutdownKey(model: ModelRecord): string {
  if (!model.shutdown_date || model.shutdown_date_kind === "none") return "9999-99-99";
  return model.shutdown_date;
}

function pageDescription(kind: StatusHubKind, provider: Provider | null): string {
  if (!provider) return DESCRIPTIONS[kind];
  const nav = kind === "deprecated" ? "Deprecated" : "Retired";
  return `${nav} ${provider.name} models, sorted by shutdown date, with links to each model page and replacement page.`;
}

function providerName(providers: Provider[], id: string): string {
  return providers.find((provider) => provider.id === id)?.name ?? id;
}

function linkLabel(model: ModelRecord): string {
  const name = publicName(model);
  if (name.includes("[") || name.includes("]")) return model.id;
  return name;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function assertPlain(text: string): void {
  if (/[—–]/.test(text)) throw new Error(`Em dash in status copy: ${text}`);
}
