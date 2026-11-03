import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { modelSchema, type ModelRecord } from "../schema.ts";
import { aliasIdOf, aliasSnapshotView, applyAliasSnapshotShutdowns, isDeprecationsSource } from "./aliases.ts";
import type { GuidePage } from "./guides.ts";
import { SHUTDOWN_BATCH_MIN, longDate, publishedReplacementIds, shutdownEventSlug } from "./shutdowns.ts";

const OPENAI_DEPRECATIONS = "https://developers.openai.com/api/docs/deprecations";

/** Checked against the OpenAI rows. The slug uses this date. */
export const DECEMBER_11_SHUTDOWN_DATE = "2026-12-11";
export const DECEMBER_11_GUIDE_SLUG = "openai-december-11-2026-shutdowns";

/** Checked against the OpenAI rows. The slug uses this date. */
export const JANUARY_2027_SHUTDOWN_DATE = "2027-01-14";
export const JANUARY_2027_GPT4_GUIDE_SLUG = "openai-gpt-4-1-gpt-4o-shutdown-january-2027";

/** Checked against the OpenAI image rows on 2026-11-01. The slug uses this date. */
export const DECEMBER_1_IMAGE_SHUTDOWN_DATE = "2026-12-01";
export const DECEMBER_1_IMAGE_GUIDE_SLUG = "openai-image-model-shutdown-december-1-2026";

/** Checked against the OpenAI speech, audio, and realtime rows on 2026-11-01. */
export const JANUARY_6_TTS_SHUTDOWN_DATE = "2027-01-06";
export const JANUARY_20_AUDIO_SHUTDOWN_DATE = "2027-01-20";
export const JANUARY_2027_AUDIO_GUIDE_SLUG = "openai-audio-realtime-tts-shutdowns-january-2027";

/** Checked against the MiniMax rows. The slug uses this date. */
export const MINIMAX_NOV18_SHUTDOWN_DATE = "2026-11-18";
export const MINIMAX_NOV18_GUIDE_SLUG = "minimax-m2-5-m2-7-shutdown-november-18-2026";

/** Checked against the Bedrock legacy lifecycle page. The slug uses this date. */
export const BEDROCK_NOV13_SHUTDOWN_DATE = "2026-11-13";
export const BEDROCK_NOV13_GUIDE_SLUG = "amazon-bedrock-claude-3-shutdown-november-13-2026";

/** Checked against the Bedrock legacy lifecycle page on 2026-11-02. The slug uses this date. */
export const BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE = "2026-11-26";
export const BEDROCK_JAMBA_NOV26_GUIDE_SLUG = "amazon-bedrock-ai21-jamba-shutdown-november-26-2026";
const JAMBA_CHECKED = "2026-11-02";
const JAMBA_IDS = ["ai21.jamba-1-5-large-v1:0", "ai21.jamba-1-5-mini-v1:0"] as const;

/** Checked against the Azure OpenAI retirement schedule. The slug uses this date. */
export const AZURE_NOV19_SHUTDOWN_DATE = "2026-11-19";
export const AZURE_NOV19_GUIDE_SLUG = "azure-openai-o-series-retirement-november-19-2026";
export const AZURE_CODEX_MINI_DATE = "2026-11-15";
export const AZURE_CHAT_LATEST_DATE = "2026-11-17";

/** Checked against the Azure OpenAI retirement schedule on 2026-11-02. */
export const AZURE_NOV_DEC_GUIDE_SLUG = "azure-openai-retirements-november-december-2026";
export const AZURE_NOV_DEC_CHECKED = "2026-11-02";
export const AZURE_CHAT_DEC8_DATE = "2026-12-08";
export const AZURE_SPEECH_DATE = "2026-12-15";
export const AZURE_IMAGE_15_DATE = "2026-12-16";

const AZURE_NOV_DEC_IDS = new Set([
  "codex-mini-2025-05-16",
  "gpt-chat-latest-2026-05-05",
  "gpt-chat-latest-2026-05-28",
  "gpt-chat-latest-2026-06-24",
  "gpt-image-1.5-2025-12-16",
  "tts-001",
  "tts-hd-001",
  "whisper-001",
]);

/** Checked against GitHub's October 15, 2026 Copilot changelog. The slug uses this date. */
export const COPILOT_NOV16_SHUTDOWN_DATE = "2026-11-16";
export const COPILOT_NOV16_GUIDE_SLUG = "github-copilot-model-retirements-november-16-2026";

/** Checked against the Fireworks changelog. The slug uses this date. */
export const FIREWORKS_NOV7_SHUTDOWN_DATE = "2026-11-07";
export const FIREWORKS_NOV7_GUIDE_SLUG = "fireworks-model-shutdowns-november-7-2026";

/** Checked against the Nebius November 2026 notice. The slug uses this date. */
export const NEBIUS_NOV9_SHUTDOWN_DATE = "2026-11-09";
export const NEBIUS_NOV9_GUIDE_SLUG = "nebius-model-shutdowns-november-9-2026";
const NEBIUS_AUGUST_SHUTDOWN_DATE = "2026-08-31";

/** Checked against the Gemini API deprecations table. The slug uses this date. */
export const GEMINI_NOV17_SHUTDOWN_DATE = "2026-11-17";
export const GEMINI_NOV17_GUIDE_SLUG = "gemini-api-model-shutdowns-november-17-2026";

/** Checked against Anthropic's deprecations page on 2026-11-01. The slug uses this date. */
export const SONNET45_NOV30_SHUTDOWN_DATE = "2026-11-30";
export const SONNET45_NOV30_GUIDE_SLUG = "claude-sonnet-4-5-shutdown-november-30-2026";
const SONNET45_CHECKED = "2026-11-01";

/**
 * Checked against Anthropic's deprecations page on 2026-11-02.
 * The slug uses the floor date. That date is not a fixed shutdown day.
 */
export const OPUS45_FLOOR_DATE = "2026-11-24";
export const OPUS45_GUIDE_SLUG = "claude-opus-4-5-retirement-november-24-2026";
const OPUS45_CHECKED = "2026-11-02";
const OPUS45_ID = "claude-opus-4-5-20251101";

const MINIMAX_MODELS = "https://platform.minimax.io/docs/faq/models";
const MINIMAX_TEXT = "https://platform.minimax.io/docs/guides/text-generation";
const MINIMAX_NEW_USERS = "These models will no longer be available to new users.";
const MINIMAX_RETIRED = "These models will be retired.";
const MINIMAX_STOP = "Once retired, API requests to these models will no longer work.";
const MINIMAX_ROUTE = "Starting October 19, 2026, all requests to M2.5 and M2.7 models under these plans will automatically be routed to M3.1 Flash.";
const MINIMAX_NAMES = "Existing model names will continue to work for backward compatibility, so you won’t need to update the model names in your requests.";
const MINIMAX_ALLOWANCES = "Your plan’s usage allowances will remain unchanged.";
const MINIMAX_TABLE = "The following models have been retired and are no longer available.";
const MINIMAX_THINKING = 'model "MiniMax-M3.1-Flash" requires adaptive thinking';

const BEDROCK_LEGACY = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";
const BEDROCK_HAIKU_CARD = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html";
const BEDROCK_REGIONS = "https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html";
const BEDROCK_LIMITED = "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-limited-model-selection.html";
const CLAUDE_VERSIONING = "https://platform.claude.com/docs/en/api/versioning";
const SONNET_MIGRATION = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const ISSUE_AGENT_SQUAD = "https://github.com/2FastLabs/agent-squad/issues/721";
const ISSUE_CLAUDE_CODE_ACTION = "https://github.com/anthropics/claude-code-action/issues/1850";
const BEDROCK_HAIKU_US = "us.anthropic.claude-3-haiku-20240307-v1:0";
const BEDROCK_HAIKU_EU = "eu.anthropic.claude-3-haiku-20240307-v1:0";
const BEDROCK_V2_US = "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
const BEDROCK_V2_GLOBAL = "global.anthropic.claude-3-5-sonnet-20241022-v2:0";
const BEDROCK_EOL_ERROR = "ResourceNotFoundException: This model version has reached the end of its life.";
const BEDROCK_EOL_LONGER =
  "404 ResourceNotFoundException: This model version has reached the end of its life. Please refer to the AWS documentation for more details.";
const BEDROCK_MIGRATE =
  "You will need to migrate to the latest model by updating your application code before the EOL date. Migration will not happen automatically.";
const BEDROCK_ONLY_DATES = "For Amazon Bedrock usage, only the dates on this page apply.";
const BEDROCK_REGION_SPLIT =
  "Model lifecycle state can differ by AWS Region. The Regions column in the following tables lists only the Regions covered by a model's announced EOL date.";
const BEDROCK_FAIL =
  "On, or soon after the EOL date, the model is no longer available for use in all AWS Regions and requests made to this version will fail, unless there is a private arrangement between you and the provider for continued access.";
const BEDROCK_LEGACY_ACCESS =
  "New customers can't use Legacy models and existing customers may lose access to Legacy models after 15 days of inactivity.";
const BEDROCK_NO_THROUGHPUT = "You can't create a new Provisioned Throughput for models in the Legacy state.";
const BEDROCK_PROFILE_GAP =
  "When a model reaches its End-of-Life date, it's no longer available through the inference profile. A replacement model might not be offered through the same inference profile for you to migrate to.";
const BEDROCK_HAIKU_NOW =
  "Claude 3 Haiku reached end of life on September 10, 2026 in most Regions, where requests now fail with ResourceNotFoundException: This model version has reached the end of its life.";
const BEDROCK_HAIKU_LATER =
  "These Regions have an upcoming end of life of November 13, 2026, after which requests in these Regions will also fail.";
const BEDROCK_VERSIONING =
  "On Amazon Bedrock, it's available for Claude 4.7 and later models. For other models on Bedrock, see the migration guide.";
const AGENT_SQUAD_DEFAULT =
  "Since BedrockClassifier is the orchestrator's default classifier, a default setup in us-east-1 fails.";

/** Longer ids first so a mini alias is not treated as the shorter one. */
const JANUARY_ALIASES = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o", "gpt-4.1"] as const;

const ACCESSIBLE =
  "At the time of the shut down, the model or endpoint will no longer be accessible.";
const JUNE_11_NOTICE =
  "On June 11, 2026, we notified developers using older GPT-5 and o3 model snapshots of their deprecation and removal from the API on December 11, 2026.";
const OCTOBER_14_NOTICE =
  "On October 14, 2026, we notified developers using certain GPT-4 series models of their deprecation and removal from the API on January 14, 2027.";
const FINE_TUNES =
  "Fine-tuned versions of these models follow the same shutdown schedule as their underlying base models.";
const IMAGE_NOTICE =
  "On June 2, 2026, we notified developers using older GPT Image models of their deprecation and removal from the API on December 1, 2026.";
const IMAGE_CHOICE =
  "Choose Sunburst for workflows where editing precision matters most, and Flare for fast, high-quality everyday image generation.";
const IMAGE_SET_MODEL =
  "With the Image API, set model to gpt-image-2.5-sunburst or gpt-image-2.5-flare directly. With the Responses API, select a supported mainline model at the top level and specify gpt-image-2.5-sunburst or gpt-image-2.5-flare in the image generation tool's model field.";
const IMAGE_QUALITY =
  "gpt-image-2.5-sunburst and gpt-image-2.5-flare add xhigh and max quality settings. Both default to auto. Earlier GPT Image models support quality settings up to high.";
const IMAGE_SIZES =
  "Both models also support custom dimensions as WIDTHxHEIGHT strings, such as 1536x864. Width and height must be multiples of 16, the aspect ratio must be between 1:3 and 3:1, and neither edge may exceed 3840 pixels. The total pixel count must be between 655,360 and 8,294,400 (4K). Resolutions above 2560x1440 are experimental.";
const IMAGE_USER =
  "The Images API user parameter is deprecated. Send the same identifier as safety_identifier instead. Existing requests using user remain supported.";
const TTS_NOTICE =
  "The following text-to-speech models are deprecated and will be removed from the API on January 6, 2027, with at least three months' notice. Migrate to gpt-realtime-2.1-mini before the shutdown date. See the Realtime API guide to plan your migration.";
const TTS_WORKFLOW =
  "The tts-1, tts-1-hd, and gpt-4o-mini-tts models are deprecated and will shut down on January 6, 2027. Migrate to gpt-realtime-2.1-mini using the Realtime API. This is a change of API workflow: gpt-realtime-2.1-mini isn't a supported model for /v1/audio/speech.";
const TTS_VOICES =
  "The tts-1 and tts-1-hd models support a smaller set: alloy, ash, coral, echo, fable, onyx, nova, sage, and shimmer.";
const REALTIME_VOICES =
  "Current voice options are alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, and cedar.";
const REALTIME_VOICE_LOCK =
  "Once the model has emitted audio in a session, the voice cannot be modified for that session.";
const AUDIO_NOTICE =
  "On July 20, 2026, we notified developers using legacy audio, realtime, and transcription model families and snapshots of their deprecation and removal from the API on January 20, 2027.";
const FINE_TUNE_JAN6 =
  "Active existing customers will no longer be able to create new fine-tuning jobs on this date. Inference on fine-tuned models will be disabled only when the underlying base model is deprecated.";
const TRANSCRIBE_FEB =
  "whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-transcribe-diarize, and /v1/audio/translations are deprecated and will shut down on February 26, 2027.";
const TRANSCRIBE_LANGUAGE =
  "For gpt-transcribe, languages replaces the singular language field. Don't send both fields.";
const OPENAI_IMAGE_GUIDE = "https://developers.openai.com/api/docs/guides/image-generation";
const OPENAI_SUNBURST = "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst";
const OPENAI_TTS = "https://developers.openai.com/api/docs/guides/text-to-speech";
const OPENAI_REALTIME = "https://developers.openai.com/api/docs/guides/realtime";
const OPENAI_REALTIME_CONVERSATIONS = "https://developers.openai.com/api/docs/guides/realtime-conversations";
const OPENAI_TRANSCRIBE = "https://developers.openai.com/api/docs/guides/speech-to-text";
const OPENAI_AUDIO_15 = "https://developers.openai.com/api/docs/models/gpt-audio-1.5";
const OPENAI_REALTIME_21 = "https://developers.openai.com/api/docs/models/gpt-realtime-2.1";
const OPENAI_REALTIME_21_MINI = "https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini";

let catalogCache: ModelRecord[] | undefined;

function readCatalog(): ModelRecord[] {
  if (catalogCache) return catalogCache;
  const dir = path.join(process.cwd(), "data/models");
  const models: ModelRecord[] = [];
  if (!existsSync(dir)) {
    catalogCache = models;
    return models;
  }
  for (const provider of readdirSync(dir)) {
    const folder = path.join(dir, provider);
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      models.push(modelSchema.parse(JSON.parse(readFileSync(path.join(folder, file), "utf8"))));
    }
  }
  catalogCache = applyAliasSnapshotShutdowns(
    models.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id)),
  );
  return catalogCache;
}

export function isDecember11OpenAiShutdown(model: ModelRecord): boolean {
  return model.provider === "openai"
    && model.shutdown_date === DECEMBER_11_SHUTDOWN_DATE
    && (model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "via_snapshots");
}

