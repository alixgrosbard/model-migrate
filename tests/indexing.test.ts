import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateGraph } from "../src/jsonld.ts";
import {
  CANONICAL_ALIAS_PATHS,
  excludedPaths,
  excludeFromSitemap,
  includeInSitemap,
  isConsolidatedLeaf,
  isLongRetiredModel,
  LONG_RETIRED_BEFORE,
  modelPageIndexable,
  modelRobots,
  NOINDEX_FOLLOW,
  PRIORITY_SITEMAP_PATHS,
  staleShutdownCutoff,
  STALE_SHUTDOWN_MONTHS,
} from "../src/lib/indexability.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { featuredErrorLinks, featuredModelLinks } from "../src/lib/featured.ts";
import { guidePath, guides, guidesForModel } from "../src/lib/guides.ts";
import { loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import {
  answerSentence,
  metaDescription,
  migratePageTitle,
  modelTitle,
  questionPageTitle,
  relatedModels,
  replacePageTitle,
  uniqueVisibleName,
} from "../src/lib/format.ts";
import { monthKeyPath, shutdownMonthList, shutdownsInMonth } from "../src/lib/schedule.ts";
import { modelsInMonth, questionPath, shutdownMonths, topRetiringModels } from "../src/lib/growth.ts";
import { requestErrorPath, requestErrors } from "../src/lib/request-errors.ts";
import {
  COPILOT_NOV16_DESCRIPTION,
  COPILOT_NOV16_TITLE,
  batchChecklist,
  batchDescription,
  batchDocumentTitle,
  batchHeadline,
  batchLead,
  nextDeadlineAnchors,
  shutdownEventPath,
  shutdownEvents,
} from "../src/lib/shutdowns.ts";
import { today } from "../src/lib/format.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import {
  SITEMAP_SECTION_FILES,
  parseSitemapUrls,
  sitemapSection,
  splitSitemaps,
  writeSectionSitemaps,
} from "../src/lib/sitemaps.ts";
import type { ModelRecord } from "../src/schema.ts";
import type { IndexModel } from "../src/lib/indexability.ts";

function contentDay(model: ModelRecord): string {
  const lines = readFileSync("data/changes.jsonl", "utf8").split("\n").filter(Boolean);
  let newest = "";
  for (const line of lines) {
    const row = JSON.parse(line) as { date?: string; provider?: string; model_id?: string };
    if (row.provider !== model.provider || row.model_id !== model.id || !row.date) continue;
    if (row.date > newest) newest = row.date;
  }
  return newest || model.first_seen.slice(0, 10);
}

