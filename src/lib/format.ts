import type { ModelRecord, Provider } from "../schema.ts";

export function formatWhen(model: ModelRecord): string {
  if (!model.shutdown_date || model.shutdown_date_kind === "none") return "Not published";
  if (model.shutdown_date_kind === "not_before") return `Not sooner than ${model.shutdown_date}`;
  if (model.shutdown_date_kind === "month_only") return `During ${model.shutdown_date.slice(0, 7)}`;
  return model.shutdown_date;
}

export function answerSentence(model: ModelRecord, provider: Provider): string {
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
  const replacement = model.replacements.find((item) => item.kind === "official") ?? model.replacements[0];
  const repl = replacement
    ? ` The official replacement is ${replacement.model_id}.`
    : " No official replacement is published on that page.";
  return `${model.display_name} (${model.id}) ${when} per ${provider.name}'s deprecation page (checked ${checked}).${repl}`;
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
