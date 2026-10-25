import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadHtml, idsFromCell } from "../scrapers/lib/html.ts";
import { aliasLead, aliasSnapshotView, missingAliasModels } from "../src/lib/aliases.ts";
import { badgeView } from "../src/lib/badges.ts";
import { loadModels } from "../src/lib/load.ts";
import { modelTitle } from "../src/lib/format.ts";
import type { ModelRecord } from "../src/schema.ts";

const day = "2026-10-25";
const shared = "All dated snapshots behind this alias shut down on 2027-01-14 per OpenAI's deprecations page (the alias itself is not listed by name).";

function row(partial: Partial<ModelRecord> & Pick<ModelRecord, "id" | "provider">): ModelRecord {
  return {
    slug: partial.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    display_name: partial.id,
    family: null,
    status: "active",
    announced_date: null,
    deprecation_date: null,
    shutdown_date: null,
    shutdown_date_kind: "none",
    region_or_platform_notes: null,
    replacements: [],
    sources: [{ url: "https://example.com/deprecations", label: "Deprecations", last_checked: "2026-10-25", excerpt: partial.id }],
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
    first_seen: "2026-10-25T00:00:00.000Z",
    updated_at: "2026-10-25T00:00:00.000Z",
    ...partial,
  };
}

describe("undated alias snapshots", () => {
  it("strips a trailing wildcard before storing a model id", () => {
    const $ = loadHtml("<table><tr><td><code>gpt-5</code> or <code>gpt-4.1*</code></td></tr></table>");
    const cell = $("td").get(0);
    expect(cell).toBeTruthy();
    expect(idsFromCell($, cell!)).toEqual(["gpt-5", "gpt-4.1"]);
  });

  it("uses the shared snapshot date and refuses a date when one snapshot is off the deprecations page", async () => {
    const models = await loadModels();
    const mini = models.find((model) => model.id === "gpt-4.1-mini" && model.provider === "openai");
    const gpt4o = models.find((model) => model.id === "gpt-4o" && model.provider === "openai");
    const nano = models.find((model) => model.id === "gpt-4.1-nano" && model.provider === "openai");
    expect(mini).toBeTruthy();
    expect(gpt4o).toBeTruthy();
    const miniView = aliasSnapshotView(mini!, models);
    expect(miniView?.label).toBe(shared);
    expect(miniView?.badgeMessage).toBe("snapshots retire 2027-01-14");
    expect(aliasLead(miniView!)).toContain("gpt-6-luna");
    expect(miniView?.defaultSnapshot?.id).toBe("gpt-4.1-mini-2025-04-14");
    expect(miniView?.defaultSnapshot?.url).toBe("https://developers.openai.com/api/docs/models/gpt-4.1-mini.md");
    expect(badgeView(mini!, day, models).message).toBe("snapshots retire 2027-01-14");
    expect(badgeView(mini!, day, models).message).not.toContain("active / no shutdown announced");
    expect(modelTitle(mini!, models)).not.toContain("*");

    const mixed = aliasSnapshotView(gpt4o!, models);
    expect(mixed?.label.startsWith("All dated snapshots behind this alias shut down on 2027-01-14")).toBe(false);
    expect(mixed?.label).toContain("2026-10-23");
    expect(mixed?.label).toContain("2027-01-14");
    expect(mixed?.label).toContain("the alias itself is not listed by name");
    expect(aliasLead(mixed!)).toContain("gpt-6-luna");
    expect(mixed?.defaultSnapshot?.id).toBe("gpt-4o-2024-08-06");
    expect(badgeView(gpt4o!, day, models).message).toBe("snapshots retire 2027-01-14");
    expect(nano && aliasSnapshotView(nano, models)).toBeNull();

    const quiet = row({ id: "example-alias", provider: "openai" });
    const dated = row({
      id: "example-alias-2026-01-01",
      provider: "openai",
      status: "deprecated",
      shutdown_date: "2027-01-14",
      shutdown_date_kind: "exact",
      sources: [{ url: "https://example.com/docs", label: "Model docs", last_checked: "2026-10-25", excerpt: "example-alias-2026-01-01" }],
    });
    expect(aliasSnapshotView(quiet, [quiet, dated])).toBeNull();
    const onPage = {
      ...dated,
      sources: [{ url: "https://developers.openai.com/api/docs/deprecations", label: "OpenAI deprecations", last_checked: "2026-10-25", excerpt: "January 14, 2027 | example-alias-2026-01-01 | gpt-6-luna" }],
      replacements: [{ model_id: "gpt-6-luna", provider: "openai" as const, kind: "official" as const, source_url: "https://developers.openai.com/api/docs/deprecations" }],
    };
    expect(aliasSnapshotView(quiet, [quiet, onPage])?.label).toBe(shared);
  });

  it("does not put an asterisk in a model title and keeps shutdown dates on the same ids", async () => {
    const models = await loadModels();
    for (const model of models) {
      expect(model.id.includes("*"), model.id).toBe(false);
      expect(model.display_name.includes("*"), model.display_name).toBe(false);
      expect(modelTitle(model, models).includes("*")).toBe(false);
    }
    const before = JSON.parse(readFileSync("tests/fixtures/status-shutdown-before.json", "utf8")) as Record<string, { status: string; shutdown_date: string | null }>;
    const changed: string[] = [];
    for (const model of models) {
      const key = `${model.provider}:${model.slug}`;
      const old = before[key];
      if (!old) continue;
      if (old.status !== model.status || old.shutdown_date !== model.shutdown_date) changed.push(key);
    }
    expect(changed).toEqual([]);
    expect(models.find((model) => model.provider === "openai" && model.slug === "gpt-4-1")?.id).toBe("gpt-4.1");
    expect(models.some((model) => model.provider === "openai" && model.id === "gpt-4o-mini" && model.slug === "gpt-4o-mini")).toBe(true);
    expect(models.some((model) => model.provider === "openai" && model.id === "gpt-4.1-mini" && model.slug === "gpt-4-1-mini")).toBe(true);
    expect(models.some((model) => model.slug === "gpt-4-1-2")).toBe(false);
    expect(missingAliasModels(models, "2026-10-25T00:00:00.000Z")).toEqual([]);
  });

  it("creates the alias only after a model page names the snapshot", () => {
    const now = "2026-10-25T00:00:00.000Z";
    const snap = row({
      id: "gpt-4.1-mini-2025-04-14",
      provider: "openai",
      status: "deprecated",
      shutdown_date: "2027-01-14",
      shutdown_date_kind: "exact",
      replacements: [{ model_id: "gpt-6-luna", provider: "openai", kind: "official", source_url: "https://developers.openai.com/api/docs/deprecations" }],
      sources: [{
        url: "https://developers.openai.com/api/docs/deprecations",
        label: "OpenAI deprecations",
        last_checked: "2026-10-25",
        excerpt: "January 14, 2027 | GPT-4.1 mini (gpt-4.1-mini-2025-04-14) | gpt-6-luna",
      }],
    });
    expect(missingAliasModels([snap], now)).toEqual([]);
    const named = {
      ...snap,
      sources: [
        ...snap.sources,
        {
          url: "https://developers.openai.com/api/docs/models/gpt-4.1-mini.md",
          label: "OpenAI model docs",
          last_checked: "2026-10-25",
          excerpt: "Model ID: gpt-4.1-mini | context window 1047576 | max output 32768 | input $0.4 | output $1.6 | Default snapshot gpt-4.1-mini-2025-04-14",
        },
      ],
    };
    const created = missingAliasModels([named], now);
    expect(created.map((model) => model.id)).toEqual(["gpt-4.1-mini"]);
    expect(created[0]?.shutdown_date).toBeNull();
    expect(created[0]?.shutdown_date_kind).toBe("none");
    const view = aliasSnapshotView(created[0]!, [named, created[0]!]);
    expect(view?.label).toBe(shared);
    expect(view?.badgeMessage).toBe("snapshots retire 2027-01-14");
    expect(view?.replacementIds).toEqual(["gpt-6-luna"]);
    expect(view?.defaultSnapshot?.id).toBe("gpt-4.1-mini-2025-04-14");
  });
});
