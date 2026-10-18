import { fetch as undiciFetch } from "undici";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const USER_AGENT = "SunsetDiffBot/1.0 (+https://sunsetdiff.onrender.com)";

const robotsCache = new Map<string, string>();

export async function politeFetch(url: string): Promise<string> {
  const allowed = await robotsAllows(url);
  if (!allowed) {
    throw new Error(`robots.txt disallows ${url}`);
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const wantsMarkdown = /\.md(?:$|\?)/.test(url);
      const response = await undiciFetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          // Docs sites serve markdown when the client says it accepts it.
          // HTML pages are parsed as HTML, so only .md URLs ask for markdown.
          accept: wantsMarkdown
            ? "text/markdown, text/plain;q=0.9, text/html;q=0.5"
            : "text/html, application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

async function robotsAllows(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const origin = parsed.origin;
  let body = robotsCache.get(origin);
  if (body == null) {
    try {
      const response = await undiciFetch(new URL("/robots.txt", origin), {
        headers: { "user-agent": USER_AGENT },
      });
      body = response.ok ? await response.text() : "";
    } catch {
      body = "";
    }
    robotsCache.set(origin, body);
  }
  return pathAllowed(body, parsed.pathname);
}

export function pathAllowed(robots: string, pathname: string): boolean {
  const lines = robots.split(/\r?\n/);
  let applies = false;
  const rules: { allow: boolean; path: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(allow|disallow|user-agent)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      applies = value === "*";
      continue;
    }
    if (!applies) continue;
    rules.push({ allow: key === "allow", path: value });
  }
  let decision = true;
  let length = -1;
  for (const rule of rules) {
    if (!rule.path) continue;
    if (pathname.startsWith(rule.path) && rule.path.length > length) {
      decision = rule.allow;
      length = rule.path.length;
    }
  }
  return decision;
}

export async function saveSnapshot(provider: string, html: string, stamp: string, suffix = ""): Promise<void> {
  const dir = path.join("snapshots", provider);
  await mkdir(dir, { recursive: true });
  const name = `${stamp}${suffix}.html`;
  await writeFile(path.join(dir, name), html);
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".html"))
    .sort();
  const extra = files.length - 10;
  for (let i = 0; i < extra; i++) {
    await unlink(path.join(dir, files[i]));
  }
}

export async function readSnapshot(file: string): Promise<string> {
  return readFile(file, "utf8");
}
