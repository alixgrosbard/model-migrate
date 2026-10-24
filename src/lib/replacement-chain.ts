import type { ModelRecord } from "../schema.ts";

/** How far to follow official replacements past the model on the page. */
export const REPLACEMENT_HOPS = 4;

export interface ReplacementChainStep {
  model_id: string;
  provider: string;
  slug: string;
  status: ModelRecord["status"];
  shutdown_date: string | null;
}

export interface ReplacementNotePart {
  text: string;
  href?: string;
}

export interface ReplacementNote {
  model_id: string;
  provider: string;
  parts: ReplacementNotePart[];
}

export interface ReplacementRetirement {
  replacement_also_retiring: boolean;
  replacement_chain: ReplacementChainStep[];
  notes: ReplacementNote[];
}

type ChainModel = {
  id: string;
  slug: string;
  provider: string;
  status: ModelRecord["status"];
  shutdown_date: string | null;
  shutdown_date_kind?: ModelRecord["shutdown_date_kind"];
  replacements: { model_id: string; provider: string; kind: "official" | "editorial" }[];
};

export function replacementRetirement(model: ChainModel, models: ChainModel[]): ReplacementRetirement {
  const index = new Map(models.map((item) => [pair(item.provider, item.id), item]));
  const notes: ReplacementNote[] = [];
  const chain: ReplacementChainStep[] = [];
  const listed = new Set<string>();
  for (const ref of model.replacements) {
    if (ref.kind !== "official") continue;
    const walked = walkOfficial(ref, pair(model.provider, model.id), index);
    if (!walked) continue;
    for (const step of walked.steps) {
      const id = pair(step.provider, step.model_id);
      if (listed.has(id)) continue;
      listed.add(id);
      chain.push(step);
    }
    notes.push({
      model_id: ref.model_id,
      provider: ref.provider,
      parts: noteParts(walked.direct, walked.active),
    });
  }
  return {
    replacement_also_retiring: notes.length > 0,
    replacement_chain: chain,
    notes,
  };
}

export function replacementApiFields(model: ChainModel, models: ChainModel[]) {
  const result = replacementRetirement(model, models);
  return {
    replacement_also_retiring: result.replacement_also_retiring,
    replacement_chain: result.replacement_chain,
  };
}

export function replacementNoteText(parts: ReplacementNotePart[]): string {
  return parts.map((part) => part.text).join("");
}

function walkOfficial(
  ref: { model_id: string; provider: string },
  sourceKey: string,
  index: Map<string, ChainModel>,
): { direct: ChainModel; steps: ReplacementChainStep[]; active: ChainModel[] } | null {
  const directKey = pair(ref.provider, ref.model_id);
  if (directKey === sourceKey) return null;
  const direct = index.get(directKey);
  if (!direct || !isRetiring(direct.status)) return null;
  const steps: ReplacementChainStep[] = [];
  const active: ChainModel[] = [];
  const queued = new Set<string>([directKey]);
  const queue: { node: ChainModel; depth: number; path: Set<string> }[] = [
    { node: direct, depth: 1, path: new Set([sourceKey]) },
  ];
  let guard = 0;
  while (queue.length && guard < 64) {
    guard += 1;
    const current = queue.shift();
    if (!current || current.depth > REPLACEMENT_HOPS) continue;
    const id = pair(current.node.provider, current.node.id);
    if (current.path.has(id)) continue;
    steps.push(toStep(current.node));
    if (!isRetiring(current.node.status)) {
      active.push(current.node);
      continue;
    }
    const path = new Set(current.path);
    path.add(id);
    for (const next of current.node.replacements) {
      if (next.kind !== "official") continue;
      const child = index.get(pair(next.provider, next.model_id));
      if (!child) continue;
      const childKey = pair(child.provider, child.id);
      if (path.has(childKey) || queued.has(childKey)) continue;
      queued.add(childKey);
      queue.push({ node: child, depth: current.depth + 1, path });
    }
  }
  return { direct, steps, active };
}

function noteParts(direct: ChainModel, active: ChainModel[]): ReplacementNotePart[] {
  const parts: ReplacementNotePart[] = [{ text: `Note: ${direct.id} ${statusClause(direct)}.` }];
  if (!active.length) return parts;
  if (active.length === 1) {
    parts.push({ text: " Its own official replacement is " });
    parts.push({ text: active[0].id, href: modelPath(active[0]) });
    parts.push({ text: "." });
    return parts;
  }
  parts.push({ text: " Its own official replacements are " });
  active.forEach((item, index) => {
    if (index > 0) parts.push({ text: index === active.length - 1 ? " and " : ", " });
    parts.push({ text: item.id, href: modelPath(item) });
  });
  parts.push({ text: "." });
  return parts;
}

function statusClause(model: ChainModel): string {
  const kind = model.shutdown_date_kind ?? (model.shutdown_date ? "exact" : "none");
  if (!model.shutdown_date || kind === "none") return `is also ${model.status}`;
  if (kind === "not_before") return `is also ${model.status} and is not scheduled to shut down sooner than ${model.shutdown_date}`;
  if (kind === "month_only") return `is also ${model.status} and has a published shutdown month of ${model.shutdown_date.slice(0, 7)}`;
  if (model.status === "retired") return `is also retired and shut down on ${model.shutdown_date}`;
  return `is also deprecated and shuts down on ${model.shutdown_date}`;
}

function toStep(model: ChainModel): ReplacementChainStep {
  return {
    model_id: model.id,
    provider: model.provider,
    slug: model.slug,
    status: model.status,
    shutdown_date: model.shutdown_date,
  };
}

function modelPath(model: ChainModel): string {
  return `/models/${model.provider}/${model.slug}/`;
}

function pair(provider: string, id: string): string {
  return `${provider}\n${id}`;
}

function isRetiring(status: ModelRecord["status"]): boolean {
  return status === "deprecated" || status === "retired";
}
