import type { MigrationRecord, ModelRecord } from "../src/schema.ts";

const EXAMPLE = "Example monthly cost for 10M input tokens and 2M output tokens. Labeled example, not a bill.";

export function migrationKey(from: ModelRecord, to: ModelRecord): string {
  return `${from.provider}__${from.slug}__to__${to.provider}__${to.slug}`;
}

export function buildMigration(from: ModelRecord, to: ModelRecord, checked: string): MigrationRecord {
  const inputPct = pct(from.specs.input_price_per_mtok, to.specs.input_price_per_mtok);
  const outputPct = pct(from.specs.output_price_per_mtok, to.specs.output_price_per_mtok);
  const oldCost = monthly(from.specs.input_price_per_mtok, from.specs.output_price_per_mtok);
  const newCost = monthly(to.specs.input_price_per_mtok, to.specs.output_price_per_mtok);
  const snippets = codeSnippets(from, to);
  const capability = capabilityChanges(from, to);
  const missing =
    from.specs.input_price_per_mtok == null ||
    to.specs.input_price_per_mtok == null ||
    from.specs.output_price_per_mtok == null ||
    to.specs.output_price_per_mtok == null ||
    from.specs.context_window_tokens == null ||
    to.specs.context_window_tokens == null;
  return {
    from: { provider: from.provider, model_id: from.id, slug: from.slug },
    to: { provider: to.provider, model_id: to.id, slug: to.slug },
    price_diff: {
      input_pct_change: inputPct,
      output_pct_change: outputPct,
      example_monthly_cost_old: oldCost,
      example_monthly_cost_new: newCost,
      currency: "USD",
      example_label: EXAMPLE,
    },
    context_diff: {
      old_tokens: from.specs.context_window_tokens,
      new_tokens: to.specs.context_window_tokens,
      change_pct: pct(from.specs.context_window_tokens, to.specs.context_window_tokens),
    },
    max_output_diff: {
      old_tokens: from.specs.max_output_tokens,
      new_tokens: to.specs.max_output_tokens,
      change_pct: pct(from.specs.max_output_tokens, to.specs.max_output_tokens),
    },
    capability_changes: capability,
    api_changes: [],
    code_change: {
      language: "python",
      before: snippets.python.before,
      after: snippets.python.after,
      snippets,
    },
    migration_checklist: [
      `Read the shutdown date for ${from.id} on the linked official page.`,
      `Point your requests at ${to.id}.`,
      "Re-check price, context, and parameters on the provider pages linked here.",
      "Ship the change before the published shutdown date.",
    ],
    confidence: missing ? "partial" : "official",
    last_checked: checked,
    sources: [...from.sources, ...to.sources].slice(0, 8),
  };
}

function pct(oldValue: number | null, newValue: number | null): number | null {
  if (oldValue == null || newValue == null || oldValue === 0) return null;
  return Math.round(((newValue - oldValue) / oldValue) * 1000) / 10;
}

function monthly(input: number | null, output: number | null): number | null {
  if (input == null || output == null) return null;
  return Math.round((input * 10 + output * 2) * 100) / 100;
}

function capabilityChanges(from: ModelRecord, to: ModelRecord) {
  const fields = [
    "supports_tools",
    "supports_json_schema",
    "supports_vision",
    "supports_streaming",
    "supports_batch",
    "supports_prompt_caching",
    "reasoning",
    "modalities_in",
    "modalities_out",
  ] as const;
  const changes = [];
  for (const field of fields) {
    const oldValue = from.specs[field];
    const newValue = to.specs[field];
    if (oldValue == null || newValue == null) continue;
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    changes.push({
      field,
      old: Array.isArray(oldValue) ? oldValue.join(", ") : oldValue,
      new: Array.isArray(newValue) ? newValue.join(", ") : newValue,
    });
  }
  return changes;
}

function codeSnippets(from: ModelRecord, to: ModelRecord) {
  const style = from.provider;
  if (style === "anthropic") return anthropic(from.id, to.id);
  if (style === "google-gemini-api" || style === "google-vertex") return gemini(from.id, to.id);
  if (style === "aws-bedrock") return bedrock(from.id, to.id);
  return openaiStyle(from.id, to.id);
}

