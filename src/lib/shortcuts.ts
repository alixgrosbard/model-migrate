import type { Provider } from "../schema.ts";
import { guidePath } from "./guides.ts";

export const SHORTCUT_MARKER = "sunsetdiff-provider-shortcut";

export interface ShortcutFile {
  slug: string;
  html: string;
}

/** One meta-refresh page per provider id. Render serves this file and does not apply a redirect rule on the same path. */
export function shortcutFiles(site: string, providers: Provider[]): ShortcutFile[] {
  const origin = site.replace(/\/+$/, "");
  return providers.map((provider) => ({
    slug: provider.id,
    html: redirectHtml(origin, provider.name, `/providers/${provider.id}/`),
  }));
}

/** Short noindex alias. Render does not apply an Astro redirect on this path. */
export function contentAliasFiles(site: string): ShortcutFile[] {
  const origin = site.replace(/\/+$/, "");
  const target = guidePath("custom-gpt-retirement");
  return [
    {
      slug: "custom-gpts",
      html: aliasHtml(
        origin,
        "Custom GPTs",
        "OpenAI is retiring custom GPTs. This page links to the sourced guide.",
        target,
      ),
    },
  ];
}

function aliasHtml(origin: string, name: string, description: string, target: string): string {
  const canonical = `${origin}${target}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} | SunsetDiff</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />
  <meta name="robots" content="noindex" />
  <meta name="generator" content="${SHORTCUT_MARKER}" />
</head>
<body>
  <p><a href="${escapeHtml(target)}">${escapeHtml(name)}</a></p>
</body>
</html>
`;
}

function redirectHtml(origin: string, name: string, target: string): string {
  const canonical = `${origin}${target}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} model shutdowns | SunsetDiff</title>
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />
  <meta name="generator" content="${SHORTCUT_MARKER}" />
</head>
<body>
  <p><a href="${escapeHtml(target)}">${escapeHtml(name)} model shutdowns</a></p>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
