import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { formatWhen, isUpcomingShutdown, type FaqItem } from "./format.ts";
import { monthLabel, publicName } from "./growth.ts";
import { longDate, replacementLinks, type ReplacementLink } from "./shutdowns.ts";

export const UPCOMING_PATH = "/upcoming/";
export const TIMELINE_PATH = "/timeline/";
export const CHANGELOG_PATH = "/changelog/";
export const FAQ_PATH = "/faq/";
export const PLATFORM_GUIDE_PATH = "/guides/why-shutdown-dates-differ-by-platform/";

const PLATFORM_FAQ_LIMIT = 12;

export function yearPath(year: string): string {
  return `/${year}/`;
}

export function monthPath(year: string, month: string): string {
  return `/${year}/${month}/`;
}

export function monthKeyPath(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return monthPath(year, month);
}

/** Exact dates and published shutdown months. "Not sooner than" is a floor, so it is not a shutdown. */
export function datedShutdowns(models: ModelRecord[]): ModelRecord[] {
  const groups = new Map<string, ModelRecord>();
  for (const model of models) {
    if (!model.shutdown_date) continue;
    if (model.shutdown_date_kind !== "exact" && model.shutdown_date_kind !== "month_only") continue;
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
  return [...groups.values()].sort(compareShutdown);
}

export function upcomingShutdowns(models: ModelRecord[], day: string): ModelRecord[] {
  return datedShutdowns(models).filter((model) => isUpcomingShutdown(model, day));
}

export function shutdownsInYear(models: ModelRecord[], year: string): ModelRecord[] {
  return datedShutdowns(models).filter((model) => model.shutdown_date!.slice(0, 4) === year);
}

export function shutdownsInMonth(models: ModelRecord[], monthKey: string): ModelRecord[] {
  return datedShutdowns(models).filter((model) => model.shutdown_date!.slice(0, 7) === monthKey);
}

export function shutdownYearList(models: ModelRecord[]): string[] {
  return [...new Set(datedShutdowns(models).map((model) => model.shutdown_date!.slice(0, 4)))].sort();
}

export function shutdownMonthList(models: ModelRecord[]): string[] {
  return [...new Set(datedShutdowns(models).map((model) => model.shutdown_date!.slice(0, 7)))].filter((month) => /^\d{4}-\d{2}$/.test(month)).sort();
}

export interface PlatformPeer {
  providerId: string;
  providerName: string;
  path: string;
  detail: string;
  sentence: string;
  differs: boolean;
}

export interface SwitchLink {
  href: string;
  label: string;
}

export interface ScheduleRow {
  model: ModelRecord;
  providerName: string;
  modelLabel: string;
  modelPath: string;
  replacePath: string;
  when: string;
  peers: PlatformPeer[];
  replacements: ReplacementLink[];
  switchLinks: SwitchLink[];
  sourceUrl: string | null;
  sourceChecked: string | null;
}

export function toScheduleRows(
  selected: ModelRecord[],
  all: ModelRecord[],
  providers: Provider[],
  migrations: MigrationRecord[],
  day: string,
): ScheduleRow[] {
  return selected.map((model) => {
    const links = replacementLinks(model, all, migrations);
    const migrationsForRow = links.filter((link) => link.migratePath);
    const switchLinks: SwitchLink[] = migrationsForRow.length
      ? migrationsForRow.map((link) => ({ href: link.migratePath!, label: `Switch guide: ${link.id}` }))
      : [{ href: `/replace/${model.provider}/${model.slug}/`, label: "Switch guide" }];
    const source = model.sources[0];
    return {
      model,
      providerName: providerName(providers, model.provider),
      modelLabel: publicName(model),
      modelPath: `/models/${model.provider}/${model.slug}/`,
      replacePath: `/replace/${model.provider}/${model.slug}/`,
      when: formatWhen(model),
      peers: platformPeers(model, all, providers, day),
      replacements: links,
      switchLinks,
      sourceUrl: source?.url ?? null,
      sourceChecked: source?.last_checked ?? null,
    };
  });
}

export interface MonthGroup {
  key: string;
  label: string;
  path: string;
  rows: ScheduleRow[];
}

export function groupRowsByMonth(rows: ScheduleRow[]): MonthGroup[] {
  const map = new Map<string, ScheduleRow[]>();
  for (const row of rows) {
    const key = row.model.shutdown_date!.slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.keys()].sort().map((key) => ({
    key,
    label: monthLabel(key),
    path: monthKeyPath(key),
    rows: map.get(key)!,
  }));
}

export interface ProviderCount {
  id: string;
  name: string;
  count: number;
}

export function providerCounts(rows: ScheduleRow[], providers: Provider[]): ProviderCount[] {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    count: rows.filter((row) => row.model.provider === provider.id).length,
  }));
}

