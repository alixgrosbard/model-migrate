import { compareDate, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, loadHtml, tableRows } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const POLICY_URL = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
export const SCHEDULE_URL = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";

const LIFECYCLE: Record<string, ScrapedModel["status"]> = {
  ga: "active",
  "generally available": "active",
  preview: "active",
  deprecated: "deprecated",
  legacy: "legacy",
  retired: "retired",
};

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const schedule = await politeFetch(SCHEDULE_URL);
  const policy = await politeFetch(POLICY_URL);
  return parseAzure(schedule, policy, checked);
}

export function parseAzure(scheduleHtml: string, policyHtml = "", checked = todayISO()): ScrapedModel[] {
  const models = new Map<string, ScrapedModel>();
  const baseIds = new Set<string>();
  const $ = loadHtml(scheduleHtml);
  let inOpenAI = false;
  $("h2, h3, table").each((_, node) => {
    if (node.tagName === "h2" || node.tagName === "h3") {
      const title = $(node).text().replace(/\s+/g, " ").trim().toLowerCase();
      if (title === "azure openai") inOpenAI = true;
      else if (node.tagName === "h2" || (node.tagName === "h3" && title && title !== "azure openai")) {
        if (title !== "in this article") inOpenAI = title === "azure openai";
      }
      return;
    }
    if (!inOpenAI) return;
    const rows = tableRows($, node);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    if (!header.includes("model") || !header.some((cell) => cell.includes("retirement"))) return;
    const fineTune = header.some((cell) => cell.includes("training"));
    addRows(models, baseIds, rows, fineTune, SCHEDULE_URL, checked);
  });

  if (policyHtml) {
    const policy = loadHtml(policyHtml);
    policy("table").each((_, table) => {
      const rows = tableRows(policy, table);
      const header = (rows[0] ?? []).join(" ").toLowerCase();
      if (!header.includes("training retirement") || !header.includes("deployment retirement")) return;
      for (const row of rows.slice(1)) {
        const id = azureId(row[0] ?? "", row[1] ?? "");
        if (!id) continue;
        const training = parseDate(row[2] ?? "");
        const note = `Fine-tuned deployments: training retirement ${row[2] ?? "not published"} (${training.kind}); deployment retirement ${row[3] ?? "not published"}.`;
        const existing = models.get(id);
        if (existing) {
          existing.region_or_platform_notes = [existing.region_or_platform_notes, note].filter(Boolean).join(" ");
          existing.sources.push({
            url: POLICY_URL,
            label: "Azure OpenAI model retirements",
            last_checked: checked,
            excerpt: excerpt(row),
          });
          continue;
        }
        // A fine-tune-only row has no base lifecycle. Keep the dates in the note.
        models.set(
          id,
          baseModel({
            id,
            provider: "azure-openai",
            displayName: `${row[0]} (${row[1]})`,
            status: "deprecated",
            shutdown: null,
            kind: "none",
            notes: note,
            sourceUrl: POLICY_URL,
            sourceLabel: "Azure OpenAI model retirements",
            checked,
            excerpt: excerpt(row),
          }),
        );
      }
    });
  }
  return [...models.values()];
}

function addRows(
  models: Map<string, ScrapedModel>,
  baseIds: Set<string>,
  rows: string[][],
  fineTune: boolean,
  url: string,
  checked: string,
) {
  for (const row of rows.slice(1)) {
    const name = row[0]?.trim();
    const version = row[1]?.trim();
    if (!name) continue;
    const id = azureId(name, version);
    if (!id) continue;
    if (fineTune) {
      const note = `Training retirement: ${row[2] ?? "not published"}. Deployment retirement: ${row[3] ?? "not published"}.`;
      const existing = models.get(id);
      if (existing) {
        existing.region_or_platform_notes = [existing.region_or_platform_notes, note].filter(Boolean).join(" ");
        existing.sources.push({
          url,
          label: "Azure OpenAI retirement schedule",
          last_checked: checked,
          excerpt: excerpt(row),
        });
        continue;
      }
      models.set(
        id,
        baseModel({
          id,
          provider: "azure-openai",
          displayName: version && version !== "—" ? `${name} (${version})` : name,
          status: "active",
          shutdown: null,
          kind: "none",
          notes: note,
          sourceUrl: url,
          sourceLabel: "Azure OpenAI retirement schedule",
          checked,
          excerpt: excerpt(row),
        }),
      );
      continue;
    }
    if (baseIds.has(id)) continue;
    baseIds.add(id);
    const lifecycle = LIFECYCLE[(row[2] ?? "").trim().toLowerCase()] ?? "active";
    const retirement = parseDate(row[3] ?? "");
    const replacement = (row[4] ?? "").trim();
    const status =
      retirement.date && retirement.kind === "exact" && compareDate(retirement.date, checked) < 0
        ? "retired"
        : lifecycle;
    const preview = (row[2] ?? "").toLowerCase() === "preview" ? "Lifecycle on the schedule: Preview." : null;
    const prior = models.get(id);
    const model = baseModel({
      id,
      provider: "azure-openai",
      displayName: version && version !== "—" ? `${name} (${version})` : name,
      status,
      shutdown: retirement.date,
      kind: retirement.kind,
      notes: [preview, prior?.region_or_platform_notes].filter(Boolean).join(" ") || null,
      replacements: replacementIds(replacement).map((modelId) => ({
        model_id: modelId,
        provider: "azure-openai" as const,
        kind: "official" as const,
        source_url: url,
      })),
      sourceUrl: url,
      sourceLabel: "Azure OpenAI retirement schedule",
      checked,
      excerpt: excerpt(row),
    });
    if (prior) model.sources.push(...prior.sources);
    models.set(id, model);
  }
}

export function azureId(name: string, version: string): string | null {
  const model = name.trim();
  if (!model || model === "—") return null;
  const ver = version.trim();
  if (!ver || ver === "—" || ver === "-") return model;
  if (model.endsWith(ver)) return model;
  return `${model}-${ver}`;
}

function replacementIds(value: string): string[] {
  if (!value || value === "—" || value === "-") return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part !== "—" && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(part));
}
