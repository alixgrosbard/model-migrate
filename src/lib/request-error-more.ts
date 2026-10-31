import type { RequestErrorPage } from "./request-errors.ts";

const SONNET_GUIDE = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_ERRORS = "https://developers.openai.com/api/docs/guides/error-codes";
const OPENAI_CHAT = "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/";
const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const LITELLM_DROP = "https://docs.litellm.ai/docs/completion/drop_params";
const LITELLM_INPUT = "https://docs.litellm.ai/docs/completion/input";
const LITELLM_GEMINI = "https://docs.litellm.ai/docs/providers/gemini";
const LITELLM_ANTHROPIC = "https://docs.litellm.ai/docs/providers/anthropic";
const AI_SDK_GENERATE = "https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text";
const AI_SDK_OPENAI = "https://ai-sdk.dev/docs/guides/openai";
const AI_SDK_ANTHROPIC = "https://ai-sdk.dev/v5/providers/ai-sdk-providers/anthropic";
const ISSUE_VISION = "https://github.com/excalidraw/excalidraw/issues/8209";
const ISSUE_GPT4_0314 = "https://github.com/BerriAI/litellm/pull/23747";
const ISSUE_GEMINI_GONE = "https://github.com/google/adk-python/issues/6010";
const ISSUE_GEMINI_NEW_USERS = "https://github.com/googleapis/python-genai/issues/2087";
const ISSUE_MAX_TOKENS = "https://github.com/openai/openai-python/issues/2046";
const OPENAI_GPT6 = "https://developers.openai.com/api/docs/guides/latest-model";
const ISSUE_TEMPERATURE = "https://github.com/neondatabase/neon-pkgs/issues/937";
const ISSUE_NANO_SHUTDOWN = "https://github.com/maxswaine/game-repository/issues/110";
const ISSUE_GEMINI_25 = "https://github.com/LebgaaAbderrahmane/ecomAssistant/issues/92";
const AZURE_RETIREMENTS = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
const AZURE_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const DEEPSEEK_UPDATES = "https://api-docs.deepseek.com/updates/";
const DEEPSEEK_NEWS = "https://api-docs.deepseek.com/news/news260424/";
const DEEPSEEK_PRICING = "https://api-docs.deepseek.com/quick_start/pricing";
const DEEPSEEK_QUICK_START = "https://api-docs.deepseek.com/";
const DEEPSEEK_THINKING = "https://api-docs.deepseek.com/guides/thinking_mode";
const DEEPSEEK_ERRORS = "https://api-docs.deepseek.com/quick_start/error_codes";
const DEEPSEEK_WORKBUDDY = "https://api-docs.deepseek.com/quick_start/agent_integrations/workbuddy";
const ISSUE_DEEPSEEK_GOOSE = "https://github.com/aaif-goose/goose/issues/13114";
const ISSUE_DEEPSEEK_NOFX = "https://github.com/NoFxAiOS/nofx/issues/912";
const ISSUE_DEEPSEEK_ASTRBOT = "https://github.com/AstrBotDevs/AstrBot/issues/7286";
const DEEPSEEK_MODEL_NOT_EXIST =
  '{"error":{"message":"Model Not Exist","type":"invalid_request_error","param":null,"code":"invalid_request_error"}}';
const TEMPERATURE_UNSUPPORTED = "Unsupported parameter: 'temperature' is not supported with this model.";
const TOP_P_UNSUPPORTED = "Unsupported parameter: 'top_p' is not supported with this model.";
const GEMINI_25_NEW_USERS = "models/gemini-2.5-flash is no longer available to new users";

