import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../src/schema.ts";
import { compareDate, parseDate } from "./lib/dates.ts";
import { excerpt } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import type { ScrapedModel } from "./lib/types.ts";

/**
 * There is no Workers AI deprecations index. The refresh reads this changelog post
 * and the Workers AI changelog. Stored sources omit /index.md.
 */
export const POST_MD_URL = "https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/index.md";
export const POST_URL = "https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/";
export const CHANGELOG_MD_URL = "https://developers.cloudflare.com/workers-ai/changelog/index.md";
export const CHANGELOG_URL = "https://developers.cloudflare.com/workers-ai/changelog/";
export const MODELS_URL = "https://developers.cloudflare.com/workers-ai/models/";
export const PRICING_URL = "https://developers.cloudflare.com/workers-ai/platform/pricing/";
export const REST_URL = "https://developers.cloudflare.com/workers-ai/get-started/rest-api/";

export const POST_FIXTURE = "snapshots/fixtures/cloudflare-workers-ai/planned-model-deprecations-2026-10-30.md";
export const CHANGELOG_FIXTURE = "snapshots/fixtures/cloudflare-workers-ai/changelog-2026-10-30.md";

/** REST path printed on the getting-started page. The model id is the last segment. */
export const CLOUDFLARE_RUN_URL = "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/";

const POST_LABEL = "Cloudflare changelog";
const CHANGELOG_LABEL = "Cloudflare Workers AI changelog";
const STUB_LABEL = "Named as an official replacement";

const ID_PATTERN = /@(?:cf|hf)\/[A-Za-z0-9][A-Za-z0-9._/-]*/g;

export interface CloudflarePages {
  post: string | null;
  changelog: string | null;
}

interface Listed {
  id: string;
  replacement: string | null;
  line: string;
}

/**
 * null means the post or the changelog was not the deprecation lists.
 * A replacement is stored only on a line that prints --> and a second model id.
 * The recommended-replacements section is not a per-model replacement.
 * -fast and -lora ids in the "remain active" list are stored as active.
 */
export function parseCloudflare(post: string, changelog: string, checked: string): ScrapedModel[] | null {
  const may30 = section(post, "#### Models deprecated on May 30, 2026", ["\n#### "]);
  const active = section(post, "#### Variants that remain active", ["\nFor the full list", "\n```"]);
  if (may30 == null || active == null) return null;
  const shutdown = headingDate(may30.heading, "Models deprecated on ");
  if (!shutdown) return null;
  const deprecated = listed(may30.body);
  const staying = listed(active.body);
  if (!deprecated || !staying || deprecated.length === 0 || staying.length === 0) return null;
  if (!deprecated.some((row) => row.replacement)) return null;
  if (new Set(deprecated.map((row) => row.id)).size !== deprecated.length) return null;
  if (new Set(staying.map((row) => row.id)).size !== staying.length) return null;
  if (staying.some((row) => row.replacement)) return null;
  if (deprecated.some((row) => staying.some((item) => item.id === row.id))) return null;

  const changelogMay = changelogMay30(changelog);
  if (!changelogMay) return null;
  const postIds = deprecated.map((row) => `${row.id}\t${row.replacement ?? ""}`).sort();
  const changelogIds = changelogMay.map((row) => `${row.id}\t${row.replacement ?? ""}`).sort();
  if (postIds.join("\n") !== changelogIds.join("\n")) return null;

  const october = octoberList(changelog);
  if (!october) return null;

  const extendedFrom = may10(post);
  const aliasSentence = post.includes("Requests will be automatically aliased to Kimi K2.6 on May 30, 2026, which has a higher price.");
  const remain = post.includes("The `-fast` and `-lora` variants of models will remain active");
  if (!remain) return null;

  const models: ScrapedModel[] = [];
  for (const row of deprecated) {
    const kimi = row.id === "@cf/moonshotai/kimi-k2.5";
    const notes = kimi
      ? kimiNote(extendedFrom, aliasSentence, row.replacement)
      : "The changelog says this model is deprecated on May 30, 2026. The same post says the -fast and -lora variants of models remain active.";
    models.push(
      baseModel({
        id: row.id,
        provider: "cloudflare-workers-ai",
        status: compareDate(shutdown, checked) < 0 ? "retired" : "deprecated",
        shutdown,
        kind: "exact",
        notes,
        replacements: row.replacement
          ? [{ model_id: row.replacement, provider: "cloudflare-workers-ai", kind: "official", source_url: POST_URL }]
          : [],
        sourceUrl: POST_URL,
        sourceLabel: POST_LABEL,
        checked,
        excerpt: excerpt([row.line.replace(/`/g, "")]),
      }),
    );
  }

  for (const row of staying) {
    models.push(
      baseModel({
        id: row.id,
        provider: "cloudflare-workers-ai",
        status: "active",
        kind: "none",
        notes: "The changelog says this -fast or -lora variant remains active. It also says LoRA models may be deprecated in the future. No shutdown date was published for this id.",
        sourceUrl: POST_URL,
        sourceLabel: POST_LABEL,
        checked,
        excerpt: excerpt([row.line.replace(/`/g, "")]),
      }),
    );
  }

  const named = new Set(models.map((model) => model.id));
  for (const row of deprecated) {
    if (!row.replacement || named.has(row.replacement)) continue;
    models.push(
      baseModel({
        id: row.replacement,
        provider: "cloudflare-workers-ai",
        status: "active",
        kind: "none",
        notes: `Named as the model that ${row.id} requests are automatically aliased to on May 30, 2026. The changelog says it has a higher price. No shutdown date was published for this id.`,
        sourceUrl: POST_URL,
        sourceLabel: STUB_LABEL,
        checked,
        excerpt: excerpt([`${row.id} --> ${row.replacement}`]),
      }),
    );
    named.add(row.replacement);
  }

  for (const row of october.rows) {
    if (named.has(row.id)) return null;
    models.push(
      baseModel({
        id: row.id,
        provider: "cloudflare-workers-ai",
        status: compareDate(october.date, checked) < 0 ? "retired" : "deprecated",
        shutdown: october.date,
        kind: "exact",
        notes: `The Workers AI changelog says this model is being deprecated on ${october.label}. The same sentence recommends newer models such as Llama 4 and gpt-oss. It does not name one replacement id for this model.`,
        sourceUrl: CHANGELOG_URL,
        sourceLabel: CHANGELOG_LABEL,
        checked,
        excerpt: excerpt([row.line.trim()]),
      }),
    );
  }

  if (models.some((model) => /[—–]/.test(JSON.stringify(model)))) return null;
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * null means keep the stored Cloudflare Workers AI rows.
 */
export function assembleCloudflare(
  pages: CloudflarePages,
  checked: string,
  previous: ModelRecord[] = [],
): ScrapedModel[] | null {
  if (!pages.post || !pages.changelog) return null;
  const next = parseCloudflare(pages.post, pages.changelog, checked);
  if (next == null || next.length === 0) return null;
  const stored = previous.filter((model) => model.provider === "cloudflare-workers-ai");
  const nextIds = new Set(next.map((model) => model.id));
  const upcomingGone = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked && !nextIds.has(model.id));
  if (upcomingGone.length) return null;
  const prevUpcoming = stored.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  const nextUpcoming = next.filter((model) => model.shutdown_date && model.shutdown_date >= checked);
  if (prevUpcoming.length > 0 && nextUpcoming.length < prevUpcoming.length * 0.7) return null;
  if (stored.length > 0 && next.length < stored.length * 0.7) return null;
  return next;
}

