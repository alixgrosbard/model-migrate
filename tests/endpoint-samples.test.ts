import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import { gemini25Restricted } from "../src/lib/access.ts";
import { badgeView } from "../src/lib/badges.ts";
import { replacementSentence } from "../src/lib/format.ts";
import { requestErrors } from "../src/lib/request-errors.ts";
import { migrationSchema, modelSchema, type ModelRecord } from "../src/schema.ts";

const day = "2026-10-21";

async function model(provider: string, file: string): Promise<ModelRecord> {
  return modelSchema.parse(JSON.parse(await readFile(path.join("data/models", provider, file), "utf8")));
}

function stub(provider: string, id: string, target: { provider: string; id: string }): [ModelRecord, ModelRecord] {
  const base = {
    family: null,
    status: "deprecated" as const,
    announced_date: null,
    deprecation_date: null,
    shutdown_date: "2027-01-06",
    shutdown_date_kind: "exact" as const,
    region_or_platform_notes: null,
    sources: [{ url: "https://example.com/docs", label: "Docs", last_checked: day, excerpt: "example" }],
    specs: {
      input_price_per_mtok: null,
      output_price_per_mtok: null,
      cached_input_price_per_mtok: null,
      batch_discount_pct: null,
      currency: null,
      context_window_tokens: null,
      max_output_tokens: null,
      modalities_in: null,
      modalities_out: null,
      supports_tools: null,
      supports_json_schema: null,
      supports_vision: null,
      supports_streaming: null,
      supports_batch: null,
      supports_prompt_caching: null,
      reasoning: null,
      knowledge_cutoff: null,
      endpoints: null,
      specs_sources: {},
    },
    first_seen: "2026-10-17T00:00:00.000Z",
    updated_at: "2026-10-17T00:00:00.000Z",
  };
  const from = modelSchema.parse({
    ...base,
    id,
    slug: id,
    provider,
    display_name: id,
    replacements: [],
  });
  const to = modelSchema.parse({
    ...base,
    id: target.id,
    slug: target.id,
    provider: target.provider,
    display_name: target.id,
    shutdown_date: null,
    shutdown_date_kind: "none",
    status: "active",
    replacements: [],
  });
  return [from, to];
}

describe("endpoint aware samples", () => {
  it("does not swap a speech model id onto the Realtime model", () => {
    const [from, to] = stub("openai", "tts-1", { provider: "openai", id: "gpt-realtime-2.1-mini" });
    const row = buildMigration(from, to, day);
    expect(row.api_changes.map((change) => change.kind)).toEqual(["endpoint_change", "endpoint_change"]);
    expect(row.code_change.snippets.python.before).toBe("");
    expect(row.code_change.snippets.python.after).toBe("");
    const blob = row.api_changes.map((change) => `${change.detail} ${change.source_url}`).join(" ");
    expect(blob).toContain("/v1/audio/speech");
    expect(blob).toContain("Realtime API guide");
    expect(blob).toContain("https://developers.openai.com/api/docs/deprecations");
    expect(blob).toContain("https://developers.openai.com/api/docs/guides/text-to-speech");
    expect(blob).not.toContain("chat.completions.create");
  });

  it("uses embeddings.create for an embeddings migration", () => {
    const [from, to] = stub("openai", "text-embedding-ada-002", { provider: "openai", id: "text-embedding-3-small" });
    const row = buildMigration(from, to, day);
    expect(row.code_change.snippets.python.before).toContain("embeddings.create");
    expect(row.code_change.snippets.python.before).toContain("text-embedding-ada-002");
    expect(row.code_change.snippets.python.after).toContain("text-embedding-3-small");
    expect(row.code_change.snippets.curl.after).toContain("/v1/embeddings");
    expect(row.code_change.snippets.python.before).not.toContain("chat.completions");
  });

  it("omits code when Imagen moves to a Nano Banana model", () => {
    const [from, to] = stub("google-gemini-api", "imagen-3.0-generate-002", {
      provider: "google-gemini-api",
      id: "gemini-nano-banana-2.1",
    });
    const row = buildMigration(from, to, day);
    expect(row.api_changes.every((change) => change.kind === "endpoint_change")).toBe(true);
    expect(row.code_change.snippets.python.before).toBe("");
    const blob = JSON.stringify(row.code_change);
    expect(blob).not.toContain("generate_content");
    expect(blob).not.toContain("chat.completions");
    expect(row.api_changes.map((change) => change.source_url)).toEqual([
      "https://ai.google.dev/gemini-api/docs/imagen",
      "https://ai.google.dev/gemini-api/docs/image-generation",
    ]);
  });

  it("names both transcription replacements from the stored model record", async () => {
    const whisper = await model("openai", "whisper-1.json");
    expect(replacementSentence(whisper)).toBe("The official replacements are gpt-live-transcribe or gpt-transcribe.");
  });

  it("keeps chat sample code off stored migrations whose kind uses another call", async () => {
    const files = (await readdir("data/migrations")).filter((file) => file.endsWith(".json"));
    const bad: string[] = [];
    for (const file of files) {
      const row = migrationSchema.parse(JSON.parse(await readFile(path.join("data/migrations", file), "utf8")));
      const from = await model(row.from.provider, `${row.from.slug}.json`);
      const to = await model(row.to.provider, `${row.to.slug}.json`);
      const fresh = buildMigration(from, to, day);
      const freshBlob = JSON.stringify(fresh.code_change);
      const leavesChatSample =
        freshBlob.includes("chat.completions.create") ||
        freshBlob.includes("generate_content") ||
        freshBlob.includes("messages.create") ||
        freshBlob.includes("bedrock-runtime");
      if (leavesChatSample) continue;
      const storedBlob = JSON.stringify(row.code_change);
      if (storedBlob.includes("chat.completions.create") || storedBlob.includes("generate_content")) bad.push(file);
    }
    expect(bad).toEqual([]);
  });
});

describe("gemini 2.5 access", () => {
  it("marks only the three Gemini API ids as existing users only", async () => {
    for (const file of ["gemini-2-5-pro.json", "gemini-2-5-flash.json", "gemini-2-5-flash-lite.json"]) {
      const record = await model("google-gemini-api", file);
      expect(gemini25Restricted(record)).toBe(true);
      expect(badgeView(record, day).message).toBe("existing users only");
      expect(badgeView(record, day).color).toBe("green");
    }
    const other = await model("openai", "gpt-4o-2024-08-06.json");
    expect(gemini25Restricted(other)).toBe(false);
    const vertex = await model("google-vertex", "gemini-2-5-flash.json");
    expect(gemini25Restricted(vertex)).toBe(false);
  });

  it("does not add gemini-2.5-flash to the recorded 404 model list", () => {
    const page = requestErrors.find((item) => item.slug === "gemini-model-no-longer-available");
    expect(page?.models.some((item) => item.id === "gemini-2.5-flash")).toBe(false);
    const thinking = requestErrors.find((item) => item.slug === "gemini-thinking-budget-not-supported-use-thinking-level");
    expect(thinking?.errorText).toBe("Thinking budget is not supported for this model. Use thinking level instead.");
    expect(thinking?.checked).toBe("2026-10-21");
    expect(thinking?.models.map((item) => item.id)).toEqual(["gemini-4-argon"]);
    expect(thinking?.guides).toEqual([]);
  });
});
