import type { FaqItem } from "./format.ts";
import { guideHeadingId, guidePath } from "./guides.ts";
import { MCP_ENDPOINT, MCP_PATH } from "./mcp-docs.ts";

export const SWAP_GUIDE_SLUG = "swap-a-deprecated-model";
export const SWAP_STACKS = ["LiteLLM", "OpenRouter", "Vercel AI SDK", "LangChain"] as const;

export interface IntegrationLink {
  href: string;
  label: string;
  detail: string;
}

export function swapGuideLinks(): IntegrationLink[] {
  const path = guidePath(SWAP_GUIDE_SLUG);
  return [
    {
      href: path,
      label: "How to swap a deprecated model",
      detail: "One guide covers LiteLLM, OpenRouter, the Vercel AI SDK, and LangChain.",
    },
    {
      href: "/frameworks/",
      label: "Framework pages",
      detail: "One page per library for where the model id lives, including Pipecat, n8n, LlamaIndex, and Langflow.",
    },
    ...SWAP_STACKS.map((heading) => ({
      href: `${path}#${guideHeadingId(heading)}`,
      label: heading,
      detail: `Section of the swap guide for ${heading}.`,
    })),
  ];
}

export function integrationGroups(): { heading: string; links: IntegrationLink[] }[] {
  return [
    { heading: "Swap a model", links: swapGuideLinks() },
    {
      heading: "Connect an assistant",
      links: [
        {
          href: MCP_PATH,
          label: "MCP server",
          detail: `Free streamable HTTP server at ${MCP_ENDPOINT}. No API key.`,
        },
      ],
    },
    {
      heading: "Read the data",
      links: [
        {
          href: "/api/",
          label: "JSON API",
          detail: "Static JSON, CSV, RSS, and iCalendar files. No API key.",
        },
        {
          href: "/badges/",
          label: "Status badges",
          detail: "Free SVG badges for a model id and its status.",
        },
        {
          href: "/feed.xml",
          label: "RSS feed",
          detail: "New deprecations. /rss.xml is the same feed.",
        },
        {
          href: "/deadlines.ics",
          label: "Deadline calendar",
          detail: "iCalendar of shutdowns in the next 365 days.",
        },
      ],
    },
    {
      heading: "GitHub Action",
      links: [
        {
          href: "/data/#github-action",
          label: "GitHub Action",
          detail: "The action in action/ flags model ids that are deprecated or shutting down. The workflow step is on the data page.",
        },
      ],
    },
  ];
}

export function integrationLinks(): IntegrationLink[] {
  return integrationGroups().flatMap((group) => group.links);
}

export const integrationFaqs: FaqItem[] = [
  {
    question: "Where do I change a model id in LiteLLM, OpenRouter, the Vercel AI SDK, or LangChain?",
    answer:
      "In the guide [How to swap a deprecated model](/guides/swap-a-deprecated-model/), and on the [framework pages](/frameworks/). The guide has a section for LiteLLM, OpenRouter, the Vercel AI SDK, and LangChain. The framework pages add Pipecat, n8n, LlamaIndex, and Langflow, and list shutdown rows from this dataset.",
  },
  {
    question: "Does SunsetDiff charge for the API or the MCP server?",
    answer: `No. The [API](/api/) and the [MCP server](${MCP_PATH}) are free and need no API key. The MCP endpoint is ${MCP_ENDPOINT}.`,
  },
  {
    question: "Who publishes these pages?",
    answer: "Publisher: SunsetDiff. The site is independent and not affiliated with any AI provider.",
  },
];
