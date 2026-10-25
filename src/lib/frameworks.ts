import type { ModelRecord } from "../schema.ts";
import { aliasIdOf } from "./aliases.ts";
import type { FaqItem } from "./format.ts";
import { upcomingShutdowns } from "./schedule.ts";

/** Day the official framework pages linked here were read. */
export const FRAMEWORKS_CHECKED = "2026-10-25";
export const FRAMEWORKS_INDEX = "/frameworks/";

const OPENAI_GPT6 = "https://developers.openai.com/api/docs/guides/latest-model";
const LANGCHAIN_OPENAI = "https://docs.langchain.com/oss/python/integrations/chat/openai";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const LITELLM_OPENAI = "https://docs.litellm.ai/docs/providers/openai";
const LITELLM_CONFIG = "https://docs.litellm.ai/docs/proxy/configs";
const LITELLM_FALLBACKS = "https://docs.litellm.ai/docs/completion/reliable_completions";
const LITELLM_PROXY = "https://docs.litellm.ai/docs/proxy/reliability";
const AI_SDK_OPENAI = "https://ai-sdk.dev/docs/guides/openai";
const LLAMAINDEX_OPENAI = "https://developers.llamaindex.ai/python/framework/integrations/llm/openai/";
const LLAMAINDEX_USING = "https://developers.llamaindex.ai/python/framework/understanding/using_llms/";
const LLAMAINDEX_CUSTOM = "https://developers.llamaindex.ai/python/framework/module_guides/models/llms/usage_custom/";
const LLAMAINDEX_SETTINGS = "https://developers.llamaindex.ai/python/framework/module_guides/supporting_modules/settings/";
const LLAMAINDEX_API = "https://developers.llamaindex.ai/python/framework-api-reference/llms/openai/";
const OPENROUTER_QUICKSTART = "https://openrouter.ai/docs/quickstart";
const OPENROUTER_FALLBACKS = "https://openrouter.ai/docs/guides/routing/model-fallbacks";
const PIPECAT_CHAT = "https://docs.pipecat.ai/api-reference/server/services/llm/openai";
const PIPECAT_RESPONSES = "https://docs.pipecat.ai/api-reference/server/services/llm/openai-responses";
const N8N_CHAT = "https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/";
const N8N_NODE = "https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/";
const N8N_TEXT = "https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/text-operations/";
const LANGFLOW_MODELS = "https://docs.langflow.org/components-models";
const LANGFLOW_OPENAI = "https://docs.langflow.org/bundles-openai";

/**
 * Chat ids these libraries put in a model field.
 * Audio, realtime, transcribe, and search ids are different products.
 * Dates are not in this pattern. They come from the model records.
 */
const CHAT_MODEL_ID =
  /^(gpt-4o|gpt-4o-mini|gpt-4\.1|gpt-4\.1-mini|gpt-4\.1-nano|gpt-4-turbo|gpt-4|gpt-3\.5-turbo)(-\d{4}-\d{2}-\d{2})?$/;

export interface FrameworkSource {
  label: string;
  url: string;
}

export interface FrameworkCode {
  caption: string;
  code: string;
}

export interface FrameworkSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  codes?: FrameworkCode[];
  sources: FrameworkSource[];
}

export interface FrameworkStep {
  name: string;
  text: string;
}

export interface FrameworkLink {
  href: string;
  label: string;
}

export interface FrameworkPage {
  slug: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  summary: string;
  answer: string;
  steps: FrameworkStep[];
  sections: FrameworkSection[];
  related: FrameworkLink[];
  faqs: FaqItem[];
  citations: string[];
}

export function frameworkPath(slug: string): string {
  return `/frameworks/${slug}/`;
}

export function frameworkHeadingId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Upcoming OpenAI chat rows whose ids match the families above. The date stays on the record. */
export function frameworkChatShutdowns(models: ModelRecord[], day: string): ModelRecord[] {
  return upcomingShutdowns(models, day).filter(
    (model) => model.provider === "openai" && CHAT_MODEL_ID.test(model.id),
  );
}

