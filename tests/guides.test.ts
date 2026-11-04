import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guideGraph, guidesIndexGraph } from "../src/jsonld.ts";
import {
  DECEMBER_11_GUIDE_SLUG,
  DECEMBER_11_SHUTDOWN_DATE,
  DECEMBER_1_IMAGE_GUIDE_SLUG,
  DECEMBER_1_IMAGE_SHUTDOWN_DATE,
  APRIL_1_2027_CHECKED,
  APRIL_1_2027_GUIDE_SLUG,
  APRIL_1_2027_SHUTDOWN_DATE,
  FEBRUARY_26_TRANSCRIBE_CHECKED,
  FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG,
  FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE,
  JANUARY_2027_AUDIO_GUIDE_SLUG,
  JANUARY_2027_GPT4_GUIDE_SLUG,
  JANUARY_2027_SHUTDOWN_DATE,
  JANUARY_20_AUDIO_SHUTDOWN_DATE,
  JANUARY_6_TTS_SHUTDOWN_DATE,
  isApril2027Gpt51CodexNanoShutdown,
  isDecember11OpenAiShutdown,
  isDecember1ImageShutdown,
  isFebruary2027TranscribeShutdown,
  isJanuary2027AudioShutdown,
  isJanuary2027Gpt4Shutdown,
} from "../src/lib/dataset-guides.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guideChecked, guidePath, guides, guidesForModel } from "../src/lib/guides.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { batchDocumentTitle, providerDisplayName, publishedReplacementIds, shutdownEvents } from "../src/lib/shutdowns.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { contentAliasFiles } from "../src/lib/shortcuts.ts";
import { sitemapSection } from "../src/lib/sitemaps.ts";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// last_checked is the UTC day the scraper last wrote that source. It moves
// forward on the next refresh. The floor is the day the guide was built.
function expectSourceChecked(day: string | undefined, floor: string) {
  expect(day).toMatch(ISO_DAY);
  expect((day ?? "") >= floor).toBe(true);
}

