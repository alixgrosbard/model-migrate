import { z } from "zod";
import { toJsonSchemaCompat } from "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js";
import type { FaqItem } from "./format.ts";
import {
  MCP_SERVER_VERSION,
  MCP_TOOL_DESCRIPTIONS,
  MCP_TOOL_ORDER,
  mcpToolInputs,
} from "../../service/src/mcp-tools.ts";

/** Day the official client and registry docs linked from /mcp/ were read. */
export const MCP_DOCS_CHECKED = "2026-10-23";
export const MCP_PATH = "/mcp/";
export const INTEGRATIONS_PATH = "/integrations/";
export const MCP_ENDPOINT = "https://sunsetdiff-api.onrender.com/mcp";
export const MCP_REGISTRY_NAME = "com.sunsetdiff/sunsetdiff";
export const MCP_SERVER_JSON_PATH = "/server.json";
export const MCP_SCHEMA_URL = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

export { MCP_SERVER_VERSION };

export interface McpToolDoc {
  name: (typeof MCP_TOOL_ORDER)[number];
  description: string;
  inputSchema: Record<string, unknown>;
  notes: string[];
  prompt: string;
}

export interface McpClientDoc {
  id: string;
  name: string;
  paragraphs: string[];
  steps?: string[];
  files?: string[];
  snippets: { caption: string; code: string }[];
  docs: { label: string; url: string }[];
}

const encodedEndpoint = encodeURIComponent(MCP_ENDPOINT);

export const claudeConnectorUrl =
  `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=SunsetDiff&connectorUrl=${encodedEndpoint}`;

export function mcpInputSchema(shape: Record<string, z.ZodTypeAny>): Record<string, unknown> {
  return toJsonSchemaCompat(z.object(shape), { strictUnions: true, pipeStrategy: "input" });
}

export const mcpTools: McpToolDoc[] = MCP_TOOL_ORDER.map((name) => ({
  name,
  description: MCP_TOOL_DESCRIPTIONS[name],
  inputSchema: mcpInputSchema(mcpToolInputs[name]),
  notes: toolNotes(name),
  prompt: toolPrompt(name),
}));

function toolNotes(name: (typeof MCP_TOOL_ORDER)[number]): string[] {
  if (name === "check_model") {
    return [
      "model_id is required. provider is optional. When provider is set, the row must use that provider id.",
      "When no row matches, the tool returns found set to false and the model_id you sent.",
      "shutdown_date_kind via_snapshots means the date is the latest dated snapshot on the deprecations page. The alias id itself is not listed by name.",
    ];
  }
  if (name === "upcoming_shutdowns") {
    return [
      "days and provider are optional. The input schema does not set a default.",
      "When days is omitted, the handler uses 90. The window is today through that many days.",
      "A row is included only when shutdown_date_kind is exact and the shutdown date falls in that window.",
    ];
  }
  if (name === "migration_diff") {
    return [
      "from_model_id is required. to_model_id is optional.",
      "When to_model_id is omitted, the handler uses the first official replacement on that model.",
    ];
  }
  return [
    "text is required.",
    "The tool returns model ids found in that text whose status is deprecated, retired, or legacy.",
  ];
}

function toolPrompt(name: (typeof MCP_TOOL_ORDER)[number]): string {
  if (name === "check_model") return "Check the model id gpt-4o. Add the provider if you know it.";
  if (name === "upcoming_shutdowns") return "Which models have an exact shutdown date in the next 30 days?";
  if (name === "migration_diff") return "Show the migration diff from gpt-4o to the official replacement.";
  return "Scan this text for model ids that are deprecated, retired, or legacy.";
}

