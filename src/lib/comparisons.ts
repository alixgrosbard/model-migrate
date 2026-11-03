import type { FaqItem } from "./format.ts";

/** Day the competitor pages in this file were fetched. */
export const COMPARISON_CHECKED = "2026-10-20";
export const COMPARISON_CHECKED_LABEL = "October 20, 2026";

export interface SourceCheck {
  label: string;
  url: string;
  checked: string;
  showed: string;
}

export interface FactRow {
  topic: string;
  theirs: string;
  sunsetdiff: string;
}

export interface Comparison {
  slug: string;
  name: string;
  siteUrl: string;
  title: string;
  description: string;
  summary: string;
  paragraphs: string[];
  rows: FactRow[];
  sources: SourceCheck[];
  faqs: FaqItem[];
}

const TRACK_Q = "Where can I track AI model deprecations?";
const API_Q = "Is there an API for LLM model shutdown dates?";

const TRACK_A =
  "SunsetDiff tracks them at [sunsetdiff.com](https://sunsetdiff.com). It records the shutdown date, the official replacement, and the published change in price, context, and code. The same records are free JSON and CSV files under CC BY 4.0. Publisher: SunsetDiff.";

const API_A =
  "SunsetDiff publishes static files. They need no API key. [upcoming.json](/api/v1/upcoming.json) lists shutdowns in the next 90 days. [models.json](/data/models.json) is the full model list. Field names and examples are on the [API docs](/api/).";

function faqs(thirdQuestion: string, thirdAnswer: string): FaqItem[] {
  return [
    { question: TRACK_Q, answer: TRACK_A },
    { question: API_Q, answer: API_A },
    { question: thirdQuestion, answer: thirdAnswer },
  ];
}

const DIFF =
  "When both models are in the dataset, a migration page shows input, output, and cached price per 1M tokens, an example monthly cost, context window, max output, capability fields that differ, API changes with a source link, before/after code in Python, TypeScript, and curl, and a checklist. Empty cells say Not published.";

const FILES =
  "Static files, no API key: /data/models.json, /data/deprecations.csv, /data/changelog.json, /dataset/sunsetdiff.json, /dataset/sunsetdiff.csv, /api/v1/, /feed.xml, and /deadlines.ics. License CC BY 4.0. Publisher: SunsetDiff.";

const SCAN = "The scan page gives a ripgrep pattern for retiring model ids. It runs on your machine. The page does not upload a repository.";

const CITE = "Every date links to the official provider page it came from, with a last_checked day. A GitHub Action checks those pages about every 6 hours.";