describe("sitemap sections", () => {
  it("splits urls by section and drops thin paths", () => {
    const urls = [
      { loc: "https://sunsetdiff.com/", lastmod: "2026-10-17" },
      { loc: "https://sunsetdiff.com/models/openai/gpt-4o/", lastmod: "2026-10-17" },
      { loc: "https://sunsetdiff.com/replace/openai/gpt-4o/", lastmod: "2026-10-17" },
      { loc: "https://sunsetdiff.com/replace/openai/gpt-4/", lastmod: "2026-10-24" },
      { loc: "https://sunsetdiff.com/migrate/openai__gpt-4__to__openai__gpt-5/", lastmod: "2026-10-20" },
      { loc: "https://sunsetdiff.com/errors/openai-model-has-been-deprecated/", lastmod: "2026-10-23" },
      { loc: "https://sunsetdiff.com/guides/what-happens-on-model-shutdown-day/", lastmod: "2026-10-20" },
      { loc: "https://sunsetdiff.com/2026/10/", lastmod: "2026-10-26" },
      { loc: "https://sunsetdiff.com/deadlines/2026-10/", lastmod: "2026-10-22" },
      { loc: "https://sunsetdiff.com/shutdowns/openai-2026-10-23/", lastmod: "2026-10-24" },
    ];
    const thin = new Set(["/replace/openai/gpt-4o/"]);
    const split = splitSitemaps(urls, "https://sunsetdiff.com", (pathname) => !thin.has(pathname));
    expect(split.dropped).toEqual(["/replace/openai/gpt-4o/"]);
    expect([...split.files.keys()]).toEqual([...SITEMAP_SECTION_FILES]);
    expect(split.files.get("sitemap-models.xml")).toContain("/models/openai/gpt-4o/");
    expect(split.files.get("sitemap-replace.xml")).toContain("/replace/openai/gpt-4/");
    expect(split.files.get("sitemap-replace.xml")).not.toContain("/replace/openai/gpt-4o/");
    expect(split.files.get("sitemap-migrate.xml")).toContain("/migrate/openai__gpt-4__to__openai__gpt-5/");
    expect(split.files.get("sitemap-guides.xml")).toContain("/errors/openai-model-has-been-deprecated/");
    expect(split.files.get("sitemap-guides.xml")).toContain("/guides/what-happens-on-model-shutdown-day/");
    expect(split.files.get("sitemap-dates.xml")).toContain("/2026/10/");
    expect(split.files.get("sitemap-dates.xml")).toContain("/deadlines/2026-10/");
    expect(split.files.get("sitemap-core.xml")).toContain("https://sunsetdiff.com/</loc>");
    expect(split.index).toContain("<sitemapindex");
    expect(split.index).toContain("https://sunsetdiff.com/sitemap-models.xml");
    expect(split.index).toContain("<loc>https://sunsetdiff.com/sitemap-dates.xml</loc><lastmod>2026-10-26</lastmod>");
    expect(split.index).toContain("<loc>https://sunsetdiff.com/sitemap-migrate.xml</loc><lastmod>2026-10-20</lastmod>");
    expect(sitemapSection("/questions/openai/gpt-4o/deprecated/")).toBe("sitemap-core.xml");
    expect(sitemapSection("/providers/openai/")).toBe("sitemap-core.xml");
  });

  it("rewrites numbered sitemap files into section files", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "sunsetdiff-sitemap-"));
    const source = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://sunsetdiff.com/models/openai/gpt-4o/</loc><lastmod>2026-10-17</lastmod></url><url><loc>https://sunsetdiff.com/guides/</loc><lastmod>2026-10-20</lastmod></url></urlset>`;
    await writeFile(path.join(dir, "sitemap-0.xml"), source);
    await writeFile(path.join(dir, "sitemap-index.xml"), "<sitemapindex></sitemapindex>");
    await writeSectionSitemaps(dir, "https://sunsetdiff.com", () => true);
    const index = await readFile(path.join(dir, "sitemap-index.xml"), "utf8");
    const alias = await readFile(path.join(dir, "sitemap.xml"), "utf8");
    expect(alias).toBe(index);
    expect(index).toContain("sitemap-models.xml");
    expect(index).toContain("sitemap-guides.xml");
    expect(index).not.toContain("sitemap-0.xml");
    const models = parseSitemapUrls(await readFile(path.join(dir, "sitemap-models.xml"), "utf8"));
    expect(models.map((url) => url.loc)).toEqual(["https://sunsetdiff.com/models/openai/gpt-4o/"]);
    expect(models[0]?.lastmod).toBe("2026-10-17");
    await expect(readFile(path.join(dir, "sitemap-0.xml"), "utf8")).rejects.toThrow();
  });
});

