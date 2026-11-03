import type { ModelRecord, Provider } from "../schema.ts";
import { SOURCES_PATH } from "./trust-pages.ts";

export { SOURCES_PATH };

export interface CitedSource {
  url: string;
  /** Most common label on model.sources. Null when the URL is only on a spec field. */
  label: string | null;
  modelCount: number;
  lastChecked: string;
}

export interface ProviderSources {
  id: Provider["id"];
  name: string;
  sources: CitedSource[];
}

interface Bucket {
  url: string;
  labels: Map<string, number>;
  models: Set<string>;
  lastChecked: string;
}

/** URLs stored on model records, grouped by that model's provider. */
export function citedSources(models: ModelRecord[], providers: Provider[]): ProviderSources[] {
  const byProvider = new Map<string, Map<string, Bucket>>();
  for (const model of models) {
    const key = `${model.provider}/${model.slug}`;
    const buckets = byProvider.get(model.provider) ?? new Map<string, Bucket>();
    byProvider.set(model.provider, buckets);
    for (const source of model.sources) {
      const bucket = buckets.get(source.url) ?? { url: source.url, labels: new Map(), models: new Set(), lastChecked: "" };
      bucket.labels.set(source.label, (bucket.labels.get(source.label) ?? 0) + 1);
      bucket.models.add(key);
      if (source.last_checked > bucket.lastChecked) bucket.lastChecked = source.last_checked;
      buckets.set(source.url, bucket);
    }
    for (const source of Object.values(model.specs.specs_sources)) {
      const bucket = buckets.get(source.url) ?? { url: source.url, labels: new Map(), models: new Set(), lastChecked: "" };
      bucket.models.add(key);
      if (source.last_checked > bucket.lastChecked) bucket.lastChecked = source.last_checked;
      buckets.set(source.url, bucket);
    }
  }
  return providers
    .map((provider) => {
      const buckets = [...(byProvider.get(provider.id)?.values() ?? [])];
      const sources = buckets
        .map((bucket) => ({
          url: bucket.url,
          label: topLabel(bucket.labels),
          modelCount: bucket.models.size,
          lastChecked: bucket.lastChecked,
        }))
        .sort((a, b) => b.modelCount - a.modelCount || a.url.localeCompare(b.url));
      return { id: provider.id, name: provider.name, sources };
    })
    .filter((group) => group.sources.length > 0);
}

export function citedSourceUrls(groups: ProviderSources[]): string[] {
  return [...new Set(groups.flatMap((group) => group.sources.map((source) => source.url)))].sort();
}

export function newestSourceCheck(models: Pick<ModelRecord, "sources" | "specs">[]): string | undefined {
  let newest = "";
  for (const model of models) {
    for (const source of model.sources) {
      if (source.last_checked > newest) newest = source.last_checked;
    }
    for (const source of Object.values(model.specs.specs_sources)) {
      if (source.last_checked > newest) newest = source.last_checked;
    }
  }
  return newest || undefined;
}

function topLabel(labels: Map<string, number>): string | null {
  let best: string | null = null;
  let count = 0;
  for (const [label, times] of labels) {
    if (times > count || (times === count && best != null && label.localeCompare(best) < 0)) {
      best = label;
      count = times;
    }
  }
  return best;
}
