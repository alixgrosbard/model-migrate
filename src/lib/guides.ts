import type { FaqItem } from "./format.ts";

/** Day the official pages linked from the guides were read. */
export const GUIDES_CHECKED = "2026-10-20";
export const GUIDES_INDEX = "/guides/";

const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_CHANGELOG = "https://developers.openai.com/api/docs/changelog";
const OPENAI_SOL = "https://developers.openai.com/api/docs/models/gpt-5.6-sol";
const OPENAI_CHAT_LATEST = "https://developers.openai.com/api/docs/models/chat-latest";
const OPENAI_COMPAT = "https://developers.openai.com/api/reference/llms-full.txt";
const OPENAI_EVALS = "https://developers.openai.com/api/docs/guides/evals";
const OPENAI_TOOLS = "https://developers.openai.com/api/docs/guides/function-calling";
const OPENAI_PRICING = "https://developers.openai.com/api/docs/pricing";
const CLAUDE_IDS = "https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions";
const CLAUDE_DEPRECATIONS = "https://platform.claude.com/docs/en/about-claude/model-deprecations";
const CLAUDE_MODELS = "https://platform.claude.com/docs/en/about-claude/models/overview";
const CLAUDE_SONNET_MIGRATION = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const GEMINI_MODELS = "https://ai.google.dev/gemini-api/docs/models";
const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const GEMINI_CHANGELOG = "https://ai.google.dev/gemini-api/docs/changelog";
const GEMINI_25_PRO = "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro";
const GEMINI_PRICING = "https://ai.google.dev/gemini-api/docs/pricing";
const FIREBASE_MODELS = "https://firebase.google.com/docs/ai-logic/models";
const VERTEX_VERSIONS = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";
const AZURE_RETIREMENTS = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
const AZURE_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const AZURE_VERSIONS = "https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/model-versions";
const BEDROCK_LIFECYCLE = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html";
const BEDROCK_LEGACY = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";
const BEDROCK_INVOKE = "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-api.html";
const LITELLM_FALLBACKS = "https://docs.litellm.ai/docs/completion/reliable_completions";
const LITELLM_PROXY = "https://docs.litellm.ai/docs/proxy/reliability";
const LITELLM_CONFIG = "https://docs.litellm.ai/docs/proxy/configs";
const OPENROUTER_FALLBACKS = "https://openrouter.ai/docs/guides/routing/model-fallbacks";
const AI_SDK_OPENAI = "https://ai-sdk.dev/docs/guides/openai";
const LANGCHAIN_MODELS = "https://docs.langchain.com/oss/python/langchain/models";
const LANGCHAIN_CHAT = "https://docs.langchain.com/oss/python/integrations/chat";

export interface GuideSource {
  label: string;
  url: string;
}

export interface GuideCode {
  caption: string;
  code: string;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  codes?: GuideCode[];
  sources: GuideSource[];
}

export interface GuideStep {
  name: string;
  text: string;
}

export interface GuideLink {
  href: string;
  label: string;
}

export interface GuidePage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  summary: string;
  answer: string;
  steps: GuideStep[];
  sections: GuideSection[];
  related: GuideLink[];
  faqs: FaqItem[];
  citations: string[];
}

export function guidePath(slug: string): string {
  return `/guides/${slug}/`;
}

export function guideHeadingId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const guideHubFaqs: FaqItem[] = [
  {
    question: "Where are the SunsetDiff guides?",
    answer: "They are listed on [Guides](/guides/). Each page has a direct answer, steps, and a link to the official page the facts came from.",
  },
  {
    question: "Do the guides replace the model, error, and shutdown pages?",
    answer:
      "No. A guide links the [model pages](/questions/), [request errors](/errors/), [shutdown batches](/shutdowns/), and migration diffs. Those pages keep the dated rows.",
  },
  {
    question: "Who publishes the guides?",
    answer: "Publisher: SunsetDiff. The site is independent and not affiliated with any AI provider.",
  },
];

