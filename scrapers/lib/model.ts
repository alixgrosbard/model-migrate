import { emptySpecs, type Specs } from "../../src/schema.ts";
import { familyFromId, slugify } from "./html.ts";
import type { ScrapedModel } from "./types.ts";

export function baseModel(input: {
  id: string;
  provider: ScrapedModel["provider"];
  displayName?: string;
  status: ScrapedModel["status"];
  announced?: string | null;
  deprecated?: string | null;
  shutdown?: string | null;
  kind: ScrapedModel["shutdown_date_kind"];
  notes?: string | null;
  replacements?: ScrapedModel["replacements"];
  sourceUrl: string;
  sourceLabel: string;
  checked: string;
  excerpt: string;
  specs?: Specs;
}): ScrapedModel {
  return {
    id: input.id,
    slug: slugify(input.id),
    provider: input.provider,
    display_name: input.displayName?.trim() || input.id,
    family: familyFromId(input.id),
    status: input.status,
    announced_date: input.announced ?? null,
    deprecation_date: input.deprecated ?? null,
    shutdown_date: input.shutdown ?? null,
    shutdown_date_kind: input.kind,
    region_or_platform_notes: input.notes ?? null,
    replacements: input.replacements ?? [],
    sources: [
      {
        url: input.sourceUrl,
        label: input.sourceLabel,
        last_checked: input.checked,
        excerpt: input.excerpt.slice(0, 300),
      },
    ],
    specs: input.specs ?? emptySpecs(),
  };
}

export function applyPrice(
  specs: Specs,
  price: { input: number | null; output: number | null; cached?: number | null },
  url: string,
  checked: string,
): Specs {
  const next = { ...specs, specs_sources: { ...specs.specs_sources } };
  if (price.input != null && next.input_price_per_mtok == null) {
    next.input_price_per_mtok = price.input;
    next.currency = "USD";
    next.specs_sources.input_price_per_mtok = { url, last_checked: checked };
  }
  if (price.output != null && next.output_price_per_mtok == null) {
    next.output_price_per_mtok = price.output;
    next.currency = "USD";
    next.specs_sources.output_price_per_mtok = { url, last_checked: checked };
  }
  if (price.cached != null && next.cached_input_price_per_mtok == null) {
    next.cached_input_price_per_mtok = price.cached;
    next.currency = "USD";
    next.specs_sources.cached_input_price_per_mtok = { url, last_checked: checked };
  }
  return next;
}
