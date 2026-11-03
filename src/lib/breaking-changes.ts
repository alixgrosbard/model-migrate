import type { FaqItem } from "./format.ts";

/** Hub for request settings and endpoints a replacement rejects. */
export const BREAKING_CHANGES_PATH = "/breaking-changes/";
export const BREAKING_CHANGES_JSON = "/data/breaking-changes.json";
export const BREAKING_CHANGES_CSV = "/data/breaking-changes.csv";
export const BREAKING_CHANGES_LICENSE = "https://creativecommons.org/licenses/by/4.0/";

const SONNET_GUIDE = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const LUNA_PAGE = "https://developers.openai.com/api/docs/models/gpt-6-luna";
const OPENAI_GPT6 = "https://developers.openai.com/api/docs/guides/latest-model";
const SOL_61_PAGE = "https://developers.openai.com/api/docs/models/gpt-6.1-sol";
const ISSUE_SOL_TOOLS = "https://github.com/langflow-ai/openrag/issues/2534";
const SOL_TOOLS_ERROR =
  "Function tools with reasoning_effort are not supported for gpt-6.1-sol in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.";
const OPENAI_CHAT = "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/";
const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_TTS = "https://developers.openai.com/api/docs/guides/text-to-speech";
const OPENAI_REALTIME = "https://developers.openai.com/api/docs/guides/realtime";
const OPENAI_STT = "https://developers.openai.com/api/docs/guides/speech-to-text";
const OPENAI_LIVE_STT = "https://developers.openai.com/api/docs/guides/realtime-transcription";
const ISSUE_MAX_TOKENS = "https://github.com/openai/openai-python/issues/2046";
const ISSUE_THINKING_BUDGET = "https://github.com/gravitee-io/issues/issues/11964";
const ISSUE_GEMMA_THINKING = "https://github.com/can1357/oh-my-pi/issues/16350";
const GEMINI_THINKING = "https://ai.google.dev/gemini-api/docs/thinking";
const GEMINI_IMAGEN = "https://ai.google.dev/gemini-api/docs/imagen";
const GEMINI_IMAGE = "https://ai.google.dev/gemini-api/docs/image-generation";
const GEMINI_VEO = "https://ai.google.dev/gemini-api/docs/veo";
const CLAUDE_VERSIONING = "https://platform.claude.com/docs/en/api/versioning";
const CLAUDE_MIGRATION_2026 = "https://platform.claude.com/docs/en/api/migration-2026-10-21";
const ISSUE_MESSAGE_PARAM = "https://github.com/pydantic/pydantic-ai/issues/10923";

const CHECKED_ERRORS = "2026-10-20";
const CHECKED_LATER = "2026-10-21";
const CHECKED_VERSION = "2026-10-22";

/** Exact availability sentences from the Claude API versioning page, checked 2026-10-22. */
const BEDROCK_CAVEAT =
  "Available on the Claude API, Claude Platform on AWS, Microsoft Foundry, and Google Cloud. On Amazon Bedrock, it's available for Claude 4.7 and later models. For other models on Bedrock, see the migration guide.";

const API_VERSION_FIX_KEEP =
  "The versioning page still lists 2023-06-01 and does not call that version deprecated.";

const API_SDK_MAJORS =
  "The migration guide says the first versions that send 2026-10-21 are the Python anthropic package 2.0.0, TypeScript @anthropic-ai/sdk 1.0.0, the Go SDK 2.0.0 (module github.com/anthropics/anthropic-sdk-go/v2), Java com.anthropic:anthropic-java 3.0.0, C# Anthropic 13.0.0, PHP anthropic-ai/sdk 1.0.0, the Ruby anthropic gem 2.0.0, and the ant CLI 2.0.0.";

const SONNET_MIGRATIONS: BreakingMigration[] = [
  {
    href: "/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/",
    label: "claude-sonnet-4-5-20250929 to claude-sonnet-5-5",
  },
  {
    href: "/migrate/anthropic__claude-sonnet-4-20250514__to__anthropic__claude-sonnet-5-5/",
    label: "claude-sonnet-4-20250514 to claude-sonnet-5-5",
  },
  {
    href: "/migrate/anthropic__claude-3-7-sonnet-20250219__to__anthropic__claude-sonnet-5-5/",
    label: "claude-3-7-sonnet-20250219 to claude-sonnet-5-5",
  },
];

const LUNA_MIGRATIONS: BreakingMigration[] = [
  {
    href: "/migrate/openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna/",
    label: "gpt-4o-mini-2024-07-18 to gpt-6-luna",
  },
  {
    href: "/migrate/openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna/",
    label: "gpt-4o-2024-08-06 to gpt-6-luna",
  },
  {
    href: "/migrate/openai__gpt-4o-2024-11-20__to__openai__gpt-6-luna/",
    label: "gpt-4o-2024-11-20 to gpt-6-luna",
  },
];

