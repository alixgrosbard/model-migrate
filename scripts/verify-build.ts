import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { BADGES_DESCRIPTION, BADGES_TITLE, badgeSvgPath, badgeView } from "../src/lib/badges.ts";
import { htmlContainsOwnerPlaceholder } from "../src/lib/public-copy.ts";
import { loadModels, loadProviders } from "../src/lib/load.ts";
import { siteOrigin } from "../src/lib/site.ts";
import { HUBS } from "../src/lib/hubs.ts";
import { today } from "../src/lib/format.ts";
import { isPastShutdown, shutdownEventPath, shutdownEvents } from "../src/lib/shutdowns.ts";
import { GUIDES_CHECKED, guidePath, guides } from "../src/lib/guides.ts";
import { GLOSSARY_CHECKED, GLOSSARY_INDEX, glossaryPath, glossaryTerms } from "../src/lib/glossary.ts";
import {
  BREAKING_CHANGES_CSV,
  BREAKING_CHANGES_JSON,
  BREAKING_CHANGES_PATH,
  breakingChanges,
  breakingChangesChecked,
} from "../src/lib/breaking-changes.ts";
import { REQUEST_ERRORS_CHECKED, REQUEST_ERRORS_INDEX, requestErrorPath, requestErrors } from "../src/lib/request-errors.ts";
import { MCP_ENDPOINT, MCP_REGISTRY_NAME, mcpClients, mcpTools } from "../src/lib/mcp-docs.ts";
import {
  CHANGELOG_PATH,
  FAQ_PATH,
  monthKeyPath,
  monthScope,
  periodFaqs,
  shutdownMonthList,
  shutdownsInMonth,
  shutdownYearList,
  TIMELINE_PATH,
  toScheduleRows,
  UPCOMING_PATH,
  yearPath,
} from "../src/lib/schedule.ts";
import { loadMigrations } from "../src/lib/load.ts";
import SwaggerParser from "@apidevtools/swagger-parser";
import { ENDPOINTS } from "../src/lib/endpoints.ts";
import { OPENAPI_PATH, OPENAPI_SERVER, openApiPath } from "../src/lib/openapi.ts";
import { providerStatusTargets } from "../src/lib/status-hubs.ts";

const dist = path.join(process.cwd(), "dist");
const required = [
  "llms.txt",
  "llms-full.txt",
  "sitemap-index.xml",
  "sitemap.xml",
  "robots.txt",
  "api/v1/index.json",
  "calendar.ics",
  "changes.xml",
  "dataset/sunsetdiff.json",
  "dataset/sunsetdiff.csv",
  "deadlines.ics",
  "feed.xml",
  "data/models.json",
  "data/deprecations.csv",
  "data/changelog.json",
  "data/breaking-changes.json",
  "data/breaking-changes.csv",
  "breaking-changes/index.html",
  "deadlines/index.html",
  "questions/index.html",
  "scan/index.html",
  "pro/index.html",
  "shutdowns/index.html",
  "errors/index.html",
  "models/index.html",
  "badges/index.html",
  "replace/index.html",
  "migrate/index.html",
  "providers/index.html",
  "deprecated/index.html",
  "retired/index.html",
  "google/index.html",
  "openapi.json",
  "openai/index.html",
  "anthropic/index.html",
  "mistral/index.html",
  "upcoming/index.html",
  "timeline/index.html",
  "changelog/index.html",
  "faq/index.html",
  "alternatives/index.html",
  "api/index.html",
  "alternatives/modeldeprecations/index.html",
  "alternatives/quora-model-deprecation-tracker/index.html",
  "alternatives/endoflife-ai/index.html",
  "alternatives/developers-digest/index.html",
  "alternatives/deprecations-info/index.html",
  "alternatives/llmsunset/index.html",
  "alternatives/lastcall/index.html",
  "alternatives/modelsunset/index.html",
];

const requiredTypes = ["WebSite", "Organization", "BreadcrumbList"];

