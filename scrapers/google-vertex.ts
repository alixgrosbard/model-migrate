import { compareDate, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml, tableRows } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const DEPRECATIONS_URL =
  "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const html = await politeFetch(DEPRECATIONS_URL);
  return parseVertex(html, checked);
}

export function parseVertex(html: string, checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const models = new Map<string, ScrapedModel>();
  let retiredSection = false;
  $("h2, h3, table").each((_, node) => {
    const tag = node.tagName;
    if (tag === "h2" || tag === "h3") {
      const title = $(node).text().toLowerCase();
      if (title.includes("retired")) retiredSection = true;
      if (title.includes("latest") || title.includes("available")) retiredSection = false;
      return;
    }
    const rows = tableRows($, node);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    if (!header.some((cell) => cell.includes("model id"))) return;
    const idIdx = header.findIndex((cell) => cell.includes("model id"));
    const releaseIdx = header.findIndex((cell) => cell.includes("release"));
    const retireIdx = header.findIndex((cell) => cell.includes("retirement"));
    const replaceIdx = header.findIndex((cell) => cell.includes("replacement") || cell.includes("upgrade"));
    for (const row of rows.slice(1)) {
      const id = (row[idIdx] ?? "").trim();
      if (!isModelId(id)) continue;
      const retirement = parseDate(row[retireIdx] ?? "");
      const release = releaseIdx >= 0 ? parseDate(row[releaseIdx] ?? "") : { date: null, kind: "none" as const };
      const replacement = (row[replaceIdx] ?? "").trim();
      const replacementIds = replacement
        .split(/\s+or\s+|,/i)
        .map((part) => part.trim())
        .filter(isModelId);
      const status = vertexStatus(retiredSection, retirement.date, retirement.kind, checked);
      models.set(
        id,
        baseModel({
          id,
          provider: "google-vertex",
          status,
          shutdown: retirement.date,
          kind: retirement.kind,
          notes: release.date ? `Release date on the Vertex model versions page: ${release.date}.` : null,
          replacements: replacementIds.map((modelId) => ({
            model_id: modelId,
            provider: "google-vertex" as const,
            kind: "official" as const,
            source_url: DEPRECATIONS_URL,
          })),
          sourceUrl: DEPRECATIONS_URL,
          sourceLabel: "Vertex AI model versions",
          checked,
          excerpt: excerpt(row),
        }),
      );
    }
  });
  return [...models.values()];
}

function vertexStatus(
  retiredSection: boolean,
  date: string | null,
  kind: ScrapedModel["shutdown_date_kind"],
  today: string,
): ScrapedModel["status"] {
  if (retiredSection) return "retired";
  if (!date || kind === "none" || kind === "not_before") return "active";
  return compareDate(date, today) < 0 ? "retired" : "deprecated";
}
