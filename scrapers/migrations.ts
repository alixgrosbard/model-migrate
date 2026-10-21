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
    api_changes: apiChanges(from, to),
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

/** The four transcription ids whose deprecations row names both replacements. */
const FILE_TRANSCRIPTION_OR = new Set([
  "whisper-1",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe-diarize",
]);

/**
 * Replacements a future scrape should write. Most models keep the first official
 * replacement. The four transcription ids keep every official replacement, because
 * the deprecations table names two.
 */
export function officialMigrationTargets(model: ModelRecord) {
  const official = model.replacements.filter((item) => item.kind === "official");
  if (model.provider === "openai" && FILE_TRANSCRIPTION_OR.has(model.id)) return official;
  return official.slice(0, 1);
}

const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";
const OPENAI_TTS = "https://developers.openai.com/api/docs/guides/text-to-speech";
const OPENAI_STT = "https://developers.openai.com/api/docs/guides/speech-to-text";
const OPENAI_LIVE_STT = "https://developers.openai.com/api/docs/guides/realtime-transcription";
const GEMINI_EMBEDDINGS = "https://ai.google.dev/gemini-api/docs/embeddings";
const GEMINI_IMAGEN = "https://ai.google.dev/gemini-api/docs/imagen";
const GEMINI_IMAGE = "https://ai.google.dev/gemini-api/docs/image-generation";
const GEMINI_VEO = "https://ai.google.dev/gemini-api/docs/veo";
const VERTEX_VERSIONS = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";

type SnippetSet = ReturnType<typeof openaiStyle>;
type ApiChange = MigrationRecord["api_changes"][number];

type CallKind =
  | "openai-embedding"
  | "openai-image"
  | "openai-moderation"
  | "openai-speech"
  | "openai-file-transcription"
  | "openai-live-transcription"
  | "gemini-embedding"
  | "imagen"
  | "veo"
  | "gemini-image"
  | "imagetext";

function callKind(provider: string, id: string): CallKind | null {
  if (provider === "openai") {
    if (
      id.includes("embedding") ||
      id.startsWith("text-search") ||
      id.startsWith("text-similarity") ||
      id.startsWith("code-search")
    ) {
      return "openai-embedding";
    }
    if (id.startsWith("dall-e") || id.startsWith("gpt-image") || id.startsWith("chatgpt-image")) return "openai-image";
    if (id.includes("moderation")) return "openai-moderation";
    if (id === "tts-1" || id === "tts-1-hd" || id.includes("-tts")) return "openai-speech";
    if (id === "gpt-live-transcribe" || id.startsWith("gpt-live-transcribe-")) return "openai-live-transcription";
    if (id === "whisper-1" || id.includes("transcribe")) return "openai-file-transcription";
    return null;
  }
  if (provider === "google-gemini-api" || provider === "google-vertex") {
    if (id === "imagetext") return "imagetext";
    if (id.includes("embedding") || id.startsWith("embedding-") || id.startsWith("text-embedding")) return "gemini-embedding";
    if (id.startsWith("imagen-")) return "imagen";
    if (id.startsWith("veo-")) return "veo";
    if (id.includes("image") || id.includes("nano-banana")) return "gemini-image";
    return null;
  }
  return null;
}

function codeSnippets(from: ModelRecord, to: ModelRecord) {
  return specialized(from, to)?.snippets ?? defaultSnippets(from, to);
}

function apiChanges(from: ModelRecord, to: ModelRecord): ApiChange[] {
  return specialized(from, to)?.apiChanges ?? [];
}

function defaultSnippets(from: ModelRecord, to: ModelRecord): SnippetSet {
  if (from.provider === "anthropic") return anthropic(from.id, to.id);
  if (from.provider === "google-gemini-api" || from.provider === "google-vertex") return gemini(from.id, to.id);
  if (from.provider === "aws-bedrock") return bedrock(from.id, to.id);
  return openaiStyle(from.id, to.id);
}

