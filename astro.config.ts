import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { lastmodForUrl } from "./src/lib/lastmod.ts";
import { includeInSitemap } from "./src/lib/indexability.ts";
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
          return !pathname.startsWith("/.well-known/") && includeInSitemap(page);
        } catch {
          return includeInSitemap(page);
        }
      },
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
          await writeSectionSitemaps(out, site, (pathname) => includeInSitemap(pathname));
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
