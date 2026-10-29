import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import {
  SUPPORTED_URL,
  assembleCopilot,
  isCopilotChangelogPost,
  parseCopilot,
  type CopilotPost,
} from "../scrapers/github-copilot.ts";
import { llmsTxt } from "../src/lib/llms.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { requestErrorsForProvider } from "../src/lib/request-errors.ts";
import { shutdownEventPath, shutdownEvents } from "../src/lib/shutdowns.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const checked = "2026-10-29";
const docs = readFileSync("snapshots/fixtures/github-copilot/supported-models-2026-10-29.html", "utf8");
const posts: CopilotPost[] = readdirSync("snapshots/fixtures/github-copilot/posts")
  .filter((file) => file.endsWith(".html"))
  .sort()
  .map((file) => ({
    url: `https://github.blog/changelog/${file.replace(/\.html$/, "")}`,
    html: readFileSync(`snapshots/fixtures/github-copilot/posts/${file}`, "utf8"),
  }));

function rows() {
  const models = parseCopilot(docs, posts, checked);
  if (!models) throw new Error("fixture did not parse");
  return models;
}

function asRecord(model: ReturnType<typeof rows>[number]): ModelRecord {
  return modelSchema.parse({
    ...model,
    slug: model.slug,
    first_seen: "2026-10-29T00:00:00.000Z",
    updated_at: "2026-10-29T00:00:00.000Z",
  });
}

describe("GitHub Copilot retirements", () => {
  it("stores the retirement table and the November 16 changelog rows", () => {
    const models = rows();
    expect(models.length).toBeGreaterThan(40);
    expect(docs).toContain("Model retirement history");
    expect(docs).toContain("2026-10-19");
    const opus = models.find((model) => model.id === "Claude Opus 4.8");
    const opus5 = models.find((model) => model.id === "Claude Opus 5");
    const terra = models.find((model) => model.id === "GPT-5.6 Terra");
    expect(opus?.status).toBe("deprecated");
    expect(opus?.shutdown_date).toBe("2026-11-16");
    expect(opus?.shutdown_date_kind).toBe("exact");
    expect(opus?.replacements.map((item) => item.model_id)).toEqual(["Claude Opus 5.5"]);
    expect(opus?.region_or_platform_notes).toContain("annual plans");
    expect(opus?.region_or_platform_notes).toContain("does not apply to these customers");
    expect(opus5?.shutdown_date).toBe("2026-11-16");
    expect(opus5?.replacements.map((item) => item.model_id)).toEqual(["Claude Opus 5.5"]);
    expect(terra?.shutdown_date).toBe("2026-11-16");
    expect(terra?.replacements.map((item) => item.model_id)).toEqual(["GPT-6.1 Sol", "GPT-6 Luna"]);
    expect(models.some((model) => model.id.startsWith("Latest"))).toBe(false);
    const sonnet4 = models.find((model) => model.id === "Claude Sonnet 4");
    expect(sonnet4?.shutdown_date).toBe("2026-05-01");
    expect(sonnet4?.region_or_platform_notes).toContain("Sources disagree.");
    expect(sonnet4?.region_or_platform_notes).toContain("2026-05-06");
    const sonnet35 = models.find((model) => model.id === "Claude Sonnet 3.5");
    expect(sonnet35?.shutdown_date).toBe("2025-11-06");
    expect(sonnet35?.region_or_platform_notes).toContain("2025-11-10");
    const gpt4o = models.find((model) => model.id === "OpenAI GPT-4o");
    expect(gpt4o?.shutdown_date).toBe("2025-08-06");
    expect(gpt4o?.replacements.map((item) => item.model_id)).toEqual(["GPT-4.1"]);
    expect(gpt4o?.region_or_platform_notes).toContain("Copilot still uses GPT-4o for code completions.");
    const grok = models.find((model) => model.id === "Grok 4.5");
    expect(grok?.shutdown_date).toBe("2026-10-19");
    expect(grok?.replacements.map((item) => item.model_id)).toEqual(["Grok 4.7"]);
    expect(grok?.region_or_platform_notes).toContain("still lists this name");
    for (const model of models) {
      expect(model.provider).toBe("github-copilot");
      expect(model.sources[0]?.last_checked).toBe(checked);
      expect(model.sources[0]?.url.startsWith("https://")).toBe(true);
      expect(JSON.stringify(model)).not.toMatch(/[—–]/);
    }
    expect(models.some((model) => model.sources.some((source) => source.url === SUPPORTED_URL))).toBe(true);
  });

  it("keeps stored rows when a required page is missing", () => {
    const models = rows().map(asRecord);
    expect(assembleCopilot({ docs: null, posts }, checked, models)).toBeNull();
    expect(assembleCopilot({ docs, posts: null }, checked, models)).toBeNull();
    expect(parseCopilot("no retirement table", posts, checked)).toBeNull();
    expect(parseCopilot(docs, [], checked)).toBeNull();
    expect(isCopilotChangelogPost("https://github.blog/changelog/2025-04-11-deepseek-v3-is-now-deprecated-in-github-models")).toBe(false);
    expect(
      isCopilotChangelogPost(
        "https://github.blog/changelog/2026-10-15-upcoming-deprecation-of-selected-github-copilot-models-in-mid-november",
      ),
    ).toBe(true);
  });

  it("does not invent an OpenAI request for a Copilot model swap", () => {
    const models = rows().map(asRecord);
    const from = models.find((model) => model.id === "Claude Opus 4.8")!;
    const to = models.find((model) => model.id === "Claude Opus 5.5")!;
    const migration = buildMigration(from, to, checked);
    expect(migration.code_change.snippets.curl.before).toBe("");
    expect(migration.code_change.snippets.python.after).toBe("");
    expect(JSON.stringify(migration)).not.toContain("api.openai.com");
    expect(migration.api_changes[0]?.detail).toContain("Copilot Chat model selector");
    expect(migration.migration_checklist.join(" ")).toContain("chat and agent");
    expect(requestErrorsForProvider("github-copilot")).toEqual([]);
  });
});

describe("GitHub Copilot records", () => {
  it("is wired into the provider list, llms.txt, and the refresh guard", async () => {
    const providers = await loadProviders();
    expect(providers.map((provider) => provider.id)).toContain("github-copilot");
    const models = (await loadModels()).filter((model) => model.provider === "github-copilot");
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      copilotPages: models.sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(text).toContain("/providers/github-copilot/");
    expect(text).toContain("/models/github-copilot/claude-opus-4-8/");
    expect(text).toContain("chat and agent features");
    expect(sitemapSection("/providers/github-copilot/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/github-copilot/deprecated/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/github-copilot/retired/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/models/github-copilot/claude-opus-4-8/")).toBe("sitemap-models.xml");
    expect(sitemapSection("/replace/github-copilot/claude-opus-4-8/")).toBe("sitemap-replace.xml");
    expect(
      sitemapSection("/migrate/github-copilot__claude-opus-4-8__to__github-copilot__claude-opus-5-5/"),
    ).toBe("sitemap-migrate.xml");
    const batch = shutdownEvents(models).find((event) => event.date === "2026-11-16");
    expect(batch?.models.length).toBeGreaterThanOrEqual(3);
    expect(sitemapSection(shutdownEventPath(batch!))).toBe("sitemap-dates.xml");
    expect(sitemapSection("/2026/11/")).toBe("sitemap-dates.xml");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("GitHub Copilot pages were not applied. Stored GitHub Copilot rows stay.");
    expect(run).toContain('if (provider === "github-copilot") continue;');
  });
});
