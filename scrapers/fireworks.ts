import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../src/schema.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, isModelId } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Markdown Fireworks publishes. Stored sources use the page without .md. */
export const CHANGELOG_MD_URL = "https://docs.fireworks.ai/updates/changelog.md";
export const US_MD_URL = "https://docs.fireworks.ai/serverless/us-only-serverless.md";
export const QUICKSTART_MD_URL = "https://docs.fireworks.ai/getting-started/quickstart.md";
export const CHANGELOG_URL = "https://docs.fireworks.ai/updates/changelog";
export const US_URL = "https://docs.fireworks.ai/serverless/us-only-serverless";
export const QUICKSTART_URL = "https://docs.fireworks.ai/getting-started/quickstart";

export const CHANGELOG_FIXTURE = "snapshots/fixtures/fireworks/changelog-2026-10-28.md";
export const US_FIXTURE = "snapshots/fixtures/fireworks/us-only-2026-10-28.md";
export const QUICKSTART_FIXTURE = "snapshots/fixtures/fireworks/quickstart-2026-10-28.md";

/** The quickstart prints this id for the model whose library link ends in glm-5p3-flash. */
export const QUICKSTART_MODEL_ID = "accounts/fireworks/models/glm-5p3-flash";
export const LIBRARY_PREFIX = "https://app.fireworks.ai/models/fireworks/";

export const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1";
export const FIREWORKS_CHAT_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
export const FIREWORKS_US_BASE_URL = "https://us.api.fireworks.ai/inference/v1";
export const FIREWORKS_US_CHAT_URL = "https://us.api.fireworks.ai/inference/v1/chat/completions";

const CHANGELOG_LABEL = "Fireworks AI changelog";
const US_LABEL = "Fireworks US-only serverless";
const STUB_LABEL = "Named as an official replacement";

const SCOPE_SENTENCES = [
  "Dedicated deployments and Reserved Throughput are unaffected.",
  "Dedicated deployments are unaffected.",
  "This applies only to serverless inference.",
  "This applies only to serverless endpoints, including Fast and US-only Serverless endpoints for models that have those variants.",
  "This change applies only to Serverless Training.",
  "This change applies to the shared Serverless Training pool.",
];

const US_HOST_SENTENCE = "Call https://us.api.fireworks.ai and pass one of the US model IDs from the table above as model.";

type Surface = "inference" | "training";

interface Section {
  heading: string;
  body: string;
  shutdown: string | null;
  surface: Surface;
}

interface Built {
  id: string;
  displayName: string;
  surface: Surface;
  shutdown: string | null;
  replacements: { id: string; source: string }[];
  notes: string[];
  excerpt: string;
  us: boolean;
}

export interface FireworksPages {
  changelog: string | null;
  us: string | null;
  quickstart: string | null;
}

/**
 * null means the changelog is not usable, or the quickstart no longer shows the
 * accounts/fireworks/models/ prefix that library links are joined with.
 * Names with no model link are skipped. A US-only row is skipped when the US page has no id for that name.
 */
export function parseFireworks(changelog: string, usPage: string, quickstart: string, checked: string): ScrapedModel[] | null {
  if (!changelog.includes(LIBRARY_PREFIX + "glm-5p3-flash")) return null;
  if (!quickstart.includes(QUICKSTART_MODEL_ID)) return null;
  const usNames = usNameTable(usPage);
  if (!usNames) return null;
  const sections = deprecationSections(changelog);
  if (!sections.length) return null;

  const byKey = new Map<string, Built>();
  for (const section of sections) {
    for (const row of rowsInSection(section, usNames)) {
      if (!row) continue;
      const key = `${row.surface}\u0000${row.id}`;
      const existing = byKey.get(key);
      if (!existing) {
        if (!row.shutdown && !row.replacements.length) {
          const host = [...byKey.values()].find((item) => item.id === row.id);
          if (host) {
            for (const note of row.notes) {
              if (!host.notes.includes(note)) host.notes.push(note);
            }
          }
          continue;
        }
        byKey.set(key, row);
        continue;
      }
      if (!row.shutdown && !row.replacements.length) {
        for (const note of row.notes) {
          if (!existing.notes.includes(note)) existing.notes.push(note);
        }
        continue;
      }
      if (!existing.replacements.length && row.replacements.length) existing.replacements = row.replacements;
      for (const note of row.notes) {
        if (!existing.notes.includes(note)) existing.notes.push(note);
      }
    }
  }
  if (!byKey.size) return null;
  const models = [...byKey.values()].map((row) => toScraped(row, checked));
  return addStubs(models, checked);
}

