import type { ModelRecord, Provider } from "../schema.ts";
import { BADGES_DESCRIPTION, BADGES_NAV, BADGES_PATH } from "./badges.ts";
import { publicName } from "./growth.ts";
import { scheduleIndexLinks } from "./schedule.ts";
import { GUIDES_INDEX, guidePath, guides } from "./guides.ts";
import { FRAMEWORKS_CHECKED, FRAMEWORKS_INDEX, frameworkPath, frameworks } from "./frameworks.ts";
import { GLOSSARY_CHECKED, GLOSSARY_INDEX, glossaryPath, glossaryTerms } from "./glossary.ts";
import { HUBS } from "./hubs.ts";
import { OPENAPI_PATH } from "./openapi.ts";
import { statusLlmsEntries } from "./status-hubs.ts";
import {
  BREAKING_CHANGES_CSV,
  BREAKING_CHANGES_JSON,
  BREAKING_CHANGES_PATH,
  breakingChanges,
  breakingChangesChecked,
} from "./breaking-changes.ts";
import { INTEGRATIONS_PATH, MCP_ENDPOINT, MCP_PATH, MCP_REGISTRY_NAME, MCP_SERVER_JSON_PATH } from "./mcp-docs.ts";
import { CONFLICTS_PATH } from "./conflicts.ts";
import { ALERTS_PATH, GITHUB_ACTION_PATH, METHODOLOGY_PATH, SOURCES_PATH } from "./trust-pages.ts";
import { REQUEST_ERRORS_CHECKED, REQUEST_ERRORS_INDEX, requestErrorPath, requestErrors } from "./request-errors.ts";