async function main() {
  for (const file of required) {
    await readFile(path.join(dist, file), "utf8");
  }
  const htmlFiles = await walk(dist);
  let checked = 0;
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    if (html.includes('http-equiv="refresh"')) {
      checked++;
      continue;
    }
    const beacon = html.match(/<script>\s*([\s\S]*?navigator\.sendBeacon[\s\S]*?)<\/script>/);
    if (!beacon) throw new Error(`Visit beacon missing in ${file}`);
    if (!beacon[1].includes('"/api/hit"') && !beacon[1].includes("new URL(\"/api/hit\"")) {
      throw new Error(`Visit beacon endpoint missing in ${file}`);
    }
    if (!beacon[1].includes("keepalive: true") || !beacon[1].includes(".hostname")) {
      throw new Error(`Visit beacon is missing the fetch fallback or referrer host in ${file}`);
    }
    if (beacon[1].includes("localStorage") || beacon[1].includes("document.cookie")) {
      throw new Error(`Visit beacon stores an id in ${file}`);
    }
    if (htmlContainsOwnerPlaceholder(html)) throw new Error(`Built HTML contains <owner> in ${file}`);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!blocks.length) throw new Error(`Missing JSON-LD in ${file}`);
    for (const block of blocks) {
      const data = JSON.parse(block[1]);
      const graph = data["@graph"] ?? [data];
      if (!Array.isArray(graph) || !graph.length) throw new Error(`Empty JSON-LD in ${file}`);
      for (const node of graph) {
        if (!node["@type"]) throw new Error(`JSON-LD node missing @type in ${file}`);
      }
    }
    const raw = blocks.map((block) => block[1]).join("\n");
    if (file.endsWith(`${path.sep}index.html`) && html.includes("SunsetDiff")) {
      for (const type of requiredTypes) {
        if (!raw.includes(type) && html.includes("<title>SunsetDiff")) {
          /* home page must include site-wide types */
        }
      }
    }
    checked++;
  }
  const pro = await readFile(path.join(dist, "pro/index.html"), "utf8");
  const proText = visibleText(pro);
  if (!proText.includes("You won't be charged until Pro launches")) throw new Error("Pro page is missing the free-until-launch line");
  if (!proText.includes("we'll email you before your first charge")) throw new Error("Pro page is missing the email-before-charge line");
  if (!proText.includes("After that it's $19 a month")) throw new Error("Pro page is missing the price after launch");
  if (!proText.includes("you can cancel anytime")) throw new Error("Pro page is missing cancel anytime");
  if (!proText.includes("Coming at launch")) throw new Error("Pro page is missing Coming at launch");
  if (!proText.includes("Available now")) throw new Error("Pro page is missing Available now");
  if (!pro.includes("You won't be charged until Pro launches")) throw new Error("Pro page JSON-LD is missing the free-until-launch line");
  if (!pro.includes('"FAQPage"')) throw new Error("Pro page JSON-LD is missing FAQPage");
  if (proText.includes("Nothing on this list is available yet")) throw new Error("Pro page still says nothing is available");
  if (proText.includes("Subscribe for $19")) throw new Error("Pro page still implies an immediate charge");
  if (pro.includes("—") || pro.includes("–")) throw new Error("Em dash on /pro/");
  if (pro.includes('class="button"') && !proText.includes("Start free early access")) {
    throw new Error("Pro checkout button must say Start free early access");
  }
  if (!pro.includes('class="button"') && !proText.includes("does not charge you")) {
    throw new Error("Pro page without a checkout link must say it does not charge you");
  }
  const home = await readFile(path.join(dist, "index.html"), "utf8");
  if (!visibleText(home).includes("You won't be charged until Pro launches")) throw new Error("Footer is missing the free-until-launch line");
  for (const type of requiredTypes) {
    if (!home.includes(`"${type}"`) && !home.includes(type)) throw new Error(`Home JSON-LD missing ${type}`);
  }
  if (!home.includes("/shutdowns/")) throw new Error("Home page is missing the shutdown batches link");
  const deadlines = await readFile(path.join(dist, "deadlines/index.html"), "utf8");
  if (!deadlines.includes("/shutdowns/")) throw new Error("Deadlines page is missing the shutdown batches link");
  const dataPage = await readFile(path.join(dist, "data/index.html"), "utf8");
  if (!dataPage.includes("https://huggingface.co/datasets/sunsetdiff/ai-model-deprecations")) {
    throw new Error("Dataset page is missing the Hugging Face sameAs URL");
  }
  if (!dataPage.includes("https://creativecommons.org/licenses/by/4.0/")) {
    throw new Error("Dataset page is missing the CC BY 4.0 license");
  }
  const llms = await readFile(path.join(dist, "llms.txt"), "utf8");
  const feed = await readFile(path.join(dist, "feed.xml"), "utf8");
  const sitemapFile = path.join(dist, "sitemap.xml");
  const sitemapStat = await stat(sitemapFile);
  if (!sitemapStat.isFile()) throw new Error("dist/sitemap.xml must be a file");
  const sitemapAlias = await readFile(sitemapFile, "utf8");
  const sitemapIndex = await readFile(path.join(dist, "sitemap-index.xml"), "utf8");
  if (sitemapAlias !== sitemapIndex) throw new Error("dist/sitemap.xml must be a copy of sitemap-index.xml");
  if (!sitemapAlias.includes("<sitemapindex") && !sitemapAlias.includes("<urlset")) {
    throw new Error("dist/sitemap.xml is not sitemap XML");
  }
  if (sitemapAlias.includes("<html") || sitemapAlias.includes("http-equiv")) {
    throw new Error("dist/sitemap.xml is an HTML redirect, not a sitemap");
  }
  const sitemap = await sitemapText(dist);
  const events = shutdownEvents(await loadModels());
  const day = today();
  if (!events.length) throw new Error("No shutdown event pages were generated");
  if (!sitemap.includes("/shutdowns/")) throw new Error("Sitemap is missing /shutdowns/");
  if (!sitemap.includes("/errors/")) throw new Error("Sitemap is missing /errors/");
  if (!llms.includes("/errors/")) throw new Error("llms.txt is missing /errors/");
  if (!llms.includes("/shutdowns/")) throw new Error("llms.txt is missing /shutdowns/");
  if (!llms.includes("/alternatives/")) throw new Error("llms.txt is missing /alternatives/");
  if (!llms.includes("/api/")) throw new Error("llms.txt is missing /api/");
  const llmsFull = await readFile(path.join(dist, "llms-full.txt"), "utf8");
  await checkHubs(sitemap, llms, llmsFull);
  await checkStatusPages(sitemap, llms, llmsFull);
  await checkSchedule(sitemap, llms, llmsFull);
  if (!llmsFull.includes("/alternatives/")) throw new Error("llms-full.txt is missing /alternatives/");
  if (!llmsFull.includes("/api/")) throw new Error("llms-full.txt is missing /api/");
  const comparePages = [
    "alternatives/index.html",
    "alternatives/modeldeprecations/index.html",
    "alternatives/quora-model-deprecation-tracker/index.html",
    "alternatives/endoflife-ai/index.html",
    "alternatives/developers-digest/index.html",
    "alternatives/deprecations-info/index.html",
    "alternatives/llmsunset/index.html",
    "alternatives/lastcall/index.html",
    "alternatives/modelsunset/index.html",
  ];
  for (const rel of comparePages) {
    const html = await readFile(path.join(dist, rel), "utf8");
    if (!html.includes('"FAQPage"') || (!html.includes('"WebPage"') && !html.includes('"CollectionPage"'))) {
      throw new Error(`Comparison JSON-LD missing page or FAQ types in ${rel}`);
    }
    if (!html.includes("2026-10-20")) throw new Error(`Comparison page is missing the check date: ${rel}`);
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${rel}`);
    if (!sitemap.includes(`/${rel.replace(/index\.html$/, "")}`)) throw new Error(`Sitemap is missing ${rel}`);
  }
  const apiPage = await readFile(path.join(dist, "api/index.html"), "utf8");
  for (const token of ['"WebAPI"', '"FAQPage"', '"Dataset"', "/data/models.json", "/dataset/sunsetdiff.json", "/feed.xml", "/deadlines.ics"]) {
    if (!apiPage.includes(token)) throw new Error(`API docs missing ${token}`);
  }
  if (apiPage.includes("—") || apiPage.includes("–")) throw new Error("Em dash on /api/");
  if (!sitemap.includes("/api/")) throw new Error("Sitemap is missing /api/");
  if (!llms.includes("You won't be charged until Pro launches")) throw new Error("llms.txt is missing the Pro billing line");
  const errorHub = await readFile(path.join(dist, "errors/index.html"), "utf8");
  if (!errorHub.includes('"CollectionPage"') || !errorHub.includes('"ItemList"') || !errorHub.includes('"FAQPage"')) {
    throw new Error("Request error hub JSON-LD is missing CollectionPage, ItemList, or FAQPage");
  }
  if (!errorHub.includes(REQUEST_ERRORS_CHECKED)) throw new Error("Request error hub is missing the check date");
  if (errorHub.includes("—") || errorHub.includes("–")) throw new Error("Em dash on /errors/");
  for (const page of requestErrors) {
    if (!errorHub.includes(requestErrorPath(page.slug))) throw new Error(`Request error hub is missing ${page.slug}`);
    if (!htmlHas(errorHub, page.errorText)) throw new Error(`Request error hub is missing the error text for ${page.slug}`);
  }
  const homeNav = await readFile(path.join(dist, "index.html"), "utf8");
  if (!homeNav.includes('href="/errors/"')) throw new Error("Navigation is missing /errors/");
  if (!homeNav.includes('href="/breaking-changes/"')) throw new Error("Navigation is missing /breaking-changes/");
  const breakingHub = await readFile(path.join(dist, "breaking-changes/index.html"), "utf8");
  for (const token of ['"CollectionPage"', '"ItemList"', '"FAQPage"', '"Dataset"', '"BreadcrumbList"', BREAKING_CHANGES_JSON]) {
    if (!breakingHub.includes(token)) throw new Error(`Breaking changes hub is missing ${token}`);
  }
  if (!breakingHub.includes(breakingChangesChecked())) throw new Error("Breaking changes hub is missing the check date");
  if (breakingHub.includes("—") || breakingHub.includes("–")) throw new Error("Em dash on /breaking-changes/");
  for (const rule of breakingChanges) {
    if (!breakingHub.includes(`id="${rule.id}"`)) throw new Error(`Breaking changes hub is missing ${rule.id}`);
    if (rule.error_text && !htmlHas(breakingHub, rule.error_text)) throw new Error(`Breaking changes hub is missing the error text for ${rule.id}`);
    if (!breakingHub.includes(rule.source_url)) throw new Error(`Breaking changes hub is missing the source for ${rule.id}`);
  }
  if (!sitemap.includes(BREAKING_CHANGES_PATH)) throw new Error("Sitemap is missing /breaking-changes/");
  if (!sitemap.includes(BREAKING_CHANGES_JSON)) throw new Error("Sitemap is missing breaking-changes.json");
  if (!sitemap.includes(BREAKING_CHANGES_CSV)) throw new Error("Sitemap is missing breaking-changes.csv");
  if (!llms.includes(BREAKING_CHANGES_PATH) || !llms.includes(BREAKING_CHANGES_JSON)) {
    throw new Error("llms.txt is missing the breaking changes list");
  }
  if (!llmsFull.includes(BREAKING_CHANGES_JSON)) throw new Error("llms-full.txt is missing breaking-changes.json");
  const breakingJson = JSON.parse(await readFile(path.join(dist, "data/breaking-changes.json"), "utf8")) as { rules: { id: string }[]; license: string };
  if (breakingJson.license !== "https://creativecommons.org/licenses/by/4.0/") throw new Error("breaking-changes.json license is wrong");
  if (breakingJson.rules.length !== breakingChanges.length) throw new Error("breaking-changes.json rule count drifted");
  const breakingCsv = await readFile(path.join(dist, "data/breaking-changes.csv"), "utf8");
  if (!breakingCsv.startsWith("id,provider,")) throw new Error("breaking-changes.csv is missing its header");
  const sonnetRules = await readFile(
    path.join(dist, "migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/index.html"),
    "utf8",
  );
  if (!sonnetRules.includes("<h2>Request breaking changes</h2>")) {
    throw new Error("Sonnet 5.5 switch guide is missing the breaking-changes section");
  }
  if (!sonnetRules.includes("temperature is deprecated for this model")) {
    throw new Error("Sonnet 5.5 switch guide is missing the temperature breaking change");
  }
  const realtimeModel = await readFile(path.join(dist, "models/openai/gpt-realtime-2-1-mini/index.html"), "utf8");
  if (!realtimeModel.includes("<h2>Request breaking changes</h2>")) {
    throw new Error("gpt-realtime-2.1-mini model page is missing the breaking-changes section");
  }
  if (!realtimeModel.includes("/v1/audio/speech")) {
    throw new Error("gpt-realtime-2.1-mini model page is missing the speech endpoint rule");
  }
  if (!apiPage.includes(BREAKING_CHANGES_JSON)) throw new Error("API docs are missing breaking-changes.json");
  if (!homeNav.includes('href="/guides/"')) throw new Error("Navigation is missing /guides/");
  const guideHub = await readFile(path.join(dist, "guides/index.html"), "utf8");
  if (!guideHub.includes('"CollectionPage"') || !guideHub.includes('"ItemList"') || !guideHub.includes('"BreadcrumbList"')) {
    throw new Error("Guides hub JSON-LD is missing CollectionPage, ItemList, or BreadcrumbList");
  }
  if (!guideHub.includes(GUIDES_CHECKED)) throw new Error("Guides hub is missing the review date");
  if (guideHub.includes("—") || guideHub.includes("–")) throw new Error("Em dash on /guides/");
  for (const guide of guides) {
    if (!guideHub.includes(guidePath(guide.slug))) throw new Error(`Guides hub is missing ${guide.slug}`);
    const rel = guidePath(guide.slug);
    const html = await readFile(path.join(dist, rel.slice(1), "index.html"), "utf8");
    if (!sitemap.includes(rel)) throw new Error(`Sitemap is missing ${rel}`);
    if (!llms.includes(rel)) throw new Error(`llms.txt is missing ${rel}`);
    if (!llmsFull.includes(rel)) throw new Error(`llms-full.txt is missing ${rel}`);
    if (!html.includes('"Article"') && !html.includes('"HowTo"')) throw new Error(`JSON-LD missing Article or HowTo in ${rel}`);
    if (!html.includes('"BreadcrumbList"')) throw new Error(`JSON-LD missing BreadcrumbList in ${rel}`);
    if (!html.includes(GUIDES_CHECKED)) throw new Error(`Guide is missing the review date: ${rel}`);
    if (!html.includes("Last reviewed")) throw new Error(`Guide is missing the review line: ${rel}`);
    for (const citation of guide.citations) {
      if (!html.includes(citation)) throw new Error(`${rel} is missing citation ${citation}`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${rel}`);
  }
  if (!sitemap.includes("/guides/")) throw new Error("Sitemap is missing /guides/");
  if (!llms.includes("/guides/")) throw new Error("llms.txt is missing /guides/");
  if (!homeNav.includes('href="/glossary/"')) throw new Error("Footer is missing /glossary/");
  if (!guideHub.includes('href="/glossary/"')) throw new Error("Guides hub is missing /glossary/");
  const faqPage = await readFile(path.join(dist, "faq/index.html"), "utf8");
  if (!faqPage.includes('href="/glossary/"')) throw new Error("FAQ is missing /glossary/");
  const glossaryHub = await readFile(path.join(dist, "glossary/index.html"), "utf8");
  if (!glossaryHub.includes('"DefinedTermSet"') || !glossaryHub.includes('"BreadcrumbList"') || !glossaryHub.includes('"FAQPage"')) {
    throw new Error("Glossary hub JSON-LD is missing DefinedTermSet, BreadcrumbList, or FAQPage");
  }
  if (!glossaryHub.includes(GLOSSARY_CHECKED)) throw new Error("Glossary hub is missing the review date");
  if (glossaryHub.includes("—") || glossaryHub.includes("–")) throw new Error("Em dash on /glossary/");
  if (!sitemap.includes(GLOSSARY_INDEX)) throw new Error("Sitemap is missing /glossary/");
  if (!llms.includes(GLOSSARY_INDEX)) throw new Error("llms.txt is missing /glossary/");
  if (!llmsFull.includes(GLOSSARY_INDEX)) throw new Error("llms-full.txt is missing /glossary/");
  for (const term of glossaryTerms) {
    const rel = glossaryPath(term.slug);
    if (!glossaryHub.includes(rel)) throw new Error(`Glossary hub is missing ${term.slug}`);
    const html = await readFile(path.join(dist, rel.slice(1), "index.html"), "utf8");
    if (!sitemap.includes(rel)) throw new Error(`Sitemap is missing ${rel}`);
    if (!llms.includes(rel)) throw new Error(`llms.txt is missing ${rel}`);
    if (!llmsFull.includes(rel)) throw new Error(`llms-full.txt is missing ${rel}`);
    if (!html.includes('"DefinedTerm"') || !html.includes('"BreadcrumbList"')) {
      throw new Error(`JSON-LD missing DefinedTerm or BreadcrumbList in ${rel}`);
    }
    if (!html.includes(term.definition)) throw new Error(`Glossary term is missing its definition: ${rel}`);
    if (!html.includes(GLOSSARY_CHECKED)) throw new Error(`Glossary term is missing the review date: ${rel}`);
    for (const citation of term.citations) {
      if (!html.includes(citation)) throw new Error(`${rel} is missing citation ${citation}`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${rel}`);
  }
  const rss = await readFile(path.join(dist, "rss.xml"), "utf8");
  if (rss !== feed) throw new Error("/rss.xml must be the same document as /feed.xml");
  if (!rss.includes("<rss")) throw new Error("/rss.xml is not an RSS document");
  if (!llms.includes("/rss.xml")) throw new Error("llms.txt is missing /rss.xml");
  if (!llmsFull.includes("/rss.xml")) throw new Error("llms-full.txt is missing /rss.xml");
  for (const page of requestErrors) {
    const rel = requestErrorPath(page.slug);
    const html = await readFile(path.join(dist, rel.slice(1), "index.html"), "utf8");
    if (!sitemap.includes(rel)) throw new Error(`Sitemap is missing ${rel}`);
    if (!llms.includes(rel)) throw new Error(`llms.txt is missing ${rel}`);
    if (!htmlHas(html, page.errorText)) throw new Error(`Error page is missing its error text: ${rel}`);
    if (!html.includes('"TechArticle"') || !html.includes('"FAQPage"')) throw new Error(`JSON-LD missing TechArticle or FAQPage in ${rel}`);
    if (!html.includes(page.ruleSourceUrl)) throw new Error(`Error page is missing its source: ${rel}`);
    for (const guide of page.guides) {
      if (!html.includes(guide.href)) throw new Error(`${rel} is missing switch guide ${guide.href}`);
    }
    for (const heading of ["Raw SDK", "LiteLLM", "Vercel AI SDK"]) {
      if (!html.includes(heading)) throw new Error(`${rel} is missing the ${heading} fix`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${rel}`);
  }
  const sonnetGuide = await readFile(
    path.join(dist, "migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/index.html"),
    "utf8",
  );
  if (sonnetGuide.includes("No parameter change is listed")) throw new Error("Sonnet 5.5 guide still says no parameter change");
  if (!sonnetGuide.includes("output_config")) throw new Error("Sonnet 5.5 after code is missing output_config");
  if (!sonnetGuide.includes("https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide")) {
    throw new Error("Sonnet 5.5 guide is missing the migration guide source");
  }
  for (const pair of [
    "openai__gpt-4o-mini-2024-07-18__to__openai__gpt-6-luna",
    "openai__gpt-4o-2024-08-06__to__openai__gpt-6-luna",
    "openai__gpt-4o-2024-11-20__to__openai__gpt-6-luna",
  ]) {
    const html = await readFile(path.join(dist, "migrate", pair, "index.html"), "utf8");
    if (html.includes("No parameter change is listed")) throw new Error(`${pair} still says no parameter change`);
    if (!html.includes("reasoning_effort")) throw new Error(`${pair} after code is missing reasoning_effort`);
    if (!html.includes("https://developers.openai.com/api/docs/models/gpt-6-luna")) {
      throw new Error(`${pair} is missing the GPT-6 Luna source`);
    }
  }
  for (const event of events) {
    const rel = shutdownEventPath(event);
    const file = path.join(dist, rel.slice(1), "index.html");
    const html = await readFile(file, "utf8");
    if (!sitemap.includes(rel)) throw new Error(`Sitemap is missing ${rel}`);
    if (!llms.includes(rel)) throw new Error(`llms.txt is missing ${rel}`);
    if (!feed.includes(rel)) throw new Error(`RSS feed is missing ${rel}`);
    if (!html.includes('"Article"') || !html.includes('"FAQPage"')) throw new Error(`JSON-LD missing Article or FAQPage in ${rel}`);
    if (!html.includes("/scan/") || !html.includes("/pro/") || !html.includes('id="subscribe"')) {
      throw new Error(`Shutdown page is missing scan, Pro, or the alert form: ${rel}`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${rel}`);
    const past = isPastShutdown(event.date, day);
    if (past) {
      if (!html.includes("shut down on")) throw new Error(`Past shutdown page is not in past tense: ${rel}`);
      if (html.includes("shutting down") || html.includes("shuts down") || html.includes("start failing")) {
        throw new Error(`Past shutdown page still uses future wording: ${rel}`);
      }
    } else {
      if (!html.includes("shutting down") || !html.includes("start failing")) {
        throw new Error(`Upcoming shutdown page is missing future wording: ${rel}`);
      }
      if (html.includes("shut down on") || html.includes("started failing")) {
        throw new Error(`Upcoming shutdown page uses past wording: ${rel}`);
      }
    }
    for (const model of event.models) {
      if (!html.includes(model.id)) throw new Error(`${rel} is missing model ${model.id}`);
    }
  }
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
  const banned = ["nodemailer", "resend", "@sendgrid/mail", "stripe", "postmark"];
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of banned) {
    if (deps[name]) throw new Error(`Disallowed package installed: ${name}`);
  }
  await checkBadges(sitemap, llms, llmsFull);
  await checkDiscovery(sitemap, llms, llmsFull);
  console.log(`Verified ${checked} HTML files and required static outputs.`);
}

async function checkBadges(sitemap: string, llms: string, llmsFull: string) {
  const models = await loadModels();
  const day = today();
  if (!sitemap.includes("/badges/</loc>")) throw new Error("Sitemap is missing /badges/");
  if (!llms.includes("/badges/")) throw new Error("llms.txt is missing /badges/");
  if (!llmsFull.includes("/badges/")) throw new Error("llms-full.txt is missing /badges/");
  const home = await readFile(path.join(dist, "index.html"), "utf8");
  const footer = home.slice(home.lastIndexOf("<footer"));
  if (!home.includes('href="/badges/"') || !footer.includes('href="/badges/"')) {
    throw new Error("Navigation is missing /badges/");
  }
  const html = await readFile(path.join(dist, "badges/index.html"), "utf8");
  if (!html.includes(`<title>${BADGES_TITLE}</title>`)) throw new Error("Badges title mismatch");
  if (!html.includes(`content="${BADGES_DESCRIPTION}"`)) throw new Error("Badges description mismatch");
  for (const type of ['"CollectionPage"', '"ItemList"', '"FAQPage"', '"BreadcrumbList"']) {
    if (!html.includes(type)) throw new Error(`Badges JSON-LD is missing ${type}`);
  }
  if (html.includes("—") || html.includes("–")) throw new Error("Em dash on /badges/");
  if (!html.includes("Copy Markdown") || !html.includes("Copy HTML")) throw new Error("Badges page is missing copy snippets");
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!block) throw new Error("Missing JSON-LD on /badges/");
  const data = JSON.parse(block[1]) as { "@graph": { "@type": string; numberOfItems?: number }[] };
  const list = data["@graph"].find((node) => node["@type"] === "ItemList");
  if (!list || list.numberOfItems !== models.length) throw new Error("Badges ItemList count mismatch");
  const seen = new Set<string>();
  for (const model of models) {
    const svgRel = badgeSvgPath(model).slice(1);
    if (seen.has(svgRel)) throw new Error(`Duplicate badge ${svgRel}`);
    seen.add(svgRel);
    const view = badgeView(model, day);
    const svg = await readFile(path.join(dist, svgRel), "utf8");
    const json = JSON.parse(await readFile(path.join(dist, svgRel.replace(/\.svg$/, ".json")), "utf8")) as {
      schemaVersion: number;
      label: string;
      message: string;
      color: string;
      cacheSeconds: number;
    };
    if (!svg.startsWith("<svg ") || !svg.includes('xmlns="http://www.w3.org/2000/svg"') || !svg.includes("</svg>")) {
      throw new Error(`Badge is not an SVG: ${svgRel}`);
    }
    if (!svg.includes(`fill="${view.fill}"`)) throw new Error(`Badge color mismatch: ${svgRel}`);
    if (!svg.includes(`>${view.message}<`)) throw new Error(`Badge message missing: ${svgRel}`);
    if (json.schemaVersion !== 1 || json.label !== model.id || json.message !== view.message || json.color !== view.shieldsColor) {
      throw new Error(`Badge JSON mismatch: ${svgRel}`);
    }
    if (json.cacheSeconds < 300) throw new Error(`Badge JSON is not cache-friendly: ${svgRel}`);
    if (view.message.includes("retires") && !model.shutdown_date) throw new Error(`Badge invented a date: ${svgRel}`);
  }
  if (seen.size !== models.length) throw new Error(`Expected ${models.length} badges, found ${seen.size}`);
  const sample = models[0];
  const modelHtml = await readFile(path.join(dist, "models", sample.provider, sample.slug, "index.html"), "utf8");
  if (!modelHtml.includes("Add this badge to your README")) throw new Error("Model page is missing the badge snippet");
  if (!modelHtml.includes(badgeSvgPath(sample))) throw new Error("Model page is missing the badge image");
  if (!modelHtml.includes(`${siteOrigin()}${badgeSvgPath(sample)}`)) {
    throw new Error("Model page snippet is missing the absolute badge URL");
  }
  if (!modelHtml.includes(`${siteOrigin()}/models/${sample.provider}/${sample.slug}/`)) {
    throw new Error("Model page snippet does not link back to the model page");
  }
  const headers = await readFile(path.join(process.cwd(), "render.yaml"), "utf8");
  if (!headers.includes("image/svg+xml")) throw new Error("render.yaml is missing the SVG content type");
  if (!headers.includes("/badge/**/*.svg")) throw new Error("render.yaml is missing the badge SVG header path");
  if (!headers.includes("max-age=3600")) throw new Error("render.yaml is missing badge cache headers");
}

async function checkHubs(sitemap: string, llms: string, llmsFull: string) {
  const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
  const expectedItems: Record<string, number> = {
    "/models/": models.length,
    "/replace/": models.length,
    "/migrate/": migrations.length,
    "/providers/": providers.length,
  };
  const home = await readFile(path.join(dist, "index.html"), "utf8");
  for (const hub of HUBS) {
    if (!home.includes(`href="${hub.path}"`)) throw new Error(`Navigation is missing ${hub.path}`);
    if (!sitemap.includes(`${hub.path}</loc>`)) throw new Error(`Sitemap is missing ${hub.path}`);
    const hubLink = new RegExp(`\\]\\([^)\\s]*${hub.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`);
    if (!hubLink.test(llms)) throw new Error(`llms.txt is missing a hub link for ${hub.path}`);
    if (!llmsFull.includes(`${hub.nav}: `) || !llmsFull.includes(hub.path)) throw new Error(`llms-full.txt is missing ${hub.path}`);
    const html = await readFile(path.join(dist, hub.path.slice(1), "index.html"), "utf8");
    if (!html.includes(`<title>${hub.title}</title>`)) throw new Error(`Title mismatch on ${hub.path}`);
    if (!html.includes(`content="${hub.description}"`)) throw new Error(`Meta description mismatch on ${hub.path}`);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/);
    if (!canonical?.[1].endsWith(hub.path)) throw new Error(`Canonical mismatch on ${hub.path}`);
    if (!html.includes('"CollectionPage"') || !html.includes('"ItemList"') || !html.includes('"BreadcrumbList"')) {
      throw new Error(`Hub JSON-LD missing CollectionPage, ItemList, or BreadcrumbList on ${hub.path}`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${hub.path}`);
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!block) throw new Error(`Missing JSON-LD on ${hub.path}`);
    const data = JSON.parse(block[1]) as { "@graph": { "@type": string; numberOfItems?: number; itemListElement?: unknown[] }[] };
    const list = data["@graph"].find((node) => node["@type"] === "ItemList");
    if (!list || list.numberOfItems !== expectedItems[hub.path] || list.itemListElement?.length !== expectedItems[hub.path]) {
      throw new Error(`ItemList count mismatch on ${hub.path}`);
    }
  }
  const sample = models[0];
  const modelHtml = await readFile(path.join(dist, "models", sample.provider, sample.slug, "index.html"), "utf8");
  if (!modelHtml.includes('"name":"Models"') || !modelHtml.includes('class="crumbs"')) {
    throw new Error("Model page breadcrumb is missing the models hub");
  }
  const replaceHtml = await readFile(path.join(dist, "replace", sample.provider, sample.slug, "index.html"), "utf8");
  if (!replaceHtml.includes('"name":"Replacements"')) throw new Error("Replacement page breadcrumb is missing the replace hub");
  const providerHtml = await readFile(path.join(dist, "providers", sample.provider, "index.html"), "utf8");
  if (!providerHtml.includes('"name":"Providers"')) throw new Error("Provider page breadcrumb is missing the providers hub");
  const migration = migrations[0];
  const pair = `${migration.from.provider}__${migration.from.slug}__to__${migration.to.provider}__${migration.to.slug}`;
  const migrateHtml = await readFile(path.join(dist, "migrate", pair, "index.html"), "utf8");
  if (!migrateHtml.includes('"name":"Migrations"')) throw new Error("Migration page breadcrumb is missing the migrate hub");
  const modelsHub = await readFile(path.join(dist, "models/index.html"), "utf8");
  if (!modelsHub.includes('id="hub-filter"') || !modelsHub.includes('id="hub-status"')) {
    throw new Error("Models hub is missing the filter");
  }
  if (!modelsHub.includes(`/models/${sample.provider}/${sample.slug}/`)) throw new Error("Models hub is missing a model link");
}