const O_SERIES_MIGRATIONS: BreakingMigration[] = [
  { href: "/migrate/openai__o1__to__openai__gpt-5-6-sol/", label: "o1 to gpt-5.6-sol" },
  { href: "/migrate/openai__o3-mini__to__openai__gpt-5-6-sol/", label: "o3-mini to gpt-5.6-sol" },
  { href: "/migrate/openai__o4-mini__to__openai__gpt-5-6-terra/", label: "o4-mini to gpt-5.6-terra" },
];

const SPEECH_MIGRATIONS: BreakingMigration[] = [
  { href: "/migrate/openai__tts-1__to__openai__gpt-realtime-2-1-mini/", label: "tts-1 to gpt-realtime-2.1-mini" },
  { href: "/migrate/openai__tts-1-hd__to__openai__gpt-realtime-2-1-mini/", label: "tts-1-hd to gpt-realtime-2.1-mini" },
  {
    href: "/migrate/openai__gpt-4o-mini-tts-2025-03-20__to__openai__gpt-realtime-2-1-mini/",
    label: "gpt-4o-mini-tts-2025-03-20 to gpt-realtime-2.1-mini",
  },
  {
    href: "/migrate/openai__gpt-4o-mini-tts-2025-12-15__to__openai__gpt-realtime-2-1-mini/",
    label: "gpt-4o-mini-tts-2025-12-15 to gpt-realtime-2.1-mini",
  },
];

const LIVE_TRANSCRIBE_MIGRATIONS: BreakingMigration[] = [
  { href: "/migrate/openai__whisper-1__to__openai__gpt-live-transcribe/", label: "whisper-1 to gpt-live-transcribe" },
  {
    href: "/migrate/openai__gpt-4o-transcribe__to__openai__gpt-live-transcribe/",
    label: "gpt-4o-transcribe to gpt-live-transcribe",
  },
  {
    href: "/migrate/openai__gpt-4o-mini-transcribe__to__openai__gpt-live-transcribe/",
    label: "gpt-4o-mini-transcribe to gpt-live-transcribe",
  },
  {
    href: "/migrate/openai__gpt-4o-transcribe-diarize__to__openai__gpt-live-transcribe/",
    label: "gpt-4o-transcribe-diarize to gpt-live-transcribe",
  },
];

const IMAGEN_MIGRATIONS: BreakingMigration[] = [
  ["imagen-3-0-generate-002", "imagen-3.0-generate-002"],
  ["imagen-4-0-fast-generate-001", "imagen-4.0-fast-generate-001"],
  ["imagen-4-0-generate-001", "imagen-4.0-generate-001"],
  ["imagen-4-0-generate-preview-06-06", "imagen-4.0-generate-preview-06-06"],
  ["imagen-4-0-ultra-generate-001", "imagen-4.0-ultra-generate-001"],
  ["imagen-4-0-ultra-generate-preview-06-06", "imagen-4.0-ultra-generate-preview-06-06"],
].map(([slug, id]) => ({
  href: `/migrate/google-gemini-api__${slug}__to__google-gemini-api__gemini-nano-banana-2-1/`,
  label: `${id} to gemini-nano-banana-2.1`,
}));

const VEO_MIGRATIONS: BreakingMigration[] = [
  ["veo-3-0-fast-generate-preview", "veo-3.0-fast-generate-preview"],
  ["veo-3-0-generate-preview", "veo-3.0-generate-preview"],
  ["veo-3-1-fast-generate-preview", "veo-3.1-fast-generate-preview"],
  ["veo-3-1-generate-preview", "veo-3.1-generate-preview"],
  ["veo-3-1-lite-generate-preview", "veo-3.1-lite-generate-preview"],
].map(([slug, id]) => ({
  href: `/migrate/google-gemini-api__${slug}__to__google-gemini-api__gemini-omni-1-1-flash/`,
  label: `${id} to gemini-omni-1.1-flash`,
}));

export const BREAKING_CHANGE_PROVIDERS = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai", name: "OpenAI" },
  { id: "google-gemini-api", name: "Google Gemini API" },
  { id: "google-vertex", name: "Google Vertex AI" },
] as const;

export interface BreakingModel {
  id: string;
  provider: string;
  slug: string;
  /** rejects: this id fails the old setting. switch_from: a switch guide leaves this id for a model that fails it. */
  role: "rejects" | "switch_from";
}

export interface BreakingMigration {
  href: string;
  label: string;
}

export interface BreakingChange {
  id: string;
  provider: (typeof BREAKING_CHANGE_PROVIDERS)[number]["id"];
  provider_name: string;
  /** Family label from the source, when the source names a family as well as ids. */
  model_family: string | null;
  models: BreakingModel[];
  old_setting: string;
  what_happens: string;
  /** Exact sentence from source_url or quote_source_url. Null when neither page prints one. */
  error_text: string | null;
  fix: string;
  source_url: string;
  source_label: string;
  quote_source_url: string | null;
  quote_source_label: string | null;
  checked: string;
  /** Matching /errors/ page, or null when the rule has no error page. */
  error_page: string | null;
  migrations: BreakingMigration[];
  citations: string[];
  /**
   * Absent on older model-scoped rows. "api_version" means the rule follows the
   * provider API version, not one model id. models may be empty in that case.
   */
  scope?: "model" | "api_version";
  /** Set when scope is api_version. Absent on model-scoped rows. */
  api_version?: string;
}

