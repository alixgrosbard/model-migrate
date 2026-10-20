import type { FaqItem } from "./format.ts";
import { moreRequestErrors } from "./request-error-more.ts";

/** Day the official pages below were read for these error pages. */
export const REQUEST_ERRORS_CHECKED = "2026-10-20";
export const REQUEST_ERRORS_INDEX = "/errors/";

const SONNET_GUIDE = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const LUNA_PAGE = "https://developers.openai.com/api/docs/models/gpt-6-luna";
const OPENAI_TOOLS = "https://developers.openai.com/api/docs/guides/function-calling";
const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_ERRORS = "https://developers.openai.com/api/docs/guides/error-codes";
const OPENAI_CHAT = "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/";
const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const LITELLM_DROP = "https://docs.litellm.ai/docs/completion/drop_params";
const LITELLM_OPENAI = "https://docs.litellm.ai/docs/providers/openai";
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

export const requestErrorProviders = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai", name: "OpenAI" },
  { id: "google-gemini-api", name: "Google Gemini API" },
] as const;

export const requestErrorHubFaqs: FaqItem[] = [
  {
    question: "Where are the request error pages?",
    answer:
      "They are listed on [Request errors](/errors/), grouped by provider. Each row links to one page.",
  },
  {
    question: "Is the error text on these pages copied from a provider?",
    answer:
      "When the source prints the sentence, it is in the Error text block and the page links that source. When the source does not print a sentence, the page says what fails in plain words and does not invent one.",
  },
  {
    question: "Which shutdowns do these pages cover?",
    answer:
      "The OpenAI page is for the October 23, 2026 batch. The Gemini API page is for the October 22, 2026 batch. The Claude pages are for claude-sonnet-5-5, which rejects request settings older Sonnet models accepted.",
  },
];

export interface ErrorSample {
  caption: string;
  code: string;
}

export interface ErrorFix {
  heading: string;
  text: string[];
  samples: ErrorSample[];
  sourceLabel: string;
  sourceUrl: string;
}

export interface ErrorGuideLink {
  href: string;
  label: string;
}

export interface ErrorModel {
  id: string;
  note: string;
  provider: string;
  slug: string;
}

export interface ErrorShutdownLink {
  provider: string;
  date: string;
}

export interface RequestErrorPage {
  slug: string;
  provider: (typeof requestErrorProviders)[number]["id"];
  /** Short line for the hub: which model change causes this failure. */
  cause: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  /** When true, errorText is copied word for word. The quote source is quoteSourceUrl, or ruleSourceUrl when that field is absent. */
  errorQuoted: boolean;
  errorText: string;
  /** Visible link for a quote that does not come from ruleSourceUrl. */
  quoteSourceLabel?: string;
  quoteSourceUrl?: string;
  rule: string;
  ruleSourceLabel: string;
  ruleSourceUrl: string;
  modelsCaption?: string;
  models: ErrorModel[];
  fixes: ErrorFix[];
  guides: ErrorGuideLink[];
  shutdowns?: ErrorShutdownLink[];
  faqs: FaqItem[];
  citations: string[];
}

