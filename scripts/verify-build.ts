import { readFile, readdir } from "node:fs/promises";
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
  const home = await readFile(path.join(dist, "index.html"), "utf8");
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
  const sitemap = await sitemapText(dist);
  const events = shutdownEvents(await loadModels());
  const day = today();
  if (!events.length) throw new Error("No shutdown event pages were generated");
  if (!sitemap.includes("/shutdowns/")) throw new Error("Sitemap is missing /shutdowns/");
  if (!llms.includes("/shutdowns/")) throw new Error("llms.txt is missing /shutdowns/");
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

async function sitemapText(dir: string): Promise<string> {
  const names = (await readdir(dir)).filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"));
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
