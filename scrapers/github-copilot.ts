import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AnyNode } from "domhandler";
import type { ModelRecord } from "../src/schema.ts";
import { SOURCES_DISAGREE } from "../src/lib/conflicts.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt, loadHtml } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/** Rendered docs page. The retirement table is filled from GitHub's model-deprecation-history data. */
export const SUPPORTED_URL = "https://docs.github.com/en/copilot/reference/ai-models/supported-models";
export const SUPPORTED_FIXTURE = "snapshots/fixtures/github-copilot/supported-models-2026-10-29.html";
export const POSTS_FIXTURE_DIR = "snapshots/fixtures/github-copilot/posts";

export const CHANGELOG_SITEMAPS = [
  "https://github.blog/changelog-sitemap.xml",
  "https://github.blog/changelog-sitemap2.xml",
  "https://github.blog/changelog-sitemap3.xml",
  "https://github.blog/changelog-sitemap4.xml",
];

const DOCS_LABEL = "GitHub Copilot supported models";
const CHANGELOG_LABEL = "GitHub Changelog";
const STUB_LABEL = "Named as an official replacement";

/**
 * Changelog cells that use a different spelling of a name on the supported-models page.
 * "GPT o3" is the changelog cell. "o3" is the retirement-table cell.
 */
const NAME_ALIASES: Record<string, string> = {
  "gpt o3": "o3",
  "gpt o1 mini": "o1-mini",
  "gpt o3 mini": "o3-mini",
  "gpt o4 mini": "o4-mini",
};

export interface CopilotPost {
  url: string;
  html: string;
}

export interface CopilotPages {
  docs: string | null;
  posts: CopilotPost[] | null;
}

interface TableRow {
  name: string;
  date: string | null;
  alternative: string;
  footnote: string;
}

interface ChangelogHit {
  url: string;
  postDate: string;
  name: string;
  date: string | null;
  alternative: string;
}

interface Built {
  id: string;
  shutdown: string | null;
  docs: boolean;
  docsAlternative: string;
  footnote: string;
  stillListed: boolean;
  changelogDates: { date: string; url: string; postDate: string }[];
  changelogAlts: { text: string; url: string; postDate: string }[];
  exceptions: string[];
  replacements: { id: string; url: string }[];
}

/**
 * A changelog sitemap URL for a Copilot model retirement post.
 * GitHub Models catalog posts are a different product and are skipped.
 */
export function isCopilotChangelogPost(url: string): boolean {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  if (!pathname.startsWith("/changelog/")) return false;
  const slug = pathname.slice("/changelog/".length).replace(/\/$/, "");
  if (!/^\d{4}-\d{2}-\d{2}-/.test(slug)) return false;
  if (slug.includes("github-models")) return false;
  if (!/deprecat|retir/.test(slug)) return false;
  return /copilot|claude|gemini|gpt-|grok|opus|sonnet|mai-code|kimi|raptor|anthropic|openai/.test(slug);
}

/**
 * null means the supported-models retirement table or the changelog tables were not usable.
 * A "Latest ..." alternative is not stored as a model id.
 * When the retirement table and a changelog name different dates, the stored date is the retirement-table date.
 */
