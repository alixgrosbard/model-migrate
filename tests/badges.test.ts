import { describe, expect, it } from "vitest";
import { badgesGraph } from "../src/jsonld.ts";
import {
  BADGES_DESCRIPTION,
  BADGES_PATH,
  BADGES_TITLE,
  badgeEndpoint,
  badgeFaqs,
  badgeHtml,
  badgeJsonPath,
  badgeMarkdown,
  badgeShieldsMarkdown,
  badgeSvg,
  badgeSvgPath,
  badgeView,
  daysUntil,
  flatBadgeSvg,
  verdanaWidth,
} from "../src/lib/badges.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { loadModels } from "../src/lib/load.ts";
import { modelSchema, type ModelRecord } from "../src/schema.ts";

const day = "2026-10-21";

describe("status badges", () => {
  it("uses the shutdown date that is already on the model", () => {
    expect(badgeView(stub("retired", "2024-01-01", "exact", "retired"), day)).toMatchObject({
      message: "retired",
      color: "red",
      fill: "#e05d44",
    });
    expect(badgeView(stub("soon", "2026-11-14", "exact", "deprecated"), day)).toMatchObject({
      message: "retires 2026-11-14",
      color: "red",
    });
    expect(daysUntil(day, "2026-11-14")).toBe(24);
    expect(badgeView(stub("month", "2026-11-20", "exact", "legacy"), day)).toMatchObject({
      message: "retires 2026-11-20",
      color: "amber",
    });
    expect(badgeView(stub("later", "2027-02-01", "exact", "active"), day)).toMatchObject({
      message: "retires 2027-02-01",
      color: "green",
    });
    expect(badgeView(stub("past", "2026-10-01", "exact", "deprecated"), day)).toMatchObject({
      message: "retires 2026-10-01",
      color: "red",
    });
    expect(badgeView(stub("floor", "2026-12-01", "not_before", "active"), day)).toMatchObject({
      message: "not before 2026-12-01",
      color: "gray",
    });
    expect(badgeView(stub("month-only", "2026-12-01", "month_only", "deprecated"), day).message).toBe("retires 2026-12");
    expect(badgeView(stub("open", null, "none", "active"), day)).toMatchObject({
      message: "active / no shutdown announced",
      color: "green",
    });
    expect(badgeView(stub("old", null, "none", "deprecated"), day).message).toBe("deprecated / no shutdown announced");
    const quiet = badgeView(stub("open", null, "none", "active"), day);
    expect(quiet.message).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("draws a flat shields-style SVG and a shields endpoint", () => {
    expect(verdanaWidth("gpt-4o")).toBe(37);
    expect(verdanaWidth("retires 2026-11-14")).toBe(105);
    const svg = flatBadgeSvg("gpt-4o", "retires 2026-11-14", "#e05d44");
    expect(svg).toContain('width="162"');
    expect(svg).toContain('height="20"');
    expect(svg).toContain('fill="#e05d44"');
    expect(svg).toContain('aria-label="gpt-4o: retires 2026-11-14"');
    expect(svg.startsWith("<svg ")).toBe(true);
    const model = stub("gpt-4o", "2026-11-14", "exact", "deprecated");
    expect(badgeSvg(model, day)).toBe(svg);
    expect(badgeEndpoint(model, day)).toEqual({
      schemaVersion: 1,
      label: "gpt-4o",
      message: "retires 2026-11-14",
      color: "red",
      cacheSeconds: 3600,
    });
  });

  it("links the snippet back to the model page and keeps provider slugs apart", async () => {
    const model = stub("gpt-4o", "2026-11-14", "exact", "deprecated");
    const origin = "https://sunsetdiff.com";
    expect(badgeSvgPath(model)).toBe("/badge/openai/gpt-4o.svg");
    expect(badgeJsonPath(model)).toBe("/badge/openai/gpt-4o.json");
    expect(badgeMarkdown(origin, model, day)).toBe(
      "[![gpt-4o: retires 2026-11-14](https://sunsetdiff.com/badge/openai/gpt-4o.svg)](https://sunsetdiff.com/models/openai/gpt-4o/)",
    );
    expect(badgeHtml(origin, model, day)).toContain('href="https://sunsetdiff.com/models/openai/gpt-4o/"');
    expect(badgeShieldsMarkdown(origin, model, day)).toContain("https://img.shields.io/endpoint?url=");
    expect(badgeShieldsMarkdown(origin, model, day)).toContain(encodeURIComponent("https://sunsetdiff.com/badge/openai/gpt-4o.json"));

    const models = await loadModels();
    const paths = models.map((item) => badgeSvgPath(item));
    expect(new Set(paths).size).toBe(models.length);
    expect(models.length).toBeGreaterThan(100);
    const shared = models.filter((item) => item.slug === "gpt-4o-2024-05-13").map((item) => badgeSvgPath(item));
    expect(shared.length).toBeGreaterThan(1);
    expect(new Set(shared).size).toBe(shared.length);
  });

  it("lists the badges page with the same title, description, and JSON-LD shape", () => {
    expect(BADGES_TITLE.endsWith("| SunsetDiff")).toBe(true);
    expect(BADGES_DESCRIPTION.length).toBeGreaterThan(40);
    expect(BADGES_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(JSON.stringify({ BADGES_TITLE, BADGES_DESCRIPTION, badgeFaqs })).not.toMatch(/[—–]/);
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain(`https://sunsetdiff.com${BADGES_PATH}`);
    expect(text).toContain(BADGES_DESCRIPTION);
    expect(full).toContain(`https://sunsetdiff.com${BADGES_PATH}`);
    expect(lastmodForUrl(`https://sunsetdiff.com${BADGES_PATH}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const graph = badgesGraph("https://sunsetdiff.com/", [{ name: "OpenAI: gpt-4o", path: "/models/openai/gpt-4o/" }], badgeFaqs);
    expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "ItemList", "FAQPage"]);
    expect(JSON.stringify(graph)).not.toMatch(/[—–]/);
  });
});

function stub(id: string, date: string | null, kind: ModelRecord["shutdown_date_kind"], status: ModelRecord["status"]): ModelRecord {
  return modelSchema.parse({
    id,
    slug: id,
    provider: "openai",
    display_name: id,
    family: null,
    status,
    announced_date: null,
    deprecation_date: null,
    shutdown_date: date,
    shutdown_date_kind: kind,
    region_or_platform_notes: null,
    replacements: [],
    sources: [{ url: "https://developers.openai.com/api/docs/deprecations", label: "OpenAI", last_checked: "2026-10-17", excerpt: "example" }],
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
  });
}
