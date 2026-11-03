import type { ModelRecord } from "../schema.ts";
import type { FaqItem } from "./format.ts";

/**
 * Glossary facts are taken from provider pages already snapshotted in this repo
 * on 2026-10-22, or from the guides' cited pages read on 2026-10-20.
 * Example rows are selected from data/models at build time.
 */
export const GLOSSARY_CHECKED = "2026-10-22";
export const GLOSSARY_EARLIER = "2026-10-20";
export const GLOSSARY_INDEX = "/glossary/";

const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_SOL = "https://developers.openai.com/api/docs/models/gpt-5.6-sol";
const OPENAI_CHAT_LATEST = "https://developers.openai.com/api/docs/models/chat-latest";
const OPENAI_CHANGELOG = "https://developers.openai.com/api/docs/changelog";
const OPENAI_COMPAT = "https://developers.openai.com/api/reference/llms-full.txt";
const CLAUDE_DEPRECATIONS = "https://platform.claude.com/docs/en/about-claude/model-deprecations";
const CLAUDE_IDS = "https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions";
const CLAUDE_VERSIONING = "https://platform.claude.com/docs/en/api/versioning";
const CLAUDE_MIGRATION_2026 = "https://platform.claude.com/docs/en/api/migration-2026-10-21";
const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const GEMINI_MODELS = "https://ai.google.dev/gemini-api/docs/models";
const GEMINI_CHANGELOG = "https://ai.google.dev/gemini-api/docs/changelog";
const FIREBASE_MODELS = "https://firebase.google.com/docs/ai-logic/models";
const VERTEX_VERSIONS = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";
const BEDROCK_LIFECYCLE = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html";
const BEDROCK_LEGACY = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";
const AZURE_RETIREMENTS = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
const AZURE_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const LITELLM_FALLBACKS = "https://docs.litellm.ai/docs/completion/reliable_completions";
const OPENROUTER_FALLBACKS = "https://openrouter.ai/docs/guides/routing/model-fallbacks";

const EXAMPLE_PROVIDERS: ModelRecord["provider"][] = [
  "openai",
  "anthropic",
  "google-gemini-api",
  "google-vertex",
  "aws-bedrock",
  "azure-openai",
  "mistral",
];

export interface GlossarySource {
  label: string;
  url: string;
}

export interface GlossarySection {
  heading: string;
  paragraphs: string[];
  sources: GlossarySource[];
  /** Day this section's pages were read. */
  checked: string;
}

export interface GlossaryLink {
  href: string;
  label: string;
}

export type ExampleSpec =
  | { kind: "status"; status: ModelRecord["status"]; rank: "soonest" | "latest"; provider?: ModelRecord["provider"] }
  | { kind: "ids"; ids: { provider: ModelRecord["provider"]; id: string }[] }
  | { kind: "preview" }
  | { kind: "not_before" }
  | { kind: "region" }
  | { kind: "auto_routed" }
  | { kind: "replacement" }
  | { kind: "none" };

export interface ExampleGroup {
  caption: string;
  spec: ExampleSpec;
  showNotes?: boolean;
}

export interface GlossaryTerm {
  slug: string;
  name: string;
  alternateNames?: string[];
  title: string;
  description: string;
  h1: string;
  definition: string;
  sections: GlossarySection[];
  related: GlossaryLink[];
  seeAlso: string[];
  citations: string[];
  exampleGroups: ExampleGroup[];
}

export function glossaryPath(slug: string): string {
  return `/glossary/${slug}/`;
}

export function glossaryTermBySlug(slug: string | undefined): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => term.slug === slug);
}

export const glossaryHubFaqs: FaqItem[] = [
  {
    question: "What is the difference between a deprecated and a retired model?",
    answer:
      "Deprecated means the provider still serves the model and has announced that it will stop. Retired means the model is no longer available and requests fail. The words are not identical on every provider. See [Deprecated](/glossary/deprecated/) and [Retired](/glossary/retired/).",
  },
  {
    question: "What is a model snapshot versus a model alias?",
    answer:
      "A snapshot is a dated id that stays on one version until that id is retired. An alias is a short name that can be pointed at a newer snapshot later. See [Model snapshot](/glossary/model-snapshot/) and [Model alias](/glossary/model-alias/).",
  },
  {
    question: "What does legacy mean for OpenAI models?",
    answer:
      "On OpenAI's deprecations page, legacy means the model or endpoint no longer receives updates and is expected to be deprecated later. Deprecated means retirement has been announced and a shut down date exists. See [Legacy model](/glossary/legacy-model/).",
  },
  {
    question: "What is a shutdown date?",
    answer:
      "It is the day the provider says the model stops being served. A date that only says not sooner than is a floor, not that day. See [Shutdown date](/glossary/shutdown-date/).",
  },
];

function section(heading: string, paragraphs: string[], sources: GlossarySource[], checked: string): GlossarySection {
  return { heading, paragraphs, sources, checked };
}

