import type { MigrationRecord, ModelRecord, Provider } from "../schema.ts";

export interface FaqItem {
  question: string;
  answer: string;
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
  } else {
    when = "does not have a published shutdown date";
  }
  const name = model.display_name.includes(model.id) ? model.display_name : `${model.display_name} (${model.id})`;
  return `${name} ${when} per ${provider.name}'s deprecation page (checked ${checked}).`;
}

export function replacementSentence(model: ModelRecord): string {
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

export function answerSentence(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): string {
  return `${shutdownSentence(model, provider)} ${replacementSentence(model)} ${keyChangeSentence(model, migration)}`;
}

export function replacementAnswer(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): string {
  return `${replacementSentence(model)} ${shutdownSentence(model, provider)} ${keyChangeSentence(model, migration)}`;
}

export function modelFaqs(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): FaqItem[] {
  return [
    { question: `When is ${model.display_name} shut down?`, answer: answerSentence(model, provider, migration) },
    { question: `What replaces ${model.display_name}?`, answer: replacementSentence(model) },
    { question: `Is ${model.display_name} deprecated?`, answer: `${model.display_name} status is ${model.status}.` },
  ];
}

export function replaceFaqs(model: ModelRecord, provider: Provider, migration?: MigrationRecord | null): FaqItem[] {
  const target = migration?.to.model_id ?? officialReplacement(model)?.model_id;
  return [
    { question: `What is the replacement for ${model.display_name}?`, answer: replacementAnswer(model, provider, migration) },
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

export function modelTitle(model: ModelRecord): string {
  const when = formatWhen(model);
  if (when === "Not published") return `${model.display_name} shutdown status | SunsetDiff`;
  return `${model.display_name} shuts down ${when} | SunsetDiff`;
}

export function clipMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

export function officialReplacement(model: ModelRecord) {
  return model.replacements.find((item) => item.kind === "official") ?? model.replacements[0];
}

export function relatedModels(model: ModelRecord, models: ModelRecord[]): ModelRecord[] {
  return models
    .filter((item) => item.provider === model.provider && item.id !== model.id)
    .sort((a, b) => (a.shutdown_date ?? "9999-99-99").localeCompare(b.shutdown_date ?? "9999-99-99"))
    .slice(0, 6);
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
