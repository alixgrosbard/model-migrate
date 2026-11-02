import { existsSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { describe, expect, it } from "vitest";
import { breakingChangesIndexGraph } from "../src/jsonld.ts";
import {
  BREAKING_CHANGES_CSV,
  BREAKING_CHANGES_CSV_HEADERS,
  BREAKING_CHANGES_JSON,
  BREAKING_CHANGES_PATH,
  breakingChangeHubFaqs,
  breakingChanges,
  breakingChangesChecked,
  breakingChangesCsv,
  breakingChangesDocument,
  breakingChangesForMigration,
  breakingChangesForModel,
} from "../src/lib/breaking-changes.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { requestErrors } from "../src/lib/request-errors.ts";

const OFFICIAL_HOSTS = [
  "platform.claude.com",
  "developers.openai.com",
  "ai.google.dev",
  "github.com",
];

describe("request breaking changes", () => {
  it("publishes one sourced rule per row", () => {
    expect(breakingChanges.length).toBeGreaterThanOrEqual(12);
    expect(new Set(breakingChanges.map((rule) => rule.id)).size).toBe(breakingChanges.length);
    const document = breakingChangesDocument();
    expect(document.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(document.publisher).toBe("SunsetDiff");
    expect(document.version).toBe(breakingChangesChecked());
    expect(document.rules).toBe(breakingChanges);
    const csv = breakingChangesCsv();
    expect(csv.startsWith(`${BREAKING_CHANGES_CSV_HEADERS.join(",")}\n`)).toBe(true);
    expect(csv.trim().split("\n")).toHaveLength(breakingChanges.length + 1);
    expect(JSON.stringify(breakingChanges)).not.toMatch(/[—–]/);

    for (const rule of breakingChanges) {
      expect(rule.old_setting.length).toBeGreaterThan(3);
      expect(rule.what_happens.length).toBeGreaterThan(20);
      expect(rule.fix.length).toBeGreaterThan(10);
      expect(rule.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.citations[0]).toBeTruthy();
      expect(rule.citations).toContain(rule.source_url);
      expect(rule.source_url.startsWith("https://")).toBe(true);
      const host = new URL(rule.source_url).host;
      expect(OFFICIAL_HOSTS).toContain(host);
      for (const citation of rule.citations) {
        expect(OFFICIAL_HOSTS).toContain(new URL(citation).host);
      }
      if (rule.quote_source_url) {
        expect(rule.error_text).toBeTruthy();
        expect(rule.citations).toContain(rule.quote_source_url);
      }
      if (rule.error_text) {
        expect(rule.error_page).toBeTruthy();
        const page = requestErrors.find((item) => `/errors/${item.slug}/` === rule.error_page);
        expect(page?.errorQuoted).toBe(true);
        expect(page?.errorText).toBe(rule.error_text);
      }
      if ((rule.scope ?? "model") === "api_version") {
        expect(rule.api_version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(rule.models).toEqual([]);
      } else {
        expect(rule.scope).toBeUndefined();
        expect(rule.api_version).toBeUndefined();
        expect(rule.models.some((model) => model.role === "rejects")).toBe(true);
      }
      for (const model of rule.models) {
        const file = nodePath.join("data/models", model.provider, `${model.slug}.json`);
        expect(existsSync(file), file).toBe(true);
        const record = JSON.parse(readFileSync(file, "utf8")) as { id: string; provider: string };
        expect(record.id).toBe(model.id);
        expect(record.provider).toBe(model.provider);
      }
      for (const migration of rule.migrations) {
        const pair = migration.href.split("/").filter(Boolean).at(-1);
        expect(existsSync(nodePath.join("data/migrations", `${pair}.json`)), migration.href).toBe(true);
        expect(breakingChangesForMigration(pair ?? "")).toContain(rule);
      }
    }
  });

  it("keeps unquoted rows free of invented sentences", () => {
    const topP = breakingChanges.find((rule) => rule.id === "anthropic-sonnet-5-5-top-p-top-k");
    expect(topP?.error_text).toBeNull();
    expect(topP?.what_happens).not.toContain("top_p is deprecated for this model");
    const speech = breakingChanges.find((rule) => rule.id === "openai-speech-to-realtime");
    expect(speech?.error_text).toBeNull();
    expect(speech?.what_happens).toContain("not a supported model for /v1/audio/speech");
    const live = breakingChanges.find((rule) => rule.id === "openai-file-transcription-to-realtime");
    expect(live?.error_text).toBeNull();
    expect(live?.old_setting).toContain("/v1/audio/transcriptions");
    const blob = JSON.stringify(breakingChanges);
    expect(blob).not.toContain("has been deprecated, learn more here");
    expect(blob).not.toContain("is no longer available");
  });

  it("shows rules on the switch and the models the source names", () => {
    const sonnet = breakingChangesForMigration("anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5");
    expect(sonnet.map((rule) => rule.id)).toContain("anthropic-sonnet-5-5-thinking-budget");
    expect(sonnet.map((rule) => rule.id)).toContain("anthropic-sonnet-5-5-tool-choice");
    const luna = breakingChangesForModel("openai", "gpt-6-luna");
    expect(luna.map((rule) => rule.id)).toEqual(["openai-gpt-6-luna-function-tools-reasoning-effort"]);
    expect(breakingChangesForModel("openai", "gpt-6.1-sol").map((rule) => rule.id)).toEqual([
      "openai-gpt-6-1-sol-function-tools-chat-completions",
    ]);
    expect(breakingChangesForModel("openai", "gpt-6-astra").map((rule) => rule.id)).toContain(
      "openai-gpt-6-1-sol-function-tools-chat-completions",
    );
    const from = breakingChangesForModel("openai", "gpt-4o-2024-08-06");
    expect(from.map((rule) => rule.id)).toContain("openai-gpt-6-luna-function-tools-reasoning-effort");
    expect(breakingChangesForModel("openai", "gpt-5.6-sol")).toEqual([]);
    expect(breakingChangesForModel("google-vertex", "gemini-4-argon").map((rule) => rule.id)).toEqual([
      "google-vertex-gemini-4-argon-thinking-budget",
    ]);
    const speech = breakingChangesForMigration("openai__tts-1__to__openai__gpt-realtime-2-1-mini");
    expect(speech.map((rule) => rule.id)).toEqual(["openai-speech-to-realtime"]);
    expect(breakingChangesForMigration("openai__whisper-1__to__openai__gpt-transcribe")).toEqual([]);
  });

  it("lists the hub and files in llms.txt, lastmod, and JSON-LD", () => {
    const text = llmsTxt("https://sunsetdiff.com", [], []);
    const full = llmsFull("https://sunsetdiff.com", []);
    expect(text).toContain(BREAKING_CHANGES_PATH);
    expect(text).toContain(BREAKING_CHANGES_JSON);
    expect(text).toContain(BREAKING_CHANGES_CSV);
    expect(full).toContain(BREAKING_CHANGES_JSON);
    expect(full).toContain(BREAKING_CHANGES_CSV);
    expect(lastmodForUrl(`https://sunsetdiff.com${BREAKING_CHANGES_PATH}`)).toBe("2026-10-25");
    expect(lastmodForUrl(`https://sunsetdiff.com${BREAKING_CHANGES_JSON}`)).toBe("2026-10-25");
    const graph = breakingChangesIndexGraph("https://sunsetdiff.com/", breakingChanges.map((rule) => ({
      name: rule.old_setting,
      path: `${BREAKING_CHANGES_PATH}#${rule.id}`,
    })), breakingChangeHubFaqs);
    expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "ItemList", "Dataset", "FAQPage"]);
    const list = graph[1] as { numberOfItems: number };
    expect(list.numberOfItems).toBe(breakingChanges.length);
    const dataset = graph[2] as { license: string; distribution: { contentUrl: string }[] };
    expect(dataset.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(dataset.distribution.map((item) => item.contentUrl)).toEqual([
      `https://sunsetdiff.com${BREAKING_CHANGES_JSON}`,
      `https://sunsetdiff.com${BREAKING_CHANGES_CSV}`,
    ]);
    expect(JSON.stringify(graph)).not.toMatch(/[—–]/);
  });

  it("publishes Claude API version 2026-10-21 rules without a model id", () => {
    const rules = breakingChanges.filter((rule) => rule.api_version === "2026-10-21");
    expect(rules.map((rule) => rule.id)).toEqual([
      "anthropic-api-2026-10-21-sampling-params",
      "anthropic-api-2026-10-21-assistant-document",
      "anthropic-api-2026-10-21-user-citations",
      "anthropic-api-2026-10-21-authorization-header",
      "anthropic-api-2026-10-21-message-param-union",
    ]);
    const document = breakingChangesDocument();
    for (const rule of rules) {
      expect(rule.scope).toBe("api_version");
      expect(rule.provider).toBe("anthropic");
      expect(rule.checked).toBe("2026-10-22");
      expect(rule.citations).toEqual(expect.arrayContaining([
        "https://platform.claude.com/docs/en/api/versioning",
        "https://platform.claude.com/docs/en/api/migration-2026-10-21",
      ]));
      expect(rule.what_happens).toContain("On Amazon Bedrock, it's available for Claude 4.7 and later models.");
      expect(rule.error_text).toBeNull();
      expect(document.rules).toContain(rule);
    }
    const sampling = rules[0];
    expect(sampling.error_page).toBe("/errors/claude-api-2026-10-21-sampling-params-400/");
    expect(sampling.what_happens).toContain("even at the parameter's default value");
    expect(sampling.what_happens).toContain("Claude Sonnet 4.6");
    expect(sampling.fix).toContain("2023-06-01");
    expect(sampling.fix).toContain("does not call that version deprecated");
    const auth = rules.find((rule) => rule.id === "anthropic-api-2026-10-21-authorization-header");
    expect(auth?.what_happens).toContain("Authorization: Bearer");
    expect(auth?.what_happens).toContain("X-Api-Key");
    expect(auth?.what_happens).toContain("accepts a key in either header");
    const union = rules.find((rule) => rule.id === "anthropic-api-2026-10-21-message-param-union");
    expect(union?.citations).toContain("https://github.com/pydantic/pydantic-ai/issues/10923");
    expect(union?.what_happens).toContain("TypeError: Cannot instantiate typing.Union");
    expect(union?.what_happens).toContain("UserMessageParam");
    const csv = breakingChangesCsv();
    expect(csv).toContain("anthropic-api-2026-10-21-sampling-params");
    expect(csv.split("\n")[0]).toContain("api_version");
    const older = breakingChanges.find((rule) => rule.id === "anthropic-sonnet-5-5-temperature");
    expect(older?.scope).toBeUndefined();
    expect(JSON.stringify(older)).not.toContain("api_version");
  });
});