export const BREAKING_CHANGES_CSV_HEADERS = [
  "id",
  "provider",
  "provider_name",
  "model_family",
  "model_ids",
  "switch_from_model_ids",
  "old_setting",
  "what_happens",
  "error_text",
  "fix",
  "source_url",
  "source_label",
  "quote_source_url",
  "checked",
  "error_page",
  "migrations",
  "citations",
  "scope",
  "api_version",
] as const;

export const breakingChangeHubFaqs: FaqItem[] = [
  {
    question: "Where is the list of settings that break when the model id changes?",
    answer:
      "On this page. The same rows are in [breaking-changes.json](/data/breaking-changes.json) and [breaking-changes.csv](/data/breaking-changes.csv). The license is CC BY 4.0. Credit SunsetDiff and link the license.",
  },
  {
    question: "Does every row quote the provider's error sentence?",
    answer:
      "A row includes error_text only when an official page or a public GitHub issue prints that sentence. When the source does not print one, error_text is null and the row says what the source says happens.",
  },
  {
    question: "Are shut-down model ids in this file?",
    answer:
      "No. A request that still sends a retired model id is on [Request errors](/errors/). This file is the old setting or endpoint that the replacement rejects.",
  },
];

function cited(urls: Array<string | null>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

function anthropic(id: string, slug: string, role: BreakingModel["role"]): BreakingModel {
  return { provider: "anthropic", id, slug, role };
}

function openai(id: string, slug: string, role: BreakingModel["role"]): BreakingModel {
  return { provider: "openai", id, slug, role };
}

function gemini(id: string, slug: string, role: BreakingModel["role"]): BreakingModel {
  return { provider: "google-gemini-api", id, slug, role };
}

const SONNET_FROM: BreakingModel[] = [
  anthropic("claude-sonnet-4-5-20250929", "claude-sonnet-4-5-20250929", "switch_from"),
  anthropic("claude-sonnet-4-20250514", "claude-sonnet-4-20250514", "switch_from"),
  anthropic("claude-3-7-sonnet-20250219", "claude-3-7-sonnet-20250219", "switch_from"),
];

export const breakingChanges: BreakingChange[] = [
  {
    id: "anthropic-sonnet-5-5-temperature",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"), ...SONNET_FROM],
    old_setting: "temperature set to a non-default value",
    what_happens:
      "claude-sonnet-5-5 returns HTTP 400. The Sonnet 5.5 migration guide prints the quoted sentence. Claude Sonnet 4.6 and earlier, and Claude Haiku 4.5, still accept temperature.",
    error_text: "temperature is deprecated for this model",
    fix: "Remove temperature from the request.",
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-temperature-is-deprecated-for-this-model/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-top-p-top-k",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"), ...SONNET_FROM],
    old_setting: "top_p or top_k set to a non-default value",
    what_happens:
      "The Sonnet 5.5 migration guide says a non-default top_p or top_k returns a 400 on claude-sonnet-5-5. It does not print a separate error sentence for those fields. Claude Sonnet 4.6 and earlier, and Claude Haiku 4.5, still accept them.",
    error_text: null,
    fix: "Remove top_p and top_k from the request.",
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-top-p-top-k/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-thinking-disabled",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [
      anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"),
      anthropic("claude-sonnet-5", "claude-sonnet-5", "switch_from"),
      ...SONNET_FROM,
    ],
    old_setting: 'thinking.type set to "disabled"',
    what_happens:
      "claude-sonnet-5-5 returns HTTP 400 invalid_request_error. The Sonnet 5.5 migration guide prints the quoted sentence. The guide's before example turns thinking off on Claude Sonnet 5 with thinking type disabled.",
    error_text:
      'To turn thinking off on this model, send "thinking": {"type": "between_tools"} instead of {"type": "disabled"}. The model does not think before responding. The short updates it writes between tool calls come back as thinking blocks.',
    fix: 'Send thinking type "between_tools". The guide accepts that value at low, medium, or high effort. between_tools takes no display, budget_tokens, or block_binding field.',
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-thinking-disabled/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-between-tools-effort",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"), ...SONNET_FROM],
    old_setting: 'thinking.type "between_tools" with output_config.effort "xhigh" or "max"',
    what_happens:
      "The Sonnet 5.5 migration guide says between_tools returns a 400 at xhigh or max effort. It does not print a separate error sentence. between_tools is accepted at low, medium, and high effort.",
    error_text: null,
    fix: "Set output_config.effort to low, medium, or high when thinking type is between_tools.",
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-thinking-disabled/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-thinking-budget",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"), ...SONNET_FROM],
    old_setting: 'thinking.type "enabled" with budget_tokens',
    what_happens:
      "claude-sonnet-5-5 returns HTTP 400. The Sonnet 5.5 migration guide prints the quoted sentence. The same guide says Claude Sonnet 4.6 still accepts budget_tokens as a deprecated setting, and Claude Sonnet 4.5 and Claude Haiku 4.5 use budget_tokens for all thinking. There is no fixed mapping from a token budget to an effort level.",
    error_text:
      '"thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.',
    fix: "Remove budget_tokens. Send thinking type adaptive and output_config.effort.",
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-thinking-budget/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-tool-choice",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "claude-sonnet-5-5",
    models: [anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"), ...SONNET_FROM],
    old_setting: 'tool_choice type "tool" or type "any"',
    what_happens:
      'claude-sonnet-5-5 returns HTTP 400, including on the token counting endpoint. The Sonnet 5.5 migration guide prints the quoted sentence. The guide says every earlier model on that page accepts tool_choice type "any" or "tool".',
    error_text: 'tool_choice: type "tool" and "any" are not supported for this model.',
    fix: 'Send tool_choice type "auto", set strict true on the tool, and say in the prompt when to call the tool.',
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-tool-choice-tool-and-any/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "anthropic-sonnet-5-5-assistant-prefill",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: "Claude Sonnet 4.6, Claude Sonnet 5, and claude-sonnet-5-5",
    models: [
      anthropic("claude-sonnet-5-5", "claude-sonnet-5-5", "rejects"),
      anthropic("claude-sonnet-4-6", "claude-sonnet-4-6", "rejects"),
      anthropic("claude-sonnet-5", "claude-sonnet-5", "rejects"),
      ...SONNET_FROM,
    ],
    old_setting: "a conversation whose last message is an assistant prefill",
    what_happens:
      "claude-sonnet-5-5, Claude Sonnet 4.6, and Claude Sonnet 5 return HTTP 400. The Sonnet 5.5 migration guide prints the quoted sentence. Claude Sonnet 4.5, Claude Haiku 4.5, and older models accept a prefilled last assistant turn.",
    error_text: "This model does not support assistant message prefill. The conversation must end with a user message.",
    fix: "End the conversation with a user message. For output format, use structured outputs. For a continuation, move the instruction into the user message.",
    source_url: SONNET_GUIDE,
    source_label: "Claude Sonnet 5.5 migration guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/claude-sonnet-5-5-assistant-prefill/",
    migrations: SONNET_MIGRATIONS,
    citations: cited([SONNET_GUIDE]),
  },
  {
    id: "openai-o-series-max-tokens",
    provider: "openai",
    provider_name: "OpenAI",
    model_family: "o-series models",
    models: [
      openai("o1", "o1", "rejects"),
      openai("o1-2024-12-17", "o1-2024-12-17", "rejects"),
      openai("o3-mini", "o3-mini", "rejects"),
      openai("o3-mini-2025-01-31", "o3-mini-2025-01-31", "rejects"),
      openai("o4-mini", "o4-mini", "rejects"),
      openai("o4-mini-2025-04-16", "o4-mini-2025-04-16", "rejects"),
      openai("o1-pro", "o1-pro", "rejects"),
    ],
    old_setting: "max_tokens",
    what_happens:
      "The Chat Completions reference says max_tokens is not compatible with o-series models. The quoted sentence was recorded for o1. This row does not claim that every newer OpenAI model returns that sentence.",
    error_text: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
    fix: "Send max_completion_tokens and omit max_tokens.",
    source_url: OPENAI_CHAT,
    source_label: "OpenAI Chat Completions reference",
    quote_source_url: ISSUE_MAX_TOKENS,
    quote_source_label: "GitHub issue openai/openai-python#2046",
    checked: CHECKED_ERRORS,
    error_page: "/errors/openai-max-tokens-use-max-completion-tokens/",
    migrations: O_SERIES_MIGRATIONS,
    citations: cited([OPENAI_CHAT, ISSUE_MAX_TOKENS]),
  },
  {
    id: "openai-gpt-6-luna-function-tools-reasoning-effort",
    provider: "openai",
    provider_name: "OpenAI",
    model_family: "gpt-6-luna",
    models: [
      openai("gpt-6-luna", "gpt-6-luna", "rejects"),
      openai("gpt-4o-mini-2024-07-18", "gpt-4o-mini-2024-07-18", "switch_from"),
      openai("gpt-4o-2024-08-06", "gpt-4o-2024-08-06", "switch_from"),
      openai("gpt-4o-2024-11-20", "gpt-4o-2024-11-20", "switch_from"),
    ],
    old_setting: "function tools on POST /v1/chat/completions when reasoning_effort is not none",
    what_happens:
      "gpt-6-luna returns the quoted sentence on Chat Completions. The model page says Chat Completions supports function calling only with reasoning_effort set to none, and to use the Responses API for function calling.",
    error_text: "Function tools with reasoning_effort are not supported for gpt-6-luna in /v1/chat/completions",
    fix: "Use the Responses API for function tools, or set reasoning_effort to none on Chat Completions.",
    source_url: LUNA_PAGE,
    source_label: "GPT-6 Luna model page",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_ERRORS,
    error_page: "/errors/gpt-6-luna-function-tools-reasoning-effort/",
    migrations: LUNA_MIGRATIONS,
    citations: cited([LUNA_PAGE]),
  },
  {
    id: "openai-gpt-6-1-sol-function-tools-chat-completions",
    provider: "openai",
    provider_name: "OpenAI",
    model_family: "gpt-6.1-sol and gpt-6-astra",
    models: [
      openai("gpt-6.1-sol", "gpt-6-1-sol", "rejects"),
      openai("gpt-6-astra", "gpt-6-astra", "rejects"),
    ],
    old_setting: "function tools on POST /v1/chat/completions",
    what_happens:
      "The GPT-6.1 Sol model page says Chat Completions is supported without tool calling, and that reasoning effort none is not supported. The Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but tool calling requires the Responses API. The quoted sentence was recorded for gpt-6.1-sol. It also tells you to set reasoning_effort to none. That value is not a fix for these two models.",
    error_text: SOL_TOOLS_ERROR,
    fix: "Call the Responses API for function tools. Do not set reasoning_effort to none on gpt-6.1-sol or gpt-6-astra.",
    source_url: SOL_61_PAGE,
    source_label: "GPT-6.1 Sol model page",
    quote_source_url: ISSUE_SOL_TOOLS,
    quote_source_label: "GitHub issue langflow-ai/openrag#2534",
    checked: "2026-10-25",
    error_page: "/errors/gpt-6-1-sol-function-tools-chat-completions/",
    migrations: [],
    citations: cited([SOL_61_PAGE, OPENAI_GPT6, ISSUE_SOL_TOOLS]),
  },
  {
    id: "openai-speech-to-realtime",
    provider: "openai",
    provider_name: "OpenAI",
    model_family: "Speech models whose replacement is gpt-realtime-2.1-mini",
    models: [
      openai("gpt-realtime-2.1-mini", "gpt-realtime-2-1-mini", "rejects"),
      openai("tts-1", "tts-1", "switch_from"),
      openai("tts-1-hd", "tts-1-hd", "switch_from"),
      openai("gpt-4o-mini-tts-2025-03-20", "gpt-4o-mini-tts-2025-03-20", "switch_from"),
      openai("gpt-4o-mini-tts-2025-12-15", "gpt-4o-mini-tts-2025-12-15", "switch_from"),
    ],
    old_setting: "POST /v1/audio/speech (client.audio.speech.create) with model gpt-realtime-2.1-mini",
    what_happens:
      "The text-to-speech guide says this is a change of API workflow: gpt-realtime-2.1-mini is not a supported model for /v1/audio/speech. The deprecations page says these speech models are removed on January 6, 2027, names gpt-realtime-2.1-mini, and points to the Realtime API guide. Those pages do not print an error sentence.",
    error_text: null,
    fix: "Keep the current speech model on POST /v1/audio/speech until shutdown. To move to gpt-realtime-2.1-mini, use the Realtime API. Do not send that model id to /v1/audio/speech.",
    source_url: OPENAI_TTS,
    source_label: "OpenAI text-to-speech guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_LATER,
    error_page: null,
    migrations: SPEECH_MIGRATIONS,
    citations: cited([OPENAI_TTS, OPENAI_DEPRECATIONS, OPENAI_REALTIME]),
  },
  {
    id: "openai-file-transcription-to-realtime",
    provider: "openai",
    provider_name: "OpenAI",
    model_family: "File transcription models whose replacement is gpt-live-transcribe",
    models: [
      openai("gpt-live-transcribe", "gpt-live-transcribe", "rejects"),
      openai("whisper-1", "whisper-1", "switch_from"),
      openai("gpt-4o-transcribe", "gpt-4o-transcribe", "switch_from"),
      openai("gpt-4o-mini-transcribe", "gpt-4o-mini-transcribe", "switch_from"),
      openai("gpt-4o-transcribe-diarize", "gpt-4o-transcribe-diarize", "switch_from"),
    ],
    old_setting: "POST /v1/audio/transcriptions (client.audio.transcriptions.create) with model gpt-live-transcribe",
    what_happens:
      "The speech-to-text guide says file transcription sends the audio file to POST /v1/audio/transcriptions. The realtime transcription guide says gpt-live-transcribe is a realtime transcription session (session type transcription, WebSocket or WebRTC), not that file endpoint. It also says gpt-live-transcribe does not return word-level timestamps, speaker labels, or transcription confidence scores. Those pages do not print an error sentence.",
    error_text: null,
    fix: "For a recorded file, the speech-to-text guide says to start with gpt-transcribe on POST /v1/audio/transcriptions. gpt-live-transcribe is a realtime session, so it is not a model-id swap on the file endpoint.",
    source_url: OPENAI_LIVE_STT,
    source_label: "OpenAI realtime transcription guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_LATER,
    error_page: null,
    migrations: LIVE_TRANSCRIBE_MIGRATIONS,
    citations: cited([OPENAI_LIVE_STT, OPENAI_STT]),
  },
  {
    id: "google-vertex-gemini-4-argon-thinking-budget",
    provider: "google-vertex",
    provider_name: "Google Vertex AI",
    model_family: "gemini-4-argon",
    models: [{ provider: "google-vertex", id: "gemini-4-argon", slug: "gemini-4-argon", role: "rejects" }],
    old_setting: "thinkingBudget, including a gateway that maps reasoning_effort to thinkingBudget",
    what_happens:
      "GitHub issue gravitee-io/issues#11964 records HTTP 400 from Vertex for gemini-4-argon when thinkingBudget is sent. The JSON message is the quoted sentence, then a link to the thinking guide. A direct Vertex call with generationConfig.thinkingConfig.thinkingLevel set to LOW returned 200. Issue can1357/oh-my-pi#16350 records a shorter sentence for gemma-4-26b-a4b-it and gemma-4-31b-it. Those gemma ids are not SunsetDiff model records, so this row does not list them.",
    error_text: "Thinking budget is not supported for this model. Use thinking level instead.",
    fix: "Send thinkingLevel instead of thinkingBudget. The thinking guide calls the parameter thinking_level. Its sample uses gemini-3.8-flash. The guide's table lists low, medium, and high for gemini-4-argon.",
    source_url: ISSUE_THINKING_BUDGET,
    source_label: "GitHub issue gravitee-io/issues#11964",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_LATER,
    error_page: "/errors/gemini-thinking-budget-not-supported-use-thinking-level/",
    migrations: [],
    citations: cited([ISSUE_THINKING_BUDGET, GEMINI_THINKING, ISSUE_GEMMA_THINKING]),
  },
  {
    id: "google-gemini-imagen-to-interactions",
    provider: "google-gemini-api",
    provider_name: "Google Gemini API",
    model_family: "Imagen models whose replacement is gemini-nano-banana-2.1",
    models: [
      gemini("gemini-nano-banana-2.1", "gemini-nano-banana-2-1", "rejects"),
      gemini("imagen-3.0-generate-002", "imagen-3-0-generate-002", "switch_from"),
      gemini("imagen-4.0-fast-generate-001", "imagen-4-0-fast-generate-001", "switch_from"),
      gemini("imagen-4.0-generate-001", "imagen-4-0-generate-001", "switch_from"),
      gemini("imagen-4.0-generate-preview-06-06", "imagen-4-0-generate-preview-06-06", "switch_from"),
      gemini("imagen-4.0-ultra-generate-001", "imagen-4-0-ultra-generate-001", "switch_from"),
      gemini("imagen-4.0-ultra-generate-preview-06-06", "imagen-4-0-ultra-generate-preview-06-06", "switch_from"),
    ],
    old_setting: "client.models.generate_images",
    what_happens:
      "The Imagen page says Imagen models are shut down and to use Nano Banana. It says to call client.models.generate_content instead of client.models.generate_images. The image generation guide's text-to-image sample for gemini-nano-banana-2.1 uses client.interactions.create and POST https://generativelanguage.googleapis.com/v1beta/interactions. Neither page prints an error sentence, and neither shows a sample that only swaps the model id.",
    error_text: null,
    fix: "Do not put an Imagen model id or gemini-nano-banana-2.1 into generate_images. Use the call the Imagen page names, or the interactions sample on the image generation guide.",
    source_url: GEMINI_IMAGEN,
    source_label: "Gemini API Imagen page",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_LATER,
    error_page: null,
    migrations: IMAGEN_MIGRATIONS,
    citations: cited([GEMINI_IMAGEN, GEMINI_IMAGE]),
  },
  {
    id: "google-gemini-veo-to-generate-content",
    provider: "google-gemini-api",
    provider_name: "Google Gemini API",
    model_family: "Veo preview models whose replacement is gemini-omni-1.1-flash",
    models: [
      gemini("gemini-omni-1.1-flash", "gemini-omni-1-1-flash", "rejects"),
      gemini("veo-3.0-fast-generate-preview", "veo-3-0-fast-generate-preview", "switch_from"),
      gemini("veo-3.0-generate-preview", "veo-3-0-generate-preview", "switch_from"),
      gemini("veo-3.1-fast-generate-preview", "veo-3-1-fast-generate-preview", "switch_from"),
      gemini("veo-3.1-generate-preview", "veo-3-1-generate-preview", "switch_from"),
      gemini("veo-3.1-lite-generate-preview", "veo-3-1-lite-generate-preview", "switch_from"),
    ],
    old_setting: "client.models.generate_videos or POST /v1beta/models/{model}:predictLongRunning",
    what_happens:
      "The Veo guide's samples call client.models.generate_videos and POST https://generativelanguage.googleapis.com/v1beta/models/{id}:predictLongRunning with a Veo model id. The same page says to migrate to gemini-omni-1.1-flash and says this feature is currently only available with the generateContent API. No generate_videos sample for gemini-omni-1.1-flash was on that page. The page does not print an error sentence.",
    error_text: null,
    fix: "Do not put gemini-omni-1.1-flash into generate_videos. The Veo guide says the replacement uses the generateContent API.",
    source_url: GEMINI_VEO,
    source_label: "Gemini API Veo guide",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_LATER,
    error_page: null,
    migrations: VEO_MIGRATIONS,
    citations: cited([GEMINI_VEO]),
  },
  {
    id: "anthropic-api-2026-10-21-sampling-params",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: null,
    models: [],
    scope: "api_version",
    api_version: "2026-10-21",
    old_setting: "temperature, top_p, or top_k on API version 2026-10-21",
    what_happens:
      "Under API version 2026-10-21, a request that sends temperature, top_p, or top_k returns a 400 on every model, even at the parameter's default value. The migration guide says this applies to the Messages API (POST /v1/messages), to token counting, and to each request in a Message Batch created with 2026-10-21. Models that already accept only the defaults, such as Claude 4.7 and later models, sample as before once the parameters are removed. On models that accept other values, such as Claude Sonnet 4.6, a request that lowered temperature for more consistent output loses that effect. No other setting replaces it. The versioning page states: " +
      BEDROCK_CAVEAT +
      " " +
      API_SDK_MAJORS +
      " The versioning page and the migration guide do not print an error sentence.",
    error_text: null,
    fix: `Remove temperature, top_p, and top_k. If the request needs a non-default value, the migration guide says to keep that request on 2023-06-01. ${API_VERSION_FIX_KEEP}`,
    source_url: CLAUDE_MIGRATION_2026,
    source_label: "Migrating to Claude API version 2026-10-21",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_VERSION,
    error_page: "/errors/claude-api-2026-10-21-sampling-params-400/",
    migrations: [],
    citations: cited([CLAUDE_MIGRATION_2026, CLAUDE_VERSIONING]),
  },
  {
    id: "anthropic-api-2026-10-21-assistant-document",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: null,
    models: [],
    scope: "api_version",
    api_version: "2026-10-21",
    old_setting: "a document block placed directly in an assistant message on API version 2026-10-21",
    what_happens:
      "Under API version 2026-10-21, a request that places a document block directly in an assistant message returns a 400. The migration guide says to send documents in user messages instead. A document nested inside another block, such as a web fetch tool result that Claude returned, is still accepted. The same section applies to the Messages API, token counting, and each request in a Message Batch created with 2026-10-21. The versioning page also says the 400 covers a document block placed directly in an assistant message. The versioning page states: " +
      BEDROCK_CAVEAT +
      " The pages do not print an error sentence.",
    error_text: null,
    fix: `Send document blocks in user messages. A request kept on 2023-06-01 is outside this version. ${API_VERSION_FIX_KEEP}`,
    source_url: CLAUDE_MIGRATION_2026,
    source_label: "Migrating to Claude API version 2026-10-21",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_VERSION,
    error_page: null,
    migrations: [],
    citations: cited([CLAUDE_MIGRATION_2026, CLAUDE_VERSIONING]),
  },
  {
    id: "anthropic-api-2026-10-21-user-citations",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: null,
    models: [],
    scope: "api_version",
    api_version: "2026-10-21",
    old_setting: "a text block with a non-empty citations array in a user message on API version 2026-10-21",
    what_happens:
      "Under API version 2026-10-21, sending a text block with a non-empty citations array in a user message returns a 400. The versioning page says this includes a text block sent directly or inside a search_result block. The migration guide says to remove citations from those blocks. Citations on text blocks in assistant messages, such as Claude's earlier replies that you send back, are still accepted, and so is the citations enabled setting on documents and search results. The same section applies to the Messages API, token counting, and each request in a Message Batch created with 2026-10-21. The versioning page states: " +
      BEDROCK_CAVEAT +
      " The pages do not print an error sentence.",
    error_text: null,
    fix: `Remove citations from text blocks in user messages. A request kept on 2023-06-01 is outside this version. ${API_VERSION_FIX_KEEP}`,
    source_url: CLAUDE_VERSIONING,
    source_label: "Claude API versioning",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_VERSION,
    error_page: null,
    migrations: [],
    citations: cited([CLAUDE_VERSIONING, CLAUDE_MIGRATION_2026]),
  },
  {
    id: "anthropic-api-2026-10-21-authorization-header",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: null,
    models: [],
    scope: "api_version",
    api_version: "2026-10-21",
    old_setting: "reading the API key from the X-Api-Key header after the SDK or CLI majors that send 2026-10-21",
    what_happens:
      "The migration guide says the SDK and the CLI send the API key as Authorization: Bearer instead of in the X-Api-Key header. It says to change any proxy or gateway that reads or sets X-Api-Key to use Authorization, or send the key in X-Api-Key yourself. The Claude API accepts a key in either header, so a program that talks to the API directly needs no change. " +
      API_SDK_MAJORS +
      " The versioning page states: " +
      BEDROCK_CAVEAT +
      " The page does not print an error sentence for this header change.",
    error_text: null,
    fix: "Change a proxy or gateway that reads or sets X-Api-Key to use Authorization, or send the key in X-Api-Key yourself. A program that talks to the Claude API directly needs no change for this header.",
    source_url: CLAUDE_MIGRATION_2026,
    source_label: "Migrating to Claude API version 2026-10-21",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_VERSION,
    error_page: null,
    migrations: [],
    citations: cited([CLAUDE_MIGRATION_2026, CLAUDE_VERSIONING]),
  },
  {
    id: "anthropic-api-2026-10-21-message-param-union",
    provider: "anthropic",
    provider_name: "Anthropic",
    model_family: null,
    models: [],
    scope: "api_version",
    api_version: "2026-10-21",
    old_setting: "calling MessageParam or BetaMessageParam as one type for every role",
    what_happens:
      "The migration guide says MessageParam was one type for all roles and is now a union of UserMessageParam, AssistantMessageParam, and SystemMessageParam. BetaMessageParam is split the same way, into BetaUserMessageParam, BetaAssistantMessageParam, and BetaSystemMessageParam. Calling either name raises a TypeError. GitHub issue pydantic/pydantic-ai#10923 records that anthropic 2.0.0 makes every pydantic-ai Anthropic request fail before it is sent, because BetaMessageParam is now a union, and the recorded exception is TypeError: Cannot instantiate typing.Union. " +
      API_SDK_MAJORS +
      " The versioning page states: " +
      BEDROCK_CAVEAT,
    error_text: null,
    fix: "The migration guide says to write the message as a dict, or subclass the type for the role, such as UserMessageParam. The pydantic-ai issue says the call sites can build the role-specific types or plain dicts.",
    source_url: CLAUDE_MIGRATION_2026,
    source_label: "Migrating to Claude API version 2026-10-21",
    quote_source_url: null,
    quote_source_label: null,
    checked: CHECKED_VERSION,
    error_page: null,
    migrations: [],
    citations: cited([CLAUDE_MIGRATION_2026, ISSUE_MESSAGE_PARAM, CLAUDE_VERSIONING]),
  },
];