const ALLOWED_HOSTS = new Set([
  "developers.openai.com",
  "platform.claude.com",
  "ai.google.dev",
  "aistudio.google.com",
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

  it("builds the December 1 image guide and the January 2027 audio guide from the dataset", async () => {
    const models = await loadModels();
    const imageRows = models.filter(isDecember1ImageShutdown).sort((a, b) => a.id.localeCompare(b.id));
    const audioRows = models.filter(isJanuary2027AudioShutdown).sort((a, b) => a.id.localeCompare(b.id));
    const speechRows = audioRows.filter((model) => model.shutdown_date === JANUARY_6_TTS_SHUTDOWN_DATE);
    const laterRows = audioRows.filter((model) => model.shutdown_date === JANUARY_20_AUDIO_SHUTDOWN_DATE);
    expect(imageRows.map((model) => model.id)).toEqual([
      "chatgpt-image-latest",
      "gpt-image-1-mini",
      "gpt-image-1.5",
      "gpt-image-1.5-2025-12-16",
    ]);
    expect(speechRows.map((model) => model.id)).toEqual([
      "gpt-4o-mini-tts",
      "gpt-4o-mini-tts-2025-03-20",
      "gpt-4o-mini-tts-2025-12-15",
      "tts-1",
      "tts-1-hd",
    ]);
    expect(laterRows.map((model) => model.id)).toEqual([
      "gpt-4o-audio",
      "gpt-4o-mini-audio",
      "gpt-4o-mini-realtime",
      "gpt-4o-mini-transcribe-2025-03-20",
      "gpt-4o-realtime",
      "gpt-audio",
      "gpt-audio-2025-08-28",
      "gpt-audio-mini",
      "gpt-audio-mini-2025-12-15",
      "gpt-realtime",
      "gpt-realtime-2025-08-28",
      "gpt-realtime-mini",
      "gpt-realtime-mini-2025-12-15",
    ]);
    expect(new Set(imageRows.map((model) => model.shutdown_date))).toEqual(new Set([DECEMBER_1_IMAGE_SHUTDOWN_DATE]));

    const image = guides.find((guide) => guide.slug === DECEMBER_1_IMAGE_GUIDE_SLUG);
    const audio = guides.find((guide) => guide.slug === JANUARY_2027_AUDIO_GUIDE_SLUG);
    expect(image).toBeTruthy();
    expect(audio).toBeTruthy();
    if (!image || !audio) return;

    expect(guidePath(image.slug)).toBe("/guides/openai-image-model-shutdown-december-1-2026/");
    expect(guidePath(audio.slug)).toBe("/guides/openai-audio-realtime-tts-shutdowns-january-2027/");
    expect(image.h1).toContain("December 1, 2026");
    expect(audio.h1).toContain("January 2027");
    expect(sitemapSection(guidePath(image.slug))).toBe("sitemap-guides.xml");
    expect(sitemapSection(guidePath(audio.slug))).toBe("sitemap-guides.xml");

    const imageTable = image.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(imageTable?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(imageTable?.rows.map((row) => row[0])).toEqual(
      imageRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    const speechTable = audio.sections.find((section) => section.heading === "Speech models shutting down on January 6, 2027")?.table;
    const laterTable = audio.sections.find((section) => section.heading === "Audio and realtime models shutting down on January 20, 2027")?.table;
    expect(speechTable?.rows.map((row) => row[0])).toEqual(
      speechRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(laterTable?.rows.map((row) => row[0])).toEqual(
      laterRows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );

    for (const model of imageRows) {
      expect(publishedReplacementIds(model)).toEqual(["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]);
      expect(imageTable?.rows.find((row) => row[0].includes(model.id))?.[3]).toContain("gpt-image-2.5-sunburst");
      expect(imageTable?.rows.find((row) => row[0].includes(model.id))?.[3]).toContain("gpt-image-2.5-flare");
    }
    for (const model of speechRows) {
      expect(publishedReplacementIds(model)).toEqual(["gpt-realtime-2.1-mini"]);
    }

    const imageBlob = JSON.stringify(image);
    const audioBlob = JSON.stringify(audio);
    expect(imageBlob).toContain("gpt-image-2.5-sunburst or gpt-image-2.5-flare");
    expect(imageBlob).toContain("Choose Sunburst for workflows where editing precision matters most, and Flare for fast, high-quality everyday image generation.");
    expect(imageBlob).toContain("Earlier GPT Image models support quality settings up to high.");
    expect(imageBlob).toContain("https://developers.openai.com/api/docs/deprecations");
    expect(imageBlob).toContain("https://developers.openai.com/api/docs/guides/image-generation");
    expect(imageBlob).toContain("/api/v1/lookup/gpt-image-1.5.json");
    expect(imageBlob).toContain("/alerts/");
    expect(imageBlob).toContain("2026-10-23");
    expect(imageBlob).not.toContain("gpt-image-1-mini, gpt-image-1,");
    expect(audioBlob).toContain("isn't a supported model for /v1/audio/speech");
    expect(audioBlob).toContain("Migrate to gpt-realtime-2.1-mini before the shutdown date.");
    expect(audioBlob).toContain("https://developers.openai.com/api/docs/guides/text-to-speech");
    expect(audioBlob).toContain("https://developers.openai.com/api/docs/models/gpt-audio-1.5");
    expect(audioBlob).toContain("https://developers.openai.com/api/docs/models/gpt-realtime-2.1");
    expect(audioBlob).toContain("languages replaces the singular language field");
    expect(audioBlob).toContain("/api/v1/lookup/tts-1.json");
    expect(audioBlob).toContain("/alerts/");
    expect(audioBlob).toContain("2027-02-26");
    expect(audioBlob).toContain("2026-07-23");
    expect(audio.sections.some((section) => section.heading === "What breaks")).toBe(true);
    expect(audio.sections.some((section) => section.heading === "Find the model ids in your code")).toBe(true);
    expect(image.sections.some((section) => section.heading === "What breaks")).toBe(true);
    expect(image.sections.some((section) => section.heading === "Find the model ids in your code")).toBe(true);

    const pageFacts = JSON.stringify({
      answer: audio.answer,
      steps: audio.steps,
      sections: audio.sections,
    });
    for (const faq of audio.faqs) {
      for (const date of faq.answer.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
        expect(pageFacts).toContain(date);
      }
    }

    const imageModel = models.find((model) => model.id === "chatgpt-image-latest")!;
    const speechModel = models.find((model) => model.id === "tts-1")!;
    const realtimeModel = models.find((model) => model.id === "gpt-4o-realtime")!;
    expect(guidesForModel(imageModel, models).map((link) => link.href)).toContain(`/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/`);
    expect(guidesForModel(speechModel, models).map((link) => link.href)).toContain(`/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`);
    expect(guidesForModel(realtimeModel, models).map((link) => link.href)).toContain(`/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`);
    expect(guidesForModel(speechModel, models).map((link) => link.href)).not.toContain(`/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`);

    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain(DECEMBER_1_IMAGE_GUIDE_SLUG);
    expect(providerPage).toContain(JANUARY_2027_AUDIO_GUIDE_SLUG);
    expect(shutdownPage).toContain(DECEMBER_1_IMAGE_GUIDE_SLUG);
    expect(shutdownPage).toContain(JANUARY_2027_AUDIO_GUIDE_SLUG);
    expect(llmsTxt("https://sunsetdiff.com", [], [])).toContain(guidePath(image.slug));
    expect(llmsFull("https://sunsetdiff.com", [])).toContain(guidePath(audio.slug));
    expect(audioBlob).toContain(`/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`);
  });

  it("builds the February 26, 2027 transcription guide from the dataset", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const rows = models.filter(isFebruary2027TranscribeShutdown).sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "gpt-4o-mini-transcribe",
      "gpt-4o-mini-transcribe-2025-12-15",
      "gpt-4o-transcribe",
      "gpt-4o-transcribe-diarize",
      "whisper-1",
    ]);
    expect(rows.every((model) => model.shutdown_date === FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE)).toBe(true);
    expect(rows.every((model) => model.announced_date === "2026-08-26")).toBe(true);
    expect(rows.every((model) => model.deprecation_date === null)).toBe(true);
    for (const model of rows) {
      expect(publishedReplacementIds(model)).toEqual(["gpt-live-transcribe", "gpt-transcribe"]);
    }

    const guide = guides.find((item) => item.slug === FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG);
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/openai-whisper-gpt-4o-transcribe-shutdown-february-26-2027/");
    expect(guideChecked(guide)).toBe(FEBRUARY_26_TRANSCRIBE_CHECKED);
    expect(guide.h1).toContain("February 26, 2027");
    expect(guide.h1).toContain("whisper-1");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");

    const table = guide.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    for (const row of table?.rows ?? []) {
      expect(row[3]).toContain("gpt-live-transcribe");
      expect(row[3]).toContain("gpt-transcribe");
    }

    const blob = JSON.stringify(guide);
    expect(blob).toContain("On August 26, 2026, we notified developers using whisper-1");
    expect(blob).toContain("will shut down on February 26, 2027");
    expect(blob).toContain("no longer be accessible");
    expect(blob).toContain("Start with gpt-transcribe");
    expect(blob).toContain("Start with gpt-live-transcribe");
    expect(blob).toContain("languages replaces the singular language field");
    expect(blob).toContain("v1/audio/transcriptions");
    expect(blob).toContain("v1/realtime/transcription_sessions");
    expect(blob).toContain("doesn't return word-level timestamps, speaker labels, or transcription confidence scores");
    expect(blob).toContain("timestamp_granularities[] parameter is only supported for whisper-1");
    expect(blob).toContain("gpt-realtime-translate");
    expect(blob).toContain("/v1/realtime/translations");
    expect(blob).toContain("$0.0045");
    expect(blob).toContain("$0.017");
    expect(blob).toContain("$0.006");
    expect(blob).toContain("$0.003");
    expect(blob).toContain("does not label that row whisper-1");
    expect(blob).toContain("https://developers.openai.com/api/docs/deprecations");
    expect(blob).toContain("https://developers.openai.com/api/docs/guides/speech-to-text");
    expect(blob).toContain("https://developers.openai.com/api/docs/guides/realtime-transcription");
    expect(blob).toContain("https://developers.openai.com/api/docs/pricing");
    expect(blob).toContain("/api/v1/lookup/whisper-1.json");
    expect(blob).toContain("/alerts/");
    expect(blob).toContain("/shutdowns/openai-2027-02-26/");
    expect(blob).not.toContain("HTTP 404");
    expect(guide.sections.some((section) => section.heading === "What breaks")).toBe(true);
    expect(guide.sections.some((section) => section.heading === "Find the model ids in your code")).toBe(true);
    expect(guide.faqs.length).toBeGreaterThanOrEqual(4);

    const pageFacts = JSON.stringify({
      answer: guide.answer,
      steps: guide.steps,
      sections: guide.sections,
    });
    for (const faq of guide.faqs) {
      for (const date of faq.answer.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
        expect(pageFacts).toContain(date);
      }
    }

    const whisper = models.find((model) => model.id === "whisper-1")!;
    const diarize = models.find((model) => model.id === "gpt-4o-transcribe-diarize")!;
    const live = models.find((model) => model.id === "gpt-live-transcribe")!;
    expect(guidesForModel(whisper, models).map((link) => link.href)).toContain(`/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`);
    expect(guidesForModel(diarize, models).map((link) => link.href)).toContain(`/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`);
    expect(guidesForModel(live, models).map((link) => link.href)).not.toContain(`/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`);

    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain(FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG);
    expect(shutdownPage).toContain(FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG);
    expect(llmsTxt("https://sunsetdiff.com", [], [])).toContain(guidePath(guide.slug));
    expect(llmsFull("https://sunsetdiff.com", [])).toContain(guidePath(guide.slug));

    const event = shutdownEvents(models).find((item) => item.slug === "openai-2027-02-26");
    expect(event).toBeTruthy();
    if (!event) return;
    expect(event.models.map((model) => model.id).sort()).toEqual(rows.map((model) => model.id));
    const name = providerDisplayName(providers, event.provider);
    const title = batchDocumentTitle(name, event, "2026-11-03");
    expect(event.models.some((model) => title.includes(model.id))).toBe(true);
    expect(title).toBe("gpt-4o-mini-transcribe and 4 more on OpenAI Feb 26, 2027");
  });

  it("builds the April 1, 2027 GPT-5.1, Codex, and nano guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models.filter(isApril2027Gpt51CodexNanoShutdown).sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "gpt-5.1",
      "gpt-5.1-2025-11-13",
      "gpt-5.3-codex",
      "gpt-5.4-nano",
      "gpt-5.4-nano-2026-03-17",
    ]);
    expect(rows.every((model) => model.shutdown_date === APRIL_1_2027_SHUTDOWN_DATE)).toBe(true);
    expect(rows.every((model) => model.announced_date === "2026-10-01")).toBe(true);
    expect(rows.every((model) => model.deprecation_date === null)).toBe(true);
    for (const model of rows) {
      const replacement = model.id.startsWith("gpt-5.4-nano") ? "gpt-6-luna" : "gpt-6-sol";
      expect(publishedReplacementIds(model)).toEqual([replacement]);
    }

    const guide = guides.find((item) => item.slug === APRIL_1_2027_GUIDE_SLUG);
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/openai-gpt-5-1-codex-nano-shutdown-april-1-2027/");
    expect(guideChecked(guide)).toBe(APRIL_1_2027_CHECKED);
    expect(guide.h1).toContain("April 1, 2027");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");

    const table = guide.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    for (const model of rows) {
      const cell = table?.rows.find((row) => row[0].includes(model.id))?.[3] ?? "";
      const replacement = model.id.startsWith("gpt-5.4-nano") ? "gpt-6-luna" : "gpt-6-sol";
      expect(cell).toContain(replacement);
    }

    const blob = JSON.stringify(guide);
    expect(blob).toContain("will be removed from the API on April 1, 2027, with six months' notice");
    expect(blob).toContain("no longer be accessible");
    expect(blob).toContain("Reasoning.effort supports: none (default), low, medium, and high.");
    expect(blob).toContain("reasoning.effort supports none, low, medium (default), high, xhigh, and max.");
    expect(blob).toContain("Chat Completions supports function calling only with reasoning_effort set to none.");
    expect(blob).toContain("remove temperature, top_p, and top_logprobs");
    expect(blob).toContain("v1/chat/completions");
    expect(blob).toContain("$1.25");
    expect(blob).toContain("$1.75");
    expect(blob).toContain("$0.2");
    expect(blob).toContain("$14");
    expect(blob).toContain("$0.5");
    expect(blob).toContain("https://developers.openai.com/api/docs/deprecations");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-5.1");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-5.3-codex");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-5.4-nano");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-6-sol");
    expect(blob).toContain("https://developers.openai.com/api/docs/models/gpt-6-luna");
    expect(blob).toContain("https://developers.openai.com/api/docs/guides/latest-model");
    expect(blob).toContain("/api/v1/lookup/gpt-5.1.json");
    expect(blob).toContain("/alerts/");
    expect(blob).toContain("/shutdowns/openai-2027-04-01/");
    expect(blob).toContain("/providers/openai/");
    expect(blob).toContain("/errors/openai-temperature-is-not-supported-with-this-model/");
    expect(blob).toContain("/errors/gpt-6-luna-function-tools-reasoning-effort/");
    expect(blob).toContain("/models/openai/gpt-5-1/");
    expect(blob).toContain("/models/openai/gpt-5-1-2025-11-13/");
    expect(blob).toContain("/models/openai/gpt-5-3-codex/");
    expect(blob).toContain("/models/openai/gpt-5-4-nano/");
    expect(blob).toContain("/models/openai/gpt-5-4-nano-2026-03-17/");
    expect(blob).toContain("2026-07-23");
    expect(blob).toContain("2026-10-01");
    expect(blob).not.toContain("HTTP 404");
    expect(blob).not.toMatch(/[—–]/);
    expect(guide.sections.some((section) => section.heading === "What breaks")).toBe(true);
    expect(guide.sections.some((section) => section.heading === "Find the model ids in your code")).toBe(true);
    expect(guide.sections.some((section) => section.heading === "Test checklist")).toBe(true);
    expect(guide.faqs.length).toBeGreaterThanOrEqual(4);

    const pageFacts = JSON.stringify({
      answer: guide.answer,
      steps: guide.steps,
      sections: guide.sections,
    });
    for (const faq of guide.faqs) {
      for (const date of faq.answer.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
        expect(pageFacts).toContain(date);
      }
    }

    const openai = (id: string) => models.find((model) => model.provider === "openai" && model.id === id)!;
    const gpt51 = openai("gpt-5.1");
    const snapshot = openai("gpt-5.1-2025-11-13");
    const codex = openai("gpt-5.3-codex");
    const nano = openai("gpt-5.4-nano");
    const nanoSnapshot = openai("gpt-5.4-nano-2026-03-17");
    const chat = openai("gpt-5.1-chat-latest");
    for (const model of [gpt51, snapshot, codex, nano, nanoSnapshot]) {
      expect(guidesForModel(model, models).map((link) => link.href)).toContain(`/guides/${APRIL_1_2027_GUIDE_SLUG}/`);
    }
    expect(guidesForModel(chat, models).map((link) => link.href)).not.toContain(`/guides/${APRIL_1_2027_GUIDE_SLUG}/`);

    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain(APRIL_1_2027_GUIDE_SLUG);
    expect(shutdownPage).toContain(APRIL_1_2027_GUIDE_SLUG);
    expect(llmsTxt("https://sunsetdiff.com", [], [])).toContain(guidePath(guide.slug));
    expect(llmsFull("https://sunsetdiff.com", [])).toContain(guidePath(guide.slug));

    const event = shutdownEvents(models).find((item) => item.slug === "openai-2027-04-01");
    expect(event).toBeTruthy();
    if (!event) return;
    expect(event.models.map((model) => model.id).sort()).toEqual(rows.map((model) => model.id));
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

  it("builds the Azure OpenAI November and December 2026 guide from the dataset", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "azure-openai" && [
        "codex-mini-2025-05-16",
        "gpt-chat-latest-2026-05-05",
        "gpt-chat-latest-2026-05-28",
        "gpt-chat-latest-2026-06-24",
        "gpt-image-1.5-2025-12-16",
        "tts-001",
        "tts-hd-001",
        "whisper-001",
      ].includes(model.id))
      .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
    expect(rows.map((model) => [model.id, model.shutdown_date, model.replacements])).toEqual([
      ["codex-mini-2025-05-16", "2026-11-15", []],
      ["gpt-chat-latest-2026-05-05", "2026-11-17", []],
      ["gpt-chat-latest-2026-06-24", "2026-11-17", []],
      ["gpt-chat-latest-2026-05-28", "2026-12-08", []],
      ["tts-001", "2026-12-15", []],
      ["tts-hd-001", "2026-12-15", []],
      ["whisper-001", "2026-12-15", []],
      ["gpt-image-1.5-2025-12-16", "2026-12-16", []],
    ]);
    const guide = guides.find((item) => item.slug === "azure-openai-retirements-november-december-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/azure-openai-retirements-november-december-2026/");
    expect(guideChecked(guide)).toBe("2026-11-02");
    expect(guide.h1).toBe("Azure OpenAI retirements from November 15 to December 16, 2026");
    const table = guide.sections.find((section) => section.heading === "Models and dates")?.table;
    expect(table?.headers).toEqual(["Model id", "Lifecycle on the schedule", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.map((row) => row[1])).toEqual([
      "Deprecated",
      "Preview",
      "Preview",
      "Preview",
      "Preview",
      "GA",
      "GA",
      "GA",
    ]);
    expect(table?.rows.map((row) => row[2])).toEqual(rows.map((model) => model.shutdown_date));
    expect(table?.rows.every((row) => row[3] === "Not published")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("All inference requests return 410 Gone.");
    expect(blob).toContain("If no replacement exists, customers get 30 days notice before the model retires and inference returns 410 Gone.");
    expect(blob).toContain("Provisioned deployments are NOT auto-upgraded.");
    expect(blob).toContain("The model deployment never automatically upgrades.");
    expect(blob).toContain("Is there a named suggested replacement, or do you need to shortlist candidates yourself?");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models");
    expect(blob).toContain("https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-migration");
    expect(blob).toContain("/providers/azure-openai/");
    expect(blob).toContain("/shutdowns/azure-openai-2026-12-15/");
    expect(blob).toContain("/errors/azure-openai-retired-model-410-gone/");
    expect(blob).toContain("there is no /shutdowns/azure-openai-2026-11-15/ page");
    expect(blob).toContain("there is no /shutdowns/azure-openai-2026-11-17/ page");
    expect(blob).toContain("there is no /shutdowns/azure-openai-2026-12-08/ page");
    expect(blob).toContain("there is no /shutdowns/azure-openai-2026-12-16/ page");
    expect(blob).not.toContain("](/shutdowns/azure-openai-2026-11-15/)");
    expect(blob).not.toContain("](/shutdowns/azure-openai-2026-11-17/)");
    expect(blob).not.toContain("](/shutdowns/azure-openai-2026-12-08/)");
    expect(blob).not.toContain("](/shutdowns/azure-openai-2026-12-16/)");
    expect(blob).toContain("gpt-realtime-mini-2025-12-15");
    expect(blob).toContain("2027-06-15");
    expect(blob).not.toMatch(/[—–]/);
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    for (const model of rows) {
      expect(guidesForModel(model, models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    }
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    expect(graph.find((node) => node["@type"] === "Article")).toMatchObject({
      datePublished: "2026-11-02",
      dateModified: "2026-11-02",
    });
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/azure-openai-retirements-november-december-2026/");
    expect(providerPage).toContain('href="/shutdowns/azure-openai-2026-12-15/"');
    expect(providerPage).toContain("there is no /shutdowns/azure-openai-2026-11-15/ page");
    expect(providerPage).not.toContain('href="/shutdowns/azure-openai-2026-11-15/"');
    expect(providerPage).not.toContain('href="/shutdowns/azure-openai-2026-11-17/"');
    expect(providerPage).not.toContain('href="/shutdowns/azure-openai-2026-12-08/"');
    expect(providerPage).not.toContain('href="/shutdowns/azure-openai-2026-12-16/"');
    expect(shutdownPage).toContain("azure-openai-retirements-november-december-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/azure-openai-retirements-november-december-2026/");
    expect(full).toContain("/guides/azure-openai-retirements-november-december-2026/");
    expect(lastmodForUrl("https://sunsetdiff.com/guides/azure-openai-retirements-november-december-2026/")).toBe("2026-11-02");
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

  it("builds the Claude Sonnet 4.5 November 30 guide from the official pages", async () => {
    const models = await loadModels();
    const rows = models.filter((model) => model.provider === "anthropic" && model.shutdown_date === "2026-11-30" && model.shutdown_date_kind === "exact");
    expect(rows.map((model) => model.id)).toEqual(["claude-sonnet-4-5-20250929"]);
    expect(rows[0]?.deprecation_date).toBe("2026-09-30");
    expect(rows[0]?.replacements[0]?.model_id).toBe("claude-sonnet-5-5");
    expectSourceChecked(rows[0]?.sources[0]?.last_checked, "2026-11-01");
    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    expect(shutdownEvents(models).some((event) => event.slug === "anthropic-2026-11-30")).toBe(false);
    const guide = guides.find((item) => item.slug === "claude-sonnet-4-5-shutdown-november-30-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/claude-sonnet-4-5-shutdown-november-30-2026/");
    expect(guideChecked(guide)).toBe("2026-11-01");
    expect(guide.h1).toContain("November 30, 2026");
    const table = guide.sections.find((section) => section.heading === "What retires and when")?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows[0]?.[0]).toBe("[claude-sonnet-4-5-20250929](/models/anthropic/claude-sonnet-4-5-20250929/)");
    expect(table?.rows[0]?.[3]).toContain("claude-sonnet-5-5");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Requests to retired models fail.");
    expect(blob).toContain("Requests to models past the retirement date will fail.");
    expect(blob).toContain("claude-sonnet-4-5");
    expect(blob).toContain("2027-04-08");
    expect(blob).toContain("2026-09-01");
    expect(blob).toContain("Latest Claude Sonnet model");
    expect(blob).toContain("https://platform.claude.com/docs/en/about-claude/model-deprecations");
    expect(blob).toContain("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide");
    expect(blob).toContain("https://platform.claude.com/docs/en/build-with-claude/fast-mode");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html");
    expect(blob).toContain("https://docs.github.com/en/copilot/reference/ai-models/supported-models");
    expect(blob).toContain("/errors/claude-opus-4-8-fast-mode-removed/");
    expect(blob).toContain("/models/aws-bedrock/anthropic-claude-sonnet-4-5-20250929-v1-0/");
    expect(blob).toContain("/models/github-copilot/claude-sonnet-4-5/");
    expect(blob).toContain("not sooner than May 28, 2027");
    expect(blob).toContain("there is no /shutdowns/anthropic-2026-11-30/ page");
    expect(blob).not.toContain("](/shutdowns/anthropic-2026-11-30/)");
    expect(blob).not.toContain("not_found_error");
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain('model="claude-sonnet-5-5"');
    expect(sample).toContain("rg -n");
    expect(sample).not.toContain("temperature");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    const replacement = models.find((model) => model.provider === "anthropic" && model.id === "claude-sonnet-5-5");
    const bedrock = models.find((model) => model.id === "anthropic.claude-sonnet-4-5-20250929-v1:0");
    const copilot = models.find((model) => model.provider === "github-copilot" && model.id === "Claude Sonnet 4.5");
    expect(guidesForModel(replacement!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    expect(guidesForModel(bedrock!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    expect(guidesForModel(copilot!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    expect(bedrock?.shutdown_date).toBe("2027-04-08");
    expect(copilot?.shutdown_date).toBe("2026-09-01");
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    expect(providerPage).toContain("/guides/claude-sonnet-4-5-shutdown-november-30-2026/");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/claude-sonnet-4-5-shutdown-november-30-2026/");
    expect(full).toContain("/guides/claude-sonnet-4-5-shutdown-november-30-2026/");
  });

  it("builds the Claude Opus 4.5 retirement floor guide and skips a shutdown page", async () => {
    const models = await loadModels();
    const opus = models.find((model) => model.provider === "anthropic" && model.id === "claude-opus-4-5-20251101");
    expect(opus?.status).toBe("active");
    expect(opus?.shutdown_date).toBe("2026-11-24");
    expect(opus?.shutdown_date_kind).toBe("not_before");
    expect(opus?.deprecation_date ?? null).toBeNull();
    expect(opus?.replacements).toEqual([]);
    expect(opus?.sources[0]?.excerpt).toContain("Not sooner than November 24, 2026");
    expectSourceChecked(opus?.sources[0]?.last_checked, "2026-11-02");

    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    expect(shutdownEvents(models).some((event) => event.slug === "anthropic-2026-11-24")).toBe(false);
    expect(guides.find((item) => item.slug === "claude-opus-4-5-shutdown-november-24-2026")).toBeUndefined();

    const guide = guides.find((item) => item.slug === "claude-opus-4-5-retirement-november-24-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/claude-opus-4-5-retirement-november-24-2026/");
    expect(guideChecked(guide)).toBe("2026-11-02");
    expect(guide.h1).toContain("November 24, 2026");
    expect(guide.h1).not.toMatch(/shutdown on/i);
    const table = guide.sections.find((section) => section.heading === "What November 24, 2026 means")?.table;
    expect(table?.headers).toEqual(["Model id", "Status", "Date on the deprecations table", "Recommended replacement"]);
    expect(table?.rows[0]?.[0]).toBe("[claude-opus-4-5-20251101](/models/anthropic/claude-opus-4-5-20251101/)");
    expect(table?.rows[0]?.[1]).toBe("active");
    expect(table?.rows[0]?.[2]).toBe("Not sooner than 2026-11-24");
    expect(table?.rows[0]?.[3]).toBe("Not published");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("earliest possible shutdown");
    expect(blob).toContain("The model is fully supported and recommended for use.");
    expect(blob).toContain("at least 60 days' notice");
    expect(blob).toContain("Although Claude Opus 4.5 is still available, you should consider migrating to Claude Opus 5.5.");
    expect(blob).toContain("Active (legacy)");
    expect(blob).toContain("claude-opus-4-5");
    expect(blob).toContain("anthropic.claude-opus-4-5-20251101-v1:0");
    expect(blob).toContain("claude-opus-4-5@20251101");
    expect(blob).toContain("2026-09-01");
    expect(blob).toContain("Latest Claude Opus model");
    expect(blob).toContain("https://platform.claude.com/docs/en/about-claude/model-deprecations");
    expect(blob).toContain("https://platform.claude.com/docs/en/models/opus-4-5/overview");
    expect(blob).toContain("https://platform.claude.com/docs/en/models/opus-5-5/migration-guide");
    expect(blob).toContain("https://platform.claude.com/docs/en/about-claude/models/overview");
    expect(blob).toContain("https://platform.claude.com/docs/en/api/errors");
    expect(blob).toContain("https://docs.github.com/en/copilot/reference/ai-models/supported-models");
    expect(blob).toContain("/models/anthropic/claude-opus-4-5-20251101/");
    expect(blob).toContain("/models/anthropic/claude-opus-5-5/");
    expect(blob).toContain("/models/github-copilot/claude-opus-4-5/");
    expect(blob).toContain("/providers/anthropic/");
    expect(blob).toContain("/guides/claude-sonnet-4-5-shutdown-november-30-2026/");
    expect(blob).toContain("/guides/catch-a-retired-model-before-your-users-do/");
    expect(blob).toContain("/errors/claude-api-2026-10-21-sampling-params-400/");
    expect(blob).toContain("Requests to retired models fail.");
    expect(blob).toContain("not_found_error");
    expect(blob).toContain("does not name not_found_error");
    expect(blob).toContain("there is no /shutdowns/anthropic-2026-11-24/ page");
    expect(blob).not.toContain("](/shutdowns/anthropic-2026-11-24/)");
    expect(blob).not.toMatch(/[—–]/);
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain('model="claude-opus-5-5"');
    expect(sample).toContain("rg -n");
    expect(sample).not.toContain("temperature");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(opus!, models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    const copilot = models.find((model) => model.provider === "github-copilot" && model.id === "Claude Opus 4.5");
    expect(copilot?.shutdown_date).toBe("2026-09-01");
    expect(guidesForModel(copilot!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    expect(providerPage).toContain("/guides/claude-opus-4-5-retirement-november-24-2026/");
    expect(providerPage).toContain("there is no /shutdowns/anthropic-2026-11-24/ page");
    expect(providerPage).not.toContain('href="/shutdowns/anthropic-2026-11-24/"');
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/claude-opus-4-5-retirement-november-24-2026/");
    expect(full).toContain("/guides/claude-opus-4-5-retirement-november-24-2026/");
    expect(text).not.toContain("/guides/claude-opus-4-5-shutdown-november-24-2026/");
  });

  it("builds the Bedrock Jamba November 26 guide and skips unconfirmed shutdown pages", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "aws-bedrock" && model.shutdown_date === "2026-11-26" && model.shutdown_date_kind === "exact")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "ai21.jamba-1-5-large-v1:0",
      "ai21.jamba-1-5-mini-v1:0",
    ]);
    expect(rows.every((model) => model.status === "legacy")).toBe(true);
    expect(rows.every((model) => model.deprecation_date === "2026-05-26")).toBe(true);
    expect(rows.every((model) => model.replacements.length === 0)).toBe(true);
    for (const model of rows) expectSourceChecked(model.sources[0]?.last_checked, "2026-11-02");

    const opus = models.find((model) => model.provider === "anthropic" && model.id === "claude-opus-4-5-20251101");
    expect(opus?.status).toBe("active");
    expect(opus?.shutdown_date).toBe("2026-11-24");
    expect(opus?.shutdown_date_kind).toBe("not_before");
    expect(opus?.replacements).toEqual([]);
    expectSourceChecked(opus?.sources[0]?.last_checked, "2026-11-02");
    expect(opus?.sources[0]?.excerpt).toContain("Not sooner than November 24, 2026");

    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    const slugs = shutdownEvents(models).map((event) => event.slug);
    expect(slugs).not.toContain("aws-bedrock-2026-11-26");
    expect(slugs).not.toContain("anthropic-2026-11-24");
    expect(guides.find((item) => item.slug === "claude-opus-4-5-shutdown-november-24-2026")).toBeUndefined();

    const guide = guides.find((item) => item.slug === "amazon-bedrock-ai21-jamba-shutdown-november-26-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/amazon-bedrock-ai21-jamba-shutdown-november-26-2026/");
    expect(guideChecked(guide)).toBe("2026-11-02");
    expect(guide.h1).toContain("November 26, 2026");
    const table = guide.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(table?.headers).toEqual(["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.every((row) => row[2] === "2026-11-26")).toBe(true);
    expect(table?.rows.every((row) => row[4] === "Not published")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Migrate to an Active model before the EOL date.");
    expect(blob).toContain("Migration will not happen automatically.");
    expect(blob).toContain("requests made to this version will fail");
    expect(blob).toContain("Legacy (EOL: 2026-11-26)");
    expect(blob).toContain("Not supported");
    expect(blob).toContain("August 26, 2026");
    expect(blob).toContain("there is no /shutdowns/aws-bedrock-2026-11-26/ page");
    expect(blob).toContain("there is no /shutdowns/anthropic-2026-11-24/ page");
    expect(blob).not.toContain("](/shutdowns/aws-bedrock-2026-11-26/)");
    expect(blob).not.toContain("](/shutdowns/anthropic-2026-11-24/)");
    expect(blob).not.toContain("ResourceNotFoundException");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-ai21-labs-jamba-1-5-large.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-ai21-labs-jamba-1-5-mini.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html");
    expect(blob).toContain("https://platform.claude.com/docs/en/about-claude/model-deprecations");
    expect(blob).not.toMatch(/[—–]/);
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(rows[1], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/amazon-bedrock-ai21-jamba-shutdown-november-26-2026/");
    expect(providerPage).toContain("there is no /shutdowns/aws-bedrock-2026-11-26/ page");
    expect(providerPage).toContain("there is no /shutdowns/anthropic-2026-11-24/ page");
    expect(providerPage).not.toContain('href="/shutdowns/aws-bedrock-2026-11-26/"');
    expect(providerPage).not.toContain('href="/shutdowns/anthropic-2026-11-24/"');
    expect(shutdownPage).not.toContain("amazon-bedrock-ai21-jamba-shutdown-november-26-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/amazon-bedrock-ai21-jamba-shutdown-november-26-2026/");
    expect(full).toContain("/guides/amazon-bedrock-ai21-jamba-shutdown-november-26-2026/");
    expect(text).not.toContain("/guides/claude-opus-4-5-shutdown-november-24-2026/");
  });

  it("builds the Vertex Gemini November and December guide and skips one-model shutdown pages", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "google-vertex" && (model.shutdown_date === "2026-11-19" || model.shutdown_date === "2026-12-13") && model.shutdown_date_kind === "exact")
      .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "gemini-3.6-flash",
      "gemini-live-2.5-flash-native-audio",
    ]);
    expect(rows.map((model) => model.shutdown_date)).toEqual(["2026-11-19", "2026-12-13"]);
    expect(rows[0]?.replacements.map((item) => item.model_id)).toEqual(["gemini-3.8-flash"]);
    expect(rows[1]?.replacements.map((item) => item.model_id)).toEqual(["gemini-3.8-live"]);
    expect(rows.every((model) => model.sources.some((source) => source.last_checked >= "2026-11-02"))).toBe(true);

    const veo = models
      .filter((model) => model.provider === "google-vertex" && model.shutdown_date === "2026-11-17")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(veo.map((model) => model.id)).toEqual(["veo-3.1-fast-generate-001", "veo-3.1-generate-001"]);
    expect(veo.every((model) => model.shutdown_date_kind === "not_before")).toBe(true);
    expect(veo.every((model) => model.replacements.length === 0)).toBe(true);

    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    const slugs = shutdownEvents(models).map((event) => event.slug);
    expect(slugs).not.toContain("google-vertex-2026-11-19");
    expect(slugs).not.toContain("google-vertex-2026-12-13");
    expect(slugs).not.toContain("google-vertex-2026-11-17");
    expect(slugs).toContain("google-vertex-2026-10-20");

    const guide = guides.find((item) => item.slug === "vertex-ai-gemini-retirements-november-december-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/vertex-ai-gemini-retirements-november-december-2026/");
    expect(guideChecked(guide)).toBe("2026-11-02");
    expect(guide.h1).toBe("Vertex AI Gemini retirements in November and December 2026");
    const table = guide.sections.find((section) => section.heading === "What retires and when")?.table;
    expect(table?.headers).toEqual(["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[0])).toEqual([
      "[gemini-3.6-flash](/models/google-vertex/gemini-3-6-flash/)",
      "[gemini-live-2.5-flash-native-audio](/models/google-vertex/gemini-live-2-5-flash-native-audio/)",
    ]);
    expect(table?.rows[0]?.[2]).toBe("2026-11-19");
    expect(table?.rows[0]?.[3]).toContain("gemini-3.8-flash");
    expect(table?.rows[1]?.[2]).toBe("2026-12-13");
    expect(table?.rows[1]?.[3]).toContain("gemini-3.8-live");
    const veoTable = guide.sections.find((section) => section.heading === "Veo dates that are floors")?.table;
    expect(veoTable?.rows.map((row) => row[2])).toEqual(["2026-11-17 or later", "2026-11-17 or later"]);
    expect(veoTable?.rows.every((row) => row[3] === "Not published")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Gemini 3.6 Flash will be retired on November 19, 2026.");
    expect(blob).toContain("they won't be moved to an earlier date");
    expect(blob).toContain("is not available for 3.8 Flash.");
    expect(blob).toContain("These parameters are ignored by the backend.");
    expect(blob).toContain("will throw an active API error.");
    expect(blob).toContain("send_context_update");
    expect(blob).toContain("initial_history_in_client_content=True");
    expect(blob).toContain("there is no /shutdowns/google-vertex-2026-11-19/ page");
    expect(blob).toContain("there is no /shutdowns/google-vertex-2026-12-13/ page");
    expect(blob).toContain("there is no /shutdowns/google-vertex-2026-11-17/ page");
    expect(blob).toContain("/shutdowns/google-vertex-2026-10-20/");
    expect(blob).not.toContain("](/shutdowns/google-vertex-2026-11-19/)");
    expect(blob).not.toContain("](/shutdowns/google-vertex-2026-12-13/)");
    expect(blob).not.toContain("](/shutdowns/google-vertex-2026-11-17/)");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-6-flash");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-live-api");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api/migrate-from-gemini-2-5-to-gemini-3-8-live");
    expect(blob).toContain("https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-live");
    expect(blob).toContain("No shutdown date announced");
    expect(blob).toContain("January 28, 2027");
    expect(blob).not.toContain("Bearer");
    expect(blob).not.toMatch(/[—–]/);
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain('model="gemini-3.8-flash"');
    expect(sample).toContain('model="gemini-3.6-flash"');
    expect(sample).toContain('model="gemini-3.8-live"');
    expect(sample).toContain("gemini-3.8-flash:generateContent");
    expect(sample).toContain("rg -n");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(rows[1], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(veo[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const replacement = models.find((model) => model.provider === "google-vertex" && model.id === "gemini-3.8-flash");
    const liveReplacement = models.find((model) => model.provider === "google-vertex" && model.id === "gemini-3.8-live");
    expect(guidesForModel(replacement!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    expect(guidesForModel(liveReplacement!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/vertex-ai-gemini-retirements-november-december-2026/");
    expect(providerPage).toContain("there is no /shutdowns/google-vertex-2026-11-19/ page");
    expect(providerPage).toContain("there is no /shutdowns/google-vertex-2026-12-13/ page");
    expect(providerPage).not.toContain('href="/shutdowns/google-vertex-2026-11-19/"');
    expect(providerPage).not.toContain('href="/shutdowns/google-vertex-2026-12-13/"');
    expect(shutdownPage).not.toContain("vertex-ai-gemini-retirements-november-december-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/vertex-ai-gemini-retirements-november-december-2026/");
    expect(full).toContain("/guides/vertex-ai-gemini-retirements-november-december-2026/");
    expect(lastmodForUrl("https://sunsetdiff.com/guides/vertex-ai-gemini-retirements-november-december-2026/")).toBe("2026-11-02");
  });

  it("builds the OpenRouter November and December 2026 expiration guide", async () => {
    const models = await loadModels();
    const live = [
      ["meta-llama/llama-3.1-70b-instruct", "2026-11-03"],
      ["thinkingmachines/inkling-small:free", "2026-11-04"],
      ["thinkingmachines/inkling:free", "2026-11-04"],
      ["bytedance-seed/seed-1.6", "2026-11-11"],
      ["bytedance-seed/seed-1.6-flash", "2026-11-11"],
      ["bytedance-seed/seed-2.0-code", "2026-11-11"],
      ["bytedance/seedance-1-5-pro", "2026-11-11"],
      ["liquid/d1", "2026-11-20"],
      ["heygen/heygen-voice-1-turbo:free", "2026-11-30"],
      ["microsoft/mai-transcribe-1.5", "2026-12-22"],
      ["dots-studio/dots-3-note-preview:free", "2026-12-31"],
      ["microsoft/mai-voice-2", "2026-12-31"],
      ["microsoft/mai-voice-2-flash", "2026-12-31"],
      ["z-ai/glm-4.5", "2026-12-31"],
      ["z-ai/glm-4.5v", "2026-12-31"],
      ["z-ai/glm-4.7", "2026-12-31"],
    ] as const;
    const stored = live.flatMap(([id, date]) => {
      const model = models.find((item) => item.provider === "openrouter" && item.id === id);
      return model ? [{ model, date }] : [];
    });
    expect(stored.map(({ model }) => model.id)).toEqual(live.map(([id]) => id));
    expect(stored.every(({ model, date }) => model.shutdown_date === date && model.shutdown_date_kind === "not_before")).toBe(true);
    expect(stored.every(({ model }) => model.replacements.length === 0)).toBe(true);

    const absent = ["nousresearch/hermes-3-llama-3.1-405b", "nousresearch/hermes-3-llama-3.1-70b", "x-ai/grok-imagine-image-quality"];
    for (const id of absent) {
      const model = models.find((item) => item.provider === "openrouter" && item.id === id);
      expect(model?.shutdown_date).toBe("2026-11-02");
      expect(model?.shutdown_date_kind).toBe("not_before");
    }

    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    const slugs = shutdownEvents(models).map((event) => event.slug);
    expect(slugs.some((slug) => slug.startsWith("openrouter-"))).toBe(false);

    const guide = guides.find((item) => item.slug === "openrouter-model-expirations-november-december-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/openrouter-model-expirations-november-december-2026/");
    expect(guideChecked(guide)).toBe("2026-11-02");
    expect(guide.h1).toBe("OpenRouter model expirations in November and December 2026");
    const table = guide.sections.find((section) => section.heading === "What expires and when")?.table;
    expect(table?.headers).toEqual(["Model id", "expiration_date", "How to read it", "Recommended replacement"]);
    expect(table?.rows.map((row) => row[1])).toEqual(live.map(([, date]) => date));
    expect(table?.rows.every((row) => row[3] === "Not published")).toBe(true);
    expect(table?.rows[0]?.[0]).toBe("[meta-llama/llama-3.1-70b-instruct](/models/openrouter/meta-llama-llama-3-1-70b-instruct/)");
    expect(table?.rows[1]?.[0]).toBe(
      "[thinkingmachines/inkling-small:free](/models/openrouter/thinkingmachines-inkling-small-free/)",
    );
    expect(table?.rows[2]?.[0]).toBe("[thinkingmachines/inkling:free](/models/openrouter/thinkingmachines-inkling-free/)");
    expect(table?.rows[3]?.[2]).toBe("Not before 2026-11-11. The model may be removed after it.");
    const canonical = guide.sections.find((section) => section.heading === "canonical_slug is not a replacement")?.table;
    expect(canonical?.rows.some((row) => row[1] === "z-ai/glm-4.7-20251222")).toBe(true);
    expect(canonical?.rows.some((row) => row[1] === "thinkingmachines/inkling-20260715")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Deprecation date for the model endpoint (null if not deprecated)");
    expect(blob).toContain("The date after which the model may be removed.");
    expect(blob).toContain("Returns 404 if the model doesn't exist");
    expect(blob).toContain("GET /api/v1/model/{id}");
    expect(blob).toContain("does not invent");
    expect(blob).toContain("https://openrouter.ai/api/v1/models?output_modalities=all");
    expect(blob).toContain("https://openrouter.ai/docs/guides/overview/models");
    expect(blob).toContain("https://openrouter.ai/docs/client-sdks/python/components/model");
    expect(blob).toContain("https://openrouter.ai/docs/quickstart");
    expect(blob).toContain("https://openrouter.ai/models");
    expect(blob).toContain("/providers/openrouter/");
    expect(blob).toContain("/frameworks/openrouter/");
    expect(blob).toContain("there is no /shutdowns/openrouter-2026-11-11/ page");
    expect(blob).toContain("there is no /shutdowns/openrouter-2026-12-31/ page");
    expect(blob).not.toContain("](/shutdowns/openrouter-2026-11-11/)");
    expect(blob).not.toContain("](/shutdowns/openrouter-2026-12-31/)");
    expect(blob).toContain("nousresearch/hermes-3-llama-3.1-70b");
    expect(blob).toContain("x-ai/grok-imagine-image-quality");
    expect(blob).toContain("poolside/laguna-s-2.1:free");
    expect(blob).not.toContain("glm-5");
    expect(blob).not.toMatch(/[—–]/);
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain("rg -n -F");
    expect(sample).toContain("bytedance-seed/seed-1.6");
    expect(sample).toContain("z-ai/glm-4.7-20251222");
    expect(sample).toContain('model="author/model-you-pick"');
    expect(sample).not.toContain("Bearer");
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    const llama = models.find((model) => model.provider === "openrouter" && model.id === "meta-llama/llama-3.1-70b-instruct");
    const gone = models.find((model) => model.provider === "openrouter" && model.id === "x-ai/grok-imagine-image-quality");
    expect(guidesForModel(llama!, models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(gone!, models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(stored.find(({ model }) => model.id === "z-ai/glm-4.7")!.model, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/openrouter-model-expirations-november-december-2026/");
    expect(providerPage).toContain("/frameworks/openrouter/");
    expect(shutdownPage).not.toContain("openrouter-model-expirations-november-december-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/openrouter-model-expirations-november-december-2026/");
    expect(full).toContain("/guides/openrouter-model-expirations-november-december-2026/");
    expect(lastmodForUrl("https://sunsetdiff.com/guides/openrouter-model-expirations-november-december-2026/")).toBe("2026-11-02");
  });

  it("builds the Gemini 2.5 Pro and Flash December 1 auto-route guide", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "google-gemini-api" && model.shutdown_date === "2026-12-01" && model.shutdown_date_kind === "exact")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
    expect(rows[0]?.replacements.map((item) => item.model_id)).toEqual(["gemini-3.5-flash-lite"]);
    expect(rows[1]?.replacements.map((item) => item.model_id)).toEqual(["gemini-3.8-flash"]);
    const lite = models.find((model) => model.provider === "google-gemini-api" && model.id === "gemini-2.5-flash-lite");
    expect(lite?.status).toBe("active");
    expect(lite?.shutdown_date).toBeNull();

    const { shutdownEvents, batchLead, batchHeadline } = await import("../src/lib/shutdowns.ts");
    const { loadProviders } = await import("../src/lib/load.ts");
    const providers = await loadProviders();
    const event = shutdownEvents(models).find((item) => item.slug === "google-gemini-api-2026-12-01");
    const bedrock = shutdownEvents(models).find((item) => item.slug === "aws-bedrock-2026-11-27");
    expect(event?.models.map((model) => model.id)).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
    expect(bedrock?.models.map((model) => model.id).sort()).toEqual([
      "anthropic.claude-3-haiku-20240307-v1:0",
      "anthropic.claude-3-sonnet-20240229-v1:0",
    ]);
    const name = providers.find((provider) => provider.id === "google-gemini-api")!.name;
    const lead = batchLead(name, event!, "2026-11-03");
    expect(lead).toContain("gemini-3.8-flash");
    expect(lead).toContain("gemini-3.5-flash-lite");
    expect(lead).toContain("not deprecated");
    expect(lead).not.toContain("start failing");
    const title = batchHeadline(name, event!, "2026-11-03");
    expect(title).toContain("gemini-2.5-flash");
    expect(title).toContain("Dec 1, 2026");
    const bedrockName = providers.find((provider) => provider.id === "aws-bedrock")!.name;
    const bedrockTitle = batchHeadline(bedrockName, bedrock!, "2026-11-03");
    expect(bedrockTitle).toContain("Claude 3");
    expect(bedrockTitle).toContain("in some Regions");

    const guide = guides.find((item) => item.slug === "gemini-2-5-pro-flash-auto-route-december-1-2026");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/gemini-2-5-pro-flash-auto-route-december-1-2026/");
    expect(guideChecked(guide)).toBe("2026-11-03");
    const blob = JSON.stringify(guide);
    expect(blob).toContain("gemini-2.5-pro will automatically route to gemini-3.8-flash");
    expect(blob).toContain("gemini-2.5-flash will automatically route to gemini-3.5-flash-lite");
    expect(blob).toContain("gemini-2.5-flash-lite is not deprecated");
    expect(blob).toContain("$0.75/1M input tokens");
    expect(blob).toContain("$0.30/1M input tokens and $2.50/1M output tokens");
    expect(blob).toContain("minimal thinking level is not supported");
    expect(blob).toContain("https://aistudio.google.com/docs/deprecations");
    expect(blob).toContain("https://aistudio.google.com/docs/whats-new-gemini-3.8#migrate-to-gemini-3-8-flash");
    expect(blob).toContain("https://aistudio.google.com/docs/whats-new-gemini-3.6#migrate-to-gemini-3-5-flash-lite");
    expect(blob).toContain("/shutdowns/google-gemini-api-2026-12-01/");
    expect(blob).not.toMatch(/[—–]/);
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain('model="gemini-3.8-flash"');
    expect(sample).toContain('model="gemini-3.5-flash-lite"');
    expect(sample).toContain('model="gemini-2.5-pro"');
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(rows[1], models).map((link) => link.href)[0]).toBe(guidePath(guide.slug));
    expect(guidesForModel(lite!, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/gemini-2-5-pro-flash-auto-route-december-1-2026/");
    expect(providerPage).toContain("/shutdowns/google-gemini-api-2026-12-01/");
    expect(providerPage).toContain("/shutdowns/aws-bedrock-2026-11-27/");
    expect(shutdownPage).toContain("gemini-2-5-pro-flash-auto-route-december-1-2026");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/gemini-2-5-pro-flash-auto-route-december-1-2026/");
    expect(full).toContain("/guides/gemini-2-5-pro-flash-auto-route-december-1-2026/");
    expect(lastmodForUrl("https://sunsetdiff.com/guides/gemini-2-5-pro-flash-auto-route-december-1-2026/")).toBe("2026-11-03");
  });

  it("builds the Bedrock March 30, 2027 open-weight guide and links it from a model page", async () => {
    const models = await loadModels();
    const rows = models
      .filter((model) => model.provider === "aws-bedrock" && model.shutdown_date === "2027-03-30" && model.shutdown_date_kind === "exact")
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((model) => model.id)).toEqual([
      "deepseek.r1-v1:0",
      "deepseek.v3-v1:0",
      "deepseek.v3.1",
      "google.gemma-3-12b-it",
      "google.gemma-3-27b-it",
      "google.gemma-3-4b-it",
      "meta.llama3-1-70b-instruct-v1:0",
      "meta.llama3-1-8b-instruct-v1:0",
      "meta.llama3-3-70b-instruct-v1:0",
      "meta.llama3-70b-instruct-v1:0",
      "meta.llama3-8b-instruct-v1:0",
      "meta.llama4-maverick-17b-instruct-v1:0",
      "meta.llama4-scout-17b-instruct-v1:0",
      "minimax.minimax-m2",
      "minimax.minimax-m2.1",
      "mistral.devstral-2-123b",
      "mistral.mistral-7b-instruct-v0:2",
      "mistral.mixtral-8x7b-instruct-v0:1",
      "mistral.voxtral-mini-3b-2507",
      "mistral.voxtral-small-24b-2507",
      "moonshot.kimi-k2-thinking",
      "moonshotai.kimi-k2-thinking",
      "nvidia.nemotron-nano-12b-v2",
      "nvidia.nemotron-nano-9b-v2",
      "qwen.qwen3-coder-30b-a3b-instruct",
      "qwen.qwen3-coder-30b-a3b-v1:0",
      "qwen.qwen3-coder-480b-a35b-instruct",
      "qwen.qwen3-coder-480b-a35b-v1:0",
      "zai.glm-4.7",
      "zai.glm-4.7-flash",
    ]);
    expect(rows.every((model) => model.status === "legacy")).toBe(true);
    expect(rows.every((model) => model.deprecation_date === "2026-09-30")).toBe(true);
    expect(rows.every((model) => model.replacements.length === 0)).toBe(true);
    for (const model of rows) expectSourceChecked(model.sources[0]?.last_checked, "2026-11-03");

    const { shutdownEvents } = await import("../src/lib/shutdowns.ts");
    expect(shutdownEvents(models).map((event) => event.slug)).toContain("aws-bedrock-2027-03-30");

    const guide = guides.find((item) => item.slug === "amazon-bedrock-open-weight-models-shutdown-march-30-2027");
    expect(guide).toBeTruthy();
    if (!guide) return;
    expect(guidePath(guide.slug)).toBe("/guides/amazon-bedrock-open-weight-models-shutdown-march-30-2027/");
    expect(guideChecked(guide)).toBe("2026-11-03");
    expect(guide.h1).toContain("March 30, 2027");
    const table = guide.sections.find((section) => section.heading === "Models shutting down")?.table;
    expect(table?.headers).toEqual(["Model id", "Legacy date stored", "Shutdown date", "Regions", "Official replacement"]);
    expect(table?.rows).toHaveLength(rows.length);
    expect(table?.rows.map((row) => row[0])).toEqual(
      rows.map((model) => `[${model.id}](/models/${model.provider}/${model.slug}/)`),
    );
    expect(table?.rows.every((row) => row[2] === "2027-03-30")).toBe(true);
    expect(table?.rows.every((row) => row[4] === "no official replacement")).toBe(true);
    const blob = JSON.stringify(guide);
    expect(blob).toContain("Migrate to an Active model before the EOL date.");
    expect(blob).toContain("Migration will not happen automatically.");
    expect(blob).toContain("requests made to this version will fail");
    expect(blob).toContain("To be announced");
    expect(blob).toContain("us.deepseek.r1-v1:0");
    expect(blob).toContain("us-gov.nvidia.nemotron-nano-9b-v2");
    expect(blob).toContain("No card in this set prints an eu. id.");
    expect(blob).toContain("deepseek.v3.2");
    expect(blob).toContain("AWS did not name");
    const sample = guide.sections.flatMap((section) => section.codes ?? []).map((item) => item.code).join("\n");
    expect(sample).toContain("client.converse(");
    expect(sample).toContain('modelId="deepseek.v3.2"');
    expect(blob).toContain("/shutdowns/aws-bedrock-2027-03-30/");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html");
    expect(blob).toContain("https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html");
    expect(blob).not.toMatch(/[—–]/);
    expect(sitemapSection(guidePath(guide.slug))).toBe("sitemap-guides.xml");
    expect(guidesForModel(rows[0], models).map((link) => link.href)).toContain(guidePath(guide.slug));
    for (const model of rows) {
      expect(guidesForModel(model, models).map((link) => link.href)).toContain(guidePath(guide.slug));
    }
    const graph = guideGraph("https://sunsetdiff.com/", guide);
    expect(graph.some((node) => node["@type"] === "HowTo")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const providerPage = readFileSync("src/pages/providers/[provider].astro", "utf8");
    const shutdownPage = readFileSync("src/pages/shutdowns/[slug].astro", "utf8");
    expect(providerPage).toContain("/guides/amazon-bedrock-open-weight-models-shutdown-march-30-2027/");
    expect(providerPage).toContain("/shutdowns/aws-bedrock-2027-03-30/");
    expect(shutdownPage).toContain("amazon-bedrock-open-weight-models-shutdown-march-30-2027");
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain("/guides/amazon-bedrock-open-weight-models-shutdown-march-30-2027/");
    expect(full).toContain("/guides/amazon-bedrock-open-weight-models-shutdown-march-30-2027/");
  });
});
