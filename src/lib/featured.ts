import type { ModelRecord } from "../schema.ts";
import { publicName } from "./growth.ts";
import { requestErrorBySlug, requestErrorPath } from "./request-errors.ts";

/** Model pages linked from the homepage, hubs, and llms.txt. Slugs are records in data/models. */
export const FEATURED_MODELS: { provider: string; slug: string }[] = [
  { provider: "openai", slug: "gpt-4o" },
  { provider: "openai", slug: "gpt-4-1" },
  { provider: "openai", slug: "gpt-image-1" },
  { provider: "anthropic", slug: "claude-sonnet-4-6" },
  { provider: "anthropic", slug: "claude-sonnet-5-5" },
  { provider: "google-gemini-api", slug: "gemini-2-5-pro" },
  { provider: "google-gemini-api", slug: "gemini-2-5-flash" },
];

const FEATURED_ERROR_SLUGS = [
  "openai-model-has-been-deprecated",
  "gemini-model-no-longer-available",
  "azure-openai-retired-model-410-gone",
];

export interface FeaturedLink {
  href: string;
  label: string;
  provider: string;
}

export function featuredModelLinks(models: ModelRecord[]): FeaturedLink[] {
  const links: FeaturedLink[] = [];
  for (const item of FEATURED_MODELS) {
    const model = models.find((row) => row.provider === item.provider && row.slug === item.slug);
    if (!model) continue;
    links.push({
      href: `/models/${model.provider}/${model.slug}/`,
      label: publicName(model),
      provider: model.provider,
    });
  }
  return links;
}

export function featuredErrorLinks(): { href: string; label: string }[] {
  return FEATURED_ERROR_SLUGS.map((slug) => {
    const page = requestErrorBySlug(slug);
    if (!page) throw new Error(`Missing featured error page ${slug}`);
    return { href: requestErrorPath(slug), label: page.h1 };
  });
}