const SONNET_GUIDES = [
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

const THINKING_OFF =
  'To turn thinking off on this model, send "thinking": {"type": "between_tools"} instead of {"type": "disabled"}. The model does not think before responding. The short updates it writes between tool calls come back as thinking blocks.';

const THINKING_BUDGET =
  '"thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.';

const TOOL_CHOICE = 'tool_choice: type "tool" and "any" are not supported for this model.';

const PREFILL = "This model does not support assistant message prefill. The conversation must end with a user message.";

const CLAUDE_VERSIONING = "https://platform.claude.com/docs/en/api/versioning";

export const API_VERSION_SAMPLING_NOTE = {
  text: "API version 2026-10-21: sending temperature, top_p, or top_k returns a 400 on every model, even at the default value.",
  href: "/errors/claude-api-2026-10-21-sampling-params-400/",
  label: "API version 2026-10-21 sampling parameters",
  sourceLabel: "Claude API versioning",
  sourceUrl: CLAUDE_VERSIONING,
  checked: "2026-10-22",
};

const VISION_DEPRECATED =
  "The model `gpt-4-vision-preview` has been deprecated, learn more here: https://platform.openai.com/docs/deprecations";

const GPT4_0314_DEPRECATED =
  "The model `gpt-4-0314` has been deprecated, learn more here: https://platform.openai.com/docs/deprecations";

const GEMINI_GONE =
  "This model models/gemini-2.0-flash is no longer available. Please update your code to use a newer model for the latest features and improvements.";

const GEMINI_NEW_USERS =
  "This model models/gemini-2.0-flash is no longer available to new users. Please update your code to use a newer model for the latest features and improvements.";

const MAX_TOKENS =
  "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.";
const OPENAI_RESPONSES = "https://developers.openai.com/api/reference/resources/responses/methods/create/";
const OPENAI_CHANGELOG = "https://developers.openai.com/api/docs/changelog";
const USER_FIELD_REPLACED =
  "This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations.";

export const moreRequestErrors: RequestErrorPage[] = [
  {
    slug: "claude-sonnet-5-5-thinking-disabled",
    provider: "anthropic",
    cause: "thinking type disabled on claude-sonnet-5-5.",
    title: "thinking disabled is rejected on claude-sonnet-5-5 | SunsetDiff",
    description:
      'claude-sonnet-5-5 returns HTTP 400 for thinking type disabled. Send thinking type between_tools instead. Source: Anthropic\'s Sonnet 5.5 migration guide.',
    h1: THINKING_OFF,
    lead: "A request that sets thinking to disabled fails on claude-sonnet-5-5. The migration guide says to send between_tools when you want no up-front thinking.",
    errorQuoted: true,
    errorText: THINKING_OFF,
    rule: 'The Sonnet 5.5 migration guide says thinking type disabled returns a 400 invalid_request_error on claude-sonnet-5-5. Claude Sonnet 5 turns thinking off with that setting. between_tools is accepted at low, medium, and high effort. At xhigh or max it returns a 400. between_tools takes no display, budget_tokens, or block_binding field.',
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: "Returns 400 for thinking type disabled. Use between_tools to skip up-front thinking.",
      },
      {
        id: "claude-sonnet-5",
        provider: "anthropic",
        slug: "claude-sonnet-5",
        note: "The migration guide's before example turns thinking off with thinking type disabled.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Replace thinking type disabled with between_tools, and set effort to high or lower. The migration guide's after request uses effort high.",
        ],
        samples: [
          {
            caption: "Before (Claude Sonnet 5)",
            code: `client.messages.create(
    model="claude-sonnet-5",
    max_tokens=16000,
    thinking={"type": "disabled"},
    output_config={"effort": "xhigh"},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "After (claude-sonnet-5-5)",
            code: `client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    thinking={"type": "between_tools"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          "Do not send thinking type disabled. LiteLLM's Anthropic page documents passing a thinking object on completion(). The migration guide's working value is between_tools. That LiteLLM page does not name claude-sonnet-5-5, so confirm the forwarded body.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
    messages=[{"role": "user", "content": "Hello"}],
    thinking={"type": "between_tools"},
)
`,
          },
        ],
        sourceLabel: "LiteLLM Anthropic provider",
        sourceUrl: LITELLM_ANTHROPIC,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "Do not send thinking type disabled. The AI SDK Anthropic docs show providerOptions.anthropic.thinking set to adaptive, and they say the provider removes disabled for claude-opus-5-5, claude-fable-5, and claude-fable-5-1. Those docs do not list between_tools and do not name claude-sonnet-5-5 for that removal. Use the raw request when you need between_tools.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  prompt: "Hello",
  providerOptions: {
    anthropic: {
      thinking: { type: "adaptive" },
      effort: "high",
    } satisfies AnthropicProviderOptions,
  },
});
`,
          },
        ],
        sourceLabel: "AI SDK Anthropic provider",
        sourceUrl: AI_SDK_ANTHROPIC,
      },
    ],
    guides: SONNET_GUIDES,
    faqs: [
      {
        question: "What do I send instead of thinking disabled?",
        answer:
          'thinking type between_tools, at low, medium, or high effort. The migration guide says xhigh and max return a 400 with between_tools. Switch guide: [claude-sonnet-4-5-20250929 to claude-sonnet-5-5](/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/).',
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_ANTHROPIC, AI_SDK_ANTHROPIC],
  },
  {
    slug: "claude-sonnet-5-5-thinking-budget",
    provider: "anthropic",
    cause: "thinking type enabled with budget_tokens on claude-sonnet-5-5.",
    title: "thinking.type.enabled is not supported on claude-sonnet-5-5 | SunsetDiff",
    description:
      "claude-sonnet-5-5 returns HTTP 400 for a thinking budget. Use adaptive thinking and output_config.effort. Source: Anthropic's Sonnet 5.5 migration guide.",
    h1: THINKING_BUDGET,
    lead: "A request that sends thinking type enabled and budget_tokens fails on claude-sonnet-5-5. Remove the budget and set an effort level.",
    errorQuoted: true,
    errorText: THINKING_BUDGET,
    rule: "The Sonnet 5.5 migration guide says Claude Sonnet 4.6 still accepts thinking type enabled with budget_tokens as a deprecated setting, and Claude Sonnet 4.5 and Claude Haiku 4.5 use that setting for all thinking. claude-sonnet-5-5 returns a 400. There is no fixed mapping from a budget to an effort level.",
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: "Returns 400 for thinking type enabled. Use adaptive thinking and output_config.effort.",
      },
      {
        id: "claude-sonnet-4-6",
        provider: "anthropic",
        slug: "claude-sonnet-4-6",
        note: "The migration guide says this model still accepts budget_tokens as a deprecated setting.",
      },
      {
        id: "claude-sonnet-4-5-20250929",
        provider: "anthropic",
        slug: "claude-sonnet-4-5-20250929",
        note: "The migration guide says Claude Sonnet 4.5 uses budget_tokens for all thinking.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Remove budget_tokens. The migration guide's after request uses thinking type adaptive and output_config.effort. The guide's example uses high, and it also lists max, xhigh, medium, and low.",
        ],
        samples: [
          {
            caption: "Before",
            code: `client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "After",
            code: `client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          "Do not send thinking type enabled with budget_tokens. LiteLLM documents a thinking parameter on Anthropic calls. Pass the adaptive object from the migration guide. LiteLLM's reasoning_effort map is documented for Claude 4.6 and 4.7, not for claude-sonnet-5-5.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
    messages=[{"role": "user", "content": "Hello"}],
    thinking={"type": "adaptive"},
)
`,
          },
        ],
        sourceLabel: "LiteLLM Anthropic provider",
        sourceUrl: LITELLM_ANTHROPIC,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "The AI SDK Anthropic docs show thinking type adaptive plus effort on providerOptions.anthropic. They also say the provider converts thinking type enabled with budgetTokens to adaptive for claude-opus-5-5, claude-fable-5, and claude-fable-5-1. They do not name claude-sonnet-5-5 for that conversion, so set adaptive yourself.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  prompt: "Hello",
  providerOptions: {
    anthropic: {
      thinking: { type: "adaptive" },
      effort: "high",
    } satisfies AnthropicProviderOptions,
  },
});
`,
          },
        ],
        sourceLabel: "AI SDK Anthropic provider",
        sourceUrl: AI_SDK_ANTHROPIC,
      },
    ],
    guides: SONNET_GUIDES,
    faqs: [
      {
        question: "What replaces budget_tokens?",
        answer:
          "output_config.effort, with thinking type adaptive. The migration guide says there is no fixed mapping from a token budget to an effort level.",
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_ANTHROPIC, AI_SDK_ANTHROPIC],
  },
  {
    slug: "claude-sonnet-5-5-tool-choice-tool-and-any",
    provider: "anthropic",
    cause: 'tool_choice type "tool" or "any" on claude-sonnet-5-5.',
    title: 'tool_choice type "tool" and "any" are not supported | SunsetDiff',
    description:
      'claude-sonnet-5-5 returns HTTP 400 for tool_choice type tool or any. Send type auto. Source: Anthropic\'s Sonnet 5.5 migration guide.',
    h1: TOOL_CHOICE,
    lead: "Forcing a tool with tool_choice type tool or any fails on claude-sonnet-5-5, including on the token counting endpoint. Send type auto.",
    errorQuoted: true,
    errorText: TOOL_CHOICE,
    rule: 'The Sonnet 5.5 migration guide says every earlier model on that page accepts tool_choice type any or tool. claude-sonnet-5-5 rejects both with a 400. Send tool_choice type auto, mark the tool strict so its input matches the schema, and say in the prompt when to use the tool. The model can answer without calling it.',
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: 'Returns 400 for tool_choice type "tool" and type "any".',
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "The migration guide's after request uses tool_choice type auto, strict true on the tool, and a user message that says when to call the tool.",
        ],
        samples: [
          {
            caption: "Before",
            code: `client.messages.create(
    model="claude-sonnet-5",
    max_tokens=1024,
    tools=[{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
            "additionalProperties": False,
        },
    }],
    tool_choice={"type": "tool", "name": "get_weather"},
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
)
`,
          },
          {
            caption: "After",
            code: `client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    tools=[{
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"],
            "additionalProperties": False,
        },
        "strict": True,
    }],
    tool_choice={"type": "auto"},
    messages=[{
        "role": "user",
        "content": "What's the weather in Paris? Use the get_weather tool.",
    }],
)
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          'LiteLLM\'s Anthropic page shows tool_choice set to "auto", and it also shows a type tool example on claude-sonnet-5. Do not send type tool or any to claude-sonnet-5-5. Send auto.',
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
    messages=[{"role": "user", "content": "What's the weather in Paris? Use the get_weather tool."}],
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
    tool_choice="auto",
)
`,
          },
        ],
        sourceLabel: "LiteLLM Anthropic provider",
        sourceUrl: LITELLM_ANTHROPIC,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          'generateText documents toolChoice "auto", "none", "required", and a named tool. "auto" is the default. The Anthropic provider docs say a required or named toolChoice is downgraded to auto for claude-opus-5-5 and claude-fable-5-1. They do not say that for claude-sonnet-5-5, so set toolChoice to "auto" yourself and say in the prompt when to call the tool.',
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  prompt: "What's the weather in Paris? Use the get_weather tool.",
  toolChoice: "auto",
  tools: {
    get_weather: tool({
      description: "Get the current weather in a given location",
      inputSchema: z.object({ location: z.string() }),
    }),
  },
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: SONNET_GUIDES,
    faqs: [
      {
        question: "Can I still force a tool?",
        answer:
          "Not with tool_choice. The migration guide says to send type auto, set strict true, and say in the prompt when the tool applies. The model can still answer in text.",
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_ANTHROPIC, AI_SDK_GENERATE],
  },
  {
    slug: "claude-sonnet-5-5-assistant-prefill",
    provider: "anthropic",
    cause: "A conversation that ends on an assistant message sent to claude-sonnet-5-5.",
    title: "This model does not support assistant message prefill | SunsetDiff",
    description:
      "claude-sonnet-5-5 returns HTTP 400 when the last message is an assistant prefill. End on a user message. Source: Anthropic's Sonnet 5.5 migration guide.",
    h1: PREFILL,
    lead: "claude-sonnet-5-5 rejects a prefilled last assistant turn. The conversation has to end with a user message.",
    errorQuoted: true,
    errorText: PREFILL,
    rule: "The Sonnet 5.5 migration guide says claude-sonnet-5-5 rejects a prefilled last assistant turn with a 400, as Claude Sonnet 4.6 and Claude Sonnet 5 do. Claude Sonnet 4.5, Claude Haiku 4.5, and older models accept one. For output format, use structured outputs. For a continuation, move the instruction into the user message.",
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: "Returns 400 when the last message is an assistant prefill.",
      },
      {
        id: "claude-sonnet-4-6",
        provider: "anthropic",
        slug: "claude-sonnet-4-6",
        note: "The migration guide says this model also rejects assistant prefill.",
      },
      {
        id: "claude-sonnet-5",
        provider: "anthropic",
        slug: "claude-sonnet-5",
        note: "The migration guide says this model also rejects assistant prefill.",
      },
      {
        id: "claude-sonnet-4-5-20250929",
        provider: "anthropic",
        slug: "claude-sonnet-4-5-20250929",
        note: "The migration guide says Claude Sonnet 4.5 still accepts a prefilled last assistant turn.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "End the messages array on a user turn. The migration guide's continuation example puts the interrupted text in the user message.",
        ],
        samples: [
          {
            caption: "Before",
            code: `client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Write a title"},
        {"role": "assistant", "content": "Title:"},
    ],
)
`,
          },
          {
            caption: "After",
            code: `client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Your previous response was interrupted and ended with Title:. Continue from where you left off.",
        },
    ],
)
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM sends the messages array you pass. Do not leave the last message as role assistant. End on a user message, the same way the migration guide describes.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
    messages=[{
        "role": "user",
        "content": "Answer with the title only.",
    }],
)
`,
          },
        ],
        sourceLabel: "LiteLLM Anthropic provider",
        sourceUrl: LITELLM_ANTHROPIC,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "generateText's prompt is a user turn. If you pass messages, the last message has to be a user message. Do not append an assistant prefill.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  prompt: "Answer with the title only.",
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: SONNET_GUIDES,
    faqs: [
      {
        question: "Which older models still allow prefill?",
        answer:
          "The migration guide says Claude Sonnet 4.5, Claude Haiku 4.5, and older models accept a prefilled last assistant turn. Claude Sonnet 4.6, Claude Sonnet 5, and claude-sonnet-5-5 reject it.",
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_ANTHROPIC, AI_SDK_GENERATE],
  },
  {
    slug: "claude-sonnet-5-5-top-p-top-k",
    provider: "anthropic",
    cause: "A non-default top_p or top_k on claude-sonnet-5-5.",
    title: "top_p and top_k return a 400 on claude-sonnet-5-5 | SunsetDiff",
    description:
      "claude-sonnet-5-5 returns HTTP 400 when top_p or top_k is not the default. Anthropic's migration guide does not print a separate error sentence for those fields. Remove them.",
    h1: "top_p and top_k return a 400 on claude-sonnet-5-5",
    lead: "The Sonnet 5.5 migration guide groups top_p and top_k with temperature: a non-default value returns a 400. It does not print a separate error sentence for top_p or top_k.",
    errorQuoted: false,
    errorText:
      "Anthropic's Sonnet 5.5 migration guide does not print a separate error sentence for top_p or top_k. It says a non-default top_p or top_k returns a 400 error on claude-sonnet-5-5. Remove the field.",
    rule: "The same guide says Claude Sonnet 4.6 and earlier models and Claude Haiku 4.5 accept temperature, top_p, and top_k. On claude-sonnet-5-5, remove the non-default values. The temperature sentence is on its own page.",
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    modelsCaption: "Models named in the migration guide for this sampling rule.",
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: "A non-default top_p or top_k returns a 400. The guide does not quote a distinct sentence.",
      },
      {
        id: "claude-sonnet-4-6",
        provider: "anthropic",
        slug: "claude-sonnet-4-6",
        note: "The migration guide says Claude Sonnet 4.6 and earlier still accept top_p and top_k.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: ["Call the Messages API without top_p or top_k. The migration guide says to remove them."],
        samples: [
          {
            caption: "Before",
            code: `client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    top_p=0.9,
    top_k=40,
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "After",
            code: `client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          "Do not send top_p or top_k. additional_drop_params drops fields you name. drop_params only drops a field LiteLLM already lists as unsupported, so name top_p yourself.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
    messages=[{"role": "user", "content": "Hello"}],
    additional_drop_params=["top_p", "top_k"],
)
`,
          },
        ],
        sourceLabel: "LiteLLM drop unsupported params",
        sourceUrl: LITELLM_DROP,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "Leave topP and topK unset. generateText says topP is passed through to the provider, and it documents topK as its own option.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-sonnet-5-5"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: SONNET_GUIDES,
    faqs: [
      {
        question: "Is the error sentence the same as the temperature error?",
        answer:
          "The migration guide does not print one. It says a non-default temperature, top_p, or top_k returns a 400. The temperature sentence is documented on [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/).",
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_DROP, AI_SDK_GENERATE, CLAUDE_VERSIONING],
    apiVersionNote: API_VERSION_SAMPLING_NOTE,
  },
  {
    slug: "openai-model-has-been-deprecated",
    provider: "openai",
    cause: "Calling an OpenAI model id after the October 23, 2026 shutdown.",
    title: "The model has been deprecated | OpenAI shutdown | SunsetDiff",
    description:
      "OpenAI shuts down gpt-4, gpt-3.5-turbo, gpt-4-turbo, o1, o3-mini, o4-mini, gpt-4.1-nano, and gpt-4o-2024-05-13 on October 23, 2026. A public GitHub issue records the retired-model sentence for gpt-4-vision-preview.",
    h1: "The model has been deprecated",
    lead: "On October 23, 2026 those model ids stop being accessible. OpenAI's deprecations page does not print the error sentence. A public GitHub issue records one for a model that was already removed.",
    errorQuoted: true,
    errorText: VISION_DEPRECATED,
    quoteSourceLabel: "GitHub issue excalidraw/excalidraw#8209",
    quoteSourceUrl: ISSUE_VISION,
    rule: `OpenAI's deprecations page says: at the time of the shut down, the model or endpoint will no longer be accessible. The October 23, 2026 table names gpt-3.5-turbo-0125 (and gpt-3.5-turbo), gpt-4-0613 (and gpt-4), gpt-4-1106-preview, gpt-4-turbo, gpt-4.1-nano, gpt-4o-2024-05-13, o1, o1-pro, o3-mini, and o4-mini. The error sentence in the block above is copied from a GitHub issue about gpt-4-vision-preview, not from the October 23 table. A comment on ${ISSUE_GPT4_0314} records the same shape for an already removed snapshot: ${GPT4_0314_DEPRECATED} The Python error guide lists NotFoundError as "Requested resource does not exist." It does not tie that type to this shutdown.`,
    ruleSourceLabel: "OpenAI deprecations",
    ruleSourceUrl: OPENAI_DEPRECATIONS,
    modelsCaption: "October 23, 2026 model ids on OpenAI's deprecations page. The quoted sentence was recorded for gpt-4-vision-preview.",
    models: [
      { id: "gpt-4", provider: "openai", slug: "gpt-4", note: "Shuts down October 23, 2026. Recommended replacement on the deprecations page: gpt-5.6-sol." },
      { id: "gpt-4-0613", provider: "openai", slug: "gpt-4-0613", note: "Snapshot in the same October 23, 2026 row as gpt-4. Replacement: gpt-5.6-sol." },
      { id: "gpt-3.5-turbo", provider: "openai", slug: "gpt-3-5-turbo", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-terra." },
      { id: "gpt-3.5-turbo-0125", provider: "openai", slug: "gpt-3-5-turbo-0125", note: "Snapshot in the same row as gpt-3.5-turbo. Replacement: gpt-5.6-terra." },
      { id: "gpt-4-turbo", provider: "openai", slug: "gpt-4-turbo", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-sol." },
      { id: "gpt-4-turbo-2024-04-09", provider: "openai", slug: "gpt-4-turbo-2024-04-09", note: "Snapshot in the gpt-4-turbo row. Replacement: gpt-5.6-sol." },
      { id: "gpt-4-1106-preview", provider: "openai", slug: "gpt-4-1106-preview", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-sol." },
      { id: "gpt-4.1-nano", provider: "openai", slug: "gpt-4-1-nano", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-luna." },
      { id: "gpt-4.1-nano-2025-04-14", provider: "openai", slug: "gpt-4-1-nano-2025-04-14", note: "Snapshot in the gpt-4.1-nano row. Replacement: gpt-5.6-luna." },
      { id: "gpt-4o-2024-05-13", provider: "openai", slug: "gpt-4o-2024-05-13", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-sol." },
      { id: "o1", provider: "openai", slug: "o1", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-sol." },
      { id: "o1-2024-12-17", provider: "openai", slug: "o1-2024-12-17", note: "Snapshot in the o1 row. Replacement: gpt-5.6-sol." },
      { id: "o3-mini", provider: "openai", slug: "o3-mini", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-sol." },
      { id: "o4-mini", provider: "openai", slug: "o4-mini", note: "Shuts down October 23, 2026. Recommended replacement: gpt-5.6-terra." },
      { id: "gpt-5.6-sol", provider: "openai", slug: "gpt-5-6-sol", note: "Replacement named for gpt-4, gpt-4-turbo, gpt-4o-2024-05-13, o1, and o3-mini." },
      { id: "gpt-5.6-terra", provider: "openai", slug: "gpt-5-6-terra", note: "Replacement named for gpt-3.5-turbo and o4-mini." },
      { id: "gpt-5.6-luna", provider: "openai", slug: "gpt-5-6-luna", note: "Replacement named for gpt-4.1-nano." },
    ],
    shutdowns: [{ provider: "openai", date: "2026-10-23" }],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Change the model id to the replacement on the deprecations page. The sample uses gpt-4 to gpt-5.6-sol. Other ids in the table use gpt-5.6-terra or gpt-5.6-luna. This page does not claim the new model accepts every parameter the old one accepted.",
        ],
        samples: [
          {
            caption: "Before",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "After",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "OpenAI deprecations",
        sourceUrl: OPENAI_DEPRECATIONS,
      },
      {
        heading: "LiteLLM",
        text: ["Change the model string. LiteLLM's OpenAI route uses an openai/ prefix plus the model id."],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="openai/gpt-5.6-sol",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "LiteLLM OpenAI provider",
        sourceUrl: "https://docs.litellm.ai/docs/providers/openai",
      },
      {
        heading: "Vercel AI SDK",
        text: ["Pass the replacement id to openai(). The AI SDK OpenAI guide is the provider page for that helper."],
        samples: [
          {
            caption: "TypeScript",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const { text } = await generateText({
  model: openai("gpt-5.6-sol"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK OpenAI guide",
        sourceUrl: AI_SDK_OPENAI,
      },
    ],
    guides: [
      { href: "/migrate/openai__gpt-4__to__openai__gpt-5-6-sol/", label: "gpt-4 to gpt-5.6-sol" },
      { href: "/migrate/openai__gpt-3-5-turbo__to__openai__gpt-5-6-terra/", label: "gpt-3.5-turbo to gpt-5.6-terra" },
      { href: "/migrate/openai__gpt-4-turbo__to__openai__gpt-5-6-sol/", label: "gpt-4-turbo to gpt-5.6-sol" },
      { href: "/migrate/openai__gpt-4o-2024-05-13__to__openai__gpt-5-6-sol/", label: "gpt-4o-2024-05-13 to gpt-5.6-sol" },
      { href: "/migrate/openai__gpt-4-1-nano__to__openai__gpt-5-6-luna/", label: "gpt-4.1-nano to gpt-5.6-luna" },
      { href: "/migrate/openai__o1__to__openai__gpt-5-6-sol/", label: "o1 to gpt-5.6-sol" },
      { href: "/migrate/openai__o3-mini__to__openai__gpt-5-6-sol/", label: "o3-mini to gpt-5.6-sol" },
      { href: "/migrate/openai__o4-mini__to__openai__gpt-5-6-terra/", label: "o4-mini to gpt-5.6-terra" },
    ],
    seeAlso: [
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
    ],
    faqs: [
      {
        question: "Does OpenAI print the error sentence for the October 23 models?",
        answer:
          "Not on the deprecations page checked October 20, 2026. That page says the model will no longer be accessible. The sentence in the Error text block was recorded for gpt-4-vision-preview in a GitHub issue.",
      },
      {
        question: "Where is the full October 23 list?",
        answer:
          "On [OpenAI models shutting down October 23, 2026](/shutdowns/openai-2026-10-23/) and on the [deprecations page](https://developers.openai.com/api/docs/deprecations).",
      },
    ],
    citations: [OPENAI_DEPRECATIONS, OPENAI_ERRORS, ISSUE_VISION, ISSUE_GPT4_0314, AI_SDK_OPENAI],
  },
  {
    slug: "gemini-model-no-longer-available",
    provider: "google-gemini-api",
    cause: "Calling a Gemini API model after its shutdown, including the October 22, 2026 batch.",
    title: "This model is no longer available | Gemini API | SunsetDiff",
    description:
      "A public GitHub issue records the Gemini API 404 for retired gemini-2.0-flash. Gemini API models veo-3.1 preview and gemini-omni-flash-preview shut down October 22, 2026.",
    h1: "This model is no longer available",
    lead: "After a Gemini API model is shut down, the deprecations page says the endpoint is no longer available. The 404 sentence below was recorded for gemini-2.0-flash, which shut down June 1, 2026.",
    errorQuoted: true,
    errorText: GEMINI_GONE,
    quoteSourceLabel: "GitHub issue google/adk-python#6010",
    quoteSourceUrl: ISSUE_GEMINI_GONE,
    rule: `Google's deprecations page says that once a model is shutdown, it is completely turned off and the endpoint is no longer available. The October 22, 2026 rows are veo-3.1-lite-generate-preview, veo-3.1-generate-preview, veo-3.1-fast-generate-preview, and gemini-omni-flash-preview, with replacement gemini-omni-1.1-flash. SunsetDiff has not recorded this 404 sentence for those four ids. The Error text block is the message in ${ISSUE_GEMINI_GONE} for models/gemini-2.0-flash. A different sentence, from ${ISSUE_GEMINI_NEW_USERS}, was recorded while new API keys were blocked and the model was not yet shut down for everyone: ${GEMINI_NEW_USERS}`,
    ruleSourceLabel: "Gemini API deprecations",
    ruleSourceUrl: GEMINI_DEPRECATIONS,
    modelsCaption: "The quoted 404 was recorded for gemini-2.0-flash. The October 22, 2026 ids are the upcoming Gemini API shutdown.",
    models: [
      {
        id: "gemini-2.0-flash",
        provider: "google-gemini-api",
        slug: "gemini-2-0-flash",
        note: "Shut down June 1, 2026. The GitHub issue records the 404 for models/gemini-2.0-flash. Replacement on the deprecations page checked October 20, 2026: gemini-3.6-flash.",
      },
      {
        id: "gemini-omni-flash-preview",
        provider: "google-gemini-api",
        slug: "gemini-omni-flash-preview",
        note: "Shutdown date October 22, 2026. Replacement: gemini-omni-1.1-flash. The exact 404 sentence is not recorded here for this id.",
      },
      {
        id: "veo-3.1-generate-preview",
        provider: "google-gemini-api",
        slug: "veo-3-1-generate-preview",
        note: "Shutdown date October 22, 2026. Replacement: gemini-omni-1.1-flash.",
      },
      {
        id: "veo-3.1-fast-generate-preview",
        provider: "google-gemini-api",
        slug: "veo-3-1-fast-generate-preview",
        note: "Shutdown date October 22, 2026. Replacement: gemini-omni-1.1-flash.",
      },
      {
        id: "veo-3.1-lite-generate-preview",
        provider: "google-gemini-api",
        slug: "veo-3-1-lite-generate-preview",
        note: "Shutdown date October 22, 2026. Replacement: gemini-omni-1.1-flash.",
      },
      {
        id: "gemini-3.6-flash",
        provider: "google-gemini-api",
        slug: "gemini-3-6-flash",
        note: "Replacement named for gemini-2.0-flash on the deprecations page checked October 20, 2026.",
      },
      {
        id: "gemini-omni-1.1-flash",
        provider: "google-gemini-api",
        slug: "gemini-omni-1-1-flash",
        note: "Replacement named for the October 22, 2026 Gemini API rows.",
      },
    ],
    shutdowns: [{ provider: "google-gemini-api", date: "2026-10-22" }],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Stop calling the retired model id. For gemini-2.0-flash, the deprecations page checked October 20, 2026 names gemini-3.6-flash. The October 22 rows name gemini-omni-1.1-flash. The sample is a generateContent call, which is the call in the GitHub issue. It is not a Veo video request.",
        ],
        samples: [
          {
            caption: "Before",
            code: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -X POST \\
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
`,
          },
          {
            caption: "After",
            code: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -X POST \\
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
`,
          },
        ],
        sourceLabel: "Gemini API deprecations",
        sourceUrl: GEMINI_DEPRECATIONS,
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM's Gemini API route is the gemini/ prefix plus the model id. Change the id. The docs show gemini/gemini-2.0-flash as a Gemini API model string.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="gemini/gemini-3.6-flash",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "LiteLLM Gemini provider",
        sourceUrl: LITELLM_GEMINI,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "generateText takes the model id from google(). Use the replacement id from the deprecations page.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const { text } = await generateText({
  model: google("gemini-3.6-flash"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: [
      {
        href: "/migrate/google-gemini-api__gemini-omni-flash-preview__to__google-gemini-api__gemini-omni-1-1-flash/",
        label: "gemini-omni-flash-preview to gemini-omni-1.1-flash",
      },
      {
        href: "/migrate/google-gemini-api__veo-3-1-generate-preview__to__google-gemini-api__gemini-omni-1-1-flash/",
        label: "veo-3.1-generate-preview to gemini-omni-1.1-flash",
      },
      {
        href: "/migrate/google-gemini-api__veo-3-1-fast-generate-preview__to__google-gemini-api__gemini-omni-1-1-flash/",
        label: "veo-3.1-fast-generate-preview to gemini-omni-1.1-flash",
      },
      {
        href: "/migrate/google-gemini-api__veo-3-1-lite-generate-preview__to__google-gemini-api__gemini-omni-1-1-flash/",
        label: "veo-3.1-lite-generate-preview to gemini-omni-1.1-flash",
      },
    ],
    seeAlso: [
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: "/shutdowns/google-gemini-api-2026-10-22/", label: "Gemini API October 22, 2026 batch" },
    ],
    faqs: [
      {
        question: "Which Gemini API models shut down on October 22, 2026?",
        answer:
          "veo-3.1-lite-generate-preview, veo-3.1-generate-preview, veo-3.1-fast-generate-preview, and gemini-omni-flash-preview. The list is on [Gemini API models shutting down October 22, 2026](/shutdowns/google-gemini-api-2026-10-22/).",
      },
      {
        question: "Is the 404 sentence verified for those four models?",
        answer:
          "No. It is verified in a GitHub issue for gemini-2.0-flash. The deprecations page says a shutdown turns the endpoint off. It does not print that 404 sentence.",
      },
    ],
    citations: [GEMINI_DEPRECATIONS, ISSUE_GEMINI_GONE, ISSUE_GEMINI_NEW_USERS, LITELLM_GEMINI, AI_SDK_GENERATE],
  },
  {
    slug: "openai-max-tokens-use-max-completion-tokens",
    provider: "openai",
    cause: "max_tokens on an o-series model, including o1, o3-mini, and o4-mini.",
    title: "Unsupported parameter: max_tokens. Use max_completion_tokens | SunsetDiff",
    description:
      "OpenAI's API reference says max_tokens is not compatible with o-series models. A GitHub issue records the 400 for o1: use max_completion_tokens instead.",
    h1: MAX_TOKENS,
    lead: "o-series models reject max_tokens. The Chat Completions reference says to use max_completion_tokens. The sentence below was recorded for o1.",
    errorQuoted: true,
    errorText: MAX_TOKENS,
    quoteSourceLabel: "GitHub issue openai/openai-python#2046",
    quoteSourceUrl: ISSUE_MAX_TOKENS,
    rule: `The Chat Completions reference says max_tokens is deprecated in favor of max_completion_tokens, and is not compatible with o-series models. max_completion_tokens is an upper bound on tokens generated for a completion, including visible output tokens and reasoning tokens. ${ISSUE_MAX_TOKENS} records the 400 while using o1. This page does not claim every newer model returns that same sentence.`,
    ruleSourceLabel: "OpenAI Chat Completions reference",
    ruleSourceUrl: OPENAI_CHAT,
    modelsCaption: "o-series ids in the October 23, 2026 shutdown. The quoted 400 was recorded for o1.",
    models: [
      { id: "o1", provider: "openai", slug: "o1", note: "The GitHub issue records this 400 for o1. The API reference says o-series models are not compatible with max_tokens." },
      { id: "o1-2024-12-17", provider: "openai", slug: "o1-2024-12-17", note: "o1 snapshot. Shuts down October 23, 2026." },
      { id: "o3-mini", provider: "openai", slug: "o3-mini", note: "o-series id. Shuts down October 23, 2026. The quoted sentence was recorded for o1, not this id." },
      { id: "o3-mini-2025-01-31", provider: "openai", slug: "o3-mini-2025-01-31", note: "o3-mini snapshot. Shuts down October 23, 2026." },
      { id: "o4-mini", provider: "openai", slug: "o4-mini", note: "o-series id. Shuts down October 23, 2026. The quoted sentence was recorded for o1, not this id." },
      { id: "o4-mini-2025-04-16", provider: "openai", slug: "o4-mini-2025-04-16", note: "o4-mini snapshot. Shuts down October 23, 2026." },
      { id: "o1-pro", provider: "openai", slug: "o1-pro", note: "o-series id in the same October 23, 2026 deprecations table." },
    ],
    shutdowns: [{ provider: "openai", date: "2026-10-23" }],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Send max_completion_tokens and omit max_tokens. o1, o3-mini, and o4-mini also shut down on October 23, 2026, so the model id has to change on that date too.",
        ],
        samples: [
          {
            caption: "Before",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="o1",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=1000,
)
`,
          },
          {
            caption: "After",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="o1",
    messages=[{"role": "user", "content": "Hello"}],
    max_completion_tokens=1000,
)
`,
          },
        ],
        sourceLabel: "OpenAI Chat Completions reference",
        sourceUrl: OPENAI_CHAT,
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM's completion input list includes max_completion_tokens and max_tokens as separate fields. Pass max_completion_tokens.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="openai/o1",
    messages=[{"role": "user", "content": "Hello"}],
    max_completion_tokens=1000,
)
`,
          },
        ],
        sourceLabel: "LiteLLM completion input",
        sourceUrl: LITELLM_INPUT,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "generateText names the cap maxOutputTokens. The OpenAI provider guide does not say that this field is sent as max_completion_tokens. The API reference is the source for the parameter name on the raw request.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const { text } = await generateText({
  model: openai("o1"),
  prompt: "Hello",
  maxOutputTokens: 1000,
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: [
      { href: "/migrate/openai__o1__to__openai__gpt-5-6-sol/", label: "o1 to gpt-5.6-sol" },
      { href: "/migrate/openai__o3-mini__to__openai__gpt-5-6-sol/", label: "o3-mini to gpt-5.6-sol" },
      { href: "/migrate/openai__o4-mini__to__openai__gpt-5-6-terra/", label: "o4-mini to gpt-5.6-terra" },
    ],
    faqs: [
      {
        question: "Which parameter replaces max_tokens?",
        answer:
          "max_completion_tokens. The Chat Completions reference says max_tokens is not compatible with o-series models. See also [the October 23 shutdown error](/errors/openai-model-has-been-deprecated/).",
      },
    ],
    citations: [OPENAI_CHAT, ISSUE_MAX_TOKENS, LITELLM_INPUT, AI_SDK_GENERATE, AI_SDK_OPENAI],
  },
  {
    slug: "gemini-thinking-budget-not-supported-use-thinking-level",
    provider: "google-gemini-api",
    checked: "2026-10-21",
    cause: "thinkingBudget sent to gemini-4-argon on Vertex.",
    title: "Thinking budget is not supported for this model | SunsetDiff",
    description:
      "Vertex returns HTTP 400 when gemini-4-argon is sent thinkingBudget. Send thinkingLevel instead. Source: a public GitHub issue.",
    h1: "Thinking budget is not supported for this model",
    lead: "A Vertex request that sends thinkingBudget for gemini-4-argon comes back as HTTP 400. The recorded fix is thinkingLevel.",
    errorQuoted: true,
    errorText: "Thinking budget is not supported for this model. Use thinking level instead.",
    quoteSourceLabel: "GitHub issue gravitee-io/issues#11964",
    quoteSourceUrl: "https://github.com/gravitee-io/issues/issues/11964",
    rule: "GitHub issue gravitee-io/issues#11964 records HTTP 400 from Vertex for gemini-4-argon when reasoning_effort is mapped to thinkingBudget, and when thinkingBudget is sent directly. The JSON message is the sentence above, then: See https://ai.google.dev/gemini-api/docs/thinking for details. A direct Vertex call with generationConfig.thinkingConfig.thinkingLevel set to LOW returned 200. The same issue says Google's own OpenAI-compatible endpoint accepted reasoning_effort for that model. Models that accepted reasoning_effort through that gateway were gemini-3.5-flash, gemini-3.6-flash, gemini-3.5-flash-lite, and gemini-3.8-flash. Issue can1357/oh-my-pi#16350 records the shorter sentence Google API error (400): Thinking budget is not supported for this model. for gemma-4-26b-a4b-it and gemma-4-31b-it. The maintainer comment says the catalog sent thinkingBudget, and that Gemma 4 docs describe thinking as on or off via thinkingLevel (high on, minimal off). Those two gemma ids are not in the SunsetDiff dataset, so they are not linked below. The thinking guide says you can control this behavior using the thinking_level parameter. Its sample uses gemini-3.8-flash. The guide's table lists low, medium, and high for gemini-4-argon. This page does not rewrite that sample's model id.",
    ruleSourceLabel: "Gemini API thinking guide",
    ruleSourceUrl: "https://ai.google.dev/gemini-api/docs/thinking",
    modelsCaption:
      "gemini-4-argon is in the SunsetDiff dataset. gemma-4-26b-a4b-it and gemma-4-31b-it are named in can1357/oh-my-pi#16350 and are not linked because SunsetDiff has no model record for them.",
    models: [
      {
        id: "gemini-4-argon",
        provider: "google-vertex",
        slug: "gemini-4-argon",
        note: "Issue gravitee-io/issues#11964 records HTTP 400 on Vertex when thinkingBudget is sent, including when a gateway maps reasoning_effort to thinkingBudget. thinkingLevel LOW returned 200 on a direct Vertex call.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Send thinking_level instead of thinkingBudget. The sample below is copied from the thinking guide. It uses gemini-3.8-flash. The Vertex issue recorded thinkingConfig.thinkingLevel LOW returning 200 on gemini-4-argon. This page does not change the guide's model id.",
        ],
        samples: [
          {
            caption: "Python",
            code: `from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Provide a list of 3 famous physicists and their key contributions",
    generation_config={
        "thinking_level": "low"
    }
)
print(interaction.output_text)
`,
          },
          {
            caption: "curl",
            code: `curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "gemini-3.8-flash",
    "input": "Provide a list of 3 famous physicists and their key contributions",
    "generation_config": {
      "thinking_level": "low"
    }
  }'
`,
          },
        ],
        sourceLabel: "Gemini API thinking guide",
        sourceUrl: "https://ai.google.dev/gemini-api/docs/thinking",
      },
      {
        heading: "LiteLLM",
        text: [
          "This page does not show a LiteLLM call. The recorded gateway is Gravitee's LLM proxy, which mapped reasoning_effort to thinkingBudget and received this 400. The issue says to send thinkingLevel instead.",
        ],
        samples: [],
        sourceLabel: "GitHub issue gravitee-io/issues#11964",
        sourceUrl: "https://github.com/gravitee-io/issues/issues/11964",
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "The same issue says a native Gemini client (@ai-sdk/google 4.0.96) sent generationConfig.thinkingConfig.thinkingLevel, and the gateway rewrote it to thinkingBudget, which returned 400. Direct to Vertex, the same thinkingLevel body returned 200. This page does not add an AI SDK snippet beyond that report.",
        ],
        samples: [],
        sourceLabel: "GitHub issue gravitee-io/issues#11964",
        sourceUrl: "https://github.com/gravitee-io/issues/issues/11964",
      },
    ],
    guides: [],
    faqs: [
      {
        question: "Which models are named with this 400?",
        answer:
          "gravitee-io/issues#11964 records it for gemini-4-argon on Vertex. can1357/oh-my-pi#16350 records a shorter form of the sentence for gemma-4-26b-a4b-it and gemma-4-31b-it. Those gemma ids are not in the SunsetDiff dataset.",
      },
      {
        question: "What should the request send instead of thinkingBudget?",
        answer:
          "thinkingLevel. The thinking guide calls the parameter thinking_level and links from the error message. The guide's sample is shown under Raw SDK and uses gemini-3.8-flash.",
      },
      {
        question: "Do OpenAI-compatible gateways hit this error?",
        answer:
          "The Gravitee issue records a gateway that maps reasoning_effort to thinkingBudget. That mapping returned this 400 for gemini-4-argon. Google's own OpenAI-compatible endpoint accepted reasoning_effort for that model in the same report.",
      },
    ],
    citations: [
      "https://github.com/gravitee-io/issues/issues/11964",
      "https://github.com/can1357/oh-my-pi/issues/16350",
      "https://ai.google.dev/gemini-api/docs/thinking",
    ],
  },
  {
    slug: "openai-temperature-is-not-supported-with-this-model",
    provider: "openai",
    checked: "2026-10-24",
    cause: "temperature on gpt-6-sol or gpt-6-luna when reasoning effort is not none.",
    title: "Unsupported parameter: temperature is not supported with this model | SunsetDiff",
    description:
      "OpenAI's Using GPT-6 guide says to remove temperature when reasoning effort is not none. A GitHub issue records that sentence for gpt-6-sol, gpt-6-luna, gpt-6-astra, and gpt-6.1-sol.",
    h1: TEMPERATURE_UNSUPPORTED,
    lead: "A request that sends temperature can come back with the sentence below. OpenAI's Using GPT-6 guide says to remove temperature when reasoning effort is not none.",
    errorQuoted: true,
    errorText: TEMPERATURE_UNSUPPORTED,
    quoteSourceLabel: "GitHub issue neondatabase/neon-pkgs#937",
    quoteSourceUrl: ISSUE_TEMPERATURE,
    rule: `The Using GPT-6 guide says: when reasoning effort is not none, remove temperature, top_p, and top_logprobs. For Chat Completions, also remove logprobs. For Responses, remove message.output_text.logprobs from include. GPT-6 Astra and GPT-6.1 Sol do not support reasoning effort none. GPT-6 Sol and GPT-6 Luna do. ${ISSUE_TEMPERATURE} records the temperature sentence for gpt-6-astra, gpt-6-sol, gpt-6-luna, and gpt-6-1-sol when temperature is set and no reasoning effort is set. The same issue records this sentence for top_p on gpt-6-astra: ${TOP_P_UNSUPPORTED} Its table says gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-6-sol, and gpt-6-luna accept temperature and top_p only with effort none. ${ISSUE_NANO_SHUTDOWN} says gpt-4.1-nano shut down on 2026-10-23, that calls return 404 model_not_found, and that temperature is unsupported on successor models. That issue does not print the temperature sentence. SunsetDiff's gpt-4.1-nano record lists shutdown date 2026-10-23 and replacement gpt-5.6-luna. gpt-6-astra and gpt-6.1-sol are named in the guide and in the neon issue. Both ids are linked below.`,
    ruleSourceLabel: "Using GPT-6",
    ruleSourceUrl: OPENAI_GPT6,
    modelsCaption: "The quoted temperature sentence was recorded for gpt-6-astra, gpt-6-sol, gpt-6-luna, and gpt-6.1-sol.",
    models: [
      {
        id: "gpt-6-astra",
        provider: "openai",
        slug: "gpt-6-astra",
        note: "The neon issue reproduced the temperature sentence on this id. The Using GPT-6 guide says GPT-6 Astra does not support reasoning effort none, so remove temperature.",
      },
      {
        id: "gpt-6.1-sol",
        provider: "openai",
        slug: "gpt-6-1-sol",
        note: "The neon issue reproduced the temperature sentence on this id. The Using GPT-6 guide says GPT-6.1 Sol does not support reasoning effort none, so remove temperature.",
      },
      {
        id: "gpt-6-sol",
        provider: "openai",
        slug: "gpt-6-sol",
        note: "The neon issue reproduced the temperature sentence on this id. The Using GPT-6 guide says GPT-6 Sol supports reasoning effort none, and to remove temperature when effort is not none.",
      },
      {
        id: "gpt-6-luna",
        provider: "openai",
        slug: "gpt-6-luna",
        note: "The neon issue reproduced the temperature sentence on this id. The Using GPT-6 guide says GPT-6 Luna supports reasoning effort none.",
      },
      {
        id: "gpt-5.6-sol",
        provider: "openai",
        slug: "gpt-5-6-sol",
        note: "The neon issue's table says this id accepts temperature and top_p only with effort none. The quoted sentence in that issue was reproduced for the gpt-6 ids, not for this id.",
      },
      {
        id: "gpt-5.6-luna",
        provider: "openai",
        slug: "gpt-5-6-luna",
        note: "SunsetDiff lists this id as the replacement for gpt-4.1-nano, which shut down October 23, 2026. The neon issue's table says this id accepts temperature and top_p only with effort none. The quoted sentence was not reproduced for this id in that issue.",
      },
      {
        id: "gpt-5.6-terra",
        provider: "openai",
        slug: "gpt-5-6-terra",
        note: "The neon issue's table says this id accepts temperature and top_p only with effort none. The quoted sentence was not reproduced for this id in that issue.",
      },
    ],
    shutdowns: [{ provider: "openai", date: "2026-10-23" }],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Omit temperature when reasoning effort is not none. gpt-6-sol and gpt-6-luna can keep temperature if reasoning_effort is none. GPT-6 Astra and GPT-6.1 Sol do not support none, so the guide says to remove temperature on those models. The sample uses gpt-6-sol, which is in this dataset.",
        ],
        samples: [
          {
            caption: "Before",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-6-sol",
    messages=[{"role": "user", "content": "Hello"}],
    temperature=0.2,
)
`,
          },
          {
            caption: "After",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-6-sol",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "gpt-6-sol with temperature kept",
            code: `response = client.chat.completions.create(
    model="gpt-6-sol",
    messages=[{"role": "user", "content": "Hello"}],
    reasoning_effort="none",
    temperature=0.2,
)
`,
          },
        ],
        sourceLabel: "Using GPT-6",
        sourceUrl: OPENAI_GPT6,
      },
      {
        heading: "LiteLLM",
        text: [
          "Do not send temperature. additional_drop_params removes named fields on that call. This page does not claim LiteLLM already lists temperature as unsupported for gpt-6-sol.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="openai/gpt-6-sol",
    messages=[{"role": "user", "content": "Hello"}],
    additional_drop_params=["temperature", "top_p"],
)
`,
          },
        ],
        sourceLabel: "LiteLLM drop unsupported params",
        sourceUrl: LITELLM_DROP,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "The neon issue called generateText with temperature 0.2 and recorded the sentence above for the gpt-6 ids. Leave temperature unset. The generateText reference says temperature is passed through to the provider. That reference does not print this error sentence.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const { text } = await generateText({
  model: openai("gpt-6-sol"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: [
      { href: "/migrate/openai__gpt-4__to__openai__gpt-5-6-sol/", label: "gpt-4 to gpt-5.6-sol" },
      { href: "/migrate/openai__o1__to__openai__gpt-5-6-sol/", label: "o1 to gpt-5.6-sol" },
      { href: "/migrate/openai__gpt-4-1-nano__to__openai__gpt-5-6-luna/", label: "gpt-4.1-nano to gpt-5.6-luna" },
      { href: "/migrate/openai__o4-mini__to__openai__gpt-5-6-terra/", label: "o4-mini to gpt-5.6-terra" },
      { href: "/migrate/openai__gpt-5-1__to__openai__gpt-6-sol/", label: "gpt-5.1 to gpt-6-sol" },
      { href: "/migrate/openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna/", label: "gpt-4o-mini-2024-07-18 to gpt-6-luna" },
    ],
    seeAlso: [
      { href: "/errors/openai-model-has-been-deprecated/", label: "The model has been deprecated" },
      { href: "/errors/openai-max-tokens-use-max-completion-tokens/", label: "max_tokens is not supported. Use max_completion_tokens" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: OPENAI_GPT6, label: "Using GPT-6" },
    ],
    faqs: [
      {
        question: "Which models returned this exact sentence?",
        answer:
          "neondatabase/neon-pkgs#937 records it for [gpt-6-astra](/models/openai/gpt-6-astra/), [gpt-6-sol](/models/openai/gpt-6-sol/), [gpt-6-luna](/models/openai/gpt-6-luna/), and [gpt-6.1-sol](/models/openai/gpt-6-1-sol/). The same issue records a matching top_p sentence for gpt-6-astra.",
      },
      {
        question: "Can gpt-6-sol keep temperature?",
        answer:
          "The Using GPT-6 guide says GPT-6 Sol and GPT-6 Luna support reasoning effort none, and to remove temperature when effort is not none. GPT-6 Astra and GPT-6.1 Sol do not support none.",
      },
      {
        question: "Is this the October 23 shutdown error?",
        answer:
          "maxswaine/game-repository#110 records 404 model_not_found for gpt-4.1-nano on October 23, 2026, and says temperature is unsupported on the successor. That issue does not print the temperature sentence. The shutdown sentence is on [The model has been deprecated](/errors/openai-model-has-been-deprecated/).",
      },
    ],
    citations: [OPENAI_GPT6, ISSUE_TEMPERATURE, ISSUE_NANO_SHUTDOWN, LITELLM_DROP, AI_SDK_GENERATE],
  },
  {
    slug: "gemini-2-5-flash-no-longer-available-to-new-users",
    provider: "google-gemini-api",
    checked: "2026-10-24",
    cause: "A Gemini API key that counts as a new user calling gemini-2.5-flash.",
    title: "gemini-2.5-flash is no longer available to new users | SunsetDiff",
    description:
      "GitHub issue ecomAssistant#92 records HTTP 404 for gemini-2.5-flash: models/gemini-2.5-flash is no longer available to new users. Google's deprecations page limits 2.5 access to people who have used those models and says they are not deprecated.",
    h1: GEMINI_25_NEW_USERS,
    lead: "Some Gemini API keys get HTTP 404 on gemini-2.5-flash. Google's deprecations page says access to the 2.5 models is limited to users who have actively used them. It says the models are not deprecated.",
    errorQuoted: true,
    errorText: GEMINI_25_NEW_USERS,
    quoteSourceLabel: "GitHub issue LebgaaAbderrahmane/ecomAssistant#92",
    quoteSourceUrl: ISSUE_GEMINI_25,
    rule: `The issue says Google answers 404 with that message for some API keys, and that older keys still work. The deprecations page says it is limiting access to the 2.5 models to users who have actively used them in the past. It says these models are not deprecated and will continue to be served until further notice through the API. For any new projects it names 3.5 Flash-Lite or 3.8 Flash. The model table on that page uses the ids gemini-3.5-flash-lite and gemini-3.8-flash. The deprecations page does not print the 404 sentence. The issue records the sentence for gemini-2.5-flash. The same access note sits above the gemini-2.5-pro section and the Gemini 2.5 Flash section, which also lists gemini-2.5-flash-lite with no shutdown date announced. A different sentence, recorded for gemini-2.0-flash after that model shut down, is on [This model is no longer available](/errors/gemini-model-no-longer-available/).`,
    ruleSourceLabel: "Gemini API deprecations",
    ruleSourceUrl: GEMINI_DEPRECATIONS,
    modelsCaption: "The quoted 404 fragment was recorded for gemini-2.5-flash. The other 2.5 ids are the stable models under the same access note. The issue does not record this sentence for them.",
    models: [
      {
        id: "gemini-2.5-flash",
        provider: "google-gemini-api",
        slug: "gemini-2-5-flash",
        note: "The GitHub issue records HTTP 404 with the sentence above for this id. The deprecations page lists release date June 17, 2025 and no shutdown date announced.",
      },
      {
        id: "gemini-2.5-pro",
        provider: "google-gemini-api",
        slug: "gemini-2-5-pro",
        note: "The 2.5 Pro section has the same access note. Release date June 17, 2025. No shutdown date announced. The issue does not record this 404 sentence for this id.",
      },
      {
        id: "gemini-2.5-flash-lite",
        provider: "google-gemini-api",
        slug: "gemini-2-5-flash-lite",
        note: "Listed under Gemini 2.5 Flash models, under the same access note. Release date July 22, 2025. No shutdown date announced. The issue does not record this 404 sentence for this id.",
      },
      {
        id: "gemini-3.8-flash",
        provider: "google-gemini-api",
        slug: "gemini-3-8-flash",
        note: "The deprecations note names 3.8 Flash for new projects. The table id on that page is gemini-3.8-flash.",
      },
      {
        id: "gemini-3.5-flash-lite",
        provider: "google-gemini-api",
        slug: "gemini-3-5-flash-lite",
        note: "The deprecations note names 3.5 Flash-Lite for new projects. The table id on that page is gemini-3.5-flash-lite.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "For a new project, call an id the deprecations note names for new projects. The sample uses gemini-3.8-flash. The issue says older keys can still call gemini-2.5-flash. This page does not say the model is shut down.",
        ],
        samples: [
          {
            caption: "Before",
            code: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -X POST \\
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
`,
          },
          {
            caption: "After",
            code: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -X POST \\
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
`,
          },
        ],
        sourceLabel: "Gemini API deprecations",
        sourceUrl: GEMINI_DEPRECATIONS,
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM's Gemini API route is the gemini/ prefix plus the model id. For a new project, use an id from the deprecations note.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="gemini/gemini-3.8-flash",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sourceLabel: "LiteLLM Gemini provider",
        sourceUrl: LITELLM_GEMINI,
      },
      {
        heading: "Vercel AI SDK",
        text: ["generateText takes the model id from google(). Use gemini-3.8-flash or gemini-3.5-flash-lite for a new project."],
        samples: [
          {
            caption: "TypeScript",
            code: `import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const { text } = await generateText({
  model: google("gemini-3.8-flash"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK generateText",
        sourceUrl: AI_SDK_GENERATE,
      },
    ],
    guides: [],
    seeAlso: [
      { href: "/errors/gemini-model-no-longer-available/", label: "This model is no longer available" },
      { href: "/models/google-gemini-api/gemini-2-5-flash/", label: "gemini-2.5-flash" },
      { href: "/models/google-gemini-api/gemini-3-8-flash/", label: "gemini-3.8-flash" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
    ],
    faqs: [
      {
        question: "Does Google's deprecations page print this 404 sentence?",
        answer:
          "No. The page says 2.5 access is limited to users who have actively used those models, and that the models are not deprecated. The sentence in the Error text block is from GitHub issue LebgaaAbderrahmane/ecomAssistant#92, which records HTTP 404 for gemini-2.5-flash.",
      },
      {
        question: "Why does an older key still work?",
        answer:
          "The issue says a key that counts as a new user gets the 404, and older keys still call gemini-2.5-flash. The deprecations page says the models are still served for users who have actively used them.",
      },
      {
        question: "Which ids does the deprecations page name for a new project?",
        answer:
          "The note says 3.5 Flash-Lite or 3.8 Flash. The table on that page uses gemini-3.5-flash-lite and gemini-3.8-flash. gemini-2.5-flash, gemini-2.5-pro, and gemini-2.5-flash-lite have no shutdown date announced.",
      },
    ],
    citations: [GEMINI_DEPRECATIONS, ISSUE_GEMINI_25, LITELLM_GEMINI, AI_SDK_GENERATE],
  },
  {
    slug: "azure-openai-retired-model-410-gone",
    provider: "azure-openai",
    checked: "2026-10-24",
    cause: "An Azure OpenAI o-series deployment after the model version is retired.",
    title: "Azure OpenAI retired models return 410 Gone | SunsetDiff",
    description:
      "Microsoft's lifecycle page says a retired model is removed from service and inference returns 410 Gone. The retirement schedule and SunsetDiff list several o-series versions for November 19, 2026.",
    h1: "Azure OpenAI retired models return 410 Gone",
    lead: "After an Azure OpenAI model version is retired, Microsoft says every inference request returns 410 Gone. Several o-series versions have retirement date November 19, 2026 on the schedule and in SunsetDiff.",
    errorQuoted: false,
    errorText:
      "Microsoft's lifecycle page does not print an error sentence. It says a Retired model is removed from service and all inference requests return 410 Gone.",
    rule: `The lifecycle table says Retired means removed from service, new deployments are not allowed, existing deployments do not work, and all inference requests return 410 Gone. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The retirement schedule, checked October 24, 2026, lists these Azure OpenAI base rows as Deprecated with retirement date 2026-11-19: o1 2024-12-17 and o1-pro 2025-03-19 and o3 2025-04-16 and o3-deep-research 2025-06-26 and o3-pro 2025-06-10, replacement gpt-5.6-sol; o3-mini 2025-01-31, replacement gpt-5.6-terra. SunsetDiff stores shutdown_date 2026-11-19 for those six ids. The schedule's base row for o4-mini 2025-04-16 is also Deprecated, retirement 2026-11-19, replacement gpt-5.6-terra. SunsetDiff stores shutdown_date 2026-11-19 for o4-mini-2025-04-16, matching that base row. The fine-tuned deployment retirement 2027-11-19 is only a note on that model, not the shutdown date. The lifecycle page says Global Standard, Data Zone Standard, and Standard deployments are auto-upgraded at retirement, and provisioned deployments are not. The working-with-models page says automatic model updates are supported for Standard deployment types. On that page, NoAutoUpgrade never upgrades and the deployment stops working at retirement. OnceNewDefaultVersionAvailable upgrades within two weeks of a new default. OnceCurrentVersionExpired upgrades when the retirement date is reached.`,
    ruleSourceLabel: "Foundry Models lifecycle",
    ruleSourceUrl: AZURE_RETIREMENTS,
    modelsCaption: "o-series versions whose SunsetDiff shutdown_date is 2026-11-19, including o4-mini.",
    models: [
      {
        id: "o1-2024-12-17",
        provider: "azure-openai",
        slug: "o1-2024-12-17",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-sol.",
      },
      {
        id: "o1-pro-2025-03-19",
        provider: "azure-openai",
        slug: "o1-pro-2025-03-19",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-sol.",
      },
      {
        id: "o3-2025-04-16",
        provider: "azure-openai",
        slug: "o3-2025-04-16",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-sol.",
      },
      {
        id: "o3-mini-2025-01-31",
        provider: "azure-openai",
        slug: "o3-mini-2025-01-31",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-terra.",
      },
      {
        id: "o3-deep-research-2025-06-26",
        provider: "azure-openai",
        slug: "o3-deep-research-2025-06-26",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-sol.",
      },
      {
        id: "o3-pro-2025-06-10",
        provider: "azure-openai",
        slug: "o3-pro-2025-06-10",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-sol.",
      },
      {
        id: "o4-mini-2025-04-16",
        provider: "azure-openai",
        slug: "o4-mini-2025-04-16",
        note: "Schedule and SunsetDiff: Deprecated, retirement 2026-11-19, replacement gpt-5.6-terra. The fine-tuned deployment retirement 2027-11-19 is a note, not the shutdown date.",
      },
      {
        id: "gpt-5.6-sol",
        provider: "azure-openai",
        slug: "gpt-5-6-sol",
        note: "Replacement named for o1, o1-pro, o3, o3-deep-research, and o3-pro.",
      },
      {
        id: "gpt-5.6-terra",
        provider: "azure-openai",
        slug: "gpt-5-6-terra",
        note: "Replacement named for o3-mini and o4-mini.",
      },
    ],
    shutdowns: [{ provider: "azure-openai", date: "2026-11-19" }],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Point the deployment at the replacement in the table before the retirement date. Working with models says automatic updates are supported for Standard deployment types. NoAutoUpgrade never upgrades, and at retirement that deployment stops working. You then point the code at a deployment that has not expired. The replacement ids are the ones in the table, from the retirement schedule.",
        ],
        samples: [],
        sourceLabel: "Working with Azure OpenAI models",
        sourceUrl: AZURE_WORKING,
      },
      {
        heading: "LiteLLM",
        text: [
          "This page does not show a LiteLLM call. Change the Azure deployment the proxy uses so it is a deployment of the replacement id on the schedule. The 410 status is on the lifecycle page, after the model is retired.",
        ],
        samples: [],
        sourceLabel: "Foundry Models lifecycle",
        sourceUrl: AZURE_RETIREMENTS,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "This page does not show an AI SDK call. The Azure target is a deployment of the replacement model. The lifecycle page is the source for 410 Gone.",
        ],
        samples: [],
        sourceLabel: "Azure OpenAI retirement schedule",
        sourceUrl: AZURE_SCHEDULE,
      },
    ],
    guides: [
      { href: "/migrate/azure-openai__o1-2024-12-17__to__azure-openai__gpt-5-6-sol/", label: "o1 2024-12-17 to gpt-5.6-sol" },
      { href: "/migrate/azure-openai__o1-pro-2025-03-19__to__azure-openai__gpt-5-6-sol/", label: "o1-pro 2025-03-19 to gpt-5.6-sol" },
      { href: "/migrate/azure-openai__o3-2025-04-16__to__azure-openai__gpt-5-6-sol/", label: "o3 2025-04-16 to gpt-5.6-sol" },
      { href: "/migrate/azure-openai__o3-deep-research-2025-06-26__to__azure-openai__gpt-5-6-sol/", label: "o3-deep-research 2025-06-26 to gpt-5.6-sol" },
      { href: "/migrate/azure-openai__o3-mini-2025-01-31__to__azure-openai__gpt-5-6-terra/", label: "o3-mini 2025-01-31 to gpt-5.6-terra" },
      { href: "/migrate/azure-openai__o3-pro-2025-06-10__to__azure-openai__gpt-5-6-sol/", label: "o3-pro 2025-06-10 to gpt-5.6-sol" },
      { href: "/migrate/azure-openai__o4-mini-2025-04-16__to__azure-openai__gpt-5-6-terra/", label: "o4-mini 2025-04-16 to gpt-5.6-terra" },
    ],
    seeAlso: [
      { href: "/shutdowns/azure-openai-2026-11-19/", label: "Azure OpenAI November 19, 2026 batch" },
      { href: "/models/azure-openai/o4-mini-2025-04-16/", label: "o4-mini 2025-04-16" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: AZURE_SCHEDULE, label: "Azure OpenAI retirement schedule" },
    ],
    faqs: [
      {
        question: "Do these models return 410 Gone before November 19, 2026?",
        answer:
          "The schedule lists them as Deprecated, which the lifecycle page maps to API status Deprecating. Inference still works in that stage. 410 Gone is what the page says a Retired model returns. The retirement date on the matching SunsetDiff rows is 2026-11-19.",
      },
      {
        question: "Will every deployment return 410 on that date?",
        answer:
          "The lifecycle page says Global Standard, Data Zone Standard, and Standard deployments are auto-upgraded at retirement, and provisioned deployments are not. Working with models says automatic updates are supported for Standard deployment types. NoAutoUpgrade never upgrades, and that deployment stops working at retirement.",
      },
      {
        question: "Is the o4-mini fine-tuned deployment date the shutdown date?",
        answer:
          "No. SunsetDiff stores shutdown_date 2026-11-19 from the schedule's base row, with replacement gpt-5.6-terra. The fine-tuned deployment retirement is 2027-11-19 and is stored only as a note on [o4-mini 2025-04-16](/models/azure-openai/o4-mini-2025-04-16/).",
      },
    ],
    citations: [AZURE_RETIREMENTS, AZURE_SCHEDULE, AZURE_WORKING],
  },
  {
    slug: "deepseek-model-not-found",
    provider: "deepseek",
    checked: "2026-10-25",
    cause: "A request still sends deepseek-chat or deepseek-reasoner after 2026-07-24.",
    title: "DeepSeek model_not_found and Model Not Exist | SunsetDiff",
    description:
      "deepseek-chat and deepseek-reasoner were discontinued on 2026-07-24. A public log shows HTTP 400 and Model Not Exist for a different missing id. The current ids are deepseek-flash and deepseek-v4-pro.",
    h1: "Model Not Exist",
    lead: "deepseek-chat and deepseek-reasoner stopped on 2026-07-24. A call that still sends one of those ids fails. The JSON below is a real DeepSeek body from a public log. It was not logged for those two ids after the retirement.",
    errorQuoted: true,
    errorText: DEEPSEEK_MODEL_NOT_EXIST,
    quoteSourceLabel: "GitHub issue NoFxAiOS/nofx#912",
    quoteSourceUrl: ISSUE_DEEPSEEK_NOFX,
    rule: "The DeepSeek API changelog for 2026-04-24 says the legacy names deepseek-chat and deepseek-reasoner will be discontinued on 2026-07-24. During that period they point to the non-thinking mode and the thinking mode of deepseek-v4-flash, respectively. The V4 preview note says those two names are fully retired and inaccessible after Jul 24th, 2026, 15:59 (UTC Time). The 2026-09-10 changelog says deepseek-v4-flash and deepseek-v4-flash-vision-exp have been retired, and that those names are temporarily routed to V4.1 Flash. It also says to use deepseek-flash. The pricing page lists deepseek-flash (DeepSeek-V4.1-Flash-1017) and deepseek-v4-pro (DeepSeek-V4-Pro-0813). It says the legacy names deepseek-v4-flash and deepseek-v4-flash-vision-exp are still accepted, the models have been retired, and requests are served by DeepSeek-V4.1-Flash-1017. The error-codes page lists 400, 401, 402, 422, 429, 500, and 503. It does not print model_not_found, Model Not Exist, or a JSON body. The WorkBuddy page says `Model Not Found` or `404`: check whether the model id is exactly deepseek-flash. That line is client troubleshooting, not an API body. GitHub issue NoFxAiOS/nofx#912, opened 2025-11-11, logs HTTP 400 from https://api.deepseek.com/v1/chat/completions for model name DeepSeek-V3.2-Exp, with the JSON in the Error text block. GitHub issue AstrBotDevs/AstrBot#7286, opened 2026-04-02, logs the same message, type, and code as a Python error for the prefixed id deepseek/deepseek-reasoner sent to https://api.deepseek.com. That was a prefix bug, and it was before 2026-07-24. GitHub issue aaif-goose/goose#13114 says selecting deepseek-reasoner fails with model_not_found and does not print a JSON body. This page did not find a public log that pastes the JSON above for deepseek-chat or deepseek-reasoner after 2026-07-24.",
    ruleSourceLabel: "DeepSeek API changelog",
    ruleSourceUrl: DEEPSEEK_UPDATES,
    modelsCaption: "Retired names, the replacement named on the 2026-04-24 changelog, and the two ids on the current pricing page.",
    models: [
      {
        id: "deepseek-chat",
        provider: "deepseek",
        slug: "deepseek-chat",
        note: "Discontinued 2026-07-24. Until then, the changelog says it points to the non-thinking mode of deepseek-v4-flash.",
      },
      {
        id: "deepseek-reasoner",
        provider: "deepseek",
        slug: "deepseek-reasoner",
        note: "Discontinued 2026-07-24. Until then, the changelog says it points to the thinking mode of deepseek-v4-flash.",
      },
      {
        id: "deepseek-v4-flash",
        provider: "deepseek",
        slug: "deepseek-v4-flash",
        note: "Named as the model those two ids pointed to. The 2026-09-10 changelog says it has been retired and the name is temporarily routed to V4.1 Flash. No shutdown day is printed.",
      },
      {
        id: "deepseek-flash",
        provider: "deepseek",
        slug: "deepseek-flash",
        note: "Current pricing-page id for DeepSeek-V4.1-Flash-1017. The changelog says to use this name.",
      },
      {
        id: "deepseek-v4-pro",
        provider: "deepseek",
        slug: "deepseek-v4-pro",
        note: "Current pricing-page id for DeepSeek-V4-Pro-0813. The 2026-04-24 changelog also says the model parameter can be set to this id. No shutdown date is published.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "The quick start sets base_url to https://api.deepseek.com and the model to deepseek-flash or deepseek-v4-pro. The thinking-mode page says the OpenAI-format toggle is thinking type enabled or disabled, passed in extra_body, and that thinking is enabled by default.",
          "deepseek-chat was the non-thinking mode, so the sample sets thinking type disabled. deepseek-reasoner was the thinking mode, so use type enabled for that old id. The quick start says to apply for an API key. This sample does not include one.",
        ],
        samples: [
          {
            caption: "Python, replacement for deepseek-chat",
            code: `from openai import OpenAI
client = OpenAI(base_url="https://api.deepseek.com")
response = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "Hello"}],
    extra_body={"thinking": {"type": "disabled"}},
)
`,
          },
          {
            caption: "Python, replacement for deepseek-reasoner",
            code: `from openai import OpenAI
client = OpenAI(base_url="https://api.deepseek.com")
response = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "Hello"}],
    extra_body={"thinking": {"type": "enabled"}},
)
`,
          },
          {
            caption: "Node",
            code: `import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://api.deepseek.com" });
const response = await client.chat.completions.create({
  model: "deepseek-flash",
  messages: [{ role: "user", content: "Hello" }],
});
`,
          },
        ],
        sourceLabel: "DeepSeek API quick start",
        sourceUrl: DEEPSEEK_QUICK_START,
      },
      {
        heading: "LiteLLM",
        text: [
          "This page does not show a LiteLLM call. The DeepSeek quick start sample uses the OpenAI SDK with base_url https://api.deepseek.com and model deepseek-flash or deepseek-v4-pro.",
        ],
        samples: [],
        sourceLabel: "DeepSeek API quick start",
        sourceUrl: DEEPSEEK_QUICK_START,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "This page does not show an AI SDK call. The quick start sample is the OpenAI SDK. Set the host to https://api.deepseek.com and the model to deepseek-flash or deepseek-v4-pro.",
        ],
        samples: [],
        sourceLabel: "DeepSeek API quick start",
        sourceUrl: DEEPSEEK_QUICK_START,
      },
    ],
    guides: [
      { href: "/migrate/deepseek__deepseek-chat__to__deepseek__deepseek-v4-flash/", label: "deepseek-chat to deepseek-v4-flash" },
      { href: "/migrate/deepseek__deepseek-reasoner__to__deepseek__deepseek-v4-flash/", label: "deepseek-reasoner to deepseek-v4-flash" },
    ],
    seeAlso: [
      { href: "/models/deepseek/deepseek-chat/", label: "deepseek-chat" },
      { href: "/models/deepseek/deepseek-reasoner/", label: "deepseek-reasoner" },
      { href: "/models/deepseek/deepseek-flash/", label: "deepseek-flash" },
      { href: "/models/deepseek/deepseek-v4-pro/", label: "deepseek-v4-pro" },
      { href: "/models/deepseek/deepseek-v4-flash/", label: "deepseek-v4-flash" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after a model shutdown" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: DEEPSEEK_ERRORS, label: "DeepSeek error codes" },
      { href: DEEPSEEK_THINKING, label: "DeepSeek thinking mode" },
    ],
    faqs: [
      {
        question: "Does deepseek-chat return this JSON after July 24, 2026?",
        answer:
          "This page did not find a public log that pastes this JSON for deepseek-chat or deepseek-reasoner after 2026-07-24. The quoted body is from NoFxAiOS/nofx#912 on 2025-11-11, HTTP 400, for model name DeepSeek-V3.2-Exp. AstrBotDevs/AstrBot#7286 logs the same message on 2026-04-02 for a prefixed id. The official error-codes page does not print the body.",
      },
      {
        question: "Which model id should I send instead?",
        answer:
          "The pricing page lists deepseek-flash and deepseek-v4-pro. The 2026-04-24 changelog says deepseek-chat and deepseek-reasoner pointed at deepseek-v4-flash. The 2026-09-10 changelog says that model has been retired and to use deepseek-flash. deepseek-v4-flash is still accepted and routed.",
      },
      {
        question: "Why do some reports say model_not_found?",
        answer:
          "aaif-goose/goose#13114 says selecting deepseek-reasoner fails with model_not_found and does not print a JSON body. The WorkBuddy page says Model Not Found or 404 when the id is not exactly deepseek-flash. Those words are not the JSON in the Error text block.",
      },
    ],
    citations: [
      DEEPSEEK_UPDATES,
      DEEPSEEK_NEWS,
      DEEPSEEK_PRICING,
      DEEPSEEK_QUICK_START,
      DEEPSEEK_THINKING,
      DEEPSEEK_ERRORS,
      DEEPSEEK_WORKBUDDY,
      ISSUE_DEEPSEEK_NOFX,
      ISSUE_DEEPSEEK_ASTRBOT,
      ISSUE_DEEPSEEK_GOOSE,
    ],
  },
  {
    slug: "openai-user-parameter-deprecated",
    provider: "openai",
    checked: "2026-10-26",
    cause: "Chat Completions labels the user field Deprecated. Responses says the same field is being replaced.",
    title: "OpenAI user parameter deprecated | SunsetDiff",
    description:
      "OpenAI's Chat Completions create reference labels user as Deprecated. Use safety_identifier and prompt_cache_key. No removal date is on the deprecations page.",
    h1: "Deprecated user field",
    lead: "The Chat Completions create method labels user as Deprecated. The Responses create method says the same field is being replaced. Neither page gives a day when user stops working.",
    errorQuoted: true,
    errorText: USER_FIELD_REPLACED,
    quoteSourceLabel: "Create chat completion",
    quoteSourceUrl: OPENAI_CHAT,
    rule: "The Chat Completions create reference prints Deprecated user, then this sentence: This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations. On that page, prompt_cache_key says it is used by OpenAI to cache responses for similar requests to optimize cache hit rates, and that it replaces the user field. safety_identifier says it is a stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should uniquely identify each user, with a maximum length of 64 characters. The page recommends hashing their username or email address, in order to avoid sending identifying information. The Responses create reference prints the same replacement sentence for user. It does not print the word Deprecated on that field. Its prompt_cache_key line also says the field replaces the user field. Its safety_identifier line says the maximum length is 128 characters, and it also recommends hashing a username or email address. The deprecations page, checked 2026-10-26, does not list the user field and does not give a removal date. The API changelog mentions safety_identifier for the Safety Usage Dashboard. It does not say the user field is deprecated and it does not give a removal date. The row below is a current model id whose create method documents the field. It is not a shutdown of that model.",
    ruleSourceLabel: "Create chat completion",
    ruleSourceUrl: OPENAI_CHAT,
    modelsCaption: "A current model id. The field is on the create method, not a shutdown of this id.",
    models: [
      {
        id: "gpt-5.5",
        provider: "openai",
        slug: "gpt-5-5",
        note: "The Chat Completions and Responses create methods document user on the request. This row is not a gpt-5.5 shutdown.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Send safety_identifier and prompt_cache_key instead of user. The Chat Completions page says to use prompt_cache_key to maintain caching optimizations, and safety_identifier to identify an end user. Hash the username or email. Chat Completions says the safety identifier maximum length is 64 characters. Responses says 128 characters. These samples do not include a key.",
        ],
        samples: [
          {
            caption: "Chat Completions, Python",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "Hello"}],
    safety_identifier="hashed-user-id",
    prompt_cache_key="cache-group",
)
`,
          },
          {
            caption: "Responses, Python",
            code: `from openai import OpenAI
client = OpenAI()
response = client.responses.create(
    model="gpt-5.5",
    input="Hello",
    safety_identifier="hashed-user-id",
    prompt_cache_key="cache-group",
)
`,
          },
          {
            caption: "Chat Completions, Node",
            code: `import OpenAI from "openai";
const client = new OpenAI();
const response = await client.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "Hello" }],
  safety_identifier: "hashed-user-id",
  prompt_cache_key: "cache-group",
});
`,
          },
        ],
        sourceLabel: "Create chat completion",
        sourceUrl: OPENAI_CHAT,
      },
      {
        heading: "LiteLLM",
        text: [
          "This page does not show a LiteLLM call. The Chat Completions create reference says to send safety_identifier and prompt_cache_key instead of user.",
        ],
        samples: [],
        sourceLabel: "Create chat completion",
        sourceUrl: OPENAI_CHAT,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "This page does not show an AI SDK call. The Chat Completions and Responses create references say to send safety_identifier and prompt_cache_key instead of user.",
        ],
        samples: [],
        sourceLabel: "Create a model response",
        sourceUrl: OPENAI_RESPONSES,
      },
    ],
    guides: [],
    seeAlso: [
      { href: OPENAI_CHAT, label: "Create chat completion" },
      { href: OPENAI_RESPONSES, label: "Create a model response" },
      { href: OPENAI_DEPRECATIONS, label: "OpenAI deprecations" },
      { href: OPENAI_CHANGELOG, label: "OpenAI API changelog" },
      { href: "/models/openai/gpt-5-5/", label: "gpt-5.5" },
    ],
    faqs: [
      {
        question: "What should I send instead of user?",
        answer:
          "safety_identifier and prompt_cache_key. The [Chat Completions create reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/) says user is being replaced by those two fields, and to use prompt_cache_key to maintain caching optimizations. safety_identifier is the stable id for abuse detection. Hash the username or email.",
      },
      {
        question: "When does user stop working?",
        answer:
          "The [deprecations page](https://developers.openai.com/api/docs/deprecations), checked 2026-10-26, does not list this field and does not give a removal date. The [API changelog](https://developers.openai.com/api/docs/changelog) does not give one either.",
      },
      {
        question: "Does Responses use the same replacement?",
        answer:
          "The [Responses create reference](https://developers.openai.com/api/reference/resources/responses/methods/create/) prints the same replacement sentence. It does not print the word Deprecated on user. Its safety_identifier maximum length is 128 characters. Chat Completions says 64 characters.",
      },
    ],
    citations: [OPENAI_CHAT, OPENAI_RESPONSES, OPENAI_DEPRECATIONS, OPENAI_CHANGELOG],
  },
  {
    slug: "nvidia-hosted-model-410-gone",
    provider: "nvidia",
    cause: "A hosted model id on integrate.api.nvidia.com has reached the end of life named in the 410 body.",
    title: "NVIDIA hosted model 410 Gone | SunsetDiff",
    description:
      "integrate.api.nvidia.com returns 410 Gone when a hosted model has reached its end of life. The quoted sentence is from a public issue log. Replacement steps use the NVIDIA pages on SunsetDiff.",
    h1: "NVIDIA hosted model has reached its end of life",
    lead: "A call to the NVIDIA hosted API can return HTTP 410 when that model id is past the end of life named in the body. Read the id, then look it up. Do not keep retrying it.",
    errorQuoted: true,
    errorText:
      "410 Gone: The model 'openai/gpt-oss-120b' has reached its end of life on 2026-09-03T08:00:00Z and is no longer available.",
    quoteSourceLabel: "E2E-Self-Heal issue 402",
    quoteSourceUrl: "https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402",
    checked: "2026-10-27",
    rule: "Issue 402 prints the sentence in the error block for openai/gpt-oss-120b. That id is not stored on SunsetDiff, because no NVIDIA model page or NVIDIA repository notice found on 2026-10-27 states that date. Issue omatheusmesmo/Qlawkus#357 prints: 410 Gone: The model 'nvidia/nv-embedqa-e5-v5' has reached its end of life on 2026-08-25T09:00:00Z. The build.nvidia.com page for nvidia/nv-embedqa-e5-v5 says the NIM endpoint has been deprecated and does not print that timestamp, so the stored shutdown date stays empty. Issue chimeranext/better-toolkits#127 reports HTTP 410 and the words reached its end of life on 2026-07-02 for z-ai/glm-5.1, and on 2026-08-07 for deepseek-ai/deepseek-v4-pro. It does not print a full error sentence. Those days are not stored. NVIDIA/NemoClaw issue 2120 says the full API shutdown for kimi-k2.5 is May 20, 2026, and names moonshotai/kimi-k2.6. Issue 1744 says GLM-5 fully shuts down on May 9, 2026. The hosted catalog does not publish one shutdown table. A deprecated banner on a model page means that hosted endpoint is deprecated. The AI Enterprise lifecycle page is the self-hosted NIM container list, not this error.",
    ruleSourceLabel: "E2E-Self-Heal issue 402",
    ruleSourceUrl: "https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402",
    modelsCaption:
      "Official NVIDIA records on this site. The quoted 410 names openai/gpt-oss-120b, which is not stored, because no NVIDIA page or NVIDIA repository notice was found for that date.",
    models: [
      {
        id: "nvidia/nv-embedqa-e5-v5",
        provider: "nvidia",
        slug: "nvidia-nv-embedqa-e5-v5",
        note: "The model page says the NIM endpoint is deprecated and does not print a day. Issue 357 prints a 410 sentence with 2026-08-25T09:00:00Z. That timestamp is not the stored shutdown date.",
      },
      {
        id: "moonshotai/kimi-k2.5",
        provider: "nvidia",
        slug: "moonshotai-kimi-k2-5",
        note: "NVIDIA/NemoClaw issue 2120 says the full API shutdown is May 20, 2026, and names moonshotai/kimi-k2.6.",
      },
      {
        id: "z-ai/glm5",
        provider: "nvidia",
        slug: "z-ai-glm5",
        note: "NVIDIA/NemoClaw issue 1744 says GLM-5 fully shuts down on May 9, 2026. The commit that cites it names z-ai/glm-5.1.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Read the model id inside the 410 body. Open that id on build.nvidia.com. If the page says the NIM endpoint has been deprecated and does not name a successor, the page has not published a replacement.",
          "If an NVIDIA GitHub notice names a successor, use that id. moonshotai/kimi-k2.5 names moonshotai/kimi-k2.6. z-ai/glm5 names z-ai/glm-5.1. The nemotron-4-340b-reward model page lists POST /chat/completions on https://integrate.api.nvidia.com/v1/. This sample only changes the model field. Do not copy a date from the AI Enterprise NIM container page onto a hosted slug.",
        ],
        samples: [
          {
            caption: "Hosted chat route, model field only",
            code: `curl https://integrate.api.nvidia.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"moonshotai/kimi-k2.6","messages":[{"role":"user","content":"Hello"}]}'
