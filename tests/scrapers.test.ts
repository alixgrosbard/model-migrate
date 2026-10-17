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
    const bedrock = parseBedrock(read("snapshots/aws-bedrock/2026-10-17-legacy.html"), checked);
    const jamba = bedrock.find((model) => model.id === "ai21.jamba-1-5-large-v1:0");
    expect(jamba?.deprecation_date).toBe("2026-05-26");
    expect(jamba?.shutdown_date).toBe("2026-11-26");
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

describe("dates", () => {
  it("parses provider date styles", () => {
    expect(parseDate("January 14, 2027")).toEqual({ date: "2027-01-14", kind: "exact" });
    expect(parseDate("Not sooner than September 1, 2027").kind).toBe("not_before");
    expect(parseDate("August 2026").kind).toBe("month_only");
    expect(parseDate("No shutdown date announced").kind).toBe("none");
  });
});
