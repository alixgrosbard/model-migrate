import { excerpt, isModelId, normalizeModelId } from "./lib/html.ts";
import { baseModel } from "./lib/model.ts";
import { parseOpenAIModelDoc } from "./docs.ts";
import type { ScrapedModel } from "./lib/types.ts";

export const OPENAI_MODELS_INDEX_URL = "https://developers.openai.com/api/docs/models.md";
export const CODEX_MODELS_URL = "https://developers.openai.com/codex/models";
export const CODEX_CHANGELOG_URL = "https://developers.openai.com/codex/changelog";

const BULLET = /^- \[[^\]]*\]\(\/api\/docs\/models\/([^)\s]+)\.md\):\s*(.+)$/gm;
const LINK = /\]\(\/api\/docs\/models\/([^)\s]+)\.md\)/g;

export interface CatalogEntry {
  id: string;
  blurb: string;
}

/** Ids from the models index. The href is the id. A label with no model link is ignored. */
export function documentedOpenAIIds(indexMarkdown: string): CatalogEntry[] {
  const blurbs = new Map<string, string>();
  for (const match of indexMarkdown.matchAll(BULLET)) {
    const id = modelIdFromHref(match[1]);
    if (!id || blurbs.has(id)) continue;
    blurbs.set(id, match[2].trim());
  }
  const found: CatalogEntry[] = [];
  const seen = new Set<string>();
  for (const [id, blurb] of blurbs) {
    seen.add(id);
    found.push({ id, blurb });
  }
  for (const match of indexMarkdown.matchAll(LINK)) {
    const id = modelIdFromHref(match[1]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    found.push({ id, blurb: "" });
  }
  return found;
}

function modelIdFromHref(hrefId: string): string | null {
  let decoded = hrefId;
  try {
    decoded = decodeURIComponent(hrefId);
  } catch {
    decoded = hrefId;
  }
  const id = normalizeModelId(decoded);
  return isModelId(id) ? id : null;
}

/**
 * Add models the index documents and the deprecations scrape did not emit.
 * An id already present keeps its status, shutdown date, and slug.
 * No dated snapshot is required, and none is invented.
 */
export function addDocumentedOpenAIModels(models: ScrapedModel[], indexMarkdown: string, checked: string): ScrapedModel[] {
  const ids = new Set(models.map((model) => model.id));
  for (const entry of documentedOpenAIIds(indexMarkdown)) {
    if (ids.has(entry.id)) continue;
    ids.add(entry.id);
    models.push(
      baseModel({
        id: entry.id,
        provider: "openai",
        status: "active",
        kind: "none",
        sourceUrl: modelDocUrl(entry.id),
        sourceLabel: "OpenAI model docs",
        checked,
        excerpt: excerpt([`Model ID: ${entry.id}`, entry.blurb]),
      }),
    );
  }
  return models;
}

export function modelDocUrl(id: string): string {
  return `https://developers.openai.com/api/docs/models/${id}.md`;
}

/** Fill empty price and token fields from a fetched model page. Leaves status alone. */
export function applyOpenAIDocSpecs(model: ScrapedModel, markdown: string, checked: string): number {
  const spec = parseOpenAIModelDoc(markdown);
  if (!spec || !spec.ids.includes(model.id)) return 0;
  const url = modelDocUrl(model.id);
  const pairs = [
    ["input_price_per_mtok", spec.input],
    ["output_price_per_mtok", spec.output],
    ["cached_input_price_per_mtok", spec.cached],
    ["context_window_tokens", spec.context],
    ["max_output_tokens", spec.maxOutput],
  ] as const;
  let filled = 0;
  for (const [field, value] of pairs) {
    if (value == null || model.specs[field] != null) continue;
    model.specs[field] = value;
    model.specs.specs_sources[field] = { url, last_checked: checked };
    if (field.endsWith("price_per_mtok")) model.specs.currency = "USD";
    filled += 1;
  }
  return filled;
}

interface CodexNote {
  note: string;
  sources: { url: string; label: string; excerpt: string }[];
}

/**
 * Codex ChatGPT sign-in retirements. These do not change API status or the
 * deprecations-page replacement list. Wording is limited to the Codex models
 * page and the Codex changelog.
 */
const CODEX_NOTES: Record<string, CodexNote> = {
  "gpt-5.5": {
    note: "The OpenAI API still serves gpt-5.5. Codex retired gpt-5.5 for ChatGPT sign-in on October 14, 2026 at 19:00 UTC. Codex sessions authenticated with an API key are not affected. For ChatGPT sign-in, the Codex models page names gpt-6.1-sol on Plus, Pro, Business, Enterprise, and Edu, and gpt-6-luna on Free and Go.",
    sources: [
      {
        url: CODEX_MODELS_URL,
        label: "Codex models",
        excerpt:
          "Effective October 14, 2026, at noon PDT (19:00 UTC), GPT-5.5 retires from Codex for users signed in with ChatGPT. The OpenAI API and Codex sessions authenticated with an API key aren't affected. GPT-5.5 remains available through the OpenAI API and in Codex sessions authenticated with an API key.",
      },
      {
        url: `${CODEX_CHANGELOG_URL}#codex-2026-10-14-gpt-55-retirement`,
        label: "Codex changelog",
        excerpt:
          "Effective October 14, 2026, at noon PDT (19:00 UTC), GPT-5.5 retires from Codex for users signed in with ChatGPT. The OpenAI API and Codex sessions authenticated with an API key aren't affected.",
      },
    ],
  },
  "gpt-5.4": {
    note: "The OpenAI API still serves gpt-5.4. Codex retired gpt-5.4 for ChatGPT sign-in on August 31, 2026. Codex sessions authenticated with an API key are not affected. The Codex models page says to replace gpt-5.4 with gpt-6-sol when it is available.",
    sources: [
      {
        url: CODEX_MODELS_URL,
        label: "Codex models",
        excerpt:
          "The gpt-5.4 and gpt-5.4-mini models retired from Codex with ChatGPT sign-in on August 31, 2026. Replace gpt-5.4 with gpt-6-sol when available to your plan and client. The OpenAI API and Codex authenticated with your own API key aren't affected by the GPT-5.4 retirement.",
      },
      {
        url: `${CODEX_CHANGELOG_URL}#codex-2026-07-31`,
        label: "Codex changelog",
        excerpt:
          "On August 31, 2026, GPT-5.4 and GPT-5.4 mini will no longer be available in Codex for users signed in with ChatGPT. GPT-5.4 and GPT-5.4 mini will remain available on the OpenAI API and Codex sessions authenticated with an API key.",
      },
    ],
  },
  "gpt-5.4-mini": {
    note: "The OpenAI API still serves gpt-5.4-mini. Codex retired gpt-5.4-mini for ChatGPT sign-in on August 31, 2026. Codex sessions authenticated with an API key are not affected. The Codex models page says to replace gpt-5.4-mini with gpt-6-luna when it is available. In Enterprise and Edu, an administrator must enable Luna first.",
    sources: [
      {
        url: CODEX_MODELS_URL,
        label: "Codex models",
        excerpt:
          "The gpt-5.4 and gpt-5.4-mini models retired from Codex with ChatGPT sign-in on August 31, 2026. Replace gpt-5.4-mini with gpt-6-luna when available to your plan and client. The OpenAI API and Codex authenticated with your own API key aren't affected by the GPT-5.4 retirement.",
      },
      {
        url: `${CODEX_CHANGELOG_URL}#codex-2026-07-31`,
        label: "Codex changelog",
        excerpt:
          "On August 31, 2026, GPT-5.4 and GPT-5.4 mini will no longer be available in Codex for users signed in with ChatGPT. GPT-5.4 and GPT-5.4 mini will remain available on the OpenAI API and Codex sessions authenticated with an API key.",
      },
    ],
  },
};

export function applyCodexPlatformNotes(models: ScrapedModel[], checked: string): void {
  for (const model of models) {
    const note = CODEX_NOTES[model.id];
    if (!note) continue;
    model.region_or_platform_notes = note.note;
    for (const source of note.sources) {
      if (model.sources.some((item) => item.url === source.url)) continue;
      model.sources.push({
        url: source.url,
        label: source.label,
        last_checked: checked,
        excerpt: excerpt([source.excerpt]),
      });
    }
  }
}
