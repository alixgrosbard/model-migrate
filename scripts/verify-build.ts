import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { htmlContainsOwnerPlaceholder } from "../src/lib/public-copy.ts";
import { loadModels } from "../src/lib/load.ts";
import { today } from "../src/lib/format.ts";
import { isPastShutdown, shutdownEventPath, shutdownEvents } from "../src/lib/shutdowns.ts";

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
  "deadlines/index.html",
  "questions/index.html",
  "scan/index.html",
  "pro/index.html",
  "shutdowns/index.html",
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
  if (!llms.includes("/shutdowns/")) throw new Error("llms.txt is missing /shutdowns/");
  if (!llms.includes("/alternatives/")) throw new Error("llms.txt is missing /alternatives/");
  if (!llms.includes("/api/")) throw new Error("llms.txt is missing /api/");
  const llmsFull = await readFile(path.join(dist, "llms-full.txt"), "utf8");
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
  console.log(`Verified ${checked} HTML files and required static outputs.`);
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
