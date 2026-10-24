import { excerpt, loadHtml } from "./lib/html.ts";

export interface PublishedSpec {
  ids: string[];
  context: number | null;
  maxOutput: number | null;
  input: number | null;
  output: number | null;
  cached: number | null;
  excerpt: string;
  /** Dated snapshot ids named beside the token limits. Prices are not copied onto these ids. */
  limitIds: string[];
}

export interface VertexModelDoc {
  id: string;
  title: string;
  context: number | null;
  maxOutput: number | null;
  excerpt: string;
}

export interface VertexPrice {
  input: number | null;
  output: number | null;
  cached: number | null;
  excerpt: string;
}

export function parseOpenAIModelDoc(markdown: string): PublishedSpec | null {
  const id = markdown.match(/Model ID:\s*`([^`]+)`/)?.[1]?.trim();
  if (!id) return null;
  const context = tokenAmount(markdown.match(/([\d,]+(?:\.\d+)?)\s*([km])?\s+context window/i)?.[0] ?? "");
  const maxOutput = tokenAmount(markdown.match(/([\d,]+(?:\.\d+)?)\s*([km])?\s+max output tokens/i)?.[0] ?? "");
  const textSection = markdown.split("### Text tokens")[1]?.split(/\n### |\n## /)[0] ?? "";
  const input = rowMoney(textSection, /^input$/i);
  const output = rowMoney(textSection, /^output$/i);
  const cached = rowMoney(textSection, /^cached input$/i);
  const snapshot = markdown.match(/Default snapshot:\s*`([^`]+)`/)?.[1]?.trim();
  return {
    ids: [id],
    context,
    maxOutput,
    input,
    output,
    cached,
    excerpt: excerpt([
      `Model ID: ${id}`,
      context ? `context window ${context}` : "",
      maxOutput ? `max output ${maxOutput}` : "",
      input != null ? `input $${input}` : "",
      output != null ? `output $${output}` : "",
    ]),
    limitIds: snapshot && snapshot !== id ? [snapshot] : [],
  };
}

export function parseAnthropicModelDoc(markdown: string): PublishedSpec | null {
  const id = markdown.match(/Model ID:\s*`([^`]+)`/)?.[1]?.trim();
  if (!id) return null;
  const specs = markdown.split("## Specifications")[1]?.split(/\n## /)[0] ?? markdown;
  const context = tokenAmount(tableValue(specs, "Context window") ?? markdown.match(/Context window:\s*([^\n·]+)/)?.[1] ?? "");
  const maxOutput = tokenAmount(tableValue(specs, "Max output") ?? markdown.match(/Max output:\s*([^\n·]+)/)?.[1] ?? "");
  const pricing = specs.split("### Pricing")[1]?.split(/\n### /)[0] ?? "";
  const input = perMtok(tableValue(pricing, "Input"));
  const output = perMtok(tableValue(pricing, "Output"));
  const cached = perMtok(tableValue(pricing, "Cache read"));
  const ids = new Set<string>([id]);
  const idTable = specs.split("### Model IDs")[1]?.split(/\n### /)[0] ?? "";
  for (const match of idTable.matchAll(/`([^`]+)`/g)) {
    if (match[1].startsWith("claude-")) ids.add(match[1]);
  }
  return {
    ids: [...ids],
    context,
    maxOutput,
    input,
    output,
    cached,
    excerpt: excerpt([
      `Model ID: ${id}`,
      context ? `context window ${context}` : "",
      maxOutput ? `max output ${maxOutput}` : "",
      input != null ? `input $${input}/MTok` : "",
      output != null ? `output $${output}/MTok` : "",
    ]),
    limitIds: [],
  };
}

export function parseGeminiModelDocs(html: string): PublishedSpec[] {
  const $ = loadHtml(html);
  const found: PublishedSpec[] = [];
  $("table.gemini-api-model-table").each((_, table) => {
    const id = $(table).find("code").first().text().replace(/\s+/g, "").trim();
    if (!id) return;
    const tokenRow = $(table)
      .find("tr")
      .filter((__, tr) => ($(tr).html() ?? "").includes("/gemini-api/docs/tokens"))
      .first();
    const numbers = tokenRow
      .find("p")
      .map((__, node) => $(node).text().trim())
      .get()
      .filter((value) => /^[\d,]+$/.test(value))
      .map((value) => Number(value.replace(/,/g, "")));
    if (numbers.length < 2) return;
    const [context, maxOutput] = numbers;
    found.push({
      ids: [id],
      context,
      maxOutput,
      input: null,
      output: null,
      cached: null,
      excerpt: excerpt([`${id} input token limit ${context}`, `max output tokens ${maxOutput}`]),
      limitIds: [],
    });
  });
  return found;
}