export async function loadCloudflarePages(options: {
  fromSnapshots: boolean;
  checked: string;
  root: string;
}): Promise<CloudflarePages> {
  const post = await readPage(options, POST_MD_URL, POST_FIXTURE, "planned-model-deprecations");
  const changelog = await readPage(options, CHANGELOG_MD_URL, CHANGELOG_FIXTURE, "changelog");
  return { post, changelog };
}

function kimiNote(extendedFrom: string | null, aliasSentence: boolean, replacement: string | null): string {
  const extended = extendedFrom
    ? `The changelog says Kimi K2.5 was first scheduled for ${extendedFrom}, and the deprecation date was extended to May 30, 2026. `
    : "The changelog says Kimi K2.5 is deprecated on May 30, 2026. ";
  const alias = aliasSentence && replacement
    ? `Requests are automatically aliased to ${replacement} on May 30, 2026. That model has a higher price.`
    : "";
  return `${extended}${alias}`.trim();
}

function may10(post: string): string | null {
  const match = post.match(/would be deprecated on ([A-Za-z]+ \d{1,2}, \d{4})/);
  if (!match?.[1]) return null;
  const parsed = parseDate(match[1]);
  return parsed.date && parsed.kind === "exact" ? match[1] : null;
}

function headingDate(heading: string, prefix: string): string | null {
  const text = heading.replace(/^#+\s*/, "");
  if (!text.startsWith(prefix)) return null;
  const parsed = parseDate(text.slice(prefix.length));
  if (!parsed.date || parsed.kind !== "exact") return null;
  return parsed.date;
}

function changelogMay30(page: string): Listed[] | null {
  const start = page.indexOf("On May 30, 2026, the following models will be deprecated:");
  if (start < 0) return null;
  const rest = page.slice(start);
  const end = rest.search(/\n- The `-fast` and `-lora` variants/);
  if (end < 0) return null;
  return listed(rest.slice(0, end));
}

function octoberList(page: string): { date: string; label: string; rows: Listed[] } | null {
  const marker = "being deprecated on ";
  const start = page.indexOf(marker);
  if (start < 0) return null;
  const sentence = page.slice(start, page.indexOf("\n", start));
  const dated = sentence.match(/being deprecated on ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/);
  if (!dated?.[1]) return null;
  const label = dated[1].replace(/(\d)(?:st|nd|rd|th)/, "$1");
  const parsed = parseDate(label);
  if (!parsed.date || parsed.kind !== "exact") return null;
  const blockStart = page.indexOf("\n", start);
  const next = page.indexOf("\n## ", blockStart);
  if (blockStart < 0 || next < 0) return null;
  const rows = listed(page.slice(blockStart, next));
  if (!rows || rows.length === 0 || rows.some((row) => row.replacement)) return null;
  return { date: parsed.date, label, rows };
}

function section(page: string, heading: string, ends: string[]): { heading: string; body: string } | null {
  const start = page.indexOf(heading);
  if (start < 0) return null;
  const after = start + heading.length;
  let next = -1;
  for (const end of ends) {
    const found = page.indexOf(end, after);
    if (found >= 0 && (next < 0 || found < next)) next = found;
  }
  if (next < 0) return null;
  return { heading, body: page.slice(after, next) };
}

function listed(block: string): Listed[] | null {
  const rows: Listed[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) continue;
    const ids = [...trimmed.matchAll(ID_PATTERN)].map((match) => match[0]);
    if (ids.length === 0) continue;
    const arrow = trimmed.includes("-->");
    if (arrow && ids.length !== 2) return null;
    if (!arrow && ids.length !== 1) return null;
    rows.push({ id: ids[0] ?? "", replacement: arrow ? (ids[1] ?? null) : null, line: trimmed });
  }
  return rows;
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
    const dir = path.join(options.root, "snapshots", "cloudflare-workers-ai");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}-${options.checked}.md`), body);
    return body;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}