/**
 * null means keep the stored Fireworks rows.
 * A list is safe to write when the three pages parsed and no still-upcoming stored id disappeared.
 */
export function assembleFireworks(
  pages: FireworksPages,
  checked: string,
  previous: ModelRecord[] = [],
): ScrapedModel[] | null {
  if (!pages.changelog || !pages.us || !pages.quickstart) return null;
  const next = parseFireworks(pages.changelog, pages.us, pages.quickstart, checked);
  if (next == null || next.length === 0) return null;
  const stored = previous.filter((model) => model.provider === "fireworks");
  const nextIds = new Set(next.map((model) => model.id));
  const upcomingGone = stored.filter(
    (model) => model.shutdown_date && model.shutdown_date >= checked && !nextIds.has(model.id),
  );
  if (upcomingGone.length) return null;
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const nextUpcoming = next.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;
  if (stored.length > 0 && next.length < stored.length * 0.7) return null;
  return next;
}

export async function loadFireworksPages(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<FireworksPages> {
  const changelog = await readPage(options, CHANGELOG_MD_URL, CHANGELOG_FIXTURE, "changelog");
  const us = await readPage(options, US_MD_URL, US_FIXTURE, "us-only");
  const quickstart = await readPage(options, QUICKSTART_MD_URL, QUICKSTART_FIXTURE, "quickstart");
  return { changelog, us, quickstart };
}

export function fireworksUsesUsHost(notes: string | null | undefined): boolean {
  return Boolean(notes && notes.includes("https://us.api.fireworks.ai"));
}

function deprecationSections(page: string): Section[] {
  const lines = page.split("\n");
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ") && /deprecat/i.test(lines[i])) starts.push(i);
  }
  return starts.flatMap((start) => {
    const end = nextHeading(lines, start + 1);
    const heading = lines[start].replace(/^#\s+/, "").trim();
    const body = lines.slice(start + 1, end).join("\n");
    const shutdown = sectionDates(body);
    if (shutdown === "conflict") return [];
    return [
      {
        heading,
        body,
        shutdown,
        surface: /training/i.test(heading) ? "training" : "inference",
      },
    ];
  });
}

function nextHeading(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) return i;
  }
  return lines.length;
}

function sectionDates(body: string): string | null | "conflict" {
  const found = new Set<string>();
  const patterns = [
    /(?:on|before|for) \*\*([A-Za-z]+ \d{1,2}, \d{4})\*\*/gi,
    /effective ([A-Za-z]+ \d{1,2}, \d{4})/g,
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const parsed = parseDate(match[1]);
      if (parsed.kind === "exact" && parsed.date) found.add(parsed.date);
    }
  }
  if (found.size > 1) return "conflict";
  if (found.size === 0) return null;
  return [...found][0];
}

function rowsInSection(section: Section, usNames: Map<string, string>): Array<Built | null> {
  const scope = SCOPE_SENTENCES.filter((sentence) => plain(section.body).includes(sentence));
  const bullets = section.body.split("\n").filter((line) => line.trim().startsWith("* "));
  const rows: Array<Built | null> = [];
  if (bullets.length) {
    for (const line of bullets) rows.push(bulletRow(section, line, usNames, scope));
    return rows;
  }
  const prose = proseRow(section, usNames, scope);
  return prose ? [prose] : [];
}

function bulletRow(section: Section, line: string, usNames: Map<string, string>, scope: string[]): Built | null {
  const parts = line.split(/\s[—–-]\s/);
  const before = parts[0] ?? line;
  const after = parts.slice(1).join(" - ");
  const fromLinks = appLinks(before);
  if (fromLinks.length !== 1) return null;
  const from = fromLinks[0];
  const usOnly = /US endpoint only/i.test(before);
  const toLinks = appLinks(after);
  if (toLinks.length && toLinks.every((link) => link.slug === from.slug)) {
    const id = resolveId(from.label, from.slug, false, usNames);
    if (!id) return null;
    return {
      id,
      displayName: from.label,
      surface: section.surface,
      shutdown: null,
      replacements: [],
      notes: [
        `Another changelog bullet links ${from.label} and the text after it to the same model page, so no separate id is stored.`,
      ],
      excerpt: plain(line),
      us: false,
    };
  }
  const id = resolveId(from.label, from.slug, usOnly, usNames);
  if (!id) return null;
  const replacements = replacementIds(after, toLinks, usNames);
  const notes = [
    `Changelog section: ${plain(section.heading)}.`,
    ...scope,
    usOnly ? "US endpoint only." : "",
    globalRemains(line),
    replacements.length === 0 && after ? `The changelog says: ${plain(after).replace(/\.$/, "")}.` : "",
    unlinkedVariants(line),
    id.startsWith("accounts/fireworks/routers/") ? US_HOST_SENTENCE : "",
  ].filter(Boolean);
  return {
    id,
    displayName: from.label,
    surface: section.surface,
    shutdown: section.shutdown,
    replacements,
    notes,
    excerpt: plain(line),
    us: id.startsWith("accounts/fireworks/routers/") || usOnly,
  };
}