export function breakingChangesChecked(): string {
  return breakingChanges.reduce((newest, rule) => (rule.checked > newest ? rule.checked : newest), "");
}

export function breakingChangesForProvider(provider: string): BreakingChange[] {
  return breakingChanges.filter((rule) => rule.provider === provider);
}

export function breakingChangesForModel(provider: string, modelId: string): BreakingChange[] {
  return breakingChanges.filter((rule) => rule.models.some((model) => model.provider === provider && model.id === modelId));
}

export function breakingChangesForMigration(pair: string): BreakingChange[] {
  const href = `/migrate/${pair}/`;
  return breakingChanges.filter((rule) => rule.migrations.some((migration) => migration.href === href));
}

export function rejectingModels(rule: BreakingChange): BreakingModel[] {
  return rule.models.filter((model) => model.role === "rejects");
}

export function breakingChangeScope(rule: BreakingChange): "model" | "api_version" {
  return rule.scope ?? "model";
}

export function breakingChangesDocument() {
  return {
    name: "SunsetDiff request breaking changes",
    publisher: "SunsetDiff",
    license: BREAKING_CHANGES_LICENSE,
    description:
      "Request settings and endpoints a replacement model rejects, plus API-version rules that apply to every model on that version. One rule per row. error_text is copied from the cited page, or null when that page does not print a sentence. scope and api_version are omitted on model-scoped rows. Retired model ids are not in this file.",
    version: breakingChangesChecked(),
    rules: breakingChanges,
  };
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function joinedIds(rule: BreakingChange, role: BreakingModel["role"]): string {
  return rule.models
    .filter((model) => model.role === role)
    .map((model) => `${model.provider}:${model.id}`)
    .join("; ");
}

export function breakingChangesCsv(): string {
  const lines = [BREAKING_CHANGES_CSV_HEADERS.join(",")];
  for (const rule of breakingChanges) {
    const row: Record<(typeof BREAKING_CHANGES_CSV_HEADERS)[number], string> = {
      id: rule.id,
      provider: rule.provider,
      provider_name: rule.provider_name,
      model_family: rule.model_family ?? "",
      model_ids: joinedIds(rule, "rejects"),
      switch_from_model_ids: joinedIds(rule, "switch_from"),
      old_setting: rule.old_setting,
      what_happens: rule.what_happens,
      error_text: rule.error_text ?? "",
      fix: rule.fix,
      source_url: rule.source_url,
      source_label: rule.source_label,
      quote_source_url: rule.quote_source_url ?? "",
      checked: rule.checked,
      error_page: rule.error_page ?? "",
      migrations: rule.migrations.map((migration) => migration.href).join("; "),
      citations: rule.citations.join(" "),
      scope: rule.scope ?? "",
      api_version: rule.api_version ?? "",
    };
    lines.push(BREAKING_CHANGES_CSV_HEADERS.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function breakingChangesDatasetGraph(site: string) {
  const hub = new URL(BREAKING_CHANGES_PATH, site).href;
  return {
    "@type": "Dataset",
    name: "SunsetDiff request breaking changes",
    description:
      "Request settings and endpoints a replacement AI model rejects, plus API-version rules, one sourced rule per row. error_text is quoted only when the cited page prints it.",
    url: hub,
    license: BREAKING_CHANGES_LICENSE,
    creator: { "@type": "Organization", name: "SunsetDiff" },
    dateModified: breakingChangesChecked(),
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: new URL(BREAKING_CHANGES_JSON, site).href,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: new URL(BREAKING_CHANGES_CSV, site).href,
      },
    ],
  };
}
