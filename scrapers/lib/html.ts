import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export function loadHtml(html: string) {
  return cheerio.load(html);
}

export function cellText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function excerpt(parts: string[], max = 300): string {
  const text = parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" | ");
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

export function nextElement($: cheerio.CheerioAPI, start: AnyNode, tag: string): AnyNode | undefined {
  let seen = false;
  let found: AnyNode | undefined;
  $("h1, h2, h3, h4, table").each((_, node) => {
    if (found) return;
    if (seen && node.tagName === tag) found = node;
    if (node === start) seen = true;
  });
  return found;
}

export function tableRows($: cheerio.CheerioAPI, table: AnyNode): string[][] {
  const rows: string[][] = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells: string[] = [];
      $(tr)
        .find("th, td")
        .each((__, cell) => {
          cells.push(cellText($(cell).text()));
        });
      if (cells.some(Boolean)) rows.push(cells);
    });
  return rows;
}

/** A trailing * on a deprecations cell is a wildcard, not part of the model id. */
export function normalizeModelId(value: string): string {
  return value.trim().replace(/^\*+|\*+$/g, "");
}

export function isModelId(value: string): boolean {
  const text = normalizeModelId(value);
  if (!text || text.length < 2 || text.length > 120) return false;
  if (/\s/.test(text)) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (text.startsWith("/") || text.includes("OpenAI-Beta")) return false;
  return true;
}

export function idsFromCell($: cheerio.CheerioAPI, cell: AnyNode): string[] {
  const codes = $(cell)
    .find("code")
    .map((_, node) => normalizeModelId($(node).text()))
    .get()
    .filter(isModelId);
  if (codes.length) return unique(codes);
  const text = normalizeModelId(cellText($(cell).text()).replace(/\*/g, ""));
  if (isModelId(text)) return [text];
  const pieces = text
    .split(/\s+or\s+|,/i)
    .map((piece) => normalizeModelId(piece))
    .filter(isModelId);
  return unique(pieces);
}

export function slugify(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function familyFromId(id: string): string | null {
  const stripped = id
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .replace(/-\d{8}$/, "")
    .replace(/-v\d+:\d+$/, "");
  return stripped && stripped !== id ? stripped : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function money(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
}

export function parseTokenPrice(cell: string): { input: number | null; output: number | null } {
  const text = cell.replace(/,/g, "");
  const both = text.match(
    /\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*1M input tokens\s*\+\s*\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*1M output tokens/i,
  );
  if (both) return { input: Number(both[1]), output: Number(both[2]) };
  const single = text.match(/\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*1M tokens/i);
  if (single) return { input: Number(single[1]), output: null };
  return { input: null, output: null };
}