`,
          },
        ],
        sourceLabel: "nemotron-4-340b-reward model page",
        sourceUrl: "https://build.nvidia.com/nvidia/nemotron-4-340b-reward",
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM's Nvidia NIM page says to prefix the model with nvidia_nim/. The API endpoint it lists for chat is https://integrate.api.nvidia.com/v1/. Put that string in the proxy model_list, not in application code. After a 410, change the model string in that config.",
        ],
        samples: [
          {
            caption: "Proxy config, from the Nvidia NIM page",
            code: `model_list:
  - model_name: my-model
    litellm_params:
      model: nvidia_nim/moonshotai/kimi-k2.6
`,
          },
        ],
        sourceLabel: "LiteLLM Nvidia NIM",
        sourceUrl: "https://docs.litellm.ai/docs/providers/nvidia_nim",
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "The AI SDK NVIDIA NIM page says to create a provider with createOpenAICompatible and baseURL https://integrate.api.nvidia.com/v1. Pass the hosted model id to chatModel. That call is the place to change when a slug returns 410. The same page also sets an Authorization header from NIM_API_KEY. This sample leaves that header out and only shows the model id.",
        ],
        samples: [
          {
            caption: "TypeScript",
            code: `import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const { text } = await generateText({
  model: nim.chatModel("moonshotai/kimi-k2.6"),
  prompt: "Hello",
});
`,
          },
        ],
        sourceLabel: "AI SDK NVIDIA NIM",
        sourceUrl: "https://ai-sdk.dev/providers/openai-compatible-providers/nim",
      },
      {
        heading: "Do not hardcode the slug",
        text: [
          "Keep the model id in config. A 410 is about that id, so a retry of the same slug fails the same way. Point the fallback at a different id, or stop the lane.",
          "Check SunsetDiff before you pin a slug. In models.json, read rows whose provider is nvidia. shutdown_date is set only when an NVIDIA notice printed a day. status deprecated with an empty shutdown_date means the model page said deprecated and did not print a day.",
        ],
        samples: [
          {
            caption: "Config",
            code: `NVIDIA_MODEL=moonshotai/kimi-k2.6
