import { describe, expect, it } from "vitest";
import { guideGraph, guidesIndexGraph } from "../src/jsonld.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guidePath, guides } from "../src/lib/guides.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";

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
      expect(lastmodForUrl(`https://sunsetdiff.com${guidePath(guide.slug)}`)).toBe(GUIDES_CHECKED);
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
});
