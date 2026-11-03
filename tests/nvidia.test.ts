import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMigration } from "../scrapers/migrations.ts";
import { modelSchema } from "../src/schema.ts";
import { guideBySlug } from "../src/lib/guides.ts";
import { loadModels } from "../src/lib/load.ts";
import { requestErrorBySlug } from "../src/lib/request-errors.ts";

const ENTERPRISE = "https://docs.nvidia.com/ai-enterprise/lifecycle/latest/eol-notices.html";
const BANNER = "This NIM Endpoint has been deprecated | Please transition to another model to avoid any service interruptions.";

describe("NVIDIA hosted models", () => {
  it("stores only sourced rows and does not copy the NIM container calendar", async () => {
    const models = (await loadModels()).filter((model) => model.provider === "nvidia");
    expect(models).toHaveLength(25);
    for (const model of models) {
      expect(model.sources.length).toBeGreaterThan(0);
      for (const source of model.sources) {
        expect(source.url === ENTERPRISE).toBe(false);
        const host = new URL(source.url).hostname;
        expect(host === "build.nvidia.com" || host === "github.com").toBe(true);
        if (host === "github.com") expect(source.url).toContain("/NVIDIA/");
      }
    }
    const banner = models.filter((model) => model.sources.some((source) => source.excerpt === BANNER));
    expect(banner.length).toBe(19);
    for (const model of banner) {
      expect(model.status).toBe("deprecated");
      expect(model.shutdown_date).toBeNull();
      expect(model.shutdown_date_kind).toBe("none");
      expect(model.replacements).toEqual([]);
    }

    const kimi = models.find((model) => model.id === "moonshotai/kimi-k2.5");
    expect(kimi?.status).toBe("retired");
    expect(kimi?.shutdown_date).toBe("2026-05-20");
    expect(kimi?.announced_date).toBe("2026-04-20");
    expect(kimi?.replacements).toEqual([
      {
        model_id: "moonshotai/kimi-k2.6",
        provider: "nvidia",
        kind: "official",
        source_url: "https://github.com/NVIDIA/NemoClaw/issues/2120",
      },
    ]);
    const kimiNext = models.find((model) => model.id === "moonshotai/kimi-k2.6");
    expect(kimiNext?.status).toBe("active");
    expect(kimiNext?.shutdown_date).toBeNull();

    const glm = models.find((model) => model.id === "z-ai/glm5");
    expect(glm?.shutdown_date).toBe("2026-05-09");
    expect(glm?.replacements[0]?.model_id).toBe("z-ai/glm-5.1");
    expect(models.find((model) => model.id === "z-ai/glm-5.1")?.shutdown_date).toBeNull();

    for (const id of ["minimaxai/minimax-m2.7", "qwen/qwen3.5-397b-a17b"]) {
      const row = models.find((model) => model.id === id);
      expect(row?.status).toBe("retired");
      expect(row?.shutdown_date).toBeNull();
      expect(row?.replacements).toEqual([]);
    }

    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("if (!scrapedProviders.has(old.provider)) models.push(old);");
    expect(run).not.toContain('["nvidia"');
  });

  it("builds a hosted chat migration that only changes the model field", async () => {
    const models = (await loadModels()).filter((model) => model.provider === "nvidia");
    const from = models.find((model) => model.id === "moonshotai/kimi-k2.5");
    const to = models.find((model) => model.id === "moonshotai/kimi-k2.6");
    expect(from && to).toBeTruthy();
    if (!from || !to) return;
    const migration = buildMigration(from, to, "2026-10-27");
    expect(migration.code_change.snippets.curl.before).toContain("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(migration.code_change.snippets.curl.before).toContain("moonshotai/kimi-k2.5");
    expect(migration.code_change.snippets.curl.after).toContain("moonshotai/kimi-k2.6");
    expect(migration.code_change.snippets.curl.after).not.toContain("moonshotai/kimi-k2.5");
    expect(migration.code_change.snippets.python.after).toContain('base_url="https://integrate.api.nvidia.com/v1"');
    expect(migration.api_changes[0]?.source_url).toBe("https://build.nvidia.com/nvidia/nemotron-4-340b-reward");
    expect(JSON.stringify(migration)).not.toMatch(/[—–]/);
  });

  it("quotes the hosted 410 only from the public log", () => {
    const page = requestErrorBySlug("nvidia-hosted-model-410-gone");
    expect(page?.errorQuoted).toBe(true);
    expect(page?.checked).toBe("2026-10-27");
    expect(page?.errorText).toBe(
      "410 Gone: The model 'openai/gpt-oss-120b' has reached its end of life on 2026-09-03T08:00:00Z and is no longer available.",
    );
    expect(page?.quoteSourceUrl).toBe("https://github.com/Lee-Dongwook/E2E-Self-Heal/issues/402");
    expect(page?.rule).toContain("2026-08-25T09:00:00Z");
    expect(page?.rule).toContain("does not print that timestamp");
    expect(page?.rule).not.toContain("sk-");
    const guide = guideBySlug("nvidia-hosted-api-vs-nim-containers");
    expect(guide?.checked).toBe("2026-10-27");
    expect(guide?.citations).toContain(ENTERPRISE);
    expect(JSON.stringify(guide)).not.toContain("eol-notices.html#");
  });
});

describe("NVIDIA records match the schema", () => {
  it("parses every stored file", async () => {
    const models = (await loadModels()).filter((model) => model.provider === "nvidia");
    for (const model of models) expect(modelSchema.parse(model)).toBeTruthy();
  });
});
