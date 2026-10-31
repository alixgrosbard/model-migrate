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

/** Checked against the MiniMax rows. The slug uses this date. */
export const MINIMAX_NOV18_SHUTDOWN_DATE = "2026-11-18";
export const MINIMAX_NOV18_GUIDE_SLUG = "minimax-m2-5-m2-7-shutdown-november-18-2026";

/** Checked against the Bedrock legacy lifecycle page. The slug uses this date. */
export const BEDROCK_NOV13_SHUTDOWN_DATE = "2026-11-13";
export const BEDROCK_NOV13_GUIDE_SLUG = "amazon-bedrock-claude-3-shutdown-november-13-2026";

const MINIMAX_MODELS = "https://platform.minimax.io/docs/faq/models";
const MINIMAX_TEXT = "https://platform.minimax.io/docs/guides/text-generation";
const MINIMAX_NEW_USERS = "These models will no longer be available to new users.";
const MINIMAX_RETIRED = "These models will be retired.";
const MINIMAX_STOP = "Once retired, API requests to these models will no longer work.";
const MINIMAX_ROUTE = "Starting October 19, 2026, all requests to M2.5 and M2.7 models under these plans will automatically be routed to M3.1 Flash.";
const MINIMAX_NAMES = "Existing model names will continue to work for backward compatibility, so you won’t need to update the model names in your requests.";
const MINIMAX_ALLOWANCES = "Your plan’s usage allowances will remain unchanged.";
const MINIMAX_TABLE = "The following models have been retired and are no longer available.";
const MINIMAX_THINKING = 'model "MiniMax-M3.1-Flash" requires adaptive thinking';

const BEDROCK_LEGACY = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";
const BEDROCK_HAIKU_CARD = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html";
const BEDROCK_REGIONS = "https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html";
const BEDROCK_LIMITED = "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-limited-model-selection.html";
const CLAUDE_VERSIONING = "https://platform.claude.com/docs/en/api/versioning";
const SONNET_MIGRATION = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const ISSUE_AGENT_SQUAD = "https://github.com/2FastLabs/agent-squad/issues/721";
const ISSUE_CLAUDE_CODE_ACTION = "https://github.com/anthropics/claude-code-action/issues/1850";
const BEDROCK_HAIKU_US = "us.anthropic.claude-3-haiku-20240307-v1:0";
const BEDROCK_HAIKU_EU = "eu.anthropic.claude-3-haiku-20240307-v1:0";
const BEDROCK_V2_US = "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
const BEDROCK_V2_GLOBAL = "global.anthropic.claude-3-5-sonnet-20241022-v2:0";
const BEDROCK_EOL_ERROR = "ResourceNotFoundException: This model version has reached the end of its life.";
const BEDROCK_EOL_LONGER =
  "404 ResourceNotFoundException: This model version has reached the end of its life. Please refer to the AWS documentation for more details.";
const BEDROCK_MIGRATE =
  "You will need to migrate to the latest model by updating your application code before the EOL date. Migration will not happen automatically.";
const BEDROCK_ONLY_DATES = "For Amazon Bedrock usage, only the dates on this page apply.";
const BEDROCK_REGION_SPLIT =
  "Model lifecycle state can differ by AWS Region. The Regions column in the following tables lists only the Regions covered by a model's announced EOL date.";
const BEDROCK_FAIL =
  "On, or soon after the EOL date, the model is no longer available for use in all AWS Regions and requests made to this version will fail, unless there is a private arrangement between you and the provider for continued access.";
const BEDROCK_LEGACY_ACCESS =
  "New customers can't use Legacy models and existing customers may lose access to Legacy models after 15 days of inactivity.";
const BEDROCK_NO_THROUGHPUT = "You can't create a new Provisioned Throughput for models in the Legacy state.";
const BEDROCK_PROFILE_GAP =
  "When a model reaches its End-of-Life date, it's no longer available through the inference profile. A replacement model might not be offered through the same inference profile for you to migrate to.";
