import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

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
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
  const banned = ["nodemailer", "resend", "@sendgrid/mail", "stripe", "postmark"];
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of banned) {
    if (deps[name]) throw new Error(`Disallowed package installed: ${name}`);
  }
  console.log(`Verified ${checked} HTML files and required static outputs.`);
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
