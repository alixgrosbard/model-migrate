import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { modelSchema, type ModelRecord } from "../schema.ts";
import { aliasIdOf, aliasSnapshotView, applyAliasSnapshotShutdowns, isDeprecationsSource } from "./aliases.ts";
import type { GuidePage } from "./guides.ts";
import { publishedReplacementIds, longDate } from "./shutdowns.ts";

const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";

/** Checked against the OpenAI rows. The slug uses this date. */
export const DECEMBER_11_SHUTDOWN_DATE = "2026-12-11";
export const DECEMBER_11_GUIDE_SLUG = "openai-december-11-2026-shutdowns";

/** Checked against the OpenAI rows. The slug uses this date. */
export const JANUARY_2027_SHUTDOWN_DATE = "2027-01-14";
export const JANUARY_2027_GPT4_GUIDE_SLUG = "openai-gpt-4-1-gpt-4o-shutdown-january-2027";

/** Longer ids first so a mini alias is not treated as the shorter one. */
const JANUARY_ALIASES = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o", "gpt-4.1"] as const;

const ACCESSIBLE =
  "At the time of the shut down, the model or endpoint will no longer be accessible.";
const JUNE_11_NOTICE =
  "On June 11, 2026, we notified developers using older GPT-5 and o3 model snapshots of their deprecation and removal from the API on December 11, 2026.";
const OCTOBER_14_NOTICE =
  "On October 14, 2026, we notified developers using certain GPT-4 series models of their deprecation and removal from the API on January 14, 2027.";
const FINE_TUNES =
  "Fine-tuned versions of these models follow the same shutdown schedule as their underlying base models.";

let catalogCache: ModelRecord[] | undefined;

function readCatalog(): ModelRecord[] {
  if (catalogCache) return catalogCache;
  const dir = path.join(process.cwd(), "data/models");
  const models: ModelRecord[] = [];
  if (!existsSync(dir)) {
    catalogCache = models;
    return models;
  }
  for (const provider of readdirSync(dir)) {
    const folder = path.join(dir, provider);
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      models.push(modelSchema.parse(JSON.parse(readFileSync(path.join(folder, file), "utf8"))));
    }
  }
  catalogCache = applyAliasSnapshotShutdowns(
    models.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id)),
  );
  return catalogCache;
}

export function isDecember11OpenAiShutdown(model: ModelRecord): boolean {
  return model.provider === "openai"
    && model.shutdown_date === DECEMBER_11_SHUTDOWN_DATE
    && (model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "via_snapshots");
}

export function isJanuary2027Gpt4Shutdown(model: ModelRecord): boolean {
  if (model.provider !== "openai" || model.shutdown_date !== JANUARY_2027_SHUTDOWN_DATE) return false;
  if (model.shutdown_date_kind !== "exact" && model.shutdown_date_kind !== "via_snapshots") return false;
  if ((JANUARY_ALIASES as readonly string[]).includes(model.id)) return true;
  const alias = aliasIdOf(model.id);
  return alias !== null && (JANUARY_ALIASES as readonly string[]).includes(alias);
}

function modelLink(model: ModelRecord): string {
  return `[${model.id}](/models/${model.provider}/${model.slug}/)`;
}

function replacementText(model: ModelRecord, catalog: ModelRecord[]): string {
  const ids = publishedReplacementIds(model);
  if (!ids.length) return "Not published";
  const excerpt = model.sources.find(isDeprecationsSource)?.excerpt ?? "";
  return ids.map((id) => {
    const target = catalog.find((item) => item.provider === model.provider && item.id === id)
      ?? catalog.find((item) => item.id === id);
    const label = target ? `[${id}](/models/${target.provider}/${target.slug}/)` : id;
    const note = excerpt.includes(`${id} (reasoning.mode: pro)`) ? " (reasoning.mode: pro)" : "";
    return `${label}${note}`;
  }).join(", ");
}

function shutdownCell(model: ModelRecord): string {
  if (!model.shutdown_date) return "Not published";
  if (model.shutdown_date_kind === "via_snapshots") return `Snapshots retire ${model.shutdown_date}`;
  return model.shutdown_date;
}