async function checkStatusPages(sitemap: string, llms: string, llmsFull: string) {
  const [models, providers] = await Promise.all([loadModels(), loadProviders()]);
  const origin = siteOrigin();
  for (const page of ["/deprecated/", "/retired/", OPENAPI_PATH]) {
    if (!sitemap.includes(`${origin}${page}`)) throw new Error(`Sitemap is missing ${page}`);
    if (!llms.includes(page)) throw new Error(`llms.txt is missing ${page}`);
    if (!llmsFull.includes(page)) throw new Error(`llms-full.txt is missing ${page}`);
  }
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  for (const provider of providers) {
    if (locs.includes(`/${provider.id}/`)) throw new Error(`Sitemap includes shortcut /${provider.id}/`);
  }
  if (locs.includes("/google/")) throw new Error("Sitemap includes shortcut /google/");
  for (const target of providerStatusTargets(models)) {
    const pathName = `/providers/${target.provider}/${target.status}/`;
    if (!sitemap.includes(`${origin}${pathName}`)) throw new Error(`Sitemap is missing ${pathName}`);
    if (!llms.includes(pathName)) throw new Error(`llms.txt is missing ${pathName}`);
    if (!llmsFull.includes(pathName)) throw new Error(`llms-full.txt is missing ${pathName}`);
  }
  for (const page of ["/deprecated/", "/retired/"]) {
    const html = await readFile(path.join(dist, page.slice(1), "index.html"), "utf8");
    for (const type of ["CollectionPage", "ItemList", "FAQPage", "BreadcrumbList"]) {
      if (!html.includes(`"${type}"`)) throw new Error(`${page} is missing ${type} JSON-LD`);
    }
    if (!html.includes("dataset version")) throw new Error(`${page} is missing the dataset version`);
    if (!html.includes("/replace/")) throw new Error(`${page} is missing a replacement page link`);
    const answer = html.match(/<p class="answer">([\s\S]*?)<\/p>/);
    if (!answer || answer[1].includes("—") || answer[1].includes("–")) throw new Error(`Em dash in the ${page} intro`);
  }
  const deprecated = await readFile(path.join(dist, "deprecated/index.html"), "utf8");
  const deprecatedCount = models.filter((model) => model.status === "deprecated").length;
  if (!deprecated.includes(`"numberOfItems":${deprecatedCount}`) && !deprecated.includes(`"numberOfItems": ${deprecatedCount}`)) {
    throw new Error("Deprecated ItemList count does not match the dataset");
  }
  const openai = await readFile(path.join(dist, "providers/openai/deprecated/index.html"), "utf8");
  if (!openai.includes("/models/openai/") || !openai.includes("/replace/openai/")) {
    throw new Error("OpenAI deprecated page is missing model or replacement links");
  }
  const modelsHub = await readFile(path.join(dist, "models/index.html"), "utf8");
  if (!modelsHub.includes('href="/deprecated/"') || !modelsHub.includes('href="/retired/"')) {
    throw new Error("Models hub is missing deprecated or retired links");
  }
  const providersHub = await readFile(path.join(dist, "providers/index.html"), "utf8");
  if (!providersHub.includes('href="/deprecated/"') || !providersHub.includes('href="/retired/"')) {
    throw new Error("Providers hub is missing deprecated or retired links");
  }
  const apiPage = await readFile(path.join(dist, "api/index.html"), "utf8");
  if (!apiPage.includes('href="/openapi.json"')) throw new Error("API page is missing the OpenAPI link");
  const shortcut = await readFile(path.join(dist, "openai/index.html"), "utf8");
  if (!shortcut.includes('rel="canonical" href="https://sunsetdiff.com/providers/openai/"')) {
    throw new Error("OpenAI shortcut is missing its canonical URL");
  }
  if (!shortcut.includes('http-equiv="refresh" content="0; url=/providers/openai/"')) {
    throw new Error("OpenAI shortcut is missing its refresh");
  }
  const google = await readFile(path.join(dist, "google/index.html"), "utf8");
  if (!google.includes("/providers/google-gemini-api/") || !google.includes("/providers/google-vertex/")) {
    throw new Error("Google shortcut is missing a provider page");
  }
  if (!google.includes('content="noindex"')) throw new Error("Google shortcut should stay out of the index");
  if (google.includes('http-equiv="refresh"')) throw new Error("Google shortcut must not refresh to one provider");
  const spec = JSON.parse(await readFile(path.join(dist, "openapi.json"), "utf8")) as { openapi: string; servers: { url: string }[]; paths: Record<string, unknown> };
  if (spec.openapi !== "3.1.0") throw new Error("openapi.json is not OpenAPI 3.1");
  if (spec.servers[0]?.url !== OPENAPI_SERVER) throw new Error("openapi.json server is not https://sunsetdiff.com");
  for (const endpoint of ENDPOINTS) {
    if (!spec.paths[openApiPath(endpoint.path)]) throw new Error(`openapi.json is missing ${endpoint.path}`);
  }
  await SwaggerParser.validate(path.join(dist, "openapi.json"));
  const headers = await readFile(path.join(process.cwd(), "render.yaml"), "utf8");
  if (!headers.includes("path: /openapi.json")) throw new Error("render.yaml is missing the OpenAPI header path");
}

