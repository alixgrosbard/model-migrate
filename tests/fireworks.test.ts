import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  CHANGELOG_URL,
  FIREWORKS_BASE_URL,
  FIREWORKS_CHAT_URL,
  FIREWORKS_US_CHAT_URL,
  QUICKSTART_MODEL_ID,
  QUICKSTART_URL,
  US_URL,
  assembleFireworks,
  parseFireworks,
} from "../scrapers/fireworks.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-28";
const changelog = readFileSync("snapshots/fixtures/fireworks/changelog-2026-10-28.md", "utf8");
const us = readFileSync("snapshots/fixtures/fireworks/us-only-2026-10-28.md", "utf8");
const quickstart = readFileSync("snapshots/fixtures/fireworks/quickstart-2026-10-28.md", "utf8");

function rows() {
  const models = parseFireworks(changelog, us, quickstart, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: ReturnType<typeof rows>[number]): ModelRecord {
  return modelSchema.parse({
    ...model,
    slug: model.slug,
    first_seen: "2026-10-28T00:00:00.000Z",
    updated_at: "2026-10-28T00:00:00.000Z",
  });
}

describe("Fireworks AI changelog", () => {
  it("stores linked deprecations and skips names with no model id", () => {
    const models = rows();
    expect(models).toHaveLength(25);
    expect(quickstart).toContain(QUICKSTART_MODEL_ID);
    expect(changelog).toContain("https://app.fireworks.ai/models/fireworks/glm-5p3-flash");
    expect(models.some((model) => /inkling/i.test(model.id) || /inkling/i.test(model.display_name))).toBe(false);
    expect(models.some((model) => model.id.includes("minimax-m3-us"))).toBe(false);
    const globalMini = models.find((model) => model.id === "accounts/fireworks/models/minimax-m3");
    expect(globalMini?.status).toBe("active");
    expect(globalMini?.shutdown_date).toBeNull();
    const oss = models.find((model) => model.id === "accounts/fireworks/models/gpt-oss-120b");
    expect(oss?.status).toBe("deprecated");
    expect(oss?.shutdown_date).toBe("2026-11-07");
    expect(oss?.shutdown_date_kind).toBe("exact");
    expect(oss?.replacements).toEqual([]);
    expect(oss?.region_or_platform_notes).toContain("dedicated deployment of GPT OSS 120B");
    expect(oss?.region_or_platform_notes).toContain("Dedicated deployments and Reserved Throughput are unaffected.");
    expect(oss?.sources[0]?.url).toBe(CHANGELOG_URL);
    const usGlm = models.find((model) => model.id === "accounts/fireworks/routers/glm-5p3-flash-us");
    expect(usGlm?.shutdown_date).toBe("2026-11-07");
    expect(usGlm?.replacements.map((item) => item.model_id)).toEqual(["accounts/fireworks/routers/deepseek-v4p1-flash-1017-us"]);
    expect(usGlm?.replacements[0]?.source_url).toBe(US_URL);
    expect(usGlm?.region_or_platform_notes).toContain("The global GLM 5.3 Flash endpoint remains available.");
    expect(usGlm?.region_or_platform_notes).toContain("https://us.api.fireworks.ai");
    expect(us).toContain("`accounts/fireworks/routers/glm-5p3-flash-us`");
    const removed = models.find(
      (model) => model.id === "accounts/fireworks/models/deepseek-v4-pro-0813" && model.display_name === "DeepSeek V4 Pro (0813)",
    );
    expect(removed?.status).toBe("retired");
    expect(removed?.shutdown_date).toBe("2026-09-25");
    expect(removed?.replacements.map((item) => item.model_id)).toEqual(["accounts/fireworks/models/deepseek-v4p1-flash"]);
    const kimi = models.find((model) => model.id === "accounts/fireworks/models/kimi-k2p6");
    expect(kimi?.replacements.map((item) => item.model_id)).toEqual([
      "accounts/fireworks/models/glm-5p3",
      "accounts/fireworks/models/kimi-k3",
    ]);
    expect(kimi?.region_or_platform_notes).toContain("same model page");
    const training = models.find((model) => model.display_name.includes("Serverless Training"));
    const inference = models.find(
      (model) => model.id === "accounts/fireworks/models/deepseek-v4-flash-0731" && !model.display_name.includes("Training"),
    );
    expect(training?.shutdown_date).toBe("2026-11-02");
    expect(training?.status).toBe("deprecated");
    expect(training?.replacements.map((item) => item.model_id)).toEqual(["accounts/fireworks/models/deepseek-v4p1-flash-1017"]);
    expect(training?.region_or_platform_notes).toContain("This change applies only to Serverless Training.");
    expect(inference?.shutdown_date).toBe("2026-09-25");
    expect(inference?.status).toBe("retired");
    const undated = models.find((model) => model.id === "accounts/fireworks/models/kimi-k2p5");
    expect(undated?.status).toBe("deprecated");
    expect(undated?.shutdown_date).toBeNull();
    expect(undated?.shutdown_date_kind).toBe("none");
    expect(undated?.region_or_platform_notes).toContain("does not print a shutdown date");
    for (const model of models) {
      expect(model.provider).toBe("fireworks");
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
  });

  it("keeps stored rows when a required page is missing", () => {
    const models = rows().map(asRecord);
    expect(assembleFireworks({ changelog: null, us, quickstart }, checked, models)).toBeNull();
    expect(assembleFireworks({ changelog, us: null, quickstart }, checked, models)).toBeNull();
    expect(assembleFireworks({ changelog, us, quickstart: "no model id here" }, checked, models)).toBeNull();
    expect(parseFireworks("no deprecations", us, quickstart, checked)).toBeNull();
  });

  it("uses the quickstart host and the US host, and does not invent an error page", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "accounts/fireworks/models/gpt-oss-20b")!;
    const to = models.find((model) => model.id === "accounts/fireworks/models/gpt-oss-120b")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.after).toContain(FIREWORKS_CHAT_URL);
    expect(migration.code_change.snippets.python.after).toContain(FIREWORKS_BASE_URL);
    expect(migration.code_change.snippets.curl.after).toContain("accounts/fireworks/models/gpt-oss-120b");
    expect(migration.api_changes.map((change) => change.source_url)).toContain(QUICKSTART_URL);
    const usFrom = models.find((model) => model.id === "accounts/fireworks/routers/glm-5p3-flash-us")!;
    const usTo = models.find((model) => model.id === "accounts/fireworks/routers/deepseek-v4p1-flash-1017-us")!;
    const usMove = buildMigration(usFrom, usTo, checked);
    expect(usMove.code_change.snippets.curl.after).toContain(FIREWORKS_US_CHAT_URL);
    expect(usMove.migration_checklist.join(" ")).toContain("US endpoint only");
    expect(requestErrorsForProvider("fireworks")).toEqual([]);
  });
});

describe("Fireworks records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("fireworks");
    const models = (await loadModels()).filter((model) => model.provider === "fireworks");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      fireworksPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/fireworks/");
    expect(text).toContain("/models/fireworks/accounts-fireworks-models-gpt-oss-120b/");
    expect(text).toContain("no model link is not stored");
    expect(sitemapSection("/providers/fireworks/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/fireworks/accounts-fireworks-models-gpt-oss-120b/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/fireworks/accounts-fireworks-models-gpt-oss-20b/")).toBe("sitemap-replace.xml");
    expect(
      sitemapSection(
        "/migrate/fireworks__accounts-fireworks-models-gpt-oss-20b__to__fireworks__accounts-fireworks-models-gpt-oss-120b/",
      ),
    ).toBe("sitemap-migrate.xml");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("Fireworks changelog was not applied. Stored Fireworks rows stay.");
    expect(run).toContain('if (provider === "fireworks") continue;');
  });
});