/** One factual sentence. `scope` is a phrase such as "in January 2027". */
export function periodIntro(rows: ScheduleRow[], providers: Provider[], scope: string): string {
  const counts = providerCounts(rows, providers).filter((item) => item.count > 0);
  const total = rows.length;
  const lead = total === 1
    ? `1 model has a published shutdown date ${scope}`
    : `${total} models have a published shutdown date ${scope}`;
  const breakdown = counts.map((item) => `${item.name} ${item.count}`).join(", ");
  const who = breakdown ? ` (${breakdown})` : "";
  return `${lead}${who}. These are exact dates or a published shutdown month. A date that only says not sooner than is a floor and is not counted.`;
}

export function periodFaqs(rows: ScheduleRow[], providers: Provider[], scope: string, day: string): FaqItem[] {
  const total = rows.length;
  const counts = providerCounts(rows, providers);
  const named = counts.filter((item) => item.count > 0).map((item) => item.name);
  const items: FaqItem[] = [
    {
      question: `How many AI models shut down ${scope}?`,
      answer: `${modelsHave(total)} a published shutdown date ${scope}.`,
    },
  ];
  for (const provider of counts) {
    items.push({
      question: `How many ${provider.name} models shut down ${scope}?`,
      answer: `${namedHave(provider.count, provider.name)} a published shutdown date ${scope}.`,
    });
  }
  items.push({
    question: `Which providers shut down a model ${scope}?`,
    answer: named.length
      ? `${joinAnd(named)} ${named.length === 1 ? "has" : "have"} a published shutdown date ${scope}.`
      : `No provider in this dataset has a published shutdown date ${scope}.`,
  });
  const earliest = rows[0];
  const latest = rows[rows.length - 1];
  if (earliest && latest) {
    items.push({
      question: `What is the earliest published shutdown date ${scope}?`,
      answer: edgeAnswer("earliest", scope, earliest, rows),
    });
    items.push({
      question: `What is the latest published shutdown date ${scope}?`,
      answer: edgeAnswer("latest", scope, latest, rows),
    });
  }
  items.push(...platformFaqs(rows, day));
  return items;
}

export function upcomingScope(day: string): string {
  return `on or after ${longDate(day)}`;
}

export function yearScope(year: string): string {
  return `in ${year}`;
}

export function monthScope(monthKey: string): string {
  return `in ${monthLabel(monthKey)}`;
}

export function listItems(rows: ScheduleRow[]): { name: string; path: string }[] {
  return rows.map((row) => ({
    name: `${row.providerName} ${row.model.id} (${row.when})`,
    path: row.modelPath,
  }));
}

export function newestUpdated(models: ModelRecord[]): string {
  let newest = "";
  for (const model of models) {
    const day = model.updated_at.slice(0, 10);
    if (day > newest) newest = day;
  }
  return newest;
}

export function scheduleIndexLinks(models: ModelRecord[]): { title: string; path: string }[] {
  const links = [
    { title: "Upcoming shutdowns", path: UPCOMING_PATH },
    { title: "Shutdown timeline", path: TIMELINE_PATH },
    { title: "Deprecation changelog", path: CHANGELOG_PATH },
    { title: "Shutdown questions", path: FAQ_PATH },
  ];
  for (const year of shutdownYearList(models)) {
    links.push({ title: `AI model shutdowns in ${year}`, path: yearPath(year) });
  }
  for (const month of shutdownMonthList(models)) {
    links.push({ title: `AI model shutdowns in ${monthLabel(month)}`, path: monthKeyPath(month) });
  }
  return links;
}

function peerDetail(model: ModelRecord, day: string): string {
  if (!model.shutdown_date || model.shutdown_date_kind === "none") return "no published shutdown date";
  if (model.shutdown_date_kind === "not_before") return `not sooner than ${model.shutdown_date}`;
  if (model.shutdown_date_kind === "month_only") return `shutdown month ${model.shutdown_date.slice(0, 7)}`;
  if (model.shutdown_date < day) return `shut down on ${model.shutdown_date}`;
  return `shuts down on ${model.shutdown_date}`;
}