export function parseVertexModelDoc(html: string): VertexModelDoc | null {
  const $ = loadHtml(html);
  const id = $("code").first().text().replace(/\s+/g, "").trim();
  if (!id) return null;
  const title = ($("title").first().text().split("|")[0] ?? "").replace(/\s+/g, " ").trim();
  let context: number | null = null;
  let maxOutput: number | null = null;
  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("th, td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();
    const label = cells.find((cell) => /context window|maximum output tokens/i.test(cell));
    const number = cells.map(tokenAmount).find((value) => value != null) ?? null;
    if (!label || number == null) return;
    if (/context window/i.test(label)) context = number;
    if (/maximum output tokens/i.test(label)) maxOutput = number;
  });
  if (context == null && maxOutput == null) return null;
  return {
    id,
    title,
    context,
    maxOutput,
    excerpt: excerpt([title, id, context ? `context window ${context}` : "", maxOutput ? `maximum output tokens ${maxOutput}` : ""]),
  };
}

export function parseVertexPricing(html: string): Map<string, VertexPrice> {
  const $ = loadHtml(html);
  const map = new Map<string, VertexPrice>();
  $("table").each((_, table) => {
    const rows: string[][] = [];
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells: string[] = [];
        $(tr)
          .find("th, td")
          .each((___, cell) => {
            cells.push($(cell).text().replace(/\s+/g, " ").trim());
          });
        if (cells.length) rows.push(cells);
      });
    if (!rows.length) return;
    const header = rows[0].map((cell) => cell.toLowerCase());
    if (!header.some((cell) => cell.includes("token"))) return;
    const inputCol = header.findIndex((cell) => cell.includes("token") && cell.includes("<=") && !cell.includes("cached"));
    const cachedCol = header.findIndex((cell) => cell.includes("cached") && cell.includes("<="));
    const priceCol = inputCol >= 0 ? inputCol : header.findIndex((cell) => cell.includes("price"));
    if (priceCol < 0) return;
    let model = "";
    for (const row of rows.slice(1)) {
      if (row[0] && !row[0].startsWith("$") && !/^input|^output|^text output|^audio/i.test(row[0])) model = row[0];
      const type = row[1] || row[0];
      if (!model || !type) continue;
      const key = normalizeName(model);
      const current = map.get(key) ?? { input: null, output: null, cached: null, excerpt: "" };
      const amount = dollar(row[priceCol]);
      const cached = cachedCol >= 0 ? dollar(row[cachedCol]) : null;
      if (/^input\b/i.test(type) && /text/i.test(type) && current.input == null && amount != null) {
        current.input = amount;
        if (cached != null) current.cached = cached;
        current.excerpt = excerpt([`${model} ${type} $${amount} per 1M tokens for the <= 200K column`]);
      } else if (/^text output\b/i.test(type) && current.output == null && amount != null) {
        current.output = amount;
      }
      map.set(key, current);
    }
  });
  return map;
}

export function parseMistralModelDoc(html: string): { id: string; context: number | null; excerpt: string } | null {
  const id = html.match(/title="Click to copy: ([^"]+)"/)?.[1]?.trim();
  if (!id) return null;
  const contextRaw = html.match(/>(?:<span>)?Context<\/span>[\s\S]{0,800}?text-primary-soft">([^<]+)/)?.[1] ?? "";
  const context = tokenAmount(contextRaw);
  if (context == null) return null;
  return { id, context, excerpt: excerpt([id, `Context ${contextRaw.trim()}`]) };
}

export function tokenAmount(value: string): number | null {
  const match = value.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)(?:\s*([km])\b)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "m") return Math.round(amount * 1_000_000);
  if (unit === "k") return Math.round(amount * 1_000);
  return Math.round(amount);
}

export function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function tableValue(section: string, label: string): string | null {
  const lines = section.split("\n").filter((line) => line.trim().startsWith("|"));
  for (const line of lines) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const name = cells[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (name.toLowerCase() === label.toLowerCase()) return cells[cells.length - 1];
  }
  return null;
}

function rowMoney(section: string, label: RegExp): number | null {
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|") || line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2 || !label.test(cells[0])) continue;
    return dollar(cells[1]);
  }
  return null;
}

function perMtok(value: string | null): number | null {
  if (!value || /from\s+\$/i.test(value)) return null;
  return dollar(value);
}

function dollar(value: string | undefined): number | null {
  if (!value || value === "N/A" || value === "-") return null;
  const match = value.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}
