import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { lastmodForUrl } from "./src/lib/lastmod.ts";
import { siteOrigin } from "./src/lib/site.ts";

const site = siteOrigin();

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  redirects: {
    "/sitemap.xml": "/sitemap-index.xml",
  },
  integrations: [
    sitemap({
      customPages: [
        `${site}/deadlines.ics`,
        `${site}/feed.xml`,
        `${site}/data/models.json`,
        `${site}/data/deprecations.csv`,
        `${site}/data/changelog.json`,
      ],
      serialize(item) {
        const lastmod = lastmodForUrl(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
});
