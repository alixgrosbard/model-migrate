import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";
import { GEMINI_25_ACCESS_CHECKED, GEMINI_25_ACCESS_SOURCE, gemini25Restricted } from "./access.ts";
import { aliasLead, aliasReplacementSentence, aliasSnapshotView } from "./aliases.ts";
import { disagreementNote } from "./conflicts.ts";

export interface FaqItem {
  question: string;
  answer: string;
}

/** A display name that is only punctuation, such as "| (gpt-4)", falls back to the model id. */
export function visibleName(model: { display_name: string; id: string }): string {
  const name = model.display_name.trim();
  if (/^[A-Za-z0-9]/.test(name)) return name;
  return model.id;
}

export function isUpcomingShutdown(model: ModelRecord, day: string): boolean {
  if (!model.shutdown_date || model.shutdown_date_kind === "none" || model.shutdown_date_kind === "not_before") return false;
  if (model.shutdown_date_kind === "month_only") return model.shutdown_date.slice(0, 7) >= day.slice(0, 7);
  return model.shutdown_date >= day;
}

const AUTO_ROUTE_NOTE = /requests auto-routed to ([A-Za-z0-9][A-Za-z0-9._:/-]*)/i;

/** Id from a parser note such as "requests auto-routed to gemini-3.8-flash". */
export function autoRoutedReplacementId(model: { region_or_platform_notes?: string | null }): string | null {
  const match = model.region_or_platform_notes?.match(AUTO_ROUTE_NOTE);
  return match?.[1] ?? null;
}

/** Badge and status line for an endpoint that stays up and silently routes. Null for every other model. */
export function autoRouteStatusText(model: { region_or_platform_notes?: string | null }): string | null {
  const id = autoRoutedReplacementId(model);
  if (!id) return null;
  return `deprecated, requests auto-routed to ${id}, no shutdown date`;
}

export function formatWhen(model: ModelRecord): string {
  if (!model.shutdown_date || model.shutdown_date_kind === "none") return "Not published";
  if (model.shutdown_date_kind === "not_before") return `Not sooner than ${model.shutdown_date}`;
  if (model.shutdown_date_kind === "month_only") return `During ${model.shutdown_date.slice(0, 7)}`;
  return model.shutdown_date;
}

export function shutdownSentence(model: ModelRecord, provider: Provider): string {
  const checked = model.sources[0]?.last_checked ?? "unknown";
  let when: string;
  if (model.shutdown_date_kind === "not_before" && model.shutdown_date) {
    when = `is not scheduled to shut down sooner than ${model.shutdown_date}`;
  } else if (model.shutdown_date_kind === "month_only" && model.shutdown_date) {
    when = `has a published shutdown month of ${model.shutdown_date.slice(0, 7)}`;
  } else if (model.status === "retired" && model.shutdown_date) {
    when = `shut down on ${model.shutdown_date}`;
  } else if (model.shutdown_date) {
    when = `shuts down on ${model.shutdown_date}`;
  } else if (autoRoutedReplacementId(model)) {
    when = `is deprecated with no shutdown date, and the deprecations page says the endpoint is not shutting down and automatically routes API requests to ${autoRoutedReplacementId(model)}`;
  } else {
    when = "does not have a published shutdown date";
  }
  const name = visibleName(model);
  const labeled = name === model.id || name.includes(model.id) ? name : `${name} (${model.id})`;
  return `${labeled} ${when} per ${provider.name}'s deprecation page (checked ${checked}).`;
}

const TRANSCRIPTION_OR = new Set([
  "whisper-1",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe-diarize",
]);

export function replacementSentence(model: ModelRecord): string {
  if (model.provider === "openai" && TRANSCRIPTION_OR.has(model.id)) {
    const ids = model.replacements.filter((item) => item.kind === "official").map((item) => item.model_id);
    if (ids.includes("gpt-live-transcribe") && ids.includes("gpt-transcribe")) {
      return "The official replacements are gpt-live-transcribe or gpt-transcribe.";
    }
  }
  const replacement = officialReplacement(model);
  return replacement
    ? `The official replacement is ${replacement.model_id}.`
    : "No official replacement is published on that page.";
}

export function keyChangeSentence(model: ModelRecord, migration?: MigrationRecord | null): string {
  const oldCost = migration?.price_diff.example_monthly_cost_old;
  const newCost = migration?.price_diff.example_monthly_cost_new;
  const target = migration?.to.model_id;
  if (oldCost != null && newCost != null && target) {
    const direction = newCost < oldCost ? "lower" : newCost > oldCost ? "higher" : "the same";
    const compared = direction === "the same" ? "the same as" : `${direction} than`;
    return `On the labeled example of 10 million input tokens and 2 million output tokens, ${target} costs $${newCost} a month, ${compared} $${oldCost} for ${model.id}.`;
  }
  const oldTokens = migration?.context_diff.old_tokens;
  const newTokens = migration?.context_diff.new_tokens;
  if (oldTokens != null && newTokens != null && target) {
    return `The published context window changes from ${oldTokens.toLocaleString("en-US")} tokens on ${model.id} to ${newTokens.toLocaleString("en-US")} tokens on ${target}.`;
  }
  const bits = [
    model.specs.input_price_per_mtok != null ? `input price $${model.specs.input_price_per_mtok} per million tokens` : "",
    model.specs.context_window_tokens != null ? `context window ${model.specs.context_window_tokens.toLocaleString("en-US")} tokens` : "",
    model.specs.max_output_tokens != null ? `max output ${model.specs.max_output_tokens.toLocaleString("en-US")} tokens` : "",
  ].filter(Boolean);
  if (bits.length) return `Published on the official docs: ${bits.join(", ")}.`;
  return "Price, context window, and max output were left blank because the official pages we checked did not publish them.";
}