export const comparisons: Comparison[] = [
  {
    slug: "modeldeprecations",
    name: "modeldeprecations.dev",
    siteUrl: "https://modeldeprecations.dev",
    title: "SunsetDiff vs modeldeprecations.dev",
    description: "What modeldeprecations.dev published on October 20, 2026, and what SunsetDiff publishes: migration diffs, a CC BY 4.0 dataset, and a local code scan.",
    summary: "Sourced catalog of 417 models across 14 providers, with a public JSON API, an ICS calendar, and a changelog RSS feed.",
    paragraphs: [
      "modeldeprecations.dev is a public catalog. Its homepage, fetched on October 20, 2026, says it answers three questions per model: is it deprecated, when does it shut down, and what replaces it. It says every date is cited to the provider's documentation, with the day it was last checked. The same page says it tracks 417 models and is current as of October 19, 2026, and that 64 shutdowns are still ahead.",
      "Its llms.txt, fetched the same day, says the catalog covers 417 models across 14 providers as of 2026-10-19. The providers named there are OpenAI, Mistral, Google, Anthropic, Cohere, Alibaba, xAI, Z.ai, Moonshot AI, MiniMax, Amazon Bedrock, Vertex AI, DeepSeek, and Xiaomi MiMo. It links a full catalog at /api/v1/models.json, one model file, a JSON Schema, a shields.io badge JSON, calendar.ics, and changelog.xml.",
      "A model file fetched the same day, /api/v1/models/openai/gpt-4o.json, includes provider, model, name, aliases, description, released_on, deprecated_on, shutdown_on, status, replacements, sources, last_verified, computed_status, and asOf. That file's last_verified and asOf are 2026-10-19. The replacement object includes provider, model, recommended, and note. The usage guide on the homepage says a replacement can also carry api_change when moving to it needs more than a new id. That gpt-4o file does not include a price or a context window.",
      "The GitHub repo linked from the site, mnfst/modeldeprecations.dev, has an MIT LICENSE file. The homepage says lifecycle dates live in YAML and that CI rejects a date without a source URL.",
    ],
    rows: [
      {
        topic: "What it records",
        theirs: "Deprecation status, shutdown date, replacement, and sources. The fetched gpt-4o record has no price or context-window fields. A replacement can be flagged api_change.",
        sunsetdiff: DIFF,
      },
      {
        topic: "Coverage named on the page",
        theirs: "417 models, 14 providers, as of 2026-10-19, including Cohere, Alibaba, xAI, Z.ai, Moonshot, MiniMax, DeepSeek, and Xiaomi MiMo.",
        sunsetdiff: "The providers in this build are listed at the top of this page. Counts come from the dataset, not from a fixed slogan.",
      },
      {
        topic: "Machine-readable files",
        theirs: "Public JSON API, JSON Schema, calendar.ics, changelog RSS, llms.txt, and Markdown for model pages. Repo license file is MIT.",
        sunsetdiff: FILES,
      },
      {
        topic: "Code scan",
        theirs: "The pages fetched on October 20, 2026 describe badges, curl, and WebMCP tools named check_model_deprecation, list_shutdowns, find_replacement, and get_usage_guide. They do not describe a local repository scan.",
        sunsetdiff: SCAN,
      },
      {
        topic: "Citations",
        theirs: "Homepage and llms.txt say each date cites provider docs and a last-checked day. The gpt-4o file includes sources and last_verified.",
        sunsetdiff: CITE,
      },
    ],
    sources: [
      {
        label: "modeldeprecations.dev homepage",
        url: "https://modeldeprecations.dev",
        checked: COMPARISON_CHECKED,
        showed: "417 models, current as of October 19, 2026, 64 shutdowns still ahead, the three questions, curl examples, calendar.ics, changelog.xml, YAML in the GitHub repo, and the WebMCP tool names.",
      },
      {
        label: "llms.txt",
        url: "https://modeldeprecations.dev/llms.txt",
        checked: COMPARISON_CHECKED,
        showed: "417 models across 14 providers as of 2026-10-19, the provider list and per-provider counts, and the API and feed links.",
      },
      {
        label: "GPT-4o model JSON",
        url: "https://modeldeprecations.dev/api/v1/models/openai/gpt-4o.json",
        checked: COMPARISON_CHECKED,
        showed: "Record fields, last_verified 2026-10-19, and a replacement object with provider, model, recommended, and note.",
      },
      {
        label: "Repository LICENSE",
        url: "https://raw.githubusercontent.com/mnfst/modeldeprecations.dev/main/LICENSE",
        checked: COMPARISON_CHECKED,
        showed: "MIT License, copyright 2026 modeldeprecations.dev contributors.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with modeldeprecations.dev?",
      "Both sites cite official pages and publish shutdown dates, replacements, JSON, an ICS calendar, and an RSS changelog. modeldeprecations.dev's public catalog on October 20, 2026 covered 14 providers and 417 models. SunsetDiff adds the migration diff for price, context, and code, a CC BY 4.0 dataset, and a local code scan for the providers in this build.",
    ),
  },
  {
    slug: "quora-model-deprecation-tracker",
    name: "quora/model-deprecation-tracker",
    siteUrl: "https://github.com/quora/model-deprecation-tracker",
    title: "SunsetDiff vs quora/model-deprecation-tracker",
    description: "What the quora/model-deprecation-tracker README published on October 20, 2026, and what SunsetDiff publishes as a public dataset.",
    summary: "A GitHub repo that scrapes provider pages into a README table, a deprecations.ics file, and optional Slack alerts.",
    paragraphs: [
      "quora/model-deprecation-tracker is a public GitHub repository. The GitHub API, fetched on October 20, 2026, describes it as tracking AI model deprecation schedules across OpenAI, Anthropic, Vertex AI, Bedrock, and Gemini. That response has license set to null. pushed_at on that response is 2026-10-19T19:11:16Z.",
      "The README on the master branch, fetched the same day, says it tracks OpenAI, Anthropic, Vertex AI, AWS Bedrock, and Gemini, and links each provider's deprecation page. It says to download deprecations.ics for reminders 7 and 30 days before a shutdown. The schedule table is marked Last updated: 2026-10-19 and has columns for model, model id, status, deprecated, shutdown, and replacement.",
      "The README documents Slack alerts through a SLACK_WEBHOOK_URL secret, sent 7 days and 1 day before a shutdown. It says Anthropic Slack alerts are disabled by default because Bedrock dates are used for those alerts, while Anthropic rows stay in the tracker, the calendar, and the README. Setup is pip install -r requirements.txt and python main.py. The README does not document a public HTTP API.",
    ],
    rows: [
      {
        topic: "Where it lives",
        theirs: "A GitHub repo you run locally. The README table is the schedule. Last updated line: 2026-10-19.",
        sunsetdiff: "A public website. The same facts are HTML pages and static files.",
      },
      {
        topic: "Providers named in the README",
        theirs: "OpenAI, Anthropic, Vertex AI, AWS Bedrock, and Gemini.",
        sunsetdiff: "The providers in this build are listed at the top of this page.",
      },
      {
        topic: "Files",
        theirs: "deprecations.ics in the repo, with 7-day and 30-day reminders. No public HTTP API is documented in the README. GitHub reports no license.",
        sunsetdiff: FILES,
      },
      {
        topic: "Migration detail",
        theirs: "The README table has a replacement column. It does not document price, context, or code diffs.",
        sunsetdiff: DIFF,
      },
      {
        topic: "Alerts and scan",
        theirs: "Optional Slack webhook, 7 days and 1 day out. Anthropic Slack alerts are off unless configured.",
        sunsetdiff: SCAN,
      },
    ],
    sources: [
      {
        label: "GitHub repository",
        url: "https://github.com/quora/model-deprecation-tracker",
        checked: COMPARISON_CHECKED,
        showed: "Public repo on the master branch, with README.md, deprecations.ics, and main.py.",
      },
      {
        label: "README.md on master",
        url: "https://raw.githubusercontent.com/quora/model-deprecation-tracker/master/README.md",
        checked: COMPARISON_CHECKED,
        showed: "Provider list, ICS reminder windows, the schedule table last updated 2026-10-19, Slack alert rules, and the local setup commands.",
      },
      {
        label: "GitHub API repository object",
        url: "https://api.github.com/repos/quora/model-deprecation-tracker",
        checked: COMPARISON_CHECKED,
        showed: "Description, license null, and pushed_at 2026-10-19T19:11:16Z.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with the Quora model deprecation tracker?",
      "The Quora tracker is a GitHub repo. Its README, checked October 20, 2026, publishes a markdown table, an ICS file, and optional Slack alerts for five provider pages. SunsetDiff is a public site with static JSON and CSV, migration diffs, an RSS feed, and a local code scan.",
    ),
  },
  {
    slug: "endoflife-ai",
    name: "endoflife.ai",
    siteUrl: "https://endoflife.ai",
    title: "SunsetDiff vs endoflife.ai",
    description: "endoflife.ai is a software end-of-life site with an AI model research article. This page says what that site published on October 20, 2026.",
    summary: "A free software end-of-life catalog and risk scores, plus a research article on AI model deprecation dates.",
    paragraphs: [
      "endoflife.ai's homepage, fetched on October 20, 2026, describes a free public platform for software end-of-life intelligence, built on the endoflife.date open dataset. It says you can paste a package.json or requirements.txt, or check a single product. It says data is reconciled from official vendor lifecycle pages, endoflife.date, NVD, and CISA KEV, and that every date carries its source. It says dependency files are scanned in the browser and are not stored or transmitted.",
      "The same homepage says 600+ products are indexed. It also displays the lines 13,000+ Pages & Score Cards and 8,000+ Pages & Score Cards, and $0 Cost to Check. It describes an EOL Risk Score from 0 to 100 using EOL recency, attack surface, CISA KEV exposure, and extended support. It says 54 flagship products are cross-checked against official vendor documentation.",
      "The site also publishes a research article, AI Model Deprecation Dates 2026, at /article-ai-models-eol. Fetched the same day, the article says it was published May 31, 2026 by endoflife.ai Research and that it is updated at every build. It covers OpenAI, Google Gemini, Meta Llama, Mistral, and Claude, with tables of model ids, dates, status, and a replacement column, plus EOL Risk Scores. The article says the endoflife.ai API provides programmatic access to deprecation dates for all tracked models. Linked counts on that page are 20 OpenAI models, 13 Gemini models, 15 Llama models, 14 Mistral models, and 25 Claude model versions.",
    ],
    rows: [
      {
        topic: "Scope",
        theirs: "Software end-of-life across products, runtimes, and frameworks, with a research article on AI model dates.",
        sunsetdiff: "AI model shutdowns and the migration diff for the providers in this build.",
      },
      {
        topic: "AI model dates",
        theirs: "The May 31, 2026 article, which says it updates at every build, publishes timeline tables and risk scores for the providers named above.",
        sunsetdiff: `${CITE} ${DIFF}`,
      },
      {
        topic: "How you read it",
        theirs: "Browser scan of dependency files. The article says an API exposes deprecation dates for the models it tracks.",
        sunsetdiff: `${FILES} ${SCAN}`,
      },
    ],
    sources: [
      {
        label: "endoflife.ai homepage",
        url: "https://endoflife.ai/",
        checked: COMPARISON_CHECKED,
        showed: "Software EOL product, 600+ products, the page-count lines, the $0 cost line, the risk-score factors, the browser scan, and the link to the AI model article.",
      },
      {
        label: "AI Model Deprecation Dates 2026",
        url: "https://endoflife.ai/article-ai-models-eol",
        checked: COMPARISON_CHECKED,
        showed: "Published May 31, 2026, updated at every build, provider sections, linked model counts, and the sentence about the endoflife.ai API.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with endoflife.ai?",
      "endoflife.ai tracks software end of life and also publishes an AI model deprecation article and risk scores. SunsetDiff is a model-retirement dataset: shutdown dates, official replacements, migration diffs, and static JSON, CSV, ICS, and RSS files for the providers in this build.",
    ),
  },
  {
    slug: "developers-digest",
    name: "Developers Digest",
    siteUrl: "https://www.developersdigest.tech/deprecations",
    title: "SunsetDiff vs Developers Digest deprecations",
    description: "What the Developers Digest deprecations page published on October 20, 2026, and what SunsetDiff publishes as downloadable files.",
    summary: "An HTML catalog of 630 AI models across 11 providers, dated Oct 17, 2026, plus a shutdown calendar article.",
    paragraphs: [
      "Developers Digest's homepage, fetched on October 20, 2026, describes an AI developer education site: blog posts, a tools directory, tutorials it counts as 300+, guides, courses, product comparisons, and a newsletter. The nav includes a Deprecations item labeled Model shutdown dates.",
      "https://www.developersdigest.tech/deprecations, fetched the same day, titles itself AI model deprecation and shutdown dates (Oct 2026). Its description says shutdown dates and replacements for 630 AI models across 11 API providers, as of Oct 17, 2026, with 218 shutdowns scheduled, each linked to the official page. Visible text says every row comes from the provider's own deprecation, lifecycle, or changelog page, that each provider page carries the day its sources were read, and that a passed date stays deprecated until the provider lists the model as retired. It says 121 models shut down in the 120 days after Oct 17, 2026 across 8 providers.",
      "Dataset JSON-LD on that page has dateModified 2026-10-17 and names no license and no download URL. The HTML does not link a .json, .csv, .ics, or feed.xml file. Per-provider dataset descriptions on the same page, all as of Oct 17, 2026: OpenAI 134 models (51 scheduled, 83 retired), Azure OpenAI 209 (88 scheduled, 121 retired), Anthropic 21 (1 scheduled, 1 deprecated, 19 retired), Amazon Bedrock 44 (36 scheduled, 8 retired), Gemini API 59 (13 scheduled, 7 deprecated, 39 retired), Vertex AI 54 (27 scheduled, 2 deprecated, 25 retired), Mistral 43 (1 scheduled, 42 retired), Cohere 12 (5 deprecated, 7 retired), xAI 11 (1 scheduled, 1 deprecated, 9 retired), DeepSeek 4 retired, Groq 39 retired.",
      "A separate article, AI Model Shutdown Dates 2026-2027, says it recounts scheduled API shutdowns through mid 2027. Fetched the same day, it says 192 dated shutdowns fall between then and the end of June 2027, re-checked on October 18, 2026, across OpenAI, Anthropic, Google API and Vertex AI, Microsoft Foundry, Amazon Bedrock, and xAI. It uses Claude Sonnet 4.5 as an example of different dates by platform: November 30, 2026 on the Claude API and April 8, 2027 on Amazon Bedrock.",
    ],
    rows: [
      {
        topic: "What the deprecations page is",
        theirs: "HTML tables and per-provider pages. 630 models, 11 providers, as of Oct 17, 2026. Rows link to official pages.",
        sunsetdiff: `${CITE} ${DIFF}`,
      },
      {
        topic: "Downloads",
        theirs: "The deprecations page JSON-LD names no distribution URL and no license. The HTML fetched that day does not link JSON, CSV, ICS, or RSS.",
        sunsetdiff: FILES,
      },
      {
        topic: "Code scan",
        theirs: "The deprecations page fetched that day does not describe a repository scan.",
        sunsetdiff: SCAN,
      },
    ],
    sources: [
      {
        label: "Developers Digest homepage",
        url: "https://www.developersdigest.tech/",
        checked: COMPARISON_CHECKED,
        showed: "Education site description, the 300+ tutorials line, and the Deprecations nav item.",
      },
      {
        label: "Deprecations catalog",
        url: "https://www.developersdigest.tech/deprecations",
        checked: COMPARISON_CHECKED,
        showed: "630 models, 11 providers, Oct 17, 2026, 218 scheduled shutdowns, the sourcing rules, the 121-model window, and the per-provider Dataset descriptions.",
      },
      {
        label: "Shutdown calendar article",
        url: "https://www.developersdigest.tech/blog/ai-model-shutdowns-2026-2027",
        checked: COMPARISON_CHECKED,
        showed: "192 dated shutdowns through June 2027, re-checked October 18, 2026, and the Sonnet 4.5 platform-date example.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with Developers Digest?",
      "Developers Digest publishes an HTML deprecation catalog, checked here on October 20, 2026 and dated Oct 17, 2026 on the page, plus articles about shutdown calendars. SunsetDiff publishes the same kind of cited dates as CC BY 4.0 JSON and CSV, with migration diffs, an ICS feed, an RSS feed, and a local code scan.",
    ),
  },
  {
    slug: "deprecations-info",
    name: "deprecations.info",
    siteUrl: "https://deprecations.info",
    title: "SunsetDiff vs deprecations.info",
    description: "deprecations.info publishes a JSON Feed and RSS of AI model shutdowns. This page records what those files showed on October 20, 2026.",
    summary: "JSON Feed, RSS, and a provider list for AI model shutdown announcements from nine providers.",
    paragraphs: [
      "deprecations.info's homepage, fetched on October 20, 2026, calls itself AI Deprecations Feeds. It says it tracks deprecations from OpenAI, Anthropic, Google AI/Gemini, Google Vertex AI, AWS Bedrock, Cohere, Groq, xAI, and Azure, as a JSON API, a JSON Feed, and RSS. It says a model shows up when the provider announces a shutdown.",
      "The homepage says that when a provider publishes different dates by region, the feed keeps one row per model id and uses the earliest published deprecation date and the earliest shutdown date. It links the GitHub repo deprecations/deprecations-rss and shows how to follow the RSS URL in Feedly, an email-from-RSS service, or Slack.",
      "https://deprecations.info/v1/feed.json, fetched the same day, is JSON Feed 1.1. The title is AI Model Deprecations. The author name in the file is deprecations.info. Each item has id, url, title, content_text, date_published, tags, and a _deprecation object with provider, model_id, shutdown_date, deprecation_date, announcement_date, replacement_models, first_observed, and last_observed. The first items are OpenAI model ids whose url is an OpenAI deprecations anchor. https://deprecations.info/v1/providers.json lists those nine providers and the official URL for each.",
    ],
    rows: [
      {
        topic: "Shape of the data",
        theirs: "A feed item per announcement: model id, deprecation date, shutdown date, replacement model ids, first and last observed days, and the provider URL.",
        sunsetdiff: `${DIFF} Full records also keep status, shutdown_date_kind, and specs.`,
      },
      {
        topic: "Providers on the feed",
        theirs: "Nine: OpenAI, Anthropic, Google, Google Vertex, AWS Bedrock, Cohere, Groq, xAI, and Azure.",
        sunsetdiff: "The providers in this build are listed at the top of this page.",
      },
      {
        topic: "Regional dates",
        theirs: "The homepage says regional dates collapse to one row, using the earliest published dates.",
        sunsetdiff: "Bedrock rows can keep region_or_platform_notes when the official page limits the date to listed regions.",
      },
      {
        topic: "Other files",
        theirs: "The homepage documents /v1/feed.json, /v1/feed.xml, and /v1/providers.json.",
        sunsetdiff: `${FILES} ${SCAN}`,
      },
    ],
    sources: [
      {
        label: "deprecations.info homepage",
        url: "https://deprecations.info/",
        checked: COMPARISON_CHECKED,
        showed: "Provider list, JSON Feed and RSS, the regional-date note, and the GitHub repo link.",
      },
      {
        label: "JSON Feed",
        url: "https://deprecations.info/v1/feed.json",
        checked: COMPARISON_CHECKED,
        showed: "JSON Feed 1.1 fields and the _deprecation object.",
      },
      {
        label: "providers.json",
        url: "https://deprecations.info/v1/providers.json",
        checked: COMPARISON_CHECKED,
        showed: "Nine providers and their official documentation URLs.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with deprecations.info?",
      "deprecations.info is a JSON Feed and RSS of shutdown announcements, with replacement ids and observed dates. SunsetDiff publishes those dates inside full model records and migration diffs, plus CSV, an ICS calendar, and a local code scan.",
    ),
  },
  {
    slug: "llmsunset",
    name: "LLMSunset",
    siteUrl: "https://llmsunset.com",
    title: "SunsetDiff vs LLMSunset",
    description: "What the LLMSunset homepage published on October 20, 2026, including its free account API, and what SunsetDiff publishes without an account.",
    summary: "A daily board of 2,137+ models across 21 providers, with account alerts and a read-only REST API.",
    paragraphs: [
      "The LLMSunset homepage, fetched on October 20, 2026, says it checks 21 providers every day and reports when a model sunsets and what replaces it. It says the figures are real dates and real replacements, and that nothing is forecast. The page's field time is Oct 19, 2026, 18:43 UTC. It says 2,137+ models are on the board, 53 are departing within 90 days, and 451+ sunset dates are logged.",
      "Status labels on the page are On time, Check-in, Boarding, Final call, Departed, and Unclassified. Provider counts on the page: HuggingFace 502, Together AI 330, DeepInfra 232, OpenAI 163, NovitaAI 160, NVIDIA NIM 132, Google 123, Mistral AI 107, xAI 95, AWS Bedrock 54, Cohere 46, Fireworks AI 40, Anthropic 36, Azure OpenAI 29, Perplexity 20, Groq 18, Replicate 18, AI21 Studio 13, Reka AI 8, Writer 7, DeepSeek 4.",
      "The page says you can set alerts at 90, 30, 7, or 1 day by email, Slack, or Teams, and that it shows side-by-side specs, pricing, and capabilities. The FAQ says the free tier shows every sunset date they have, that you sign up to see the dashboard and alerts, and that no credit card is required. It says the pipeline runs daily, last run Oct 19, 2026, 18:43 UTC, reads provider APIs and official docs, and stores fetched_at plus a stale flag. It says every account includes a read-only REST API, a custom webhook, and email, Slack, and Teams, and that every account currently includes that full access for free. The homepage also shows a badge image URL. It does not show a no-account file URL.",
    ],
    rows: [
      {
        topic: "Coverage on the homepage",
        theirs: "2,137+ models, 21 providers, field time Oct 19, 2026, 18:43 UTC. The provider list includes hosts such as Hugging Face, Together, DeepInfra, and Groq.",
        sunsetdiff: "The providers in this build are the ones with official deprecation pages listed at the top of this page.",
      },
      {
        topic: "Comparison of two models",
        theirs: "The homepage says side-by-side specs, pricing, and capabilities.",
        sunsetdiff: DIFF,
      },
      {
        topic: "How you fetch it",
        theirs: "The FAQ says the REST API is included with an account, and that accounts are free with no credit card. The homepage does not show a no-account file URL.",
        sunsetdiff: FILES,
      },
      {
        topic: "Alerts and scan",
        theirs: "Email, Slack, and Teams at 90, 30, 7, or 1 day. A site-wide badge.",
        sunsetdiff: SCAN,
      },
    ],
    sources: [
      {
        label: "LLMSunset homepage",
        url: "https://llmsunset.com/",
        checked: COMPARISON_CHECKED,
        showed: "The 21-provider board, the Oct 19, 2026 18:43 UTC field time, alert channels, the comparison claim, and the FAQ about the free account API.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with LLMSunset?",
      "LLMSunset's homepage on October 20, 2026 describes a 21-provider board, daily checks, side-by-side specs and pricing, and a free account that includes a read-only REST API and alerts. SunsetDiff's files are static and need no account. They include migration diffs with code samples, a CC BY 4.0 dataset, ICS, RSS, and a local code scan.",
    ),
  },
  {
    slug: "lastcall",
    name: "Lastcall",
    siteUrl: "https://lastcall.irawan.dev",
    title: "SunsetDiff vs Lastcall",
    description: "Lastcall publishes a free calendar of API, model, and runtime shutdowns. This page records what lastcall.irawan.dev showed on October 20, 2026.",
    summary: "A free API, model, and runtime shutdown calendar with JSON, CSV, ICS, and RSS, and no API key.",
    paragraphs: [
      "Lastcall's homepage, fetched on October 20, 2026, calls itself the API death calendar. The page description says it lists every announced API, model, and runtime shutdown from the provider's own page, with the replacement and what actually breaks, plus a free calendar feed, JSON, and CSV. You can paste a dependency list, a model config, or a snippet. The page says it reads model and endpoint names, and that anything shaped like a key is stripped before matching.",
      "It groups failures as hard (calls fail), silent (you are auto-migrated), price (the bill changes), block (access is restricted), and unsupported (patches stop). It says Anthropic publishes not-sooner-than floors. It keeps announced items that have no date, and it says a month with no day is not stored as a date. Email is one message when a date is announced and one when it is 30 days out. The calendar link is /calendar/all.ics, with a reminder 30 days out, and one calendar per source.",
      "The data page at /api/, fetched the same day, says the files need no key, no signup, and no rate limit, and that CORS is open. It says all.ics has 752 events, with category files ai.ics 267, data.ics 54, infra.ics 220, platform.ics 170, and runtime.ics 41. JSON counts on that page: /api/v1/deprecations.json 861 rows, /api/v1/upcoming.json 752 rows, /api/v1/providers.json 68 sources. It also documents /deprecations.csv and /feed.xml for the next 120 shutdowns. Fields listed: provider, id, name, kind, shutdown, failure, replacement, and source. It says v1 fields are only added, not removed or retyped. It says each source has the day it was last read, and that a row is deleted when the quoted sentence is no longer on the page.",
      "AI-related source calendars on that page include OpenAI 28 events, Anthropic 18, Bedrock 8, Foundry 69, Google 26, Google Vertex AI 26, Mistral 3, xAI 9, Groq 18, Cohere 3, Together AI 40, Fireworks AI 8, DeepSeek 1, and Perplexity 3. The same tables include databases, clouds, languages, and other platform APIs.",
    ],
    rows: [
      {
        topic: "Scope",
        theirs: "APIs, models, and runtimes. 68 sources and 861 rows on the data page, including non-model shutdowns.",
        sunsetdiff: "AI model records and migration diffs for the providers at the top of this page.",
      },
      {
        topic: "What a row holds",
        theirs: "Shutdown date, failure kind, replacement, and source. Failure kinds include hard, silent, price, block, and unsupported.",
        sunsetdiff: DIFF,
      },
      {
        topic: "Files",
        theirs: "No key. ICS (all, by category, and by source), RSS, JSON, and CSV. The data page states no rate limit and open CORS.",
        sunsetdiff: FILES,
      },
      {
        topic: "Checking your stack",
        theirs: "Paste names in the browser. The page says secrets are stripped before matching. Email at announcement and at 30 days.",
        sunsetdiff: SCAN,
      },
    ],
    sources: [
      {
        label: "Lastcall homepage",
        url: "https://lastcall.irawan.dev/",
        checked: COMPARISON_CHECKED,
        showed: "The API death calendar description, failure kinds, the paste box, email rules, and links to the calendar and the data page.",
      },
      {
        label: "Data and feeds",
        url: "https://lastcall.irawan.dev/api/",
        checked: COMPARISON_CHECKED,
        showed: "File URLs, row counts, field names, the v1 compatibility sentence, and the per-source event counts.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with Lastcall?",
      "Lastcall covers API, model, and runtime shutdowns, with a failure kind, a replacement, and free JSON, CSV, ICS, and RSS. SunsetDiff stays on AI models and publishes the price, context, and code diff when both models are in the dataset.",
    ),
  },
  {
    slug: "modelsunset",
    name: "ModelSunset",
    siteUrl: "https://modelsunset.unicorn-group.net",
    title: "SunsetDiff vs ModelSunset",
    description: "What modelsunset.unicorn-group.net published on October 20, 2026: shutdown dates, a JSON file, a calendar, a scanner, and a migration checklist.",
    summary: "Shutdown dates and replacements for 284 models and APIs, with a CC BY 4.0 JSON file, an ICS feed, RSS, and a local scanner.",
    paragraphs: [
      "ModelSunset's homepage, fetched on October 20, 2026, says it lists shutdown dates and official replacements across OpenAI, Claude, Gemini, Mistral, Azure, Bedrock, and more, with a code scanner and a calendar feed. Visible counts on the page: 21 shutdowns in the next 30 days, 70 upcoming retirements, 284 models and APIs, and 9 providers. The FAQ says that as of October 19, 2026, 70 models and APIs have a future shutdown date and 21 of those are inside 30 days. Provider counts on the page: OpenAI 94, Anthropic 13, Google Gemini API 44, Vertex AI 16, Mistral 36, Cohere 14, xAI 9, Amazon Bedrock 13, Microsoft Foundry / Azure OpenAI 45.",
      "The homepage says every date comes from the provider's deprecation page and is linked on the model page. The scanner section says pasted code runs in the browser and nothing is uploaded. It offers email, Slack, or Discord for a watchlist of up to 50 model ids, with a notice when a watched model is deprecated and again 90, 30, 7, and 1 day before shutdown, plus a personal calendar feed. Footer links: /calendar.ics, /feed.xml, /deprecations.json, and /scan/.",
      "Dataset JSON-LD on the homepage names the license https://creativecommons.org/licenses/by/4.0/, creator ModelSunset, and downloads for deprecations.json and calendar.ics. That block's dateModified is 2026-09-26. The FAQ date on the same page is October 19, 2026.",
      "The scan page, fetched the same day, shows curl -fsSL https://modelsunset.unicorn-group.net/scan.sh | sh, with DAYS=30 to change the window, and exit code 1 when a match shuts down inside the window. It repeats that the paste box runs locally.",
      "The model page for gpt-4o-2024-05-13, fetched the same day, says the shutdown is October 23, 2026, the replacement is gpt-5.6-sol, the announcement date is April 22, 2026, and the source line is Official OpenAI notice. The migration section is a grep command, a model-id swap in a YAML-style snippet, and steps to re-test prompts and deploy before the date. It says output style, token usage, and pricing can change. That page does not show a price table or a context-window table.",
    ],
    rows: [
      {
        topic: "Dates and replacements",
        theirs: "Homepage tables of model id, provider, shutdown, and replacement. The sampled model page cites an official OpenAI notice.",
        sunsetdiff: CITE,
      },
      {
        topic: "Migration detail",
        theirs: "The sampled model page has a checklist, a grep, and a model-id swap. It says pricing and limits can change. It does not show a price or context table.",
        sunsetdiff: DIFF,
      },
      {
        topic: "Files and license",
        theirs: "deprecations.json, calendar.ics, and feed.xml. JSON-LD license is CC BY 4.0. dateModified in that block is 2026-09-26.",
        sunsetdiff: FILES,
      },
      {
        topic: "Code scan",
        theirs: "Browser paste, plus scan.sh for CI, failing the build inside a day window.",
        sunsetdiff: SCAN,
      },
      {
        topic: "Providers on the homepage",
        theirs: "Nine, including Cohere and xAI, 284 models and APIs, FAQ dated October 19, 2026.",
        sunsetdiff: "The providers in this build are listed at the top of this page.",
      },
    ],
    sources: [
      {
        label: "ModelSunset homepage",
        url: "https://modelsunset.unicorn-group.net/",
        checked: COMPARISON_CHECKED,
        showed: "Counts, provider totals, the FAQ dated October 19, 2026, scanner and alert copy, footer file links, and the CC BY 4.0 Dataset JSON-LD.",
      },
      {
        label: "Scan page",
        url: "https://modelsunset.unicorn-group.net/scan/",
        checked: COMPARISON_CHECKED,
        showed: "The scan.sh one-liner, the DAYS window, and the local paste note.",
      },
      {
        label: "gpt-4o-2024-05-13 model page",
        url: "https://modelsunset.unicorn-group.net/openai/gpt-4o-2024-05-13/",
        checked: COMPARISON_CHECKED,
        showed: "Shutdown October 23, 2026, replacement gpt-5.6-sol, the checklist, and the absence of a price or context table on that page.",
      },
    ],
    faqs: faqs(
      "How does SunsetDiff compare with ModelSunset?",
      "Both publish official shutdown dates, a CC BY 4.0 JSON file, an ICS feed, RSS, and a local code scan. ModelSunset's gpt-4o-2024-05-13 page, checked October 20, 2026, shows a checklist and a model-id swap. SunsetDiff migration pages add the published price, context, and max-output numbers, capability and API changes, and code in Python, TypeScript, and curl.",
    ),
  },
];

export function comparisonPath(slug: string): string {
  return `/alternatives/${slug}/`;
}

export function comparisonBySlug(slug: string): Comparison | undefined {
  return comparisons.find((item) => item.slug === slug);
}

export const hubFaqs: FaqItem[] = [
  { question: TRACK_Q, answer: TRACK_A },
  { question: API_Q, answer: API_A },
  {
    question: "Which AI model deprecation tracker should I use?",
    answer:
      "Use the public files that match the job. SunsetDiff is the CC BY 4.0 dataset of shutdown dates, official replacements, and migration diffs, with an ICS feed, an RSS feed, and a local code scan. The pages linked here quote what each other tracker showed on its public site on October 20, 2026.",
  },
];
