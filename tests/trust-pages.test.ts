import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEPRECATIONS_URL as ANTHROPIC_URL, PRICING_URL as ANTHROPIC_PRICING } from "../scrapers/anthropic.ts";
import { LEGACY_URL as AWS_LEGACY, POLICY_URL as AWS_POLICY } from "../scrapers/aws-bedrock.ts";
import { POLICY_URL as AZURE_POLICY, SCHEDULE_URL as AZURE_SCHEDULE } from "../scrapers/azure-openai.ts";
import { NEWS_URL as DEEPSEEK_NEWS, PRICING_URL as DEEPSEEK_PRICING, UPDATES_URL as DEEPSEEK_UPDATES } from "../scrapers/deepseek.ts";
import { DEPRECATIONS_MD_URL as GROQ_DEPRECATIONS, MODELS_MD_URL as GROQ_MODELS } from "../scrapers/groq.ts";
import { DEPRECATIONS_URL as GEMINI_URL, PRICING_URL as GEMINI_PRICING } from "../scrapers/google-gemini-api.ts";
import { DEPRECATIONS_URL as VERTEX_URL } from "../scrapers/google-vertex.ts";
import { MODELS_URL as MISTRAL_URL, PRICING_URL as MISTRAL_PRICING } from "../scrapers/mistral.ts";
import { DEPRECATIONS_URL as OPENAI_URL, PRICING_URL as OPENAI_PRICING } from "../scrapers/openai.ts";
import { USER_AGENT } from "../scrapers/lib/fetch.ts";
import { sanityCheck } from "../scrapers/sanity.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { citedSources, newestSourceCheck } from "../src/lib/cited-sources.ts";
import { ALERT_ALTERNATIVES, ALERT_SECTIONS, ALERTS_PATH } from "../src/lib/alerts-page.ts";
import { ACTION_INPUTS, ACTION_REF, ACTION_USES, ACTION_WORKFLOW } from "../src/lib/github-action-page.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import {
  METHODOLOGY_SECTIONS,
  SCRAPE_TARGETS,
  awsPriceSentence,
  collectionFacts,
} from "../src/lib/methodology.ts";
import { ALERTS_PATH as ALERTS, GITHUB_ACTION_PATH, METHODOLOGY_PATH, SOURCES_PATH } from "../src/lib/trust-pages.ts";

const dash = /[\u2013\u2014]/;

describe("cited sources", () => {
  it("lists every stored source URL with a model count and the latest last_checked day", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const groups = citedSources(models, providers);
    expect(groups.map((group) => group.id)).toEqual(providers.map((provider) => provider.id));
    const seen = new Map<string, { count: number; checked: string }>();
    for (const model of models) {
      const urls = new Set<string>([
        ...model.sources.map((source) => source.url),
        ...Object.values(model.specs.specs_sources).map((source) => source.url),
      ]);
      for (const url of urls) {
        const key = `${model.provider}\t${url}`;
        const row = seen.get(key) ?? { count: 0, checked: "" };
        row.count += 1;
        for (const source of model.sources) {
          if (source.url === url && source.last_checked > row.checked) row.checked = source.last_checked;
        }
        for (const source of Object.values(model.specs.specs_sources)) {
          if (source.url === url && source.last_checked > row.checked) row.checked = source.last_checked;
        }
        seen.set(key, row);
      }
    }
    const listed = new Map<string, { count: number; checked: string }>();
    for (const group of groups) {
      const urls = group.sources.map((source) => source.url);
      expect(new Set(urls).size).toBe(urls.length);
      for (const source of group.sources) {
        expect(source.modelCount).toBeGreaterThan(0);
        expect(source.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        listed.set(`${group.id}\t${source.url}`, { count: source.modelCount, checked: source.lastChecked });
      }
    }
    expect(listed).toEqual(seen);
    const openai = groups.find((group) => group.id === "openai");
    const deprecations = openai?.sources.find((source) => source.url === OPENAI_URL);
    expect(deprecations?.modelCount).toBeGreaterThan(100);
    expect(newestSourceCheck(models)).toBe(
      [...seen.values()].map((row) => row.checked).sort().at(-1),
    );
  });
});

