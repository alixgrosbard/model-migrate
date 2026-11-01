import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guideGraph, guidesIndexGraph } from "../src/jsonld.ts";
import {
  DECEMBER_11_GUIDE_SLUG,
  DECEMBER_11_SHUTDOWN_DATE,
  JANUARY_2027_GPT4_GUIDE_SLUG,
  JANUARY_2027_SHUTDOWN_DATE,
  isDecember11OpenAiShutdown,
  isJanuary2027Gpt4Shutdown,
} from "../src/lib/dataset-guides.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guideChecked, guidePath, guides, guidesForModel } from "../src/lib/guides.ts";
import { loadModels } from "../src/lib/load.ts";
import { publishedReplacementIds } from "../src/lib/shutdowns.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { contentAliasFiles } from "../src/lib/shortcuts.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";

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
  "docs.pipecat.ai",
  "openrouter.ai",
  "sunsetdiff.com",
  "creativecommons.org",
  "huggingface.co",
  "help.openai.com",
  "learn.chatgpt.com",
  "github.com",
  "build.nvidia.com",
  "docs.nvidia.com",
  "docs.api.nvidia.com",
  "integrate.api.nvidia.com",
  "api-docs.deepseek.com",
  "deepseek.com",
  "console.groq.com",
  "platform.minimax.io",
  "docs.github.com",
  "github.blog",
  "docs.fireworks.ai",
  "docs.tokenfactory.nebius.com",
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

  it("sources the Responses API function-calling guide from the official pages", () => {
    const guide = guides.find((item) => item.slug === "move-function-calling-to-responses-api");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guideChecked(guide)).toBe("2026-10-25");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Function tools with reasoning_effort are not supported for gpt-6.1-sol in /v1/chat/completions");
    expect(blob).toContain("function_call_output");
    expect(blob).toContain("response.function_call_arguments.delta");
    expect(blob).toContain("https://developers.openai.com/api/docs/guides/migrate-to-responses");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-6.1-sol");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-6-astra");
    expect(blob).toContain("https://docs.litellm.ai/docs/providers/openai");
    expect(blob).toContain("https://ai-sdk.dev/docs/guides/openai");
    expect(blob).toContain("https://docs.langchain.com/oss/python/integrations/chat/openai");
    expect(blob).toContain("https://docs.pipecat.ai/api-reference/server/services/llm/openai-responses");
    expect(blob).toContain("/errors/gpt-6-1-sol-function-tools-chat-completions/");
    expect(blob).toContain("use_responses_api=True");
    expect(blob).not.toContain('reasoning_effort="none"');
  });

  it("sources the Codex ChatGPT sign-in retirement from the Codex models page and changelog", () => {
    const guide = guides.find((item) => item.slug === "codex-chatgpt-sign-in-model-retirements");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guideChecked(guide)).toBe("2026-10-26");
    expect(guidePath(guide.slug)).toBe("/guides/codex-chatgpt-sign-in-model-retirements/");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Effective October 14, 2026, at noon PDT (19:00 UTC), GPT-5.5 retires from Codex for users signed in with ChatGPT.");
    expect(blob).toContain("The OpenAI API and Codex sessions authenticated with an API key aren't affected.");
    expect(blob).toContain("On October 14, 2026, GPT-5.5 will retire from ChatGPT, ChatGPT Work, and Codex on all plans");
    expect(blob).toContain("This retirement does not apply to the OpenAI API.");
    expect(blob).toContain("gpt-6.1-sol");
    expect(blob).toContain("gpt-6-luna");
    expect(blob).toContain('model = \\"gpt-6.1-sol\\"');
    expect(blob).toContain("codex --model gpt-6.1-sol");
    expect(blob).toContain("/models/openai/gpt-5-5/");
    expect(blob).toContain("/models/openai/gpt-6-1-sol/");
    expect(blob).toContain("/models/openai/gpt-6-luna/");
    expect(blob).toContain("https://developers.openai.com/codex/models");
    expect(blob).toContain("https://developers.openai.com/codex/changelog#codex-2026-10-14-gpt-55-retirement");
    expect(blob).toContain("https://developers.openai.com/codex/changelog#codex-2026-09-14-gpt-55-retirement");
    expect(blob).toContain("August 31, 2026");
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
  });

  it("sources the retired-model check from official error pages and the lookup API", () => {
    const guide = guides.find((item) => item.slug === "catch-a-retired-model-before-your-users-do");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guideChecked(guide)).toBe("2026-10-29");
    expect(guidePath(guide.slug)).toBe("/guides/catch-a-retired-model-before-your-users-do/");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("https://github.com/AlejandroFuentePinero/digital-twin/issues/54");
    expect(blob).toContain("https://github.com/AlejandroFuentePinero/digital-twin/issues/57");
    expect(blob).toContain("https://github.com/bobmatnyc/joanies-kitchen/issues/24");
    expect(blob).toContain("https://github.com/ahaqqu/RumaQ/issues/306");
    expect(blob).toContain("https://github.com/Ghigog/Juice/issues/421");
    expect(blob).toContain("encodeURIComponent");
    expect(blob).toContain("urllib.parse.quote");
    expect(blob).toContain("shutdown_date_kind");
    expect(blob).toContain("/api/v1/lookup/");
    expect(blob).toContain("/github-action/");
    expect(blob).toContain("not_found_error");
    expect(blob).toContain("The requested resource could not be found.");
    expect(blob).toContain("the endpoint is no longer available");
    expect(blob).toContain("does not print a code named model_decommissioned");
    expect(blob).toContain("no longer available on OpenRouter");
    expect(blob).toContain("https://console.groq.com/docs/errors");
    expect(blob).toContain("https://openrouter.ai/docs/api_reference/errors-and-debugging");
    expect(blob).toContain("https://platform.claude.com/docs/en/api/errors");
    const node = guide.sections.flatMap((section) => section.codes ?? []).find((sample) => sample.caption === "Node");
    expect(node?.code).toContain("encodeURIComponent(modelId)");
    expect(node?.code).not.toContain("\\`");
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "BreadcrumbList" || node["@type"] === "Article")).toBe(true);
  });

  it("builds the OpenAI shutdown guides from the dataset", async () => {
    const models = await loadModels();
    const decemberRows = models.filter(isDecember11OpenAiShutdown).sort((a, b) => a.id.localeCompare(b.id));
    const januaryRows = models.filter(isJanuary2027Gpt4Shutdown).sort((a, b) => a.id.localeCompare(b.id));
    expect(decemberRows.length).toBeGreaterThan(0);
    expect(januaryRows.length).toBeGreaterThan(0);
    expect(new Set(decemberRows.map((model) => model.shutdown_date))).toEqual(new Set([DECEMBER_11_SHUTDOWN_DATE]));
    expect(new Set(januaryRows.map((model) => model.shutdown_date))).toEqual(new Set([JANUARY_2027_SHUTDOWN_DATE]));

    const december = guides.find((guide) => guide.slug === DECEMBER_11_GUIDE_SLUG);
    const january = guides.find((guide) => guide.slug === JANUARY_2027_GPT4_GUIDE_SLUG);
    expect(december).toBeTruthy();
    expect(january).toBeTruthy();
    if (!december || !january) return;

    expect(guidePath(december.slug)).toBe("/guides/openai-december-11-2026-shutdowns/");
    expect(guidePath(january.slug)).toBe("/guides/openai-gpt-4-1-gpt-4o-shutdown-january-2027/");
    expect(december.h1).toContain("December 11, 2026");
    expect(january.h1).toContain("January 14, 2027");

    const decemberTable = december.sections.find((section) => section.table)?.table;
    const januaryTable = january.sections.find((section) => section.table)?.table;
    expect(decemberTable?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(januaryTable?.headers).toEqual(decemberTable?.headers);
    expect(decemberTable?.rows.map((row) => row[0])).toEqual(
      decemberRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(januaryTable?.rows.map((row) => row[0])).toEqual(
      januaryRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );

    for (const [guide, rows] of [[december, decemberRows], [january, januaryRows]] as const) {
      const table = guide.sections.find((section) => section.table)?.table;
      expect(table?.rows.length).toBe(rows.length);
      rows.forEach((model, index) => {
        const row = table?.rows[index];
        expect(row?.[1]).toBe(model.deprecation_date ?? "Not published");
        expect(row?.[2]).toContain(model.shutdown_date);
        const replacements = publishedReplacementIds(model);
        if (!replacements.length) expect(row?.[3]).toBe("Not published");
        for (const id of replacements) expect(row?.[3]).toContain(id);
      });
      const pageFacts = JSON.stringify({
        answer: guide.answer,
        steps: guide.steps,
        sections: guide.sections,
      });
      for (const faq of guide.faqs) {
        for (const date of faq.answer.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
          expect(pageFacts).toContain(date);
        }
        for (const id of rows.map((model) => model.id)) {
          if (faq.answer.includes(id)) expect(pageFacts).toContain(id);
        }
      }
      const graph = guideGraph("https://sunsetdiff.com/", guide);
      expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
      expect(guide.sections.some((section) => section.heading === "What breaks")).toBe(true);
      expect(guide.sections.some((section) => section.heading === "Find the model ids in your code")).toBe(true);
      expect(guide.sections.some((section) => section.heading === "Test the replacement before the cutoff")).toBe(true);
    }

    expect(JSON.stringify(january)).toContain("the alias itself is not listed by name");
    expect(JSON.stringify(january)).toContain("Fine-tuned versions of these models follow the same shutdown schedule as their underlying base models.");
    expect(JSON.stringify(december)).toContain("no longer be accessible");
    expect(JSON.stringify(december)).not.toContain("HTTP 404");
    expect(januaryRows.map((model) => model.id)).toEqual(expect.arrayContaining([
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o-2024-08-06",
      "gpt-4o-2024-11-20",
      "gpt-4o-mini-2024-07-18",
      "gpt-4.1-2025-04-14",
      "gpt-4.1-mini-2025-04-14",
    ]));
    expect(januaryRows.map((model) => model.id)).not.toContain("gpt-4o-2024-05-13");

    const gpt4o = models.find((model) => model.id === "gpt-4o")!;
    const gpt5 = models.find((model) => model.id === "gpt-5")!;
    expect(guidesForModel(gpt4o, models).map((link) => link.href)).toContain(`/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`);
    expect(guidesForModel(gpt5, models).map((link) => link.href)).toContain(`/guides/${DECEMBER_11_GUIDE_SLUG}/`);
    expect(guidesForModel(gpt4o, models).map((link) => link.href)).toContain("/guides/model-aliases-vs-pinned-snapshots/");
  });

  it("builds the MiniMax November 18 guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "minimax" && model.shutdown_date === "2026-11-18")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
    ]);
    expect(rows.every((model) => model.status === "deprecated")).toBe(true);
    const guide = guides.find((item) => item.slug === "minimax-m2-5-m2-7-shutdown-november-18-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/minimax-m2-5-m2-7-shutdown-november-18-2026/");
    expect(guideChecked(guide)).toBe("2026-10-31");
    expect(guide.h1).toContain("November 18, 2026");
    const table = guide.sections.find((section) => section.table)?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.every((row) => row[3].includes("MiniMax-M3.1-Flash"))).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Once retired, API requests to these models will no longer work.");
    expect(blob).toContain("automatically be routed to M3.1 Flash");
    expect(blob).toContain("requires adaptive thinking");
    expect(blob).toContain("https://platform.minimax.io/docs/faq/models");
    expect(blob).toContain("https://platform.minimax.io/docs/guides/text-generation");
    expect(blob).toContain("/shutdowns/minimax-2026-11-18/");
    expect(blob).toContain("/providers/minimax/");
    expect(blob).not.toContain("HTTP 410");
    const retired = models.filter((model) => model.provider === "minimax" && model.status === "retired");
    expect(retired.some((model) => model.id === "MiniMax-M2")).toBe(true);
    expect(retired.some((model) => model.shutdown_date === "2026-11-18")).toBe(false);
    expect(guidesForModel(rows[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
  });

  it("builds the Bedrock November 13 guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "aws-bedrock" && model.shutdown_date === "2026-11-13")
      .sort((a, b) => a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug));
    expect(rows.map((model) => model.id)).toEqual([
      "anthropic.claude-3-5-sonnet-20240620-v1:0",
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "anthropic.claude-3-7-sonnet-20250219-v1:0",
      "anthropic.claude-3-haiku-20240307-v1:0",
      "anthropic.claude-3-sonnet-20240229-v1:0",
    ]);
    const guide = guides.find((item) => item.slug === "amazon-bedrock-claude-3-shutdown-november-13-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/amazon-bedrock-claude-3-shutdown-november-13-2026/");
    expect(guideChecked(guide)).toBe("2026-10-31");
    expect(guide.h1).toContain("November 13, 2026");
    const table = guide.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(table?.headers).toEqual(["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.every((row) => row[2] === "2026-11-13")).toBe(true);
    expect(table?.rows.every((row) => row[4] === "Not published")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("us.anthropic.claude-3-haiku-20240307-v1:0");
    expect(blob).toContain("eu.anthropic.claude-3-haiku-20240307-v1:0");
    expect(blob).toContain("global.anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(blob).toContain("ResourceNotFoundException: This model version has reached the end of its life.");
    expect(blob).toContain("Since BedrockClassifier is the orchestrator's default classifier, a default setup in us-east-1 fails.");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html");
    expect(blob).toContain("https://github.com/2FastLabs/agent-squad/issues/721");
    expect(blob).toContain("/errors/bedrock-model-version-has-reached-the-end-of-its-life/");
    expect(blob).toContain("/errors/claude-temperature-is-deprecated-for-this-model/");
    expect(blob).toContain("/errors/claude-api-2026-10-21-sampling-params-400/");
    expect(blob).toContain("/shutdowns/aws-bedrock-2026-11-13/");
    expect(blob).not.toContain("global.anthropic.claude-haiku-4-5");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    const earlier = models.find((model) => model.slug === "anthropic-claude-3-haiku-20240307-v1-0-2");
    expect(earlier?.shutdown_date).toBe("2026-09-10");
    expect(guidesForModel(rows[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    expect(guidesForModel(earlier!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/amazon-bedrock-claude-3-shutdown-november-13-2026/");
    expect(shutdownPage).toContain("amazon-bedrock-claude-3-shutdown-november-13-2026");
  });

  it("builds the Azure OpenAI November 19 guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "azure-openai" && model.shutdown_date === "2026-11-19")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "o1-2024-12-17",
      "o1-pro-2025-03-19",
      "o3-2025-04-16",
      "o3-deep-research-2025-06-26",
      "o3-mini-2025-01-31",
      "o3-pro-2025-06-10",
      "o4-mini-2025-04-16",
    ]);
    const guide = guides.find((item) => item.slug === "azure-openai-o-series-retirement-november-19-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/azure-openai-o-series-retirement-november-19-2026/");
    expect(guideChecked(guide)).toBe("2026-10-31");
    expect(guide.h1).toContain("November 19, 2026");
    const table = guide.sections.find((section) => section.heading === "Models retiring on November 19")?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.map((row) => row[3])).toEqual([
      "[gpt-5.6-sol](/models/azure-openai/gpt-5-6-sol/)",
      "[gpt-5.6-sol](/models/azure-openai/gpt-5-6-sol/)",
      "[gpt-5.6-sol](/models/azure-openai/gpt-5-6-sol/)",
      "[gpt-5.6-sol](/models/azure-openai/gpt-5-6-sol/)",
      "[gpt-5.6-terra](/models/azure-openai/gpt-5-6-terra/)",
      "[gpt-5.6-sol](/models/azure-openai/gpt-5-6-sol/)",
      "[gpt-5.6-terra](/models/azure-openai/gpt-5-6-terra/)",
    ]);
    const nearby = guide.sections.find((section) => section.heading.startsWith("codex-mini"))?.table;
    expect(nearby?.rows.map((row) => row[2])).toEqual(["2026-11-15", "2026-11-17", "2026-11-17"]);
    expect(nearby?.rows.every((row) => row[3] === "Not published")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("All inference requests return 410 Gone.");
    expect(blob).toContain("Provisioned deployments are NOT auto-upgraded.");
    expect(blob).toContain("The model deployment never automatically upgrades.");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models");
    expect(blob).toContain("/errors/azure-openai-retired-model-410-gone/");
    expect(blob).toContain("/shutdowns/azure-openai-2026-11-19/");
    expect(blob).toContain("2027-11-19");
    expect(blob).toContain("2027-10-16");
    expect(blob).not.toContain("2027-05-191");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const codex = models.find((model) => model.id === "codex-mini-2025-05-16" && model.provider === "azure-openai");
    expect(guidesForModel(codex!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/azure-openai-o-series-retirement-november-19-2026/");
    expect(shutdownPage).toContain("azure-openai-o-series-retirement-november-19-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    expect(text).toContain("/guides/azure-openai-o-series-retirement-november-19-2026/");
  });

  it("builds the GitHub Copilot November 16 guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "github-copilot" && model.shutdown_date === "2026-11-16")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual(["Claude Opus 4.8", "Claude Opus 5", "GPT-5.6 Terra"]);
    const guide = guides.find((item) => item.slug === "github-copilot-model-retirements-november-16-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/github-copilot-model-retirements-november-16-2026/");
    expect(guideChecked(guide)).toBe("2026-10-31");
    expect(guide.h1).toContain("November 16, 2026");
    const table = guide.sections.find((section) => section.heading === "Models retiring")?.table;
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.map((row) => row[3])).toEqual([
      "[Claude Opus 5.5](/models/github-copilot/claude-opus-5-5/)",
      "[Claude Opus 5.5](/models/github-copilot/claude-opus-5-5/)",
      "[GPT-6.1 Sol](/models/github-copilot/gpt-6-1-sol/), [GPT-6 Luna](/models/github-copilot/gpt-6-luna/)",
    ]);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("on November 16th, 2026");
    expect(blob).toContain("does not apply to these customers");
    expect(blob).toContain("Copilot Chat model selector");
    expect(blob).toContain("Change Completions Model");
    expect(blob).toContain(".github/allowed_models.txt");
    expect(blob).toContain("https://github.blog/changelog/2026-10-15-upcoming-deprecation-of-selected-github-copilot-models-in-mid-november");
    expect(blob).toContain("https://docs.github.com/en/copilot/reference/ai-models/supported-models");
    expect(blob).toContain("/shutdowns/github-copilot-2026-11-16/");
    expect(blob).toContain("/providers/github-copilot/");
    expect(blob).toContain("retirement history table does not");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/github-copilot-model-retirements-november-16-2026/");
    expect(shutdownPage).toContain("github-copilot-model-retirements-november-16-2026");
  });

  it("builds the November 7, 9, and 17 shutdown guides from the dataset", async () => {
    const models = await loadModels();
    const fireworksRows = models
      .filter((model) => model.provider === "fireworks" && model.shutdown_date === "2026-11-07")
      .sort((a, b) => a.id.localeCompare(b.id));
    const nebiusRows = models
      .filter((model) => model.provider === "nebius" && model.shutdown_date === "2026-11-09")
      .sort((a, b) => a.id.localeCompare(b.id));
    const geminiRows = models
      .filter((model) => model.provider === "google-gemini-api" && model.shutdown_date === "2026-11-17")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(fireworksRows.map((model) => model.id)).toEqual([
      "accounts/fireworks/models/gpt-oss-120b",
      "accounts/fireworks/models/nemotron-3-ultra-nvfp4",
      "accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b",
      "accounts/fireworks/routers/glm-5p3-flash-us",
    ]);
    expect(nebiusRows).toHaveLength(11);
    expect(geminiRows.map((model) => model.id)).toEqual([
      "gemini-2.5-flash-native-audio-preview-12-2025",
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro-preview-tts",
      "gemini-3.1-flash-live-preview",
      "gemini-3.1-flash-tts-preview",
    ]);

    const fireworks = guides.find((guide) => guide.slug === "fireworks-model-shutdowns-november-7-2026");
    const nebius = guides.find((guide) => guide.slug === "nebius-model-shutdowns-november-9-2026");
    const gemini = guides.find((guide) => guide.slug === "gemini-api-model-shutdowns-november-17-2026");
    expect(fireworks && nebius && gemini).toBeTruthy();
    if (!fireworks || !nebius || !gemini) return;

    expect(guidePath(fireworks.slug)).toBe("/guides/fireworks-model-shutdowns-november-7-2026/");
    expect(guidePath(nebius.slug)).toBe("/guides/nebius-model-shutdowns-november-9-2026/");
    expect(guidePath(gemini.slug)).toBe("/guides/gemini-api-model-shutdowns-november-17-2026/");
    expect(guideChecked(fireworks)).toBe("2026-11-01");
    expect(guideChecked(nebius)).toBe("2026-11-01");
    expect(guideChecked(gemini)).toBe("2026-11-01");

    const fireworksTable = fireworks.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(fireworksTable?.rows.map((row) => row[0])).toEqual(
      fireworksRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(fireworksTable?.rows.filter((row) => row[3] === "Not published")).toHaveLength(3);
    expect(fireworksTable?.rows.some((row) => row[3].includes("accounts/fireworks/routers/deepseek-v4p1-flash-1017-us"))).toBe(true);

    const nebiusTable = nebius.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(nebiusTable?.rows).toHaveLength(nebiusRows.length);
    expect(nebiusTable?.rows.every((row) => row[3] !== "Not published")).toBe(true);
    const chain = nebius.sections.find((section) => section.heading.startsWith("August replacements"))?.table;
    expect(chain?.rows.map((row) => row[0])).toEqual([
      "[deepseek-ai/DeepSeek-V4-Flash](/models/nebius/deepseek-ai-deepseek-v4-flash/)",
      "[nvidia/Llama-3_1-Nemotron-Ultra-253B-v1](/models/nebius/nvidia-llama-3-1-nemotron-ultra-253b-v1/)",
      "[Qwen/Qwen3-Next-80B-A3B-Thinking](/models/nebius/qwen-qwen3-next-80b-a3b-thinking/)",
    ]);

    const geminiTable = gemini.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(geminiTable?.rows.map((row) => row[0])).toEqual(
      geminiRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(geminiTable?.rows.every((row) => row[3].includes("gemini-3.8-"))).toBe(true);

    for (const guide of [fireworks, nebius, gemini]) {
      expect(guide.faqs.length).toBeGreaterThan(0);
      expect(guideGraph("https://sunsetdiff.com/", guide).some((node) => node["@type"] === "FAQPage")).toBe(true);
      expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
      expect(JSON.stringify(guide)).not.toMatch(/[—–]/);
    }
    const fireworksBlob = JSON.stringify(fireworks);
    expect(fireworksBlob).toContain("Dedicated deployments and Reserved Throughput are unaffected.");
    expect(fireworksBlob).toContain("https://docs.fireworks.ai/updates/changelog");
    expect(fireworksBlob).toContain("/shutdowns/fireworks-2026-11-07/");
    expect(fireworksBlob).not.toContain("accounts/fireworks/models/nvidia-nemotron-3p5-super-vl");
    const nebiusBlob = JSON.stringify(nebius);
    expect(nebiusBlob).toContain("Token Factory does not automatically reroute requests from deprecated models.");
    expect(nebiusBlob).toContain("https://docs.tokenfactory.nebius.com/model-deprecations-november-2026");
    expect(nebiusBlob).toContain("/shutdowns/nebius-2026-11-09/");
    const geminiBlob = JSON.stringify(gemini);
    expect(geminiBlob).toContain("earliest possible dates");
    expect(geminiBlob).toContain("completely turned off, and the endpoint is no longer available.");
    expect(geminiBlob).toContain("https://ai.google.dev/gemini-api/docs/deprecations");
    expect(geminiBlob).toContain("https://ai.google.dev/gemini-api/docs/speech-generation");
    expect(geminiBlob).toContain("/shutdowns/google-gemini-api-2026-11-17/");
    expect(geminiBlob).toContain("veo-3.1-generate-001");

    expect(guidesForModel(fireworksRows[0], models).map((link) => link.href)).toContain(guidePath(fireworks.slug));
    expect(guidesForModel(nebiusRows[0], models).map((link) => link.href)).toContain(guidePath(nebius.slug));
    expect(guidesForModel(geminiRows[0], models).map((link) => link.href)).toContain(guidePath(gemini.slug));

    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/fireworks-model-shutdowns-november-7-2026/");
    expect(providerPage).toContain("/guides/nebius-model-shutdowns-november-9-2026/");
    expect(providerPage).toContain("/guides/gemini-api-model-shutdowns-november-17-2026/");
    expect(shutdownPage).toContain("fireworks-model-shutdowns-november-7-2026");
    expect(shutdownPage).toContain("nebius-model-shutdowns-november-9-2026");
    expect(shutdownPage).toContain("gemini-api-model-shutdowns-november-17-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    expect(text).toContain("/guides/fireworks-model-shutdowns-november-7-2026/");
    expect(text).toContain("/guides/nebius-model-shutdowns-november-9-2026/");
    expect(text).toContain("/guides/gemini-api-model-shutdowns-november-17-2026/");
  });
});