export const mcpClients: McpClientDoc[] = [
  {
    id: "claude",
    name: "Claude custom connector",
    paragraphs: [
      "Claude's help center says custom connectors using remote MCP are available on Claude, Cowork, and Claude Desktop for Free, Pro, Max, Team, and Enterprise plans. Free users are limited to one custom connector. Claude connects to the server from Anthropic's cloud, so the server must be reachable on the public internet.",
      "The same page says local servers configured in claude_desktop_config.json are a separate mechanism. This server is remote. Add it as a custom connector and paste the URL.",
      "This server does not use an API key. On the authentication step, the help center lists Sign in now, Sign in when needed, and No sign in. Choose No sign in.",
    ],
    steps: [
      "Pro and Max: open Customize, then Connectors. Click + Add, then Add custom connector. Enter the name SunsetDiff. Paste the remote MCP server URL. Continue.",
      "Team and Enterprise: an Owner opens Organization settings, then Connectors, clicks Add, hovers Custom, and selects Web. Enter the name and the same URL.",
      "Claude's connector docs also publish a link that opens the add dialog with the name and URL filled in. The person still reviews the values and confirms before anything is added.",
    ],
    snippets: [
      { caption: "Remote MCP server URL", code: MCP_ENDPOINT },
      { caption: "Add custom connector link", code: claudeConnectorUrl },
    ],
    docs: [
      {
        label: "Get started with custom connectors using remote MCP",
        url: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
      },
      {
        label: "Directory connectors vs custom connectors",
        url: "https://claude.com/docs/connectors/building/directory-vs-custom",
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    paragraphs: [
      "Cursor's MCP docs list Streamable HTTP as a transport. Its input is a URL to an HTTP endpoint. Put that URL on a server entry in mcp.json.",
      "A project file is .cursor/mcp.json. A global file is ~/.cursor/mcp.json.",
      "The docs' remote sample also includes a headers object. This server does not use an API key, so the snippet has only the url.",
    ],
    files: [".cursor/mcp.json", "~/.cursor/mcp.json"],
    snippets: [
      {
        caption: "mcp.json",
        code: `{
  "mcpServers": {
    "sunsetdiff": {
      "url": "${MCP_ENDPOINT}"
    }
  }
}
`,
      },
    ],
    docs: [{ label: "Cursor MCP docs", url: "https://cursor.com/docs/mcp" }],
  },
  {
    id: "vscode",
    name: "VS Code",
    paragraphs: [
      "VS Code's MCP configuration reference says an HTTP server sets type to http and sets url. VS Code tries the HTTP Stream transport first and falls back to SSE when HTTP is not supported.",
      "The workspace file is .vscode/mcp.json. The top-level key in that file is servers. Open the user file with the command MCP: Open User Configuration.",
      "The same reference documents a portable Copilot file, .mcp.json at the workspace root, or mcp-config.json for the user. That file uses mcpServers, with the same type and url.",
    ],
    files: [".vscode/mcp.json", ".mcp.json"],
    snippets: [
      {
        caption: ".vscode/mcp.json",
        code: `{
  "servers": {
    "sunsetdiff": {
      "type": "http",
      "url": "${MCP_ENDPOINT}"
    }
  }
}
`,
      },
      {
        caption: "Portable .mcp.json",
        code: `{
  "mcpServers": {
    "sunsetdiff": {
      "type": "http",
      "url": "${MCP_ENDPOINT}"
    }
  }
}
`,
      },
    ],
    docs: [
      {
        label: "Add and manage MCP servers in VS Code",
        url: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
      },
      {
        label: "VS Code MCP configuration reference",
        url: "https://code.visualstudio.com/docs/agents/reference/mcp-configuration",
      },
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    paragraphs: [
      "The Windsurf Cascade MCP page says its mcp_config.json steps apply to the legacy Cascade agent only. The Devin Local agent, the default agent for new tabs, configures MCP servers in the Devin CLI config files instead.",
      "Cascade supports stdio, Streamable HTTP, and SSE. For a remote HTTP server, that page says the entry needs a serverUrl or url field. Open the file from the Cascade panel: the ... menu, then Open MCP config file. On macOS and Linux the file is ~/.config/devin/mcp_config.json. On Windows it is %APPDATA%\\devin\\mcp_config.json. The page's sample includes a headers object for an API key. This server does not use one.",
      "Devin's MCP configuration page says a URL uses Streamable HTTP. Set transport to http, or omit it. A URL still defaults to Streamable HTTP. devin mcp add sunsetdiff followed by the endpoint URL saves the local scope, .devin/mcp_config.local.json. Add -s user to save the global file, or -s project to save .devin/mcp_config.json.",
    ],
    files: [
      "~/.config/devin/mcp_config.json",
      "%APPDATA%\\devin\\mcp_config.json",
      ".devin/mcp_config.json",
      ".devin/mcp_config.local.json",
    ],
    snippets: [
      {
        caption: "Legacy Cascade mcp_config.json",
        code: `{
  "mcpServers": {
    "sunsetdiff": {
      "serverUrl": "${MCP_ENDPOINT}"
    }
  }
}
`,
      },
      {
        caption: "Devin Local mcp_config.json",
        code: `{
  "mcpServers": {
    "sunsetdiff": {
      "url": "${MCP_ENDPOINT}",
      "transport": "http"
    }
  }
}
`,
      },
      {
        caption: "Devin CLI",
        code: `devin mcp add -s user sunsetdiff ${MCP_ENDPOINT}
`,
      },
    ],
    docs: [
      { label: "Windsurf Cascade MCP", url: "https://docs.windsurf.com/windsurf/cascade/mcp" },
      { label: "Devin CLI MCP configuration", url: "https://docs.devin.ai/cli/extensibility/mcp/configuration" },
    ],
  },
  {
    id: "mcp-remote",
    name: "mcp-remote",
    paragraphs: [
      "mcp-remote is a local proxy for a client that starts a command instead of calling a remote URL. The package readme shows an mcpServers entry whose command is npx and whose args are mcp-remote plus the server URL.",
      "The readme says --transport http-only uses only the HTTP transport. The readme also says Claude Desktop, Cursor, and Windsurf use this mcpServers shape for a local command.",
    ],
    snippets: [
      {
        caption: "Local command config",
        code: `{
  "mcpServers": {
    "sunsetdiff": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${MCP_ENDPOINT}",
        "--transport",
        "http-only"
      ]
    }
  }
}
`,
      },
    ],
    docs: [
      { label: "mcp-remote on npm", url: "https://www.npmjs.com/package/mcp-remote" },
      { label: "mcp-remote readme", url: "https://github.com/punkpeye/mcp-remote" },
    ],
  },
];

export const mcpFaqs: FaqItem[] = [
  {
    question: "Does the SunsetDiff MCP server need an API key?",
    answer: "No. The server is free and public. Do not send an API key.",
  },
  {
    question: "What is the MCP endpoint?",
    answer: `The streamable HTTP endpoint is ${MCP_ENDPOINT}. Setup for each client is on this page.`,
  },
  {
    question: "Which tools does it expose?",
    answer: "check_model, upcoming_shutdowns, migration_diff, and scan_text. The input schema for each tool is on this page.",
  },
  {
    question: "Is this server listed in the official MCP registry?",
    answer:
      "The manifest is [server.json](/server.json). Its name is com.sunsetdiff/sunsetdiff. The registry accepts that name after a domain check for sunsetdiff.com. This page does not publish the server.",
  },
];

export function schemaText(schema: Record<string, unknown>): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}
