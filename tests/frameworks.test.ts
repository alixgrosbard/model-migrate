import { describe, expect, it } from "vitest";
import { frameworkGraph, frameworksIndexGraph } from "../src/jsonld.ts";
import { today } from "../src/lib/format.ts";
import {
  FRAMEWORKS_CHECKED,
  FRAMEWORKS_INDEX,
  frameworkChatShutdowns,
  frameworkPath,
  frameworkSharedFaqs,
  frameworkShutdownLead,
  frameworks,
} from "../src/lib/frameworks.ts";
import { guideBySlug } from "../src/lib/guides.ts";
import { integrationLinks } from "../src/lib/integrations.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { loadModels } from "../src/lib/load.ts";

const ALLOWED_HOSTS = new Set([
  "developers.openai.com",
  "learn.microsoft.com",
  "docs.litellm.ai",
  "ai-sdk.dev",
  "docs.langchain.com",
  "developers.llamaindex.ai",
  "openrouter.ai",
  "docs.pipecat.ai",
  "docs.n8n.io",
  "docs.langflow.org",
]);

describe("framework pages", () => {
  it("lists eight sourced pages and wires them into llms, lastmod, and JSON-LD", () => {
    expect(frameworks.map((page) => page.slug)).toEqual([
      "langchain",
      "litellm",
      "vercel-ai-sdk",
      "llamaindex",
      "openrouter",
      "pipecat",
      "n8n",
      "langflow",
    ]);
    const blob = JSON.stringify(frameworks);
    expect(blob.includes("—")).toBe(false);
    expect(blob.includes("–")).toBe(false);
    expect(blob.includes("2027-01-14")).toBe(false);
    expect(blob.toLowerCase().includes("alix")).toBe(false);
    expect(blob.includes("sk-")).toBe(false);
    expect(blob.includes("api_key")).toBe(false);
    expect(blob.includes("Bearer")).toBe(false);

    for (const page of frameworks) {
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(160);
      expect(page.steps.length).toBeGreaterThanOrEqual(4);
      expect(page.faqs.length).toBeGreaterThan(0);
      expect(page.citations.length).toBeGreaterThan(0);
      const headings = page.sections.map((section) => section.heading);
      expect(headings).toContain("Where the model id lives");
      expect(headings).toContain("How to pin or swap it");
      expect(headings).toContain("GPT-6 function tools");
      for (const citation of page.citations) {
        const url = new URL(citation);
        expect(url.protocol).toBe("https:");
        expect(ALLOWED_HOSTS.has(url.hostname)).toBe(true);
      }
      for (const section of page.sections) {
        expect(section.sources.length).toBeGreaterThan(0);
        for (const source of section.sources) {
          expect(page.citations).toContain(source.url);
        }
      }
      const graph = frameworkGraph("https://sunsetdiff.com/", page, [...page.faqs, ...frameworkSharedFaqs]);
      expect(graph.some((node) => node["@type"] === "Article")).toBe(true);
      expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
      expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
      const article = graph.find((node) => node["@type"] === "Article") as { dateModified?: string; citation?: string[] };
      expect(article.dateModified).toBe(FRAMEWORKS_CHECKED);
      expect(article.citation).toEqual(page.citations);
      expect(lastmodForUrl(`https://sunsetdiff.com${frameworkPath(page.slug)}`)).toBe(FRAMEWORKS_CHECKED);
    }

    expect(lastmodForUrl("https://sunsetdiff.com/frameworks/")).toBe(FRAMEWORKS_CHECKED);
    const hub = frameworksIndexGraph(
      "https://sunsetdiff.com/",
      frameworks.map((page) => ({ name: page.h1, path: frameworkPath(page.slug) })),
      [],
    );
    expect(hub.some((node) => node["@type"] === "CollectionPage")).toBe(true);
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain(FRAMEWORKS_INDEX);
    expect(full).toContain(FRAMEWORKS_INDEX);
    for (const page of frameworks) {
      expect(text).toContain(frameworkPath(page.slug));
      expect(full).toContain(frameworkPath(page.slug));
    }
  });

  it("builds the shutdown sentence from model records", async () => {
    const models = await loadModels();
    const rows = frameworkChatShutdowns(models, today());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.provider).toBe("openai");
      expect(row.shutdown_date).toBeTruthy();
      const source = models.find((model) => model.provider === row.provider && model.id === row.id);
      expect(source?.shutdown_date).toBe(row.shutdown_date);
    }
    const lead = frameworkShutdownLead(rows);
    expect(lead).toContain(rows[0].shutdown_date ?? "");
    expect(lead).toContain(rows[0].id);
    const staticCopy = JSON.stringify(frameworks);
    expect(staticCopy.includes(rows[0].shutdown_date ?? "missing-date")).toBe(false);
  });

  it("links the swap guide and the integrations page at the framework hub", () => {
    const guide = guideBySlug("swap-a-deprecated-model");
    expect(guide?.related.map((link) => link.href)).toEqual(expect.arrayContaining(frameworks.map((page) => frameworkPath(page.slug))));
    expect(guide?.answer).toContain("/frameworks/");
    expect(integrationLinks().map((link) => link.href)).toContain("/frameworks/");
    const tools = guideBySlug("move-function-calling-to-responses-api");
    expect(tools?.related.map((link) => link.href)).toContain("/frameworks/");
  });
});