export function answerSentence(
  model: ModelRecord,
  provider: Provider,
  migration?: MigrationRecord | null,
  catalog?: ModelRecord[],
): string {
  const alias = catalog?.length ? aliasSnapshotView(model, catalog) : null;
  if (alias) return aliasLead(alias);
  return `${shutdownSentence(model, provider)} ${replacementSentence(model)} ${keyChangeSentence(model, migration)}`;
}

export function replacementAnswer(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): string {
  return `${replacementSentence(model)} ${shutdownSentence(model, provider)} ${keyChangeSentence(model, migration)}`;
}

export function modelFaqs(
  model: ModelRecord,
  provider: Provider,
  migration?: MigrationRecord | null,
  catalog?: ModelRecord[],
): FaqItem[] {
  const alias = catalog?.length ? aliasSnapshotView(model, catalog) : null;
  if (alias) {
    const name = visibleName(model);
    return [
      { question: `When is ${name} shut down?`, answer: aliasLead(alias) },
      { question: `What replaces ${name}?`, answer: aliasReplacementSentence(alias) },
      {
        question: `Is ${name} deprecated?`,
        answer: `${name} is not listed by name on the deprecations page (checked ${alias.checked}). The dated snapshots behind it are. This record keeps status ${model.status} and does not copy a snapshot shutdown date onto the alias.`,
      },
    ];
  }
  const shutdown = answerSentence(model, provider, migration, catalog);
  const conflict = disagreementNote(model.region_or_platform_notes);
  return [
    {
      question: `When is ${visibleName(model)} shut down?`,
      answer: conflict ? `${shutdown} ${conflict.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+|\/[^)\s]*)\)/g, "$1 ($2)")}` : shutdown,
    },
    { question: `What replaces ${visibleName(model)}?`, answer: replacementSentence(model) },
    {
      question: `Is ${visibleName(model)} deprecated?`,
      answer: gemini25Restricted(model)
        ? `${visibleName(model)} status is ${model.status}. Google's deprecations page says these models are not deprecated, and limits access to users who have actively used the 2.5 models in the past. Source: ${GEMINI_25_ACCESS_SOURCE}, checked ${GEMINI_25_ACCESS_CHECKED}.`
        : `${visibleName(model)} status is ${model.status}.`,
    },
  ];
}

export function replaceFaqs(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): FaqItem[] {
  const target = migration?.to.model_id ?? officialReplacement(model)?.model_id;
  return [
    { question: `What is the replacement for ${visibleName(model)}?`, answer: replacementAnswer(model, provider, migration) },
    {
      question: target ? `Is ${target} cheaper than ${model.id}?` : `Is the replacement cheaper than ${model.id}?`,
      answer: cheaperAnswer(migration),
    },
    {
      question: target ? `Does ${target} have a bigger context window than ${model.id}?` : `Does the replacement have a bigger context window than ${model.id}?`,
      answer: contextAnswer(migration),
    },
  ];
}

export function cheaperAnswer(migration?: MigrationRecord | null): string {
  if (!migration) return "Price comparison is not published yet.";
  const oldCost = migration.price_diff.example_monthly_cost_old;
  const newCost = migration.price_diff.example_monthly_cost_new;
  if (oldCost == null || newCost == null) return "A full price comparison is not published. One or both prices are missing from the official pages we checked.";
  if (newCost < oldCost) return `Yes. The labeled example monthly cost is $${oldCost} for the old model and $${newCost} for the replacement.`;
  if (newCost > oldCost) return `No. The labeled example monthly cost is $${oldCost} for the old model and $${newCost} for the replacement.`;
  return `The labeled example monthly cost is the same: $${oldCost}.`;
}

export function contextAnswer(migration?: MigrationRecord | null): string {
  const oldTokens = migration?.context_diff.old_tokens;
  const newTokens = migration?.context_diff.new_tokens;
  if (oldTokens == null || newTokens == null) return "Context window sizes are not both published on the official pages we checked.";
  if (newTokens > oldTokens) return `Yes. The context window changes from ${oldTokens.toLocaleString("en-US")} to ${newTokens.toLocaleString("en-US")} tokens.`;
  if (newTokens < oldTokens) return `No. The context window changes from ${oldTokens.toLocaleString("en-US")} to ${newTokens.toLocaleString("en-US")} tokens.`;
  return `The context window stays ${oldTokens.toLocaleString("en-US")} tokens.`;
}