function openaiStyle(fromId: string, toId: string) {
  return {
    python: {
      before: `from openai import OpenAI\nclient = OpenAI()\nresponse = client.chat.completions.create(\n    model="${fromId}",\n    messages=[{"role": "user", "content": "Hello"}],\n)\n`,
      after: `from openai import OpenAI\nclient = OpenAI()\nresponse = client.chat.completions.create(\n    model="${toId}",\n    messages=[{"role": "user", "content": "Hello"}],\n)\n`,
    },
    typescript: {
      before: `import OpenAI from "openai";\nconst client = new OpenAI();\nconst response = await client.chat.completions.create({\n  model: "${fromId}",\n  messages: [{ role: "user", content: "Hello" }],\n});\n`,
      after: `import OpenAI from "openai";\nconst client = new OpenAI();\nconst response = await client.chat.completions.create({\n  model: "${toId}",\n  messages: [{ role: "user", content: "Hello" }],\n});\n`,
    },
    curl: {
      before: `curl https://api.openai.com/v1/chat/completions \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${fromId}","messages":[{"role":"user","content":"Hello"}]}'\n`,
      after: `curl https://api.openai.com/v1/chat/completions \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${toId}","messages":[{"role":"user","content":"Hello"}]}'\n`,
    },
  };
}

function anthropic(fromId: string, toId: string) {
  return {
    python: {
      before: `import anthropic\nclient = anthropic.Anthropic()\nmessage = client.messages.create(\n    model="${fromId}",\n    max_tokens=1024,\n    messages=[{"role": "user", "content": "Hello"}],\n)\n`,
      after: `import anthropic\nclient = anthropic.Anthropic()\nmessage = client.messages.create(\n    model="${toId}",\n    max_tokens=1024,\n    messages=[{"role": "user", "content": "Hello"}],\n)\n`,
    },
    typescript: {
      before: `import Anthropic from "@anthropic-ai/sdk";\nconst client = new Anthropic();\nconst message = await client.messages.create({\n  model: "${fromId}",\n  max_tokens: 1024,\n  messages: [{ role: "user", content: "Hello" }],\n});\n`,
      after: `import Anthropic from "@anthropic-ai/sdk";\nconst client = new Anthropic();\nconst message = await client.messages.create({\n  model: "${toId}",\n  max_tokens: 1024,\n  messages: [{ role: "user", content: "Hello" }],\n});\n`,
    },
    curl: {
      before: `curl https://api.anthropic.com/v1/messages \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "content-type: application/json" \\\n  -d '{"model":"${fromId}","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'\n`,
      after: `curl https://api.anthropic.com/v1/messages \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "content-type: application/json" \\\n  -d '{"model":"${toId}","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'\n`,
    },
  };
}

function gemini(fromId: string, toId: string) {
  return {
    python: {
      before: `from google import genai\nclient = genai.Client()\nresponse = client.models.generate_content(\n    model="${fromId}",\n    contents="Hello",\n)\n`,
      after: `from google import genai\nclient = genai.Client()\nresponse = client.models.generate_content(\n    model="${toId}",\n    contents="Hello",\n)\n`,
    },
    typescript: {
      before: `import { GoogleGenAI } from "@google/genai";\nconst ai = new GoogleGenAI({});\nconst response = await ai.models.generateContent({\n  model: "${fromId}",\n  contents: "Hello",\n});\n`,
      after: `import { GoogleGenAI } from "@google/genai";\nconst ai = new GoogleGenAI({});\nconst response = await ai.models.generateContent({\n  model: "${toId}",\n  contents: "Hello",\n});\n`,
    },
    curl: {
      before: `curl "https://generativelanguage.googleapis.com/v1beta/models/${fromId}:generateContent" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'\n`,
      after: `curl "https://generativelanguage.googleapis.com/v1beta/models/${toId}:generateContent" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'\n`,
    },
  };
}

function bedrock(fromId: string, toId: string) {
  return {
    python: {
      before: `import boto3\nclient = boto3.client("bedrock-runtime")\nresponse = client.converse(\n    modelId="${fromId}",\n    messages=[{"role": "user", "content": [{"text": "Hello"}]}],\n)\n`,
      after: `import boto3\nclient = boto3.client("bedrock-runtime")\nresponse = client.converse(\n    modelId="${toId}",\n    messages=[{"role": "user", "content": [{"text": "Hello"}]}],\n)\n`,
    },
    typescript: {
      before: `import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";\nconst client = new BedrockRuntimeClient({});\nconst response = await client.send(new ConverseCommand({\n  modelId: "${fromId}",\n  messages: [{ role: "user", content: [{ text: "Hello" }] }],\n}));\n`,
      after: `import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";\nconst client = new BedrockRuntimeClient({});\nconst response = await client.send(new ConverseCommand({\n  modelId: "${toId}",\n  messages: [{ role: "user", content: [{ text: "Hello" }] }],\n}));\n`,
    },
    curl: {
      before: `aws bedrock-runtime converse \\\n  --model-id "${fromId}" \\\n  --messages '[{"role":"user","content":[{"text":"Hello"}]}]'\n`,
      after: `aws bedrock-runtime converse \\\n  --model-id "${toId}" \\\n  --messages '[{"role":"user","content":[{"text":"Hello"}]}]'\n`,
    },
  };
}