`,
          },
          {
            caption: "SunsetDiff JSON",
            code: `curl -fsSL https://sunsetdiff.com/data/models.json
`,
          },
        ],
        sourceLabel: "SunsetDiff models.json",
        sourceUrl: "https://sunsetdiff.com/data/models.json",
      },
    ],
    guides: [
      {
        href: "/migrate/nvidia__moonshotai-kimi-k2-5__to__nvidia__moonshotai-kimi-k2-6/",
        label: "moonshotai/kimi-k2.5 to moonshotai/kimi-k2.6",
      },
      {
        href: "/migrate/nvidia__z-ai-glm5__to__nvidia__z-ai-glm-5-1/",
        label: "z-ai/glm5 to z-ai/glm-5.1",
      },
    ],
    seeAlso: [
      { href: "/providers/nvidia/", label: "NVIDIA hosted models" },
      { href: "/guides/nvidia-hosted-api-vs-nim-containers/", label: "Hosted API vs NIM containers" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before your users do" },
      { href: "https://github.com/omatheusmesmo/Qlawkus/issues/357", label: "Qlawkus issue 357" },
      { href: "https://github.com/chimeranext/better-toolkits/issues/127", label: "better-toolkits issue 127" },
    ],
    faqs: [
      {
        question: "What does this 410 mean?",
        answer:
          "The public log says the hosted model id in the sentence has reached its end of life and is no longer available. It is not a short outage of a live id. Stop calling that id.",
      },
      {
        question: "Where is the replacement?",
        answer:
          "Use a successor only when an NVIDIA page or NVIDIA repository notice names one. [moonshotai/kimi-k2.5](/models/nvidia/moonshotai-kimi-k2-5/) names moonshotai/kimi-k2.6. [z-ai/glm5](/models/nvidia/z-ai-glm5/) names z-ai/glm-5.1. A deprecated banner that says to transition to another model, and does not name one, has no published replacement. The list is [NVIDIA](/providers/nvidia/).",
      },
      {
        question: "How do I avoid the next hardcoded slug?",
        answer:
          "Put the id in config. After a 410, do not retry that id. Read [models.json](/data/models.json) and keep provider nvidia. The difference between the hosted API and self-hosted NIM containers is [Hosted API vs NIM containers](/guides/nvidia-hosted-api-vs-nim-containers/).",
      },
    ],
    citations: [
      "https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402",
      "https://github.com/omatheusmesmo/Qlawkus/issues/357",
      "https://github.com/chimeranext/better-toolkits/issues/127",
      "https://build.nvidia.com/nvidia/nv-embedqa-e5-v5",
      "https://build.nvidia.com/nvidia/nemotron-4-340b-reward",
      "https://github.com/NVIDIA/NemoClaw/issues/2120",
      "https://github.com/NVIDIA/NemoClaw/issues/1744",
      "https://github.com/NVIDIA/NemoClaw/commit/db665834691ecf35c55deaa6f64c9227463ef080",
      "https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html",
      "https://docs.litellm.ai/docs/providers/nvidia_nim",
      "https://ai-sdk.dev/providers/openai-compatible-providers/nim",
      "https://sunsetdiff.com/data/models.json",
    ],
  },
  {
    slug: "cloudflare-workers-ai-model-deprecated-410",
    provider: "cloudflare-workers-ai",
    checked: "2026-10-31",
    cause: "A Workers AI request still sends a model id the May 30, 2026 changelog lists as deprecated.",
    title: "Cloudflare Workers AI model deprecated HTTP 410 | SunsetDiff",
    description:
      "A public report says /chat/completions for @cf/meta/llama-3.1-8b-instruct returns HTTP 410 and code 5028 after the May 30, 2026 removal. The Workers AI errors page does not list that code.",
    h1: "Cloudflare Workers AI HTTP 410",
    lead: "A call that still sends a model from the May 30, 2026 Workers AI list can fail. GitHub issue lichengiggs/free-proxy#30 says a 2026-10-29 call to /chat/completions for @cf/meta/llama-3.1-8b-instruct returned HTTP 410 and code 5028. The JSON below is the body that issue writes in its acceptance section. The Workers AI errors page does not list this code.",
    errorQuoted: true,
    errorText:
      '{"success":false,"errors":[{"code":5028,"message":"AiError: Model has been deprecated"}],"messages":[],"result":null}',
    quoteSourceLabel: "free-proxy issue 30",
    quoteSourceUrl: "https://github.com/lichengiggs/free-proxy/issues/30",
    rule: "The May 8, 2026 changelog says to update apps to remove references to the listed models before the deprecation date. The heading is Models deprecated on May 30, 2026. That list includes @cf/meta/llama-3.1-8b-instruct and does not print a replacement arrow for it. The only arrow on the list is @cf/moonshotai/kimi-k2.5 to @cf/moonshotai/kimi-k2.6. The same post says requests will be automatically aliased to Kimi K2.6 on May 30, 2026, which has a higher price. It also says the -fast and -lora variants of models will remain active, including @cf/meta/llama-3.1-8b-instruct-fast. GitHub issue lichengiggs/free-proxy#30 says a 2026-10-29 call to /chat/completions on @cf/meta/llama-3.1-8b-instruct returned HTTP 410 and code 5028, and that the model was removed on 2026-05-30. The goal section does not paste a JSON body. The acceptance section writes the JSON in the Error text block for that HTTP 410. GitHub issue cloudflare/cloudflare-docs#32501 prints a different sentence from the Workers console: AiError: 5028: This model was deprecated on 2026-05-30. Please use an alternative model. That issue names cf/meta/llama-3.1-8b-instruct, without the @, and it does not print HTTP 410. The Workers AI errors page, last updated Sep 17, 2026, lists internal codes and HTTP codes. It does not list internal code 5028 or HTTP 410. The JSON Mode page, last updated Sep 14, 2026, still lists @cf/meta/llama-3.1-8b-instruct, @cf/meta/llama-3-8b-instruct, and @hf/nousresearch/hermes-2-pro-mistral-7b. Those three ids are on the May 30 list. The same page also lists @hf/thebloke/deepseek-coder-6.7b-instruct-awq, which the Workers AI changelog places in the October 1, 2025 deprecation set, and @cf/deepseek-ai/deepseek-r1-distill-qwen-32b, which this site does not store as a Cloudflare Workers AI row. The OpenAI-compatible endpoints page, last updated Sep 18, 2026, still sets model to @cf/meta/llama-3.1-8b-instruct on POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions. The REST API getting started page, last updated Sep 15, 2026, still runs @cf/meta/llama-3.1-8b-instruct at /ai/run/. GitHub issue fringe4life/larder#17 says the JSON Mode page lists @cf/meta/llama-3.1-8b-instruct. This page does not treat the October 1, 2025 ids as confirmed 410 responses.",
    ruleSourceLabel: "Cloudflare changelog, May 8, 2026",
    ruleSourceUrl: "https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/",
    modelsCaption: "Models the May 8, 2026 changelog lists under Models deprecated on May 30, 2026. A replacement is stored only where that list prints an arrow.",
    models: [
      {
        id: "@cf/meta/llama-3.1-8b-instruct",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-3-1-8b-instruct",
        note: "Named in free-proxy issue 30 and in cloudflare-docs issue 32501. The changelog lists it on May 30, 2026 and does not print a replacement. JSON Mode, the OpenAI-compatible example, and the REST getting started page still include this id.",
      },
      {
        id: "@cf/meta/llama-3-8b-instruct",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-3-8b-instruct",
        note: "On the May 30, 2026 list, with no arrow. The JSON Mode page still lists it.",
      },
      {
        id: "@hf/nousresearch/hermes-2-pro-mistral-7b",
        provider: "cloudflare-workers-ai",
        slug: "hf-nousresearch-hermes-2-pro-mistral-7b",
        note: "On the May 30, 2026 list, with no arrow. The JSON Mode page still lists it.",
      },
      {
        id: "@cf/moonshotai/kimi-k2.5",
        provider: "cloudflare-workers-ai",
        slug: "cf-moonshotai-kimi-k2-5",
        note: "The May 30 list prints an arrow to @cf/moonshotai/kimi-k2.6. The post says requests are automatically aliased to Kimi K2.6 on May 30, 2026, which has a higher price.",
      },
      {
        id: "@cf/meta/llama-3.1-8b-instruct-awq",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-3-1-8b-instruct-awq",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/meta/llama-3.1-70b-instruct",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-3-1-70b-instruct",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/meta/llama-3-8b-instruct-awq",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-3-8b-instruct-awq",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/meta/llama-2-7b-chat-fp16",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-2-7b-chat-fp16",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/meta/llama-2-7b-chat-int8",
        provider: "cloudflare-workers-ai",
        slug: "cf-meta-llama-2-7b-chat-int8",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@hf/meta-llama/meta-llama-3-8b-instruct",
        provider: "cloudflare-workers-ai",
        slug: "hf-meta-llama-meta-llama-3-8b-instruct",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/mistral/mistral-7b-instruct-v0.1",
        provider: "cloudflare-workers-ai",
        slug: "cf-mistral-mistral-7b-instruct-v0-1",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@hf/mistral/mistral-7b-instruct-v0.2",
        provider: "cloudflare-workers-ai",
        slug: "hf-mistral-mistral-7b-instruct-v0-2",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@hf/google/gemma-7b-it",
        provider: "cloudflare-workers-ai",
        slug: "hf-google-gemma-7b-it",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/google/gemma-3-12b-it",
        provider: "cloudflare-workers-ai",
        slug: "cf-google-gemma-3-12b-it",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/microsoft/phi-2",
        provider: "cloudflare-workers-ai",
        slug: "cf-microsoft-phi-2",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/defog/sqlcoder-7b-2",
        provider: "cloudflare-workers-ai",
        slug: "cf-defog-sqlcoder-7b-2",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/unum/uform-gen2-qwen-500m",
        provider: "cloudflare-workers-ai",
        slug: "cf-unum-uform-gen2-qwen-500m",
        note: "On the May 30, 2026 list, with no arrow.",
      },
      {
        id: "@cf/facebook/bart-large-cnn",
        provider: "cloudflare-workers-ai",
        slug: "cf-facebook-bart-large-cnn",
        note: "On the May 30, 2026 list, with no arrow.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Read the model id in the failing call. Open that id on the Cloudflare Workers AI provider page. A replacement is stored only when the changelog prints an arrow. The only arrow on the May 30 list is @cf/moonshotai/kimi-k2.5 to @cf/moonshotai/kimi-k2.6. @cf/meta/llama-3.1-8b-instruct has no stored replacement.",
          "The changelog says @cf/meta/llama-3.1-8b-instruct-fast remains active. That is a different id. It is not stored as the replacement for @cf/meta/llama-3.1-8b-instruct. The OpenAI-compatible page posts to https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions and its example still uses the retired id. This sample changes only the model field. The official example also sends an Authorization header. This sample leaves that header out.",
        ],
        samples: [
          {
            caption: "Chat completions, model field only",
            code: `curl --request POST \\
  --url https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions \\
  --header "Content-Type: application/json" \\
  --data '{"model":"@cf/meta/llama-3.1-8b-instruct-fast","messages":[{"role":"user","content":"Hello"}]}'
