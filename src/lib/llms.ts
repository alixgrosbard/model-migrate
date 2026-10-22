import type { ModelRecord, Provider } from "../schema.ts";
import { BADGES_DESCRIPTION, BADGES_NAV, BADGES_PATH } from "./badges.ts";
import { publicName } from "./growth.ts";
import { scheduleIndexLinks } from "./schedule.ts";
import { GUIDES_INDEX, guidePath, guides } from "./guides.ts";
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
- [Changes](${origin}/changes/)
- [Dataset](${origin}/data/)
- [Status badges](${origin}${BADGES_PATH}): ${BADGES_DESCRIPTION}
- [Static API docs](${origin}/api/)
- [Compare trackers](${origin}/alternatives/)
- [About](${origin}/about/)
- [Pro](${origin}/pro/) is free until launch, then $19 a month. You won't be charged until Pro launches.

## Request errors
[All request errors](${origin}${REQUEST_ERRORS_INDEX}). Each page names the failure, the model change, and the source. Check dates are on the pages (${REQUEST_ERRORS_CHECKED}, 2026-10-21 for the thinking budget page, and 2026-10-22 for the API version 2026-10-21 sampling page). A code block is a quoted error only when the linked source prints that sentence.
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

## Status lists
Deprecated means the stored status is deprecated. Retired means the stored status is retired. Dates come from the model records.
- [Deprecated models](${origin}/deprecated/)
- [Retired models](${origin}/retired/)
${statusLinks || ""}

## API
- [Static API docs](${origin}/api/)
- [OpenAPI 3.1](${origin}${OPENAPI_PATH}): no API key. Server https://sunsetdiff.com.
- [Index](${origin}/api/v1/index.json)
- [Upcoming shutdowns](${origin}/api/v1/upcoming.json)
- [Full model records](${origin}/data/models.json)
- [Full model list](${origin}/llms-full.txt)
- [How we check](${origin}/about/)

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
    `API docs: ${origin}/api/`,
    `OpenAPI: ${origin}${OPENAPI_PATH}`,
    ...statusLlmsEntries(models, providers).map((page) => `${page.title}: ${origin}${page.path}`),
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
    `Questions: ${origin}/questions/`,
    `Code scan: ${origin}/scan/`,
    `Data page: ${origin}/data/`,
    `${BADGES_NAV}: ${origin}${BADGES_PATH}`,
    "Blank cells were not published on the official page. Columns: id, provider, status, shutdown date, official replacement, input price per 1M, output price per 1M, context tokens, max output tokens, source, last checked.",
    ...lines,
    "",
  ].join("\n");
}
