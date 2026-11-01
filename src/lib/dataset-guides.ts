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

/** Checked against the Azure OpenAI retirement schedule. The slug uses this date. */
export const AZURE_NOV19_SHUTDOWN_DATE = "2026-11-19";
export const AZURE_NOV19_GUIDE_SLUG = "azure-openai-o-series-retirement-november-19-2026";
export const AZURE_CODEX_MINI_DATE = "2026-11-15";
export const AZURE_CHAT_LATEST_DATE = "2026-11-17";

/** Checked against GitHub's October 15, 2026 Copilot changelog. The slug uses this date. */
export const COPILOT_NOV16_SHUTDOWN_DATE = "2026-11-16";
export const COPILOT_NOV16_GUIDE_SLUG = "github-copilot-model-retirements-november-16-2026";

/** Checked against the Fireworks changelog. The slug uses this date. */
export const FIREWORKS_NOV7_SHUTDOWN_DATE = "2026-11-07";
export const FIREWORKS_NOV7_GUIDE_SLUG = "fireworks-model-shutdowns-november-7-2026";

/** Checked against the Nebius November 2026 notice. The slug uses this date. */
export const NEBIUS_NOV9_SHUTDOWN_DATE = "2026-11-09";
export const NEBIUS_NOV9_GUIDE_SLUG = "nebius-model-shutdowns-november-9-2026";
const NEBIUS_AUGUST_SHUTDOWN_DATE = "2026-08-31";

/** Checked against the Gemini API deprecations table. The slug uses this date. */
export const GEMINI_NOV17_SHUTDOWN_DATE = "2026-11-17";
export const GEMINI_NOV17_GUIDE_SLUG = "gemini-api-model-shutdowns-november-17-2026";

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

