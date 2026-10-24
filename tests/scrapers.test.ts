import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { newestRollingName, snapshotsToPrune } from "../scrapers/lib/fetch.ts";
import { parseAnthropic } from "../scrapers/anthropic.ts";
import { parseAzure } from "../scrapers/azure-openai.ts";
import { parseBedrock } from "../scrapers/aws-bedrock.ts";
import { DEPRECATIONS_URL, parseGemini } from "../scrapers/google-gemini-api.ts";
import { parseMistral } from "../scrapers/mistral.ts";
import { parseOpenAI } from "../scrapers/openai.ts";
import { parseVertex } from "../scrapers/google-vertex.ts";
import { sanityCheck } from "../scrapers/sanity.ts";
import { parseDate } from "../scrapers/lib/dates.ts";
import { isModelId, loadHtml } from "../scrapers/lib/html.ts";
import {
  parseAnthropicModelDoc,
  parseGeminiModelDocs,
  parseMistralModelDoc,
  parseOpenAIModelDoc,
  parseVertexModelDoc,
  parseVertexPricing,
} from "../scrapers/docs.ts";

function vertexReplacementIds(html: string, modelId: string): string[] {
  const $ = loadHtml(html);
  let ids: string[] = [];
  $("table").each((_, table) => {
    const header = $(table)
      .find("tr")
      .first()
      .find("th, td")
      .map((__, cell) => $(cell).text().toLowerCase())
      .get();
    const idIdx = header.findIndex((cell) => cell.includes("model id"));
    const replaceIdx = header.findIndex((cell) => cell.includes("replacement") || cell.includes("upgrade"));
    if (idIdx < 0 || replaceIdx < 0) return;
    $(table)
      .find("tr")
      .slice(1)
      .each((__, tr) => {
        const cells = $(tr).find("th, td").toArray();
        const id = $(cells[idIdx]).find("code").first().text().trim();
        if (id !== modelId) return;
        ids = $(cells[replaceIdx])
          .find("code")
          .map((___, node) => $(node).text().trim())
          .get()
          .filter(isModelId);
      });
  });
  return ids;
}

const checked = "2026-10-17";
const read = (file: string) => readFileSync(file, "utf8");
const fixture = (provider: string, file: string) => `snapshots/fixtures/${provider}/${file}`;

function newestSnapshot(provider: string, suffix = ""): string {
  const dir = `snapshots/${provider}`;
  const name = newestRollingName(readdirSync(dir), suffix);
  if (!name) throw new Error(`No dated snapshot in ${dir}`);
  return `${dir}/${name}`;
}