export function parseCopilot(docsHtml: string, posts: CopilotPost[], checked: string): ScrapedModel[] | null {
  const docs = parseDocs(docsHtml);
  if (!docs) return null;
  const changelogRows = posts.flatMap((post) => parseChangelogPost(post));
  if (!changelogRows.length) return null;

  const spellings = new Map<string, string>();
  for (const name of docs.available) spellings.set(nameKey(name), name);
  for (const row of docs.retired) spellings.set(nameKey(row.name), row.name);

  const byKey = new Map<string, Built>();
  for (const row of docs.retired) {
    const key = nameKey(row.name);
    byKey.set(key, {
      id: row.name,
      shutdown: row.date,
      docs: true,
      docsAlternative: row.alternative,
      footnote: row.footnote,
      stillListed: docs.available.some((name) => nameKey(name) === key),
      changelogDates: [],
      changelogAlts: [],
      exceptions: [],
      replacements: [],
    });
  }

  for (const hit of changelogRows) {
    const key = nameKey(hit.name);
    let built = byKey.get(key);
    if (!built) {
      if (!hit.date) continue;
      const id = spellings.get(key) ?? cleanName(hit.name);
      built = {
        id,
        shutdown: null,
        docs: false,
        docsAlternative: "",
        footnote: "",
        stillListed: docs.available.some((name) => nameKey(name) === key),
        changelogDates: [],
        changelogAlts: [],
        exceptions: [],
        replacements: [],
      };
      spellings.set(key, id);
      byKey.set(key, built);
    }
    if (hit.date) built.changelogDates.push({ date: hit.date, url: hit.url, postDate: postDay(hit.url) });
    if (hit.alternative) built.changelogAlts.push({ text: hit.alternative, url: hit.url, postDate: postDay(hit.url) });
  }

  for (const post of posts) {
    if (parseChangelogPost(post).length) continue;
    attachProseDates(post, byKey);
  }
  for (const post of posts) attachExceptions(post, byKey);

  for (const built of byKey.values()) {
    if (!built.docs) built.shutdown = changelogShutdown(built);
    built.replacements = chooseReplacements(built, byKey, spellings);
  }

  const models = [...byKey.values()].map((built) => toScraped(built, checked));
  return addStubs(models, byKey, docs.available, checked);
}

/**
 * null means keep the stored Copilot rows.
 * A list is safe to write when both sources parsed and no still-upcoming stored id disappeared.
 */
export function assembleCopilot(pages: CopilotPages, checked: string, previous: ModelRecord[] = []): ScrapedModel[] | null {
  if (!pages.docs || !pages.posts) return null;
  const next = parseCopilot(pages.docs, pages.posts, checked);
  if (next == null || next.length === 0) return null;
  const stored = previous.filter((model) => model.provider === "github-copilot");
  const nextIds = new Set(next.map((model) => model.id));
  const upcomingGone = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked && !nextIds.has(model.id));
  if (upcomingGone.length) return null;
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const nextUpcoming = next.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;
  if (stored.length > 0 && next.length < stored.length * 0.7) return null;
  return next;
}

export async function loadCopilotPages(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<CopilotPages> {
  if (options.fromSnapshots) {
    try {
      const docs = await readFile(path.join(options.root, SUPPORTED_FIXTURE), "utf8");
      const dir = path.join(options.root, POSTS_FIXTURE_DIR);
      const files = (await readdir(dir)).filter((file) => file.endsWith(".html")).sort();
      const posts = await Promise.all(
        files.map(async (file) => ({
          url: `https://github.blog/changelog/${file.replace(/\.html$/, "")}`,
          html: await readFile(path.join(dir, file), "utf8"),
        })),
      );
      return { docs, posts };
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return { docs: null, posts: null };
    }
  }
  try {
    const { politeFetch } = await import("./lib/fetch.ts");
    const docs = await politeFetch(SUPPORTED_URL);
    const snapDir = path.join(options.root, "snapshots", "github-copilot");
    await mkdir(snapDir, { recursive: true });
    await writeFile(path.join(snapDir, `supported-models-${options.checked}.html`), docs);
    const urls = await changelogPostUrls(politeFetch);
    const posts: CopilotPost[] = [];
    for (const url of urls) {
      const html = await politeFetch(url);
      posts.push({ url, html });
      const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "post";
      await writeFile(path.join(snapDir, `${slug}-${options.checked}.html`), html);
    }
    return { docs, posts };
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return { docs: null, posts: null };
  }
}

async function changelogPostUrls(fetchText: (url: string) => Promise<string>): Promise<string[]> {
  const found = new Set<string>();
  for (const sitemap of CHANGELOG_SITEMAPS) {
    const xml = await fetchText(sitemap);
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = (match[1] ?? "").trim();
      if (isCopilotChangelogPost(url)) found.add(url.replace(/\/$/, ""));
    }
  }
  return [...found].sort();
}

