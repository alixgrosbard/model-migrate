import { describe, expect, it } from "vitest";
import { guideGraph, guidesIndexGraph } from "../src/jsonld.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guideChecked, guidePath, guides } from "../src/lib/guides.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { contentAliasFiles } from "../src/lib/shortcuts.ts";

const ALLOWED_HOSTS = new Set([
  "developers.openai.com",
  "platform.claude.com",
  "ai.google.dev",
  "docs.cloud.google.com",
  "firebase.google.com",
  "learn.microsoft.com",
  "docs.aws.amazon.com",
  "docs.litellm.ai",
  "ai-sdk.dev",
  "docs.langchain.com",
  "openrouter.ai",
  "sunsetdiff.com",
  "creativecommons.org",
  "huggingface.co",
  "help.openai.com",
  "learn.chatgpt.com",
  "github.com",
  "api-docs.deepseek.com",
  "deepseek.com",
]);

describe("guides", () => {
  it("lists the hub and every guide with a cited source", () => {
    expect(guides.length).toBeGreaterThanOrEqual(8);
    expect(guides.map((guide) => guide.slug)).toContain("check-model-shutdown-dates-programmatically");
    const slugs = guides.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const guide of guides) {
      expect(guide.h1.length).toBeGreaterThan(10);
      expect(guide.summary.length).toBeGreaterThan(20);
      expect(guide.answer.length).toBeGreaterThan(40);
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.citations.length).toBeGreaterThan(0);
      expect(guide.faqs.length).toBeGreaterThan(0);
      const blob = JSON.stringify(guide);
      expect(blob.includes("—")).toBe(false);
      expect(blob.includes("–")).toBe(false);
      expect(blob.toLowerCase().includes("alix")).toBe(false);
      expect(blob.includes("sk-")).toBe(false);
      expect(blob.includes("api_key")).toBe(false);
      expect(blob.includes("Bearer")).toBe(false);
      for (const citation of guide.citations) {
        const url = new URL(citation);
        expect(url.protocol).toBe("https:");
        expect(ALLOWED_HOSTS.has(url.hostname)).toBe(true);
      }
      for (const section of guide.sections) {
        expect(section.sources.length).toBeGreaterThan(0);
        for (const source of section.sources) {
          expect(guide.citations).toContain(source.url);
        }
      }
      const graph = guideGraph("https://sunsetdiff.com/", guide);
      expect(graph.some((node) => node["@type"] === "Article")).toBe(true);
      expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
      expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
      const article = graph.find((node) => node["@type"] === "Article") as { dateModified?: string };
      expect(article.dateModified).toBe(guideChecked(guide));
      expect(lastmodForUrl(`https://sunsetdiff.com${guidePath(guide.slug)}`)).toBe(guideChecked(guide));
    }

    expect(lastmodForUrl("https://sunsetdiff.com/guides/")).toBe(GUIDES_CHECKED);
    const hub = guidesIndexGraph(
      "https://sunsetdiff.com/",
      guides.map((guide) => ({ name: guide.h1, path: guidePath(guide.slug) })),
      [],
    );
    expect(hub.some((node) => node["@type"] === "CollectionPage")).toBe(true);
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain(GUIDES_INDEX);
    expect(full).toContain(GUIDES_INDEX);
    for (const guide of guides) {
      expect(text).toContain(guidePath(guide.slug));
      expect(full).toContain(guidePath(guide.slug));
    }
  });

  it("sources the custom GPT retirement guide and aliases /custom-gpts/", () => {
    const guide = guides.find((item) => item.slug === "custom-gpt-retirement");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guideChecked(guide)).toBe("2026-10-24");
    expect(guide.title).toBe("Custom GPT retirement | SunsetDiff");
    expect(guide.description).toContain("December 11, 2026");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("February 11, 2027");
    expect(blob).toContain("qualified, approved deferral");
    expect(blob).toContain("https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq");
    expect(blob).toContain("https://learn.chatgpt.com/docs/migrate-custom-gpts");
    expect(blob).toContain("https://learn.chatgpt.com/docs/extend/mcp");
    expect(blob.toLowerCase()).not.toContain("share-by-link");
    expect(blob.toLowerCase()).not.toContain("share by link");
    expect(blob).toContain("/mcp/");
    expect(guide.sections.some((section) => section.table && section.table.rows.length >= 8)).toBe(true);
    const alias = contentAliasFiles("https://sunsetdiff.com");
    expect(alias.map((file) => file.slug)).toEqual(["custom-gpts"]);
    expect(alias[0].html).toContain('rel="canonical" href="https://sunsetdiff.com/guides/custom-gpt-retirement/"');
    expect(alias[0].html).toContain('http-equiv="refresh" content="0; url=/guides/custom-gpt-retirement/"');
    expect(alias[0].html).toContain('content="noindex"');
    expect(alias[0].html).not.toMatch(/[—–]/);
  });

  it("sources the silent-failure guide from the recorded issues and official pages", () => {
    const guide = guides.find((item) => item.slug === "silent-failures-after-model-shutdown");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guideChecked(guide)).toBe("2026-10-25");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("404 model_not_found");
    expect(blob).toContain("Unsupported parameter: 'temperature' is not supported with this model.");
    expect(blob).toContain("models/gemini-2.5-flash is no longer available to new users");
    expect(blob).toContain("410 Gone");
    expect(blob).toContain("2026-07-24");
    expect(blob).toContain("15:59");
    expect(blob).toContain("2027-03-30");
    expect(blob).toContain("https://github.com/aaif-goose/goose/issues/13114");
    expect(blob).toContain("https://api-docs.deepseek.com/updates/");
    expect(blob).toContain("https://deepseek.com/en/news/v4-preview/");
    expect(blob).toContain("/errors/openai-temperature-is-not-supported-with-this-model/");
    expect(blob).toContain("/errors/gemini-2-5-flash-no-longer-available-to-new-users/");
    expect(blob).toContain("/errors/azure-openai-retired-model-410-gone/");
    expect(blob).toContain("/errors/deepseek-model-not-found/");
    expect(blob).toContain("/models/deepseek/deepseek-reasoner/");
    expect(blob).toContain("/api/v1/lookup/gpt-4.1-nano.json");
    expect(blob.toLowerCase()).not.toContain("deepseek-chat retired on 2026-07-24 in sunsetdiff");
  });
});