`,
          },
        ],
        sourceLabel: "OpenAI compatible API endpoints",
        sourceUrl: "https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/",
      },
      {
        heading: "REST run path",
        text: [
          "The REST getting started page calls https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/ plus the model id. Its example still uses @cf/meta/llama-3.1-8b-instruct. This sample keeps that path and that prompt, and changes the model id to one the changelog says remains active. It leaves out the Authorization header from the official example.",
        ],
        samples: [
          {
            caption: "REST run path, model field only",
            code: `curl https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct-fast \\
  -d '{ "prompt": "Where did the phrase Hello World come from" }'
`,
          },
        ],
        sourceLabel: "Workers AI REST API",
        sourceUrl: "https://developers.cloudflare.com/workers-ai/get-started/rest-api/",
      },
      {
        heading: "LiteLLM",
        text: [
          "This page does not show a LiteLLM call. The OpenAI-compatible page says to set the base URL to https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1 and to change the model field.",
        ],
        samples: [],
        sourceLabel: "OpenAI compatible API endpoints",
        sourceUrl: "https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/",
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "This page does not show an AI SDK call. Change the model id in the request. Use a replacement only when the SunsetDiff row names one.",
        ],
        samples: [],
        sourceLabel: "Cloudflare Workers AI provider page",
        sourceUrl: "https://sunsetdiff.com/providers/cloudflare-workers-ai/",
      },
      {
        heading: "Checklist",
        text: [
          "Search the repo for the model id in the error. Open its SunsetDiff model page and the Cloudflare Workers AI provider page. If the replacement cell names an id, switch to that id and test it. If the cell says Not published, stop sending the retired id.",
          "Do not copy a model id from the JSON Mode page, the OpenAI-compatible example, or the REST getting started example until you check the shutdown date. Those three pages still include @cf/meta/llama-3.1-8b-instruct. The -fast and -lora ids the changelog says remain active are separate rows.",
        ],
        samples: [
          {
            caption: "SunsetDiff JSON",
            code: `curl -fsSL https://sunsetdiff.com/data/models.json