/** Short ids, such as gpt-4o, whose dated snapshots are in the shutdown list and which have no date of their own. */
export function frameworkUndatedAliases(models: ModelRecord[], shuttingDown: ModelRecord[]): ModelRecord[] {
  const aliasIds = new Set(
    shuttingDown.map((model) => aliasIdOf(model.id)).filter((id): id is string => Boolean(id)),
  );
  return models
    .filter(
      (model) =>
        model.provider === "openai" &&
        aliasIds.has(model.id) &&
        !aliasIdOf(model.id) &&
        model.shutdown_date_kind === "none" &&
        !model.shutdown_date,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

function joinIds(ids: string[]): string {
  if (ids.length <= 1) return ids[0] ?? "";
  if (ids.length === 2) return `${ids[0]} and ${ids[1]}`;
  return `${ids.slice(0, -1).join(", ")}, and ${ids[ids.length - 1]}`;
}

/** One sentence per shutdown date, built from records. Empty when nothing matches. */
export function frameworkShutdownLead(models: ModelRecord[]): string {
  if (!models.length) {
    return "No upcoming OpenAI chat model in the gpt-4o, gpt-4.1, gpt-4-turbo, gpt-4, or gpt-3.5-turbo families has a shutdown date in this dataset.";
  }
  const groups = new Map<string, ModelRecord[]>();
  for (const model of models) {
    const date = model.shutdown_date;
    if (!date) continue;
    const list = groups.get(date) ?? [];
    list.push(model);
    groups.set(date, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => {
      const ids = joinIds(group.map((model) => model.id).sort());
      const replacements = [
        ...new Set(
          group.flatMap((model) =>
            model.replacements.filter((item) => item.kind === "official").map((item) => item.model_id),
          ),
        ),
      ].sort();
      const verb = group.length === 1 ? "shuts down" : "shut down";
      const scope = group.length === 1 ? "this row" : "these rows";
      const replacement = replacements.length === 0
        ? " No official replacement is stored on these rows."
        : replacements.length === 1
          ? ` The official replacement on ${scope} is ${replacements[0]}.`
          : ` The official replacements on ${scope} are ${joinIds(replacements)}.`;
      return `${ids} ${verb} on ${date}.${replacement}`;
    })
    .join(" ");
}

export function frameworkAliasLead(aliases: ModelRecord[]): string {
  if (!aliases.length) return "";
  const ids = joinIds(aliases.map((model) => model.id));
  const verb = aliases.length === 1 ? "has" : "have";
  const record = aliases.length === 1 ? "its own record" : "their own records";
  return `${ids} ${verb} no shutdown date on ${record}. A request that sends the short id is not the dated snapshot row. Open the model page before you treat the short id as shut down.`;
}

const DETECT = "Check the id with lookup JSON, the MCP check_model tool, or a status badge before you ship the new string.";

const TOOL_LINKS: FrameworkLink[] = [
  { href: "/errors/gpt-6-1-sol-function-tools-chat-completions/", label: "gpt-6.1-sol and gpt-6-astra function tools error" },
  { href: "/errors/gpt-6-luna-function-tools-reasoning-effort/", label: "gpt-6-luna function tools error" },
  { href: "/guides/move-function-calling-to-responses-api/", label: "Move function calling to the Responses API" },
  { href: "/errors/", label: "All request errors" },
  { href: "/guides/swap-a-deprecated-model/", label: "Swap a model in LiteLLM, OpenRouter, the AI SDK, and LangChain" },
  { href: "/upcoming/", label: "All upcoming shutdowns" },
  { href: "/api/", label: "JSON API" },
  { href: "/mcp/", label: "MCP server" },
  { href: "/badges/", label: "Status badges" },
  { href: "/scan/", label: "Scan retiring ids" },
];

export const frameworkSharedFaqs: FaqItem[] = [
  {
    question: "Where do the dates in the shutdown table come from?",
    answer:
      "From SunsetDiff model records for upcoming OpenAI chat ids in the gpt-4o, gpt-4.1, gpt-4-turbo, gpt-4, and gpt-3.5-turbo families. The sentence above the table is built from those records when the site is built. Each row links the provider source stored on that record.",
  },
  {
    question: "How do I check one model id from this page?",
    answer:
      "Open [lookup JSON](/api/v1/lookup/gpt-4o.json) and replace gpt-4o with your id. Or call check_model on the [MCP server](/mcp/). Or use a [status badge](/badges/). No API key.",
  },
];

export const frameworkHubFaqs: FaqItem[] = [
  {
    question: "What is a framework page?",
    answer:
      "It says where that library stores the model id, how to change it, and which upcoming OpenAI chat shutdowns are in this dataset. Framework facts link the official docs. Dates come from the model records.",
  },
  {
    question: "Does the swap guide still exist?",
    answer:
      "Yes. [How to swap a deprecated model](/guides/swap-a-deprecated-model/) keeps the LiteLLM and OpenRouter fallback samples. These pages add Pipecat, n8n, LlamaIndex, and Langflow, and the shutdown table.",
  },
  {
    question: "Who publishes these pages?",
    answer: "Publisher: SunsetDiff. The site is independent and not affiliated with any AI provider or framework.",
  },
];

export const frameworks: FrameworkPage[] = [
  {
    slug: "langchain",
    name: "LangChain",
    title: "LangChain gpt-4o deprecated: where the model id lives | SunsetDiff",
    description:
      "The ChatOpenAI model argument is the OpenAI model id. Swap a deprecated gpt-4o string, and set use_responses_api for GPT-6 tool calls.",
    h1: "LangChain: where a deprecated model id lives",
    summary: "The OpenAI model id is the model argument on ChatOpenAI. On Azure that string is the deployment name.",
    answer:
      "A LangChain gpt-4o deprecated failure usually means the model argument on ChatOpenAI is still an old id. Change that string to the official replacement in the table on this page. For GPT-6 function tools, the ChatOpenAI page says to set use_responses_api to True, or to use a feature that routes to the Responses API.",
    steps: [
      { name: "Read the model argument", text: "ChatOpenAI takes the OpenAI model id in model. On Azure, the same page calls that string the deployment name." },
      { name: "Read the shutdown table", text: "The table is built from SunsetDiff records. Match the string in your constructor to a row." },
      { name: "Swap the string", text: "Put the official replacement id in model. On Azure, point model at a deployment that has not expired." },
      { name: "Move GPT-6 tool calls", text: "Set use_responses_api to True for function tools on models OpenAI says need the Responses API." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The LangChain OpenAI integration page constructs the client as ChatOpenAI(model=...). Documented examples on that page include model=\"gpt-5.5\", model=\"gpt-5.4-mini\", and model=\"gpt-6-astra\" together with use_responses_api=True.",
          "The same page says to set the OPENAI_API_KEY environment variable. This page does not show a credential.",
          "For Azure OpenAI, the page's v1 example passes model=\"gpt-5-mini\" and the comment says that string is your Azure deployment name. The base URL is the Azure endpoint with /openai/v1/ appended. The OpenAI model version behind a deployment is set on Microsoft's working-with-models page, not in the LangChain constructor.",
        ],
        codes: [
          {
            caption: "Python, from the ChatOpenAI page",
            code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-5.5")
`,
          },
        ],
        sources: [
          { label: "LangChain ChatOpenAI", url: LANGCHAIN_OPENAI },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "Pinning means the model string is a specific id, not a name you hope the library will update. Replace the string with the id on the shutdown row. Do not invent a short name that the provider page does not list.",
          "On Azure, changing the OpenAI model id in prose is not enough when the constructor holds a deployment name. Create or select a deployment for the replacement, then put that deployment name in model. The upgrade policy for the current deployment is on Microsoft's working-with-models page.",
          "Fallback lists for LiteLLM and OpenRouter are on the swap guide. The ChatOpenAI page does not document a fallback list on this class.",
        ],
        sources: [
          { label: "LangChain ChatOpenAI", url: LANGCHAIN_OPENAI },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The ChatOpenAI page says ChatOpenAI routes to the Responses API when you use a feature that requires it, such as the built-in web search tool. You can also set use_responses_api to True. The gpt-6-astra examples on that page set that flag. The page also says async tools are only supported via the Responses API.",
          "OpenAI's Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but tool calling requires the Responses API. GPT-6 Sol and GPT-6 Luna can keep function tools on Chat Completions only when reasoning effort is none. If the replacement in the table is one of those ids, read the error pages before you send tools.",
          "The request shape, the flat tool object, and the call_id result are on the Responses API guide. This page does not repeat that migration.",
        ],
        codes: [
          {
            caption: "Python, from the ChatOpenAI page",
            code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-6-astra", use_responses_api=True)
`,
          },
        ],
        sources: [
          { label: "LangChain ChatOpenAI", url: LANGCHAIN_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Where does LangChain store a gpt-4o model id?",
        answer:
          "In the model argument of ChatOpenAI. The [ChatOpenAI page](https://docs.langchain.com/oss/python/integrations/chat/openai) documents that argument. On Azure, the same page says the string is the deployment name.",
      },
      {
        question: "Does ChatOpenAI have a fallback list?",
        answer:
          "The ChatOpenAI page does not document one. LiteLLM and OpenRouter fallbacks are on the [swap guide](/guides/swap-a-deprecated-model/).",
      },
    ],
    citations: [LANGCHAIN_OPENAI, AZURE_WORKING, OPENAI_GPT6],
  },
  {
    slug: "litellm",
    name: "LiteLLM",
    title: "LiteLLM model shutdown: model string and proxy alias | SunsetDiff",
    description:
      "LiteLLM puts the provider model in the model string. The proxy alias is model_name. openai/responses/ sends one call to the Responses API.",
    h1: "LiteLLM: where a model id lives when a model shuts down",
    summary: "completion() takes a model string. The proxy alias is model_name. The provider id is litellm_params.model.",
    answer:
      "A LiteLLM model shutdown is a string in the model argument, or in litellm_params.model behind a proxy alias. Change the provider string to the official replacement in the table. For one Responses API call, the LiteLLM OpenAI page uses an openai/responses/ prefix.",
    steps: [
      { name: "Find both strings", text: "A direct call uses the model argument. A proxy client sends model_name. litellm_params.model is the provider string." },
      { name: "Read the shutdown table", text: "Match the provider string, not only the alias the application sends." },
      { name: "Swap the provider string", text: "Put the official replacement in model or in litellm_params.model. You can keep the alias if clients should not change." },
      { name: "Route GPT-6 tool calls", text: "Prefix one call with openai/responses/ when that call must use the Responses API." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The proxy config page says model_name is the name to pass to LiteLLM from the external client. litellm_params.model is the model string passed to litellm.completion(). A client can keep sending a private alias while the provider id behind it changes.",
          "The OpenAI provider page says a model string with the openai/ prefix calls Chat Completions. Prefix one call with openai/responses/ to send that call to the Responses API. The page shows openai/responses/gpt-6.1-sol for a request that includes tools.",
          "Credentials stay in the environment or in a credential field on the proxy. This page does not show a key.",
        ],
        codes: [
          {
            caption: "Proxy shape from the config page, keys removed",
            code: `model_list:
  - model_name: gpt-6.1-sol
    litellm_params:
      model: openai/gpt-6.1-sol
`,
          },
        ],
        sources: [
          { label: "LiteLLM proxy config", url: LITELLM_CONFIG },
          { label: "LiteLLM OpenAI provider", url: LITELLM_OPENAI },
        ],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "To pin a call, put the specific provider id in the model string. To swap a shutdown, replace that id with the official replacement from the table. If applications call a model_name alias, change litellm_params.model and leave the alias in place.",
          "The reliable completions page documents a fallbacks list on completion(). The proxy reliability page documents router_settings.fallbacks, which maps one model_name to another. Samples for both are on the swap guide.",
        ],
        sources: [
          { label: "LiteLLM proxy config", url: LITELLM_CONFIG },
          { label: "LiteLLM reliable completions", url: LITELLM_FALLBACKS },
          { label: "LiteLLM proxy fallbacks", url: LITELLM_PROXY },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "Use openai/responses/ plus the model id when the call includes function tools for a model OpenAI says must use the Responses API. The OpenAI provider page shows that prefix on gpt-6.1-sol.",
          "OpenAI's Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API. GPT-6 Sol and GPT-6 Luna can keep function tools on Chat Completions only with reasoning effort none. The error pages quote the failure and the working requests.",
        ],
        codes: [
          {
            caption: "Python, Responses prefix from the LiteLLM OpenAI page",
            code: `import litellm
response = litellm.completion(
    model="openai/responses/gpt-6.1-sol",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sources: [
          { label: "LiteLLM OpenAI provider", url: LITELLM_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Which LiteLLM field is the provider model id?",
        answer:
          "On a direct call, the model argument. On the proxy, litellm_params.model. model_name is the alias clients send. Source: the [proxy config page](https://docs.litellm.ai/docs/proxy/configs).",
      },
      {
        question: "How does LiteLLM call the Responses API?",
        answer:
          "Prefix the model string with openai/responses/. The [OpenAI provider page](https://docs.litellm.ai/docs/providers/openai) shows openai/responses/gpt-6.1-sol.",
      },
    ],
    citations: [LITELLM_OPENAI, LITELLM_CONFIG, LITELLM_FALLBACKS, LITELLM_PROXY, OPENAI_GPT6],
  },
  {
    slug: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    title: "Vercel AI SDK: swap a deprecated OpenAI model id | SunsetDiff",
    description:
      "openai('model-id') is the model string, and it calls the Responses API. openai.chat() stays on Chat Completions.",
    h1: "Vercel AI SDK: where a deprecated model id lives",
    summary: "The model id is the string passed to openai(), openai.chat(), or openai.responses().",
    answer:
      "In the Vercel AI SDK, the OpenAI model id is the string you pass to openai(). That factory uses the Responses API, and it has been the default since AI SDK 5. openai.chat() stays on Chat Completions. Change the string when the id in the table shuts down.",
    steps: [
      { name: "Find the factory call", text: "Look for openai('...'), openai.chat('...'), or openai.responses('...'). The string is the model id." },
      { name: "Read the shutdown table", text: "Match that string to a row. The date is the record's shutdown date." },
      { name: "Swap the string", text: "Pass the official replacement id to the same factory." },
      { name: "Keep GPT-6 tools on Responses", text: "The OpenAI guide says to use the Responses API for GPT-6 tool calling. openai.chat() does not do that." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The AI SDK OpenAI guide creates a language model with openai('model-id'). The example string on that page is gpt-6-astra. generateText and streamText take that model object.",
          "The provider reads the credential from the OPENAI_API_KEY environment variable. This page does not show a key.",
          "The guide does not document a fallback list. Ordered backups are on the LiteLLM and OpenRouter sections of the swap guide.",
        ],
        codes: [
          {
            caption: "TypeScript, from the AI SDK OpenAI guide",
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
        heading: "How to pin or swap it",
        paragraphs: [
          "The string you pass is the id that is sent. There is no separate alias field on this factory. Replace gpt-4o, or whichever id you pass, with the official replacement from the table.",
          "openai('id'), openai.responses('id'), and openai.chat('id') are three factories. Swap the string inside the factory you already call, unless you also need to change which API is used.",
        ],
        sources: [{ label: "AI SDK OpenAI guide", url: AI_SDK_OPENAI }],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The guide says the default OpenAI model factory, openai('model-id'), uses the Responses API. Since AI SDK 5 that is the default unless you select openai.chat. Use openai.chat('model-id') when a custom base URL implements Chat Completions and not Responses.",
          "The same guide says to use the Responses API for GPT-6 tool calling. It also says GPT-6 Astra and GPT-6.1 Sol do not support reasoning effort none. GPT-6 Sol and GPT-6 Luna do. The error pages are the write-up for the Chat Completions failure.",
        ],
        codes: [
          {
            caption: "Chat Completions factory, from the AI SDK OpenAI guide",
            code: `import { openai } from "@ai-sdk/openai";

const model = openai.chat("gpt-6-astra");
`,
          },
        ],
        sources: [
          { label: "AI SDK OpenAI guide", url: AI_SDK_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Does openai('gpt-4o') call Chat Completions?",
        answer:
          "No. The [AI SDK OpenAI guide](https://ai-sdk.dev/docs/guides/openai) says openai('model-id') uses the Responses API. openai.chat('model-id') is the Chat Completions factory.",
      },
      {
        question: "Is there a fallback argument?",
        answer:
          "The OpenAI guide does not document a fallback list. Use the [swap guide](/guides/swap-a-deprecated-model/) for LiteLLM fallbacks or OpenRouter's models array.",
      },
    ],
    citations: [AI_SDK_OPENAI, OPENAI_GPT6],
  },
  {
    slug: "llamaindex",
    name: "LlamaIndex",
    title: "LlamaIndex: swap a deprecated OpenAI model id | SunsetDiff",
    description:
      "LlamaIndex sets the OpenAI model id on OpenAI(model=...) and on Settings.llm. The OpenAI integration page does not document a Responses switch.",
    h1: "LlamaIndex: where a deprecated model id lives",
    summary: "The model id is the model argument of llama_index.llms.openai.OpenAI. Settings.llm is the global default.",
    answer:
      "LlamaIndex puts the OpenAI model id in OpenAI(model=...). Settings.llm is the global default when a call does not pass its own LLM. The OpenAI integration page does not document a Responses API switch. If you swap in a GPT-6 id that needs Responses for function tools, read the error pages before you send tools.",
    steps: [
      { name: "Find the constructor", text: "Search for OpenAI(model=...) and for Settings.llm. A query engine can also take llm= and override the global setting." },
      { name: "Read the shutdown table", text: "Match the string to a dated row. A short alias can be a different record from the snapshot." },
      { name: "Swap the string", text: "Pass the official replacement to model, and assign that client to Settings.llm if the rest of the app uses the global default." },
      { name: "Read the tool pages", text: "This library's OpenAI page does not document a Responses switch. Use the function-tool pages before you send tools to a GPT-6 id." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The using-LLMs page says you specify a model by passing model to the LLM constructor. Its example is OpenAI(model=\"gpt-4o-mini\").",
          "The OpenAI integration page repeats that call, including OpenAI(model=\"gpt-4o\") and OpenAI(model=\"gpt-4o-mini\"). It says the constructor uses the OPENAI_API_KEY environment variable by default. This page does not show a key.",
          "The API reference says the model parameter is the name of the OpenAI model to use, and that its default is DEFAULT_OPENAI_MODEL. The customizing-LLMs page says the default LLM is OpenAI's gpt-3.5-turbo. This page does not claim those two defaults are the same string.",
          "The Settings page says Settings.llm is the global LLM when a component does not receive one. The customizing page shows Settings.llm = OpenAI(...) and a local override, query_engine = index.as_query_engine(llm=llm).",
        ],
        codes: [
          {
            caption: "Constructor, from the using-LLMs page",
            code: `from llama_index.llms.openai import OpenAI

llm = OpenAI(model="gpt-4o-mini")
`,
          },
          {
            caption: "Global default, from the Settings page",
            code: `from llama_index.core import Settings
from llama_index.llms.openai import OpenAI

Settings.llm = OpenAI(model="gpt-4o-mini")
`,
          },
        ],
        sources: [
          { label: "LlamaIndex using LLMs", url: LLAMAINDEX_USING },
          { label: "LlamaIndex OpenAI integration", url: LLAMAINDEX_OPENAI },
          { label: "LlamaIndex OpenAI API reference", url: LLAMAINDEX_API },
          { label: "LlamaIndex customizing LLMs", url: LLAMAINDEX_CUSTOM },
          { label: "LlamaIndex Settings", url: LLAMAINDEX_SETTINGS },
        ],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "Change the model string to the official replacement on the shutdown row. If Settings.llm is set, change that assignment too, or a path that omits llm= will keep the old global id.",
          "The OpenAI integration page does not document a router alias or a fallback list. A second model is a second OpenAI(model=...) call in your code.",
        ],
        sources: [
          { label: "LlamaIndex OpenAI integration", url: LLAMAINDEX_OPENAI },
          { label: "LlamaIndex Settings", url: LLAMAINDEX_SETTINGS },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The LlamaIndex OpenAI integration page does not document a Responses API switch. Do not add a flag this page did not find there.",
          "OpenAI's Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API, and that GPT-6 Sol and GPT-6 Luna accept function tools on Chat Completions only with reasoning effort none. If the replacement id is one of those models, read the error pages and the Responses API guide before you send tools.",
        ],
        sources: [
          { label: "LlamaIndex OpenAI integration", url: LLAMAINDEX_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "What is the LlamaIndex argument for an OpenAI model id?",
        answer:
          "model, on llama_index.llms.openai.OpenAI. The [using LLMs page](https://developers.llamaindex.ai/python/framework/understanding/using_llms/) shows OpenAI(model=\"gpt-4o-mini\"). The global default is Settings.llm.",
      },
      {
        question: "Does LlamaIndex document a Responses API mode?",
        answer:
          "Not on the OpenAI integration page checked for this article. The OpenAI rule for GPT-6 tool calls is on the [function tools error page](/errors/gpt-6-1-sol-function-tools-chat-completions/) and the [Responses API guide](/guides/move-function-calling-to-responses-api/).",
      },
    ],
    citations: [LLAMAINDEX_OPENAI, LLAMAINDEX_USING, LLAMAINDEX_CUSTOM, LLAMAINDEX_SETTINGS, LLAMAINDEX_API, OPENAI_GPT6],
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    title: "OpenRouter model shutdown: pin or swap the model slug | SunsetDiff",
    description:
      "OpenRouter takes the model slug in the model field. A ~ alias tracks a latest model. The models array is the documented fallback list.",
    h1: "OpenRouter: where a model slug lives",
    summary: "The request field model is the slug. A ~ prefix is a latest alias. models is the fallback list.",
    answer:
      "OpenRouter's quickstart puts the slug in the model field of a chat completions request. The example ~openai/gpt-sol-latest is a latest alias. A pinned call uses a specific slug instead. When that slug is an OpenAI id in the shutdown table, swap it for the official replacement.",
    steps: [
      { name: "Read the model field", text: "The chat completions body, the OpenAI SDK model argument, and the OpenRouter SDK model field are the same slug." },
      { name: "Decide alias or pin", text: "A value that starts with ~ is a latest alias in the quickstart. A shutdown swap uses the specific replacement slug." },
      { name: "Edit fallbacks", text: "The models array is tried in order after the first model errors. Update that list when an entry shuts down." },
      { name: "Read the tool pages", text: "The quickstart posts to the chat completions endpoint. It does not document a Responses switch." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The quickstart sends POST /api/v1/chat/completions with a model field. Its example is ~openai/gpt-sol-latest. The page says that value is a latest alias that always resolves to the newest model in the OpenAI GPT Sol family, and that you can substitute any model slug.",
          "The same page shows the slug on the OpenAI SDK pointed at https://openrouter.ai/api/v1, on the OpenRouter Python and TypeScript SDKs, and on the Agent SDK callModel model field. This page does not include an API key.",
        ],
        codes: [
          {
            caption: "Slug from the OpenRouter quickstart",
            code: `model = "~openai/gpt-sol-latest"
`,
          },
        ],
        sources: [{ label: "OpenRouter quickstart", url: OPENROUTER_QUICKSTART }],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "To pin, replace the ~ alias with a specific slug from the OpenRouter catalog. To swap a provider id that is shutting down, use the official replacement from the table as that slug. OpenRouter slugs are prefixed with the provider, so an OpenAI id gpt-4o is not always the same string as the OpenRouter slug.",
          "The model fallbacks guide says the models array is tried in order when the first model returns an error. The swap guide quotes that page, including the extra_body.models shape used with the OpenAI SDK. The ids in that sample are the guide's examples.",
        ],
        codes: [
          {
            caption: "Arguments quoted on the swap guide from the fallbacks page",
            code: `model = "~openai/gpt-sol-latest"
extra_body = {
    "models": ["~anthropic/claude-sonnet-latest", "gryphe/mythomax-l2-13b"]
}
`,
          },
        ],
        sources: [
          { label: "OpenRouter quickstart", url: OPENROUTER_QUICKSTART },
          { label: "OpenRouter model fallbacks", url: OPENROUTER_FALLBACKS },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The quickstart posts to /api/v1/chat/completions. It does not document a Responses API switch, so this page does not invent one.",
          "If the slug you send is an OpenAI model, OpenAI's Using GPT-6 guide still applies to that provider: GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API, and GPT-6 Sol and GPT-6 Luna accept function tools on Chat Completions only with reasoning effort none. Read the error pages before you send tools.",
        ],
        sources: [
          { label: "OpenRouter quickstart", url: OPENROUTER_QUICKSTART },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "What does the ~ prefix mean on OpenRouter?",
        answer:
          "The [quickstart](https://openrouter.ai/docs/quickstart) says ~openai/gpt-sol-latest is a latest alias for the newest model in the OpenAI GPT Sol family. A pinned request uses a specific slug instead.",
      },
      {
        question: "Where is the fallback list?",
        answer:
          "In the models array. The [model fallbacks guide](https://openrouter.ai/docs/guides/routing/model-fallbacks) says that list is tried in order. The sample is also on the [swap guide](/guides/swap-a-deprecated-model/#openrouter).",
      },
    ],
    citations: [OPENROUTER_QUICKSTART, OPENROUTER_FALLBACKS, OPENAI_GPT6],
  },
  {
    slug: "pipecat",
    name: "Pipecat",
    title: "Pipecat GPT-6 tool calls and the default OpenAI model | SunsetDiff",
    description:
      "Pipecat's OpenAILLMService is Chat Completions. Its settings default model is gpt-4.1. GPT-6 tool calls need a Responses service.",
    h1: "Pipecat: the OpenAI model id and GPT-6 tool calls",
    summary: "OpenAILLMService is Chat Completions. The settings default model is gpt-4.1. Responses is a different class.",
    answer:
      "Pipecat's OpenAI LLM page documents OpenAILLMService for chat completions. The settings table default for model is gpt-4.1. GPT-6 tool calls that OpenAI rejects on Chat Completions need OpenAIResponsesLLMService or OpenAIResponsesHttpLLMService, which are the Responses API classes.",
    steps: [
      { name: "See which class you construct", text: "OpenAILLMService is Chat Completions. OpenAIResponsesLLMService and OpenAIResponsesHttpLLMService are the Responses API." },
      { name: "Read settings.model", text: "The model id lives in Settings(model=...). The old model= constructor argument is deprecated." },
      { name: "Swap a retiring id", text: "Put the official replacement in settings.model. The default string gpt-4.1 is an alias. Check the dated rows in the table." },
      { name: "Move tool calls", text: "A pipeline that still constructs OpenAILLMService is still on Chat Completions." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The OpenAI LLM page says OpenAILLMService provides chat completion. The settings table lists model as a string whose default is gpt-4.1. The basic setup example passes settings=OpenAILLMService.Settings(model=\"gpt-4o\"). A later example uses model=\"gpt-4.1\".",
          "The constructor argument named model is marked deprecated since 0.0.105 and removed in 2.0.0. The page says to use settings=OpenAILLMService.Settings(...) instead.",
          "If the API key argument is omitted, the page says the service uses the OPENAI_API_KEY environment variable. This page does not show a key.",
        ],
        codes: [
          {
            caption: "Chat Completions, default id from the settings table",
            code: `from pipecat.services.openai.llm import OpenAILLMService

llm = OpenAILLMService(
    settings=OpenAILLMService.Settings(model="gpt-4.1"),
)
`,
          },
        ],
        sources: [{ label: "Pipecat OpenAI LLM", url: PIPECAT_CHAT }],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "Change the string in Settings(model=...). That is the OpenAI model id. The page does not document a router alias or a fallback list.",
          "The documented default is the short id gpt-4.1. The shutdown table lists dated snapshot ids. Read the alias sentence under the table before you treat gpt-4.1 itself as shut down. If a dated row is the id you send, swap that string for the official replacement on the row.",
        ],
        sources: [{ label: "Pipecat OpenAI LLM", url: PIPECAT_CHAT }],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The Responses page says to use OpenAILLMService for the Chat Completions API and OpenAIResponsesLLMService or OpenAIResponsesHttpLLMService for the Responses API. Both Responses classes take settings.model. Their settings table also defaults model to gpt-4.1.",
          "Both the chat page and the Responses page say function calling is registered with register_function. The Responses page says the WebSocket variant is the one to use when the workflow involves frequent tool calls.",
          "OpenAI's Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API. A pipeline that still constructs OpenAILLMService is still on Chat Completions, which is the endpoint that guide says cannot run those function tools. GPT-6 Sol and GPT-6 Luna are the models that guide allows on Chat Completions only with reasoning effort none. The error pages record the failure text.",
        ],
        codes: [
          {
            caption: "Responses service, from the Pipecat Responses page",
            code: `from pipecat.services.openai.responses.llm import OpenAIResponsesLLMService

llm = OpenAIResponsesLLMService(
    settings=OpenAIResponsesLLMService.Settings(model="gpt-4.1"),
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
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Why do Pipecat GPT-6 tool calls fail on the default OpenAI service?",
        answer:
          "OpenAILLMService is the Chat Completions service. The [OpenAI LLM page](https://docs.pipecat.ai/api-reference/server/services/llm/openai) says so, and its default model string is gpt-4.1. OpenAI's [Using GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model) says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API. Use OpenAIResponsesLLMService or OpenAIResponsesHttpLLMService.",
      },
      {
        question: "Where is the Pipecat model id if the constructor has no model argument?",
        answer:
          "In settings, as OpenAILLMService.Settings(model=...). The page says the old model= constructor argument is deprecated since 0.0.105 and removed in 2.0.0.",
      },
    ],
    citations: [PIPECAT_CHAT, PIPECAT_RESPONSES, OPENAI_GPT6],
  },
  {
    slug: "n8n",
    name: "n8n",
    title: "n8n OpenAI model deprecated: the Model field | SunsetDiff",
    description:
      "n8n's OpenAI Chat Model node has a Model field and defaults to Chat Completions. Turn on Use Responses API for the Responses API.",
    h1: "n8n: where a deprecated OpenAI model lives",
    summary: "The Model field on the OpenAI Chat Model node is the model. Chat Completions is the default until you turn on Use Responses API.",
    answer:
      "An n8n OpenAI model deprecated error is the model selected on the OpenAI Chat Model node, or on an OpenAI node text operation. The chat model node loads models from the account and uses Chat Completions until you turn on Use Responses API. Swap the selected model for the official replacement in the table.",
    steps: [
      { name: "Open the node", text: "On an AI agent, open the OpenAI Chat Model sub-node. On the OpenAI node, open the text operation." },
      { name: "Read the Model field", text: "That field is the model id. The chat model page says n8n loads the list from OpenAI." },
      { name: "Pick the replacement", text: "Select the official replacement from the shutdown table. The text operations page suggests gpt-4o and gpt-4o-mini only as examples when you are not sure." },
      { name: "Turn on Responses when tools need it", text: "Use Responses API is off by default. GPT-6 tool calls that OpenAI rejects on Chat Completions need that toggle, or the Generate a Model Response operation." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The OpenAI Chat Model page has a Model parameter: select the model used to generate the completion. It says n8n dynamically loads models from OpenAI, and you only see the models available to your account. That page does not name a default model id.",
          "The OpenAI node text operations page also has a Model field, on Generate a Chat Completion and on Generate a Model Response. For Generate a Chat Completion it says that if you are not sure which model to use, try gpt-4o for higher intelligence or gpt-4o-mini for speed and cost. Those are suggestions on the page, not a stored default in the parameter table.",
          "The credential is the OpenAI API key on the credential, not the model id. This page does not show a key.",
        ],
        sources: [
          { label: "n8n OpenAI Chat Model", url: N8N_CHAT },
          { label: "n8n OpenAI text operations", url: N8N_TEXT },
        ],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "Select a specific model in the Model field. That is the pin. To swap a shutdown, select the official replacement from the table instead of the retiring id.",
          "The chat model page does not document a fallback list or a router alias. The text operations suggestion of gpt-4o is not a promise that the short id has no dated snapshot behind it. Read the alias sentence under the table.",
        ],
        sources: [
          { label: "n8n OpenAI Chat Model", url: N8N_CHAT },
          { label: "n8n OpenAI text operations", url: N8N_TEXT },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The OpenAI Chat Model page says the node defaults to the Chat Completions API. Turn on Use Responses API to generate output with the Responses API. Built-in tools on that page, Web Search, File Search, and Code Interpreter, require the toggle, and the page says they work with the AI Agent node.",
          "The OpenAI node page says OpenAI node V2 is available from n8n 1.117.0. It supports the Responses API. It renames Message a Model to Generate a Chat Completion, for the Chat Completions API, and adds Generate a Model Response, for the Responses API.",
          "OpenAI's Using GPT-6 guide says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API. Leaving the chat model node on the default Chat Completions path is the wrong endpoint for those tools. The error pages describe the failure. n8n's pages do not name gpt-6-astra or gpt-6.1-sol.",
        ],
        sources: [
          { label: "n8n OpenAI Chat Model", url: N8N_CHAT },
          { label: "n8n OpenAI node", url: N8N_NODE },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Where is the model id in n8n?",
        answer:
          "In the Model field of the OpenAI Chat Model node, or the Model field of an OpenAI node text operation. The [chat model page](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/) says the list is loaded from your OpenAI account.",
      },
      {
        question: "Does the n8n OpenAI Chat Model node use the Responses API by default?",
        answer:
          "No. The chat model page says the node uses Chat Completions unless you turn on Use Responses API. Generate a Model Response, on OpenAI node V2, is the Responses operation.",
      },
    ],
    citations: [N8N_CHAT, N8N_TEXT, N8N_NODE, OPENAI_GPT6],
  },
  {
    slug: "langflow",
    name: "Langflow",
    title: "Langflow: swap a deprecated OpenAI model name | SunsetDiff",
    description:
      "Langflow's Language Model component stores the id in model_name. The OpenAI bundle component stores it in model. Neither page documents a Responses switch.",
    h1: "Langflow: where a deprecated OpenAI model name lives",
    summary: "The core component uses provider and model_name. The OpenAI bundle component uses model.",
    answer:
      "Langflow stores the model on the Language Model component as model_name, after you enable that model in Model Providers. The OpenAI bundle component stores it in a parameter named model. Neither page documents a Responses API switch. Swap the selected name for the official replacement in the table, and enable that model in settings.",
    steps: [
      { name: "Find the component", text: "The core Language Model component has provider and model_name. The OpenAI bundle component has model." },
      { name: "Check global Models", text: "A model has to be enabled in Settings, Model Providers, before the dropdown can select it." },
      { name: "Swap the name", text: "Select the official replacement in model_name or in the OpenAI component's model field, and enable that model in Model Providers." },
      { name: "Read the tool pages", text: "These Langflow pages do not document a Responses switch. Read the function-tool pages before you send tools to a GPT-6 id." },
      { name: "Check the id", text: DETECT },
    ],
    sections: [
      {
        heading: "Where the model id lives",
        paragraphs: [
          "The Language Model page says the core component parameters include provider and model_name. It says the options depend on the selected provider and your global Models configuration. You enable models under your profile, Settings, Model Providers. Text models are listed under Language Models.",
          "The OpenAI bundle page says the OpenAI component parameter model is the name of the OpenAI model to use. The description says options include gpt-3.5-turbo and gpt-4. That is the list printed on the page, not a claim that those are the only ids the field accepts.",
          "The OpenAI Embeddings component on the same page has its own Model parameter. The page says its default is text-embedding-3-small. That field is the embedding model, not the chat model.",
          "The credential is the API key in Model Providers, or the OpenAI component's API key parameter. This page does not show a key.",
        ],
        sources: [
          { label: "Langflow Language Model", url: LANGFLOW_MODELS },
          { label: "Langflow OpenAI bundle", url: LANGFLOW_OPENAI },
        ],
      },
      {
        heading: "How to pin or swap it",
        paragraphs: [
          "Pinning is selecting one model_name, or one model value, instead of leaving a template on the example ids the OpenAI page prints. To swap a shutdown, select the official replacement from the table and enable that model in Model Providers. The Language Model page says a model that is not enabled does not appear for selection.",
          "An Agent can use its built-in model, or a Language Model component whose output type is Language Model. The Language Model page says the Agent then inherits the connected component's model. Change the component, not only a label on the Agent, when the connected model is the one that is shutting down.",
          "Neither page documents a fallback list or a router alias.",
        ],
        sources: [
          { label: "Langflow Language Model", url: LANGFLOW_MODELS },
          { label: "Langflow OpenAI bundle", url: LANGFLOW_OPENAI },
        ],
      },
      {
        heading: "GPT-6 function tools",
        paragraphs: [
          "The Language Model page and the OpenAI bundle page do not document a Responses API switch. This page does not add one.",
          "If the name you select is an OpenAI chat id, OpenAI's Using GPT-6 guide still says GPT-6 Astra and GPT-6.1 Sol tool calling requires the Responses API, and GPT-6 Sol and GPT-6 Luna accept function tools on Chat Completions only with reasoning effort none. Read the error pages before you send tools through a component that is still on Chat Completions.",
        ],
        sources: [
          { label: "Langflow Language Model", url: LANGFLOW_MODELS },
          { label: "Langflow OpenAI bundle", url: LANGFLOW_OPENAI },
          { label: "Using GPT-6", url: OPENAI_GPT6 },
        ],
      },
    ],
    related: TOOL_LINKS,
    faqs: [
      {
        question: "Which Langflow field is the OpenAI model id?",
        answer:
          "model_name on the Language Model component, and model on the OpenAI bundle component. Sources: the [Language Model page](https://docs.langflow.org/components-models) and the [OpenAI bundle page](https://docs.langflow.org/bundles-openai).",
      },
      {
        question: "Does Langflow document a Responses API toggle?",
        answer:
          "Not on the Language Model page or the OpenAI bundle page checked for this article. The OpenAI tool rule is on the [function tools error page](/errors/gpt-6-1-sol-function-tools-chat-completions/).",
      },
    ],
    citations: [LANGFLOW_MODELS, LANGFLOW_OPENAI, OPENAI_GPT6],
  },
];

export function frameworkBySlug(slug: string | undefined): FrameworkPage | undefined {
  return frameworks.find((page) => page.slug === slug);
}

export const frameworkCitationHosts = [
  "developers.openai.com",
  "learn.microsoft.com",
  "docs.litellm.ai",
  "ai-sdk.dev",
  "docs.langchain.com",
  "developers.llamaindex.ai",
  "openrouter.ai",
  "docs.pipecat.ai",
  "docs.n8n.io",
  "docs.langflow.org",
] as const;