export function llmsTxt(
  site: string,
  providers: Provider[],
  soon: ModelRecord[],
  extra: {
    months?: string[];
    questions?: ModelRecord[];
    shutdowns?: { title: string; path: string }[];
    schedule?: { title: string; path: string }[];
    statusPages?: { title: string; path: string }[];
    /** Model pages whose shutdown date is already past, so they are not in the soon list. */
    modelPages?: ModelRecord[];
    groqPages?: ModelRecord[];
  } = {},
): string {
  const origin = site.replace(/\/+$/, "");
  const providerLinks = providers.map((provider) => `- [${provider.name}](${origin}/providers/${provider.id}/)`).join("\n");
  const soonLinks = soon
    .map((model) => {
      const replacement = model.replacements[0]?.model_id ?? "not published";
      return `- [${publicName(model)}](${origin}/models/${model.provider}/${model.slug}/) shuts down ${model.shutdown_date}. Replacement: ${replacement}. [Diff](${origin}/replace/${model.provider}/${model.slug}/)`;
    })
    .join("\n");
  const monthLinks = (extra.months ?? []).map((month) => `- [${month}](${origin}/deadlines/${month}/)`).join("\n");
  const shutdownLinks = (extra.shutdowns ?? []).map((event) => `- [${event.title}](${origin}${event.path})`).join("\n");
  const questionLinks = (extra.questions ?? [])
    .map((model) => {
      const name = publicName(model);
      return `- [Is ${name} being deprecated?](${origin}/questions/${model.provider}/${model.slug}/deprecated/) and [${name} shutdown date](${origin}/questions/${model.provider}/${model.slug}/shutdown-date/)`;
    })
    .join("\n");
  const hubLinks = HUBS.map((hub) => `- [${hub.nav}](${origin}${hub.path}): ${hub.description}`).join("\n");
  const scheduleLinks = (extra.schedule ?? [])
    .map((page) => `- [${page.title}](${origin}${page.path})`)
    .join("\n");
  const statusLinks = (extra.statusPages ?? [])
    .map((page) => `- [${page.title}](${origin}${page.path})`)
    .join("\n");
  const modelPageLinks = (extra.modelPages ?? [])
    .map((model) => `- [${model.id}](${origin}/models/${model.provider}/${model.slug}/)`)
    .join("\n");
  const groqPageLinks = (extra.groqPages ?? [])
    .map((model) => `- [${model.id}](${origin}/models/${model.provider}/${model.slug}/)`)
    .join("\n");
  return `# SunsetDiff

> SunsetDiff tracks AI model retirements and the migration diff: shutdown date, official replacement, and published changes in price, context, and code. Publisher: SunsetDiff.

## Key pages
- [Home](${origin}/)
- [Models](${origin}/models/)
- [Replacements](${origin}/replace/)
- [Migrations](${origin}/migrate/)
- [Providers](${origin}/providers/)
- [Deprecated models](${origin}/deprecated/): AI models with status deprecated, grouped by provider and sorted by shutdown date.
- [Retired models](${origin}/retired/): AI models with status retired, grouped by provider and sorted by shutdown date.
- [Conflicting shutdown dates](${origin}${CONFLICTS_PATH}): models whose official pages list different shutdown dates. shutdown_date stays the deprecations-page date.
- [Soonest shutdowns](${origin}/#soonest)
- [Calendar](${origin}/calendar/)
- [Upcoming shutdowns](${origin}/upcoming/)
- [Shutdown timeline](${origin}/timeline/)
- [Deprecation changelog](${origin}/changelog/)
- [Shutdown questions](${origin}/faq/)
- [Deadlines](${origin}/deadlines/)
- [Shutdown batches](${origin}/shutdowns/)
- [Request errors](${origin}${REQUEST_ERRORS_INDEX})
- [Breaking changes](${origin}${BREAKING_CHANGES_PATH})
- [Deadline calendar](${origin}/deadlines.ics)
- [New deprecations](${origin}/feed.xml)
- [Code scan](${origin}/scan/)
- [Deprecation questions](${origin}/questions/)
- [Guides](${origin}${GUIDES_INDEX})
- [Frameworks](${origin}${FRAMEWORKS_INDEX}): where LangChain, LiteLLM, the Vercel AI SDK, LlamaIndex, OpenRouter, Pipecat, n8n, and Langflow store a model id. Checked ${FRAMEWORKS_CHECKED}.
- [Glossary](${origin}${GLOSSARY_INDEX}): definitions for deprecated, retired, legacy, snapshot, alias, and the other shutdown words. Checked ${GLOSSARY_CHECKED}.
- [RSS](${origin}/rss.xml) is the same deprecations feed as /feed.xml.
- [Changes](${origin}/changes/)
- [Dataset](${origin}/data/)
- [Status badges](${origin}${BADGES_PATH}): ${BADGES_DESCRIPTION}
- [Static API docs](${origin}/api/)
- [Compare trackers](${origin}/alternatives/)
- [About](${origin}/about/)
- [Methodology](${origin}${METHODOLOGY_PATH}): which official pages are scraped, the 6-hour refresh, the sanity gate, last_checked, and how a conflicting shutdown date is stored.
- [Sources](${origin}${SOURCES_PATH}): every URL stored on a model record, grouped by provider, with the model count and the latest last_checked day.
- [Shutdown alerts](${origin}${ALERTS_PATH}): what the free signup stores and the one welcome email it can send. RSS, the calendar, the JSON API, the MCP server, and badges need no signup.
- [GitHub Action](${origin}${GITHUB_ACTION_PATH}): inputs and a workflow for action/action.yml. It flags deprecated, legacy, and retiring model ids.
- [Pro](${origin}/pro/) is free until launch, then $19 a month. You won't be charged until Pro launches.

## Request errors
[All request errors](${origin}${REQUEST_ERRORS_INDEX}). Each page names the failure, the model change, and the source. Check dates are on the pages (${REQUEST_ERRORS_CHECKED}, 2026-10-21 for the thinking budget page, 2026-10-22 for the API version 2026-10-21 sampling page, 2026-10-24 for the temperature, Gemini 2.5 new-user, and Azure 410 pages, 2026-10-25 for the DeepSeek model_not_found page and the gpt-6.1-sol function tools page, and 2026-10-26 for the Chat Completions user field page). A code block is a quoted error only when the linked source prints that sentence.
${requestErrors.map((page) => `- [${page.h1}](${origin}${requestErrorPath(page.slug)})`).join("\n")}

## Request breaking changes
[All breaking changes](${origin}${BREAKING_CHANGES_PATH}). One rule per row: the old setting, the models or API version, what the source says happens, the fix, and the source URL. error_text is quoted only when that page prints the sentence. Newest check date: ${breakingChangesChecked()}. License CC BY 4.0.
- [breaking-changes.json](${origin}${BREAKING_CHANGES_JSON})
- [breaking-changes.csv](${origin}${BREAKING_CHANGES_CSV})
${breakingChanges.map((rule) => `- [${rule.old_setting}](${origin}${BREAKING_CHANGES_PATH}#${rule.id}) (${rule.provider})`).join("\n")}

## Dataset
The dataset is CC BY 4.0. Publisher: SunsetDiff. Blank spec fields were not on the official pages.
- [Data page](${origin}/data/)
- [JSON download](${origin}/dataset/sunsetdiff.json)
- [CSV download](${origin}/dataset/sunsetdiff.csv)
- [models.json](${origin}/data/models.json)
- [deprecations.csv](${origin}/data/deprecations.csv)
- [changelog.json](${origin}/data/changelog.json)
- [breaking-changes.json](${origin}${BREAKING_CHANGES_JSON})
- [breaking-changes.csv](${origin}${BREAKING_CHANGES_CSV})

## Shutdown batches
One page per provider and exact shutdown date when at least three models share that date.
${shutdownLinks || "- None published."}

## Shutdown months
${monthLinks || "- None published."}

## Shutdown schedule
Upcoming rows, year pages, month pages, the timeline, the changelog, and the question index. A date that only says not sooner than is not a shutdown on these pages.
${scheduleLinks || "- None published."}

## Guides
[All guides](${origin}${GUIDES_INDEX}). Each guide has a direct answer and links the official page for a provider fact.
${guides.map((guide) => `- [${guide.h1}](${origin}${guidePath(guide.slug)})`).join("\n")}

## Frameworks
[All frameworks](${origin}${FRAMEWORKS_INDEX}). Each page says where that library stores the model id. Shutdown dates in the table come from the model records. Checked ${FRAMEWORKS_CHECKED}.
${frameworks.map((page) => `- [${page.h1}](${origin}${frameworkPath(page.slug)}): ${page.summary}`).join("\n")}

## Glossary
[All terms](${origin}${GLOSSARY_INDEX}). Each term has a short definition and the provider page the wording came from. Checked ${GLOSSARY_CHECKED}. /rss.xml is the same feed as /feed.xml.
${glossaryTerms.map((term) => `- [${term.name}](${origin}${glossaryPath(term.slug)}): ${term.definition}`).join("\n")}

## Deprecation questions
${questionLinks || "- None published."}

## Soonest shutdowns
${soonLinks || "- None published."}

## Catalog
Indexes of the model, replacement, migration, and provider pages. Each index is built from the same records as the child pages.
${hubLinks}

## Providers
[All providers](${origin}/providers/).
${providerLinks}
${modelPageLinks ? `\n## DeepSeek model pages\nThese ids are not in Soonest shutdowns. deepseek-chat and deepseek-reasoner already shut down. The other ids have no published shutdown date.\n${modelPageLinks}` : ""}
${groqPageLinks ? `\n## Groq model pages\nShutdown dates are the shutdown column on Groq's deprecations page. Ids with no shutdown date are listed on Groq's models page.\n${groqPageLinks}` : ""}

## Status lists
Deprecated means the stored status is deprecated. Retired means the stored status is retired. Dates come from the model records.
- [Deprecated models](${origin}/deprecated/)
- [Retired models](${origin}/retired/)
${statusLinks || ""}

## MCP and integrations
- [MCP server](${origin}${MCP_PATH}): free streamable HTTP MCP at ${MCP_ENDPOINT}. No API key. Tools: check_model, upcoming_shutdowns, migration_diff, scan_text. Registry name ${MCP_REGISTRY_NAME}.
- [server.json](${origin}${MCP_SERVER_JSON_PATH}): MCP registry manifest for that remote server.
- [Integrations](${origin}${INTEGRATIONS_PATH}): the MCP server, the JSON API, status badges, the RSS feed, the deadline calendar, and the guide for swapping a model in LiteLLM, OpenRouter, the Vercel AI SDK, and LangChain.

## API
- [Static API docs](${origin}/api/)
- [OpenAPI 3.1](${origin}${OPENAPI_PATH}): no API key. Server https://sunsetdiff.com.
- [Index](${origin}/api/v1/index.json)
- [Upcoming shutdowns](${origin}/api/v1/upcoming.json)
- [Full model records](${origin}/data/models.json)
- [Full model list](${origin}/llms-full.txt)
- [How we check](${origin}/about/)
- [Methodology](${origin}${METHODOLOGY_PATH})
- [Sources cited by the dataset](${origin}${SOURCES_PATH})
- [Shutdown alerts](${origin}${ALERTS_PATH})
- [GitHub Action](${origin}${GITHUB_ACTION_PATH})

## Deprecation trackers
SunsetDiff compared with other public trackers. Competitor facts are quoted from the pages linked on each comparison, with the day they were checked.
- [Where to track AI model deprecations](${origin}/alternatives/)
- [modeldeprecations.dev](${origin}/alternatives/modeldeprecations/)
- [quora/model-deprecation-tracker](${origin}/alternatives/quora-model-deprecation-tracker/)
- [endoflife.ai](${origin}/alternatives/endoflife-ai/)
- [Developers Digest](${origin}/alternatives/developers-digest/)
- [deprecations.info](${origin}/alternatives/deprecations-info/)
- [LLMSunset](${origin}/alternatives/llmsunset/)
- [Lastcall](${origin}/alternatives/lastcall/)
- [ModelSunset](${origin}/alternatives/modelsunset/)
`;
}

export function llmsFull(site: string, models: ModelRecord[], providers: Provider[] = []): string {
  const origin = site.replace(/\/+$/, "");
  const lines = models.map((model) => {
    const source = model.sources[0];
    return [
      model.id,
      model.provider,
      model.status,
      model.shutdown_date ?? "",
      model.replacements[0]?.model_id ?? "",
      model.specs.input_price_per_mtok ?? "",
      model.specs.output_price_per_mtok ?? "",
      model.specs.context_window_tokens ?? "",
      model.specs.max_output_tokens ?? "",
      source?.url ?? "",
      source?.last_checked ?? "",
      `${origin}/models/${model.provider}/${model.slug}/`,
    ].join("\t");
  });
  return [
    "# SunsetDiff models",
    `Dataset (CC BY 4.0): ${origin}/dataset/sunsetdiff.json`,
    `CSV: ${origin}/dataset/sunsetdiff.csv`,
    `models.json: ${origin}/data/models.json`,
    `deprecations.csv: ${origin}/data/deprecations.csv`,
    `changelog.json: ${origin}/data/changelog.json`,
    `breaking-changes.json: ${origin}${BREAKING_CHANGES_JSON}`,
    `breaking-changes.csv: ${origin}${BREAKING_CHANGES_CSV}`,
    `Breaking changes: ${origin}${BREAKING_CHANGES_PATH}`,
    ...breakingChanges.map((rule) => `Breaking change: ${origin}${BREAKING_CHANGES_PATH}#${rule.id}`),
    `MCP: ${origin}${MCP_PATH} tools check_model, upcoming_shutdowns, migration_diff, scan_text`,
    `MCP endpoint: ${MCP_ENDPOINT}`,
    `server.json: ${origin}${MCP_SERVER_JSON_PATH}`,
    `Integrations: ${origin}${INTEGRATIONS_PATH}`,
    `API docs: ${origin}/api/`,
    `OpenAPI: ${origin}${OPENAPI_PATH}`,
    ...statusLlmsEntries(models, providers).map((page) => `${page.title}: ${origin}${page.path}`),
    `Conflicting shutdown dates: ${origin}${CONFLICTS_PATH}`,
    `Compare trackers: ${origin}/alternatives/`,
    ...HUBS.map((hub) => `${hub.nav}: ${origin}${hub.path}`),
    `Request errors: ${origin}${REQUEST_ERRORS_INDEX}`,
    ...requestErrors.map((page) => `Request error: ${origin}${requestErrorPath(page.slug)}`),
    `Deadlines: ${origin}/deadlines/`,
    `Shutdown batches: ${origin}/shutdowns/`,
    ...scheduleIndexLinks(models).map((page) => `${page.title}: ${origin}${page.path}`),
    `iCal: ${origin}/deadlines.ics`,
    `Deprecations feed: ${origin}/feed.xml`,
    `Guides: ${origin}${GUIDES_INDEX}`,
    ...guides.map((guide) => `Guide: ${origin}${guidePath(guide.slug)}`),
    `Frameworks: ${origin}${FRAMEWORKS_INDEX}`,
    ...frameworks.map((page) => `Framework: ${origin}${frameworkPath(page.slug)}`),
    `Glossary: ${origin}${GLOSSARY_INDEX}`,
    ...glossaryTerms.map((term) => `Glossary: ${origin}${glossaryPath(term.slug)}`),
    `RSS alias: ${origin}/rss.xml`,
    `Questions: ${origin}/questions/`,
    `Code scan: ${origin}/scan/`,
    `Data page: ${origin}/data/`,
    `Methodology: ${origin}${METHODOLOGY_PATH}`,
    `Sources: ${origin}${SOURCES_PATH}`,
    `Shutdown alerts: ${origin}${ALERTS_PATH}`,
    `GitHub Action: ${origin}${GITHUB_ACTION_PATH}`,
    `${BADGES_NAV}: ${origin}${BADGES_PATH}`,
    "Blank cells were not published on the official page. Columns: id, provider, status, shutdown date, official replacement, input price per 1M, output price per 1M, context tokens, max output tokens, source, last checked, model page.",
    ...lines,
    "",
  ].join("\n");
}
