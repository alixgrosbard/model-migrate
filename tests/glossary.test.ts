import { describe, expect, it } from "vitest";
import { glossaryIndexGraph, glossaryTermGraph } from "../src/jsonld.ts";
import { feedRedirectHtml } from "../src/lib/shortcuts.ts";
import {
  GLOSSARY_CHECKED,
  GLOSSARY_INDEX,
  glossaryExamples,
  glossaryPath,
  glossaryTerms,
} from "../src/lib/glossary.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { loadModels } from "../src/lib/load.ts";
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
  "openrouter.ai",
  "sunsetdiff.com",
]);

describe("glossary", () => {
  it("publishes a cited definition for every term", async () => {
    expect(glossaryTerms.length).toBeGreaterThanOrEqual(15);
    expect(glossaryTerms.length).toBeLessThanOrEqual(25);
    const slugs = glossaryTerms.map((term) => term.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const models = await loadModels();
    const known = new Set(models.map((model) => `${model.provider}:${model.id}`));

    for (const term of glossaryTerms) {
      expect(term.name.length).toBeGreaterThan(3);
      expect(term.description.length).toBeGreaterThan(40);
      expect(term.description.length).toBeLessThanOrEqual(160);
      expect(term.definition.length).toBeGreaterThan(40);
      expect(term.definition.split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(2);
      expect(term.sections.length).toBeGreaterThan(0);
      expect(term.citations.length).toBeGreaterThan(0);
      expect(term.related.length).toBeGreaterThan(0);
      const blob = JSON.stringify(term);
      expect(blob.includes("—")).toBe(false);
      expect(blob.includes("–")).toBe(false);
      expect(blob.toLowerCase().includes("alix")).toBe(false);
      for (const citation of term.citations) {
        const url = new URL(citation);
        expect(url.protocol).toBe("https:");
        expect(ALLOWED_HOSTS.has(url.hostname)).toBe(true);
      }
      for (const section of term.sections) {
        expect(section.sources.length).toBeGreaterThan(0);
        expect(section.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        for (const source of section.sources) {
          expect(term.citations).toContain(source.url);
        }
      }
      for (const slug of term.seeAlso) expect(slugs).toContain(slug);
      for (const group of term.exampleGroups) {
        const rows = glossaryExamples(group.spec, models);
        for (const row of rows) expect(known.has(`${row.provider}:${row.id}`)).toBe(true);
        if (group.spec.kind === "status") {
          for (const row of rows) expect(row.status).toBe(group.spec.status);
        }
      }
      const graph = glossaryTermGraph("https://sunsetdiff.com/", term);
      const defined = graph.find((node) => node["@type"] === "DefinedTerm") as { description?: string; name?: string };
      expect(defined.description).toBe(term.definition);
      expect(defined.name).toBe(term.name);
      expect(graph.some((node) => node["@type"] === "Article")).toBe(true);
      expect(lastmodForUrl(`https://sunsetdiff.com${glossaryPath(term.slug)}`)).toBe(GLOSSARY_CHECKED);
    }

    expect(lastmodForUrl("https://sunsetdiff.com/glossary/")).toBe(GLOSSARY_CHECKED);
    const hub = glossaryIndexGraph("https://sunsetdiff.com/", []);
    const set = hub.find((node) => node["@type"] === "DefinedTermSet") as { hasDefinedTerm?: unknown[] };
    expect(set.hasDefinedTerm).toHaveLength(glossaryTerms.length);
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain(GLOSSARY_INDEX);
    expect(full).toContain(GLOSSARY_INDEX);
    expect(text).toContain("/rss.xml");
    expect(full).toContain("/rss.xml");
    for (const term of glossaryTerms) {
      expect(text).toContain(glossaryPath(term.slug));
      expect(full).toContain(glossaryPath(term.slug));
    }
  });

  it("refreshes /rss.xml to the deprecations feed", () => {
    const html = feedRedirectHtml("https://sunsetdiff.com");
    expect(html).toContain('rel="canonical" href="https://sunsetdiff.com/feed.xml"');
    expect(html).toContain('http-equiv="refresh" content="0; url=/feed.xml"');
    expect(html).toContain("sunsetdiff-provider-shortcut");
    expect(html).not.toMatch(/[—–]/);
  });
});
