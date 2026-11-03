import { z } from "zod";

export const MCP_SERVER_NAME = "sunsetdiff";
export const MCP_SERVER_VERSION = "1.0.0";

/** Tool descriptions and Zod input shapes registered by the MCP server. */
export const MCP_TOOL_DESCRIPTIONS = {
  check_model: "Look up status, dates, replacement, and source for a model id.",
  upcoming_shutdowns: "List models with an exact shutdown date inside the next N days.",
  migration_diff: "Return the migration diff for a model. Defaults to the official replacement.",
  scan_text: "Find known model ids in text that are deprecated or shutting down.",
} as const;

export const checkModelInput = { model_id: z.string(), provider: z.string().optional() };
export const upcomingShutdownsInput = { days: z.number().optional(), provider: z.string().optional() };
export const migrationDiffInput = { from_model_id: z.string(), to_model_id: z.string().optional() };
export const scanTextInput = { text: z.string() };

export const mcpToolInputs = {
  check_model: checkModelInput,
  upcoming_shutdowns: upcomingShutdownsInput,
  migration_diff: migrationDiffInput,
  scan_text: scanTextInput,
} as const;

export const MCP_TOOL_ORDER = ["check_model", "upcoming_shutdowns", "migration_diff", "scan_text"] as const;
