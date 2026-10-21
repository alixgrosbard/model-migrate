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

`PUBLIC_ALERTS_SENDING` defaults to on. The form note is “We email you before models shut down. Unsubscribe anytime.” Set it to `false` to restore the older note.

`/pro/` is SunsetDiff Pro early access. Join free today. You won't be charged until Pro launches, and we'll email you before your first charge. After that it's $19 a month, and you can cancel anytime. Features that are not built yet say "Coming at launch". The public JSON files and `/api/v1` say "Available now" and stay free. Set `PUBLIC_PRO_CHECKOUT_URL` to an http or https checkout link to show the "Start free early access" button. The live Stripe link includes a trial, so nobody is billed before launch. When that variable is unset, the page says there is no checkout link and shows the free alert signup.

## Data

JSON files in `data/` are the source of truth. Scrapers read official public pages only. Every date and spec links to the page it came from, with a last_checked date. Missing values stay empty and the site says "Not published". A live scrape also reads official model docs for price, context window, and max output, and leaves a field empty when that page does not publish it.

Refresh runs in GitHub Actions every 6 hours (`.github/workflows/refresh.yml`). If a scraper returns nothing, or more than 30% fewer rows than last time, it does not overwrite data and opens one `scraper-broken` issue.

```bash
npm run scrape
```

## Newsletter

The form adds an email as a Resend contact. A new contact gets one welcome email from `SunsetDiff <alerts@send.sunsetdiff.com>`. A duplicate signup does not get another welcome. The welcome lists the next shutdowns from the published dataset. Its footer links to a signed `/unsubscribe` page, which marks that contact unsubscribed in Resend. There is no email-sending package in this repo. The API calls Resend with `fetch`.

The Node service needs `RESEND_API_KEY` and `RESEND_SEGMENT_ID`. If either is missing, `POST /api/subscribe` returns 503. Set both in the Render dashboard. They are not committed.

## Visits

Every HTML page sends one beacon to `POST /api/hit` on page load. The body is the path, the referrer hostname, and `utm_source` when it is a short label. The browser script uses `navigator.sendBeacon`, then `fetch` with `keepalive`. It does not set a cookie, use localStorage, or build a fingerprint.

The service drops known crawler and monitor user agents, and any request without a browser user agent. A visitor is a daily hash of IP plus user agent. The salt stays in process memory and changes each UTC day. Raw IPs are not stored. Counts older than 30 days are deleted.

`GET /api/stats` returns those 30 days, plus top pages, referrer hosts, and utm sources. Send `Authorization: Bearer $STATS_TOKEN`. If `STATS_TOKEN` is missing, the route returns 503. Set it on the Render service `sunsetdiff-api`. Do not commit it.

Counts are stored in the free Render Postgres database `sunsetdiff-stats`. The service reads `DATABASE_URL` (the internal connection string). That free database expires 30 days after it was created. A persistent disk or paid database was not added.

## Machine access

- `/llms.txt` and `/llms-full.txt`
- `/api/v1/index.json` and the rest of `/api/v1/`
- `/dataset/sunsetdiff.json` and `/dataset/sunsetdiff.csv`
- `/data/models.json`, `/data/deprecations.csv`, and `/data/changelog.json`
- `/deadlines.ics` and `/feed.xml`
- MCP tools on the Node service at `/mcp`: `check_model`, `upcoming_shutdowns`, `migration_diff`, `scan_text`
- Local MCP: `npx github:alixgrosbard/model-migrate mcp`
- GitHub Action in `action/` (not published to the Marketplace)

## Hosting

`render.yaml` describes a free static site and a free Node service. There is no database. Render cron jobs are paid, so the refresh stays on GitHub Actions.

## Cite the dataset

Publisher: SunsetDiff. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The citable files are:

- https://sunsetdiff.com/data/models.json
- https://sunsetdiff.com/data/deprecations.csv
- https://sunsetdiff.com/data/changelog.json

`changelog.json` groups recorded changes by date. Its `version` is the latest change date. A blank field was not published on the official page. Do not treat a blank as zero. Each date in the dataset is copied from an official source recorded in the model file.

## Licenses

Code is MIT (`LICENSE`). The dataset is CC BY 4.0 (`DATA_LICENSE`).
