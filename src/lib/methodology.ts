import type { ModelRecord } from "../schema.ts";
import { newestSourceCheck } from "./cited-sources.ts";
import { METHODOLOGY_PATH } from "./trust-pages.ts";

export { METHODOLOGY_PATH };

export const METHODOLOGY_TITLE = "How SunsetDiff collects shutdown dates | SunsetDiff";
export const METHODOLOGY_DESCRIPTION =
  "Which official provider pages SunsetDiff scrapes, how often the refresh runs, the sanity gate, last_checked dates, and how a date conflict is stored.";

export interface ScrapeTarget {
  provider: string;
  url: string;
  role: string;
}

/** Pages scrapers/run.ts fetches. The role is what that file and the parser do with the body. */
export const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    provider: "OpenAI",
    url: "https://developers.openai.com/api/docs/deprecations",
    role: "Parsed for deprecation-table rows.",
  },
  {
    provider: "OpenAI",
    url: "https://developers.openai.com/api/docs/pricing.md",
    role: "Parsed for prices. A stored price source uses https://developers.openai.com/api/docs/pricing without the .md suffix.",
  },
  {
    provider: "Anthropic",
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations",
    role: "Parsed for the model status table and the retirement tables.",
  },
  {
    provider: "Anthropic",
    url: "https://platform.claude.com/docs/en/about-claude/pricing",
    role: "Parsed for prices.",
  },
  {
    provider: "Anthropic",
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
    role: "Parsed for context window, max output, and the other specs on that overview table.",
  },
  {
    provider: "Google Gemini API",
    url: "https://ai.google.dev/gemini-api/docs/deprecations",
    role: "Parsed for deprecation-table rows. shutdown_date comes from this page.",
  },
  {
    provider: "Google Gemini API",
    url: "https://ai.google.dev/gemini-api/docs/pricing",
    role: "Parsed for prices and for shutdown sentences. A sentence that names a different day is recorded as a conflict.",
  },
  {
    provider: "Google Vertex AI",
    url: "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions",
    role: "Parsed for model-version rows.",
  },
  {
    provider: "AWS Bedrock",
    url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html",
    role: "Parsed for lifecycle rows. This is the dated source.",
  },
  {
    provider: "AWS Bedrock",
    url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html",
    role: "Fetched on a live scrape and saved as a snapshot. Rows are not parsed from this page.",
  },
  {
    provider: "Azure OpenAI",
    url: "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule",
    role: "Parsed for schedule rows. This is the dated source.",
  },
  {
    provider: "Azure OpenAI",
    url: "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements",
    role: "Parsed for the fine-tune table. An id already on the schedule keeps its status and gains a source and a note.",
  },
  {
    provider: "Mistral",
    url: "https://docs.mistral.ai/models",
    role: "Parsed for model-table rows.",
  },
  {
    provider: "Mistral",
    url: "https://docs.mistral.ai/models/pricing",
    role: "Parsed for prices.",
  },
  {
    provider: "DeepSeek",
    url: "https://api-docs.deepseek.com/updates/",
    role: "Parsed for retirement sentences in the changelog.",
  },
  {
    provider: "DeepSeek",
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    role: "Parsed for the pricing table, prices, and retirement sentences.",
  },
  {
    provider: "DeepSeek",
    url: "https://api-docs.deepseek.com/news/news260424/",
    role: "Parsed for the V4 preview retirement sentence.",
  },
  {
    provider: "Groq",
    url: "https://console.groq.com/docs/deprecations.md",
    role: "Parsed for deprecation-table rows. A stored source uses https://console.groq.com/docs/deprecations without the .md suffix.",
  },
  {
    provider: "Groq",
    url: "https://console.groq.com/docs/models.md",
    role: "Parsed for production and preview model rows, token prices, context, and max completion. A stored source uses https://console.groq.com/docs/models without the .md suffix.",
  },
  {
    provider: "xAI",
    url: "https://docs.x.ai/developers/models",
    role: "Fetched with Accept: text/markdown. Parsed for text, image, video, and voice model rows. A stored source uses this URL. Token prices are the under-200k text rows. Image, video, and voice rates are not stored as per-token prices.",
  },
  {
    provider: "xAI",
    url: "https://docs.x.ai/developers/pricing",
    role: "Fetched with Accept: text/markdown. Parsed for the batch discount list and the US regional endpoint note.",
  },
  {
    provider: "xAI",
    url: "https://docs.x.ai/developers/migration/may-15-retirement",
    role: "Fetched with Accept: text/markdown. Parsed for the May 15, 2026 retirement list and the redirect table.",
  },
  {
    provider: "xAI",
    url: "https://docs.x.ai/developers/migration/imagine-image-quality-nov-2",
    role: "Fetched with Accept: text/markdown. Parsed for the November 2, 2026 grok-imagine-image-quality retirement.",
  },
  {
    provider: "xAI",
    url: "https://docs.x.ai/developers/release-notes",
    role: "Fetched with Accept: text/markdown. Parsed for voice, transcription, and Grok 4.5, 4.6, and 4.7 notes that name those models.",
  },
  {
    provider: "Cohere",
    url: "https://docs.cohere.com/docs/deprecations.md",
    role: "Parsed for retirement and deprecation sections. A stored source uses https://docs.cohere.com/docs/deprecations without the .md suffix.",
  },
  {
    provider: "Cohere",
    url: "https://docs.cohere.com/docs/models.md",
    role: "Parsed for model tables, context, and max output. A stored source uses https://docs.cohere.com/docs/models without the .md suffix. Per-token prices are not on this page.",
  },
  {
    provider: "OpenRouter",
    url: "https://openrouter.ai/api/v1/models?output_modalities=all",
    role: "Parsed for rows whose expiration_date is a calendar day. A null expiration_date is not stored. output_modalities=all is required because the default list omits models whose output is not text.",
  },
  {
    provider: "OpenRouter",
    url: "https://openrouter.ai/docs/guides/overview/models",
    role: "Checked for the sentence that calls expiration_date the deprecation date for the model endpoint. A failed fetch does not fail the refresh.",
  },
  {
    provider: "OpenRouter",
    url: "https://openrouter.ai/docs/client-sdks/python/components/model",
    role: "Checked for the sentence that calls expiration_date the date after which the model may be removed. A failed fetch does not fail the refresh.",
  },
  {
    provider: "Nebius Token Factory",
    url: "https://docs.tokenfactory.nebius.com/model-deprecations-november-2026.md",
    role: "Parsed for the Serverless removal table and its one removal date. A stored source uses https://docs.tokenfactory.nebius.com/model-deprecations-november-2026 without the .md suffix. A failed read keeps the stored Nebius rows.",
  },
  {
    provider: "Nebius Token Factory",
    url: "https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice.md",
    role: "Parsed for the August Serverless removal table. A stored source uses https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice without the .md suffix. A failed read keeps the stored rows from this page.",
  },
  {
    provider: "Together AI",
    url: "https://docs.together.ai/docs/deprecations.md",
    role: "Parsed for scheduled serverless removals, the inference removal table, the fine-tuning removal table, and active redirects. A stored source uses https://docs.together.ai/docs/deprecations without the .md suffix. A failed read keeps the stored Together rows.",
  },
  {
    provider: "Together AI",
    url: "https://docs.together.ai/docs/changelog.md",
    role: "Parsed for a replacement the deprecations table does not name. A stored source uses https://docs.together.ai/docs/changelog without the .md suffix. A failed read leaves those replacements unset and still applies the deprecations page.",
  },
  {
    provider: "Together AI",
    url: "https://docs.together.ai/docs/serverless/models.md",
    role: "Parsed for per-1M-token prices, context, function calling, and structured outputs when the API model string matches a stored id. A stored source uses https://docs.together.ai/docs/serverless/models without the .md suffix. A failed read leaves those fields empty.",
  },
  {
    provider: "Fireworks AI",
    url: "https://docs.fireworks.ai/updates/changelog.md",
    role: "Parsed for serverless and Serverless Training deprecation sections that link a model page. A stored source uses https://docs.fireworks.ai/updates/changelog without the .md suffix. A failed read keeps the stored Fireworks rows.",
  },
  {
    provider: "Fireworks AI",
    url: "https://docs.fireworks.ai/serverless/us-only-serverless.md",
    role: "Parsed for the US model id table. A US-only changelog row is stored only when this table names that model. A stored source uses https://docs.fireworks.ai/serverless/us-only-serverless without the .md suffix. A failed read keeps the stored Fireworks rows.",
  },
  {
    provider: "Fireworks AI",
    url: "https://docs.fireworks.ai/getting-started/quickstart.md",
    role: "Checked for accounts/fireworks/models/glm-5p3-flash. Library links are joined to that id shape only when this string is present. A stored source uses https://docs.fireworks.ai/getting-started/quickstart without the .md suffix. A failed read keeps the stored Fireworks rows.",
  },
  {
    provider: "GitHub Copilot",
    url: "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
    role: "Parsed for the model retirement history table and the supported models table. A failed read keeps the stored GitHub Copilot rows.",
  },
  {
    provider: "GitHub Copilot",
    url: "https://github.blog/changelog-sitemap.xml",
    role: "Parsed for changelog post URLs about Copilot model retirements. Posts linked there are fetched. A failed read keeps the stored GitHub Copilot rows.",
  },
  {
    provider: "GitHub Copilot",
    url: "https://github.blog/changelog-sitemap2.xml",
    role: "Parsed for older changelog post URLs about Copilot model retirements. A failed read keeps the stored GitHub Copilot rows.",
  },
  {
    provider: "GitHub Copilot",
    url: "https://github.blog/changelog-sitemap3.xml",
    role: "Parsed for older changelog post URLs about Copilot model retirements. A failed read keeps the stored GitHub Copilot rows.",
  },
  {
    provider: "GitHub Copilot",
    url: "https://github.blog/changelog-sitemap4.xml",
    role: "Parsed for changelog post URLs about Copilot model retirements. A failed read keeps the stored GitHub Copilot rows.",
  },
];

