# SunsetDiff

SunsetDiff is a free site and dataset. It tells you when an AI model shuts down, what replaces it, and what changes in price, context, and code.

The publisher is SunsetDiff.

## Build

```bash
npm ci
npm test
npm run build
```

The build needs no environment variables. Output is the static folder `dist/`. A Render free static site can serve it with build command `npm ci && npm run build` and publish path `dist/`.

The site URL defaults to `https://sunsetdiff.onrender.com`. Set `SITE_URL` to another origin, with no path, when you attach a custom domain later. Canonical links, the sitemap, `llms.txt`, and Open Graph image URLs use that value.

If `PUBLIC_SERVICE_URL` is not set, the newsletter form stays on the page and says signups open soon. It does not post anywhere.

## Data

JSON files in `data/` are the source of truth. Scrapers read official public pages only. Every date and spec links to the page it came from, with a last_checked date. Missing values stay empty and the site says "Not published". A live scrape also reads official model docs for price, context window, and max output, and leaves a field empty when that page does not publish it.

Refresh runs in GitHub Actions every 6 hours (`.github/workflows/refresh.yml`). If a scraper returns nothing, or more than 30% fewer rows than last time, it does not overwrite data and opens one `scraper-broken` issue.

```bash
npm run scrape
```

## Newsletter

The form stores an email in Postgres. It does not send email. There is no email package in this repo.

`npm run export-subscribers` writes a local CSV when `DATABASE_URL` is set. There is no public list of subscribers.

Render's free Postgres expires 30 days after you create it, then it is deleted after a grace period. Swap `DATABASE_URL` to any other free Postgres before day 30. This repo does not sign you up for another database.

## Machine access

- `/llms.txt` and `/llms-full.txt`
- `/api/v1/index.json` and the rest of `/api/v1/`
- `/dataset/sunsetdiff.json` and `/dataset/sunsetdiff.csv`
- MCP tools on the Node service at `/mcp`: `check_model`, `upcoming_shutdowns`, `migration_diff`, `scan_text`
- Local MCP: `npx github:<owner>/model-migrate mcp`
- GitHub Action in `action/` (not published to the Marketplace)

## Hosting

`render.yaml` describes a free static site, a free Node service, and a free Postgres database. Do not add a custom domain. Render cron jobs are paid, so the refresh stays on GitHub Actions.

## Licenses

Code is MIT (`LICENSE`). The dataset is CC BY 4.0 (`DATA_LICENSE`).