export function isMinimaxNov18Shutdown(model: ModelRecord): boolean {
  return model.provider === "minimax"
    && model.shutdown_date === MINIMAX_NOV18_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockNov13Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && model.shutdown_date === BEDROCK_NOV13_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockJambaNov26Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && (JAMBA_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureNov19OSeries(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && model.shutdown_date === AZURE_NOV19_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureCodexMini(model: ModelRecord): boolean {
  return model.provider === "azure-openai" && model.id === "codex-mini-2025-05-16";
}

export function isAzureChatLatestNov17(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && model.family === "gpt-chat-latest"
    && model.shutdown_date === AZURE_CHAT_LATEST_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureNovDecRetirement(model: ModelRecord): boolean {
  return model.provider === "azure-openai" && AZURE_NOV_DEC_IDS.has(model.id);
}

export function isCopilotNov16Shutdown(model: ModelRecord): boolean {
  return model.provider === "github-copilot"
    && model.shutdown_date === COPILOT_NOV16_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isFireworksNov7Shutdown(model: ModelRecord): boolean {
  return model.provider === "fireworks"
    && model.shutdown_date === FIREWORKS_NOV7_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isNebiusNov9Shutdown(model: ModelRecord): boolean {
  return model.provider === "nebius"
    && model.shutdown_date === NEBIUS_NOV9_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isGeminiNov17Shutdown(model: ModelRecord): boolean {
  return model.provider === "google-gemini-api"
    && model.shutdown_date === GEMINI_NOV17_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isVertexNovDecGemini(model: ModelRecord): boolean {
  return model.provider === "google-vertex"
    && model.shutdown_date_kind === "exact"
    && (
      (model.id === VERTEX_FLASH_ID && model.shutdown_date === VERTEX_NOV19_SHUTDOWN_DATE)
      || (model.id === VERTEX_LIVE_ID && model.shutdown_date === VERTEX_DEC13_SHUTDOWN_DATE)
    );
}

export function isSonnet45Nov30Shutdown(model: ModelRecord): boolean {
  return model.provider === "anthropic"
    && model.id === "claude-sonnet-4-5-20250929"
    && model.shutdown_date === SONNET45_NOV30_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isOpus45RetirementFloor(model: ModelRecord): boolean {
  return model.provider === "anthropic"
    && model.id === OPUS45_ID
    && model.shutdown_date === OPUS45_FLOOR_DATE
    && model.shutdown_date_kind === "not_before";
}

export function isJanuary2027Gpt4Shutdown(model: ModelRecord): boolean {
  if (model.provider !== "openai" || model.shutdown_date !== JANUARY_2027_SHUTDOWN_DATE) return false;
  if (model.shutdown_date_kind !== "exact" && model.shutdown_date_kind !== "via_snapshots") return false;
  if ((JANUARY_ALIASES as readonly string[]).includes(model.id)) return true;
  const alias = aliasIdOf(model.id);
  return alias !== null && (JANUARY_ALIASES as readonly string[]).includes(alias);
}

export function isDecember1ImageShutdown(model: ModelRecord): boolean {
  return model.provider === "openai"
    && model.shutdown_date === DECEMBER_1_IMAGE_SHUTDOWN_DATE
    && (model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "via_snapshots");
}

export function isJanuary2027AudioShutdown(model: ModelRecord): boolean {
  if (model.provider !== "openai") return false;
  if (model.shutdown_date !== JANUARY_6_TTS_SHUTDOWN_DATE && model.shutdown_date !== JANUARY_20_AUDIO_SHUTDOWN_DATE) return false;
  return model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "via_snapshots";
}

function modelLink(model: ModelRecord): string {
  return `[${model.id}](/models/${model.provider}/${model.slug}/)`;
}

function replacementText(model: ModelRecord, catalog: ModelRecord[]): string {
  const ids = publishedReplacementIds(model);
  if (!ids.length) return "Not published";
  const excerpt = model.sources.find(isDeprecationsSource)?.excerpt ?? "";
  return ids.map((id) => {
    const target = catalog.find((item) => item.provider === model.provider && item.id === id)
      ?? catalog.find((item) => item.id === id);
    const label = target ? `[${id}](/models/${target.provider}/${target.slug}/)` : id;
    const note = excerpt.includes(`${id} (reasoning.mode: pro)`) ? " (reasoning.mode: pro)" : "";
    return `${label}${note}`;
  }).join(", ");
}

function shutdownCell(model: ModelRecord): string {
  if (!model.shutdown_date) return "Not published";
  if (model.shutdown_date_kind === "via_snapshots") return `Snapshots retire ${model.shutdown_date}`;
  return model.shutdown_date;
}

function deprecationCell(model: ModelRecord): string {
  return model.deprecation_date ?? "Not published";
}

function newestDeprecationsCheck(rows: ModelRecord[]): string {
  const days = rows.flatMap((model) => model.sources.filter(isDeprecationsSource).map((source) => source.last_checked));
  return days.sort().at(-1) ?? rows.flatMap((model) => model.sources.map((source) => source.last_checked)).sort().at(-1) ?? DECEMBER_11_SHUTDOWN_DATE;
}

function searchCode(rows: ModelRecord[]): string {
  const flags = rows.map((model) => `-e '${model.id}'`).join(" ");
  return `rg -n -w ${flags}\n`;
}

function rowsFor(predicate: (model: ModelRecord) => boolean, catalog: ModelRecord[]): ModelRecord[] {
  return catalog.filter(predicate).sort((a, b) => a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug));
}

function tableRows(rows: ModelRecord[], catalog: ModelRecord[]): string[][] {
  return rows.map((model) => [
    modelLink(model),
    deprecationCell(model),
    shutdownCell(model),
    replacementText(model, catalog),
  ]);
}

function idList(rows: ModelRecord[]): string {
  return rows.map((model) => model.id).join(", ");
}

function replacementFaq(rows: ModelRecord[], catalog: ModelRecord[]): string {
  const lines = rows.map((model) => `${model.id}: ${replacementText(model, catalog)}`);
  return `The recommended replacement is the official replacement stored on each row. ${lines.join(". ")}.`;
}

function deprecationFaq(rows: ModelRecord[]): string {
  const dated = rows.filter((model) => model.deprecation_date);
  if (!dated.length) return "No deprecation_date is stored on these rows. The table says Not published.";
  return dated.map((model) => `${model.id}: ${model.deprecation_date}`).join(". ");
}

const CLAUDE_DEPRECATIONS = "https://platform.claude.com/docs/en/about-claude/model-deprecations";
const CLAUDE_SONNET45 = "https://platform.claude.com/docs/en/models/sonnet-4-5/overview";
const CLAUDE_SONNET55 = "https://platform.claude.com/docs/en/models/sonnet-5-5/overview";
const CLAUDE_MIGRATION = "https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide";
const CLAUDE_OPUS45 = "https://platform.claude.com/docs/en/models/opus-4-5/overview";
const CLAUDE_OPUS55 = "https://platform.claude.com/docs/en/models/opus-5-5/overview";
const CLAUDE_OPUS_MIGRATION = "https://platform.claude.com/docs/en/models/opus-5-5/migration-guide";
const CLAUDE_MODELS = "https://platform.claude.com/docs/en/about-claude/models/overview";
const CLAUDE_ERRORS = "https://platform.claude.com/docs/en/api/errors";
const CLAUDE_IDS = "https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions";
const CLAUDE_FAST = "https://platform.claude.com/docs/en/build-with-claude/fast-mode";
const BEDROCK_SONNET45_CARD = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html";
const COPILOT_MODELS = "https://docs.github.com/en/copilot/reference/ai-models/supported-models";
const COPILOT_OPUS45_CHANGELOG = "https://github.blog/changelog/2026-08-31-selected-github-copilot-models-deprecated";
const SONNET_RETIRED = "The model is no longer available for use. Requests to retired models fail.";
const SONNET_PAST = "Requests to models past the retirement date will fail.";
const SONNET_PLATFORMS = "The dates on this page apply to Anthropic-operated platforms: the Claude API, Claude Platform on AWS, Claude Models on Google Cloud (Anthropic managed), and Microsoft Foundry.";
const SONNET_PARTNERS = "Partner-operated platforms, Amazon Bedrock and Claude Models on Google Cloud (Google managed), set their own retirement schedules, so a model's lifecycle status and dates can differ.";
const SONNET_ALIAS = "On the Claude API, these models also have shorter aliases (for example, claude-sonnet-4-5) that point to the most recent dated snapshot for that minor version.";
const SONNET_THINKING_ENABLED = '"thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.';
const SONNET_PREFILL = "This model does not support assistant message prefill. The conversation must end with a user message.";
const SONNET_TOOL_CHOICE = 'tool_choice: type "tool" and "any" are not supported for this model.';
const SONNET_DISABLED = 'To turn thinking off on this model, send "thinking": {"type": "between_tools"} instead of {"type": "disabled"}.';
const SONNET_SAMPLING = "Setting temperature, top_p, or top_k returns a 400 error.";
const SONNET_FAST = 'Fast mode on Claude Opus 4.8 is deprecated and will be removed on November 30, 2026. After removal, requests to claude-opus-4-8 with speed: "fast" will return an error. To continue using fast mode, migrate to Claude Opus 5.5.';
const SONNET_BEDROCK_CARD = "Claude Sonnet 4.5 is in the Legacy stage in all Regions. It has an upcoming end of life of April 8, 2027, after which requests will fail with ResourceNotFoundException: This model version has reached the end of its life.";
const SONNET_TOKENS = "About 30 percent more tokens: Claude Sonnet 5.5 uses Claude Sonnet 5's tokenizer. Against Claude Sonnet 4.6, Claude Sonnet 4.5, and Claude Haiku 4.5, the same text produces about 30 percent more tokens, depending on the content. Recount with token counting, and revisit max_tokens and cost.";
const OPUS_ACTIVE = "The model is fully supported and recommended for use.";
const OPUS_NOTICE = "Anthropic notifies customers with active deployments for models with upcoming retirements, providing at least 60 days' notice before model retirement for publicly released models.";
const OPUS_AUDIT = "Review the downloaded CSV to see usage broken down by API key and model.";
const OPUS45_CONSIDER = "Although Claude Opus 4.5 is still available, you should consider migrating to Claude Opus 5.5.";
const OPUS55_REJECTED = "Where an item says a setting is rejected, the API returns a 400 error.";
const OPUS55_THINKING_DISABLED = '"thinking.type.disabled" is not supported for this model.';
const OPUS55_THINKING_ENABLED = '"thinking.type.enabled" is not supported for this model.';
const OPUS55_TOOL = 'tool_choice: type "tool" and "any" are not supported for this model.';
const OPUS55_PREFILL = "Prefilling assistant messages returns a 400 error on Claude Opus 4.6 and later Opus models, including Claude Opus 5.5, so this is a change only if you come from Claude Opus 4.5 or earlier.";
const OPUS_NOT_FOUND = "The requested resource could not be found.";

function sonnet45Nov30Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(SONNET45_NOV30_SHUTDOWN_DATE);
  const row = rows[0];
  const replacement = row ? publishedReplacementIds(row)[0] : undefined;
  const replacementModel = replacement
    ? catalog.find((model) => model.provider === "anthropic" && model.id === replacement)
    : undefined;
  const bedrock = catalog.find((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-sonnet-4-5-20250929-v1:0");
  const copilot = catalog.find((model) => model.provider === "github-copilot" && model.id === "Claude Sonnet 4.5");
  const sources = [
    { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
    { label: "Claude Sonnet 4.5", url: CLAUDE_SONNET45 },
    { label: "Model IDs and versioning", url: CLAUDE_IDS },
  ];
  return {
    slug: SONNET45_NOV30_GUIDE_SLUG,
    title: `Claude Sonnet 4.5 shutdown on ${when} | SunsetDiff`,
    description: `claude-sonnet-4-5-20250929 is deprecated on September 30, 2026 and retires on ${SONNET45_NOV30_SHUTDOWN_DATE}. The replacement on Anthropic's deprecations page is claude-sonnet-5-5. Bedrock and GitHub Copilot use other dates.`,
    h1: `Claude Sonnet 4.5 shutdown on ${when}`,
    summary: `The Claude API id that retires on ${SONNET45_NOV30_SHUTDOWN_DATE}, the replacement, and the Bedrock and Copilot dates that are not that day.`,
    answer: `Anthropic's deprecations page lists claude-sonnet-4-5-20250929 as Deprecated on September 30, 2026, with retirement date ${SONNET45_NOV30_SHUTDOWN_DATE}. The history table names claude-sonnet-5-5 as the recommended replacement. The same page says: "${SONNET_PLATFORMS}" It also says: "${SONNET_PARTNERS}" Bedrock's model card gives anthropic.claude-sonnet-4-5-20250929-v1:0 an end of life of April 8, 2027. GitHub's Copilot retirement history lists Claude Sonnet 4.5 on 2026-09-01. After the Claude API retirement, the deprecations page says requests fail. It does not print an HTTP status or an error sentence.`,
    checked: SONNET45_CHECKED,
    steps: [
      {
        name: "Change the model id on Anthropic-operated platforms",
        text: `On the Claude API, replace claude-sonnet-4-5-20250929 with ${replacement ?? "claude-sonnet-5-5"}. The alias claude-sonnet-4-5 points at that dated snapshot. Microsoft Foundry and Claude Platform on AWS send claude-sonnet-4-5. Claude Models on Google Cloud (Anthropic managed) sends claude-sonnet-4-5-20250929. The deprecations page says those platforms use this retirement date.`,
      },
      {
        name: "Drop settings Claude Sonnet 5.5 rejects",
        text: "Remove temperature, top_p, and top_k. Remove thinking.type enabled and budget_tokens, and set output_config.effort. Do not end the messages array with an assistant prefill. Do not send tool_choice type tool or any. Read each content block by type, because a response can start with a thinking block.",
      },
      {
        name: "Leave Bedrock and Copilot on their own dates",
        text: "A Bedrock call uses anthropic.claude-sonnet-4-5-20250929-v1:0 and the April 8, 2027 end of life on the Bedrock model card. A Copilot chat model named Claude Sonnet 4.5 already has retirement date 2026-09-01 on GitHub's retirement history. Do not move those callers because of the November 30 Claude API date.",
      },
      {
        name: "Search the repo and send one test call",
        text: `Search for the ids below. Call ${replacement ?? "claude-sonnet-5-5"} with a prompt you use now, before ${when}. The fast mode removal on claude-opus-4-8 is the same calendar day and a different change.`,
      },
    ],
    sections: [
      {
        heading: "What retires and when",
        paragraphs: [
          `The dataset has ${rows.length} Anthropic id with shutdown date ${SONNET45_NOV30_SHUTDOWN_DATE}. The deprecations history for September 30, 2026 lists one deprecated model, claude-sonnet-4-5-20250929, and one recommended replacement, claude-sonnet-5-5. The status table says Deprecated, September 30, 2026, November 30, 2026.`,
          `The deprecations page says: "${SONNET_PLATFORMS}" And: "${SONNET_PARTNERS}"`,
          `The model IDs page says: "${SONNET_ALIAS}" The deprecations table does not list claude-sonnet-4-5 by name. The Sonnet 4.5 model page lists that alias next to claude-sonnet-4-5-20250929.`,
        ],
        table: {
          caption: `Anthropic model id in the dataset with shutdown date ${SONNET45_NOV30_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "Ids by platform",
        paragraphs: [
          "The Sonnet 4.5 model page lists these ids. The retirement date on that page is November 30, 2026. The deprecations page says which platforms that date covers. A partner platform can publish a different day.",
          "Microsoft Foundry and Claude Platform on AWS are in the Anthropic-operated list, and both ids on the model page are claude-sonnet-4-5. Claude Models on Google Cloud (Anthropic managed) uses claude-sonnet-4-5-20250929. Claude Models on Google Cloud (Google managed) uses claude-sonnet-4-5@20250929. The deprecations page says Google managed sets its own schedule. This guide does not store a Google-managed shutdown date.",
        ],
        table: {
          caption: "Model ids on the Claude Sonnet 4.5 page, and whether the November 30, 2026 deprecations date applies.",
          headers: ["Platform", "Model id", "November 30, 2026 date"],
          rows: [
            ["Claude API", row ? modelLink(row) : "claude-sonnet-4-5-20250929", "Yes. Deprecations page."],
            ["Claude API alias", "claude-sonnet-4-5", "The alias points at the dated snapshot. The deprecations table does not list the alias by name."],
            ["Microsoft Foundry", "claude-sonnet-4-5", "Yes. Anthropic-operated platform."],
            ["Claude Platform on AWS", "claude-sonnet-4-5", "Yes. Anthropic-operated platform. This is not the Bedrock id."],
            ["Claude Models on Google Cloud (Anthropic managed)", "claude-sonnet-4-5-20250929", "Yes. Anthropic-operated platform."],
            ["Claude Models on Google Cloud (Google managed)", "claude-sonnet-4-5@20250929", "No. That platform sets its own schedule. No date is stored here."],
            ["Amazon Bedrock (InvokeModel)", bedrock ? modelLink(bedrock) : "anthropic.claude-sonnet-4-5-20250929-v1:0", "No. Bedrock publishes April 8, 2027."],
          ],
        },
        sources: [
          { label: "Claude Sonnet 4.5", url: CLAUDE_SONNET45 },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Model IDs and versioning", url: CLAUDE_IDS },
        ],
      },
      {
        heading: "Bedrock and Copilot use other dates",
        paragraphs: [
          `Bedrock's Claude Sonnet 4.5 model card says: "${SONNET_BEDROCK_CARD}" The legacy lifecycle table lists the same id with legacy date October 8, 2026 and EOL date April 8, 2027.${bedrock ? ` The stored Bedrock row is ${modelLink(bedrock)}, shutdown date ${bedrock.shutdown_date ?? "Not published"}.` : ""}`,
          `GitHub's Copilot retirement history lists Claude Sonnet 4.5 with retirement date 2026-09-01 and suggested alternative Latest Claude Sonnet model. That phrase is not a model id.${copilot ? ` The stored Copilot row is ${modelLink(copilot)}, shutdown date ${copilot.shutdown_date ?? "Not published"}.` : ""} That date is already past on the day this guide was checked. It is not November 30, 2026.`,
          "Use the date for the host that receives the request. A Claude API string and a Bedrock string can sit in the same repository and still shut down on different days.",
        ],
        table: {
          caption: "Sonnet 4.5 dates that are not the Claude API retirement.",
          headers: ["Host", "Id", "Date on that host's page"],
          rows: [
            ["Claude API", row ? modelLink(row) : "claude-sonnet-4-5-20250929", SONNET45_NOV30_SHUTDOWN_DATE],
            ["Amazon Bedrock", bedrock ? modelLink(bedrock) : "anthropic.claude-sonnet-4-5-20250929-v1:0", bedrock?.shutdown_date ?? "2027-04-08"],
            ["GitHub Copilot", copilot ? modelLink(copilot) : "Claude Sonnet 4.5", copilot?.shutdown_date ?? "2026-09-01"],
          ],
        },
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock Claude Sonnet 4.5 model card", url: BEDROCK_SONNET45_CARD },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
          { label: "GitHub Copilot supported models", url: COPILOT_MODELS },
        ],
      },
      {
        heading: "What callers see after shutdown",
        paragraphs: [
          `On ${when} claude-sonnet-4-5-20250929 reaches the retirement date on Anthropic-operated platforms. The deprecations page defines Retired as: "${SONNET_RETIRED}" It also says: "${SONNET_PAST}"`,
          "That page does not print an HTTP status or an error sentence for a retired model. This guide does not invent one. A 400 from a field Claude Sonnet 5.5 rejects is a different failure. It happens when the new id is already in the request and an old setting is still there. Those sentences are quoted in the next section.",
          `SunsetDiff publishes a shutdown batch page when at least three model records share one provider and one exact shutdown date. This date has one Anthropic id, so there is no /shutdowns/anthropic-2026-11-30/ page. [/shutdowns/mistral-2025-11-30/](/shutdowns/mistral-2025-11-30/) is November 30, 2025, for Mistral. It is not this Claude date.`,
        ],
        sources: [{ label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS }],
      },
      {
        heading: "Swap the model id",
        paragraphs: [
          `The migration guide says to change the model id to claude-sonnet-5-5. claude-sonnet-5-5 has no date suffix. The Sonnet 5.5 model page lists that same id on the Claude API, Amazon Bedrock, Google Cloud (Google managed), Microsoft Foundry, Claude Platform on AWS, and Google Cloud (Anthropic managed). Bedrock's current Sonnet 4.5 id is still the v1:0 id above, and its end of life stays April 8, 2027. This snippet is the Claude API call.`,
          `The Sonnet 5.5 model page says: "${SONNET_SAMPLING}" The migration guide says sampling parameters return an error and to remove temperature, top_p, and top_k. The same guide prints this 400 for a thinking budget: "${SONNET_THINKING_ENABLED}" Remove the budget and set output_config.effort. It says there is no fixed mapping from a budget to an effort level.`,
          `A request with no thinking field runs adaptive thinking on Claude Sonnet 5.5. On Claude Sonnet 4.5 that request ran without thinking. thinking.type disabled returns a 400. The migration guide says: "${SONNET_DISABLED}" between_tools is accepted at low, medium, and high effort. At xhigh or max it returns a 400. The Sonnet 4.5 page says default effort is not supported. The Sonnet 5.5 page says the default effort on the Claude API is high.`,
          `The migration guide says a prefilled last assistant turn returns a 400, and prints: "${SONNET_PREFILL}" It also prints: "${SONNET_TOOL_CHOICE}" Send tool_choice type auto, and mark the tool strict if you need the input to match the schema. Read content blocks by type. A response can start with a thinking block, so content[0].text breaks. Pass thinking blocks back unchanged in a tool loop.`,
          `The migration guide says: "${SONNET_TOKENS}" Recount tokens and revisit max_tokens. The Sonnet 4.5 page lists a 200K context window and 64K max output. The Sonnet 5.5 page lists a 1M context window and 128K max output, with no context-window beta header. The Sonnet 4.5 page lists input $3 per million tokens and output $15. The Sonnet 5.5 page lists input $2 and output $10. Cache read on the Sonnet 5.5 page is $0.10 per million tokens.`,
          "The migration guide also says to parse tool-call input with a standard JSON parser, to stop sending computer_20250124, to remove interleaved-thinking-2025-05-14, and to move output_format to output_config.format. The full checklist is on that page. The [migration diff](/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/) lists the request changes stored on SunsetDiff.",
        ],
        codes: [
          {
            caption: "Python Messages API call after the id change",
            code: `import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="${replacement ?? "claude-sonnet-5-5"}",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sources: [
          { label: "Migrate to Claude Sonnet 5.5", url: CLAUDE_MIGRATION },
          { label: "Claude Sonnet 5.5", url: CLAUDE_SONNET55 },
          { label: "Claude Sonnet 4.5", url: CLAUDE_SONNET45 },
        ],
      },
      {
        heading: "Fast mode on Claude Opus 4.8",
        paragraphs: [
          `The same calendar day removes a setting on a different model. Anthropic's fast mode page says: "${SONNET_FAST}"`,
          "The deprecations table still lists claude-opus-4-8 as Active, with a retirement of not sooner than May 28, 2027. The model id stays. The speed fast setting is what goes away. The error page for that removal is [claude-opus-4-8 fast mode removed](/errors/claude-opus-4-8-fast-mode-removed/). The fast mode page says the request will return an error. It does not print the error sentence.",
        ],
        sources: [
          { label: "Claude fast mode", url: CLAUDE_FAST },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
        ],
      },
      {
        heading: "Check your code",
        paragraphs: [
          "Search the repository for the Claude API id, the alias, the Bedrock id, the Google-managed id, and the Copilot display name. A hit on the Bedrock id or the Copilot name is a different date. A hit on claude-sonnet-4-5 can be the Claude API alias, Foundry, or Claude Platform on AWS. Read the host in that file before you change it.",
          "The [scan page](/scan/) builds a search from dataset ids that have a shutdown date. The alias claude-sonnet-4-5 is not its own dataset row. Search for it separately. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names.",
        ],
        codes: [
          {
            caption: "ripgrep",
            code: `rg -n -e 'claude-sonnet-4-5-20250929' -e 'claude-sonnet-4-5' -e 'claude-sonnet-4-5@20250929' -e 'anthropic.claude-sonnet-4-5-20250929-v1:0' -e 'Claude Sonnet 4.5'
rg -n -e 'claude-opus-4-8' -e 'speed: "fast"' -e "speed: 'fast'"
`,
          },
        ],
        sources: [
          { label: "Claude Sonnet 4.5", url: CLAUDE_SONNET45 },
          { label: "Claude fast mode", url: CLAUDE_FAST },
          { label: "GitHub Copilot supported models", url: COPILOT_MODELS },
        ],
      },
    ],
    related: [
      { href: "/models/anthropic/claude-sonnet-4-5-20250929/", label: "claude-sonnet-4-5-20250929" },
      { href: replacementModel ? `/models/${replacementModel.provider}/${replacementModel.slug}/` : "/models/anthropic/claude-sonnet-5-5/", label: replacement ?? "claude-sonnet-5-5" },
      { href: "/migrate/anthropic__claude-sonnet-4-5-20250929__to__anthropic__claude-sonnet-5-5/", label: "Sonnet 4.5 to Sonnet 5.5 migration diff" },
      { href: "/providers/anthropic/", label: "Anthropic provider page" },
      { href: bedrock ? `/models/${bedrock.provider}/${bedrock.slug}/` : "/models/aws-bedrock/anthropic-claude-sonnet-4-5-20250929-v1-0/", label: "Bedrock Sonnet 4.5" },
      { href: copilot ? `/models/${copilot.provider}/${copilot.slug}/` : "/models/github-copilot/claude-sonnet-4-5/", label: "Copilot Claude Sonnet 4.5" },
      { href: "/errors/claude-opus-4-8-fast-mode-removed/", label: "claude-opus-4-8 fast mode removed" },
      { href: "/errors/claude-temperature-is-deprecated-for-this-model/", label: "temperature is deprecated for this model" },
      { href: "/errors/claude-sonnet-5-5-thinking-budget/", label: "thinking budget on claude-sonnet-5-5" },
      { href: "/errors/claude-sonnet-5-5-assistant-prefill/", label: "assistant prefill on claude-sonnet-5-5" },
      { href: "/errors/claude-sonnet-5-5-tool-choice-tool-and-any/", label: "tool_choice tool and any" },
      { href: `/guides/${OPUS45_GUIDE_SLUG}/`, label: "Claude Opus 4.5 will not shut down before November 24, 2026" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Claude API id retires on ${when}?`,
        answer: `The deprecations page lists claude-sonnet-4-5-20250929. Deprecated September 30, 2026. Retirement ${SONNET45_NOV30_SHUTDOWN_DATE}. The model IDs page says the alias claude-sonnet-4-5 points at the most recent dated snapshot for that minor version. The deprecations table does not list the alias by name.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacement
          ? `The deprecations history table names ${replacement}. ${replacementFaq(rows, catalog)}`
          : "The dataset row has no stored replacement.",
      },
      {
        question: "What error does a retired call return?",
        answer: `The deprecations page says: "${SONNET_RETIRED}" It also says: "${SONNET_PAST}" It does not print an HTTP status or an error sentence. This page does not invent one.`,
      },
      {
        question: "Does Amazon Bedrock shut this model down on the same day?",
        answer: `No. Bedrock's model card says end of life is April 8, 2027 for anthropic.claude-sonnet-4-5-20250929-v1:0. The legacy table lists legacy date October 8, 2026 and EOL date April 8, 2027. The deprecations page says Bedrock sets its own schedule.`,
      },
      {
        question: "Does GitHub Copilot use November 30, 2026?",
        answer: "No. The Copilot retirement history lists Claude Sonnet 4.5 with retirement date 2026-09-01 and suggested alternative Latest Claude Sonnet model.",
      },
      {
        question: "Does claude-opus-4-8 shut down on November 30, 2026?",
        answer: `No. The deprecations table lists claude-opus-4-8 as Active, not sooner than May 28, 2027. The fast mode page removes speed fast on November 30, 2026. See [claude-opus-4-8 fast mode removed](/errors/claude-opus-4-8-fast-mode-removed/).`,
      },
    ],
    citations: [
      CLAUDE_DEPRECATIONS,
      CLAUDE_SONNET45,
      CLAUDE_SONNET55,
      CLAUDE_MIGRATION,
      CLAUDE_IDS,
      CLAUDE_FAST,
      BEDROCK_SONNET45_CARD,
      BEDROCK_LEGACY,
      COPILOT_MODELS,
    ],
  };
}

function opusFloorCell(model: ModelRecord): string {
  if (!model.shutdown_date) return "Not published";
  if (model.shutdown_date_kind === "not_before") return `Not sooner than ${model.shutdown_date}`;
  return shutdownCell(model);
}

function opus45RetirementGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(OPUS45_FLOOR_DATE);
  const row = rows[0];
  const copilot = catalog.find((model) => model.provider === "github-copilot" && model.id === "Claude Opus 4.5");
  const opus55 = catalog.find((model) => model.provider === "anthropic" && model.id === "claude-opus-5-5");
  const activeOpus = catalog
    .filter((model) => model.provider === "anthropic" && model.status === "active" && model.id.startsWith("claude-opus"))
    .sort((a, b) => {
      if (a.id === OPUS45_ID) return -1;
      if (b.id === OPUS45_ID) return 1;
      return (b.shutdown_date ?? "").localeCompare(a.shutdown_date ?? "") || a.id.localeCompare(b.id);
    });
  const sources = [
    { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
    { label: "Claude Opus 4.5", url: CLAUDE_OPUS45 },
    { label: "Model IDs and versioning", url: CLAUDE_IDS },
  ];
  return {
    slug: OPUS45_GUIDE_SLUG,
    title: `Claude Opus 4.5 will not shut down before ${when} | SunsetDiff`,
    description: `claude-opus-4-5-20251101 is Active. Anthropic's earliest retirement for it is ${OPUS45_FLOOR_DATE}, not a fixed day. The deprecations history names no replacement.`,
    h1: `Claude Opus 4.5 will not shut down before ${when}`,
    summary: `The Claude API id whose tentative retirement is not sooner than ${OPUS45_FLOOR_DATE}, why that is a floor, and the fact that Anthropic names no replacement.`,
    answer: `Anthropic's deprecations page lists claude-opus-4-5-20251101 as Active, with Deprecated N/A and tentative retirement not sooner than ${OPUS45_FLOOR_DATE}. That cell is the earliest possible shutdown, not the day the model stops. The deprecation history does not name a replacement. The Opus 4.5 page says: "${OPUS45_CONSIDER}" That sentence is not a deprecations-history row, so no replacement is stored. The same deprecations page says: "${SONNET_PLATFORMS}" It also says: "${SONNET_PARTNERS}" GitHub Copilot lists Claude Opus 4.5 on 2026-09-01. After a real retirement, the deprecations page says requests fail. It does not print an HTTP status or an error sentence.`,
    checked: OPUS45_CHECKED,
    steps: [
      {
        name: "Read November 24, 2026 as a floor",
        text: `The status table says Active and Deprecated N/A. The retirement cell says not sooner than ${when}. Do not remove the id on that day. The deprecations page says: "${OPUS_NOTICE}" A fixed retirement date would be a Deprecated row with a retirement date. This row is not that.`,
      },
      {
        name: "Find the ids in code and config",
        text: "Search for claude-opus-4-5-20251101, the alias claude-opus-4-5, the Bedrock id anthropic.claude-opus-4-5-20251101-v1:0, and the Google-managed id claude-opus-4-5@20251101. Check source files, env files, YAML, TOML, and JSON. The Claude Console usage export lists calls by API key and model. The scan page skips active models, so this id is not on that list.",
      },
      {
        name: "Open the current models list before you pick an id",
        text: "The deprecations history does not name a replacement. The models overview is the current list. The Opus 4.5 page says to consider Claude Opus 5.5 and links its migration guide. Other Active Opus ids on the deprecations table are still current too. This guide does not pick one for you.",
      },
      {
        name: "If you call claude-opus-5-5, drop the settings it rejects",
        text: `The Opus 5.5 migration guide says: "${OPUS55_REJECTED}" Remove temperature, top_p, and top_k. Remove thinking type enabled and thinking type disabled. Do not end messages with an assistant prefill. Do not send tool_choice type tool or any. Send one test call with a prompt you use now. ${when} is not that test deadline.`,
      },
    ],
    sections: [
      {
        heading: "What November 24, 2026 means",
        paragraphs: [
          `The dataset has ${rows.length} Anthropic id with shutdown date ${OPUS45_FLOOR_DATE} and kind not_before: claude-opus-4-5-20251101. The deprecations status table says Active, Deprecated N/A, tentative retirement not sooner than ${when}. The page defines Active as: "${OPUS_ACTIVE}"`,
          `Not sooner than ${when} is the earliest possible shutdown. It is not a promise that the model stops that day, and it is not a deprecation date. SunsetDiff stores shutdown_date_kind not_before for that cell. The deprecations page says: "${OPUS_NOTICE}"`,
          `The Opus 4.5 page labels the model Legacy and says it was released November 24, 2025. Its availability table lists status Active (legacy) and retirement Not sooner than ${when}. The stored status stays active because the scraper reads the deprecations status table, which says Active. A refresh does not copy the Legacy banner onto the row.`,
          `SunsetDiff publishes a shutdown batch page when at least ${SHUTDOWN_BATCH_MIN} model records share one provider and one exact shutdown date. A not_before date is not an exact shutdown date, so there is no /shutdowns/anthropic-${OPUS45_FLOOR_DATE}/ page. One exact id would still be short of ${SHUTDOWN_BATCH_MIN}.`,
        ],
        table: {
          caption: `Anthropic model id in the dataset with shutdown date ${OPUS45_FLOOR_DATE} and kind not_before.`,
          headers: ["Model id", "Status", "Date on the deprecations table", "Recommended replacement"],
          rows: rows.map((model) => [
            modelLink(model),
            model.status,
            opusFloorCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources,
      },
      {
        heading: "Ids by platform",
        paragraphs: [
          "The Opus 4.5 model page lists these ids. The retirement line on that page is Not sooner than November 24, 2026. The deprecations page says which platforms that date covers. A partner platform can publish a different day.",
          `The model IDs page says: "${SONNET_ALIAS}" The deprecations table does not list claude-opus-4-5 by name. The Opus 4.5 page lists that alias next to claude-opus-4-5-20251101.`,
          "Microsoft Foundry and Claude Platform on AWS are in the Anthropic-operated list, and both ids on the model page are claude-opus-4-5. Claude Models on Google Cloud (Anthropic managed) uses claude-opus-4-5-20251101. Claude Models on Google Cloud (Google managed) uses claude-opus-4-5@20251101. Amazon Bedrock (InvokeModel) uses anthropic.claude-opus-4-5-20251101-v1:0. The deprecations page says those two partner platforms set their own schedules. This guide does not store a Bedrock date or a Google-managed date for this model.",
        ],
        table: {
          caption: "Model ids on the Claude Opus 4.5 page, and whether the November 24, 2026 floor applies.",
          headers: ["Platform", "Model id", "November 24, 2026 floor"],
          rows: [
            ["Claude API", row ? modelLink(row) : OPUS45_ID, "Yes. Deprecations page. It is a floor, not a shutdown day."],
            ["Claude API alias", "claude-opus-4-5", "The alias points at the dated snapshot. The deprecations table does not list the alias by name."],
            ["Microsoft Foundry", "claude-opus-4-5", "Yes. Anthropic-operated platform. Same floor, not a fixed day."],
            ["Claude Platform on AWS", "claude-opus-4-5", "Yes. Anthropic-operated platform. This is not the Bedrock id."],
            ["Claude Models on Google Cloud (Anthropic managed)", OPUS45_ID, "Yes. Anthropic-operated platform. Same floor, not a fixed day."],
            ["Claude Models on Google Cloud (Google managed)", "claude-opus-4-5@20251101", "No. That platform sets its own schedule. No date is stored here."],
            ["Amazon Bedrock (InvokeModel)", "anthropic.claude-opus-4-5-20251101-v1:0", "No. Bedrock sets its own schedule. No Bedrock row is stored for this id."],
          ],
        },
        sources,
      },
      {
        heading: "Copilot uses another date",
        paragraphs: [
          `GitHub's Copilot retirement history lists Claude Opus 4.5 with retirement date 2026-09-01 and suggested alternative Latest Claude Opus model. That phrase is not a model id.${copilot ? ` The stored Copilot row is ${modelLink(copilot)}, shutdown date ${copilot.shutdown_date ?? "Not published"}, status ${copilot.status}.` : ""} The August 31, 2026 changelog names Claude Opus 4.7, Claude Opus 4.8, or Claude Opus 5. Those names are Copilot models, not a Claude API replacement.`,
          "That Copilot date is already past on the day this guide was checked. It is not November 24, 2026. A Claude API string and a Copilot display name can sit in the same repository and still follow different pages.",
        ],
        table: {
          caption: "Opus 4.5 dates that are not the same fact.",
          headers: ["Host", "Id", "Date on that host's page"],
          rows: [
            ["Claude API", row ? modelLink(row) : OPUS45_ID, `Not sooner than ${OPUS45_FLOOR_DATE}`],
            ["GitHub Copilot", copilot ? modelLink(copilot) : "Claude Opus 4.5", copilot?.shutdown_date ?? "2026-09-01"],
          ],
        },
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "GitHub Copilot supported models", url: COPILOT_MODELS },
          { label: "GitHub Changelog, August 31, 2026", url: COPILOT_OPUS45_CHANGELOG },
        ],
      },
      {
        heading: "No replacement on the deprecations page",
        paragraphs: [
          "The deprecation history does not list claude-opus-4-5-20251101. Deprecated models on that page get a recommended replacement. This id is Active, so the replacement column is Not published. This guide does not fill one in.",
          `The Opus 4.5 page says: "${OPUS45_CONSIDER}" It links Claude Opus 5.5 as the current Opus model and links the migration guide. claude-opus-5-5 is Active on the deprecations table, with tentative retirement not sooner than September 22, 2027. That is a documented model you can test. It is not the stored replacement.`,
          "The models overview is the current models list. The table below is every Active Opus id stored from the deprecations status table. Read that overview, and the model page for the id you might call, before you change a request.",
        ],
        table: {
          caption: "Active Opus ids on the deprecations status table. None of these is a stored replacement for claude-opus-4-5-20251101.",
          headers: ["Model id", "Status", "Date on the deprecations table", "Recommended replacement"],
          rows: activeOpus.map((model) => [
            modelLink(model),
            model.status,
            opusFloorCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Claude Opus 4.5", url: CLAUDE_OPUS45 },
          { label: "Claude Opus 5.5", url: CLAUDE_OPUS55 },
          { label: "Models overview", url: CLAUDE_MODELS },
        ],
      },
      {
        heading: "Find the id in code and config",
        paragraphs: [
          "Search the repository for the Claude API id, the alias, the Bedrock id, and the Google-managed id. A hit on claude-opus-4-5 can be the dated snapshot, the alias, Foundry, or Claude Platform on AWS, because the alias is a prefix of the dated id. Read the host in that file before you change it. A hit on the Bedrock id or the Copilot name is a different page.",
          `The deprecations page tells you to open the Usage page in Claude Console, click Export, and then: "${OPUS_AUDIT}" That audit is written for deprecated models. This id is Active. The same CSV still breaks usage down by model, so it shows whether a key called claude-opus-4-5-20251101.`,
          "LangChain puts the id on ChatAnthropic as model=. LiteLLM puts a provider string in model, such as anthropic/claude-opus-4-5-20251101. Also search env files, YAML, TOML, and JSON. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers the other SDK argument names.",
          "The [scan page](/scan/) builds a search from dataset ids that have a shutdown date and a status other than active. claude-opus-4-5-20251101 is active, so it is not on that list. Search for it yourself. The [GitHub Action](/github-action/) does not fail a not_before date.",
        ],
        codes: [
          {
            caption: "ripgrep",
            code: `rg -n -e 'claude-opus-4-5-20251101' -e 'claude-opus-4-5' -e 'claude-opus-4-5@20251101' -e 'anthropic.claude-opus-4-5-20251101-v1:0' -e 'Claude Opus 4.5'
`,
          },
        ],
        sources: [
          { label: "Claude Opus 4.5", url: CLAUDE_OPUS45 },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Model IDs and versioning", url: CLAUDE_IDS },
        ],
      },
      {
        heading: "What callers see after retirement",
        paragraphs: [
          `Nothing on the deprecations page says claude-opus-4-5-20251101 stops on ${when}. If Anthropic later retires it, the page defines Retired as: "${SONNET_RETIRED}" It also says: "${SONNET_PAST}"`,
          `That page does not print an HTTP status or an error sentence for a retired model. This guide does not invent one. The errors page says HTTP 404 is not_found_error, and the example message is ${OPUS_NOT_FOUND}. [Catch a retired model before your users do](/guides/catch-a-retired-model-before-your-users-do/) records that the deprecations page does not name not_found_error, and does not say every retired id uses that type.`,
          "A 400 from a field claude-opus-5-5 rejects is a different failure. It happens when the new id is already in the request and an old setting is still there. Those sentences are in the next section. [temperature, top_p, and top_k return 400 on API version 2026-10-21](/errors/claude-api-2026-10-21-sampling-params-400/) is the API version rule. It is not this retirement.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Anthropic API errors", url: CLAUDE_ERRORS },
        ],
      },
      {
        heading: "If you call claude-opus-5-5",
        paragraphs: [
          `Use this section only if you choose claude-opus-5-5 because the Opus 4.5 page says to consider it. The deprecations history does not name it as the replacement.${opus55 ? ` The stored row is ${modelLink(opus55)}.` : ""} The migration guide says to change the model id to claude-opus-5-5. claude-opus-5-5 has no date suffix.`,
          `The migration guide says: "${OPUS55_REJECTED}" It says to omit temperature, top_p, and top_k. It prints a 400 for thinking type disabled and for a thinking budget: "${OPUS55_THINKING_DISABLED}" and "${OPUS55_THINKING_ENABLED}" Send no thinking field, or send thinking type adaptive. Set output_config.effort. The same guide says the default effort on claude-opus-5-5 is medium.`,
          `The migration guide says: "${OPUS55_PREFILL}" It also prints: "${OPUS55_TOOL}" Send tool_choice type auto or none. Read content blocks by type, because a response can start with a thinking block. Pass thinking blocks back unchanged in a tool loop.`,
          "The migration guide also says to move off client.beta.messages.create, to remove the effort-2025-11-24, fine-grained-tool-streaming-2025-05-14, and interleaved-thinking-2025-05-14 beta headers, and to move output_format to output_config.format. The full checklist is on that page. The snippet below is the Claude API call. It is not a Bedrock id and not a Copilot name.",
        ],
        codes: [
          {
            caption: "Python Messages API shape from the Opus 5.5 migration guide. Not a stored replacement.",
            code: `import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    output_config={"effort": "medium"},
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sources: [
          { label: "Migrate to Claude Opus 5.5", url: CLAUDE_OPUS_MIGRATION },
          { label: "Claude Opus 5.5", url: CLAUDE_OPUS55 },
          { label: "Claude Opus 4.5", url: CLAUDE_OPUS45 },
        ],
      },
    ],
    related: [
      { href: "/models/anthropic/claude-opus-4-5-20251101/", label: "claude-opus-4-5-20251101" },
      { href: "/providers/anthropic/", label: "Anthropic provider page" },
      { href: opus55 ? `/models/${opus55.provider}/${opus55.slug}/` : "/models/anthropic/claude-opus-5-5/", label: "claude-opus-5-5" },
      { href: copilot ? `/models/${copilot.provider}/${copilot.slug}/` : "/models/github-copilot/claude-opus-4-5/", label: "Copilot Claude Opus 4.5" },
      { href: `/guides/${SONNET45_NOV30_GUIDE_SLUG}/`, label: "Claude Sonnet 4.5 shutdown on November 30, 2026" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/catch-a-retired-model-before-your-users-do/", label: "Catch a retired model before users do" },
      { href: "/guides/silent-failures-after-model-shutdown/", label: "Silent failures after model shutdown" },
      { href: "/errors/claude-api-2026-10-21-sampling-params-400/", label: "temperature, top_p, and top_k on API version 2026-10-21" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Does claude-opus-4-5-20251101 shut down on ${when}?`,
        answer: `No. The deprecations table lists it as Active, Deprecated N/A, tentative retirement not sooner than ${OPUS45_FLOOR_DATE}. That is the earliest possible shutdown. The page says: "${OPUS_ACTIVE}" It also says: "${OPUS_NOTICE}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `Not published. The deprecation history does not name one. ${replacementFaq(rows, catalog)} The Opus 4.5 page says: "${OPUS45_CONSIDER}" The current models list is the models overview. claude-opus-5-5 is on that list, and the deprecations table lists it as Active. It is not stored as the replacement.`,
      },
      {
        question: "What error does a retired call return?",
        answer: `The model is not retired. If it is retired later, the deprecations page says: "${SONNET_RETIRED}" It also says: "${SONNET_PAST}" It does not print an HTTP status or an error sentence. The errors page says HTTP 404 is not_found_error, and the example message is ${OPUS_NOT_FOUND}. The deprecations page does not name not_found_error. This page does not invent a retirement error.`,
      },
      {
        question: "Does Amazon Bedrock or GitHub Copilot use November 24, 2026?",
        answer: "No date is stored for Bedrock id anthropic.claude-opus-4-5-20251101-v1:0. The deprecations page says Bedrock sets its own schedule. Copilot lists Claude Opus 4.5 with retirement date 2026-09-01 and suggested alternative Latest Claude Opus model.",
      },
      {
        question: "Why is there no /shutdowns/anthropic-2026-11-24/ page?",
        answer: `A shutdown batch page needs at least ${SHUTDOWN_BATCH_MIN} model records that share one provider and one exact shutdown date. This date is kind not_before, and it is one Anthropic id. A floor does not get a batch page.`,
      },
    ],
    citations: [
      CLAUDE_DEPRECATIONS,
      CLAUDE_OPUS45,
      CLAUDE_OPUS55,
      CLAUDE_OPUS_MIGRATION,
      CLAUDE_MODELS,
      CLAUDE_IDS,
      CLAUDE_ERRORS,
      COPILOT_MODELS,
      COPILOT_OPUS45_CHANGELOG,
    ],
  };
}

/**
 * Guide pages whose tables are filled from the model records.
 * A guide is omitted when the filter matches no rows.
 */
const OPENAI_WAVE_GUIDE_SLUGS = new Set([
  DECEMBER_1_IMAGE_GUIDE_SLUG,
  DECEMBER_11_GUIDE_SLUG,
  JANUARY_2027_AUDIO_GUIDE_SLUG,
  JANUARY_2027_GPT4_GUIDE_SLUG,
]);

export function datasetShutdownGuides(catalog: ModelRecord[] = readCatalog()): GuidePage[] {
  const pages: GuidePage[] = [];
  const image = rowsFor(isDecember1ImageShutdown, catalog);
  if (image.length) pages.push(december1ImageGuide(image, catalog));
  const december = rowsFor(isDecember11OpenAiShutdown, catalog);
  if (december.length) pages.push(decemberGuide(december, catalog));
  const audio = rowsFor(isJanuary2027AudioShutdown, catalog);
  if (audio.length) pages.push(januaryAudioGuide(audio, catalog));
  const january = rowsFor(isJanuary2027Gpt4Shutdown, catalog);
  if (january.length) pages.push(januaryGuide(january, catalog));
  const minimax = rowsFor(isMinimaxNov18Shutdown, catalog);
  if (minimax.length) pages.push(minimaxGuide(minimax, catalog));
  const bedrock = rowsFor(isBedrockNov13Shutdown, catalog);
  if (bedrock.length) pages.push(bedrockGuide(bedrock, catalog));
  const jamba = rowsFor(isBedrockJambaNov26Shutdown, catalog);
  if (jamba.length) pages.push(jambaNov26Guide(jamba, catalog));
  const azure = rowsFor(isAzureNov19OSeries, catalog);
  if (azure.length) pages.push(azureOSeriesGuide(azure, catalog));
  const azureNovDec = rowsFor(isAzureNovDecRetirement, catalog);
  if (azureNovDec.length) pages.push(azureNovDecGuide(azureNovDec, catalog));
  const copilot = rowsFor(isCopilotNov16Shutdown, catalog);
  if (copilot.length) pages.push(copilotNov16Guide(copilot, catalog));
  const fireworks = rowsFor(isFireworksNov7Shutdown, catalog);
  if (fireworks.length) pages.push(fireworksNov7Guide(fireworks, catalog));
  const nebius = rowsFor(isNebiusNov9Shutdown, catalog);
  if (nebius.length) pages.push(nebiusNov9Guide(nebius, catalog));
  const gemini = rowsFor(isGeminiNov17Shutdown, catalog);
  if (gemini.length) pages.push(geminiNov17Guide(gemini, catalog));
  const vertexNovDec = rowsFor(isVertexNovDecGemini, catalog);
  if (vertexNovDec.length) pages.push(vertexNovDecGuide(vertexNovDec, catalog));
  const openrouterNovDec = rowsFor(isOpenRouterNovDecExpiration, catalog);
  if (openrouterNovDec.length) pages.push(openRouterNovDecGuide(openrouterNovDec, catalog));
  const sonnet45 = rowsFor(isSonnet45Nov30Shutdown, catalog);
  if (sonnet45.length) pages.push(sonnet45Nov30Guide(sonnet45, catalog));
  const opus45 = rowsFor(isOpus45RetirementFloor, catalog);
  if (opus45.length) pages.push(opus45RetirementGuide(opus45, catalog));
  const slugs = new Set(pages.map((page) => page.slug));
  for (const page of pages) {
    page.related = page.related.filter((link) => {
      const slug = link.href.split("/")[2];
      if (!OPENAI_WAVE_GUIDE_SLUGS.has(slug)) return true;
      return slugs.has(slug);
    });
  }
  return pages;
}

function decemberGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(DECEMBER_11_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const via = rows.some((model) => model.shutdown_date_kind === "via_snapshots");
  return {
    slug: DECEMBER_11_GUIDE_SLUG,
    title: `OpenAI models shutting down on ${when} | SunsetDiff`,
    description: `OpenAI model ids in the SunsetDiff dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}, the stored replacement, and what the deprecations page says happens that day.`,
    h1: `OpenAI models shutting down on ${when}`,
    summary: `Every OpenAI id in the dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}, plus the stored replacement.`,
    answer: `The dataset has ${rows.length} OpenAI model ids with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}. OpenAI's deprecations page says: "${ACCESSIBLE}" The replacement column is the official replacement stored on each row.`,
    checked,
    steps: [
      {
        name: "Read the ids",
        text: `The table lists every OpenAI id in the dataset whose shutdown date is ${DECEMBER_11_SHUTDOWN_DATE}. Open the model page on that row before you change a call.`,
      },
      {
        name: "Find them in your code",
        text: "Search the repository for those ids. Also call GET /v1/models and read shutdown_date. A value that lives only in a host dashboard will not show up in git.",
      },
      {
        name: "Test the replacement",
        text: `Call the replacement id from the same row with the prompts you use now. Do that before ${when}. Then change the id your app sends.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every OpenAI model in the dataset with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          via
            ? "Snapshots retire means shutdown_date_kind is via_snapshots. That date is the latest dated snapshot on the deprecations page. The alias id itself is not listed by name."
            : `The newest deprecations source on these rows was checked ${checked}.`,
          `OpenAI's deprecations page says: "${JUNE_11_NOTICE}"`,
        ],
        table: {
          caption: `${rows.length} OpenAI model ids with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the table. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call the replacement id from the table with the same prompts you send today. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2026-12-11/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/`, label: "OpenAI image models shutting down on December 1, 2026" },
      { href: `/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`, label: "OpenAI speech, audio, and realtime shutdowns in January 2027" },
      { href: `/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`, label: "GPT-4.1 and GPT-4o shutdown in January 2027" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which OpenAI model ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${DECEMBER_11_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Is a deprecation date stored?",
        answer: deprecationFaq(rows),
      },
    ],
    citations: [OPENAI_DEPRECATIONS],
  };
}

function januaryGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(JANUARY_2027_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const aliasNotes = rows.flatMap((model) => {
    const view = aliasSnapshotView(model, catalog);
    return view ? [`${model.id}: ${view.label}`] : [];
  });
  return {
    slug: JANUARY_2027_GPT4_GUIDE_SLUG,
    title: `GPT-4.1 and GPT-4o shutdown on ${when} | SunsetDiff`,
    description: `gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, and their dated snapshots in the dataset with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}, plus the stored replacement.`,
    h1: `GPT-4.1 and GPT-4o shutdown on ${when}`,
    summary: `The gpt-4o and gpt-4.1 aliases and dated snapshots whose stored shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}.`,
    answer: `The dataset has ${rows.length} gpt-4o, gpt-4o-mini, gpt-4.1, and gpt-4.1-mini ids, including dated snapshots, with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}. A row that says Snapshots retire is an alias. The deprecations page lists the dated snapshots, and the alias id itself is not listed by name. The replacement column is the official replacement stored on each row. OpenAI's deprecations page says: "${ACCESSIBLE}"`,
    checked,
    steps: [
      {
        name: "Read the ids",
        text: `The table lists gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, and their dated snapshots when the stored shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}. A dated snapshot with a different shutdown date is not in this table.`,
      },
      {
        name: "Find them in your code",
        text: "Search the repository for the alias and for the dated snapshot. Also call GET /v1/models and read shutdown_date.",
      },
      {
        name: "Test the replacement",
        text: `Call the replacement id from the same row with the prompts you use now. Do that before ${when}. Then change the id your app sends.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the gpt-4o, gpt-4o-mini, gpt-4.1, and gpt-4.1-mini ids in the dataset, and the dated snapshots of those ids, whose shutdown date is ${JANUARY_2027_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          "Snapshots retire means shutdown_date_kind is via_snapshots. That date is the latest dated snapshot on the deprecations page. The alias id itself is not listed by name.",
          `OpenAI's deprecations page says: "${OCTOBER_14_NOTICE}"`,
        ],
        table: {
          caption: `${rows.length} gpt-4o and gpt-4.1 ids with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Alias ids when the snapshots shut down",
        paragraphs: [
          ...aliasNotes,
          `OpenAI's deprecations page says: "${FINE_TUNES}"`,
          `The same page says: "${ACCESSIBLE}"`,
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the alias and for each dated snapshot in the table. A short alias can sit in a different file from the dated id. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call the replacement id from the table with the same prompts you send today. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2027-01-14/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/`, label: "OpenAI image models shutting down on December 1, 2026" },
      { href: `/guides/${DECEMBER_11_GUIDE_SLUG}/`, label: "OpenAI shutdowns on December 11, 2026" },
      { href: `/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`, label: "OpenAI speech, audio, and realtime shutdowns in January 2027" },
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Model aliases vs pinned snapshots" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which ids are in the ${when} table?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${JANUARY_2027_SHUTDOWN_DATE}. Alias rows say Snapshots retire ${JANUARY_2027_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does the deprecations page say about the alias ids?",
        answer: aliasNotes.length
          ? `${aliasNotes.join(" ")} The same page says: "${FINE_TUNES}"`
          : `The same page says: "${FINE_TUNES}"`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Is a deprecation date stored?",
        answer: deprecationFaq(rows),
      },
    ],
    citations: [OPENAI_DEPRECATIONS],
  };
}

function december1ImageGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  return {
    slug: DECEMBER_1_IMAGE_GUIDE_SLUG,
    title: `OpenAI image models shutting down on ${when} | SunsetDiff`,
    description: `chatgpt-image-latest, gpt-image-1-mini, gpt-image-1.5, and gpt-image-1.5-2025-12-16 shut down on ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}. OpenAI names gpt-image-2.5-sunburst or gpt-image-2.5-flare.`,
    h1: `OpenAI image models shutting down on ${when}`,
    summary: `The OpenAI image ids in the dataset with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}, and the two replacements the deprecations page names.`,
    answer: `The dataset has ${rows.length} OpenAI image ids with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}: ${idList(rows)}. OpenAI's deprecations page lists those ids for removal on December 1, 2026, and names gpt-image-2.5-sunburst or gpt-image-2.5-flare. It does not prefer one. The same page says: "${ACCESSIBLE}" gpt-image-1 is not in this table. That id shut down on 2026-10-23.`,
    checked,
    steps: [
      {
        name: "Read the four ids",
        text: `The table lists every OpenAI id in the dataset whose shutdown date is ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}. Open the model page on that row before you change a call. gpt-image-1 is a different date.`,
      },
      {
        name: "Find them in your code",
        text: "Search the repository for those ids, including the dated snapshot gpt-image-1.5-2025-12-16. Also call GET /v1/models and read shutdown_date.",
      },
      {
        name: "Pick Sunburst or Flare and send one image",
        text: `The image generation page says: "${IMAGE_CHOICE}" Set that id on the Image API model field, or in the Responses image tool's model field, before ${when}.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every OpenAI model in the dataset with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          `OpenAI's deprecations page says: "${IMAGE_NOTICE}" The December 1 table on that page lists gpt-image-1-mini, then gpt-image-1.5 with snapshot gpt-image-1.5-2025-12-16, then chatgpt-image-latest. Each replacement cell says gpt-image-2.5-sunburst or gpt-image-2.5-flare. The word or means either id. The page does not prefer one.`,
          "gpt-image-1 is on the October 23, 2026 row of the same page, with the same two replacement ids. Its stored shutdown date is 2026-10-23. It is not in the table below.",
        ],
        table: {
          caption: `${rows.length} OpenAI image ids with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages. This guide does not invent an error body.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the table. A short id and its dated snapshot can sit in different files. gpt-image-1 is a different string and a different date. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
          "You can also read one id from the free SunsetDiff lookup file. [gpt-image-1.5](/api/v1/lookup/gpt-image-1.5.json) is one of these rows. The [API page](/api/) lists the other files. No key and no signup. The [alerts page](/alerts/) is the free email form. That page says what the form stores and the one welcome email it can send.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Change the image model id",
        paragraphs: [
          `The image generation page says: "${IMAGE_CHOICE}" And: "${IMAGE_SET_MODEL}"`,
          `The gpt-image-2.5-sunburst model page says to select it directly in the Image API or as the model of the Responses API image generation tool. That same page lists v1/images/generations and v1/images/edits as supported, and lists v1/responses as not supported. Put sunburst or flare in the image tool's model field. Do not set the top-level Responses model to either image id.`,
          `The image generation page says: "${IMAGE_QUALITY}" The sunburst model page says it supports low, medium, high, xhigh, max, and auto. A request that already sends high can keep high. xhigh and max are the settings the earlier models do not have.`,
          `The image generation page says: "${IMAGE_SIZES}" Those size rules are for gpt-image-2.5-sunburst and gpt-image-2.5-flare.`,
          `The same page says: "${IMAGE_USER}"`,
          "The image generation page's Python sample calls client.images.generate with model gpt-image-2.5-sunburst. The page also names gpt-image-2.5-flare for that same field. Send one prompt you use now, to the id you will keep, before the shutdown date.",
        ],
        codes: [
          {
            caption: "Image API call from the image generation page",
            code: `result = client.images.generate(model="gpt-image-2.5-sunburst", prompt=prompt)\n`,
          },
        ],
        sources: [
          { label: "OpenAI image generation", url: OPENAI_IMAGE_GUIDE },
          { label: "gpt-image-2.5-sunburst", url: OPENAI_SUNBURST },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call gpt-image-2.5-sunburst or gpt-image-2.5-flare with a prompt you send today. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "OpenAI image generation", url: OPENAI_IMAGE_GUIDE },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2026-12-01/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${DECEMBER_11_GUIDE_SLUG}/`, label: "OpenAI shutdowns on December 11, 2026" },
      { href: `/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`, label: "OpenAI speech, audio, and realtime shutdowns in January 2027" },
      { href: "/models/openai/gpt-image-2-5-sunburst/", label: "gpt-image-2.5-sunburst" },
      { href: "/models/openai/gpt-image-2-5-flare/", label: "gpt-image-2.5-flare" },
      { href: "/api/", label: "Free lookup API" },
      { href: "/alerts/", label: "Shutdown alerts signup" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which image ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}. gpt-image-1 is not in that list. Its shutdown date is 2026-10-23.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `OpenAI's deprecations page names gpt-image-2.5-sunburst or gpt-image-2.5-flare for each of these ids. It does not prefer one. The image generation page says: "${IMAGE_CHOICE}" ${replacementFaq(rows, catalog)}`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "Do I have to change the endpoint?",
        answer: `The image generation page says: "${IMAGE_SET_MODEL}" The sunburst model page lists v1/images/generations and v1/images/edits as supported, and v1/responses as not supported. Keep a mainline model at the top of a Responses request and put the image id in the tool.`,
      },
      {
        question: "Which quality values are new?",
        answer: `The image generation page says: "${IMAGE_QUALITY}" The same page says: "${IMAGE_SIZES}"`,
      },
    ],
    citations: [OPENAI_DEPRECATIONS, OPENAI_IMAGE_GUIDE, OPENAI_SUNBURST],
  };
}

function januaryAudioGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const speechWhen = longDate(JANUARY_6_TTS_SHUTDOWN_DATE);
  const audioWhen = longDate(JANUARY_20_AUDIO_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const speech = rows.filter((model) => model.shutdown_date === JANUARY_6_TTS_SHUTDOWN_DATE);
  const audio = rows.filter((model) => model.shutdown_date === JANUARY_20_AUDIO_SHUTDOWN_DATE);
  return {
    slug: JANUARY_2027_AUDIO_GUIDE_SLUG,
    title: "OpenAI speech, audio, and realtime shutdowns in January 2027 | SunsetDiff",
    description: `tts-1, tts-1-hd, and gpt-4o-mini-tts shut down on ${JANUARY_6_TTS_SHUTDOWN_DATE}. Audio and realtime ids, plus gpt-4o-mini-transcribe-2025-03-20, shut down on ${JANUARY_20_AUDIO_SHUTDOWN_DATE}.`,
    h1: "OpenAI speech, audio, and realtime shutdowns in January 2027",
    summary: `The dataset rows for the January 6, 2027 speech shutdown and the January 20, 2027 audio and realtime shutdown, with the stored replacements.`,
    answer: `The dataset has ${speech.length} OpenAI ids with shutdown date ${JANUARY_6_TTS_SHUTDOWN_DATE}: ${idList(speech)}. The deprecations page says to migrate those speech models to gpt-realtime-2.1-mini. The text-to-speech page says that id is not a supported model for /v1/audio/speech. The dataset has ${audio.length} OpenAI ids with shutdown date ${JANUARY_20_AUDIO_SHUTDOWN_DATE}: ${idList(audio)}. OpenAI's deprecations page says: "${ACCESSIBLE}"`,
    checked,
    steps: [
      {
        name: "Split the two dates",
        text: `Speech ids in the first table shut down on ${speechWhen}. Audio, realtime, and gpt-4o-mini-transcribe-2025-03-20 shut down on ${audioWhen}. A snapshot with a different stored date is not in these tables.`,
      },
      {
        name: "Find the ids in your code",
        text: "Search for the short id and for each dated snapshot. A speech call, a chat audio call, and a realtime session can live in different files.",
      },
      {
        name: "Change the call, not only the string",
        text: `For tts-1, tts-1-hd, and gpt-4o-mini-tts, the text-to-speech page says to move to gpt-realtime-2.1-mini on the Realtime API. gpt-audio-1.5 stays on Chat Completions. gpt-realtime-2.1 stays on the Realtime API. Do this before the date on that row.`,
      },
    ],
    sections: [
      {
        heading: "Speech models shutting down on January 6, 2027",
        paragraphs: [
          `These rows are the OpenAI ids in the dataset with shutdown date ${JANUARY_6_TTS_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row.`,
          `OpenAI's deprecations page says: "${TTS_NOTICE}" The table lists tts-1, tts-1-hd, and gpt-4o-mini-tts with snapshots gpt-4o-mini-tts-2025-03-20 and gpt-4o-mini-tts-2025-12-15. Every replacement cell on that table is gpt-realtime-2.1-mini.`,
          `The same deprecations page uses January 6, 2027 for a different change: "${FINE_TUNE_JAN6}" That sentence is about new fine-tuning jobs. It is not an extra model id, so it is not a row in this table.`,
        ],
        table: {
          caption: `${speech.length} OpenAI speech ids with shutdown date ${JANUARY_6_TTS_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(speech, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Audio and realtime models shutting down on January 20, 2027",
        paragraphs: [
          `These rows are the OpenAI ids in the dataset with shutdown date ${JANUARY_20_AUDIO_SHUTDOWN_DATE}.`,
          `OpenAI's deprecations page says: "${AUDIO_NOTICE}" That table lists gpt-realtime with snapshot gpt-realtime-2025-08-28, gpt-audio with snapshot gpt-audio-2025-08-28, gpt-4o-audio, gpt-4o-realtime, gpt-realtime-mini with snapshot gpt-realtime-mini-2025-12-15, gpt-audio-mini with snapshot gpt-audio-mini-2025-12-15, gpt-4o-mini-realtime, gpt-4o-mini-audio, and gpt-4o-mini-transcribe-2025-03-20.`,
          "gpt-realtime-mini-2025-10-06 and gpt-audio-mini-2025-10-06 are not in this table. Their stored shutdown date is 2026-07-23. gpt-4o-mini-transcribe and gpt-4o-mini-transcribe-2025-12-15 are not in this table. Their stored shutdown date is 2027-02-26.",
        ],
        table: {
          caption: `${audio.length} OpenAI audio, realtime, and transcription ids with shutdown date ${JANUARY_20_AUDIO_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(audio, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${speechWhen} the speech ids reach the shutdown date stored in the dataset. On ${audioWhen} the audio, realtime, and transcription ids in the second table do. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. This guide does not invent an error body. The text-to-speech page says gpt-realtime-2.1-mini is not a supported model for /v1/audio/speech. It does not print the error sentence for that call.",
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "OpenAI text to speech", url: OPENAI_TTS },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for every id in both tables. A speech helper, a chat completions audio call, and a realtime session often use different files. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
          "You can also read one id from the free SunsetDiff lookup file. [tts-1](/api/v1/lookup/tts-1.json) is a January 6 row. [gpt-4o-realtime](/api/v1/lookup/gpt-4o-realtime.json) is a January 20 row. The [API page](/api/) lists the other files. No key and no signup. The [alerts page](/alerts/) is the free email form. That page says what the form stores and the one welcome email it can send.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Move speech calls off the speech endpoint",
        paragraphs: [
          `The text-to-speech page says: "${TTS_WORKFLOW}" Existing integrations can keep using the Speech API samples on that page until the shutdown. The replacement is not a new model string on POST /v1/audio/speech.`,
          `The gpt-realtime-2.1-mini model page lists v1/realtime as supported. It lists v1/chat/completions, v1/audio/speech, and v1/audio/transcriptions as not supported. The Realtime getting started page shows a RealtimeSession whose model field is gpt-realtime-2.1. For these speech rows, the deprecations page and the text-to-speech page name gpt-realtime-2.1-mini. Use the id from the table.`,
          `The text-to-speech page says: "${TTS_VOICES}" The realtime conversations page says: "${REALTIME_VOICES}" That realtime list does not include fable, nova, or onyx. Those three names are in the speech-endpoint list and in the smaller tts-1 and tts-1-hd set. The realtime conversations page also says: "${REALTIME_VOICE_LOCK}"`,
        ],
        sources: [
          { label: "OpenAI text to speech", url: OPENAI_TTS },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "gpt-realtime-2.1-mini", url: OPENAI_REALTIME_21_MINI },
          { label: "Realtime API", url: OPENAI_REALTIME },
          { label: "Realtime conversations", url: OPENAI_REALTIME_CONVERSATIONS },
        ],
      },
      {
        heading: "Change audio, realtime, and transcription ids",
        paragraphs: [
          "The deprecations page names gpt-audio-1.5 for gpt-4o-audio, gpt-4o-mini-audio, gpt-audio, gpt-audio-2025-08-28, gpt-audio-mini, and gpt-audio-mini-2025-12-15. The gpt-audio-1.5 model page says Chat Completions at v1/chat/completions is supported. It lists v1/realtime and v1/audio/speech as not supported. Keep the chat completions call and change the model id. Do not send gpt-audio-1.5 to the Realtime API.",
          "The deprecations page names gpt-realtime-2.1 for gpt-4o-realtime, gpt-realtime, and gpt-realtime-2025-08-28. It names gpt-realtime-2.1-mini for gpt-4o-mini-realtime, gpt-realtime-mini, and gpt-realtime-mini-2025-12-15. The gpt-realtime-2.1 model page lists v1/realtime as supported, and lists v1/chat/completions and v1/audio/speech as not supported. It says GPT-Realtime-2.1 supports speech-to-speech interactions with configurable reasoning effort. That page does not print a parameter that gpt-realtime must drop.",
          `The deprecations page names gpt-4o-mini-transcribe-2025-12-15 as the replacement for gpt-4o-mini-transcribe-2025-03-20. That replacement snapshot, and the alias gpt-4o-mini-transcribe, shut down on 2027-02-26. The file transcription page says: "${TRANSCRIBE_FEB}" For the models that page recommends after that later date, it says: "${TRANSCRIBE_LANGUAGE}" That languages field is documented for gpt-transcribe. The page does not say the December 15 snapshot rejects language.`,
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "gpt-audio-1.5", url: OPENAI_AUDIO_15 },
          { label: "gpt-realtime-2.1", url: OPENAI_REALTIME_21 },
          { label: "gpt-realtime-2.1-mini", url: OPENAI_REALTIME_21_MINI },
          { label: "OpenAI file transcription", url: OPENAI_TRANSCRIBE },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. For a speech id, test gpt-realtime-2.1-mini on the Realtime API before ${speechWhen}. For an audio or realtime id, test the replacement in the second table before ${audioWhen}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2027-01-06/", label: `OpenAI shutdowns on ${speechWhen}` },
      { href: "/shutdowns/openai-2027-01-20/", label: `OpenAI shutdowns on ${audioWhen}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/`, label: "OpenAI image models shutting down on December 1, 2026" },
      { href: `/guides/${DECEMBER_11_GUIDE_SLUG}/`, label: "OpenAI shutdowns on December 11, 2026" },
      { href: `/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`, label: "GPT-4.1 and GPT-4o shutdown in January 2027" },
      { href: "/models/openai/gpt-realtime-2-1-mini/", label: "gpt-realtime-2.1-mini" },
      { href: "/models/openai/gpt-realtime-2-1/", label: "gpt-realtime-2.1" },
      { href: "/models/openai/gpt-audio-1-5/", label: "gpt-audio-1.5" },
      { href: "/api/", label: "Free lookup API" },
      { href: "/alerts/", label: "Shutdown alerts signup" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which speech ids shut down on ${speechWhen}?`,
        answer: `The dataset lists ${idList(speech)} with shutdown date ${JANUARY_6_TTS_SHUTDOWN_DATE}. The deprecations page says: "${TTS_NOTICE}"`,
      },
      {
        question: "Why is the speech replacement a realtime model?",
        answer: `The deprecations page names gpt-realtime-2.1-mini for tts-1, tts-1-hd, and gpt-4o-mini-tts, including both dated snapshots. The text-to-speech page says: "${TTS_WORKFLOW}" The gpt-realtime-2.1-mini model page lists v1/realtime as supported and v1/audio/speech as not supported.`,
      },
      {
        question: `Which ids shut down on ${audioWhen}?`,
        answer: `The dataset lists ${idList(audio)} with shutdown date ${JANUARY_20_AUDIO_SHUTDOWN_DATE}. gpt-realtime-mini-2025-10-06 and gpt-audio-mini-2025-10-06 use 2026-07-23. gpt-4o-mini-transcribe and gpt-4o-mini-transcribe-2025-12-15 use 2027-02-26.`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      OPENAI_TTS,
      OPENAI_REALTIME,
      OPENAI_REALTIME_CONVERSATIONS,
      OPENAI_TRANSCRIBE,
      OPENAI_AUDIO_15,
      OPENAI_REALTIME_21,
      OPENAI_REALTIME_21_MINI,
    ],
  };
}

function minimaxGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(MINIMAX_NOV18_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  return {
    slug: MINIMAX_NOV18_GUIDE_SLUG,
    title: `MiniMax M2.5 and M2.7 shutdown on ${when} | SunsetDiff`,
    description: `MiniMax-M2.5, MiniMax-M2.5-highspeed, MiniMax-M2.7, and MiniMax-M2.7-highspeed shut down on ${MINIMAX_NOV18_SHUTDOWN_DATE}. The model list names M3.1 Flash. Pay-as-you-go requests stop. M Plan and Token Plan requests are routed.`,
    h1: `MiniMax M2.5 and M2.7 shutdown on ${when}`,
    summary: `The four MiniMax ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}, the stored replacement, and what the model list says happens to each plan.`,
    answer: `The dataset has ${rows.length} MiniMax ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}: MiniMax-M2.5, MiniMax-M2.5-highspeed, MiniMax-M2.7, and MiniMax-M2.7-highspeed. The model list says new users lose them on October 19, 2026, and the models are retired on ${when}. Pay-as-you-go API requests stop working once they are retired. M Plan and Token Plan requests are routed to M3.1 Flash, and the old names keep working. The stored replacement on each row is MiniMax-M3.1-Flash.`,
    checked,
    steps: [
      {
        name: "Read the four ids",
        text: `The table lists every MiniMax id in the dataset whose shutdown date is ${MINIMAX_NOV18_SHUTDOWN_DATE}. Open the model page before you change a call. MiniMax-M2, MiniMax-M2.1, and the music rows are not in this table. Those rows have no shutdown date.`,
      },
      {
        name: "Sort the plan",
        text: "Pay-as-you-go calls to these ids stop on the retirement date. M Plan and Token Plan calls are routed to M3.1 Flash from October 19, 2026, and the model list says the existing names keep working. Find which plan sends the traffic before you decide whether the old id can stay.",
      },
      {
        name: "Send MiniMax-M3.1-Flash",
        text: `Change the model field to MiniMax-M3.1-Flash and call it with the prompts you use now. Do that before ${when}. The text generation guide says thinking cannot be turned off on that id.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every MiniMax model in the dataset with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          `MiniMax's model list says: "${MINIMAX_NEW_USERS}" The date on that line is October 19, 2026. The next line says: "${MINIMAX_RETIRED}" The date on that line is ${when}.`,
          `The same page's Retired Models table lists these four ids as Retired, and it says: "${MINIMAX_TABLE}" SunsetDiff still stores them as deprecated with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}, because the notice gives that future date for this family. Older ids in that table, including MiniMax-M2 and MiniMax-M2.1, are stored as retired with no shutdown date. The page does not print a date for them.`,
        ],
        table: {
          caption: `${rows.length} MiniMax model ids with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "MiniMax model list", url: MINIMAX_MODELS }],
      },
      {
        heading: "What changes when you switch",
        paragraphs: [
          `For pay-as-you-go, the model list says: "${MINIMAX_STOP}" Change the model field to MiniMax-M3.1-Flash before ${when}. The text generation guide's OpenAI-compatible host is https://api.minimax.io/v1 and the chat path is https://api.minimax.io/v1/chat/completions. Its Anthropic-compatible host is https://api.minimax.io/anthropic.`,
          `For M Plan and Token Plan, the model list says: "${MINIMAX_ROUTE}" It also says: "${MINIMAX_NAMES}" And: "${MINIMAX_ALLOWANCES}" The old id can keep working on those plans because MiniMax routes it. A pay-as-you-go call does not get that route.`,
          "The text generation guide calls MiniMax-M3.1-Flash the latest M-series language model for agentic reasoning, tool use, coding, and long-context tasks, and says it supports tuning thinking depth with effort. The supported-models table lists a context window of 1,000,000 for MiniMax-M3.1-Flash and for MiniMax-M3. The model list does not print a context window or a price for the M2.5 and M2.7 ids. This page does not state what those ids used to accept.",
          `The same guide says thinking cannot be turned off. Sending thinking type disabled, or effort none, returns 400. The page prints: ${MINIMAX_THINKING}. On the OpenAI-compatible API the depth field is reasoning_effort. On the Anthropic-compatible API it is output_config.effort. The values are low, medium, high, xhigh, and max. Omitting effort defaults to max for MiniMax-M3.1-Flash. Thinking content on the OpenAI-compatible API is returned on reasoning_content. The answer is on content.`,
        ],
        codes: [
          {
            caption: "OpenAI-compatible, model field only",
            code: `from openai import OpenAI
client = OpenAI(base_url="https://api.minimax.io/v1")
response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    messages=[{"role": "user", "content": "Hi, how are you?"}],
)
`,
          },
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these four ids reach the shutdown date stored in the dataset. For pay-as-you-go, the model list says API requests to these models will no longer work. It does not print an HTTP status for that moment.`,
          "M Plan and Token Plan requests are a different case. The model list says those requests are routed to M3.1 Flash and the existing model names keep working. A call that still sends MiniMax-M2.5 on those plans is not the same failure as a pay-as-you-go call after the retirement date.",
          `The text generation guide's 400, ${MINIMAX_THINKING}, is what MiniMax-M3.1-Flash returns when thinking is disabled. That is a request-shape failure on the replacement, not the retirement itself.`,
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the four ids in the table. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "MiniMax-M2 and MiniMax-M2.1 are older ids. They are stored as retired with no shutdown date. A search that only looks for M2.5 and M2.7 will miss them, and a search for M2 will also hit M2.5. Read the id on the row.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "MiniMax model list", url: MINIMAX_MODELS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `Call MiniMax-M3.1-Flash with the prompts you send today. Do that before ${when}. If you use M Plan or Token Plan, the model list says the old names keep working because of the route. Still run the new id once, so you see thinking content and the 400 that disabling thinking returns.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. This dataset does not store a price for these MiniMax rows.",
        ],
        sources: [
          { label: "MiniMax model list", url: MINIMAX_MODELS },
          { label: "MiniMax text generation", url: MINIMAX_TEXT },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/minimax-2026-11-18/", label: `MiniMax shutdowns on ${when}` },
      { href: "/providers/minimax/", label: "MiniMax provider page" },
      { href: "/models/minimax/minimax-m3-1-flash/", label: "MiniMax-M3.1-Flash" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
      { href: MINIMAX_TEXT, label: "MiniMax text generation" },
    ],
    faqs: [
      {
        question: `Which MiniMax ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. MiniMax-M2, MiniMax-M2.1, MiniMax-M2.1-highspeed, and M2-her are not in that list. They are stored as retired with no shutdown date.`,
      },
      {
        question: "What does MiniMax say happens on that date?",
        answer: `The model list says: "${MINIMAX_RETIRED}" The date is ${when}. For pay-as-you-go it says: "${MINIMAX_STOP}" It does not print an HTTP status.`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Do M Plan and Token Plan requests stop on that date?",
        answer: `The model list says: "${MINIMAX_ROUTE}" It also says: "${MINIMAX_NAMES}" And: "${MINIMAX_ALLOWANCES}" Pay-as-you-go requests are the ones that stop.`,
      },
      {
        question: "Why does the Retired Models table list these ids before November 18?",
        answer: `The model list's Retired Models table includes the four November 18 ids and says: "${MINIMAX_TABLE}" The retirement notice on the same page gives ${when} for the M2.5 and M2.7 family, and October 19, 2026 as the day new users lose them. SunsetDiff keeps the November 18 ids in the deprecated table until that date. Older ids in the Retired Models table have no printed shutdown date, so they stay in the retired table.`,
      },
      {
        question: "What changes in the request besides the model id?",
        answer: `The text generation guide says MiniMax-M3.1-Flash has a 1,000,000-token context window and tunable thinking depth. Thinking cannot be turned off. The page prints this 400: ${MINIMAX_THINKING}. The OpenAI-compatible field is reasoning_effort. The Anthropic-compatible field is output_config.effort. Allowed values are low, medium, high, xhigh, and max. Omitting effort defaults to max. The model list does not print those fields for the M2.5 and M2.7 ids.`,
      },
    ],
    citations: [MINIMAX_MODELS, MINIMAX_TEXT],
  };
}

function bedrockTable(rows: ModelRecord[], catalog: ModelRecord[]): string[][] {
  return rows.map((model) => [
    modelLink(model),
    deprecationCell(model),
    shutdownCell(model),
    model.region_or_platform_notes ?? "Not published",
    replacementText(model, catalog),
  ]);
}

function bedrockSearch(ids: string[]): string {
  const unique = [...new Set(ids)];
  return `rg -n -w ${unique.map((id) => `-e '${id}'`).join(" ")}\n`;
}

function bedrockGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_NOV13_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const earlier = catalog
    .filter((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-3-haiku-20240307-v1:0" && !isBedrockNov13Shutdown(model))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
    { label: "Regional availability by models", url: BEDROCK_REGIONS },
    { label: "Inference profiles with limited model selection", url: BEDROCK_LIMITED },
  ];
  return {
    slug: BEDROCK_NOV13_GUIDE_SLUG,
    title: `Amazon Bedrock Claude 3 shutdown on ${when} | SunsetDiff`,
    description: `Bedrock Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet reach end of life on ${BEDROCK_NOV13_SHUTDOWN_DATE} in the Regions on the lifecycle page. AWS does not name a replacement model ID.`,
    h1: `Amazon Bedrock Claude 3 shutdown on ${when}`,
    summary: `The Bedrock ids in the dataset with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}, the Regions stored on each row, and the inference profile ids the Claude 3 Haiku model card prints.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}: Claude 3 Haiku, Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, and Claude 3.7 Sonnet. The lifecycle page lists that end of life only for the Regions on each row. Claude 3 Haiku already reached end of life on September 10, 2026 in other Regions, including us-east-1. The replacement field on every row is empty. The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID.`,
    checked,
    steps: [
      {
        name: "Read the ids and the Regions",
        text: `The first table is every Bedrock id in the dataset whose shutdown date is ${BEDROCK_NOV13_SHUTDOWN_DATE}. The Regions column is the note stored from the lifecycle page. A Region that is not on that row keeps its own date. Open the model page before you change a call.`,
      },
      {
        name: "Find hardcoded ids and hidden defaults",
        text: "Search your repository for the bare model ids and for the cross-Region ids below. Also check SDK defaults, framework classifiers, orchestrators, and agent configs. A library can send an id you never wrote down.",
      },
      {
        name: "Swap the id and check the new request",
        text: "Put the id you will call into the modelId field. AWS does not name a replacement on the lifecycle page. On a newer Claude model, check temperature, top_p, and top_k before you assume the old request still works.",
      },
      {
        name: "Test before the date",
        text: `Call that id from the Region you use, with the prompts you send now. Do that before ${when} for a row that is still ahead. Claude 3 Haiku in the September 10, 2026 Regions is already past end of life.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Amazon Bedrock model in the dataset with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. That note can list more than one Legacy date. The replacement column is the official replacement stored on the row. Not published means the field is empty.`,
          `The lifecycle page says: "${BEDROCK_ONLY_DATES}" It also says: "${BEDROCK_REGION_SPLIT}" To check the Region you call, use ListFoundationModels or GetFoundationModel and read modelLifecycle.`,
          `The same page says: "${BEDROCK_MIGRATE}" The recommended replacement on each row is Not published because the stored replacements list is empty. This guide does not fill one in.`,
        ],
        table: {
          caption: `${rows.length} Bedrock model ids with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
          rows: bedrockTable(rows, catalog),
        },
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "Regions that already reached end of life",
        paragraphs: [
          "Claude 3 Haiku uses one model id on two dataset rows. The row above is the November 13, 2026 Regions. The row below is the Regions whose shutdown date is already past.",
          `The Claude 3 Haiku model card says: "${BEDROCK_HAIKU_NOW}" It then names ap-northeast-2, ap-south-1, ap-southeast-1, ca-central-1, eu-central-2, and sa-east-1 as still in Legacy, and says: "${BEDROCK_HAIKU_LATER}"`,
          "The same card's sample code still sends anthropic.claude-3-haiku-20240307-v1:0 with region_name us-east-1. The card says that Region reached end of life on September 10, 2026.",
        ],
        table: earlier.length
          ? {
              caption: "Claude 3 Haiku rows in the dataset whose shutdown date is not November 13, 2026.",
              headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
              rows: bedrockTable(earlier, catalog),
            }
          : undefined,
        sources: [
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Cross-Region inference profile ids",
        paragraphs: [
          `The dataset stores the in-Region model ids. It does not store a us. or eu. prefix. The Claude 3 Haiku model card prints two geo inference ids and says the global inference id is N/A. Geo, US: ${BEDROCK_HAIKU_US}. Geo, EU: ${BEDROCK_HAIKU_EU}. The card's regional table marks Geo end of life on September 10, 2026 for the US and EU source Regions it lists. Those prefixed ids are not a November 13 id.`,
          "The card says this model is offered through inference profiles with limited model selection. The limited model selection page lists ca-central-1, ca-west-1, ap-northeast-2, ap-southeast-1, eu-west-2, eu-central-2, and sa-east-1. Several of those codes are also on the November 13 rows. ap-south-1 is on the November 13 rows and is not in that limited-selection table.",
          `That page says: "${BEDROCK_PROFILE_GAP}"`,
          `The regional availability page uses Claude 3.5 Sonnet v2 as the modelId format example. It prints anthropic.claude-3-5-sonnet-20241022-v2:0, ${BEDROCK_V2_US}, and ${BEDROCK_V2_GLOBAL}. That row shows the shape of an id. It is not a list of profiles that are still offered, and the dataset does not store the prefixed ids. Models at a glance does not link a model card for Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, or Claude 3.7 Sonnet, so this guide does not invent geo or global ids for them.`,
        ],
        table: {
          caption: "Inference ids printed on the Claude 3 Haiku model card.",
          headers: ["ID kind", "ID"],
          rows: [
            ["In-Region model ID", "anthropic.claude-3-haiku-20240307-v1:0"],
            ["Geo inference ID, US", BEDROCK_HAIKU_US],
            ["Geo inference ID, EU", BEDROCK_HAIKU_EU],
            ["Global inference ID", "N/A"],
          ],
        },
        sources: [
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Inference profiles with limited model selection", url: BEDROCK_LIMITED },
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
        ],
      },
      {
        heading: "What the regional availability page prints",
        paragraphs: [
          `The lifecycle page is the source for the dates in the tables above. On the same day, the regional availability page does not print ${BEDROCK_NOV13_SHUTDOWN_DATE} for Claude 3 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Sonnet v2, or Claude 3.7 Sonnet. The cells it fills for those names say EOL: 2026-07-30.`,
          "For Claude 3 Haiku, that page prints EOL: 2026-11-13 in the In-Region column for ap-northeast-2, ap-south-1, and ap-southeast-1. It prints EOL: 2026-09-10 for the Regions that already ended. ca-central-1, eu-central-2, and sa-east-1 are blank on that Haiku table. The lifecycle page and the Haiku model card still name November 13, 2026 for those three Regions.",
          `The lifecycle page says: "${BEDROCK_ONLY_DATES}" Call GetFoundationModel in the Region you use and read modelLifecycle before you treat a blank cell as still active.`,
        ],
        sources: [
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `The lifecycle page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name.`,
          `The Claude 3 Haiku model card does. It says requests in most Regions now fail with ${BEDROCK_EOL_ERROR} The full page is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/). The card's November 13 sentence says requests in the remaining Regions will also fail. It does not repeat the exception name on that sentence.`,
          `GitHub issue [anthropics/claude-code-action#1850](${ISSUE_CLAUDE_CODE_ACTION}) records a Converse call in us-west-2 for anthropic.claude-3-7-sonnet-20250219-v1:0. The line is: ${BEDROCK_EOL_LONGER} The lifecycle page does not list us-west-2 on the Claude 3.7 Sonnet row. It lists ap-south-1 and eu-west-2 with end of life ${BEDROCK_NOV13_SHUTDOWN_DATE}. The regional availability page prints EOL: 2026-07-30 for us-west-2 on that model.`,
          `While a model is Legacy, the lifecycle page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
        ],
        sources: [
          ...sources,
          { label: "claude-code-action issue 1850", url: ISSUE_CLAUDE_CODE_ACTION },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the bare ids in the tables, then for the Haiku geo ids, then for the two Claude 3.5 Sonnet v2 prefixes from the format example. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "Also look where an SDK, a framework classifier, an orchestrator, or an agent config sets a model id when you do not. A default is easy to miss because the string is not in your own config.",
          `GitHub issue [2FastLabs/agent-squad#721](${ISSUE_AGENT_SQUAD}) says the TypeScript and Python defaults are anthropic.claude-3-haiku-20240307-v1:0 for the agents, anthropic.claude-3-sonnet-20240229-v1:0 for the inline agent foundation model, and anthropic.claude-3-5-sonnet-20240620-v1:0 for the classifier. It says: "${AGENT_SQUAD_DEFAULT}"`,
        ],
        codes: [{
          caption: "ripgrep, dataset ids plus the Haiku geo ids and the v2 format examples",
          code: bedrockSearch([
            ...rows.map((model) => model.id),
            ...earlier.map((model) => model.id),
            BEDROCK_HAIKU_US,
            BEDROCK_HAIKU_EU,
            BEDROCK_V2_US,
            BEDROCK_V2_GLOBAL,
          ]),
        }],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
          { label: "agent-squad issue 721", url: ISSUE_AGENT_SQUAD },
        ],
      },
      {
        heading: "Request fields on a newer Claude model",
        paragraphs: [
          "Changing the model id is not the whole request. Two SunsetDiff pages record Anthropic's rules for newer Claude models. They are not the end-of-life exception above.",
          "A non-default temperature, top_p, or top_k on claude-sonnet-5-5 returns HTTP 400. The sentence and the fix are on [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/). Source: Anthropic's Sonnet 5.5 migration guide.",
          `API version 2026-10-21 returns a 400 for temperature, top_p, and top_k on every model, even at the default value. That page is [API version 2026-10-21 sampling parameters](/errors/claude-api-2026-10-21-sampling-params-400/). The versioning page says: "${BEDROCK_VERSIONING}"`,
        ],
        sources: [
          { label: "Claude Sonnet 5.5 migration guide", url: SONNET_MIGRATION },
          { label: "Claude API versioning", url: CLAUDE_VERSIONING },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The lifecycle page tells you to update application code before the EOL date. It does not name the id to send. Pick the id you will call, then send one real prompt from the Region you use before ${when}. Read modelLifecycle in that Region first.`,
          "For Claude 3 Haiku in the September 10, 2026 Regions, that date has passed. The model card says requests there now fail with the exception above. Do not copy the sample on that card that still targets us-east-1.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Bedrock rows do not store a price.",
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/aws-bedrock-2026-11-13/", label: `Bedrock shutdowns on ${when}` },
      { href: "/providers/aws-bedrock/", label: "Amazon Bedrock provider page" },
      { href: "/errors/bedrock-model-version-has-reached-the-end-of-its-life/", label: "This model version has reached the end of its life" },
      { href: "/errors/claude-temperature-is-deprecated-for-this-model/", label: "temperature is deprecated for this model" },
      { href: "/errors/claude-api-2026-10-21-sampling-params-400/", label: "API version 2026-10-21 sampling parameters" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Bedrock model ids reach end of life on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${BEDROCK_NOV13_SHUTDOWN_DATE}. The Regions on each row are the ones the lifecycle page names for that date. Claude 3 Haiku in other Regions is a separate row with shutdown date 2026-09-10.`,
      },
      {
        question: "Does November 13, 2026 apply in every AWS Region?",
        answer: `No. The lifecycle page says: "${BEDROCK_REGION_SPLIT}" Claude 3 Haiku's November 13, 2026 Regions on the stored row are ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1, and ca-central-1. The same id already reached end of life on September 10, 2026 in the Regions on the other Haiku row, including us-east-1.`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `Not published. ${replacementFaq(rows, catalog)} The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID. The limited model selection page says: "${BEDROCK_PROFILE_GAP}"`,
      },
      {
        question: "Which cross-Region inference profile ids does AWS print?",
        answer: `The Claude 3 Haiku model card prints ${BEDROCK_HAIKU_US} and ${BEDROCK_HAIKU_EU}, and it says the global inference id is N/A. The regional availability page's format example prints ${BEDROCK_V2_US} and ${BEDROCK_V2_GLOBAL} next to anthropic.claude-3-5-sonnet-20241022-v2:0. The dataset does not store those prefixed ids. This guide does not invent a us. or global. id for Claude 3 Sonnet or Claude 3.7 Sonnet.`,
      },
      {
        question: "What error does Bedrock return after end of life?",
        answer: `The Claude 3 Haiku model card says requests in most Regions now fail with ${BEDROCK_EOL_ERROR} Issue [anthropics/claude-code-action#1850](${ISSUE_CLAUDE_CODE_ACTION}) records this line for anthropic.claude-3-7-sonnet-20250219-v1:0 on a Converse call in us-west-2: ${BEDROCK_EOL_LONGER} The lifecycle page says requests fail after the EOL date and does not print that exception. The page for the quote is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/).`,
      },
      {
        question: "Why can a default setup fail in us-east-1?",
        answer: `Claude 3 Haiku reached end of life on September 10, 2026 in us-east-1. GitHub issue [2FastLabs/agent-squad#721](${ISSUE_AGENT_SQUAD}) says: "${AGENT_SQUAD_DEFAULT}" The issue says the classifier default is anthropic.claude-3-5-sonnet-20240620-v1:0, and the agent default is anthropic.claude-3-haiku-20240307-v1:0.`,
      },
      {
        question: "What should I check besides the model id?",
        answer: `On claude-sonnet-5-5, a non-default temperature, top_p, or top_k returns HTTP 400. See [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/). API version 2026-10-21 rejects those three fields on every model, even at the default. The versioning page says: "${BEDROCK_VERSIONING}" See [API version 2026-10-21 sampling parameters](/errors/claude-api-2026-10-21-sampling-params-400/).`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_HAIKU_CARD,
      BEDROCK_REGIONS,
      BEDROCK_LIMITED,
      ISSUE_AGENT_SQUAD,
      ISSUE_CLAUDE_CODE_ACTION,
      SONNET_MIGRATION,
      CLAUDE_VERSIONING,
    ],
  };
}

const BEDROCK_POLICY = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html";
const BEDROCK_JAMBA_LARGE = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-ai21-labs-jamba-1-5-large.html";
const BEDROCK_JAMBA_MINI = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-ai21-labs-jamba-1-5-mini.html";
const JAMBA_POLICY_SPLIT = "This page describes the model lifecycle policy for models launched on Amazon Bedrock on or after September 7, 2026. For models launched before this date, see Model lifecycle (Legacy).";
const JAMBA_LEGACY_INTRO = "The following models are in the Legacy state with an announced EOL date. Migrate to an Active model before the EOL date.";
const JAMBA_EXTENDED = "During this public extended access period, active users of a Legacy model can continue to use it until the EOL date (for a minimum of 3 months), but you should expect higher pricing, which will be set by the model provider.";
const JAMBA_EOL_LABEL = "Model EOL date: November 26, 2026";
const JAMBA_LEGACY_LABEL = "Model lifecycle: Legacy";
const JAMBA_REGION_CELL = "Legacy (EOL: 2026-11-26)";

function jambaNov26Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE);
  const large = rows.find((model) => model.id === "ai21.jamba-1-5-large-v1:0");
  const mini = rows.find((model) => model.id === "ai21.jamba-1-5-mini-v1:0");
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Jamba 1.5 Large model card", url: BEDROCK_JAMBA_LARGE },
    { label: "Jamba 1.5 Mini model card", url: BEDROCK_JAMBA_MINI },
    { label: "Regional availability by models", url: BEDROCK_REGIONS },
  ];
  return {
    slug: BEDROCK_JAMBA_NOV26_GUIDE_SLUG,
    title: `Amazon Bedrock AI21 Jamba shutdown on ${when} | SunsetDiff`,
    description: `ai21.jamba-1-5-large-v1:0 and ai21.jamba-1-5-mini-v1:0 reach end of life on ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE} in us-east-1. AWS does not name a replacement model ID.`,
    h1: `Amazon Bedrock AI21 Jamba shutdown on ${when}`,
    summary: `The two Bedrock Jamba 1.5 ids with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}, the us-east-1 row, and the fact that AWS does not name a replacement.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}: ai21.jamba-1-5-large-v1:0 and ai21.jamba-1-5-mini-v1:0. The legacy lifecycle page lists both as Legacy in us-east-1, with legacy date May 26, 2026, EOL date November 26, 2026, and public extended access start date August 26, 2026. It says: "${JAMBA_LEGACY_INTRO}" It does not name a model ID. A shutdown batch page needs at least three model records on one exact date, so there is no /shutdowns/aws-bedrock-2026-11-26/ page.`,
    checked: JAMBA_CHECKED,
    steps: [
      {
        name: "Read the two ids and the Region",
        text: `The table lists ai21.jamba-1-5-large-v1:0 and ai21.jamba-1-5-mini-v1:0. Both stored rows say us-east-1. Open each model page before you change a call. A Region that is not on the lifecycle row is not covered by this date.`,
      },
      {
        name: "Find the ids in your code",
        text: "Search the repository for both model ids. Also check SDK defaults, agent configs, and notebooks. The model cards' sample code still sends these ids with region_name us-east-1.",
      },
      {
        name: "Pick an Active model yourself",
        text: `The lifecycle page says to migrate to an Active model, and to migrate to the latest model, before ${when}. It does not name the id to send. This guide does not fill one in.`,
      },
      {
        name: "Test the call you will keep",
        text: `Call the id you chose from the Region you use, with a prompt you send now, before ${when}. In us-east-1, call GetFoundationModel or ListFoundationModels and read modelLifecycle first.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the Amazon Bedrock models in the dataset with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. The replacement column is the official replacement stored on the row. Not published means the field is empty.`,
          `The current lifecycle policy page says: "${JAMBA_POLICY_SPLIT}" Both model cards list launch date Aug 22, 2024, so the legacy page is the one that applies. That page says: "${BEDROCK_ONLY_DATES}"`,
          `The legacy table says: "${JAMBA_LEGACY_INTRO}" The recommended replacement on each row is Not published because the stored replacements list is empty. This guide does not fill one in.`,
        ],
        table: {
          caption: `${rows.length} Bedrock model ids with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
          rows: bedrockTable(rows, catalog),
        },
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Amazon Bedrock model lifecycle", url: BEDROCK_POLICY },
        ],
      },
      {
        heading: "Dates on the legacy table and the model cards",
        paragraphs: [
          "The legacy lifecycle table lists one row for each id. Both rows use the same dates. Public extended access start date is not a field on the dataset row. It is a column on that table.",
          `Each model card lists "${JAMBA_LEGACY_LABEL}" and "${JAMBA_EOL_LABEL}". Each card also lists "EOL no sooner than: Aug 22, 2025". That older floor is not the announced EOL. The announced EOL on the card and on the legacy table is November 26, 2026.`,
        ],
        table: {
          caption: "Dates printed on the legacy lifecycle table for these two ids.",
          headers: ["Model id", "Regions", "Legacy date", "EOL date", "Public extended access start"],
          rows: [
            [large ? modelLink(large) : "ai21.jamba-1-5-large-v1:0", "us-east-1", "May 26, 2026", BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE, "August 26, 2026"],
            [mini ? modelLink(mini) : "ai21.jamba-1-5-mini-v1:0", "us-east-1", "May 26, 2026", BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE, "August 26, 2026"],
          ],
        },
        sources: sources.filter((source) => source.url !== BEDROCK_REGIONS),
      },
      {
        heading: "Region, geo, and global ids",
        paragraphs: [
          `The lifecycle page says: "${BEDROCK_REGION_SPLIT}" The Regions cell for both Jamba rows is us-east-1. To check the Region you call, use ListFoundationModels or GetFoundationModel and read modelLifecycle.`,
          `The regional availability page prints ${JAMBA_REGION_CELL} in the In-Region column for us-east-1 on Jamba 1.5 Large and on Jamba 1.5 Mini. The Geo and Global cells on those two rows are empty.`,
          "Each model card's programmatic access table lists the Geo inference ID as Not supported and the Global inference ID as Not supported. This guide does not invent a us. or global. id for either model.",
          "Each card's sample code still creates a bedrock-runtime client with region_name us-east-1 and sends that model's id. us-east-1 is the Region on the EOL row.",
        ],
        sources: sources,
      },
      {
        heading: "Public extended access",
        paragraphs: [
          `The legacy page says: "${JAMBA_EXTENDED}" The table lists August 26, 2026 as the public extended access start date for both ids. The page says pricing in that period is set by the model provider. It does not print a price. The model cards point at Amazon Bedrock pricing and do not print a token price either. This guide does not invent one.`,
          `While a model is Legacy, the same page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
        ],
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `The legacy page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name.`,
          "The Jamba 1.5 Large and Jamba 1.5 Mini model cards do not print an exception name or an error sentence for the EOL date. This guide does not invent one. The end-of-life sentence recorded for Claude 3 Haiku is a different model card. It is not quoted here.",
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Jamba 1.5 Large model card", url: BEDROCK_JAMBA_LARGE },
          { label: "Jamba 1.5 Mini model card", url: BEDROCK_JAMBA_MINI },
        ],
      },
      {
        heading: "No shutdown batch page",
        paragraphs: [
          `SunsetDiff publishes a shutdown batch page when at least three model records share one provider and one exact shutdown date. This date has ${rows.length} Bedrock ids, so there is no /shutdowns/aws-bedrock-2026-11-26/ page. [/shutdowns/aws-bedrock-2026-11-13/](/shutdowns/aws-bedrock-2026-11-13/) is the Claude 3 batch. It is not this Jamba date.`,
          `A not-sooner-than date is a floor, so it does not get a batch page either. Anthropic's deprecations table lists claude-opus-4-5-20251101 as Active, with Deprecated N/A and tentative retirement not sooner than November 24, 2026. The deprecation history on that page does not name a replacement, so there is no /shutdowns/anthropic-2026-11-24/ page. The walkthrough is [Claude Opus 4.5 will not shut down before November 24, 2026](/guides/${OPUS45_GUIDE_SLUG}/).`,
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for both ids. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `The lifecycle page tells you to update application code before the EOL date. It does not name the id to send. Pick the Active model you will call, then send one real prompt before ${when}. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These rows do not store a price.`,
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
    ],
    related: [
      { href: large ? `/models/${large.provider}/${large.slug}/` : "/models/aws-bedrock/ai21-jamba-1-5-large-v1-0/", label: "Jamba 1.5 Large" },
      { href: mini ? `/models/${mini.provider}/${mini.slug}/` : "/models/aws-bedrock/ai21-jamba-1-5-mini-v1-0/", label: "Jamba 1.5 Mini" },
      { href: "/providers/aws-bedrock/", label: "Amazon Bedrock provider page" },
      { href: "/shutdowns/aws-bedrock-2026-11-13/", label: "Bedrock Claude shutdowns on November 13, 2026" },
      { href: `/guides/${BEDROCK_NOV13_GUIDE_SLUG}/`, label: "Amazon Bedrock Claude 3 shutdown on November 13, 2026" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Bedrock model ids reach end of life on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}. The legacy lifecycle page lists both in us-east-1.`,
      },
      {
        question: "Does November 26, 2026 apply in every AWS Region?",
        answer: `The legacy page says: "${BEDROCK_REGION_SPLIT}" The Regions cell for both Jamba rows is us-east-1. The regional availability page prints ${JAMBA_REGION_CELL} for that Region. Each model card says the Geo inference ID and the Global inference ID are Not supported.`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `Not published. ${replacementFaq(rows, catalog)} The legacy page says: "${JAMBA_LEGACY_INTRO}" It also says: "${BEDROCK_MIGRATE}" Neither sentence names a model ID.`,
      },
      {
        question: "What error does Bedrock return after this end of life?",
        answer: `The legacy page says requests made to this version will fail. It does not print an exception name or an error sentence. The Jamba 1.5 model cards do not print one either. This page does not invent one.`,
      },
      {
        question: "Why is there no /shutdowns/aws-bedrock-2026-11-26/ page?",
        answer: `A shutdown batch page is published when at least three model records share one provider and one exact shutdown date. These two ids are the only Bedrock rows with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does public extended access mean here?",
        answer: `The legacy table lists August 26, 2026 as the public extended access start date. The page says: "${JAMBA_EXTENDED}" It does not print a price for these two ids.`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_POLICY,
      BEDROCK_JAMBA_LARGE,
      BEDROCK_JAMBA_MINI,
      BEDROCK_REGIONS,
      CLAUDE_DEPRECATIONS,
    ],
  };
}

const AZURE_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const AZURE_RETIREMENTS = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements";
const AZURE_WORKING = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/working-with-models";
const AZURE_VERSIONS = "https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/model-versions";
const AZURE_RETIRED = "Removed from service. All inference requests return 410 Gone.";
const AZURE_AUTO = "For Global Standard, Data Zone Standard, and Standard deployment types, Microsoft manages automatic upgrades when a model version is retired:";
const AZURE_PROVISIONED = "Provisioned deployments are NOT auto-upgraded. Provisioned customers must manually migrate to the replacement model.";
const AZURE_STANDARD_ONLY = "Automatic model updates are only supported for Standard deployment types.";
const AZURE_EXPIRED = "Once the retirement date is reached the model deployment automatically upgrades to the current default version.";
const AZURE_NO_AUTO = "The model deployment never automatically upgrades. Once the retirement date is reached the model deployment stops working.";
const AZURE_NULL = "null is equivalent to OnceCurrentVersionExpired.";
const AZURE_SPECIFIC = "When you select a specific model version for a deployment, this version remains selected until you either choose to manually update yourself, or once you reach the retirement date for the model.";
const AZURE_THEN_DEFAULT = "When the retirement date is reached the model will automatically upgrade to the default version at the time of retirement.";
const AZURE_LIST = "To query the current model deployment settings including the deployment upgrade configuration for a given resource use Deployments List.";
const AZURE_NULL_FIELD = "If the value is null, you won't see a versionUpgradeOption property.";
const AZURE_PORTAL = "Go to your deployment in the Foundry portal, then open the Details tab to see the current model version.";
const AZURE_REST_VERSION = "Query the deployments endpoint for your resource. The response includes the model version for each deployment.";
const AZURE_PREVIEW_END = "all preview deployments are either upgraded or terminated.";
const AZURE_NO_REPLACEMENT = "If no replacement exists, customers get 30 days notice before the model retires and inference returns 410 Gone.";
const AZURE_PREVIEW_NOTE = "Preview models aren't recommended for production workloads.";
const AZURE_FINE_FOOT = "For existing customers only. Otherwise, training retirement occurs at base model retirement.";
const AZURE_REPLACEMENT_COL = "The Replacement column identifies Microsoft's recommended replacement and, where supported, the target for automatic upgrades at retirement.";
const AZURE_MIGRATION = "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-migration";
const AZURE_SHORTLIST = "Is there a named suggested replacement, or do you need to shortlist candidates yourself?";
const AZURE_INVENTORY = "You also need an inventory of the model deployments your workload uses, including their deployment types (Standard, Provisioned, or Batch).";
const AZURE_NOTE_EACH = "For each source model, note its retirement date and suggested replacement from the Model retirement schedule.";
const AZURE_PAYG = "Standard, Global Standard, and Data Zone Standard (pay-as-you-go) deployments are auto-upgraded on a rolling, region-by-region schedule.";
const AZURE_BATCH_PATH = "Batch deployments follow the side-by-side path: deploy the new model, resubmit jobs, retire the old deployment.";
const AZURE_PTU = "Provisioned (PTU) deployments are not auto-upgraded.";

const COPILOT_CHANGELOG = "https://github.blog/changelog/2026-10-15-upcoming-deprecation-of-selected-github-copilot-models-in-mid-november";
const COPILOT_SUPPORTED = "https://docs.github.com/en/copilot/reference/ai-models/supported-models";
const COPILOT_CHAT_MODEL = "https://docs.github.com/en/copilot/how-tos/use-ai-models/change-the-chat-model";
const COPILOT_INLINE = "https://docs.github.com/en/copilot/how-tos/use-ai-models/change-the-completion-model";
const COPILOT_ORG_MODELS = "https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-default-models";
const COPILOT_CLI = "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference";
const COPILOT_AGENTS = "https://docs.github.com/en/copilot/reference/custom-agents-configuration";
const COPILOT_CLI_CONFIG = "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference";
const COPILOT_DEPRECATE = "We will deprecate the following models across all GitHub Copilot experiences (including Copilot Chat, inline edits, ask and agent modes, and code completions) on November 16th, 2026:";
const COPILOT_ANNUAL = "Claude Opus 4.8 will remain available to individual GitHub Copilot subscribers on annual plans so they retain an Opus offering. The deprecation of Claude Opus 4.8 does not apply to these customers.";
const COPILOT_UPDATE = "Please update your workflows and integrations to use the supported models before this date.";
const COPILOT_DEFAULT = "Under default model enablement, the suggested alternatives are automatically enabled for Copilot Enterprise and Copilot Business customers unless an administrator has turned off the global default or explicitly disabled the model.";
const COPILOT_POLICIES = "If you've turned off the global default, you can enable access to the alternative models through their model policies in Copilot settings.";
const COPILOT_SELECTOR = "Once enabled, users will see the model in the Copilot Chat model selector in supported GitHub Copilot experiences.";
const COPILOT_NO_ACTION = "No action is required to remove the models after they have been deprecated.";
const COPILOT_SUBJECT = "Model availability is subject to change. Some models may be replaced or updated over time.";
const COPILOT_CHAT_CHANGE = "Copilot allows you to change the model during a chat and have the alternative model used to generate responses to your prompts.";
const COPILOT_BUSINESS = "If you access Copilot Chat through a Copilot Business subscription, your organization must grant members the ability to switch to a different model.";
const COPILOT_NOT_INLINE = "Changing the model used by Copilot Chat does not affect the model used for Copilot inline suggestions.";
const COPILOT_EXTENSIONS = "If you use Copilot Extensions, they may override the model you select.";
const COPILOT_TEAMS_PREVIEW = "If your enterprise has opted in to the enterprise teams model access preview, your organization will not be able to access model settings.";
const COPILOT_ORG_ENABLED = "The model is available to members of your organization.";
const COPILOT_ORG_DISABLED = "The model is not available to members of your organization.";
const COPILOT_CLI_FLAG = "Use --model=MODEL or the COPILOT_MODEL environment variable to select the AI model.";
const COPILOT_CLI_SLASH = "You can also switch models during an interactive session using the /model slash command.";
const COPILOT_AGENT_MODEL = "Model to use when this custom agent executes. If unset, inherits the default model.";
const COPILOT_ALLOWLIST = "Restrict which built-in models a repository can use with a plain-text allowlist at .github/allowed_models.txt";
const COPILOT_REPO_MODEL = "Pin the default model for this repo.";

function otherChatLatest(catalog: ModelRecord[]): ModelRecord[] {
  return catalog
    .filter((model) => model.provider === "azure-openai" && model.family === "gpt-chat-latest" && model.shutdown_date !== AZURE_CHAT_LATEST_DATE)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function azureOSeriesGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(AZURE_NOV19_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const codex = rowsFor(isAzureCodexMini, catalog);
  const chat = rowsFor(isAzureChatLatestNov17, catalog);
  const laterChat = otherChatLatest(catalog);
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  const findRows = [...rows, ...codex, ...chat];
  return {
    slug: AZURE_NOV19_GUIDE_SLUG,
    title: `Azure OpenAI o-series retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI o1, o1-pro, o3, o3-deep-research, o3-mini, o3-pro, and o4-mini versions retire on ${AZURE_NOV19_SHUTDOWN_DATE}. The schedule names gpt-5.6-sol or gpt-5.6-terra. codex-mini retires November 15. Two gpt-chat-latest versions retire November 17 with no replacement named.`,
    h1: `Azure OpenAI o-series retirement on ${when}`,
    summary: `The Azure OpenAI versions in the dataset with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}, the replacement on the retirement schedule, and what a deployment does that day.`,
    answer: `The dataset has ${rows.length} Azure OpenAI ids with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}: ${idList(rows)}. The retirement schedule lists each as Deprecated, retirement date ${AZURE_NOV19_SHUTDOWN_DATE}. The replacement column is the official replacement stored on each row. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. Standard deployments can auto-upgrade. A deployment set to NoAutoUpgrade stops working. Provisioned deployments are not auto-upgraded.${codex.length ? ` ${idList(codex)} is stored with shutdown date ${codex[0]?.shutdown_date ?? "Not published"}. The schedule does not name a replacement.` : ""}${chat.length ? ` ${idList(chat)} ${chat.length === 1 ? "is" : "are"} stored with shutdown date ${AZURE_CHAT_LATEST_DATE}. The schedule does not name a replacement.` : ""}`,
    checked,
    steps: [
      {
        name: "Read the versions",
        text: `The first table is every Azure OpenAI id in the dataset whose shutdown date is ${AZURE_NOV19_SHUTDOWN_DATE}. The replacement cell is the official replacement stored from the retirement schedule. Not published means that field is empty. Open the model page before you change a deployment.`,
      },
      {
        name: "List deployments on the resource",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name.",
      },
      {
        name: "Read versionUpgradeOption",
        text: "OnceCurrentVersionExpired upgrades the deployment when the retirement date is reached. null means the same thing. NoAutoUpgrade never upgrades, and that deployment stops working. Provisioned deployments are not auto-upgraded.",
      },
      {
        name: "Call the named replacement",
        text: `Where the table names gpt-5.6-sol or gpt-5.6-terra, deploy that version and send one real prompt before ${when}. Where the cell says Not published, Microsoft did not name a replacement on the schedule.`,
      },
    ],
    sections: [
      {
        heading: "Models retiring on November 19",
        paragraphs: [
          `These rows are every Azure OpenAI model in the dataset with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The schedule's Lifecycle column says Deprecated for each of them.`,
          `The schedule says: "${AZURE_REPLACEMENT_COL}" The replacement on each row is that column: gpt-5.6-sol or gpt-5.6-terra. This guide does not add a replacement the schedule does not print.`,
        ],
        table: {
          caption: `${rows.length} Azure OpenAI model ids with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "codex-mini on November 15 and gpt-chat-latest on November 17",
        paragraphs: [
          codex.length
            ? `codex-mini version 2025-05-16 is in the dataset with shutdown date ${codex[0]?.shutdown_date ?? "Not published"}. The schedule lists it as Deprecated with retirement date ${AZURE_CODEX_MINI_DATE}. The replacement cell on that row is empty, so the table says Not published.`
            : "The dataset has no codex-mini-2025-05-16 row.",
          chat.length
            ? `These gpt-chat-latest rows are the ones whose stored shutdown date is ${AZURE_CHAT_LATEST_DATE}. The schedule lists both as Preview. The replacement cell is empty. The lifecycle page says: "${AZURE_PREVIEW_NOTE}" It also says ${AZURE_PREVIEW_END} And: "${AZURE_NO_REPLACEMENT}" The schedule does not name a replacement, so this page does not pick the upgrade path or the no-replacement path for you.`
            : `The dataset has no gpt-chat-latest row with shutdown date ${AZURE_CHAT_LATEST_DATE}.`,
          laterChat.length
            ? `Other gpt-chat-latest versions in the dataset have a different shutdown date, or none. The schedule does not name them as the replacement for the ${AZURE_CHAT_LATEST_DATE} rows. ${laterChat.map((model) => `${model.id}: ${model.shutdown_date ?? "Not published"}`).join(". ")}.`
            : "The dataset has no other gpt-chat-latest version rows.",
          `The deployment steps for these rows, plus gpt-chat-latest 2026-05-28, tts 001, tts-hd 001, whisper 001, and gpt-image-1.5 2025-12-16, are on [Azure OpenAI retirements from November 15 to December 16, 2026](/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/).`,
        ],
        table: codex.length || chat.length
          ? {
              caption: "Azure OpenAI rows for codex-mini and for gpt-chat-latest versions retiring on 2026-11-17.",
              headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
              rows: tableRows([...codex, ...chat], catalog),
            }
          : undefined,
        sources,
      },
      {
        heading: "What happens to a deployment that day",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/). The batch of stored rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-2026-11-19/).`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops.`,
        ],
        sources: [
          ...sources,
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
        ],
      },
      {
        heading: "Find deployments that use these versions",
        paragraphs: [
          `Working with models says: "${AZURE_LIST}" ${AZURE_NULL_FIELD} The model versions page says: "${AZURE_PORTAL}" And: "${AZURE_REST_VERSION}"`,
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the tables. o1 version 2024-12-17 is the dataset id o1-2024-12-17.",
          "Also search the repository. A hit is a candidate, not proof a deployment still uses that version. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
        ],
        codes: [
          {
            caption: "Azure PowerShell, list deployments for one account",
            code: `Get-AzCognitiveServicesAccountDeployment -ResourceGroupName {ResourceGroupName} -AccountName {AccountName}\n`,
          },
          {
            caption: "Deployments List",
            code: `GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/{accountName}/deployments?api-version=2023-05-01\n`,
          },
          { caption: "ripgrep", code: searchCode(findRows) },
        ],
        sources: [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Model versions", url: AZURE_VERSIONS },
        ],
      },
      {
        heading: "Fine-tuned o4-mini dates",
        paragraphs: [
          `The base row for o4-mini version 2025-04-16 on the retirement schedule is Deprecated, retirement ${AZURE_NOV19_SHUTDOWN_DATE}, replacement gpt-5.6-terra. That is the shutdown date and replacement stored on the dataset row.`,
          `The schedule's fine-tuned table lists a different pair of dates for that same version: training retirement no earlier than 2027-05-19, deployment retirement 2027-11-19. The lifecycle page's fine-tuned table lists training retirement no earlier than 2027-04-16 and deployment retirement 2027-10-16. Those two Microsoft pages do not print the same fine-tune dates. SunsetDiff keeps both in the note on the model page and does not replace the base shutdown date with either one.`,
          `Both pages say: "${AZURE_FINE_FOOT}" The base model retirement date on the schedule is ${AZURE_NOV19_SHUTDOWN_DATE}.`,
        ],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The schedule's replacement is the target for automatic upgrades where that is supported. Call gpt-5.6-sol or gpt-5.6-terra, the one on the same row, with the prompts you send now. Do that before ${when}. A deployment set to NoAutoUpgrade will not move itself.`,
          "codex-mini and the two November 17 gpt-chat-latest versions have no replacement on the schedule. This guide does not name one.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/azure-openai-2026-11-19/", label: `Azure OpenAI shutdowns on ${when}` },
      { href: `/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/`, label: "Azure OpenAI retirements from November 15 to December 16, 2026" },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${AZURE_NOV19_SHUTDOWN_DATE}. The retirement schedule lists those versions as Deprecated with that retirement date.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(rows, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}"`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL}`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}"`,
      },
      {
        question: "What about codex-mini and gpt-chat-latest?",
        answer: `codex-mini 2025-05-16 has shutdown date ${AZURE_CODEX_MINI_DATE} and no stored replacement. ${idList(chat)} have shutdown date ${AZURE_CHAT_LATEST_DATE} and no stored replacement. The lifecycle page says ${AZURE_PREVIEW_END}`,
      },
      {
        question: "Does the o4-mini fine-tune date replace November 19, 2026?",
        answer: `No. The stored shutdown date is the base row, ${AZURE_NOV19_SHUTDOWN_DATE}, replacement gpt-5.6-terra. The schedule's fine-tune deployment date is 2027-11-19. The lifecycle page's fine-tune deployment date is 2027-10-16. Both pages say: "${AZURE_FINE_FOOT}"`,
      },
    ],
    citations: [AZURE_SCHEDULE, AZURE_RETIREMENTS, AZURE_WORKING, AZURE_VERSIONS],
  };
}

function azureScheduleLifecycle(model: ModelRecord): string {
  const excerpt = model.sources.find((source) => source.url === AZURE_SCHEDULE)?.excerpt ?? "";
  const cell = excerpt.split("|").map((part) => part.trim())[2] ?? "";
  if (cell === "Deprecated" || cell === "Preview" || cell === "GA" || cell === "Legacy" || cell === "Retired") return cell;
  return "Not published";
}

function azureExactCount(catalog: ModelRecord[], date: string): number {
  return catalog.filter((model) => model.provider === "azure-openai" && model.shutdown_date === date && model.shutdown_date_kind === "exact").length;
}

function azureBatchSentence(date: string, count: number): string {
  const path = `/shutdowns/azure-openai-${date}/`;
  const when = longDate(date);
  if (count >= 3) {
    return `${when} has ${count} Azure OpenAI ids with that exact shutdown date, so the batch page is [Azure OpenAI shutdowns on ${when}](${path}).`;
  }
  const noun = count === 1 ? "id" : "ids";
  return `${when} has ${count} Azure OpenAI ${noun} with that exact shutdown date, so there is no ${path} page.`;
}

function azureNovDecGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const dates = ["2026-11-15", "2026-11-17", AZURE_CHAT_DEC8_DATE, AZURE_SPEECH_DATE, AZURE_IMAGE_15_DATE];
  const batchLines = dates.map((date) => azureBatchSentence(date, azureExactCount(catalog, date)));
  const chatPeers = catalog
    .filter((model) => model.provider === "azure-openai" && (model.id === "gpt-chat-latest" || model.family === "gpt-chat-latest") && !AZURE_NOV_DEC_IDS.has(model.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const imagePeers = catalog
    .filter((model) => model.provider === "azure-openai" && model.id.startsWith("gpt-image-") && !AZURE_NOV_DEC_IDS.has(model.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const realtime = catalog.find((model) => model.provider === "azure-openai" && model.id === "gpt-realtime-mini-2025-12-15");
  const peerLine = (models: ModelRecord[]) => models.map((model) => `${model.id}: ${model.shutdown_date ?? "Not published"}`).join(". ");
  const byDate = dates
    .map((date) => {
      const group = ordered.filter((model) => model.shutdown_date === date);
      if (!group.length) return "";
      return `${date}: ${group.map((model) => `${model.id} (${azureScheduleLifecycle(model)})`).join(", ")}`;
    })
    .filter(Boolean)
    .join(". ");
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  return {
    slug: AZURE_NOV_DEC_GUIDE_SLUG,
    title: "Azure OpenAI retirements from November 15 to December 16, 2026 | SunsetDiff",
    description: `Azure OpenAI codex-mini retires on ${AZURE_CODEX_MINI_DATE}. Three gpt-chat-latest versions retire on ${AZURE_CHAT_LATEST_DATE} and ${AZURE_CHAT_DEC8_DATE}. tts, tts-hd, and whisper retire on ${AZURE_SPEECH_DATE}. gpt-image-1.5 retires on ${AZURE_IMAGE_15_DATE}. The schedule names no replacement.`,
    h1: "Azure OpenAI retirements from November 15 to December 16, 2026",
    summary: `${ordered.length} Azure OpenAI versions retiring from ${AZURE_CODEX_MINI_DATE} through ${AZURE_IMAGE_15_DATE}, the empty replacement cells on the schedule, and what a deployment does on each date.`,
    answer: `The dataset has ${ordered.length} Azure OpenAI ids in this window. ${byDate}. The retirement schedule's replacement cell is empty on each of those rows, so the table says Not published. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. Standard deployments can auto-upgrade. These rows do not name a replacement, so this page does not name an upgrade target. A deployment set to NoAutoUpgrade stops working. Provisioned deployments are not auto-upgraded.`,
    checked: AZURE_NOV_DEC_CHECKED,
    steps: [
      {
        name: "Read the date table",
        text: `The table is these ${ordered.length} Azure OpenAI ids. The lifecycle cell is the schedule's Lifecycle column, copied from the source excerpt stored on the row. Not published in the replacement cell means that field is empty. Open the model page before you change a deployment.`,
      },
      {
        name: "List deployments on the resource",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name. codex-mini version 2025-05-16 is the dataset id codex-mini-2025-05-16. tts version 001 is tts-001.",
      },
      {
        name: "Read versionUpgradeOption",
        text: "OnceCurrentVersionExpired upgrades the deployment when the retirement date is reached. null means the same thing. NoAutoUpgrade never upgrades, and that deployment stops working. Provisioned deployments are not auto-upgraded.",
      },
      {
        name: "Shortlist a model yourself",
        text: `The schedule does not name a replacement for any row in the table. Do not wait for an automatic target. Pick a model, deploy it, and send one real request before the shutdown date on that row. The migration page asks: "${AZURE_SHORTLIST}"`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Azure OpenAI rows whose shutdown date is ${AZURE_CODEX_MINI_DATE}, ${AZURE_CHAT_LATEST_DATE}, ${AZURE_CHAT_DEC8_DATE}, ${AZURE_SPEECH_DATE}, or ${AZURE_IMAGE_15_DATE}. The November 19, 2026 o-series rows are a separate guide: [Azure OpenAI o-series retirement on November 19, 2026](/guides/${AZURE_NOV19_GUIDE_SLUG}/). That page also mentions codex-mini and the two November 17 gpt-chat-latest versions.`,
          `The model id links to its SunsetDiff model page. Lifecycle is the schedule's Lifecycle column. Shutdown date and replacement are the fields stored on the row. Not published means the replacement field is empty. These rows do not store a deprecation_date. ${byDate}.`,
          `The schedule says: "${AZURE_REPLACEMENT_COL}" This guide does not add a replacement the schedule does not print.`,
        ],
        table: {
          caption: `${ordered.length} Azure OpenAI model ids retiring from ${AZURE_CODEX_MINI_DATE} through ${AZURE_IMAGE_15_DATE}.`,
          headers: ["Model id", "Lifecycle on the schedule", "Shutdown date", "Recommended replacement"],
          rows: ordered.map((model) => [
            modelLink(model),
            azureScheduleLifecycle(model),
            shutdownCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources,
      },
      {
        heading: "Microsoft names no replacement",
        paragraphs: [
          "The replacement cell on the retirement schedule is empty for every row in the table. Empty means Microsoft did not name a recommended replacement or an automatic-upgrade target on that row.",
          chatPeers.length
            ? `Other gpt-chat-latest rows in the dataset are not the replacement for the versions in the table. The schedule does not name them. ${peerLine(chatPeers)}.`
            : "The dataset has no other gpt-chat-latest row.",
          imagePeers.length
            ? `Other Azure OpenAI image rows in the dataset are not the replacement for gpt-image-1.5 2025-12-16. The schedule does not name them. ${peerLine(imagePeers)}.`
            : "The dataset has no other gpt-image row.",
          "The dataset has no other tts, tts-hd, or whisper version. The schedule does not name a speech or transcription replacement for tts 001, tts-hd 001, or whisper 001. It also does not name a replacement for codex-mini 2025-05-16.",
          `The migration page says: "${AZURE_SHORTLIST}" For these rows, the schedule does not name one, so you shortlist candidates yourself. It also says: "${AZURE_NOTE_EACH}"`,
        ],
        sources: [
          ...sources,
          { label: "Model migration process", url: AZURE_MIGRATION },
        ],
      },
      {
        heading: "What happens to a deployment on the date",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. codex-mini 2025-05-16 is Deprecated on the schedule now, so inference still works until ${AZURE_CODEX_MINI_DATE}. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
          `gpt-chat-latest 2026-05-05, gpt-chat-latest 2026-06-24, gpt-chat-latest 2026-05-28, and tts 001 are Preview on the schedule. The lifecycle page says: "${AZURE_PREVIEW_NOTE}" It also says ${AZURE_PREVIEW_END} And: "${AZURE_NO_REPLACEMENT}" The schedule does not name a replacement, so this page does not pick the upgrade path or the no-replacement path for those preview rows.`,
          `tts-hd 001, whisper 001, and gpt-image-1.5 2025-12-16 are GA on the schedule. The lifecycle page says: "${AZURE_AUTO}" The migration page says: "${AZURE_PAYG}" The replacement column is the target where an automatic upgrade is supported. These GA rows have an empty replacement cell, so this page does not name the model an auto-upgrade would select.`,
          `The lifecycle page says: "${AZURE_PROVISIONED}" The migration page says: "${AZURE_PTU}" And: "${AZURE_BATCH_PATH}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops. That move still needs a default version. The schedule does not name one for these rows.`,
        ],
        sources: [
          ...sources,
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Model migration process", url: AZURE_MIGRATION },
        ],
      },
      {
        heading: "Find deployments that use these versions",
        paragraphs: [
          `The migration page says: "${AZURE_INVENTORY}" Working with models says: "${AZURE_LIST}" ${AZURE_NULL_FIELD} The model versions page says: "${AZURE_PORTAL}" And: "${AZURE_REST_VERSION}"`,
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the table. gpt-chat-latest version 2026-05-28 is the dataset id gpt-chat-latest-2026-05-28. whisper version 001 is whisper-001. gpt-image-1.5 version 2025-12-16 is gpt-image-1.5-2025-12-16.",
          "Also search the repository. A hit is a candidate, not proof a deployment still uses that version. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
        ],
        codes: [
          {
            caption: "Azure PowerShell, list deployments for one account",
            code: `Get-AzCognitiveServicesAccountDeployment -ResourceGroupName {ResourceGroupName} -AccountName {AccountName}\n`,
          },
          {
            caption: "Deployments List",
            code: `GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/{accountName}/deployments?api-version=2023-05-01\n`,
          },
          { caption: "ripgrep", code: searchCode(ordered) },
        ],
        sources: [
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Model versions", url: AZURE_VERSIONS },
          { label: "Model migration process", url: AZURE_MIGRATION },
        ],
      },
      {
        heading: "Move traffic before the date",
        paragraphs: [
          `Create a deployment of a model you have tested, point traffic at it, and confirm one real request before the shutdown date on that row. Do that for each date: ${AZURE_CODEX_MINI_DATE}, ${AZURE_CHAT_LATEST_DATE}, ${AZURE_CHAT_DEC8_DATE}, ${AZURE_SPEECH_DATE}, and ${AZURE_IMAGE_15_DATE}.`,
          "Working with models describes two ways to change a provisioned deployment once you have chosen a target. In-place migration keeps the deployment name and moves traffic. Multi-deployment migration creates a second deployment, shifts traffic, then deletes the old one. Neither section names a target for these rows.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price. The [Azure OpenAI provider page](/providers/azure-openai/) lists the other stored rows.",
        ],
        sources: [
          { label: "Model migration process", url: AZURE_MIGRATION },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
      {
        heading: "Shutdown pages for these dates",
        paragraphs: [
          "SunsetDiff publishes a shutdown batch page when at least three model records share one provider and one exact shutdown date.",
          ...batchLines,
          `The November 19, 2026 o-series batch is a different set of models. It is [Azure OpenAI shutdowns on November 19, 2026](/shutdowns/azure-openai-${AZURE_NOV19_SHUTDOWN_DATE}/).`,
        ],
        sources,
      },
    ],
    related: [
      { href: "/shutdowns/azure-openai-2026-12-15/", label: "Azure OpenAI shutdowns on December 15, 2026" },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: `/guides/${AZURE_NOV19_GUIDE_SLUG}/`, label: "Azure OpenAI o-series retirement on November 19, 2026" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: "Which Azure OpenAI versions retire between November 15 and December 16, 2026?",
        answer: `The dataset lists ${idList(ordered)}. ${byDate}. The November 19 o-series ids are not in this list.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(ordered, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}" The replacement cell is empty on each of these rows.`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `No. The lifecycle page says: "${AZURE_AUTO}" The migration page says: "${AZURE_PAYG}" And: "${AZURE_PTU}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL} These rows have no replacement on the schedule, so this page does not name an upgrade target.`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}" The migration page says: "${AZURE_INVENTORY}"`,
      },
      {
        question: "Why is there no shutdown page for November 15, November 17, December 8, and December 16?",
        answer: `A shutdown batch page is published when at least three model records share one provider and one exact shutdown date. ${batchLines.filter((line) => line.includes("there is no")).join(" ")} December 15, 2026 has three ids, so [/shutdowns/azure-openai-${AZURE_SPEECH_DATE}/](/shutdowns/azure-openai-${AZURE_SPEECH_DATE}/) exists.`,
      },
      {
        question: "Why is gpt-realtime-mini 2025-12-15 not in this table?",
        answer: `Checked on ${AZURE_NOV_DEC_CHECKED}, the retirement schedule prints gpt-realtime-mini version 2025-12-15 twice in the Azure OpenAI table. The first row says GA and retirement 2027-06-15. A later row says GA and retirement 2026-12-15. SunsetDiff keeps the first base-table row when the same model and version is repeated. The stored id is gpt-realtime-mini-2025-12-15 and its shutdown date is ${realtime?.shutdown_date ?? "Not published"}. This guide skips that id.`,
      },
      {
        question: "Does this guide include the November 19 o-series models?",
        answer: `No. o1, o1-pro, o3, o3-deep-research, o3-mini, o3-pro, and o4-mini retire on ${AZURE_NOV19_SHUTDOWN_DATE}. The schedule names gpt-5.6-sol or gpt-5.6-terra for those rows. See [Azure OpenAI o-series retirement on November 19, 2026](/guides/${AZURE_NOV19_GUIDE_SLUG}/).`,
      },
    ],
    citations: [AZURE_SCHEDULE, AZURE_RETIREMENTS, AZURE_WORKING, AZURE_VERSIONS, AZURE_MIGRATION],
  };
}

function copilotNov16Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(COPILOT_NOV16_SHUTDOWN_DATE);
  const checked = "2026-10-31";
  const sources = [
    { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
    { label: "Supported AI models in GitHub Copilot", url: COPILOT_SUPPORTED },
  ];
  return {
    slug: COPILOT_NOV16_GUIDE_SLUG,
    title: `GitHub Copilot model retirements on ${when} | SunsetDiff`,
    description: `GitHub's changelog deprecates Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra in Copilot on ${COPILOT_NOV16_SHUTDOWN_DATE}. Opus alternatives are Claude Opus 5.5. GPT-5.6 Terra lists GPT-6.1 Sol or GPT-6 Luna.`,
    h1: `GitHub Copilot model retirements on ${when}`,
    summary: `The GitHub Copilot models in the dataset with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}, the suggested alternative on the changelog, and where to change the picker and model policy.`,
    answer: `The dataset has ${rows.length} GitHub Copilot models with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}: ${idList(rows)}. GitHub's October 15, 2026 changelog says it will deprecate them across Copilot Chat, inline edits, ask and agent modes, and code completions on November 16th, 2026. Claude Opus 4.8 and Claude Opus 5 list Claude Opus 5.5. GPT-5.6 Terra lists GPT-6.1 Sol or GPT-6 Luna. Claude Opus 4.8 stays available to individual subscribers on annual plans. The supported models table still lists these three names. Its retirement history table does not.`,
    checked,
    steps: [
      {
        name: "Read the three names",
        text: `The table is every GitHub Copilot model in the dataset whose shutdown date is ${COPILOT_NOV16_SHUTDOWN_DATE}. The replacement cell is the suggested alternative stored from the changelog. Open the model page before you change a picker or a config file.`,
      },
      {
        name: "Switch the chat picker",
        text: "In Visual Studio Code, open Copilot Chat and use the model dropdown at the bottom of the chat view. A Copilot Business subscription can switch only if the organization allows it. Changing the chat model does not change the model used for inline suggestions.",
      },
      {
        name: "Check the org model policy",
        text: "Organization owners open Settings, Copilot, Models. Enabled means members can use the model. Disabled means they cannot. If the enterprise turned on the teams preview, the organization page says it cannot open those settings.",
      },
      {
        name: "Update hard-coded names",
        text: "Search workflows, custom agent files, Copilot CLI --model flags, COPILOT_MODEL, .github/copilot/settings.json, and .github/allowed_models.txt for the three names. The changelog says to update workflows and integrations before the date.",
      },
    ],
    sections: [
      {
        heading: "Models retiring",
        paragraphs: [
          `These rows are every GitHub Copilot model in the dataset with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The changelog prints the date in the deprecation date column of its table.`,
          `GitHub's changelog says: "${COPILOT_DEPRECATE}" The suggested alternative for Claude Opus 4.8 and for Claude Opus 5 is Claude Opus 5.5. For GPT-5.6 Terra the cell says GPT-6.1 Sol or GPT-6 Luna. The changelog does not prefer one of those two.`,
          `The same post says: "${COPILOT_ANNUAL}" That sentence names Claude Opus 4.8 only. It does not say the same for Claude Opus 5 or GPT-5.6 Terra.`,
          `The supported models page says: "${COPILOT_SUBJECT}" Its supported models table still lists Claude Opus 4.8, Claude Opus 5, and GPT-5.6 Terra. The retirement history table on that page does not list those three names. The date in this guide is the date on the changelog.`,
        ],
        table: {
          caption: `${rows.length} GitHub Copilot models with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}.`,
          headers: ["Model", "Deprecation date", "Shutdown date", "Suggested alternative"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "What Copilot users see",
        paragraphs: [
          `The changelog says: "${COPILOT_DEPRECATE}" The surfaces it names are Copilot Chat, inline edits, ask and agent modes, and code completions.`,
          `It also says: "${COPILOT_SELECTOR}" And: "${COPILOT_NO_ACTION}"`,
          `The chat model page says: "${COPILOT_CHAT_CHANGE}" And: "${COPILOT_BUSINESS}" And: "${COPILOT_NOT_INLINE}" And: "${COPILOT_EXTENSIONS}"`,
          "In Visual Studio Code, open Copilot Chat from the chat icon in the title bar. At the bottom of the chat view, open the model dropdown and click the model you want. For inline suggestions in Visual Studio Code, open the command palette and run GitHub Copilot: Change Completions Model. The inline page says you can switch when an alternative model is currently available.",
        ],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Changing the AI model for Copilot Chat", url: COPILOT_CHAT_MODEL },
          { label: "Changing the AI model for inline suggestions", url: COPILOT_INLINE },
        ],
      },
      {
        heading: "What org admins change",
        paragraphs: [
          `The changelog says: "${COPILOT_UPDATE}" Then: "${COPILOT_DEFAULT}" Then: "${COPILOT_POLICIES}"`,
          `The organization models page says: "${COPILOT_TEAMS_PREVIEW}" When the organization can open the page, the path is: profile picture, Organizations, the organization, Settings, Copilot, Models. Next to a model, Enabled means: "${COPILOT_ORG_ENABLED}" Disabled means: "${COPILOT_ORG_DISABLED}" The same page says you can set the Default availability for released models policy for models nobody has configured.`,
          "The batch of stored rows is [GitHub Copilot shutdowns on November 16, 2026](/shutdowns/github-copilot-2026-11-16/). The provider page is [GitHub Copilot](/providers/github-copilot/).",
        ],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Managing the availability of models in an organization", url: COPILOT_ORG_MODELS },
        ],
      },
      {
        heading: "Tools with a hard-coded model list",
        paragraphs: [
          `The changelog says: "${COPILOT_UPDATE}" The chat model page says: "${COPILOT_EXTENSIONS}" A tool that still sends one of these three names can keep doing so after the picker shows a different model.`,
          `The custom agents reference says the model property is: "${COPILOT_AGENT_MODEL}" That property is for agent profiles on GitHub.com, in the Copilot CLI, and in supported IDEs.`,
          `The Copilot CLI command reference says: "${COPILOT_CLI_FLAG}" And: "${COPILOT_CLI_SLASH}" Its supported models table lists claude-opus-5.5, gpt-6.1-sol, and gpt-6-luna. It does not list Claude Opus 4.8, Claude Opus 5, or GPT-5.6 Terra.`,
          `The CLI configuration reference says a repository file .github/copilot/settings.json can set model, described as: "${COPILOT_REPO_MODEL}" The same page says: "${COPILOT_ALLOWLIST}" Each line is a model id or a glob. A fallback: line names the model to use when the requested model is not allowed. The allowlist covers built-in models.`,
          "Search the repository for the three names in the table. A hit in a workflow, an agent file, a settings file, or a script is a candidate. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date. The supported models page lists these as display names and does not publish a separate API id.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [
          { label: "GitHub Changelog, October 15, 2026", url: COPILOT_CHANGELOG },
          { label: "Changing the AI model for Copilot Chat", url: COPILOT_CHAT_MODEL },
          { label: "Custom agents configuration", url: COPILOT_AGENTS },
          { label: "GitHub Copilot CLI command reference", url: COPILOT_CLI },
          { label: "GitHub Copilot CLI configuration directory", url: COPILOT_CLI_CONFIG },
          { label: "Supported AI models in GitHub Copilot", url: COPILOT_SUPPORTED },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/github-copilot-2026-11-16/", label: `GitHub Copilot shutdowns on ${when}` },
      { href: "/providers/github-copilot/", label: "GitHub Copilot provider page" },
      { href: "/models/github-copilot/claude-opus-5-5/", label: "Claude Opus 5.5" },
      { href: "/models/github-copilot/gpt-6-1-sol/", label: "GPT-6.1 Sol" },
      { href: "/models/github-copilot/gpt-6-luna/", label: "GPT-6 Luna" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Copilot models retire on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${COPILOT_NOV16_SHUTDOWN_DATE}. The changelog says: "${COPILOT_DEPRECATE}"`,
      },
      {
        question: "What does GitHub suggest instead?",
        answer: `${replacementFaq(rows, catalog)} The changelog writes GPT-6.1 Sol or GPT-6 Luna for GPT-5.6 Terra and does not prefer one. Claude Opus 4.8 and Claude Opus 5 both list Claude Opus 5.5.`,
      },
      {
        question: "Does Claude Opus 4.8 retire for every subscriber?",
        answer: `The changelog says: "${COPILOT_ANNUAL}" That exception names Claude Opus 4.8. The same sentence is not printed for Claude Opus 5 or GPT-5.6 Terra.`,
      },
      {
        question: "Where do I switch the model?",
        answer: `The chat model page says: "${COPILOT_CHAT_CHANGE}" In Visual Studio Code the dropdown is at the bottom of the chat view. The same page says: "${COPILOT_NOT_INLINE}" Inline suggestions in Visual Studio Code use the command GitHub Copilot: Change Completions Model. The changelog says: "${COPILOT_SELECTOR}"`,
      },
      {
        question: "What does an org admin change?",
        answer: `The changelog says: "${COPILOT_DEFAULT}" And: "${COPILOT_POLICIES}" The organization page says Enabled means: "${COPILOT_ORG_ENABLED}" Disabled means: "${COPILOT_ORG_DISABLED}" It also says: "${COPILOT_TEAMS_PREVIEW}"`,
      },
      {
        question: "What if a tool hard-codes the model name?",
        answer: `The changelog says: "${COPILOT_UPDATE}" The chat page says: "${COPILOT_EXTENSIONS}" Custom agents have a model property. The CLI accepts --model and COPILOT_MODEL. A repo can pin model in .github/copilot/settings.json and can list model ids in .github/allowed_models.txt. The CLI command reference does not list these three names in its supported models table.`,
      },
      {
        question: "Does the supported models page list November 16, 2026 for these models?",
        answer: `No. The supported models table still lists the three names, and the retirement history table does not list them. The page says: "${COPILOT_SUBJECT}" The November 16, 2026 date is on the October 15, 2026 changelog.`,
      },
    ],
    citations: [
      COPILOT_CHANGELOG,
      COPILOT_SUPPORTED,
      COPILOT_CHAT_MODEL,
      COPILOT_INLINE,
      COPILOT_ORG_MODELS,
      COPILOT_CLI,
      COPILOT_AGENTS,
      COPILOT_CLI_CONFIG,
    ],
  };
}

const FIREWORKS_CHANGELOG = "https://docs.fireworks.ai/updates/changelog";
const FIREWORKS_US = "https://docs.fireworks.ai/serverless/us-only-serverless";
const FIREWORKS_QUICKSTART = "https://docs.fireworks.ai/getting-started/quickstart";
const FIREWORKS_ONDEMAND = "https://docs.fireworks.ai/getting-started/ondemand-quickstart";
const FIREWORKS_DECOMMISSION =
  "Several Serverless models will be decommissioned on November 7, 2026 to better serve newer, higher-performance replacements. This applies only to serverless inference. Dedicated deployments and Reserved Throughput are unaffected.";
const FIREWORKS_BEFORE =
  "If you use any of the models below on serverless, migrate to a recommended replacement before November 7, 2026. After that date, they will no longer be available via serverless endpoints.";
const FIREWORKS_GLOBAL_GLM = "The global GLM 5.3 Flash endpoint remains available.";
const FIREWORKS_GLOBAL_MINI = "The global MiniMax M3 endpoint remains available.";
const FIREWORKS_UNAFFECTED = "GLM 5.3 and DeepSeek V4.1 Flash are not affected and remain available on serverless.";
const FIREWORKS_US_CALL = "Call https://us.api.fireworks.ai and pass one of the US model IDs from the table above as model.";
const FIREWORKS_US_PRICE = "Beginning September 1, 2026, launched US-only models are priced at 1.5x the base model serverless prices.";
const FIREWORKS_MUSE = "accounts/fireworks/models/muse-spark-open";
const FIREWORKS_US_DEEPSEEK = "accounts/fireworks/routers/deepseek-v4p1-flash-1017-us";
const FIREWORKS_US_GLM = "accounts/fireworks/routers/glm-5p3-flash-us";
const FIREWORKS_MINI = "accounts/fireworks/models/minimax-m3";

const NEBIUS_NOVEMBER = "https://docs.tokenfactory.nebius.com/model-deprecations-november-2026";
const NEBIUS_AUGUST = "https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice";
const NEBIUS_QUICKSTART = "https://docs.tokenfactory.nebius.com/quickstart";
const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1/";
const NEBIUS_REMOVED =
  "These models will be removed from Token Factory Serverless on November 9, 2026. After that date, you will not be able to select them in the Playground or send API requests using their model IDs.";
const NEBIUS_SERVERLESS = "This change only affects Serverless usage.";
const NEBIUS_DEDICATED = "Dedicated Endpoints are unaffected.";
const NEBIUS_NO_ROUTE = "Token Factory does not automatically reroute requests from deprecated models.";
const NEBIUS_CHOOSE = "Choose a replacement based on your workload, then test before migrating traffic.";
const NEBIUS_UPDATE = "Update the model and base_url values in your API requests, then verify the results.";
const NEBIUS_API = "Affected Serverless models will no longer be available via API or Playground.";
const NEBIUS_DEDICATED_NOTE = "Dedicated Endpoints for these models will be unaffected by this change.";

const GEMINI_DEPRECATIONS = "https://ai.google.dev/gemini-api/docs/deprecations";
const GEMINI_MODELS = "https://ai.google.dev/gemini-api/docs/models";
const GEMINI_SPEECH = "https://ai.google.dev/gemini-api/docs/speech-generation";
const GEMINI_LIVE_MODEL = "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live";
const GEMINI_LIVE = "https://ai.google.dev/gemini-api/docs/live";
const GEMINI_VERTEX = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions";
const GEMINI_SHUTDOWN =
  "Once a model is shutdown, it is completely turned off, and the endpoint is no longer available.";
const GEMINI_EARLIEST =
  "The shutdown dates listed in the table indicate the earliest possible dates on which a model might be retired. We will communicate the exact shutdown date to users with advance notice to ensure a smooth transition to a replacement model.";
const GEMINI_PREVIEW = "A preview name can be used in production and is deprecated with at least two weeks of notice.";
const GEMINI_TTS_DIFFERS =
  "The TTS capability differs from speech generation provided through the Live API, which is designed for interactive, unstructured audio, and multimodal inputs and outputs.";
const GEMINI_LITE =
  "Use Gemini 3.8 Flash-Lite TTS (gemini-3.8-flash-lite-tts) as your fast, cost-efficient workhorse replacement for gemini-3.1-flash-tts-preview.";
const GEMINI_SAME_SCHEMA =
  "Both Gemini 3.8 TTS models share the exact same API schema and prompting format, allowing you to switch between them with a single parameter change.";
const GEMINI_VERBATIM = "Gemini 3.8 TTS treats input text strictly as a verbatim transcript.";
const GEMINI_WAV =
  "Unlike gemini-3.1-flash-tts-preview and earlier TTS models (which returned headerless raw PCM audio/l16 by default), Gemini 3.8 TTS returns WAV audio (audio/wav) with a standard RIFF header by default for unary requests.";
const GEMINI_TTS_ONLY = "TTS models accept text-only inputs and produce audio-only outputs.";
const GEMINI_LIVE_BLURB =
  "Gemini 3.8 Live is the default option for most low-latency voice agent experiences and real-time dialogue without reasoning-induced delays.";
const GEMINI_CHECKED = "2026-11-01";

/** Checked against the Vertex model versions page on 2026-11-02. */
export const VERTEX_NOV19_SHUTDOWN_DATE = "2026-11-19";
export const VERTEX_DEC13_SHUTDOWN_DATE = "2026-12-13";
export const VERTEX_VEO_FLOOR_DATE = "2026-11-17";
export const VERTEX_NOV_DEC_GUIDE_SLUG = "vertex-ai-gemini-retirements-november-december-2026";
export const VERTEX_NOV_DEC_CHECKED = "2026-11-02";
const VERTEX_FLASH_ID = "gemini-3.6-flash";
const VERTEX_LIVE_ID = "gemini-live-2.5-flash-native-audio";
const VERTEX_VEO_IDS = ["veo-3.1-fast-generate-001", "veo-3.1-generate-001"] as const;
const VERTEX_FLASH_PAGE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-6-flash";
const VERTEX_FLASH_GUIDE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash";
const VERTEX_LIVE_PAGE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-live-api";
const VERTEX_LIVE_38 = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-live";
const VERTEX_LIVE_MIGRATE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api/migrate-from-gemini-2-5-to-gemini-3-8-live";
const VERTEX_MIGRATE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate";
const VERTEX_EXTEND =
  "While retirement timelines may be extended, they won't be moved to an earlier date than what is listed.";
const VERTEX_SHORT =
  "Short-term availability models remain active until a replacement model is released and a retirement date is announced. When we schedule a model for retirement, we post a fixed date in the following table that gives you at least 45 days to migrate.";
const VERTEX_STILL =
  "Even after a replacement launches, a model remains active until we announce its retirement date.";
const VERTEX_FLASH_BANNER =
  "Gemini 3.6 Flash will be retired on November 19, 2026. Upgrade to Gemini 3.8 Flash to avoid service disruptions.";
const VERTEX_FOOTNOTE =
  "Listed retirement dates refer to retirement of support in Gemini Enterprise Agent Platform. Models may remain accessible through the Gemini API after these dates have passed.";
const VERTEX_MINIMAL =
  'thinking_level="MINIMAL" is not available for 3.8 Flash. Explicitly setting thinking_level to MINIMAL will return an API validation error. Valid configurations are LOW, MEDIUM (default), and HIGH.';
const VERTEX_IGNORED = "These parameters are ignored by the backend.";
const VERTEX_THROW =
  "Passing frequency_penalty, presence_penalty or candidate_count will throw an active API error.";
const VERTEX_REMOVE_LIST =
  "Remove the following unsupported parameters: frequency_penalty, presence_penalty, candidate_count, temperature, top_p, and top_k.";
const VERTEX_MODEL_STRING = "Change model string in your API calls to gemini-3.8-flash.";
const VERTEX_BUDGET =
  "Replace integer thinking_budget configurations with the string enum thinking_level";
const VERTEX_PREFILL = "Prefilled model turns are unsupported and must be removed when upgrading.";
const VERTEX_HISTORY = 'History payloads cannot end with a "model" role turn.';
const VERTEX_AFFECTIVE = "Always enabled by default.";
const VERTEX_CONTEXT =
  "In Gemini 3.8 Live, call send_context_update in the Google Gen AI SDK, or send a context_update message over WebSockets, instead.";
const VERTEX_HISTORY_SEED =
  "In Gemini 3.8 Live, if you want to use the send_client_content method to set up history seeding, in the HistoryConfig section of the setup message, set initial_history_in_client_content=True.";
const VERTEX_INTERRUPT =
  "When the user is speaking, the scheduling=interrupt downgrades to scheduling=when_idle to provide a smoother user experience.";

function fireworksNov7Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(FIREWORKS_NOV7_SHUTDOWN_DATE);
  const us = rows.find((model) => model.id === FIREWORKS_US_GLM);
  const usReplacement = us ? publishedReplacementIds(us)[0] : undefined;
  const mini = catalog.find((model) => model.provider === "fireworks" && model.id === FIREWORKS_MINI);
  const sources = [
    { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
    { label: "Fireworks US-only serverless", url: FIREWORKS_US },
  ];
  return {
    slug: FIREWORKS_NOV7_GUIDE_SLUG,
    title: `Fireworks model shutdowns on ${when} | SunsetDiff`,
    description: `Fireworks serverless ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. GPT OSS 120B and the two Nemotron rows have no serverless replacement id. The US GLM 5.3 Flash row names ${FIREWORKS_US_DEEPSEEK}.`,
    h1: `Fireworks model shutdowns on ${when}`,
    summary: `The Fireworks ids in the dataset with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}, and what the changelog prints for each one.`,
    answer: `The dataset has ${rows.length} Fireworks ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}: ${idList(rows)}. The changelog says these serverless models are decommissioned on ${when}, and that dedicated deployments and Reserved Throughput are unaffected. GPT OSS 120B and the two Nemotron rows have an empty replacement field. The changelog says to move those to a dedicated deployment and does not print a serverless model id. ${FIREWORKS_US_GLM} stores ${usReplacement ?? "no replacement"}. The same changelog section also names Inkling and MiniMax M3 on the US endpoint. Those names are not in the table.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the four ids",
        text: `The table is every Fireworks id in the dataset whose shutdown date is ${FIREWORKS_NOV7_SHUTDOWN_DATE}. Not published means the stored replacement list is empty. Open the model page before you change a call.`,
      },
      {
        name: "Separate serverless from dedicated",
        text: "The changelog says this date applies only to serverless inference. A dedicated deployment or Reserved Throughput of the same model stays up. The three rows with an empty replacement say to move serverless traffic onto a dedicated deployment. They do not name a new model id.",
      },
      {
        name: "Change the US GLM id",
        text: usReplacement
          ? `Calls to ${FIREWORKS_US_GLM} on https://us.api.fireworks.ai use ${usReplacement} in the model field. The changelog says the global GLM 5.3 Flash endpoint remains available.`
          : "The US GLM row has no stored replacement.",
      },
      {
        name: "Test before the date",
        text: `Send one real prompt to the id you will call. Do that before ${when}. A dedicated deployment is a different setup from a serverless model string.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Fireworks model in the dataset with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The changelog says: "${FIREWORKS_DECOMMISSION}" It also says: "${FIREWORKS_BEFORE}"`,
          "GPT OSS 120B says move to a dedicated deployment of GPT OSS 120B. Each Nemotron row says move to a dedicated deployment of Nemotron Super VL. Those sentences do not print a serverless model id, so the replacement cell is Not published. This guide does not fill one in.",
          usReplacement
            ? `${FIREWORKS_US_GLM} is the US endpoint id on the US-only serverless page. The stored replacement is ${usReplacement}. The changelog says: "${FIREWORKS_GLOBAL_GLM}" It also says: "${FIREWORKS_UNAFFECTED}"`
            : "The dataset has no US GLM row in this shutdown.",
        ],
        table: {
          caption: `${rows.length} Fireworks model ids with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources,
      },
      {
        heading: "Names in the same section that are not stored",
        paragraphs: [
          "The changelog heading also names Inkling and the US endpoint for MiniMax M3. SunsetDiff stores a row when a deprecation links a model page, or when the US-only page prints the model id. A display name with no model id is not stored.",
          `Inkling has no model link and no model id on that page. The changelog says to migrate to Muse Spark Open (US endpoint, 50% US regional premium waived). The new-models list on the same entry prints ${FIREWORKS_MUSE}. This guide does not invent an Inkling id.`,
          mini
            ? `MiniMax M3 (US endpoint only) links the global model page. The changelog says to migrate to DeepSeek V4.1 Flash 1017 (US endpoint), and: "${FIREWORKS_GLOBAL_MINI}" The US-only page does not print a MiniMax M3 US model id. The stored global row is ${FIREWORKS_MINI}, status ${mini.status}, shutdown date ${mini.shutdown_date ?? "Not published"}. The US id the changelog does print for that migration is ${FIREWORKS_US_DEEPSEEK}.`
            : "The dataset has no global MiniMax M3 row.",
        ],
        sources: [{ label: "Fireworks changelog", url: FIREWORKS_CHANGELOG }, { label: "Fireworks US-only serverless", url: FIREWORKS_US }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} the four ids reach the shutdown date stored in the dataset. The changelog says that after that date they will no longer be available via serverless endpoints. It does not print an HTTP status.`,
          `The same entry says: "${FIREWORKS_DECOMMISSION}" A dedicated deployment that is already running is the case the changelog says is unaffected. A serverless call is the case that stops.`,
          usReplacement
            ? `The US page says: "${FIREWORKS_US_CALL}" The curl on that page posts to https://us.api.fireworks.ai/inference/v1/chat/completions. The quickstart's OpenAI-compatible host for a global id is https://api.fireworks.ai/inference/v1. ${FIREWORKS_US_GLM} is a US id. Send it to the US host.`
            : "The US page is the source for US model ids.",
        ],
        sources: [
          { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
          { label: "Fireworks US-only serverless", url: FIREWORKS_US },
          { label: "Fireworks quickstart", url: FIREWORKS_QUICKSTART },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the four ids in the table. Also search for Inkling and for Muse Spark Open if a config uses the display name. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "A US call and a global call can use different hosts. The US page's host is https://us.api.fireworks.ai. The quickstart's host is https://api.fireworks.ai.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          usReplacement
            ? `For the US GLM row, call ${usReplacement} on the US host with the prompts you send now. Do that before ${when}. The US page says: "${FIREWORKS_US_PRICE}" Both ${FIREWORKS_US_GLM} and ${usReplacement} are in that page's model table. The changelog says the global GLM 5.3 Flash endpoint remains available, so a global call is a different endpoint.`
            : `The US GLM row has no stored replacement to call.`,
          "For GPT OSS 120B and the two Nemotron rows, the changelog does not name a serverless model id. It points serverless users at a dedicated deployment and links the on-demand deployment quickstart. This guide does not invent the id to send.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Fireworks rows do not store a price.",
        ],
        codes: usReplacement
          ? [{
              caption: "OpenAI-compatible client, US host, model field only",
              code: `from openai import OpenAI
client = OpenAI(base_url="https://us.api.fireworks.ai/inference/v1")
response = client.chat.completions.create(
    model="${usReplacement}",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
            }]
          : undefined,
        sources: [
          { label: "Fireworks changelog", url: FIREWORKS_CHANGELOG },
          { label: "Fireworks US-only serverless", url: FIREWORKS_US },
          { label: "On-demand deployment quickstart", url: FIREWORKS_ONDEMAND },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/fireworks-2026-11-07/", label: `Fireworks shutdowns on ${when}` },
      { href: "/providers/fireworks/", label: "Fireworks provider page" },
      ...(usReplacement
        ? [{ href: "/models/fireworks/accounts-fireworks-routers-deepseek-v4p1-flash-1017-us/", label: FIREWORKS_US_DEEPSEEK }]
        : []),
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Fireworks ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${FIREWORKS_NOV7_SHUTDOWN_DATE}. The changelog says: "${FIREWORKS_BEFORE}"`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(rows, catalog)} The changelog tells serverless users of GPT OSS 120B and the two Nemotron models to move to a dedicated deployment. It does not print a serverless model id for those three. ${FIREWORKS_US_GLM} stores ${usReplacement ?? "no replacement"}.`,
      },
      {
        question: "Do dedicated deployments stop on that date?",
        answer: `The changelog says: "${FIREWORKS_DECOMMISSION}" Dedicated deployments and Reserved Throughput stay up. Serverless endpoints stop.`,
      },
      {
        question: "Why are Inkling and MiniMax M3 US missing from the table?",
        answer: `Inkling has no model id on the changelog. The page says to migrate it to Muse Spark Open and prints ${FIREWORKS_MUSE}. MiniMax M3 (US endpoint only) links the global model. The US-only page does not print a MiniMax M3 US id. The changelog says: "${FIREWORKS_GLOBAL_MINI}" The US id it does print for that migration is ${FIREWORKS_US_DEEPSEEK}.`,
      },
      {
        question: "Which host does the US GLM id use?",
        answer: `The US page says: "${FIREWORKS_US_CALL}" Its curl posts to https://us.api.fireworks.ai/inference/v1/chat/completions. The quickstart host https://api.fireworks.ai/inference/v1 is the global host.`,
      },
    ],
    citations: [FIREWORKS_CHANGELOG, FIREWORKS_US, FIREWORKS_QUICKSTART, FIREWORKS_ONDEMAND],
  };
}

function nebiusAugustChain(rows: ModelRecord[], catalog: ModelRecord[]): ModelRecord[] {
  const retiring = new Set(rows.map((model) => model.id));
  return catalog
    .filter((model) => model.provider === "nebius"
      && model.shutdown_date === NEBIUS_AUGUST_SHUTDOWN_DATE
      && model.shutdown_date_kind === "exact"
      && publishedReplacementIds(model).some((id) => retiring.has(id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function nebiusChainTable(august: ModelRecord[], november: ModelRecord[], catalog: ModelRecord[]): string[][] {
  const byId = new Map(november.map((model) => [model.id, model]));
  return august.map((model) => {
    const nextId = publishedReplacementIds(model).find((id) => byId.has(id));
    const next = nextId ? byId.get(nextId) : undefined;
    return [
      modelLink(model),
      shutdownCell(model),
      next ? modelLink(next) : (nextId ?? "Not published"),
      next ? replacementText(next, catalog) : "Not published",
    ];
  });
}

function nebiusNov9Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(NEBIUS_NOV9_SHUTDOWN_DATE);
  const august = nebiusAugustChain(rows, catalog);
  const sample = rows.find((model) => model.id === "zai-org/GLM-5.1") ?? rows[0];
  const sampleReplacement = sample ? publishedReplacementIds(sample)[0] : undefined;
  const sources = [
    { label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER },
    { label: "Nebius quickstart", url: NEBIUS_QUICKSTART },
  ];
  return {
    slug: NEBIUS_NOV9_GUIDE_SLUG,
    title: `Nebius model shutdowns on ${when} | SunsetDiff`,
    description: `Token Factory Serverless removes ${rows.length} model ids on ${NEBIUS_NOV9_SHUTDOWN_DATE}. Each row has one recommended replacement. Dedicated Endpoints are unaffected, and requests are not rerouted.`,
    h1: `Nebius model shutdowns on ${when}`,
    summary: `The Nebius Token Factory ids in the dataset with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}, the recommended replacement on the November notice, and the August ids whose replacement is now in that list.`,
    answer: `The dataset has ${rows.length} Nebius ids with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The November notice removes them from Token Factory Serverless on that date. Each row stores one recommended replacement from that table. The notice says Dedicated Endpoints are unaffected, and Token Factory does not automatically reroute requests. ${august.length} August 31, 2026 ids store a replacement that is itself in this November list.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the ids and the replacement",
        text: `The first table is every Nebius id in the dataset whose shutdown date is ${NEBIUS_NOV9_SHUTDOWN_DATE}. The replacement cell is the recommended replacement stored from the November notice. Open the model page before you change a call.`,
      },
      {
        name: "Check Dedicated Endpoints separately",
        text: "The notice says this change only affects Serverless usage. A Dedicated Endpoint for the same model is unaffected. Token Factory does not automatically reroute a Serverless request, so the old id will not start calling the new one for you.",
      },
      {
        name: "Update model and base_url",
        text: `The notice says to update the model and base_url values, then verify the results. The quickstart uses base_url ${NEBIUS_BASE}. Put the replacement id from the same row in the model field.`,
      },
      {
        name: "Test before the date",
        text: `Call the replacement with the prompts you send now. Do that before ${when}. If an August migration already moved you onto one of these November ids, follow that row's replacement one more step.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Nebius model in the dataset with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The November notice says: "${NEBIUS_REMOVED}" It also says: "${NEBIUS_API}" And: "${NEBIUS_DEDICATED_NOTE}"`,
          `The same page says: "${NEBIUS_SERVERLESS}" "${NEBIUS_DEDICATED}" "${NEBIUS_NO_ROUTE}" "${NEBIUS_CHOOSE}" The replacement column is the Recommended Replacement cell on that page.`,
        ],
        table: {
          caption: `${rows.length} Nebius model ids with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER }],
      },
      {
        heading: "August replacements that shut down in November",
        paragraphs: [
          august.length
            ? `These August 31, 2026 rows store a replacement that is also in the November table. The August notice is still the source for the August replacement. The November notice is the source for the next id. SunsetDiff does not replace the August row's stored replacement with the November one.`
            : "No August row stores a replacement that is in the November table.",
          "An app that already moved from the August id to that replacement still has to change the model field again. The November notice says requests are not rerouted.",
        ],
        table: august.length
          ? {
              caption: "August 31, 2026 Nebius rows whose stored replacement shuts down on 2026-11-09.",
              headers: ["August model id", "August shutdown date", "Stored replacement", "November recommended replacement"],
              rows: nebiusChainTable(august, rows, catalog),
            }
          : undefined,
        sources: [
          { label: "Nebius August 2026 deprecations", url: NEBIUS_AUGUST },
          { label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The notice says you will not be able to select them in the Playground or send API requests using their model IDs. It does not print an HTTP status.`,
          `It also says: "${NEBIUS_NO_ROUTE}" A request that still sends the old id is not forwarded to the replacement. A Dedicated Endpoint is a different case. The notice says: "${NEBIUS_DEDICATED}"`,
        ],
        sources: [{ label: "Nebius November 2026 deprecations", url: NEBIUS_NOVEMBER }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the November table, then for any August id in the second table. A short search for DeepSeek or Qwen will hit ids that are not in this shutdown. Read the full id. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `The notice says: "${NEBIUS_UPDATE}" The quickstart sets base_url to ${NEBIUS_BASE} and posts to https://api.tokenfactory.nebius.com/v1/chat/completions. Its sample model is deepseek-ai/DeepSeek-R1-0528. That id is not in this table.`,
        ],
        codes: [{ caption: "ripgrep", code: searchCode([...rows, ...august]) }],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The notice says: "${NEBIUS_CHOOSE}" Then: "${NEBIUS_UPDATE}" Call the replacement id from the same row with the prompts you send now. Do that before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Nebius rows do not store a price.",
        ],
        codes: sampleReplacement
          ? [{
              caption: "OpenAI-compatible client, model field only",
              code: `from openai import OpenAI
client = OpenAI(base_url="${NEBIUS_BASE}")
response = client.chat.completions.create(
    model="${sampleReplacement}",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
            }]
          : undefined,
        sources,
      },
    ],
    related: [
      { href: "/shutdowns/nebius-2026-11-09/", label: `Nebius shutdowns on ${when}` },
      { href: "/providers/nebius/", label: "Nebius provider page" },
      { href: "/migrate/nebius__zai-org-glm-5-1__to__nebius__zai-org-glm-5-2/", label: "GLM-5.1 to GLM-5.2 migration diff" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Nebius ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${NEBIUS_NOV9_SHUTDOWN_DATE}. The notice says: "${NEBIUS_REMOVED}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Will Token Factory reroute the old id?",
        answer: `The notice says: "${NEBIUS_NO_ROUTE}" You change the model field. It also says: "${NEBIUS_SERVERLESS}" And: "${NEBIUS_DEDICATED}"`,
      },
      {
        question: "What does the API host look like?",
        answer: `The quickstart sets base_url to ${NEBIUS_BASE}. The notice says: "${NEBIUS_UPDATE}"`,
      },
      {
        question: "What if I already migrated in August?",
        answer: august.length
          ? `These August ids store a replacement that shuts down on ${NEBIUS_NOV9_SHUTDOWN_DATE}: ${august.map((model) => `${model.id} to ${publishedReplacementIds(model).join(", ")}`).join(". ")}. The November table names the next replacement. The August row keeps the August replacement.`
          : "No August row points at a November id.",
      },
    ],
    citations: [NEBIUS_NOVEMBER, NEBIUS_AUGUST, NEBIUS_QUICKSTART],
  };
}

function geminiTtsRows(rows: ModelRecord[]): ModelRecord[] {
  return rows.filter((model) => model.id.includes("tts"));
}

function vertexNov17(catalog: ModelRecord[]): ModelRecord[] {
  return catalog
    .filter((model) => model.provider === "google-vertex" && model.shutdown_date === GEMINI_NOV17_SHUTDOWN_DATE)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function geminiNov17Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(GEMINI_NOV17_SHUTDOWN_DATE);
  const tts = geminiTtsRows(rows);
  const live = rows.filter((model) => !model.id.includes("tts"));
  const vertex = vertexNov17(catalog);
  const sources = [
    { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
    { label: "Gemini API models", url: GEMINI_MODELS },
  ];
  return {
    slug: GEMINI_NOV17_GUIDE_SLUG,
    title: `Gemini API model shutdowns on ${when} | SunsetDiff`,
    description: `Gemini API preview models with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}: two Live audio ids move to gemini-3.8-live, and three TTS ids list gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts. The table date is the earliest possible retirement.`,
    h1: `Gemini API model shutdowns on ${when}`,
    summary: `The Gemini API ids in the dataset with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}, the recommended replacement on the deprecations page, and what the speech page says changes for TTS.`,
    answer: `The dataset has ${rows.length} Gemini API ids with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}: ${idList(rows)}. The deprecations page lists that day as the shutdown date and says the table date is the earliest possible retirement. The two Live audio ids store gemini-3.8-live. The three TTS ids store gemini-3.8-flash-tts and gemini-3.8-flash-lite-tts. The page writes those two TTS ids with or, and does not prefer one. Once a model is shutdown, the endpoint is no longer available.`,
    checked: GEMINI_CHECKED,
    steps: [
      {
        name: "Read the five ids",
        text: `The table is every Gemini API id in the dataset whose shutdown date is ${GEMINI_NOV17_SHUTDOWN_DATE}. The replacement cell is the recommended replacement stored from the deprecations page. Open the model page before you change a call.`,
      },
      {
        name: "Split Live audio from text-to-speech",
        text: "gemini-3.1-flash-live-preview and gemini-2.5-flash-native-audio-preview-12-2025 are Live audio ids. The other three ids are text-to-speech. The speech page says TTS and the Live API are different. A Live replacement does not take a TTS request.",
      },
      {
        name: "Change the model id and the TTS request",
        text: "For a Live id, the deprecations page names gemini-3.8-live. For a TTS id, it names gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts. The speech page says Gemini 3.8 TTS treats input text as a verbatim transcript and returns WAV on a unary request.",
      },
      {
        name: "Test before the date",
        text: `Call the replacement with one real prompt before ${when}. The deprecations page says it will communicate the exact shutdown date with advance notice. The date in the table is the earliest day it prints.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Google Gemini API model in the dataset with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date. The deprecations page lists each of them under Preview models.`,
          `The deprecations page says: "${GEMINI_SHUTDOWN}" It also says: "${GEMINI_EARLIEST}" SunsetDiff stores the printed day, ${GEMINI_NOV17_SHUTDOWN_DATE}, as the shutdown date. The page does not print a later day.`,
          `The models page says: "${GEMINI_PREVIEW}" That sentence is the notice length for a preview name. It does not replace the day in the table.`,
          vertex.length
            ? `Vertex rows with the same shutdown date are ${vertex.map((model) => `${model.id} (${model.shutdown_date_kind})`).join(", ")}. ${vertex.every((model) => publishedReplacementIds(model).length === 0) ? "The replacement field on those Vertex rows is empty." : "See each Vertex row for its stored replacement."} They are not Gemini API ids, so they are not in the table below.`
            : "The dataset has no Vertex row with this shutdown date.",
        ],
        table: {
          caption: `${rows.length} Gemini API model ids with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [
          ...sources,
          { label: "Vertex model versions", url: GEMINI_VERTEX },
        ],
      },
      {
        heading: "Text-to-speech models",
        paragraphs: [
          tts.length
            ? `The TTS ids in this shutdown are ${idList(tts)}. The deprecations page lists gemini-3.8-flash-tts or gemini-3.8-flash-lite-tts for each of them. It does not prefer one.`
            : "This shutdown has no TTS ids.",
          `The speech generation page says: "${GEMINI_LITE}" That sentence names gemini-3.1-flash-tts-preview. It does not print the same sentence for the two Gemini 2.5 preview TTS ids. The migration heading on that page says it covers gemini-3.1-flash-tts-preview or earlier Gemini TTS models.`,
          `The same page says: "${GEMINI_SAME_SCHEMA}" And: "${GEMINI_TTS_ONLY}" And: "${GEMINI_VERBATIM}" And: "${GEMINI_WAV}" If you need headerless raw PCM, the page says to set response_format.mime_type to audio/l16, audio/mulaw, or audio/alaw.`,
          "The speech page's samples call client.interactions.create and POST https://generativelanguage.googleapis.com/v1beta/interactions. The model field in those samples is gemini-3.8-flash-tts. The page also documents gemini-3.8-flash-lite-tts.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
        ],
      },
      {
        heading: "Live audio models",
        paragraphs: [
          live.length
            ? `The Live audio ids in this shutdown are ${idList(live)}. The deprecations page lists gemini-3.8-live for each of them.`
            : "This shutdown has no Live audio ids.",
          `The speech page says: "${GEMINI_TTS_DIFFERS}" A TTS model id is not the replacement for these Live rows.`,
          `The gemini-3.8-live model page says: "${GEMINI_LIVE_BLURB}" It says the model code is gemini-3.8-live, and it points to the Live API guide for features. This guide does not copy a Live request. The Live API guide is the page for that shape.`,
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
          { label: "gemini-3.8-live model page", url: GEMINI_LIVE_MODEL },
          { label: "Gemini Live API", url: GEMINI_LIVE },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The deprecations page says: "${GEMINI_SHUTDOWN}" It does not print one HTTP status for that moment.`,
          `The same page says: "${GEMINI_EARLIEST}" The day in the table can move if Google sends a later exact date. Until that notice, the stored shutdown date stays ${GEMINI_NOV17_SHUTDOWN_DATE}.`,
          "A 400 from a field the replacement rejects is a different failure. The speech page's WAV and speech_metadata changes are request-shape changes on Gemini 3.8 TTS, not the shutdown itself.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the five ids in the table. A preview suffix is part of the id. gemini-2.5-flash is a different id from gemini-2.5-flash-preview-tts. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "Also search configs that pick a voice model by a short label. The deprecations page uses the full id.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `Call the replacement id from the same row with the prompts you send now. Do that before ${when}. For TTS, the speech page says the two Gemini 3.8 TTS models share one API schema, so you can switch between gemini-3.8-flash-tts and gemini-3.8-flash-lite-tts by changing that one field. Run the one you will keep, and read the audio bytes. A unary response is WAV unless you set another mime type.`,
          "For the Live ids, call gemini-3.8-live from the Live API path you use now. The model page says Live API is supported on that id. This guide does not name a generateContent body for it.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS },
          { label: "Gemini speech generation", url: GEMINI_SPEECH },
          { label: "gemini-3.8-live model page", url: GEMINI_LIVE_MODEL },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/google-gemini-api-2026-11-17/", label: `Gemini API shutdowns on ${when}` },
      { href: `/guides/${VERTEX_NOV_DEC_GUIDE_SLUG}/`, label: "Vertex AI Gemini retirements in November and December 2026" },
      { href: "/providers/google-gemini-api/", label: "Gemini API provider page" },
      { href: "/models/google-gemini-api/gemini-3-8-live/", label: "gemini-3.8-live" },
      { href: "/models/google-gemini-api/gemini-3-8-flash-tts/", label: "gemini-3.8-flash-tts" },
      { href: "/models/google-gemini-api/gemini-3-8-flash-lite-tts/", label: "gemini-3.8-flash-lite-tts" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Gemini API ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The deprecations page says: "${GEMINI_EARLIEST}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `${replacementFaq(rows, catalog)} The deprecations page writes or between the two TTS ids and does not prefer one. The speech page says: "${GEMINI_LITE}"`,
      },
      {
        question: "What does Google say happens at shutdown?",
        answer: `The deprecations page says: "${GEMINI_SHUTDOWN}" It does not print one HTTP status for that moment.`,
      },
      {
        question: "What changes in a TTS request besides the model id?",
        answer: `The speech page says: "${GEMINI_VERBATIM}" And: "${GEMINI_WAV}" It also says: "${GEMINI_TTS_ONLY}" Samples on that page set model to gemini-3.8-flash-tts and POST https://generativelanguage.googleapis.com/v1beta/interactions.`,
      },
      {
        question: "Are the Live ids the same migration as the TTS ids?",
        answer: `No. ${idList(live)} store gemini-3.8-live. The speech page says: "${GEMINI_TTS_DIFFERS}" The gemini-3.8-live model page says: "${GEMINI_LIVE_BLURB}"`,
      },
      {
        question: "Does this page include Vertex models?",
        answer: vertex.length
          ? `This table is the Gemini API list. Vertex stores ${idList(vertex)} with shutdown date ${GEMINI_NOV17_SHUTDOWN_DATE}. The stored kind is ${[...new Set(vertex.map((model) => model.shutdown_date_kind))].join(", ")}. ${vertex.every((model) => !publishedReplacementIds(model).length) ? "Those rows have no stored replacement." : "See the Vertex rows for replacements."} Vertex gemini-3.6-flash and gemini-live-2.5-flash-native-audio use other dates. See [Vertex AI Gemini retirements in November and December 2026](/guides/${VERTEX_NOV_DEC_GUIDE_SLUG}/).`
          : "No Vertex row shares this shutdown date.",
      },
    ],
    citations: [GEMINI_DEPRECATIONS, GEMINI_MODELS, GEMINI_SPEECH, GEMINI_LIVE_MODEL, GEMINI_LIVE, GEMINI_VERTEX],
  };
}

function vertexExact(catalog: ModelRecord[], date: string): ModelRecord[] {
  return catalog
    .filter((model) => model.provider === "google-vertex" && model.shutdown_date === date && model.shutdown_date_kind === "exact")
    .sort((a, b) => a.id.localeCompare(b.id));
}

function vertexBatchSentence(date: string, count: number): string {
  const path = `/shutdowns/${shutdownEventSlug("google-vertex", date)}/`;
  if (count >= SHUTDOWN_BATCH_MIN) {
    return `${date} has ${count} Google Vertex records with one exact shutdown date, so [${path}](${path}) exists.`;
  }
  const noun = count === 1 ? "record" : "records";
  return `${date} has ${count} Google Vertex ${noun} with an exact shutdown date, so there is no ${path} page.`;
}

function vertexDateCell(model: ModelRecord): string {
  if (!model.shutdown_date) return "Not published";
  if (model.shutdown_date_kind === "not_before") return `${model.shutdown_date} or later`;
  return shutdownCell(model);
}

function vertexNovDecGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const nov19 = vertexExact(catalog, VERTEX_NOV19_SHUTDOWN_DATE);
  const dec13 = vertexExact(catalog, VERTEX_DEC13_SHUTDOWN_DATE);
  const oct20 = vertexExact(catalog, "2026-10-20");
  const veo = catalog
    .filter((model) => model.provider === "google-vertex" && (VERTEX_VEO_IDS as readonly string[]).includes(model.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const flash37 = catalog.find((model) => model.provider === "google-vertex" && model.id === "gemini-3.7-flash");
  const apiFlash = catalog.find((model) => model.provider === "google-gemini-api" && model.id === VERTEX_FLASH_ID);
  const sources = [
    { label: "Vertex AI model versions", url: GEMINI_VERTEX },
    { label: "Gemini 3.6 Flash model page", url: VERTEX_FLASH_PAGE },
    { label: "Gemini 2.5 Flash Live API model page", url: VERTEX_LIVE_PAGE },
  ];
  return {
    slug: VERTEX_NOV_DEC_GUIDE_SLUG,
    title: "Vertex AI Gemini retirements in November and December 2026 | SunsetDiff",
    description: `Vertex AI retires gemini-3.6-flash on ${VERTEX_NOV19_SHUTDOWN_DATE} and gemini-live-2.5-flash-native-audio on ${VERTEX_DEC13_SHUTDOWN_DATE}. Replacements are gemini-3.8-flash and gemini-3.8-live. Veo 3.1 says November 17, 2026 or later.`,
    h1: "Vertex AI Gemini retirements in November and December 2026",
    summary: `The Vertex Gemini ids with exact shutdown dates ${VERTEX_NOV19_SHUTDOWN_DATE} and ${VERTEX_DEC13_SHUTDOWN_DATE}, the replacement on the model versions page, and the Veo rows that only print a floor.`,
    answer: `The dataset has ${ordered.length} Google Vertex Gemini ids with an exact shutdown date in this window: ${idList(ordered)}. The model versions page lists gemini-3.6-flash with retirement date November 19, 2026 and replacement model ID gemini-3.8-flash. It lists gemini-live-2.5-flash-native-audio with retirement date December 13, 2026 and replacement model ID gemini-3.8-live. The 3.6 Flash page says: "${VERTEX_FLASH_BANNER}" The Veo ids veo-3.1-generate-001 and veo-3.1-fast-generate-001 print November 17, 2026 or later, with an empty replacement cell. That is a floor, not a confirmed shutdown on November 17. A shutdown batch page needs at least ${SHUTDOWN_BATCH_MIN} records on one exact date, so there is no /shutdowns/google-vertex-${VERTEX_NOV19_SHUTDOWN_DATE}/ page and no /shutdowns/google-vertex-${VERTEX_DEC13_SHUTDOWN_DATE}/ page.`,
    checked: VERTEX_NOV_DEC_CHECKED,
    steps: [
      {
        name: "Read the two exact ids",
        text: `The first table is every Google Vertex id in this guide whose shutdown date is ${VERTEX_NOV19_SHUTDOWN_DATE} or ${VERTEX_DEC13_SHUTDOWN_DATE}. The replacement cell is the official replacement stored from the model versions page. Open the model page before you change a call.`,
      },
      {
        name: "Swap gemini-3.6-flash",
        text: `The 3.8 Flash guide says: "${VERTEX_MODEL_STRING}" It also says: "${VERTEX_BUDGET}". ${VERTEX_MINIMAL} The same page says temperature, top_k, and top_p are ignored. It says: "${VERTEX_THROW}" Its checklist says: "${VERTEX_REMOVE_LIST}"`,
      },
      {
        name: "Swap the Live model id",
        text: "The Live migration page's samples set model to gemini-3.8-live. Affective dialog and proactive audio are always enabled on that model. In-session system instruction updates use send_context_update, or a context_update message. The 2.5 Live page lists regional locations. The 3.8 Live page lists us, eu, and us-central1. The migration page does not print a location field to change.",
      },
      {
        name: "Test before each date",
        text: `Call gemini-3.8-flash before ${longDate(VERTEX_NOV19_SHUTDOWN_DATE)}. Call gemini-3.8-live before ${longDate(VERTEX_DEC13_SHUTDOWN_DATE)}. The model versions page says retirement timelines may be extended, and they will not move earlier. The Veo rows say November 17, 2026 or later. Do not treat that cell as a shutdown on November 17.`,
      },
    ],
    sections: [
      {
        heading: "What retires and when",
        paragraphs: [
          `These rows are the Google Vertex Gemini models in the dataset with shutdown date ${VERTEX_NOV19_SHUTDOWN_DATE} or ${VERTEX_DEC13_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The model versions page puts gemini-3.6-flash in the shorter-availability table: release date July 21, 2026, retirement date November 19, 2026, replacement model ID gemini-3.8-flash. It says: "${VERTEX_SHORT}" And: "${VERTEX_STILL}" The 3.6 Flash page says: "${VERTEX_FLASH_BANNER}" The versions line on that page says retirement date November 19, 2026.`,
          `The same model versions page puts gemini-live-2.5-flash-native-audio in the 12-month table: release date December 12, 2025, retirement date December 13, 2026, replacement model ID gemini-3.8-live. The Live model page says retirement date December 13, 2026.`,
          `Both model pages say: "${VERTEX_FOOTNOTE}" The Gemini API deprecations page is a different list. Checked on ${VERTEX_NOV_DEC_CHECKED}, the shutdown cell for gemini-3.6-flash says "No shutdown date announced." It does not list November 19, 2026, December 13, 2026, or the id gemini-live-2.5-flash-native-audio. ${apiFlash ? `The stored Gemini API row for gemini-3.6-flash has shutdown kind ${apiFlash.shutdown_date_kind} and ${apiFlash.shutdown_date ? `shutdown date ${apiFlash.shutdown_date}` : "no shutdown_date"}.` : "The dataset has no Gemini API row for gemini-3.6-flash."} See [Gemini API model shutdowns on November 17, 2026](/guides/${GEMINI_NOV17_GUIDE_SLUG}/).`,
          flash37
            ? `gemini-3.7-flash is on the shorter-availability table with retirement date January 28, 2027 and replacement model ID gemini-3.8-flash. The stored shutdown date is ${flash37.shutdown_date ?? "Not published"} (${flash37.shutdown_date_kind}). January 28, 2027 is after mid-December, so that id is not in the table below.`
            : "The dataset has no gemini-3.7-flash row. The model versions page lists that id with retirement date January 28, 2027, which is after mid-December.",
        ],
        table: {
          caption: `${ordered.length} Vertex Gemini ids with an exact shutdown date on ${VERTEX_NOV19_SHUTDOWN_DATE} or ${VERTEX_DEC13_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(ordered, catalog),
        },
        sources,
      },
      {
        heading: "Veo dates that are floors",
        paragraphs: [
          veo.length
            ? `The model versions page lists ${idList(veo)} with retirement date November 17, 2026 or later. The replacement cell is empty. The dataset stores shutdown date ${VERTEX_VEO_FLOOR_DATE} and kind ${[...new Set(veo.map((model) => model.shutdown_date_kind))].join(", ")}.`
            : "The dataset has no veo-3.1-generate-001 or veo-3.1-fast-generate-001 row.",
          `The page says: "${VERTEX_EXTEND}" November 17, 2026 is the earliest day in that cell. It is not a confirmed shutdown on that day. This guide does not name a replacement the page does not print.`,
          "These Veo ids are not Gemini text or Live ids. A generateContent swap to gemini-3.8-flash does not replace a Veo video model.",
        ],
        table: veo.length
          ? {
              caption: `${veo.length} Vertex Veo ids whose retirement cell says November 17, 2026 or later.`,
              headers: ["Model id", "Deprecation date", "Retirement cell", "Recommended replacement"],
              rows: veo.map((model) => [
                modelLink(model),
                deprecationCell(model),
                vertexDateCell(model),
                replacementText(model, catalog),
              ]),
            }
          : undefined,
        sources: [{ label: "Vertex AI model versions", url: GEMINI_VERTEX }],
      },
      {
        heading: "Change gemini-3.6-flash to gemini-3.8-flash",
        paragraphs: [
          `The 3.8 Flash guide says: "To migrate to 3.8 Flash from 3.7 Flash or 3.6 Flash, do the following steps." Then: "${VERTEX_MODEL_STRING}" Then: "${VERTEX_BUDGET}". HIGH, MEDIUM, and LOW are the values it names. MEDIUM is the default. It also says: "${VERTEX_MINIMAL}"`,
          `Under mandatory API rules, the same page says deprecated sampling parameters (temperature, top_k, top_p): "${VERTEX_IGNORED}" It says unsupported parameters: "${VERTEX_THROW}" The checklist then says: "${VERTEX_REMOVE_LIST}" The rules section and the checklist do not use the same verb for temperature, top_p, and top_k. This guide does not pick one. Remove the fields the checklist names, and do not send thinking_level MINIMAL.`,
          `The same page says: "${VERTEX_HISTORY}" And: "${VERTEX_PREFILL}" It does not print an HTTP status or an error body for the retirement date itself. The model versions page says to update the application to the recommended upgrades, test mission critical features, and deploy the updates.`,
          "The quickstart below sets location to global. The 3.6 Flash page lists model availability as global, and multi-region us and eu. The quickstart is a generateContent call. It is not a Live session.",
        ],
        codes: [
          {
            caption: "Retiring model id, same client shape as the 3.8 Flash quickstart",
            code: `from google import genai

client = genai.Client(enterprise=True, project="PROJECT_ID", location="global")

response = client.models.generate_content(
  model="gemini-3.6-flash",
  contents="How does AI work?",
)
print(response.text)
`,
          },
          {
            caption: "3.8 Flash quickstart",
            code: `from google import genai

client = genai.Client(enterprise=True, project="PROJECT_ID", location="global")

response = client.models.generate_content(
  model="gemini-3.8-flash",
  contents="How does AI work?",
)
print(response.text)
`,
          },
          {
            caption: "generateContent URL from the 3.8 Flash quickstart. The access-token header on that sample is left out.",
            code: `curl -X POST \\
  -H "Content-Type: application/json" \\
  "https://aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/global/publishers/google/models/gemini-3.8-flash:generateContent" \\
  -d '{
    "contents": {
      "role": "USER",
      "parts": { "text": "Why is the sky blue?" }
    }
  }'
`,
          },
        ],
        sources: [
          { label: "Developer's guide to Gemini 3.8 Flash", url: VERTEX_FLASH_GUIDE },
          { label: "Gemini 3.6 Flash model page", url: VERTEX_FLASH_PAGE },
          { label: "Migrate to the latest Gemini models", url: VERTEX_MIGRATE },
        ],
      },
      {
        heading: "Change the Live model id to gemini-3.8-live",
        paragraphs: [
          "The Live migration page describes the move from Gemini 2.5 Flash Live API Native Audio to Gemini 3.8 Live. Its samples set model to gemini-3.8-live. The retiring id on the model versions page is gemini-live-2.5-flash-native-audio. This guide does not invent a connect() call for that old id.",
          `Affective dialog on 2.5 is "Supported through the enable_affective_dialog flag." On 3.8 Live the cell says: "${VERTEX_AFFECTIVE}" Proactive audio on 2.5 is "Supported through the proactivity flag." On 3.8 Live that cell also says: "${VERTEX_AFFECTIVE}"`,
          `For history seeding, the page says: "${VERTEX_HISTORY_SEED}" For a system instruction change during a session, it says: "${VERTEX_CONTEXT}" It can replace the system instruction, the list of tools, or both.`,
          `The checklist says: "${VERTEX_INTERRUPT}" The behavior table says that when the user is speaking, scheduling interrupt on 3.8 Live waits for the user to finish before playing the tool's response. On 2.5, that same cell plays the tool's response over the user. The page also says 3.8 Live supports blocking function calls when the declaration sets behavior=BLOCKING, and that a new input during that call cancels it.`,
          "The 2.5 Live page lists model availability in us-central1, us-east1, us-east4, us-east5, us-south1, us-west1, us-west4, europe-central2, europe-north1, europe-southwest1, europe-west1, europe-west4, and europe-west8. The 3.8 Live page lists multi-region us and eu, and United States us-central1. us-central1 is on both lists. The migration page does not print a location string to change. A location that is only on the 2.5 list is not on the 3.8 availability list this guide read.",
          `The 3.8 Live page says retirement date September 25, 2027 or later. That is a floor for the replacement, not a December 13 date. The Live sample calls genai.Client() with no arguments. The 3.8 Flash quickstart uses enterprise=True, a project id, and location global. This guide does not merge those two clients.`,
        ],
        codes: [
          {
            caption: "Live connect sample from the Gemini 3.8 Live migration page",
            code: `from google import genai
from google.genai import types

client = genai.Client()

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    media_resolution=types.MediaResolution.MEDIA_RESOLUTION_LOW,
)

async with client.aio.live.connect(
    model="gemini-3.8-live",
    config=config,
) as session:
    ...
`,
          },
        ],
        sources: [
          { label: "Migrate from Gemini 2.5 Flash Live API to Gemini 3.8 Live", url: VERTEX_LIVE_MIGRATE },
          { label: "Gemini 2.5 Flash Live API model page", url: VERTEX_LIVE_PAGE },
          { label: "Gemini 3.8 Live model page", url: VERTEX_LIVE_38 },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the two Gemini ids in the first table, and for the two Veo ids if you use video models. A hit is a candidate. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "gemini-3.6-flash on the Gemini API is a different provider row. The Vertex retirement date does not fill in a Gemini API shutdown date. Search configs that set a Vertex location as well as the model id. The Live pages do not share one location list.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode([...ordered, ...veo]) }],
        sources: [{ label: "Vertex AI model versions", url: GEMINI_VERTEX }],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `Send one real generateContent request to gemini-3.8-flash before ${longDate(VERTEX_NOV19_SHUTDOWN_DATE)}. Send one real Live session to gemini-3.8-live before ${longDate(VERTEX_DEC13_SHUTDOWN_DATE)}. If a Live tool can return no rows, read that payload. The migration page says: "When a tool returns an uninformative or empty response, such as {"results": [], "total_available": 0} or None, the model can't distinguish between \"permanently exhausted\", \"query window too narrow\" or \"invalid argument\"."`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Vertex rows do not store a price. The [migrate diff for gemini-3.6-flash](/migrate/google-vertex__gemini-3-6-flash__to__google-vertex__gemini-3-8-flash/) and the [migrate diff for the Live id](/migrate/google-vertex__gemini-live-2-5-flash-native-audio__to__google-vertex__gemini-3-8-live/) show the stored model-id swap.",
        ],
        sources: [
          { label: "Developer's guide to Gemini 3.8 Flash", url: VERTEX_FLASH_GUIDE },
          { label: "Migrate from Gemini 2.5 Flash Live API to Gemini 3.8 Live", url: VERTEX_LIVE_MIGRATE },
          { label: "Vertex AI model versions", url: GEMINI_VERTEX },
        ],
      },
      {
        heading: "Shutdown pages for these dates",
        paragraphs: [
          `SunsetDiff publishes a shutdown batch page when at least ${SHUTDOWN_BATCH_MIN} model records share one provider and one exact shutdown date.`,
          vertexBatchSentence(VERTEX_NOV19_SHUTDOWN_DATE, nov19.length),
          vertexBatchSentence(VERTEX_DEC13_SHUTDOWN_DATE, dec13.length),
          `veo-3.1-generate-001 and veo-3.1-fast-generate-001 store ${VERTEX_VEO_FLOOR_DATE} with kind not_before. A floor is not an exact shutdown date, so there is no /shutdowns/google-vertex-${VERTEX_VEO_FLOOR_DATE}/ page. Counting those two rows as exact would still be under ${SHUTDOWN_BATCH_MIN}.`,
          vertexBatchSentence("2026-10-20", oct20.length),
          "October 20, 2026 is the gemini-2.5-pro, gemini-2.5-flash, and gemini-2.5-flash-lite batch. It is not the November 19 or December 13 date.",
        ],
        sources: [{ label: "Vertex AI model versions", url: GEMINI_VERTEX }],
      },
    ],
    related: [
      { href: "/models/google-vertex/gemini-3-6-flash/", label: "Vertex gemini-3.6-flash" },
      { href: "/models/google-vertex/gemini-live-2-5-flash-native-audio/", label: "Vertex gemini-live-2.5-flash-native-audio" },
      { href: "/models/google-vertex/gemini-3-8-flash/", label: "Vertex gemini-3.8-flash" },
      { href: "/models/google-vertex/gemini-3-8-live/", label: "Vertex gemini-3.8-live" },
      { href: "/migrate/google-vertex__gemini-3-6-flash__to__google-vertex__gemini-3-8-flash/", label: "gemini-3.6-flash to gemini-3.8-flash" },
      { href: "/migrate/google-vertex__gemini-live-2-5-flash-native-audio__to__google-vertex__gemini-3-8-live/", label: "Live id to gemini-3.8-live" },
      { href: "/providers/google-vertex/", label: "Google Vertex AI provider page" },
      { href: "/shutdowns/google-vertex-2026-10-20/", label: "Vertex AI shutdowns on October 20, 2026" },
      { href: `/guides/${GEMINI_NOV17_GUIDE_SLUG}/`, label: "Gemini API model shutdowns on November 17, 2026" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: "Which Vertex Gemini models retire in November and December 2026?",
        answer: `The dataset lists ${idList(ordered)}. gemini-3.6-flash retires on ${VERTEX_NOV19_SHUTDOWN_DATE}. gemini-live-2.5-flash-native-audio retires on ${VERTEX_DEC13_SHUTDOWN_DATE}. The model versions page says: "${VERTEX_EXTEND}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `${replacementFaq(ordered, catalog)} The 3.6 Flash page says: "${VERTEX_FLASH_BANNER}"`,
      },
      {
        question: "What changes besides the gemini-3.6-flash model id?",
        answer: `The 3.8 Flash guide says: "${VERTEX_BUDGET}". ${VERTEX_MINIMAL} It says: "${VERTEX_IGNORED}" It also says: "${VERTEX_THROW}" The checklist says: "${VERTEX_REMOVE_LIST}" And: "${VERTEX_PREFILL}"`,
      },
      {
        question: "What changes for the Live API id?",
        answer: `Point the Live session at gemini-3.8-live. Affective dialog and proactive audio say: "${VERTEX_AFFECTIVE}" The migration page says: "${VERTEX_CONTEXT}" And: "${VERTEX_HISTORY_SEED}" And: "${VERTEX_INTERRUPT}"`,
      },
      {
        question: "Do the Veo 3.1 models shut down on November 17, 2026?",
        answer: `No confirmed day is printed. The model versions page says November 17, 2026 or later, and the replacement cell is empty. The page says: "${VERTEX_EXTEND}" The dataset kind is not_before.`,
      },
      {
        question: "Does the Gemini API use these same dates?",
        answer: `No. The Vertex pages say: "${VERTEX_FOOTNOTE}" Checked on ${VERTEX_NOV_DEC_CHECKED}, the Gemini API deprecations page lists gemini-3.6-flash with shutdown cell "No shutdown date announced." It does not list gemini-live-2.5-flash-native-audio. The November 17, 2026 Gemini API ids are on [Gemini API model shutdowns on November 17, 2026](/guides/${GEMINI_NOV17_GUIDE_SLUG}/).`,
      },
      {
        question: "Why is there no shutdown page for November 19 or December 13?",
        answer: `A shutdown batch page is published when at least ${SHUTDOWN_BATCH_MIN} model records share one provider and one exact shutdown date. ${vertexBatchSentence(VERTEX_NOV19_SHUTDOWN_DATE, nov19.length)} ${vertexBatchSentence(VERTEX_DEC13_SHUTDOWN_DATE, dec13.length)} There is no /shutdowns/google-vertex-${VERTEX_VEO_FLOOR_DATE}/ page because the Veo date is a floor.`,
      },
      {
        question: "Is gemini-3.7-flash in this window?",
        answer: flash37
          ? `No. The model versions page lists gemini-3.7-flash with retirement date January 28, 2027 and replacement model ID gemini-3.8-flash. The stored shutdown date is ${flash37.shutdown_date ?? "Not published"}.`
          : "No. The model versions page lists gemini-3.7-flash with retirement date January 28, 2027.",
      },
    ],
    citations: [
      GEMINI_VERTEX,
      VERTEX_FLASH_PAGE,
      VERTEX_FLASH_GUIDE,
      VERTEX_LIVE_PAGE,
      VERTEX_LIVE_38,
      VERTEX_LIVE_MIGRATE,
      VERTEX_MIGRATE,
      GEMINI_DEPRECATIONS,
    ],
  };
}

/**
 * expiration_date values read from the OpenRouter models API on 2026-11-02.
 * Every non-null expiration_date in that response is in this list.
 * The ingest stores each id from the models API, including the Thinking Machines rows.
 */
export const OPENROUTER_NOV_DEC_CHECKED = "2026-11-02";
export const OPENROUTER_NOV_DEC_GUIDE_SLUG = "openrouter-model-expirations-november-december-2026";
const OPENROUTER_MODELS_API = "https://openrouter.ai/api/v1/models?output_modalities=all";
const OPENROUTER_MODELS_GUIDE = "https://openrouter.ai/docs/guides/overview/models";
const OPENROUTER_MODEL_SCHEMA = "https://openrouter.ai/docs/client-sdks/python/components/model";
const OPENROUTER_QUICKSTART = "https://openrouter.ai/docs/quickstart";
const OPENROUTER_CATALOG = "https://openrouter.ai/models";
const OPENROUTER_GITHUB_ACTION = "https://sunsetdiff.com/github-action/";
const OPENROUTER_DEPRECATION_QUOTE = "Deprecation date for the model endpoint (null if not deprecated)";
const OPENROUTER_REMOVAL_QUOTE =
  "The date after which the model may be removed. ISO 8601 date string (YYYY-MM-DD) or null if no expiration.";
const OPENROUTER_LOOKUP_404 =
  "Returns 404 if the model doesn't exist and isn't an alias for another model, including a catalog variant suffix on a model that has no such entry.";
const OPENROUTER_ALIAS_SENTENCE =
  "The examples below use ~openai/gpt-sol-latest, a latest alias that always resolves to the newest model in the OpenAI GPT Sol family, so your code keeps using the freshest version without redeploying. You can substitute any model slug here.";
const OPENROUTER_ACTION_QUOTE = "A model is reported when its status is retired, deprecated, or legacy.";

const OPENROUTER_NOV_DEC_LIVE: { id: string; expiration: string; canonical: string }[] = [
  { id: "meta-llama/llama-3.1-70b-instruct", expiration: "2026-11-03", canonical: "meta-llama/llama-3.1-70b-instruct" },
  { id: "thinkingmachines/inkling-small:free", expiration: "2026-11-04", canonical: "thinkingmachines/inkling-small-20260730" },
  { id: "thinkingmachines/inkling:free", expiration: "2026-11-04", canonical: "thinkingmachines/inkling-20260715" },
  { id: "bytedance-seed/seed-1.6", expiration: "2026-11-11", canonical: "bytedance-seed/seed-1.6-20250625" },
  { id: "bytedance-seed/seed-1.6-flash", expiration: "2026-11-11", canonical: "bytedance-seed/seed-1.6-flash-20250625" },
  { id: "bytedance-seed/seed-2.0-code", expiration: "2026-11-11", canonical: "bytedance-seed/seed-2.0-code-20260730" },
  { id: "bytedance/seedance-1-5-pro", expiration: "2026-11-11", canonical: "bytedance/seedance-1-5-pro-20260320" },
  { id: "liquid/d1", expiration: "2026-11-20", canonical: "liquid/d1-20260930" },
  { id: "heygen/heygen-voice-1-turbo:free", expiration: "2026-11-30", canonical: "heygen/heygen-voice-1-turbo-20261009" },
  { id: "microsoft/mai-transcribe-1.5", expiration: "2026-12-22", canonical: "microsoft/mai-transcribe-1.5" },
  { id: "dots-studio/dots-3-note-preview:free", expiration: "2026-12-31", canonical: "dots-studio/dots-3-note-preview-20260813" },
  { id: "microsoft/mai-voice-2", expiration: "2026-12-31", canonical: "microsoft/mai-voice-2" },
  { id: "microsoft/mai-voice-2-flash", expiration: "2026-12-31", canonical: "microsoft/mai-voice-2-flash-20260723" },
  { id: "z-ai/glm-4.5", expiration: "2026-12-31", canonical: "z-ai/glm-4.5" },
  { id: "z-ai/glm-4.5v", expiration: "2026-12-31", canonical: "z-ai/glm-4.5v" },
  { id: "z-ai/glm-4.7", expiration: "2026-12-31", canonical: "z-ai/glm-4.7-20251222" },
];

/** Stored rows whose ids were absent from the models API body on 2026-11-02. */
const OPENROUTER_ABSENT_ON_CHECK = [
  "nousresearch/hermes-3-llama-3.1-405b",
  "nousresearch/hermes-3-llama-3.1-70b",
  "x-ai/grok-imagine-image-quality",
  "poolside/laguna-s-2.1",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1",
  "poolside/laguna-xs-2.1:free",
  "upstage/solar-pro-3",
] as const;

const OPENROUTER_ABSENT_IN_WINDOW = [
  "nousresearch/hermes-3-llama-3.1-405b",
  "nousresearch/hermes-3-llama-3.1-70b",
  "x-ai/grok-imagine-image-quality",
] as const;

const OPENROUTER_ABSENT_BEFORE_WINDOW = [
  "poolside/laguna-s-2.1",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1",
  "poolside/laguna-xs-2.1:free",
  "upstage/solar-pro-3",
] as const;

export function isOpenRouterNovDecExpiration(model: ModelRecord): boolean {
  if (model.provider !== "openrouter" || model.shutdown_date_kind !== "not_before") return false;
  return OPENROUTER_NOV_DEC_LIVE.some((item) => item.id === model.id && item.expiration === model.shutdown_date);
}

export function showsOpenRouterNovDecGuide(model: ModelRecord): boolean {
  if (model.provider !== "openrouter") return false;
  if (isOpenRouterNovDecExpiration(model)) return true;
  return (OPENROUTER_ABSENT_ON_CHECK as readonly string[]).includes(model.id);
}

function openRouterModel(catalog: ModelRecord[], id: string): ModelRecord | undefined {
  return catalog.find((model) => model.provider === "openrouter" && model.id === id);
}

function openRouterIdCell(catalog: ModelRecord[], id: string): string {
  const model = openRouterModel(catalog, id);
  return model ? modelLink(model) : id;
}

function openRouterSearch(ids: string[]): string {
  const flags = [...new Set(ids)].map((id) => `-e '${id}'`).join(" ");
  return `rg -n -F ${flags}\n`;
}

function openRouterNovDecGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const storedIds = new Set(rows.map((model) => model.id));
  const unstored = OPENROUTER_NOV_DEC_LIVE.filter((item) => !storedIds.has(item.id));
  const unstoredSentence = unstored.length
    ? `${unstored.map((item) => item.id).join(" and ")} ${unstored.length === 1 ? "is" : "are"} on the API and not stored.`
    : "Every slug in that list is stored.";
  const canonicalRows = OPENROUTER_NOV_DEC_LIVE.filter((item) => item.canonical !== item.id);
  const searchIds = OPENROUTER_NOV_DEC_LIVE.flatMap((item) => item.canonical === item.id ? [item.id] : [item.id, item.canonical]);
  const windowAbsent = OPENROUTER_ABSENT_IN_WINDOW.map((id) => openRouterModel(catalog, id)).filter((model): model is ModelRecord => Boolean(model));
  const earlierAbsent = OPENROUTER_ABSENT_BEFORE_WINDOW.map((id) => openRouterModel(catalog, id)).filter((model): model is ModelRecord => Boolean(model));
  const sources = [
    { label: "OpenRouter models API", url: OPENROUTER_MODELS_API },
    { label: "OpenRouter models guide", url: OPENROUTER_MODELS_GUIDE },
    { label: "OpenRouter model schema", url: OPENROUTER_MODEL_SCHEMA },
  ];
  return {
    slug: OPENROUTER_NOV_DEC_GUIDE_SLUG,
    title: "OpenRouter model expirations in November and December 2026 | SunsetDiff",
    description: `OpenRouter expiration_date values from November 3 through December 31, 2026. Each date is a not-before removal floor. The API does not name a replacement.`,
    h1: "OpenRouter model expirations in November and December 2026",
    summary: `The 16 OpenRouter slugs with an expiration_date from November 3 through December 31, 2026, how to read that field, and how to change the model string.`,
    answer: `Checked on ${OPENROUTER_NOV_DEC_CHECKED}, the OpenRouter models API lists ${OPENROUTER_NOV_DEC_LIVE.length} models with a non-null expiration_date, and every one of those dates is from 2026-11-03 through 2026-12-31. The models guide calls that field the deprecation date for the model endpoint. The model schema says it is the date after which the model may be removed, not a day the model is guaranteed to stop. SunsetDiff stores the same day as shutdown_date_kind not_before, which means not before that day. The API response does not name a replacement. ${rows.length} of the slugs are stored and the stored day matches. ${unstoredSentence} A shutdown batch page needs an exact date, so there is no /shutdowns/openrouter-2026-11-11/ page and there is no /shutdowns/openrouter-2026-12-31/ page.`,
    checked: OPENROUTER_NOV_DEC_CHECKED,
    steps: [
      {
        name: "Read expiration_date as not before that day",
        text: `The table is every slug in the ${OPENROUTER_NOV_DEC_CHECKED} models API response whose expiration_date is set. The models guide says: "${OPENROUTER_DEPRECATION_QUOTE}" The model schema says: "${OPENROUTER_REMOVAL_QUOTE}" Do not treat the day as the morning the model stops.`,
      },
      {
        name: "Find the slugs in your code",
        text: "Search for the id and, when it differs, the canonical_slug. The quickstart puts the slug in the model field. Also check env files, YAML, TOML, and JSON. The scan page leaves not_before ids out, so run the search yourself.",
      },
      {
        name: "Pick a current slug from the same author",
        text: "OpenRouter does not name a replacement for these slugs. Pick a current model from the same author prefix on the OpenRouter catalog. A current slug has expiration_date null. SunsetDiff does not store null dates, so that slug is not on the OpenRouter provider page.",
      },
      {
        name: "Change the model field and send a test call",
        text: `The quickstart posts to https://openrouter.ai/api/v1/responses with the slug in model. Its sample slug is ~openai/gpt-sol-latest. That is a latest alias for GPT Sol, not a replacement for these models. Put the slug you picked in model and send one real prompt before you depend on the old id.`,
      },
    ],
    sections: [
      {
        heading: "What expires and when",
        paragraphs: [
          `These 16 slugs are the full set of non-null expiration_date values in the models API response checked on ${OPENROUTER_NOV_DEC_CHECKED}. output_modalities=all is the list this site reads, because the default list omits models whose output is not text. No row in that response uses 2026-11-02. The earliest date is 2026-11-03.`,
          `The models guide says expiration_date is: "${OPENROUTER_DEPRECATION_QUOTE}" The model schema says: "${OPENROUTER_REMOVAL_QUOTE}" SunsetDiff copies that day into deprecation_date and shutdown_date and sets shutdown_date_kind to not_before. Model pages say not sooner than that day. Not before and not sooner than are the same floor. OpenRouter did not publish a second date.`,
          `The recommended replacement cell is Not published. The API response does not name a replacement, and the description text on these rows does not name one either. This guide does not fill a slug in.`,
          unstored.length
            ? `${unstored.map((item) => `${item.id} (expiration_date ${item.expiration})`).join(" and ")} ${unstored.length === 1 ? "is" : "are"} in the API response and ${unstored.length === 1 ? "has" : "have"} no SunsetDiff model page. The stored files were not edited for this guide.`
            : "Every slug in the table has a stored OpenRouter row, and the stored shutdown_date matches expiration_date.",
          storedIds.size
            ? `${rows.length} stored rows match the API day and the kind not_before: ${idList(rows)}.`
            : "No stored row matches this API list.",
        ],
        table: {
          caption: `${OPENROUTER_NOV_DEC_LIVE.length} OpenRouter slugs with expiration_date from 2026-11-03 through 2026-12-31, read on ${OPENROUTER_NOV_DEC_CHECKED}.`,
          headers: ["Model id", "expiration_date", "How to read it", "Recommended replacement"],
          rows: OPENROUTER_NOV_DEC_LIVE.map((item) => [
            openRouterIdCell(catalog, item.id),
            item.expiration,
            `Not before ${item.expiration}. The model may be removed after it.`,
            "Not published",
          ]),
        },
        sources,
      },
      {
        heading: "canonical_slug is not a replacement",
        paragraphs: [
          "Some rows set canonical_slug to a dated id that is different from the id you send. Search for both strings. The dated slug is not a model OpenRouter told you to switch to.",
          canonicalRows.length
            ? `${canonicalRows.length} slugs in this window have a different canonical_slug. The other ${OPENROUTER_NOV_DEC_LIVE.length - canonicalRows.length} use the same string for id and canonical_slug.`
            : "Every slug in this window uses the same string for id and canonical_slug.",
        ],
        table: {
          caption: "Ids in this window whose canonical_slug differs.",
          headers: ["Model id", "canonical_slug"],
          rows: canonicalRows.map((item) => [openRouterIdCell(catalog, item.id), item.canonical]),
        },
        sources: [{ label: "OpenRouter models API", url: OPENROUTER_MODELS_API }],
      },
      {
        heading: "Stored rows the API no longer lists",
        paragraphs: [
          windowAbsent.length
            ? `Three stored rows use shutdown date 2026-11-02, which is inside this window: ${windowAbsent.map((model) => modelLink(model)).join(", ")}. The models API body checked on ${OPENROUTER_NOV_DEC_CHECKED} does not include those ids. This guide does not treat them as current expirations.`
            : "No stored OpenRouter row still uses 2026-11-02.",
          earlierAbsent.length
            ? `Five stored rows use October dates, which are before this window: ${earlierAbsent.map((model) => modelLink(model)).join(", ")}. Those ids are also absent from the same API body. The stored files were not changed.`
            : "No stored October OpenRouter rows were checked.",
          `A shutdown batch page needs at least ${SHUTDOWN_BATCH_MIN} model records that share one provider and one exact shutdown date. Every date in this guide is kind not_before. A floor does not get a batch page, so there is no /shutdowns/openrouter-2026-11-11/ page and there is no /shutdowns/openrouter-2026-12-31/ page. December 31 has more than ${SHUTDOWN_BATCH_MIN} slugs, and it is still a floor.`,
        ],
        sources,
      },
      {
        heading: "What a request does after the date",
        paragraphs: [
          `OpenRouter does not print the HTTP status a responses request returns after expiration_date. The schema says the model may be removed after that day. It does not say the model stops on that morning, and it does not say the call is rerouted.`,
          `The models guide does document a missing model on the lookup endpoint. It says: "${OPENROUTER_LOOKUP_404}" The sample on that page is GET /api/v1/model/{id}. That sentence is about a catalog entry that is not there. It is not a documented post-expiry error for POST /api/v1/responses. This guide does not invent the error body.`,
        ],
        sources: [
          { label: "OpenRouter models guide", url: OPENROUTER_MODELS_GUIDE },
          { label: "OpenRouter model schema", url: OPENROUTER_MODEL_SCHEMA },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for each id in the table. Where canonical_slug differs, search for that string too. A hit is a candidate. Open the call and read the model field before you edit it. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names.",
          `The [scan page](/scan/) builds its pattern from exact and month-only shutdown dates. not_before is left out, so these OpenRouter slugs are not in that pattern. The [GitHub Action](/github-action/) says: "${OPENROUTER_ACTION_QUOTE}" The stored rows are deprecated, so a hit on a stored slug is reported. The Action still uses the stored day when it chooses a warning or an error. That does not turn the floor into an exact shutdown day. thinkingmachines/inkling:free and thinkingmachines/inkling-small:free are stored, so the Action reports those slugs too.`,
          "The quickstart says the examples use ~openai/gpt-sol-latest. Search for the expiring slugs, not only for that alias.",
        ],
        codes: [{ caption: "ripgrep, fixed strings, ids and canonical_slug values", code: openRouterSearch(searchIds) }],
        sources: [
          { label: "OpenRouter models API", url: OPENROUTER_MODELS_API },
          { label: "OpenRouter quickstart", url: OPENROUTER_QUICKSTART },
          { label: "SunsetDiff GitHub Action", url: OPENROUTER_GITHUB_ACTION },
        ],
      },
      {
        heading: "How to switch",
        paragraphs: [
          `The quickstart says: "${OPENROUTER_ALIAS_SENTENCE}" Browse current slugs at the OpenRouter catalog, or read expiration_date from GET /api/v1/models. Pick a slug from the same author prefix whose expiration_date is null. The prefixes in this window are meta-llama, thinkingmachines, bytedance-seed, bytedance, liquid, heygen, microsoft, dots-studio, and z-ai. SunsetDiff has one [OpenRouter provider page](/providers/openrouter/). It does not have a separate page for those authors, and it does not list slugs whose expiration_date is null.`,
          "The quickstart posts to https://openrouter.ai/api/v1/responses and puts the slug in the model field. The OpenAI SDK sample on that page sets base_url to https://openrouter.ai/api/v1 and calls responses.create. The quickstart also passes the OpenRouter key. This page leaves the key out. Change the model string only after you have chosen the new slug. ~openai/gpt-sol-latest is the quickstart's example alias. It is not the replacement for these models.",
          "If a fallback list names one of these slugs, update that list too. The [swap guide](/guides/swap-a-deprecated-model/#openrouter) quotes the models array from OpenRouter's model fallbacks guide. The [OpenRouter framework page](/frameworks/openrouter/) shows where the slug sits in the SDK samples that page documents. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list once you have a slug to test: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        codes: [{
          caption: "Model field only. Add the key the way the quickstart shows. Do not copy this placeholder slug.",
          code: `response = client.responses.create(
    model="author/model-you-pick",
    input="Hello",
)
`,
        }],
        sources: [
          { label: "OpenRouter quickstart", url: OPENROUTER_QUICKSTART },
          { label: "OpenRouter model catalog", url: OPENROUTER_CATALOG },
          { label: "OpenRouter models API", url: OPENROUTER_MODELS_API },
        ],
      },
    ],
    related: [
      { href: "/providers/openrouter/", label: "OpenRouter provider page" },
      { href: "/frameworks/openrouter/", label: "OpenRouter model slug" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/swap-a-deprecated-model/#openrouter", label: "Swap a deprecated model on OpenRouter" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/github-action/", label: "GitHub Action" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: "Which OpenRouter models expire between November 2 and December 31, 2026?",
        answer: `The models API checked on ${OPENROUTER_NOV_DEC_CHECKED} lists ${OPENROUTER_NOV_DEC_LIVE.map((item) => `${item.id} (${item.expiration})`).join(", ")}. Those are the only non-null expiration_date values in that response. ${rows.length} are stored. ${unstoredSentence}`,
      },
      {
        question: "Does the model stop on expiration_date?",
        answer: `No shutdown day is promised. The models guide says: "${OPENROUTER_DEPRECATION_QUOTE}" The model schema says: "${OPENROUTER_REMOVAL_QUOTE}" SunsetDiff stores the kind not_before. Read the day as not before that date.`,
      },
      {
        question: "What does a request return after the date?",
        answer: `Not documented for POST /api/v1/responses. The models guide says: "${OPENROUTER_LOOKUP_404}" That sentence is about GET /api/v1/model/{id} when the model is missing. This page does not invent a chat or responses error.`,
      },
      {
        question: "What is the official replacement?",
        answer: "Not published. The models API does not name a replacement for these slugs, and this guide does not invent one. Pick a current slug from the same author prefix whose expiration_date is null. The OpenRouter provider page lists only slugs that have an expiration_date.",
      },
      {
        question: "Why is there no OpenRouter shutdown batch page for these dates?",
        answer: `A shutdown batch page needs at least ${SHUTDOWN_BATCH_MIN} model records that share one provider and one exact shutdown date. These dates are kind not_before. There is no /shutdowns/openrouter-2026-11-11/ page and there is no /shutdowns/openrouter-2026-12-31/ page.`,
      },
      {
        question: "Why do some SunsetDiff OpenRouter pages show dates the API no longer lists?",
        answer: `Checked on ${OPENROUTER_NOV_DEC_CHECKED}, the models API does not include ${OPENROUTER_ABSENT_ON_CHECK.join(", ")}. The stored rows still have their older expiration dates. This guide does not edit those files.`,
      },
    ],
    citations: [
      OPENROUTER_MODELS_API,
      OPENROUTER_MODELS_GUIDE,
      OPENROUTER_MODEL_SCHEMA,
      OPENROUTER_QUICKSTART,
      OPENROUTER_CATALOG,
      OPENROUTER_GITHUB_ACTION,
    ],
  };
}