describe("official snapshots", () => {
  it("parses OpenAI shutdown tables", () => {
    const models = parseOpenAI(read(fixture("openai", "2026-10-17.html")), read(fixture("openai", "pricing-2026-10-17.md")), checked);
    expect(models.length).toBeGreaterThan(40);
    const gpt = models.find((model) => model.id === "gpt-4o-2024-08-06");
    expect(gpt?.shutdown_date).toBe("2027-01-14");
    expect(gpt?.replacements[0]?.model_id).toBe("gpt-6-luna");
    expect(gpt?.sources[0]?.last_checked).toBe(checked);
    expect(models.find((model) => model.id === "gpt-4")?.display_name).toBe("gpt-4");
  });

  it("parses Anthropic status and not-sooner-than dates", () => {
    const models = parseAnthropic(read(fixture("anthropic", "2026-10-17.html")), read(fixture("anthropic", "pricing-2026-10-17.html")), checked);
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
    const gemini = parseGemini(read(fixture("google-gemini-api", "2026-10-17.html")), read(fixture("google-gemini-api", "pricing-2026-10-17.html")), checked);
    expect(gemini.find((model) => model.id === "gemini-2.0-flash")?.shutdown_date).toBe("2026-06-01");
    const vertex = parseVertex(read(fixture("google-vertex", "2026-10-17.html")), checked);
    expect(vertex.find((model) => model.id === "gemini-2.5-pro")?.shutdown_date).toBe("2026-10-20");
    const vertexFile = newestSnapshot("google-vertex");
    const vertexHtml = read(vertexFile);
    const vertexNow = parseVertex(vertexHtml, vertexFile.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? checked);
    // The refresh keeps the newest dated Vertex page and deletes older ones.
    // This reads that newest page. The code tags are the official ids.
    // A shorter Google list still matches, and a parser that drops one of those tags does not.
    for (const id of ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]) {
      const model = vertexNow.find((item) => item.id === id);
      expect(model?.replacements.map((item) => item.model_id)).toEqual(vertexReplacementIds(vertexHtml, id));
      expect(model?.replacements.every((item) => item.kind === "official" && item.provider === "google-vertex")).toBe(true);
    }
    const geminiNow = parseGemini(read(fixture("google-gemini-api", "2026-10-19.html")), "", "2026-10-19");
    for (const id of ["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview", "veo-3.1-lite-generate-preview"]) {
      expect(geminiNow.find((model) => model.id === id)?.replacements.map((item) => item.model_id)).toEqual(["gemini-omni-1.1-flash"]);
    }
    const bedrock = parseBedrock(read(fixture("aws-bedrock", "2026-10-17-legacy.html")), checked);
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
    for (const id of [
      "anthropic.claude-3-5-sonnet-20240620-v1:0",
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "anthropic.claude-3-7-sonnet-20250219-v1:0",
    ]) {
      expect(bedrock.find((model) => model.id === id)?.region_or_platform_notes).toContain("legacy 2026-10-10");
    }
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
    const azure = parseAzure(read(fixture("azure-openai", "2026-10-17-schedule.html")), read(fixture("azure-openai", "2026-10-17.html")), checked);
    expect(azure.find((model) => model.id === "codex-mini-2025-05-16")?.shutdown_date).toBe("2026-11-15");
    const mistral = parseMistral(read(fixture("mistral", "2026-10-17.html")), read(fixture("mistral", "pricing-2026-10-17.html")), checked);
    const medium = mistral.find((model) => model.id === "mistral-medium-2508");
    expect(medium?.deprecation_date).toBe("2026-05-22");
    expect(medium?.shutdown_date).toBe("2026-08-31");
  });

  it("fills a replacement when a deprecations cell says requests auto-route", () => {
    const models = parseGemini(read(fixture("google-gemini-api", "2026-10-17.html")), "", checked);
    const flash37 = models.find((model) => model.id === "gemini-3.7-flash");
    const flash35 = models.find((model) => model.id === "gemini-3.5-flash");
    expect(flash37?.status).toBe("deprecated");
    expect(flash37?.shutdown_date).toBeNull();
    expect(flash37?.shutdown_date_kind).toBe("none");
    expect(flash37?.replacements).toEqual([
      { model_id: "gemini-3.8-flash", provider: "google-gemini-api", kind: "official", source_url: DEPRECATIONS_URL },
    ]);
    expect(flash37?.region_or_platform_notes).toBe(
      "Release date on the deprecations page: 2026-08-13. Deprecated, requests auto-routed to gemini-3.8-flash, no shutdown date.",
    );
    expect(flash35?.status).toBe("deprecated");
    expect(flash35?.replacements.map((item) => item.model_id)).toEqual(["gemini-3.6-flash"]);
    expect(flash35?.region_or_platform_notes).toContain("requests auto-routed to gemini-3.6-flash");
    expect(models.find((model) => model.id === "gemini-3.8-flash")?.status).toBe("active");
    expect(models.find((model) => model.id === "gemini-3.8-flash")?.replacements).toEqual([]);
    expect(models.find((model) => model.id === "gemini-3.6-flash")?.replacements).toEqual([]);
    expect(models.find((model) => model.id === "gemini-3.1-flash-lite")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.5-flash-lite",
    ]);
    const madeUp = `
      <table>
        <tr><th>Model</th><th>Release date</th><th>Shutdown date</th><th>Recommended replacement</th></tr>
        <tr>
          <td><code>example-old-1</code></td>
          <td>January 2, 2026</td>
          <td>N/A</td>
          <td><code>example-new-9</code> (the endpoint is not shutting down and auto-routes to <code>example-new-9</code>)</td>
        </tr>
        <tr>
          <td><code>example-dated-2</code></td>
          <td>January 2, 2026</td>
          <td>June 1, 2026</td>
          <td>example-keep-3 (automatically routes API requests to example-keep-3)</td>
        </tr>
      </table>`;
    const parsed = parseGemini(madeUp, "", "2026-10-22");
    expect(parsed.find((model) => model.id === "example-old-1")?.status).toBe("deprecated");
    expect(parsed.find((model) => model.id === "example-old-1")?.replacements.map((item) => item.model_id)).toEqual(["example-new-9"]);
    expect(parsed.find((model) => model.id === "example-old-1")?.region_or_platform_notes).toContain(
      "requests auto-routed to example-new-9",
    );
    const dated = parsed.find((model) => model.id === "example-dated-2");
    expect(dated?.status).toBe("retired");
    expect(dated?.replacements.map((item) => item.model_id)).toEqual(["example-keep-3"]);
    expect(dated?.region_or_platform_notes).not.toContain("no shutdown date");
    const live = parseGemini(read(newestSnapshot("google-gemini-api")), "", "2026-10-22");
    for (const [id, slug] of [
      ["gemini-3.7-flash", "gemini-3-7-flash"],
      ["gemini-3.5-flash", "gemini-3-5-flash"],
    ] as const) {
      const parsed = live.find((model) => model.id === id);
      const stored = JSON.parse(read(`data/models/google-gemini-api/${slug}.json`)) as {
        status: string;
        replacements: { model_id: string; kind: string }[];
        region_or_platform_notes: string;
        shutdown_date: string | null;
      };
      expect(stored.status).toBe(parsed?.status);
      expect(stored.shutdown_date).toBe(parsed?.shutdown_date ?? null);
      expect(stored.replacements).toEqual(parsed?.replacements);
      expect(stored.region_or_platform_notes).toBe(parsed?.region_or_platform_notes);
      expect(stored.status).not.toBe("active");
    }
  });

  it("keeps the last Vertex replacement id and skips a name that is not an id", () => {
    const html = `
      <h2>Latest available models</h2>
      <table>
        <tr><th>Model ID</th><th>Release date</th><th>Retirement date</th><th>Replacement model ID</th></tr>
        <tr>
          <td><code>gemini-2.5-flash</code></td>
          <td>June 17, 2025</td>
          <td>October 20, 2026</td>
          <td><code>gemini-3.8-flash</code> or <code>gemini-3.5-flash-lite</code> or <code>gemini-3.1-flash-lite</code></td>
        </tr>
        <tr>
          <td><code>gemini-2.5-flash-lite</code></td>
          <td>July 22, 2025</td>
          <td>October 20, 2026</td>
          <td><code>gemini-3.8-flash</code> or <code>gemini-3.5-flash-lite</code> or Gemma 4</td>
        </tr>
      </table>`;
    const models = parseVertex(html, "2026-10-19");
    expect(models.find((model) => model.id === "gemini-2.5-flash")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
    expect(models.find((model) => model.id === "gemini-2.5-flash-lite")?.replacements.map((item) => item.model_id)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
    ]);
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
    const spec = parseOpenAIModelDoc(read(fixture("openai", "model-gpt-4o-2026-10-17.md")));
    expect(spec?.ids).toEqual(["gpt-4o"]);
    expect(spec?.context).toBe(128000);
    expect(spec?.maxOutput).toBe(16384);
    expect(spec?.input).toBe(2.5);
    expect(spec?.output).toBe(10);
    expect(spec?.cached).toBe(1.25);
    expect(spec?.limitIds).toContain("gpt-4o-2024-08-06");
  });

  it("reads Anthropic specs from the model overview", () => {
    const spec = parseAnthropicModelDoc(read(fixture("anthropic", "model-sonnet-5-5-2026-10-17.md")));
    expect(spec?.ids).toContain("claude-sonnet-5-5");
    expect(spec?.context).toBe(1_000_000);
    expect(spec?.maxOutput).toBe(128_000);
    expect(spec?.input).toBe(2);
    expect(spec?.output).toBe(10);
    expect(spec?.cached).toBe(0.1);
  });

  it("reads Gemini token limits from the model table", () => {
    const specs = parseGeminiModelDocs(read(fixture("google-gemini-api", "model-gemini-2-5-flash-2026-10-17.html")));
    expect(specs[0]?.ids).toEqual(["gemini-2.5-flash"]);
    expect(specs[0]?.context).toBe(1_048_576);
    expect(specs[0]?.maxOutput).toBe(65_536);
  });

  it("reads Vertex token limits and the standard price tier", () => {
    const doc = parseVertexModelDoc(read(fixture("google-vertex", "model-gemini-2-5-pro-2026-10-17.html")));
    expect(doc?.id).toBe("gemini-2.5-pro");
    expect(doc?.title).toBe("Gemini 2.5 Pro");
    expect(doc?.context).toBe(1_048_576);
    expect(doc?.maxOutput).toBe(65_536);
    const prices = parseVertexPricing(read(fixture("google-vertex", "pricing-sample-2026-10-17.html")));
    expect(prices.get("gemini 2.5 pro")?.input).toBe(1.25);
    expect(prices.get("gemini 2.5 pro")?.output).toBe(10);
    expect(prices.get("gemini 2.5 pro")?.cached).toBe(0.125);
  });

  it("reads a labeled Mistral context window and does not invent a price", () => {
    const doc = parseMistralModelDoc(read(fixture("mistral", "model-card-snippet-2026-10-17.html")));
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

describe("snapshot retention", () => {
  it("deletes old dated scrape files and keeps fixture names", () => {
    const files = [
      "2026-10-17.html",
      "2026-10-18-pricing.html",
      "2026-10-18.html",
      "2026-10-19.html",
      "2026-10-20.html",
      "model-card-snippet-2026-10-17.html",
      "models-2026-10-17.html",
      "pricing-2026-10-17.html",
    ];
    expect(snapshotsToPrune(files, 3)).toEqual(["2026-10-17.html", "2026-10-18-pricing.html"]);
    expect(snapshotsToPrune(files, 3)).not.toContain("pricing-2026-10-17.html");
    expect(newestRollingName(files, "-pricing")).toBe("2026-10-18-pricing.html");
    expect(newestRollingName(files, "")).toBe("2026-10-20.html");
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
