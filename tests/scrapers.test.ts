import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAnthropic } from "../scrapers/anthropic.ts";
import { parseAzure } from "../scrapers/azure-openai.ts";
import { parseBedrock } from "../scrapers/aws-bedrock.ts";
import { parseGemini } from "../scrapers/google-gemini-api.ts";
import { parseMistral } from "../scrapers/mistral.ts";
import { parseOpenAI } from "../scrapers/openai.ts";
import { parseVertex } from "../scrapers/google-vertex.ts";
import { sanityCheck } from "../scrapers/sanity.ts";
import { parseDate } from "../scrapers/lib/dates.ts";
import {
  parseAnthropicModelDoc,
  parseGeminiModelDocs,
  parseMistralModelDoc,
  parseOpenAIModelDoc,
  parseVertexModelDoc,
  parseVertexPricing,
} from "../scrapers/docs.ts";

const checked = "2026-10-17";
const read = (file: string) => readFileSync(file, "utf8");

describe("official snapshots", () => {
  it("parses OpenAI shutdown tables", () => {
    const models = parseOpenAI(read("snapshots/openai/2026-10-17.html"), read("snapshots/openai/pricing-2026-10-17.md"), checked);
    expect(models.length).toBeGreaterThan(40);
    const gpt = models.find((model) => model.id === "gpt-4o-2024-08-06");
    expect(gpt?.shutdown_date).toBe("2027-01-14");
    expect(gpt?.replacements[0]?.model_id).toBe("gpt-6-luna");
    expect(gpt?.sources[0]?.last_checked).toBe(checked);
    expect(models.find((model) => model.id === "gpt-4")?.display_name).toBe("gpt-4");
  });

  it("parses Anthropic status and not-sooner-than dates", () => {
    const models = parseAnthropic(read("snapshots/anthropic/2026-10-17.html"), read("snapshots/anthropic/pricing-2026-10-17.html"), checked);
    expect(models.length).toBeGreaterThan(15);
    const sonnet = models.find((model) => model.id === "claude-sonnet-4-5-20250929");
    expect(sonnet?.status).toBe("deprecated");
    expect(sonnet?.shutdown_date).toBe("2026-11-30");
    expect(sonnet?.replacements[0]?.model_id).toBe("claude-sonnet-5-5");
    expect(sonnet?.specs.input_price_per_mtok).toBe(3);
    const fable = models.find((model) => model.id === "claude-fable-5-1");
    expect(fable?.status).toBe("active");
    expect(fable?.shutdown_date_kind).toBe("not_before");
    expect(fable?.shutdown_date).toBe("2027-09-01");
  });

  it("parses Gemini, Vertex, Bedrock, Azure, and Mistral", () => {
    const gemini = parseGemini(read("snapshots/google-gemini-api/2026-10-17.html"), read("snapshots/google-gemini-api/pricing-2026-10-17.html"), checked);
    expect(gemini.find((model) => model.id === "gemini-2.0-flash")?.shutdown_date).toBe("2026-06-01");
    const vertex = parseVertex(read("snapshots/google-vertex/2026-10-17.html"), checked);
    expect(vertex.find((model) => model.id === "gemini-2.5-pro")?.shutdown_date).toBe("2026-10-20");
    const vertexNow = parseVertex(read("snapshots/google-vertex/2026-10-19.html"), "2026-10-19");
    expect(vertexNow.find((model) => model.id === "gemini-2.5-pro")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash",
    ]);
    expect(vertexNow.find((model) => model.id === "gemini-2.5-flash")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
    expect(vertexNow.find((model) => model.id === "gemini-2.5-flash-lite")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
    ]);
    const geminiNow = parseGemini(read("snapshots/google-gemini-api/2026-10-19.html"), "", "2026-10-19");
    for (const id of ["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview", "veo-3.1-lite-generate-preview"]) {
      expect(geminiNow.find((model) => model.id === id)?.replacements.map((item) => item.model_id)).toEqual(["gemini-omni-1.1-flash"]);
    }
    const bedrock = parseBedrock(read("snapshots/aws-bedrock/2026-10-17-legacy.html"), checked);
    const jamba = bedrock.find((model) => model.id === "ai21.jamba-1-5-large-v1:0");
    expect(jamba?.deprecation_date).toBe("2026-05-26");
    expect(jamba?.shutdown_date).toBe("2026-11-26");
    const haiku = bedrock.filter((model) => model.id === "anthropic.claude-3-haiku-20240307-v1:0");
    const haikuNov = haiku.find((model) => model.shutdown_date === "2026-11-13");
    const haikuSep = haiku.find((model) => model.shutdown_date === "2026-09-10");
    expect(haikuNov?.region_or_platform_notes).toContain("eu-central-2");
    expect(haikuNov?.region_or_platform_notes).toContain("sa-east-1");
    expect(haikuNov?.region_or_platform_notes).toContain("ca-central-1");
    expect(haikuSep?.region_or_platform_notes).toContain("us-east-1");
    expect(haikuSep?.region_or_platform_notes).toContain("us-west-2");
    expect(haikuSep?.region_or_platform_notes).toContain("us-gov-east-1");
    const sonnet3 = bedrock.find((model) => model.id === "anthropic.claude-3-sonnet-20240229-v1:0" && model.shutdown_date === "2026-11-13");
    expect(sonnet3?.region_or_platform_notes).toContain("sa-east-1");
    expect(sonnet3?.region_or_platform_notes).toContain("ca-central-1");
    expect(bedrock.some((model) => /\s/.test(model.id) || model.id.includes("("))).toBe(false);
    const deepseek = bedrock.filter((model) => model.id === "deepseek.v3-v1:0" || model.id === "deepseek.v3.1");
    expect(deepseek.map((model) => model.id).sort()).toEqual(["deepseek.v3-v1:0", "deepseek.v3.1"]);
    expect(deepseek.every((model) => model.shutdown_date === "2027-03-30" && model.deprecation_date === "2026-09-30")).toBe(true);
    expect(deepseek.find((model) => model.id === "deepseek.v3-v1:0")?.region_or_platform_notes).toContain("bedrock-runtime");
    expect(deepseek.find((model) => model.id === "deepseek.v3.1")?.region_or_platform_notes).toContain("bedrock-mantle");
    expect(bedrock.map((model) => model.id)).toEqual(
      expect.arrayContaining([
        "moonshot.kimi-k2-thinking",
        "moonshotai.kimi-k2-thinking",
        "qwen.qwen3-coder-30b-a3b-v1:0",
        "qwen.qwen3-coder-30b-a3b-instruct",
        "qwen.qwen3-coder-480b-a35b-v1:0",
        "qwen.qwen3-coder-480b-a35b-instruct",
      ]),
    );
    const azure = parseAzure(read("snapshots/azure-openai/2026-10-17-schedule.html"), read("snapshots/azure-openai/2026-10-17.html"), checked);
    expect(azure.find((model) => model.id === "codex-mini-2025-05-16")?.shutdown_date).toBe("2026-11-15");
    const mistral = parseMistral(read("snapshots/mistral/2026-10-17.html"), read("snapshots/mistral/pricing-2026-10-17.html"), checked);
    const medium = mistral.find((model) => model.id === "mistral-medium-2508");
    expect(medium?.deprecation_date).toBe("2026-05-22");
    expect(medium?.shutdown_date).toBe("2026-08-31");
  });
});

