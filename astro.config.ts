import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { lastmodForUrl } from "./src/lib/lastmod.ts";
import { OPENAPI_PATH } from "./src/lib/openapi.ts";
import { siteOrigin } from "./src/lib/site.ts";

const site = siteOrigin();

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter(page) {
        try {
          return new URL(page).pathname !== "/google/";
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
          const source = path.join(out, "sitemap-index.xml");
          const target = path.join(out, "sitemap.xml");
          await rm(target, { recursive: true, force: true });
          await copyFile(source, target);
        },
      },
    },
  ],
});