function specialized(from: ModelRecord, to: ModelRecord): { snippets: SnippetSet; apiChanges: ApiChange[] } | null {
  const fromKind = callKind(from.provider, from.id);
  const toKind = callKind(to.provider, to.id);
  if (!fromKind && !toKind) return null;
  if (fromKind && fromKind === toKind) return sameKind(from, to, fromKind);
  return differentKind(from, to, fromKind, toKind);
}

function sameKind(from: ModelRecord, to: ModelRecord, kind: CallKind): { snippets: SnippetSet; apiChanges: ApiChange[] } {
  if (kind === "gemini-image" && from.provider === "google-vertex") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "Both ids are image models. The Gemini API image generation guide's text-to-image sample uses client.interactions.create and POST https://generativelanguage.googleapis.com/v1beta/interactions. These records are Vertex model ids, and that guide does not show a Vertex host, so this page does not show a model-id swap.",
          source_url: GEMINI_IMAGE,
        },
      ],
    };
  }
  if (kind === "veo" && from.provider === "google-vertex") {
    return {
      snippets: swap(veoSample, from.id, to.id),
      apiChanges: [
        {
          kind: "behavior_change",
          detail:
            "The Veo guide shows client.models.generate_videos and POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning. The sample uses that call and only swaps the model id. These two records are Vertex ids. The guide is the Gemini API page, so the curl host is generativelanguage.googleapis.com.",
          source_url: GEMINI_VEO,
        },
      ],
    };
  }
  const sample =
    kind === "openai-embedding"
      ? openaiEmbeddingSample
      : kind === "openai-image"
        ? openaiImageSample
        : kind === "openai-moderation"
          ? openaiModerationSample
          : kind === "openai-speech"
            ? openaiSpeechSample
            : kind === "openai-file-transcription"
              ? openaiTranscriptionSample
              : kind === "gemini-embedding"
                ? geminiEmbeddingSample
                : kind === "veo"
                  ? veoSample
                  : kind === "gemini-image"
                    ? geminiImageSample
                    : null;
  if (!sample) return differentKind(from, to, kind, kind);
  const apiChanges: ApiChange[] = [];
  if (from.id === "gemini-embedding-001" && to.id === "gemini-embedding-2") {
    apiChanges.push({
      kind: "behavior_change",
      detail:
        "The embeddings guide says gemini-embedding-001 lets you generate individual embeddings for a list of strings, while Gemini Embedding 2 produces a single aggregated embedding for multiple inputs.",
      source_url: GEMINI_EMBEDDINGS,
    });
  }
  if (from.id === "gpt-4o-transcribe-diarize" && to.id === "gpt-transcribe") {
    apiChanges.push({
      kind: "behavior_change",
      detail:
        "The file transcription guide's speaker diarization section still shows gpt-4o-transcribe-diarize with response_format diarized_json, and says that model is not the recommended model for ordinary file transcription. The recommended file model on that page is gpt-transcribe.",
      source_url: OPENAI_STT,
    });
  }
  return { snippets: swap(sample, from.id, to.id), apiChanges };
}