describe("sanity gate", () => {
  it("does not accept an empty scrape", () => {
    expect(sanityCheck("openai", 0, 100).ok).toBe(false);
  });
  it("does not accept a drop of more than 30 percent", () => {
    expect(sanityCheck("openai", 60, 100).ok).toBe(false);
    expect(sanityCheck("openai", 70, 100).ok).toBe(true);
  });
});

describe("official model docs", () => {
  it("reads OpenAI price, context, and max output from the model page", () => {
    const spec = parseOpenAIModelDoc(read("snapshots/openai/model-gpt-4o-2026-10-17.md"));
    expect(spec?.ids).toEqual(["gpt-4o"]);
    expect(spec?.context).toBe(128000);
    expect(spec?.maxOutput).toBe(16384);
    expect(spec?.input).toBe(2.5);
    expect(spec?.output).toBe(10);
    expect(spec?.cached).toBe(1.25);
    expect(spec?.limitIds).toContain("gpt-4o-2024-08-06");
  });

  it("reads Anthropic specs from the model overview", () => {
    const spec = parseAnthropicModelDoc(read("snapshots/anthropic/model-sonnet-5-5-2026-10-17.md"));
    expect(spec?.ids).toContain("claude-sonnet-5-5");
    expect(spec?.context).toBe(1_000_000);
    expect(spec?.maxOutput).toBe(128_000);
    expect(spec?.input).toBe(2);
    expect(spec?.output).toBe(10);
    expect(spec?.cached).toBe(0.1);
  });

  it("reads Gemini token limits from the model table", () => {
    const specs = parseGeminiModelDocs(read("snapshots/google-gemini-api/model-gemini-2-5-flash-2026-10-17.html"));
    expect(specs[0]?.ids).toEqual(["gemini-2.5-flash"]);
    expect(specs[0]?.context).toBe(1_048_576);
    expect(specs[0]?.maxOutput).toBe(65_536);
  });

  it("reads Vertex token limits and the standard price tier", () => {
    const doc = parseVertexModelDoc(read("snapshots/google-vertex/model-gemini-2-5-pro-2026-10-17.html"));
    expect(doc?.id).toBe("gemini-2.5-pro");
    expect(doc?.title).toBe("Gemini 2.5 Pro");
    expect(doc?.context).toBe(1_048_576);
    expect(doc?.maxOutput).toBe(65_536);
    const prices = parseVertexPricing(read("snapshots/google-vertex/pricing-sample-2026-10-17.html"));
    expect(prices.get("gemini 2.5 pro")?.input).toBe(1.25);
    expect(prices.get("gemini 2.5 pro")?.output).toBe(10);
    expect(prices.get("gemini 2.5 pro")?.cached).toBe(0.125);
  });

  it("reads a labeled Mistral context window and does not invent a price", () => {
    const doc = parseMistralModelDoc(read("snapshots/mistral/model-card-snippet-2026-10-17.html"));
    expect(doc?.id).toBe("mistral-medium-3-5");
    expect(doc?.context).toBe(256_000);
  });

  it("reads context when the Context label is the span text", () => {
    const html = `<button title="Click to copy: mistral-medium-2508">mistral-medium-2508</button><span class="uppercase">Context</span><div class="text-lg font-bold font-mono text-primary-soft">128k</div><span class="text-primary-soft">$1.5</span>`;
    const doc = parseMistralModelDoc(html);
    expect(doc?.id).toBe("mistral-medium-2508");
    expect(doc?.context).toBe(128_000);
  });
});

describe("dates", () => {
  it("parses provider date styles", () => {
    expect(parseDate("January 14, 2027")).toEqual({ date: "2027-01-14", kind: "exact" });
    expect(parseDate("Not sooner than September 1, 2027").kind).toBe("not_before");
    expect(parseDate("August 2026").kind).toBe("month_only");
    expect(parseDate("No shutdown date announced").kind).toBe("none");
  });
});
