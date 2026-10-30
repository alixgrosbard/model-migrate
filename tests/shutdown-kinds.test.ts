import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadModelRows } from "../service/src/data.ts";
import { aliasSnapshotView, applyAliasSnapshotShutdowns } from "../src/lib/aliases.ts";
import { badgeView } from "../src/lib/badges.ts";
import { ENDPOINTS } from "../src/lib/endpoints.ts";
import { guides } from "../src/lib/guides.ts";
import { loadModels } from "../src/lib/load.ts";
import { emptySpecs, modelSchema, type ModelRecord, type Source } from "../src/schema.ts";

const checked = "2026-10-30";

function hydrate(partial: Record<string, unknown>): ModelRecord {
  const id = String(partial.id);
  const { sources: partialSources, ...rest } = partial;
  const sources = (partialSources as Source[] | undefined) ?? [
    { url: "https://example.com/model", label: "Model docs", last_checked: checked, excerpt: id },
  ];
  return modelSchema.parse({
    slug: id.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    display_name: id,
    family: null,
    status: "active",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: null,
    shutdown_date_kind: "none",
    region_or_platform_notes: null,
    replacements: [],
    specs: emptySpecs(),
    first_seen: "2026-10-30T00:00:00.000Z",
    updated_at: "2026-10-30T00:00:00.000Z",
    ...rest,
    sources,
  });
}

function pair(file: string): ModelRecord[] {
  const fixture = JSON.parse(readFileSync(file, "utf8")) as { alias: Record<string, unknown>; snapshot: Record<string, unknown> };
  return [hydrate(fixture.alias), hydrate(fixture.snapshot)];
}

describe("shutdown_date_kind fixtures", () => {
  it("keeps an exact date on the alias", () => {
    const models = pair("tests/fixtures/shutdown-kind-exact.json");
    const [alias] = applyAliasSnapshotShutdowns(models);
    expect(alias?.shutdown_date_kind).toBe("exact");
    expect(alias?.shutdown_date).toBe("2026-12-01");
    expect(alias?.status).toBe("deprecated");
    expect(alias?.replacements).toEqual([]);
  });

  it("keeps a not_before floor on the alias", () => {
    const models = pair("tests/fixtures/shutdown-kind-not-before.json");
    const [alias] = applyAliasSnapshotShutdowns(models);
    expect(alias?.shutdown_date_kind).toBe("not_before");
    expect(alias?.shutdown_date).toBe("2027-06-01");
    expect(alias?.status).toBe("active");
  });

  it("derives via_snapshots from dated snapshots", () => {
    const models = pair("tests/fixtures/shutdown-kind-via-snapshots.json");
    const applied = applyAliasSnapshotShutdowns(models);
    const alias = applied[0];
    expect(alias?.shutdown_date_kind).toBe("via_snapshots");
    expect(alias?.shutdown_date).toBe("2027-01-14");
    expect(alias?.status).toBe("deprecated");
    expect(alias?.replacements.map((item) => item.model_id)).toEqual(["gpt-6-luna"]);
    expect(aliasSnapshotView(alias!, applied)?.label).toContain("the alias itself is not listed by name");
    expect(badgeView(alias!, checked).message).toBe("snapshots retire 2027-01-14");
    const again = applyAliasSnapshotShutdowns(applied);
    expect(again[0]).toBe(alias);
  });
});

describe("gpt-4o-mini lookup fields", () => {
  it("publishes the snapshot date the HTML page already shows", async () => {
    const raw = JSON.parse(readFileSync("data/models/openai/gpt-4o-mini.json", "utf8")) as {
      status: string;
      shutdown_date: string | null;
      shutdown_date_kind: string;
    };
    expect(raw.status).toBe("active");
    expect(raw.shutdown_date).toBeNull();
    expect(raw.shutdown_date_kind).toBe("none");

    const models = await loadModels();
    const mini = models.find((model) => model.provider === "openai" && model.id === "gpt-4o-mini");
    expect(mini).toMatchObject({
      status: "deprecated",
      shutdown_date: "2027-01-14",
      shutdown_date_kind: "via_snapshots",
    });
    expect(mini?.replacements.some((item) => item.kind === "official" && item.model_id === "gpt-6-luna")).toBe(true);
    expect(aliasSnapshotView(mini!, models)?.label).toContain("the alias itself is not listed by name");
    expect(badgeView(mini!, checked, models).message).toBe("snapshots retire 2027-01-14");

    for (const id of ["gpt-4o", "gpt-4.1", "gpt-4.1-mini"]) {
      const model = models.find((item) => item.provider === "openai" && item.id === id);
      expect(model?.status, id).toBe("deprecated");
      expect(model?.shutdown_date, id).toBe("2027-01-14");
      expect(model?.shutdown_date_kind, id).toBe("via_snapshots");
      expect(aliasSnapshotView(model!, models)?.label, id).toContain("the alias itself is not listed by name");
    }
    for (const id of ["gpt-4o-search-preview", "gpt-4o-mini-search-preview"]) {
      const model = models.find((item) => item.provider === "openai" && item.id === id);
      expect(model?.status, id).toBe("retired");
      expect(model?.shutdown_date, id).toBe("2026-07-23");
      expect(model?.shutdown_date_kind, id).toBe("via_snapshots");
      expect(aliasSnapshotView(model!, models)?.label, id).toContain("the alias itself is not listed by name");
    }
    const derived = models.filter((model) => model.shutdown_date_kind === "via_snapshots").map((model) => `${model.provider}:${model.id}`);
    expect(derived.sort()).toEqual([
      "openai:gpt-4.1",
      "openai:gpt-4.1-mini",
      "openai:gpt-4o",
      "openai:gpt-4o-mini",
      "openai:gpt-4o-mini-search-preview",
      "openai:gpt-4o-search-preview",
    ]);

    const rows = await loadModelRows();
    const mcp = rows.find((model) => model.provider === "openai" && model.id === "gpt-4o-mini");
    expect(mcp).toMatchObject({
      status: "deprecated",
      shutdown_date: "2027-01-14",
      shutdown_date_kind: "via_snapshots",
    });
    expect(mcp?.replacements[0]?.model_id).toBe("gpt-6-luna");

    const kind = ENDPOINTS.find((endpoint) => endpoint.path === "/data/models.json")?.fields.find((field) => field.name === "models[].shutdown_date_kind");
    expect(kind?.detail).toContain("via_snapshots");
    expect(kind?.detail).toContain("exact");
    expect(kind?.detail).toContain("not_before");
    expect(kind?.detail).toContain("month_only");
    expect(kind?.detail).toContain("none");

    const guide = guides.find((item) => item.slug === "catch-a-retired-model-before-your-users-do");
    const code = guide?.sections.flatMap((section) => section.codes ?? []).map((sample) => sample.code).join("\n");
    expect(code).toContain("via_snapshots");
  });
});
