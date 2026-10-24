import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const isoDateTime = z.string().datetime({ offset: true });

export const providerIds = [
  "openai",
  "anthropic",
  "google-gemini-api",
  "google-vertex",
  "aws-bedrock",
  "azure-openai",
  "mistral",
] as const;

export const providerIdSchema = z.enum(providerIds);

export const providerSchema = z.object({
  id: providerIdSchema,
  name: z.string().min(1),
  deprecations_url: z.string().url(),
  pricing_url: z.string().url(),
  models_url: z.string().url(),
});

export const sourceSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1),
  last_checked: isoDate,
  excerpt: z.string().max(300),
});

export const replacementSchema = z.object({
  model_id: z.string().min(1),
  provider: providerIdSchema,
  kind: z.enum(["official", "editorial"]),
  source_url: z.string().url(),
});

export const specSourceSchema = z.object({
  url: z.string().url(),
  last_checked: isoDate,
});

export const modalitySchema = z.enum(["text", "image", "audio", "video", "pdf"]);

export const specsSchema = z.object({
  input_price_per_mtok: z.number().nullable(),
  output_price_per_mtok: z.number().nullable(),
  cached_input_price_per_mtok: z.number().nullable(),
  batch_discount_pct: z.number().nullable(),
  currency: z.literal("USD").nullable(),
  context_window_tokens: z.number().int().nullable(),
  max_output_tokens: z.number().int().nullable(),
  modalities_in: z.array(modalitySchema).nullable(),
  modalities_out: z.array(modalitySchema).nullable(),
  supports_tools: z.boolean().nullable(),
  supports_json_schema: z.boolean().nullable(),
  supports_vision: z.boolean().nullable(),
  supports_streaming: z.boolean().nullable(),
  supports_batch: z.boolean().nullable(),
  supports_prompt_caching: z.boolean().nullable(),
  reasoning: z.enum(["none", "optional", "always"]).nullable(),
  knowledge_cutoff: z.string().nullable(),
  endpoints: z.array(z.string()).nullable(),
  specs_sources: z.record(specSourceSchema),
});

export const modelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  provider: providerIdSchema,
  display_name: z.string().min(1),
  family: z.string().nullable(),
  status: z.enum(["active", "legacy", "deprecated", "retired"]),
  announced_date: isoDate.nullable(),
  deprecation_date: isoDate.nullable(),
  shutdown_date: isoDate.nullable(),
  shutdown_date_kind: z.enum(["exact", "not_before", "month_only", "none"]),
  region_or_platform_notes: z.string().nullable(),
  replacements: z.array(replacementSchema),
  sources: z.array(sourceSchema).min(1),
  specs: specsSchema,
  first_seen: isoDateTime,
  updated_at: isoDateTime,
});

export const migrationSchema = z.object({
  from: z.object({ provider: providerIdSchema, model_id: z.string(), slug: z.string() }),
  to: z.object({ provider: providerIdSchema, model_id: z.string(), slug: z.string() }),
  price_diff: z.object({
    input_pct_change: z.number().nullable(),
    output_pct_change: z.number().nullable(),
    example_monthly_cost_old: z.number().nullable(),
    example_monthly_cost_new: z.number().nullable(),
    currency: z.literal("USD"),
    example_label: z.string(),
  }),
  context_diff: z.object({
    old_tokens: z.number().nullable(),
    new_tokens: z.number().nullable(),
    change_pct: z.number().nullable(),
  }),
  max_output_diff: z.object({
    old_tokens: z.number().nullable(),
    new_tokens: z.number().nullable(),
    change_pct: z.number().nullable(),
  }),
  capability_changes: z.array(
    z.object({
      field: z.string(),
      old: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      new: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }),
  ),
  api_changes: z.array(
    z.object({
      kind: z.enum([
        "renamed_param",
        "removed_param",
        "new_required_param",
        "endpoint_change",
        "behavior_change",
      ]),
      detail: z.string(),
      source_url: z.string().url(),
    }),
  ),
  code_change: z.object({
    language: z.enum(["python", "typescript", "curl"]),
    before: z.string(),
    after: z.string(),
    snippets: z.object({
      python: z.object({ before: z.string(), after: z.string() }),
      typescript: z.object({ before: z.string(), after: z.string() }),
      curl: z.object({ before: z.string(), after: z.string() }),
    }),
  }),
  migration_checklist: z.array(z.string()).min(1),
  confidence: z.enum(["official", "partial"]),
  last_checked: isoDate,
  sources: z.array(sourceSchema).min(1),
});

export const changeSchema = z.object({
  date: isoDate,
  provider: providerIdSchema,
  model_id: z.string(),
  field: z.string(),
  old: z.unknown(),
  new: z.unknown(),
  source_url: z.string().url(),
});

export const sponsorSchema = z.object({
  model_slug: z.string().nullable(),
  provider: providerIdSchema.nullable(),
  name: z.string(),
  url: z.string().url(),
  text: z.string(),
});

export type Provider = z.infer<typeof providerSchema>;
export type ModelRecord = z.infer<typeof modelSchema>;
export type MigrationRecord = z.infer<typeof migrationSchema>;
export type ChangeRecord = z.infer<typeof changeSchema>;
export type Specs = z.infer<typeof specsSchema>;
export type Source = z.infer<typeof sourceSchema>;

export function emptySpecs(): Specs {
  return {
    input_price_per_mtok: null,
    output_price_per_mtok: null,
    cached_input_price_per_mtok: null,
    batch_discount_pct: null,
    currency: null,
    context_window_tokens: null,
    max_output_tokens: null,
    modalities_in: null,
    modalities_out: null,
    supports_tools: null,
    supports_json_schema: null,
    supports_vision: null,
    supports_streaming: null,
    supports_batch: null,
    supports_prompt_caching: null,
    reasoning: null,
    knowledge_cutoff: null,
    endpoints: null,
    specs_sources: {},
  };
}