async function checkSchedule(sitemap: string, llms: string, llmsFull: string) {
  const [models, providers, migrations] = await Promise.all([loadModels(), loadProviders(), loadMigrations()]);
  const day = today();
  const origin = siteOrigin();
  const pages = [UPCOMING_PATH, TIMELINE_PATH, CHANGELOG_PATH, FAQ_PATH, ...shutdownYearList(models).map(yearPath)];
  const sampleMonth = shutdownMonthList(models).includes("2027-01") ? "2027-01" : shutdownMonthList(models)[0];
  if (!sampleMonth) throw new Error("No shutdown month pages were generated");
  pages.push(monthKeyPath(sampleMonth));
  for (const page of pages) {
    if (!sitemap.includes(`${origin}${page}`)) throw new Error(`Sitemap is missing ${page}`);
    if (!llms.includes(page)) throw new Error(`llms.txt is missing ${page}`);
    if (!llmsFull.includes(page)) throw new Error(`llms-full.txt is missing ${page}`);
    const html = await readFile(path.join(dist, page.slice(1), "index.html"), "utf8");
    for (const type of ["CollectionPage", "ItemList", "FAQPage", "Dataset", "BreadcrumbList"]) {
      if (!html.includes(`"${type}"`)) throw new Error(`${page} is missing ${type} JSON-LD`);
    }
    if (html.includes("—") || html.includes("–")) throw new Error(`Em dash on ${page}`);
  }
  const upcoming = await readFile(path.join(dist, "upcoming/index.html"), "utf8");
  if (!upcoming.includes("/calendar.ics") || !upcoming.includes("/calendar/") || !upcoming.includes("/feed.xml")) {
    throw new Error("Upcoming page is missing the calendar or feed link");
  }
  const changelog = await readFile(path.join(dist, "changelog/index.html"), "utf8");
  if (!changelog.includes("/feed.xml") || !changelog.includes("/data/changelog.json")) {
    throw new Error("Changelog page is missing the feed or changelog.json link");
  }
  const rows = toScheduleRows(shutdownsInMonth(models, sampleMonth), models, providers, migrations, day);
  const question = periodFaqs(rows, providers, monthScope(sampleMonth), day).find((item) => item.question.startsWith("How many OpenAI"));
  if (!question) throw new Error(`Missing OpenAI count question for ${sampleMonth}`);
  const monthHtml = await readFile(path.join(dist, monthKeyPath(sampleMonth).slice(1), "index.html"), "utf8");
  if (!monthHtml.includes(question.question) || !monthHtml.includes(question.answer)) {
    throw new Error(`Month page is missing the OpenAI count answer for ${sampleMonth}`);
  }
}