function differentKind(
  from: ModelRecord,
  to: ModelRecord,
  fromKind: CallKind | null,
  toKind: CallKind | null,
): { snippets: SnippetSet; apiChanges: ApiChange[] } {
  if (fromKind === "openai-speech") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "The October 1, 2026 text-to-speech entry says these models are removed on January 6, 2027. Migrate to gpt-realtime-2.1-mini. See the Realtime API guide to plan your migration.",
          source_url: OPENAI_DEPRECATIONS,
        },
        {
          kind: "endpoint_change",
          detail:
            "The text-to-speech guide says this is a change of API workflow: gpt-realtime-2.1-mini is not a supported model for /v1/audio/speech. Existing integrations can use the Speech API (client.audio.speech.create, POST /v1/audio/speech) until shutdown. The Realtime API guide is https://developers.openai.com/api/docs/guides/realtime.",
          source_url: OPENAI_TTS,
        },
      ],
    };
  }
  if (fromKind === "openai-file-transcription" && toKind === "openai-live-transcription") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "File transcription sends the audio file to POST /v1/audio/transcriptions with client.audio.transcriptions.create. The speech-to-text guide says to start with gpt-transcribe for recorded speech.",
          source_url: OPENAI_STT,
        },
        {
          kind: "endpoint_change",
          detail:
            "gpt-live-transcribe is a realtime transcription session (session type transcription, WebSocket or WebRTC), not that file endpoint. The realtime transcription guide says gpt-live-transcribe does not return word-level timestamps, speaker labels, or transcription confidence scores.",
          source_url: OPENAI_LIVE_STT,
        },
      ],
    };
  }
  if (fromKind === "imagen" && toKind === "gemini-image") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "The Imagen page says Imagen models are shut down and to use Nano Banana. It says to call client.models.generate_content instead of client.models.generate_images, and it names gemini-2.5-flash-image or gemini-3.1-flash-image. It does not show a sample that only swaps the model id.",
          source_url: GEMINI_IMAGEN,
        },
        {
          kind: "endpoint_change",
          detail:
            "The image generation guide's text-to-image sample for gemini-nano-banana-2.1 uses client.interactions.create and POST https://generativelanguage.googleapis.com/v1beta/interactions. That method is not the generate_content call named on the Imagen page, so this page does not show a before and after code swap.",
          source_url: GEMINI_IMAGE,
        },
      ],
    };
  }
  if (fromKind === "veo" && toKind !== "veo") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "The Veo guide's samples call client.models.generate_videos and POST https://generativelanguage.googleapis.com/v1beta/models/{id}:predictLongRunning with a Veo model id. The same page says to migrate to gemini-omni-1.1-flash and says this feature is currently only available with the generateContent API. No generate_videos sample for gemini-omni-1.1-flash was found on that page, so this page does not show a model-id swap.",
          source_url: GEMINI_VEO,
        },
      ],
    };
  }
  if (fromKind === "imagetext") {
    return {
      snippets: blankSnippets(),
      apiChanges: [
        {
          kind: "endpoint_change",
          detail:
            "The Vertex model versions page lists imagetext with replacement gemini-2.5-flash-image. The stored excerpt is a table row (shutdown September 24, 2025) and does not include a request sample, so this page does not show a model-id swap.",
          source_url: VERTEX_VERSIONS,
        },
      ],
    };
  }
  return { snippets: defaultSnippets(from, to), apiChanges: [] };
}

function swap(sample: (id: string) => { python: string; typescript: string; curl: string }, fromId: string, toId: string): SnippetSet {
  const before = sample(fromId);
  const after = sample(toId);
  return {
    python: { before: before.python, after: after.python },
    typescript: { before: before.typescript, after: after.typescript },
    curl: { before: before.curl, after: after.curl },
  };
}

function blankSnippets(): SnippetSet {
  return {
    python: { before: "", after: "" },
    typescript: { before: "", after: "" },
    curl: { before: "", after: "" },
  };
}

function openaiEmbeddingSample(id: string) {
  return {
    python: `from openai import OpenAI\nclient = OpenAI()\nresponse = client.embeddings.create(\n    input="Your text string goes here", model="${id}"\n)\n`,
    typescript: `import OpenAI from "openai";\nconst openai = new OpenAI();\nconst embedding = await openai.embeddings.create({\n  model: "${id}",\n  input: "Your text string goes here",\n  encoding_format: "float",\n});\n`,
    curl: `curl https://api.openai.com/v1/embeddings \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -d '{"input":"Your text string goes here","model":"${id}"}'\n`,
  };
}

function openaiImageSample(id: string) {
  return {
    python: `from openai import OpenAI\nclient = OpenAI()\nresult = client.images.generate(\n    model="${id}",\n    prompt="A watercolor robot reading in a library",\n)\n`,
    typescript: `import OpenAI from "openai";\nconst openai = new OpenAI();\nconst result = await openai.images.generate({\n  model: "${id}",\n  prompt: "A watercolor robot reading in a library",\n});\n`,
    curl: `curl -X POST "https://api.openai.com/v1/images/generations" \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${id}","prompt":"A watercolor robot reading in a library"}'\n`,
  };
}

