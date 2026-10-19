import type { ModelRecord, Provider } from "../schema.ts";
import { publicName } from "./growth.ts";

export function llmsTxt(
  site: string,
  providers: Provider[],
  soon: ModelRecord[],
  extra: { months?: string[]; questions?: ModelRecord[]; shutdowns?: { title: string; path: string }[] } = {},
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
  return `# SunsetDiff

> SunsetDiff tracks AI model retirements and the migration diff: shutdown date, official replacement, and published changes in price, context, and code. Publisher: SunsetDiff.

## Key pages
- [Home](${origin}/)
- [Soonest shutdowns](${origin}/#soonest)
- [Calendar](${origin}/calendar/)
- [Deadlines](${origin}/deadlines/)
- [Shutdown batches](${origin}/shutdowns/)
- [Deadline calendar](${origin}/deadlines.ics)
- [New deprecations](${origin}/feed.xml)
- [Code scan](${origin}/scan/)
- [Deprecation questions](${origin}/questions/)
- [Changes](${origin}/changes/)
- [Dataset](${origin}/data/)
- [About](${origin}/about/)

## Dataset
The dataset is CC BY 4.0. Publisher: SunsetDiff. Blank spec fields were not on the official pages.
- [Data page](${origin}/data/)
- [JSON download](${origin}/dataset/sunsetdiff.json)
- [CSV download](${origin}/dataset/sunsetdiff.csv)
- [models.json](${origin}/data/models.json)
- [deprecations.csv](${origin}/data/deprecations.csv)
- [changelog.json](${origin}/data/changelog.json)

## Shutdown batches
One page per provider and exact shutdown date when at least three models share that date.
${shutdownLinks || "- None published."}

## Shutdown months
${monthLinks || "- None published."}

## Deprecation questions
${questionLinks || "- None published."}

## Soonest shutdowns
${soonLinks || "- None published."}

## Providers
${providerLinks}

## API
- [Index](${origin}/api/v1/index.json)
- [Upcoming shutdowns](${origin}/api/v1/upcoming.json)
- [Full model list](${origin}/llms-full.txt)
- [How we check](${origin}/about/)
`;
}

export function llmsFull(site: string, models: ModelRecord[]): string {
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
    `Deadlines: ${origin}/deadlines/`,
    `Shutdown batches: ${origin}/shutdowns/`,
    `iCal: ${origin}/deadlines.ics`,
    `Deprecations feed: ${origin}/feed.xml`,
    `Questions: ${origin}/questions/`,
    `Code scan: ${origin}/scan/`,
    `Data page: ${origin}/data/`,
    "Blank cells were not published on the official page. Columns: id, provider, status, shutdown date, official replacement, input price per 1M, output price per 1M, context tokens, max output tokens, source, last checked.",
    ...lines,
    "",
  ].join("\n");
}
