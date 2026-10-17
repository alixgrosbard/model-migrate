import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadMigrations, loadModelRows, type ModelRow } from "./data.js";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "sunsetdiff", version: "1.0.0" });
  server.registerTool(
    "check_model",
    {
      description: "Look up status, dates, replacement, and source for a model id.",
      inputSchema: { model_id: z.string(), provider: z.string().optional() },
    },
    async ({ model_id, provider }) => {
      const models = await loadModelRows();
      const matches = models.filter((model) => model.id === model_id && (!provider || model.provider === provider));
      if (!matches.length) return text({ found: false, model_id });
      return text(matches.map(summary));
    },
  );
  server.registerTool(
    "upcoming_shutdowns",
    {
      description: "List models with an exact shutdown date inside the next N days.",
      inputSchema: { days: z.number().optional(), provider: z.string().optional() },
    },
    async ({ days, provider }) => {
      const window = days ?? 90;
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + window * 86400000).toISOString().slice(0, 10);
      const models = await loadModelRows();
      const rows = models
        .filter((model) => model.shutdown_date && model.shutdown_date_kind === "exact")
        .filter((model) => model.shutdown_date! >= today && model.shutdown_date! <= end)
        .filter((model) => !provider || model.provider === provider)
        .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? ""))
        .map(summary);
      return text(rows);
    },
  );
  server.registerTool(
    "migration_diff",
    {
      description: "Return the migration diff for a model. Defaults to the official replacement.",
      inputSchema: { from_model_id: z.string(), to_model_id: z.string().optional() },
    },
    async ({ from_model_id, to_model_id }) => {
      const models = await loadModelRows();
      const from = models.find((model) => model.id === from_model_id);
      if (!from) return text({ found: false, from_model_id });
      const targetId = to_model_id ?? from.replacements[0]?.model_id;
      const migrations = await loadMigrations();
      const diff = migrations.find((item) => item.from.model_id === from_model_id && (!targetId || item.to.model_id === targetId));
      return text(diff ?? { found: false, from_model_id, to_model_id: targetId ?? null });
    },
  );
  server.registerTool(
    "scan_text",
    {
      description: "Find known model ids in text that are deprecated or shutting down.",
      inputSchema: { text: z.string() },
    },
    async ({ text: source }) => {
      const models = await loadModelRows();
      const hits = findIds(source, models).filter((model) => model.status === "deprecated" || model.status === "retired" || model.status === "legacy");
      return text(hits.map(summary));
    },
  );
  return server;
}

function summary(model: ModelRow) {
  return {
    id: model.id,
    provider: model.provider,
    slug: model.slug,
    status: model.status,
    shutdown_date: model.shutdown_date,
    shutdown_date_kind: model.shutdown_date_kind,
    replacement: model.replacements[0]?.model_id ?? null,
    source: model.sources[0]?.url ?? null,
    last_checked: model.sources[0]?.last_checked ?? null,
  };
}

export function findIds(source: string, models: ModelRow[]): ModelRow[] {
  const ordered = [...models].sort((a, b) => b.id.length - a.id.length);
  const found: ModelRow[] = [];
  const seen = new Set<string>();
  for (const model of ordered) {
    const escaped = model.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^A-Za-z0-9._:-])${escaped}(?=$|[^A-Za-z0-9._:-])`);
    if (pattern.test(source) && !seen.has(`${model.provider}:${model.id}`)) {
      seen.add(`${model.provider}:${model.id}`);
      found.push(model);
    }
  }
  return found;
}