function parseDocs(html: string): { retired: TableRow[]; available: string[] } | null {
  if (!html.includes("Model retirement history")) return null;
  const $ = loadHtml(html);
  const root = $("[data-article-body]").first();
  const scope = root.length ? root : $("body");
  const retiredHeading = findHeading($, scope, "Model retirement history");
  const availableHeading = findHeading($, scope, "Supported AI models in Copilot");
  if (!retiredHeading) return null;
  const retiredTable = tableAfter($, retiredHeading);
  if (!retiredTable || !headersMatch(retiredTable.rows[0] ?? [], ["model name", "retirement date", "suggested alternative"])) return null;
  const retired = retiredTable.rows.slice(1).flatMap((cells) => {
    const name = cleanName(cells[0] ?? "");
    if (!name) return [];
    const footnoteId = footnoteIdInRow($, retiredTable.node, name);
    return [
      {
        name,
        date: exactDate(cells[1] ?? ""),
        alternative: clean(cells[2] ?? ""),
        footnote: footnoteId ? footnoteText($, footnoteId) : "",
      },
    ];
  });
  if (!retired.length) return null;
  const available: string[] = [];
  if (availableHeading) {
    const table = tableAfter($, availableHeading);
    if (table && headersMatch(table.rows[0] ?? [], ["model name", "provider"])) {
      for (const cells of table.rows.slice(1)) {
        const name = cleanName(cells[0] ?? "");
        if (name) available.push(name);
      }
    }
  }
  return { retired, available };
}

function parseChangelogPost(post: CopilotPost): ChangelogHit[] {
  const $ = loadHtml(post.html);
  const root = $(".PostContent-main").first();
  const scope = root.length ? root : $("body");
  const tables = scope.find("table").toArray();
  const hits: ChangelogHit[] = [];
  for (const table of tables) {
    const rows = readTable($, table);
    if (!headersMatch(rows[0] ?? [], ["model", "deprecation date", "suggested alternative"])) continue;
    for (const cells of rows.slice(1)) {
      const name = cleanName(cells[0] ?? "");
      if (!name) continue;
      hits.push({
        url: post.url.replace(/\/$/, ""),
        postDate: postDay(post.url),
        name,
        date: exactDate(cells[1] ?? ""),
        alternative: clean(cells[2] ?? ""),
      });
    }
  }
  return hits;
}

function attachProseDates(post: CopilotPost, byKey: Map<string, Built>) {
  const text = scopedText(post.html);
  for (const sentence of sentences(text)) {
    if (!/deprecat/i.test(sentence)) continue;
    if (/postponed|original deprecation|beginning today/i.test(sentence)) continue;
    const dates = sentenceDates(sentence);
    if (dates.length !== 1) continue;
    const date = dates[0];
    if (!date) continue;
    for (const built of byKey.values()) {
      if (!mentions(sentence, built.id)) continue;
      built.changelogDates.push({ date, url: post.url.replace(/\/$/, ""), postDate: postDay(post.url) });
    }
  }
}

function attachExceptions(post: CopilotPost, byKey: Map<string, Built>) {
  const text = scopedText(post.html);
  for (const sentence of exceptionSnippets(text)) {
    for (const built of byKey.values()) {
      if (!mentions(sentence, built.id)) continue;
      if (!built.exceptions.includes(sentence)) built.exceptions.push(sentence);
    }
  }
}

/**
 * Short footnote sentences. Version numbers contain periods, so a sentence ends at ". " before a capital letter.
 * A changelog table has no periods, and these patterns start at the footnote marker.
 */
function exceptionSnippets(text: string): string[] {
  const snippets: string[] = [];
  const starts = [
    ...text.matchAll(/(?:^|\s)\*\s*(?=[A-Z])/g),
    ...text.matchAll(/The (?:deprecation|retirement) of /g),
    ...text.matchAll(/Copilot still uses /g),
  ];
  for (const match of starts) {
    const from = text.slice(match.index ?? 0).replace(/^\s*\*\s*/, "");
    const sentence = from.match(/^[A-Z].{10,360}?\.(?=\s+[A-Z]|$)/)?.[0]?.trim();
    if (!sentence) continue;
    if (!/remain available|does not apply|has been postponed|code completions/i.test(sentence)) continue;
    if (/code completions/i.test(sentence) && !/still uses/i.test(sentence)) continue;
    let full = sentence;
    if (/has been postponed/i.test(full)) {
      const rest = from.slice(sentence.length);
      const date = rest.match(/^\s*The original deprecation date was \d{4}-\d{2}-\d{2}\./);
      if (date?.[0]) full = `${full} ${date[0].trim()}`;
    }
    if (full.length > 400 || snippets.includes(full)) continue;
    snippets.push(full);
  }
  return snippets;
}

