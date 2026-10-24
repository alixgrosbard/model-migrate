import { BREAKING_CHANGES_CSV_HEADERS } from "./breaking-changes.ts";
import type { FaqItem } from "./format.ts";

/** Static files the site build writes. Paths match scripts/generate-static.ts. */

export const MODEL_RECORD_FIELDS = [
  "id",
  "slug",
  "provider",
  "display_name",
  "family",
  "status",
  "announced_date",
  "deprecation_date",
  "shutdown_date",
  "shutdown_date_kind",
  "region_or_platform_notes",
  "replacements",
  "sources",
  "specs",
  "first_seen",
  "updated_at",
] as const;

export const SPEC_FIELDS = [
  "input_price_per_mtok",
  "output_price_per_mtok",
  "cached_input_price_per_mtok",
  "batch_discount_pct",
  "currency",
  "context_window_tokens",
  "max_output_tokens",
  "modalities_in",
  "modalities_out",
  "supports_tools",
  "supports_json_schema",
  "supports_vision",
  "supports_streaming",
  "supports_batch",
  "supports_prompt_caching",
  "reasoning",
  "knowledge_cutoff",
  "endpoints",
  "specs_sources",
] as const;

export const REPLACEMENT_FIELDS = ["model_id", "provider", "kind", "source_url"] as const;
export const SOURCE_FIELDS = ["url", "label", "last_checked", "excerpt"] as const;
export const PROVIDER_FIELDS = ["id", "name", "deprecations_url", "pricing_url", "models_url"] as const;
export const MIGRATION_FIELDS = [
  "from",
  "to",
  "price_diff",
  "context_diff",
  "max_output_diff",
  "capability_changes",
  "api_changes",
  "code_change",
  "migration_checklist",
  "confidence",
  "last_checked",
  "sources",
] as const;
export const CHANGE_FIELDS = ["date", "provider", "model_id", "field", "old", "new", "source_url"] as const;

export const DEPRECATIONS_CSV_HEADERS = [
  "provider",
  "id",
  "slug",
  "display_name",
  "status",
  "announced_date",
  "deprecation_date",
  "shutdown_date",
  "shutdown_date_kind",
  "replacement_id",
  "replacement_provider",
  "source_url",
  "last_checked",
] as const;

/** Key order of the compact object in scripts/generate-static.ts. That object is also the dataset CSV header row. */
export const COMPACT_FIELDS = [
  "id",
  "slug",
  "provider",
  "display_name",
  "status",
  "shutdown_date",
  "shutdown_date_kind",
  "replacement",
  "source_url",
  "last_checked",
] as const;

export interface EndpointDoc {
  path: string;
  title: string;
  format: string;
  summary: string;
  fields: { name: string; detail: string }[];
  notes: string[];
  body: "json" | "text";
}

const modelRecordDetail =
  "Full model record. status is active, legacy, deprecated, or retired. shutdown_date_kind is exact, not_before, month_only, or none. A null date or spec means the official page did not publish it.";

const specDetail = `specs object: ${SPEC_FIELDS.join(", ")}. Prices are USD per 1M tokens when published. specs_sources maps a spec field to { url, last_checked }.`;

const replacementDetail = `replacements[]: ${REPLACEMENT_FIELDS.join(", ")}. kind is official or editorial.`;

const sourceDetail = `sources[]: ${SOURCE_FIELDS.join(", ")}. last_checked is the day that page was read, YYYY-MM-DD.`;

