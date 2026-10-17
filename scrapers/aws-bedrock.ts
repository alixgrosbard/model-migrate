import { compareDate, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, loadHtml, tableRows } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const POLICY_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html";
export const LEGACY_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const legacy = await politeFetch(LEGACY_URL);
  return parseBedrock(legacy, checked);
}

export function parseBedrock(html: string, checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const models: ScrapedModel[] = [];
  let section: "active" | "legacy" = "active";
  $("h1, h2, table").each((_, node) => {
    if (node.tagName === "h1" || node.tagName === "h2") {
      const title = $(node).text().toLowerCase();
      if (title.includes("legacy") || title.includes("end-of-life") || title.includes("eol")) section = "legacy";
      if (title.includes("active")) section = "active";
      return;
    }
    const rows = tableRows($, node);
    const header = (rows[0] ?? []).map((cell) => cell.toLowerCase());
    if (!header.some((cell) => cell.includes("model id"))) return;
    const idIdx = header.findIndex((cell) => cell === "model id" || cell.includes("model id"));
    const nameIdx = header.findIndex((cell) => cell.includes("model name"));
    const regionIdx = header.findIndex((cell) => cell.includes("region"));
    const legacyIdx = header.findIndex((cell) => cell.includes("legacy date"));
    const eolIdx = header.findIndex((cell) => cell.includes("eol"));
    for (const row of rows.slice(1)) {
      const id = (row[idIdx] ?? "").trim();
      if (!id || !/[a-z]/i.test(id)) continue;
      const legacy = parseDate(row[legacyIdx] ?? "");
      const eol = parseDate(row[eolIdx] ?? "");
      const regions = regionIdx >= 0 ? row[regionIdx] : "";
      const status = bedrockStatus(section, legacy.date, eol.date, checked);
      models.push(
        baseModel({
          id,
          provider: "aws-bedrock",
          displayName: row[nameIdx] ? `${row[nameIdx]} (${id})` : id,
          status,
          deprecated: legacy.date,
          shutdown: eol.date,
          kind: eol.kind === "none" ? "none" : "exact",
          notes: regions ? `Regions listed on the lifecycle page: ${regions}.` : null,
          sourceUrl: LEGACY_URL,
          sourceLabel: "Amazon Bedrock model lifecycle (legacy)",
          checked,
          excerpt: excerpt([`Policy page ${POLICY_URL}`, ...row]),
        }),
      );
    }
  });
  return models;
}

function bedrockStatus(section: "active" | "legacy", legacy: string | null, eol: string | null, today: string): ScrapedModel["status"] {
  if (eol && compareDate(eol, today) < 0) return "retired";
  if (section === "legacy") return "legacy";
  if (legacy && compareDate(legacy, today) < 0) return "legacy";
  return "active";
}
