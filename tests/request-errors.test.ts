import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { migrationSchema, modelSchema } from "../src/schema.ts";
import { buildMigration, mergeCuratedMigration } from "../scrapers/migrations.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { requestErrorGraph } from "../src/jsonld.ts";
import { existsSync } from "node:fs";
import nodePath from "node:path";
import { sitemapSection } from "../src/lib/sitemaps.ts";
import { REQUEST_ERRORS_CHECKED, REQUEST_ERRORS_INDEX, requestErrorChecked, requestErrorPath, requestErrors, requestErrorsIndexChecked } from "../src/lib/request-errors.ts";

const sonnetFile = "data/migrations/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5.json";
const lunaFiles = [
  "data/migrations/openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna.json",
  "data/migrations/openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna.json",
  "data/migrations/openai__gpt-4o-2024-11-20__to__openai__gpt-6-luna.json",
];

describe("migration request changes", () => {
  it("fills Sonnet 4.5 to 5.5 from the migration guide", async () => {
    const row = migrationSchema.parse(JSON.parse(await readFile(sonnetFile, "utf8")));
    expect(row.api_changes.map((change) => change.kind)).toEqual([
      "removed_param",
      "removed_param",
      "behavior_change",
      "behavior_change",
      "behavior_change",
    ]);
    const blob = row.api_changes.map((change) => change.detail).join(" ");
    expect(blob).toContain("non-default temperature, top_p, or top_k");
    expect(blob).toContain("budget_tokens");
    expect(blob).toContain("between_tools");
    expect(blob).toContain("user message");
    expect(blob).toContain("tool_choice");
    for (const change of row.api_changes) {
      expect(change.source_url).toBe("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide");
    }
    for (const language of ["python", "typescript", "curl"] as const) {
      const snippet = row.code_change.snippets[language];
      expect(snippet.before).toContain("claude-sonnet-4-5-20250929");
      expect(snippet.before).toContain("temperature");
      expect(snippet.after).toContain("claude-sonnet-5-5");
      expect(snippet.after).not.toContain("temperature");
      expect(snippet.after).not.toContain("budget_tokens");
      expect(snippet.after).toContain("effort");
    }
    expect(row.code_change.after).toBe(row.code_change.snippets.python.after);
  });

  it("keeps the guide notes when a scrape rebuilds the row", async () => {
    const stored = migrationSchema.parse(JSON.parse(await readFile(sonnetFile, "utf8")));
    const from = modelSchema.parse(JSON.parse(await readFile(`data/models/anthropic/${stored.from.slug}.json`, "utf8")));
    const to = modelSchema.parse(JSON.parse(await readFile(`data/models/anthropic/${stored.to.slug}.json`, "utf8")));
    const fresh = buildMigration(from, to, "2026-10-21");
    expect(fresh.api_changes).toEqual([]);
    const merged = mergeCuratedMigration(stored, fresh);
    expect(merged.api_changes.map((change) => change.kind)).toEqual(stored.api_changes.map((change) => change.kind));
    expect(merged.code_change).toEqual(stored.code_change);
    expect(merged.price_diff).toEqual(fresh.price_diff);
    expect(merged.sources.map((source) => source.url)).toContain("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide");
    const luna = migrationSchema.parse(JSON.parse(await readFile(lunaFiles[1], "utf8")));
    const lunaFrom = modelSchema.parse(JSON.parse(await readFile(`data/models/openai/${luna.from.slug}.json`, "utf8")));
    const lunaTo = modelSchema.parse(JSON.parse(await readFile(`data/models/openai/${luna.to.slug}.json`, "utf8")));
    const lunaFresh = buildMigration(lunaFrom, lunaTo, "2026-10-21");
    expect(lunaFresh.api_changes).toEqual([]);
    const lunaMerged = mergeCuratedMigration(luna, lunaFresh);
    expect(lunaMerged.api_changes.map((change) => change.detail)).toEqual(luna.api_changes.map((change) => change.detail));
    expect(lunaMerged.code_change.snippets.python.after).toContain("reasoning_effort");
  });

  it("fills the GPT-4o to GPT-6 Luna guides from the model page", async () => {
    for (const file of lunaFiles) {
      const row = migrationSchema.parse(JSON.parse(await readFile(file, "utf8")));
      expect(row.api_changes.map((change) => change.detail)).toEqual([
        "Use the Responses API for function calling. Chat Completions supports function calling only with reasoning_effort set to none.",
        "Fine-tuning (v1/fine-tuning) is not supported.",
        "Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.",
      ]);
      for (const change of row.api_changes) {
        expect(change.source_url).toBe("https://developers.openai.com/api/docs/models/gpt-6-luna");
      }
      for (const language of ["python", "typescript", "curl"] as const) {
        const snippet = row.code_change.snippets[language];
        expect(snippet.before).toContain(row.from.model_id);
        expect(snippet.before).toContain("get_weather");
        expect(snippet.before).not.toContain("reasoning_effort");
        expect(snippet.after).toContain("gpt-6-luna");
        expect(snippet.after).toContain("reasoning_effort");
        expect(snippet.after).toContain("none");
        expect(snippet.after).toContain("get_weather");
      }
    }
  });
});