function changelogShutdown(built: Built): string | null {
  const dated = [...built.changelogDates].sort(byPost);
  if (!dated.length) return null;
  return dated[dated.length - 1]?.date ?? null;
}

function chooseReplacements(
  built: Built,
  byKey: Map<string, Built>,
  spellings: Map<string, string>,
): { id: string; url: string }[] {
  const alts = [...built.changelogAlts].sort(byPost);
  const concrete = alts.flatMap((alt) => {
    const parts = splitAlternatives(alt.text);
    return parts ? [{ alt, parts }] : [];
  });
  const latest = concrete[concrete.length - 1];
  if (!latest) return [];
  const ids: { id: string; url: string }[] = [];
  for (const part of latest.parts) {
    const id = resolveId(part, byKey, spellings);
    if (!id || id === built.id || ids.some((item) => item.id === id)) continue;
    ids.push({ id, url: latest.alt.url });
  }
  return ids;
}

function resolveId(raw: string, byKey: Map<string, Built>, spellings: Map<string, string>): string {
  const key = nameKey(raw);
  return byKey.get(key)?.id ?? spellings.get(key) ?? cleanName(raw);
}

function toScraped(built: Built, checked: string): ScrapedModel {
  const shutdown = built.shutdown;
  const status = !shutdown ? "deprecated" : compareDate(shutdown, checked) < 0 ? "retired" : "deprecated";
  const notes = noteParts(built).filter(Boolean);
  const sourceUrl = built.docs ? SUPPORTED_URL : built.changelogDates.slice().sort(byPost).at(-1)?.url ?? SUPPORTED_URL;
  const sourceLabel = built.docs ? DOCS_LABEL : CHANGELOG_LABEL;
  const rowExcerpt = built.docs
    ? `${built.id} | ${shutdown ?? ""} | ${built.docsAlternative}`
    : `${built.id} | ${shutdown ?? ""}`;
  const model = baseModel({
    id: built.id,
    provider: "github-copilot",
    displayName: built.id,
    status,
    shutdown,
    kind: shutdown ? "exact" : "none",
    notes: notes.join(" ") || null,
    replacements: built.replacements.map((item) => ({
      model_id: item.id,
      provider: "github-copilot",
      kind: "official" as const,
      source_url: item.url,
    })),
    sourceUrl,
    sourceLabel,
    checked,
    excerpt: excerpt([rowExcerpt]),
  });
  const extra = new Map<string, string>();
  for (const item of built.changelogDates) extra.set(item.url, item.date);
  for (const item of built.changelogAlts) extra.set(item.url, item.text);
  for (const url of extra.keys()) {
    if (url === sourceUrl) continue;
    model.sources.push({
      url,
      label: CHANGELOG_LABEL,
      last_checked: checked,
      excerpt: excerpt([`${built.id} | ${extra.get(url) ?? ""}`]),
    });
  }
  return model;
}