function cite(...urls: string[]): string[] {
  return [...new Set(urls)];
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: "deprecated",
    name: "Deprecated model",
    alternateNames: ["deprecation"],
    title: "What deprecated means for an AI model | SunsetDiff",
    description: "A deprecated model is still served, and the provider has announced that it will stop. How OpenAI, Anthropic, Gemini, Vertex, Bedrock, and Azure use the word.",
    h1: "Deprecated model",
    definition:
      "A deprecated model is one the provider still serves after announcing that support will end. It is not retired yet: requests keep working until the shutdown date, unless that provider's page says a narrower rule.",
    sections: [
      section(
        "OpenAI",
        [
          "OpenAI uses deprecation for the process of retiring a model or endpoint. When the announcement is made, the model becomes deprecated immediately. Every deprecated model or endpoint also has a shut down date. At shut down it is no longer accessible.",
          "Sunset and shut down mean the same thing on that page. Legacy is a different word: no more updates, with deprecation expected later.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic",
        [
          "Anthropic's status table says Deprecated means the model is still functional but no longer recommended. Anthropic names a replacement and assigns a retirement date. Retired means it is no longer available and requests fail.",
          "Those dates apply to the Claude API, Claude Platform on AWS, and Microsoft Foundry. Amazon Bedrock and Google Cloud publish their own schedules.",
        ],
        [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API and Vertex AI",
        [
          "The Gemini API page says a deprecation is the announcement that Google no longer provides support and that the model will be shut down. After shutdown the model is turned off and the endpoint is no longer available. A date in the table is the earliest the model might be retired. The exact day is sent later, with advance notice.",
          "The same page says some Gemini 2.5 models are not deprecated and stay up until further notice. Vertex lists a retirement date per model id. A listed Vertex date will not move earlier, though it may be extended.",
        ],
        [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock",
        [
          "Bedrock's lifecycle pages do not use Deprecated as a state. The states are Active, Legacy, and End-of-Life (EOL). Legacy is the scheduled-retirement window. EOL is when requests fail.",
          "SunsetDiff therefore does not file a Bedrock lifecycle row as status deprecated. Those rows are legacy until the EOL date has passed, then retired.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Azure OpenAI",
        [
          "Azure's lifecycle table says Deprecated means existing customers can still create and manage deployments, and new customers cannot. An existing customer is an Azure subscription that has deployed that model version. A new subscription under the same tenant does not inherit access.",
          "Legacy is an earlier optional stage: newer models exist, and you should plan to move. A model can skip Legacy and go from generally available to Deprecated. Retired is later: removed from service, and inference requests return 410 Gone.",
        ],
        [{ label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS }],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/deprecated/", label: "Deprecated models" },
      { href: "/retired/", label: "Retired models" },
      { href: "/upcoming/", label: "Upcoming shutdowns" },
      { href: "/glossary/retired/", label: "Retired" },
      { href: "/glossary/legacy-model/", label: "Legacy model" },
      { href: "/guides/how-much-notice-before-an-ai-model-shuts-down/", label: "How much notice you get" },
    ],
    seeAlso: ["retired", "shutdown-date", "sunset", "legacy-model", "notice-period"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_RETIREMENTS),
    exampleGroups: [
      { caption: "Dataset rows stored as deprecated. One per provider that has one, the soonest shutdown date first.", spec: { kind: "status", status: "deprecated", rank: "soonest" } },
    ],
  },
  {
    slug: "retired",
    name: "Retired model",
    alternateNames: ["retirement"],
    title: "What retired means for an AI model | SunsetDiff",
    description: "A retired model is no longer available and requests fail. OpenAI, Anthropic, Gemini, Bedrock, and Azure do not share one HTTP status for that moment.",
    h1: "Retired model",
    definition:
      "A retired model is no longer available, and requests to that id fail. Providers also call this moment shut down, sunset, or end of life, and they do not all name the same HTTP status.",
    sections: [
      section(
        "OpenAI",
        [
          "At shut down, OpenAI says the model or endpoint is no longer accessible. Sunset means the same thing. The deprecations page does not print an HTTP status for that moment.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic",
        [
          "Retired means the model is no longer available for use. Requests to retired models fail. Requests past the retirement date fail. The deprecations page does not name an HTTP status for that failure.",
        ],
        [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API and Vertex AI",
        [
          "The Gemini deprecations page says that once a model is shut down it is completely turned off and the endpoint is no longer available. It does not print one error sentence for every model.",
          "Firebase's model page says Gemini 1.0 and Gemini 1.5 are already shut down and that requests to those models return a 404. That sentence is about those generations.",
          "Vertex puts past models in its retired listing. A listed retirement date will not be moved earlier.",
        ],
        [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Firebase AI Logic models", url: FIREBASE_MODELS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock",
        [
          "Bedrock calls this End-of-Life, not Retired. After the EOL date the model is removed and requests fail, unless you have a private arrangement with the provider. Migration does not happen automatically. On the legacy page, state can differ by Region.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Azure OpenAI",
        [
          "Azure's lifecycle table says Retired means removed from service and all inference requests return 410 Gone. That status code is on the Azure page. It is not what the OpenAI deprecations page prints for the OpenAI API.",
          "If the deployment's upgrade option is NoAutoUpgrade, the deployment stops working at retirement. Other upgrade options move the deployment onto a newer version instead.",
        ],
        [
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/retired/", label: "Retired models" },
      { href: "/deprecated/", label: "Deprecated models" },
      { href: "/errors/", label: "Request errors" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/glossary/end-of-life/", label: "End of life" },
    ],
    seeAlso: ["deprecated", "shutdown-date", "sunset", "end-of-life"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, FIREBASE_MODELS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_RETIREMENTS, AZURE_WORKING),
    exampleGroups: [
      { caption: "Dataset rows stored as retired. One per provider, the latest shutdown date in that provider.", spec: { kind: "status", status: "retired", rank: "latest" } },
    ],
  },
  {
    slug: "shutdown-date",
    name: "Shutdown date",
    alternateNames: ["retirement date", "shut down date"],
    title: "What a shutdown date is | SunsetDiff",
    description: "The day a model stops being served. A not-sooner-than date is a floor. OpenAI, Anthropic, Gemini, Vertex, Bedrock, and Azure publish the day on different pages.",
    h1: "Shutdown date",
    definition:
      "A shutdown date is the day the provider says the model stops being served. A date that only says not sooner than is a floor, not that day, and a first-party date does not move the date on Azure, Bedrock, or Vertex.",
    sections: [
      section(
        "OpenAI",
        [
          "OpenAI's deprecations page lists a shut down date for each deprecated model. The same page says GET /v1/models can include shutdown_date as YYYY-MM-DD, or null when no date has been announced.",
          "At that date the model or endpoint is no longer accessible. Sunset means the same thing.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic",
        [
          "The status table has a retirement date column. Some active rows say not sooner than a date. That phrase is a floor. It is not the day the model stops. Requests past a real retirement date fail.",
          "For publicly released models, Anthropic says the notice is at least 60 days. The table is still the source for a specific id.",
        ],
        [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API and Vertex AI",
        [
          "A date on the Gemini deprecations table is the earliest the model might be retired. The exact shutdown date is communicated later, with advance notice. No shutdown date announced means the table has not set that day.",
          "Vertex lists a retirement date per model id and says a listed date will not be moved earlier, though the timeline may be extended. Models in the shorter-availability table stay up until a retirement date is announced, and that announcement gives at least 45 days to migrate.",
        ],
        [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock and Azure OpenAI",
        [
          "Bedrock publishes an EOL date. Only the Bedrock dates apply to Bedrock calls. They can differ from the provider's own page, and on the legacy page they can differ by Region.",
          "Azure publishes a retirement date on its own schedule. The lifecycle FAQ says retirement dates are not extendable. The OpenAI deprecations page is a different calendar.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/upcoming/", label: "Upcoming shutdowns" },
      { href: "/timeline/", label: "Shutdown timeline" },
      { href: "/deadlines/", label: "Deadlines" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why the same model has two dates" },
      { href: "/glossary/notice-period/", label: "Notice period" },
    ],
    seeAlso: ["sunset", "end-of-life", "notice-period", "deprecated", "regional-availability"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_SCHEDULE, AZURE_RETIREMENTS),
    exampleGroups: [
      { caption: "Deprecated rows in the dataset, one per provider, soonest shutdown date in that provider.", spec: { kind: "status", status: "deprecated", rank: "soonest" } },
      { caption: "Rows whose date is only a floor (not sooner than). SunsetDiff does not treat these as a shutdown day.", spec: { kind: "not_before" } },
    ],
  },
  {
    slug: "sunset",
    name: "Sunset",
    alternateNames: ["shut down"],
    title: "What sunset means for an AI model | SunsetDiff",
    description: "On OpenAI's deprecations page, sunset and shut down mean the model is no longer accessible. Other providers say retirement or end of life.",
    h1: "Sunset",
    definition:
      "On OpenAI's deprecations page, sunset and shut down mean the same thing: the model or endpoint is no longer accessible. Anthropic, Gemini, Vertex, and Azure say retirement or shutdown, and Amazon Bedrock says end of life.",
    sections: [
      section(
        "OpenAI",
        [
          "The deprecations page says sunset and shut down are interchangeable. Both mean the model or endpoint is no longer accessible. Deprecation is earlier: the announcement, while the model is still up, with a shut down date already set.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Other providers in this dataset",
        [
          "Anthropic's table says Retired, and requests fail. The Gemini page says shut down: the model is turned off and the endpoint is gone. Vertex and Azure publish a retirement date. Bedrock publishes an EOL date, and requests fail after it.",
          "A page that says sunset without naming the host is not enough. Read the calendar for the API you call.",
        ],
        [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/retired/", label: "Retired models" },
      { href: "/glossary/shutdown-date/", label: "Shutdown date" },
      { href: "/glossary/end-of-life/", label: "End of life" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
    ],
    seeAlso: ["shutdown-date", "retired", "end-of-life", "deprecated"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, AZURE_SCHEDULE, BEDROCK_LIFECYCLE),
    exampleGroups: [
      {
        caption: "The latest retired OpenAI row in the dataset. OpenAI calls this moment sunset or shut down.",
        spec: { kind: "status", status: "retired", rank: "latest", provider: "openai" },
      },
    ],
  },
  {
    slug: "legacy-model",
    name: "Legacy model",
    alternateNames: ["legacy"],
    title: "What a legacy model is | SunsetDiff",
    description: "Legacy means the model still runs and you should plan a move. OpenAI, Anthropic, Bedrock, and Azure do not share one definition.",
    h1: "Legacy model",
    definition:
      "A legacy model still runs, and the provider has told you to plan a move. OpenAI and Anthropic mean no more updates, Bedrock means the scheduled-retirement window, and Azure means an optional stage before Deprecated.",
    sections: [
      section(
        "OpenAI",
        [
          "OpenAI uses legacy for models and endpoints that no longer receive updates. The tag signals where the platform is moving. A legacy model can be expected to be deprecated later. Deprecation is the later step, with a shut down date.",
          "The current SunsetDiff dataset has no OpenAI row stored as status legacy. Rows on the deprecations page are stored as deprecated until the shut down date passes, then retired. OpenAI's legacy label and this site's status field are not the same column.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic",
        [
          "Anthropic's status table says Legacy means the model will no longer receive updates and might be deprecated in the future. Deprecated means it is still functional, not recommended, with a replacement and a retirement date.",
          "If the current dataset has no Anthropic row in Legacy, the table had no row in that state on the day it was read. The definition is still the one on the status table.",
        ],
        [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock",
        [
          "For models launched on Bedrock on or after September 7, 2026, Legacy means the model is scheduled for retirement. At the start of Legacy, Bedrock notifies you of the EOL date. You can keep using the model. New customers cannot adopt it. Existing customers may lose access after 15 days of inactivity. You cannot create a new Provisioned Throughput for a model in Legacy. Most models have a 6 month Legacy period, and some have 45 days.",
          "For models launched before September 7, 2026, the legacy page says the model stays on Bedrock for at least 12 months before EOL, and stays in Legacy for at least 6 months before EOL. State can differ by Region.",
          "GPT-6.1 Sol is called out separately on the current lifecycle page: it follows the OpenAI first-party lifecycle and has no separate Bedrock minimum-availability date.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Azure OpenAI and Gemini",
        [
          "Azure's lifecycle table says Legacy means newer, more capable models exist and you should plan to migrate. The stage is optional. A model can skip from generally available to Deprecated. The model stays available until deprecation.",
          "The Gemini deprecations page does not define a Legacy model state. It uses deprecation and shutdown. Vertex's model versions page lists retirement dates and does not define a Legacy state in the sections read on October 22, 2026.",
        ],
        [
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/glossary/deprecated/", label: "Deprecated" },
      { href: "/glossary/end-of-life/", label: "End of life" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why dates differ by platform" },
    ],
    seeAlso: ["deprecated", "end-of-life", "notice-period", "provisioned-throughput"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_RETIREMENTS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS),
    exampleGroups: [
      { caption: "Dataset rows stored as legacy. Bedrock Legacy rows are the large group. OpenAI's own legacy label is not this column.", spec: { kind: "status", status: "legacy", rank: "soonest" }, showNotes: true },
    ],
  },
  {
    slug: "end-of-life",
    name: "End of life",
    alternateNames: ["EOL"],
    title: "What end of life means for an AI model | SunsetDiff",
    description: "End of life is Amazon Bedrock's name for the date a model is removed and requests fail. Other providers call that moment shutdown, sunset, or retirement.",
    h1: "End of life",
    definition:
      "End of life (EOL) is Amazon Bedrock's name for the date a model is removed and requests to it fail. OpenAI calls that moment shut down or sunset, and Anthropic, Gemini, Vertex, and Azure call it retirement or shutdown.",
    sections: [
      section(
        "Amazon Bedrock",
        [
          "On the current lifecycle page, after the EOL date the model is removed from all AWS Regions and requests fail, unless you have a private arrangement with the provider. Migration does not happen automatically. You change the model id before EOL.",
          "On the legacy page, which covers models launched before September 7, 2026, the model is no longer available on or soon after the EOL date, and requests fail, with the same private-arrangement exception. The Regions column lists only the Regions covered by that EOL date. The model can stay Active in other Regions.",
          "Bedrock dates can differ from the dates the model provider publishes. For a Bedrock call, only the Bedrock date applies.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "The same moment on other providers",
        [
          "OpenAI: at shut down the model is no longer accessible. Anthropic: requests to retired models fail. Gemini: the endpoint is no longer available. Azure: a retired model is removed and inference requests return 410 Gone, unless the deployment was upgraded before that date.",
        ],
        [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/retired/", label: "Retired models" },
      { href: "/glossary/legacy-model/", label: "Legacy model" },
      { href: "/glossary/regional-availability/", label: "Regional availability" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
    ],
    seeAlso: ["retired", "sunset", "shutdown-date", "legacy-model", "regional-availability"],
    citations: cite(BEDROCK_LIFECYCLE, BEDROCK_LEGACY, OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, AZURE_RETIREMENTS),
    exampleGroups: [
      { caption: "One Bedrock row whose lifecycle note lists Regions. The shutdown cell is the date stored for that row.", spec: { kind: "region" }, showNotes: true },
    ],
  },
  {
    slug: "model-snapshot",
    name: "Model snapshot",
    alternateNames: ["dated model id", "pinned snapshot"],
    title: "What a model snapshot is | SunsetDiff",
    description: "A snapshot is a dated model id that stays on one version until that id is retired. A short alias can move later.",
    h1: "Model snapshot",
    definition:
      "A model snapshot is a dated model id that stays on one version until that id is retired. A short alias can be pointed at a different snapshot later, and the dated id is the one that does not move.",
    sections: [
      section(
        "OpenAI",
        [
          "OpenAI model pages say snapshots let you lock a specific version so performance and behavior stay consistent. The changelog records when a short slug is pointed at a new snapshot. The previous snapshot keeps its dated id.",
          "The API backwards-compatibility note says prompting behavior between snapshots can change, and that the way to keep prompting and output consistent is to use a pinned model version.",
        ],
        [
          { label: "GPT-5.6 Sol model page", url: OPENAI_SOL },
          { label: "OpenAI changelog", url: OPENAI_CHANGELOG },
          { label: "OpenAI API backwards compatibility", url: OPENAI_COMPAT },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "Anthropic",
        [
          "Each Claude model ID is a pinned version for the life of that ID. Before the 4.6 generation, a shorter alias such as claude-sonnet-4-5 points at the most recent dated snapshot. A 4.6-generation id such as claude-sonnet-4-6 is the snapshot, not an alias.",
          "Weights stay fixed for an ID. Serving pieces such as the router, safety classifiers, and sampling logic can still change.",
        ],
        [{ label: "Claude model IDs and versioning", url: CLAUDE_IDS }],
        GLOSSARY_EARLIER,
      ),
      section(
        "Gemini API, Vertex AI, and Azure",
        [
          "A Gemini stable name points at one stable model and usually does not change. A latest name is an alias that can be swapped. That split is the naming note on the Gemini models page.",
          "Vertex lists a model id and a retirement date for that id. The page read on October 22, 2026 does not describe a latest alias.",
          "On Azure you call a deployment. The deployment has a model version. A specific version stays selected until you change it or until that version's retirement date. Azure's lifecycle article calls a dated release, such as gpt-4o 2024-05-13, a model version.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Aliases vs pinned snapshots" },
      { href: "/glossary/model-alias/", label: "Model alias" },
      { href: "/glossary/pinned-version/", label: "Pinned version" },
    ],
    seeAlso: ["model-alias", "pinned-version", "auto-upgrade"],
    citations: cite(OPENAI_SOL, OPENAI_CHANGELOG, OPENAI_COMPAT, CLAUDE_IDS, GEMINI_MODELS, VERTEX_VERSIONS, AZURE_RETIREMENTS, AZURE_WORKING),
    exampleGroups: [
      {
        caption: "Dataset rows for a short id and a dated id of the same family. The dated id is the snapshot.",
        spec: {
          kind: "ids",
          ids: [
            { provider: "openai", id: "gpt-4o" },
            { provider: "openai", id: "gpt-4o-2024-05-13" },
            { provider: "openai", id: "gpt-5.6-sol" },
            { provider: "anthropic", id: "claude-sonnet-4-5-20250929" },
            { provider: "anthropic", id: "claude-sonnet-4-6" },
            { provider: "azure-openai", id: "gpt-4o-2024-05-13" },
          ],
        },
      },
    ],
  },
  {
    slug: "model-alias",
    name: "Model alias",
    alternateNames: ["floating alias", "latest alias"],
    title: "What a model alias is | SunsetDiff",
    description: "A model alias is a short name that can point at a newer snapshot later. OpenAI, Claude, and Gemini publish this. Bedrock's lifecycle pages do not.",
    h1: "Model alias",
    definition:
      "A model alias is a short name that can be pointed at a newer snapshot later, while a dated or pinned id stays put. OpenAI, Anthropic, and Gemini each publish an alias rule, and Amazon Bedrock's lifecycle pages do not.",
    sections: [
      section(
        "OpenAI",
        [
          "A short slug can be moved to a new snapshot. The changelog records those moves. chat-latest points at the latest Instant model used in ChatGPT, and that page says the underlying snapshot is regularly updated. The July 9, 2026 changelog entry says the gpt-5.6 alias routes requests to gpt-5.6-sol.",
          "The previous snapshot keeps its dated id. Pin that id when you need the version you tested.",
        ],
        [
          { label: "Chat Latest", url: OPENAI_CHAT_LATEST },
          { label: "OpenAI changelog", url: OPENAI_CHANGELOG },
          { label: "GPT-5.6 Sol model page", url: OPENAI_SOL },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "Anthropic",
        [
          "Before the 4.6 generation, the Claude API accepts a shorter alias such as claude-sonnet-4-5. That alias points at the most recent dated snapshot for that minor version. A 4.6-generation id is the snapshot itself. Anthropic does not update the weights of an existing model ID.",
          "The pinned-ID guarantee does not cover those convenience aliases.",
        ],
        [{ label: "Claude model IDs and versioning", url: CLAUDE_IDS }],
        GLOSSARY_EARLIER,
      ),
      section(
        "Gemini API",
        [
          "The Gemini models page splits names into stable, preview, latest, and experimental. A latest name, such as gemini-flash-latest, is an alias that is hot-swapped on every new release of that variation. Breaking changes get two weeks of email before the version behind latest changes.",
          "Firebase's model list calls gemini-2.0-flash an auto-updated alias. That page also says not to use -latest aliases, because they hot-swap and only breaking changes get the two-week email.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Firebase AI Logic models", url: FIREBASE_MODELS },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "Azure OpenAI, Vertex AI, and Amazon Bedrock",
        [
          "Azure does not use the word alias for this. A deployment has a version and a versionUpgradeOption. OnceNewDefaultVersionAvailable moves the deployment to the new default. NoAutoUpgrade does not move. That is an upgrade setting on the deployment, not a floating model name.",
          "The Vertex model versions page read on October 22, 2026 lists a model id and a retirement date. It does not describe a latest alias. Bedrock's lifecycle pages do not describe a short alias that is later pointed at a new snapshot. InvokeModel takes a model id or an inference profile id.",
        ],
        [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Aliases vs pinned snapshots" },
      { href: "/glossary/pinned-version/", label: "Pinned version" },
      { href: "/glossary/auto-upgrade/", label: "Auto-upgrade" },
    ],
    seeAlso: ["model-snapshot", "pinned-version", "auto-upgrade", "preview-model"],
    citations: cite(OPENAI_CHAT_LATEST, OPENAI_CHANGELOG, OPENAI_SOL, CLAUDE_IDS, GEMINI_MODELS, FIREBASE_MODELS, AZURE_WORKING, VERTEX_VERSIONS, BEDROCK_LIFECYCLE),
    exampleGroups: [
      {
        caption: "Dataset rows whose ids are short names, latest names, or the dated ids those names are compared with.",
        spec: {
          kind: "ids",
          ids: [
            { provider: "openai", id: "gpt-4o" },
            { provider: "openai", id: "gpt-4o-2024-05-13" },
            { provider: "openai", id: "chatgpt-image-latest" },
            { provider: "anthropic", id: "claude-sonnet-4-6" },
            { provider: "google-gemini-api", id: "gemini-2.0-flash" },
            { provider: "azure-openai", id: "gpt-chat-latest" },
            { provider: "azure-openai", id: "gpt-chat-latest-2026-10-07" },
          ],
        },
      },
    ],
  },
  {
    slug: "pinned-version",
    name: "Pinned version",
    alternateNames: ["pinned model id"],
    title: "What a pinned model version is | SunsetDiff",
    description: "A pinned version stays on one snapshot until you change it or that id is retired. How OpenAI, Claude, Gemini, and Azure say to pin.",
    h1: "Pinned version",
    definition:
      "A pinned version is a model id that stays on one snapshot until you change it or that id is retired. Put the dated id, or the Azure deployment version you selected, in production after you test it.",
    sections: [
      section(
        "OpenAI and Anthropic",
        [
          "OpenAI says the way to keep prompting and output consistent is to use a pinned model version and to run evals. The dated snapshot id is that pin. A short alias can move.",
          "Anthropic says each Claude model ID is a pinned version for the life of that ID. Convenience aliases on earlier models are outside that guarantee. A 4.6-generation id is the snapshot.",
        ],
        [
          { label: "OpenAI API backwards compatibility", url: OPENAI_COMPAT },
          { label: "Claude model IDs and versioning", url: CLAUDE_IDS },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "Gemini, Azure, and Bedrock",
        [
          "A Gemini stable name points at one stable model and usually does not change. A latest name is not a pin. It is hot-swapped.",
          "On Azure, a deployment with a specific version stays on that version until you change it or until retirement. NoAutoUpgrade does not move the deployment. At retirement that deployment stops working. OnceNewDefaultVersionAvailable and OnceCurrentVersionExpired move it.",
          "Bedrock's lifecycle pages do not describe a floating alias. The model id you send is the id that is retired on the EOL date for the Regions on that row.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Aliases vs pinned snapshots" },
      { href: "/glossary/model-snapshot/", label: "Model snapshot" },
      { href: "/glossary/auto-upgrade/", label: "Auto-upgrade" },
    ],
    seeAlso: ["model-snapshot", "model-alias", "auto-upgrade"],
    citations: cite(OPENAI_COMPAT, CLAUDE_IDS, GEMINI_MODELS, AZURE_WORKING, AZURE_RETIREMENTS, BEDROCK_LIFECYCLE),
    exampleGroups: [
      {
        caption: "Dated ids in the dataset. These are the pins. The short ids are listed on the alias page.",
        spec: {
          kind: "ids",
          ids: [
            { provider: "openai", id: "gpt-4o-2024-05-13" },
            { provider: "anthropic", id: "claude-sonnet-4-5-20250929" },
            { provider: "anthropic", id: "claude-sonnet-4-6" },
            { provider: "azure-openai", id: "gpt-4o-2024-05-13" },
          ],
        },
      },
    ],
  },
  {
    slug: "preview-model",
    name: "Preview model",
    alternateNames: ["experimental model"],
    title: "What a preview or experimental model is | SunsetDiff",
    description: "A preview model can be retired on a short notice. OpenAI uses the word preview in the id. Gemini also separates experimental names, which are not stable.",
    h1: "Preview model",
    definition:
      "A preview model is a pre-release id with a shorter life than a generally available model. OpenAI identifies them by the word preview in the name, and Gemini experimental names are a separate label for models that are not stable.",
    sections: [
      section(
        "OpenAI",
        [
          "Preview models, identified by preview in the model name, may be retired with much shorter notice, such as 2 weeks. The deprecations page names computer-use-preview and gpt-4o-audio-preview as examples. OpenAI does not recommend them for business-critical production unless you can migrate on short notice.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API",
        [
          "The models page, in the naming note dated September 2025, splits names into stable, preview, latest, and experimental. That note was read for the SunsetDiff guides on October 20, 2026. A preview name can be used in production and is deprecated with at least two weeks of notice. Experimental names are not stable, and the endpoint can change.",
          "The deprecations page, read October 22, 2026, lists preview models in their own rows, with a release date and a shutdown date when one has been announced.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Azure OpenAI",
        [
          "Azure labels preview models as Preview in the catalog and says they are not guaranteed to become generally available. They launch with a not-sooner-than retirement date, often about 90 days out, and that window is sometimes extended. When a retirement decision is made, customers are force-upgraded to a replacement or the model is retired with no replacement. You cannot stay on a retiring preview model.",
          "Preview retirement notice is at least 30 days. Preview deployments can be auto-upgraded to the replacement when a replacement exists and the API contract allows it.",
        ],
        [{ label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic, Vertex AI, and Amazon Bedrock",
        [
          "Anthropic's deprecations page has used a preview id, such as claude-mythos-preview, in the status table. The page does not publish a separate preview notice period the way OpenAI does. Read that row's retirement cell.",
          "The Vertex and Bedrock lifecycle pages read on October 22, 2026 do not define a preview tier with its own notice period. Use the retirement or EOL date on the row you call.",
        ],
        [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/glossary/notice-period/", label: "Notice period" },
      { href: "/deprecated/", label: "Deprecated models" },
      { href: "/guides/how-much-notice-before-an-ai-model-shuts-down/", label: "How much notice you get" },
    ],
    seeAlso: ["notice-period", "deprecated", "model-alias"],
    citations: cite(OPENAI_DEPRECATIONS, GEMINI_MODELS, GEMINI_DEPRECATIONS, AZURE_RETIREMENTS, CLAUDE_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE),
    exampleGroups: [
      { caption: "Dataset rows whose model id contains preview. The stored status is whatever the provider page said on the last check.", spec: { kind: "preview" } },
    ],
  },
  {
    slug: "auto-upgrade",
    name: "Auto-upgrade",
    alternateNames: ["automatic upgrade"],
    title: "What an auto-upgrade is | SunsetDiff",
    description: "An auto-upgrade moves an Azure deployment onto a newer model version. Provisioned deployments are not auto-upgraded. A Gemini latest alias is a different swap.",
    h1: "Auto-upgrade",
    definition:
      "An auto-upgrade is the host moving your deployment onto a newer model version without you changing the model string. Azure documents this for Standard deployment types, provisioned deployments are excluded, and a Gemini latest alias is a different swap.",
    sections: [
      section(
        "Azure OpenAI",
        [
          "For Global Standard, Data Zone Standard, and Standard deployments, Microsoft manages automatic upgrades when a model version is retired. Upgrades are scheduled region by region. The schedule is the model retirement schedule.",
          "versionUpgradeOption has three values. OnceNewDefaultVersionAvailable upgrades when a new default is set. OnceCurrentVersionExpired upgrades only at retirement. NoAutoUpgrade never auto-upgrades, and the deployment stops working at retirement. The working-with-models page says null means OnceCurrentVersionExpired. Automatic updates are documented for Standard deployment types.",
          "Provisioned deployments are not auto-upgraded. You migrate them yourself. The lifecycle page offers an in-place migration, with Azure moving traffic over a 20 to 30 minute window, or a side-by-side migration where you create a second deployment.",
          "The lifecycle page, checked October 22, 2026, uses gpt-4o version 2024-05-13 as the example: on the Standard SKU it retires on 2026-12-09 and the service upgrades it to gpt-5.6-sol where that version is available. The same page says to recheck the retirement schedule, because the date and the replacement can change.",
        ],
        [
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API",
        [
          "A latest alias is hot-swapped on every new release of that variation. Breaking changes get two weeks of email. That is not an Azure deployment upgrade option. The deprecations page also records some Gemini rows whose endpoint stays up and automatically routes requests to another id, with no shutdown date.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "OpenAI, Anthropic, and Amazon Bedrock",
        [
          "OpenAI moves a short alias by pointing it at a new snapshot. That is a name change on OpenAI's side, not a deployment upgrade setting. Anthropic does not update the weights of an existing model ID. A new model ships under a new ID.",
          "Bedrock says migration will not happen automatically. You change the model id before the EOL date.",
        ],
        [
          { label: "OpenAI changelog", url: OPENAI_CHANGELOG },
          { label: "Claude model IDs and versioning", url: CLAUDE_IDS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/models/azure-openai/gpt-4o-2024-05-13/", label: "Azure gpt-4o 2024-05-13" },
      { href: "/glossary/provisioned-throughput/", label: "Provisioned throughput" },
      { href: "/glossary/model-alias/", label: "Model alias" },
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Aliases vs pinned snapshots" },
    ],
    seeAlso: ["provisioned-throughput", "model-alias", "pinned-version", "migration"],
    citations: cite(AZURE_RETIREMENTS, AZURE_WORKING, AZURE_SCHEDULE, GEMINI_MODELS, GEMINI_DEPRECATIONS, OPENAI_CHANGELOG, CLAUDE_IDS, BEDROCK_LIFECYCLE),
    exampleGroups: [
      {
        caption: "The Azure row named in the lifecycle example, when it is in the dataset.",
        spec: { kind: "ids", ids: [{ provider: "azure-openai", id: "gpt-4o-2024-05-13" }, { provider: "azure-openai", id: "gpt-5.6-sol" }] },
      },
      { caption: "Gemini API rows whose notes say requests are auto-routed, with no shutdown date.", spec: { kind: "auto_routed" }, showNotes: true },
    ],
  },
  {
    slug: "migration",
    name: "Migration",
    alternateNames: ["model migration"],
    title: "What a model migration is | SunsetDiff",
    description: "A migration is the switch from the model id you call to the replacement id, including request fields the new id rejects. Bedrock does not do it for you.",
    h1: "Migration",
    definition:
      "A migration is the change from the model id you call today to the replacement id, including request fields the new id rejects. It is a change you make, unless the host documents an automatic upgrade.",
    sections: [
      section(
        "What the provider pages say",
        [
          "Anthropic says that once a model is deprecated, you migrate all usage to a replacement before the retirement date. Requests past that date fail.",
          "Bedrock says migration will not happen automatically. You update the model id in the application before the EOL date.",
          "Azure Standard deployments can be auto-upgraded. Provisioned deployments are not. You migrate those yourself. OpenAI's deprecations page names a recommended replacement and tells you to move before the shut down date.",
        ],
        [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "On SunsetDiff",
        [
          "A model page records the shutdown date and the official replacement when the provider page printed one. The replacement page and the migration diff record price, context, and request-field changes that were on the cited pages. A blank field was not on those pages.",
        ],
        [{ label: "SunsetDiff models", url: "https://sunsetdiff.com/models/" }],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/migrate/", label: "Migration diffs" },
      { href: "/replace/", label: "Replacements" },
      { href: "/breaking-changes/", label: "Breaking changes" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/swap-a-deprecated-model/", label: "Swap a deprecated model" },
    ],
    seeAlso: ["replacement-model", "breaking-change", "fallback-model", "auto-upgrade"],
    citations: cite(CLAUDE_DEPRECATIONS, BEDROCK_LIFECYCLE, AZURE_RETIREMENTS, OPENAI_DEPRECATIONS, "https://sunsetdiff.com/models/"),
    exampleGroups: [
      { caption: "Dataset rows that name an official replacement. One per provider.", spec: { kind: "replacement" } },
    ],
  },
  {
    slug: "replacement-model",
    name: "Replacement model",
    alternateNames: ["recommended replacement", "substitute model"],
    title: "What a replacement model is | SunsetDiff",
    description: "The model id the provider names as the substitute. SunsetDiff stores it when the official page prints it, and leaves it blank when the page does not.",
    h1: "Replacement model",
    definition:
      "A replacement model is the id the provider names as the substitute for the one that is going away. If the official page does not name one, there is no replacement to invent.",
    sections: [
      section(
        "Where the name is printed",
        [
          "OpenAI's deprecations tables have a recommended replacement column. Anthropic's deprecation announcements name a recommended replacement. The Gemini deprecations table has a recommended replacement column. Vertex has a replacement model id column. Azure's retirement schedule has a replacement column.",
          "Bedrock tells you to move to an Active model. A Bedrock lifecycle row does not always name a single replacement id. When the page does not name one, the SunsetDiff replacement field stays empty.",
        ],
        [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "On SunsetDiff",
        [
          "A replacement with kind official was printed on the provider page linked from the model record. The replacement page compares price, context, and request fields that were published for both ids. Switching can still reject an old field. Those failures are on the breaking changes page.",
        ],
        [{ label: "SunsetDiff replacements", url: "https://sunsetdiff.com/replace/" }],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/replace/", label: "Replacements" },
      { href: "/breaking-changes/", label: "Breaking changes" },
      { href: "/glossary/migration/", label: "Migration" },
    ],
    seeAlso: ["migration", "deprecated", "breaking-change"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, AZURE_SCHEDULE, BEDROCK_LIFECYCLE, "https://sunsetdiff.com/replace/"),
    exampleGroups: [
      { caption: "One row per provider with an official replacement in the dataset.", spec: { kind: "replacement" } },
    ],
  },
  {
    slug: "notice-period",
    name: "Notice period",
    alternateNames: ["deprecation notice"],
    title: "What a model notice period is | SunsetDiff",
    description: "The minimum time a provider says it will give before retirement. It is not the shutdown date. Minimums differ by provider.",
    h1: "Notice period",
    definition:
      "A notice period is the minimum time a provider says it will give before retirement, and it is not the shutdown date. The date on the deprecation table is the day to migrate by.",
    sections: [
      section(
        "OpenAI",
        [
          "Unless safety or compliance needs a faster timeline, OpenAI publishes these minimums before retirement. Generally available models: at least 6 months. Specialized variants of generally available models: at least 3 months. The page's examples include chat variants such as gpt-5.1-chat-latest, Codex variants such as gpt-5.3-codex, and deep research variants such as o3-deep-research. Preview models: much shorter notice, such as 2 weeks.",
          "If safety or compliance requires a sooner retirement, OpenAI says it will give as much notice as reasonably possible.",
        ],
        [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Anthropic",
        [
          "Anthropic notifies customers with active deployments at least 60 days before retirement for publicly released models. Some table rows say not sooner than a date. That is a floor, not a 60 day countdown you can compute on your own.",
        ],
        [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Gemini API and Vertex AI",
        [
          "Gemini preview models are deprecated with at least 2 weeks of notice. A breaking swap of the version behind a latest alias also gets 2 weeks of email. A shutdown date on the deprecations table is the earliest retirement, and the exact day comes with advance notice.",
          "On Vertex, models in the shorter-availability table stay up until a retirement date is announced, and that date gives at least 45 days to migrate. Models in the 12 month table are available for at least 12 months after release. A listed retirement date will not move earlier.",
        ],
        [
          { label: "Gemini API models", url: GEMINI_MODELS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock and Azure OpenAI",
        [
          "For Bedrock models launched on or after September 7, 2026, most have a 6 month Legacy period and some have 45 days. The EOL date is announced when Legacy begins. Models launched before that date stay on Bedrock for at least 12 months before EOL and in Legacy for at least 6 months. GPT-6.1 Sol follows the OpenAI first-party notice rules and has no separate Bedrock minimum.",
          "Azure says generally available retirement notice is at least 60 days, sent to subscription owners with active deployments. Preview retirement notice is at least 30 days. The lifecycle FAQ says retirement dates are not extendable. An emergency retirement for compliance or security can be shorter.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/how-much-notice-before-an-ai-model-shuts-down/", label: "How much notice you get" },
      { href: "/guides/get-notified-before-a-model-shuts-down/", label: "How to get notified" },
      { href: "/upcoming/", label: "Upcoming shutdowns" },
      { href: "/feed.xml", label: "Deprecations feed" },
    ],
    seeAlso: ["shutdown-date", "preview-model", "deprecated"],
    citations: cite(OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_MODELS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, BEDROCK_LEGACY, AZURE_RETIREMENTS),
    exampleGroups: [
      { caption: "Soonest exact shutdown dates in the dataset. The notice period is how early the provider said they would announce the date, not this column.", spec: { kind: "status", status: "deprecated", rank: "soonest" } },
    ],
  },
  {
    slug: "provisioned-throughput",
    name: "Provisioned throughput",
    alternateNames: ["provisioned deployment"],
    title: "What provisioned throughput means when a model retires | SunsetDiff",
    description: "Provisioned throughput is reserved capacity. On Azure those deployments are not auto-upgraded. On Bedrock you cannot create a new one for a Legacy model.",
    h1: "Provisioned throughput",
    definition:
      "Provisioned throughput is reserved capacity for a deployment, as opposed to pay-as-you-go Standard. When a model retires, Azure does not auto-upgrade provisioned deployments, and Bedrock blocks new Provisioned Throughput for a model in Legacy.",
    sections: [
      section(
        "Azure OpenAI",
        [
          "Azure lists Global Provisioned as reserved throughput with global routing, after Global Standard. Data Zone Provisioned keeps processing inside a geographic boundary. Regional Provisioned comes later.",
          "Provisioned deployments are not auto-upgraded. Customers migrate them manually. The lifecycle page describes an in-place migration over a 20 to 30 minute window, or a side-by-side migration with a second deployment. Standard quota is handled on a Standard auto-upgrade. That sentence is about Standard, not provisioned quota.",
        ],
        [{ label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Amazon Bedrock",
        [
          "On the current lifecycle page, you cannot create a new Provisioned Throughput for a model in the Legacy state. If you already customized the model before Legacy, you can keep using an existing Provisioned Throughput endpoint that was created before Legacy. You can also create a new custom model deployment for on-demand inference.",
          "The dataset does not store whether your account uses provisioned capacity. The model row is the lifecycle state, not your deployment type.",
        ],
        [{ label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE }],
        GLOSSARY_CHECKED,
      ),
      section(
        "OpenAI, Anthropic, and Gemini",
        [
          "The OpenAI, Anthropic, and Gemini deprecations pages read for this glossary do not define provisioned throughput. They retire a model id. Azure and Bedrock are the hosts that attach a capacity type to that id.",
        ],
        [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/glossary/auto-upgrade/", label: "Auto-upgrade" },
      { href: "/glossary/legacy-model/", label: "Legacy model" },
      { href: "/models/azure-openai/gpt-4o-2024-05-13/", label: "Azure gpt-4o 2024-05-13" },
    ],
    seeAlso: ["auto-upgrade", "legacy-model", "migration"],
    citations: cite(AZURE_RETIREMENTS, BEDROCK_LIFECYCLE, OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS, GEMINI_DEPRECATIONS),
    exampleGroups: [{ caption: "The dataset has no deployment-type field. These are the model rows the provider pages use as lifecycle examples.", spec: { kind: "ids", ids: [{ provider: "azure-openai", id: "gpt-4o-2024-05-13" }] } }],
  },
  {
    slug: "regional-availability",
    name: "Regional availability",
    alternateNames: ["region-specific retirement"],
    title: "What regional availability means for a model shutdown | SunsetDiff",
    description: "The same model can be active in one region and end of life in another. Bedrock prints the regions on the lifecycle row.",
    h1: "Regional availability",
    definition:
      "Regional availability means the same model id can be active in one region and legacy or end of life in another. The date on the first-party API page does not move the date on Azure, Bedrock, or Vertex.",
    sections: [
      section(
        "Amazon Bedrock",
        [
          "The legacy lifecycle page says model lifecycle state can differ by AWS Region. The Regions column lists only the Regions covered by the announced EOL date. A model can remain Active in other Regions. A missing Region on a row is not a promise about that Region.",
          "Bedrock dates are specific to Bedrock and may differ from the dates the model provider publishes. For a Bedrock call, only the Bedrock dates apply.",
        ],
        [{ label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY }, { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE }],
        GLOSSARY_CHECKED,
      ),
      section(
        "Azure, Vertex, and the first-party APIs",
        [
          "Anthropic says its dates apply to the Claude API, Claude Platform on AWS, and Microsoft Foundry. Amazon Bedrock and Google Cloud set their own retirement schedules, so status and dates can differ.",
          "Azure publishes a separate retirement schedule for Foundry Models sold by Azure. A model version can retire on a different day than the same id on the OpenAI API. Vertex retirement dates are on the model versions page, not on the Gemini API deprecations page.",
          "Azure also orders deployment types by how widely they are available: Global Standard, then Global Provisioned, then Data Zone, then regional Standard and Provisioned. Older models lose the regional deployment types as they retire. That availability order is not the same fact as a Bedrock per-region EOL row.",
        ],
        [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Azure retirement schedule", url: AZURE_SCHEDULE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ" },
      { href: "/glossary/shutdown-date/", label: "Shutdown date" },
      { href: "/models/google-gemini-api/gemini-2-5-pro/", label: "Gemini API gemini-2.5-pro" },
      { href: "/models/google-vertex/gemini-2-5-pro/", label: "Vertex gemini-2.5-pro" },
    ],
    seeAlso: ["shutdown-date", "end-of-life", "provisioned-throughput"],
    citations: cite(BEDROCK_LEGACY, BEDROCK_LIFECYCLE, CLAUDE_DEPRECATIONS, AZURE_SCHEDULE, AZURE_RETIREMENTS, VERTEX_VERSIONS, GEMINI_DEPRECATIONS),
    exampleGroups: [
      {
        caption: "The same model id on two hosts. Read each row's shutdown cell. Do not copy one date onto the other.",
        spec: {
          kind: "ids",
          ids: [
            { provider: "openai", id: "gpt-4o-2024-05-13" },
            { provider: "azure-openai", id: "gpt-4o-2024-05-13" },
            { provider: "anthropic", id: "claude-sonnet-4-5-20250929" },
            { provider: "aws-bedrock", id: "anthropic.claude-sonnet-4-5-20250929-v1:0" },
            { provider: "google-gemini-api", id: "gemini-2.5-pro" },
            { provider: "google-vertex", id: "gemini-2.5-pro" },
          ],
        },
        showNotes: true,
      },
      { caption: "A Bedrock row whose note lists Regions.", spec: { kind: "region" }, showNotes: true },
    ],
  },
  {
    slug: "api-version-header",
    name: "API version header",
    alternateNames: ["anthropic-version"],
    title: "What an API version header is | SunsetDiff",
    description: "anthropic-version selects the Claude request contract. Version 2026-10-21 rejects temperature, top_p, and top_k. That is not a shutdown.",
    h1: "API version header",
    definition:
      "An API version header tells the provider which request contract to apply. On the Claude API the header is anthropic-version, and changing it can reject fields on a model that is still available.",
    sections: [
      section(
        "Anthropic",
        [
          "If you call the Claude API without an SDK, you set the anthropic-version header. The versioning page still lists 2023-06-01 and does not call that version deprecated. API version 2026-10-21 returns HTTP 400 for temperature, top_p, and top_k on every model, even at the default value.",
          "The versioning page says 2026-10-21 is available on the Claude API, Claude Platform on AWS, Microsoft Foundry, and Google Cloud. On Amazon Bedrock it is available for Claude 4.7 and later models. For other models on Bedrock, the page points to the migration guide.",
          "The first SDK and CLI versions that send 2026-10-21 are named on the migration guide and on the SunsetDiff error page linked below.",
        ],
        [
          { label: "Claude API versioning", url: CLAUDE_VERSIONING },
          { label: "Claude API migration 2026-10-21", url: CLAUDE_MIGRATION_2026 },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "OpenAI, Gemini, Vertex, Bedrock, and Azure",
        [
          "The OpenAI, Gemini, Vertex, and Bedrock retirement pages read for this glossary do not define an anthropic-version header. Bedrock's exception is the Claude availability sentence above.",
          "Azure model retirement is a deployment and a model version, which is a dated model such as gpt-4o 2024-05-13. That version is not the anthropic-version header.",
        ],
        [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Vertex model versions", url: VERTEX_VERSIONS },
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/errors/claude-api-2026-10-21-sampling-params-400/", label: "Claude API version 2026-10-21 sampling error" },
      { href: "/breaking-changes/", label: "Breaking changes" },
      { href: "/glossary/breaking-change/", label: "Breaking change" },
    ],
    seeAlso: ["breaking-change", "migration"],
    citations: cite(CLAUDE_VERSIONING, CLAUDE_MIGRATION_2026, OPENAI_DEPRECATIONS, GEMINI_DEPRECATIONS, VERTEX_VERSIONS, BEDROCK_LIFECYCLE, AZURE_RETIREMENTS),
    exampleGroups: [
      {
        caption: "This term is a request header, not a model status. The error page names the models and the API version.",
        spec: { kind: "none" },
      },
    ],
  },
  {
    slug: "breaking-change",
    name: "Breaking change",
    alternateNames: ["request breaking change"],
    title: "What a breaking change is when you switch models | SunsetDiff",
    description: "A request setting or endpoint that fails after you change the model id, or after you move to a new API version. The model can still be up.",
    h1: "Breaking change",
    definition:
      "A breaking change is a request setting or endpoint that fails after you switch model ids or move to a new API version. The new model can still be up, and the old field is what fails.",
    sections: [
      section(
        "How this differs from a shutdown",
        [
          "A shutdown means the old id is no longer served. A breaking change means the call reached a model, or a new API version, and a field or endpoint from the old request was rejected.",
          "SunsetDiff keeps those rules on the breaking changes page: the old setting, the models or the API version, what the source says happens, the fix, and the source URL. An error sentence is quoted only when the linked source prints it.",
        ],
        [
          { label: "SunsetDiff breaking changes", url: "https://sunsetdiff.com/breaking-changes/" },
          { label: "Claude API migration 2026-10-21", url: CLAUDE_MIGRATION_2026 },
        ],
        GLOSSARY_CHECKED,
      ),
      section(
        "Examples the provider pages name",
        [
          "Claude API version 2026-10-21 rejects temperature, top_p, and top_k on every model. claude-sonnet-5-5 also rejects a non-default temperature on its own, which is a model rule, not the API version rule.",
          "OpenAI's Chat Completions reference says max_tokens is deprecated in favor of max_completion_tokens and is not compatible with o-series models. That is a field change, not the shut down of the model id.",
        ],
        [
          { label: "Claude API migration 2026-10-21", url: CLAUDE_MIGRATION_2026 },
          { label: "OpenAI Chat Completions", url: "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/" },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/breaking-changes/", label: "All breaking changes" },
      { href: "/errors/", label: "Request errors" },
      { href: "/errors/claude-temperature-is-deprecated-for-this-model/", label: "temperature is deprecated for this model" },
      { href: "/glossary/api-version-header/", label: "API version header" },
    ],
    seeAlso: ["api-version-header", "migration", "replacement-model"],
    citations: cite(
      "https://sunsetdiff.com/breaking-changes/",
      CLAUDE_MIGRATION_2026,
      "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/",
    ),
    exampleGroups: [{ caption: "The rules are on the breaking changes page, not a status column.", spec: { kind: "none" } }],
  },
  {
    slug: "fallback-model",
    name: "Fallback model",
    alternateNames: ["model fallback"],
    title: "What a fallback model is | SunsetDiff",
    description: "A second model id a client tries when the first call errors. LiteLLM and OpenRouter document it. Providers do not switch you over.",
    h1: "Fallback model",
    definition:
      "A fallback model is a second id a client tries when the first call returns an error. LiteLLM and OpenRouter document that list, and provider deprecation pages do not switch your request to the replacement.",
    sections: [
      section(
        "Libraries that document a fallback list",
        [
          "LiteLLM tries the model argument first, then each entry in fallbacks, in order. The first success is returned. If every entry fails, completion raises.",
          "OpenRouter's models array is tried in order when the first model returns an error. Errors that trigger a fallback include context length, moderation, rate limits, and downtime. The response model field is the id that actually ran.",
          "The Vercel AI SDK OpenAI guide and LangChain's ChatOpenAI page document the model string. They do not document a fallback list. LangChain's chat integrations page says routers such as OpenRouter and LiteLLM offer automatic fallbacks.",
        ],
        [
          { label: "LiteLLM reliable completions", url: LITELLM_FALLBACKS },
          { label: "OpenRouter model fallbacks", url: OPENROUTER_FALLBACKS },
        ],
        GLOSSARY_EARLIER,
      ),
      section(
        "What the providers do instead",
        [
          "Bedrock says migration will not happen automatically. You change the model id before the EOL date.",
          "Azure can auto-upgrade a Standard deployment onto a newer model version. That is an upgrade of the deployment, not a client fallback list, and it does not apply to provisioned deployments.",
          "OpenAI, Anthropic, and Gemini name a replacement on the deprecation page. Your request still sends one model id unless your own client tries a second id.",
        ],
        [
          { label: "Bedrock model lifecycle", url: BEDROCK_LIFECYCLE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
        ],
        GLOSSARY_CHECKED,
      ),
    ],
    related: [
      { href: "/guides/swap-a-deprecated-model/", label: "Swap a deprecated model" },
      { href: "/replace/", label: "Replacements" },
      { href: "/glossary/migration/", label: "Migration" },
      { href: "/glossary/auto-upgrade/", label: "Auto-upgrade" },
    ],
    seeAlso: ["migration", "replacement-model", "auto-upgrade"],
    citations: cite(LITELLM_FALLBACKS, OPENROUTER_FALLBACKS, BEDROCK_LIFECYCLE, AZURE_RETIREMENTS, OPENAI_DEPRECATIONS, CLAUDE_DEPRECATIONS),
    exampleGroups: [
      { caption: "Official replacements in the dataset. A fallback list is something you configure. These ids are the ones the provider named.", spec: { kind: "replacement" } },
    ],
  },
];

export function glossaryExamples(spec: ExampleSpec, models: ModelRecord[]): ModelRecord[] {
  if (spec.kind === "none") return [];
  if (spec.kind === "ids") {
    return spec.ids.flatMap((pair) => models.filter((model) => model.provider === pair.provider && model.id === pair.id));
  }
  if (spec.kind === "preview") return onePerProvider(models, (model) => /preview/i.test(model.id), "latest");
  if (spec.kind === "not_before") return onePerProvider(models, (model) => model.shutdown_date_kind === "not_before", "soonest");
  if (spec.kind === "region") {
    return onePerProvider(
      models,
      (model) => model.provider === "aws-bedrock" && Boolean(model.region_or_platform_notes),
      "soonest",
    );
  }
  if (spec.kind === "auto_routed") {
    return models
      .filter((model) => /auto-routed/i.test(model.region_or_platform_notes ?? ""))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  if (spec.kind === "replacement") {
    return onePerProvider(models, (model) => model.replacements.some((item) => item.kind === "official"), "soonest");
  }
  if (spec.kind === "status") {
    const match = (model: ModelRecord) => model.status === spec.status;
    if (spec.provider) return oneProvider(models, spec.provider, match, spec.rank);
    return onePerProvider(models, match, spec.rank);
  }
  return [];
}

function onePerProvider(
  models: ModelRecord[],
  predicate: (model: ModelRecord) => boolean,
  rank: "soonest" | "latest",
): ModelRecord[] {
  const picked: ModelRecord[] = [];
  for (const provider of EXAMPLE_PROVIDERS) {
    picked.push(...oneProvider(models, provider, predicate, rank));
  }
  return picked;
}

function oneProvider(
  models: ModelRecord[],
  provider: ModelRecord["provider"],
  predicate: (model: ModelRecord) => boolean,
  rank: "soonest" | "latest",
): ModelRecord[] {
  const rows = models.filter((model) => model.provider === provider && predicate(model));
  const chosen = rank === "soonest" ? soonest(rows) : latest(rows);
  return chosen ? [chosen] : [];
}

function soonest(rows: ModelRecord[]): ModelRecord | undefined {
  return [...rows].sort((a, b) => dateKey(a).localeCompare(dateKey(b)) || a.id.localeCompare(b.id))[0];
}

function latest(rows: ModelRecord[]): ModelRecord | undefined {
  return [...rows].sort((a, b) => dateKey(b).localeCompare(dateKey(a)) || a.id.localeCompare(b.id))[0];
}

function dateKey(model: ModelRecord): string {
  if (!model.shutdown_date || model.shutdown_date_kind === "none" || model.shutdown_date_kind === "not_before") return "9999-99-99";
  return model.shutdown_date;
}

export function glossaryDatasetNote(term: GlossaryTerm, models: ModelRecord[]): string {
  const counts = (status: ModelRecord["status"]) => models.filter((model) => model.status === status).length;
  const providerCount = (provider: ModelRecord["provider"], status: ModelRecord["status"]) =>
    models.filter((model) => model.provider === provider && model.status === status).length;
  if (term.slug === "deprecated") {
    return `This dataset has ${counts("deprecated")} records with status deprecated. OpenAI records in that status: ${providerCount("openai", "deprecated")}. Amazon Bedrock records in that status: ${providerCount("aws-bedrock", "deprecated")}. The full list is on the deprecated page.`;
  }
  if (term.slug === "retired") {
    return `This dataset has ${counts("retired")} records with status retired. The full list is on the retired page.`;
  }
  if (term.slug === "legacy-model") {
    return `This dataset has ${counts("legacy")} records with status legacy. OpenAI records in that status: ${providerCount("openai", "legacy")}. Anthropic records in that status: ${providerCount("anthropic", "legacy")}. Amazon Bedrock records in that status: ${providerCount("aws-bedrock", "legacy")}. Azure OpenAI records in that status: ${providerCount("azure-openai", "legacy")}.`;
  }
  if (term.slug === "shutdown-date") {
    const floors = models.filter((model) => model.shutdown_date_kind === "not_before").length;
    const exact = models.filter((model) => model.shutdown_date_kind === "exact" && model.shutdown_date).length;
    return `This dataset has ${exact} records with an exact shutdown date and ${floors} records whose date is only a floor.`;
  }
  return "The rows below are copied from this site's model records. A shutdown cell is the date stored for that provider, not a date copied from another host.";
}
