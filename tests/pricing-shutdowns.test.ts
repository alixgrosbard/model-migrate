import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { newestRollingName } from "../scrapers/lib/fetch.ts";
import { DEPRECATIONS_URL, PRICING_URL, parseGemini, parseGeminiPricingShutdowns } from "../scrapers/google-gemini-api.ts";
import { CONFLICTS_PATH, SOURCES_DISAGREE } from "../src/lib/conflicts.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { modelSchema } from "../src/schema.ts";

const snippet = readFileSync("snapshots/fixtures/google-gemini-api/pricing-shutdown-warning-2026-10-23.html", "utf8");

const deprecations = `
<table>
  <tr><th>Model</th><th>Release date</th><th>Shutdown date</th><th>Recommended replacement</th></tr>
  <tr>
    <td>gemini-2.5-flash-image</td>
    <td>October 2, 2025</td>
    <td>March 15, 2027</td>
    <td>gemini-3.1-flash-lite-image</td>
  </tr>
  <tr>
    <td>veo-3.1-generate-preview</td>
    <td>October 15, 2025</td>
    <td>October 22, 2026</td>
    <td>gemini-omni-1.1-flash</td>
  </tr>
</table>`;

describe("Gemini pricing shutdown warnings", () => {
  it("reads the saved pricing-page warning, including when a tag splits deprecated", () => {
    expect(snippet.includes("is deprecated and will be shut down")).toBe(false);
    const warnings = parseGeminiPricingShutdowns(snippet);
    expect(warnings).toEqual([
      {
        id: "gemini-2.5-flash-image",
        date: "2026-10-02",
        dateText: "October 2, 2026",
        excerpt:
          "Warning: Gemini 2.5 Flash Image (gemini-2.5-flash-image) is deprecated and will be shut down on October 2, 2026; migrate to Gemini 3.1 Flash Image or Gemini 3.1 Flash Lite Image to avoid service disruption.",
      },
    ]);
    expect(warnings[0].excerpt.length).toBeLessThanOrEqual(300);
  });

  it("keeps the deprecations-page date and quotes both official dates when they differ", () => {
    const extra = `
      <aside class="warning">
        <b>Warning:</b> Veo 3.1 Preview (<code>veo-3.1-generate-preview</code>, <code>veo-3.1-fast-generate-preview</code>, and <code>veo-3.1-lite-generate-preview</code>) is <a href="/gemini-api/docs/deprecations">deprecated</a> and will be shut down on October 22, 2026; migrate to <code>gemini-omni-1.1-flash</code>.
      </aside>`;
    const warnings = parseGeminiPricingShutdowns(snippet + extra);
    expect(warnings.map((warning) => warning.id)).toEqual([
      "gemini-2.5-flash-image",
      "veo-3.1-generate-preview",
      "veo-3.1-fast-generate-preview",
      "veo-3.1-lite-generate-preview",
    ]);
    expect(warnings.some((warning) => warning.id === "gemini-omni-1.1-flash")).toBe(false);

    const models = parseGemini(deprecations, snippet + extra, "2026-10-23");
    const image = models.find((model) => model.id === "gemini-2.5-flash-image");
    expect(image?.shutdown_date).toBe("2027-03-15");
    expect(image?.shutdown_date_kind).toBe("exact");
    expect(image?.region_or_platform_notes).toContain("Release date on the deprecations page: 2025-10-02.");
    expect(image?.region_or_platform_notes).toContain("Sources disagree.");
    expect(image?.region_or_platform_notes).toContain("March 15, 2027");
    expect(image?.region_or_platform_notes).toContain("October 2, 2026");
    expect(image?.region_or_platform_notes).toContain(DEPRECATIONS_URL);
    expect(image?.region_or_platform_notes).toContain(PRICING_URL);
    expect(image?.region_or_platform_notes).toContain("shutdown_date stays the deprecations-page date");
    const pricingSource = image?.sources.find((source) => source.url === PRICING_URL);
    expect(pricingSource?.label).toBe("Gemini API pricing");
    expect(pricingSource?.excerpt).toContain("will be shut down on October 2, 2026");
    expect(pricingSource?.last_checked).toBe("2026-10-23");

    const veo = models.find((model) => model.id === "veo-3.1-generate-preview");
    expect(veo?.shutdown_date).toBe("2026-10-22");
    expect(veo?.region_or_platform_notes ?? "").not.toContain("Sources disagree.");
    expect(veo?.sources.some((source) => source.url === PRICING_URL)).toBe(true);
    expect(models.find((model) => model.id === "veo-3.1-fast-generate-preview")).toBeUndefined();
  });

  it("drops the disagreement note when the pricing warning date matches the deprecations page", () => {
    const aligned = snippet.replaceAll("October 2, 2026", "March 15, 2027");
    const image = parseGemini(deprecations, aligned, "2026-10-29").find((model) => model.id === "gemini-2.5-flash-image");
    expect(image?.shutdown_date).toBe("2027-03-15");
    expect(image?.region_or_platform_notes).toBe("Release date on the deprecations page: 2025-10-02.");
    expect(image?.region_or_platform_notes ?? "").not.toContain(SOURCES_DISAGREE);
    const pricingSource = image?.sources.find((source) => source.url === PRICING_URL);
    expect(pricingSource?.label).toBe("Gemini API pricing");
    expect(pricingSource?.excerpt).toContain("will be shut down on March 15, 2027");
  });

  it("stores the current pricing warning on gemini-2.5-flash-image and lists the conflicts page", () => {
    const stored = modelSchema.parse(
      JSON.parse(readFileSync("data/models/google-gemini-api/gemini-2-5-flash-image.json", "utf8")),
    );
    const deprecationsPage = newestGoogleSnapshot();
    const pricingPage = newestGoogleSnapshot("-pricing");
    const parsed = parseGemini(deprecationsPage, pricingPage, stored.sources[0]?.last_checked ?? "2026-10-29").find(
      (model) => model.id === "gemini-2.5-flash-image",
    );
    expect(parsed?.shutdown_date).toBeTruthy();
    expect(stored.shutdown_date).toBe(parsed?.shutdown_date);
    expect(stored.region_or_platform_notes).toBe(parsed?.region_or_platform_notes);
    const storedPricing = stored.sources.find((source) => source.url === PRICING_URL);
    const parsedPricing = parsed?.sources.find((source) => source.url === PRICING_URL);
    expect(storedPricing?.excerpt).toBe(parsedPricing?.excerpt);

    const warning = parseGeminiPricingShutdowns(pricingPage).find((item) => item.id === "gemini-2.5-flash-image");
    if (warning && warning.date !== stored.shutdown_date) {
      expect(stored.region_or_platform_notes).toContain(SOURCES_DISAGREE);
      expect(stored.region_or_platform_notes).toContain(warning.dateText);
      expect(stored.region_or_platform_notes).toContain(DEPRECATIONS_URL);
      expect(stored.region_or_platform_notes).toContain(PRICING_URL);
      expect(stored.region_or_platform_notes).toContain("shutdown_date stays the deprecations-page date");
    } else {
      expect(stored.region_or_platform_notes ?? "").not.toContain(SOURCES_DISAGREE);
    }
    if (warning) expect(storedPricing?.excerpt).toContain(warning.dateText);
    expect(stored.sources[0].url).toBe(DEPRECATIONS_URL);
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    expect(text).toContain(CONFLICTS_PATH);
    expect(llmsFull("https://sunsetdiff.com", [])).toContain(CONFLICTS_PATH);
  });
});

function newestGoogleSnapshot(suffix = ""): string {
  const dir = "snapshots/google-gemini-api";
  const name = newestRollingName(readdirSync(dir), suffix);
  if (!name) throw new Error(`No dated snapshot in ${dir} with suffix "${suffix}"`);
  return readFileSync(`${dir}/${name}`, "utf8");
}