function noteParts(built: Built): string[] {
  const notes: string[] = [];
  if (built.footnote) notes.push(built.footnote);
  for (const sentence of built.exceptions) {
    if (!notes.some((note) => note.includes(sentence))) notes.push(sentence);
  }
  if (built.stillListed) notes.push("The supported models table on that page still lists this name.");
  if (built.docsAlternative && splitAlternatives(built.docsAlternative) == null) {
    notes.push(`Supported models page suggested alternative: ${built.docsAlternative}.`);
  }
  const alts = [...built.changelogAlts].sort(byPost);
  const concrete = alts.flatMap((alt) => {
    const parts = splitAlternatives(alt.text);
    return parts ? [{ alt, key: parts.map((part) => nameKey(part)).sort().join("|") }] : [];
  });
  const latest = concrete[concrete.length - 1];
  if (latest) {
    const seen = new Set<string>();
    for (const item of concrete.slice(0, -1)) {
      if (item.key === latest.key || seen.has(item.alt.text)) continue;
      seen.add(item.alt.text);
      notes.push(`An earlier changelog named ${item.alt.text}: ${item.alt.url}`);
    }
  } else if (!built.docs && alts.length) {
    const last = alts[alts.length - 1];
    if (last) notes.push(`Changelog suggested alternative: ${last.text}.`);
  }
  const disagree = disagreeDates(built);
  if (disagree.length && built.docs && built.shutdown) {
    const bits = disagree.map(
      (item) => `The [GitHub changelog](${item.url}) lists deprecation date ${item.date}.`,
    );
    notes.push(
      `${SOURCES_DISAGREE} The [supported models page](${SUPPORTED_URL}) lists retirement date ${built.shutdown}. ${bits.join(" ")} The stored shutdown date is the supported models page date.`,
    );
  } else if (disagree.length && !built.docs && built.shutdown) {
    const bits = disagree.map((item) => `The [GitHub changelog](${item.url}) lists deprecation date ${item.date}.`);
    notes.push(
      `${SOURCES_DISAGREE} ${bits.join(" ")} The stored shutdown date is the latest changelog table date.`,
    );
  }
  return notes;
}

