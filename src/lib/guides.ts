import type { ModelRecord } from "../schema.ts";
import { aliasSnapshotView } from "./aliases.ts";
import {
  DECEMBER_11_GUIDE_SLUG,
  datasetShutdownGuides,
  isDecember11OpenAiShutdown,
  isJanuary2027Gpt4Shutdown,
  JANUARY_2027_GPT4_GUIDE_SLUG,
} from "./dataset-guides.ts";
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
const OPENAI_MIGRATE = "https://developers.openai.com/api/docs/guides/migrate-to-responses";
const OPENAI_REASONING = "https://developers.openai.com/api/docs/guides/reasoning";
const OPENAI_SOL_61 = "https://developers.openai.com/api/docs/models/gpt-6.1-sol";
const OPENAI_ASTRA = "https://developers.openai.com/api/docs/models/gpt-6-astra";
const OPENAI_LUNA = "https://developers.openai.com/api/docs/models/gpt-6-luna";
const LITELLM_OPENAI = "https://docs.litellm.ai/docs/providers/openai";
const LANGCHAIN_OPENAI = "https://docs.langchain.com/oss/python/integrations/chat/openai";
const PIPECAT_CHAT = "https://docs.pipecat.ai/api-reference/server/services/llm/openai";
const PIPECAT_RESPONSES = "https://docs.pipecat.ai/api-reference/server/services/llm/openai-responses";
const ISSUE_SOL_TOOLS = "https://github.com/langflow-ai/openrag/issues/2534";
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
const OPENAI_CUSTOM_GPT_FAQ = "https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq";
const OPENAI_CUSTOM_GPT_MIGRATE = "https://learn.chatgpt.com/docs/migrate-custom-gpts";
const OPENAI_CUSTOM_GPT_MCP = "https://learn.chatgpt.com/docs/extend/mcp";
const OPENAI_GPT6 = "https://developers.openai.com/api/docs/guides/latest-model";
const DEEPSEEK_UPDATES = "https://api-docs.deepseek.com/updates/";
const DEEPSEEK_NEWS = "https://api-docs.deepseek.com/";
const DEEPSEEK_V4 = "https://deepseek.com/en/news/v4-preview/";
const ISSUE_TEMPERATURE = "https://github.com/neondatabase/neon-pkgs/issues/937";
const ISSUE_NANO_SHUTDOWN = "https://github.com/maxswaine/game-repository/issues/110";
const ISSUE_DEEPSEEK = "https://github.com/aaif-goose/goose/issues/13114";
const ISSUE_GEMINI_25 = "https://github.com/LebgaaAbderrahmane/ecomAssistant/issues/92";
const CODEX_MODELS = "https://developers.openai.com/codex/models";
const CODEX_MODELS_GPT55 = "https://developers.openai.com/codex/models#gpt-55-retirement";
const CODEX_CHANGELOG_OCT14 = "https://developers.openai.com/codex/changelog#codex-2026-10-14-gpt-55-retirement";
const CODEX_CHANGELOG_SEP14 = "https://developers.openai.com/codex/changelog#codex-2026-09-14-gpt-55-retirement";
const OPENAI_ERRORS = "https://developers.openai.com/api/docs/guides/error-codes";
const CLAUDE_ERRORS = "https://platform.claude.com/docs/en/api/errors";
const GROQ_DEPRECATIONS = "https://console.groq.com/docs/deprecations";
const GROQ_ERRORS = "https://console.groq.com/docs/errors";
const OPENROUTER_ERRORS = "https://openrouter.ai/docs/api_reference/errors-and-debugging";
const OPENROUTER_MODELS = "https://openrouter.ai/docs/guides/overview/models";
const OPENROUTER_VARIANTS = "https://openrouter.ai/docs/guides/routing/model-variants/overview";
const ISSUE_DIGITAL_TWIN_OUTAGE = "https://github.com/AlejandroFuentePinero/digital-twin/issues/54";
const ISSUE_DIGITAL_TWIN_PROBE = "https://github.com/AlejandroFuentePinero/digital-twin/issues/57";
const ISSUE_JOANIES = "https://github.com/bobmatnyc/joanies-kitchen/issues/24";
const ISSUE_RUMAQ = "https://github.com/ahaqqu/RumaQ/issues/306";
const ISSUE_JUICE = "https://github.com/Ghigog/Juice/issues/421";

export interface GuideSource {
  label: string;
  url: string;
}

export interface GuideCode {
  caption: string;
  code: string;
}

export interface GuideTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  table?: GuideTable;
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
  /** Day this guide's sources were read. Other guides keep GUIDES_CHECKED. */
  checked?: string;
}

export function guidePath(slug: string): string {
  return `/guides/${slug}/`;
}

