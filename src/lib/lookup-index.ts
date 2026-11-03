import type { ModelRecord } from "../schema.ts";

/**
 * Lookup keys for /api/v1/lookup/<model-id>.json.
 * Pass models already sorted by compareModels. Primary ids are grouped first.
 * A lookup alias is added after that, so a shared id stays in model order and
 * the alias appends the extra provider. That is the same array shape as two
 * Bedrock rows that share one model id.
 */
export function lookupRecords(models: ModelRecord[]): Map<string, ModelRecord[]> {
  const byKey = new Map<string, ModelRecord[]>();
  const add = (key: string, model: ModelRecord) => {
    if (!key) return;
    const list = byKey.get(key) ?? [];
    if (list.some((item) => item.provider === model.provider && item.slug === model.slug)) return;
    list.push(model);
    byKey.set(key, list);
  };
  for (const model of models) add(model.id, model);
  for (const model of models) {
    const aliases = [...(model.lookup_aliases ?? [])].sort((a, b) => a.localeCompare(b));
    for (const alias of aliases) add(alias, model);
  }
  return byKey;
}

export function matchesLookup(model: { id: string; lookup_aliases?: string[] }, id: string): boolean {
  return model.id === id || (model.lookup_aliases ?? []).includes(id);
}
