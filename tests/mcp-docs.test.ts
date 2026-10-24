import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mcpGraph } from "../src/jsonld.ts";
import { guideHeadingId } from "../src/lib/guides.ts";
import { integrationLinks } from "../src/lib/integrations.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import {
  MCP_DOCS_CHECKED,
  MCP_ENDPOINT,
  MCP_PATH,
  MCP_REGISTRY_NAME,
  MCP_SERVER_JSON_PATH,
  MCP_SERVER_VERSION,
  mcpClients,
  mcpFaqs,
  mcpInputSchema,
  mcpTools,
} from "../src/lib/mcp-docs.ts";
import { MCP_SERVER_VERSION as SERVICE_VERSION, mcpToolInputs } from "../service/src/mcp-tools.ts";

const LIVE_SCHEMAS = {
  check_model: {
    type: "object",
    properties: { model_id: { type: "string" }, provider: { type: "string" } },
    required: ["model_id"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  upcoming_shutdowns: {
    type: "object",
    properties: { days: { type: "number" }, provider: { type: "string" } },
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  migration_diff: {
    type: "object",
    properties: { from_model_id: { type: "string" }, to_model_id: { type: "string" } },
    required: ["from_model_id"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  scan_text: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
};

describe("MCP docs", () => {
  it("publishes the same input schemas the server registers", () => {
    expect(mcpTools.map((tool) => tool.name)).toEqual([
      "check_model",
      "upcoming_shutdowns",
      "migration_diff",
      "scan_text",
    ]);
    for (const tool of mcpTools) {
      expect(tool.inputSchema).toEqual(LIVE_SCHEMAS[tool.name]);
      expect(mcpInputSchema(mcpToolInputs[tool.name])).toEqual(LIVE_SCHEMAS[tool.name]);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.prompt.length).toBeGreaterThan(10);
    }
    const source = readFileSync("service/src/mcp.ts", "utf8");
    expect(source).toContain("inputSchema: checkModelInput");
    expect(source).toContain("inputSchema: upcomingShutdownsInput");
    expect(source).toContain("inputSchema: migrationDiffInput");
    expect(source).toContain("inputSchema: scanTextInput");
    expect(source).toContain("days ?? 90");
    expect(source).toContain('shutdown_date_kind === "exact"');
    expect(source).toContain("to_model_id ?? from.replacements[0]?.model_id");
    expect(source).toContain('model.status === "deprecated" || model.status === "retired" || model.status === "legacy"');
    expect(SERVICE_VERSION).toBe(MCP_SERVER_VERSION);
  });

  it("keeps client snippets tied to official docs and free of secrets", () => {
    expect(mcpClients.map((client) => client.id)).toEqual(["claude", "cursor", "vscode", "windsurf", "mcp-remote"]);
    const blob = JSON.stringify({ mcpClients, mcpFaqs, mcpTools });
    expect(blob.includes("—")).toBe(false);
    expect(blob.includes("–")).toBe(false);
    expect(blob.toLowerCase().includes("alix")).toBe(false);
    expect(blob.includes("sk-")).toBe(false);
    expect(blob.includes("api_key")).toBe(false);
    expect(blob.includes("Bearer")).toBe(false);
    for (const client of mcpClients) {
      expect(client.docs.length).toBeGreaterThan(0);
      for (const doc of client.docs) {
        expect(new URL(doc.url).protocol).toBe("https:");
      }
      const code = client.snippets.map((snippet) => snippet.code).join("\n");
      expect(code).toContain(MCP_ENDPOINT);
    }
    const cursor = mcpClients.find((client) => client.id === "cursor");
    expect(cursor?.snippets[0]?.code).toContain('"url"');
    const vscode = mcpClients.find((client) => client.id === "vscode");
    expect(vscode?.snippets[0]?.code).toContain('"type": "http"');
    expect(vscode?.snippets[1]?.code).toContain('"mcpServers"');
    const windsurf = mcpClients.find((client) => client.id === "windsurf");
    expect(windsurf?.snippets[0]?.code).toContain("serverUrl");
    expect(windsurf?.snippets[1]?.code).toContain('"transport": "http"');
    const proxy = mcpClients.find((client) => client.id === "mcp-remote");
    expect(proxy?.snippets[0]?.code).toContain("http-only");
    expect(lastmodForUrl(`https://sunsetdiff.com${MCP_PATH}`)).toBe(MCP_DOCS_CHECKED);
    const graph = mcpGraph("https://sunsetdiff.com/", mcpFaqs);
    expect(graph.some((node) => node["@type"] === "SoftwareApplication")).toBe(true);
    expect(graph.some((node) => node["@type"] === "WebAPI")).toBe(true);
  });

  it("lists the pages in llms.txt and validates server.json", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    for (const token of [MCP_PATH, "/integrations/", MCP_SERVER_JSON_PATH, MCP_ENDPOINT, "check_model"]) {
      expect(text).toContain(token);
      expect(full).toContain(token);
    }
    const manifest = JSON.parse(readFileSync("server.json", "utf8")) as {
      $schema: string;
      name: string;
      description: string;
      version: string;
      websiteUrl: string;
      remotes: { type: string; url: string }[];
    };
    expect(manifest.$schema).toBe("https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json");
    expect(manifest.name).toBe(MCP_REGISTRY_NAME);
    expect(manifest.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(100);
    expect(manifest.version).toBe(MCP_SERVER_VERSION);
    expect(manifest.websiteUrl).toBe("https://sunsetdiff.com/mcp/");
    expect(manifest.remotes).toEqual([{ type: "streamable-http", url: MCP_ENDPOINT }]);
    expect(JSON.stringify(manifest).toLowerCase().includes("alix")).toBe(false);
    expect(lastmodForUrl(`https://sunsetdiff.com${MCP_SERVER_JSON_PATH}`)).toBe(MCP_DOCS_CHECKED);
    expect(lastmodForUrl("https://sunsetdiff.com/integrations/")).toBe(MCP_DOCS_CHECKED);
  });

  it("links only the swap guide sections that exist", () => {
    expect(guideHeadingId("Vercel AI SDK")).toBe("vercel-ai-sdk");
    const hrefs = integrationLinks().map((link) => link.href);
    expect(hrefs).toContain("/guides/swap-a-deprecated-model/");
    expect(hrefs).toContain("/guides/swap-a-deprecated-model/#litellm");
    expect(hrefs).toContain("/guides/swap-a-deprecated-model/#openrouter");
    expect(hrefs).toContain("/guides/swap-a-deprecated-model/#vercel-ai-sdk");
    expect(hrefs).toContain("/guides/swap-a-deprecated-model/#langchain");
    expect(hrefs).toContain("/mcp/");
    expect(hrefs).toContain("/api/");
    expect(hrefs).toContain("/badges/");
    expect(hrefs).toContain("/feed.xml");
    expect(hrefs).toContain("/deadlines.ics");
    expect(hrefs).toContain("/data/#github-action");
  });

  it("serves the registry HTTP auth file as one public-key line", () => {
    const body = readFileSync("public/.well-known/mcp-registry-auth", "utf8");
    expect(body).toBe("v=MCPv1; k=ed25519; p=UCvDWI9YGSHOtlXA/x9Qy0DtAfm0Ru6HbLOIvV07i34=\n");
    expect(body.includes("<")).toBe(false);
    const config = readFileSync("astro.config.ts", "utf8");
    expect(config).toContain('!pathname.startsWith("/.well-known/")');
  });
});