export function isAzureNov19OSeries(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && model.shutdown_date === AZURE_NOV19_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureCodexMini(model: ModelRecord): boolean {
  return model.provider === "azure-openai" && model.id === "codex-mini-2025-05-16";
}

export function isAzureChatLatestNov17(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && model.family === "gpt-chat-latest"
    && model.shutdown_date === AZURE_CHAT_LATEST_DATE
    && model.shutdown_date_kind === "exact";
}

export function isCopilotNov16Shutdown(model: ModelRecord): boolean {
  return model.provider === "github-copilot"
    && model.shutdown_date === COPILOT_NOV16_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isFireworksNov7Shutdown(model: ModelRecord): boolean {
  return model.provider === "fireworks"
    && model.shutdown_date === FIREWORKS_NOV7_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isNebiusNov9Shutdown(model: ModelRecord): boolean {
  return model.provider === "nebius"
    && model.shutdown_date === NEBIUS_NOV9_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isGeminiNov17Shutdown(model: ModelRecord): boolean {
  return model.provider === "google-gemini-api"
    && model.shutdown_date === GEMINI_NOV17_SHUTDOWN_DATE
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
  const azure = rowsFor(isAzureNov19OSeries, catalog);
  if (azure.length) pages.push(azureOSeriesGuide(azure, catalog));
  const copilot = rowsFor(isCopilotNov16Shutdown, catalog);
  if (copilot.length) pages.push(copilotNov16Guide(copilot, catalog));
  const fireworks = rowsFor(isFireworksNov7Shutdown, catalog);
  if (fireworks.length) pages.push(fireworksNov7Guide(fireworks, catalog));
  const nebius = rowsFor(isNebiusNov9Shutdown, catalog);
  if (nebius.length) pages.push(nebiusNov9Guide(nebius, catalog));
  const gemini = rowsFor(isGeminiNov17Shutdown, catalog);
  if (gemini.length) pages.push(geminiNov17Guide(gemini, catalog));
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
const AZURE_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const AZURE_RETIREMENTS = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const AZURE_VERSIONS = "https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/model-versions";
const AZURE_RETIRED = "Removed from service. All inference requests return 410 Gone.";
const AZURE_AUTO = "For Global Standard, Data Zone Standard, and Standard deployment types, Microsoft manages automatic upgrades when a model version is retired:";
const AZURE_PROVISIONED = "Provisioned deployments are NOT auto-upgraded. Provisioned customers must manually migrate to the replacement model.";
const AZURE_STANDARD_ONLY = "Automatic model updates are only supported for Standard deployment types.";
const AZURE_EXPIRED = "Once the retirement date is reached the model deployment automatically upgrades to the current default version.";
const AZURE_NO_AUTO = "The model deployment never automatically upgrades. Once the retirement date is reached the model deployment stops working.";
const AZURE_NULL = "null is equivalent to OnceCurrentVersionExpired.";
const AZURE_SPECIFIC = "When you select a specific model version for a deployment, this version remains selected until you either choose to manually update yourself, or once you reach the retirement date for the model.";
const AZURE_THEN_DEFAULT = "When the retirement date is reached the model will automatically upgrade to the default version at the time of retirement.";
const AZURE_LIST = "To query the current model deployment settings including the deployment upgrade configuration for a given resource use Deployments List.";
const AZURE_NULL_FIELD = "If the value is null, you won't see a versionUpgradeOption property.";
const AZURE_PORTAL = "Go to your deployment in the Foundry portal, then open the Details tab to see the current model version.";
const AZURE_REST_VERSION = "Query the deployments endpoint for your resource. The response includes the model version for each deployment.";
const AZURE_PREVIEW_END = "all preview deployments are either upgraded or terminated.";
const AZURE_NO_REPLACEMENT = "If no replacement exists, customers get 30 days notice before the model retires and inference returns 410 Gone.";
const AZURE_PREVIEW_NOTE = "Preview models aren't recommended for production workloads.";
const AZURE_FINE_FOOT = "For existing customers only. Otherwise, training retirement occurs at base model retirement.";
const AZURE_REPLACEMENT_COL = "The Replacement column identifies Microsoft's recommended replacement and, where supported, the target for automatic upgrades at retirement.";

const COPILOT_CHANGELOG = "https://github.blog/changelog/2026-10-15-upcoming-deprecation-of-selected-github-copilot-models-in-mid-november";
const COPILOT_SUPPORTED = "https://docs.github.com/en/copilot/reference/ai-models/supported-models";
const COPILOT_CHAT_MODEL = "https://docs.github.com/en/copilot/how-tos/use-ai-models/change-the-chat-model";
const COPILOT_INLINE = "https://docs.github.com/en/copilot/how-tos/use-ai-models/change-the-completion-model";
const COPILOT_ORG_MODELS = "https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-default-models";
const COPILOT_CLI = "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference";
const COPILOT_AGENTS = "https://docs.github.com/en/copilot/reference/custom-agents-configuration";
const COPILOT_CLI_CONFIG = "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference";
const COPILOT_DEPRECATE = "We will deprecate the following models across all GitHub Copilot experiences (including Copilot Chat, inline edits, ask and agent modes, and code completions) on November 16th, 2026:";
const COPILOT_ANNUAL = "Claude Opus 4.8 will remain available to individual GitHub Copilot subscribers on annual plans so they retain an Opus offering. The deprecation of Claude Opus 4.8 does not apply to these customers.";
const COPILOT_UPDATE = "Please update your workflows and integrations to use the supported models before this date.";
const COPILOT_DEFAULT = "Under default model enablement, the suggested alternatives are automatically enabled for Copilot Enterprise and Copilot Business customers unless an administrator has turned off the global default or explicitly disabled the model.";
const COPILOT_POLICIES = "If you've turned off the global default, you can enable access to the alternative models through their model policies in Copilot settings.";
const COPILOT_SELECTOR = "Once enabled, users will see the model in the Copilot Chat model selector in supported GitHub Copilot experiences.";
const COPILOT_NO_ACTION = "No action is required to remove the models after they have been deprecated.";
const COPILOT_SUBJECT = "Model availability is subject to change. Some models may be replaced or updated over time.";
const COPILOT_CHAT_CHANGE = "Copilot allows you to change the model during a chat and have the alternative model used to generate responses to your prompts.";
const COPILOT_BUSINESS = "If you access Copilot Chat through a Copilot Business subscription, your organization must grant members the ability to switch to a different model.";
const COPILOT_NOT_INLINE = "Changing the model used by Copilot Chat does not affect the model used for Copilot inline suggestions.";
const COPILOT_EXTENSIONS = "If you use Copilot Extensions, they may override the model you select.";
const COPILOT_TEAMS_PREVIEW = "If your enterprise has opted in to the enterprise teams model access preview, your organization will not be able to access model settings.";
const COPILOT_ORG_ENABLED = "The model is available to members of your organization.";
const COPILOT_ORG_DISABLED = "The model is not available to members of your organization.";
const COPILOT_CLI_FLAG = "Use --model=MODEL or the COPILOT_MODEL environment variable to select the AI model.";
const COPILOT_CLI_SLASH = "You can also switch models during an interactive session using the /model slash command.";
const COPILOT_AGENT_MODEL = "Model to use when this custom agent executes. If unset, inherits the default model.";
const COPILOT_ALLOWLIST = "Restrict which built-in models a repository can use with a plain-text allowlist at .github/allowed_models.txt";
const COPILOT_REPO_MODEL = "Pin the default model for this repo.";

function otherChatLatest(catalog: ModelRecord[]): ModelRecord[] {
  return catalog
    .filter((model) => model.provider === "azure-openai" && model.family === "gpt-chat-latest" && model.shutdown_date !== AZURE_CHAT_LATEST_DATE)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function azureOSeriesGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(AZURE_NOV19_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const codex = rowsFor(isAzureCodexMini, catalog);
  const chat = rowsFor(isAzureChatLatestNov17, catalog);
  const laterChat = otherChatLatest(catalog);
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  const findRows = [...rows, ...codex, ...chat];
  return {
    slug: AZURE_NOV19_GUIDE_SLUG,
    title: `Azure OpenAI o-series retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI o1, o1-pro, o3, o3-deep-research, o3-mini, o3-pro, and o4-mini versions retire on ${AZURE_NOV19_SHUTDOWN_DATE}. The schedule names gpt-5.6-sol or gpt-5.6-terra. codex-mini retires November 15. Two gpt-chat-latest versions retire November 17 with no replacement named.`,
    h1: `Azure OpenAI o-series retirement on ${when}`,
    summary: `The Azure OpenAI versions in the dataset with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}, the replacement on the retirement schedule, and what a deployment does that day.`,
    answer: `The dataset has ${rows.length} Azure OpenAI ids with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}: ${idList(rows)}. The retirement schedule lists each as Deprecated, retirement date ${AZURE_NOV19_SHUTDOWN_DATE}. The replacement column is the official replacement stored on each row. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. Standard deployments can auto-upgrade. A deployment set to NoAutoUpgrade stops working. Provisioned deployments are not auto-upgraded.${codex.length ? ` ${idList(codex)} is stored with shutdown date ${codex[0]?.shutdown_date ?? "Not published"}. The schedule does not name a replacement.` : ""}${chat.length ? ` ${idList(chat)} ${chat.length === 1 ? "is" : "are"} stored with shutdown date ${AZURE_CHAT_LATEST_DATE}. The schedule does not name a replacement.` : ""}`,
    checked,
    steps: [
      {
        name: "Read the versions",
        text: `The first table is every Azure OpenAI id in the dataset whose shutdown date is ${AZURE_NOV19_SHUTDOWN_DATE}. The replacement cell is the official replacement stored from the retirement schedule. Not published means that field is empty. Open the model page before you change a deployment.`,
      },
      {
        name: "List deployments on the resource",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name.",
      },
      {
        name: "Read versionUpgradeOption",
        text: "OnceCurrentVersionExpired upgrades the deployment when the retirement date is reached. null means the same thing. NoAutoUpgrade never upgrades, and that deployment stops working. Provisioned deployments are not auto-upgraded.",
      },
      {
        name: "Call the named replacement",
        text: `Where the table names gpt-5.6-sol or gpt-5.6-terra, deploy that version and send one real prompt before ${when}. Where the cell says Not published, Microsoft did not name a replacement on the schedule.`,
      },
    ],
    sections: [
      {
        heading: "Models retiring on November 19",
        paragraphs: [
          `These rows are every Azure OpenAI model in the dataset with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The schedule's Lifecycle column says Deprecated for each of them.`,
          `The schedule says: "${AZURE_REPLACEMENT_COL}" The replacement on each row is that column: gpt-5.6-sol or gpt-5.6-terra. This guide does not add a replacement the schedule does not print.`,
        ],
        table: {
          caption: `${rows.length} Azure OpenAI model ids with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "codex-mini on November 15 and gpt-chat-latest on November 17",
        paragraphs: [
          codex.length
            ? `codex-mini version 2025-05-16 is in the dataset with shutdown date ${codex[0]?.shutdown_date ?? "Not published"}. The schedule lists it as Deprecated with retirement date ${AZURE_CODEX_MINI_DATE}. The replacement cell on that row is empty, so the table says Not published.`
            : "The dataset has no codex-mini-2025-05-16 row.",
          chat.length
            ? `These gpt-chat-latest rows are the ones whose stored shutdown date is ${AZURE_CHAT_LATEST_DATE}. The schedule lists both as Preview. The replacement cell is empty. The lifecycle page says: "${AZURE_PREVIEW_NOTE}" It also says ${AZURE_PREVIEW_END} And: "${AZURE_NO_REPLACEMENT}" The schedule does not name a replacement, so this page does not pick the upgrade path or the no-replacement path for you.`
            : `The dataset has no gpt-chat-latest row with shutdown date ${AZURE_CHAT_LATEST_DATE}.`,
          laterChat.length
            ? `Other gpt-chat-latest versions in the dataset have a different shutdown date, or none. The schedule does not name them as the replacement for the ${AZURE_CHAT_LATEST_DATE} rows. ${laterChat.map((model) => `${model.id}: ${model.shutdown_date ?? "Not published"}`).join(". ")}.`
            : "The dataset has no other gpt-chat-latest version rows.",
        ],
        table: codex.length || chat.length
          ? {
              caption: "Azure OpenAI rows for codex-mini and for gpt-chat-latest versions retiring on 2026-11-17.",
              headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
              rows: tableRows([...codex, ...chat], catalog),
            }
          : undefined,
        sources,
      },
      {
        heading: "What happens to a deployment that day",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/). The batch of stored rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-2026-11-19/).`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops.`,
        ],
        sources: [
          ...sources,
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
      {
        heading: "Find deployments that use these versions",
        paragraphs: [
          `Working with models says: "${AZURE_LIST}" ${AZURE_NULL_FIELD} The model versions page says: "${AZURE_PORTAL}" And: "${AZURE_REST_VERSION}"`,
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the tables. o1 version 2024-12-17 is the dataset id o1-2024-12-17.",
          "Also search the repository. A hit is a candidate, not proof a deployment still uses that version. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
        ],
        codes: [
          {
            caption: "Azure PowerShell, list deployments for one account",
            code: `Get-AzCognitiveServicesAccountDeployment -ResourceGroupName {ResourceGroupName} -AccountName {AccountName}\n`,
          },
          {
            caption: "Deployments List",
            code: `GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/{accountName}/deployments?api-version=2023-05-01\n`,
          },
          { caption: "ripgrep", code: searchCode(findRows) },
        ],
        sources: [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Model versions", url: AZURE_VERSIONS },
        ],
      },
      {
        heading: "Fine-tuned o4-mini dates",
        paragraphs: [
          `The base row for o4-mini version 2025-04-16 on the retirement schedule is Deprecated, retirement ${AZURE_NOV19_SHUTDOWN_DATE}, replacement gpt-5.6-terra. That is the shutdown date and replacement stored on the dataset row.`,
          `The schedule's fine-tuned table lists a different pair of dates for that same version: training retirement no earlier than 2027-05-19, deployment retirement 2027-11-19. The lifecycle page's fine-tuned table lists training retirement no earlier than 2027-04-16 and deployment retirement 2027-10-16. Those two Microsoft pages do not print the same fine-tune dates. SunsetDiff keeps both in the note on the model page and does not replace the base shutdown date with either one.`,
          `Both pages say: "${AZURE_FINE_FOOT}" The base model retirement date on the schedule is ${AZURE_NOV19_SHUTDOWN_DATE}.`,
        ],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The schedule's replacement is the target for automatic upgrades where that is supported. Call gpt-5.6-sol or gpt-5.6-terra, the one on the same row, with the prompts you send now. Do that before ${when}. A deployment set to NoAutoUpgrade will not move itself.`,
          "codex-mini and the two November 17 gpt-chat-latest versions have no replacement on the schedule. This guide does not name one.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/azure-openai-2026-11-19/", label: `Azure OpenAI shutdowns on ${when}` },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}. The retirement schedule lists those versions as Deprecated with that retirement date.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(rows, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}"`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL}`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}"`,
      },
      {
        question: "What about codex-mini and gpt-chat-latest?",
        answer: `codex-mini 2025-05-16 has shutdown date ${AZURE_CODEX_MINI_DATE} and no stored replacement. ${idList(chat)} have shutdown date ${AZURE_CHAT_LATEST_DATE} and no stored replacement. The lifecycle page says ${AZURE_PREVIEW_END}`,
      },
      {
        question: "Does the o4-mini fine-tune date replace November 19, 2026?",
        answer: `No. The stored shutdown date is the base row, ${AZURE_NOV19_SHUTDOWN_DATE}, replacement gpt-5.6-terra. The schedule's fine-tune deployment date is 2027-11-19. The lifecycle page's fine-tune deployment date is 2027-10-16. Both pages say: "${AZURE_FINE_FOOT}"`,
      },
    ],
    citations: [AZURE_SCHEDULE, AZURE_RETIREMENTS, AZURE_WORKING, AZURE_VERSIONS],
  };
}

function copilotNov16Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(COPILOT_NOV16_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const sources = [
    { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
    { label: "Supported AI models in GitHub Copilot", url: COPILOT_SUPPORTED },
  ];
  return {
    slug: COPILOT_NOV16_GUIDE_SLUG,
    title: `GitHub Copilot model retirements on ${when} | SunsetDiff`,
    description: `GitHub's changelog deprecates Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra in Copilot on ${COPILOT_NOV16_SHUTDOWN_DATE}. Opus alternatives are Claude Opus 5.5. GPT-5.6 Terra lists GPT-6.1 Sol or GPT-6 Luna.`,
    h1: `GitHub Copilot model retirements on ${when}`,
    summary: `The GitHub Copilot models in the dataset with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}, the suggested alternative on the changelog, and where to change the picker and model policy.`,
    answer: `The dataset has ${rows.length} GitHub Copilot models with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}: ${idList(rows)}. GitHub's October 15, 2026 changelog says it will deprecate them across Copilot Chat, inline edits, ask and agent modes, and code completions on November 16th, 2026. Claude Opus 4.8 and Claude Opus 5 list Claude Opus 5.5. GPT-5.6 Terra lists GPT-6.1 Sol or GPT-6 Luna. Claude Opus 4.8 stays available to individual subscribers on annual plans. The supported models table still lists these three names. Its retirement history table does not.`,
    checked,
    steps: [
      {
        name: "Read the three names",
        text: `The table is every GitHub Copilot model in the dataset whose shutdown date is ${COPILOT_NOV16_SHUTDOWN_DATE}. The replacement cell is the suggested alternative stored from the changelog. Open the model page before you change a picker or a config file.`,
      },
      {
        name: "Switch the chat picker",
        text: "In Visual Studio Code, open Copilot Chat and use the model dropdown at the bottom of the chat view. A Copilot Business subscription can switch only if the organization allows it. Changing the chat model does not change the model used for inline suggestions.",
      },
      {
        name: "Check the org model policy",
        text: "Organization owners open Settings, Copilot, Models. Enabled means members can use the model. Disabled means they cannot. If the enterprise turned on the teams preview, the organization page says it cannot open those settings.",
      },
      {
        name: "Update hard-coded names",
        text: "Search workflows, custom agent files, Copilot CLI --model flags, COPILOT_MODEL, .github/copilot/settings.json, and .github/allowed_models.txt for the three names. The changelog says to update workflows and integrations before the date.",
      },
    ],
    sections: [
      {
        heading: "Models retiring",
        paragraphs: [
          `These rows are every GitHub Copilot model in the dataset with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The changelog prints the date in the deprecation date column of its table.`,
          `GitHub's changelog says: "${COPILOT_DEPRECATE}" The suggested alternative for Claude Opus 4.8 and for Claude Opus 5 is Claude Opus 5.5. For GPT-5.6 Terra the cell says GPT-6.1 Sol or GPT-6 Luna. The changelog does not prefer one of those two.`,
          `The same post says: "${COPILOT_ANNUAL}" That sentence names Claude Opus 4.8 only. It does not say the same for Claude Opus 5 or GPT-5.6 Terra.`,
          `The supported models page says: "${COPILOT_SUBJECT}" Its supported models table still lists Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra. The retirement history table on that page does not list those three names. The date in this guide is the date on the changelog.`,
        ],
        table: {
          caption: `${rows.length} GitHub Copilot models with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}.`,
          headers: ["Model", "Deprecation date", "Shutdown date", "Suggested alternative"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "What Copilot users see",
        paragraphs: [
          `The changelog says: "${COPILOT_DEPRECATE}" The surfaces it names are Copilot Chat, inline edits, ask and agent modes, and code completions.`,
          `It also says: "${COPILOT_SELECTOR}" And: "${COPILOT_NO_ACTION}"`,
          `The chat model page says: "${COPILOT_CHAT_CHANGE}" And: "${COPILOT_BUSINESS}" And: "${COPILOT_NOT_INLINE}" And: "${COPILOT_EXTENSIONS}"`,
          "In Visual Studio Code, open Copilot Chat from the chat icon in the title bar. At the bottom of the chat view, open the model dropdown and click the model you want. For inline suggestions in Visual Studio Code, open the command palette and run GitHub Copilot: Change Completions Model. The inline page says you can switch when an alternative model is currently available.",
        ],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Changing the AI model for Copilot Chat", url: COPILOT_CHAT_MODEL },
          { label: "Changing the AI model for inline suggestions", url: COPILOT_INLINE },
        ],
      },
      {
        heading: "What org admins change",
        paragraphs: [
          `The changelog says: "${COPILOT_UPDATE}" Then: "${COPILOT_DEFAULT}" Then: "${COPILOT_POLICIES}"`,
          `The organization models page says: "${COPILOT_TEAMS_PREVIEW}" When the organization can open the page, the path is: profile picture, Organizations, the organization, Settings, Copilot, Models. Next to a model, Enabled means: "${COPILOT_ORG_ENABLED}" Disabled means: "${COPILOT_ORG_DISABLED}" The same page says you can set the Default availability for released models policy for models nobody has configured.`,
          "The batch of stored rows is [GitHub Copilot shutdowns on November 16, 2026](/shutdowns/github-copilot-2026-11-16/). The provider page is [GitHub Copilot](/providers/github-copilot/).",
        ],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Managing the availability of models in an organization", url: COPILOT_ORG_MODELS },
        ],
      },
      {
        heading: "Tools with a hard-coded model list",
        paragraphs: [
          `The changelog says: "${COPILOT_UPDATE}" The chat model page says: "${COPILOT_EXTENSIONS}" A tool that still sends one of these three names can keep doing so after the picker shows a different model.`,
          `The custom agents reference says the model property is: "${COPILOT_AGENT_MODEL}" That property is for agent profiles on GitHub.com, in the Copilot CLI, and in supported IDEs.`,
          `The Copilot CLI command reference says: "${COPILOT_CLI_FLAG}" And: "${COPILOT_CLI_SLASH}" Its supported models table lists claude-opus-5.5, gpt-6.1-sol, and gpt-6-luna. It does not list Claude Opus 4.8, Claude Opus 5, or GPT-5.6 Terra.`,
          `The CLI configuration reference says a repository file .github/copilot/settings.json can set model, described as: "${COPILOT_REPO_MODEL}" The same page says: "${COPILOT_ALLOWLIST}" Each line is a model id or a glob. A fallback: line names the model to use when the requested model is not allowed. The allowlist covers built-in models.`,
          "Search the repository for the three names in the table. A hit in a workflow, an agent file, a settings file, or a script is a candidate. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date. The supported models page lists these as display names and does not publish a separate API id.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Changing the AI model for Copilot Chat", url: COPILOT_CHAT_MODEL },
          { label: "Custom agents configuration", url: COPILOT_AGENTS },
          { label: "GitHub Copilot CLI command reference", url: COPILOT_CLI },
          { label: "GitHub Copilot CLI configuration directory", url: COPILOT_CLI_CONFIG },
          { label: "Supported AI models in GitHub Copilot", url: COPILOT_SUPPORTED },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/github-copilot-2026-11-16/", label: `GitHub Copilot shutdowns on ${when}` },
      { href: "/providers/github-copilot/", label: "GitHub Copilot provider page" },
      { href: "/models/github-copilot/claude-opus-5-5/", label: "Claude Opus 5.5" },
      { href: "/models/github-copilot/gpt-6-1-sol/", label: "GPT-6.1 Sol" },
      { href: "/models/github-copilot/gpt-6-luna/", label: "GPT-6 Luna" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Copilot models retire on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}. The changelog says: "${COPILOT_DEPRECATE}"`,
      },
      {
        question: "What does GitHub suggest instead?",
        answer: `${replacementFaq(rows, catalog)} The changelog writes GPT-6.1 Sol or GPT-6 Luna for GPT-5.6 Terra and does not prefer one. Claude Opus 4.8 and Claude Opus 5 both list Claude Opus 5.5.`,
      },
      {
        question: "Does Claude Opus 4.8 retire for every subscriber?",
        answer: `The changelog says: "${COPILOT_ANNUAL}" That exception names Claude Opus 4.8. The same sentence is not printed for Claude Opus 5 or GPT-5.6 Terra.`,
      },
      {
        question: "Where do I switch the model?",
        answer: `The chat model page says: "${COPILOT_CHAT_CHANGE}" In Visual Studio Code the dropdown is at the bottom of the chat view. The same page says: "${COPILOT_NOT_INLINE}" Inline suggestions in Visual Studio Code use the command GitHub Copilot: Change Completions Model. The changelog says: "${COPILOT_SELECTOR}"`,
      },
      {
        question: "What does an org admin change?",
        answer: `The changelog says: "${COPILOT_DEFAULT}" And: "${COPILOT_POLICIES}" The organization page says Enabled means: "${COPILOT_ORG_ENABLED}" Disabled means: "${COPILOT_ORG_DISABLED}" It also says: "${COPILOT_TEAMS_PREVIEW}"`,
      },
      {
        question: "What if a tool hard-codes the model name?",
        answer: `The changelog says: "${COPILOT_UPDATE}" The chat page says: "${COPILOT_EXTENSIONS}" Custom agents have a model property. The CLI accepts --model and COPILOT_MODEL. A repo can pin model in .github/copilot/settings.json and can list model ids in .github/allowed_models.txt. The CLI command reference does not list these three names in its supported models table.`,
      },
      {
        question: "Does the supported models page list November 16, 2026 for these models?",
        answer: `No. The supported models table still lists the three names, and the retirement history table does not list them. The page says: "${COPILOT_SUBJECT}" The November 16, 2026 date is on the October 15, 2026 changelog.`,
      },
    ],
    citations: [
      COPILOT_CHANGELOG,
      COPILOT_SUPPORTED,
      COPILOT_CHAT_MODEL,
      COPILOT_INLINE,
      COPILOT_ORG_MODELS,
      COPILOT_CLI,
      COPILOT_AGENTS,
      COPILOT_CLI_CONFIG,
    ],
  };
}

const FIREWORKS_CHANGELOG = "https://docs.fireworks.ai/updates/changelog";
const FIREWORKS_US = "https://docs.fireworks.ai/serverless/us-only-serverless";
const FIREWORKS_QUICKSTART = "https://docs.fireworks.ai/getting-started/quickstart";
const FIREWORKS_ONDEMAND = "https://docs.fireworks.ai/getting-started/ondemand-quickstart";
const FIREWORKS_DECOMMISSION =
  "Several Serverless models will be decommissioned on November 7, 2026 to better serve newer, higher-performance replacements. This applies only to serverless inference. Dedicated deployments and Reserved Throughput are unaffected.";
const FIREWORKS_BEFORE =
  "If you use any of the models below on serverless, migrate to a recommended replacement before November 7, 2026. After that date, they will no longer be available via serverless endpoints.";
const FIREWORKS_GLOBAL_GLM = "The global GLM 5.3 Flash endpoint remains available.";
const FIREWORKS_GLOBAL_MINI = "The global MiniMax M3 endpoint remains available.";
const FIREWORKS_UNAFFECTED = "GLM 5.3 and DeepSeek V4.1 Flash are not affected and remain available on serverless.";
const FIREWORKS_US_CALL = "Call https://us.api.fireworks.ai and pass one of the US model IDs from the table above as model.";
const FIREWORKS_US_PRICE = "Beginning September 1, 2026, launched US-only models are priced at 1.5x the base model serverless prices.";
const FIREWORKS_MUSE = "accounts/fireworks/models/muse-spark-open";
const FIREWORKS_US_DEEPSEEK = "accounts/fireworks/routers/deepseek-v4p1-flash-1017-us";
const FIREWORKS_US_GLM = "accounts/fireworks/routers/glm-5p3-flash-us";
const FIREWORKS_MINI = "accounts/fireworks/models/minimax-m3";

const NEBIUS_NOVEMBER = "https://docs.tokenfactory.nebius.com/model-deprecations-november-2026";
const NEBIUS_AUGUST = "https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice";
const NEBIUS_QUICKSTART = "https://docs.tokenfactory.nebius.com/quickstart";
const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1/";
const NEBIUS_REMOVED =
  "These models will be removed from Token Factory Serverless on November 9, 2026. After that date, you will not be able to select them in the Playground or send API requests using their model IDs.";
const NEBIUS_SERVERLESS = "This change only affects Serverless usage.";
const NEBIUS_DEDICATED = "Dedicated Endpoints are unaffected.";
const NEBIUS_NO_ROUTE = "Token Factory does not automatically reroute requests from deprecated models.";
const NEBIUS_CHOOSE = "Choose a replacement based on your workload, then test before migrating traffic.";
const NEBIUS_UPDATE = "Update the model and base_url values in your API requests, then verify the results.";
const NEBIUS_API = "Affected Serverless models will no longer be available via API or Playground.";
const NEBIUS_DEDICATED_NOTE = "Dedicated Endpoints for these models will be unaffected by this change.";

const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const GEMINI_MODELS = "https://ai.google.dev/gemini-api/docs/models";
const GEMINI_SPEECH = "https://ai.google.dev/gemini-api/docs/speech-generation";
const GEMINI_LIVE_MODEL = "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live";
const GEMINI_LIVE = "https://ai.google.dev/gemini-api/docs/live";
const GEMINI_VERTEX = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";
const GEMINI_SHUTDOWN =
  "Once a model is shutdown, it is completely turned off, and the endpoint is no longer available.";
const GEMINI_EARLIEST =
  "The shutdown dates listed in the table indicate the earliest possible dates on which a model might be retired. We will communicate the exact shutdown date to users with advance notice to ensure a smooth transition to a replacement model.";
const GEMINI_PREVIEW = "A preview name can be used in production and is deprecated with at least two weeks of notice.";
const GEMINI_TTS_DIFFERS =
  "The TTS capability differs from speech generation provided through the Live API, which is designed for interactive, unstructured audio, and multimodal inputs and outputs.";
const GEMINI_LITE =
  "Use Gemini 3.8 Flash-Lite TTS (gemini-3.8-flash-lite-tts) as your fast, cost-efficient workhorse replacement for gemini-3.1-flash-tts-preview.";
const GEMINI_SAME_SCHEMA =
  "Both Gemini 3.8 TTS models share the exact same API schema and prompting format, allowing you to switch between them with a single parameter change.";
const GEMINI_VERBATIM = "Gemini 3.8 TTS treats input text strictly as a verbatim transcript.";
const GEMINI_WAV =
  "Unlike gemini-3.1-flash-tts-preview and earlier TTS models (which returned headerless raw PCM audio/l16 by default), Gemini 3.8 TTS returns WAV audio (audio/wav) with a standard RIFF header by default for unary requests.";
const GEMINI_TTS_ONLY = "TTS models accept text-only inputs and produce audio-only outputs.";
const GEMINI_LIVE_BLURB =
  "Gemini 3.8 Live is the default option for most low-latency voice agent experiences and real-time dialogue without reasoning-induced delays.";
const GEMINI_CHECKED = "2026-11-01";

function fireworksNov7Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(FIREWORKS_NOV7_SHUTDOWN_DATE);
  const us = rows.find((model) => model.id === FIREWORKS_US_GLM);
  const usReplacement = us ? publishedReplacementIds(us)[0] : undefined;
  const mini = catalog.find((model) => model.provider === "fireworks" && model.id === FIREWORKS_MINI);
  const sources = [
    { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
    { label: "Fireworks US-only serverless", url: FIREWORKS_US },
  ];
  return {
    slug: FIREWORKS_NOV7_GUIDE_SLUG,
    title: `Fireworks model shutdowns on ${when} | SunsetDiff`,
    description: `Fireworks serverless ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. GPT OSS 120B and the two Nemotron rows have no serverless replacement id. The US GLM 5.3 Flash row names ${FIREWORKS_US_DEEPSEEK}.`,
    h1: `Fireworks model shutdowns on ${when}`,
    summary: `The Fireworks ids in the dataset with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}, and what the changelog prints for each one.`,
    answer: `The dataset has ${rows.length} Fireworks ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}: ${idList(rows)}. The changelog says these serverless models are decommissioned on ${when}, and that dedicated deployments and Reserved Throughput are unaffected. GPT OSS 120B and the two Nemotron rows have an empty replacement field. The changelog says to move those to a dedicated deployment and does not print a serverless model id. ${FIREWORKS_US_GLM} stores ${usReplacement ?? "no replacement"}. The same changelog section also names Inkling and MiniMax M3 on the US endpoint. Those names are not in the table.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the four ids",
        text: `The table is every Fireworks id in the dataset whose shutdown date is ${FIREWORKS_NOV7_SHUTDOWN_DATE}. Not published means the stored replacement list is empty. Open the model page before you change a call.`,
      },
      {
        name: "Separate serverless from dedicated",
        text: "The changelog says this date applies only to serverless inference. A dedicated deployment or Reserved Throughput of the same model stays up. The three rows with an empty replacement say to move serverless traffic onto a dedicated deployment. They do not name a new model id.",
      },
      {
        name: "Change the US GLM id",
        text: usReplacement
          ? `Calls to ${FIREWORKS_US_GLM} on https://us.api.fireworks.ai use ${usReplacement} in the model field. The changelog says the global GLM 5.3 Flash endpoint remains available.`
          : "The US GLM row has no stored replacement.",
      },
      {
        name: "Test before the date",
        text: `Send one real prompt to the id you will call. Do that before ${when}. A dedicated deployment is a different setup from a serverless model string.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Fireworks model in the dataset with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The changelog says: "${FIREWORKS_DECOMMISSION}" It also says: "${FIREWORKS_BEFORE}"`,
          "GPT OSS 120B says move to a dedicated deployment of GPT OSS 120B. Each Nemotron row says move to a dedicated deployment of Nemotron Super VL. Those sentences do not print a serverless model id, so the replacement cell is Not published. This guide does not fill one in.",
          usReplacement
            ? `${FIREWORKS_US_GLM} is the US endpoint id on the US-only serverless page. The stored replacement is ${usReplacement}. The changelog says: "${FIREWORKS_GLOBAL_GLM}" It also says: "${FIREWORKS_UNAFFECTED}"`
            : "The dataset has no US GLM row in this shutdown.",
        ],
        table: {
          caption: `${rows.length} Fireworks model ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "Names in the same section that are not stored",
        paragraphs: [
          "The changelog heading also names Inkling and the US endpoint for MiniMax M3. SunsetDiff stores a row when a deprecation links a model page, or when the US-only page prints the model id. A display name with no model id is not stored.",
          `Inkling has no model link and no model id on that page. The changelog says to migrate to Muse Spark Open (US endpoint, 50% US regional premium waived). The new-models list on the same entry prints ${FIREWORKS_MUSE}. This guide does not invent an Inkling id.`,
          mini
            ? `MiniMax M3 (US endpoint only) links the global model page. The changelog says to migrate to DeepSeek V4.1 Flash 1017 (US endpoint), and: "${FIREWORKS_GLOBAL_MINI}" The US-only page does not print a MiniMax M3 US model id. The stored global row is ${FIREWORKS_MINI}, status ${mini.status}, shutdown date ${mini.shutdown_date ?? "Not published"}. The US id the changelog does print for that migration is ${FIREWORKS_US_DEEPSEEK}.`
            : "The dataset has no global MiniMax M3 row.",
        ],
        sources: [{ label: "Fireworks changelog", url: FIREWORKS_CHANGELOG }, { label: "Fireworks US-only serverless", url: FIREWORKS_US }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} the four ids reach the shutdown date stored in the dataset. The changelog says that after that date they will no longer be available via serverless endpoints. It does not print an HTTP status.`,
          `The same entry says: "${FIREWORKS_DECOMMISSION}" A dedicated deployment that is already running is the case the changelog says is unaffected. A serverless call is the case that stops.`,
          usReplacement
            ? `The US page says: "${FIREWORKS_US_CALL}" The curl on that page posts to https://us.api.fireworks.ai/inference/v1/chat/completions. The quickstart's OpenAI-compatible host for a global id is https://api.fireworks.ai/inference/v1. ${FIREWORKS_US_GLM} is a US id. Send it to the US host.`
            : "The US page is the source for US model ids.",
        ],
        sources: [
          { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
          { label: "Fireworks US-only serverless", url: FIREWORKS_US },
          { label: "Fireworks quickstart", url: FIREWORKS_QUICKSTART },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the four ids in the table. Also search for Inkling and for Muse Spark Open if a config uses the display name. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "A US call and a global call can use different hosts. The US page's host is https://us.api.fireworks.ai. The quickstart's host is https://api.fireworks.ai.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          usReplacement
            ? `For the US GLM row, call ${usReplacement} on the US host with the prompts you send now. Do that before ${when}. The US page says: "${FIREWORKS_US_PRICE}" Both ${FIREWORKS_US_GLM} and ${usReplacement} are in that page's model table. The changelog says the global GLM 5.3 Flash endpoint remains available, so a global call is a different endpoint.`
            : `The US GLM row has no stored replacement to call.`,
          "For GPT OSS 120B and the two Nemotron rows, the changelog does not name a serverless model id. It points serverless users at a dedicated deployment and links the on-demand deployment quickstart. This guide does not invent the id to send.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Fireworks rows do not store a price.",
        ],
        codes: usReplacement
          ? [{
              caption: "OpenAI-compatible client, US host, model field only",
              code: `from openai import OpenAI
client = OpenAI(base_url="https://us.api.fireworks.ai/inference/v1")
response = client.chat.completions.create(
    model="${usReplacement}",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
            }]
          : undefined,
        sources: [
          { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
          { label: "Fireworks US-only serverless", url: FIREWORKS_US },
          { label: "On-demand deployment quickstart", url: FIREWORKS_ONDEMAND },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/fireworks-2026-11-07/", label: `Fireworks shutdowns on ${when}` },
      { href: "/providers/fireworks/", label: "Fireworks provider page" },
      ...(usReplacement
        ? [{ href: "/models/fireworks/accounts-fireworks-routers-deepseek-v4p1-flash-1017-us/", label: FIREWORKS_US_DEEPSEEK }]
        : []),
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Fireworks ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. The changelog says: "${FIREWORKS_BEFORE}"`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(rows, catalog)} The changelog tells serverless users of GPT OSS 120B and the two Nemotron models to move to a dedicated deployment. It does not print a serverless model id for those three. ${FIREWORKS_US_GLM} stores ${usReplacement ?? "no replacement"}.`,
      },
      {
        question: "Do dedicated deployments stop on that date?",
        answer: `The changelog says: "${FIREWORKS_DECOMMISSION}" Dedicated deployments and Reserved Throughput stay up. Serverless endpoints stop.`,
      },
      {
        question: "Why are Inkling and MiniMax M3 US missing from the table?",
        answer: `Inkling has no model id on the changelog. The page says to migrate it to Muse Spark Open and prints ${FIREWORKS_MUSE}. MiniMax M3 (US endpoint only) links the global model. The US-only page does not print a MiniMax M3 US id. The changelog says: "${FIREWORKS_GLOBAL_MINI}" The US id it does print for that migration is ${FIREWORKS_US_DEEPSEEK}.`,
      },
      {
        question: "Which host does the US GLM id use?",
        answer: `The US page says: "${FIREWORKS_US_CALL}" Its curl posts to https://us.api.fireworks.ai/inference/v1/chat/completions. The quickstart host https://api.fireworks.ai/inference/v1 is the global host.`,
      },
    ],
    citations: [FIREWORKS_CHANGELOG, FIREWORKS_US, FIREWORKS_QUICKSTART, FIREWORKS_ONDEMAND],
  };
}

function nebiusAugustChain(rows: ModelRecord[], catalog: ModelRecord[]): ModelRecord[] {
  const retiring = new Set(rows.map((model) => model.id));
  return catalog
    .filter((model) => model.provider === "nebius"
      && model.shutdown_date === NEBIUS_AUGUST_SHUTDOWN_DATE
      && model.shutdown_date_kind === "exact"
      && publishedReplacementIds(model).some((id) => retiring.has(id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function nebiusChainTable(august: ModelRecord[], november: ModelRecord[], catalog: ModelRecord[]): string[][] {
  const byId = new Map(november.map((model) => [model.id, model]));
  return august.map((model) => {
    const nextId = publishedReplacementIds(model).find((id) => byId.has(id));
    const next = nextId ? byId.get(nextId) : undefined;
    return [
      modelLink(model),
      shutdownCell(model),
      next ? modelLink(next) : (nextId ?? "Not published"),
      next ? replacementText(next, catalog) : "Not published",
    ];
  });
}

function nebiusNov9Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(NEBIUS_NOV9_SHUTDOWN_DATE);
  const august = nebiusAugustChain(rows, catalog);
  const sample = rows.find((model) => model.id === "zai-org/GLM-5.1") ?? rows[0];
  const sampleReplacement = sample ? publishedReplacementIds(sample)[0] : undefined;
  const sources = [
    { label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER },
    { label: "Nebius quickstart", url: NEBIUS_QUICKSTART },
  ];
  return {
    slug: NEBIUS_NOV9_GUIDE_SLUG,
    title: `Nebius model shutdowns on ${when} | SunsetDiff`,
    description: `Token Factory Serverless removes ${rows.length} model ids on ${NEBIUS_NOV9_SHUTDOWN_DATE}. Each row has one recommended replacement. Dedicated Endpoints are unaffected, and requests are not rerouted.`,
    h1: `Nebius model shutdowns on ${when}`,
    summary: `The Nebius Token Factory ids in the dataset with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}, the recommended replacement on the November notice, and the August ids whose replacement is now in that list.`,
    answer: `The dataset has ${rows.length} Nebius ids with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The November notice removes them from Token Factory Serverless on that date. Each row stores one recommended replacement from that table. The notice says Dedicated Endpoints are unaffected, and Token Factory does not automatically reroute requests. ${august.length} August 31, 2026 ids store a replacement that is itself in this November list.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the ids and the replacement",
        text: `The first table is every Nebius id in the dataset whose shutdown date is ${NEBIUS_NOV9_SHUTDOWN_DATE}. The replacement cell is the recommended replacement stored from the November notice. Open the model page before you change a call.`,
      },
      {
        name: "Check Dedicated Endpoints separately",
        text: "The notice says this change only affects Serverless usage. A Dedicated Endpoint for the same model is unaffected. Token Factory does not automatically reroute a Serverless request, so the old id will not start calling the new one for you.",
      },
      {
        name: "Update model and base_url",
        text: `The notice says to update the model and base_url values, then verify the results. The quickstart uses base_url ${NEBIUS_BASE}. Put the replacement id from the same row in the model field.`,
      },
      {
        name: "Test before the date",
        text: `Call the replacement with the prompts you send now. Do that before ${when}. If an August migration already moved you onto one of these November ids, follow that row's replacement one more step.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Nebius model in the dataset with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The November notice says: "${NEBIUS_REMOVED}" It also says: "${NEBIUS_API}" And: "${NEBIUS_DEDICATED_NOTE}"`,
          `The same page says: "${NEBIUS_SERVERLESS}" "${NEBIUS_DEDICATED}" "${NEBIUS_NO_ROUTE}" "${NEBIUS_CHOOSE}" The replacement column is the Recommended Replacement cell on that page.`,
        ],
        table: {
          caption: `${rows.length} Nebius model ids with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER }],
      },
      {
        heading: "August replacements that shut down in November",
        paragraphs: [
          august.length
            ? `These August 31, 2026 rows store a replacement that is also in the November table. The August notice is still the source for the August replacement. The November notice is the source for the next id. SunsetDiff does not replace the August row's stored replacement with the November one.`
            : "No August row stores a replacement that is in the November table.",
          "An app that already moved from the August id to that replacement still has to change the model field again. The November notice says requests are not rerouted.",
        ],
        table: august.length
          ? {
              caption: "August 31, 2026 Nebius rows whose stored replacement shuts down on 2026-11-09.",
              headers: ["August model id", "August shutdown date", "Stored replacement", "November recommended replacement"],
              rows: nebiusChainTable(august, rows, catalog),
            }
          : undefined,
        sources: [
          { label: "Nebius August 2026 deprecations", url: NEBIUS_AUGUST },
          { label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The notice says you will not be able to select them in the Playground or send API requests using their model IDs. It does not print an HTTP status.`,
          `It also says: "${NEBIUS_NO_ROUTE}" A request that still sends the old id is not forwarded to the replacement. A Dedicated Endpoint is a different case. The notice says: "${NEBIUS_DEDICATED}"`,
        ],
        sources: [{ label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the November table, then for any August id in the second table. A short search for DeepSeek or Qwen will hit ids that are not in this shutdown. Read the full id. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `The notice says: "${NEBIUS_UPDATE}" The quickstart sets base_url to ${NEBIUS_BASE} and posts to https://api.tokenfactory.nebius.com/v1/chat/completions. Its sample model is deepseek-ai/DeepSeek-R1-0528. That id is not in this table.`,
        ],
        codes: [{ caption: "ripgrep", code: searchCode([...rows, ...august]) }],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The notice says: "${NEBIUS_CHOOSE}" Then: "${NEBIUS_UPDATE}" Call the replacement id from the same row with the prompts you send now. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Nebius rows do not store a price.",
        ],
        codes: sampleReplacement
          ? [{
              caption: "OpenAI-compatible client, model field only",
              code: `from openai import OpenAI
client = OpenAI(base_url="${NEBIUS_BASE}")
response = client.chat.completions.create(
    model="${sampleReplacement}",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
            }]
          : undefined,
        sources,
      },
    ],
    related: [
      { href: "/shutdowns/nebius-2026-11-09/", label: `Nebius shutdowns on ${when}` },
      { href: "/providers/nebius/", label: "Nebius provider page" },
      { href: "/migrate/nebius__zai-org-glm-5-1__to__nebius__zai-org-glm-5-2/", label: "GLM-5.1 to GLM-5.2 migration diff" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Nebius ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The notice says: "${NEBIUS_REMOVED}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Will Token Factory reroute the old id?",
        answer: `The notice says: "${NEBIUS_NO_ROUTE}" You change the model field. It also says: "${NEBIUS_SERVERLESS}" And: "${NEBIUS_DEDICATED}"`,
      },
      {
        question: "What does the API host look like?",
        answer: `The quickstart sets base_url to ${NEBIUS_BASE}. The notice says: "${NEBIUS_UPDATE}"`,
      },
      {
        question: "What if I already migrated in August?",
        answer: august.length
          ? `These August ids store a replacement that shuts down on ${NEBIUS_NOV9_SHUTDOWN_DATE}: ${august.map((model) => `${model.id} to ${publishedReplacementIds(model).join(", ")}`).join(". ")}. The November table names the next replacement. The August row keeps the August replacement.`
          : "No August row points at a November id.",
      },
    ],
    citations: [NEBIUS_NOVEMBER, NEBIUS_AUGUST, NEBIUS_QUICKSTART],
  };
}

function geminiTtsRows(rows: ModelRecord[]): ModelRecord[] {
  return rows.filter((model) => model.id.includes("tts"));
}

function vertexNov17(catalog: ModelRecord[]): ModelRecord[] {
  return catalog
    .filter((model) => model.provider === "google-vertex" && model.shutdown_date === GEMINI_NOV17_SHUTDOWN_DATE)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function geminiNov17Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(GEMINI_NOV17_SHUTDOWN_DATE);
  const tts = geminiTtsRows(rows);
  const live = rows.filter((model) => !model.id.includes("tts"));
  const vertex = vertexNov17(catalog);
  const sources = [
    { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
    { label: "Gemini API models", url: GEMINI_MODELS },
  ];
  return {
    slug: GEMINI_NOV17_GUIDE_SLUG,
    title: `Gemini API model shutdowns on ${when} | SunsetDiff`,
    description: `Gemini API preview models with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}: two Live audio ids move to gemini-3.8-live, and three TTS ids list gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts. The table date is the earliest possible retirement.`,
    h1: `Gemini API model shutdowns on ${when}`,
    summary: `The Gemini API ids in the dataset with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}, the recommended replacement on the deprecations page, and what the speech page says changes for TTS.`,
    answer: `The dataset has ${rows.length} Gemini API ids with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}: ${idList(rows)}. The deprecations page lists that day as the shutdown date and says the table date is the earliest possible retirement. The two Live audio ids store gemini-3.8-live. The three TTS ids store gemini-3.8-flash-tts and gemini-3.8-flash-lite-tts. The page writes those two TTS ids with or, and does not prefer one. Once a model is shutdown, the endpoint is no longer available.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the five ids",
        text: `The table is every Gemini API id in the dataset whose shutdown date is ${GEMINI_NOV17_SHUTDOWN_DATE}. The replacement cell is the recommended replacement stored from the deprecations page. Open the model page before you change a call.`,
      },
      {
        name: "Split Live audio from text-to-speech",
        text: "gemini-3.1-flash-live-preview and gemini-2.5-flash-native-audio-preview-12-2025 are Live audio ids. The other three ids are text-to-speech. The speech page says TTS and the Live API are different. A Live replacement does not take a TTS request.",
      },
      {
        name: "Change the model id and the TTS request",
        text: "For a Live id, the deprecations page names gemini-3.8-live. For a TTS id, it names gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts. The speech page says Gemini 3.8 TTS treats input text as a verbatim transcript and returns WAV on a unary request.",
      },
      {
        name: "Test before the date",
        text: `Call the replacement with one real prompt before ${when}. The deprecations page says it will communicate the exact shutdown date with advance notice. The date in the table is the earliest day it prints.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Google Gemini API model in the dataset with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The deprecations page lists each of them under Preview models.`,
          `The deprecations page says: "${GEMINI_SHUTDOWN}" It also says: "${GEMINI_EARLIEST}" SunsetDiff stores the printed day, ${GEMINI_NOV17_SHUTDOWN_DATE}, as the shutdown date. The page does not print a later day.`,
          `The models page says: "${GEMINI_PREVIEW}" That sentence is the notice length for a preview name. It does not replace the day in the table.`,
          vertex.length
            ? `Vertex rows with the same shutdown date are ${vertex.map((model) => `${model.id} (${model.shutdown_date_kind})`).join(", ")}. ${vertex.every((model) => publishedReplacementIds(model).length === 0) ? "The replacement field on those Vertex rows is empty." : "See each Vertex row for its stored replacement."} They are not Gemini API ids, so they are not in the table below.`
            : "The dataset has no Vertex row with this shutdown date.",
        ],
        table: {
          caption: `${rows.length} Gemini API model ids with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [
          ...sources,
          { label: "Vertex model versions", url: GEMINI_VERTEX },
        ],
      },
      {
        heading: "Text-to-speech models",
        paragraphs: [
          tts.length
            ? `The TTS ids in this shutdown are ${idList(tts)}. The deprecations page lists gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts for each of them. It does not prefer one.`
            : "This shutdown has no TTS ids.",
          `The speech generation page says: "${GEMINI_LITE}" That sentence names gemini-3.1-flash-tts-preview. It does not print the same sentence for the two Gemini 2.5 preview TTS ids. The migration heading on that page says it covers gemini-3.1-flash-tts-preview or earlier Gemini TTS models.`,
          `The same page says: "${GEMINI_SAME_SCHEMA}" And: "${GEMINI_TTS_ONLY}" And: "${GEMINI_VERBATIM}" And: "${GEMINI_WAV}" If you need headerless raw PCM, the page says to set response_format.mime_type to audio/l16, audio/mulaw, or audio/alaw.`,
          "The speech page's samples call client.interactions.create and POST https://generativelanguage.googleapis.com/v1beta/interactions. The model field in those samples is gemini-3.8-flash-tts. The page also documents gemini-3.8-flash-lite-tts.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
        ],
      },
      {
        heading: "Live audio models",
        paragraphs: [
          live.length
            ? `The Live audio ids in this shutdown are ${idList(live)}. The deprecations page lists gemini-3.8-live for each of them.`
            : "This shutdown has no Live audio ids.",
          `The speech page says: "${GEMINI_TTS_DIFFERS}" A TTS model id is not the replacement for these Live rows.`,
          `The gemini-3.8-live model page says: "${GEMINI_LIVE_BLURB}" It says the model code is gemini-3.8-live, and it points to the Live API guide for features. This guide does not copy a Live request. The Live API guide is the page for that shape.`,
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
          { label: "gemini-3.8-live model page", url: GEMINI_LIVE_MODEL },
          { label: "Gemini Live API", url: GEMINI_LIVE },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The deprecations page says: "${GEMINI_SHUTDOWN}" It does not print one HTTP status for that moment.`,
          `The same page says: "${GEMINI_EARLIEST}" The day in the table can move if Google sends a later exact date. Until that notice, the stored shutdown date stays ${GEMINI_NOV17_SHUTDOWN_DATE}.`,
          "A 400 from a field the replacement rejects is a different failure. The speech page's WAV and speech_metadata changes are request-shape changes on Gemini 3.8 TTS, not the shutdown itself.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the five ids in the table. A preview suffix is part of the id. gemini-2.5-flash is a different id from gemini-2.5-flash-preview-tts. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "Also search configs that pick a voice model by a short label. The deprecations page uses the full id.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `Call the replacement id from the same row with the prompts you send now. Do that before ${when}. For TTS, the speech page says the two Gemini 3.8 TTS models share one API schema, so you can switch between gemini-3.8-flash-tts and gemini-3.8-flash-lite-tts by changing that one field. Run the one you will keep, and read the audio bytes. A unary response is WAV unless you set another mime type.`,
          "For the Live ids, call gemini-3.8-live from the Live API path you use now. The model page says Live API is supported on that id. This guide does not name a generateContent body for it.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
          { label: "gemini-3.8-live model page", url: GEMINI_LIVE_MODEL },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/google-gemini-api-2026-11-17/", label: `Gemini API shutdowns on ${when}` },
      { href: "/providers/google-gemini-api/", label: "Gemini API provider page" },
      { href: "/models/google-gemini-api/gemini-3-8-live/", label: "gemini-3.8-live" },
      { href: "/models/google-gemini-api/gemini-3-8-flash-tts/", label: "gemini-3.8-flash-tts" },
      { href: "/models/google-gemini-api/gemini-3-8-flash-lite-tts/", label: "gemini-3.8-flash-lite-tts" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Gemini API ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The deprecations page says: "${GEMINI_EARLIEST}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `${replacementFaq(rows, catalog)} The deprecations page writes or between the two TTS ids and does not prefer one. The speech page says: "${GEMINI_LITE}"`,
      },
      {
        question: "What does Google say happens at shutdown?",
        answer: `The deprecations page says: "${GEMINI_SHUTDOWN}" It does not print one HTTP status for that moment.`,
      },
      {
        question: "What changes in a TTS request besides the model id?",
        answer: `The speech page says: "${GEMINI_VERBATIM}" And: "${GEMINI_WAV}" It also says: "${GEMINI_TTS_ONLY}" Samples on that page set model to gemini-3.8-flash-tts and POST https://generativelanguage.googleapis.com/v1beta/interactions.`,
      },
      {
        question: "Are the Live ids the same migration as the TTS ids?",
        answer: `No. ${idList(live)} store gemini-3.8-live. The speech page says: "${GEMINI_TTS_DIFFERS}" The gemini-3.8-live model page says: "${GEMINI_LIVE_BLURB}"`,
      },
      {
        question: "Does this page include Vertex models?",
        answer: vertex.length
          ? `This table is the Gemini API list. Vertex stores ${idList(vertex)} with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The stored kind is ${[...new Set(vertex.map((model) => model.shutdown_date_kind))].join(", ")}. ${vertex.every((model) => !publishedReplacementIds(model).length) ? "Those rows have no stored replacement." : "See the Vertex rows for replacements."}`
          : "No Vertex row shares this shutdown date.",
      },
    ],
    citations: [GEMINI_DEPRECATIONS, GEMINI_MODELS, GEMINI_SPEECH, GEMINI_LIVE_MODEL, GEMINI_LIVE, GEMINI_VERTEX],
  };
}