`,
          },
        ],
        sourceLabel: "SunsetDiff models.json",
        sourceUrl: "https://sunsetdiff.com/data/models.json",
      },
    ],
    guides: [
      {
        href: "/migrate/cloudflare-workers-ai__cf-moonshotai-kimi-k2-5__to__cloudflare-workers-ai__cf-moonshotai-kimi-k2-6/",
        label: "@cf/moonshotai/kimi-k2.5 to @cf/moonshotai/kimi-k2.6",
      },
    ],
    seeAlso: [
      { href: "/providers/cloudflare-workers-ai/", label: "Cloudflare Workers AI" },
      { href: "/shutdowns/cloudflare-workers-ai-2026-05-30/", label: "May 30, 2026 shutdowns" },
      { href: "/models/cloudflare-workers-ai/cf-meta-llama-3-1-8b-instruct/", label: "@cf/meta/llama-3.1-8b-instruct" },
      { href: "/models/cloudflare-workers-ai/cf-meta-llama-3-1-8b-instruct-fast/", label: "@cf/meta/llama-3.1-8b-instruct-fast" },
      { href: "/models/cloudflare-workers-ai/cf-moonshotai-kimi-k2-5/", label: "@cf/moonshotai/kimi-k2.5" },
      { href: "https://developers.cloudflare.com/workers-ai/features/json-mode/", label: "JSON Mode" },
      { href: "https://developers.cloudflare.com/workers-ai/platform/errors/", label: "Workers AI errors" },
      { href: "https://github.com/fringe4life/larder/issues/17", label: "larder issue 17" },
      { href: "https://github.com/cloudflare/cloudflare-docs/issues/32501", label: "cloudflare-docs issue 32501" },
    ],
    shutdowns: [{ provider: "cloudflare-workers-ai", date: "2026-05-30" }],
    faqs: [
      {
        question: "Does Cloudflare's errors page list HTTP 410 or code 5028?",
        answer:
          "No. The [Workers AI errors page](https://developers.cloudflare.com/workers-ai/platform/errors/), last updated Sep 17, 2026, does not list internal code 5028 or HTTP 410. [free-proxy issue 30](https://github.com/lichengiggs/free-proxy/issues/30) says a 2026-10-29 call to /chat/completions for @cf/meta/llama-3.1-8b-instruct returned HTTP 410 and code 5028. The JSON in the Error text block is the body that issue writes in its acceptance section. [cloudflare-docs issue 32501](https://github.com/cloudflare/cloudflare-docs/issues/32501) prints AiError: 5028: This model was deprecated on 2026-05-30. Please use an alternative model. That issue does not print HTTP 410.",
      },
      {
        question: "What replaces @cf/meta/llama-3.1-8b-instruct?",
        answer:
          "The [changelog](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) does not print a replacement arrow for that id. SunsetDiff stores no replacement on [@cf/meta/llama-3.1-8b-instruct](/models/cloudflare-workers-ai/cf-meta-llama-3-1-8b-instruct/). The same post says [@cf/meta/llama-3.1-8b-instruct-fast](/models/cloudflare-workers-ai/cf-meta-llama-3-1-8b-instruct-fast/) remains active. That is a different id, not a stored replacement. The only stored replacement on the May 30 list is @cf/moonshotai/kimi-k2.6 for [@cf/moonshotai/kimi-k2.5](/models/cloudflare-workers-ai/cf-moonshotai-kimi-k2-5/). The full list is [Cloudflare Workers AI](/providers/cloudflare-workers-ai/).",
      },
      {
        question: "Why do Cloudflare's own docs still show the old model?",
        answer:
          "The [JSON Mode page](https://developers.cloudflare.com/workers-ai/features/json-mode/), last updated Sep 14, 2026, still lists @cf/meta/llama-3.1-8b-instruct. [larder issue 17](https://github.com/fringe4life/larder/issues/17) says that. The [OpenAI-compatible endpoints page](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) and the [REST getting started page](https://developers.cloudflare.com/workers-ai/get-started/rest-api/) still use the same id. The [May 8, 2026 changelog](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) lists it as deprecated on May 30, 2026.",
      },
    ],
    citations: [
      "https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/",
      "https://developers.cloudflare.com/workers-ai/platform/errors/",
      "https://developers.cloudflare.com/workers-ai/features/json-mode/",
      "https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/",
      "https://developers.cloudflare.com/workers-ai/get-started/rest-api/",
      "https://developers.cloudflare.com/workers-ai/changelog/",
      "https://github.com/lichengiggs/free-proxy/issues/30",
      "https://github.com/fringe4life/larder/issues/17",
      "https://github.com/cloudflare/cloudflare-docs/issues/32501",
      "https://sunsetdiff.com/providers/cloudflare-workers-ai/",
      "https://sunsetdiff.com/data/models.json",
    ],
  },
];