export const ENRICH_PAGES: { label: string; detail: string }[] = [
  {
    label: "OpenAI model docs",
    detail:
      "The live scrape reads https://developers.openai.com/api/docs/models.md and each model page under https://developers.openai.com/api/docs/models/. Empty price, context, and max-output fields are filled only when that page prints them.",
  },
  {
    label: "Gemini model docs",
    detail:
      "The live scrape reads https://ai.google.dev/gemini-api/docs/models and the model pages linked there. A spec field stays empty when the page does not print it.",
  },
  {
    label: "Vertex model docs and pricing",
    detail:
      "Model-doc links are taken from the saved Vertex snapshot. Prices are read from https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing when that fetch succeeds. If it does not, the log says prices stay blank.",
  },
  {
    label: "Anthropic model docs",
    detail:
      "Model-doc links are taken from the saved Anthropic HTML. Each page is https://platform.claude.com/docs/en/models/<slug>/overview.md.",
  },
  {
    label: "Mistral model docs",
    detail: "Model-doc links are taken from the saved Mistral models HTML, then fetched from https://docs.mistral.ai/models/.",
  },
];

export interface MethodologySection {
  heading: string;
  paragraphs: string[];
}

export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    heading: "What gets fetched",
    paragraphs: [
      "The refresh runs npm run scrape. That command fetches the public documentation pages in the table below. It does not call a model inference API. The client is SunsetDiffBot/1.0 (+https://sunsetdiff.onrender.com). Before a fetch, it reads that host's robots.txt for User-agent: *. If those rules disallow the path, the fetch throws. Each fetch is tried up to three times.",
      "HTML and markdown bodies are saved under snapshots/. A run with --from-snapshots reads the saved fixtures and does not fetch. The GitHub Actions refresh does not pass that flag, so it fetches live pages.",
      "After the tables are parsed, a live scrape reads official model-doc pages for price, context window, and max output. A fetch error is logged. The field stays empty. The URLs that were stored on a model are listed on the [sources page](/sources/).",
      "NVIDIA hosted-model rows are not fetched by this command. build.nvidia.com sets Crawl-delay: 10 for User-agent: *, and model pages that say the hosted endpoint is deprecated are not in the sitemap. A crawl of every model page is not part of the refresh. Those rows are curated from the model page or an NVIDIA GitHub notice, and each row keeps that URL. A refresh keeps them because scrapers/run.ts copies stored rows whose provider is not in the scrape. The AI Enterprise page at https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html is not a source for these rows. It lists self-hosted NIM containers and other AI Enterprise components. The difference is explained in [Hosted API vs NIM containers](/guides/nvidia-hosted-api-vs-nim-containers/).",
    ],
  },
  {
    heading: "Six-hour refresh",
    paragraphs: [
      "The workflow is .github/workflows/refresh.yml. GitHub runs a schedule from the repository's default branch. The job checks out cursor/sunsetdiff-v1-3cab, which is the branch in render.yaml that Render deploys.",
      "Two cron lines are registered: minute 17 of 00:00, 06:00, 12:00, and 18:00 UTC, and minute 47 of 03:00, 09:00, 15:00, and 21:00 UTC. A scheduled run is skipped when the newest commit on that branch whose message starts with \"data: refresh\" is less than 5 hours old. A manual run is not skipped. The workflow comment says the scrape still happens about every 6 hours.",
      "The job runs the scrape, then npm test. A data commit is created only when both succeed. That commit is allowed to change only data/, snapshots/, and action/snapshot/. The job refuses to push if any other path would change. A failed scrape, a failed test, or a failed data build opens or updates one GitHub issue labeled scraper-broken and does not push the data. A failed push opens or updates an issue labeled refresh-push-failed. A later refresh that succeeds closes the open issues with those labels.",
    ],
  },
  {
    heading: "Sanity gate and tests",
    paragraphs: [
      "Before any model file is replaced, each provider's new row count is checked. Zero rows fails the gate. When the previous file set had rows, a new count below 70 percent of that previous count also fails. The error text says the count is more than 30 percent below the previous count. A count of exactly 70 percent passes. If any provider fails, the command exits before writeModels runs, so the model files are not replaced. The refresh job commits only after the scrape and the tests succeed, so a failed gate is not pushed.",
      "OpenRouter is decided before that gate. A failed or incomplete models API read, or a row drop that the stored expiration dates do not explain, removes OpenRouter from the scrape and keeps the stored rows. That does not fail the other providers. The OpenRouter count is not sent through the zero-row check.",
      "Nebius Token Factory is decided before that gate. A failed read, a page that no longer matches the deprecation table, or a missing row whose shutdown date is still ahead removes Nebius from the scrape and keeps the stored rows. That does not fail the other providers. The Nebius count is not sent through the zero-row check.",
      "npm test runs after a successful scrape and before the data commit. A failing test stops the commit.",
    ],
  },
  {
    heading: "last_checked",
    paragraphs: [
      "The scrape stamps the UTC day it starts onto each source it writes. The field is last_checked, as YYYY-MM-DD. A spec value copied from a page gets the same day under specs_sources. When a later scrape writes that URL again, last_checked moves to the new day. A source URL the new scrape does not write is kept, with its older last_checked.",
      "If the model's compared content did not change, updated_at stays the previous timestamp. A null date or spec is shown on the site as Not published. The parser leaves the field null when it does not find a value on the page it read.",
    ],
  },
  {
    heading: "When two official pages disagree",
    paragraphs: [
      "The Gemini scraper is the one that records a shutdown-date conflict. It looks for a pricing-page sentence that says a model is deprecated and will be shut down on a date. If that date is not the shutdown_date taken from the deprecations page, the model note starts with \"Sources disagree.\" The note links the deprecations page and the pricing page. The stored shutdown_date stays the deprecations-page date, including when that cell was empty. If the two dates match, that note is removed.",
      "Models whose notes contain that prefix are listed on [Conflicting dates](/conflicts/). No other provider scraper writes that prefix.",
    ],
  },
  {
    heading: "Deprecated and retired",
    paragraphs: [
      "A model record's status is one of active, legacy, deprecated, or retired. The scraper sets that word. It does not send a request to the model to see if the call fails. Provider pages do not all use these words the same way. The glossary states those differences: [Deprecated](/glossary/deprecated/) and [Retired](/glossary/retired/).",
      "OpenAI rows parsed from the deprecations tables are stored as deprecated or retired. A missing date, a date kind of none, or not_before is stored as deprecated. An exact date, or a month-only date compared at the end of that month, is stored as retired when it is before the check day, and deprecated when it is not. An id that appears only as a replacement is added as active. Its note says no shutdown date was published for that id on that page.",
      "Anthropic copies the status cell from the Model status table: active, legacy, deprecated, or retired. Any other word is stored as active. The retirement column is the shutdown date. The deprecated column is deprecation_date.",
      "Gemini stores a row as deprecated when the replacement cell names an auto-routed model and the shutdown cell has no date. Otherwise a missing date, kind none, or not_before is stored as active. An exact or month-only date before the check day is stored as retired, and a later one is stored as deprecated.",
      "Vertex stores every row in a section whose heading includes \"retired\" as retired. Otherwise a missing date, kind none, or not_before is stored as active. A retirement date before the check day is stored as retired, and a later one is stored as deprecated.",
      "Bedrock stores an end-of-life date before the check day as retired. A row in the legacy section, or a legacy date already before the check day, is stored as legacy. Other rows are stored as active. Bedrock rows are not stored as deprecated.",
      "Azure schedule rows map the lifecycle word: generally available and preview become active, and deprecated, legacy, and retired stay those words. An exact retirement date before the check day is then stored as retired. A fine-tune row on the schedule is stored as retired when its deployment date is before the check day, and active otherwise. A fine-tune id that exists only on the retirements policy page is stored as retired when that deployment date is before the check day, and deprecated otherwise.",
      "Mistral stores a row with no retirement date, or a date kind of none, as legacy. A retirement date before the check day is stored as retired. A later date is stored as deprecated.",
      "DeepSeek stores deepseek-chat and deepseek-reasoner from the changelog discontinuation date: retired when that date is before the check day, and deprecated otherwise. The v4-flash names the changelog or the pricing page calls retired are stored as retired, with no shutdown day. Other ids parsed from the pricing table are stored as active.",
      "Groq stores a deprecations-table row as retired when its shutdown date is before the check day, and deprecated otherwise. The shutdown date is the table's shutdown column. An id that is only on the models page is stored as active, with no shutdown date. A price that the models page gives per hour or per million characters is not stored as a per-token price.",
      "NVIDIA hosted rows are curated, not parsed by the refresh. A build.nvidia.com page that says the NIM endpoint is deprecated is stored as deprecated, with no shutdown date, because those pages do not print a day. An NVIDIA GitHub notice that prints a full API shutdown day is stored as retired when that day is before the check day. The id it names as the successor is stored as active, with no shutdown date. A notice that says a hosted route retired and does not print a day is stored as retired, with no shutdown date. Self-hosted NIM container dates on the AI Enterprise lifecycle page are not copied onto these rows.",
      "xAI stores a retirement date before the check day as retired, and a later date as deprecated. grok-voice-2.0 is stored as deprecated with no shutdown date, because the release notes do not print a day. An id that is only on the models page is stored as active, with no shutdown date. The redirect table is the replacement. A caution sentence that names a different target is kept in the note. Image, video, and per-minute voice rates are not stored as per-token prices. The under-200k text row is the stored token price. The 200k-and-above rate stays in the note.",
      "Cohere stores an exact shutdown date before the check day as retired, and a later one as deprecated. The September 15, 2025 command models are stored as deprecated with that deprecation date and no shutdown date, because the page says a shutdown date will be assigned later. summarize has no replacement id on that page. A models-page sentence that recommends an id for new projects is not stored as a replacement. Live rows, and platform-table ids with no status, are stored as active with no shutdown date. A price printed per 1K searches is not stored as a per-token price. The how-does-cohere-pricing-work page does not print per-model token prices, so those fields stay empty.",
      "OpenRouter stores a row only when the models API sets expiration_date to a real calendar day. That day is deprecation_date. shutdown_date is the same day and shutdown_date_kind is not_before, because the model schema says the model may be removed after that day and does not say the endpoint stops on that day. Status stays deprecated while the id is still in the list, including when the day is before the check day. A null expiration_date is not stored. The response does not name a replacement, so none is stored. Token prices are stored only when output_modalities is text, because the pricing object is per token, request, or unit. A fetch error, a body that is not a data array, a total_count that does not match the rows, or a row drop that the stored expiration dates do not explain keeps the stored OpenRouter rows and does not fail the other providers. A stored OpenRouter row whose expiration date is before the check day is kept when a later list omits it.",
      "Nebius Token Factory stores a row from the November 2026 or August 2026 deprecation notice when that page has one removal date and a table headed Deprecating Model and Recommended Replacement. The removal date is shutdown_date with kind exact. A date before the check day is stored as retired, and a later date is stored as deprecated. The recommended replacement is official. An id that appears only as a replacement is stored as active, with no shutdown date. When the page prints them, the note says this change only affects Serverless usage, Dedicated Endpoints are unaffected, and Token Factory does not automatically reroute requests from deprecated models. The notices do not print a per-token price, so those fields stay empty. The June 2026 notice is not parsed: its table has no recommended replacement column. A fetch error, a page that does not match the two-column table, or a drop of a row whose shutdown date is still ahead keeps the stored Nebius rows and does not fail the other providers.",
      "An active model with no shutdown date whose source is a model-doc page, and not a deprecations page, is kept when a later scrape does not emit it. Deprecation-table rows that disappear are not kept. A stored xAI or Cohere row whose source host is docs.x.ai or docs.cohere.com is kept when a later scrape omits it, so a short page does not silently drop those rows. Removing one still takes a commit that deletes the file and stops the parser from emitting it. After model-doc pages are attached, the scrape also adds an undated alias when a dated snapshot id matches that alias plus -YYYY-MM-DD and a model-doc page names the alias. The alias is stored as active with no shutdown date. The shutdown dates stay on the snapshot records.",
    ],
  },
  {
    heading: "Report an error",
    paragraphs: [
      "To report a wrong date or a missing model, open a GitHub issue on this repository. That is the same instruction as the [About](/about/) page. Publisher: SunsetDiff.",
    ],
  },
];

export function collectionFacts(models: ModelRecord[]) {
  const bedrock = models.filter((model) => model.provider === "aws-bedrock");
  const bedrockPriced = bedrock.filter(
    (model) => model.specs.input_price_per_mtok != null || model.specs.output_price_per_mtok != null,
  ).length;
  return {
    bedrockModels: bedrock.length,
    bedrockPriced,
    newestCheck: newestSourceCheck(models) ?? "",
  };
}

export function awsPriceSentence(facts: { bedrockModels: number; bedrockPriced: number }): string {
  return `The AWS Bedrock provider record lists https://aws.amazon.com/bedrock/pricing/. The scrape does not fetch that URL. ${facts.bedrockModels} AWS Bedrock records are in the dataset, and ${facts.bedrockPriced} of them store an input or output price.`;
}