const BEDROCK_HAIKU_NOW =
  "Claude 3 Haiku reached end of life on September 10, 2026 in most Regions, where requests now fail with ResourceNotFoundException: This model version has reached the end of its life.";
const BEDROCK_HAIKU_LATER =
  "These Regions have an upcoming end of life of November 13, 2026, after which requests in these Regions will also fail.";
const BEDROCK_VERSIONING =
  "On Amazon Bedrock, it's available for Claude 4.7 and later models. For other models on Bedrock, see the migration guide.";
const AGENT_SQUAD_DEFAULT =
  "Since BedrockClassifier is the orchestrator's default classifier, a default setup in us-east-1 fails.";

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

export function isMinimaxNov18Shutdown(model: ModelRecord): boolean {
  return model.provider === "minimax"
    && model.shutdown_date === MINIMAX_NOV18_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockNov13Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && model.shutdown_date === BEDROCK_NOV13_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
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
  const minimax = rowsFor(isMinimaxNov18Shutdown, catalog);
  if (minimax.length) pages.push(minimaxGuide(minimax, catalog));
  const bedrock = rowsFor(isBedrockNov13Shutdown, catalog);
  if (bedrock.length) pages.push(bedrockGuide(bedrock, catalog));
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

function minimaxGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(MINIMAX_NOV18_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  return {
    slug: MINIMAX_NOV18_GUIDE_SLUG,
    title: `MiniMax M2.5 and M2.7 shutdown on ${when} | SunsetDiff`,
    description: `MiniMax-M2.5, MiniMax-M2.5-highspeed, MiniMax-M2.7, and MiniMax-M2.7-highspeed shut down on ${MINIMAX_NOV18_SHUTDOWN_DATE}. The model list names M3.1 Flash. Pay-as-you-go requests stop. M Plan and Token Plan requests are routed.`,
    h1: `MiniMax M2.5 and M2.7 shutdown on ${when}`,
    summary: `The four MiniMax ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}, the stored replacement, and what the model list says happens to each plan.`,
    answer: `The dataset has ${rows.length} MiniMax ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}: MiniMax-M2.5, MiniMax-M2.5-highspeed, MiniMax-M2.7, and MiniMax-M2.7-highspeed. The model list says new users lose them on October 19, 2026, and the models are retired on ${when}. Pay-as-you-go API requests stop working once they are retired. M Plan and Token Plan requests are routed to M3.1 Flash, and the old names keep working. The stored replacement on each row is MiniMax-M3.1-Flash.`,
    checked,
    steps: [
      {
        name: "Read the four ids",
        text: `The table lists every MiniMax id in the dataset whose shutdown date is ${MINIMAX_NOV18_SHUTDOWN_DATE}. Open the model page before you change a call. MiniMax-M2, MiniMax-M2.1, and the music rows are not in this table. Those rows have no shutdown date.`,
      },
      {
        name: "Sort the plan",
        text: "Pay-as-you-go calls to these ids stop on the retirement date. M Plan and Token Plan calls are routed to M3.1 Flash from October 19, 2026, and the model list says the existing names keep working. Find which plan sends the traffic before you decide whether the old id can stay.",
      },
      {
        name: "Send MiniMax-M3.1-Flash",
        text: `Change the model field to MiniMax-M3.1-Flash and call it with the prompts you use now. Do that before ${when}. The text generation guide says thinking cannot be turned off on that id.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every MiniMax model in the dataset with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          `MiniMax's model list says: "${MINIMAX_NEW_USERS}" The date on that line is October 19, 2026. The next line says: "${MINIMAX_RETIRED}" The date on that line is ${when}.`,
          `The same page's Retired Models table lists these four ids as Retired, and it says: "${MINIMAX_TABLE}" SunsetDiff still stores them as deprecated with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}, because the notice gives that future date for this family. Older ids in that table, including MiniMax-M2 and MiniMax-M2.1, are stored as retired with no shutdown date. The page does not print a date for them.`,
        ],
        table: {
          caption: `${rows.length} MiniMax model ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "MiniMax model list", url: MINIMAX_MODELS }],
      },
      {
        heading: "What changes when you switch",
        paragraphs: [
          `For pay-as-you-go, the model list says: "${MINIMAX_STOP}" Change the model field to MiniMax-M3.1-Flash before ${when}. The text generation guide's OpenAI-compatible host is https://api.minimax.io/v1 and the chat path is https://api.minimax.io/v1/chat/completions. Its Anthropic-compatible host is https://api.minimax.io/anthropic.`,
          `For M Plan and Token Plan, the model list says: "${MINIMAX_ROUTE}" It also says: "${MINIMAX_NAMES}" And: "${MINIMAX_ALLOWANCES}" The old id can keep working on those plans because MiniMax routes it. A pay-as-you-go call does not get that route.`,
          "The text generation guide calls MiniMax-M3.1-Flash the latest M-series language model for agentic reasoning, tool use, coding, and long-context tasks, and says it supports tuning thinking depth with effort. The supported-models table lists a context window of 1,000,000 for MiniMax-M3.1-Flash and for MiniMax-M3. The model list does not print a context window or a price for the M2.5 and M2.7 ids. This page does not state what those ids used to accept.",
          `The same guide says thinking cannot be turned off. Sending thinking type disabled, or effort none, returns 400. The page prints: ${MINIMAX_THINKING}. On the OpenAI-compatible API the depth field is reasoning_effort. On the Anthropic-compatible API it is output_config.effort. The values are low, medium, high, xhigh, and max. Omitting effort defaults to max for MiniMax-M3.1-Flash. Thinking content on the OpenAI-compatible API is returned on reasoning_content. The answer is on content.`,
        ],
        codes: [
          {
            caption: "OpenAI-compatible, model field only",
            code: `from openai import OpenAI
client = OpenAI(base_url="https://api.minimax.io/v1")
response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    messages=[{"role": "user", "content": "Hi, how are you?"}],
)
`,
          },
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these four ids reach the shutdown date stored in the dataset. For pay-as-you-go, the model list says API requests to these models will no longer work. It does not print an HTTP status for that moment.`,
          "M Plan and Token Plan requests are a different case. The model list says those requests are routed to M3.1 Flash and the existing model names keep working. A call that still sends MiniMax-M2.5 on those plans is not the same failure as a pay-as-you-go call after the retirement date.",
          `The text generation guide's 400, ${MINIMAX_THINKING}, is what MiniMax-M3.1-Flash returns when thinking is disabled. That is a request-shape failure on the replacement, not the retirement itself.`,
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the four ids in the table. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "MiniMax-M2 and MiniMax-M2.1 are older ids. They are stored as retired with no shutdown date. A search that only looks for M2.5 and M2.7 will miss them, and a search for M2 will also hit M2.5. Read the id on the row.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "MiniMax model list", url: MINIMAX_MODELS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `Call MiniMax-M3.1-Flash with the prompts you send today. Do that before ${when}. If you use M Plan or Token Plan, the model list says the old names keep working because of the route. Still run the new id once, so you see thinking content and the 400 that disabling thinking returns.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. This dataset does not store a price for these MiniMax rows.",
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/minimax-2026-11-18/", label: `MiniMax shutdowns on ${when}` },
      { href: "/providers/minimax/", label: "MiniMax provider page" },
      { href: "/models/minimax/minimax-m3-1-flash/", label: "MiniMax-M3.1-Flash" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
      { href: MINIMAX_TEXT, label: "MiniMax text generation" },
    ],
    faqs: [
      {
        question: `Which MiniMax ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. MiniMax-M2, MiniMax-M2.1, MiniMax-M2.1-highspeed, and M2-her are not in that list. They are stored as retired with no shutdown date.`,
      },
      {
        question: "What does MiniMax say happens on that date?",
        answer: `The model list says: "${MINIMAX_RETIRED}" The date is ${when}. For pay-as-you-go it says: "${MINIMAX_STOP}" It does not print an HTTP status.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Do M Plan and Token Plan requests stop on that date?",
        answer: `The model list says: "${MINIMAX_ROUTE}" It also says: "${MINIMAX_NAMES}" And: "${MINIMAX_ALLOWANCES}" Pay-as-you-go requests are the ones that stop.`,
      },
      {
        question: "Why does the Retired Models table list these ids before November 18?",
        answer: `The model list's Retired Models table includes the four November 18 ids and says: "${MINIMAX_TABLE}" The retirement notice on the same page gives ${when} for the M2.5 and M2.7 family, and October 19, 2026 as the day new users lose them. SunsetDiff keeps the November 18 ids in the deprecated table until that date. Older ids in the Retired Models table have no printed shutdown date, so they stay in the retired table.`,
      },
      {
        question: "What changes in the request besides the model id?",
        answer: `The text generation guide says MiniMax-M3.1-Flash has a 1,000,000-token context window and tunable thinking depth. Thinking cannot be turned off. The page prints this 400: ${MINIMAX_THINKING}. The OpenAI-compatible field is reasoning_effort. The Anthropic-compatible field is output_config.effort. Allowed values are low, medium, high, xhigh, and max. Omitting effort defaults to max. The model list does not print those fields for the M2.5 and M2.7 ids.`,
      },
    ],
    citations: [MINIMAX_MODELS, MINIMAX_TEXT],
  };
}

function bedrockTable(rows: ModelRecord[], catalog: ModelRecord[]): string[][] {
  return rows.map((model) => [
    modelLink(model),
    deprecationCell(model),
    shutdownCell(model),
    model.region_or_platform_notes ?? "Not published",
    replacementText(model, catalog),
  ]);
}

function bedrockSearch(ids: string[]): string {
  const unique = [...new Set(ids)];
  return `rg -n -w ${unique.map((id) => `-e '${id}'`).join(" ")}\n`;
}

function bedrockGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_NOV13_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const earlier = catalog
    .filter((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-3-haiku-20240307-v1:0" && !isBedrockNov13Shutdown(model))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
    { label: "Regional availability by models", url: BEDROCK_REGIONS },
    { label: "Inference profiles with limited model selection", url: BEDROCK_LIMITED },
  ];
  return {
    slug: BEDROCK_NOV13_GUIDE_SLUG,
    title: `Amazon Bedrock Claude 3 shutdown on ${when} | SunsetDiff`,
    description: `Bedrock Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet reach end of life on ${BEDROCK_NOV13_SHUTDOWN_DATE} in the Regions on the lifecycle page. AWS does not name a replacement model ID.`,
    h1: `Amazon Bedrock Claude 3 shutdown on ${when}`,
    summary: `The Bedrock ids in the dataset with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}, the Regions stored on each row, and the inference profile ids the Claude 3 Haiku model card prints.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}: Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet. The lifecycle page lists that end of life only for the Regions on each row. Claude 3 Haiku already reached end of life on September 10, 2026 in other Regions, including us-east-1. The replacement field on every row is empty. The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID.`,
    checked,
    steps: [
      {
        name: "Read the ids and the Regions",
        text: `The first table is every Bedrock id in the dataset whose shutdown date is ${BEDROCK_NOV13_SHUTDOWN_DATE}. The Regions column is the note stored from the lifecycle page. A Region that is not on that row keeps its own date. Open the model page before you change a call.`,
      },
      {
        name: "Find hardcoded ids and hidden defaults",
        text: "Search your repository for the bare model ids and for the cross-Region ids below. Also check SDK defaults, framework classifiers, orchestrators, and agent configs. A library can send an id you never wrote down.",
      },
      {
        name: "Swap the id and check the new request",
        text: "Put the id you will call into the modelId field. AWS does not name a replacement on the lifecycle page. On a newer Claude model, check temperature, top_p, and top_k before you assume the old request still works.",
      },
      {
        name: "Test before the date",
        text: `Call that id from the Region you use, with the prompts you send now. Do that before ${when} for a row that is still ahead. Claude 3 Haiku in the September 10, 2026 Regions is already past end of life.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Amazon Bedrock model in the dataset with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. That note can list more than one Legacy date. The replacement column is the official replacement stored on the row. Not published means the field is empty.`,
          `The lifecycle page says: "${BEDROCK_ONLY_DATES}" It also says: "${BEDROCK_REGION_SPLIT}" To check the Region you call, use ListFoundationModels or GetFoundationModel and read modelLifecycle.`,
          `The same page says: "${BEDROCK_MIGRATE}" The recommended replacement on each row is Not published because the stored replacements list is empty. This guide does not fill one in.`,
        ],
        table: {
          caption: `${rows.length} Bedrock model ids with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
          rows: bedrockTable(rows, catalog),
        },
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "Regions that already reached end of life",
        paragraphs: [
          "Claude 3 Haiku uses one model id on two dataset rows. The row above is the November 13, 2026 Regions. The row below is the Regions whose shutdown date is already past.",
          `The Claude 3 Haiku model card says: "${BEDROCK_HAIKU_NOW}" It then names ap-northeast-2, ap-south-1, ap-southeast-1, ca-central-1, eu-central-2, and sa-east-1 as still in Legacy, and says: "${BEDROCK_HAIKU_LATER}"`,
          "The same card's sample code still sends anthropic.claude-3-haiku-20240307-v1:0 with region_name us-east-1. The card says that Region reached end of life on September 10, 2026.",
        ],
        table: earlier.length
          ? {
              caption: "Claude 3 Haiku rows in the dataset whose shutdown date is not November 13, 2026.",
              headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
              rows: bedrockTable(earlier, catalog),
            }
          : undefined,
        sources: [
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Cross-Region inference profile ids",
        paragraphs: [
          `The dataset stores the in-Region model ids. It does not store a us. or eu. prefix. The Claude 3 Haiku model card prints two geo inference ids and says the global inference id is N/A. Geo, US: ${BEDROCK_HAIKU_US}. Geo, EU: ${BEDROCK_HAIKU_EU}. The card's regional table marks Geo end of life on September 10, 2026 for the US and EU source Regions it lists. Those prefixed ids are not a November 13 id.`,
          "The card says this model is offered through inference profiles with limited model selection. The limited model selection page lists ca-central-1, ca-west-1, ap-northeast-2, ap-southeast-1, eu-west-2, eu-central-2, and sa-east-1. Several of those codes are also on the November 13 rows. ap-south-1 is on the November 13 rows and is not in that limited-selection table.",
          `That page says: "${BEDROCK_PROFILE_GAP}"`,
          `The regional availability page uses Claude 3.5 Sonnet v2 as the modelId format example. It prints anthropic.claude-3-5-sonnet-20241022-v2:0, ${BEDROCK_V2_US}, and ${BEDROCK_V2_GLOBAL}. That row shows the shape of an id. It is not a list of profiles that are still offered, and the dataset does not store the prefixed ids. Models at a glance does not link a model card for Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, or Claude 3.7 Sonnet, so this guide does not invent geo or global ids for them.`,
        ],
        table: {
          caption: "Inference ids printed on the Claude 3 Haiku model card.",
          headers: ["ID kind", "ID"],
          rows: [
            ["In-Region model ID", "anthropic.claude-3-haiku-20240307-v1:0"],
            ["Geo inference ID, US", BEDROCK_HAIKU_US],
            ["Geo inference ID, EU", BEDROCK_HAIKU_EU],
            ["Global inference ID", "N/A"],
          ],
        },
        sources: [
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Inference profiles with limited model selection", url: BEDROCK_LIMITED },
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
        ],
      },
      {
        heading: "What the regional availability page prints",
        paragraphs: [
          `The lifecycle page is the source for the dates in the tables above. On the same day, the regional availability page does not print ${BEDROCK_NOV13_SHUTDOWN_DATE} for Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, or Claude 3.7 Sonnet. The cells it fills for those names say EOL: 2026-07-30.`,
          "For Claude 3 Haiku, that page prints EOL: 2026-11-13 in the In-Region column for ap-northeast-2, ap-south-1, and ap-southeast-1. It prints EOL: 2026-09-10 for the Regions that already ended. ca-central-1, eu-central-2, and sa-east-1 are blank on that Haiku table. The lifecycle page and the Haiku model card still name November 13, 2026 for those three Regions.",
          `The lifecycle page says: "${BEDROCK_ONLY_DATES}" Call GetFoundationModel in the Region you use and read modelLifecycle before you treat a blank cell as still active.`,
        ],
        sources: [
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `The lifecycle page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name.`,
          `The Claude 3 Haiku model card does. It says requests in most Regions now fail with ${BEDROCK_EOL_ERROR} The full page is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/). The card's November 13 sentence says requests in the remaining Regions will also fail. It does not repeat the exception name on that sentence.`,
          `GitHub issue [anthropics/claude-code-action#1850](${ISSUE_CLAUDE_CODE_ACTION}) records a Converse call in us-west-2 for anthropic.claude-3-7-sonnet-20250219-v1:0. The line is: ${BEDROCK_EOL_LONGER} The lifecycle page does not list us-west-2 on the Claude 3.7 Sonnet row. It lists ap-south-1 and eu-west-2 with end of life ${BEDROCK_NOV13_SHUTDOWN_DATE}. The regional availability page prints EOL: 2026-07-30 for us-west-2 on that model.`,
          `While a model is Legacy, the lifecycle page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
        ],
        sources: [
          ...sources,
          { label: "claude-code-action issue 1850", url: ISSUE_CLAUDE_CODE_ACTION },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the bare ids in the tables, then for the Haiku geo ids, then for the two Claude 3.5 Sonnet v2 prefixes from the format example. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "Also look where an SDK, a framework classifier, an orchestrator, or an agent config sets a model id when you do not. A default is easy to miss because the string is not in your own config.",
          `GitHub issue [2FastLabs/agent-squad#721](${ISSUE_AGENT_SQUAD}) says the TypeScript and Python defaults are anthropic.claude-3-haiku-20240307-v1:0 for the agents, anthropic.claude-3-sonnet-20240229-v1:0 for the inline agent foundation model, and anthropic.claude-3-5-sonnet-20240620-v1:0 for the classifier. It says: "${AGENT_SQUAD_DEFAULT}"`,
        ],
        codes: [{
          caption: "ripgrep, dataset ids plus the Haiku geo ids and the v2 format examples",
          code: bedrockSearch([
            ...rows.map((model) => model.id),
            ...earlier.map((model) => model.id),
            BEDROCK_HAIKU_US,
            BEDROCK_HAIKU_EU,
            BEDROCK_V2_US,
            BEDROCK_V2_GLOBAL,
          ]),
        }],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
          { label: "agent-squad issue 721", url: ISSUE_AGENT_SQUAD },
        ],
      },
      {
        heading: "Request fields on a newer Claude model",
        paragraphs: [
          "Changing the model id is not the whole request. Two SunsetDiff pages record Anthropic's rules for newer Claude models. They are not the end-of-life exception above.",
          "A non-default temperature, top_p, or top_k on claude-sonnet-5-5 returns HTTP 400. The sentence and the fix are on [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/). Source: Anthropic's Sonnet 5.5 migration guide.",
          `API version 2026-10-21 returns a 400 for temperature, top_p, and top_k on every model, even at the default value. That page is [API version 2026-10-21 sampling parameters](/errors/claude-api-2026-10-21-sampling-params-400/). The versioning page says: "${BEDROCK_VERSIONING}"`,
        ],
        sources: [
          { label: "Claude Sonnet 5.5 migration guide", url: SONNET_MIGRATION },
          { label: "Claude API versioning", url: CLAUDE_VERSIONING },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The lifecycle page tells you to update application code before the EOL date. It does not name the id to send. Pick the id you will call, then send one real prompt from the Region you use before ${when}. Read modelLifecycle in that Region first.`,
          "For Claude 3 Haiku in the September 10, 2026 Regions, that date has passed. The model card says requests there now fail with the exception above. Do not copy the sample on that card that still targets us-east-1.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Bedrock rows do not store a price.",
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/aws-bedrock-2026-11-13/", label: `Bedrock shutdowns on ${when}` },
      { href: "/providers/aws-bedrock/", label: "Amazon Bedrock provider page" },
      { href: "/errors/bedrock-model-version-has-reached-the-end-of-its-life/", label: "This model version has reached the end of its life" },
      { href: "/errors/claude-temperature-is-deprecated-for-this-model/", label: "temperature is deprecated for this model" },
      { href: "/errors/claude-api-2026-10-21-sampling-params-400/", label: "API version 2026-10-21 sampling parameters" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Bedrock model ids reach end of life on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}. The Regions on each row are the ones the lifecycle page names for that date. Claude 3 Haiku in other Regions is a separate row with shutdown date 2026-09-10.`,
      },
      {
        question: "Does November 13, 2026 apply in every AWS Region?",
        answer: `No. The lifecycle page says: "${BEDROCK_REGION_SPLIT}" Claude 3 Haiku's November 13, 2026 Regions on the stored row are ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1, and ca-central-1. The same id already reached end of life on September 10, 2026 in the Regions on the other Haiku row, including us-east-1.`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `Not published. ${replacementFaq(rows, catalog)} The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID. The limited model selection page says: "${BEDROCK_PROFILE_GAP}"`,
      },
      {
        question: "Which cross-Region inference profile ids does AWS print?",
        answer: `The Claude 3 Haiku model card prints ${BEDROCK_HAIKU_US} and ${BEDROCK_HAIKU_EU}, and it says the global inference id is N/A. The regional availability page's format example prints ${BEDROCK_V2_US} and ${BEDROCK_V2_GLOBAL} next to anthropic.claude-3-5-sonnet-20241022-v2:0. The dataset does not store those prefixed ids. This guide does not invent a us. or global. id for Claude 3 Sonnet or Claude 3.7 Sonnet.`,
      },
      {
        question: "What error does Bedrock return after end of life?",
        answer: `The Claude 3 Haiku model card says requests in most Regions now fail with ${BEDROCK_EOL_ERROR} Issue [anthropics/claude-code-action#1850](${ISSUE_CLAUDE_CODE_ACTION}) records this line for anthropic.claude-3-7-sonnet-20250219-v1:0 on a Converse call in us-west-2: ${BEDROCK_EOL_LONGER} The lifecycle page says requests fail after the EOL date and does not print that exception. The page for the quote is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/).`,
      },
      {
        question: "Why can a default setup fail in us-east-1?",
        answer: `Claude 3 Haiku reached end of life on September 10, 2026 in us-east-1. GitHub issue [2FastLabs/agent-squad#721](${ISSUE_AGENT_SQUAD}) says: "${AGENT_SQUAD_DEFAULT}" The issue says the classifier default is anthropic.claude-3-5-sonnet-20240620-v1:0, and the agent default is anthropic.claude-3-haiku-20240307-v1:0.`,
      },
      {
        question: "What should I check besides the model id?",
        answer: `On claude-sonnet-5-5, a non-default temperature, top_p, or top_k returns HTTP 400. See [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/). API version 2026-10-21 rejects those three fields on every model, even at the default. The versioning page says: "${BEDROCK_VERSIONING}" See [API version 2026-10-21 sampling parameters](/errors/claude-api-2026-10-21-sampling-params-400/).`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_HAIKU_CARD,
      BEDROCK_REGIONS,
      BEDROCK_LIMITED,
      ISSUE_AGENT_SQUAD,
      ISSUE_CLAUDE_CODE_ACTION,
      SONNET_MIGRATION,
      CLAUDE_VERSIONING,
    ],
  };
}
