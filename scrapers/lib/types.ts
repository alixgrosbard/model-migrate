import type { ModelRecord, Specs } from "../../src/schema.ts";

export type ScrapedModel = Omit<ModelRecord, "first_seen" | "updated_at" | "slug"> & {
  slug?: string;
};

export interface PriceRow {
  id: string;
  input: number | null;
  output: number | null;
  cached: number | null;
  batchDiscountPct: number | null;
  contextTokens: number | null;
  maxOutputTokens: number | null;
}

export interface ScrapeContext {
  checked: string;
  html?: string;
  extraHtml?: Record<string, string>;
}
