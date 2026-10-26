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
      "An active model with no shutdown date whose source is a model-doc page, and not a deprecations page, is kept when a later scrape does not emit it. Deprecation-table rows that disappear are not kept. After model-doc pages are attached, the scrape also adds an undated alias when a dated snapshot id matches that alias plus -YYYY-MM-DD and a model-doc page names the alias. The alias is stored as active with no shutdown date. The shutdown dates stay on the snapshot records.",
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
