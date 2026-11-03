import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  replacementApiFields,
  replacementNoteText,
  replacementRetirement,
} from "../src/lib/replacement-chain.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

type Stub = {
  id: string;
  slug: string;
  provider: string;
  status: ModelRecord["status"];
  shutdown_date: string | null;
  shutdown_date_kind?: ModelRecord["shutdown_date_kind"];
  replacements: { model_id: string; provider: string; kind: "official" | "editorial" }[];
};

function model(partial: Partial<Stub> & Pick<Stub, "id" | "status">): Stub {
  return {
    slug: partial.slug ?? partial.id,
    provider: partial.provider ?? "openai",
    shutdown_date: partial.shutdown_date ?? null,
    shutdown_date_kind: partial.shutdown_date_kind,
    replacements: partial.replacements ?? [],
    ...partial,
  };
}

function official(id: string) {
  return { model_id: id, provider: "openai", kind: "official" as const };
}

describe("retiring official replacements", () => {
  it("adds no note when the official replacement is active", () => {
    const source = model({ id: "old", status: "deprecated", shutdown_date: "2027-01-20", replacements: [official("new")] });
    const next = model({ id: "new", status: "active" });
    const result = replacementRetirement(source, [source, next]);
    expect(result.replacement_also_retiring).toBe(false);
    expect(result.replacement_chain).toEqual([]);
    expect(result.notes).toEqual([]);
    expect(replacementApiFields(source, [source, next])).toEqual({
      replacement_also_retiring: false,
      replacement_chain: [],
    });
  });

  it("notes a deprecated replacement and its shutdown date", () => {
    const source = model({ id: "old", status: "deprecated", replacements: [official("mid")] });
    const mid = model({
      id: "mid",
      status: "deprecated",
      shutdown_date: "2027-02-26",
      shutdown_date_kind: "exact",
    });
    const result = replacementRetirement(source, [source, mid]);
    expect(result.replacement_also_retiring).toBe(true);
    expect(replacementNoteText(result.notes[0].parts)).toBe(
      "Note: mid is also deprecated and shuts down on 2027-02-26.",
    );
    expect(result.replacement_chain).toEqual([
      { model_id: "mid", provider: "openai", slug: "mid", status: "deprecated", shutdown_date: "2027-02-26" },
    ]);
  });

  it("follows the chain to an active model and links it", () => {
    const source = model({ id: "old", status: "deprecated", replacements: [official("mid")] });
    const mid = model({
      id: "mid",
      status: "deprecated",
      shutdown_date: "2027-02-26",
      shutdown_date_kind: "exact",
      replacements: [official("live")],
    });
    const live = model({ id: "live", slug: "live-slug", status: "active" });
    const result = replacementRetirement(source, [source, mid, live]);
    const note = result.notes[0];
    expect(replacementNoteText(note.parts)).toBe(
      "Note: mid is also deprecated and shuts down on 2027-02-26. Its own official replacement is live.",
    );
    expect(note.parts.find((part) => part.text === "live")?.href).toBe("/models/openai/live-slug/");
    expect(result.replacement_chain.map((step) => step.model_id)).toEqual(["mid", "live"]);
  });

  it("stops on a cycle and does not invent a further replacement", () => {
    const source = model({ id: "a", status: "deprecated", replacements: [official("b")] });
    const other = model({ id: "b", status: "deprecated", shutdown_date: "2027-02-26", replacements: [official("a")] });
    const result = replacementRetirement(source, [source, other]);
    expect(replacementNoteText(result.notes[0].parts)).toBe(
      "Note: b is also deprecated and shuts down on 2027-02-26.",
    );
    expect(result.replacement_chain.map((step) => step.model_id)).toEqual(["b"]);
    expect(result.notes[0].parts.some((part) => part.href)).toBe(false);
  });

  it("records the live gpt-4o-mini-transcribe snapshot chain from the dataset", () => {
    const models = loadStoredModels();
    const source = models.find((item) => item.provider === "openai" && item.id === "gpt-4o-mini-transcribe-2025-03-20");
    expect(source).toBeTruthy();
    const result = replacementRetirement(source!, models);
    expect(result.replacement_also_retiring).toBe(true);
    expect(replacementNoteText(result.notes[0].parts)).toBe(
      "Note: gpt-4o-mini-transcribe-2025-12-15 is also deprecated and shuts down on 2027-02-26. Its own official replacements are gpt-live-transcribe and gpt-transcribe.",
    );
    expect(result.notes[0].parts.filter((part) => part.href).map((part) => part.href)).toEqual([
      "/models/openai/gpt-live-transcribe/",
      "/models/openai/gpt-transcribe/",
    ]);
    expect(result.replacement_chain.map((step) => step.model_id)).toEqual([
      "gpt-4o-mini-transcribe-2025-12-15",
      "gpt-live-transcribe",
      "gpt-transcribe",
    ]);
    const active = models.find((item) => item.id === "gpt-4o" && item.provider === "openai");
    if (active) {
      const next = active.replacements.find((item) => item.kind === "official");
      const target = next && models.find((item) => item.provider === next.provider && item.id === next.model_id);
      if (target && target.status !== "deprecated" && target.status !== "retired") {
        expect(replacementRetirement(active, models).notes).toEqual([]);
      }
    }
  });
});

function loadStoredModels(): ModelRecord[] {
  const root = path.join("data", "models");
  const models: ModelRecord[] = [];
  for (const provider of readdirSync(root)) {
    const folder = path.join(root, provider);
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      models.push(modelSchema.parse(JSON.parse(readFileSync(path.join(folder, file), "utf8"))));
    }
  }
  return models;
}
