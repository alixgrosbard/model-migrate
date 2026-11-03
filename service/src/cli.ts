#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp.js";

const command = process.argv[2];
if (command !== "mcp") {
  console.log("Usage: sunsetdiff mcp");
  process.exit(command ? 1 : 0);
}

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