function openaiModerationSample(id: string) {
  return {
    python: `from openai import OpenAI\nclient = OpenAI()\nresponse = client.moderations.create(\n    model="${id}",\n    input="...text to classify goes here...",\n)\n`,
    typescript: `import OpenAI from "openai";\nconst openai = new OpenAI();\nconst moderation = await openai.moderations.create({\n  model: "${id}",\n  input: "...text to classify goes here...",\n});\n`,
    curl: `curl https://api.openai.com/v1/moderations \\\n  -X POST \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -d '{"model":"${id}","input":"...text to classify goes here..."}'\n`,
  };
}

function openaiSpeechSample(id: string) {
  return {
    python: `from openai import OpenAI\nclient = OpenAI()\nspeech = client.audio.speech.create(\n    model="${id}",\n    voice="coral",\n    input="Today is a wonderful day to build something people love!",\n)\n`,
    typescript: `import OpenAI from "openai";\nconst openai = new OpenAI();\nconst mp3 = await openai.audio.speech.create({\n  model: "${id}",\n  voice: "coral",\n  input: "Today is a wonderful day to build something people love!",\n});\n`,
    curl: `curl https://api.openai.com/v1/audio/speech \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${id}","input":"Today is a wonderful day to build something people love!","voice":"coral"}'\n`,
  };
}

function openaiTranscriptionSample(id: string) {
  return {
    python: `from openai import OpenAI\nclient = OpenAI()\naudio_file = open("audio.wav", "rb")\ntranscription = client.audio.transcriptions.create(\n    model="${id}", file=audio_file\n)\n`,
    typescript: `import fs from "fs";\nimport OpenAI from "openai";\nconst openai = new OpenAI();\nconst transcription = await openai.audio.transcriptions.create({\n  file: fs.createReadStream("audio.mp3"),\n  model: "${id}",\n});\n`,
    curl: `curl --request POST \\\n  --url https://api.openai.com/v1/audio/transcriptions \\\n  --header "Authorization: Bearer $OPENAI_API_KEY" \\\n  --header "Content-Type: multipart/form-data" \\\n  --form file=@/path/to/file/audio.mp3 \\\n  --form model=${id}\n`,
  };
}

function geminiEmbeddingSample(id: string) {
  return {
    python: `from google import genai\nclient = genai.Client()\nresult = client.models.embed_content(\n    model="${id}",\n    contents="What is the meaning of life?",\n)\n`,
    typescript: `import { GoogleGenAI } from "@google/genai";\nconst ai = new GoogleGenAI({});\nconst response = await ai.models.embedContent({\n  model: "${id}",\n  contents: "What is the meaning of life?",\n});\n`,
    curl: `curl "https://generativelanguage.googleapis.com/v1beta/models/${id}:embedContent" \\\n  -H "Content-Type: application/json" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -d '{"content":{"parts":[{"text":"What is the meaning of life?"}]}}'\n`,
  };
}

function veoSample(id: string) {
  return {
    python: `from google import genai\nclient = genai.Client()\noperation = client.models.generate_videos(\n    model="${id}",\n    prompt="A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.",\n)\n`,
    typescript: `import { GoogleGenAI } from "@google/genai";\nconst ai = new GoogleGenAI({});\nlet operation = await ai.models.generateVideos({\n  model: "${id}",\n  prompt: "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.",\n});\n`,
    curl: `curl -s "https://generativelanguage.googleapis.com/v1beta/models/${id}:predictLongRunning" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -X POST \\\n  -d '{"instances":[{"prompt":"A close up of two people staring at a cryptic drawing on a wall, torchlight flickering."}]}'\n`,
  };
}

function geminiImageSample(id: string) {
  return {
    python: `from google import genai\nclient = genai.Client()\ninteraction = client.interactions.create(\n    model="${id}",\n    input="Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",\n)\n`,
    typescript: `import { GoogleGenAI } from "@google/genai";\nconst ai = new GoogleGenAI({});\nconst interaction = await ai.interactions.create({\n  model: "${id}",\n  input: "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",\n});\n`,
    curl: `curl -s -X POST \\\n  "https://generativelanguage.googleapis.com/v1beta/interactions" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${id}","input":[{"type":"text","text":"Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}]}'\n`,
  };
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
