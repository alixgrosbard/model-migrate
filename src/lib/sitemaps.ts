import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const SITEMAP_SECTION_FILES = [
  "sitemap-core.xml",
  "sitemap-models.xml",
  "sitemap-replace.xml",
  "sitemap-migrate.xml",
  "sitemap-guides.xml",
  "sitemap-dates.xml",
] as const;

export type SitemapSectionFile = (typeof SITEMAP_SECTION_FILES)[number];

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

const GUIDE_PREFIXES = ["/errors/", "/guides/", "/frameworks/", "/glossary/", "/breaking-changes"];

/** Which child sitemap a URL belongs in. Hubs stay in core. Leaf pages go to their section. */
export function sitemapSection(pathname: string): SitemapSectionFile {
  if (pathname.startsWith("/models/")) return "sitemap-models.xml";
  if (pathname.startsWith("/replace/")) return "sitemap-replace.xml";
  if (pathname.startsWith("/migrate/")) return "sitemap-migrate.xml";
  if (GUIDE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "sitemap-guides.xml";
  if (isDatePath(pathname)) return "sitemap-dates.xml";
  return "sitemap-core.xml";
}

function isDatePath(pathname: string): boolean {
  if (/^\/\d{4}\/$/.test(pathname)) return true;
  if (/^\/\d{4}\/\d{2}\/$/.test(pathname)) return true;
  if (pathname.startsWith("/deadlines/") && pathname !== "/deadlines/") return true;
  if (pathname.startsWith("/shutdowns/") && pathname !== "/shutdowns/") return true;
  return false;
}

export function parseSitemapUrls(xml: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1];
    if (!loc) continue;
    const raw = block.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1];
    const lastmod = raw?.slice(0, 10);
    urls.push(lastmod ? { loc, lastmod } : { loc });
  }
  return urls;
}

export function pathnameOfLoc(loc: string): string {
  try {
    return new URL(loc).pathname;
  } catch {
    return loc;
  }
}

export interface SplitSitemaps {
  files: Map<SitemapSectionFile, string>;
  index: string;
  dropped: string[];
}

/**
 * Group urlset entries into section sitemaps. `include` drops thin URLs.
 * The index lastmod for a section is the newest per-URL lastmod in that file.
 */
export function splitSitemaps(urls: SitemapUrl[], origin: string, include: (pathname: string) => boolean): SplitSitemaps {
  const grouped = new Map<SitemapSectionFile, SitemapUrl[]>();
  const seen = new Set<string>();
  const dropped: string[] = [];
  const ordered = [...urls].sort((a, b) => a.loc.localeCompare(b.loc));
  for (const url of ordered) {
    if (seen.has(url.loc)) continue;
    seen.add(url.loc);
    const pathname = pathnameOfLoc(url.loc);
    if (!include(pathname)) {
      dropped.push(pathname);
      continue;
    }
    const file = sitemapSection(pathname);
    const list = grouped.get(file) ?? [];
    list.push(url);
    grouped.set(file, list);
  }
  const files = new Map<SitemapSectionFile, string>();
  const indexEntries: { file: SitemapSectionFile; lastmod?: string }[] = [];
  for (const file of SITEMAP_SECTION_FILES) {
    const list = grouped.get(file);
    if (!list?.length) continue;
    files.set(file, urlsetXml(list));
    indexEntries.push({ file, lastmod: newestLastmod(list) });
  }
  return { files, index: sitemapIndexXml(origin, indexEntries), dropped };
}

export function urlsetXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((url) => {
      const lastmod = url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : "";
      return `<url><loc>${url.loc}</loc>${lastmod}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>\n`;
}

export function sitemapIndexXml(origin: string, entries: { file: string; lastmod?: string }[]): string {
  const root = origin.replace(/\/+$/, "");
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : "";
      return `<sitemap><loc>${root}/${entry.file}</loc>${lastmod}</sitemap>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>\n`;
}

function newestLastmod(urls: SitemapUrl[]): string | undefined {
  let newest = "";
  for (const url of urls) {
    const day = url.lastmod?.slice(0, 10);
    if (day && day > newest) newest = day;
  }
  return newest || undefined;
}

/** Replace Astro's numbered sitemap-0.xml with one sitemap per section, plus the index. */
export async function writeSectionSitemaps(outDir: string, origin: string, include: (pathname: string) => boolean): Promise<void> {
  const names = (await readdir(outDir)).filter((name) => /^sitemap-\d+\.xml$/.test(name));
  if (!names.length) throw new Error("Astro did not write sitemap-0.xml");
  const urls: SitemapUrl[] = [];
  for (const name of names.sort()) {
    const xml = await readFile(path.join(outDir, name), "utf8");
    if (!xml.includes("<urlset")) throw new Error(`${name} is not a urlset`);
    urls.push(...parseSitemapUrls(xml));
  }
  const split = splitSitemaps(urls, origin, include);
  if (!split.files.size) throw new Error("Section sitemaps are empty");
  await writeFile(path.join(outDir, "sitemap-index.xml"), split.index);
  await writeFile(path.join(outDir, "sitemap.xml"), split.index);
  for (const [file, xml] of split.files) {
    await writeFile(path.join(outDir, file), xml);
  }
  for (const name of names) await rm(path.join(outDir, name), { force: true });
}
