import { describe, expect, it } from "vitest";
import { changelogEntries, changelogFaqs } from "../src/lib/changelog-log.ts";
import { lastmodForUrl } from "../src/lib/lastmod.ts";
import { llmsFull, llmsTxt } from "../src/lib/llms.ts";
import { loadChanges, loadMigrations, loadModels, loadProviders } from "../src/lib/load.ts";
import {
  datedShutdowns,
  monthScope,
  periodFaqs,
  periodIntro,
  scheduleIndexLinks,
  shutdownsInMonth,
  shutdownsInYear,
  toScheduleRows,
  upcomingShutdowns,
  yearPath,
} from "../src/lib/schedule.ts";

const day = "2026-10-22";

describe("shutdown schedule pages", () => {
  it("counts announced shutdowns and skips floors and duplicate rows", async () => {
    const models = await loadModels();
    const dated = datedShutdowns(models);
    expect(dated.some((model) => model.shutdown_date_kind === "not_before")).toBe(false);
    expect(dated.some((model) => model.shutdown_date_kind === "none")).toBe(false);
    const mistral = dated.filter((model) => model.provider === "mistral" && model.id === "voxtral-mini-2507");
    expect(mistral).toHaveLength(1);
    const haiku = dated.filter((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-3-haiku-20240307-v1:0");
    expect(haiku.map((model) => model.shutdown_date).sort()).toEqual(["2026-09-10", "2026-11-13"]);

    const upcoming = upcomingShutdowns(models, day);
    expect(upcoming.every((model) => model.shutdown_date! >= day || model.shutdown_date_kind === "month_only")).toBe(true);
    expect(upcoming.some((model) => model.shutdown_date! < day && model.shutdown_date_kind === "exact")).toBe(false);
    const vertexFloor = models.find((model) => model.provider === "google-vertex" && model.id === "gemini-3.8-flash");
    expect(vertexFloor?.shutdown_date_kind).toBe("not_before");
    expect(shutdownsInYear(models, "2027").some((model) => model.id === "gemini-3.8-flash" && model.provider === "google-vertex")).toBe(false);
  });

  it("answers January 2027 from the records and shows a different Gemini API date", async () => {
    const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
    const january = shutdownsInMonth(models, "2027-01");
    expect(january.length).toBeGreaterThan(0);
    const rows = toScheduleRows(january, models, providers, migrations, day);
    const scope = monthScope("2027-01");
    const faqs = periodFaqs(rows, providers, scope, day);
    const openai = faqs.find((item) => item.question === "How many OpenAI models shut down in January 2027?");
    expect(openai).toBeTruthy();
    const count = january.filter((model) => model.provider === "openai").length;
    expect(openai!.answer).toBe(`${count} OpenAI models have a published shutdown date in January 2027.`);
    expect(openai!.answer).toContain(String(count));
    const intro = periodIntro(rows, providers, scope);
    expect(intro).toContain(String(january.length));
    expect(intro).toContain("not sooner than");
    expect(`${intro} ${faqs.map((item) => `${item.question} ${item.answer}`).join(" ")}`).not.toMatch(/[—–]/);

    const vertex = toScheduleRows(
      datedShutdowns(models).filter((model) => model.provider === "google-vertex" && model.id === "gemini-2.5-pro"),
      models,
      providers,
      migrations,
      day,
    )[0];
    expect(vertex).toBeTruthy();
    const gemini = vertex.peers.find((peer) => peer.providerId === "google-gemini-api");
    expect(gemini?.differs).toBe(true);
    expect(gemini?.sentence).toContain("no published shutdown date");
    expect(vertex.switchLinks[0]?.href.startsWith("/")).toBe(true);
    expect(vertex.modelPath).toBe("/models/google-vertex/gemini-2-5-pro/");
  });

  it("builds the changelog from recorded field changes and lists the pages for crawlers", async () => {
    const [changes, models, providers] = await Promise.all([loadChanges(), loadModels(), loadProviders()]);
    const entries = changelogEntries(changes, models, providers);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].date >= entries[entries.length - 1].date).toBe(true);
    expect(entries.every((entry) => ["shutdown_date", "deprecation_date", "announced_date", "status", "replacements"].includes(entry.field))).toBe(true);
    const announced = entries.find((entry) => entry.field === "shutdown_date" && entry.sentence.includes("newly recorded"));
    expect(announced).toBeTruthy();
    expect(announced!.links[0]?.href.startsWith("/models/")).toBe(true);
    const changed = entries.find((entry) => entry.field === "shutdown_date" && entry.sentence.includes("changed the shutdown date"));
    expect(changed?.sentence).toContain("from ");
    const faqs = changelogFaqs(entries, day);
    expect(faqs[0].question).toBe("What changed in AI model deprecations this week?");
    expect(faqs.map((item) => `${item.question} ${item.answer}`).join(" ")).not.toMatch(/[—–]/);

    const links = scheduleIndexLinks(models);
    expect(links.map((link) => link.path)).toContain("/upcoming/");
    expect(links.map((link) => link.path)).toContain("/changelog/");
    expect(links.map((link) => link.path)).toContain(yearPath("2027"));
    expect(links.map((link) => link.path)).toContain("/2027/01/");
    const text = llmsTxt("https://sunsetdiff.com", providers, [], { schedule: links });
    expect(text).toContain("/upcoming/");
    expect(text).toContain("/timeline/");
    expect(text).toContain("/changelog/");
    expect(text).toContain("/faq/");
    expect(text).toContain("/2027/");
    expect(text).toContain("/2027/01/");
    expect(text).toContain("/feed.xml");
    const full = llmsFull("https://sunsetdiff.com", models);
    expect(full).toContain("/upcoming/");
    expect(full).toContain("/2027/01/");
    expect(lastmodForUrl("https://sunsetdiff.com/upcoming/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl("https://sunsetdiff.com/changelog/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl("https://sunsetdiff.com/2027/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastmodForUrl("https://sunsetdiff.com/2027/01/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