export const ENDPOINTS: EndpointDoc[] = [
  {
    path: "/data/models.json",
    title: "Full model records",
    format: "application/json",
    summary: "The model retirement dataset as one JSON object. License CC BY 4.0.",
    fields: [
      { name: "name", detail: "Fixed string: SunsetDiff model retirement dataset." },
      { name: "publisher", detail: "Fixed string: SunsetDiff." },
      { name: "license", detail: "https://creativecommons.org/licenses/by/4.0/" },
      { name: "version", detail: "The newest changelog date, YYYY-MM-DD." },
      { name: "models", detail: modelRecordDetail },
      { name: "models[].id", detail: "Provider model id, such as gpt-4o." },
      { name: "models[].slug", detail: "URL slug for the model page." },
      { name: "models[].provider", detail: "Provider id. See /api/v1/providers.json." },
      { name: "models[].display_name", detail: "Name shown on the site." },
      { name: "models[].family", detail: "Family name, or null." },
      { name: "models[].status", detail: "active, legacy, deprecated, or retired." },
      { name: "models[].announced_date", detail: "YYYY-MM-DD, or null when the page did not publish one." },
      { name: "models[].deprecation_date", detail: "YYYY-MM-DD, or null." },
      { name: "models[].shutdown_date", detail: "YYYY-MM-DD, or null." },
      { name: "models[].shutdown_date_kind", detail: "exact, not_before, month_only, or none. not_before is a floor, not a deadline." },
      { name: "models[].region_or_platform_notes", detail: "Scope note when the date does not apply everywhere, a release note, or a Sources disagree note when official pages list different shutdown dates. Null when none of those were published. shutdown_date stays the deprecations-page date when sources disagree." },
      { name: "models[].replacements", detail: replacementDetail },
      { name: "models[].sources", detail: sourceDetail },
      { name: "models[].specs", detail: specDetail },
      { name: "models[].first_seen", detail: "ISO-8601 timestamp when the record was first stored." },
      { name: "models[].updated_at", detail: "ISO-8601 timestamp when the record last changed." },
    ],
    notes: ["Credit SunsetDiff and link the license when you copy this file."],
    body: "json",
  },
  {
    path: "/data/deprecations.csv",
    title: "Deprecating and retired rows",
    format: "text/csv",
    summary: "One row per model that is not active, has a dated shutdown, or has a deprecation date. License CC BY 4.0.",
    fields: DEPRECATIONS_CSV_HEADERS.map((name) => ({
      name,
      detail:
        name === "replacement_id"
          ? "Official replacement model id when one is marked official. Otherwise the first replacement. Empty when none is listed."
          : name === "replacement_provider"
            ? "Provider id of that replacement. Empty when replacement_id is empty."
            : name === "source_url"
              ? "First official source URL on the record."
              : name === "last_checked"
                ? "Day that source was read, YYYY-MM-DD."
                : "Same meaning as the model record field. Empty when the official page did not publish it.",
    })),
    notes: ["Quoted CSV. A blank cell was not on the official page."],
    body: "text",
  },
  {
    path: "/data/changelog.json",
    title: "Changelog",
    format: "application/json",
    summary: "Versioned field changes recorded from official pages. License CC BY 4.0.",
    fields: [
      { name: "name", detail: "Fixed string: SunsetDiff model retirement dataset." },
      { name: "publisher", detail: "Fixed string: SunsetDiff." },
      { name: "license", detail: "https://creativecommons.org/licenses/by/4.0/" },
      { name: "version", detail: "Date of the newest version group, YYYY-MM-DD." },
      { name: "versions", detail: "Array of { version, changes }, oldest first." },
      { name: "versions[].version", detail: "The change date, YYYY-MM-DD." },
      { name: "versions[].changes", detail: `Each change has ${CHANGE_FIELDS.filter((field) => field !== "date").join(", ")}. old and new are the recorded values. source_url is the official page.` },
    ],
    notes: ["A version group is every change recorded on that calendar date."],
    body: "json",
  },
  {
    path: "/data/breaking-changes.json",
    title: "Request breaking changes",
    format: "application/json",
    summary:
      "One rule per row for a request setting or endpoint a replacement model rejects, or for an API version that rejects a setting on every model. License CC BY 4.0. error_text is null when the cited page does not print a sentence. scope and api_version are omitted on model-scoped rows.",
    fields: [
      { name: "name", detail: "Fixed string: SunsetDiff request breaking changes." },
      { name: "publisher", detail: "Fixed string: SunsetDiff." },
      { name: "license", detail: "https://creativecommons.org/licenses/by/4.0/" },
      { name: "description", detail: "What the file contains." },
      { name: "version", detail: "The newest rules[].checked date, YYYY-MM-DD." },
      { name: "rules", detail: "One object per breaking change." },
      { name: "rules[].id", detail: "Stable id. The hub links to /breaking-changes/#id." },
      { name: "rules[].provider", detail: "Provider id. See /api/v1/providers.json." },
      { name: "rules[].provider_name", detail: "Provider name shown on the site." },
      { name: "rules[].model_family", detail: "Family label from the source, or null." },
      { name: "rules[].models", detail: "Models this rule is shown for. Each item has id, provider, slug, and role." },
      { name: "rules[].models[].role", detail: "rejects means this id fails the old setting. switch_from means a switch guide leaves this id for a model that fails it." },
      { name: "rules[].old_setting", detail: "The request field, value, or endpoint the old call sent." },
      { name: "rules[].what_happens", detail: "What the cited page says happens now." },
      { name: "rules[].error_text", detail: "Exact sentence from source_url or quote_source_url. Null when neither page prints one." },
      { name: "rules[].fix", detail: "The change the cited page tells you to make." },
      { name: "rules[].source_url", detail: "Official page or public GitHub issue the row is taken from." },
      { name: "rules[].source_label", detail: "Short name for that page." },
      { name: "rules[].quote_source_url", detail: "Page that prints error_text, when it is not source_url. Null otherwise." },
      { name: "rules[].quote_source_label", detail: "Short name for quote_source_url, or null." },
      { name: "rules[].checked", detail: "Day the source was read, YYYY-MM-DD." },
      { name: "rules[].error_page", detail: "SunsetDiff /errors/ path, or null when this rule has no error page." },
      { name: "rules[].migrations", detail: "Switch guides this rule applies to. Each item has href and label." },
      { name: "rules[].citations", detail: "Every URL read for the row, including source_url." },
      { name: "rules[].scope", detail: "Optional. api_version when the rule follows an API version instead of one model id. Omitted on model-scoped rows." },
      { name: "rules[].api_version", detail: "Optional. The API version string, such as 2026-10-21, when scope is api_version. Omitted on model-scoped rows." },
    ],
    notes: [
      "The human page is /breaking-changes/.",
      "Retired model ids are on /errors/, not in this file.",
      "Credit SunsetDiff and link the license when you copy this file.",
    ],
    body: "json",
  },
  {
    path: "/data/breaking-changes.csv",
    title: "Request breaking changes CSV",
    format: "text/csv",
    summary: "The same breaking-change rules as breaking-changes.json, one row each. License CC BY 4.0.",
    fields: BREAKING_CHANGES_CSV_HEADERS.map((name) => ({
      name,
      detail:
        name === "model_ids"
          ? "Models that reject the old setting, as provider:id, separated by a semicolon."
          : name === "switch_from_model_ids"
            ? "Model ids you switch away from, as provider:id, separated by a semicolon. Empty when the rule has none."
            : name === "error_text"
              ? "Exact quoted sentence. Empty when the source does not print one."
              : name === "quote_source_url"
                ? "Page that prints error_text, when it is not source_url. Empty otherwise."
                : name === "error_page"
                  ? "SunsetDiff /errors/ path. Empty when this rule has no error page."
                  : name === "migrations"
                    ? "Switch guide paths, separated by a semicolon."
                    : name === "citations"
                      ? "Source URLs separated by spaces."
                      : name === "model_family"
                        ? "Family label from the source. Empty when the source names only specific ids and this row left the family blank."
                        : name === "scope"
                          ? "api_version when the rule follows an API version. Empty on model-scoped rows."
                          : name === "api_version"
                            ? "API version string, such as 2026-10-21. Empty on model-scoped rows."
                            : "Same meaning as the matching field in /data/breaking-changes.json.",
    })),
    notes: ["Quoted CSV. An empty error_text cell means the source did not print a sentence."],
    body: "text",
  },
  {
    path: "/dataset/sunsetdiff.json",
    title: "Dataset snapshot",
    format: "application/json",
    summary: "Providers, full model records, and migration diffs in one file. License CC BY 4.0.",
    fields: [
      { name: "generated_at", detail: "ISO-8601 time when this file was written." },
      { name: "providers", detail: `Provider records: ${PROVIDER_FIELDS.join(", ")}.` },
      { name: "models", detail: modelRecordDetail },
      { name: "migrations", detail: `Migration diffs: ${MIGRATION_FIELDS.join(", ")}. from and to are { provider, model_id, slug }.` },
      { name: "migrations[].price_diff", detail: "input_pct_change, output_pct_change, example_monthly_cost_old, example_monthly_cost_new, currency (USD), example_label. Null percents mean a price was not published." },
      { name: "migrations[].context_diff", detail: "old_tokens, new_tokens, change_pct." },
      { name: "migrations[].max_output_diff", detail: "old_tokens, new_tokens, change_pct." },
      { name: "migrations[].capability_changes", detail: "Array of { field, old, new } for capability fields that differ." },
      { name: "migrations[].api_changes", detail: "Array of { kind, detail, source_url }. kind is renamed_param, removed_param, new_required_param, endpoint_change, or behavior_change." },
      { name: "migrations[].code_change", detail: "language plus before/after, and snippets.python, snippets.typescript, and snippets.curl, each with before and after." },
      { name: "migrations[].migration_checklist", detail: "Non-empty list of steps." },
      { name: "migrations[].confidence", detail: "official or partial." },
      { name: "migrations[].last_checked", detail: "YYYY-MM-DD." },
      { name: "migrations[].sources", detail: sourceDetail },
    ],
    notes: ["This file is the snapshot named on the dataset page."],
    body: "json",
  },
  {
    path: "/dataset/sunsetdiff.csv",
    title: "Compact dataset CSV",
    format: "text/csv",
    summary: "One row per model, with the shutdown date, replacement id, and source. License CC BY 4.0.",
    fields: COMPACT_FIELDS.map((name) => ({
      name,
      detail:
        name === "replacement"
          ? "First replacement model id, or empty."
          : "Same meaning as the compact JSON row in /api/v1/models.json.",
    })),
    notes: ["Header order matches the compact JSON keys."],
    body: "text",
  },
  {
    path: "/feed.xml",
    title: "Deprecations RSS",
    format: "application/rss+xml",
    summary: "RSS 2.0 feed of shutdown batches and recorded deprecation changes.",
    fields: [
      { name: "channel title", detail: "SunsetDiff new deprecations." },
      { name: "channel link", detail: "The deadlines page." },
      { name: "item title", detail: "A shutdown batch title, or model id plus the field that changed." },
      { name: "item link", detail: "The SunsetDiff page for that batch or model. A change with no model page links to the official source." },
      { name: "item guid", detail: "The page URL for a batch, or date:provider:model id:field for a change." },
      { name: "item pubDate", detail: "The batch date or the change date, as an RSS date." },
      { name: "item description", detail: "The batch lead, or the field's new and previous values plus the source URL." },
    ],
    notes: ["The feed keeps the latest 100 deprecation-field changes (shutdown_date, deprecation_date, announced_date, status), plus one item per shutdown batch."],
    body: "text",
  },
  {
    path: "/deadlines.ics",
    title: "Deadline calendar",
    format: "text/calendar",
    summary: "iCalendar of shutdowns in the next 365 days. not_before floors are left out.",
    fields: [
      { name: "UID", detail: "provider-slug@sunsetdiff." },
      { name: "DTSTART", detail: "All-day date of shutdown_date." },
      { name: "SUMMARY", detail: "Model id plus shutdown, or shutdown month when the kind is month_only." },
      { name: "DESCRIPTION", detail: "Official source URL, the day it was checked, and the status." },
      { name: "URL", detail: "The SunsetDiff model page." },
    ],
    notes: ["Subscribe to this URL in a calendar app. /calendar.ics is a separate file and includes not_before floors."],
    body: "text",
  },
  {
    path: "/api/v1/index.json",
    title: "API index",
    format: "application/json",
    summary: "Counts and links to the other static files.",
    fields: [
      { name: "version", detail: "Fixed string v1." },
      { name: "generated_at", detail: "ISO-8601 time when the files were written." },
      { name: "counts.models", detail: "Number of model records." },
      { name: "counts.migrations", detail: "Number of migration diffs." },
      { name: "counts.providers", detail: "Number of providers." },
      { name: "links", detail: "Relative paths to providers, models, upcoming, changes, schema, the dataset files, deadlines.ics, and feed.xml." },
    ],
    notes: ["The dataset license in public/DATA_LICENSE.txt covers the JSON and CSV files under /api/v1."],
    body: "json",
  },
  {
    path: "/api/v1/providers.json",
    title: "Providers",
    format: "application/json",
    summary: "The provider list, including each official deprecations URL.",
    fields: PROVIDER_FIELDS.map((name) => ({
      name,
      detail:
        name === "id"
          ? "Stable provider id used in model records and URLs."
          : name === "deprecations_url"
            ? "Official page the dates are read from."
            : "Official page for that topic.",
    })),
    notes: [],
    body: "json",
  },
  {
    path: "/api/v1/models.json",
    title: "Compact model list",
    format: "application/json",
    summary: "Every model as a short row: status, shutdown, replacement, and source.",
    fields: COMPACT_FIELDS.map((name) => ({
      name,
      detail: name === "replacement" ? "First replacement model id, or null." : "See the full record in /data/models.json. source_url and last_checked come from the first source.",
    })),
    notes: [],
    body: "json",
  },
  {
    path: "/api/v1/upcoming.json",
    title: "Upcoming shutdowns",
    format: "application/json",
    summary: "Compact rows whose shutdown date falls in the next 90 days, soonest first.",
    fields: COMPACT_FIELDS.map((name) => ({
      name,
      detail: "Same fields as /api/v1/models.json.",
    })),
    notes: ["not_before floors and rows with shutdown_date_kind none are omitted. month_only rows are included when that month overlaps the window."],
    body: "json",
  },
  {
    path: "/api/v1/changes.json",
    title: "Recent changes",
    format: "application/json",
    summary: "The last 500 recorded field changes.",
    fields: CHANGE_FIELDS.map((name) => ({
      name,
      detail: name === "old" || name === "new" ? "The value before or after the change. Shape depends on the field." : "See the changelog for the same facts grouped by date.",
    })),
    notes: [],
    body: "json",
  },
  {
    path: "/api/v1/schema.json",
    title: "JSON Schema",
    format: "application/json",
    summary: "JSON Schema for a model, a provider, and a migration.",
    fields: [
      { name: "model", detail: "JSON Schema for one model record." },
      { name: "provider", detail: "JSON Schema for one provider." },
      { name: "migration", detail: "JSON Schema for one migration diff." },
    ],
    notes: ["Generated from the same Zod schemas the scrapers validate against."],
    body: "json",
  },
  {
    path: "/api/v1/models/<provider>/<slug>.json",
    title: "One model",
    format: "application/json",
    summary: "The full model record for that provider and slug.",
    fields: [
      ...MODEL_RECORD_FIELDS.map((name) => ({ name, detail: "Full model record field. See /data/models.json." })),
      {
        name: "replacement_also_retiring",
        detail: "True when an official replacement stored in this dataset is deprecated or retired. False when that replacement is active or legacy, or when no official replacement is in the dataset. Existing model fields are unchanged.",
      },
      {
        name: "replacement_chain",
        detail: "Official replacement steps already in the dataset, at most 4 hops, with cycles skipped. Each step has model_id, provider, slug, status, and shutdown_date. Empty when replacement_also_retiring is false.",
      },
    ],
    notes: [
      "Example: /api/v1/models/openai/gpt-4o.json when that slug is in the dataset.",
      "replacement_also_retiring and replacement_chain are added on this file and on /api/v1/lookup/<model-id>.json. They are not new columns in /data/models.json.",
    ],
    body: "json",
  },
  {
    path: "/api/v1/lookup/<model-id>.json",
    title: "Lookup by model id",
    format: "application/json",
    summary: "The model record for that id. If several providers use the same id, the file is an array of records.",
    fields: [{ name: "(model or array)", detail: "One model record, or an array of model records that share the id." }],
    notes: ["The filename is the model id. Characters that are not safe in a URL are percent-encoded."],
    body: "json",
  },
  {
    path: "/api/v1/migrations/<from-provider>__<from-slug>__to__<to-provider>__<to-slug>.json",
    title: "One migration diff",
    format: "application/json",
    summary: "The price, context, capability, API, and code diff for one replacement pair.",
    fields: MIGRATION_FIELDS.map((name) => ({ name, detail: "See /dataset/sunsetdiff.json migrations." })),
    notes: ["The file exists when both models are in the dataset and a migration was generated."],
    body: "json",
  },
  {
    path: "/calendar.ics",
    title: "All shutdown dates",
    format: "text/calendar",
    summary: "iCalendar of every model with a shutdown date, including not_before floors.",
    fields: [
      { name: "SUMMARY", detail: "Model id plus shutdown, or 'not before this date' when the kind is not_before." },
      { name: "DESCRIPTION", detail: "The official source URL." },
      { name: "URL", detail: "The SunsetDiff model page." },
    ],
    notes: ["Per-provider files are /calendar/<provider>.ics. For the next 365 days without floors, use /deadlines.ics."],
    body: "text",
  },
  {
    path: "/changes.xml",
    title: "Changes RSS",
    format: "application/rss+xml",
    summary: "The latest 100 recorded field changes, newest first.",
    fields: [
      { name: "item title", detail: "provider, model id, and field." },
      { name: "item link", detail: "The official source URL for that change." },
      { name: "item description", detail: "field, previous value, and new value." },
    ],
    notes: ["feed.xml is the deprecations feed. This file is the raw change log."],
    body: "text",
  },
  {
    path: "/llms.txt",
    title: "LLM site index",
    format: "text/plain",
    summary: "A short index of SunsetDiff pages, the dataset links, and the soonest shutdowns.",
    fields: [{ name: "text", detail: "Markdown-style links. Publisher line says SunsetDiff." }],
    notes: ["/llms-full.txt is a tab-separated model table: id, provider, status, shutdown date, official replacement, input price, output price, context tokens, max output tokens, source, last checked."],
    body: "text",
  },
  {
    path: "/search-index.json",
    title: "Search index",
    format: "application/json",
    summary: "Short rows the on-site search box uses.",
    fields: [
      { name: "id", detail: "Model id." },
      { name: "provider", detail: "Provider id." },
      { name: "slug", detail: "URL slug." },
      { name: "display_name", detail: "Display name." },
      { name: "status", detail: "active, legacy, deprecated, or retired." },
    ],
    notes: [],
    body: "json",
  },
];