function proseRow(section: Section, usNames: Map<string, string>, scope: string[]): Built | null {
  const removed = section.body.match(
    /\*\*\[([^\]]+)\]\((https:\/\/app\.fireworks\.ai\/models\/fireworks\/([A-Za-z0-9._-]+))\)\*\*[^\n]*will be removed/,
  );
  if (!removed) return null;
  const label = removed[1];
  const slug = removed[3];
  if (!label || !slug) return null;
  const id = resolveId(label, slug, false, usNames);
  if (!id) return null;
  const migrate = section.body.split(/migrate to/i)[1] ?? "";
  const toLinks = appLinks(migrate);
  return {
    id,
    displayName: section.surface === "training" ? `${label} Serverless Training` : label,
    surface: section.surface,
    shutdown: section.shutdown,
    replacements: replacementIds(migrate, toLinks, usNames),
    notes: [`Changelog section: ${plain(section.heading)}.`, ...scope].filter(Boolean),
    excerpt: plain(removed[0] ?? label),
    us: false,
  };
}

function resolveId(label: string, slug: string, usOnly: boolean, usNames: Map<string, string>): string | null {
  if (usOnly) {
    const us = usNames.get(normalizeName(label));
    return us && isModelId(us) ? us : null;
  }
  const id = `accounts/fireworks/models/${slug}`;
  return isModelId(id) ? id : null;
}

function replacementIds(
  after: string,
  links: { label: string; slug: string }[],
  usNames: Map<string, string>,
): { id: string; source: string }[] {
  if (/US endpoint/i.test(after) && !links.length) {
    const name = longestUsName(after, usNames);
    const id = name ? usNames.get(name) : undefined;
    return id && isModelId(id) ? [{ id, source: US_URL }] : [];
  }
  const ids: { id: string; source: string }[] = [];
  for (const link of links) {
    const id = `accounts/fireworks/models/${link.slug}`;
    if (!isModelId(id) || ids.some((item) => item.id === id)) continue;
    ids.push({ id, source: CHANGELOG_URL });
  }
  return ids;
}

function longestUsName(text: string, usNames: Map<string, string>): string | null {
  const plainText = normalizeName(plain(text));
  let best = "";
  for (const name of usNames.keys()) {
    if (plainText.includes(name) && name.length > best.length) best = name;
  }
  return best || null;
}

function appLinks(text: string): { label: string; slug: string }[] {
  return [...text.matchAll(/\[([^\]]+)\]\(https:\/\/app\.fireworks\.ai\/models\/fireworks\/([A-Za-z0-9._-]+)\)/g)].flatMap(
    (match) => (match[1] && match[2] ? [{ label: match[1], slug: match[2] }] : []),
  );
}

function globalRemains(line: string): string {
  const match = plain(line).match(/The global .+? remains available\./);
  return match?.[0] ?? "";
}

function unlinkedVariants(line: string): string {
  const text = plain(line);
  const match = text.match(/including (.+?)(?:\s-\s|$)/);
  const clause = match?.[1]?.trim().replace(/\.$/, "");
  if (!clause) return "";
  const raw = line.slice(line.toLowerCase().indexOf("including"));
  if (appLinks(raw.split(/[—–]/)[0] ?? raw).length) return "";
  return `The same sentence also names ${clause}. Those names are not linked to model pages, so they are not stored as separate ids.`;
}

