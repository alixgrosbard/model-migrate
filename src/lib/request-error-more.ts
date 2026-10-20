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
    citations: [SONNET_GUIDE, LITELLM_DROP, AI_SDK_GENERATE],
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
];
