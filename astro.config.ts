import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { lastmodForUrl } from "./src/lib/lastmod.ts";
import { excludeFromSitemap } from "./src/lib/indexability.ts";
import { OPENAPI_PATH } from "./src/lib/openapi.ts";
import { siteOrigin } from "./src/lib/site.ts";
import { writeSectionSitemaps } from "./src/lib/sitemaps.ts";

const site = siteOrigin();

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter(page) {
        try {
          const pathname = new URL(page).pathname;
          return pathname !== "/google/"
            && pathname !== "/models/openai/gpt-4-1-2/"
            && pathname !== "/migrate/openai__gpt-4-5-preview__to__openai__gpt-4-1-2/"
            && !pathname.startsWith("/.well-known/")
            && !excludeFromSitemap(page);
        } catch {
          return true;
        }
      },
      customPages: [
        `${site}/deadlines.ics`,
        `${site}/feed.xml`,
        `${site}/data/models.json`,
        `${site}/data/deprecations.csv`,
        `${site}/data/changelog.json`,
        `${site}/data/breaking-changes.json`,
        `${site}/data/breaking-changes.csv`,
        `${site}${OPENAPI_PATH}`,
        `${site}/server.json`,
      ],
      serialize(item) {
        const lastmod = lastmodForUrl(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
    // Render static hosting does not apply Astro redirects. Publish a real
    // sitemap.xml file so /sitemap.xml is the sitemap index.
    {
      name: "sitemap-xml-file",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const out = fileURLToPath(dir);
          await writeSectionSitemaps(out, site, (pathname) => !excludeFromSitemap(`${site}${pathname}`));
          // Vite's public copy uses readdir, which includes dot directories.
          // Copy again so a bundler that skips them cannot drop this file.
          await cp(path.join(process.cwd(), "public", ".well-known"), path.join(out, ".well-known"), {
            recursive: true,
            force: true,
          });
        },
      },
    },
  ],
});