function deprecationCell(model: ModelRecord): string {
  return model.deprecation_date ?? "Not published";
}

function newestDeprecationsCheck(rows: ModelRecord[]): string {
  const days = rows.flatMap((model) => model.sources.filter(isDeprecationsSource).map((source) => source.last_checked));
  return days.sort().at(-1) ?? rows.flatMap((model) => model.sources.map((source) => source.last_checked)).sort().at(-1) ?? DECEMBER_11_SHUTDOWN_DATE;
}

function searchCode(rows: ModelRecord[]): string {
  const flags = rows.map((model) => `-e '${model.id}'`).join(" ");
  return `rg -n -w ${flags}\n`;
}

function rowsFor(predicate: (model: ModelRecord) => boolean, catalog: ModelRecord[]): ModelRecord[] {
  return catalog.filter(predicate).sort((a, b) => a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug));
}

function tableRows(rows: ModelRecord[], catalog: ModelRecord[]): string[][] {
  return rows.map((model) => [
    modelLink(model),
    deprecationCell(model),
    shutdownCell(model),
    replacementText(model, catalog),
  ]);
}

function idList(rows: ModelRecord[]): string {
  return rows.map((model) => model.id).join(", ");
}

function replacementFaq(rows: ModelRecord[], catalog: ModelRecord[]): string {
  const lines = rows.map((model) => `${model.id}: ${replacementText(model, catalog)}`);
  return `The recommended replacement is the official replacement stored on each row. ${lines.join(". ")}.`;
}

function deprecationFaq(rows: ModelRecord[]): string {
  const dated = rows.filter((model) => model.deprecation_date);
  if (!dated.length) return "No deprecation_date is stored on these rows. The table says Not published.";
  return dated.map((model) => `${model.id}: ${model.deprecation_date}`).join(". ");
}

/**
 * Guide pages whose tables are filled from the model records.
 * A guide is omitted when the filter matches no rows.
 */
export function datasetShutdownGuides(catalog: ModelRecord[] = readCatalog()): GuidePage[] {
  const pages: GuidePage[] = [];
  const december = rowsFor(isDecember11OpenAiShutdown, catalog);
  if (december.length) pages.push(decemberGuide(december, catalog));
  const january = rowsFor(isJanuary2027Gpt4Shutdown, catalog);
  if (january.length) pages.push(januaryGuide(january, catalog));
  const slugs = new Set(pages.map((page) => page.slug));
  for (const page of pages) {
    page.related = page.related.filter((link) => {
      const slug = link.href.split("/")[2];
      if (slug !== DECEMBER_11_GUIDE_SLUG && slug !== JANUARY_2027_GPT4_GUIDE_SLUG) return true;
      return slugs.has(slug);
    });
  }
  return pages;
}

function decemberGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(DECEMBER_11_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const via = rows.some((model) => model.shutdown_date_kind === "via_snapshots");
  return {
    slug: DECEMBER_11_GUIDE_SLUG,
    title: `OpenAI models shutting down on ${when} | SunsetDiff`,
    description: `OpenAI model ids in the SunsetDiff dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}, the stored replacement, and what the deprecations page says happens that day.`,
    h1: `OpenAI models shutting down on ${when}`,
    summary: `Every OpenAI id in the dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}, plus the stored replacement.`,
    answer: `The dataset has ${rows.length} OpenAI model ids with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}. OpenAI's deprecations page says: "${ACCESSIBLE}" The replacement column is the official replacement stored on each row.`,
    checked,
    steps: [
      {
        name: "Read the ids",
        text: `The table lists every OpenAI id in the dataset whose shutdown date is ${DECEMBER_11_SHUTDOWN_DATE}. Open the model page on that row before you change a call.`,
      },
      {
        name: "Find them in your code",
        text: "Search the repository for those ids. Also call GET /v1/models and read shutdown_date. A value that lives only in a host dashboard will not show up in git.",
      },
      {
        name: "Test the replacement",
        text: `Call the replacement id from the same row with the prompts you use now. Do that before ${when}. Then change the id your app sends.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every OpenAI model in the dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          via
            ? "Snapshots retire means shutdown_date_kind is via_snapshots. That date is the latest dated snapshot on the deprecations page. The alias id itself is not listed by name."
            : `The newest deprecations source on these rows was checked ${checked}.`,
          `OpenAI's deprecations page says: "${JUNE_11_NOTICE}"`,
        ],
        table: {
          caption: `${rows.length} OpenAI model ids with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the table. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call the replacement id from the table with the same prompts you send today. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2026-12-11/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`, label: "GPT-4.1 and GPT-4o shutdown in January 2027" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which OpenAI model ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Is a deprecation date stored?",
        answer: deprecationFaq(rows),
      },
    ],
    citations: [OPENAI_DEPRECATIONS],
  };
}

function januaryGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(JANUARY_2027_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const aliasNotes = rows.flatMap((model) => {
    const view = aliasSnapshotView(model, catalog);
    return view ? [`${model.id}: ${view.label}`] : [];
  });
  return {
    slug: JANUARY_2027_GPT4_GUIDE_SLUG,
    title: `GPT-4.1 and GPT-4o shutdown on ${when} | SunsetDiff`,
    description: `gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, and their dated snapshots in the dataset with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}, plus the stored replacement.`,
    h1: `GPT-4.1 and GPT-4o shutdown on ${when}`,
    summary: `The gpt-4o and gpt-4.1 aliases and dated snapshots whose stored shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}.`,
    answer: `The dataset has ${rows.length} gpt-4o, gpt-4o-mini, gpt-4.1, and gpt-4.1-mini ids, including dated snapshots, with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}. A row that says Snapshots retire is an alias. The deprecations page lists the dated snapshots, and the alias id itself is not listed by name. The replacement column is the official replacement stored on each row. OpenAI's deprecations page says: "${ACCESSIBLE}"`,
    checked,
    steps: [
      {
        name: "Read the ids",
        text: `The table lists gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, and their dated snapshots when the stored shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}. A dated snapshot with a different shutdown date is not in this table.`,
      },
      {
        name: "Find them in your code",
        text: "Search the repository for the alias and for the dated snapshot. Also call GET /v1/models and read shutdown_date.",
      },
      {
        name: "Test the replacement",
        text: `Call the replacement id from the same row with the prompts you use now. Do that before ${when}. Then change the id your app sends.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the gpt-4o, gpt-4o-mini, gpt-4.1, and gpt-4.1-mini ids in the dataset, and the dated snapshots of those ids, whose shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          "Snapshots retire means shutdown_date_kind is via_snapshots. That date is the latest dated snapshot on the deprecations page. The alias id itself is not listed by name.",
          `OpenAI's deprecations page says: "${OCTOBER_14_NOTICE}"`,
        ],
        table: {
          caption: `${rows.length} gpt-4o and gpt-4.1 ids with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Alias ids when the snapshots shut down",
        paragraphs: [
          ...aliasNotes,
          `OpenAI's deprecations page says: "${FINE_TUNES}"`,
          `The same page says: "${ACCESSIBLE}"`,
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the alias and for each dated snapshot in the table. A short alias can sit in a different file from the dated id. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call the replacement id from the table with the same prompts you send today. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2027-01-14/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${DECEMBER_11_GUIDE_SLUG}/`, label: "OpenAI shutdowns on December 11, 2026" },
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Model aliases vs pinned snapshots" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which ids are in the ${when} table?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}. Alias rows say Snapshots retire ${JANUARY_2027_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does the deprecations page say about the alias ids?",
        answer: aliasNotes.length
          ? `${aliasNotes.join(" ")} The same page says: "${FINE_TUNES}"`
          : `The same page says: "${FINE_TUNES}"`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Is a deprecation date stored?",
        answer: deprecationFaq(rows),
      },
    ],
    citations: [OPENAI_DEPRECATIONS],
  };
}