/** Add the provider, or the slug, only when another record uses the same display name. */
export function uniqueVisibleName(model: ModelRecord, catalog: ModelRecord[] | undefined, providerName?: string): string {
  const name = visibleName(model);
  if (!catalog?.length) return name;
  const peers = catalog.filter((item) => (item.provider !== model.provider || item.slug !== model.slug) && visibleName(item) === name);
  if (!peers.length) return name;
  if (peers.some((item) => item.provider === model.provider)) return `${name} (${model.slug})`;
  return `${name} (${providerName || model.provider})`;
}

export function modelTitle(model: ModelRecord, catalog?: ModelRecord[], providerName?: string): string {
  const alias = catalog?.length ? aliasSnapshotView(model, catalog) : null;
  const name = uniqueVisibleName(model, catalog, providerName);
  if (alias) return `${name} snapshots retire ${alias.badgeDate} | SunsetDiff`;
  const when = formatWhen(model);
  if (when === "Not published") return `${name} shutdown status | SunsetDiff`;
  return `${name} shuts down ${when} | SunsetDiff`;
}

export function replacePageTitle(model: ModelRecord, catalog: ModelRecord[] | undefined, providerName: string): string {
  return `Replacement for ${uniqueVisibleName(model, catalog, providerName)}: price, context, and code | SunsetDiff`;
}

export function migratePageTitle(
  from: ModelRecord,
  to: ModelRecord,
  catalog: ModelRecord[] | undefined,
  fromProvider: string,
  toProvider: string,
): string {
  return `${uniqueVisibleName(from, catalog, fromProvider)} to ${uniqueVisibleName(to, catalog, toProvider)}: price, context, and code | SunsetDiff`;
}

export function questionPageTitle(
  model: ModelRecord,
  kind: "deprecated" | "shutdown-date",
  catalog: ModelRecord[] | undefined,
  providerName: string,
): string {
  const name = uniqueVisibleName(model, catalog, providerName);
  const title = kind === "deprecated" ? `Is ${name} being deprecated?` : `${name} shutdown date`;
  return `${title} | SunsetDiff`;
}

export function clipMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Keep the visible answer, and put the page name first when the clipped text would hide it. */
export function metaDescription(name: string, answer: string): string {
  const clipped = clipMeta(answer);
  if (clipped.includes(name)) return clipped;
  return clipMeta(`${name}. ${answer}`);
}

export function officialReplacement(model: ModelRecord) {
  return model.replacements.find((item) => item.kind === "official") ?? model.replacements[0];
}

function lineScore(id: string, other: string): number {
  const stem = (value: string) => value.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const a = stem(id);
  const b = stem(other);
  if (a === b) return 80;
  if (a.startsWith(`${b}-`) || b.startsWith(`${a}-`)) return 70;
  let index = 0;
  const limit = Math.min(a.length, b.length);
  while (index < limit && a[index] === b[index]) index += 1;
  const cut = a.slice(0, index).lastIndexOf("-");
  return cut >= 6 ? 30 : 0;
}

/** Same provider, preferring the same model line and named replacements over unrelated early shutdowns. */
export function relatedModels(model: ModelRecord, models: ModelRecord[]): ModelRecord[] {
  const others = models.filter((item) => item.provider === model.provider && item.id !== model.id);
  const scored = others.map((item) => {
    let score = lineScore(model.id, item.id);
    if (model.family && item.family === model.family) score += 100;
    if (model.replacements.some((link) => link.provider === item.provider && link.model_id === item.id)) score += 40;
    if (item.replacements.some((link) => link.provider === model.provider && link.model_id === model.id)) score += 35;
    return { item, score };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const byDate = (a.item.shutdown_date ?? "9999-99-99").localeCompare(b.item.shutdown_date ?? "9999-99-99");
    if (byDate !== 0) return byDate;
    return a.item.id.localeCompare(b.item.id);
  });
  const picked = scored.filter((row) => row.score > 0).slice(0, 8).map((row) => row.item);
  if (picked.length >= 4) return picked;
  const seen = new Set(picked.map((item) => item.slug));
  for (const row of scored) {
    if (picked.length >= 6) break;
    if (seen.has(row.item.slug)) continue;
    picked.push(row.item);
    seen.add(row.item.slug);
  }
  return picked;
}

export function money(value: number | null): string {
  if (value == null) return "Not published";
  return `$${value}`;
}

export function tokens(value: number | null): string {
  if (value == null) return "Not published";
  return value.toLocaleString("en-US");
}

export function pct(value: number | null): string {
  if (value == null) return "Not published";
  const direction = value > 0 ? "higher" : value < 0 ? "lower" : "same";
  return `${value > 0 ? "+" : ""}${value}% (${direction})`;
}

export function isSoon(model: ModelRecord, today: string, days: number): boolean {
  if (!model.shutdown_date) return false;
  if (model.shutdown_date_kind === "none" || model.shutdown_date_kind === "not_before") return false;
  const end = addDays(today, days);
  if (model.shutdown_date_kind === "month_only") {
    return model.shutdown_date <= end && model.shutdown_date.slice(0, 7) >= today.slice(0, 7);
  }
  return model.shutdown_date >= today && model.shutdown_date <= end;
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