export const guides: GuidePage[] = [
  {
    slug: "model-aliases-vs-pinned-snapshots",
    title: "Model aliases vs pinned snapshots | SunsetDiff",
    description:
      "When an undated model name can move to a new snapshot on OpenAI, Claude, Gemini, and Azure OpenAI, and which id stays fixed.",
    h1: "Model aliases vs pinned snapshots",
    summary: "Which model names can move to a new snapshot, and which ids stay fixed.",
    answer:
      "A pinned id keeps one snapshot until that id is retired. A short alias can be pointed at a different snapshot later. OpenAI, Claude, Gemini, and Azure OpenAI each publish a different rule. Amazon Bedrock's lifecycle pages do not describe an alias that moves.",
    steps: [
      { name: "Read the id you ship", text: "Copy the exact model string from the request, not the product name." },
      { name: "Match it to the provider rule", text: "Use the provider section below. A dated id and a short alias are not the same kind of name." },
      { name: "Pin the id you tested", text: "If the provider publishes a snapshot id, put that id in production after you run the pre-migration checklist." },
    ],
    sections: [
      {
        heading: "OpenAI",
        paragraphs: [
          "OpenAI model pages say snapshots let you lock a specific version so performance and behavior stay consistent. The same pages list the snapshots and aliases for that model.",
          "The changelog records when a short slug is pointed at a new snapshot. On January 13, 2026 it moved the sora-2 slug to sora-2-2025-12-08, and it moved gpt-realtime-mini, gpt-audio-mini, gpt-4o-mini-tts, and gpt-4o-mini-transcribe onto 2025-12-15 snapshots. The previous snapshot keeps its dated id.",
          "chat-latest points at the latest Instant model used in ChatGPT, and that page says the underlying snapshot will be regularly updated. The July 9, 2026 changelog entry says the gpt-5.6 alias routes requests to gpt-5.6-sol.",
          "The API backwards-compatibility note says prompting behavior between snapshots can change. It says the way to keep prompting and output consistent is to use a pinned model version and to run evals.",
        ],
        sources: [
          { label: "GPT-5.6 Sol model page", url: OPENAI_SOL },
          { label: "Chat Latest", url: OPENAI_CHAT_LATEST },
          { label: "OpenAI changelog", url: OPENAI_CHANGELOG },
          { label: "OpenAI API backwards compatibility", url: OPENAI_COMPAT },
        ],
      },
      {
        heading: "Anthropic",
        paragraphs: [
          "Anthropic says each Claude model ID is a pinned version for the life of that ID. That guarantee does not cover the convenience aliases on some earlier models.",
          "Before the 4.6 generation, the Claude API also accepts a shorter alias such as claude-sonnet-4-5. That alias points at the most recent dated snapshot for that minor version. A 4.6-generation id such as claude-sonnet-4-6 is not an alias. It is the snapshot. Anthropic does not update the weights of an existing model ID. A newer model ships under a new ID.",
          "Weights stay fixed for an ID. Serving pieces such as the request router, safety classifiers, and sampling logic can still change, and Anthropic says that can produce minor output differences on the same ID.",
          "On Amazon Bedrock the older dated form looks like anthropic.claude-sonnet-4-5-20250929-v1:0. From Sonnet 4.6 on, Bedrock drops the -v1 suffix. Google Cloud uses an @ before the date on the older ids.",
        ],
        sources: [
          { label: "Claude model IDs and versioning", url: CLAUDE_IDS },
          { label: "Claude models overview", url: CLAUDE_MODELS },
        ],
      },
      {
        heading: "Gemini API",
        paragraphs: [
          "The Gemini models page, in the naming note dated September 2025, splits names into stable, preview, latest, and experimental. It says older models can use a different pattern, so read the exact string you call.",
          "A stable name points at one stable model and usually does not change. The page's example is gemini-3.6-flash. A latest name, such as gemini-flash-latest, is an alias that is hot-swapped on every new release of that variation. Breaking changes get two weeks of email notice before the version behind latest changes.",
          "A preview name can be used in production and is deprecated with at least two weeks of notice. Experimental names are not stable, and the endpoint can change.",
          "Firebase's model list calls gemini-2.0-flash an auto-updated alias and records its shutdown on June 1, 2026. That page also says not to use -latest aliases, because they hot-swap and only breaking changes get the two-week email.",
        ],
        sources: [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Firebase AI Logic models", url: FIREBASE_MODELS },
        ],
      },
      {
        heading: "Azure OpenAI",
        paragraphs: [
          "On Azure you call a deployment. The deployment has a model version and a versionUpgradeOption. A specific version stays selected until you change it or until that version's retirement date.",
          "OnceNewDefaultVersionAvailable upgrades the deployment to the new default within two weeks of that designation. OnceCurrentVersionExpired upgrades when the current version reaches its retirement date. null means OnceCurrentVersionExpired. NoAutoUpgrade does not move. At retirement that deployment stops working.",
          "Automatic updates are documented for Standard deployment types. Provisioned deployments are not auto-upgraded.",
        ],
        sources: [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
      {
        heading: "Amazon Bedrock and Vertex AI",
        paragraphs: [
          "Bedrock InvokeModel takes a modelId. That value is a foundation model ID, or an inference profile ID or ARN. ListFoundationModels returns the model ID. ListInferenceProfiles returns the profile ID. The lifecycle pages say Bedrock dates can differ from the model provider's dates, and that lifecycle state can differ by Region. They do not describe a short alias that is later pointed at a new snapshot.",
          "The current Gemini Enterprise Agent Platform model versions page lists a model ID and a retirement date for that ID. It says a listed retirement date will not be moved earlier. It does not describe a latest alias. Use the Gemini API section above for gemini-flash-latest and the other latest names.",
        ],
        sources: [
          { label: "Bedrock inference API", url: BEDROCK_INVOKE },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
      },
    ],
    related: [
      { href: "/models/openai/gpt-4o/", label: "gpt-4" },
      { href: "/models/openai/gpt-5-6-sol/", label: "gpt-5.6-sol" },
      { href: "/models/anthropic/claude-sonnet-4-5-20250929/", label: "claude-sonnet-4-5-20250929" },
      { href: "/models/google-gemini-api/gemini-2-0-flash/", label: "gemini-2.0-flash" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ" },
    ],
    faqs: [
      {
        question: "Does claude-sonnet-4-6 point at the newest Claude?",
        answer:
          "No. Anthropic's model ID page says a 4.6-generation id is the pinned snapshot, not an alias. The alias rule is for earlier models such as claude-sonnet-4-5.",
      },
      {
        question: "Does gpt-5.6 stay on one snapshot?",
        answer:
          "The July 9, 2026 changelog says the gpt-5.6 alias routes to gpt-5.6-sol. The Sol model page lists gpt-5.6-sol as the snapshot id for that model.",
      },
    ],
    citations: [OPENAI_SOL, OPENAI_CHAT_LATEST, OPENAI_CHANGELOG, OPENAI_COMPAT, CLAUDE_IDS, CLAUDE_MODELS, GEMINI_MODELS, FIREBASE_MODELS, AZURE_WORKING, AZURE_RETIREMENTS, BEDROCK_INVOKE, BEDROCK_LIFECYCLE, VERTEX_VERSIONS],
  },
  {
    slug: "pre-migration-test-checklist",
    title: "Pre-migration test checklist for a deprecated AI model | SunsetDiff",
    description:
      "What to retest before a model shutdown: evals, rejected request fields, token limits, tools, structured output, price, and latency.",
    h1: "Pre-migration test checklist for a deprecated AI model",
    summary: "What to retest before you point production at the replacement model.",
    answer:
      "Run the same tasks on the old id and the replacement before the shutdown date. Providers tell you to test. They do not promise the new model accepts the same fields, the same token caps, or the same price.",
    steps: [
      { name: "Freeze the old id", text: "Call the pinned snapshot you run today, not a short alias, so the baseline cannot move during the test." },
      { name: "Run the same eval set on the replacement", text: "OpenAI points developers at evals. Anthropic says to test well before the retirement date. Vertex says to test mission-critical features. Azure points at Evaluations for custom workload testing." },
      { name: "Replay one real request unchanged", text: "A 400 from a field the new model rejects is a different failure from the shutdown itself. The request error pages list the fields already documented." },
      { name: "Compare the published caps and prices", text: "Read context, max output, and price on the two official model or pricing pages, then read the SunsetDiff diff." },
      { name: "Measure latency on your prompts", text: "Do not copy a vendor's relative latency label into an SLO. Time your own calls." },
    ],
    sections: [
      {
        heading: "Evals",
        paragraphs: [
          "OpenAI's backwards-compatibility note says model prompting behavior between snapshots can change, and that you should pin a model version and run evals.",
          "Anthropic's deprecations page says to test applications with the replacement well before the retirement date. The Vertex model versions page says that if you only have time to stop the errors, you still test every mission-critical feature after you change the model ID. Azure's lifecycle FAQ says to use Evaluations for custom workload testing, plus the Foundry leaderboard and the comparison shown at deploy time.",
        ],
        sources: [
          { label: "OpenAI API backwards compatibility", url: OPENAI_COMPAT },
          { label: "OpenAI evals", url: OPENAI_EVALS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
      {
        heading: "Request fields the new model can reject",
        paragraphs: [
          "Replay a saved production body with only the model id changed. These SunsetDiff pages already quote the official rule for fields that fail today:",
        ],
        bullets: [
          "[temperature, top_p, and top_k on claude-sonnet-5-5](/errors/claude-temperature-is-deprecated-for-this-model/) return HTTP 400 when the value is not the default. Source: the Sonnet 5.5 migration guide.",
          "[max_tokens on o-series models](/errors/openai-max-tokens-use-max-completion-tokens/) is rejected. The Chat Completions reference says to send max_completion_tokens.",
          "[Function tools on gpt-6-luna](/errors/gpt-6-luna-function-tools-reasoning-effort/) need the Responses API, or reasoning_effort set to none on Chat Completions.",
          "[thinking disabled, thinking budgets, tool_choice tool or any, and assistant prefill](/errors/) fail on claude-sonnet-5-5. Each page links the migration guide.",
        ],
        sources: [
          { label: "Claude Sonnet 5.5 migration guide", url: CLAUDE_SONNET_MIGRATION },
          { label: "OpenAI function calling", url: OPENAI_TOOLS },
        ],
      },
      {
        heading: "Token limits",
        paragraphs: [
          "Compare the published window, not the old code constant. The GPT-5.6 Sol page lists a 1,050,000 token context window, a maximum of 922,000 input tokens, and 128,000 max output tokens.",
          "The Gemini 2.5 Pro model page lists an input token limit of 1,048,576 and a max output of 65,536. The Claude models overview lists a 1M token context window and 128K max output for current Claude models on the synchronous Messages API.",
          "The [replace pages](/replace/openai/gpt-4o-2024-05-13/) show the values SunsetDiff could read. A blank cell was not on the official page.",
        ],
        sources: [
          { label: "GPT-5.6 Sol", url: OPENAI_SOL },
          { label: "Gemini 2.5 Pro", url: GEMINI_25_PRO },
          { label: "Claude models overview", url: CLAUDE_MODELS },
        ],
      },
      {
        heading: "Tools and structured output",
        paragraphs: [
          "Call one tool round trip and one structured response you already depend on. OpenAI's function calling guide is the shape for Responses tools. The Sonnet 5.5 migration guide is the source for the tool_choice values that guide rejects.",
          "Do not assume a JSON schema that validated on the old id still validates. If the official page does not list the field you send, treat a failure as something to read in the error body, then check the [request errors](/errors/).",
        ],
        sources: [
          { label: "OpenAI function calling", url: OPENAI_TOOLS },
          { label: "Claude Sonnet 5.5 migration guide", url: CLAUDE_SONNET_MIGRATION },
        ],
      },
      {
        heading: "Price and latency",
        paragraphs: [
          "Read the price on the provider pricing page for both ids before you switch. OpenAI publishes prices at the pricing page. Gemini publishes them on the Gemini API pricing page. The SunsetDiff model page repeats a price only when that page listed it.",
          "The Claude models overview publishes comparative latency as a label relative to the current lineup. It says actual latency depends on prompt length, output length, and thinking effort. Time a sample of your own prompts. Do not turn that label into a millisecond budget.",
        ],
        sources: [
          { label: "OpenAI pricing", url: OPENAI_PRICING },
          { label: "Gemini API pricing", url: GEMINI_PRICING },
          { label: "Claude models overview", url: CLAUDE_MODELS },
        ],
      },
    ],
    related: [
      { href: "/errors/", label: "Request errors" },
      { href: "/replace/openai/gpt-4o-2024-05-13/", label: "gpt-4o-2024-05-13 diff" },
      { href: "/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/", label: "Sonnet 4.5 to Sonnet 5.5 diff" },
      { href: "/models/openai/gpt-5-6-sol/", label: "gpt-5.6-sol" },
      { href: "/models/anthropic/claude-sonnet-5-5/", label: "claude-sonnet-5-5" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
    ],
    faqs: [
      {
        question: "Is a green eval enough to skip the request replay?",
        answer:
          "No. An eval can pass while a field such as temperature or max_tokens is rejected. Replay one unchanged production body and read the HTTP status.",
      },
      {
        question: "Where is the price diff?",
        answer:
          "On the replace page for that model, when both prices were published. Blank price fields were not on the official page.",
      },
    ],
    citations: [OPENAI_COMPAT, OPENAI_EVALS, CLAUDE_DEPRECATIONS, VERTEX_VERSIONS, AZURE_RETIREMENTS, CLAUDE_SONNET_MIGRATION, OPENAI_TOOLS, OPENAI_SOL, GEMINI_25_PRO, CLAUDE_MODELS, OPENAI_PRICING, GEMINI_PRICING],
  },
  {
    slug: "why-shutdown-dates-differ-by-platform",
    title: "Why the same AI model shuts down on a different date on Azure, Bedrock, and Vertex | SunsetDiff",
    description:
      "Azure OpenAI, Amazon Bedrock, and Vertex AI publish their own retirement dates. The first-party API date does not move them.",
    h1: "Why the same model shuts down on a different date",
    summary: "Azure, Bedrock, and Vertex publish their own retirement dates for a model the first-party API also serves.",
    answer:
      "The first-party shutdown date does not apply on Azure OpenAI, Amazon Bedrock, or Vertex AI. Each of those platforms publishes its own calendar. Check the platform you call, not only the OpenAI, Anthropic, or Gemini API page.",
    steps: [
      { name: "Name the host you call", text: "api.openai.com, the Claude API, and the Gemini API are different calendars from Azure, Bedrock, and Vertex." },
      { name: "Open that host's retirement table", text: "Use the pages in the sections below. A model can be active on one and dated on the other." },
      { name: "Read the region column on Bedrock", text: "A Bedrock EOL row lists the Regions it covers. Other Regions can still show a different state." },
    ],
    sections: [
      {
        heading: "What each provider says",
        paragraphs: [
          "Anthropic's deprecations page says its dates apply to the Claude API, Claude Platform on AWS, and Microsoft Foundry. Amazon Bedrock and Google Cloud set their own retirement schedules, so status and dates can differ.",
          "Amazon Bedrock says lifecycle dates are specific to Bedrock and may differ from the dates the model provider publishes. For Bedrock, only the Bedrock dates apply. The legacy page says the same thing for models launched before September 7, 2026, and that state can differ by Region.",
          "Azure publishes a separate model retirement schedule for Foundry Models sold by Azure. The OpenAI deprecations page is the calendar for the OpenAI API.",
          "The Gemini API deprecations page is the calendar for the Gemini API. Vertex dates are on the Gemini Enterprise Agent Platform model versions page. That page says a listed retirement date will not be moved earlier, though it may be extended.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
      },
      {
        heading: "gpt-4o-2024-05-13",
        paragraphs: [
          "OpenAI's deprecations table lists gpt-4o-2024-05-13 with a shutdown date of October 23, 2026 and a substitute of gpt-5.6-sol.",
          "Azure's retirement schedule lists gpt-4o version 2024-05-13 as Deprecated, with retirement date 2026-12-09 and replacement gpt-5.6-sol. Same model version, later date, different page.",
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
      {
        heading: "Claude Sonnet 4.5",
        paragraphs: [
          "On the Claude API, claude-sonnet-4-5-20250929 is Deprecated as of September 30, 2026, with a retirement date of November 30, 2026. The recommended replacement on that page is claude-sonnet-5-5.",
          "Bedrock uses a different id, anthropic.claude-sonnet-4-5-20250929-v1:0, and the legacy lifecycle table is the dated source for that id. The [Bedrock model page](/models/aws-bedrock/anthropic-claude-sonnet-4-5-20250929-v1-0/) quotes that table, including the Regions on the row. Do not copy the November 30 Claude API date onto the Bedrock id.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "gemini-2.5-pro",
        paragraphs: [
          "The Gemini API deprecations page lists gemini-2.5-pro with no shutdown date announced. It also says access to 2.5 models is limited to users who have already used them, and that the models are not deprecated.",
          "The Vertex model versions table lists gemini-2.5-pro with release date June 17, 2025, retirement date October 20, 2026, and replacement gemini-3.8-flash or gemini-3.5-flash.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
      },
    ],
    related: [
      { href: "/models/openai/gpt-4o-2024-05-13/", label: "OpenAI gpt-4o-2024-05-13" },
      { href: "/models/azure-openai/gpt-4o-2024-05-13/", label: "Azure gpt-4o 2024-05-13" },
      { href: "/models/anthropic/claude-sonnet-4-5-20250929/", label: "Claude API Sonnet 4.5" },
      { href: "/models/aws-bedrock/anthropic-claude-sonnet-4-5-20250929-v1-0/", label: "Bedrock Sonnet 4.5" },
      { href: "/models/google-gemini-api/gemini-2-5-pro/", label: "Gemini API gemini-2.5-pro" },
      { href: "/models/google-vertex/gemini-2-5-pro/", label: "Vertex gemini-2.5-pro" },
      { href: "/migrate/openai__gpt-4o-2024-05-13__to__openai__gpt-5-6-sol/", label: "OpenAI migration diff" },
      { href: "/migrate/azure-openai__gpt-4o-2024-05-13__to__azure-openai__gpt-5-6-sol/", label: "Azure migration diff" },
      { href: "/questions/", label: "Per-model shutdown questions" },
    ],
    faqs: [
      {
        question: "If OpenAI shuts a model down, does Azure shut it down the same day?",
        answer:
          "No. Azure's retirement schedule is a separate table. gpt-4o version 2024-05-13 is October 23, 2026 on the OpenAI page and 2026-12-09 on the Azure page.",
      },
      {
        question: "Which date should the code check?",
        answer:
          "The date on the platform that receives the request. SunsetDiff stores one row per provider so the two dates stay apart.",
      },
    ],
    citations: [CLAUDE_DEPRECATIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_SCHEDULE, OPENAI_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS],
  },
  {
    slug: "get-notified-before-a-model-shuts-down",
    title: "How to get notified before an AI model shuts down | SunsetDiff",
    description:
      "SunsetDiff RSS, deadlines.ics, and JSON, plus the email and doc notices OpenAI, Anthropic, Gemini, Azure, and Bedrock publish.",
    h1: "How to get notified before an AI model shuts down",
    summary: "RSS, the deadlines calendar, the JSON files, and the official provider notices.",
    answer:
      "Subscribe to the SunsetDiff feed or deadlines calendar for dates already published. Also use the provider's own notice: email where they promise it, and the deprecation page everywhere. A feed cannot warn you before the provider has published a date.",
    steps: [
      { name: "Subscribe to the SunsetDiff feed", text: "Add /feed.xml in a feed reader, or subscribe to /deadlines.ics in a calendar. Both are static files and need no key." },
      { name: "Poll the JSON if you want a script", text: "GET /api/v1/upcoming.json for the next 90 days, or /api/v1/lookup/<model-id>.json for one id. See the programmatic guide." },
      { name: "Turn on the provider notice", text: "OpenAI and Anthropic email customers who are using the model. Azure emails subscription owners and contributors and uses Service Health. Gemini emails before a breaking latest-alias swap. Bedrock says it notifies you when Legacy starts." },
    ],
    sections: [
      {
        heading: "SunsetDiff files",
        paragraphs: [
          "These files are on this site. They repeat dates that were already on an official page, with the source URL and the day it was checked.",
        ],
        bullets: [
          "[feed.xml](/feed.xml) is the RSS feed of deprecation changes and shutdown batches.",
          "[deadlines.ics](/deadlines.ics) is the calendar of exact shutdown dates in the next 365 days. Floors that only say not before are left out. [calendar.ics](/calendar.ics) includes those floors.",
          "[upcoming.json](/api/v1/upcoming.json) is the next 90 days. [lookup](/api/) reads one model id.",
          "No API key. The dataset license is CC BY 4.0.",
        ],
        sources: [{ label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" }],
      },
      {
        heading: "OpenAI",
        paragraphs: [
          "OpenAI says impacted customers are notified by email and in the documentation, with blog posts for larger changes. When a deprecation is announced, customers who are actively using the model are emailed, and the deprecation is written on the deprecations page.",
          "You can also call GET /v1/models and read the optional shutdown_date field. The deprecations page says it is YYYY-MM-DD, or null when no date has been announced. The same field is on Retrieve a model. That call uses your existing API credential. This guide does not include a key.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Anthropic",
        paragraphs: [
          "Anthropic says impacted customers are notified by email and in the documentation. For publicly released models, that notice is at least 60 days before retirement.",
          "The same page tells you to check the documentation regularly. It also describes a usage export: open the Usage page in Claude Console, click Export, and read the CSV by API key and model. That finds calls, not strings sitting unused in a repository.",
        ],
        sources: [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
      },
      {
        heading: "Gemini API",
        paragraphs: [
          "Deprecations are announced on the release notes, and the earliest shutdown dates are listed on the deprecations page. That page says the table date is the earliest possible retirement, and that the exact shutdown date is communicated with advance notice.",
          "Preview models are deprecated with at least two weeks of notice. Before a breaking change to the model behind a latest alias, Gemini says it sends two weeks of email.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini API release notes", url: GEMINI_CHANGELOG },
          { label: "Gemini API models", url: GEMINI_MODELS },
        ],
      },
      {
        heading: "Azure OpenAI and Amazon Bedrock",
        paragraphs: [
          "Azure says it notifies you of upcoming retirements by email to subscription owners and contributors, by Azure Service Health alerts, and by the retirement tables. The model versions page says to pick Azure OpenAI Service as the Service Health service name. There is no separate Microsoft Foundry name in that alert list.",
          "Bedrock's current lifecycle page says that at the start of the Legacy period it notifies you of the EOL date, and that the EOL date is added to the model card. The legacy page says it notifies you when a model moves to Legacy. Those pages do not name an email product in the sentences above. GetFoundationModel and ListFoundationModels return modelLifecycle, including legacy and end-of-life times.",
        ],
        sources: [
          { label: "Azure model versions", url: AZURE_VERSIONS },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
      },
    ],
    related: [
      { href: "/feed.xml", label: "RSS feed" },
      { href: "/deadlines.ics", label: "Deadlines calendar" },
      { href: "/api/", label: "API docs" },
      { href: "/guides/check-model-shutdown-dates-programmatically/", label: "Check dates in code" },
      { href: "/guides/how-much-notice-before-an-ai-model-shuts-down/", label: "How much notice you get" },
      { href: "/shutdowns/", label: "Shutdown batches" },
    ],
    faqs: [
      {
        question: "Does the SunsetDiff feed need an API key?",
        answer: "No. feed.xml, deadlines.ics, and upcoming.json are static files.",
      },
      {
        question: "Will the feed email me?",
        answer: "No. It is an RSS document and a calendar file. Email notices described on this page are the ones the providers send.",
      },
    ],
    citations: ["https://sunsetdiff.com/api/", OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, GEMINI_CHANGELOG, GEMINI_MODELS, AZURE_VERSIONS, AZURE_RETIREMENTS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY],
  },
  {
    slug: "how-much-notice-before-an-ai-model-shuts-down",
    title: "How much notice before an AI model shuts down | SunsetDiff",
    description:
      "Published minimum notice periods for OpenAI, Anthropic, Gemini, Azure, and Amazon Bedrock, and the exceptions those pages list.",
    h1: "How much notice before an AI model shuts down",
    summary: "The minimum notice each provider publishes, and the exceptions.",
    answer:
      "There is no single notice period. OpenAI publishes 6 months for generally available models, 3 months for some specialized variants, and a much shorter period for preview models. Anthropic publishes at least 60 days for publicly released models. Gemini publishes at least two weeks for preview models. Bedrock publishes a Legacy window. Safety can shorten the OpenAI timeline.",
    steps: [
      { name: "Classify the model", text: "Generally available, preview, and specialized variants are different rows on the OpenAI page." },
      { name: "Read that provider's minimum", text: "Use the numbers below only for the provider that hosts the id." },
      { name: "Do not treat a minimum as the date", text: "The shutdown date on the deprecation table is the date to migrate by. The minimum is how early they say they will announce it." },
    ],
    sections: [
      {
        heading: "OpenAI",
        paragraphs: [
          "Unless safety or compliance needs a faster timeline, OpenAI's deprecations page gives these minimums before retirement:",
        ],
        bullets: [
          "Generally available models: at least 6 months.",
          "Specialized variants of generally available models: at least 3 months. The page's examples include chat variants such as gpt-5.1-chat-latest, Codex variants such as gpt-5.3-codex, and deep research variants such as o3-deep-research.",
          "Preview models, with preview in the name: a much shorter notice, such as 2 weeks. The page's examples include computer-use-preview and gpt-4o-audio-preview.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Anthropic",
        paragraphs: [
          "Anthropic says it notifies customers with active deployments at least 60 days before retirement for publicly released models. The dates table on that page is still the source for a specific id. Some rows say not sooner than a date, which is a floor, not a shutdown day.",
        ],
        sources: [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
      },
      {
        heading: "Gemini API and Vertex AI",
        paragraphs: [
          "Gemini preview models are deprecated with at least 2 weeks of notice. A breaking swap of the version behind a latest alias also gets 2 weeks of email. The deprecations page says a listed shutdown date is the earliest the model might be retired, and that the exact day is sent with advance notice.",
          "On Vertex, models in the shorter-availability table stay up until a retirement date is announced. That page says the announced date gives at least 45 days to migrate. Models in the 12-month table are available for at least 12 months after release, and a listed retirement date will not move earlier.",
        ],
        sources: [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
      },
      {
        heading: "Amazon Bedrock and Azure OpenAI",
        paragraphs: [
          "For Bedrock models launched on or after September 7, 2026, the lifecycle page says most models have a 6-month Legacy period and some have 45 days. The EOL date is added to the model card when Legacy begins. GPT-6.1 Sol is called out separately: it follows the OpenAI first-party lifecycle and has no separate Bedrock minimum-availability date.",
          "For models launched before September 7, 2026, the legacy page says a model stays on Bedrock for at least 12 months before EOL, and stays in Legacy for at least 6 months before EOL.",
          "Azure's lifecycle FAQ says retirement dates are not extendable. Plan from the model retirement schedule. The working-with-models page describes when a deployment upgrades. It is not a promise that you get a fixed number of days of email.",
        ],
        sources: [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
    ],
    related: [
      { href: "/guides/get-notified-before-a-model-shuts-down/", label: "How to get notified" },
      { href: "/shutdowns/openai-2026-10-23/", label: "OpenAI October 23, 2026 batch" },
      { href: "/models/anthropic/claude-sonnet-5-5/", label: "claude-sonnet-5-5" },
      { href: "/questions/", label: "Per-model dates" },
    ],
    faqs: [
      {
        question: "Is every model guaranteed 6 months?",
        answer:
          "No. Six months is OpenAI's published minimum for generally available models, with a safety exception. Preview models, other providers, and Bedrock use the numbers on their own pages.",
      },
      {
        question: "What does not sooner than mean?",
        answer:
          "On Anthropic's table it is a floor. It is not the day the model stops. SunsetDiff marks that kind of date as not_before.",
      },
    ],
    citations: [OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_MODELS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_RETIREMENTS, AZURE_SCHEDULE],
  },
  {
    slug: "swap-a-deprecated-model",
    title: "How to swap a deprecated model in LiteLLM, OpenRouter, the Vercel AI SDK, and LangChain | SunsetDiff",
    description:
      "Change the model string, and add a fallback where LiteLLM or OpenRouter documents one. No API keys.",
    h1: "How to swap a deprecated model in LiteLLM, OpenRouter, the AI SDK, and LangChain",
    summary: "Change the model string. Add a fallback only where the library documents one.",
    answer:
      "Point the model argument at the replacement id from the provider's deprecation page. LiteLLM and OpenRouter document a fallback list. The Vercel AI SDK OpenAI guide and LangChain's ChatOpenAI page document the model string, not a fallback list.",
    steps: [
      { name: "Copy the replacement id", text: "Take it from the provider deprecation page or the SunsetDiff model page. Do not invent a short name." },
      { name: "Change the model argument", text: "LiteLLM uses the model string. OpenRouter uses model plus an optional models list. The AI SDK uses openai('model-id'). LangChain uses init_chat_model or the provider class model argument." },
      { name: "Add a documented fallback", text: "LiteLLM fallbacks and OpenRouter models are ordered backups. Leave the AI SDK and ChatOpenAI calls as a single id unless you route through one of those two." },
      { name: "Replay one request", text: "A new id can reject an old field. Use the pre-migration checklist." },
    ],
    sections: [
      {
        heading: "LiteLLM",
        paragraphs: [
          "LiteLLM's completion helper tries the model argument first, then each entry in fallbacks, in order. A fallback entry is a model name or a dict of completion arguments. The first success is returned. If every entry fails, completion raises, and the message ends with All fallback attempts failed.",
          "The strings in the sample are the ones in LiteLLM's docs. Replace them with the retired id and the replacement id. The proxy uses a different shape: model_name is the name clients send, litellm_params.model is the provider string, and router_settings.fallbacks maps one model_name to another.",
        ],
        codes: [
          {
            caption: "Python completion fallbacks",
            code: `from litellm import completion
response = completion(
    model="bad-model",
    messages=[{"role": "user", "content": "Hello"}],
    fallbacks=["gpt-6-luna", "command-nightly"],
)
`,
          },
          {
            caption: "Proxy config shape",
            code: `router_settings:
  fallbacks:
    - gpt-6-luna:
        - gpt-6.1-sol
`,
          },
        ],
        sources: [
          { label: "LiteLLM reliable completions", url: LITELLM_FALLBACKS },
          { label: "LiteLLM proxy fallbacks", url: LITELLM_PROXY },
          { label: "LiteLLM proxy config", url: LITELLM_CONFIG },
        ],
      },
      {
        heading: "OpenRouter",
        paragraphs: [
          "OpenRouter's model fallbacks guide says the models array is tried in order when the first model returns an error. Errors that trigger a fallback include context length, moderation, rate limits, and downtime. The response model field is the id that actually ran, and the price is that model's price.",
          "With the OpenAI SDK, the guide puts the first id in model and the backups in extra_body.models. The ids below are the guide's examples, including the ~ prefix that guide uses. This page does not include an API key.",
        ],
        codes: [
          {
            caption: "Arguments from the OpenRouter docs",
            code: `model = "~openai/gpt-sol-latest"
extra_body = {
    "models": ["~anthropic/claude-sonnet-latest", "gryphe/mythomax-l2-13b"]
}
messages = [{"role": "user", "content": "What is the meaning of life?"}]
`,
          },
        ],
        sources: [{ label: "OpenRouter model fallbacks", url: OPENROUTER_FALLBACKS }],
      },
      {
        heading: "Vercel AI SDK",
        paragraphs: [
          "The AI SDK OpenAI guide creates the model with openai('model-id'). The string in the docs example is gpt-6-astra. Change that string to the replacement id. generateText and streamText take that model object.",
          "That guide does not document a fallback list. For a second model, use the LiteLLM or OpenRouter fallback above, or catch the error in your own code and call a second model id.",
        ],
        codes: [
          {
            caption: "TypeScript",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const { text } = await generateText({
  model: openai("gpt-6-astra"),
  prompt: "Hello",
});
`,
          },
        ],
        sources: [{ label: "AI SDK OpenAI guide", url: AI_SDK_OPENAI }],
      },
      {
        heading: "LangChain",
        paragraphs: [
          "LangChain's models page sets the id on init_chat_model or on the provider class. The documented examples include init_chat_model(\"gpt-5.5\"), ChatOpenAI(model=\"gpt-5.5\"), ChatAnthropic(model=\"claude-sonnet-4-6\"), ChatGoogleGenerativeAI(model=\"gemini-3.7-flash\"), and init_chat_model(\"us.anthropic.claude-sonnet-4-6\", model_provider=\"bedrock_converse\").",
          "Azure is the deployment name, not only the OpenAI model id. The documented call passes azure_deployment. Microsoft's working-with-models page is where that deployment's version and upgrade policy are set.",
          "The chat integrations page says routers such as OpenRouter and LiteLLM offer automatic fallbacks. It does not document a fallback list on ChatOpenAI. The samples below omit credentials. The library reads the credential you already configured.",
        ],
        codes: [
          {
            caption: "Python",
            code: `from langchain.chat_models import init_chat_model
model = init_chat_model("gpt-5.5")
`,
          },
          {
            caption: "Bedrock id from the LangChain docs",
            code: `model = init_chat_model(
    "us.anthropic.claude-sonnet-4-6",
    model_provider="bedrock_converse",
)
`,
          },
        ],
        sources: [
          { label: "LangChain models", url: LANGCHAIN_MODELS },
          { label: "LangChain chat integrations", url: LANGCHAIN_CHAT },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
    ],
    related: [
      { href: "/errors/", label: "Request errors after a model change" },
      { href: "/replace/openai/gpt-4o-2024-05-13/", label: "gpt-4o-2024-05-13 diff" },
      { href: "/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/", label: "Sonnet 4.5 migration diff" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in code" },
    ],
    faqs: [
      {
        question: "Does the AI SDK openai() helper have a fallback argument?",
        answer:
          "The OpenAI guide shows openai('model-id') and does not document a fallback list. Use LiteLLM fallbacks or OpenRouter's models array when you want a documented backup.",
      },
      {
        question: "Should I put an API key in the model config this page shows?",
        answer: "No. Keep the credential where the SDK already reads it. These samples only change the model id.",
      },
    ],
    citations: [LITELLM_FALLBACKS, LITELLM_PROXY, LITELLM_CONFIG, OPENROUTER_FALLBACKS, AI_SDK_OPENAI, LANGCHAIN_MODELS, LANGCHAIN_CHAT, AZURE_WORKING],
  },
  {
    slug: "what-happens-on-model-shutdown-day",
    title: "What happens on AI model shutdown day | SunsetDiff",
    description:
      "What OpenAI, Anthropic, Gemini, Bedrock, and Azure say happens when a model reaches its shutdown date, with links to the error pages.",
    h1: "What happens on AI model shutdown day",
    summary: "The call fails or the deployment stops. The HTTP sentence is on the error pages when a source printed one.",
    answer:
      "On shutdown day the retired id is no longer served. OpenAI says it is no longer accessible. Anthropic, Gemini, and Bedrock say requests fail or the endpoint is gone. Azure either upgrades the deployment or stops it, depending on versionUpgradeOption. A 400 from a rejected field is a different event: that happens when you call the replacement with old settings.",
    steps: [
      { name: "Confirm the calendar", text: "Use the platform page for the host you call. Azure, Bedrock, and Vertex do not inherit the first-party day." },
      { name: "Expect the retired id to fail", text: "Read the provider wording below. Do not invent an HTTP status the official page does not print." },
      { name: "If you already switched, read the error pages", text: "A replacement can return 400 for temperature, max_tokens, or tool settings the old model accepted." },
    ],
    sections: [
      {
        heading: "OpenAI",
        paragraphs: [
          "OpenAI says that at shut down the model or endpoint is no longer accessible. Sunset and shut down mean the same thing on that page. The deprecations page does not print an HTTP status or an error sentence for that moment.",
          "The [model has been deprecated](/errors/openai-model-has-been-deprecated/) page is the place for the sentence a public issue recorded after a model was removed. It says the deprecations page itself does not print that sentence. The October 23, 2026 batch is [OpenAI model IDs shutting down October 23, 2026](/shutdowns/openai-2026-10-23/).",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Anthropic",
        paragraphs: [
          "Retired means the model is no longer available. Requests to retired models fail. Requests past the retirement date fail. The deprecations page does not name an HTTP status for that failure.",
          "A different failure is a live model rejecting an old field. Those are HTTP 400, and they are documented on the [request errors](/errors/) for claude-sonnet-5-5, with the migration guide as the source.",
        ],
        sources: [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
      },
      {
        heading: "Gemini API",
        paragraphs: [
          "The Gemini deprecations page says that once a model is shut down it is completely turned off and the endpoint is no longer available. It does not print one error sentence for every model.",
          "Firebase's model page says Gemini 1.0 and Gemini 1.5 are already shut down, and that requests to those models return a 404. That sentence is about those generations. It does not say every later id returns 404.",
          "[This model is no longer available](/errors/gemini-model-no-longer-available/) quotes the 404 sentence recorded for gemini-2.0-flash, which shut down June 1, 2026. Use that page for the sentence. Do not assume every later Gemini id returns the same text.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Firebase AI Logic models", url: FIREBASE_MODELS },
        ],
      },
      {
        heading: "Amazon Bedrock",
        paragraphs: [
          "After the EOL date, Bedrock says the model is removed from the Regions on that row and requests to it fail, unless you have a private arrangement with the provider. Migration does not happen automatically. You change the model id in the application before EOL.",
          "The legacy page adds that state can differ by Region. Check ListFoundationModels or GetFoundationModel in the Region you call and read modelLifecycle.",
        ],
        sources: [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Azure OpenAI",
        paragraphs: [
          "What Azure does depends on the deployment upgrade option. OnceNewDefaultVersionAvailable and OnceCurrentVersionExpired upgrade the deployment. NoAutoUpgrade never upgrades. At retirement that deployment stops working, and you have to point the code at a deployment that has not expired.",
          "The model versions page says that if you opted out of automatic upgrades, the deployment stops accepting requests and returns errors after the model is retired. That page does not print a status code or an error sentence. Microsoft's HTTP troubleshooting table lists 404 for a deployment name that does not exist, which is a separate case from a dated retirement.",
        ],
        sources: [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure model versions", url: AZURE_VERSIONS },
          { label: "Azure OpenAI HTTP errors", url: "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/troubleshoot-errors" },
        ],
      },
    ],
    related: [
      { href: "/errors/", label: "All request errors" },
      { href: "/errors/openai-model-has-been-deprecated/", label: "OpenAI deprecated model error" },
      { href: "/errors/gemini-model-no-longer-available/", label: "Gemini model no longer available" },
      { href: "/shutdowns/openai-2026-10-23/", label: "OpenAI October 23, 2026 batch" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why the dates differ" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration checklist" },
    ],
    faqs: [
      {
        question: "Is shutdown day always HTTP 404?",
        answer:
          "The OpenAI, Anthropic, and Bedrock retirement pages do not say that. Firebase says Gemini 1.0 and 1.5 return a 404. The 404 sentence SunsetDiff quotes for gemini-2.0-flash is on the request error page.",
      },
      {
        question: "Why did I get HTTP 400 before shutdown day?",
        answer:
          "The replacement is up, and it rejected a field. Start at the request errors index. That is not the retired-id failure.",
      },
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      CLAUDE_DEPRECATIONS,
      GEMINI_DEPRECATIONS,
      FIREBASE_MODELS,
      BEDROCK_LIFECYCLE,
      BEDROCK_LEGACY,
      AZURE_WORKING,
      AZURE_VERSIONS,
      "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/troubleshoot-errors",
    ],
  },
  {
    slug: "find-model-ids-in-your-codebase",
    title: "How to find every model ID in your codebase | SunsetDiff",
    description:
      "ripgrep patterns for model ids, the deployment name Azure and LangChain use, and the SunsetDiff scan list.",
    h1: "How to find every model ID in your codebase",
    summary: "Search the repo for provider id shapes, then check matches against the scan list.",
    answer:
      "Model ids live in source as plain strings. Search for the id shapes the providers publish, then check hits against the SunsetDiff scan list. A string that never appears in git can still be set in the host environment.",
    steps: [
      { name: "Search for the published id shapes", text: "OpenAI uses model strings such as gpt- and dated snapshots. Claude uses claude-. Gemini uses gemini-. Bedrock uses modelId values such as anthropic.claude-." },
      { name: "Search for the argument name", text: "SDKs put the id in a model argument. Azure and LangChain also use a deployment name." },
      { name: "Check retiring ids", text: "The scan page builds a ripgrep pattern from dataset ids that have a shutdown date and are not active. Nothing is uploaded." },
    ],
    sections: [
      {
        heading: "Id shapes from the docs",
        paragraphs: [
          "Search the work tree for the shapes those pages use. A match is a candidate, not proof the call still runs.",
        ],
        bullets: [
          "OpenAI model pages and the deprecations table use ids such as gpt-4o-2024-05-13 and gpt-5.6-sol. Aliases such as gpt-5.6 are also real request strings.",
          "Claude ids look like claude-sonnet-4-5-20250929 or claude-sonnet-5-5. Bedrock prefixes the older ones as anthropic.claude-...-v1:0.",
          "Gemini ids look like gemini-2.5-pro or gemini-flash-latest.",
        ],
        codes: [
          {
            caption: "ripgrep",
            code: `rg -n -e 'claude-' -e 'gemini-' -e 'gpt-' -e 'anthropic\\.claude-' -e 'modelId'
`,
          },
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Claude model IDs", url: CLAUDE_IDS },
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Bedrock inference API", url: BEDROCK_INVOKE },
        ],
      },
      {
        heading: "SDK argument names",
        paragraphs: [
          "The AI SDK puts the id in openai('model-id'). LangChain puts it in init_chat_model(\"...\") or model= on ChatOpenAI, ChatAnthropic, and ChatGoogleGenerativeAI. Bedrock's documented LangChain id is the first argument, for example us.anthropic.claude-sonnet-4-6, with model_provider bedrock_converse.",
          "LiteLLM puts the provider string in model or in litellm_params.model. The proxy's model_name can be a private alias that is not the provider id. Read both keys.",
          "Azure calls a deployment. LangChain's documented parameter is azure_deployment, and its sample reads AZURE_OPENAI_DEPLOYMENT_NAME. Search for that name. The OpenAI model id on the Azure schedule is the version behind the deployment, which you will not see if the code only stores the deployment name.",
        ],
        codes: [
          {
            caption: "Argument names",
            code: `rg -n -e 'azure_deployment' -e 'AZURE_OPENAI_DEPLOYMENT' -e 'litellm_params' -e 'init_chat_model'
`,
          },
        ],
        sources: [
          { label: "AI SDK OpenAI", url: AI_SDK_OPENAI },
          { label: "LangChain models", url: LANGCHAIN_MODELS },
          { label: "LiteLLM proxy config", url: LITELLM_CONFIG },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
      {
        heading: "SunsetDiff scan",
        paragraphs: [
          "The [scan page](/scan/) lists retiring ids from this dataset: a published shutdown date and a status other than active. Save them as retiring-ids.txt and run the fixed-string search. Word boundaries in the one-line pattern keep a short id from matching inside a longer one.",
          "A hit means that id is in the dataset with a shutdown date. Open the model page for the source. A miss is not a promise the model is still available. Ids in a dashboard, a secret store, or a vendor console are outside the repo. Anthropic's usage export is the check for ids your Claude API key has actually called.",
        ],
        codes: [
          {
            caption: "Retiring ids",
            code: `rg -n -F -f retiring-ids.txt
`,
          },
        ],
        sources: [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/scan/", label: "Scan retiring ids" },
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Aliases vs snapshots" },
      { href: "/guides/swap-a-deprecated-model/", label: "Swap a model in a gateway or SDK" },
      { href: "/questions/", label: "Is this model being deprecated?" },
      { href: "/models/openai/gpt-4o-2024-05-13/", label: "gpt-4o-2024-05-13" },
    ],
    faqs: [
      {
        question: "Does the scan upload the repository?",
        answer: "No. You copy the pattern and run it locally. SunsetDiff does not receive the files.",
      },
      {
        question: "Why did search miss an Azure model?",
        answer:
          "The code may store a deployment name. LangChain calls that argument azure_deployment. The model version is on the Azure deployment, in the retirement schedule.",
      },
    ],
    citations: [OPENAI_DEPRECATIONS, CLAUDE_IDS, GEMINI_MODELS, BEDROCK_INVOKE, AI_SDK_OPENAI, LANGCHAIN_MODELS, LITELLM_CONFIG, AZURE_WORKING, CLAUDE_DEPRECATIONS],
  },
  {
    slug: "check-model-shutdown-dates-programmatically",
    title: "Check model shutdown dates programmatically | SunsetDiff",
    description: "Read SunsetDiff JSON, CSV, or the JSON API to check an AI model shutdown date from the official provider pages.",
    h1: "Check model shutdown dates programmatically",
    summary: "Read the JSON or CSV SunsetDiff publishes. Each date cites the official page.",
    answer:
      "SunsetDiff publishes the same dates as JSON and CSV under CC BY 4.0. Each date cites the official provider page and the day it was checked. Blank fields were not on that page.",
    steps: [
      { name: "Download the file", text: "Fetch sunsetdiff.json, or upcoming.json for the next 90 days. No API key." },
      { name: "Read the date fields", text: "shutdown_date is the date. shutdown_date_kind of not_before is a floor, not a deadline." },
      { name: "Read the Bedrock note", text: "region_or_platform_notes on an aws-bedrock row limits the date to the Regions listed there." },
      { name: "Open the source", text: "sources[0].url is the official page. Check it before you migrate." },
    ],
    sections: [
      {
        heading: "Download",
        paragraphs: [
          "The files are static. [API docs](/api/) list every field.",
        ],
        codes: [
          {
            caption: "curl",
            code: `curl -fsSL https://sunsetdiff.com/dataset/sunsetdiff.json -o sunsetdiff.json
curl -fsSL https://sunsetdiff.com/api/v1/upcoming.json
`,
          },
        ],
        bullets: [
          "[sunsetdiff.json](/dataset/sunsetdiff.json) and [sunsetdiff.csv](/dataset/sunsetdiff.csv)",
          "[upcoming.json](/api/v1/upcoming.json) for the next 90 days",
          "[lookup](/api/v1/lookup/gpt-4.json) for one model id",
          "The dataset is also listed at [Hugging Face](https://huggingface.co/datasets/sunsetdiff/ai-model-deprecations).",
        ],
        sources: [
          { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
          { label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" },
        ],
      },
      {
        heading: "What to read",
        paragraphs: [
          "shutdown_date and shutdown_date_kind are the pair. A kind of not_before is a floor, not a deadline. Anthropic publishes some retirement cells as not sooner than a date. SunsetDiff keeps that wording as not_before.",
          "region_or_platform_notes on Amazon Bedrock rows repeats the Regions from the lifecycle table. Bedrock says a row's Regions are the ones that announced EOL date covers, and that another Region can show a different state.",
          "Read sources[0].url before you migrate. That is the official page.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" },
        ],
      },
      {
        heading: "MCP",
        paragraphs: [
          "The read-only MCP endpoint is /mcp on the API service. Tools: check_model, upcoming_shutdowns, migration_diff, scan_text. Client setup is on the [MCP page](/mcp/).",
        ],
        sources: [{ label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" }],
      },
    ],
    related: [
      { href: "/mcp/", label: "MCP server" },
      { href: "/api/", label: "API docs" },
      { href: "/data/", label: "Dataset" },
      { href: "/scan/", label: "Scan code" },
      { href: "/shutdowns/", label: "Shutdown batches" },
      { href: "/guides/get-notified-before-a-model-shuts-down/", label: "Get notified" },
    ],
    faqs: [
      {
        question: "Does the JSON need an API key?",
        answer: "No. The files are public and static.",
      },
      {
        question: "What if shutdown_date is blank?",
        answer: "The official page did not publish a date when SunsetDiff last checked it. The source URL is still on the row.",
      },
    ],
    citations: [
      "https://creativecommons.org/licenses/by/4.0/",
      "https://sunsetdiff.com/api/",
      "https://huggingface.co/datasets/sunsetdiff/ai-model-deprecations",
      CLAUDE_DEPRECATIONS,
      BEDROCK_LEGACY,
    ],
  },
];

export function guideBySlug(slug: string | undefined): GuidePage | undefined {
  return guides.find((guide) => guide.slug === slug);
}