describe("long-retired model pages", () => {
  const day = "2026-11-07";

  function fixture(status: ModelRecord["status"], shutdown_date: string): IndexModel {
    return {
      status,
      shutdown_date,
      shutdown_date_kind: "exact",
      region_or_platform_notes: "A note that would keep an undated page indexable.",
    };
  }

  it("noindexes a retired model shut down before 2026-08-01 and keeps a near-term model in the sitemap", () => {
    const longRetired = fixture("retired", "2026-06-15");
    const nearTerm = fixture("retired", "2026-11-16");
    const onCutoff = fixture("retired", LONG_RETIRED_BEFORE);
    const deprecatedStillListed = fixture("deprecated", "2026-07-15");
    const legacyStillListed = fixture("legacy", "2026-07-01");
    const activeStillListed = fixture("active", "2026-07-20");

    expect(LONG_RETIRED_BEFORE).toBe("2026-08-01");
    expect(isLongRetiredModel(longRetired)).toBe(true);
    expect(modelPageIndexable(longRetired, day)).toBe(false);
    expect(modelRobots(longRetired, day)).toBe(NOINDEX_FOLLOW);
    expect(`<meta name="robots" content="${modelRobots(longRetired, day)}" />`).toBe(
      '<meta name="robots" content="noindex,follow" />',
    );

    for (const model of [nearTerm, onCutoff, deprecatedStillListed, legacyStillListed, activeStillListed]) {
      expect(isLongRetiredModel(model)).toBe(false);
      expect(modelPageIndexable(model, day)).toBe(true);
      expect(modelRobots(model, day)).toBeUndefined();
    }

    const longPath = "/models/fixture/long-retired/";
    const nearPath = "/models/fixture/near-term/";
    const byPath = new Map<string, IndexModel>([
      [longPath, longRetired],
      [nearPath, nearTerm],
    ]);
    const include = (pathname: string) => {
      const model = byPath.get(pathname);
      return model ? modelPageIndexable(model, day) : true;
    };
    const urls = [
      longPath,
      nearPath,
      "/models/",
      "/providers/",
      "/upcoming/",
      "/this-week/",
      "/deadlines/",
      "/guides/what-happens-on-model-shutdown-day/",
      "/shutdowns/github-copilot-2026-11-16/",
    ].map((pathname) => ({ loc: `https://sunsetdiff.com${pathname}`, lastmod: day }));
    const split = splitSitemaps(urls, "https://sunsetdiff.com", include);
    const modelsXml = split.files.get("sitemap-models.xml") ?? "";
    expect(split.dropped).toEqual([longPath]);
    expect(modelsXml).not.toContain(longPath);
    expect(modelsXml).toContain(nearPath);
    expect(modelsXml).toContain("https://sunsetdiff.com/models/</loc>");
    expect(split.files.get("sitemap-core.xml")).toContain("/upcoming/");
    expect(split.files.get("sitemap-core.xml")).toContain("/this-week/");
    expect(split.files.get("sitemap-core.xml")).toContain("/providers/");
    expect(split.files.get("sitemap-core.xml")).toContain("/deadlines/</loc>");
    expect(split.files.get("sitemap-guides.xml")).toContain("/guides/what-happens-on-model-shutdown-day/");
    expect(split.files.get("sitemap-dates.xml")).toContain("/shutdowns/github-copilot-2026-11-16/");
    for (const file of split.files.values()) expect(file).not.toContain(longPath);
  });

  it("drops real long-retired model URLs from the sitemap and keeps later shutdowns", async () => {
    const models = await loadModels();
    const buildDay = today();
    let longRetired = 0;
    let modelSitemap = 0;
    for (const model of models) {
      const pathname = `/models/${model.provider}/${model.slug}/`;
      const inModelsSitemap = includeInSitemap(pathname) && sitemapSection(pathname) === "sitemap-models.xml";
      if (inModelsSitemap) modelSitemap += 1;
      if (!isLongRetiredModel(model)) {
        if (model.shutdown_date && model.shutdown_date >= LONG_RETIRED_BEFORE && model.shutdown_date_kind !== "none") {
          expect(modelPageIndexable(model, day)).toBe(true);
          expect(modelRobots(model, day)).toBeUndefined();
          if (modelPageIndexable(model, buildDay) && !CANONICAL_ALIAS_PATHS.has(pathname)) expect(inModelsSitemap).toBe(true);
        }
        continue;
      }
      longRetired += 1;
      expect(model.shutdown_date! < LONG_RETIRED_BEFORE).toBe(true);
      expect(modelRobots(model, buildDay)).toBe(NOINDEX_FOLLOW);
      expect(includeInSitemap(pathname)).toBe(false);
      expect(inModelsSitemap).toBe(false);
    }
    expect(longRetired).toBeGreaterThan(400);
    expect(modelSitemap).toBeGreaterThan(400);
    expect(includeInSitemap("/models/")).toBe(true);
    expect(includeInSitemap("/upcoming/")).toBe(true);
    expect(includeInSitemap("/providers/")).toBe(true);
    expect(includeInSitemap("/this-week/")).toBe(true);
    expect(includeInSitemap("/deadlines/")).toBe(true);
    for (const pathname of PRIORITY_SITEMAP_PATHS) {
      if (!pathname.startsWith("/models/") || pathname === "/models/") continue;
      expect(includeInSitemap(pathname)).toBe(true);
    }
  });
});