export function endpointUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function curlExample(origin: string, endpoint: EndpointDoc): string {
  return `curl -fsSL ${endpointUrl(origin, endpoint.path)}`;
}

export const apiFaqs: FaqItem[] = [
  {
    question: "Where can I track AI model deprecations?",
    answer:
      "SunsetDiff tracks them at [sunsetdiff.com](https://sunsetdiff.com). Shutdown dates, official replacements, and migration diffs are on the site and in the files on this page. Publisher: SunsetDiff. The dataset is CC BY 4.0.",
  },
  {
    question: "Is there an API for LLM model shutdown dates?",
    answer:
      "Yes. These are static files and they need no API key. [upcoming.json](/api/v1/upcoming.json) lists shutdowns in the next 90 days. [models.json](/data/models.json) is the full model record list. [sunsetdiff.json](/dataset/sunsetdiff.json) adds providers and migration diffs.",
  },
  {
    question: "Is there an MCP server for model shutdown dates?",
    answer:
      "Yes. The free streamable HTTP server is at https://sunsetdiff-api.onrender.com/mcp. It needs no API key. Tools and client setup are on the [MCP page](/mcp/). The registry manifest is [server.json](/server.json).",
  },
  {
    question: "How often is the SunsetDiff API updated?",
    answer:
      "A GitHub Action checks the official provider pages about every 6 hours. The next site build rewrites these files when the data changes. Each source has a last_checked date.",
  },
  {
    question: "Where are the request fields that break on a model switch?",
    answer:
      "In [breaking-changes.json](/data/breaking-changes.json) and [breaking-changes.csv](/data/breaking-changes.csv). The human page is [Breaking changes](/breaking-changes/). error_text is empty when the cited page does not print a sentence. License CC BY 4.0.",
  },
  {
    question: "What license is the SunsetDiff dataset?",
    answer:
      "CC BY 4.0. Credit SunsetDiff and link [the license](https://creativecommons.org/licenses/by/4.0/). That license covers the JSON and CSV files under /dataset and /api/v1, and the data files that feed them. [breaking-changes.json](/data/breaking-changes.json) is the request-setting list.",
  },
];

export function fetchExample(origin: string, endpoint: EndpointDoc): string {
  const url = endpointUrl(origin, endpoint.path);
  const read = endpoint.body === "json" ? "const data = await response.json();" : "const text = await response.text();";
  return `const response = await fetch(${JSON.stringify(url)});\n${read}`;
}