function htmlHas(html: string, text: string): boolean {
  if (html.includes(text)) return true;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  if (html.includes(escaped)) return true;
  return visibleText(html).includes(text);
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ");
}

async function sitemapText(dir: string): Promise<string> {
  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith("sitemap") && entry.name.endsWith(".xml"))
    .map((entry) => entry.name);
  if (!names.length) throw new Error("Sitemap files are missing");
  const parts: string[] = [];
  for (const name of names) parts.push(await readFile(path.join(dir, name), "utf8"));
  return parts.join("\n");
}

async function checkDiscovery(sitemap: string, llms: string, llmsFull: string) {
  const mcp = await readFile(path.join(dist, "mcp/index.html"), "utf8");
  const integrations = await readFile(path.join(dist, "integrations/index.html"), "utf8");
  const manifest = await readFile(path.join(dist, "server.json"), "utf8");
  const rootManifest = await readFile(path.join(process.cwd(), "server.json"), "utf8");
  if (manifest !== rootManifest) throw new Error("dist/server.json does not match the repo root server.json");
  const server = JSON.parse(manifest) as { name?: string; remotes?: { type?: string; url?: string }[] };
  if (server.name !== MCP_REGISTRY_NAME) throw new Error("server.json name is not the domain namespace");
  if (server.remotes?.[0]?.type !== "streamable-http") throw new Error("server.json remote type is not streamable-http");
  if (server.remotes?.[0]?.url !== MCP_ENDPOINT) throw new Error("server.json remote URL is wrong");
  for (const page of [mcp, integrations]) {
    if (page.includes("—") || page.includes("–")) throw new Error("Em dash on an MCP or integrations page");
    if (page.toLowerCase().includes("alix")) throw new Error("Personal name on an MCP or integrations page");
    if (!page.includes("BreadcrumbList") && !page.includes('"BreadcrumbList"')) {
      throw new Error("MCP or integrations page is missing breadcrumb JSON-LD");
    }
  }
  if (!mcp.includes('"SoftwareApplication"') || !mcp.includes('"WebAPI"')) {
    throw new Error("MCP page is missing SoftwareApplication or WebAPI JSON-LD");
  }
  if (!mcp.includes(MCP_ENDPOINT)) throw new Error("MCP page is missing the endpoint");
  for (const tool of mcpTools) {
    if (!mcp.includes(tool.name)) throw new Error(`MCP page is missing ${tool.name}`);
    if (!mcp.includes(tool.description)) throw new Error(`MCP page is missing the ${tool.name} description`);
  }
  for (const client of mcpClients) {
    for (const doc of client.docs) {
      if (!mcp.includes(doc.url)) throw new Error(`MCP page is missing doc ${doc.url}`);
    }
  }
  for (const href of [
    "/guides/swap-a-deprecated-model/",
    "/guides/swap-a-deprecated-model/#litellm",
    "/guides/swap-a-deprecated-model/#openrouter",
    "/guides/swap-a-deprecated-model/#vercel-ai-sdk",
    "/guides/swap-a-deprecated-model/#langchain",
    "/mcp/",
    "/api/",
    "/badges/",
    "/feed.xml",
    "/deadlines.ics",
    "/data/#github-action",
  ]) {
    if (!integrations.includes(href)) throw new Error(`Integrations page is missing ${href}`);
  }
  if (!integrations.includes('"CollectionPage"')) throw new Error("Integrations page is missing CollectionPage JSON-LD");
  const home = await readFile(path.join(dist, "index.html"), "utf8");
  if (!home.includes('href="/mcp/"') || !home.includes('href="/integrations/"')) {
    throw new Error("Nav is missing MCP or Integrations");
  }
  const api = await readFile(path.join(dist, "api/index.html"), "utf8");
  if (!api.includes("/mcp/") || !api.includes(MCP_ENDPOINT)) throw new Error("API page is missing the MCP server");
  for (const rel of ["/mcp/</loc>", "/integrations/</loc>", "/server.json</loc>"]) {
    if (!sitemap.includes(rel)) throw new Error(`Sitemap is missing ${rel}`);
  }
  for (const rel of ["/mcp/", "/integrations/", "/server.json", MCP_ENDPOINT]) {
    if (!llms.includes(rel)) throw new Error(`llms.txt is missing ${rel}`);
    if (!llmsFull.includes(rel)) throw new Error(`llms-full.txt is missing ${rel}`);
  }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
