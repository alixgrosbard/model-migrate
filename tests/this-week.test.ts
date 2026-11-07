import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scheduleGraph } from "../src/jsonld.ts";
import { addDays } from "../src/lib/format.ts";
import {
  BEDROCK_NOV13_GUIDE_SLUG,
  FIREWORKS_NOV7_GUIDE_SLUG,
  NEBIUS_NOV9_GUIDE_SLUG,
  OPENROUTER_NOV_DEC_GUIDE_SLUG,
  TOGETHER_NOV6_GUIDE_SLUG,
} from "../src/lib/dataset-guides.ts";
import { guidePath } from "../src/lib/guides.ts";
import { includeInSitemap } from "../src/lib/indexability.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import type { ModelRecord } from "../src/schema.ts";
import {
  NEXT_30_DAYS_COUNT,
  NEXT_30_DAYS_PATH,
  NEXT_7_DAYS_PATH,
  THIS_WEEK_DAYS,
  THIS_WEEK_PATH,
  rollingShutdowns,
  windowPage,
} from "../src/lib/window-pages.ts";

const day = "2026-11-06";

describe("this week shutdown page", () => {
  it("lists the frozen window from the dataset, including not-sooner-than dates", async () => {
    const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
    const week = windowPage({ models, providers, migrations, day, days: THIS_WEEK_DAYS, path: THIS_WEEK_PATH });
    const end = addDays(day, THIS_WEEK_DAYS);
    expect(week.end).toBe(end);
    expect(week.h1).toBe("AI models shutting down this week");
    expect(week.title).toBe("AI models shutting down this week | SunsetDiff");
    expect(week.description).toContain("AI models shutting down this week");
    expect(week.description).toContain("LLM deprecations this week");
    expect(week.description.length).toBeLessThanOrEqual(160);
    expect(week.faqs).toHaveLength(5);
    expect(week.empty).toBe(false);
    expect(week.groups.map((group) => group.date)).toEqual([...new Set(week.rows.map((row) => row.model.shutdown_date))]);
    expect(week.groups.map((group) => group.date).every((date, index, dates) => index === 0 || dates[index - 1] <= date)).toBe(true);

    for (const model of models) {
      const counted = model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "not_before";
      const inside = Boolean(model.shutdown_date) && counted && model.shutdown_date! >= day && model.shutdown_date! <= end;
      const listed = week.rows.some(
        (row) =>
          row.model.provider === model.provider &&
          row.model.id === model.id &&
          row.model.shutdown_date === model.shutdown_date &&
          row.model.shutdown_date_kind === model.shutdown_date_kind,
      );
      expect(listed, `${model.provider} ${model.id} ${model.shutdown_date} ${model.shutdown_date_kind}`).toBe(inside);
    }

    const together = rowFor(week.rows, "together", "MiniMaxAI/MiniMax-M3");
    expect(together.model.shutdown_date).toBe("2026-11-06");
    expect(together.model.shutdown_date_kind).toBe("exact");
    expect(together.modelPath).toBe(`/models/together/${together.model.slug}/`);
    expect(together.replacements.map((link) => link.id)).toContain("MiniMaxAI/MiniMax-M3.1-Flash");
    expect(together.shutdownPath).toBe("/shutdowns/together-2026-11-06/");
    expect(together.guides.map((link) => link.href)).toContain(guidePath(TOGETHER_NOV6_GUIDE_SLUG));
    expect(rowFor(week.rows, "together", "thinkingmachines/Inkling").shutdownPath).toBe("/shutdowns/together-2026-11-06/");

    const fireworks = rowFor(week.rows, "fireworks", "accounts/fireworks/models/gpt-oss-120b");
    expect(fireworks.model.shutdown_date).toBe("2026-11-07");
    expect(fireworks.replacements).toEqual([]);
    expect(fireworks.shutdownPath).toBe("/shutdowns/fireworks-2026-11-07/");
    expect(fireworks.guides.map((link) => link.href)).toContain(guidePath(FIREWORKS_NOV7_GUIDE_SLUG));

    const mercury = rowFor(week.rows, "openrouter", "inception/mercury-2");
    expect(mercury.model.shutdown_date).toBe("2026-11-08");
    expect(mercury.model.shutdown_date_kind).toBe("not_before");
    expect(mercury.when).toContain("Not sooner than");
    expect(mercury.shutdownPath).toBe("/shutdowns/openrouter-2026-11-08/");
    expect(mercury.guides.map((link) => link.href)).toContain(guidePath(OPENROUTER_NOV_DEC_GUIDE_SLUG));
    expect(mercury.guides.some((link) => link.href.includes("what-happens-on-model-shutdown-day"))).toBe(false);

    const nebius = rowFor(week.rows, "nebius", "zai-org/GLM-5.1");
    expect(nebius.model.shutdown_date).toBe("2026-11-09");
    expect(nebius.shutdownPath).toBe("/shutdowns/nebius-2026-11-09/");
    expect(nebius.guides.map((link) => link.href)).toContain(guidePath(NEBIUS_NOV9_GUIDE_SLUG));
    expect(nebius.replacements.length).toBeGreaterThan(0);

    const haiku = week.rows.find(
      (row) => row.model.provider === "aws-bedrock" && row.model.id === "anthropic.claude-3-haiku-20240307-v1:0" && row.model.shutdown_date === "2026-11-13",
    );
    expect(haiku?.shutdownPath).toBe("/shutdowns/aws-bedrock-2026-11-13/");
    expect(haiku?.guides.map((link) => link.href)).toContain(guidePath(BEDROCK_NOV13_GUIDE_SLUG));
    expect(haiku?.modelPath.startsWith("/models/aws-bedrock/")).toBe(true);

    expect(week.groups[0]?.date).toBe("2026-11-06");
    expect(week.groups[0]?.providers.map((provider) => provider.providerId)).toContain("together");
    for (const group of week.groups) {
      const names = group.providers.map((provider) => provider.providerName);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(group.providers.map((provider) => provider.providerId)).toEqual(providerIdsOnDate(week.rows, group.date));
    }

    const which = week.faqs[0];
    expect(which.question).toBe("Which AI models are shutting down this week?");
    expect(which.answer).toContain("MiniMaxAI/MiniMax-M3");
    expect(which.answer).toContain("inception/mercury-2");
    expect(which.answer).toContain(String(week.rows.length));
    const floors = week.faqs.find((item) => item.question === "Which dates this week are not-sooner-than floors?");
    expect(floors?.answer).toContain("OpenRouter");
    expect(floors?.answer).toContain("November 8, 2026");
    const soonest = week.faqs.find((item) => item.question === "What is the soonest shutdown date this week?");
    expect(soonest?.answer).toContain("November 6, 2026");
    expect(soonest?.answer).toContain("MiniMaxAI/MiniMax-M3");
    expect(week.faqs.map((item) => item.question + item.answer).join(" ")).not.toMatch(/[—–]/);
    expect(`${week.title} ${week.description} ${week.intro}`).not.toMatch(/[—–]/);

    const graph = scheduleGraph(
      "https://sunsetdiff.com/",
      {
        path: week.path,
        name: week.h1,
        description: week.description,
        datasetName: week.datasetName,
        temporalCoverage: `${week.day}/${week.end}`,
        aboutUrl: "/data/models.json",
      },
      week.rows.map((row) => ({ name: row.model.id, path: row.modelPath })),
      week.faqs,
    );
    expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "ItemList", "FAQPage", "Dataset"]);
    const faq = graph.find((node) => node["@type"] === "FAQPage") as { mainEntity: unknown[] };
    expect(faq.mainEntity).toHaveLength(5);

    const month = windowPage({ models, providers, migrations, day, days: NEXT_30_DAYS_COUNT, path: NEXT_30_DAYS_PATH });
    expect(month.h1).toBe("AI models shutting down in the next 30 days");
    expect(month.rows.length).toBeGreaterThan(week.rows.length);
    for (const row of week.rows) {
      expect(month.rows.some((item) => item.model.provider === row.model.provider && item.model.slug === row.model.slug && item.model.shutdown_date === row.model.shutdown_date)).toBe(true);
    }
    const copilot = models.filter((model) => model.provider === "github-copilot" && model.shutdown_date === "2026-11-16" && model.shutdown_date_kind === "exact");
    expect(copilot.length).toBeGreaterThan(0);
    for (const model of copilot) {
      expect(week.rows.some((row) => row.model.id === model.id && row.model.provider === model.provider)).toBe(false);
      expect(month.rows.some((row) => row.model.id === model.id && row.model.provider === model.provider)).toBe(true);
    }
    expect(month.rows.some((row) => (row.model.shutdown_date ?? "") > addDays(day, NEXT_30_DAYS_COUNT))).toBe(false);
    expect(month.faqs).toHaveLength(5);

    const text = llmsTxt("https://sunsetdiff.com", providers, []);
    const full = llmsFull("https://sunsetdiff.com", models, providers);
    for (const path of [THIS_WEEK_PATH, NEXT_30_DAYS_PATH]) {
      expect(text).toContain(path);
      expect(full).toContain(path);
      expect(sitemapSection(path)).toBe("sitemap-core.xml");
      expect(includeInSitemap(path)).toBe(true);
      expect(lastmodForUrl(`https://sunsetdiff.com${path}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(includeInSitemap(NEXT_7_DAYS_PATH)).toBe(false);
    expect(text).not.toContain(NEXT_7_DAYS_PATH);

    const source = readFileSync(new URL("../src/pages/this-week/index.astro", import.meta.url), "utf8");
    expect(source).toContain("windowPage");
    expect(source).toContain("THIS_WEEK_PATH");
    expect(source).toContain("today()");
    const alias = readFileSync(new URL("../src/pages/next-7-days/index.astro", import.meta.url), "utf8");
    expect(alias).toContain("canonicalPath={THIS_WEEK_PATH}");
    expect(alias).toContain('robots="noindex"');
    const home = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
    expect(home).toContain('href="/this-week/"');
    expect(home).toContain("Next deadlines");
  });

  it("keeps an empty window empty and drops dates outside the frozen day", async () => {
    const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
    const sample = models.find((model) => model.provider === "openai");
    expect(sample).toBeTruthy();
    const probes = [
      probe(sample!, "month-only-probe", "2026-11-06", "month_only"),
      probe(sample!, "via-probe", "2026-11-06", "via_snapshots"),
      probe(sample!, "before-probe", "2026-11-05", "exact"),
      probe(sample!, "after-probe", "2026-11-14", "exact"),
      probe(sample!, "edge-probe", "2026-11-13", "exact"),
      probe(sample!, "floor-probe", "2026-11-13", "not_before"),
    ];
    const together = models.find((model) => model.provider === "together" && model.id === "MiniMaxAI/MiniMax-M3");
    expect(together).toBeTruthy();
    const duplicate = { ...together!, slug: `${together!.slug}-duplicate-longer` };
    const page = windowPage({
      models: [...models, ...probes, duplicate],
      providers,
      migrations,
      day,
      days: THIS_WEEK_DAYS,
      path: THIS_WEEK_PATH,
    });
    const ids = page.rows.map((row) => row.model.id);
    expect(ids).toContain("edge-probe");
    expect(ids).toContain("floor-probe");
    expect(ids).not.toContain("month-only-probe");
    expect(ids).not.toContain("via-probe");
    expect(ids).not.toContain("before-probe");
    expect(ids).not.toContain("after-probe");
    expect(page.rows.filter((row) => row.model.provider === "together" && row.model.id === "MiniMaxAI/MiniMax-M3")).toHaveLength(1);
    expect(rollingShutdowns([duplicate, together!], day, THIS_WEEK_DAYS).map((model) => model.slug)).toEqual([together!.slug]);

    const empty = windowPage({ models, providers, migrations, day: "2099-01-01", days: THIS_WEEK_DAYS, path: THIS_WEEK_PATH });
    expect(empty.empty).toBe(true);
    expect(empty.rows).toEqual([]);
    expect(empty.groups).toEqual([]);
    expect(empty.intro).toContain("No model in this dataset");
    expect(empty.intro).toContain("January 1, 2099");
    expect(empty.intro).toContain("January 8, 2099");
    expect(empty.faqs).toHaveLength(5);
    const blob = `${empty.intro} ${empty.faqs.map((item) => item.answer).join(" ")}`;
    expect(blob).not.toContain("MiniMax");
    expect(blob).not.toContain("inception/mercury-2");
    expect(blob).not.toContain("gpt-oss-120b");
    expect(empty.h1).toBe("AI models shutting down this week");
  });
});

function providerIdsOnDate(
  rows: { model: { provider: string; shutdown_date: string | null }; providerName: string }[],
  date: string,
): string[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.model.shutdown_date !== date || seen.has(row.model.provider)) continue;
    seen.set(row.model.provider, row.providerName);
  }
  return [...seen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}

function rowFor(rows: { model: ModelRecord }[], provider: string, id: string) {
  const row = rows.find((item) => item.model.provider === provider && item.model.id === id);
  expect(row, `${provider} ${id}`).toBeTruthy();
  return row!;
}

function probe(sample: ModelRecord, id: string, shutdownDate: string, kind: ModelRecord["shutdown_date_kind"]): ModelRecord {
  return {
    ...sample,
    id,
    slug: id,
    display_name: id,
    shutdown_date: shutdownDate,
    shutdown_date_kind: kind,
    deprecation_date: shutdownDate,
    region_or_platform_notes: null,
    replacements: [],
  };
}