function disagreeDates(built: Built): { date: string; url: string }[] {
  if (!built.shutdown) return [];
  const byDate = new Map<string, { date: string; url: string; postDate: string }>();
  for (const item of built.changelogDates) {
    if (item.date === built.shutdown) continue;
    const prev = byDate.get(item.date);
    if (!prev || item.postDate > prev.postDate) byDate.set(item.date, item);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function addStubs(models: ScrapedModel[], byKey: Map<string, Built>, available: string[], checked: string): ScrapedModel[] {
  const ids = new Set(models.map((model) => model.id));
  const named = new Map<string, { url: string; parents: string[] }>();
  for (const model of models) {
    for (const replacement of model.replacements) {
      if (ids.has(replacement.model_id)) continue;
      const row = named.get(replacement.model_id) ?? { url: replacement.source_url, parents: [] };
      if (!row.parents.includes(model.id)) row.parents.push(model.id);
      named.set(replacement.model_id, row);
    }
  }
  const stubs: ScrapedModel[] = [];
  for (const [id, info] of [...named.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parents = [...info.parents].sort();
    const listed = available.some((name) => nameKey(name) === nameKey(id));
    const record = baseModel({
      id,
      provider: "github-copilot",
      displayName: id,
      status: "active",
      kind: "none",
      notes: [
        `Named as an official replacement for ${parents.join(", ")}.`,
        "No shutdown date was published for this name on the supported models retirement table.",
        listed ? "The supported models table lists this name." : "",
      ]
        .filter(Boolean)
        .join(" "),
      sourceUrl: info.url,
      sourceLabel: STUB_LABEL,
      checked,
      excerpt: excerpt([`Named as an official replacement for ${parents[0]}.`]),
    });
    stubs.push(record);
  }
  return [...models, ...stubs].sort((a, b) => a.id.localeCompare(b.id));
}

function findHeading($: ReturnType<typeof loadHtml>, scope: { find: (selector: string) => { toArray: () => AnyNode[] } }, title: string): AnyNode | undefined {
  for (const node of scope.find("h2").toArray()) {
    if (headingMatches($(node).text(), title)) return node;
  }
  return undefined;
}

function headingMatches(text: string, title: string): boolean {
  const value = clean(text).toLowerCase();
  const want = title.toLowerCase();
  return value === want || (value.startsWith(want) && !/[a-z]/i.test(value.charAt(want.length)));
}

function tableAfter($: ReturnType<typeof loadHtml>, heading: AnyNode): { rows: string[][]; node: AnyNode } | null {
  let node = $(heading).next();
  for (let i = 0; i < 8 && node.length; i++) {
    const table = node.is("table") ? node : node.find("table").first();
    const element = table.get(0);
    if (table.length && element) return { rows: readTable($, element), node: element };
    node = node.next();
  }
  return null;
}

function readTable($: ReturnType<typeof loadHtml>, table: AnyNode): string[][] {
  const rows: string[][] = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells: string[] = [];
      $(tr)
        .find("th, td")
        .each((__, cell) => {
          const copy = $(cell).clone();
          copy.find("sup").remove();
          cells.push(clean(copy.text()));
        });
      if (cells.some(Boolean)) rows.push(cells);
    });
  return rows;
}

function headersMatch(cells: string[], expected: string[]): boolean {
  const headers = cells.map((cell) => cell.toLowerCase());
  return expected.every((want, index) => (headers[index] ?? "").startsWith(want));
}

function footnoteIdInRow($: ReturnType<typeof loadHtml>, table: AnyNode, name: string): string {
  let found = "";
  $(table)
    .find("tr")
    .each((_, tr) => {
      if (found) return;
      const cell = $(tr).find("th, td").first();
      const copy = cell.clone();
      copy.find("sup").remove();
      if (cleanName(copy.text()) !== name) return;
      const href = cell.find("a[href*='user-content-fn-']").attr("href") ?? "";
      found = href.replace(/^#/, "");
    });
  return found;
}

function footnoteText($: ReturnType<typeof loadHtml>, id: string): string {
  const node = $(`#${cssEscape(id)}`);
  const copy = node.clone();
  copy.find("a").remove();
  return clean(copy.text()).replace(/↩/g, "").trim();
}

function cssEscape(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "\\$&");
}

function scopedText(html: string): string {
  const $ = loadHtml(html);
  const main = $(".PostContent-main").first();
  const article = main.length ? main : $("[data-article-body]").first();
  const node = article.length ? article : $("body");
  return clean(node.text());
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mentions(sentence: string, name: string): boolean {
  const candidates = [name];
  const stripped = name.replace(/^OpenAI\s+/i, "");
  if (stripped !== name) candidates.push(stripped);
  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^A-Za-z0-9.-])${escaped}(?:[^A-Za-z0-9.-]|$)`, "i").test(sentence);
  });
}

function splitAlternatives(raw: string): string[] | null {
  const text = cleanName(raw);
  if (!text || /^latest\b/i.test(text)) return null;
  if (/\bfor\b/i.test(text)) return null;
  const parts = text
    .split(/\s+\/\s+|\s+or\s+|,\s+or\s+|,\s+/)
    .map((part) => cleanName(part))
    .filter(Boolean);
  if (!parts.length) return null;
  if (parts.some((part) => part.length > 80 || /latest/i.test(part) || /\bfor\b/i.test(part))) return null;
  return parts;
}

function exactDate(raw: string): string | null {
  const text = raw.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1").replace(/\*/g, "").trim();
  if (!text || /pending/i.test(text)) return null;
  const dashed = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const parsed = parseDate(dashed ? `${dashed[1]}/${dashed[2]}/${dashed[3]}` : text);
  return parsed.kind === "exact" && parsed.date ? parsed.date : null;
}

function sentenceDates(sentence: string): string[] {
  const stripped = sentence.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
  const chunks = [
    ...stripped.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g),
    ...stripped.matchAll(/\b\d{1,2}-\d{1,2}-\d{4}\b/g),
    ...stripped.matchAll(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
    ),
  ];
  const dates = new Set<string>();
  for (const chunk of chunks) {
    const parsed = exactDate(chunk[0] ?? "");
    if (parsed) dates.add(parsed);
  }
  return [...dates];
}

function nameKey(raw: string): string {
  let text = cleanName(raw).toLowerCase();
  text = text.replace(/^openai\s+/, "");
  return NAME_ALIASES[text] ?? text;
}

function cleanName(raw: string): string {
  return clean(raw).replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}

function clean(value: string): string {
  return value
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function postDay(url: string): string {
  return url.match(/\/changelog\/(\d{4}-\d{2}-\d{2})-/)?.[1] ?? "";
}

function byPost<T extends { postDate: string; url: string }>(a: T, b: T): number {
  return a.postDate.localeCompare(b.postDate) || a.url.localeCompare(b.url);
}