describe("methodology facts", () => {
  it("names the pages the scrapers fetch and the gate the code uses", async () => {
    const urls = SCRAPE_TARGETS.map((target) => target.url);
    for (const url of [
      OPENAI_URL,
      OPENAI_PRICING,
      ANTHROPIC_URL,
      ANTHROPIC_PRICING,
      "https://platform.claude.com/docs/en/about-claude/models/overview",
      GEMINI_URL,
      GEMINI_PRICING,
      VERTEX_URL,
      AWS_LEGACY,
      AWS_POLICY,
      AZURE_SCHEDULE,
      AZURE_POLICY,
      MISTRAL_URL,
      MISTRAL_PRICING,
      DEEPSEEK_UPDATES,
      DEEPSEEK_PRICING,
      DEEPSEEK_NEWS,
      GROQ_DEPRECATIONS,
      GROQ_MODELS,
    ]) {
      expect(urls).toContain(url);
    }
    const text = METHODOLOGY_SECTIONS.map((section) => section.paragraphs.join("\n")).join("\n");
    expect(text).toContain(USER_AGENT);
    expect(text).toContain("about every 6 hours");
    expect(text).toContain("below 70 percent");
    expect(text).toContain("Sources disagree.");
    expect(text).toContain("/conflicts/");
    expect(text).toContain("/glossary/deprecated/");
    expect(text).toContain("/glossary/retired/");
    expect(text).toContain("last_checked");
    expect(text).not.toMatch(dash);
    expect(text.toLowerCase()).not.toContain("alix");
    expect(sanityCheck("openai", 0, 10).ok).toBe(false);
    expect(sanityCheck("openai", 70, 100).ok).toBe(true);
    expect(sanityCheck("openai", 69, 100).ok).toBe(false);
    const models = await loadModels();
    const facts = collectionFacts(models);
    expect(facts.bedrockPriced).toBe(0);
    expect(awsPriceSentence(facts)).toContain("does not fetch");
    expect(readFileSync("scrapers/run.ts", "utf8")).not.toContain("https://aws.amazon.com/bedrock/pricing/");
    const run = readFileSync("scrapers/run.ts", "utf8");
    expect(run).toContain("politeFetch(AWS_POLICY)");
    expect(run).toContain("parseBedrock");
  });
});

describe("alerts copy", () => {
  it("describes the welcome email and says there is no later shutdown mail job", () => {
    const text = [
      ...ALERT_SECTIONS.map((section) => section.paragraphs.join("\n")),
      ...ALERT_ALTERNATIVES.map((item) => `${item.href} ${item.detail}`),
    ].join("\n");
    expect(text).toContain("one welcome email");
    expect(text).toContain("does not read them");
    expect(text).toContain("no scheduled job");
    expect(text).toContain("alerts@send.sunsetdiff.com");
    expect(text).toContain("/feed.xml");
    expect(text).not.toMatch(dash);
    expect(text.toLowerCase()).not.toContain("alix");
    expect(text).not.toMatch(/every week|daily email|before each shutdown/i);
    const route = readFileSync("service/src/index.ts", "utf8");
    const subscribe = route.slice(route.indexOf('app.post("/api/subscribe"'), route.indexOf("async function contactAlreadyExists"));
    expect(subscribe).not.toContain("providers");
    expect(subscribe).toContain("sendWelcomeEmail");
    expect(ALERTS).toBe(ALERTS_PATH);
  });
});

describe("github action page", () => {
  it("matches action.yml and points at the deploy branch", () => {
    const action = readFileSync("action/action.yml", "utf8");
    expect(action).toContain("using: node20");
    expect(action).toContain("main: dist/index.js");
    for (const input of ACTION_INPUTS) {
      expect(action).toContain(`${input.name}:`);
      expect(action).toContain(input.description);
      expect(action).toContain(`default: "${input.defaultValue}"`);
    }
    const render = readFileSync("render.yaml", "utf8");
    expect(render).toContain(`branch: ${ACTION_REF}`);
    expect(ACTION_USES).toBe(`alixgrosbard/model-migrate/action@${ACTION_REF}`);
    expect(ACTION_WORKFLOW).toContain("actions/checkout@v4");
    expect(ACTION_WORKFLOW).toContain(ACTION_USES);
    for (const input of ACTION_INPUTS) expect(ACTION_WORKFLOW).toContain(`${input.name}:`);
    const dist = readFileSync("action/dist/index.js", "utf8");
    expect(dist).toContain('getInput("warn-days")');
    expect(dist).toContain('getInput("fail-days")');
    expect(dist).toContain('getInput("api-url")');
    expect(dist).toContain('getInput("paths")');
    const joined = [ACTION_WORKFLOW, ...ACTION_INPUTS.map((input) => input.description)].join("\n");
    expect(joined).not.toMatch(dash);
  });
});

describe("trust pages in llms and lastmod", () => {
  it("lists the four URLs", async () => {
    const models = await loadModels();
    const providers = await loadProviders();
    const text = llmsTxt("https://sunsetdiff.com", providers, []);
    const full = llmsFull("https://sunsetdiff.com", models, providers);
    for (const path of [METHODOLOGY_PATH, SOURCES_PATH, ALERTS_PATH, GITHUB_ACTION_PATH]) {
      expect(text).toContain(path);
      expect(full).toContain(path);
      expect(lastmodForUrl(`https://sunsetdiff.com${path}`)).toBe(newestSourceCheck(models));
    }
  });
});