export const requestErrors: RequestErrorPage[] = [
  {
    slug: "claude-temperature-is-deprecated-for-this-model",
    provider: "anthropic",
    cause: "A non-default temperature on claude-sonnet-5-5.",
    title: "temperature is deprecated for this model | SunsetDiff",
    description:
      "claude-sonnet-5-5 returns HTTP 400 when temperature, top_p, or top_k is not the default. Remove those fields. Source: Anthropic's Sonnet 5.5 migration guide.",
    h1: "temperature is deprecated for this model",
    lead: "A request to claude-sonnet-5-5 that sets a non-default temperature, top_p, or top_k comes back as HTTP 400. Remove those fields.",
    errorQuoted: true,
    errorText: "temperature is deprecated for this model",
    rule: "Anthropic's Sonnet 5.5 migration guide says a non-default temperature, top_p, or top_k returns a 400 error. Remove them. Claude Sonnet 4.6 and earlier, and Claude Haiku 4.5, still accept those fields.",
    ruleSourceLabel: "Claude Sonnet 5.5 migration guide",
    ruleSourceUrl: SONNET_GUIDE,
    models: [
      {
        id: "claude-sonnet-5-5",
        provider: "anthropic",
        slug: "claude-sonnet-5-5",
        note: "Returns 400 when temperature, top_p, or top_k is set to a non-default value.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "Call the Messages API without temperature, top_p, or top_k. The migration guide's working request leaves those fields out.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "TypeScript",
            code: `import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 16000,
  messages: [{ role: "user", content: "Hello" }],
});
`,
          },
        ],
        sourceLabel: "Claude Sonnet 5.5 migration guide",
        sourceUrl: SONNET_GUIDE,
      },
      {
        heading: "LiteLLM",
        text: [
          "Do not send temperature, top_p, or top_k. LiteLLM's drop_params setting removes a field only when LiteLLM already lists that field as unsupported for the model. To remove temperature and top_p on this call, pass additional_drop_params.",
        ],
        samples: [
          {
            caption: "Python",
            code: `import litellm
response = litellm.completion(
    model="anthropic/claude-sonnet-5-5",
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
          "Leave temperature, topP, and topK unset on generateText and streamText. The AI SDK passes those values through to the provider.",
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
    guides: [
      {
        href: "/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/",
        label: "claude-sonnet-4-5-20250929 to claude-sonnet-5-5",
      },
    ],
    faqs: [
      {
        question: "Which model returns this 400?",
        answer:
          "claude-sonnet-5-5. Anthropic's migration guide says a non-default temperature, top_p, or top_k returns a 400 error on that model. Claude Sonnet 4.6 and earlier, and Claude Haiku 4.5, still accept those fields.",
      },
      {
        question: "What should the request send instead?",
        answer:
          "Omit temperature, top_p, and top_k. The same guide says thinking budgets are replaced by output_config.effort. The switch guide lists each request change: [claude-sonnet-4-5-20250929 to claude-sonnet-5-5](/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/).",
      },
    ],
    citations: [SONNET_GUIDE, LITELLM_DROP, AI_SDK_GENERATE],
  },
  {
    slug: "gpt-6-luna-function-tools-reasoning-effort",
    provider: "openai",
    cause: "Function tools on gpt-6-luna Chat Completions when reasoning_effort is not none.",
    title: "Function tools with reasoning_effort are not supported for gpt-6-luna | SunsetDiff",
    description:
      "gpt-6-luna accepts function tools on Chat Completions only when reasoning_effort is none. Otherwise use the Responses API. Source: the GPT-6 Luna model page.",
    h1: "Function tools with reasoning_effort are not supported for gpt-6-luna",
    lead: "A Chat Completions request that sends function tools to gpt-6-luna fails unless reasoning_effort is none. The model page says to use the Responses API for function calling.",
    errorQuoted: true,
    errorText: "Function tools with reasoning_effort are not supported for gpt-6-luna in /v1/chat/completions",
    rule: "The GPT-6 Luna model page says: use the Responses API for built-in tools and function calling. Chat Completions supports function calling only with reasoning_effort set to none. The same page lists fine-tuning (v1/fine-tuning) as not supported.",
    ruleSourceLabel: "GPT-6 Luna model page",
    ruleSourceUrl: LUNA_PAGE,
    models: [
      {
        id: "gpt-6-luna",
        provider: "openai",
        slug: "gpt-6-luna",
        note: "Function calling on Chat Completions works only with reasoning_effort set to none. The Responses API is the documented path for function calling.",
      },
    ],
    fixes: [
      {
        heading: "Raw SDK",
        text: [
          "For function tools, call the Responses API. To stay on Chat Completions, set reasoning_effort to none. The model page says that is the only Chat Completions function-calling mode for gpt-6-luna. The Responses tool object matches OpenAI's function calling guide: https://developers.openai.com/api/docs/guides/function-calling",
        ],
        samples: [
          {
            caption: "Responses API (Python)",
            code: `from openai import OpenAI
client = OpenAI()
response = client.responses.create(
    model="gpt-6-luna",
    input=[{"role": "user", "content": "Hello"}],
    tools=[{
        "type": "function",
        "name": "get_weather",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    }],
)
`,
          },
          {
            caption: "Chat Completions, reasoning_effort none (Python)",
            code: `from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-6-luna",
    messages=[{"role": "user", "content": "Hello"}],
    reasoning_effort="none",
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    }],
)
`,
          },
        ],
        sourceLabel: "GPT-6 Luna model page",
        sourceUrl: LUNA_PAGE,
      },
      {
        heading: "LiteLLM",
        text: [
          "LiteLLM documents model openai/responses/gpt-6-luna for the Responses API. Use that when the call includes function tools. On a Chat Completions model string, set reasoning_effort to none, which is the only function-calling mode the OpenAI model page allows on that endpoint.",
        ],
        samples: [
          {
            caption: "Responses API",
            code: `import litellm
response = litellm.completion(
    model="openai/responses/gpt-6-luna",
    messages=[{"role": "user", "content": "Hello"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    }],
)
`,
          },
          {
            caption: "Chat Completions",
            code: `import litellm
response = litellm.completion(
    model="openai/gpt-6-luna",
    messages=[{"role": "user", "content": "Hello"}],
    reasoning_effort="none",
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    }],
)
`,
          },
        ],
        sourceLabel: "LiteLLM OpenAI provider",
        sourceUrl: LITELLM_OPENAI,
      },
      {
        heading: "Vercel AI SDK",
        text: [
          "openai('gpt-6-luna') uses the Responses API. The AI SDK guide says to use the Responses API for GPT-6 tool calling. openai.chat() stays on Chat Completions, so set providerOptions.openai.reasoningEffort to none when that call includes tools.",
        ],
        samples: [
          {
            caption: "Responses API",
            code: `import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-6-luna"),
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
          {
            caption: "Chat Completions",
            code: `import { openai, type OpenAILanguageModelChatOptions } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: openai.chat("gpt-6-luna"),
  prompt: "What is the weather in Paris?",
  tools: {
    get_weather: tool({
      description: "Get the weather for a city.",
      inputSchema: z.object({ city: z.string() }),
    }),
  },
  providerOptions: {
    openai: {
      reasoningEffort: "none",
    } satisfies OpenAILanguageModelChatOptions,
  },
});
`,
          },
        ],
        sourceLabel: "AI SDK OpenAI guide",
        sourceUrl: AI_SDK_OPENAI,
      },
    ],
    guides: [
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
    ],
    faqs: [
      {
        question: "Which model returns this 400?",
        answer:
          "gpt-6-luna, on POST /v1/chat/completions, when the request includes function tools and reasoning_effort is not none. The model page lists Chat Completions as supported for other calls.",
      },
      {
        question: "What are the two working requests?",
        answer:
          "Use the Responses API for function calling. On Chat Completions, set reasoning_effort to none. Switch guides: [gpt-4o-mini-2024-07-18](/migrate/openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna/), [gpt-4o-2024-08-06](/migrate/openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna/), and [gpt-4o-2024-11-20](/migrate/openai__gpt-4o-2024-11-20__to__openai__gpt-6-luna/).",
      },
      {
        question: "Can gpt-6-luna be fine-tuned?",
        answer: "No. The GPT-6 Luna model page lists the fine-tuning endpoint as not supported.",
      },
    ],
    citations: [LUNA_PAGE, OPENAI_TOOLS, LITELLM_OPENAI, AI_SDK_OPENAI],
  },
  ...moreRequestErrors,
];

export function requestErrorPath(slug: string): string {
  return `/errors/${slug}/`;
}

export function requestErrorBySlug(slug: string | undefined): RequestErrorPage | undefined {
  return requestErrors.find((page) => page.slug === slug);
}

export function requestErrorsForProvider(provider: string): RequestErrorPage[] {
  return requestErrors.filter((page) => page.provider === provider);
}

export function requestErrorsForModel(provider: string, modelId: string): RequestErrorPage[] {
  return requestErrors.filter((page) => page.models.some((model) => model.provider === provider && model.id === modelId));
}

export function requestErrorsForMigration(pair: string): RequestErrorPage[] {
  const href = `/migrate/${pair}/`;
  return requestErrors.filter((page) => page.guides.some((guide) => guide.href === href));
}

export function requestErrorsForShutdown(provider: string, date: string): RequestErrorPage[] {
  return requestErrors.filter((page) => page.shutdowns?.some((item) => item.provider === provider && item.date === date) ?? false);
}
