import { compareDate, parseDate, todayISO } from "./lib/dates.ts";
import { excerpt, isModelId, loadHtml } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import { politeFetch } from "./lib/fetch.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const POLICY_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html";
export const LEGACY_URL = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";

export async function scrape(checked = todayISO()): Promise<ScrapedModel[]> {
  const legacy = await politeFetch(LEGACY_URL);
  return parseBedrock(legacy, checked);
}

interface BedrockRow {
  name: string;
  id: string;
  regions: string;
  legacyText: string;
  eolText: string;
  cells: string[];
}

export function parseBedrock(html: string, checked = todayISO()): ScrapedModel[] {
  const $ = loadHtml(html);
  const raw: { section: "active" | "legacy"; row: BedrockRow }[] = [];
  let section: "active" | "legacy" = "active";
  $("h1, h2, table").each((_, node) => {
    if (node.tagName === "h1" || node.tagName === "h2") {
      const title = $(node).text().toLowerCase();
      if (title.includes("legacy") || title.includes("end-of-life") || title.includes("eol")) section = "legacy";
      if (title.includes("active")) section = "active";
      return;
    }
    let carry: { name: string; id: string } | null = null;
    $(node)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr)
          .find("th, td")
          .toArray()
          .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());
        if (!cells.some(Boolean)) return;
        if (cells.some((cell) => cell.toLowerCase().includes("model id"))) {
          carry = null;
          return;
        }
        let row: BedrockRow | null = null;
        if (cells.length >= 7 && isModelId(cells[2])) {
          carry = { name: cells[1], id: cells[2] };
          row = { name: cells[1], id: cells[2], regions: cells[3] ?? "", legacyText: cells[4] ?? "", eolText: cells[5] ?? "", cells };
        } else if (carry && cells.length >= 4 && cells.length < 7) {
          row = {
            name: carry.name,
            id: carry.id,
            regions: cells[0] ?? "",
            legacyText: cells[1] ?? "",
            eolText: cells[2] ?? "",
            cells: ["", carry.name, carry.id, ...cells],
          };
        }
        if (row) raw.push({ section, row });
      });
  });

  const order: string[] = [];
  const groups = new Map<string, { section: "active" | "legacy"; rows: BedrockRow[] }>();
  for (const item of raw) {
    const eol = parseDate(item.row.eolText);
    const key = `${item.row.id}|${eol.date ?? ""}|${eol.kind}`;
    const group = groups.get(key);
    if (group) group.rows.push(item.row);
    else {
      groups.set(key, { section: item.section, rows: [item.row] });
      order.push(key);
    }
  }

  const models: ScrapedModel[] = [];
  for (const key of order) {
    const group = groups.get(key)!;
    const first = group.rows[0];
    const eol = parseDate(first.eolText);
    const legacyDates = group.rows.map((row) => parseDate(row.legacyText).date).filter((date): date is string => Boolean(date));
    const earliest = legacyDates.sort()[0] ?? null;
    const status = bedrockStatus(group.section, earliest, eol.date, checked);
    models.push(
      baseModel({
        id: first.id,
        provider: "aws-bedrock",
        displayName: first.name ? `${first.name} (${first.id})` : first.id,
        status,
        deprecated: earliest,
        shutdown: eol.date,
        kind: eol.kind === "none" ? "none" : "exact",
        notes: regionNotes(group.rows),
        sourceUrl: LEGACY_URL,
        sourceLabel: "Amazon Bedrock model lifecycle (legacy)",
        checked,
        excerpt: excerpt([`Policy page ${POLICY_URL}`, ...first.cells]),
      }),
    );
  }
  return models;
}

function regionNotes(rows: BedrockRow[]): string | null {
  if (rows.length === 1) {
    const regions = rows[0].regions.trim();
    return regions ? `Regions listed on the lifecycle page: ${regions}.` : null;
  }
  const parts = rows
    .map((row) => {
      const regions = row.regions.trim();
      if (!regions) return "";
      const legacy = parseDate(row.legacyText).date;
      return legacy ? `${regions} (legacy ${legacy})` : regions;
    })
    .filter(Boolean);
  if (!parts.length) return null;
  return `Regions listed on the lifecycle page: ${parts.join("; ")}.`;
}

function bedrockStatus(section: "active" | "legacy", legacy: string | null, eol: string | null, today: string): ScrapedModel["status"] {
  if (eol && compareDate(eol, today) < 0) return "retired";
  if (section === "legacy") return "legacy";
  if (legacy && compareDate(legacy, today) < 0) return "legacy";
  return "active";
}