function usNameTable(page: string): Map<string, string> | null {
  const tables = markdownTables(page).filter((table) => {
    const header = table[0]?.map(normalizeHeader) ?? [];
    return header[0] === "model" && header[1] === "model id";
  });
  if (tables.length !== 1) return null;
  const names = new Map<string, string>();
  for (const cells of tables[0].slice(1)) {
    const name = normalizeName(plain(cells[0] ?? ""));
    const id = oneBacktick(cells[1] ?? "");
    if (!name || !id || !isModelId(id)) return null;
    names.set(name, id);
  }
  return names.size ? names : null;
}

function toScraped(row: Built, checked: string): ScrapedModel {
  const shutdown = row.shutdown;
  const status = !shutdown ? "deprecated" : compareDate(shutdown, checked) < 0 ? "retired" : "deprecated";
  const kind = shutdown ? "exact" : "none";
  const notes = [...row.notes];
  if (!shutdown) notes.push("That changelog entry does not print a shutdown date.");
  const model = baseModel({
    id: row.id,
    provider: "fireworks",
    displayName: row.displayName,
    status,
    shutdown,
    kind,
    notes: notes.join(" "),
    replacements: row.replacements.map((item) => ({
      model_id: item.id,
      provider: "fireworks",
      kind: "official" as const,
      source_url: item.source,
    })),
    sourceUrl: CHANGELOG_URL,
    sourceLabel: CHANGELOG_LABEL,
    checked,
    excerpt: excerpt([row.excerpt]),
  });
  if (row.us || row.replacements.some((item) => item.source === US_URL)) {
    model.sources.push({
      url: US_URL,
      label: US_LABEL,
      last_checked: checked,
      excerpt: excerpt([row.id.includes("/routers/") ? row.id : row.displayName]),
    });
  }
  return model;
}

function addStubs(models: ScrapedModel[], checked: string): ScrapedModel[] {
  const ids = new Set(models.map((model) => model.id));
  const named = new Map<string, { urls: string[]; parents: string[] }>();
  for (const model of models) {
    for (const replacement of model.replacements) {
      if (ids.has(replacement.model_id)) continue;
      const row = named.get(replacement.model_id) ?? { urls: [], parents: [] };
      if (!row.parents.includes(model.id)) row.parents.push(model.id);
      if (!row.urls.includes(replacement.source_url)) row.urls.push(replacement.source_url);
      named.set(replacement.model_id, row);
    }
  }
  const stubs: ScrapedModel[] = [];
  for (const [id, info] of [...named.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parents = [...info.parents].sort();
    const record = baseModel({
      id,
      provider: "fireworks",
      status: "active",
      kind: "none",
      notes: `Named as an official replacement for ${parents.join(", ")}. No shutdown date was published for this id on that page.`,
      sourceUrl: info.urls[0],
      sourceLabel: STUB_LABEL,
      checked,
      excerpt: excerpt([`Named as an official replacement for ${parents[0]}.`]),
    });
    for (const url of info.urls.slice(1)) {
      record.sources.push({
        url,
        label: STUB_LABEL,
        last_checked: checked,
        excerpt: record.sources[0].excerpt,
      });
    }
    stubs.push(record);
  }
  return [...models, ...stubs].sort(
    (a, b) => a.id.localeCompare(b.id) || (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || (a.region_or_platform_notes ?? "").localeCompare(b.region_or_platform_notes ?? ""),
  );
}

function oneBacktick(cell: string): string | null {
  const ids = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "").filter((id) => isModelId(id));
  return ids.length === 1 ? ids[0] : null;
}

function plain(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeHeader(cell: string): string {
  return plain(cell).toLowerCase();
}

function markdownTables(page: string): string[][][] {
  const tables: string[][][] = [];
  let current: string[][] | null = null;
  for (const line of page.split("\n")) {
    if (!line.trim().startsWith("|")) {
      if (current) tables.push(current);
      current = null;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.replace(/\s+/g, " ").trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, "")))) continue;
    if (!current) current = [];
    current.push(cells);
  }
  if (current) tables.push(current);
  return tables;
}

async function readPage(
  options: { fromSnapshots: boolean; checked: string; root: string },
  url: string,
  fixture: string,
  name: string,
): Promise<string | null> {
  if (options.fromSnapshots) {
    try {
      return await readFile(path.join(options.root, fixture), "utf8");
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return null;
    }
  }
  try {
    const { politeFetch } = await import("./lib/fetch.ts");
    const body = await politeFetch(url);
    const dir = path.join(options.root, "snapshots", "fireworks");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}-${options.checked}.md`), body);
    return body;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}