export function guideChecked(guide: Pick<GuidePage, "checked">): string {
  return guide.checked ?? GUIDES_CHECKED;
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

const guidePages: GuidePage[] = [
  {
    slug: "custom-gpt-retirement",
    title: "Custom GPT retirement | SunsetDiff",
    description:
      "Custom GPTs retire on December 11, 2026. What OpenAI copies into a plugin, what it leaves behind, and what to save before that date.",
    h1: "Custom GPT retirement",
    summary: "When custom GPTs stop, what migration copies, and what you have to rebuild.",
    answer:
      "OpenAI's help center says custom GPTs retire on December 11, 2026. An Enterprise workspace with a qualified, approved deferral retires them on February 11, 2027. Migration turns the instructions into a skill and copies the knowledge files. The selected model, sharing settings, and custom actions do not carry over, and the new plugin starts private. This is a ChatGPT product change, not an API model shutdown.",
    checked: "2026-10-24",
    steps: [
      {
        name: "Sort creators from users",
        text: "List the GPTs you created. You can migrate those. A GPT you only use has to be migrated by its creator, or by a workspace admin in Enterprise. Permission to use it is not permission to migrate it.",
      },
      {
        name: "Save the text and the files",
        text: "Keep your own copy of the instructions, the knowledge files, and the conversation starters. Record who can open the GPT. The migration guide says conversation starters do not transfer one-to-one.",
      },
      {
        name: "Save action schemas",
        text: "If the GPT has custom actions, save the action schema, the authentication method, and the connection settings that are not secrets. Do that from the Actions section before you migrate. Leave credentials and secrets out of any notes you paste into chat.",
      },
      {
        name: "Publish, then migrate",
        text: "Migration uses the latest published version. Drafts do not transfer. Publishing does not require a public share. The help center says creation of new custom GPTs is planned to end on October 26, 2026, so publish a draft you still need before that cutoff.",
      },
      {
        name: "Test, then share",
        text: "When My GPTs shows Migrate to plugin, run it and read the new skill and files. Test familiar prompts and one harder case. The plugin starts private. Share it yourself, then ask one intended user to install it.",
      },
    ],
    sections: [
      {
        heading: "Key dates",
        paragraphs: [
          "The help center says the transition affects all ChatGPT plans. The timeline is the one for the account or workspace where the GPT was created, even if you open that GPT from another account. A public GPT created in an affected Enterprise workspace follows that Enterprise timeline.",
          "The same page says these dates are subject to change. A target date does not mean every account can migrate that day. Standard admin emails use the standard dates and are not tailored to a workspace with an approved delay.",
          "The migration guide describes the same retirement and says you can still migrate a GPT after it stops running. It does not list the calendar dates. The dates in the table are from the help center.",
        ],
        table: {
          caption: "Dates listed on OpenAI's custom GPT retirement FAQ.",
          headers: ["Date", "What the help center says"],
          rows: [
            ["Sep 11, 2026", "Admin notice for affected Enterprise workspaces, so they can prepare."],
            ["Sep 22, 2026", "Target for the migration experience and the user banner. Not a guarantee for every workspace."],
            ["Oct 1, 2026", "Target banner date for workspaces that already opted into delayed migration banners."],
            ["Oct 26, 2026", "Planned end of creating new custom GPTs. Publish a draft you need to migrate before this. Editing an existing GPT you have not migrated is still allowed. Migration makes that GPT read-only."],
            ["Dec 11, 2026", "Standard retirement. Custom GPTs and their GPT pages become inaccessible."],
            ["Feb 11, 2027", "Retirement only for workspaces with a qualified, approved deferral. It does not apply to every workspace."],
          ],
        },
        sources: [
          { label: "Custom GPT retirement and migration FAQ", url: OPENAI_CUSTOM_GPT_FAQ },
          { label: "Moving custom GPT workflows to plugins", url: OPENAI_CUSTOM_GPT_MIGRATE },
        ],
      },
      {
        heading: "What carries over",
        paragraphs: [
          "The help center describes the planned migration. The instructions become a skill in the new plugin. Knowledge files are copied into the plugin's reference files. Connected apps are added to the plugin as apps. Review the instructions, files, and tools before you rely on the replacement.",
          "The migration guide says to check that files, templates, and examples are present, because transfer and retrieval may differ. The selected model does not carry over. In Enterprise workspaces, Enterprise defaults apply.",
        ],
        table: {
          caption: "What OpenAI says migration copies, and what it does not.",
          headers: ["Item", "What the official pages say"],
          rows: [
            ["Instructions", "Become a skill in the new plugin."],
            ["Knowledge files", "Copied into the plugin's reference files. Review them. Transfer and retrieval may differ."],
            ["Connected apps", "Added to the plugin as apps. Each app still needs its own access, sign-in, and action approval."],
            ["Selected model", "Does not carry over. In Enterprise workspaces, Enterprise defaults apply."],
            ["Sharing settings", "Do not carry over. The plugin starts private. People who could open the GPT do not get the plugin until someone shares it."],
            ["Conversation starters", "Do not transfer one-to-one. The migration guide says they may not copy. Save the prompts you use."],
            ["Previous chats", "The help center says existing conversations stay available after retirement. The migration guide says previous chats may not copy into the plugin."],
            ["Custom actions", "Do not transfer. Rebuild them with a supported app or a custom MCP server, then test. A rebuilt action should not be assumed to do everything the original action did."],
            ["Capability settings", "Do not guarantee the same tools. The migration guide says to retest web search, images, data analysis, and file creation if you need them."],
            ["Drafts", "Do not transfer. Migration uses the latest published version. Unpublished edits stay behind."],
          ],
        },
        sources: [
          { label: "Custom GPT retirement and migration FAQ", url: OPENAI_CUSTOM_GPT_FAQ },
          { label: "Moving custom GPT workflows to plugins", url: OPENAI_CUSTOM_GPT_MIGRATE },
        ],
      },
      {
        heading: "What to save before the deadline",
        paragraphs: [
          "OpenAI does not describe a single export button for a GPT. The pages say what to record yourself, before migration makes the original read-only.",
          "The migration guide tells admins to record each GPT's purpose, audience, instructions, reference files, and integrations, and to save a few familiar prompts plus one harder case. The help center says to finish essential edits before you migrate. Publishing is required for migration. A public share is not.",
          "For actions, OpenAI's MCP page says to save the action schema, the authentication method, and the non-secret connection settings from the GPT editor's Actions section. Keep your own copies of the knowledge files too, then check that the plugin still uses them.",
        ],
        bullets: [
          "Instructions. They become the skill, and you cannot keep editing the original GPT after you migrate it.",
          "Knowledge files. They are copied, and the migration guide says retrieval may differ.",
          "Conversation starters and a few real prompts, including one harder case.",
          "Who can open the GPT today. Sharing settings do not carry over, including in a bulk admin migration.",
          "Action schema, authentication method, and connection settings that are not secrets.",
        ],
        sources: [
          { label: "Custom GPT retirement and migration FAQ", url: OPENAI_CUSTOM_GPT_FAQ },
          { label: "Moving custom GPT workflows to plugins", url: OPENAI_CUSTOM_GPT_MIGRATE },
          { label: "Replacing a GPT custom action", url: OPENAI_CUSTOM_GPT_MCP },
        ],
      },
      {
        heading: "Custom actions",
        paragraphs: [
          "The help center says GPT custom actions do not transfer. Features that depend on them do not work in the plugin until you set up a replacement. Check first whether an available app already does the task. Rebuilding the connection may require a custom MCP server. A rebuilt integration should not be assumed to provide every capability of the original action.",
          "OpenAI's MCP page says to rebuild the connection as a new Sites plugin and to reuse the existing API where you can. That plugin is separate from the migrated plugin. You can use both in one conversation. Sites plugins do not currently support editing skills or reference files. The page also says to leave credentials, secrets, and hidden instructions out of a rebuild prompt.",
          "Built-in migration does not require Upload plugins or Upload plugins with custom MCP servers. Rebuilding an integration is a separate task and may require more permissions. The migration guide says the same: allow extra time, and use a supported connector or a custom MCP connection.",
          "SunsetDiff publishes a remote MCP server for model shutdown dates on the [MCP page](/mcp/). Use it only when the workflow you are rebuilding needs those dates. It does not host a rebuilt GPT action, and it does not replace your API.",
        ],
        sources: [
          { label: "Custom GPT retirement and migration FAQ", url: OPENAI_CUSTOM_GPT_FAQ },
          { label: "Moving custom GPT workflows to plugins", url: OPENAI_CUSTOM_GPT_MIGRATE },
          { label: "Replacing a GPT custom action", url: OPENAI_CUSTOM_GPT_MCP },
        ],
      },
      {
        heading: "After you migrate",
        paragraphs: [
          "The help center says the original GPT stays usable until its retirement date, then becomes inaccessible, along with its GPT page. After migration it is read-only, and its creator cannot delete it. Later changes go on the plugin. You can still edit an existing GPT you have not migrated, including after new GPT creation stops.",
          "The plugin starts private. Migration does not install it for other people and does not give them access. Making a personal plugin public requires a separate plugin submission. In Enterprise, sharing with people or groups requires Share plugins, and publishing to the workspace directory requires Publish plugins to workspace. The migration guide says bulk migration does not copy sharing settings, and that OpenAI expects bulk sharing through the Admin plugin soon.",
          "The help center says existing conversations with custom GPTs remain accessible after retirement. You do not need to do anything to preserve them.",
          "In Enterprise workspaces, the help center says using a migrated GPT without apps in Instant Chat has no incremental cost. Creating and editing plugins through a conversation use Work or Codex. Actions in Work consume credits. The migration guide says converting a GPT to a plugin does not consume credits, and that editing a plugin does under credit-based pricing. It also says USD-billed Enterprise agreements have different terms, including charges for Instant usage. Read the rate card for your workspace.",
        ],
        sources: [
          { label: "Custom GPT retirement and migration FAQ", url: OPENAI_CUSTOM_GPT_FAQ },
          { label: "Moving custom GPT workflows to plugins", url: OPENAI_CUSTOM_GPT_MIGRATE },
        ],
      },
    ],
    related: [
      { href: "/mcp/", label: "SunsetDiff MCP server" },
      { href: "/guides/pre-migration-test-checklist/", label: "API model test checklist" },
    ],
    faqs: [
      {
        question: "When do custom GPTs retire?",
        answer:
          "OpenAI's help center says December 11, 2026. Enterprise workspaces with a qualified, approved deferral retire them on February 11, 2027. That page says the dates are subject to change. Source: [Custom GPT retirement and migration FAQ](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq).",
      },
      {
        question: "Does every Enterprise workspace get the February date?",
        answer:
          "No. The help center says February 11, 2027 applies only to workspaces with a qualified, approved deferral. Other workspaces stay on December 11, 2026. Standard admin emails use the standard dates and are not tailored to an approved delay.",
      },
      {
        question: "What does migration copy?",
        answer:
          "The help center says the instructions become a skill, knowledge files are copied into reference files, and connected apps are added as apps. The plugin starts private. Migration does not install it for other people.",
      },
      {
        question: "What does not carry over?",
        answer:
          "The help center says the selected model and the sharing settings do not carry over, and custom actions do not transfer. The migration guide says conversation starters do not transfer one-to-one, and that capability settings do not guarantee the same tools. Drafts do not transfer.",
      },
      {
        question: "Do I have to migrate a GPT I only use?",
        answer:
          "No. The help center says you do not need to migrate a GPT you only use, and permission to use it does not let you migrate it. In an Enterprise workspace, a workspace admin can migrate it when plugins are enabled and the GPT is published. Check the notice on the GPT and any replacement its creator shares.",
      },
      {
        question: "What happens to old chats?",
        answer:
          "The help center says existing conversations with custom GPTs remain accessible after retirement. You do not need to do anything to preserve them. The migration guide says previous chats may not copy into the plugin.",
      },
      {
        question: "Can I edit the original GPT after I migrate it?",
        answer:
          "No. The help center says the original becomes read-only after migration, and its creator cannot delete it. It stays usable until the retirement date. Later edits go on the plugin.",
      },
      {
        question: "What should developers do with GPT Actions?",
        answer:
          "They do not transfer. OpenAI's MCP page says to rebuild the connection as a new Sites plugin, separate from the migrated plugin, and to save the action schema and the non-secret connection settings first. A supported app is the other option the help center names. The [SunsetDiff MCP server](/mcp/) only answers model shutdown questions. It does not host a rebuilt GPT action.",
      },
      {
        question: "Can I migrate after the retirement date?",
        answer:
          "The migration guide says yes. You can still migrate after retirement, but the GPT itself will no longer run. Source: [Moving custom GPT workflows to plugins](https://learn.chatgpt.com/docs/migrate-custom-gpts).",
      },
      {
        question: "Does migration use credits?",
        answer:
          "The help center says that in Enterprise workspaces, using a migrated GPT without apps in Instant Chat has no incremental cost, and that creating and editing plugins through a conversation use Work or Codex. Actions in Work consume credits. The migration guide says conversion does not consume credits, and that editing a plugin does under credit-based pricing. It also says USD-billed Enterprise agreements can charge for Instant usage. Read your workspace rate card.",
      },
    ],
    citations: [OPENAI_CUSTOM_GPT_FAQ, OPENAI_CUSTOM_GPT_MIGRATE, OPENAI_CUSTOM_GPT_MCP],
  },
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
      "Point the model argument at the replacement id from the provider's deprecation page. LiteLLM and OpenRouter document a fallback list. The Vercel AI SDK OpenAI guide and LangChain's ChatOpenAI page document the model string, not a fallback list. Each library also has a page on [Frameworks](/frameworks/), including Pipecat, n8n, LlamaIndex, and Langflow.",
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
      { href: "/frameworks/", label: "Framework pages" },
      { href: "/frameworks/langchain/", label: "LangChain model id" },
      { href: "/frameworks/litellm/", label: "LiteLLM model id" },
      { href: "/frameworks/vercel-ai-sdk/", label: "Vercel AI SDK model id" },
      { href: "/frameworks/llamaindex/", label: "LlamaIndex model id" },
      { href: "/frameworks/openrouter/", label: "OpenRouter model slug" },
      { href: "/frameworks/pipecat/", label: "Pipecat model id" },
      { href: "/frameworks/n8n/", label: "n8n OpenAI model field" },
      { href: "/frameworks/langflow/", label: "Langflow model name" },
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
        question: "Where are the Pipecat, n8n, LlamaIndex, and Langflow pages?",
        answer:
          "On [Frameworks](/frameworks/). LiteLLM, OpenRouter, the Vercel AI SDK, and LangChain have pages there too. This guide keeps the fallback samples.",
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
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before users do" },
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
  {
    slug: "silent-failures-after-model-shutdown",
    title: "Silent failures after a model shutdown | SunsetDiff",
    description:
      "How a caught model_not_found, HTTP 404, or HTTP 410 leaves a job green with no model output, and how to fail those runs and check shutdown dates.",
    h1: "Silent failures after a model shutdown",
    summary: "A caught shutdown error can finish the job with no model output.",
    answer:
      "A retired model often fails with model_not_found, HTTP 404, or HTTP 410. If the caller catches that error and continues, the job can exit successfully while the model did no work. Fail the run on those signals, alert when a finished run has no output, and read the shutdown date from the SunsetDiff API before the job starts.",
    checked: "2026-10-25",
    steps: [
      {
        name: "Fail on model_not_found, 404, and 410",
        text: "Treat those as a failed run. A later step that expected model text should not run.",
      },
      {
        name: "Alert when a finished run has no output",
        text: "If the handler swallows the error, the process can still exit successfully. Alert when the model text is empty.",
      },
      {
        name: "Read the date before the job",
        text: "Fetch the model row from the SunsetDiff API. shutdown_date is the published date. Open sources[0].url before you migrate.",
      },
    ],
    sections: [
      {
        heading: "A caught error looks like success",
        paragraphs: [
          "GitHub issue maxswaine/game-repository#110 says gpt-4.1-nano shut down on 2026-10-23 and that calls return 404 model_not_found. It says the duplicate judge raises on every call, and the caller catches that error and continues, so every borderline duplicate is accepted without a judgment.",
          "That is the swallow. The exception is handled, and the work that needed the model is skipped. A scheduled job with the same shape can finish with an empty result and a successful exit. Alert on that empty result. The issue itself describes the continue, not a zero-output log line.",
          "A different failure is a live model rejecting an old field. GitHub issue neondatabase/neon-pkgs#937 records this sentence for gpt-6-astra, gpt-6-sol, gpt-6-luna, and gpt-6-1-sol: Unsupported parameter: 'temperature' is not supported with this model. OpenAI's Using GPT-6 guide says to remove temperature when reasoning effort is not none. That is a request error, and it should fail the run too. The page for the sentence is [temperature is not supported with this model](/errors/openai-temperature-is-not-supported-with-this-model/).",
        ],
        sources: [
          { label: "GitHub issue maxswaine/game-repository#110", url: ISSUE_NANO_SHUTDOWN },
          { label: "GitHub issue neondatabase/neon-pkgs#937", url: ISSUE_TEMPERATURE },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
      {
        heading: "Status codes that mean the model did no work",
        paragraphs: [
          "Fail the run when the provider returns one of these. The sentence is quoted only when the linked source prints it.",
        ],
        table: {
          caption: "Signals recorded in a public issue or on an official lifecycle page.",
          headers: ["Signal", "Where it is written", "What SunsetDiff links"],
          rows: [
            [
              "404 model_not_found",
              "[game-repository#110](https://github.com/maxswaine/game-repository/issues/110) for gpt-4.1-nano on 2026-10-23",
              "[The model has been deprecated](/errors/openai-model-has-been-deprecated/)",
            ],
            [
              "Unsupported parameter: 'temperature' is not supported with this model.",
              "[neon-pkgs#937](https://github.com/neondatabase/neon-pkgs/issues/937) for gpt-6-sol, gpt-6-luna, gpt-6-astra, and gpt-6.1-sol",
              "[temperature is not supported with this model](/errors/openai-temperature-is-not-supported-with-this-model/)",
            ],
            [
              "HTTP 404, models/gemini-2.5-flash is no longer available to new users",
              "[ecomAssistant#92](https://github.com/LebgaaAbderrahmane/ecomAssistant/issues/92). Older keys in that report still work.",
              "[gemini-2.5-flash is no longer available to new users](/errors/gemini-2-5-flash-no-longer-available-to-new-users/)",
            ],
            [
              "model_not_found",
              "[goose#13114](https://github.com/aaif-goose/goose/issues/13114) for deepseek-reasoner. DeepSeek's changelog says deepseek-chat and deepseek-reasoner are discontinued on 2026-07-24. The V4 preview note says they are fully retired and inaccessible after Jul 24th, 2026, 15:59 UTC.",
              "[DeepSeek model_not_found](/errors/deepseek-model-not-found/) and [deepseek-reasoner](/models/deepseek/deepseek-reasoner/).",
            ],
            [
              "410 Gone",
              "Azure's lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone.",
              "[Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/)",
            ],
          ],
        },
        sources: [
          { label: "GitHub issue maxswaine/game-repository#110", url: ISSUE_NANO_SHUTDOWN },
          { label: "GitHub issue neondatabase/neon-pkgs#937", url: ISSUE_TEMPERATURE },
          { label: "GitHub issue LebgaaAbderrahmane/ecomAssistant#92", url: ISSUE_GEMINI_25 },
          { label: "GitHub issue aaif-goose/goose#13114", url: ISSUE_DEEPSEEK },
          { label: "DeepSeek API changelog", url: DEEPSEEK_UPDATES },
          { label: "DeepSeek-V4 preview", url: DEEPSEEK_V4 },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
        ],
      },
      {
        heading: "DeepSeek API ids",
        paragraphs: [
          "DeepSeek's API changelog for 2026-04-24 says the legacy names deepseek-chat and deepseek-reasoner will be discontinued on 2026-07-24. During the period before that date they pointed at deepseek-v4-flash non-thinking and thinking. The V4 preview note says deepseek-chat and deepseek-reasoner will be fully retired and inaccessible after Jul 24th, 2026, 15:59 (UTC Time). The current quick start lists deepseek-flash and deepseek-v4-pro.",
          "GitHub issue aaif-goose/goose#13114 says selecting deepseek-reasoner fails with model_not_found, and that DeepSeek retired it on 2026-07-24 together with deepseek-chat. The issue does not print a JSON body. The error page is [DeepSeek model_not_found](/errors/deepseek-model-not-found/). The model rows are [deepseek-chat](/models/deepseek/deepseek-chat/) and [deepseek-reasoner](/models/deepseek/deepseek-reasoner/).",
          "The DeepSeek rows on Amazon Bedrock are separate. deepseek.r1-v1:0, deepseek.v3-v1:0, and deepseek.v3.1 have shutdown date 2027-03-30. Those are not deepseek-chat or deepseek-reasoner.",
        ],
        bullets: [
          "[deepseek-chat](/models/deepseek/deepseek-chat/) and [deepseek-reasoner](/models/deepseek/deepseek-reasoner/): discontinued 2026-07-24.",
          "[DeepSeek-R1 on Bedrock](/models/aws-bedrock/deepseek-r1-v1-0/): shutdown date 2027-03-30.",
          "[deepseek.v3-v1:0](/models/aws-bedrock/deepseek-v3-v1-0/) and [deepseek.v3.1](/models/aws-bedrock/deepseek-v3-1/): shutdown date 2027-03-30.",
        ],
        sources: [
          { label: "DeepSeek API changelog", url: DEEPSEEK_UPDATES },
          { label: "DeepSeek-V4 preview", url: DEEPSEEK_V4 },
          { label: "DeepSeek API quick start", url: DEEPSEEK_NEWS },
          { label: "GitHub issue aaif-goose/goose#13114", url: ISSUE_DEEPSEEK },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Alert when the run has no output",
        paragraphs: [
          "Fail before the rest of the job runs. The status codes in the table are the ones to raise on. An empty model result is the second check: the handler may have caught the error and returned no text.",
          "Gemini is the partial case. ecomAssistant#92 says one key that counts as a new user gets HTTP 404 for gemini-2.5-flash, and older keys still work. A retry on a second key can hide that some calls never ran. Google's deprecations page says 2.5 access is limited to users who have actively used those models, and that the models are not deprecated.",
        ],
        codes: [
          {
            caption: "Fail the run",
            code: `status = response.status_code
body = response.text
if status in (404, 410) or "model_not_found" in body:
    raise RuntimeError(f"model request failed with HTTP {status}")
if not body.strip():
    raise RuntimeError("model request returned no output")
`,
          },
        ],
        sources: [
          { label: "GitHub issue LebgaaAbderrahmane/ecomAssistant#92", url: ISSUE_GEMINI_25 },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
      {
        heading: "Check the date before the job",
        paragraphs: [
          "The files are static. [Check model shutdown dates programmatically](/guides/check-model-shutdown-dates-programmatically/) lists the fields. shutdown_date_kind not_before is a floor, not a deadline. Read sources[0].url before you migrate.",
        ],
        codes: [
          {
            caption: "curl",
            code: `curl -fsSL https://sunsetdiff.com/api/v1/upcoming.json
curl -fsSL https://sunsetdiff.com/api/v1/lookup/gpt-4.1-nano.json
`,
          },
        ],
        sources: [{ label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" }],
      },
    ],
    related: [
      { href: "/errors/", label: "Request errors" },
      { href: "/errors/openai-temperature-is-not-supported-with-this-model/", label: "temperature is not supported with this model" },
      { href: "/errors/gemini-2-5-flash-no-longer-available-to-new-users/", label: "gemini-2.5-flash new-user 404" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure 410 Gone" },
      { href: "/errors/deepseek-model-not-found/", label: "DeepSeek Model Not Exist" },
      { href: "/errors/openai-model-has-been-deprecated/", label: "The model has been deprecated" },
      { href: "/guides/check-model-shutdown-dates-programmatically/", label: "Check dates programmatically" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before users do" },
      { href: "/shutdowns/openai-2026-10-23/", label: "OpenAI October 23, 2026 batch" },
      { href: "/shutdowns/azure-openai-2026-11-19/", label: "Azure OpenAI November 19, 2026 batch" },
    ],
    faqs: [
      {
        question: "Is every shutdown HTTP 404?",
        answer:
          "game-repository#110 records 404 model_not_found for gpt-4.1-nano. Azure's lifecycle page says a retired model returns 410 Gone. OpenAI's deprecations page does not print an HTTP status for shutdown. The sentences SunsetDiff quotes are on the [request error pages](/errors/).",
      },
      {
        question: "Why did one Gemini key work and another return 404?",
        answer:
          "ecomAssistant#92 says a key that counts as a new user gets HTTP 404 for gemini-2.5-flash, and older keys still work. Google's deprecations page says 2.5 access is limited to users who have actively used those models, and that the models are not deprecated.",
      },
      {
        question: "Where is the DeepSeek API retirement in SunsetDiff?",
        answer:
          "The DeepSeek API rows are [deepseek-chat](/models/deepseek/deepseek-chat/) and [deepseek-reasoner](/models/deepseek/deepseek-reasoner/), discontinued on 2026-07-24. The error page is [DeepSeek model_not_found](/errors/deepseek-model-not-found/). The Bedrock DeepSeek ids on this site shut down on 2027-03-30.",
      },
    ],
    citations: [
      ISSUE_NANO_SHUTDOWN,
      ISSUE_TEMPERATURE,
      OPENAI_GPT6,
      ISSUE_GEMINI_25,
      GEMINI_DEPRECATIONS,
      ISSUE_DEEPSEEK,
      DEEPSEEK_UPDATES,
      DEEPSEEK_V4,
      DEEPSEEK_NEWS,
      AZURE_RETIREMENTS,
      BEDROCK_LEGACY,
      "https://sunsetdiff.com/api/",
    ],
  },
  {
    slug: "move-function-calling-to-responses-api",
    title: "Move function calling to the Responses API | SunsetDiff",
    description:
      "How to move OpenAI function tools from Chat Completions to the Responses API: tool shape, tool results, streaming, and the GPT-6 models that reject Chat Completions tools.",
    h1: "Move function calling to the Responses API",
    summary: "Change the endpoint, flatten the tool object, and send results with call_id.",
    answer:
      "GPT-6 Astra and GPT-6.1 Sol require the Responses API for tool calling. Chat Completions still accepts those models for requests that do not call tools. GPT-6 Sol and GPT-6 Luna can keep function tools on Chat Completions only when reasoning_effort is none. The move is three changes: post to /v1/responses, use a flat function tool, and send the tool result as a function_call_output item with the same call_id.",
    checked: "2026-10-25",
    steps: [
      {
        name: "Call responses.create",
        text: "Replace client.chat.completions.create with client.responses.create. Send input instead of messages. Read output_text, or walk response.output, instead of choices[0].message.",
      },
      {
        name: "Flatten the function tool",
        text: "Put name, description, and parameters next to type. Do not nest them under function. If you omit strict, Responses tries strict mode. Set strict to false to keep the old best-effort behavior.",
      },
      {
        name: "Return the tool result with call_id",
        text: "A function call is an output item with type function_call. Send the result back as an input item with type function_call_output and the same call_id. Keep the reasoning items from that turn.",
      },
      {
        name: "Update the stream reader",
        text: "Responses streams typed events. Text arrives on response.output_text.delta. Function arguments arrive on response.function_call_arguments.delta and response.function_call_arguments.done.",
      },
    ],
    sections: [
      {
        heading: "Which models reject Chat Completions tools",
        paragraphs: [
          "The Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but tool calling requires the Responses API. The same guide says GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with reasoning_effort set to none.",
          "The GPT-6.1 Sol model page says to use the Responses API for tool calling, that Chat Completions is supported without tool calling, and that none and minimal are not supported. The reasoning guide says setting reasoning effort to none on GPT-6 Astra returns HTTP 400, and that GPT-6.1 Sol does not support none or minimal and defaults to medium.",
          "GitHub issue langflow-ai/openrag#2534 records this sentence for gpt-6.1-sol: Function tools with reasoning_effort are not supported for gpt-6.1-sol in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'. That second option is not valid for gpt-6.1-sol or gpt-6-astra. It is valid for [gpt-6-luna](/errors/gpt-6-luna-function-tools-reasoning-effort/). The full write-up is [the gpt-6.1-sol error page](/errors/gpt-6-1-sol-function-tools-chat-completions/).",
        ],
        table: {
          caption: "Function tools on Chat Completions, from the Using GPT-6 guide and the model pages.",
          headers: ["Model", "Chat Completions function tools", "reasoning effort none"],
          rows: [
            ["gpt-6-astra", "Not supported. Use /v1/responses.", "Not supported. none returns HTTP 400."],
            ["gpt-6.1-sol", "Not supported. Chat Completions works without tool calling.", "Not supported. minimal is not supported either. Default is medium."],
            ["gpt-6-sol", "Only with reasoning_effort none.", "Supported."],
            ["gpt-6-luna", "Only with reasoning_effort none.", "Supported. Default is medium."],
          ],
        },
        sources: [
          { label: "Using GPT-6", url: OPENAI_GPT6 },
          { label: "GPT-6.1 Sol model page", url: OPENAI_SOL_61 },
          { label: "GPT-6 Astra model page", url: OPENAI_ASTRA },
          { label: "GPT-6 Luna model page", url: OPENAI_LUNA },
          { label: "Reasoning guide", url: OPENAI_REASONING },
          { label: "GitHub issue langflow-ai/openrag#2534", url: ISSUE_SOL_TOOLS },
        ],
      },
      {
        heading: "Request shape",
        paragraphs: [
          "The migration guide says Chat Completions function definitions are externally tagged, and Responses function definitions are internally tagged. In Chat Completions the name sits inside a function object. In Responses, name, description, and parameters sit next to type.",
          "Chat Completions functions are non-strict by default. If you omit strict on Responses, the API tries to make the schema strict. When it cannot, it falls back to non-strict and returns the tool with strict set to false. Set strict to false when you want that behavior on purpose.",
          "Text-only messages can be passed as input. A system message in that list still works for a text call. Tool calls are a different item type, so a tool loop cannot keep using the Chat Completions message array as-is.",
        ],
        table: {
          caption: "Fields the migration guide maps from Chat Completions to Responses.",
          headers: ["Chat Completions", "Responses"],
          rows: [
            ["POST /v1/chat/completions", "POST /v1/responses"],
            ["messages", "input, a string or a list of items"],
            ["tools[].function.name", "tools[].name, next to type function"],
            ["assistant message tool_calls", "output item type function_call"],
            ["tool result message", "input item type function_call_output, with call_id"],
            ["choices[0].message.content", "output_text, or a message item in output"],
            ["response_format", "text.format"],
          ],
        },
        codes: [
          {
            caption: "Before, Python",
            code: `response = client.chat.completions.create(
    model="gpt-6.1-sol",
    messages=[{"role": "user", "content": "What is the weather in Paris?"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the weather for a city.",
            "parameters": {
                "type": "object",
                "properties": {"location": {"type": "string"}},
                "required": ["location"],
            },
        },
    }],
)
`,
          },
          {
            caption: "After, Python",
            code: `response = client.responses.create(
    model="gpt-6.1-sol",
    input=[{"role": "user", "content": "What is the weather in Paris?"}],
    tools=[{
        "type": "function",
        "name": "get_weather",
        "description": "Get the weather for a city.",
        "parameters": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
        },
    }],
)
`,
          },
          {
            caption: "Before, Node",
            code: `const response = await client.chat.completions.create({
  model: "gpt-6.1-sol",
  messages: [{ role: "user", content: "What is the weather in Paris?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the weather for a city.",
      parameters: {
        type: "object",
        properties: { location: { type: "string" } },
        required: ["location"],
      },
    },
  }],
});
`,
          },
          {
            caption: "After, Node",
            code: `const response = await client.responses.create({
  model: "gpt-6.1-sol",
  input: [{ role: "user", content: "What is the weather in Paris?" }],
  tools: [{
    type: "function",
    name: "get_weather",
    description: "Get the weather for a city.",
    parameters: {
      type: "object",
      properties: { location: { type: "string" } },
      required: ["location"],
    },
  }],
});
`,
          },
        ],
        sources: [
          { label: "Migrate to the Responses API", url: OPENAI_MIGRATE },
          { label: "Function calling", url: OPENAI_TOOLS },
        ],
      },
      {
        heading: "Tool results",
        paragraphs: [
          "The function calling guide says a function call is an output item whose type is function_call. It has a call_id, a name, and JSON-encoded arguments. Your application runs the function. The next request appends a function_call_output item with that call_id and the output string.",
          "The reasoning guide says to pass back the reasoning items returned with the function call, plus the function call items and the function call output items, since the last user message. Dropping those items is one of the migration errors the migration guide lists.",
          "Responses are stored by default. Set store to false when you do not want that. If the flow must stay stateless, the migration guide says to preserve each returned reasoning item, which includes encrypted_content by default, and send those items on the next request.",
        ],
        codes: [
          {
            caption: "Python, send the tool result",
            code: `input_list += response.output
for item in response.output:
    if item.type == "function_call" and item.name == "get_weather":
        input_list.append({
            "type": "function_call_output",
            "call_id": item.call_id,
            "output": "15 C",
        })
response = client.responses.create(
    model="gpt-6.1-sol",
    tools=tools,
    input=input_list,
)
print(response.output_text)
`,
          },
          {
            caption: "Node, send the tool result",
            code: `import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";

const toolCall = response.output.find((item) => item.type === "function_call");
input.push(...toResponseInputItems(response.output));
input.push({
  type: "function_call_output",
  call_id: toolCall.call_id,
  output: "15 C",
});
response = await client.responses.create({
  model: "gpt-6.1-sol",
  tools,
  input,
});
console.log(response.output_text);
`,
          },
        ],
        sources: [
          { label: "Function calling", url: OPENAI_TOOLS },
          { label: "Reasoning guide", url: OPENAI_REASONING },
          { label: "Migrate to the Responses API", url: OPENAI_MIGRATE },
        ],
      },
      {
        heading: "Streaming",
        paragraphs: [
          "The migration guide says Chat Completions streaming returns chunks with a delta field. Responses streaming uses typed server-sent events. A text stream includes response.created, response.output_text.delta, response.completed, and error.",
          "A function-calling stream also emits response.function_call_arguments.delta and response.function_call_arguments.done. The function calling guide accumulates arguments by listening for response.output_item.added when the item type is function_call, then appending each delta onto that item's arguments.",
        ],
        codes: [
          {
            caption: "Python",
            code: `final_tool_calls = {}
stream = client.responses.create(
    model="gpt-6.1-sol",
    input=[{"role": "user", "content": "What is the weather in Paris?"}],
    tools=tools,
    stream=True,
)
for event in stream:
    if event.type == "response.output_item.added":
        final_tool_calls[event.output_index] = event.item
    elif event.type == "response.function_call_arguments.delta":
        index = event.output_index
        if final_tool_calls[index]:
            final_tool_calls[index].arguments += event.delta
`,
          },
          {
            caption: "Node",
            code: `const finalToolCalls = {};
const stream = await client.responses.create({
  model: "gpt-6.1-sol",
  input: [{ role: "user", content: "What is the weather in Paris?" }],
  tools,
  stream: true,
});
for await (const event of stream) {
  if (event.type === "response.output_item.added" && event.item.type === "function_call") {
    finalToolCalls[event.output_index] = event.item;
  } else if (event.type === "response.function_call_arguments.delta" && finalToolCalls[event.output_index]) {
    finalToolCalls[event.output_index].arguments += event.delta;
  }
}
`,
          },
        ],
        sources: [
          { label: "Migrate to the Responses API", url: OPENAI_MIGRATE },
          { label: "Function calling", url: OPENAI_TOOLS },
        ],
      },
      {
        heading: "Gotchas",
        paragraphs: [
          "The migration guide lists these mistakes when a Chat Completions client is pointed at Responses.",
        ],
        bullets: [
          "Reading choices[0].message.content instead of output_text or output.",
          "Treating every output entry as a message. Reasoning items, function calls, and function results are separate item types.",
          "Dropping reasoning items, function call items, or function call output items when you build the next input yourself.",
          "Sending a function result without the matching call_id.",
          "Sending response_format. Responses uses text.format.",
          "Reusing a Chat Completions stream handler that only reads delta chunks.",
          "Assuming previous_response_id makes earlier turns free. Previous input tokens in the chain are still billed as input tokens.",
          "Setting reasoning_effort to none on gpt-6.1-sol or gpt-6-astra because the Chat Completions error mentions it. Those models do not support none.",
        ],
        sources: [
          { label: "Migrate to the Responses API", url: OPENAI_MIGRATE },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
          { label: "GPT-6.1 Sol model page", url: OPENAI_SOL_61 },
        ],
      },
      {
        heading: "LiteLLM",
        paragraphs: [
          "LiteLLM's OpenAI provider says a model string with the openai/ prefix calls Chat Completions. Prefix one call with openai/responses/ to send that call to the Responses API. The page shows openai/responses/gpt-6.1-sol for a request that includes tools and reasoning_effort.",
          "The same page says gpt-6.1-sol without that prefix uses Chat Completions, and that a built-in tool such as web_search_preview fails on that path. It says LiteLLM drops reasoning_effort on tool calls for gpt-5.4, gpt-5.5, and future 5.x releases, because that pair is only supported on the Responses API. The sample on that page uses openai/responses/gpt-6.1-sol and says LiteLLM also routes a call to /v1/responses when both tools and reasoning_effort are set. Do not send none. The GPT-6.1 Sol model page says none is not supported.",
        ],
        codes: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="openai/responses/gpt-6.1-sol",
    messages=[{"role": "user", "content": "What is the weather in Paris?"}],
    reasoning_effort="low",
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "parameters": {
                "type": "object",
                "properties": {"location": {"type": "string"}},
                "required": ["location"],
            },
        },
    }],
)
`,
          },
        ],
        sources: [
          { label: "LiteLLM OpenAI provider", url: LITELLM_OPENAI },
          { label: "GPT-6.1 Sol model page", url: OPENAI_SOL_61 },
        ],
      },
      {
        heading: "Vercel AI SDK",
        paragraphs: [
          "The AI SDK OpenAI guide says openai('model-id') uses the Responses API, and that this has been the default since AI SDK 5. openai.chat('model-id') calls Chat Completions. Use that factory when a custom base URL implements Chat Completions and not Responses.",
          "The same guide says to use the Responses API for GPT-6 tool calling. GPT-6 Astra and GPT-6.1 Sol do not support reasoningEffort none. GPT-6 Sol and GPT-6 Luna do.",
        ],
        codes: [
          {
            caption: "Responses",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-6.1-sol"),
  prompt: "What is the weather in Paris?",
  tools: {
    get_weather: tool({
      description: "Get the weather for a city.",
      inputSchema: z.object({ city: z.string() }),
    }),
  },
});
`,
          },
        ],
        sources: [{ label: "AI SDK OpenAI guide", url: AI_SDK_OPENAI }],
      },
      {
        heading: "LangChain",
        paragraphs: [
          "The ChatOpenAI page says ChatOpenAI routes to the Responses API when you use a feature that requires it, such as the built-in web search tool. You can also set use_responses_api to True. The gpt-6-astra examples on that page set that flag.",
          "The page says async tools are only supported via the Responses API, and that an additional_tools content block requires it. On Chat Completions, ChatOpenAI raises ValueError for that block. A bind_tools example on the same page uses ChatOpenAI without use_responses_api. The Using GPT-6 guide says gpt-6.1-sol and gpt-6-astra tool calling requires Responses, so set use_responses_api to True for those function tools.",
        ],
        codes: [
          {
            caption: "Python",
            code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-6.1-sol", use_responses_api=True)
`,
          },
        ],
        sources: [
          { label: "LangChain ChatOpenAI", url: LANGCHAIN_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
      {
        heading: "Pipecat",
        paragraphs: [
          "Pipecat documents two OpenAI text services. OpenAILLMService is the chat completions service. OpenAIResponsesLLMService and OpenAIResponsesHttpLLMService call the Responses API. The Responses page says to use OpenAILLMService for Chat Completions and the Responses classes for the Responses API.",
          "Both services document function calling through register_function. The Responses page does not name gpt-6.1-sol or gpt-6-astra. The model setting is the OpenAI model id. A pipeline that still constructs OpenAILLMService is still on Chat Completions, which is the endpoint OpenAI says cannot run function tools for those two models.",
        ],
        codes: [
          {
            caption: "Responses service",
            code: `from pipecat.services.openai.responses.llm import OpenAIResponsesLLMService

llm = OpenAIResponsesLLMService(
    settings=OpenAIResponsesLLMService.Settings(model="gpt-6.1-sol"),
)
`,
          },
        ],
        sources: [
          { label: "Pipecat OpenAI LLM", url: PIPECAT_CHAT },
          { label: "Pipecat OpenAI Responses LLM", url: PIPECAT_RESPONSES },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: [
      { href: "/errors/gpt-6-1-sol-function-tools-chat-completions/", label: "gpt-6.1-sol function tools error" },
      { href: "/errors/gpt-6-luna-function-tools-reasoning-effort/", label: "gpt-6-luna function tools error" },
      { href: "/models/openai/gpt-6-1-sol/", label: "gpt-6.1-sol" },
      { href: "/models/openai/gpt-6-astra/", label: "gpt-6-astra" },
      { href: "/models/openai/gpt-6-luna/", label: "gpt-6-luna" },
      { href: "/models/openai/gpt-6-sol/", label: "gpt-6-sol" },
      { href: "/frameworks/", label: "Where each framework stores the model id" },
      { href: "/migrate/openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna/", label: "gpt-4o-2024-08-06 to gpt-6-luna" },
      { href: "/migrate/openai__gpt-5-1__to__openai__gpt-6-sol/", label: "gpt-5.1 to gpt-6-sol" },
    ],
    faqs: [
      {
        question: "Does the error's none option work on gpt-6.1-sol?",
        answer:
          "No. The [GPT-6.1 Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) says none and minimal are not supported. The [reasoning guide](https://developers.openai.com/api/docs/guides/reasoning) says none on GPT-6 Astra returns HTTP 400. Use the Responses API for function tools on both models.",
      },
      {
        question: "Can gpt-6-luna stay on Chat Completions?",
        answer:
          "Yes, for function tools, only when reasoning_effort is none. The [GPT-6 Luna model page](https://developers.openai.com/api/docs/models/gpt-6-luna) says that. The same limit applies to gpt-6-sol, from the [Using GPT-6](https://developers.openai.com/api/docs/guides/latest-model) guide. The Luna error is [here](/errors/gpt-6-luna-function-tools-reasoning-effort/).",
      },
      {
        question: "Does the AI SDK already call Responses?",
        answer:
          "openai('gpt-6.1-sol') does. The [AI SDK OpenAI guide](https://ai-sdk.dev/docs/guides/openai) says that factory uses the Responses API, and that openai.chat() stays on Chat Completions.",
      },
    ],
    citations: [
      OPENAI_GPT6,
      OPENAI_SOL_61,
      OPENAI_ASTRA,
      OPENAI_LUNA,
      OPENAI_REASONING,
      OPENAI_MIGRATE,
      OPENAI_TOOLS,
      ISSUE_SOL_TOOLS,
      LITELLM_OPENAI,
      AI_SDK_OPENAI,
      LANGCHAIN_OPENAI,
      PIPECAT_CHAT,
      PIPECAT_RESPONSES,
    ],
  },
  {
    slug: "codex-chatgpt-sign-in-model-retirements",
    title: "Codex ChatGPT sign-in model retirements | SunsetDiff",
    description:
      "GPT-5.5 retired from Codex for ChatGPT sign-in on October 14, 2026. The OpenAI API and Codex sessions that use an API key are not affected.",
    h1: "Codex ChatGPT sign-in model retirements",
    summary: "GPT-5.5 left Codex for people signed in with ChatGPT on October 14, 2026. API-key sessions can still use it.",
    answer:
      "OpenAI's Codex models page and the October 14, 2026 Codex changelog say: Effective October 14, 2026, at noon PDT (19:00 UTC), GPT-5.5 retires from Codex for users signed in with ChatGPT. The OpenAI API and Codex sessions authenticated with an API key aren't affected.",
    checked: "2026-10-26",
    steps: [
      {
        name: "Find the pinned model",
        text: "The models page says to replace gpt-5.5 in workspace defaults, saved model settings, managed configurations, custom agents, scheduled tasks, and scripts that select a model. A tool built on Codex that still sends gpt-5.5 for a ChatGPT sign-in session is the thing that breaks.",
      },
      {
        name: "Pick a model your plan still offers",
        text: "For Codex with ChatGPT sign-in, the models page says Plus, Pro, Business, Enterprise, and Edu choose GPT-6.1 Sol (gpt-6.1-sol) when available. Free and Go choose GPT-6 Luna (gpt-6-luna) in the desktop app when available.",
      },
      {
        name: "Or keep GPT-5.5 with an API key",
        text: "The models page says that with API-key authentication, model availability follows your API organization and project. GPT-5.5 remains available through the OpenAI API and in Codex sessions authenticated with an API key.",
      },
    ],
    sections: [
      {
        heading: "What OpenAI wrote",
        paragraphs: [
          "The Codex models page and the October 14, 2026 changelog entry say: Effective October 14, 2026, at noon PDT (19:00 UTC), GPT-5.5 retires from Codex for users signed in with ChatGPT. The OpenAI API and Codex sessions authenticated with an API key aren't affected.",
          "The October 14 changelog also says: Use GPT-6.1 Sol (gpt-6.1-sol) when available to your plan and client. Update workspace defaults, saved model settings, managed configurations, custom agents, scheduled tasks, and scripts that still select gpt-5.5.",
          "An earlier changelog entry, dated September 14, 2026, says: On October 14, 2026, GPT-5.5 will retire from ChatGPT, ChatGPT Work, and Codex on all plans, including consumer, Business, Enterprise, and Edu plans. This retirement does not apply to the OpenAI API. The October 14 entry and the models page are the later text. They say Codex sessions authenticated with an API key are not affected.",
        ],
        sources: [
          { label: "Codex models, GPT-5.5 retirement", url: CODEX_MODELS_GPT55 },
          { label: "Codex changelog, October 14, 2026", url: CODEX_CHANGELOG_OCT14 },
          { label: "Codex changelog, September 14, 2026", url: CODEX_CHANGELOG_SEP14 },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          "The models page says to replace gpt-5.5 in workspace defaults, saved model settings, managed configurations, custom agents, scheduled tasks, and scripts that select a model. That is the pinned config in a tool built on Codex.",
          "The same page says the ChatGPT desktop app, Codex CLI, and IDE extension share config.toml. If you do not set model, the client uses a recommended model. A file that still sets gpt-5.5 is the pin.",
        ],
        codes: [
          {
            caption: "config.toml, from the Codex models page",
            code: `model = "gpt-6.1-sol"\n`,
          },
        ],
        sources: [{ label: "Codex models", url: CODEX_MODELS }],
      },
      {
        heading: "How to fix it",
        paragraphs: [
          "For Codex with ChatGPT sign-in, the models page says: On Plus, Pro, Business, Enterprise, and Edu plans, choose GPT-6.1 Sol (gpt-6.1-sol) when available. On Free and Go plans, choose GPT-6 Luna (gpt-6-luna) in the desktop app when available.",
          "The same page shows these commands for the CLI. The second one is for a non-interactive run.",
          "The other fix on that page is an API key. It says: With API-key authentication, model availability follows your API organization and project. GPT-5.5 remains available through the OpenAI API and in Codex sessions authenticated with an API key.",
        ],
        table: {
          caption: "Replacements named on the Codex models page for ChatGPT sign-in.",
          headers: ["Sign-in", "What the models page says to choose"],
          rows: [
            ["Plus, Pro, Business, Enterprise, and Edu", "GPT-6.1 Sol (gpt-6.1-sol) when available."],
            ["Free and Go", "GPT-6 Luna (gpt-6-luna) in the desktop app when available."],
            ["API key", "GPT-5.5 remains available in the API and in Codex sessions that use an API key."],
          ],
        },
        codes: [
          {
            caption: "CLI",
            code: `codex --model gpt-6.1-sol\n`,
          },
          {
            caption: "Non-interactive run",
            code: `codex exec -m gpt-6.1-sol "Review the current changes"\n`,
          },
        ],
        sources: [
          { label: "Codex models, GPT-5.5 retirement", url: CODEX_MODELS_GPT55 },
          { label: "Codex changelog, October 14, 2026", url: CODEX_CHANGELOG_OCT14 },
        ],
      },
      {
        heading: "Other Codex models on the same page",
        paragraphs: [
          "The models page also says the gpt-5.4 and gpt-5.4-mini models retired from Codex with ChatGPT sign-in on August 31, 2026. Replace gpt-5.4 with gpt-6-sol and gpt-5.4-mini with gpt-6-luna when available to your plan and client. It says the OpenAI API and Codex authenticated with your own API key aren't affected by the GPT-5.4 retirement.",
          "The same section says the gpt-5.2 and gpt-5.3-codex models are already deprecated in Codex when you sign in with ChatGPT. Update scripts, configuration files, and codex exec --model commands that still reference those models.",
          "Those sentences are about Codex with ChatGPT sign-in. They do not change the shutdown dates stored on the OpenAI API model pages linked below.",
        ],
        sources: [{ label: "Codex models", url: CODEX_MODELS }],
      },
    ],
    related: [
      { href: "/models/openai/gpt-5-5/", label: "gpt-5.5" },
      { href: "/models/openai/gpt-6-1-sol/", label: "gpt-6.1-sol" },
      { href: "/models/openai/gpt-6-luna/", label: "gpt-6-luna" },
      { href: "/models/openai/gpt-6-sol/", label: "gpt-6-sol" },
      { href: "/models/openai/gpt-5-4/", label: "gpt-5.4" },
      { href: "/models/openai/gpt-5-4-mini/", label: "gpt-5.4-mini" },
      { href: "/models/openai/gpt-5-2/", label: "gpt-5.2" },
      { href: "/models/openai/gpt-5-3-codex/", label: "gpt-5.3-codex" },
    ],
    faqs: [
      {
        question: "Did GPT-5.5 leave the OpenAI API on October 14, 2026?",
        answer:
          "No. The [Codex models page](https://developers.openai.com/codex/models#gpt-55-retirement) and the [October 14 changelog](https://developers.openai.com/codex/changelog#codex-2026-10-14-gpt-55-retirement) say the OpenAI API and Codex sessions authenticated with an API key aren't affected. The [September 14 changelog](https://developers.openai.com/codex/changelog#codex-2026-09-14-gpt-55-retirement) says this retirement does not apply to the OpenAI API.",
      },
      {
        question: "Which model do I pick in Codex if I sign in with ChatGPT?",
        answer:
          "The [models page](https://developers.openai.com/codex/models#gpt-55-retirement) says Plus, Pro, Business, Enterprise, and Edu choose gpt-6.1-sol when available. Free and Go choose gpt-6-luna in the desktop app when available. See [gpt-6.1-sol](/models/openai/gpt-6-1-sol/) and [gpt-6-luna](/models/openai/gpt-6-luna/).",
      },
      {
        question: "What breaks if a tool still pins gpt-5.5?",
        answer:
          "The models page says to replace gpt-5.5 in workspace defaults, saved model settings, managed configurations, custom agents, scheduled tasks, and scripts that select a model. Set model to gpt-6.1-sol in config.toml, or pass codex --model gpt-6.1-sol. Or use an API key, which the same page says can still use GPT-5.5.",
      },
    ],
    citations: [CODEX_MODELS, CODEX_MODELS_GPT55, CODEX_CHANGELOG_OCT14, CODEX_CHANGELOG_SEP14],
  },
  {
    slug: "nvidia-hosted-api-vs-nim-containers",
    title: "NVIDIA hosted API vs NIM containers | SunsetDiff",
    description:
      "NVIDIA's free hosted API retires models on build.nvidia.com. The AI Enterprise lifecycle page is the self-hosted NIM container list, not that calendar.",
    h1: "NVIDIA hosted API vs NIM containers",
    summary: "A 410 from integrate.api.nvidia.com is a hosted model. The AI Enterprise EOL page is a different list.",
    answer:
      "build.nvidia.com model pages say when a hosted NIM endpoint is deprecated. They do not print a shutdown day. Dated hosted shutdowns on SunsetDiff come from NVIDIA GitHub notices. The AI Enterprise lifecycle page lists self-hosted NIM containers and other enterprise components. Do not use that page as the hosted API calendar.",
    checked: "2026-10-27",
    steps: [
      {
        name: "Read the model id in the error",
        text: "A public log of the hosted API prints 410 Gone and the words has reached its end of life, plus a timestamp. That id is a hosted slug, such as the one in the log.",
      },
      {
        name: "Open the hosted model page",
        text: "The page is on build.nvidia.com. If it says the NIM endpoint has been deprecated, the hosted endpoint is deprecated. The pages checked on 2026-10-27 do not print a day.",
      },
      {
        name: "Do not copy the container date",
        text: "docs.nvidia.com AI Enterprise end-of-life notices are for NIM containers and other enterprise components you run yourself. A date there is not the hosted API shutdown.",
      },
    ],
    sections: [
      {
        heading: "Hosted API",
        paragraphs: [
          "The hosted API is the catalog at build.nvidia.com. Calls go to integrate.api.nvidia.com. The nemotron-4-340b-reward model page OpenAPI lists server https://integrate.api.nvidia.com/v1/ and POST /chat/completions. It says the API is compatible with OpenAI.",
          "On 2026-10-27, model pages such as nvidia/nv-embedqa-e5-v5 and nvidia/nemotron-4-340b-reward showed the heading This NIM Endpoint has been deprecated, then: Please transition to another model to avoid any service interruptions. Those pages do not name a successor and do not print a shutdown day. SunsetDiff stores them as deprecated with no shutdown date.",
          "Two NVIDIA GitHub notices do print a day. NVIDIA/NemoClaw issue 2120 says the full API shutdown for kimi-k2.5 is May 20, 2026, and names moonshotai/kimi-k2.6 as the successor. Issue 1744 says GLM-5 fully shuts down on May 9, 2026. The commit that cites it prints the ids z-ai/glm5 and z-ai/glm-5.1.",
        ],
        sources: [
          { label: "NVIDIA hosted model catalog", url: "https://build.nvidia.com/models" },
          { label: "nemotron-4-340b-reward model page", url: "https://build.nvidia.com/nvidia/nemotron-4-340b-reward" },
          { label: "nv-embedqa-e5-v5 model page", url: "https://build.nvidia.com/nvidia/nv-embedqa-e5-v5" },
          { label: "NVIDIA NemoClaw kimi-k2.5 notice", url: "https://github.com/NVIDIA/NemoClaw/issues/2120" },
          { label: "NVIDIA NemoClaw GLM-5 notice", url: "https://github.com/NVIDIA/NemoClaw/issues/1744" },
          { label: "NVIDIA NemoClaw GLM-5 commit", url: "https://github.com/NVIDIA/NemoClaw/commit/db665834691ecf35c55deaa6f64c9227463ef080" },
        ],
      },
      {
        heading: "Self-hosted NIM containers",
        paragraphs: [
          "The AI Enterprise lifecycle page is titled End of Life Notices. It says the page lists NVIDIA AI Enterprise components that have reached or are approaching Deprecated or End of Life. The rows are hardware, container images, and model-specific NIM microservices in a Production Branch.",
          "One row is NVIDIA NIM Llama-3.1-8B-Instruct. The page says its current state is Deprecated and its end of support date is January 2027. The migration path on that page is the model-free NIM, or another supported model-specific NIM. That date is for the container in Production Branch 6. It is not a shutdown date for a slug on integrate.api.nvidia.com.",
          "Another row is NVIDIA NIM Retrieval QA E5 Embedding v5. The page says it is Deprecated and reaches end of support in January 2027, when Production Branch 6 reaches end of life. The hosted model page for nvidia/nv-embedqa-e5-v5 is a separate page. It says the hosted endpoint is deprecated and does not print January 2027.",
        ],
        sources: [
          { label: "NVIDIA AI Enterprise end-of-life notices", url: "https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html" },
          { label: "nv-embedqa-e5-v5 hosted model page", url: "https://build.nvidia.com/nvidia/nv-embedqa-e5-v5" },
        ],
      },
      {
        heading: "What a 410 means",
        paragraphs: [
          "GitHub issue Lee-Dongwook/E2E-Self-Heal#402 prints this hosted API body: 410 Gone: The model 'openai/gpt-oss-120b' has reached its end of life on 2026-09-03T08:00:00Z and is no longer available.",
          "GitHub issue omatheusmesmo/Qlawkus#357 prints: 410 Gone: The model 'nvidia/nv-embedqa-e5-v5' has reached its end of life on 2026-08-25T09:00:00Z. The hosted model page for that id says the endpoint is deprecated and does not print that timestamp, so SunsetDiff does not store 2026-08-25 as the shutdown date.",
          "GitHub issue chimeranext/better-toolkits#127 reports HTTP 410 and the words reached its end of life on 2026-07-02 for z-ai/glm-5.1, and on 2026-08-07 for deepseek-ai/deepseek-v4-pro. It does not print the full error sentence. Those days are not stored. No NVIDIA page or NVIDIA repository notice found on 2026-10-27 states them.",
        ],
        sources: [
          { label: "E2E-Self-Heal issue 402", url: "https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402" },
          { label: "Qlawkus issue 357", url: "https://github.com/omatheusmesmo/Qlawkus/issues/357" },
          { label: "better-toolkits issue 127", url: "https://github.com/chimeranext/better-toolkits/issues/127" },
        ],
      },
      {
        heading: "Do not hardcode the slug",
        paragraphs: [
          "Put the hosted model id in config, not in source. When the call returns 410, stop retrying that id. A fallback list should drop an id after 410, because the body says the model is gone.",
          "Before you ship a slug, read SunsetDiff's JSON. Filter provider nvidia. shutdown_date is set only when an NVIDIA notice printed a day. An empty shutdown_date with status deprecated means the model page says deprecated and did not print a day.",
        ],
        codes: [
          {
            caption: "Read the NVIDIA rows",
            code: `curl -fsSL https://sunsetdiff.com/data/models.json\n`,
          },
        ],
        sources: [
          { label: "SunsetDiff models.json", url: "https://sunsetdiff.com/data/models.json" },
          { label: "NVIDIA provider page", url: "https://sunsetdiff.com/providers/nvidia/" },
        ],
      },
    ],
    related: [
      { href: "/providers/nvidia/", label: "NVIDIA provider" },
      { href: "/errors/nvidia-hosted-model-410-gone/", label: "NVIDIA hosted 410 Gone" },
      { href: "/models/nvidia/moonshotai-kimi-k2-5/", label: "moonshotai/kimi-k2.5" },
      { href: "/models/nvidia/nvidia-nv-embedqa-e5-v5/", label: "nvidia/nv-embedqa-e5-v5" },
      { href: "/guides/check-model-shutdown-dates-programmatically/", label: "Check dates programmatically" },
    ],
    faqs: [
      {
        question: "Is the AI Enterprise EOL page the hosted API calendar?",
        answer:
          "No. The [AI Enterprise end-of-life notices](https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html) list components you run yourself, including NIM containers. Hosted rows are on [NVIDIA](/providers/nvidia/), from build.nvidia.com model pages and NVIDIA GitHub notices.",
      },
      {
        question: "Why do most NVIDIA rows have no shutdown date?",
        answer:
          "The hosted model pages checked on 2026-10-27 say the NIM endpoint has been deprecated and do not print a day. SunsetDiff leaves shutdown_date empty. Dated rows are the ones whose NVIDIA GitHub notice prints a day, such as [moonshotai/kimi-k2.5](/models/nvidia/moonshotai-kimi-k2-5/) on May 20, 2026.",
      },
      {
        question: "What should I do when the API returns 410?",
        answer:
          "Read the model id in the body. Open its build.nvidia.com page and the [NVIDIA provider page](/providers/nvidia/). The error page quotes the public logs: [NVIDIA hosted 410 Gone](/errors/nvidia-hosted-model-410-gone/). Put the next id in config, and check [models.json](/data/models.json) before you hardcode a slug.",
      },
    ],
    citations: [
      "https://build.nvidia.com/models",
      "https://build.nvidia.com/nvidia/nemotron-4-340b-reward",
      "https://build.nvidia.com/nvidia/nv-embedqa-e5-v5",
      "https://github.com/NVIDIA/NemoClaw/issues/2120",
      "https://github.com/NVIDIA/NemoClaw/issues/1744",
      "https://github.com/NVIDIA/NemoClaw/commit/db665834691ecf35c55deaa6f64c9227463ef080",
      "https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html",
      "https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402",
      "https://github.com/omatheusmesmo/Qlawkus/issues/357",
      "https://github.com/chimeranext/better-toolkits/issues/127",
      "https://sunsetdiff.com/data/models.json",
      "https://sunsetdiff.com/providers/nvidia/",
    ],
  },
  {
    slug: "catch-a-retired-model-before-your-users-do",
    title: "Catch a retired model before your users do | SunsetDiff",
    description:
      "Fail a build when SunsetDiff lookup says a configured model is retired or its shutdown date has passed, and do not retry a model the provider says is gone.",
    h1: "Catch a retired model before your users do",
    summary: "Check configured model ids before the job runs, and do not retry a model that is already gone.",
    answer:
      "A retired model can keep a job green if the caller swallows the error or answers HTTP 200 anyway. Look up each configured id on the free SunsetDiff lookup API before startup or CI. Fail when status is retired or an exact or via_snapshots shutdown date is already past. When a live call says the model is missing, stop retrying that id.",
    checked: "2026-10-29",
    steps: [
      {
        name: "List the ids you actually call",
        text: "Include defaults, not only ids a person typed. A classifier, a rewrite step, and a test probe can each pin a different id.",
      },
      {
        name: "Look them up before the job",
        text: "GET /api/v1/lookup/<model-id>.json. Percent-encode the id. Read status, shutdown_date, and shutdown_date_kind.",
      },
      {
        name: "Fail on retired or a past exact date",
        text: "status retired fails the build. An exact or via_snapshots shutdown_date before today fails it too. A not_before date is a floor, not a deadline.",
      },
      {
        name: "Do not retry a gone id",
        text: "A missing model will fail the same way on the next try. Retry rate limits and 5xx. Do not retry a 404 that means the resource is gone.",
      },
    ],
    sections: [
      {
        heading: "The failure can stay quiet",
        paragraphs: [
          "OpenAI's deprecations page says access to gpt-4.1-nano was shut down on October 23, 2026. At shutdown, the model is no longer accessible. GitHub issue [AlejandroFuentePinero/digital-twin#54](https://github.com/AlejandroFuentePinero/digital-twin/issues/54) describes a deployed app that kept calling that id after the shutdown. Issue [#57](https://github.com/AlejandroFuentePinero/digital-twin/issues/57) asks the startup check to fail when a configured model is gone.",
          "GitHub issue [bobmatnyc/joanies-kitchen#24](https://github.com/bobmatnyc/joanies-kitchen/issues/24) describes recipe pages that answered HTTP 200 while the model call had already failed. The visitor saw a normal page. The log had the failure.",
          "GitHub issue [ahaqqu/RumaQ#306](https://github.com/ahaqqu/RumaQ/issues/306) describes a Gemini 404 that the retry loop treated as temporary. GitHub issue [Ghigog/Juice#421](https://github.com/Ghigog/Juice/issues/421) asks a worker to stop retrying permanent Groq failures. Those issues are examples. The error codes below come from the provider pages, not from the issues.",
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "GitHub issue AlejandroFuentePinero/digital-twin#54", url: ISSUE_DIGITAL_TWIN_OUTAGE },
          { label: "GitHub issue AlejandroFuentePinero/digital-twin#57", url: ISSUE_DIGITAL_TWIN_PROBE },
          { label: "GitHub issue bobmatnyc/joanies-kitchen#24", url: ISSUE_JOANIES },
          { label: "GitHub issue ahaqqu/RumaQ#306", url: ISSUE_RUMAQ },
          { label: "GitHub issue Ghigog/Juice#421", url: ISSUE_JUICE },
        ],
      },
      {
        heading: "Fail the build from lookup JSON",
        paragraphs: [
          "Lookup is one public file per model id: [the API docs](/api/). No API key. The body is one model record, or an array when several providers share the id. Check every row. The fields used here are status, shutdown_date, and shutdown_date_kind. sources[0].url is the official page. Read it before you migrate.",
          "Percent-encode the id with encodeURIComponent, or urllib.parse.quote(model_id, safe=\"\") in Python. A colon becomes %3A and a slash becomes %2F, so the id stays one path segment. [anthropic.claude-3-haiku-20240307-v1:0](/api/v1/lookup/anthropic.claude-3-haiku-20240307-v1%3A0.json) is the colon example. A slash id uses %2F the same way. A raw colon also works. A 404 from lookup means the id is not in this dataset. It does not mean the provider retired it.",
          "Fail when status is retired, or when shutdown_date_kind is exact or via_snapshots and shutdown_date is before today. not_before is a floor, not a deadline, so this check does not fail on it. month_only and none are not an exact day either. [Check model shutdown dates programmatically](/guides/check-model-shutdown-dates-programmatically/) lists the other fields. The sample list includes gpt-4.1-nano, which this dataset stores as retired. Running the sample as written exits with a failure. Replace the list with your ids.",
        ],
        codes: [
          {
            caption: "Python",
            code: `import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

def lookup(model_id):
    safe_id = urllib.parse.quote(model_id, safe="")
    url = f"https://sunsetdiff.com/api/v1/lookup/{safe_id}.json"
    with urllib.request.urlopen(url) as response:
        return json.load(response)

def gone(row, today):
    if row.get("status") == "retired":
        return True
    shutdown = row.get("shutdown_date")
    return row.get("shutdown_date_kind") in ("exact", "via_snapshots") and bool(shutdown) and shutdown < today

def main():
    today = datetime.now(timezone.utc).date().isoformat()
    model_ids = [
        "gpt-4.1-nano",
        "anthropic.claude-3-haiku-20240307-v1:0",
    ]
    failed = []
    for model_id in model_ids:
        try:
            body = lookup(model_id)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                print(f"{model_id}: not in the SunsetDiff dataset")
                continue
            raise
        rows = body if isinstance(body, list) else [body]
        for row in rows:
            if gone(row, today):
                failed.append(
                    f"{row['provider']} {row['id']} status={row['status']} shutdown_date={row['shutdown_date']}"
                )
    if failed:
        raise SystemExit("retired or past shutdown:\\n" + "\\n".join(failed))

if __name__ == "__main__":
    main()
`,
          },
          {
            caption: "Node",
            code: `const modelIds = [
  "gpt-4.1-nano",
  "anthropic.claude-3-haiku-20240307-v1:0",
];

function gone(row, today) {
  if (row.status === "retired") return true;
  return (row.shutdown_date_kind === "exact" || row.shutdown_date_kind === "via_snapshots") && row.shutdown_date && row.shutdown_date < today;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const failed = [];
  for (const modelId of modelIds) {
    const url = "https://sunsetdiff.com/api/v1/lookup/" + encodeURIComponent(modelId) + ".json";
    const response = await fetch(url);
    if (response.status === 404) {
      console.log(modelId + ": not in the SunsetDiff dataset");
      continue;
    }
    if (!response.ok) throw new Error(modelId + " lookup HTTP " + response.status);
    const body = await response.json();
    const rows = Array.isArray(body) ? body : [body];
    for (const row of rows) {
      if (gone(row, today)) {
        failed.push(row.provider + " " + row.id + " status=" + row.status + " shutdown_date=" + row.shutdown_date);
      }
    }
  }
  if (failed.length) {
    console.error(failed.join("\\n"));
    process.exit(1);
  }
}

main();
`,
          },
        ],
        sources: [{ label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" }],
      },
      {
        heading: "Do not retry a gone model",
        paragraphs: [
          "Retry a rate limit or a 5xx. Do not retry an id the provider says is missing. The sentence in the table is on the linked official page. Where that page does not print a code, the row says so.",
        ],
        table: {
          caption: "What each official error or deprecations page says about a missing or shut down model. Checked 2026-10-29.",
          headers: ["Provider", "What the official page says", "What to do"],
          rows: [
            [
              "OpenAI",
              "The [error codes](https://developers.openai.com/api/docs/guides/error-codes) page lists NotFoundError as requested resource does not exist. It does not name a code model_not_found. The [deprecations](https://developers.openai.com/api/docs/deprecations) page says that at shutdown the model will no longer be accessible.",
              "Do not retry a not-found response. Change the id before the shutdown date.",
            ],
            [
              "Anthropic",
              "The [errors](https://platform.claude.com/docs/en/api/errors) page says HTTP 404 is not_found_error, and the example message is The requested resource could not be found. The SDK retries connection errors, rate limits, and 5xx. The [deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) page says a retired model is no longer available and requests to retired models fail. It does not name not_found_error.",
              "Do not retry a 404 not_found_error. Read the body. The deprecations page does not say every retired id uses that type.",
            ],
            [
              "Gemini",
              "The [deprecations](https://ai.google.dev/gemini-api/docs/deprecations) page says that once a model is shutdown, it is completely turned off and the endpoint is no longer available. That page does not print one error code for every model.",
              "After shutdown, stop calling that id. Recorded 404 sentences are on the [Gemini error pages](/errors/).",
            ],
            [
              "Groq",
              "The [errors](https://console.groq.com/docs/errors) page says 404 Not Found means the requested resource could not be found. It does not print a code named model_decommissioned. The [deprecations](https://console.groq.com/docs/deprecations) page says that after the deprecation date the model will no longer be accessible, and requests to deprecated model ids will return errors.",
              "Do not retry a 404 for that id. Do not invent an error code the errors page does not print.",
            ],
            [
              "OpenRouter",
              "The [errors](https://openrouter.ai/docs/api_reference/errors-and-debugging) page says error_type not_found is HTTP 404: the requested resource (model, file, etc.) does not exist. It also says to check the body for an error field even on a 200. The [models](https://openrouter.ai/docs/guides/overview/models) page says a single-model lookup returns 404 if the model does not exist. The [variants](https://openrouter.ai/docs/guides/routing/model-variants/overview) page says a missing catalog entry returns 404, or HTTP 200 with an empty endpoints array, and to treat either as unavailable rather than a reason to retry the base slug. Those pages do not print the sentence no longer available on OpenRouter.",
              "Do not retry not_found. Read a 200 body before you treat the call as success.",
            ],
          ],
        },
        sources: [
          { label: "OpenAI error codes", url: OPENAI_ERRORS },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Anthropic errors", url: CLAUDE_ERRORS },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Groq API error codes", url: GROQ_ERRORS },
          { label: "Groq model deprecation", url: GROQ_DEPRECATIONS },
          { label: "OpenRouter errors", url: OPENROUTER_ERRORS },
          { label: "OpenRouter models", url: OPENROUTER_MODELS },
          { label: "OpenRouter model variants", url: OPENROUTER_VARIANTS },
        ],
      },
      {
        heading: "GitHub Action",
        paragraphs: [
          "The [GitHub Action](/github-action/) scans files in the pull request. It reports an id whose status is retired, deprecated, or legacy. It also reports another status when the shutdown date is inside warn-days and the date kind is not not_before. The job fails when the status is retired, or the shutdown date is inside fail-days.",
          "Use the Action when the ids are in the repo. Use the snippets above when the ids live in a host config the Action's file glob does not read. Both read the same status and shutdown_date fields.",
        ],
        sources: [
          { label: "SunsetDiff GitHub Action", url: "https://sunsetdiff.com/github-action/" },
          { label: "SunsetDiff API docs", url: "https://sunsetdiff.com/api/" },
        ],
      },
    ],
    related: [
      { href: "/guides/check-model-shutdown-dates-programmatically/", label: "Check dates programmatically" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
      { href: "/github-action/", label: "GitHub Action" },
      { href: "/api/", label: "API docs" },
      { href: "/errors/", label: "Request errors" },
      { href: "/errors/openai-model-has-been-deprecated/", label: "The model has been deprecated" },
      { href: "/errors/gemini-model-no-longer-available/", label: "Gemini model no longer available" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure 410 Gone" },
    ],
    faqs: [
      {
        question: "Does lookup need an API key?",
        answer: "No. The files are public and static. The field list is on [API docs](/api/).",
      },
      {
        question: "What if lookup returns 404?",
        answer:
          "The id is not in the SunsetDiff dataset. That is not a provider retirement. A colon must be %3A and a slash %2F if you encode the id. A raw colon also resolves.",
      },
      {
        question: "Should a not_before date fail the build?",
        answer:
          "No. shutdown_date_kind not_before is a floor, not a deadline. The snippets fail on status retired, and on an exact or via_snapshots shutdown_date that is already past.",
      },
      {
        question: "Which error code means a Groq model was decommissioned?",
        answer:
          "Groq's [error codes](https://console.groq.com/docs/errors) page does not print model_decommissioned. It says 404 means the requested resource could not be found. The [deprecations](https://console.groq.com/docs/deprecations) page says requests to a deprecated model id return errors after the shutdown date, and it does not name the code.",
      },
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      ISSUE_DIGITAL_TWIN_OUTAGE,
      ISSUE_DIGITAL_TWIN_PROBE,
      ISSUE_JOANIES,
      ISSUE_RUMAQ,
      ISSUE_JUICE,
      "https://sunsetdiff.com/api/",
      OPENAI_ERRORS,
      CLAUDE_ERRORS,
      CLAUDE_DEPRECATIONS,
      GEMINI_DEPRECATIONS,
      GROQ_ERRORS,
      GROQ_DEPRECATIONS,
      OPENROUTER_ERRORS,
      OPENROUTER_MODELS,
      OPENROUTER_VARIANTS,
      "https://sunsetdiff.com/github-action/",
    ],
  },
];

export const guides: GuidePage[] = [...guidePages, ...datasetShutdownGuides()];

export function guideBySlug(slug: string | undefined): GuidePage | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export interface ModelGuideLink {
  href: string;
  label: string;
}

/** A few guides that match this model. Not the whole guide index. */
export function guidesForModel(model: ModelRecord, catalog: ModelRecord[]): ModelGuideLink[] {
  const links: ModelGuideLink[] = [];
  const seen = new Set<string>();
  const add = (slug: string) => {
    if (seen.has(slug)) return;
    const guide = guideBySlug(slug);
    if (!guide) return;
    seen.add(slug);
    links.push({ href: guidePath(slug), label: guide.h1 });
  };
  if (isDecember11OpenAiShutdown(model)) add(DECEMBER_11_GUIDE_SLUG);
  if (isJanuary2027Gpt4Shutdown(model)) add(JANUARY_2027_GPT4_GUIDE_SLUG);
  if (model.provider === "nvidia") add("nvidia-hosted-api-vs-nim-containers");
  if (aliasSnapshotView(model, catalog)) add("model-aliases-vs-pinned-snapshots");
  if (model.shutdown_date && model.shutdown_date_kind !== "none") {
    add("what-happens-on-model-shutdown-day");
    add("how-much-notice-before-an-ai-model-shuts-down");
    add("silent-failures-after-model-shutdown");
  }
  if (
    model.provider === "azure-openai"
    || model.provider === "aws-bedrock"
    || model.provider === "google-vertex"
    || model.provider === "google-gemini-api"
  ) {
    add("why-shutdown-dates-differ-by-platform");
  }
  if (model.replacements.length) add("pre-migration-test-checklist");
  if (!links.length) {
    add("find-model-ids-in-your-codebase");
    add("swap-a-deprecated-model");
  }
  return links.slice(0, 4);
}
