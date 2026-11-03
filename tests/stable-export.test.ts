import { describe, expect, it } from "vitest";
import { emptySpecs, modelSchema, type ChangeRecord, type ModelRecord, type Source } from "../src/schema.ts";
import { changelogDocument } from "../src/lib/growth.ts";
import { canonicalizeModel, compareModels, realContentKey, recordIdentity } from "../src/lib/stable-export.ts";

function source(url: string, last_checked = "2026-10-24"): Source {
  return { url, label: url, last_checked, excerpt: "quoted sentence" };
}

function row(overrides: Partial<ModelRecord> = {}): ModelRecord {
  return modelSchema.parse({
    id: "open-mistral-7b",
    slug: "open-mistral-7b",
    provider: "mistral",
    display_name: "Mistral 7B (0.3)",
    family: null,
    status: "retired",
    announced_date: null,
    deprecation_date: "2024-11-30",
    shutdown_date: "2025-03-30",
    shutdown_date_kind: "exact",
    region_or_platform_notes: null,
    replacements: [],
    sources: [source("https://docs.mistral.ai/models")],
    specs: emptySpecs(),
    first_seen: "2026-10-18T00:00:00.000Z",
    updated_at: "2026-10-24T04:39:18.299Z",
    ...overrides,
  });
}

describe("deterministic export", () => {
  it("sorts duplicate ids by slug so file order cannot reshuffle them", () => {
    const later = row({ slug: "open-mistral-7b-2", display_name: "Mistral 7B (0.2)" });
    const earlier = row();
    const forward = [earlier, later].sort(compareModels).map((model) => model.slug);
    const backward = [later, earlier].sort(compareModels).map((model) => model.slug);
    expect(forward).toEqual(backward);
    expect(forward).toEqual(["open-mistral-7b", "open-mistral-7b-2"]);
  });

  it("treats duplicate ids with different names or region notes as different rows", () => {
    const base = row();
    const renamed = row({ slug: "open-mistral-7b-2", display_name: "Mistral 7B (0.2)" });
    const otherRegion = row({
      provider: "aws-bedrock",
      id: "anthropic.claude-3-haiku-20240307-v1:0",
      slug: "anthropic-claude-3-haiku-20240307-v1-0-2",
      display_name: base.display_name,
      region_or_platform_notes: "us-east-1",
      shutdown_date: "2026-09-10",
    });
    const sameNameOtherDate = row({
      provider: "aws-bedrock",
      id: otherRegion.id,
      display_name: base.display_name,
      region_or_platform_notes: "ap-northeast-2",
      shutdown_date: "2026-11-13",
    });
    expect(recordIdentity(base)).not.toBe(recordIdentity(renamed));
    expect(recordIdentity(otherRegion)).not.toBe(recordIdentity(sameNameOtherDate));
  });

  it("ignores check time and list order, and notices a real change", () => {
    const model = row({
      sources: [source("https://example.com/b", "2026-10-24"), source("https://example.com/a", "2026-10-24")],
      specs: {
        ...emptySpecs(),
        max_output_tokens: 4096,
        specs_sources: {
          max_output_tokens: { url: "https://example.com/latest.md", last_checked: "2026-10-24" },
          context_window_tokens: { url: "https://example.com/context.md", last_checked: "2026-10-24" },
        },
      },
    });
    const reshuffled = row({
      updated_at: "2026-10-24T23:46:13.037Z",
      first_seen: "2026-10-01T00:00:00.000Z",
      sources: [source("https://example.com/a", "2026-10-25"), source("https://example.com/b", "2026-10-25")],
      specs: {
        ...emptySpecs(),
        max_output_tokens: 4096,
        specs_sources: {
          context_window_tokens: { url: "https://example.com/context.md", last_checked: "2026-10-25" },
          max_output_tokens: { url: "https://example.com/latest.md", last_checked: "2026-10-25" },
        },
      },
    });
    expect(realContentKey(model)).toBe(realContentKey(reshuffled));
    expect(canonicalizeModel(model).sources.map((item) => item.url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    const dated = row({ shutdown_date: "2026-12-01" });
    expect(realContentKey(dated)).not.toBe(realContentKey(model));
    const otherUrl = row({
      specs: {
        ...emptySpecs(),
        max_output_tokens: 4096,
        specs_sources: {
          max_output_tokens: { url: "https://example.com/stable.md", last_checked: "2026-10-24" },
        },
      },
    });
    expect(realContentKey(otherUrl)).not.toBe(
      realContentKey(
        row({
          specs: {
            ...emptySpecs(),
            max_output_tokens: 4096,
            specs_sources: {
              max_output_tokens: { url: "https://example.com/latest.md", last_checked: "2026-10-24" },
            },
          },
        }),
      ),
    );
  });

  it("sorts changelog rows inside one day", () => {
    const first: ChangeRecord = {
      date: "2026-10-24",
      provider: "mistral",
      model_id: "voxtral-mini-2507",
      field: "status",
      old: "legacy",
      new: "retired",
      source_url: "https://docs.mistral.ai/models",
    };
    const second: ChangeRecord = {
      date: "2026-10-24",
      provider: "aws-bedrock",
      model_id: "anthropic.claude-3-haiku-20240307-v1:0",
      field: "shutdown_date",
      old: "2026-11-13",
      new: "2026-09-10",
      source_url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html",
    };
    const forward = JSON.stringify(changelogDocument([first, second]));
    const backward = JSON.stringify(changelogDocument([second, first]));
    expect(forward).toBe(backward);
    expect(changelogDocument([second, first]).versions[0]?.changes.map((change) => change.provider)).toEqual([
      "aws-bedrock",
      "mistral",
    ]);
  });
});