describe("request error pages", () => {
  it("lists both pages in llms.txt, lastmod, and JSON-LD", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(requestErrors.length).toBe(22);
    const bedrockEol = requestErrors.find((page) => page.slug === "bedrock-model-version-has-reached-the-end-of-its-life");
    expect(bedrockEol?.errorQuoted).toBe(true);
    expect(bedrockEol?.checked).toBe("2026-10-31");
    expect(bedrockEol?.provider).toBe("aws-bedrock");
    expect(bedrockEol?.errorText).toBe("ResourceNotFoundException: This model version has reached the end of its life.");
    expect(bedrockEol?.quoteSourceUrl).toBe("https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html");
    expect(bedrockEol?.shutdowns).toEqual([{ provider: "aws-bedrock", date: "2026-11-13" }]);
    expect(bedrockEol?.models.map((item) => item.slug)).toEqual([
      "anthropic-claude-3-haiku-20240307-v1-0-2",
      "anthropic-claude-3-haiku-20240307-v1-0",
      "anthropic-claude-3-7-sonnet-20250219-v1-0",
    ]);
    expect(sitemapSection(requestErrorPath(bedrockEol!.slug))).toBe("sitemap-guides.xml");
    const opusFast = requestErrors.find((page) => page.slug === "claude-opus-4-8-fast-mode-removed");
    expect(opusFast?.errorQuoted).toBe(false);
    expect(opusFast?.checked).toBe("2026-10-31");
    expect(opusFast?.errorText).toContain("has not published the error sentence");
    expect(opusFast?.rule).toContain("November 30, 2026");
    expect(opusFast?.ruleSourceUrl).toBe("https://platform.claude.com/docs/en/build-with-claude/fast-mode");
    expect(opusFast?.models.map((item) => item.id)).toEqual(["claude-opus-4-8", "claude-opus-5-5"]);
    expect(text).toContain(REQUEST_ERRORS_INDEX);
    expect(full).toContain(REQUEST_ERRORS_INDEX);
    expect(lastmodForUrl(`https://sunsetdiff.com${REQUEST_ERRORS_INDEX}`)).toBe(requestErrorsIndexChecked());
    for (const page of requestErrors) {
      const path = requestErrorPath(page.slug);
      expect(text).toContain(path);
      expect(full).toContain(path);
      expect(lastmodForUrl(`https://sunsetdiff.com${path}`)).toBe(requestErrorChecked(page));
      const graph = requestErrorGraph("https://sunsetdiff.com/", page);
      expect(graph.map((node) => node["@type"])).toEqual(["TechArticle", "FAQPage"]);
      const encoded = JSON.parse(JSON.stringify(graph)) as { headline?: string; description?: string }[];
      expect(encoded[0]?.headline).toBe(page.h1);
      expect(encoded[0]?.description).toContain(page.errorText);
      expect(JSON.stringify(graph)).not.toMatch(/[—–]/);
      expect(JSON.stringify(page)).not.toMatch(/[—–]/);
      expect(page.cause.length).toBeGreaterThan(10);
      expect(page.models.length).toBeGreaterThan(0);
      for (const model of page.models) {
        const file = nodePath.join("data/models", model.provider, `${model.slug}.json`);
        expect(existsSync(file), file).toBe(true);
      }
      for (const guide of page.guides) {
        const file = nodePath.join("data/migrations", `${guide.href.split("/").filter(Boolean).at(-1)}.json`);
        expect(existsSync(file), guide.href).toBe(true);
      }
    }
    const topP = requestErrors.find((page) => page.slug === "claude-sonnet-5-5-top-p-top-k");
    expect(topP?.errorQuoted).toBe(false);
    expect(topP?.errorText).not.toContain("top_p is deprecated for this model");
    expect(topP?.apiVersionNote?.href).toBe("/errors/claude-api-2026-10-21-sampling-params-400/");
    expect(topP?.apiVersionNote?.checked).toBe("2026-10-22");
    const temperature = requestErrors.find((page) => page.slug === "claude-temperature-is-deprecated-for-this-model");
    expect(temperature?.apiVersionNote?.href).toBe("/errors/claude-api-2026-10-21-sampling-params-400/");
    expect(temperature?.apiVersionNote?.sourceUrl).toBe("https://platform.claude.com/docs/en/api/versioning");
    const sampling = requestErrors.find((page) => page.slug === "claude-api-2026-10-21-sampling-params-400");
    expect(sampling?.errorQuoted).toBe(false);
    expect(sampling?.checked).toBe("2026-10-22");
    expect(sampling?.errorText).not.toContain("temperature is deprecated for this model");
    expect(sampling?.rule).toContain("Claude Sonnet 4.6");
    expect(sampling?.rule).toContain("On Amazon Bedrock, it's available for Claude 4.7 and later models.");
    expect(sampling?.seeAlso?.map((item) => item.href)).toEqual([
      "/errors/claude-temperature-is-deprecated-for-this-model/",
      "/errors/claude-sonnet-5-5-top-p-top-k/",
      "https://platform.claude.com/docs/en/api/versioning",
    ]);
    expect(requestErrors.filter((page) => page.errorQuoted).length).toBeGreaterThanOrEqual(8);
    const openaiTemperature = requestErrors.find((page) => page.slug === "openai-temperature-is-not-supported-with-this-model");
    expect(openaiTemperature?.checked).toBe("2026-10-24");
    expect(openaiTemperature?.errorQuoted).toBe(true);
    expect(openaiTemperature?.errorText).toBe("Unsupported parameter: 'temperature' is not supported with this model.");
    expect(openaiTemperature?.rule).toContain("Unsupported parameter: 'top_p' is not supported with this model.");
    expect(openaiTemperature?.quoteSourceUrl).toBe("https://github.com/neondatabase/neon-pkgs/issues/937");
    const geminiNewUsers = requestErrors.find((page) => page.slug === "gemini-2-5-flash-no-longer-available-to-new-users");
    expect(geminiNewUsers?.errorText).toBe("models/gemini-2.5-flash is no longer available to new users");
    expect(geminiNewUsers?.models.map((item) => item.id)).toContain("gemini-2.5-flash");
    expect(requestErrors.find((page) => page.slug === "gemini-model-no-longer-available")?.models.some((item) => item.id === "gemini-2.5-flash")).toBe(false);
    const azureGone = requestErrors.find((page) => page.slug === "azure-openai-retired-model-410-gone");
    expect(azureGone?.errorQuoted).toBe(false);
    expect(azureGone?.errorText).toContain("410 Gone");
    expect(azureGone?.models.map((item) => item.id)).toContain("o1-2024-12-17");
    expect(azureGone?.models.map((item) => item.id)).toContain("o4-mini-2025-04-16");
    expect(azureGone?.rule).toContain("2027-11-19");
    const deepseekMissing = requestErrors.find((page) => page.slug === "deepseek-model-not-found");
    expect(deepseekMissing?.checked).toBe("2026-10-25");
    expect(deepseekMissing?.errorQuoted).toBe(true);
    expect(deepseekMissing?.errorText).toBe(
      '{"error":{"message":"Model Not Exist","type":"invalid_request_error","param":null,"code":"invalid_request_error"}}',
    );
    expect(deepseekMissing?.quoteSourceUrl).toBe("https://github.com/NoFxAiOS/nofx/issues/912");
    expect(deepseekMissing?.models.map((item) => item.id)).toEqual([
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-v4-flash",
      "deepseek-flash",
      "deepseek-v4-pro",
    ]);
    expect(deepseekMissing?.rule).toContain("2026-07-24");
    expect(deepseekMissing?.rule).toContain("does not print model_not_found");
    expect(JSON.stringify(deepseekMissing)).not.toContain("sk-");
    const solTools = requestErrors.find((page) => page.slug === "gpt-6-1-sol-function-tools-chat-completions");
    expect(solTools?.checked).toBe("2026-10-25");
    expect(solTools?.errorQuoted).toBe(true);
    expect(solTools?.errorText).toBe(
      "Function tools with reasoning_effort are not supported for gpt-6.1-sol in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.",
    );
    expect(solTools?.quoteSourceUrl).toBe("https://github.com/langflow-ai/openrag/issues/2534");
    expect(solTools?.models.map((item) => item.id)).toEqual(["gpt-6.1-sol", "gpt-6-astra"]);
    expect(solTools?.rule).toContain("Chat Completions is supported without tool calling");
    expect(solTools?.rule).toContain("gpt-6-astra");
    expect(solTools?.fixes[0]?.samples.map((sample) => sample.caption)).toEqual([
      "Before, Python",
      "After, Python",
      "Before, Node",
      "After, Node",
    ]);
    expect(solTools?.seeAlso?.map((item) => item.href)).toContain("/errors/gpt-6-luna-function-tools-reasoning-effort/");
    expect(solTools?.seeAlso?.map((item) => item.href)).toContain("/guides/move-function-calling-to-responses-api/");
    const lunaTools = requestErrors.find((page) => page.slug === "gpt-6-luna-function-tools-reasoning-effort");
    expect(lunaTools?.seeAlso?.map((item) => item.href)).toContain("/errors/gpt-6-1-sol-function-tools-chat-completions/");
    const userField = requestErrors.find((page) => page.slug === "openai-user-parameter-deprecated");
    expect(userField?.checked).toBe("2026-10-26");
    expect(userField?.errorQuoted).toBe(true);
    expect(userField?.errorText).toBe(
      "This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations.",
    );
    expect(userField?.quoteSourceUrl).toBe(
      "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create/",
    );
    expect(userField?.rule).toContain("maximum length of 64 characters");
    expect(userField?.rule).toContain("maximum length is 128 characters");
    expect(userField?.rule).toContain("does not list the user field");
    expect(userField?.models.map((item) => item.id)).toEqual(["gpt-5.5"]);
    expect(userField?.guides).toEqual([]);
    expect(JSON.stringify(userField)).not.toContain("sk-");
    expect(JSON.stringify(userField)).not.toContain("api_key");
    expect(JSON.stringify(userField)).not.toContain("Bearer");
    const cloudflareGone = requestErrors.find((page) => page.slug === "cloudflare-workers-ai-model-deprecated-410");
    expect(cloudflareGone?.checked).toBe("2026-10-31");
    expect(cloudflareGone?.errorQuoted).toBe(true);
    expect(cloudflareGone?.errorText).toBe(
      '{"success":false,"errors":[{"code":5028,"message":"AiError: Model has been deprecated"}],"messages":[],"result":null}',
    );
    expect(cloudflareGone?.quoteSourceUrl).toBe("https://github.com/lichengiggs/free-proxy/issues/30");
    expect(cloudflareGone?.rule).toContain("does not list internal code 5028 or HTTP 410");
    expect(cloudflareGone?.rule).toContain("AiError: 5028: This model was deprecated on 2026-05-30. Please use an alternative model");
    expect(cloudflareGone?.citations).toContain("https://developers.cloudflare.com/workers-ai/features/json-mode/");
    expect(cloudflareGone?.rule).toContain("JSON Mode page");
    expect(cloudflareGone?.models.map((item) => item.id)).toContain("@cf/meta/llama-3.1-8b-instruct");
    expect(cloudflareGone?.models.map((item) => item.id)).toContain("@cf/moonshotai/kimi-k2.5");
    expect(cloudflareGone?.models.find((item) => item.id === "@cf/meta/llama-3.1-8b-instruct")?.note).toContain("does not print a replacement");
    expect(cloudflareGone?.shutdowns).toEqual([{ provider: "cloudflare-workers-ai", date: "2026-05-30" }]);
    expect(JSON.stringify(cloudflareGone)).not.toContain("sk-");
    expect(JSON.stringify(cloudflareGone)).not.toContain("Bearer");
  });
});
