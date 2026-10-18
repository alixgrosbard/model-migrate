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

The site URL defaults to `https://sunsetdiff.com`. Set `SITE_URL` to another origin, with no path, to override it. Canonical links, the sitemap, `llms.txt`, and Open Graph image URLs use that value.

If `PUBLIC_SERVICE_URL` is not set, the deprecation-alert form stays disabled. It does not post anywhere and it does not send email.

## Data

JSON files in `data/` are the source of truth. Scrapers read official public pages only. Every date and spec links to the page it came from, with a last_checked date. Missing values stay empty and the site says "Not published". A live scrape also reads official model docs for price, context window, and max output, and leaves a field empty when that page does not publish it.

Refresh runs in GitHub Actions every 6 hours (`.github/workflows/refresh.yml`). If a scraper returns nothing, or more than 30% fewer rows than last time, it does not overwrite data and opens one `scraper-broken` issue.

```bash
npm run scrape
```

## Newsletter

The form adds an email as a Resend contact. It does not send email. There is no email-sending package in this repo.

The Node service needs `RESEND_API_KEY` and `RESEND_SEGMENT_ID`. If either is missing, `POST /api/subscribe` returns 503. Set both in the Render dashboard. They are not committed.

## Machine access

- `/llms.txt` and `/llms-full.txt`
- `/api/v1/index.json` and the rest of `/api/v1/`
- `/dataset/sunsetdiff.json` and `/dataset/sunsetdiff.csv`
- MCP tools on the Node service at `/mcp`: `check_model`, `upcoming_shutdowns`, `migration_diff`, `scan_text`
- Local MCP: `npx github:<owner>/model-migrate mcp`
- GitHub Action in `action/` (not published to the Marketplace)

## Hosting

`render.yaml` describes a free static site and a free Node service. There is no database. Render cron jobs are paid, so the refresh stays on GitHub Actions.

## Licenses

Code is MIT (`LICENSE`). The dataset is CC BY 4.0 (`DATA_LICENSE`).
