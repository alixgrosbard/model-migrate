import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  MINIMAX_BASE_URL,
  MINIMAX_CHAT_URL,
  MODELS_URL,
  TEXT_GENERATION_URL,
  assembleMinimax,
  parseMinimax,
} from "../scrapers/minimax.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-30";
const page = readFileSync("snapshots/fixtures/minimax/models-2026-10-30.md", "utf8");

const DATED = ["MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.7", "MiniMax-M2.7-highspeed"];
const ALREADY_RETIRED = [
  "M2-her",
  "MiniMax-M2",
  "MiniMax-M2.1",
  "MiniMax-M2.1-highspeed",
  "Music-2.0",
  "Music-2.5",
  "Music-2.5+",
  "music-2.6",
  "music-2.6-free",
  "music-3.0",
  "music-3.0-free",
  "music-cover",
  "music-cover-free",
];

function rows() {
  const models = parseMinimax(page, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: ReturnType<typeof rows>[number]): ModelRecord {
  return modelSchema.parse({
    ...model,
    first_seen: "2026-10-30T00:00:00.000Z",
    updated_at: "2026-10-30T00:00:00.000Z",
  });
}

describe("MiniMax model list", () => {
  it("stores the November 18 notice and the Retired Models table", () => {
    const models = rows();
    expect(models).toHaveLength(DATED.length + ALREADY_RETIRED.length + 1);
    for (const id of DATED) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("deprecated");
      expect(model?.shutdown_date).toBe("2026-11-18");
      expect(model?.shutdown_date_kind).toBe("exact");
      expect(model?.deprecation_date).toBeNull();
      expect(model?.replacements.map((item) => item.model_id)).toEqual(["MiniMax-M3.1-Flash"]);
      expect(model?.replacements[0]?.kind).toBe("official");
      expect(model?.replacements[0]?.source_url).toBe(MODELS_URL);
      expect(model?.sources[0]?.url).toBe(MODELS_URL);
      expect(model?.sources[0]?.last_checked).toBe(checked);
      expect(model?.region_or_platform_notes).toContain("no longer available to new users on October 19, 2026");
      expect(model?.region_or_platform_notes).toContain("retired on November 18, 2026");
      expect(model?.region_or_platform_notes).toContain("Pay-as-you-go API requests stop working");
      expect(model?.region_or_platform_notes).toContain("automatically routed to M3.1 Flash");
      expect(model?.region_or_platform_notes).toContain("lists this id as Retired");
      expect(page).toContain(id);
    }
    for (const id of ALREADY_RETIRED) {
      const model = models.find((item) => item.id === id);
      expect(model?.status).toBe("retired");
      expect(model?.shutdown_date).toBeNull();
      expect(model?.shutdown_date_kind).toBe("none");
      expect(model?.replacements).toEqual([]);
      expect(model?.region_or_platform_notes).toContain("does not print a shutdown date");
      expect(page).toContain(id);
    }
    const stub = models.find((model) => model.id === "MiniMax-M3.1-Flash");
    expect(stub?.status).toBe("active");
    expect(stub?.shutdown_date).toBeNull();
    expect(models.find((model) => model.id === "Music-2.5+")?.slug).toBe("music-2-5-plus");
    expect(models.find((model) => model.id === "Music-2.5")?.slug).toBe("music-2-5");
    for (const model of models) {
      expect(model.provider).toBe("minimax");
      expect(model.specs.input_price_per_mtok).toBeNull();
      expect(model.specs.output_price_per_mtok).toBeNull();
      expect(model.sources[0]?.excerpt.length).toBeLessThanOrEqual(300);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
  });

  it("keeps stored rows when the notice or the table no longer matches", () => {
    const models = rows();
    const previous = models.map(asRecord);
    expect(assembleMinimax("not a model list", checked, previous)).toBeNull();
    expect(assembleMinimax(null, checked, previous)).toBeNull();
    const dropped = page.replace("| MiniMax-M2.5 |", "| not an id |");
    expect(assembleMinimax(dropped, checked, previous)).toBeNull();
  });

  it("uses the text generation host", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "MiniMax-M2.5")!;
    const to = models.find((model) => model.id === "MiniMax-M3.1-Flash")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.after).toContain(MINIMAX_CHAT_URL);
    expect(migration.code_change.snippets.curl.after).toContain("MiniMax-M3.1-Flash");
    expect(migration.code_change.snippets.curl.before).toContain("MiniMax-M2.5");
    expect(migration.code_change.snippets.python.after).toContain(MINIMAX_BASE_URL);
    expect(migration.code_change.snippets.python.after).not.toContain("reasoning_effort");
    expect(migration.api_changes.map((change) => change.source_url)).toEqual([TEXT_GENERATION_URL, MODELS_URL]);
    expect(migration.migration_checklist.join(" ")).toContain("Pay-as-you-go API requests stop working");
    expect(requestErrorsForProvider("minimax")).toEqual([]);
  });
});

describe("MiniMax records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("minimax");
    const models = (await loadModels()).filter((model) => model.provider === "minimax");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      minimaxPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/minimax/");
    expect(text).toContain("/models/minimax/minimax-m2-5/");
    expect(text).toContain("retired on November 18, 2026");
    expect(sitemapSection("/providers/minimax/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/minimax/deprecated/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/minimax/retired/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/minimax/minimax-m2-5/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/minimax/minimax-m2-5/")).toBe("sitemap-replace.xml");
    expect(sitemapSection("/migrate/minimax__minimax-m2-5__to__minimax__minimax-m3-1-flash/")).toBe("sitemap-migrate.xml");
    expect(sitemapSection("/shutdowns/minimax-2026-11-18/")).toBe("sitemap-dates.xml");
    expect(sitemapSection("/guides/minimax-m2-5-m2-7-shutdown-november-18-2026/")).toBe("sitemap-guides.xml");
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    expect(providerPage).toContain("On this page the November 18 ids stay in the deprecated table.");
    expect(providerPage).toContain("/guides/minimax-m2-5-m2-7-shutdown-november-18-2026/");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(shutdownPage).toContain("minimax-m2-5-m2-7-shutdown-november-18-2026");
    const upcoming = models.filter((model) => model.shutdown_date === "2026-11-18");
    expect(upcoming.map((model) => model.id).sort()).toEqual([...DATED].sort());
    expect(upcoming.every((model) => model.status === "deprecated")).toBe(true);
    const retired = models.filter((model) => model.status === "retired");
    expect(retired.map((model) => model.id)).toEqual(expect.arrayContaining(["MiniMax-M2", "MiniMax-M2.1", "MiniMax-M2.1-highspeed", "M2-her"]));
    expect(retired.some((model) => (DATED as readonly string[]).includes(model.id))).toBe(false);
    expect(retired.every((model) => model.shutdown_date === null)).toBe(true);
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("MiniMax model list was not applied. Stored MiniMax rows stay.");
    expect(run).toContain('if (provider === "minimax") continue;');
  });
});