export function shutdownFact(providerNameText: string, model: ModelRecord, day: string): string {
  const id = model.id;
  if (!model.shutdown_date || model.shutdown_date_kind === "none") {
    return `On ${providerNameText}, ${id} has no published shutdown date.`;
  }
  if (model.shutdown_date_kind === "not_before") {
    return `On ${providerNameText}, ${id} is not scheduled to shut down sooner than ${model.shutdown_date}.`;
  }
  if (model.shutdown_date_kind === "month_only") {
    return `On ${providerNameText}, ${id} has a published shutdown month of ${model.shutdown_date.slice(0, 7)}.`;
  }
  if (model.shutdown_date < day) return `On ${providerNameText}, ${id} shut down on ${model.shutdown_date}.`;
  return `On ${providerNameText}, ${id} shuts down on ${model.shutdown_date}.`;
}

function platformPeers(model: ModelRecord, all: ModelRecord[], providers: Provider[], day: string): PlatformPeer[] {
  const byFact = new Map<string, ModelRecord>();
  for (const other of all) {
    if (other.id !== model.id || other.provider === model.provider) continue;
    const key = `${other.provider}|${other.shutdown_date ?? ""}|${other.shutdown_date_kind}`;
    const previous = byFact.get(key);
    if (!previous || other.slug.length < previous.slug.length) byFact.set(key, other);
  }
  return [...byFact.values()]
    .sort((a, b) => a.provider.localeCompare(b.provider) || (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? ""))
    .map((other) => {
      const name = providerName(providers, other.provider);
      return {
        providerId: other.provider,
        providerName: name,
        path: `/models/${other.provider}/${other.slug}/`,
        detail: peerDetail(other, day),
        sentence: shutdownFact(name, other, day),
        differs: other.shutdown_date !== model.shutdown_date || other.shutdown_date_kind !== model.shutdown_date_kind,
      };
    });
}

function platformFaqs(rows: ScheduleRow[], day: string): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();
  const sorted = [...rows].sort((a, b) => a.model.id.localeCompare(b.model.id) || a.providerName.localeCompare(b.providerName));
  for (const row of sorted) {
    if (seen.has(row.model.id)) continue;
    const differing = row.peers.filter((peer) => peer.differs);
    if (!differing.length) continue;
    seen.add(row.model.id);
    const names = uniqueNames([row.providerName, ...row.peers.map((peer) => peer.providerName)]);
    const question = names.length === 2
      ? `Does ${row.model.id} shut down on the same date on ${names[0]} and ${names[1]}?`
      : `Does ${row.model.id} shut down on the same date on every platform in this dataset?`;
    const facts = [shutdownFact(row.providerName, row.model, day), ...row.peers.map((peer) => peer.sentence)];
    items.push({ question, answer: `No. ${facts.join(" ")}` });
    if (items.length >= PLATFORM_FAQ_LIMIT) break;
  }
  return items;
}

function edgeAnswer(which: "earliest" | "latest", scope: string, edge: ScheduleRow, rows: ScheduleRow[]): string {
  const same = rows.filter((row) => row.model.shutdown_date === edge.model.shutdown_date && row.model.shutdown_date_kind === edge.model.shutdown_date_kind);
  const when = edge.model.shutdown_date_kind === "month_only" ? `during ${edge.model.shutdown_date!.slice(0, 7)}` : edge.model.shutdown_date!;
  const share = same.length === 1 ? "1 model has that date." : `${same.length} models share that date.`;
  return `The ${which} published shutdown ${scope} is ${when}. ${share}`;
}

function modelsHave(count: number): string {
  if (count === 0) return "No model has";
  if (count === 1) return "1 model has";
  return `${count} models have`;
}

function namedHave(count: number, name: string): string {
  if (count === 0) return `No ${name} model has`;
  if (count === 1) return `1 ${name} model has`;
  return `${count} ${name} models have`;
}

function uniqueNames(names: string[]): string[] {
  const list: string[] = [];
  for (const name of names) if (!list.includes(name)) list.push(name);
  return list;
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function officialIds(model: ModelRecord): string[] {
  const ids: string[] = [];
  for (const replacement of model.replacements) {
    if (replacement.kind !== "official") continue;
    if (!ids.includes(replacement.model_id)) ids.push(replacement.model_id);
  }
  return ids;
}

function providerName(providers: Provider[], id: string): string {
  return providers.find((provider) => provider.id === id)?.name ?? id;
}

function compareShutdown(a: ModelRecord, b: ModelRecord): number {
  return (
    (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") ||
    a.provider.localeCompare(b.provider) ||
    a.id.localeCompare(b.id) ||
    a.slug.localeCompare(b.slug)
  );
}