describe("indexable pages", () => {
  it("noindexes migrate, replace, and question leaves, and stale or empty model pages", async () => {
    const [models, migrations] = await Promise.all([loadModels(), loadMigrations()]);
    const day = today();
    const cutoff = staleShutdownCutoff(day);
    expect(STALE_SHUTDOWN_MONTHS).toBe(6);
    expect(cutoff < day).toBe(true);
    expect(NOINDEX_FOLLOW).toBe("noindex,follow");
    expect(modelPageIndexable({ shutdown_date: cutoff, shutdown_date_kind: "exact", region_or_platform_notes: null }, day)).toBe(true);
    expect(modelPageIndexable({ shutdown_date: "2020-01-01", shutdown_date_kind: "exact", region_or_platform_notes: "a note" }, day)).toBe(false);
    expect(modelPageIndexable({ shutdown_date: null, shutdown_date_kind: "none", region_or_platform_notes: null }, day)).toBe(false);
    expect(modelPageIndexable({ shutdown_date: null, shutdown_date_kind: "none", region_or_platform_notes: "   " }, day)).toBe(false);
    expect(modelPageIndexable({ shutdown_date: null, shutdown_date_kind: "none", region_or_platform_notes: "Sources disagree." }, day)).toBe(true);

    let stale = 0;
    let recent = 0;
    let undatedThin = 0;
    let undatedUnique = 0;
    for (const model of models) {
      const indexable = modelPageIndexable(model, day);
      const modelPath = `/models/${model.provider}/${model.slug}/`;
      const replacePath = `/replace/${model.provider}/${model.slug}/`;
      expect(isConsolidatedLeaf(replacePath)).toBe(true);
      expect(includeInSitemap(replacePath)).toBe(false);
      expect(excludeFromSitemap(`https://sunsetdiff.com${modelPath}`)).toBe(!indexable);
      if (model.shutdown_date && model.shutdown_date_kind !== "none") {
        if (model.shutdown_date >= cutoff) recent += 1;
        else stale += 1;
      } else if (model.region_or_platform_notes?.trim()) undatedUnique += 1;
      else undatedThin += 1;
    }
    expect(stale).toBeGreaterThan(100);
    expect(recent).toBeGreaterThan(100);
    expect(undatedThin).toBeGreaterThan(10);
    expect(undatedUnique).toBeGreaterThan(10);

    for (const migration of migrations) {
      const leaf = `/migrate/${migration.from.provider}__${migration.from.slug}__to__${migration.to.provider}__${migration.to.slug}/`;
      expect(isConsolidatedLeaf(leaf)).toBe(true);
      expect(includeInSitemap(leaf)).toBe(false);
    }
    expect(includeInSitemap("/migrate/")).toBe(true);
    expect(includeInSitemap("/replace/")).toBe(true);
    expect(includeInSitemap("/questions/")).toBe(true);
    expect(isConsolidatedLeaf("/migrate/")).toBe(false);

    for (const model of topRetiringModels(models, day, 40)) {
      expect(includeInSitemap(questionPath(model, "deprecated"))).toBe(false);
      expect(includeInSitemap(questionPath(model, "shutdown-date"))).toBe(false);
    }

    const paths = excludedPaths(models);
    let deadlineThin = 0;
    for (const month of shutdownMonths(models)) {
      const thinMonth = modelsInMonth(models, month).length === 1;
      expect(paths.has(`/deadlines/${month}/`)).toBe(thinMonth);
      if (thinMonth) deadlineThin += 1;
    }
    let scheduleThin = 0;
    for (const month of shutdownMonthList(models)) {
      const thinMonth = shutdownsInMonth(models, month).length === 1;
      expect(paths.has(monthKeyPath(month))).toBe(thinMonth);
      expect(excludeFromSitemap(`https://sunsetdiff.com${monthKeyPath(month)}`)).toBe(thinMonth);
      if (thinMonth) scheduleThin += 1;
    }
    expect(deadlineThin).toBeGreaterThan(0);
    expect(scheduleThin).toBeGreaterThan(0);

    for (const asset of ["/feed.xml", "/deadlines.ics", "/openapi.json", "/server.json", "/data/models.json", "/data/deprecations.csv"]) {
      expect(includeInSitemap(asset)).toBe(false);
    }
    expect(PRIORITY_SITEMAP_PATHS).toHaveLength(28);
    for (const pathname of PRIORITY_SITEMAP_PATHS) {
      expect(includeInSitemap(pathname)).toBe(true);
      expect(lastmodForUrl(`https://sunsetdiff.com${pathname}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const event of shutdownEvents(models)) {
      if (event.date < day) continue;
      expect(includeInSitemap(shutdownEventPath(event))).toBe(true);
    }
    for (const guide of guides) expect(includeInSitemap(guidePath(guide.slug))).toBe(true);
    for (const page of requestErrors) expect(includeInSitemap(requestErrorPath(page.slug))).toBe(true);

    const copilot = shutdownEvents(models).find((event) => event.slug === "github-copilot-2026-11-16");
    expect(copilot).toBeTruthy();
    expect(batchDocumentTitle("GitHub Copilot", copilot!, day)).toBe(COPILOT_NOV16_TITLE);
    expect(batchHeadline("GitHub Copilot", copilot!, day)).toBe("GitHub Copilot models shutting down November 16, 2026");
    expect(batchDescription("GitHub Copilot", copilot!, day)).toBe(COPILOT_NOV16_DESCRIPTION);
    const lead = batchLead("GitHub Copilot", copilot!, day);
    expect(lead).toContain("Copilot Chat, inline edits, ask and agent modes, and code completions");
    expect(lead).toContain("does not prefer one");
    expect(lead).toContain("does not publish a separate API id");
    expect(lead).toContain("SunsetDiff is not GitHub");
    expect(lead).not.toContain("Requests start failing");
    const steps = batchChecklist(copilot!, day).join(" ");
    expect(steps).toContain("model policies");
    expect(steps).toContain("Copilot Chat model selector");
    expect(steps).not.toContain("scan");
    const anchors = nextDeadlineAnchors(shutdownEvents(models), await loadProviders(), day);
    expect(anchors.some((item) => item.href === "/shutdowns/github-copilot-2026-11-16/" && item.label === COPILOT_NOV16_TITLE)).toBe(true);
    expect(anchors.some((item) => item.href === "/openai-evals-agent-builder-prompts-shutdown-nov-30-2026/")).toBe(true);
    expect(anchors.every((item) => item.date >= day)).toBe(true);
  });
});

describe("content lastmod", () => {
  it("uses the changelog day instead of the scrape timestamp", async () => {
    const models = await loadModels();
    const days = new Set<string>();
    let differed = 0;
    for (const model of models) {
      const expected = contentDay(model);
      const url = `https://sunsetdiff.com/models/${model.provider}/${model.slug}/`;
      expect(lastmodForUrl(url)).toBe(expected);
      expect(lastmodForUrl(`https://sunsetdiff.com/replace/${model.provider}/${model.slug}/`)).toBe(expected);
      days.add(expected);
      if (expected !== model.updated_at.slice(0, 10)) differed += 1;
    }
    expect(days.size).toBeGreaterThan(5);
    expect(differed).toBeGreaterThan(100);
    const gpt4o = models.find((model) => model.provider === "openai" && model.slug === "gpt-4o");
    expect(gpt4o).toBeTruthy();
    expect(lastmodForUrl("https://sunsetdiff.com/models/openai/gpt-4o/")).toBe(contentDay(gpt4o!));
    expect(contentDay(gpt4o!)).not.toBe(gpt4o!.updated_at.slice(0, 10));
  });

  it("dates a migration from the two model records, not a shared last_checked day", async () => {
    const [models, migrations] = await Promise.all([loadModels(), loadMigrations()]);
    const days = new Set<string>();
    for (const migration of migrations) {
      const from = models.find((model) => model.provider === migration.from.provider && model.slug === migration.from.slug);
      const to = models.find((model) => model.provider === migration.to.provider && model.slug === migration.to.slug);
      expect(from && to).toBeTruthy();
      const expected = [contentDay(from!), contentDay(to!)].sort().at(-1);
      const url = `https://sunsetdiff.com/migrate/${migration.from.provider}__${migration.from.slug}__to__${migration.to.provider}__${migration.to.slug}/`;
      expect(lastmodForUrl(url)).toBe(expected);
      days.add(expected!);
    }
    expect(days.size).toBeGreaterThan(3);
    expect(lastmodForUrl("https://sunsetdiff.com/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("links and titles", () => {
  it("gives programmatic pages unique titles and links related models and guides", async () => {
    const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
    const providerName = new Map(providers.map((provider) => [provider.id, provider.name]));
    const modelTitles = models.map((model) => modelTitle(model, models, providerName.get(model.provider)));
    const descriptions = models.map((model) => {
      const provider = providers.find((item) => item.id === model.provider)!;
      const migration = migrations.find((item) => item.from.provider === model.provider && item.from.slug === model.slug);
      const name = uniqueVisibleName(model, models, provider.name);
      return metaDescription(name, answerSentence(model, provider, migration, models));
    });
    expect(new Set(descriptions).size).toBe(descriptions.length);
    const replaceTitles = models.map((model) => replacePageTitle(model, models, providerName.get(model.provider) ?? model.provider));
    expect(new Set(modelTitles).size).toBe(modelTitles.length);
    expect(new Set(replaceTitles).size).toBe(replaceTitles.length);
    const migrateTitles = migrations.map((migration) => {
      const from = models.find((model) => model.provider === migration.from.provider && model.slug === migration.from.slug)!;
      const to = models.find((model) => model.provider === migration.to.provider && model.slug === migration.to.slug)!;
      return migratePageTitle(from, to, models, providerName.get(from.provider) ?? from.provider, providerName.get(to.provider) ?? to.provider);
    });
    expect(new Set(migrateTitles).size).toBe(migrateTitles.length);
    const questions = topRetiringModels(models, today(), 40).flatMap((model) => [
      questionPageTitle(model, "deprecated", models, providerName.get(model.provider) ?? model.provider),
      questionPageTitle(model, "shutdown-date", models, providerName.get(model.provider) ?? model.provider),
    ]);
    expect(new Set(questions).size).toBe(questions.length);
    const combined = [...modelTitles, ...replaceTitles, ...migrateTitles, ...questions];
    expect(new Set(combined).size).toBe(combined.length);

    const gpt4o = models.find((model) => model.provider === "openai" && model.slug === "gpt-4o")!;
    const related = relatedModels(gpt4o, models);
    expect(related.every((model) => model.provider === "openai")).toBe(true);
    expect(related.some((model) => model.id === "gpt-4o-2024-08-06")).toBe(true);
    expect(guidesForModel(gpt4o, models).map((link) => link.href)).toContain("/guides/model-aliases-vs-pinned-snapshots/");
    const image = models.find((model) => model.provider === "openai" && model.slug === "gpt-image-1")!;
    expect(guidesForModel(image, models).map((link) => link.href)).toContain("/guides/what-happens-on-model-shutdown-day/");

    const featured = featuredModelLinks(models);
    expect(featured.map((link) => link.href)).toContain("/models/openai/gpt-4o/");
    expect(featured.map((link) => link.href)).toContain("/models/openai/gpt-4-1/");
    expect(featured.map((link) => link.href)).toContain("/models/anthropic/claude-sonnet-5-5/");
    expect(featured.map((link) => link.href)).toContain("/models/google-gemini-api/gemini-2-5-flash/");
    expect(featuredErrorLinks().map((link) => link.href)).toContain("/errors/openai-model-has-been-deprecated/");
    const text = llmsTxt("https://sunsetdiff.com", providers, [], {
      featured: featured.map((link) => ({ label: link.label, path: link.href })),
    });
    expect(text).toContain("## Models people look up");
    expect(text).toContain("/models/openai/gpt-4o/");
    expect(llmsFull("https://sunsetdiff.com", models)).toContain("Featured model: https://sunsetdiff.com/models/openai/gpt-4o/");

    const graph = migrateGraph("https://sunsetdiff.com/", gpt4o, undefined, providers[0], "/migrate/example/", models);
    const article = graph.find((node) => node["@type"] === "TechArticle") as { url?: string };
    expect(article.url).toBe("https://sunsetdiff.com/migrate/example/");
  });
});
