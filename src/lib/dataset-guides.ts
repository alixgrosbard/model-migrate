import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { modelSchema, type ModelRecord } from "../schema.ts";
import { aliasIdOf, aliasSnapshotView, applyAliasSnapshotShutdowns, isDeprecationsSource } from "./aliases.ts";
import type { GuidePage } from "./guides.ts";
import { today } from "./format.ts";
import { NOT_BEFORE_SHUTDOWN_BATCHES, SHUTDOWN_BATCH_MIN, SMALL_SHUTDOWN_BATCHES, longDate, publishedReplacementIds, shutdownEventSlug } from "./shutdowns.ts";

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

/** The guide URL stays fixed. The table is the stored rows inside this window. */
export const OPENROUTER_NOV_DEC_GUIDE_SLUG = "openrouter-model-expirations-november-december-2026";
export const OPENROUTER_NOV_DEC_WINDOW_START = "2026-11-01";
export const OPENROUTER_NOV_DEC_WINDOW_END = "2026-12-31";
const OPENROUTER_DECEMBER_IMAGE_IDS = ["openai/gpt-5-image-mini", "openai/gpt-image-1-mini"] as const;
const OPENROUTER_MODELS_API = "https://openrouter.ai/api/v1/models?output_modalities=all";

/** Checked against the OpenAI speech, audio, and realtime rows on 2026-11-01. */
export const JANUARY_6_TTS_SHUTDOWN_DATE = "2027-01-06";
export const JANUARY_20_AUDIO_SHUTDOWN_DATE = "2027-01-20";
export const JANUARY_2027_AUDIO_GUIDE_SLUG = "openai-audio-realtime-tts-shutdowns-january-2027";

/** Checked against the OpenAI deprecations page and transcription guides on 2026-11-03. */
export const FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE = "2027-02-26";
export const FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG = "openai-whisper-gpt-4o-transcribe-shutdown-february-26-2027";
export const FEBRUARY_26_TRANSCRIBE_CHECKED = "2026-11-03";
const FEBRUARY_26_TRANSCRIBE_IDS = [
  "whisper-1",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-mini-transcribe-2025-12-15",
  "gpt-4o-transcribe-diarize",
] as const;

/** Checked against the OpenAI deprecations page and model pages on 2026-11-04. The slug uses this date. */
export const APRIL_1_2027_SHUTDOWN_DATE = "2027-04-01";
export const APRIL_1_2027_GUIDE_SLUG = "openai-gpt-5-1-codex-nano-shutdown-april-1-2027";
export const APRIL_1_2027_CHECKED = "2026-11-04";
const APRIL_1_2027_IDS = [
  "gpt-5.1",
  "gpt-5.1-2025-11-13",
  "gpt-5.3-codex",
  "gpt-5.4-nano",
  "gpt-5.4-nano-2026-03-17",
] as const;

/** Checked against the MiniMax rows. The slug uses this date. */
export const MINIMAX_NOV18_SHUTDOWN_DATE = "2026-11-18";
export const MINIMAX_NOV18_GUIDE_SLUG = "minimax-m2-5-m2-7-shutdown-november-18-2026";

/** Checked against the Bedrock legacy lifecycle page. The slug uses this date. */
export const BEDROCK_NOV13_SHUTDOWN_DATE = "2026-11-13";
export const BEDROCK_NOV13_GUIDE_SLUG = "amazon-bedrock-claude-3-shutdown-november-13-2026";

/** Checked against the Bedrock legacy lifecycle page on 2026-11-05. The slug uses this date. */
export const BEDROCK_NOV27_SHUTDOWN_DATE = "2026-11-27";
export const BEDROCK_NOV27_GUIDE_SLUG = "amazon-bedrock-claude-3-haiku-sonnet-ca-central-1-november-27-2026";
const BEDROCK_NOV27_CHECKED = "2026-11-05";

/** Checked against the Bedrock legacy lifecycle page on 2026-11-02. The slug uses this date. */
export const BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE = "2026-11-26";
export const BEDROCK_JAMBA_NOV26_GUIDE_SLUG = "amazon-bedrock-ai21-jamba-shutdown-november-26-2026";
const JAMBA_CHECKED = "2026-11-02";
const JAMBA_IDS = ["ai21.jamba-1-5-large-v1:0", "ai21.jamba-1-5-mini-v1:0"] as const;

/** Checked against the Bedrock legacy lifecycle page on 2026-11-03. The slug uses this date. */
export const BEDROCK_MAR30_SHUTDOWN_DATE = "2027-03-30";
export const BEDROCK_MAR30_GUIDE_SLUG = "amazon-bedrock-open-weight-models-shutdown-march-30-2027";
const BEDROCK_MAR30_CHECKED = "2026-11-03";

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

/** Checked against the Azure OpenAI retirement schedule and lifecycle page on 2026-11-04. */
export const AZURE_APRIL14_SHUTDOWN_DATE = "2027-04-14";
export const AZURE_APRIL14_GUIDE_SLUG = "azure-openai-gpt-4-1-gpt-4o-retirement-april-14-2027";
export const AZURE_APRIL14_CHECKED = "2026-11-04";
const AZURE_APRIL14_IDS = [
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini-2025-04-14",
  "gpt-4.1-nano-2025-04-14",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "gpt-4o-mini-2024-07-18",
] as const;

/** Checked against the Azure OpenAI retirement schedule and lifecycle page on 2026-11-04. */
export const AZURE_JULY13_SHUTDOWN_DATE = "2027-07-13";
export const AZURE_JULY13_GUIDE_SLUG = "azure-openai-gpt-5-1-gpt-5-mini-codex-retirement-july-13-2027";
export const AZURE_JULY13_CHECKED = "2026-11-04";
const AZURE_JULY13_IDS = [
  "gpt-5-mini-2025-08-07",
  "gpt-5.1-2025-11-13",
  "gpt-5.2-codex-2026-01-14",
] as const;

/** Checked against the Azure OpenAI retirement schedule and lifecycle page on 2026-11-05. */
export const AZURE_JUNE15_SHUTDOWN_DATE = "2027-06-15";
export const AZURE_JUNE15_GUIDE_SLUG = "azure-openai-gpt-4o-mini-tts-transcribe-realtime-audio-retirement-june-15-2027";
export const AZURE_JUNE15_CHECKED = "2026-11-05";
const AZURE_JUNE15_IDS = [
  "gpt-4o-mini-transcribe-2025-12-15",
  "gpt-4o-mini-tts-2025-12-15",
  "gpt-audio-mini-2025-12-15",
  "gpt-realtime-mini-2025-12-15",
] as const;
export const AZURE_AUG24_SHUTDOWN_DATE = "2027-08-24";
export const AZURE_AUG24_GUIDE_SLUG = "azure-openai-gpt-5-3-codex-audio-realtime-retirement-august-24-2027";
export const AZURE_AUG24_CHECKED = "2026-11-05";
const AZURE_AUG24_IDS = [
  "gpt-5.3-codex-2026-02-24",
  "gpt-audio-1.5-2026-02-23",
  "gpt-realtime-1.5-2026-02-23",
] as const;

/** Checked against the Mistral models page, model cards, lifecycle page, and changelog on 2026-11-04. */
export const MISTRAL_APRIL30_SHUTDOWN_DATE = "2027-04-30";
export const MISTRAL_APRIL30_DEPRECATION_DATE = "2026-10-31";
export const MISTRAL_APRIL30_GUIDE_SLUG = "mistral-large-3-medium-3-5-voxtral-retirement-april-30-2027";
export const MISTRAL_APRIL30_CHECKED = "2026-11-04";
const MISTRAL_APRIL30_IDS = [
  "mistral-large-2512",
  "mistral-medium-3-5",
  "voxtral-mini-2602",
  "voxtral-mini-transcribe-realtime-2602",
  "voxtral-mini-tts-2603",
] as const;

/** Checked against the Vertex model versions page on 2026-11-04. The slug uses this date. */
export const VERTEX_EMBED_APRIL1_SHUTDOWN_DATE = "2027-04-01";
export const VERTEX_EMBED_APRIL1_GUIDE_SLUG = "vertex-ai-text-embedding-004-005-multilingual-002-shutdown-april-1-2027";
export const VERTEX_EMBED_APRIL1_CHECKED = "2026-11-04";
const VERTEX_EMBED_APRIL1_IDS = [
  "multimodalembedding@001",
  "text-embedding-004",
  "text-embedding-005",
  "text-multilingual-embedding-002",
] as const;

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

/** Checked against Together's deprecations page on 2026-11-05. The slug uses this date. */
export const TOGETHER_NOV6_SHUTDOWN_DATE = "2026-11-06";
export const TOGETHER_NOV6_GUIDE_SLUG = "together-model-shutdowns-november-6-2026";
export const TOGETHER_NOV6_CHECKED = "2026-11-05";

/** Checked against the Nebius November 2026 notice. The slug uses this date. */
export const NEBIUS_NOV9_SHUTDOWN_DATE = "2026-11-09";
export const NEBIUS_NOV9_GUIDE_SLUG = "nebius-model-shutdowns-november-9-2026";
const NEBIUS_AUGUST_SHUTDOWN_DATE = "2026-08-31";

/** Checked against the Gemini API deprecations table. The slug uses this date. */
export const GEMINI_NOV17_SHUTDOWN_DATE = "2026-11-17";
export const GEMINI_NOV17_GUIDE_SLUG = "gemini-api-model-shutdowns-november-17-2026";

/** Checked against the Gemini API deprecations page on 2026-11-03. The slug uses this date. */
export const GEMINI_DEC1_SHUTDOWN_DATE = "2026-12-01";
export const GEMINI_DEC1_GUIDE_SLUG = "gemini-2-5-pro-flash-auto-route-december-1-2026";
export const GEMINI_DEC1_CHECKED = "2026-11-03";
const GEMINI_DEC1_IDS = ["gemini-2.5-pro", "gemini-2.5-flash"] as const;

/** Checked against Anthropic's deprecations page on 2026-11-01. The slug uses this date. */
export const SONNET45_NOV30_SHUTDOWN_DATE = "2026-11-30";
export const SONNET45_NOV30_GUIDE_SLUG = "claude-sonnet-4-5-shutdown-november-30-2026";
const SONNET45_CHECKED = "2026-11-01";

/** Checked against the Bedrock legacy lifecycle page, the Marengo Embed v2.7 model card, and the Marengo Embed 3.0 parameters page on 2026-11-06. */
export const BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE = "2026-11-30";
export const BEDROCK_MARENGO_NOV30_GUIDE_SLUG = "amazon-bedrock-marengo-embed-v2-7-shutdown-november-30-2026";
const MARENGO_CHECKED = "2026-11-06";
const MARENGO_V27_ID = "twelvelabs.marengo-embed-2-7-v1:0";
const MARENGO_V30_ID = "twelvelabs.marengo-embed-3-0-v1:0";

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
const TRANSCRIBE_NOTICE =
  "On August 26, 2026, we notified developers using whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, and gpt-4o-transcribe-diarize of their deprecation and removal from the API on February 26, 2027.";
const TRANSCRIBE_SEE_GUIDE = "For information about the recommended replacements, see the transcription guide.";
const TRANSCRIBE_START =
  "Start with gpt-transcribe. This is the recommended model for transcribing recorded speech in its original language. The specialized examples for speaker labels, word timestamps, and subtitle formats below use deprecated models.";
const TRANSCRIBE_FILE_LIMIT = "Files can be up to 25 MB. Supported input formats are mp3, mp4, mpeg, mpga, m4a, wav, and webm.";
const TRANSCRIBE_LIVE_POINTER = "For audio that is still arriving from a microphone, call, or media stream, use Realtime transcription.";
const TRANSCRIBE_STREAM_SET =
  "Set stream=true with gpt-transcribe. The Transcriptions API returns transcript events as the model transcribes each part of the recording.";
const TRANSCRIBE_STREAM_FILE =
  "File transcription can stream partial text while the model processes a completed recording. This doesn't require a Realtime session.";
const TRANSCRIBE_STREAM_OLD =
  "Existing gpt-4o-transcribe, gpt-4o-mini-transcribe, and gpt-4o-transcribe-diarize integrations also support file streaming. whisper-1 doesn't.";
const TRANSCRIBE_STREAM_LIVE =
  "For live audio from a microphone, call, or media stream, use the Realtime transcription guide instead of the file-oriented streaming path above. It covers the current transcription-session flow and the recommended realtime path with gpt-live-transcribe.";
const TRANSCRIBE_DIARIZE =
  "Existing integrations can use the deprecated gpt-4o-transcribe-diarize model to identify who speaks during different parts of a recording until February 26, 2027. This specialized speaker-labeling model isn't the recommended model for ordinary file transcription.";
const TRANSCRIBE_DIARIZE_FORMAT =
  'Request the diarized_json response format to receive segments with speaker, start, and end metadata. For audio longer than 30 seconds, set chunking_strategy to "auto" or a voice activity detection configuration.';
const TRANSCRIBE_KNOWN_SPEAKERS =
  "You can optionally supply up to four short audio references with known_speaker_names[] and known_speaker_references[] to map segments onto known speakers.";
const TRANSCRIBE_SPEAKER_REALTIME =
  "Speaker labeling is available through /v1/audio/transcriptions. It isn't supported in Realtime transcription sessions.";
const TRANSCRIBE_NO_PROMPT = "Existing gpt-4o-transcribe and gpt-4o-mini-transcribe integrations also support prompting. gpt-4o-transcribe-diarize doesn't support prompts.";
const TRANSCRIBE_WHISPER_PROMPT =
  "For whisper-1, prompts have a 224-token limit and provide less control than the recommended transcription model.";
const TRANSCRIBE_WHISPER_LANGS =
  "Whisper supports 98 languages, but accuracy varies by language. Existing models that accept one language hint use language instead of languages.";
const TRANSCRIBE_TIMESTAMPS =
  "Existing integrations can use the deprecated whisper-1 model for word or segment timestamps until February 26, 2027. The timestamp_granularities[] parameter returns structured timestamp data for captioning and video editing.";
const TRANSCRIBE_TIMESTAMP_ONLY = "The timestamp_granularities[] parameter is only supported for whisper-1.";
const TRANSCRIBE_TRANSLATE =
  "The deprecated /v1/audio/translations endpoint uses whisper-1 to translate a completed audio recording into English. It remains available until February 26, 2027. Unlike transcription, which preserves the recording's original language, this endpoint returns English text only.";
const TRANSCRIBE_TRANSLATE_MOVE =
  "Migrate to Realtime translation with gpt-realtime-translate at /v1/realtime/translations. This requires a translation session, streamed audio input, and translation events. Changing only the model ID in a /v1/audio/translations request doesn't migrate it.";
const LIVE_TRANSCRIBE_START =
  "Start with gpt-live-transcribe. Use file transcription if your audio is already recorded, or see the Transcription overview to compare the workflows.";
const LIVE_TRANSCRIBE_WS =
  "For server-side WebSocket transcription with a standard API key, connect to wss://api.openai.com/v1/realtime?intent=transcription. Use the authentication header shown in the WebSocket guide, but omit model from the URL. That guide's model-based URL creates a conversation session and doesn't accept the transcription update below.";
const LIVE_TRANSCRIBE_PCM = "This example uses 24 kHz PCM audio.";
const LIVE_TRANSCRIBE_DELAY_FIELD =
  "Start by setting audio.input.transcription.delay and testing against your real audio.";
const GPT_TRANSCRIBE_BLURB =
  "GPT Transcribe is a speech-to-text model for completed audio files, streamed file transcripts, and committed turns in Realtime sessions over WebSocket.";
const GPT_LIVE_BLURB =
  "GPT Live Transcribe is a streaming speech-to-text model for applications that need low-latency transcript deltas from live audio.";
const DEPRECATED_WHEN_ANNOUNCED =
  "When we announce that a model or endpoint is being deprecated, it immediately becomes deprecated. All deprecated models and endpoints will also have a shut down date.";
const TRANSCRIBE_KEYWORD_REJECT =
  "Keep each keyword on one line and don't include <, >, a carriage return, or a line feed. The API rejects the entire request when it encounters one of these characters or when prompt exceeds the model's length limit.";
const LIVE_TRANSCRIBE_VAD =
  "In gpt-live-transcribe transcription sessions, omit audio.input.turn_detection or set it to null. The model doesn't support server_vad or semantic_vad.";
const LIVE_TRANSCRIBE_LANG =
  "gpt-live-transcribe uses languages instead of the singular language field. Don't send both.";
const LIVE_TRANSCRIBE_NO_DETECT = "gpt-live-transcribe doesn't return detected-language predictions.";
const LIVE_TRANSCRIBE_NO_FIELDS =
  "gpt-live-transcribe doesn't return word-level timestamps, speaker labels, or transcription confidence scores. If your application requires timestamps or speaker labels, use a compatible file transcription model or add an application-level fallback.";
const LIVE_TRANSCRIBE_DELAY =
  "The exact delay in milliseconds can vary by model configuration, so benchmark with representative audio instead of assuming a fixed timing per level.";
const TRANSCRIBE_PRICE_HEADER = "Prices per 1M tokens unless noted.";
const OPENAI_IMAGE_GUIDE = "https://developers.openai.com/api/docs/guides/image-generation";
const OPENAI_SUNBURST = "https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst";
const DECEMBER_1_IMAGE_REPLACEMENTS = "gpt-image-2.6-sunburst or gpt-image-2.6-flare";
const OPENAI_TTS = "https://developers.openai.com/api/docs/guides/text-to-speech";
const OPENAI_REALTIME = "https://developers.openai.com/api/docs/guides/realtime";
const OPENAI_REALTIME_CONVERSATIONS = "https://developers.openai.com/api/docs/guides/realtime-conversations";
const OPENAI_TRANSCRIBE = "https://developers.openai.com/api/docs/guides/speech-to-text";
const OPENAI_LIVE_TRANSCRIBE = "https://developers.openai.com/api/docs/guides/realtime-transcription";
const OPENAI_GPT_TRANSCRIBE = "https://developers.openai.com/api/docs/models/gpt-transcribe";
const OPENAI_GPT_LIVE_TRANSCRIBE = "https://developers.openai.com/api/docs/models/gpt-live-transcribe";
const OPENAI_PRICING = "https://developers.openai.com/api/docs/pricing";
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

export function isBedrockNov27Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && model.shutdown_date === BEDROCK_NOV27_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockJambaNov26Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && (JAMBA_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockMarengoNov30Shutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && model.id === MARENGO_V27_ID
    && model.shutdown_date === BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isBedrockMar30OpenWeightShutdown(model: ModelRecord): boolean {
  return model.provider === "aws-bedrock"
    && model.shutdown_date === BEDROCK_MAR30_SHUTDOWN_DATE
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

export function isAzureApril14Retirement(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && (AZURE_APRIL14_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === AZURE_APRIL14_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureJuly13Retirement(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && (AZURE_JULY13_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === AZURE_JULY13_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureJune15Retirement(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && (AZURE_JUNE15_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === AZURE_JUNE15_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isAzureAug24Retirement(model: ModelRecord): boolean {
  return model.provider === "azure-openai"
    && (AZURE_AUG24_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === AZURE_AUG24_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isMistralApril30Retirement(model: ModelRecord): boolean {
  return model.provider === "mistral"
    && (MISTRAL_APRIL30_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === MISTRAL_APRIL30_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isVertexApril1EmbeddingShutdown(model: ModelRecord): boolean {
  return model.provider === "google-vertex"
    && (VERTEX_EMBED_APRIL1_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === VERTEX_EMBED_APRIL1_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
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

export function isTogetherNov6Shutdown(model: ModelRecord): boolean {
  return model.provider === "together"
    && model.shutdown_date === TOGETHER_NOV6_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isTogetherNov6Replacement(model: ModelRecord, catalog: ModelRecord[]): boolean {
  if (model.provider !== "together") return false;
  return catalog.some((row) => isTogetherNov6Shutdown(row) && publishedReplacementIds(row).includes(model.id));
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

export function isGeminiDec1AutoRoute(model: ModelRecord): boolean {
  return model.provider === "google-gemini-api"
    && (GEMINI_DEC1_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === GEMINI_DEC1_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function showsGeminiDec1Guide(model: ModelRecord): boolean {
  if (model.provider !== "google-gemini-api") return false;
  return isGeminiDec1AutoRoute(model)
    || model.id === "gemini-2.5-flash-lite"
    || model.id === "gemini-3.8-flash"
    || model.id === "gemini-3.5-flash-lite";
}

export function isVertexNovDecGemini(model: ModelRecord): boolean {
  return model.provider === "google-vertex"
    && model.shutdown_date_kind === "exact"
    && (
      (model.id === VERTEX_FLASH_ID && model.shutdown_date === VERTEX_NOV19_SHUTDOWN_DATE)
      || (model.id === VERTEX_LIVE_ID && model.shutdown_date === VERTEX_DEC13_SHUTDOWN_DATE)
    );
}

/** Vertex Veo rows whose retirement cell is a floor. The ids and the day come from the dataset. */
export function isVertexVeoFloor(model: ModelRecord): boolean {
  return model.provider === "google-vertex"
    && model.id.startsWith("veo-")
    && model.shutdown_date_kind === "not_before"
    && Boolean(model.shutdown_date);
}

export function vertexVeoFloorRows(catalog: ModelRecord[]): ModelRecord[] {
  return catalog.filter(isVertexVeoFloor).sort((a, b) => a.id.localeCompare(b.id));
}

export function vertexVeoProviderNote(catalog: ModelRecord[]): string {
  const veo = vertexVeoFloorRows(catalog);
  if (!veo.length) return "No Vertex Veo row stores a not_before retirement date.";
  const dates = [...new Set(veo.map((model) => model.shutdown_date))].sort();
  const empty = veo.every((model) => model.replacements.length === 0);
  const replacement = empty ? "with no replacement model ID" : "with the replacement stored on each row";
  if (dates.length === 1 && dates[0]) {
    const ids = veo.length === 2 ? `${veo[0].id} and ${veo[1].id}` : idList(veo);
    return `${ids} list ${longDate(dates[0])} or later, ${replacement}. That date is a floor, so there is no /shutdowns/google-vertex-${dates[0]}/ page.`;
  }
  return veo.map((model) => {
    const cell = model.replacements.length === 0 ? ", with no replacement model ID" : "";
    return `${model.id} lists ${longDate(model.shutdown_date!)} or later${cell}. That date is a floor, so there is no /shutdowns/google-vertex-${model.shutdown_date}/ page.`;
  }).join(" ");
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

/** OpenRouter image slugs that share the December image shutdown story. Dates come from the row. */
export function isOpenRouterDecemberImageModel(model: ModelRecord): boolean {
  return model.provider === "openrouter" && (OPENROUTER_DECEMBER_IMAGE_IDS as readonly string[]).includes(model.id);
}

/**
 * Deprecated OpenRouter rows whose shutdown date is still ahead and inside
 * November 1 through December 31, 2026. Past dates stay in the dataset and
 * drop off this table without a manual edit.
 */
export function isOpenRouterNovDecExpiration(model: ModelRecord, day = today()): boolean {
  if (model.provider !== "openrouter" || model.status !== "deprecated") return false;
  if (model.shutdown_date_kind !== "not_before" || !model.shutdown_date) return false;
  if (model.shutdown_date <= day) return false;
  return model.shutdown_date >= OPENROUTER_NOV_DEC_WINDOW_START
    && model.shutdown_date <= OPENROUTER_NOV_DEC_WINDOW_END;
}

/** Stored OpenRouter rows the November-December table leaves out because the date is not still ahead. */
export function isOpenRouterEarlierStored(model: ModelRecord, day = today()): boolean {
  if (model.provider !== "openrouter" || model.status !== "deprecated") return false;
  if (model.shutdown_date_kind !== "not_before" || !model.shutdown_date) return false;
  if (isOpenRouterNovDecExpiration(model, day)) return false;
  return model.shutdown_date <= day || model.shutdown_date < OPENROUTER_NOV_DEC_WINDOW_START;
}

export function showsOpenRouterNovDecGuide(model: ModelRecord, day = today()): boolean {
  return isOpenRouterNovDecExpiration(model, day) || isOpenRouterEarlierStored(model, day);
}

export function isJanuary2027AudioShutdown(model: ModelRecord): boolean {
  if (model.provider !== "openai") return false;
  if (model.shutdown_date !== JANUARY_6_TTS_SHUTDOWN_DATE && model.shutdown_date !== JANUARY_20_AUDIO_SHUTDOWN_DATE) return false;
  return model.shutdown_date_kind === "exact" || model.shutdown_date_kind === "via_snapshots";
}

export function isFebruary2027TranscribeShutdown(model: ModelRecord): boolean {
  return model.provider === "openai"
    && (FEBRUARY_26_TRANSCRIBE_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
}

export function isApril2027Gpt51CodexNanoShutdown(model: ModelRecord): boolean {
  return model.provider === "openai"
    && (APRIL_1_2027_IDS as readonly string[]).includes(model.id)
    && model.shutdown_date === APRIL_1_2027_SHUTDOWN_DATE
    && model.shutdown_date_kind === "exact";
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

function englishJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function openRouterShutdownDates(): string[] {
  return [...NOT_BEFORE_SHUTDOWN_BATCHES]
    .filter((key) => key.startsWith("openrouter|"))
    .map((key) => key.slice("openrouter|".length))
    .filter((date) => date >= OPENROUTER_NOV_DEC_WINDOW_START && date <= OPENROUTER_NOV_DEC_WINDOW_END)
    .sort();
}

function openRouterShutdownLinks(): string[] {
  return openRouterShutdownDates().map((date) => `[/shutdowns/openrouter-${date}/](/shutdowns/openrouter-${date}/)`);
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
          `[/shutdowns/anthropic-2026-11-30/](/shutdowns/anthropic-2026-11-30/) lists this id. [/shutdowns/mistral-2025-11-30/](/shutdowns/mistral-2025-11-30/) is November 30, 2025, for Mistral. It is not this Claude date.`,
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
      {
        heading: "Marengo Embed v2.7 is a different November 30 shutdown",
        paragraphs: [
          `The same calendar day is the end of life on Amazon Bedrock for twelvelabs.marengo-embed-2-7-v1:0. That id is TwelveLabs Marengo Embed v2.7. It is not claude-sonnet-4-5-20250929, and it is not the Bedrock id anthropic.claude-sonnet-4-5-20250929-v1:0. The Bedrock walkthrough is [Amazon Bedrock Marengo Embed v2.7 shutdown on November 30, 2026](/guides/${BEDROCK_MARENGO_NOV30_GUIDE_SLUG}/).`,
          "A Claude API caller follows this page. A Marengo caller follows that page. Do not copy the replacement claude-sonnet-5-5 onto the Marengo id, and do not copy the Marengo id onto a Claude request.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Bedrock legacy lifecycle", url: BEDROCK_LEGACY },
        ],
      },
    ],
    related: [
      { href: "/models/anthropic/claude-sonnet-4-5-20250929/", label: "claude-sonnet-4-5-20250929" },
      { href: `/guides/${BEDROCK_MARENGO_NOV30_GUIDE_SLUG}/`, label: "Amazon Bedrock Marengo Embed v2.7 shutdown on November 30, 2026" },
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
        question: "Is Bedrock Marengo Embed v2.7 part of this Claude shutdown?",
        answer: `No. The legacy lifecycle table lists twelvelabs.marengo-embed-2-7-v1:0 with EOL date November 30, 2026. That is a TwelveLabs embedding model on Amazon Bedrock. The separate page is [Amazon Bedrock Marengo Embed v2.7 shutdown on November 30, 2026](/guides/${BEDROCK_MARENGO_NOV30_GUIDE_SLUG}/).`,
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
  FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG,
  APRIL_1_2027_GUIDE_SLUG,
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
  const transcribe = rowsFor(isFebruary2027TranscribeShutdown, catalog);
  if (transcribe.length) pages.push(februaryTranscribeGuide(transcribe, catalog));
  const april = rowsFor(isApril2027Gpt51CodexNanoShutdown, catalog);
  if (april.length) pages.push(aprilGpt51CodexNanoGuide(april, catalog));
  const minimax = rowsFor(isMinimaxNov18Shutdown, catalog);
  if (minimax.length) pages.push(minimaxGuide(minimax, catalog));
  const bedrock = rowsFor(isBedrockNov13Shutdown, catalog);
  if (bedrock.length) pages.push(bedrockGuide(bedrock, catalog));
  const bedrockNov27 = rowsFor(isBedrockNov27Shutdown, catalog);
  if (bedrockNov27.length) pages.push(bedrockNov27Guide(bedrockNov27, catalog));
  const jamba = rowsFor(isBedrockJambaNov26Shutdown, catalog);
  if (jamba.length) pages.push(jambaNov26Guide(jamba, catalog));
  const marengo = rowsFor(isBedrockMarengoNov30Shutdown, catalog);
  if (marengo.length) pages.push(marengoNov30Guide(marengo, catalog));
  const bedrockMar30 = rowsFor(isBedrockMar30OpenWeightShutdown, catalog);
  if (bedrockMar30.length) pages.push(bedrockMar30Guide(bedrockMar30, catalog));
  const azure = rowsFor(isAzureNov19OSeries, catalog);
  if (azure.length) pages.push(azureOSeriesGuide(azure, catalog));
  const azureNovDec = rowsFor(isAzureNovDecRetirement, catalog);
  if (azureNovDec.length) pages.push(azureNovDecGuide(azureNovDec, catalog));
  const azureApril14 = rowsFor(isAzureApril14Retirement, catalog);
  if (azureApril14.length) pages.push(azureApril14Guide(azureApril14, catalog));
  const azureJuly13 = rowsFor(isAzureJuly13Retirement, catalog);
  if (azureJuly13.length) pages.push(azureJuly13Guide(azureJuly13, catalog));
  const azureJune15 = rowsFor(isAzureJune15Retirement, catalog);
  if (azureJune15.length) pages.push(azureJune15Guide(azureJune15, catalog));
  const azureAug24 = rowsFor(isAzureAug24Retirement, catalog);
  if (azureAug24.length) pages.push(azureAug24Guide(azureAug24, catalog));
  const mistralApril30 = rowsFor(isMistralApril30Retirement, catalog);
  if (mistralApril30.length) pages.push(mistralApril30Guide(mistralApril30));
  const vertexEmbedApril1 = rowsFor(isVertexApril1EmbeddingShutdown, catalog);
  if (vertexEmbedApril1.length) pages.push(vertexApril1EmbedGuide(vertexEmbedApril1, catalog));
  const copilot = rowsFor(isCopilotNov16Shutdown, catalog);
  if (copilot.length) pages.push(copilotNov16Guide(copilot, catalog));
  const fireworks = rowsFor(isFireworksNov7Shutdown, catalog);
  if (fireworks.length) pages.push(fireworksNov7Guide(fireworks, catalog));
  const togetherNov6 = rowsFor(isTogetherNov6Shutdown, catalog);
  if (togetherNov6.length) pages.push(togetherNov6Guide(togetherNov6, catalog));
  const nebius = rowsFor(isNebiusNov9Shutdown, catalog);
  if (nebius.length) pages.push(nebiusNov9Guide(nebius, catalog));
  const gemini = rowsFor(isGeminiNov17Shutdown, catalog);
  if (gemini.length) pages.push(geminiNov17Guide(gemini, catalog));
  const geminiDec1 = rowsFor(isGeminiDec1AutoRoute, catalog);
  if (geminiDec1.length) pages.push(geminiDec1Guide(geminiDec1, catalog));
  const vertexNovDec = rowsFor(isVertexNovDecGemini, catalog);
  if (vertexNovDec.length) pages.push(vertexNovDecGuide(vertexNovDec, catalog));
  const openrouterNovDec = rowsFor((model) => isOpenRouterNovDecExpiration(model), catalog);
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
      { href: `/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`, label: "whisper-1 and GPT-4o transcribe shutdown on February 26, 2027" },
      { href: `/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`, label: "GPT-4.1 and GPT-4o shutdown in January 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
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
      { href: `/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`, label: "whisper-1 and GPT-4o transcribe shutdown on February 26, 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
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

function openRouterDecemberImageModels(catalog: ModelRecord[]): ModelRecord[] {
  return OPENROUTER_DECEMBER_IMAGE_IDS.flatMap((id) => {
    const model = catalog.find((item) => item.provider === "openrouter" && item.id === id);
    if (!model?.shutdown_date || model.status !== "deprecated") return [];
    return [model];
  });
}

function openRouterImageShutdownNote(models: ModelRecord[], catalog: ModelRecord[]): string | null {
  if (!models.length) return null;
  const bits = models.map((model) => `${modelLink(model)} (not before ${longDate(model.shutdown_date!)})`);
  const replacement = models.every((model) => model.replacements.length === 0)
    ? "The stored replacement list on those rows is empty, so this page does not name one."
    : models.map((model) => `${model.id}: ${replacementText(model, catalog)}`).join(" ");
  const dates = [...new Set(models.map((model) => model.shutdown_date).filter((date): date is string => Boolean(date)))];
  const batch = dates.length === 1 && NOT_BEFORE_SHUTDOWN_BATCHES.has(`openrouter|${dates[0]}`)
    ? ` See [/shutdowns/openrouter-${dates[0]}/](/shutdowns/openrouter-${dates[0]}/).`
    : "";
  return `OpenRouter is also expiring image slugs. The OpenRouter models API sets expiration_date, and SunsetDiff stores that day as not_before. ${englishJoin(bits)}. ${replacement} Those slugs are OpenRouter ids, not the OpenAI ids in the table above.${batch} See the [OpenRouter model expirations in November and December 2026](/guides/${OPENROUTER_NOV_DEC_GUIDE_SLUG}/).`;
}

function december1ImageGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE);
  const checked = newestDeprecationsCheck(rows);
  const openRouterImages = openRouterDecemberImageModels(catalog);
  const openRouterNote = openRouterImageShutdownNote(openRouterImages, catalog);
  return {
    slug: DECEMBER_1_IMAGE_GUIDE_SLUG,
    title: `OpenAI image models shutting down on ${when} | SunsetDiff`,
    description: `chatgpt-image-latest, gpt-image-1-mini, gpt-image-1.5, and gpt-image-1.5-2025-12-16 shut down on ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}. OpenAI names ${DECEMBER_1_IMAGE_REPLACEMENTS}.`,
    h1: `OpenAI image models shutting down on ${when}`,
    summary: `The OpenAI image ids in the dataset with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}, and the two replacements the deprecations page names.`,
    answer: `The dataset has ${rows.length} OpenAI image ids with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}: ${idList(rows)}. OpenAI's deprecations page lists those ids for removal on December 1, 2026, and names ${DECEMBER_1_IMAGE_REPLACEMENTS}. It does not prefer one. The same page says: "${ACCESSIBLE}" gpt-image-1 is not in this table. That id shut down on 2026-10-23.`,
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
          `OpenAI's deprecations page says: "${IMAGE_NOTICE}" The December 1 table on that page lists gpt-image-1-mini, then gpt-image-1.5 with snapshot gpt-image-1.5-2025-12-16, then chatgpt-image-latest. Each replacement cell says ${DECEMBER_1_IMAGE_REPLACEMENTS}. The word or means either id. The page does not prefer one.`,
          "gpt-image-1 is on the October 23, 2026 row of the same page. That row names gpt-image-2.5-sunburst or gpt-image-2.5-flare. Its stored shutdown date is 2026-10-23. It is not in the table below.",
          ...(openRouterNote ? [openRouterNote] : []),
        ],
        table: {
          caption: `${rows.length} OpenAI image ids with shutdown date ${DECEMBER_1_IMAGE_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          ...(openRouterImages.length ? [{ label: "OpenRouter models API", url: OPENROUTER_MODELS_API }] : []),
        ],
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
          `The gpt-image-2.6-sunburst model page lists v1/images/generations and v1/images/edits as supported, and lists v1/responses as not supported. Put gpt-image-2.6-sunburst or gpt-image-2.6-flare in the image tool's model field. Do not set the top-level Responses model to either image id.`,
          `The image generation page says: "${IMAGE_QUALITY}" The same page says: "For GPT Image 2.6 and 2.5 Sunburst and Flare, the quality options are low, medium, high, xhigh, and max." A request that already sends high can keep high. xhigh and max are the settings the earlier models do not have.`,
          `The image generation page says: "${IMAGE_SIZES}" Those size rules are in the section for gpt-image-2.5-sunburst and gpt-image-2.5-flare.`,
          `The same page says: "${IMAGE_USER}"`,
          `The image generation page's Python sample calls client.images.generate with model gpt-image-2.5-sunburst. The page also names gpt-image-2.5-flare for that same field. The deprecations page names ${DECEMBER_1_IMAGE_REPLACEMENTS} for the ids in the table. Send one prompt you use now, to the id you will keep, before the shutdown date.`,
        ],
        codes: [
          {
            caption: "Image API call from the image generation page",
            code: `result = client.images.generate(model="gpt-image-2.5-sunburst", prompt=prompt)\n`,
          },
        ],
        sources: [
          { label: "OpenAI image generation", url: OPENAI_IMAGE_GUIDE },
          { label: "gpt-image-2.6-sunburst", url: OPENAI_SUNBURST },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Call ${DECEMBER_1_IMAGE_REPLACEMENTS} with a prompt you send today. Do that before ${when}.`,
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
      { href: `/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`, label: "whisper-1 and GPT-4o transcribe shutdown on February 26, 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: "/models/openai/gpt-image-2-6-sunburst/", label: "gpt-image-2.6-sunburst" },
      { href: "/models/openai/gpt-image-2-6-flare/", label: "gpt-image-2.6-flare" },
      ...(openRouterImages.length
        ? [
            { href: `/guides/${OPENROUTER_NOV_DEC_GUIDE_SLUG}/`, label: "OpenRouter model expirations in November and December 2026" },
            ...(() => {
              const dates = [...new Set(openRouterImages.map((model) => model.shutdown_date).filter((date): date is string => Boolean(date)))];
              if (dates.length !== 1 || !NOT_BEFORE_SHUTDOWN_BATCHES.has(`openrouter|${dates[0]}`)) return [];
              return [{ href: `/shutdowns/openrouter-${dates[0]}/`, label: `OpenRouter shutdowns on ${longDate(dates[0])}` }];
            })(),
            ...openRouterImages.map((model) => ({ href: `/models/openrouter/${model.slug}/`, label: model.id })),
          ]
        : []),
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
        answer: `OpenAI's deprecations page names ${DECEMBER_1_IMAGE_REPLACEMENTS} for each of these ids. It does not prefer one. The image generation page says: "${IMAGE_CHOICE}" ${replacementFaq(rows, catalog)}`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "Do I have to change the endpoint?",
        answer: `The image generation page says: "${IMAGE_SET_MODEL}" The gpt-image-2.6-sunburst model page lists v1/images/generations and v1/images/edits as supported, and v1/responses as not supported. The deprecations page names ${DECEMBER_1_IMAGE_REPLACEMENTS} for these ids. Keep a mainline model at the top of a Responses request and put the image id in the tool.`,
      },
      {
        question: "Which quality values are new?",
        answer: `The image generation page says: "${IMAGE_QUALITY}" The same page says: "${IMAGE_SIZES}"`,
      },
      ...(openRouterNote
        ? [{
            question: "What if I call an image model through OpenRouter?",
            answer: openRouterNote,
          }]
        : []),
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      OPENAI_IMAGE_GUIDE,
      OPENAI_SUNBURST,
      ...(openRouterImages.length ? [OPENROUTER_MODELS_API] : []),
    ],
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
          `gpt-realtime-mini-2025-10-06 and gpt-audio-mini-2025-10-06 are not in this table. Their stored shutdown date is 2026-07-23. gpt-4o-mini-transcribe and gpt-4o-mini-transcribe-2025-12-15 are not in this table. Their stored shutdown date is 2027-02-26. Those ids, plus whisper-1, gpt-4o-transcribe, and gpt-4o-transcribe-diarize, are in the [February 26, 2027 transcription guide](/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/).`,
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
          `The deprecations page names gpt-4o-mini-transcribe-2025-12-15 as the replacement for gpt-4o-mini-transcribe-2025-03-20. That replacement snapshot, and the alias gpt-4o-mini-transcribe, shut down on 2027-02-26. The [February 26, 2027 transcription guide](/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/) covers those ids. The file transcription page says: "${TRANSCRIBE_FEB}" For the models that page recommends after that later date, it says: "${TRANSCRIBE_LANGUAGE}" That languages field is documented for gpt-transcribe. The page does not say the December 15 snapshot rejects language.`,
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
      { href: `/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`, label: "whisper-1 and GPT-4o transcribe shutdown on February 26, 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
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

function februaryTranscribeGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE);
  const march = catalog.find((model) => model.provider === "openai" && model.id === "gpt-4o-mini-transcribe-2025-03-20");
  return {
    slug: FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG,
    title: `whisper-1 and GPT-4o transcribe shutdown on ${when} | SunsetDiff`,
    description: `whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-mini-transcribe-2025-12-15, and gpt-4o-transcribe-diarize shut down on ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}. OpenAI names gpt-live-transcribe or gpt-transcribe.`,
    h1: `whisper-1 and GPT-4o transcribe shutdown on ${when}`,
    summary: `The five OpenAI transcription ids with shutdown date ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}, the stored replacements, and the file versus live call the docs describe.`,
    answer: `The dataset has ${rows.length} OpenAI transcription ids with shutdown date ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}: ${idList(rows)}. OpenAI's deprecations page says: "${TRANSCRIBE_NOTICE}" The recommended replacement on each row is gpt-live-transcribe or gpt-transcribe. The same page says: "${TRANSCRIBE_SEE_GUIDE}" The file transcription page says to start with gpt-transcribe for recorded speech. The realtime transcription page says to start with gpt-live-transcribe for live audio. OpenAI's deprecations page also says: "${ACCESSIBLE}"`,
    checked: FEBRUARY_26_TRANSCRIBE_CHECKED,
    steps: [
      {
        name: "Read the five ids",
        text: `The table lists whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-mini-transcribe-2025-12-15, and gpt-4o-transcribe-diarize. gpt-4o-mini-transcribe-2025-03-20 is not in this table. Its stored shutdown date is ${JANUARY_20_AUDIO_SHUTDOWN_DATE}.`,
      },
      {
        name: "Pick the call, not only the string",
        text: "A completed file stays on POST /v1/audio/transcriptions with gpt-transcribe. Live audio from a microphone, call, or media stream moves to a realtime transcription session with gpt-live-transcribe. gpt-live-transcribe is not a supported model for the file endpoint.",
      },
      {
        name: "Test before the date",
        text: `Call the replacement that matches the audio you send now. Do that before ${when}. Speaker labels are documented on gpt-4o-transcribe-diarize. Word timestamps are documented on whisper-1. The realtime page says gpt-live-transcribe does not return either.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the OpenAI transcription ids in the dataset with shutdown date ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          `OpenAI's deprecations page says: "${TRANSCRIBE_NOTICE}" The section date on that page is August 26, 2026. These rows store 2026-08-26 as announced_date. deprecation_date is empty. The same page says: "${DEPRECATED_WHEN_ANNOUNCED}"`,
          `The shutdown table on that page lists whisper-1, gpt-4o-transcribe, and gpt-4o-transcribe-diarize with replacement gpt-live-transcribe or gpt-transcribe. The gpt-4o-mini-transcribe row lists snapshot gpt-4o-mini-transcribe-2025-12-15 in the model column, and the same replacement. That snapshot is its own row here. It is not a model that stays up after ${when}.`,
          march
            ? `gpt-4o-mini-transcribe-2025-03-20 is not in this table. The January 20, 2027 deprecations table names gpt-4o-mini-transcribe-2025-12-15 as its replacement. That snapshot then shuts down on ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}. The stored row is ${modelLink(march)}.`
            : `gpt-4o-mini-transcribe-2025-03-20 is not in this table. The January 20, 2027 deprecations table names gpt-4o-mini-transcribe-2025-12-15 as its replacement.`,
        ],
        table: {
          caption: `${rows.length} OpenAI transcription ids with shutdown date ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The file transcription page says: "${TRANSCRIBE_FEB}" OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          `A 400 from a field the replacement rejects is a different failure. This guide does not invent an error body. The file transcription page says: "${TRANSCRIBE_LANGUAGE}" It also says: "${TRANSCRIBE_KEYWORD_REJECT}" It does not print the error sentence.`,
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "OpenAI file transcription", url: OPENAI_TRANSCRIBE },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for every id in the table. A file transcription helper and a live caption session often live in different files. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
          "You can also read one id from the free SunsetDiff lookup file. [whisper-1](/api/v1/lookup/whisper-1.json) is one of these rows. The [API page](/api/) lists the other files. No key and no signup. The [alerts page](/alerts/) is the free email form. That page says what the form stores and the one welcome email it can send.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Recorded files stay on the transcriptions endpoint",
        paragraphs: [
          `The file transcription page says: "${TRANSCRIBE_START}" It also says: "${TRANSCRIBE_LIVE_POINTER}" Send the audio file to /v1/audio/transcriptions with model gpt-transcribe. The gpt-transcribe model page says: "${GPT_TRANSCRIBE_BLURB}" That page lists v1/audio/transcriptions and v1/realtime/transcription_sessions as supported. It lists v1/audio/translations, v1/realtime, and v1/audio/speech as not supported. It lists streaming as a supported feature.`,
          `The file transcription page says: "${TRANSCRIBE_FILE_LIMIT}" It says: "${TRANSCRIBE_LANGUAGE}" It also says: "${TRANSCRIBE_KEYWORD_REJECT}" Use prompt for unstructured context about the recording, keywords for literal terms you expect to hear, and languages for the expected input languages. The page says keywords are hints, not required output.`,
          `For a completed file, streaming stays on that same endpoint. The page says: "${TRANSCRIBE_STREAM_FILE}" And: "${TRANSCRIBE_STREAM_SET}" It also says: "${TRANSCRIBE_STREAM_OLD}" Live audio is a different call. The page says: "${TRANSCRIBE_STREAM_LIVE}"`,
          `The file transcription page says: "${TRANSCRIBE_NO_PROMPT}" And: "${TRANSCRIBE_WHISPER_PROMPT}" For languages it says: "${TRANSCRIBE_WHISPER_LANGS}"`,
        ],
        codes: [
          {
            caption: "File transcription shape from the speech-to-text guide. Model id only.",
            code: `import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();
const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream("fixtures/audio.wav"),
  model: "gpt-transcribe",
});
`,
          },
        ],
        sources: [
          { label: "OpenAI file transcription", url: OPENAI_TRANSCRIBE },
          { label: "gpt-transcribe", url: OPENAI_GPT_TRANSCRIBE },
        ],
      },
      {
        heading: "Live audio uses a transcription session",
        paragraphs: [
          `The realtime transcription page says: "${LIVE_TRANSCRIBE_START}" The gpt-live-transcribe model page says: "${GPT_LIVE_BLURB}" That page lists v1/realtime/transcription_sessions as supported. It lists v1/audio/transcriptions as not supported. It also lists v1/audio/translations, v1/realtime, and v1/audio/speech as not supported, and streaming as a supported feature. Putting gpt-live-transcribe on POST /v1/audio/transcriptions is not the call those pages describe.`,
          `The realtime transcription page says: "${LIVE_TRANSCRIBE_WS}" After the connection opens, send session.update with type transcription and set the transcription model to gpt-live-transcribe. The page says: "For browser audio, see WebRTC." It says: "${LIVE_TRANSCRIBE_PCM}" And: "${LIVE_TRANSCRIBE_VAD}"`,
          `The same page says: "${LIVE_TRANSCRIBE_LANG}" It also says: "${LIVE_TRANSCRIBE_NO_DETECT}" Prompt, keywords, and languages are the context fields on that session. The page says: "${LIVE_TRANSCRIBE_DELAY_FIELD}" The starting points it lists are below. It says: "${LIVE_TRANSCRIBE_DELAY}"`,
        ],
        bullets: [
          "minimal for the most latency-sensitive interactions.",
          "low for low-latency live captions.",
          "medium for a balanced latency/accuracy tradeoff.",
          "high when accuracy matters more than immediate display.",
          "xhigh when your workflow can tolerate the most delay for more context.",
        ],
        codes: [
          {
            caption: "session.update from the realtime transcription guide. turn_detection stays null.",
            code: `{
  "type": "session.update",
  "session": {
    "type": "transcription",
    "audio": {
      "input": {
        "format": { "type": "audio/pcm", "rate": 24000 },
        "transcription": { "model": "gpt-live-transcribe" },
        "turn_detection": null
      }
    }
  }
}
`,
          },
        ],
        sources: [
          { label: "OpenAI realtime transcription", url: OPENAI_LIVE_TRANSCRIBE },
          { label: "gpt-live-transcribe", url: OPENAI_GPT_LIVE_TRANSCRIBE },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Diarization, timestamps, and translation",
        paragraphs: [
          `The file transcription page says: "${TRANSCRIBE_DIARIZE}" It says: "${TRANSCRIBE_DIARIZE_FORMAT}" It also says: "${TRANSCRIBE_KNOWN_SPEAKERS}" Reference clips on that page are between 2 and 10 seconds. The page says: "${TRANSCRIBE_SPEAKER_REALTIME}" The deprecations page names gpt-live-transcribe or gpt-transcribe for gpt-4o-transcribe-diarize. It does not name a current model that returns speaker labels after ${when}.`,
          `The realtime transcription page says: "${LIVE_TRANSCRIBE_NO_FIELDS}" The file transcription page says: "${TRANSCRIBE_TIMESTAMPS}" And: "${TRANSCRIBE_TIMESTAMP_ONLY}" Those pages do not say gpt-transcribe returns word timestamps or speaker labels.`,
          `The file transcription page says: "${TRANSCRIBE_TRANSLATE}" It says: "${TRANSCRIBE_TRANSLATE_MOVE}" The deprecations table lists /v1/audio/translations on the same shutdown date, with replacement v1/realtime/translations. That endpoint is not a model row in the table above. The stored model page is [gpt-realtime-translate](/models/openai/gpt-realtime-translate/).`,
        ],
        sources: [
          { label: "OpenAI file transcription", url: OPENAI_TRANSCRIBE },
          { label: "OpenAI realtime transcription", url: OPENAI_LIVE_TRANSCRIBE },
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Price on the pricing page",
        paragraphs: [
          `The pricing page's transcription table says: "${TRANSCRIBE_PRICE_HEADER}" The estimated cost column is a per-minute price. On that table, gpt-live-transcribe is $0.017 per minute, gpt-transcribe is $0.0045 per minute, gpt-4o-transcribe is $0.006 per minute, gpt-4o-mini-transcribe is $0.003 per minute, and gpt-4o-transcribe-diarize is $0.006 per minute. A row labeled Whisper is $0.006 per minute. The page does not label that row whisper-1.`,
          "Input and output on the same table follow the per-1M-token header. gpt-4o-transcribe and gpt-4o-transcribe-diarize list input $2.50 and output $10.00. gpt-4o-mini-transcribe lists input $1.25 and output $5.00. gpt-transcribe, gpt-live-transcribe, and the Whisper row show a dash for input and output. The gpt-transcribe model page lists transcription audio at $0.0045 per minute. The gpt-live-transcribe model page lists realtime audio at $0.017 per minute.",
        ],
        sources: [
          { label: "OpenAI pricing", url: OPENAI_PRICING },
          { label: "gpt-transcribe", url: OPENAI_GPT_TRANSCRIBE },
          { label: "gpt-live-transcribe", url: OPENAI_GPT_LIVE_TRANSCRIBE },
        ],
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. For a recorded file, test gpt-transcribe on POST /v1/audio/transcriptions before ${when}. For live audio, test gpt-live-transcribe in a transcription session before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2027-02-26/", label: `OpenAI shutdowns on ${when}` },
      { href: "/shutdowns/openai-2027-01-20/", label: "OpenAI shutdowns on January 20, 2027" },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: `/guides/${JANUARY_2027_AUDIO_GUIDE_SLUG}/`, label: "OpenAI speech, audio, and realtime shutdowns in January 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: "/models/openai/whisper-1/", label: "whisper-1" },
      { href: "/models/openai/gpt-transcribe/", label: "gpt-transcribe" },
      { href: "/models/openai/gpt-live-transcribe/", label: "gpt-live-transcribe" },
      { href: "/models/openai/gpt-realtime-translate/", label: "gpt-realtime-translate" },
      { href: "/api/", label: "Free lookup API" },
      { href: "/alerts/", label: "Shutdown alerts signup" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which transcription ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}. gpt-4o-mini-transcribe-2025-03-20 is not in that list. Its shutdown date is ${JANUARY_20_AUDIO_SHUTDOWN_DATE}. The deprecations page says: "${TRANSCRIBE_NOTICE}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `The deprecations page names gpt-live-transcribe or gpt-transcribe for each id in the table. It says: "${TRANSCRIBE_SEE_GUIDE}" The file transcription page says to start with gpt-transcribe for recorded speech. The realtime transcription page says to start with gpt-live-transcribe for live audio. ${replacementFaq(rows, catalog)}`,
      },
      {
        question: "Can I only change the model string on /v1/audio/transcriptions?",
        answer: `For a completed file, the file transcription page sends the file to /v1/audio/transcriptions with gpt-transcribe. The gpt-transcribe model page lists that route as supported. The gpt-live-transcribe model page lists v1/audio/transcriptions as not supported and v1/realtime/transcription_sessions as supported. For gpt-transcribe, the file page says: "${TRANSCRIBE_LANGUAGE}"`,
      },
      {
        question: "Do the replacements return speaker labels or word timestamps?",
        answer: `The realtime transcription page says: "${LIVE_TRANSCRIBE_NO_FIELDS}" The file transcription page says speaker labeling is not supported in Realtime transcription sessions, and that timestamp_granularities[] is only supported for whisper-1. Those pages do not say gpt-transcribe returns speaker labels or word timestamps. gpt-4o-transcribe-diarize and whisper-1 remain available for those jobs until ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}.`,
      },
      {
        question: "What happens to /v1/audio/translations?",
        answer: `The file transcription page says: "${TRANSCRIBE_TRANSLATE}" It says: "${TRANSCRIBE_TRANSLATE_MOVE}" The deprecations table lists that endpoint on ${FEBRUARY_26_TRANSCRIBE_SHUTDOWN_DATE}, with replacement v1/realtime/translations.`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "Is a deprecation date stored?",
        answer: `No deprecation_date is stored on these rows. The deprecations section is dated August 26, 2026, and the dataset stores 2026-08-26 as announced_date. The page says: "${DEPRECATED_WHEN_ANNOUNCED}"`,
      },
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      OPENAI_TRANSCRIBE,
      OPENAI_LIVE_TRANSCRIBE,
      OPENAI_GPT_TRANSCRIBE,
      OPENAI_GPT_LIVE_TRANSCRIBE,
      OPENAI_PRICING,
    ],
  };
}

const OPENAI_GPT51 = "https://developers.openai.com/api/docs/models/gpt-5.1";
const OPENAI_CODEX53 = "https://developers.openai.com/api/docs/models/gpt-5.3-codex";
const OPENAI_NANO54 = "https://developers.openai.com/api/docs/models/gpt-5.4-nano";
const OPENAI_GPT6_SOL = "https://developers.openai.com/api/docs/models/gpt-6-sol";
const OPENAI_GPT6_LUNA = "https://developers.openai.com/api/docs/models/gpt-6-luna";
const OPENAI_USING_GPT6 = "https://developers.openai.com/api/docs/guides/latest-model";
const APRIL_NOTICE =
  "The following models are deprecated and will be removed from the API on April 1, 2027, with six months' notice. Migrate to the recommended replacements before the shutdown date.";
const JULY_23_NOTICE =
  "On April 22, 2026, we announced the deprecation of the following older OpenAI models. Access to these models was shut down on July 23, 2026.";
const GPT51_EFFORT = "Reasoning.effort supports: none (default), low, medium, and high.";
const CODEX_EFFORT = "GPT-5.3-Codex supports low, medium, high, and xhigh reasoning effort settings.";
const NANO_EFFORT = "Reasoning.effort supports: none (default), low, medium, high and xhigh.";
const SOL_EFFORT = "reasoning.effort supports none, low, medium (default), high, xhigh, and max.";
const SOL_TOOLS =
  "Use the Responses API for built-in tools and function calling. Chat Completions supports function calling only with reasoning_effort set to none.";
const GPT6_NONE =
  "GPT-6 Astra and GPT-6.1 Sol do not support the none reasoning effort; GPT-6.1 Terra, GPT-6 Sol, and GPT-6 Luna do.";
const GPT6_EFFORT_FIELD = "Use reasoning.effort in Responses or reasoning_effort in Chat Completions.";
const GPT6_TOOLS =
  'GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with reasoning_effort: "none". Use Responses for reasoning with tools.';
const GPT6_PARAMS =
  "When reasoning effort is not none, remove temperature, top_p, and top_logprobs. For Chat Completions, also remove logprobs. For Responses, remove message.output_text.logprobs from include.";
const SOL_LONG_CONTEXT =
  "Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.";
const NANO_REGIONAL = "Regional processing (data residency) endpoints are charged a 10% uplift for GPT-5.4 nano.";
const SOL_REGIONAL = "Regional processing adds a 10% premium where available.";

function aprilGpt51CodexNanoGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(APRIL_1_2027_SHUTDOWN_DATE);
  const sol = catalog.find((model) => model.provider === "openai" && model.id === "gpt-6-sol");
  const luna = catalog.find((model) => model.provider === "openai" && model.id === "gpt-6-luna");
  const solLink = sol ? modelLink(sol) : "gpt-6-sol";
  const lunaLink = luna ? modelLink(luna) : "gpt-6-luna";
  return {
    slug: APRIL_1_2027_GUIDE_SLUG,
    title: `GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on ${when} | SunsetDiff`,
    description: `gpt-5.1, gpt-5.1-2025-11-13, and gpt-5.3-codex shut down on ${APRIL_1_2027_SHUTDOWN_DATE}. OpenAI names gpt-6-sol. gpt-5.4-nano and gpt-5.4-nano-2026-03-17 shut down the same day. OpenAI names gpt-6-luna.`,
    h1: `GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on ${when}`,
    summary: `The five OpenAI ids with shutdown date ${APRIL_1_2027_SHUTDOWN_DATE}, the stored replacement for each, and the request fields the model pages name.`,
    answer: `The dataset has ${rows.length} OpenAI ids with shutdown date ${APRIL_1_2027_SHUTDOWN_DATE}: ${idList(rows)}. OpenAI's deprecations page says: "${APRIL_NOTICE}" The same page names gpt-6-sol for gpt-5.1, gpt-5.1-2025-11-13, and gpt-5.3-codex. It names gpt-6-luna for gpt-5.4-nano and gpt-5.4-nano-2026-03-17. The section heading is 2026-10-01. OpenAI's deprecations page also says: "${ACCESSIBLE}"`,
    checked: APRIL_1_2027_CHECKED,
    steps: [
      {
        name: "Read the five ids",
        text: `The table lists gpt-5.1, gpt-5.1-2025-11-13, gpt-5.3-codex, gpt-5.4-nano, and gpt-5.4-nano-2026-03-17. gpt-5.1-chat-latest, gpt-5.1-codex, gpt-5.1-codex-max, and gpt-5.1-codex-mini are a different date.`,
      },
      {
        name: "Swap the model string",
        text: "Send gpt-6-sol in place of gpt-5.1, gpt-5.1-2025-11-13, and gpt-5.3-codex. Send gpt-6-luna in place of gpt-5.4-nano and gpt-5.4-nano-2026-03-17. Keep a gpt-5.3-codex call on the Responses API.",
      },
      {
        name: "Check effort, tools, and sampling fields",
        text: `gpt-5.1 and gpt-5.4-nano default reasoning effort to none. gpt-6-sol and gpt-6-luna default it to medium. On Chat Completions, function calling for those two replacements works with reasoning_effort set to none. When effort is not none, the Using GPT-6 page says to remove temperature, top_p, and top_logprobs. Test one real prompt before ${when}.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the OpenAI ids in the dataset with shutdown date ${APRIL_1_2027_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty.`,
          `OpenAI's deprecations page says: "${APRIL_NOTICE}" The section heading is 2026-10-01. These rows store announced_date 2026-10-01. deprecation_date is empty. The same page says: "${DEPRECATED_WHEN_ANNOUNCED}"`,
          `The shutdown table lists gpt-5.3-codex with replacement gpt-6-sol. It lists gpt-5.4-nano and snapshot gpt-5.4-nano-2026-03-17 with replacement gpt-6-luna. It lists gpt-5.1 and snapshot gpt-5.1-2025-11-13 with replacement gpt-6-sol. The plain-text alias list at the bottom of that page pairs gpt-5.4-nano with gpt-5.4-nano-2026-03-17, and gpt-5.1 with gpt-5.1-2025-11-13. Both strings in each pair shut down on ${APRIL_1_2027_SHUTDOWN_DATE}.`,
          `The gpt-5.1 model page says the default snapshot is gpt-5.1-2025-11-13. The gpt-5.4-nano model page says the default snapshot is gpt-5.4-nano-2026-03-17. The gpt-5.3-codex model page says the default snapshot is gpt-5.3-codex. That page does not list a second dated snapshot.`,
        ],
        table: {
          caption: `${rows.length} OpenAI ids with shutdown date ${APRIL_1_2027_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Ids that already shut down",
        paragraphs: [
          `gpt-5.1-chat-latest, gpt-5.1-codex, gpt-5.1-codex-max, and gpt-5.1-codex-mini are not in the table above. OpenAI's deprecations page says: "${JULY_23_NOTICE}" The July 23, 2026 table lists gpt-5.1-chat-latest, gpt-5.1-codex, and gpt-5.1-codex-max with substitute gpt-5.6-sol. It lists gpt-5.1-codex-mini with substitute gpt-5.6-terra. The stored shutdown date on those four rows is 2026-07-23.`,
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. OpenAI's deprecations page says: "${ACCESSIBLE}" The same page uses sunset and shut down for that moment. It does not print an HTTP status for it.`,
          "A 400 from a field the replacement rejects is a different failure. Those sentences are on the [request errors](/errors/) pages. This guide does not invent an error body for the shutdown itself.",
        ],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the alias and for the dated snapshot. gpt-5.1 and gpt-5.1-2025-11-13 can sit in different files. The same is true for gpt-5.4-nano and gpt-5.4-nano-2026-03-17. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "OpenAI's deprecations page says to call the List models endpoint, GET /v1/models, and read each model's optional shutdown_date field. When present, the field is a YYYY-MM-DD string, or null if no shutdown date has been announced. The same field is on the Retrieve a model endpoint.",
          "You can also read one id from the free SunsetDiff lookup file. [gpt-5.1](/api/v1/lookup/gpt-5.1.json) is one of these rows. The [API page](/api/) lists the other files. No key and no signup. The [alerts page](/alerts/) is the free email form. That page says what the form stores and the one welcome email it can send.",
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources: [{ label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS }],
      },
      {
        heading: "Change the model id",
        paragraphs: [
          `Send ${solLink} where the code now sends gpt-5.1, gpt-5.1-2025-11-13, or gpt-5.3-codex. Send ${lunaLink} where the code now sends gpt-5.4-nano or gpt-5.4-nano-2026-03-17. The deprecations page names those replacements. It does not name gpt-6.1-sol for this shutdown.`,
          "The gpt-5.1 model page lists Chat Completions (v1/chat/completions), Responses (v1/responses), and Batch (v1/batch) as supported. The gpt-5.4-nano model page lists the same three routes as supported. The gpt-5.3-codex model page lists Responses as supported. It lists Chat Completions and Batch as not supported. Keep a gpt-5.3-codex call on Responses.",
          "The gpt-6-sol model page lists Chat Completions, Responses, and Batch as supported. The gpt-6-luna model page lists the same three routes as supported. Both pages list fine-tuning (v1/fine-tuning) as not supported. The gpt-5.1, gpt-5.3-codex, and gpt-5.4-nano pages also list fine-tuning as not supported.",
        ],
        codes: [
          {
            caption: "gpt-5.1 and gpt-5.1-2025-11-13 on Chat Completions",
            code: `response = client.chat.completions.create(
    model="gpt-6-sol",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
          {
            caption: "gpt-5.3-codex on the Responses API",
            code: `response = client.responses.create(
    model="gpt-6-sol",
    input="Hello",
)
`,
          },
          {
            caption: "gpt-5.4-nano and gpt-5.4-nano-2026-03-17 on Chat Completions",
            code: `response = client.chat.completions.create(
    model="gpt-6-luna",
    messages=[{"role": "user", "content": "Hello"}],
)
`,
          },
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "gpt-5.1", url: OPENAI_GPT51 },
          { label: "gpt-5.3-codex", url: OPENAI_CODEX53 },
          { label: "gpt-5.4-nano", url: OPENAI_NANO54 },
          { label: "gpt-6-sol", url: OPENAI_GPT6_SOL },
          { label: "gpt-6-luna", url: OPENAI_GPT6_LUNA },
        ],
      },
      {
        heading: "Request fields that differ",
        paragraphs: [
          `The gpt-5.1 model page says: "${GPT51_EFFORT}" The gpt-5.4-nano model page says: "${NANO_EFFORT}" The gpt-5.3-codex model page says: "${CODEX_EFFORT}" That page does not name none, max, or a default.`,
          `The gpt-6-sol model page and the gpt-6-luna model page both say: "${SOL_EFFORT}" A gpt-5.1 or gpt-5.4-nano request that leaves effort unset uses none. The same omitted field on gpt-6-sol or gpt-6-luna uses medium. Set the effort you want. The Using GPT-6 page says: "${GPT6_EFFORT_FIELD}" It also says: "${GPT6_NONE}"`,
          `The gpt-6-sol model page and the gpt-6-luna model page both say: "${SOL_TOOLS}" The Using GPT-6 page says: "${GPT6_TOOLS}" A Chat Completions call that sends function tools sets reasoning_effort to none, or the call moves to the Responses API. The recorded error for gpt-6-luna is on [Function tools with reasoning_effort are not supported for gpt-6-luna](/errors/gpt-6-luna-function-tools-reasoning-effort/). The gpt-6-sol model page states the same rule. This guide does not invent an error sentence for gpt-6-sol.`,
          `The Using GPT-6 page says: "${GPT6_PARAMS}" The page for that temperature sentence is [temperature is not supported with this model](/errors/openai-temperature-is-not-supported-with-this-model/). gpt-6-sol and gpt-6-luna can keep temperature when reasoning effort is none.`,
          "The gpt-5.1 model page lists a 400,000 context window and 128,000 max output tokens. The gpt-5.3-codex and gpt-5.4-nano pages list a 400,000 context window, maximum input tokens 272,000, and 128,000 max output tokens. The gpt-6-sol and gpt-6-luna pages list a 1,050,000 context window, maximum input tokens 922,000, and 128,000 max output tokens.",
        ],
        codes: [
          {
            caption: "Chat Completions with reasoning_effort none",
            code: `response = client.chat.completions.create(
    model="gpt-6-luna",
    messages=[{"role": "user", "content": "Hello"}],
    reasoning_effort="none",
)
`,
          },
        ],
        sources: [
          { label: "gpt-5.1", url: OPENAI_GPT51 },
          { label: "gpt-5.3-codex", url: OPENAI_CODEX53 },
          { label: "gpt-5.4-nano", url: OPENAI_NANO54 },
          { label: "gpt-6-sol", url: OPENAI_GPT6_SOL },
          { label: "gpt-6-luna", url: OPENAI_GPT6_LUNA },
          { label: "Using GPT-6", url: OPENAI_USING_GPT6 },
        ],
      },
      {
        heading: "Prices on the model pages",
        paragraphs: [
          "The numbers below are the text token prices on each model page, per 1M tokens. The gpt-5.1 page covers the alias and lists snapshot gpt-5.1-2025-11-13. The gpt-5.4-nano page covers the alias and lists snapshot gpt-5.4-nano-2026-03-17. Those snapshot ids do not have a second price table on those pages.",
          `The gpt-6-sol page and the gpt-6-luna page both say: "${SOL_LONG_CONTEXT}" The gpt-5.4-nano page says: "${NANO_REGIONAL}" The gpt-6-sol page and the gpt-6-luna page both say: "${SOL_REGIONAL}"`,
        ],
        table: {
          caption: "Text token prices per 1M tokens from the model pages. Not listed means that page has no cache writes row.",
          headers: ["Model page", "Input", "Cached input", "Cache writes", "Output"],
          rows: [
            ["[gpt-5.1](/models/openai/gpt-5-1/)", "$1.25", "$0.125", "Not listed", "$10"],
            ["[gpt-5.3-codex](/models/openai/gpt-5-3-codex/)", "$1.75", "$0.175", "Not listed", "$14"],
            ["[gpt-5.4-nano](/models/openai/gpt-5-4-nano/)", "$0.2", "$0.02", "Not listed", "$1.25"],
            [solLink, "$2", "$0.2", "$2.5", "$10"],
            [lunaLink, "$0.1", "$0.01", "$0.125", "$0.5"],
          ],
        },
        sources: [
          { label: "gpt-5.1", url: OPENAI_GPT51 },
          { label: "gpt-5.3-codex", url: OPENAI_CODEX53 },
          { label: "gpt-5.4-nano", url: OPENAI_NANO54 },
          { label: "gpt-6-sol", url: OPENAI_GPT6_SOL },
          { label: "gpt-6-luna", url: OPENAI_GPT6_LUNA },
        ],
      },
      {
        heading: "Test checklist",
        paragraphs: [
          `OpenAI's deprecations page says the notice period is time to evaluate the recommended replacement, test application behavior, and finish the migration before the model is no longer available. Do this before ${when}.`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        bullets: [
          "Search the repository for gpt-5.1, gpt-5.1-2025-11-13, gpt-5.3-codex, gpt-5.4-nano, and gpt-5.4-nano-2026-03-17.",
          "Replace gpt-5.1, gpt-5.1-2025-11-13, and gpt-5.3-codex with gpt-6-sol.",
          "Replace gpt-5.4-nano and gpt-5.4-nano-2026-03-17 with gpt-6-luna.",
          "Keep a gpt-5.3-codex call on the Responses API. That model page lists Chat Completions as not supported.",
          "Set reasoning effort on the replacement. none on gpt-5.1 and gpt-5.4-nano becomes medium on gpt-6-sol and gpt-6-luna when the field is left unset.",
          "On Chat Completions with function tools, set reasoning_effort to none, or move the call to the Responses API.",
          "When reasoning effort is not none, remove temperature, top_p, and top_logprobs. On Chat Completions, also remove logprobs. On Responses, remove message.output_text.logprobs from include.",
          `Send one prompt you use now to the replacement id before ${when}.`,
          "Call GET /v1/models and read shutdown_date for each id you still send.",
        ],
        sources: [
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
          { label: "Using GPT-6", url: OPENAI_USING_GPT6 },
          { label: "gpt-6-sol", url: OPENAI_GPT6_SOL },
          { label: "gpt-6-luna", url: OPENAI_GPT6_LUNA },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/openai-2027-04-01/", label: `OpenAI shutdowns on ${when}` },
      { href: "/providers/openai/", label: "OpenAI provider page" },
      { href: "/models/openai/gpt-5-1/", label: "gpt-5.1" },
      { href: "/models/openai/gpt-5-1-2025-11-13/", label: "gpt-5.1-2025-11-13" },
      { href: "/models/openai/gpt-5-3-codex/", label: "gpt-5.3-codex" },
      { href: "/models/openai/gpt-5-4-nano/", label: "gpt-5.4-nano" },
      { href: "/models/openai/gpt-5-4-nano-2026-03-17/", label: "gpt-5.4-nano-2026-03-17" },
      { href: sol ? `/models/${sol.provider}/${sol.slug}/` : "/models/openai/gpt-6-sol/", label: "gpt-6-sol" },
      { href: luna ? `/models/${luna.provider}/${luna.slug}/` : "/models/openai/gpt-6-luna/", label: "gpt-6-luna" },
      { href: "/migrate/openai__gpt-5-1__to__openai__gpt-6-sol/", label: "gpt-5.1 to gpt-6-sol" },
      { href: "/migrate/openai__gpt-5-1-2025-11-13__to__openai__gpt-6-sol/", label: "gpt-5.1-2025-11-13 to gpt-6-sol" },
      { href: "/migrate/openai__gpt-5-3-codex__to__openai__gpt-6-sol/", label: "gpt-5.3-codex to gpt-6-sol" },
      { href: "/migrate/openai__gpt-5-4-nano__to__openai__gpt-6-luna/", label: "gpt-5.4-nano to gpt-6-luna" },
      { href: "/migrate/openai__gpt-5-4-nano-2026-03-17__to__openai__gpt-6-luna/", label: "gpt-5.4-nano-2026-03-17 to gpt-6-luna" },
      { href: "/errors/openai-temperature-is-not-supported-with-this-model/", label: "temperature is not supported with this model" },
      { href: "/errors/gpt-6-luna-function-tools-reasoning-effort/", label: "Function tools on gpt-6-luna when reasoning_effort is not none" },
      { href: "/guides/move-function-calling-to-responses-api/", label: "Move function calling to the Responses API" },
      { href: `/guides/${JANUARY_2027_GPT4_GUIDE_SLUG}/`, label: "GPT-4.1 and GPT-4o shutdown in January 2027" },
      { href: `/guides/${AZURE_APRIL14_GUIDE_SLUG}/`, label: "Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027" },
      { href: `/guides/${AZURE_JULY13_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027" },
      { href: `/guides/${AZURE_AUG24_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on August 24, 2027" },
      { href: `/guides/${FEBRUARY_26_TRANSCRIBE_GUIDE_SLUG}/`, label: "whisper-1 and GPT-4o transcribe shutdown on February 26, 2027" },
      { href: "/guides/model-aliases-vs-pinned-snapshots/", label: "Model aliases vs pinned snapshots" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/api/", label: "Free lookup API" },
      { href: "/alerts/", label: "Shutdown alerts signup" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${APRIL_1_2027_SHUTDOWN_DATE}. The deprecations page says: "${APRIL_NOTICE}"`,
      },
      {
        question: "What is the recommended replacement?",
        answer: `gpt-5.1, gpt-5.1-2025-11-13, and gpt-5.3-codex use gpt-6-sol. gpt-5.4-nano and gpt-5.4-nano-2026-03-17 use gpt-6-luna. ${replacementFaq(rows, catalog)}`,
      },
      {
        question: "Do gpt-5.1-chat-latest and the older Codex ids shut down on the same day?",
        answer: `Those ids are gpt-5.1-chat-latest, gpt-5.1-codex, gpt-5.1-codex-max, and gpt-5.1-codex-mini. Their stored shutdown date is 2026-07-23. The deprecations page says: "${JULY_23_NOTICE}" The substitute for gpt-5.1-chat-latest, gpt-5.1-codex, and gpt-5.1-codex-max is gpt-5.6-sol. The substitute for gpt-5.1-codex-mini is gpt-5.6-terra.`,
      },
      {
        question: "Is a model string swap enough?",
        answer: `The string change is gpt-6-sol or gpt-6-luna, matching the row. The gpt-5.1 page says: "${GPT51_EFFORT}" The gpt-6-sol page says: "${SOL_EFFORT}" Leaving effort unset changes none to medium. The Using GPT-6 page says: "${GPT6_PARAMS}" A gpt-5.3-codex call stays on the Responses API. That model page lists Chat Completions as not supported.`,
      },
      {
        question: "What does OpenAI say happens at shut down?",
        answer: `OpenAI's deprecations page says: "${ACCESSIBLE}" That page does not print an HTTP status for that moment.`,
      },
      {
        question: "Is a deprecation date stored?",
        answer: `No deprecation_date is stored on these rows. The deprecations section is dated 2026-10-01, and the dataset stores 2026-10-01 as announced_date. The page says: "${DEPRECATED_WHEN_ANNOUNCED}"`,
      },
    ],
    citations: [
      OPENAI_DEPRECATIONS,
      OPENAI_GPT51,
      OPENAI_CODEX53,
      OPENAI_NANO54,
      OPENAI_GPT6_SOL,
      OPENAI_GPT6_LUNA,
      OPENAI_USING_GPT6,
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
      { href: `/guides/${BEDROCK_NOV27_GUIDE_SLUG}/`, label: "Amazon Bedrock Claude 3 Haiku and Sonnet ca-central-1 shutdown on November 27, 2026" },
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

function bedrockNov27Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_NOV27_SHUTDOWN_DATE);
  const checked = BEDROCK_NOV27_CHECKED;
  const sept10Rows = catalog
    .filter((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-3-haiku-20240307-v1:0" && model.shutdown_date === "2026-09-10")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const nov13Rows = catalog
    .filter((model) => model.provider === "aws-bedrock" && model.id === "anthropic.claude-3-haiku-20240307-v1:0" && model.shutdown_date === BEDROCK_NOV13_SHUTDOWN_DATE)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
    { label: "Claude 3 Sonnet model card", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-sonnet.html" },
    { label: "Regional availability by models", url: BEDROCK_REGIONS },
  ];
  return {
    slug: BEDROCK_NOV27_GUIDE_SLUG,
    title: `Amazon Bedrock Claude 3 Haiku and Sonnet ca-central-1 shutdown on ${when} | SunsetDiff`,
    description: `Bedrock Claude 3 Haiku and Claude 3 Sonnet reach end of life on ${BEDROCK_NOV27_SHUTDOWN_DATE} in ca-central-1. This is a separate regional date from the November 13, 2026 shutdown in other Regions. Claude 3 Haiku already reached EOL on September 10, 2026 in another Region set.`,
    h1: `Amazon Bedrock Claude 3 Haiku and Sonnet ca-central-1 shutdown on ${when}`,
    summary: `The Bedrock ids in the dataset with shutdown date ${BEDROCK_NOV27_SHUTDOWN_DATE}, their ca-central-1 regional scope, and how this date differs from the November 13, 2026 and September 10, 2026 Claude 3 Haiku shutdowns.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_NOV27_SHUTDOWN_DATE}: Claude 3 Haiku and Claude 3 Sonnet. The lifecycle page lists this end of life only for ca-central-1. Claude 3 Haiku already reached end of life on September 10, 2026 in other Regions (including us-east-1), and reaches end of life on November 13, 2026 in a third Region set (ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1). The replacement field on both November 27 rows is empty. The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID.`,
    checked,
    steps: [
      {
        name: "Understand the regional scope",
        text: `This guide is only for ca-central-1. The November 27, 2026 date applies only to that Region. Other Regions use other dates for the same model ids. There is a separate [November 13, 2026 guide](/guides/${BEDROCK_NOV13_GUIDE_SLUG}/) for a different Region set.`,
      },
      {
        name: "Read the ids and verify your Region",
        text: `The first table shows every Bedrock id in the dataset whose shutdown date is ${BEDROCK_NOV27_SHUTDOWN_DATE}. Both rows say ca-central-1 in the Regions column. Calls from other Regions use other dates. Use ListFoundationModels or GetFoundationModel in ca-central-1 and read modelLifecycle before you treat another Region's later date as applying here.`,
      },
      {
        name: "Find hardcoded ids and hidden defaults",
        text: "Search your repository for the bare model ids. Also check SDK defaults, framework classifiers, orchestrators, and agent configs. A library can send an id you never wrote down. Claude 3 Haiku is a common default for cost-sensitive workloads.",
      },
      {
        name: "Swap the id and check the new request",
        text: "Put the id you will call into the modelId field. AWS does not name a replacement on the lifecycle page. On a newer Claude model, check temperature, top_p, and top_k before you assume the old request still works.",
      },
      {
        name: "Test before the date",
        text: `Call that id from ca-central-1 with the prompts you send now. Do that before ${when}. Claude 3 Haiku in the September 10, 2026 Regions is already past end of life.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down on November 27",
        paragraphs: [
          `These rows are every Amazon Bedrock model in the dataset with shutdown date ${BEDROCK_NOV27_SHUTDOWN_DATE}. Both are for ca-central-1. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. The replacement column is the official replacement stored on the row. Not published means the field is empty.`,
          `The lifecycle page says: "${BEDROCK_ONLY_DATES}" It also says: "${BEDROCK_REGION_SPLIT}" To check the Region you call, use ListFoundationModels or GetFoundationModel and read modelLifecycle.`,
          `The same page says: "${BEDROCK_MIGRATE}" The recommended replacement on each row is Not published because the stored replacements list is empty. This guide does not fill one in.`,
        ],
        table: {
          caption: `${rows.length} Bedrock model ids with shutdown date ${BEDROCK_NOV27_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
          rows: bedrockTable(rows, catalog),
        },
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "Claude 3 Haiku has three separate Region batches",
        paragraphs: [
          "Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0) uses one model id on three dataset rows, each with a different shutdown date and different Regions.",
          `September 10, 2026: already past. Includes us-east-1, us-west-2, and other major Regions. November 13, 2026: ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, sa-east-1. November 27, 2026 (this guide): ca-central-1 only.`,
          `The Claude 3 Haiku model card says: "${BEDROCK_HAIKU_NOW}" It then names ap-northeast-2, ap-south-1, ap-southeast-1, ca-central-1, eu-central-2, and sa-east-1 as still in Legacy (as of October 2026), and says: "${BEDROCK_HAIKU_LATER}"`,
          "The same card's sample code still sends anthropic.claude-3-haiku-20240307-v1:0 with region_name us-east-1. The card says that Region reached end of life on September 10, 2026.",
        ],
        table: sept10Rows.length || nov13Rows.length
          ? {
              caption: "Claude 3 Haiku rows in the dataset whose shutdown date is not November 27, 2026.",
              headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
              rows: bedrockTable([...sept10Rows, ...nov13Rows], catalog),
            }
          : undefined,
        sources: [
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Claude 3 Sonnet on November 13 and November 27",
        paragraphs: [
          "Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0) uses one model id on two dataset rows. The November 13, 2026 row lists ap-south-1, ap-southeast-1, and eu-west-2. The November 27, 2026 row (this guide) lists only ca-central-1.",
          `The lifecycle page says: "${BEDROCK_REGION_SPLIT}" If you call Claude 3 Sonnet from ca-central-1, the November 27 date applies. If you call it from ap-south-1, the November 13 date applies. See the [November 13, 2026 guide](/guides/${BEDROCK_NOV13_GUIDE_SLUG}/) for the other batch.`,
        ],
        sources: [
          { label: "Claude 3 Sonnet model card", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-sonnet.html" },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `The lifecycle page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name.`,
          `The Claude 3 Haiku model card does. It says requests in most Regions now fail with ${BEDROCK_EOL_ERROR} The full page is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/). The September 10, 2026 Haiku Regions are already past end of life. The November 13 and November 27 rows are still ahead.`,
          `While a model is Legacy, the lifecycle page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
        ],
        sources,
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the bare ids in the tables. A hit is a candidate, not proof the call still runs from ca-central-1. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          "Also look where an SDK, a framework classifier, an orchestrator, or an agent config sets a model id when you do not. A default is easy to miss because the string is not in your own config. Claude 3 Haiku is a common default for fast, cost-effective requests.",
        ],
        codes: [{
          caption: "ripgrep, dataset ids with November 27 shutdown",
          code: bedrockSearch(rows.map((model) => model.id)),
        }],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
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
          `The lifecycle page tells you to update application code before the EOL date. It does not name the id to send. Pick the id you will call, then send one real prompt from ca-central-1 before ${when}. Read modelLifecycle in that Region first.`,
          "For Claude 3 Haiku in the September 10, 2026 Regions, that date has passed. The model card says requests there now fail with the exception above.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Bedrock rows do not store a price.",
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Claude 3 Haiku model card", url: BEDROCK_HAIKU_CARD },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/aws-bedrock-2026-11-27/", label: `Bedrock shutdowns on ${when}` },
      { href: `/guides/${BEDROCK_NOV13_GUIDE_SLUG}/`, label: "Amazon Bedrock Claude 3 shutdown on November 13, 2026" },
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
        question: `Which Bedrock model ids reach end of life on ${when} in ca-central-1?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${BEDROCK_NOV27_SHUTDOWN_DATE}. Both rows say ca-central-1 in the Regions column. This date is specific to ca-central-1. Other Regions use other dates for the same model ids.`,
      },
      {
        question: "How does November 27 differ from November 13, 2026?",
        answer: `November 27, 2026 is ca-central-1 only. November 13, 2026 is a different batch: ap-northeast-2, ap-south-1, ap-southeast-1, eu-central-2, and sa-east-1 for Claude 3 Haiku; ap-south-1, ap-southeast-1, and eu-west-2 for Claude 3 Sonnet. The lifecycle page says: "${BEDROCK_REGION_SPLIT}" See the [November 13, 2026 guide](/guides/${BEDROCK_NOV13_GUIDE_SLUG}/) for that batch.`,
      },
      {
        question: "When did Claude 3 Haiku reach end of life in other Regions?",
        answer: `Claude 3 Haiku already reached end of life on September 10, 2026 in another Region set, including us-east-1, us-west-2, and ap-northeast-1. The Claude 3 Haiku model card says requests in those Regions now fail with ${BEDROCK_EOL_ERROR}`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `Not published. ${replacementFaq(rows, catalog)} The lifecycle page says: "${BEDROCK_MIGRATE}" It does not name a model ID.`,
      },
      {
        question: "What error does Bedrock return after end of life?",
        answer: `The Claude 3 Haiku model card says requests in Regions past end of life now fail with ${BEDROCK_EOL_ERROR} The full page is [This model version has reached the end of its life](/errors/bedrock-model-version-has-reached-the-end-of-its-life/). The lifecycle page says requests fail after the EOL date and does not print that exception.`,
      },
      {
        question: "What should I check besides the model id?",
        answer: `On claude-sonnet-5-5, a non-default temperature, top_p, or top_k returns HTTP 400. See [temperature is deprecated for this model](/errors/claude-temperature-is-deprecated-for-this-model/). API version 2026-10-21 rejects those three fields on every model, even at the default. The versioning page says: "${BEDROCK_VERSIONING}" See [API version 2026-10-21 sampling parameters](/errors/claude-api-2026-10-21-sampling-params-400/).`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_HAIKU_CARD,
      "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-sonnet.html",
      BEDROCK_REGIONS,
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
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_JAMBA_NOV26_SHUTDOWN_DATE}: ai21.jamba-1-5-large-v1:0 and ai21.jamba-1-5-mini-v1:0. The legacy lifecycle page lists both as Legacy in us-east-1, with legacy date May 26, 2026, EOL date November 26, 2026, and public extended access start date August 26, 2026. It says: "${JAMBA_LEGACY_INTRO}" It does not name a model ID. See [/shutdowns/aws-bedrock-2026-11-26/](/shutdowns/aws-bedrock-2026-11-26/) for the batch page.`,
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
        heading: "Shutdown batch page",
        paragraphs: [
          `[/shutdowns/aws-bedrock-2026-11-26/](/shutdowns/aws-bedrock-2026-11-26/) lists both Jamba ids. [/shutdowns/aws-bedrock-2026-11-13/](/shutdowns/aws-bedrock-2026-11-13/) is the Claude 3 batch. It is not this Jamba date.`,
          `A not-sooner-than date is a floor, so it does not get a batch page. Anthropic's deprecations table lists claude-opus-4-5-20251101 as Active, with Deprecated N/A and tentative retirement not sooner than November 24, 2026. The deprecation history on that page does not name a replacement, so there is no /shutdowns/anthropic-2026-11-24/ page. The walkthrough is [Claude Opus 4.5 will not shut down before November 24, 2026](/guides/${OPUS45_GUIDE_SLUG}/).`,
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
        question: "Is there a /shutdowns/aws-bedrock-2026-11-26/ page?",
        answer: `Yes. [/shutdowns/aws-bedrock-2026-11-26/](/shutdowns/aws-bedrock-2026-11-26/) lists both Jamba ids: ai21.jamba-1-5-large-v1:0 and ai21.jamba-1-5-mini-v1:0.`,
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

const BEDROCK_MARENGO_CARD = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-twelvelabs-marengo-embed-v2-7.html";
const BEDROCK_MARENGO_PARAMS = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-marengo.html";
const BEDROCK_MARENGO3_PARAMS = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-marengo-3.html";
const MARENGO_CARD_BLURB = "Marengo Embed v2.7 is TwelveLabs' video embedding model for multimodal video understanding, search, and classification.";
const MARENGO_EOL_LABEL = "Model EOL date: November 30, 2026";
const MARENGO_LEGACY_LABEL = "Model lifecycle: Legacy";
const MARENGO_LAUNCH = "Model launch date: Dec 4, 2024";
const MARENGO_FLOOR = "EOL no sooner than: Dec 4, 2025";
const MARENGO_ID_NOTE =
  "The model ID to use depends on the API. StartAsyncInvoke takes the base model ID, twelvelabs.marengo-embed-2-7-v1:0, as shown in the Sample Code section; passing a Geo inference ID to StartAsyncInvoke returns a validation error. The Geo inference IDs apply to synchronous InvokeModel requests, which don't accept the base model ID for this model.";
const MARENGO_QUERY = "Use InvokeModel to generate embeddings for search query. Use StartAsyncInvoke to generate embeddings for assets at a large scale.";
const MARENGO3_IMPORTANT =
  "TwelveLabs Marengo Embed 2.7 will be deprecated. Embeddings that you created with TwelveLabs Marengo Embed 2.7 are NOT compatible with TwelveLabs Marengo Embed 3.0. You must regenerate all embeddings with TwelveLabs Marengo Embed 3.0.";
const MARENGO3_MIGRATE = "To migrate from TwelveLabs Marengo Embed 2.7 to TwelveLabs Marengo Embed 3.0, complete the following steps.";
const MARENGO_PRICE =
  "This model is a third-party model offered and billed through AWS Marketplace. Charges appear on your AWS bill and in AWS Cost Explorer under the model provider (not under Amazon Bedrock).";
const MARENGO_US_GEO = "us.twelvelabs.marengo-embed-2-7-v1:0";
const MARENGO_EU_GEO = "eu.twelvelabs.marengo-embed-2-7-v1:0";

function marengoNov30Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE);
  const row = rows.find((model) => model.id === MARENGO_V27_ID);
  const newer = catalog.find((model) => model.provider === "aws-bedrock" && model.id === MARENGO_V30_ID);
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
    { label: "TwelveLabs Marengo Embed 2.7 parameters", url: BEDROCK_MARENGO_PARAMS },
    { label: "TwelveLabs Marengo Embed 3.0 parameters", url: BEDROCK_MARENGO3_PARAMS },
    { label: "Regional availability by models", url: BEDROCK_REGIONS },
  ];
  return {
    slug: BEDROCK_MARENGO_NOV30_GUIDE_SLUG,
    title: `Amazon Bedrock Marengo Embed v2.7 shutdown on ${when} | SunsetDiff`,
    description: `${MARENGO_V27_ID} reaches end of life on ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE} in ap-northeast-2, eu-west-1, and us-east-1. The legacy lifecycle table does not name a replacement model ID.`,
    h1: `Amazon Bedrock Marengo Embed v2.7 shutdown on ${when}`,
    summary: `The Bedrock id with shutdown date ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE}, the Regions on that lifecycle row, and the Marengo Embed 3.0 parameters page that is not a replacement cell on the lifecycle table.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock id with shutdown date ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE}: ${MARENGO_V27_ID}. The legacy lifecycle page lists TwelveLabs Marengo Embed v2.7 as Legacy in ap-northeast-2, eu-west-1, and us-east-1, with legacy date May 29, 2026, EOL date November 30, 2026, and public extended access start date August 29, 2026. The model card says "${MARENGO_LEGACY_LABEL}" and "${MARENGO_EOL_LABEL}". The lifecycle table does not name a replacement. The Marengo Embed 3.0 parameters page says: "${MARENGO3_MIGRATE}" It tells you to update the model ID to ${MARENGO_V30_ID}. That same lifecycle table lists Marengo Embed 3.0 as its own Legacy row, EOL date March 22, 2027, in ap-northeast-2. See [/shutdowns/aws-bedrock-2026-11-30/](/shutdowns/aws-bedrock-2026-11-30/) for the Marengo batch page. Claude Sonnet 4.5 on the Claude API is a different provider and a different guide.`,
    checked: MARENGO_CHECKED,
    steps: [
      {
        name: "Read the id and the Regions",
        text: `The table lists ${MARENGO_V27_ID}. The stored Regions note is ap-northeast-2, eu-west-1, and us-east-1. Open the model page before you change a call. A Region that is not on the lifecycle row is not covered by this date.`,
      },
      {
        name: "Search for the base id and the geo ids",
        text: `Search for ${MARENGO_V27_ID}, ${MARENGO_US_GEO}, and ${MARENGO_EU_GEO}. The model card says StartAsyncInvoke takes the base id, and a geo id on that call returns a validation error. InvokeModel uses a geo id.`,
      },
      {
        name: "Read the Marengo Embed 3.0 page before you change the id",
        text: `The lifecycle table does not name a replacement, so the stored replacement is Not published. The Marengo Embed 3.0 parameters page tells you to set the model ID to ${MARENGO_V30_ID} and to regenerate embeddings. That id is also Legacy, with EOL date March 22, 2027 in ap-northeast-2. This guide does not write it into the replacement field.`,
      },
      {
        name: "Leave the Claude API id on its own guide",
        text: `claude-sonnet-4-5-20250929 also uses November 30, 2026, on Anthropic's deprecations page. That is not this Bedrock id. Follow [Claude Sonnet 4.5 shutdown on November 30, 2026](/guides/${SONNET45_NOV30_GUIDE_SLUG}/) for the Claude API. Call GetFoundationModel or ListFoundationModels in the Region you use and read modelLifecycle before ${when}.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are the Amazon Bedrock models in the dataset with shutdown date ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. The replacement column is the official replacement stored on the row. Not published means the field is empty.`,
          `The model card says: "${MARENGO_CARD_BLURB}" It also lists "${MARENGO_LAUNCH}", "${MARENGO_FLOOR}", "${MARENGO_LEGACY_LABEL}", and "${MARENGO_EOL_LABEL}". The older floor is not the announced EOL. The announced EOL on the card and on the legacy table is November 30, 2026.`,
          `The current lifecycle policy page says: "${JAMBA_POLICY_SPLIT}" The model card points at the legacy policy. That page says: "${BEDROCK_ONLY_DATES}" The legacy table says: "${JAMBA_LEGACY_INTRO}" The stored replacements list is empty. This guide does not fill one in.`,
        ],
        table: {
          caption: `${rows.length} Bedrock model id with shutdown date ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Recommended replacement"],
          rows: bedrockTable(rows, catalog),
        },
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Amazon Bedrock model lifecycle", url: BEDROCK_POLICY },
          { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
        ],
      },
      {
        heading: "Dates on the legacy table and the model card",
        paragraphs: [
          "The legacy lifecycle table lists one row for this id. Public extended access start date is not a field on the dataset row. It is a column on that table.",
          `The model card lists "${MARENGO_LEGACY_LABEL}" and "${MARENGO_EOL_LABEL}". It also lists "${MARENGO_FLOOR}". That older floor is not the announced EOL.`,
        ],
        table: {
          caption: "Dates printed on the legacy lifecycle table for this id.",
          headers: ["Model id", "Regions", "Legacy date", "EOL date", "Public extended access start"],
          rows: [
            [row ? modelLink(row) : MARENGO_V27_ID, "ap-northeast-2, eu-west-1, us-east-1", "May 29, 2026", BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE, "August 29, 2026"],
          ],
        },
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
        ],
      },
      {
        heading: "Regions, geo ids, and which API takes which id",
        paragraphs: [
          `The lifecycle page says: "${BEDROCK_REGION_SPLIT}" The Regions cell for this row is ap-northeast-2, eu-west-1, and us-east-1. To check the Region you call, use ListFoundationModels or GetFoundationModel and read modelLifecycle.`,
          "The regional availability page lists Marengo Embed v2.7 in us-east-1 and eu-west-1. Both rows mark In-Region no, Geo yes, and Global no. That table does not list ap-northeast-2. The model card's regional table lists the same two Regions with the same marks.",
          `The model card prints geo inference ID ${MARENGO_US_GEO} for source Region us-east-1, with destination Regions us-east-1, us-east-2, us-west-1, and us-west-2. It prints ${MARENGO_EU_GEO} for source Region eu-west-1, with destination Regions eu-central-1, eu-north-1, eu-south-1, eu-south-2, eu-west-1, and eu-west-3. Global inference ID is Not supported. Those destination Regions are what the card prints. They are not extra EOL Regions.`,
          `The model card says: "${MARENGO_ID_NOTE}" The parameters page says: "${MARENGO_QUERY}"`,
          "The model card's API column marks StartAsyncInvoke supported. It marks Responses, Chat Completions, Invoke, and Converse not supported. The endpoints column marks bedrock-runtime supported and bedrock-mantle not supported. The parameters page documents InvokeModel for inference profiles, with text and image input, and StartAsyncInvoke for the base model, with video, audio, image, and text input. This guide does not pick which page wins.",
          "The model card marks these inputs supported: image, speech, text, and video. It marks audio input not supported. Output is embedding. The parameters page lists audio as an input for StartAsyncInvoke and does not say speech. Read both pages before you send a modality the other page omits.",
        ],
        table: {
          caption: "Ids the Marengo Embed v2.7 model card and parameters page print.",
          headers: ["Call", "Model id", "What the page says"],
          rows: [
            ["StartAsyncInvoke", MARENGO_V27_ID, "Base model id. A geo id returns a validation error. The card does not print the error sentence."],
            ["InvokeModel", `${MARENGO_US_GEO} or ${MARENGO_EU_GEO}`, "Geo inference id. The card says these calls do not accept the base model id."],
            ["Global", "Not supported", "The model card's global inference ID cell."],
          ],
        },
        sources: sources.filter((source) => source.url !== BEDROCK_MARENGO3_PARAMS),
      },
      {
        heading: "Input limits on the parameters page",
        paragraphs: [
          `The parameters page says: "${MARENGO_QUERY}" It prints these input maxima. It does not print a token price.`,
          `The model card says: "${MARENGO_PRICE}" It points at Amazon Bedrock pricing and does not print a number. This guide does not invent one.`,
        ],
        table: {
          caption: "Input maxima on the TwelveLabs Marengo Embed 2.7 parameters page.",
          headers: ["Input", "Maximum"],
          rows: [
            ["Text", "77 tokens"],
            ["Image", "5 MB"],
            ["Video (S3)", "2 GB"],
            ["Audio (S3)", "2 GB"],
          ],
        },
        sources: [
          { label: "TwelveLabs Marengo Embed 2.7 parameters", url: BEDROCK_MARENGO_PARAMS },
          { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
        ],
      },
      {
        heading: "Marengo Embed 3.0 is not the lifecycle-table replacement",
        paragraphs: [
          `The legacy table has no replacement column. ${replacementFaq(rows, catalog)} The page says: "${BEDROCK_MIGRATE}" It does not name ${MARENGO_V30_ID} on the Marengo Embed v2.7 row.`,
          `A different page, TwelveLabs Marengo Embed 3.0, has the heading "Migrate from TwelveLabs Marengo Embed 2.7 to TwelveLabs Marengo Embed 3.0". It says: "${MARENGO3_IMPORTANT}" It also says: "${MARENGO3_MIGRATE}" Step 2 on that page is: Update the model ID to ${MARENGO_V30_ID}.`,
          "That page says the input is nested by inputType. embeddingOption values on the 2.7 examples are visual-text, visual-image, and audio. On the 3.0 examples they are visual, audio, and transcription. It says a text_image input type is new and is not supported on Marengo Embed 2.7. It says the embedding dimension is reduced from 1024 to 512. Text maximum on that page is 500 tokens. Video and audio maximums are 6 GB and 4 hours. The 2.7 page lists 77 text tokens, 2 GB video, and 2 GB audio.",
          `The same legacy table lists Marengo Embed 3.0 as Legacy, model ID ${MARENGO_V30_ID}, Region ap-northeast-2, legacy date September 22, 2026, EOL date March 22, 2027. The public extended access start date cell on that row is a dash, not a date. The lifecycle page says to migrate to an Active model. Marengo Embed 3.0 is not Active on that table.${newer ? ` The stored row is ${modelLink(newer)}, shutdown date ${newer.shutdown_date ?? "Not published"}, replacements ${newer.replacements.length === 0 ? "empty" : "stored"}.` : ""} This guide links that model page as related. It does not store ${MARENGO_V30_ID} as the official replacement.`,
          "The regional availability page lists Marengo Embed 3.0 in us-east-1 (In-Region yes, Geo yes, Global no), eu-west-1 (In-Region no, Geo yes, Global no), and ap-northeast-2 (In-Region yes, Geo no, Global no). The parameters page says InvokeModel is base models and inference profiles in US East (N. Virginia), inference profiles in Europe (Ireland), and base models in Asia Pacific (Seoul). It says StartAsyncInvoke is base models in those three places. The lifecycle EOL row for 3.0 names only ap-northeast-2. This guide does not copy March 22, 2027 onto us-east-1 or eu-west-1.",
        ],
        codes: [
          {
            caption: "Text input the Marengo Embed 3.0 page prints for 2.7, then for 3.0",
            code: `{
  "inputType": "text",
  "inputText": "your-text",
  "embeddingOption": "visual-text"
}

{
  "inputType": "text",
  "text": { "inputText": "your-text" },
  "embeddingOption": "visual"
}
`,
          },
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "TwelveLabs Marengo Embed 3.0 parameters", url: BEDROCK_MARENGO3_PARAMS },
          { label: "TwelveLabs Marengo Embed 2.7 parameters", url: BEDROCK_MARENGO_PARAMS },
          { label: "Regional availability by models", url: BEDROCK_REGIONS },
        ],
      },
      {
        heading: "Public extended access",
        paragraphs: [
          `The legacy page says: "${JAMBA_EXTENDED}" The table lists August 29, 2026 as the public extended access start date for ${MARENGO_V27_ID}. The page says pricing in that period is set by the model provider. It does not print a price for this id.`,
          `While a model is Legacy, the same page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
        ],
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "What breaks",
        paragraphs: [
          `On ${when} the lifecycle row reaches its EOL date in the Regions on that row. The legacy page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name or an error sentence.`,
          "The Marengo Embed v2.7 model card does not print an exception name for the EOL date. The only error words on that card are for a different mistake: a geo inference ID passed to StartAsyncInvoke returns a validation error. The card does not print that error sentence. This guide does not invent one, and it does not copy another model's end-of-life exception onto this id.",
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
        ],
      },
      {
        heading: "Same calendar day, different provider",
        paragraphs: [
          `November 30, 2026 is also the retirement date Anthropic lists for claude-sonnet-4-5-20250929 on the Claude API. That guide is [Claude Sonnet 4.5 shutdown on November 30, 2026](/guides/${SONNET45_NOV30_GUIDE_SLUG}/). The recommended replacement on Anthropic's page is claude-sonnet-5-5. That replacement is not a Bedrock Marengo id.`,
          "Bedrock's own Claude Sonnet 4.5 id, anthropic.claude-sonnet-4-5-20250929-v1:0, is a third date. The legacy table lists EOL date April 8, 2027 for that id. Do not move a Marengo caller because of the Claude API date, and do not move a Claude caller because of the Marengo row.",
        ],
        sources: [
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Shutdown batch pages",
        paragraphs: [
          `[/shutdowns/aws-bedrock-2026-11-30/](/shutdowns/aws-bedrock-2026-11-30/) lists the Marengo Embed v2.7 record. [/shutdowns/anthropic-2026-11-30/](/shutdowns/anthropic-2026-11-30/) lists the Claude Sonnet 4.5 record on the Anthropic API. These are different providers. [/shutdowns/aws-bedrock-2026-11-13/](/shutdowns/aws-bedrock-2026-11-13/) is the Claude 3 batch. It is not this Marengo date.`,
        ],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Anthropic model deprecations", url: CLAUDE_DEPRECATIONS },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the base id and both geo ids. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date. The geo ids are not their own dataset rows. Search for them separately.",
          `If you follow the Marengo Embed 3.0 page, also search for ${MARENGO_V30_ID}. Regenerate stored embeddings. The 3.0 page says 2.7 embeddings are not compatible with 3.0. Then send one real call from the Region you use, before ${when}. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list. These rows do not store a price.`,
        ],
        codes: [{
          caption: "ripgrep",
          code: `rg -n -e '${MARENGO_V27_ID}' -e '${MARENGO_US_GEO}' -e '${MARENGO_EU_GEO}' -e '${MARENGO_V30_ID}'\n`,
        }],
        sources: [
          { label: "Marengo Embed v2.7 model card", url: BEDROCK_MARENGO_CARD },
          { label: "TwelveLabs Marengo Embed 3.0 parameters", url: BEDROCK_MARENGO3_PARAMS },
        ],
      },
    ],
    related: [
      { href: row ? `/models/${row.provider}/${row.slug}/` : "/models/aws-bedrock/twelvelabs-marengo-embed-2-7-v1-0/", label: "Marengo Embed v2.7" },
      { href: newer ? `/models/${newer.provider}/${newer.slug}/` : "/models/aws-bedrock/twelvelabs-marengo-embed-3-0-v1-0/", label: "Marengo Embed 3.0" },
      { href: "/providers/aws-bedrock/", label: "Amazon Bedrock provider page" },
      { href: `/guides/${SONNET45_NOV30_GUIDE_SLUG}/`, label: "Claude Sonnet 4.5 shutdown on November 30, 2026" },
      { href: "/shutdowns/aws-bedrock-2026-11-13/", label: "Bedrock Claude shutdowns on November 13, 2026" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Bedrock model id reaches end of life on ${when}?`,
        answer: `The dataset lists ${MARENGO_V27_ID} with shutdown date ${BEDROCK_MARENGO_NOV30_SHUTDOWN_DATE}. The legacy lifecycle page lists that id in ap-northeast-2, eu-west-1, and us-east-1. The model card says "${MARENGO_EOL_LABEL}" and "${MARENGO_LEGACY_LABEL}".`,
      },
      {
        question: "Does November 30, 2026 apply in every AWS Region?",
        answer: `The legacy page says: "${BEDROCK_REGION_SPLIT}" The Regions cell is ap-northeast-2, eu-west-1, and us-east-1. The regional availability page lists this model in us-east-1 and eu-west-1 only, both as Geo yes and In-Region no. It does not list ap-northeast-2.`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `Not published. ${replacementFaq(rows, catalog)} The legacy page says: "${JAMBA_LEGACY_INTRO}" It also says: "${BEDROCK_MIGRATE}" Neither sentence names a model ID on this row.`,
      },
      {
        question: "Does AWS tell you to move to Marengo Embed 3.0?",
        answer: `The Marengo Embed 3.0 parameters page says: "${MARENGO3_MIGRATE}" It says to update the model ID to ${MARENGO_V30_ID}, and that 2.7 embeddings are not compatible with 3.0. The legacy lifecycle table does not name that id as the replacement. It lists ${MARENGO_V30_ID} as Legacy, with EOL date March 22, 2027, in ap-northeast-2. The stored replacement on the v2.7 row stays empty.`,
      },
      {
        question: "What error does Bedrock return after this end of life?",
        answer: "The legacy page says requests made to this version will fail. It does not print an exception name or an error sentence. The Marengo Embed v2.7 model card does not print one for the EOL date. This page does not invent one.",
      },
      {
        question: "Is there a /shutdowns/aws-bedrock-2026-11-30/ page?",
        answer: `Yes. [/shutdowns/aws-bedrock-2026-11-30/](/shutdowns/aws-bedrock-2026-11-30/) lists the ${MARENGO_V27_ID} record.`,
      },
      {
        question: "Is this the same shutdown as Claude Sonnet 4.5?",
        answer: `No. claude-sonnet-4-5-20250929 retires on the Claude API on the same calendar day. That page is [Claude Sonnet 4.5 shutdown on November 30, 2026](/guides/${SONNET45_NOV30_GUIDE_SLUG}/). Bedrock's Claude Sonnet 4.5 id has EOL date April 8, 2027 on the legacy table. Marengo Embed v2.7 is a TwelveLabs embedding model.`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_POLICY,
      BEDROCK_MARENGO_CARD,
      BEDROCK_MARENGO_PARAMS,
      BEDROCK_MARENGO3_PARAMS,
      BEDROCK_REGIONS,
      CLAUDE_DEPRECATIONS,
    ],
  };
}

const BEDROCK_MODELS = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html";
const CARD_DEEPSEEK_R1 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-deepseek-deepseek-r1.html";
const CARD_DEEPSEEK_V31 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-deepseek-deepseek-v3-1.html";
const CARD_DEEPSEEK_V32 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-deepseek-deepseek-v3-2.html";
const CARD_LLAMA33 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-3-70b-instruct.html";
const CARD_LLAMA3170 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-1-70b-instruct.html";
const CARD_LLAMA318 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-1-8b-instruct.html";
const CARD_LLAMA370 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-70b-instruct.html";
const CARD_LLAMA38 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-8b-instruct.html";
const CARD_MAVERICK = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-4-maverick-17b-instruct.html";
const CARD_SCOUT = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-4-scout-17b-instruct.html";
const CARD_GEMMA4_31 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-google-gemma-4-31b.html";
const CARD_GEMMA4_26 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-google-gemma-4-26b-a4b.html";
const CARD_GEMMA4_E2B = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-google-gemma-4-e2b.html";
const CARD_M25 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-minimax-minimax-m2-5.html";
const CARD_MISTRAL_LARGE3 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-mistral-large-3.html";
const CARD_MINISTRAL14 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-ministral-14b-3-0.html";
const CARD_MINISTRAL8 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-ministral-3-8b.html";
const CARD_MINISTRAL3 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-ministral-3b.html";
const CARD_MAGISTRAL = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-magistral-small-2509.html";
const CARD_KIMI = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k2-thinking.html";
const CARD_KIMI25 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k2-5.html";
const CARD_KIMI3 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html";
const CARD_NANO12 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-nvidia-nvidia-nemotron-nano-12b-v2-vl-bf16.html";
const CARD_NANO9 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-nvidia-nvidia-nemotron-nano-9b-v2.html";
const CARD_NANO3 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-nvidia-nemotron-nano-3-30b.html";
const CARD_SUPER = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-nvidia-nemotron-super-3-120b.html";
const CARD_QWEN30 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-coder-30b-a3b-instruct.html";
const CARD_QWEN480 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-coder-480b-a35b-instruct.html";
const CARD_CODER_NEXT = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-coder-next.html";
const CARD_GLM47 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-4-7.html";
const CARD_GLM_FLASH = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-4-7-flash.html";
const CARD_GLM5 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-5.html";
const CARD_GLM53 = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-5-3.html";
const GEMMA4_MANTLE = "Gemma 4 models are available only on the bedrock-mantle endpoint.";
const MAR30_GEO: [string, string, string, string][] = [
  ["deepseek.r1-v1:0", "bedrock-runtime", "us.deepseek.r1-v1:0", "Not supported"],
  ["meta.llama3-1-70b-instruct-v1:0", "bedrock-runtime", "us.meta.llama3-1-70b-instruct-v1:0", "Not supported"],
  ["meta.llama3-1-8b-instruct-v1:0", "bedrock-runtime", "us.meta.llama3-1-8b-instruct-v1:0", "Not supported"],
  ["meta.llama3-3-70b-instruct-v1:0", "bedrock-runtime", "us.meta.llama3-3-70b-instruct-v1:0", "Not supported"],
  ["meta.llama4-maverick-17b-instruct-v1:0", "bedrock-runtime", "us.meta.llama4-maverick-17b-instruct-v1:0", "Not supported"],
  ["meta.llama4-scout-17b-instruct-v1:0", "bedrock-runtime", "us.meta.llama4-scout-17b-instruct-v1:0", "Not supported"],
  ["nvidia.nemotron-nano-12b-v2", "bedrock-runtime", "us-gov.nvidia.nemotron-nano-12b-v2", "Not supported"],
  ["nvidia.nemotron-nano-9b-v2", "bedrock-runtime", "us-gov.nvidia.nemotron-nano-9b-v2", "Not supported"],
];

function mar30Table(rows: ModelRecord[], catalog: ModelRecord[]): string[][] {
  return rows.map((model) => {
    const official = replacementText(model, catalog);
    return [
      modelLink(model),
      deprecationCell(model),
      shutdownCell(model),
      model.region_or_platform_notes ?? "Not published",
      official === "Not published" ? "no official replacement" : official,
    ];
  });
}

function bedrockMar30Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(BEDROCK_MAR30_SHUTDOWN_DATE);
  const linkFor = (id: string) => {
    const model = rows.find((item) => item.id === id);
    return model ? modelLink(model) : id;
  };
  const sources = [
    { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
    { label: "Amazon Bedrock model lifecycle", url: BEDROCK_POLICY },
    { label: "Models at a glance", url: BEDROCK_MODELS },
  ];
  return {
    slug: BEDROCK_MAR30_GUIDE_SLUG,
    title: `Amazon Bedrock open-weight models shutdown on ${when} | SunsetDiff`,
    description: `${rows.length} Amazon Bedrock model ids reach end of life on ${BEDROCK_MAR30_SHUTDOWN_DATE}. AWS does not name a replacement model ID. Requests fail after that date.`,
    h1: `Amazon Bedrock open-weight models shutdown on ${when}`,
    summary: `The ${rows.length} Bedrock ids in the dataset with shutdown date ${BEDROCK_MAR30_SHUTDOWN_DATE}, the fact that AWS does not name a replacement, and the geo ids the model cards print.`,
    answer: `The dataset has ${rows.length} Amazon Bedrock ids with shutdown date ${BEDROCK_MAR30_SHUTDOWN_DATE}. The legacy lifecycle page lists each one as Legacy, with legacy date September 30, 2026, EOL date March 30, 2027, and public extended access start date To be announced. The page does not use the words open-weight. It says: "${JAMBA_LEGACY_INTRO}" It does not name a model ID. It also says: "${BEDROCK_FAIL}"`,
    checked: BEDROCK_MAR30_CHECKED,
    steps: [
      {
        name: "Read the ids and the Regions",
        text: `The table lists every Bedrock id in the dataset whose shutdown date is ${BEDROCK_MAR30_SHUTDOWN_DATE}. The Regions column is the note stored from the lifecycle page. A Region that is not on that row is not covered by this date. Open the model page before you change a call.`,
      },
      {
        name: "Find bare ids and prefixed ids",
        text: "Search the repository for the bare model ids and for the geo ids in the cross-Region table. Also check SDK defaults, agent configs, and notebooks. A us. or us-gov. prefix is a different string from the bare id.",
      },
      {
        name: "Change modelId yourself",
        text: `The lifecycle page says to update application code before ${when}. It does not name the id to send. On the Converse API, that string is the modelId argument. A same-family Active id later in this guide is not an AWS recommendation.`,
      },
      {
        name: "Test the call you will keep",
        text: `Call the id you chose from the Region you use, with a prompt you send now, before ${when}. Call GetFoundationModel or ListFoundationModels in that Region and read modelLifecycle first.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Amazon Bedrock model in the dataset with shutdown date ${BEDROCK_MAR30_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. The Legacy date column is the deprecation_date stored on the row. The Regions column is region_or_platform_notes. The last column is the official replacement stored on the row. no official replacement means that list is empty.`,
          `The current lifecycle policy page says: "${JAMBA_POLICY_SPLIT}" These rows are on the legacy page. That page says: "${BEDROCK_ONLY_DATES}" It also says: "${BEDROCK_REGION_SPLIT}"`,
          `The legacy table says: "${JAMBA_LEGACY_INTRO}" Every stored replacements list on these rows is empty. AWS did not name a replacement. This guide does not write one into the dataset.`,
          "The lifecycle page names one DeepSeek-V3.1 row with two ids: deepseek.v3-v1:0 on bedrock-runtime and deepseek.v3.1 on bedrock-mantle. It does the same for Kimi K2 Thinking (moonshot.kimi-k2-thinking on bedrock-runtime, moonshotai.kimi-k2-thinking on bedrock-mantle) and for both Qwen3 Coder rows. The page names the 27B Google model Gemma 3 27B PT and prints the model ID google.gemma-3-27b-it. There is no separate DeepSeek V3 id on that table.",
        ],
        table: {
          caption: `${rows.length} Bedrock model ids with shutdown date ${BEDROCK_MAR30_SHUTDOWN_DATE}. AWS did not name a replacement.`,
          headers: ["Model id", "Legacy date stored", "Shutdown date", "Regions", "Official replacement"],
          rows: mar30Table(rows, catalog),
        },
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "Amazon Bedrock model lifecycle", url: BEDROCK_POLICY },
        ],
      },
      {
        heading: "What a call does after this date",
        paragraphs: [
          `The legacy page says: "${BEDROCK_FAIL}" It also says: "${BEDROCK_MIGRATE}" It does not print an exception name. The model cards checked for this date do not print one either. This guide does not copy the Claude 3 Haiku exception onto these ids.`,
          `While a model is Legacy, the same page says: "${BEDROCK_LEGACY_ACCESS}" And: "${BEDROCK_NO_THROUGHPUT}"`,
          `The public extended access column on every one of these rows says To be announced. The page says: "${JAMBA_EXTENDED}" It does not print a price for these ids. This guide does not invent one.`,
        ],
        sources: [{ label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY }],
      },
      {
        heading: "Cross-Region inference profile ids",
        paragraphs: [
          "The dataset stores the bare model ids. A geo id adds a prefix. The cards below print a geo inference ID. None of them print an eu. prefix. Global inference ID is Not supported on each of these rows.",
          "The DeepSeek-R1 card's Converse sample sends modelId us.deepseek.r1-v1:0 with region_name us-east-1. Changing only deepseek.r1-v1:0 leaves that prefixed id in place.",
          "Llama 3 70B Instruct and Llama 3 8B Instruct print Not supported for the geo inference ID and for the global inference ID. The other model cards in this shutdown set also print Not supported for both. That includes DeepSeek-V3.1, Gemma 3, MiniMax M2, MiniMax M2.1, Devstral 2, Mistral 7B, Mixtral 8x7B, both Voxtral ids, Kimi K2 Thinking, both Qwen3 Coder ids, GLM 4.7, and GLM 4.7 Flash. The Nemotron mantle rows also say Not supported. This guide does not invent an eu. id for any of them.",
          `The limited model selection page says: "${BEDROCK_PROFILE_GAP}"`,
        ],
        table: {
          caption: "Geo inference IDs printed on the model cards for this shutdown date.",
          headers: ["Model id", "Endpoint", "Geo inference ID", "Global inference ID"],
          rows: MAR30_GEO.map(([id, endpoint, geo, global]) => [linkFor(id), endpoint, geo, global]),
        },
        sources: [
          { label: "DeepSeek-R1 model card", url: CARD_DEEPSEEK_R1 },
          { label: "Llama 3.1 70B Instruct model card", url: CARD_LLAMA3170 },
          { label: "Llama 3.1 8B Instruct model card", url: CARD_LLAMA318 },
          { label: "Llama 3.3 70B Instruct model card", url: CARD_LLAMA33 },
          { label: "Llama 4 Maverick model card", url: CARD_MAVERICK },
          { label: "Llama 4 Scout model card", url: CARD_SCOUT },
          { label: "Nemotron Nano 12B v2 model card", url: CARD_NANO12 },
          { label: "Nemotron Nano 9B v2 model card", url: CARD_NANO9 },
          { label: "Llama 3 70B Instruct model card", url: CARD_LLAMA370 },
          { label: "Llama 3 8B Instruct model card", url: CARD_LLAMA38 },
          { label: "DeepSeek-V3.1 model card", url: CARD_DEEPSEEK_V31 },
          { label: "Kimi K2 Thinking model card", url: CARD_KIMI },
          { label: "Qwen3-Coder-30B model card", url: CARD_QWEN30 },
          { label: "Qwen3 Coder 480B model card", url: CARD_QWEN480 },
          { label: "GLM 4.7 model card", url: CARD_GLM47 },
          { label: "GLM 4.7 Flash model card", url: CARD_GLM_FLASH },
          { label: "Inference profiles with limited model selection", url: BEDROCK_LIMITED },
        ],
      },
      {
        heading: "Same-family models AWS did not name",
        paragraphs: [
          "The legacy page says to migrate to an Active model. It does not name the id. Models at a glance still lists newer names in some of these families. The cards below say Active and EOL date N/A. AWS did not name them as replacements. They are not stored on these rows.",
          `The Gemma 4 E2B card says: "${GEMMA4_MANTLE}" The Gemma 4 31B and Gemma 4 26B-A4B cards list a bedrock-mantle row and do not list a bedrock-runtime row. A bedrock-runtime Converse call cannot send those ids.`,
          "Models at a glance still names Llama 3.2 and Llama 3.1 405B. The legacy page lists those ids under models that have reached EOL, with EOL date July 7, 2026. They are not Active replacements for the March 30, 2027 Llama rows. This guide does not name a Llama id to send.",
          "The Kimi K2.5 card says the geo inference ID and the global inference ID are Not supported. The Kimi K3 card prints us.moonshotai.kimi-k3 in the commercial AWS Regions, in.moonshotai.kimi-k3 in the India Regions, and global.moonshotai.kimi-k3. The GLM 5 card says geo and global are Not supported. The GLM 5.3 card prints model ID zai.glm-5.3, says the in-region endpoint URL is Not supported, and prints geo id us.zai.glm-5.3 and global id global.zai.glm-5.3.",
        ],
        table: {
          caption: "Active ids on Bedrock model cards. AWS did not name these as replacements.",
          headers: ["Retiring models", "Active id on a model card", "What the card says"],
          rows: [
            ["DeepSeek-R1 and DeepSeek-V3.1", "deepseek.v3.2", "Active. EOL date N/A. Geo and global are Not supported."],
            ["Gemma 3 4B IT, 12B IT, and 27B PT", "google.gemma-4-31b, google.gemma-4-26b-a4b, google.gemma-4-e2b", "Active. EOL date N/A. bedrock-mantle only."],
            ["Llama 3, 3.1, 3.3, and Llama 4", "no official replacement", "No newer Active Llama id on the legacy page or on Models at a glance."],
            ["MiniMax M2 and MiniMax M2.1", "minimax.minimax-m2.5", "Active. EOL date N/A. Geo and global are Not supported."],
            ["Mistral 7B Instruct and Mixtral 8x7B Instruct", "mistral.mistral-large-3-675b-instruct, mistral.ministral-3-14b-instruct, mistral.ministral-3-8b-instruct, mistral.ministral-3-3b-instruct, mistral.magistral-small-2509", "Active. EOL date N/A. Newer Mistral text ids. AWS did not name them."],
            ["Devstral 2 123B and both Voxtral ids", "no official replacement", "Models at a glance does not list a newer Devstral id or a newer Voxtral id."],
            ["Kimi K2 Thinking", "moonshotai.kimi-k2.5, moonshotai.kimi-k3", "Active. EOL date N/A."],
            ["Nemotron Nano 9B v2 and 12B v2", "nvidia.nemotron-nano-3-30b, nvidia.nemotron-super-3-120b", "Active. EOL date N/A."],
            ["Qwen3 Coder 30B and 480B", "qwen.qwen3-coder-next", "Active. EOL date N/A. Geo and global are Not supported."],
            ["GLM 4.7 and GLM 4.7 Flash", "zai.glm-5, zai.glm-5.3", "Active. EOL date N/A. Read the GLM 5.3 inference ids before you send a bare id."],
          ],
        },
        sources: [
          { label: "Models at a glance", url: BEDROCK_MODELS },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "DeepSeek V3.2 model card", url: CARD_DEEPSEEK_V32 },
          { label: "Gemma 4 31B model card", url: CARD_GEMMA4_31 },
          { label: "Gemma 4 26B-A4B model card", url: CARD_GEMMA4_26 },
          { label: "Gemma 4 E2B model card", url: CARD_GEMMA4_E2B },
          { label: "MiniMax M2.5 model card", url: CARD_M25 },
          { label: "Mistral Large 3 model card", url: CARD_MISTRAL_LARGE3 },
          { label: "Ministral 14B 3.0 model card", url: CARD_MINISTRAL14 },
          { label: "Ministral 3 8B model card", url: CARD_MINISTRAL8 },
          { label: "Ministral 3B model card", url: CARD_MINISTRAL3 },
          { label: "Magistral Small 2509 model card", url: CARD_MAGISTRAL },
          { label: "Kimi K2.5 model card", url: CARD_KIMI25 },
          { label: "Kimi K3 model card", url: CARD_KIMI3 },
          { label: "Nemotron Nano 3 30B model card", url: CARD_NANO3 },
          { label: "Nemotron Super 3 120B model card", url: CARD_SUPER },
          { label: "Qwen3 Coder Next model card", url: CARD_CODER_NEXT },
          { label: "GLM 5 model card", url: CARD_GLM5 },
          { label: "GLM 5.3 model card", url: CARD_GLM53 },
        ],
      },
      {
        heading: "Change the Converse modelId",
        paragraphs: [
          "The DeepSeek-R1 card's Converse sample creates a bedrock-runtime client with region_name us-east-1 and sends modelId us.deepseek.r1-v1:0. The sample below changes that argument to deepseek.v3.2. The DeepSeek V3.2 card lists that id on bedrock-runtime and says the model lifecycle is Active. AWS did not name it as the replacement for deepseek.r1-v1:0 or for any other id in the table above.",
          "The V3.2 card says the geo inference ID is Not supported. The sample does not add a us. prefix. Do not send us.deepseek.v3.2. That id is not on the card.",
          "Use the same modelId field for the other retiring ids. Pick the Active id you will actually call. Gemma 4 ids are on bedrock-mantle, so they do not belong in this bedrock-runtime client.",
        ],
        codes: [{
          caption: "boto3 Converse. modelId changed from the DeepSeek-R1 card sample. AWS did not name this replacement.",
          code: `import boto3

client = boto3.client("bedrock-runtime", region_name="us-east-1")
response = client.converse(
    modelId="deepseek.v3.2",
    messages=[{"role": "user", "content": [{"text": "Hello"}]}],
)
`,
        }],
        sources: [
          { label: "DeepSeek-R1 model card", url: CARD_DEEPSEEK_R1 },
          { label: "DeepSeek V3.2 model card", url: CARD_DEEPSEEK_V32 },
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
        ],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the bare ids and for the geo ids in the table above. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `The lifecycle page tells you to update application code before the EOL date. It does not name the id to send. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These rows do not store a price. The batch page for this date is [/shutdowns/aws-bedrock-2027-03-30/](/shutdowns/aws-bedrock-2027-03-30/).`,
        ],
        codes: [{
          caption: "ripgrep, bare ids plus the geo ids the cards print",
          code: bedrockSearch([
            ...rows.map((model) => model.id),
            ...MAR30_GEO.map((row) => row[2]),
          ]),
        }],
        sources: [
          { label: "Amazon Bedrock model lifecycle (legacy)", url: BEDROCK_LEGACY },
          { label: "DeepSeek-R1 model card", url: CARD_DEEPSEEK_R1 },
        ],
      },
    ],
    related: [
      { href: "/shutdowns/aws-bedrock-2027-03-30/", label: `Bedrock shutdowns on ${when}` },
      { href: "/providers/aws-bedrock/", label: "Amazon Bedrock provider page" },
      { href: `/guides/${BEDROCK_NOV13_GUIDE_SLUG}/`, label: "Amazon Bedrock Claude 3 shutdown on November 13, 2026" },
      { href: `/guides/${BEDROCK_JAMBA_NOV26_GUIDE_SLUG}/`, label: "Amazon Bedrock AI21 Jamba shutdown on November 26, 2026" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/guides/what-happens-on-model-shutdown-day/", label: "What happens on shutdown day" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Bedrock model ids reach end of life on ${when}?`,
        answer: `The dataset lists ${rows.length} ids with shutdown date ${BEDROCK_MAR30_SHUTDOWN_DATE}: ${idList(rows)}. The legacy lifecycle page lists each one as Legacy, with legacy date September 30, 2026 and EOL date March 30, 2027.`,
      },
      {
        question: "Does March 30, 2027 apply in every AWS Region?",
        answer: `The legacy page says: "${BEDROCK_REGION_SPLIT}" The Regions cell is different for each model. Call ListFoundationModels or GetFoundationModel in the Region you use and read modelLifecycle.`,
      },
      {
        question: "What is the official recommended replacement?",
        answer: `no official replacement. The stored replacements list is empty on every row in this guide. The legacy page says: "${JAMBA_LEGACY_INTRO}" It also says: "${BEDROCK_MIGRATE}" Neither sentence names a model ID. Same-family Active ids on other model cards are not a recommendation from that page.`,
      },
      {
        question: "What happens to a call after March 30, 2027?",
        answer: `The legacy page says: "${BEDROCK_FAIL}" It does not print an exception name. The model cards checked for these ids do not print one either. Migration will not happen automatically.`,
      },
      {
        question: "Which cross-Region ids does AWS print for these models?",
        answer: "The DeepSeek-R1 card prints us.deepseek.r1-v1:0. The Llama 3.1 70B, Llama 3.1 8B, Llama 3.3 70B, Llama 4 Maverick, and Llama 4 Scout cards print a us. geo id and say the global inference ID is Not supported. The two Nemotron Nano cards print us-gov.nvidia.nemotron-nano-12b-v2 and us-gov.nvidia.nemotron-nano-9b-v2 on bedrock-runtime. No card in this set prints an eu. id.",
      },
      {
        question: "Can I keep a us. prefix on the new modelId?",
        answer: "Only when the new model's card prints that prefixed id. The DeepSeek V3.2 card says the geo inference ID is Not supported, so the Converse sample on this page sends deepseek.v3.2 with no prefix. The DeepSeek-R1 card sample sends us.deepseek.r1-v1:0. Replacing the bare id and leaving the prefix does not finish the change.",
      },
      {
        question: "What does To be announced mean here?",
        answer: `The legacy table prints To be announced in the public extended access start date column for every id in this guide. The page says: "${JAMBA_EXTENDED}" It does not print a start date or a price for these ids.`,
      },
    ],
    citations: [
      BEDROCK_LEGACY,
      BEDROCK_POLICY,
      BEDROCK_MODELS,
      BEDROCK_LIMITED,
      CARD_DEEPSEEK_R1,
      CARD_DEEPSEEK_V31,
      CARD_DEEPSEEK_V32,
      CARD_LLAMA33,
      CARD_LLAMA3170,
      CARD_LLAMA318,
      CARD_LLAMA370,
      CARD_LLAMA38,
      CARD_MAVERICK,
      CARD_SCOUT,
      CARD_GEMMA4_31,
      CARD_GEMMA4_26,
      CARD_GEMMA4_E2B,
      CARD_M25,
      CARD_MISTRAL_LARGE3,
      CARD_MINISTRAL14,
      CARD_MINISTRAL8,
      CARD_MINISTRAL3,
      CARD_MAGISTRAL,
      CARD_KIMI,
      CARD_KIMI25,
      CARD_KIMI3,
      CARD_NANO12,
      CARD_NANO9,
      CARD_NANO3,
      CARD_SUPER,
      CARD_QWEN30,
      CARD_QWEN480,
      CARD_CODER_NEXT,
      CARD_GLM47,
      CARD_GLM_FLASH,
      CARD_GLM5,
      CARD_GLM53,
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
const AZURE_APRIL14_OFFERS = "For gpt-4o versions 2024-08-06 and 2024-11-20, gpt-4o-mini version 2024-07-18, and gpt-4.1-mini version 2025-04-14, all active customer-facing base-model inference offers in Azure public cloud retire on April 14, 2027, in all applicable regions. Already-retired Regional Standard deployments remain retired.";
const AZURE_APRIL14_FOOT = "April 14, 2027 applies to all active customer-facing base-model inference offers in all applicable regions in Azure public cloud for gpt-4o versions 2024-08-06 and 2024-11-20, gpt-4o-mini version 2024-07-18, and gpt-4.1-mini version 2025-04-14. Already-retired Regional Standard deployments remain retired. For fine-tuning training and deployment retirement dates, see the separate schedules below.";
const AZURE_CHECK_SCHEDULE = "Check the Model retirement schedule for the current retirement dates and replacement model, since these details are subject to change.";
const AZURE_REPLACEMENT_LISTED = "The replacement listed in the Model retirement schedule is Microsoft's recommended migration target and, where supported, the model used for automatic upgrades at retirement. It doesn't limit your manual migration choices.";
const AZURE_DONT_WAIT = "You don't need to wait for a replacement to be listed before evaluating or manually migrating to another compatible model.";
const AZURE_FINE_PHASES = "Fine-tuned models retire in two phases: training and deployment.";
const AZURE_FINE_UNLESS = "Unless explicitly stated, training retires no earlier than the base model retirement date.";
const AZURE_JAN14_OFFERS = "All active customer-facing base-model inference offers for gpt-4o version 2024-05-13 in Azure public cloud retire on January 14, 2027, in all applicable regions.";
const AZURE_JAN14_VERSION = "The replacement model is gpt-5.1 version 2025-11-13.";

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
  const hasPage = count >= 3 || SMALL_SHUTDOWN_BATCHES.has(`azure-openai|${date}`);
  if (hasPage) {
    return `${when} has ${count} Azure OpenAI ${count === 1 ? "id" : "ids"} with that exact shutdown date, so the batch page is [Azure OpenAI shutdowns on ${when}](${path}).`;
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
  const peerLine = (models: ModelRecord[]) => models.map((model) => {
    const date = model.shutdown_date;
    const page = Boolean(date) && (azureExactCount(catalog, date!) >= 3 || SMALL_SHUTDOWN_BATCHES.has(`azure-openai|${date}`));
    const link = page ? ` ([/shutdowns/azure-openai-${date}/](/shutdowns/azure-openai-${date}/))` : "";
    return `${model.id}: ${date ?? "Not published"}${link}`;
  }).join(". ");
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
      { href: "/shutdowns/azure-openai-2026-12-08/", label: "Azure OpenAI shutdowns on December 8, 2026" },
      { href: "/shutdowns/azure-openai-2026-12-15/", label: "Azure OpenAI shutdowns on December 15, 2026" },
      { href: "/shutdowns/azure-openai-2026-12-16/", label: "Azure OpenAI shutdowns on December 16, 2026" },
      { href: "/shutdowns/azure-openai-2027-01-12/", label: "Azure OpenAI shutdowns on January 12, 2027" },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: `/guides/${AZURE_NOV19_GUIDE_SLUG}/`, label: "Azure OpenAI o-series retirement on November 19, 2026" },
      { href: `/guides/${AZURE_JUNE15_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on June 15, 2027" },
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
        question: "Is there a shutdown page for each of these dates?",
        answer: `A shutdown batch page is published when at least three model records share one provider and one exact shutdown date, or when the date is explicitly included. ${batchLines.join(" ")}`,
      },
      {
        question: "Why is gpt-realtime-mini 2025-12-15 not in this table?",
        answer: `Checked on ${AZURE_NOV_DEC_CHECKED}, the retirement schedule prints gpt-realtime-mini version 2025-12-15 twice in the Azure OpenAI table. The first row says GA and retirement 2027-06-15. A later row says GA and retirement 2026-12-15. SunsetDiff keeps the first base-table row when the same model and version is repeated. The stored id is gpt-realtime-mini-2025-12-15 and its shutdown date is ${realtime?.shutdown_date ?? "Not published"}. This guide skips that id. The June 15, 2027 rows are on [Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on June 15, 2027](/guides/${AZURE_JUNE15_GUIDE_SLUG}/).`,
      },
      {
        question: "Does this guide include the November 19 o-series models?",
        answer: `No. o1, o1-pro, o3, o3-deep-research, o3-mini, o3-pro, and o4-mini retire on ${AZURE_NOV19_SHUTDOWN_DATE}. The schedule names gpt-5.6-sol or gpt-5.6-terra for those rows. See [Azure OpenAI o-series retirement on November 19, 2026](/guides/${AZURE_NOV19_GUIDE_SLUG}/).`,
      },
    ],
    citations: [AZURE_SCHEDULE, AZURE_RETIREMENTS, AZURE_WORKING, AZURE_VERSIONS, AZURE_MIGRATION],
  };
}

function azureFineTuneSentence(model: ModelRecord): string {
  const note = model.region_or_platform_notes ?? "";
  const training = note.match(/Training retirement: ([^.]+)\./)?.[1];
  const deployment = note.match(/Deployment retirement: ([^.]+)\./)?.[1];
  if (!training && !deployment) {
    return `${model.id}: no fine-tune dates are stored, and the fine-tune tables do not list this version.`;
  }
  return `${model.id}: training retirement ${training ?? "Not published"}. Fine-tuned deployment retirement ${deployment ?? "Not published"}.`;
}

function azureApril14Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(AZURE_APRIL14_SHUTDOWN_DATE);
  const azureVersion = catalog.find((model) => model.provider === "azure-openai" && model.id === "gpt-5.1-2025-11-13");
  const azureAlias = catalog.find((model) => model.provider === "azure-openai" && model.id === "gpt-5.1");
  const versionDate = azureVersion?.shutdown_date ?? "Not published";
  const aliasDate = azureAlias?.shutdown_date ? azureAlias.shutdown_date : "Not published";
  const fineLines = ordered.map(azureFineTuneSentence).join(" ");
  const byLifecycle = ordered.map((model) => `${model.id} (${azureScheduleLifecycle(model)})`).join(", ");
  const named = ordered.filter((model) => publishedReplacementIds(model).length > 0);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  return {
    slug: AZURE_APRIL14_GUIDE_SLUG,
    title: `Azure OpenAI GPT-4.1 and GPT-4o retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o 2024-08-06, gpt-4o 2024-11-20, and gpt-4o-mini retire on ${AZURE_APRIL14_SHUTDOWN_DATE}. The schedule names gpt-5.1 for the two gpt-4o versions. The other replacement cells are empty. Azure gpt-5.1 version 2025-11-13 retires on ${versionDate}.`,
    h1: `Azure OpenAI GPT-4.1 and GPT-4o retirement on ${when}`,
    summary: `${ordered.length} Azure OpenAI versions with shutdown date ${AZURE_APRIL14_SHUTDOWN_DATE}, the replacement cell on each row, and the Azure date Microsoft prints for gpt-5.1 version 2025-11-13.`,
    answer: `The dataset has ${ordered.length} Azure OpenAI ids with shutdown date ${AZURE_APRIL14_SHUTDOWN_DATE}: ${idList(ordered)}. The retirement schedule lists that date on each of those rows. The replacement cell is gpt-5.1 for ${idList(named)}. The replacement cell is empty for ${idList(empty)}, so those cells say Not published. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. The same schedule lists Azure gpt-5.1 version 2025-11-13 as GA with retirement date ${versionDate}. It does not print ${APRIL_1_2027_SHUTDOWN_DATE} as an Azure gpt-5.1 shutdown.`,
    checked: AZURE_APRIL14_CHECKED,
    steps: [
      {
        name: "Find deployments",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name. gpt-4.1 version 2025-04-14 is the dataset id gpt-4.1-2025-04-14. gpt-4.1-mini version 2025-04-14 is gpt-4.1-mini-2025-04-14. gpt-4.1-nano version 2025-04-14 is gpt-4.1-nano-2025-04-14. gpt-4o version 2024-08-06 is gpt-4o-2024-08-06. gpt-4o version 2024-11-20 is gpt-4o-2024-11-20. gpt-4o-mini version 2024-07-18 is gpt-4o-mini-2024-07-18.",
      },
      {
        name: "Pick a replacement",
        text: `The schedule names gpt-5.1 for gpt-4o 2024-08-06 and gpt-4o 2024-11-20. The replacement cell is empty for gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, and gpt-4o-mini, so shortlist a model yourself for those four. Before you deploy gpt-5.1, read the Azure schedule row for version 2025-11-13. That row is GA and its retirement date is ${versionDate}. Microsoft's Azure pages do not print ${APRIL_1_2027_SHUTDOWN_DATE} as a gpt-5.1 shutdown.`,
      },
      {
        name: "Test",
        text: `Send one real request to the model you picked, using a prompt you send now. Do that before ${when}. Check the reply, the tools, and the fields the new model rejects.`,
      },
      {
        name: "Redeploy before the date",
        text: `Create a deployment of the model you tested and move traffic before ${when}. Where the schedule names a replacement, that cell is the automatic-upgrade target where an upgrade is supported. Provisioned deployments are not auto-upgraded. A deployment set to NoAutoUpgrade stops working on the retirement date.`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Azure OpenAI rows whose shutdown date is ${AZURE_APRIL14_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Lifecycle is the schedule's Lifecycle column, copied from the source excerpt stored on the row. Shutdown date and replacement are the fields stored on the row. Not published means the replacement field is empty. These rows do not store a deprecation_date. ${byLifecycle}.`,
          `The lifecycle page says: "${AZURE_APRIL14_OFFERS}" Footnote 3 on the schedule says: "${AZURE_APRIL14_FOOT}" That sentence names gpt-4o 2024-08-06, gpt-4o 2024-11-20, gpt-4o-mini 2024-07-18, and gpt-4.1-mini 2025-04-14. The schedule still lists retirement date ${AZURE_APRIL14_SHUTDOWN_DATE} for gpt-4.1 2025-04-14 and gpt-4.1-nano 2025-04-14. Those two rows do not carry footnote 3.`,
          `The lifecycle page also says: "${AZURE_CHECK_SCHEDULE}"`,
        ],
        table: {
          caption: `${ordered.length} Azure OpenAI model ids with shutdown date ${AZURE_APRIL14_SHUTDOWN_DATE}.`,
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
        heading: "Replacements Microsoft names",
        paragraphs: [
          `The schedule says: "${AZURE_REPLACEMENT_COL}" It also says: "${AZURE_DONT_WAIT}" The lifecycle page says: "${AZURE_REPLACEMENT_LISTED}"`,
          named.length
            ? `The replacement cell is gpt-5.1 on ${idList(named)}. The cell prints gpt-5.1 with no version in parentheses. ${replacementFaq(named, catalog)}`
            : "No row in this table stores a replacement.",
          empty.length
            ? `The replacement cell is empty on ${idList(empty)}. Empty means Microsoft did not name a recommended replacement on that row. This guide does not add one.`
            : "Every row in this table stores a replacement.",
          `gpt-4o version 2024-05-13 is a different row. It retires on 2027-01-14. The schedule cell on that row is gpt-5.1 (2025-11-13). The lifecycle page says: "${AZURE_JAN14_OFFERS}" Then: "${AZURE_JAN14_VERSION}" Those two sentences are about version 2024-05-13. They are not the April 14 rows. See [gpt-4o-2024-05-13](/models/azure-openai/gpt-4o-2024-05-13/) and [Azure OpenAI shutdowns on January 14, 2027](/shutdowns/azure-openai-2027-01-14/).`,
        ],
        sources,
      },
      {
        heading: "OpenAI's April 1 date and Azure gpt-5.1",
        paragraphs: [
          `OpenAI's API deprecations page says: "${APRIL_NOTICE}" That date is ${APRIL_1_2027_SHUTDOWN_DATE}. The OpenAI rows are on [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/).`,
          `Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as a shutdown date for gpt-5.1. The schedule has its own Azure row: gpt-5.1 version 2025-11-13, lifecycle GA, retirement date ${versionDate}, replacement cell empty. SunsetDiff stores that row as [gpt-5.1-2025-11-13](/models/azure-openai/gpt-5-1-2025-11-13/). That ${versionDate} date is the retirement date the schedule prints for Azure gpt-5.1 version 2025-11-13. gpt-5-mini version 2025-08-07 and gpt-5.2-codex version 2026-01-14 use that same Azure date. See [Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on ${longDate(AZURE_JULY13_SHUTDOWN_DATE)}](/guides/${AZURE_JULY13_GUIDE_SLUG}/).`,
          `The replacement stored on the two gpt-4o rows is the Azure id [gpt-5.1](/models/azure-openai/gpt-5-1/). The shutdown date stored on that id is ${aliasDate}. The schedule does not print an undated gpt-5.1 row. It prints version 2025-11-13.`,
          `The string 2027-04-01 does appear on the Azure fine-tune tables. It is "No earlier than 2027-04-01" for gpt-4o version 2024-08-06 and gpt-4o-mini version 2024-07-18. That is a training floor for those fine-tunes. It is not a gpt-5.1 shutdown, and it is not the OpenAI API date applied to Azure.`,
        ],
        sources: [
          ...sources,
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Fine-tuned training and deployment",
        paragraphs: [
          `The schedule and the lifecycle page both say: "${AZURE_FINE_PHASES}" And: "${AZURE_FINE_UNLESS}" Both pages say: "${AZURE_FINE_FOOT}"`,
          `The fine-tune dates stored on these rows match both tables. ${fineLines}`,
          "gpt-4o version 2024-11-20 is not in either fine-tune table. A base deployment of that version still uses the retirement date in the first table.",
          "A fine-tuned deployment retirement is later than the base retirement date on the rows that list one. Do not treat the fine-tune deployment date as the date a base deployment stops.",
        ],
        sources,
      },
      {
        heading: "What happens to a deployment on the date",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}" The migration page says: "${AZURE_PAYG}" And: "${AZURE_PTU}" And: "${AZURE_BATCH_PATH}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops. The replacement cell is the target where an automatic upgrade is supported. The four rows with an empty cell do not name that target.`,
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
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the table. gpt-4o version 2024-11-20 is the dataset id gpt-4o-2024-11-20.",
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
        heading: "Redeploy before April 14, 2027",
        paragraphs: [
          `Create a deployment of a model you have tested, point traffic at it, and confirm one real request before ${when}. Do that for each of the ${ordered.length} versions in the table.`,
          "Working with models describes two ways to change a provisioned deployment once you have chosen a target. In-place migration keeps the deployment name and moves traffic. Multi-deployment migration creates a second deployment, shifts traffic, then deletes the old one.",
          `The batch of these rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-${AZURE_APRIL14_SHUTDOWN_DATE}/). The [Azure OpenAI provider page](/providers/azure-openai/) lists the other stored rows. Earlier Azure dates are on [Azure OpenAI retirements from November 15 to December 16, 2026](/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/).`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Model migration process", url: AZURE_MIGRATION },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/azure-openai-${AZURE_APRIL14_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${when}` },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: `/guides/${AZURE_JULY13_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027" },
      { href: `/guides/${AZURE_JUNE15_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on June 15, 2027" },
      { href: `/guides/${AZURE_AUG24_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on August 24, 2027" },
      { href: "/models/azure-openai/gpt-5-1-2025-11-13/", label: "Azure gpt-5.1-2025-11-13" },
      { href: "/models/azure-openai/gpt-5-1/", label: "Azure gpt-5.1" },
      { href: "/models/azure-openai/gpt-4o-2024-05-13/", label: "Azure gpt-4o-2024-05-13" },
      { href: `/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/`, label: "Azure OpenAI retirements from November 15 to December 16, 2026" },
      { href: `/guides/${AZURE_NOV19_GUIDE_SLUG}/`, label: "Azure OpenAI o-series retirement on November 19, 2026" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)}. The retirement schedule lists shutdown date ${AZURE_APRIL14_SHUTDOWN_DATE} for each of them. ${byLifecycle}.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(ordered, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}" The cell is empty on ${idList(empty)}.`,
      },
      {
        question: "Does OpenAI's April 1, 2027 shutdown of gpt-5.1 apply to Azure?",
        answer: `Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as an Azure gpt-5.1 shutdown. The schedule lists Azure gpt-5.1 version 2025-11-13 as GA with retirement date ${versionDate} and an empty replacement cell. OpenAI's deprecations page says: "${APRIL_NOTICE}" That sentence is the OpenAI API. See [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/). The Azure id gpt-5.1 stores shutdown date ${aliasDate}.`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `No. The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL} The four rows with an empty replacement cell do not name an upgrade target.`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}" The migration page says: "${AZURE_INVENTORY}"`,
      },
      {
        question: "Do fine-tuned deployments retire on April 14, 2027?",
        answer: `The base retirement date is ${AZURE_APRIL14_SHUTDOWN_DATE}. The fine-tune tables use a later deployment date on the rows that list one. ${fineLines} Both pages say: "${AZURE_FINE_FOOT}" gpt-4o version 2024-11-20 is not in the fine-tune tables.`,
      },
    ],
    citations: [AZURE_SCHEDULE, AZURE_RETIREMENTS, AZURE_WORKING, AZURE_VERSIONS, AZURE_MIGRATION, OPENAI_DEPRECATIONS],
  };
}

const AZURE_GOV_SCHEDULE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule-gov";
const AZURE_GA = "Production-ready. Weights and APIs are fixed.";
const AZURE_AUDIO_ARCH = "https://learn.microsoft.com/en-us/azure/architecture/data-guide/ai-services/speech-recognition-generation";
const AZURE_AUDIO_QUICKSTART = "https://learn.microsoft.com/en-us/azure/foundry/openai/audio-completions-quickstart";
const AZURE_REALTIME_HOWTO = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/realtime-audio";
const AZURE_TRANSCRIBE_REST = "https://learn.microsoft.com/en-us/azure/foundry/reference/rest/audio-create-transcription";
const AZURE_COMPARE = "When you choose a target, evaluate candidate models against your own application, prompts, and representative data. Compare quality, latency, and cost together rather than relying on public benchmarks alone.";
const AZURE_CONFIRM = "Before you migrate, confirm API compatibility, feature support, deployment-type and regional availability, capacity, and quota.";
const AZURE_AUDIO_MODALITIES = "Modalities supported in gpt-audio and gpt-audio-mini models include: text, audio, and text + audio.";
const AZURE_AUDIO_VOICES = "The following voices are supported for audio out: Alloy, Ash, Ballad, Coral, Echo, Sage, Shimmer, Verse, Marin, and Cedar.";
const AZURE_AUDIO_FORMATS = "The following audio output formats are supported: wav, mp3, flac, opus, pcm16, and aac.";
const AZURE_AUDIO_SIZE = "The maximum audio file size is 20 MB.";
const AZURE_AUDIO_API = "Support for audio completions was first added in API version 2025-01-01-preview.";
const AZURE_TTS_TONE = "The tts-hd model is optimized for quality, and gpt-4o-mini-tts supports prompt-guided style and tone.";
const AZURE_STT_FILE = "File-based transcription of prerecorded audio";
const AZURE_CHAT_AUDIO = "Combines audio input and output with language reasoning, summarization, or generation in a single model call";
const AZURE_REALTIME_ROW = "Low-latency, speech-in and speech-out conversations for live voice agents, interactive assistants, and streaming audio scenarios";
const AZURE_REALTIME_GA_URL = "For the Realtime API, use the GA endpoint with /openai/v1 in the URL. Don't use date-based API versions or the api-version query parameter.";
const AZURE_REALTIME_ALL = "For all Realtime API models, use the GA endpoint format with /openai/v1 in the URL.";
const AZURE_REALTIME_WEBRTC = "In most cases, we recommend using the WebRTC API for low-latency real-time audio streaming.";
const AZURE_REALTIME_PCM = "The Realtime API expects audio in a specific format:";
const AZURE_TRANSCRIBE_FORMATS = "The audio file object (not file name) to transcribe, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.";
const AZURE_TRANSCRIBE_JSON = "For gpt-4o-transcribe and gpt-4o-mini-transcribe, the only supported format is json.";
const AZURE_TRANSCRIBE_LANG = "Supplying the input language in ISO-639-1 (e.g. en) format will improve accuracy and latency.";
const AZURE_TRANSCRIBE_WORD = "There is no additional latency for segment timestamps, but generating word timestamps incurs additional latency.";

function openaiShutdownLine(model: ModelRecord | undefined): string {
  if (!model) return "Not published";
  const replacement = publishedReplacementIds(model).join(", ") || "Not published";
  return `${model.id} stores shutdown date ${model.shutdown_date ?? "Not published"} and replacement ${replacement}`;
}

function azureJuly13Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(AZURE_JULY13_SHUTDOWN_DATE);
  const azureAlias = catalog.find((model) => model.provider === "azure-openai" && model.id === "gpt-5.1");
  const aliasDate = azureAlias?.shutdown_date ? azureAlias.shutdown_date : "Not published";
  const fineLines = ordered.map(azureFineTuneSentence).join(" ");
  const byLifecycle = ordered.map((model) => `${model.id} (${azureScheduleLifecycle(model)})`).join(", ");
  const named = ordered.filter((model) => publishedReplacementIds(model).length > 0);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const openai51 = catalog.find((model) => model.provider === "openai" && model.id === "gpt-5.1");
  const openai51Snap = catalog.find((model) => model.provider === "openai" && model.id === "gpt-5.1-2025-11-13");
  const openaiMini = catalog.find((model) => model.provider === "openai" && model.id === "gpt-5-mini");
  const openaiMiniSnap = catalog.find((model) => model.provider === "openai" && model.id === "gpt-5-mini-2025-08-07");
  const openaiCodex = catalog.find((model) => model.provider === "openai" && model.id === "gpt-5.2-codex");
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  return {
    slug: AZURE_JULY13_GUIDE_SLUG,
    title: `Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI gpt-5.1 version 2025-11-13, gpt-5-mini version 2025-08-07, and gpt-5.2-codex version 2026-01-14 retire on ${AZURE_JULY13_SHUTDOWN_DATE}. The replacement cell is empty on each row. OpenAI's API retires gpt-5.1 earlier, on ${APRIL_1_2027_SHUTDOWN_DATE}.`,
    h1: `Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on ${when}`,
    summary: `${ordered.length} Azure OpenAI versions with shutdown date ${AZURE_JULY13_SHUTDOWN_DATE}. The replacement cell is empty. OpenAI's API date for gpt-5.1 is earlier.`,
    answer: `The dataset has ${ordered.length} Azure OpenAI ids with shutdown date ${AZURE_JULY13_SHUTDOWN_DATE}: ${idList(ordered)}. The retirement schedule lists that date on each of those rows. Lifecycle is GA. The replacement cell is empty, so those cells say Not published. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. OpenAI's deprecations page says: "${APRIL_NOTICE}" That sentence is the OpenAI API. It names gpt-5.1 and gpt-5.1-2025-11-13. Microsoft's Azure schedule does not print ${APRIL_1_2027_SHUTDOWN_DATE} as an Azure shutdown. A team that calls both APIs should plan the OpenAI calls for the earlier date.`,
    checked: AZURE_JULY13_CHECKED,
    steps: [
      {
        name: "Find deployments",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name. gpt-5.1 version 2025-11-13 is the dataset id gpt-5.1-2025-11-13. gpt-5-mini version 2025-08-07 is gpt-5-mini-2025-08-07. gpt-5.2-codex version 2026-01-14 is gpt-5.2-codex-2026-01-14.",
      },
      {
        name: "Pick a replacement",
        text: `The replacement cell is empty for gpt-5.1 2025-11-13, gpt-5-mini 2025-08-07, and gpt-5.2-codex 2026-01-14. Microsoft did not name a recommended replacement on these rows. Shortlist a model yourself and test it. The Azure id gpt-5.1 stores shutdown date ${aliasDate}. The schedule prints the dated version, not an undated gpt-5.1 row.`,
      },
      {
        name: "Test",
        text: `Send one real request to the model you picked, using a prompt you send now. Do that before ${when}. Check the reply, the tools, and the fields the new model rejects.`,
      },
      {
        name: "Redeploy before the date",
        text: `Create a deployment of the model you tested and move traffic before ${when}. These rows do not name an automatic-upgrade target. Provisioned deployments are not auto-upgraded. A deployment set to NoAutoUpgrade stops working on the retirement date.`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Azure OpenAI rows whose shutdown date is ${AZURE_JULY13_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Lifecycle is the schedule's Lifecycle column, copied from the source excerpt stored on the row. Shutdown date and replacement are the fields stored on the row. Not published means the replacement field is empty. These rows do not store a deprecation_date. ${byLifecycle}.`,
          `The schedule lists gpt-5.1 version 2025-11-13 as GA with retirement date ${AZURE_JULY13_SHUTDOWN_DATE} and an empty replacement cell. It lists gpt-5-mini version 2025-08-07 the same way. It lists gpt-5.2-codex version 2026-01-14 the same way. Those three rows do not carry footnote 2 or footnote 3.`,
          `The lifecycle table says Generally Available means: "${AZURE_GA}" New deployments are allowed, and existing deployments work, until the retirement date. The lifecycle page also says: "${AZURE_CHECK_SCHEDULE}"`,
          `The Azure Government schedule lists gpt-5.1 version 2025-11-13 as GA with retirement date ${AZURE_JULY13_SHUTDOWN_DATE} and an empty replacement cell. That government table does not list gpt-5-mini or gpt-5.2-codex. The dates in the first table are the public-cloud schedule.`,
        ],
        table: {
          caption: `${ordered.length} Azure OpenAI model ids with shutdown date ${AZURE_JULY13_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Lifecycle on the schedule", "Shutdown date", "Recommended replacement"],
          rows: ordered.map((model) => [
            modelLink(model),
            azureScheduleLifecycle(model),
            shutdownCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources: [
          ...sources,
          { label: "Azure Government retirement schedule", url: AZURE_GOV_SCHEDULE },
        ],
      },
      {
        heading: "Replacements Microsoft names",
        paragraphs: [
          `The schedule says: "${AZURE_REPLACEMENT_COL}" It also says: "${AZURE_DONT_WAIT}" The lifecycle page says: "${AZURE_REPLACEMENT_LISTED}"`,
          named.length
            ? `The replacement cell is filled on ${idList(named)}. ${replacementFaq(named, catalog)}`
            : "No row in this table stores a replacement.",
          empty.length
            ? `The replacement cell is empty on ${idList(empty)}. Empty means Microsoft did not name a recommended replacement on that row. This guide does not add one.`
            : "Every row in this table stores a replacement.",
          `The undated Azure id is [gpt-5.1](/models/azure-openai/gpt-5-1/). The shutdown date stored on that id is ${aliasDate}. The schedule does not print an undated gpt-5.1 row. It prints version 2025-11-13. April 14, 2027 rows that name gpt-5.1 as a replacement are a different date. See [Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027](/guides/${AZURE_APRIL14_GUIDE_SLUG}/).`,
        ],
        sources,
      },
      {
        heading: "OpenAI's dates are earlier",
        paragraphs: [
          `OpenAI's API deprecations page says: "${APRIL_NOTICE}" That date is ${APRIL_1_2027_SHUTDOWN_DATE}. The OpenAI rows are on [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/). ${openaiShutdownLine(openai51)}. ${openaiShutdownLine(openai51Snap)}.`,
          `Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as a shutdown date for Azure gpt-5.1. The Azure row stays ${AZURE_JULY13_SHUTDOWN_DATE}. A team that calls the OpenAI API and Azure should plan the OpenAI gpt-5.1 calls for ${APRIL_1_2027_SHUTDOWN_DATE}. The Azure deployment keeps ${AZURE_JULY13_SHUTDOWN_DATE}.`,
          `The same OpenAI page lists an earlier date for the other two names. ${openaiShutdownLine(openaiMini)}. ${openaiShutdownLine(openaiMiniSnap)}. ${openaiShutdownLine(openaiCodex)}. Those OpenAI dates are not Azure shutdown dates. Plan each API for the date on that API. The earlier date is the one to plan first.`,
        ],
        sources: [
          ...sources,
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Fine-tuned training and deployment",
        paragraphs: [
          `The schedule and the lifecycle page both say: "${AZURE_FINE_PHASES}" And: "${AZURE_FINE_UNLESS}" Both pages say: "${AZURE_FINE_FOOT}"`,
          `The fine-tune tables on both pages do not list gpt-5.1 version 2025-11-13, gpt-5-mini version 2025-08-07, or gpt-5.2-codex version 2026-01-14. ${fineLines}`,
          "A base deployment of these versions uses the retirement date in the first table. Do not borrow a fine-tune date from a different model.",
        ],
        sources,
      },
      {
        heading: "What happens to a deployment on the date",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/). These three rows are GA now, so inference still works until ${when}.`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}" The migration page says: "${AZURE_PAYG}" And: "${AZURE_PTU}" And: "${AZURE_BATCH_PATH}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops. The replacement cell is the target where an automatic upgrade is supported. These three rows have an empty cell, so they do not name that target.`,
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
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the table. gpt-5.1 version 2025-11-13 is the dataset id gpt-5.1-2025-11-13.",
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
        heading: "Redeploy before July 13, 2027",
        paragraphs: [
          `Create a deployment of a model you have tested, point traffic at it, and confirm one real request before ${when}. Do that for each of the ${ordered.length} versions in the table.`,
          "Working with models describes two ways to change a provisioned deployment once you have chosen a target. In-place migration keeps the deployment name and moves traffic. Multi-deployment migration creates a second deployment, shifts traffic, then deletes the old one. Neither section names a target for these rows.",
          `The batch of these rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-${AZURE_JULY13_SHUTDOWN_DATE}/). The [Azure OpenAI provider page](/providers/azure-openai/) lists the other stored rows. The April 14, 2027 batch is [Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027](/guides/${AZURE_APRIL14_GUIDE_SLUG}/).`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Model migration process", url: AZURE_MIGRATION },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/azure-openai-${AZURE_JULY13_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${when}` },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: "/models/azure-openai/gpt-5-1-2025-11-13/", label: "Azure gpt-5.1-2025-11-13" },
      { href: "/models/azure-openai/gpt-5-mini-2025-08-07/", label: "Azure gpt-5-mini-2025-08-07" },
      { href: "/models/azure-openai/gpt-5-2-codex-2026-01-14/", label: "Azure gpt-5.2-codex-2026-01-14" },
      { href: "/models/azure-openai/gpt-5-1/", label: "Azure gpt-5.1" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: `/guides/${AZURE_APRIL14_GUIDE_SLUG}/`, label: "Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027" },
      { href: `/guides/${AZURE_JUNE15_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on June 15, 2027" },
      { href: `/guides/${AZURE_AUG24_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on August 24, 2027" },
      { href: "/models/openai/gpt-5-1/", label: "OpenAI gpt-5.1" },
      { href: "/models/openai/gpt-5-mini/", label: "OpenAI gpt-5-mini" },
      { href: "/models/openai/gpt-5-2-codex/", label: "OpenAI gpt-5.2-codex" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)}. The retirement schedule lists shutdown date ${AZURE_JULY13_SHUTDOWN_DATE} for each of them. ${byLifecycle}.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(ordered, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}" The cell is empty on ${idList(empty)}.`,
      },
      {
        question: "Does OpenAI's April 1, 2027 shutdown of gpt-5.1 apply to Azure?",
        answer: `No for the Azure deployment. Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as an Azure gpt-5.1 shutdown. The schedule lists Azure gpt-5.1 version 2025-11-13 as GA with retirement date ${AZURE_JULY13_SHUTDOWN_DATE} and an empty replacement cell. OpenAI's deprecations page says: "${APRIL_NOTICE}" That sentence is the OpenAI API. See [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/). A team that calls both APIs should plan the OpenAI calls for ${APRIL_1_2027_SHUTDOWN_DATE}. The Azure id gpt-5.1 stores shutdown date ${aliasDate}.`,
      },
      {
        question: "What about gpt-5-mini and gpt-5.2-codex on the OpenAI API?",
        answer: `${openaiShutdownLine(openaiMini)}. ${openaiShutdownLine(openaiMiniSnap)}. ${openaiShutdownLine(openaiCodex)}. Those dates are the OpenAI API. The Azure rows for gpt-5-mini-2025-08-07 and gpt-5.2-codex-2026-01-14 store ${AZURE_JULY13_SHUTDOWN_DATE}. Plan the earlier date on the API that lists it.`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `No. The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL} These three rows have an empty replacement cell, so they do not name an upgrade target.`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}" The migration page says: "${AZURE_INVENTORY}"`,
      },
      {
        question: "Do fine-tuned deployments of these versions retire on July 13, 2027?",
        answer: `The base retirement date is ${AZURE_JULY13_SHUTDOWN_DATE}. The fine-tune tables do not list these three versions. ${fineLines} Both pages say: "${AZURE_FINE_FOOT}"`,
      },
      {
        question: "Does Azure Government list the same date?",
        answer: `The Azure Government schedule lists gpt-5.1 version 2025-11-13 as GA with retirement date ${AZURE_JULY13_SHUTDOWN_DATE} and an empty replacement cell. That table does not list gpt-5-mini or gpt-5.2-codex. The public-cloud schedule lists all three ids on ${AZURE_JULY13_SHUTDOWN_DATE}.`,
      },
    ],
    citations: [
      AZURE_SCHEDULE,
      AZURE_RETIREMENTS,
      AZURE_WORKING,
      AZURE_VERSIONS,
      AZURE_MIGRATION,
      OPENAI_DEPRECATIONS,
      AZURE_GOV_SCHEDULE,
    ],
  };
}

function azureJune15Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(AZURE_JUNE15_SHUTDOWN_DATE);
  const augWhen = longDate(AZURE_AUG24_SHUTDOWN_DATE);
  const byLifecycle = ordered.map((model) => `${model.id} (${azureScheduleLifecycle(model)})`).join(", ");
  const named = ordered.filter((model) => publishedReplacementIds(model).length > 0);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const fineLines = ordered.map(azureFineTuneSentence).join(" ");
  const findAzure = (id: string) => catalog.find((model) => model.provider === "azure-openai" && model.id === id);
  const older = [
    "gpt-4o-mini-transcribe-2025-03-20",
    "gpt-4o-mini-tts-2025-03-20",
    "gpt-audio-mini-2025-10-06",
    "gpt-realtime-mini-2025-10-06",
  ].map(findAzure).filter((model): model is ModelRecord => Boolean(model));
  const olderLine = older.map((model) => `${modelLink(model)} stores shutdown date ${model.shutdown_date ?? "Not published"}`).join(". ");
  const augAudio = findAzure("gpt-audio-1.5-2026-02-23");
  const augRealtime = findAzure("gpt-realtime-1.5-2026-02-23");
  const augCodex = findAzure("gpt-5.3-codex-2026-02-24");
  const augRows = [augAudio, augRealtime, augCodex].filter((model): model is ModelRecord => Boolean(model));
  const augLine = augRows.map((model) => `${modelLink(model)} stores shutdown date ${model.shutdown_date ?? "Not published"}`).join(". ");
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  const audioSources = [
    { label: "Azure speech recognition and generation", url: AZURE_AUDIO_ARCH },
    { label: "Azure OpenAI audio generation quickstart", url: AZURE_AUDIO_QUICKSTART },
    { label: "GPT Realtime API", url: AZURE_REALTIME_HOWTO },
    { label: "Create a transcription", url: AZURE_TRANSCRIBE_REST },
  ];
  return {
    slug: AZURE_JUNE15_GUIDE_SLUG,
    title: `Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI gpt-4o-mini-transcribe 2025-12-15, gpt-4o-mini-tts 2025-12-15, gpt-audio-mini 2025-12-15, and gpt-realtime-mini 2025-12-15 retire on ${AZURE_JUNE15_SHUTDOWN_DATE}. The replacement cell is empty on each row. Speech-to-text, text-to-speech, chat audio, and realtime calls use different APIs.`,
    h1: `Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on ${when}`,
    summary: `${ordered.length} Azure OpenAI audio versions with shutdown date ${AZURE_JUNE15_SHUTDOWN_DATE}. The replacement cell is empty. Test latency, voices, audio formats, and the API version before that day.`,
    answer: `The dataset has ${ordered.length} Azure OpenAI ids with shutdown date ${AZURE_JUNE15_SHUTDOWN_DATE}: ${idList(ordered)}. The retirement schedule lists that date on each of those rows. Lifecycle is GA. The replacement cell is empty, so those cells say Not published. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. gpt-4o-mini-transcribe is file speech-to-text. gpt-4o-mini-tts is text-to-speech. gpt-audio-mini is chat audio. gpt-realtime-mini is the Realtime API. A voice app has to retest the call it already sends.`,
    checked: AZURE_JUNE15_CHECKED,
    steps: [
      {
        name: "Find deployments",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name. gpt-4o-mini-transcribe version 2025-12-15 is the dataset id gpt-4o-mini-transcribe-2025-12-15. gpt-4o-mini-tts version 2025-12-15 is gpt-4o-mini-tts-2025-12-15. gpt-audio-mini version 2025-12-15 is gpt-audio-mini-2025-12-15. gpt-realtime-mini version 2025-12-15 is gpt-realtime-mini-2025-12-15.",
      },
      {
        name: "Pick a replacement",
        text: `The replacement cell is empty for all ${ordered.length} rows. Microsoft did not name a recommended replacement. Shortlist a model yourself. gpt-audio-1.5 version 2026-02-23, gpt-realtime-1.5 version 2026-02-23, and gpt-5.3-codex version 2026-02-24 retire on ${AZURE_AUG24_SHUTDOWN_DATE}. The June 15 replacement cells do not name those ids.`,
      },
      {
        name: "Test",
        text: `Send one real audio request to the model you picked, using a clip or prompt you send now. Do that before ${when}. Check latency, the voice, the audio format, and the API version on that call.`,
      },
      {
        name: "Redeploy before the date",
        text: `Create a deployment of the model you tested and move traffic before ${when}. These rows do not name an automatic-upgrade target. Provisioned deployments are not auto-upgraded. A deployment set to NoAutoUpgrade stops working on the retirement date.`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Azure OpenAI rows whose shutdown date is ${AZURE_JUNE15_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Lifecycle is the schedule's Lifecycle column, copied from the source excerpt stored on the row. Shutdown date and replacement are the fields stored on the row. Not published means the replacement field is empty. These rows do not store a deprecation_date. ${byLifecycle}.`,
          `Checked on ${AZURE_JUNE15_CHECKED}, the retirement schedule lists gpt-4o-mini-transcribe version 2025-12-15, gpt-4o-mini-tts version 2025-12-15, gpt-audio-mini version 2025-12-15, and gpt-realtime-mini version 2025-12-15 as GA with retirement date ${AZURE_JUNE15_SHUTDOWN_DATE} and an empty replacement cell. Those rows do not carry footnote 2 or footnote 3.`,
          `The same schedule prints gpt-realtime-mini version 2025-12-15 a second time. That later row says GA and retirement 2026-12-15, and its replacement cell is empty. SunsetDiff keeps the first base-table row when the same model and version is repeated. The stored shutdown date stays ${AZURE_JUNE15_SHUTDOWN_DATE}. The November and December page records the same rule: [Azure OpenAI retirements from November 15 to December 16, 2026](/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/).`,
          `The lifecycle table says Generally Available means: "${AZURE_GA}" New deployments are allowed, and existing deployments work, until the retirement date. The lifecycle page also says: "${AZURE_CHECK_SCHEDULE}"`,
          older.length
            ? `Other versions of these names are a different shutdown date. ${olderLine}. They are not in the table on this page.`
            : "The dataset has no older version of these four names.",
          `The Azure Government schedule does not list gpt-4o-mini-transcribe, gpt-4o-mini-tts, gpt-audio-mini, or gpt-realtime-mini. The dates in the first table are the public-cloud schedule.`,
        ],
        table: {
          caption: `${ordered.length} Azure OpenAI model ids with shutdown date ${AZURE_JUNE15_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Lifecycle on the schedule", "Shutdown date", "Recommended replacement"],
          rows: ordered.map((model) => [
            modelLink(model),
            azureScheduleLifecycle(model),
            shutdownCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources: [
          ...sources,
          { label: "Azure Government retirement schedule", url: AZURE_GOV_SCHEDULE },
        ],
      },
      {
        heading: "Which call each model uses",
        paragraphs: [
          "The architecture page says Azure OpenAI provides audio models through three interfaces: the Realtime API for low-latency voice conversations, the Chat Completions API with audio for flexible audio generation and transcription in a single model call, and the Audio API via the /audio endpoint for file-based transcription, translation, and TTS.",
          `gpt-4o-mini-transcribe is on Audio API /audio/transcriptions. The architecture table says: "${AZURE_STT_FILE}". The transcription reference is POST /openai/v1/audio/transcriptions. Its model options include gpt-4o-mini-transcribe-2025-12-15. That page does not print a date-based api-version.`,
          `gpt-4o-mini-tts is on Audio API /audio/speech. The architecture table says: "${AZURE_TTS_TONE}" The audio generation quickstart lists gpt-4o-mini-tts as fast, scalable text-to-speech.`,
          `gpt-audio-mini is on Chat Completions. The architecture table says: "${AZURE_CHAT_AUDIO}". The audio generation quickstart says: "${AZURE_AUDIO_MODALITIES}"`,
          `gpt-realtime-mini is on the Realtime API. The architecture table says: "${AZURE_REALTIME_ROW}". The realtime how-to lists gpt-realtime-mini version 2025-12-15 among its supported models. It says: "${AZURE_REALTIME_ALL}" And: "${AZURE_REALTIME_GA_URL}"`,
          "A speech-to-text app, a text-to-speech app, a chat audio app, and a realtime app are four calls. The schedule does not name a model that keeps the same call. When you shortlist a target, confirm that target still accepts the call you send now.",
        ],
        sources: audioSources,
      },
      {
        heading: "Replacements Microsoft names",
        paragraphs: [
          `The schedule says: "${AZURE_REPLACEMENT_COL}" It also says: "${AZURE_DONT_WAIT}" The lifecycle page says: "${AZURE_REPLACEMENT_LISTED}"`,
          named.length
            ? `The replacement cell is filled on ${idList(named)}. ${replacementFaq(named, catalog)}`
            : "No row in this table stores a replacement.",
          empty.length
            ? `The replacement cell is empty on ${idList(empty)}. Empty means Microsoft did not name a recommended replacement on that row. This guide does not add one.`
            : "Every row in this table stores a replacement.",
          `The lifecycle page says: "${AZURE_COMPARE}" Then: "${AZURE_CONFIRM}"`,
        ],
        sources,
      },
      {
        heading: "What to test",
        paragraphs: [
          `Send one real request before ${when}, using audio you send now. The lifecycle page says: "${AZURE_COMPARE}" That sentence names latency. These pages do not print one latency number that covers all ${ordered.length} models.`,
          `The realtime how-to says: "${AZURE_REALTIME_WEBRTC}" Its connection-methods table lists WebRTC at ~100ms, WebSocket at ~200ms, and SIP as Varies. The transcription reference says: "${AZURE_TRANSCRIBE_LANG}" It also says: "${AZURE_TRANSCRIBE_WORD}" The audio generation quickstart does not print a latency number for gpt-4o-mini-tts or gpt-audio-mini.`,
          `Voices: the audio generation quickstart says: "${AZURE_AUDIO_VOICES}" The supported-models table on that page includes gpt-4o-mini-tts, gpt-audio-mini, and gpt-realtime-mini. It does not include gpt-4o-mini-transcribe. A transcription call returns text. The realtime how-to shows an example session with voice alloy and input_audio_format pcm16. Test the voice string your app sends.`,
          `Audio formats: the same quickstart says: "${AZURE_AUDIO_FORMATS}" And: "${AZURE_AUDIO_SIZE}" The realtime how-to says: "${AZURE_REALTIME_PCM}" The list under that sentence is PCM 16-bit (pcm16), mono (single channel), and 24kHz. The transcription reference says: "${AZURE_TRANSCRIBE_FORMATS}" It also says: "${AZURE_TRANSCRIBE_JSON}"`,
          `API version: the audio generation quickstart says: "${AZURE_AUDIO_API}" The sample on that page sets the model to gpt-audio-mini. The realtime how-to says: "${AZURE_REALTIME_GA_URL}" The transcription reference uses POST /openai/v1/audio/transcriptions and does not print a date-based api-version. The schedule does not print an api-version for gpt-4o-mini-tts version 2025-12-15. Keep the api-version the speech call already sends, and send that same version to the model you picked.`,
        ],
        sources: [
          ...audioSources,
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
      {
        heading: "What happens to a deployment on the date",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/). These four rows are GA now, so inference still works until ${when}.`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}" The migration page says: "${AZURE_PAYG}" And: "${AZURE_PTU}" And: "${AZURE_BATCH_PATH}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops. The replacement cell is the target where an automatic upgrade is supported. These four rows have an empty cell, so they do not name that target.`,
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
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the table. gpt-4o-mini-tts version 2025-12-15 is the dataset id gpt-4o-mini-tts-2025-12-15.",
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
        heading: "Related deadlines on August 24, 2027",
        paragraphs: [
          `The retirement schedule lists three later Azure OpenAI rows on ${AZURE_AUG24_SHUTDOWN_DATE}. gpt-audio-1.5 version 2026-02-23 is GA, retirement ${AZURE_AUG24_SHUTDOWN_DATE}, replacement cell empty. gpt-realtime-1.5 version 2026-02-23 is the same. gpt-5.3-codex version 2026-02-24 is the same.`,
          augRows.length
            ? `${augLine}. The batch of those rows is [Azure OpenAI shutdowns on ${augWhen}](/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/). The guide is [Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on ${augWhen}](/guides/${AZURE_AUG24_GUIDE_SLUG}/). The June 15 replacement cells do not name these ids. This page does not turn them into a recommended replacement.`
            : `The batch page is [Azure OpenAI shutdowns on ${augWhen}](/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/). The guide is [Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on ${augWhen}](/guides/${AZURE_AUG24_GUIDE_SLUG}/).`,
        ],
        sources,
      },
      {
        heading: "Fine-tuned training and deployment",
        paragraphs: [
          `The schedule and the lifecycle page both say: "${AZURE_FINE_PHASES}" And: "${AZURE_FINE_UNLESS}" Both pages say: "${AZURE_FINE_FOOT}"`,
          `The fine-tune tables on both pages do not list these four versions. ${fineLines}`,
          "A base deployment of these versions uses the retirement date in the first table. Do not borrow a fine-tune date from a different model.",
        ],
        sources,
      },
      {
        heading: "Redeploy before June 15, 2027",
        paragraphs: [
          `Create a deployment of a model you have tested, point traffic at it, and confirm one real audio request before ${when}. Do that for each of the ${ordered.length} versions in the table.`,
          "Working with models describes two ways to change a provisioned deployment once you have chosen a target. In-place migration keeps the deployment name and moves traffic. Multi-deployment migration creates a second deployment, shifts traffic, then deletes the old one. Neither section names a target for these rows.",
          `The batch of these rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-${AZURE_JUNE15_SHUTDOWN_DATE}/). The [Azure OpenAI provider page](/providers/azure-openai/) lists the other stored rows. The April 14, 2027 batch is [Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027](/guides/${AZURE_APRIL14_GUIDE_SLUG}/). The July 13, 2027 batch is [Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027](/guides/${AZURE_JULY13_GUIDE_SLUG}/).`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Model migration process", url: AZURE_MIGRATION },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/azure-openai-${AZURE_JUNE15_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${when}` },
      { href: `/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${augWhen}` },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: "/models/azure-openai/gpt-4o-mini-transcribe-2025-12-15/", label: "Azure gpt-4o-mini-transcribe-2025-12-15" },
      { href: "/models/azure-openai/gpt-4o-mini-tts-2025-12-15/", label: "Azure gpt-4o-mini-tts-2025-12-15" },
      { href: "/models/azure-openai/gpt-audio-mini-2025-12-15/", label: "Azure gpt-audio-mini-2025-12-15" },
      { href: "/models/azure-openai/gpt-realtime-mini-2025-12-15/", label: "Azure gpt-realtime-mini-2025-12-15" },
      { href: "/models/azure-openai/gpt-audio-1-5-2026-02-23/", label: "Azure gpt-audio-1.5-2026-02-23" },
      { href: "/models/azure-openai/gpt-realtime-1-5-2026-02-23/", label: "Azure gpt-realtime-1.5-2026-02-23" },
      { href: "/models/azure-openai/gpt-5-3-codex-2026-02-24/", label: "Azure gpt-5.3-codex-2026-02-24" },
      { href: `/guides/${AZURE_NOV_DEC_GUIDE_SLUG}/`, label: "Azure OpenAI retirements from November 15 to December 16, 2026" },
      { href: `/guides/${AZURE_APRIL14_GUIDE_SLUG}/`, label: "Azure OpenAI GPT-4.1 and GPT-4o retirement on April 14, 2027" },
      { href: `/guides/${AZURE_JULY13_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027" },
      { href: `/guides/${AZURE_AUG24_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on August 24, 2027" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)}. The retirement schedule lists shutdown date ${AZURE_JUNE15_SHUTDOWN_DATE} for each of them. ${byLifecycle}.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(ordered, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}" The cell is empty on ${idList(empty)}.`,
      },
      {
        question: "What does a speech, TTS, chat audio, or realtime app need to change?",
        answer: `gpt-4o-mini-transcribe-2025-12-15 is file transcription at POST /openai/v1/audio/transcriptions. gpt-4o-mini-tts-2025-12-15 is text-to-speech on /audio/speech, and the architecture page says gpt-4o-mini-tts supports prompt-guided style and tone. gpt-audio-mini-2025-12-15 is chat audio. The quickstart says: "${AZURE_AUDIO_MODALITIES}" gpt-realtime-mini-2025-12-15 is the Realtime API. The how-to says: "${AZURE_REALTIME_GA_URL}" The replacement cell is empty, so you shortlist the next model and confirm it accepts that same call.`,
      },
      {
        question: "What should I test before June 15, 2027?",
        answer: `Test latency, the voice, the audio format, and the API version on one real call before ${AZURE_JUNE15_SHUTDOWN_DATE}. The realtime connection table lists WebRTC at ~100ms, WebSocket at ~200ms, and SIP as Varies. Voices on the audio quickstart: "${AZURE_AUDIO_VOICES}" Output formats: "${AZURE_AUDIO_FORMATS}" Realtime input is PCM 16-bit (pcm16), mono, 24kHz. Transcription input formats: "${AZURE_TRANSCRIBE_FORMATS}" Transcription output for gpt-4o-mini-transcribe is json. Chat audio completions use API version 2025-01-01-preview in the gpt-audio-mini sample. Realtime uses /openai/v1 and does not use a date-based api-version.`,
      },
      {
        question: "Why does the schedule also print 2026-12-15 for gpt-realtime-mini 2025-12-15?",
        answer: `Checked on ${AZURE_JUNE15_CHECKED}, the first row says GA and retirement ${AZURE_JUNE15_SHUTDOWN_DATE}. A later row says GA and retirement 2026-12-15. Both replacement cells are empty. SunsetDiff keeps the first base-table row. The stored id gpt-realtime-mini-2025-12-15 uses ${AZURE_JUNE15_SHUTDOWN_DATE}.`,
      },
      {
        question: "What about the older snapshots?",
        answer: `${olderLine}. Those ids are not in the ${AZURE_JUNE15_SHUTDOWN_DATE} table.`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `No. The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL} These four rows have an empty replacement cell, so they do not name an upgrade target.`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}" The migration page says: "${AZURE_INVENTORY}"`,
      },
      {
        question: "Do fine-tuned deployments of these versions retire on June 15, 2027?",
        answer: `The base retirement date is ${AZURE_JUNE15_SHUTDOWN_DATE}. The fine-tune tables do not list these four versions. ${fineLines} Both pages say: "${AZURE_FINE_FOOT}"`,
      },
      {
        question: "Does Azure Government list the same date?",
        answer: `The Azure Government schedule does not list gpt-4o-mini-transcribe, gpt-4o-mini-tts, gpt-audio-mini, or gpt-realtime-mini. The public-cloud schedule lists all four ids on ${AZURE_JUNE15_SHUTDOWN_DATE}.`,
      },
      {
        question: "What retires on August 24, 2027?",
        answer: `The schedule lists gpt-audio-1.5 version 2026-02-23, gpt-realtime-1.5 version 2026-02-23, and gpt-5.3-codex version 2026-02-24 as GA with retirement date ${AZURE_AUG24_SHUTDOWN_DATE} and an empty replacement cell. ${augLine}. See [Azure OpenAI shutdowns on ${augWhen}](/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/) and [Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on ${augWhen}](/guides/${AZURE_AUG24_GUIDE_SLUG}/). Those ids are not the replacement cell for the ${AZURE_JUNE15_SHUTDOWN_DATE} rows.`,
      },
    ],
    citations: [
      AZURE_SCHEDULE,
      AZURE_RETIREMENTS,
      AZURE_WORKING,
      AZURE_VERSIONS,
      AZURE_MIGRATION,
      AZURE_GOV_SCHEDULE,
      AZURE_AUDIO_ARCH,
      AZURE_AUDIO_QUICKSTART,
      AZURE_REALTIME_HOWTO,
      AZURE_TRANSCRIBE_REST,
    ],
  };
}

const AZURE_MODELS_SOLD = "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure";
const AZURE_CODEX_HOWTO = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/codex";
const AZURE_WHATS_NEW = "https://learn.microsoft.com/en-us/azure/foundry-classic/openai/whats-new";
const AZURE_AUDIO_APIS = "Audio models in Azure OpenAI are available via the realtime, completions, and audio APIs.";
const AZURE_AUDIO_FAMILY = "The GPT-4o audio models are part of the GPT-4o model family and support either low-latency, speech in, speech out conversational interactions or audio generation.";
const AZURE_AUDIO_15_DESC = "Audio model for audio and text generation.";
const AZURE_REALTIME_15_DESC = "Audio model for real-time audio processing.";
const AZURE_CODEX_PICK = "From the model catalog select a reasoning model such as gpt-6-astra, gpt-6-sol, gpt-5.3-codex, gpt-5.2-codex, gpt-5.1-codex-max, gpt-5.1-codex, gpt-5.1-codex-mini, gpt-5-codex, gpt-5, gpt-5-mini, or gpt-5-nano.";
const AZURE_CODEX_V1 = "With the v1 API you no longer need to pass api-version, but you must include /v1 in the base_url path.";
const AZURE_CODEX_NAME = "Replace with your actual Azure model deployment name";
const AZURE_WHATS_NEW_OUT = "The gpt-realtime-1.5 and gpt-audio-1.5 models are now available.";
const AZURE_WHATS_NEW_BUILD = "These models build on last year's GPT-Realtime and GPT-Audio with improvements in instruction following, multilingual support, and tool calling, while preserving the low-latency, real-time interactions developers need for voice-based applications.";
const AZURE_WHATS_NEW_TRY = "Try them with the existing chat completion APIs in Microsoft Foundry.";
const AZURE_REALTIME_60 = "Realtime sessions have a maximum duration of 60 minutes.";
const AZURE_REALTIME_TOKENS = "The Realtime API supports up to 32,000 input tokens and 4,096 output tokens.";

function azureAug24Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(AZURE_AUG24_SHUTDOWN_DATE);
  const juneWhen = longDate(AZURE_JUNE15_SHUTDOWN_DATE);
  const byLifecycle = ordered.map((model) => `${model.id} (${azureScheduleLifecycle(model)})`).join(", ");
  const named = ordered.filter((model) => publishedReplacementIds(model).length > 0);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const fineLines = ordered.map(azureFineTuneSentence).join(" ");
  const findAzure = (id: string) => catalog.find((model) => model.provider === "azure-openai" && model.id === id);
  const findOpenAi = (id: string) => catalog.find((model) => model.provider === "openai" && model.id === id);
  const storedLine = (model: ModelRecord | undefined) => {
    if (!model) return "Not published";
    const replacement = publishedReplacementIds(model).join(", ") || "Not published";
    return `${modelLink(model)} stores shutdown date ${model.shutdown_date ?? "Not published"} and replacement ${replacement}`;
  };
  const june = catalog.filter(isAzureJune15Retirement).sort((a, b) => a.id.localeCompare(b.id));
  const juneLine = june.map((model) => storedLine(model)).join(". ");
  const peers = [
    "gpt-audio-2025-08-28",
    "gpt-realtime-2025-08-28",
    "gpt-5-codex-2025-09-15",
    "gpt-realtime-2-2026-05-06",
    "gpt-realtime-2.1-2026-07-07",
    "gpt-realtime-2.1-mini-2026-07-07",
    "gpt-realtime-2.1",
  ].map(findAzure);
  const peerLine = peers.map((model) => storedLine(model)).join(". ");
  const openaiCodex = findOpenAi("gpt-5.3-codex");
  const openaiAudio = findOpenAi("gpt-audio-1.5");
  const openaiRealtime = findOpenAi("gpt-realtime-1.5");
  const sources = [
    { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
    { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
  ];
  const callSources = [
    { label: "Foundry Models sold by Azure", url: AZURE_MODELS_SOLD },
    { label: "Codex with Azure OpenAI", url: AZURE_CODEX_HOWTO },
    { label: "Azure OpenAI what's new", url: AZURE_WHATS_NEW },
    { label: "GPT Realtime API", url: AZURE_REALTIME_HOWTO },
    { label: "Azure OpenAI audio generation quickstart", url: AZURE_AUDIO_QUICKSTART },
  ];
  return {
    slug: AZURE_AUG24_GUIDE_SLUG,
    title: `Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on ${when} | SunsetDiff`,
    description: `Azure OpenAI gpt-5.3-codex version 2026-02-24, gpt-audio-1.5 version 2026-02-23, and gpt-realtime-1.5 version 2026-02-23 retire on ${AZURE_AUG24_SHUTDOWN_DATE}. The replacement cell is empty on each row. OpenAI's API retires gpt-5.3-codex earlier, on ${APRIL_1_2027_SHUTDOWN_DATE}.`,
    h1: `Azure OpenAI gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 retirement on ${when}`,
    summary: `${ordered.length} Azure OpenAI versions with shutdown date ${AZURE_AUG24_SHUTDOWN_DATE}. The replacement cell is empty. Codex, chat audio, and realtime calls are different.`,
    answer: `The dataset has ${ordered.length} Azure OpenAI ids with shutdown date ${AZURE_AUG24_SHUTDOWN_DATE}: ${idList(ordered)}. The retirement schedule lists that date on each of those rows. Lifecycle is GA. The replacement cell is empty, so those cells say Not published. The lifecycle page says a Retired model is removed from service and all inference requests return 410 Gone. gpt-5.3-codex version 2026-02-24 is a Responses API model used by Codex. gpt-audio-1.5 version 2026-02-23 is an audio model for audio and text generation. gpt-realtime-1.5 version 2026-02-23 is an audio model for real-time audio processing. OpenAI's API retires gpt-5.3-codex on ${APRIL_1_2027_SHUTDOWN_DATE}. Microsoft's Azure schedule does not print that date for these rows.`,
    checked: AZURE_AUG24_CHECKED,
    steps: [
      {
        name: "Find deployments",
        text: "Call Deployments List, or Get-AzCognitiveServicesAccountDeployment, for each Azure OpenAI resource. Read properties.model.name and properties.model.version. A deployment name can differ from the model name. gpt-5.3-codex version 2026-02-24 is the dataset id gpt-5.3-codex-2026-02-24. gpt-audio-1.5 version 2026-02-23 is gpt-audio-1.5-2026-02-23. gpt-realtime-1.5 version 2026-02-23 is gpt-realtime-1.5-2026-02-23.",
      },
      {
        name: "Pick a replacement",
        text: `The replacement cell is empty for gpt-5.3-codex 2026-02-24, gpt-audio-1.5 2026-02-23, and gpt-realtime-1.5 2026-02-23. Microsoft did not name a recommended replacement on these rows. Shortlist a model yourself and test it. Do not copy OpenAI's gpt-6-sol onto the Azure gpt-5.3-codex row. The Codex how-to sample sets the model string to gpt-5-codex and says to replace it with your deployment name. That sample string is not the replacement cell.`,
      },
      {
        name: "Test",
        text: `Send one real request to the model you picked before ${when}. For gpt-5.3-codex, send a coding prompt on the Responses API. For gpt-realtime-1.5, send one realtime audio call and check latency, the voice, and pcm16. For gpt-audio-1.5, send one audio and text request. The audio quickstart does not name gpt-audio-1.5 in its supported-models table, so confirm the API version and the voice on the call you already send.`,
      },
      {
        name: "Redeploy before the date",
        text: `Create a deployment of the model you tested and move traffic before ${when}. These rows do not name an automatic-upgrade target. Provisioned deployments are not auto-upgraded. A deployment set to NoAutoUpgrade stops working on the retirement date.`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Azure OpenAI rows whose shutdown date is ${AZURE_AUG24_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Lifecycle is the schedule's Lifecycle column, copied from the source excerpt stored on the row. Shutdown date and replacement are the fields stored on the row. Not published means the replacement field is empty. These rows do not store a deprecation_date. ${byLifecycle}.`,
          `Checked on ${AZURE_AUG24_CHECKED}, the retirement schedule lists gpt-5.3-codex version 2026-02-24, gpt-audio-1.5 version 2026-02-23, and gpt-realtime-1.5 version 2026-02-23 as GA with retirement date ${AZURE_AUG24_SHUTDOWN_DATE} and an empty replacement cell. Those rows do not carry footnote 2 or footnote 3. The schedule does not print a second row for any of these three versions.`,
          `The lifecycle table says Generally Available means: "${AZURE_GA}" New deployments are allowed, and existing deployments work, until the retirement date. The lifecycle page also says: "${AZURE_CHECK_SCHEDULE}"`,
          `The Azure Government schedule does not list gpt-5.3-codex, gpt-audio-1.5, or gpt-realtime-1.5. The dates in the first table are the public-cloud schedule.`,
        ],
        table: {
          caption: `${ordered.length} Azure OpenAI model ids with shutdown date ${AZURE_AUG24_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Lifecycle on the schedule", "Shutdown date", "Recommended replacement"],
          rows: ordered.map((model) => [
            modelLink(model),
            azureScheduleLifecycle(model),
            shutdownCell(model),
            replacementText(model, catalog),
          ]),
        },
        sources: [
          ...sources,
          { label: "Azure Government retirement schedule", url: AZURE_GOV_SCHEDULE },
        ],
      },
      {
        heading: "Which call each model uses",
        paragraphs: [
          `The models page lists gpt-5.3-codex (2026-02-24). The description cell includes Reasoning, Responses API, Structured outputs, Text and image processing, Functions, tools, and parallel tool calling, Full summary of capabilities, and Optimized for Codex CLI & Codex VS Code extension. The context window cell lists 400,000, with input 272,000 and output 128,000. The max output tokens cell is 128,000. The training data cell says August 2025.`,
          `The Codex how-to says: "${AZURE_CODEX_PICK}" That sentence is a list of reasoning models you can deploy. It is not the Replacement column on the retirement schedule. The same page says: "${AZURE_CODEX_V1}" The sample sets wire_api to responses and the model string to gpt-5-codex. The comment on that line says: "${AZURE_CODEX_NAME}" Put the deployment name in that field. The sample string gpt-5-codex is not the replacement for gpt-5.3-codex version 2026-02-24.`,
          `The models page says: "${AZURE_AUDIO_APIS}" Under GPT-4o audio models it says: "${AZURE_AUDIO_FAMILY}" The table under that sentence lists gpt-audio-1.5 (2026-02-23) as "${AZURE_AUDIO_15_DESC}" The max request tokens cell prints input 128,000 and output 16,384. Training data is up to September 2024. It lists gpt-realtime-1.5 (2026-02-23) as "${AZURE_REALTIME_15_DESC}" The max request tokens cell prints input 32,000 and output 4,096. Training data is up to September 2024.`,
          `What's new says: "${AZURE_WHATS_NEW_OUT}" Then: "${AZURE_WHATS_NEW_BUILD}" Then: "${AZURE_WHATS_NEW_TRY}" That page does not print an api-version for either model.`,
          `The realtime how-to lists gpt-realtime-1.5 (2026-02-23) among its supported models. It says the API supports low-latency, speech in, speech out conversational interactions. It says: "${AZURE_REALTIME_ALL}" And: "${AZURE_REALTIME_GA_URL}" It also says: "${AZURE_REALTIME_TOKENS}" The audio quickstart supported-models table includes gpt-realtime-1.5. The primary use cell is real-time interactive voice. That table does not include gpt-audio-1.5.`,
          `gpt-5.3-codex, gpt-audio-1.5, and gpt-realtime-1.5 are three calls. The schedule does not name a model that keeps the same call. When you shortlist a target, confirm that target still accepts the call you send now.`,
        ],
        sources: callSources,
      },
      {
        heading: "Replacements Microsoft names",
        paragraphs: [
          `The schedule says: "${AZURE_REPLACEMENT_COL}" It also says: "${AZURE_DONT_WAIT}" The lifecycle page says: "${AZURE_REPLACEMENT_LISTED}"`,
          named.length
            ? `The replacement cell is filled on ${idList(named)}. ${replacementFaq(named, catalog)}`
            : "No row in this table stores a replacement.",
          empty.length
            ? `The replacement cell is empty on ${idList(empty)}. Empty means Microsoft did not name a recommended replacement on that row. This guide does not add one.`
            : "Every row in this table stores a replacement.",
          `The lifecycle page says: "${AZURE_COMPARE}" Then: "${AZURE_CONFIRM}"`,
          `The Codex deploy list names gpt-6-sol. The retirement schedule does not print gpt-6-sol in the replacement cell for gpt-5.3-codex version 2026-02-24. This guide does not turn that deploy list into an Azure replacement.`,
        ],
        sources: [
          ...sources,
          { label: "Codex with Azure OpenAI", url: AZURE_CODEX_HOWTO },
        ],
      },
      {
        heading: "What to test",
        paragraphs: [
          `Send one real request before ${when}. The lifecycle page says: "${AZURE_COMPARE}" That sentence names latency. These pages do not print one latency number that covers all ${ordered.length} models.`,
          `gpt-5.3-codex version 2026-02-24: the models page lists the Responses API, structured outputs, text and image processing, and tools. The Codex sample uses /openai/v1 and does not pass api-version. Test one coding prompt you send now, on the deployment name you will keep. The context window cell lists input 272,000 and output 128,000.`,
          `gpt-realtime-1.5 version 2026-02-23: the realtime how-to says: "${AZURE_REALTIME_WEBRTC}" Its connection-methods table lists WebRTC at ~100ms, WebSocket at ~200ms, and SIP as Varies. The example session uses voice alloy and input_audio_format pcm16. The page says: "${AZURE_REALTIME_PCM}" The list under that sentence is PCM 16-bit (pcm16), mono (single channel), and 24kHz. It also says: "${AZURE_REALTIME_60}" The models page lists input 32,000 and output 4,096 for this version. The how-to says: "${AZURE_REALTIME_GA_URL}"`,
          `gpt-audio-1.5 version 2026-02-23: the models page calls it an audio model for audio and text generation, with input 128,000 and output 16,384. What's new says to try it with the existing chat completion APIs. The audio quickstart says: "${AZURE_AUDIO_VOICES}" And: "${AZURE_AUDIO_FORMATS}" And: "${AZURE_AUDIO_API}" The supported-models table on that page does not include gpt-audio-1.5, and the sample sets the model to gpt-audio-mini. This guide does not copy that voice list, those formats, or API version 2025-01-01-preview onto gpt-audio-1.5. Confirm the API version and the voice on the call you already send.`,
        ],
        sources: [
          ...callSources,
          { label: "Foundry Models lifecycle", url: AZURE_RETIREMENTS },
        ],
      },
      {
        heading: "OpenAI's date is earlier for gpt-5.3-codex",
        paragraphs: [
          `OpenAI's API deprecations page says: "${APRIL_NOTICE}" That date is ${APRIL_1_2027_SHUTDOWN_DATE}. The same table lists gpt-5.3-codex with replacement gpt-6-sol. The OpenAI row is on [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/). ${openaiShutdownLine(openaiCodex)}.`,
          `Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as a shutdown date for Azure gpt-5.3-codex version 2026-02-24. The Azure row stays ${AZURE_AUG24_SHUTDOWN_DATE}, and its replacement cell is empty. A team that calls the OpenAI API and Azure should plan the OpenAI gpt-5.3-codex calls for ${APRIL_1_2027_SHUTDOWN_DATE}. The Azure deployment keeps ${AZURE_AUG24_SHUTDOWN_DATE}. Do not copy gpt-6-sol onto the Azure row.`,
          `The same OpenAI page names gpt-audio-1.5 as a replacement for older audio ids, including gpt-audio and gpt-audio-mini. It names gpt-realtime-1.5 as a replacement for gpt-4o-realtime-preview. It does not print a shutdown date for gpt-audio-1.5 or gpt-realtime-1.5. ${openaiShutdownLine(openaiAudio)}. ${openaiShutdownLine(openaiRealtime)}. Those stored rows are the OpenAI API. The Azure rows still use ${AZURE_AUG24_SHUTDOWN_DATE}.`,
        ],
        sources: [
          ...sources,
          { label: "OpenAI deprecations", url: OPENAI_DEPRECATIONS },
        ],
      },
      {
        heading: "Other Azure rows are a different date",
        paragraphs: [
          `June 15, 2027 is an earlier audio date. ${juneLine}. The guide is [Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on ${juneWhen}](/guides/${AZURE_JUNE15_GUIDE_SLUG}/). The replacement cell on those rows is empty. They do not name gpt-audio-1.5 or gpt-realtime-1.5.`,
          `These other stored rows are not the ${AZURE_AUG24_SHUTDOWN_DATE} table. ${peerLine}.`,
          `The schedule names gpt-realtime-2.1 as the replacement for gpt-realtime-2 version 2026-05-06. It does not name gpt-realtime-2.1 as the replacement for gpt-realtime-1.5 version 2026-02-23. The dated row gpt-realtime-2.1-2026-07-07 stores shutdown date 2027-06-25, which is before ${AZURE_AUG24_SHUTDOWN_DATE}. The Codex sample string gpt-5-codex is the family of gpt-5-codex-2025-09-15, and that stored row retires on 2027-03-17. Neither date is an Azure replacement for the rows in the first table.`,
        ],
        sources,
      },
      {
        heading: "What happens to a deployment on the date",
        paragraphs: [
          `The lifecycle table says Retired means: "${AZURE_RETIRED}" New deployments are not allowed, and existing deployments do not work. The same page says the API value lifecycleStatus Deprecated means the model is retired and inference returns 410 Gone. The docs stage Deprecated is lifecycleStatus Deprecating, and inference still works. The sentences and the status map are on [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/). These three rows are GA now, so inference still works until ${when}.`,
          `The lifecycle page says: "${AZURE_AUTO}" It also says: "${AZURE_PROVISIONED}" The migration page says: "${AZURE_PAYG}" And: "${AZURE_PTU}" And: "${AZURE_BATCH_PATH}"`,
          `Working with models says: "${AZURE_STANDARD_ONLY}" OnceCurrentVersionExpired means: "${AZURE_EXPIRED}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" And: "${AZURE_NULL}"`,
          `The same page says: "${AZURE_SPECIFIC}" Then: "${AZURE_THEN_DEFAULT}" A deployment you pinned to one of these versions can still move on the retirement date unless versionUpgradeOption is NoAutoUpgrade. NoAutoUpgrade does not move, and the deployment stops. The replacement cell is the target where an automatic upgrade is supported. These three rows have an empty cell, so they do not name that target.`,
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
          "The example response puts the model name and version on properties.model. The deployment's own name is the name field next to that object. Match properties.model.name and properties.model.version to the ids in the table. gpt-5.3-codex version 2026-02-24 is the dataset id gpt-5.3-codex-2026-02-24.",
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
        heading: "Fine-tuned training and deployment",
        paragraphs: [
          `The schedule and the lifecycle page both say: "${AZURE_FINE_PHASES}" And: "${AZURE_FINE_UNLESS}" Both pages say: "${AZURE_FINE_FOOT}"`,
          `The fine-tune tables on both pages do not list gpt-5.3-codex version 2026-02-24, gpt-audio-1.5 version 2026-02-23, or gpt-realtime-1.5 version 2026-02-23. ${fineLines}`,
          "A base deployment of these versions uses the retirement date in the first table. Do not borrow a fine-tune date from a different model.",
        ],
        sources,
      },
      {
        heading: "Redeploy before August 24, 2027",
        paragraphs: [
          `Create a deployment of a model you have tested, point traffic at it, and confirm one real request before ${when}. Do that for each of the ${ordered.length} versions in the table.`,
          "Working with models describes two ways to change a provisioned deployment once you have chosen a target. In-place migration keeps the deployment name and moves traffic. Multi-deployment migration creates a second deployment, shifts traffic, then deletes the old one. Neither section names a target for these rows.",
          `The batch of these rows is [Azure OpenAI shutdowns on ${when}](/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/). The [Azure OpenAI provider page](/providers/azure-openai/) lists the other stored rows. The earlier audio batch is [Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on ${juneWhen}](/guides/${AZURE_JUNE15_GUIDE_SLUG}/). The July 13, 2027 batch is [Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027](/guides/${AZURE_JULY13_GUIDE_SLUG}/).`,
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency. These Azure rows do not store a price.",
        ],
        sources: [
          { label: "Model migration process", url: AZURE_MIGRATION },
          { label: "Working with Azure OpenAI models", url: AZURE_WORKING },
          { label: "Azure OpenAI retirement schedule", url: AZURE_SCHEDULE },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/azure-openai-${AZURE_AUG24_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${when}` },
      { href: `/shutdowns/azure-openai-${AZURE_JUNE15_SHUTDOWN_DATE}/`, label: `Azure OpenAI shutdowns on ${juneWhen}` },
      { href: "/providers/azure-openai/", label: "Azure OpenAI provider page" },
      { href: "/errors/azure-openai-retired-model-410-gone/", label: "Azure OpenAI retired models return 410 Gone" },
      { href: "/models/azure-openai/gpt-5-3-codex-2026-02-24/", label: "Azure gpt-5.3-codex-2026-02-24" },
      { href: "/models/azure-openai/gpt-audio-1-5-2026-02-23/", label: "Azure gpt-audio-1.5-2026-02-23" },
      { href: "/models/azure-openai/gpt-realtime-1-5-2026-02-23/", label: "Azure gpt-realtime-1.5-2026-02-23" },
      { href: `/guides/${AZURE_JUNE15_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on June 15, 2027" },
      { href: `/guides/${AZURE_JULY13_GUIDE_SLUG}/`, label: "Azure OpenAI gpt-5.1, gpt-5-mini, and gpt-5.2-codex retirement on July 13, 2027" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: "/models/openai/gpt-5-3-codex/", label: "OpenAI gpt-5.3-codex" },
      { href: "/models/openai/gpt-audio-1-5/", label: "OpenAI gpt-audio-1.5" },
      { href: "/models/openai/gpt-realtime-1-5/", label: "OpenAI gpt-realtime-1.5" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Azure OpenAI versions retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)}. The retirement schedule lists shutdown date ${AZURE_AUG24_SHUTDOWN_DATE} for each of them. ${byLifecycle}. gpt-5.3-codex version 2026-02-24, gpt-audio-1.5 version 2026-02-23, and gpt-realtime-1.5 version 2026-02-23.`,
      },
      {
        question: "What is the official replacement?",
        answer: `${replacementFaq(ordered, catalog)} The schedule says: "${AZURE_REPLACEMENT_COL}" The cell is empty on ${idList(empty)}. This guide does not add gpt-6-sol, gpt-5-codex, or gpt-realtime-2.1 as an Azure replacement for these rows.`,
      },
      {
        question: "Does OpenAI's April 1, 2027 shutdown of gpt-5.3-codex apply to Azure?",
        answer: `No for the Azure deployment. Microsoft's retirement schedule and lifecycle page do not print ${APRIL_1_2027_SHUTDOWN_DATE} as an Azure gpt-5.3-codex shutdown. The schedule lists Azure gpt-5.3-codex version 2026-02-24 as GA with retirement date ${AZURE_AUG24_SHUTDOWN_DATE} and an empty replacement cell. OpenAI's deprecations page says: "${APRIL_NOTICE}" The same table lists gpt-5.3-codex with replacement gpt-6-sol. That sentence is the OpenAI API. See [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/). ${openaiShutdownLine(openaiCodex)}.`,
      },
      {
        question: "What call does each model use?",
        answer: `gpt-5.3-codex-2026-02-24 is on the Responses API. The models page lists that API, and the Codex sample uses /openai/v1 with wire_api responses. gpt-audio-1.5-2026-02-23 is an audio model for audio and text generation. What's new says: "${AZURE_WHATS_NEW_TRY}" The audio quickstart supported-models table does not include gpt-audio-1.5. gpt-realtime-1.5-2026-02-23 is real-time audio. The realtime how-to lists version 2026-02-23 and says: "${AZURE_REALTIME_GA_URL}"`,
      },
      {
        question: "What should I test before August 24, 2027?",
        answer: `Test one real call before ${AZURE_AUG24_SHUTDOWN_DATE}. For gpt-5.3-codex version 2026-02-24, send a coding prompt on the Responses API and check tools and structured outputs. For gpt-realtime-1.5 version 2026-02-23, test latency, the voice, and pcm16. The realtime connection table lists WebRTC at ~100ms, WebSocket at ~200ms, and SIP as Varies. Input is PCM 16-bit (pcm16), mono, 24kHz. Sessions last at most 60 minutes. For gpt-audio-1.5 version 2026-02-23, send one audio and text request. The quickstart does not print an api-version for that id.`,
      },
      {
        question: "Do gpt-audio-1.5 and gpt-realtime-1.5 have an OpenAI shutdown date?",
        answer: `OpenAI's deprecations page does not print a shutdown date for gpt-audio-1.5 or gpt-realtime-1.5. It names them as replacements for older audio and realtime ids. ${openaiShutdownLine(openaiAudio)}. ${openaiShutdownLine(openaiRealtime)}. The Azure rows gpt-audio-1.5-2026-02-23 and gpt-realtime-1.5-2026-02-23 store ${AZURE_AUG24_SHUTDOWN_DATE}.`,
      },
      {
        question: "What does Azure return after retirement?",
        answer: `The lifecycle page says a Retired model is removed from service and: "${AZURE_RETIRED}" See [Azure OpenAI retired models return 410 Gone](/errors/azure-openai-retired-model-410-gone/).`,
      },
      {
        question: "Will every deployment upgrade itself?",
        answer: `No. The lifecycle page says: "${AZURE_AUTO}" And: "${AZURE_PROVISIONED}" Working with models says: "${AZURE_STANDARD_ONLY}" NoAutoUpgrade means: "${AZURE_NO_AUTO}" ${AZURE_NULL} These three rows have an empty replacement cell, so they do not name an upgrade target.`,
      },
      {
        question: "How do I find deployments that still use these versions?",
        answer: `Working with models says: "${AZURE_LIST}" Read properties.model.name and properties.model.version. The model versions page says: "${AZURE_PORTAL}" The migration page says: "${AZURE_INVENTORY}" gpt-5.3-codex version 2026-02-24 is gpt-5.3-codex-2026-02-24. gpt-audio-1.5 version 2026-02-23 is gpt-audio-1.5-2026-02-23. gpt-realtime-1.5 version 2026-02-23 is gpt-realtime-1.5-2026-02-23.`,
      },
      {
        question: "Do fine-tuned deployments of these versions retire on August 24, 2027?",
        answer: `The base retirement date is ${AZURE_AUG24_SHUTDOWN_DATE}. The fine-tune tables do not list these three versions. ${fineLines} Both pages say: "${AZURE_FINE_FOOT}"`,
      },
      {
        question: "Does Azure Government list the same date?",
        answer: `The Azure Government schedule does not list gpt-5.3-codex, gpt-audio-1.5, or gpt-realtime-1.5. The public-cloud schedule lists all three ids on ${AZURE_AUG24_SHUTDOWN_DATE}.`,
      },
      {
        question: "What about the June 15, 2027 audio models, gpt-realtime-2.1, and the Codex sample string?",
        answer: `${juneLine}. See [Azure OpenAI gpt-4o-mini-tts, transcribe, and realtime audio retirement on ${juneWhen}](/guides/${AZURE_JUNE15_GUIDE_SLUG}/). ${peerLine}. gpt-realtime-2 version 2026-05-06 retires on 2027-01-20 and names gpt-realtime-2.1. See [Azure OpenAI shutdowns on January 20, 2027](/shutdowns/azure-openai-2027-01-20/). gpt-realtime-2.1 version 2026-07-07 retires on 2027-06-25. gpt-5-codex version 2025-09-15 retires on 2027-03-17. None of those cells is the replacement for the ${AZURE_AUG24_SHUTDOWN_DATE} rows.`,
      },
    ],
    citations: [
      AZURE_SCHEDULE,
      AZURE_RETIREMENTS,
      AZURE_WORKING,
      AZURE_VERSIONS,
      AZURE_MIGRATION,
      AZURE_GOV_SCHEDULE,
      AZURE_MODELS_SOLD,
      AZURE_CODEX_HOWTO,
      AZURE_WHATS_NEW,
      AZURE_REALTIME_HOWTO,
      AZURE_AUDIO_QUICKSTART,
      OPENAI_DEPRECATIONS,
    ],
  };
}

const MISTRAL_MODELS_URL = "https://docs.mistral.ai/models";
const MISTRAL_LIFECYCLE_URL = "https://docs.mistral.ai/inference/model-lifecycle";
const MISTRAL_CHANGELOG_URL = "https://docs.mistral.ai/resources/changelogs";
const MISTRAL_LARGE3_URL = "https://docs.mistral.ai/models/mistral-large-3-25-12";
const MISTRAL_MEDIUM_URL = "https://docs.mistral.ai/models/mistral-medium-3-5-26-04";
const MISTRAL_VOX_TRANSCRIBE_URL = "https://docs.mistral.ai/models/voxtral-mini-transcribe-26-02";
const MISTRAL_VOX_REALTIME_URL = "https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-26-02";
const MISTRAL_VOX_TTS_URL = "https://docs.mistral.ai/models/voxtral-tts-26-03";
const MISTRAL_LARGE4_URL = "https://docs.mistral.ai/models/mistral-large-4-0";
const MISTRAL_VOX_TRANSCRIBE3_URL = "https://docs.mistral.ai/models/voxtral-mini-transcribe-3-0";
const MISTRAL_VOX_REALTIME3_URL = "https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-3-0";
const MISTRAL_VOX_TTS3_URL = "https://docs.mistral.ai/models/voxtral-mini-tts-3-0";
const MISTRAL_AUDIO_URL = "https://docs.mistral.ai/studio/audio/overview";
const MISTRAL_VOX_MIGRATE_URL = "https://docs.mistral.ai/studio/audio/migrate-from-voxtral-2";
const MISTRAL_STILL = "A deprecated model still answers requests until its retirement date. A retired model no longer does: use its replacement.";
const MISTRAL_404 = "During the deprecation period, the model remains accessible. Once retired, requests to its identifiers fail with a 404 error.";
const MISTRAL_ALIAS_WARN = "Using an alias may expose you to silent updates in model behavior and pricing. For precise control, pin your deployment to a specific major.minor version identifier.";
const MISTRAL_PREVIEW_UPDATES = "Allow silent updates.";
const MISTRAL_PREVIEW_PATH = "Have no guaranteed path to General Availability, and may be retired before reaching it.";
const MISTRAL_ANNOUNCED = "Deprecation is announced as soon as a replacement model is available. The replacement can be in General Availability or Public Preview.";
const MISTRAL_LARGE4_RELEASE = "Mistral Large 4 (mistral-large-4) is now available in Public Preview.";
const MISTRAL_VOX3_RELEASE = "We released the Voxtral 3 audio family, our next generation of speech-to-text and text-to-speech models. All four models are in Public Preview.";
const MISTRAL_MAP = "Replace each Voxtral 2 model ID with the ID of its Voxtral 3 replacement. Each Voxtral 3 model also answers to the aliases in the last column.";
const MISTRAL_WORD = "Word timestamps are gone. timestamp_granularities accepts segment only, and word returns a 400 error.";
const MISTRAL_LOCK = "A realtime session locks its settings when the first audio chunk arrives. A later session.update gets an error event.";
const MISTRAL_TTS_ALIAS = "voxtral-mini-tts-latest will point to Voxtral 3 within a month of GA.";
const MISTRAL_AUDIO_COVER = "The audio docs cover Voxtral 3. If your code still calls Voxtral 2 models, Migrate from Voxtral 2 lists what to change.";
const MISTRAL_USE_LARGE = "This model is deprecated. Use Mistral Large 4 for new integrations.";
const MISTRAL_USE_TRANSCRIBE = "This model is deprecated. Use Voxtral Mini Transcribe 3 for new integrations.";
const MISTRAL_USE_REALTIME = "This model is deprecated. Use Voxtral Mini Transcribe Realtime 3 for new integrations.";
const MISTRAL_USE_TTS = "This model is deprecated. Use Voxtral TTS 3 for new integrations.";

function mistralApril30Official(id: string): string {
  if (id === "mistral-large-2512" || id === "mistral-medium-3-5") return "Mistral Large 4 (mistral-large-4)";
  if (id === "voxtral-mini-2602") return "Voxtral Mini Transcribe 3 (voxtral-mini-transcribe-3-0)";
  if (id === "voxtral-mini-transcribe-realtime-2602") return "Voxtral Mini Transcribe Realtime 3 (voxtral-mini-transcribe-realtime-3-0)";
  if (id === "voxtral-mini-tts-2603") return "Voxtral TTS 3 (voxtral-mini-tts-3-0)";
  return "Not published";
}

function mistralApril30Search(): string {
  const ids = [
    ...MISTRAL_APRIL30_IDS,
    "mistral-large-latest",
    "mistral-medium-3",
    "mistral-medium-latest",
    "voxtral-mini-latest",
    "voxtral-mini-realtime-latest",
    "voxtral-mini-tts-latest",
  ];
  return `rg -n -w ${ids.map((id) => `-e '${id}'`).join(" ")}\n`;
}

function mistralApril30Guide(rows: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(MISTRAL_APRIL30_SHUTDOWN_DATE);
  const deprecatedOn = longDate(MISTRAL_APRIL30_DEPRECATION_DATE);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const noteLines = ordered.map((model) => `${model.id}: ${model.region_or_platform_notes ?? "no note is stored"}`).join(" ");
  const textIds = ordered.filter((model) => model.id.startsWith("mistral-"));
  const audioIds = ordered.filter((model) => model.id.startsWith("voxtral-"));
  const sources = [
    { label: "Mistral models", url: MISTRAL_MODELS_URL },
    { label: "Mistral model lifecycle", url: MISTRAL_LIFECYCLE_URL },
  ];
  const cardSources = [
    { label: "Mistral Large 3", url: MISTRAL_LARGE3_URL },
    { label: "Mistral Medium 3.5", url: MISTRAL_MEDIUM_URL },
    { label: "Voxtral Mini Transcribe 2", url: MISTRAL_VOX_TRANSCRIBE_URL },
    { label: "Voxtral Mini Transcribe Realtime", url: MISTRAL_VOX_REALTIME_URL },
    { label: "Voxtral TTS", url: MISTRAL_VOX_TTS_URL },
  ];
  const replacementSources = [
    { label: "Mistral Large 4", url: MISTRAL_LARGE4_URL },
    { label: "Voxtral Mini Transcribe 3", url: MISTRAL_VOX_TRANSCRIBE3_URL },
    { label: "Voxtral Mini Transcribe Realtime 3", url: MISTRAL_VOX_REALTIME3_URL },
    { label: "Voxtral TTS 3", url: MISTRAL_VOX_TTS3_URL },
  ];
  return {
    slug: MISTRAL_APRIL30_GUIDE_SLUG,
    title: `Mistral Large 3, Medium 3.5, and Voxtral retirement on ${when} | SunsetDiff`,
    description: `mistral-large-2512, mistral-medium-3-5, voxtral-mini-2602, voxtral-mini-transcribe-realtime-2602, and voxtral-mini-tts-2603 retire on ${MISTRAL_APRIL30_SHUTDOWN_DATE}. Mistral names Mistral Large 4, Voxtral Mini Transcribe 3, Voxtral Mini Transcribe Realtime 3, and Voxtral TTS 3. The stored replacements field is empty.`,
    h1: `Mistral Large 3, Medium 3.5, and Voxtral retirement on ${when}`,
    summary: `${ordered.length} Mistral ids with shutdown date ${MISTRAL_APRIL30_SHUTDOWN_DATE}, the replacement name on the models page, and the API name on the current model list.`,
    answer: `The dataset has ${ordered.length} Mistral ids with shutdown date ${MISTRAL_APRIL30_SHUTDOWN_DATE}: ${idList(ordered)}. Each row stores deprecation date ${MISTRAL_APRIL30_DEPRECATION_DATE}. The models page and the model cards print those same two dates. The Replacement column names Mistral Large 4 for ${idList(textIds)}, Voxtral Mini Transcribe 3 for voxtral-mini-2602, Voxtral Mini Transcribe Realtime 3 for voxtral-mini-transcribe-realtime-2602, and Voxtral TTS 3 for voxtral-mini-tts-2603. The current models table prints API names mistral-large-4, voxtral-mini-transcribe-3-0, voxtral-mini-transcribe-realtime-3-0, and voxtral-mini-tts-3-0. Those four ids are not stored on these rows. ${empty.length === ordered.length ? "The replacements field is empty, so each model page says Not published." : "The replacements field is empty on " + (empty.length ? idList(empty) : "none of these rows") + "."} The lifecycle page says that once a model is retired, requests to its identifiers fail with a 404 error. The retirement date on these rows is ${MISTRAL_APRIL30_SHUTDOWN_DATE}.`,
    checked: MISTRAL_APRIL30_CHECKED,
    steps: [
      {
        name: "Change the text model id",
        text: `For mistral-large-2512 and mistral-medium-3-5, the models page names Mistral Large 4. The current models table and the October 6, 2026 changelog print the API name mistral-large-4. The Large 4 card also lists mistral-large-4-0. Change the model field on the chat call to mistral-large-4, or to mistral-large-4-0 if you want the other name the card prints. Do that before ${when}. Do not leave the call on mistral-large-latest, mistral-medium-3, or mistral-medium-latest. Those strings are API names on the deprecated cards.`,
      },
      {
        name: "Test the new text id",
        text: `Send one prompt you use now to mistral-large-4 before ${when}. Check the reply, the tools, and any field the new model rejects. The Large 4 card says the model is Public Preview. The lifecycle page says Public Preview models allow silent updates, and that an alias can move. Pin mistral-large-4 or mistral-large-4-0 rather than a latest alias.`,
      },
      {
        name: "Move the audio models separately",
        text: "voxtral-mini-2602, voxtral-mini-transcribe-realtime-2602, and voxtral-mini-tts-2603 are audio models. The migration page says to replace each Voxtral 2 model id with its Voxtral 3 id. Use voxtral-mini-transcribe-3-0 for a recorded file, voxtral-mini-transcribe-realtime-3-0 for a live transcription session, and voxtral-mini-tts-3-0 for speech from text. Do not send mistral-large-4 on those calls. A word-timestamp request returns 400 on the new transcription id. A realtime session locks its settings when the first audio chunk arrives.",
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Mistral rows whose shutdown date is ${MISTRAL_APRIL30_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date on every row is ${MISTRAL_APRIL30_DEPRECATION_DATE}. Retirement date is the shutdown date. Official replacement is the name in the Replacement column, plus the API name from the current models table on the same page. ${noteLines}`,
          `The models page says: "${MISTRAL_STILL}" The HTML table on that page calls the last column Alternative. The Markdown copy of the same page calls it Replacement. Both copies list deprecation ${MISTRAL_APRIL30_DEPRECATION_DATE} and retirement ${MISTRAL_APRIL30_SHUTDOWN_DATE} for these five ids.`,
          empty.length === ordered.length
            ? `The replacements field is empty on ${idList(empty)}. The model page under Replacements then says Not published. That empty field is not the same thing as an empty Replacement cell. Mistral filled the cell. SunsetDiff did not store an id, because Mistral Large 4 and the three Voxtral 3 models are not rows in this dataset.`
            : `The replacements field is empty on ${empty.length ? idList(empty) : "none of these rows"}.`,
        ],
        table: {
          caption: `${ordered.length} Mistral model ids with retirement date ${MISTRAL_APRIL30_SHUTDOWN_DATE}.`,
          headers: ["Model", "Retirement date", "Official replacement"],
          rows: ordered.map((model) => [
            modelLink(model),
            shutdownCell(model),
            mistralApril30Official(model.id),
          ]),
        },
        sources,
      },
      {
        heading: "Replacements Mistral names",
        paragraphs: [
          `The Large 3 card and the Medium 3.5 card both say: "${MISTRAL_USE_LARGE}" Deprecation date ${deprecatedOn}. Retirement date ${when}. Replacement: Mistral Large 4. The Large 4 card lists API names mistral-large-4 and mistral-large-4-0, status Public Preview, and a 1M context window. The current models table prints API name mistral-large-4.`,
          `The Voxtral Mini Transcribe 2 card says: "${MISTRAL_USE_TRANSCRIBE}" The Voxtral Mini Transcribe Realtime card says: "${MISTRAL_USE_REALTIME}" The Voxtral TTS card says: "${MISTRAL_USE_TTS}" Each of those cards lists deprecation date ${MISTRAL_APRIL30_DEPRECATION_DATE} and retirement date ${MISTRAL_APRIL30_SHUTDOWN_DATE}.`,
          "The current models table prints voxtral-mini-transcribe-3-0 for Voxtral Mini Transcribe 3, voxtral-mini-transcribe-realtime-3-0 for Voxtral Mini Transcribe Realtime 3, and voxtral-mini-tts-3-0 for Voxtral TTS 3. All three are Public Preview. The migration page uses those same three strings in its Model ID column.",
          `The changelog on ${MISTRAL_APRIL30_CHECKED} does not print a deprecation line for these five ids. It does print the replacement releases. The 2026-10-06 entry says: "${MISTRAL_LARGE4_RELEASE}" The 2026-10-20 entry says: "${MISTRAL_VOX3_RELEASE}" Those lines are releases. They are not the retirement date.`,
          `The lifecycle page says: "${MISTRAL_ANNOUNCED}" It also says Public Preview models "${MISTRAL_PREVIEW_UPDATES}" And: "${MISTRAL_PREVIEW_PATH}" The named replacements are Public Preview on their cards. Read the current model list again before you treat one of those ids as a long-term pin.`,
        ],
        sources: [
          ...sources,
          ...cardSources,
          ...replacementSources,
          { label: "Mistral changelog", url: MISTRAL_CHANGELOG_URL },
        ],
      },
      {
        heading: "What stops on April 30, 2027",
        paragraphs: [
          `Until ${when}, the models page says a deprecated model still answers. The lifecycle page says: "${MISTRAL_404}" After the retirement date, a request that still sends one of these identifiers fails with a 404 error.`,
          "The lifecycle page does not say Mistral rewrites the old id to the new id for you. You change the model field. A call that still sends mistral-large-2512, mistral-medium-3-5, voxtral-mini-2602, voxtral-mini-transcribe-realtime-2602, or voxtral-mini-tts-2603 is a call to a retired identifier on that date.",
          `The same page says: "${MISTRAL_ALIAS_WARN}" The Large 3 card lists mistral-large-latest next to mistral-large-2512. The Medium 3.5 card lists mistral-medium-3 and mistral-medium-latest next to mistral-medium-3-5. The Transcribe 2 card lists voxtral-mini-latest. The realtime card lists voxtral-mini-realtime-latest. The TTS card lists voxtral-mini-tts-latest. Those are names on the deprecated cards. This guide does not claim they already point at the replacement.`,
        ],
        sources,
      },
      {
        heading: "Change the text model id",
        paragraphs: [
          "mistral-large-2512 and mistral-medium-3-5 are chat models. Their cards list Chat Completions at /v1/chat/completions. Keep the same endpoint. Change the model field.",
          "Use mistral-large-4, the API name in the current models table and in the October 6, 2026 changelog. The Large 4 card also lists mistral-large-4-0. Both strings are names Mistral prints for Mistral Large 4. mistral-large-latest is a name on the deprecated Large 3 card, not a name on the Large 4 card.",
          `The two text rows share one replacement. Medium 3.5 does not get a newer Medium id on this page. The Replacement cell says Mistral Large 4. If that model does not fit the job, the models page is the list to read. This guide does not add a second replacement Mistral did not name.`,
          `Search the repository before ${when}. A hit is a candidate. A host dashboard can hold an id that git does not show. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.`,
        ],
        codes: [{ caption: "ripgrep", code: mistralApril30Search() }],
        sources: [
          { label: "Mistral models", url: MISTRAL_MODELS_URL },
          { label: "Mistral Large 3", url: MISTRAL_LARGE3_URL },
          { label: "Mistral Medium 3.5", url: MISTRAL_MEDIUM_URL },
          { label: "Mistral Large 4", url: MISTRAL_LARGE4_URL },
          { label: "Mistral changelog", url: MISTRAL_CHANGELOG_URL },
        ],
      },
      {
        heading: "Audio models",
        paragraphs: [
          `The audio overview says: "${MISTRAL_AUDIO_COVER}" The migration page says: "${MISTRAL_MAP}" Its Model ID column is voxtral-mini-transcribe-3-0 for voxtral-mini-2602, voxtral-mini-transcribe-realtime-3-0 for voxtral-mini-transcribe-realtime-2602, and voxtral-mini-tts-3-0 for voxtral-mini-tts-2603.`,
          `Recorded transcription stays on /v1/audio/transcriptions. The migration page says: "${MISTRAL_WORD}" Request segment timestamps. A request that still asks for word timestamps gets HTTP 400.`,
          `Live transcription is a separate model. The migration page says: "${MISTRAL_LOCK}" Send every setting in the first session.update, before any audio. The audio overview says Voxtral Mini Transcribe Realtime 3 (voxtral-mini-transcribe-realtime-3-0) is for live audio. Do not point a file transcription at that id, and do not point a live session at voxtral-mini-transcribe-3-0.`,
          `Speech from text stays on /v1/audio/speech. The audio overview says Voxtral TTS 3 (voxtral-mini-tts-3-0) generates speech from text. The same overview lists Voxtral TTS Realtime 3 as voxtral-mini-tts-realtime-3-0 for a live conversation. The retiring row names Voxtral TTS 3, not the realtime speech id. A file TTS call uses voxtral-mini-tts-3-0.`,
          `The migration page says the Voxtral 2 preset voices are still accepted. Emotion can also be an inline tag. The aliases cell for voxtral-mini-tts-2603 says: "${MISTRAL_TTS_ALIAS}" The TTS 3 card says Public Preview, so that sentence is about a later General Availability. It does not say the alias has already moved. The TTS 3 card also lists voxtral-mini-tts-latest. The old TTS card lists that same string. Do not assume which model it points at today.`,
          "The migration page also maps voxtral-small-2507 to Voxtral Small Transcribe 3. That id is not one of these five rows. Its Deprecation timeline heading has no dates under it. The dates in this guide are the dates on the models page and the model cards.",
          `The migration checklist says to replace each model id, switch word timestamps to segment timestamps, send realtime settings before the first audio chunk, check overlapping speaker segments, review context_bias phrases, try your voices, and measure latency again. Do that before ${when}. ${idList(audioIds)} are the audio rows in this table.`,
        ],
        sources: [
          { label: "Migrate from Voxtral 2", url: MISTRAL_VOX_MIGRATE_URL },
          { label: "Mistral audio overview", url: MISTRAL_AUDIO_URL },
          { label: "Voxtral Mini Transcribe 2", url: MISTRAL_VOX_TRANSCRIBE_URL },
          { label: "Voxtral Mini Transcribe Realtime", url: MISTRAL_VOX_REALTIME_URL },
          { label: "Voxtral TTS", url: MISTRAL_VOX_TTS_URL },
          { label: "Voxtral Mini Transcribe 3", url: MISTRAL_VOX_TRANSCRIBE3_URL },
          { label: "Voxtral Mini Transcribe Realtime 3", url: MISTRAL_VOX_REALTIME3_URL },
          { label: "Voxtral TTS 3", url: MISTRAL_VOX_TTS3_URL },
        ],
      },
      {
        heading: "Test before the date",
        paragraphs: [
          `Send one real request to the id you will keep, using a prompt or an audio file you use now. Do that before ${when}. A successful call to the old id does not test the new id.`,
          "For the two text models, compare the reply, tool calls, and any rejected field. The Large 4 card lists a 1M context window. The Large 3 and Medium 3.5 cards list 256k. A prompt that fit before can still change shape.",
          "For transcription, confirm segment timestamps and speaker segments on a file you already transcribe. For realtime, open a session and send the settings before audio. For speech, generate a short clip with a voice you use now.",
          `The batch of these rows is [Mistral shutdowns on ${when}](/shutdowns/mistral-${MISTRAL_APRIL30_SHUTDOWN_DATE}/). The [Mistral provider page](/providers/mistral/) lists the other stored rows. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list.`,
        ],
        sources: [
          { label: "Mistral model lifecycle", url: MISTRAL_LIFECYCLE_URL },
          { label: "Migrate from Voxtral 2", url: MISTRAL_VOX_MIGRATE_URL },
          { label: "Mistral Large 4", url: MISTRAL_LARGE4_URL },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/mistral-${MISTRAL_APRIL30_SHUTDOWN_DATE}/`, label: `Mistral shutdowns on ${when}` },
      { href: "/providers/mistral/", label: "Mistral provider page" },
      { href: "/models/mistral/mistral-large-2512/", label: "mistral-large-2512" },
      { href: "/models/mistral/mistral-medium-3-5/", label: "mistral-medium-3-5" },
      { href: "/models/mistral/voxtral-mini-2602/", label: "voxtral-mini-2602" },
      { href: "/models/mistral/voxtral-mini-transcribe-realtime-2602/", label: "voxtral-mini-transcribe-realtime-2602" },
      { href: "/models/mistral/voxtral-mini-tts-2603/", label: "voxtral-mini-tts-2603" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Mistral models retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)}. Each row stores deprecation date ${MISTRAL_APRIL30_DEPRECATION_DATE} and shutdown date ${MISTRAL_APRIL30_SHUTDOWN_DATE}. The models page and the model cards print those same dates.`,
      },
      {
        question: "What is the official replacement?",
        answer: "Mistral names Mistral Large 4 (mistral-large-4) for mistral-large-2512 and mistral-medium-3-5. Mistral names Voxtral Mini Transcribe 3 (voxtral-mini-transcribe-3-0) for voxtral-mini-2602. Mistral names Voxtral Mini Transcribe Realtime 3 (voxtral-mini-transcribe-realtime-3-0) for voxtral-mini-transcribe-realtime-2602. Mistral names Voxtral TTS 3 (voxtral-mini-tts-3-0) for voxtral-mini-tts-2603. The Large 4 card also lists mistral-large-4-0. The stored replacements field on these rows is empty, so the model page says Not published.",
      },
      {
        question: "What breaks after April 30, 2027?",
        answer: `The lifecycle page says: "${MISTRAL_404}" A request that still sends one of these five ids fails with a 404 error. Until ${MISTRAL_APRIL30_SHUTDOWN_DATE}, the models page says the deprecated model still answers.`,
      },
      {
        question: "Do I use the same new id for the audio models?",
        answer: "No. The two text models use mistral-large-4. Recorded transcription uses voxtral-mini-transcribe-3-0. Live transcription uses voxtral-mini-transcribe-realtime-3-0. Speech from text uses voxtral-mini-tts-3-0. Those three audio ids are on the migration page and on the current models table.",
      },
      {
        question: "Will mistral-large-latest or voxtral-mini-tts-latest move for me?",
        answer: `The lifecycle page says: "${MISTRAL_ALIAS_WARN}" The deprecated cards list mistral-large-latest, mistral-medium-latest, voxtral-mini-latest, voxtral-mini-realtime-latest, and voxtral-mini-tts-latest. The migration page says: "${MISTRAL_TTS_ALIAS}" The TTS 3 card says Public Preview, so that alias move is tied to a later General Availability. Change the model field to the pinned id.`,
      },
      {
        question: "Did the changelog announce this retirement?",
        answer: `Checked on ${MISTRAL_APRIL30_CHECKED}, the changelog does not print a deprecation line for these five ids. It prints the Mistral Large 4 release on 2026-10-06 and the Voxtral 3 release on 2026-10-20. The retirement date is the date on the models page and the model cards: ${MISTRAL_APRIL30_SHUTDOWN_DATE}.`,
      },
    ],
    citations: [
      MISTRAL_MODELS_URL,
      MISTRAL_LIFECYCLE_URL,
      MISTRAL_CHANGELOG_URL,
      MISTRAL_LARGE3_URL,
      MISTRAL_MEDIUM_URL,
      MISTRAL_VOX_TRANSCRIBE_URL,
      MISTRAL_VOX_REALTIME_URL,
      MISTRAL_VOX_TTS_URL,
      MISTRAL_LARGE4_URL,
      MISTRAL_VOX_TRANSCRIBE3_URL,
      MISTRAL_VOX_REALTIME3_URL,
      MISTRAL_VOX_TTS3_URL,
      MISTRAL_AUDIO_URL,
      MISTRAL_VOX_MIGRATE_URL,
    ],
  };
}

const VERTEX_EMBED_GET = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings";
const VERTEX_EMBED_TASKS = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/task-types";
const VERTEX_EMBED_API = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/text-embeddings-api";
const VERTEX_EMBED_RETRIEVAL = "https://docs.cloud.google.com/vertex-ai/docs/vector-search-2/embeddings/autogenerating-embeddings";
const VERTEX_EMBED_RAG = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/use-embedding-models";
const VERTEX_EMBED_SPANNER = "https://docs.cloud.google.com/spanner/docs/backfill-embeddings";
const VERTEX_EMBED_UNIFIES = "State-of-the-art performance across English, multilingual and code tasks. It unifies the previously specialized models like text-embedding-005 and text-multilingual-embedding-002 and achieves better performance in their respective domains.";
const VERTEX_EMBED_FULL = "All models produce a full-length embedding vector by default. For gemini-embedding-001, this vector has 3072 dimensions, and other models produce 768-dimensional vectors.";
const VERTEX_EMBED_SIZE = "However, by using the output_dimensionality parameter, users can control the size of the output embedding vector.";
const VERTEX_EMBED_TRUNCATE = "Used to specify output embedding size. If set, output embeddings will be truncated to the size specified.";
const VERTEX_EMBED_DEFAULT_TASK = "If left blank, the default used is RETRIEVAL_QUERY.";
const VERTEX_EMBED_TITLE = "Only valid with task_type=RETRIEVAL_DOCUMENT.";
const VERTEX_EMBED_KEY_TASK = "If your embeddings use case doesn't align with a documented use case, use the RETRIEVAL_QUERY task type by default.";
const VERTEX_EMBED_PAIR = "To get embeddings that you can use for information retrieval, use the RETRIEVAL_DOCUMENT task type to embed your documents and the RETRIEVAL_QUERY task type to embed user queries.";
const VERTEX_EMBED_CODE_TASK = "text-embedding-005 supports a new task type CODE_RETRIEVAL_QUERY, which can be used to retrieve relevant code blocks using plain text queries.";
const VERTEX_EMBED_SPANNER_DIFF = "This is because the embedding vectors generated for the same piece of text might differ depending on the version of the model that you use; which is why you want to avoid using different model versions to generate embeddings in the same dataset.";
const VERTEX_EMBED_SPANNER_STALE = "In addition, updating the model version in the model definition statement doesn't update the embeddings that are already generated with this model.";
const VERTEX_EMBED_RAG_FIXED = "The association between your embedding model and the RAG corpus remains fixed for the lifetime of your RAG corpus.";
const VERTEX_EMBED_GECKO = "When your Gecko model is discontinued, you must migrate the RAG corpus, which means that you create a new RAG corpus and re-import the data.";
const VERTEX_EMBED_QUICK = "if you don't have time to follow the guide and just need to quickly resolve the errors caused by models reaching their retirement dates, do the following:";
const VERTEX_EMBED_UPGRADE = "Update your application to point to the recommended upgrades.";
const VERTEX_EMBED_TEST = "Test all mission critical features to make sure everything works as expected.";
const VERTEX_EMBED_DEPLOY = "Deploy the updates like you normally would.";
const VERTEX_EMBED_SOON = "Support for multimodal embedding (multimodalembedding@001) is coming soon.";
const VERTEX_MULTI_API = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/multimodal-embeddings-api";

function vertexEmbedRelease(model: ModelRecord): string {
  return model.region_or_platform_notes?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "Not published";
}

function vertexApril1EmbedGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const when = longDate(VERTEX_EMBED_APRIL1_SHUTDOWN_DATE);
  const empty = ordered.filter((model) => publishedReplacementIds(model).length === 0);
  const embedding001 = catalog.find((model) => model.provider === "google-vertex" && model.id === "gemini-embedding-001");
  const embedding2 = catalog.find((model) => model.provider === "google-vertex" && model.id === "gemini-embedding-2");
  const geminiApi = catalog.find((model) => model.provider === "google-gemini-api" && model.id === "text-embedding-004");
  const sources = [{ label: "Vertex AI model versions", url: GEMINI_VERTEX }];
  const embedSources = [
    { label: "Get text embeddings", url: VERTEX_EMBED_GET },
    { label: "Text embeddings API", url: VERTEX_EMBED_API },
    { label: "Choose an embeddings task type", url: VERTEX_EMBED_TASKS },
    { label: "Autogenerating embeddings for Agent Retrieval", url: VERTEX_EMBED_RETRIEVAL },
  ];
  return {
    slug: VERTEX_EMBED_APRIL1_GUIDE_SLUG,
    title: `Vertex AI text-embedding-004, text-embedding-005, and text-multilingual-embedding-002 shutdown on ${when} | SunsetDiff`,
    description: `Vertex AI retires text-embedding-004, text-embedding-005, text-multilingual-embedding-002, and multimodalembedding@001 on ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. The Replacement model ID cell is empty. Stored vectors from the old model do not match vectors from a new model, so the corpus has to be embedded again.`,
    h1: `Vertex AI text-embedding-004, text-embedding-005, and text-multilingual-embedding-002 shutdown on ${when}`,
    summary: `${ordered.length} Google Vertex embedding ids with shutdown date ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. The stored replacements field is empty, and the model versions page leaves the Replacement model ID cell empty.`,
    answer: `The dataset has ${ordered.length} Google Vertex ids with shutdown date ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}: ${idList(ordered)}. The embeddings table on the model versions page lists retirement date April 1, 2027 for each of them. The Replacement model ID cell on each of those rows is empty. ${empty.length === ordered.length ? "The replacements field is empty, so each model page says Not published." : "The replacements field is empty on " + idList(empty) + "."} The page says: "${VERTEX_EXTEND}"`,
    checked: VERTEX_EMBED_APRIL1_CHECKED,
    steps: [
      {
        name: "Find the four ids",
        text: "Search code, config, and vector index settings for multimodalembedding@001, text-embedding-004, text-embedding-005, and text-multilingual-embedding-002. A hit is a candidate. Each of those ids is a SunsetDiff row. The model versions page lists retirement date April 1, 2027 for each of them.",
      },
      {
        name: "Read the empty replacement cell",
        text: `The Replacement model ID cell is empty for ${idList(ordered)}. The get text embeddings page describes gemini-embedding-001 as a model that unifies text-embedding-005 and text-multilingual-embedding-002. That sentence is a description. It is not a filled Replacement model ID cell, and it does not name text-embedding-004. Pick the model id you will call, and write it down. This guide does not fill the cell Google left empty.`,
      },
      {
        name: "Re-embed or build a second index",
        text: "A new embedding model writes a new list of numbers. Those numbers do not drop into an index built from the old model. Embed the corpus again with the model you picked, or keep the old index and search a second index until the new one is ready. Check the vector length and the task_type on both the documents and the queries.",
      },
      {
        name: "Test one query before the date",
        text: `Search the new index with one query you use now, embedded by the same model, before ${when}. A successful call to the old id does not test the new index.`,
      },
    ],
    sections: [
      {
        heading: "Models and dates",
        paragraphs: [
          `These ${ordered.length} ids are the Google Vertex rows whose shutdown date is ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Release date is the date stored from the model versions page. The page prints February 12, 2024 for multimodalembedding@001, May 14, 2024 for text-embedding-004, November 18, 2024 for text-embedding-005, and May 14, 2024 for text-multilingual-embedding-002. Shutdown date is the retirement date. Replacement model ID is the cell on that page. Not published means the cell is empty and the stored replacements field is empty. These rows do not store a deprecation_date.`,
          `The model versions page says: "${VERTEX_EXTEND}" Checked on ${VERTEX_EMBED_APRIL1_CHECKED}, the embeddings table lists retirement date April 1, 2027 on each of these ${ordered.length} rows. multimodalembedding@001 is one of those rows. Its release date on the page is February 12, 2024. The Replacement model ID cell is empty.`,
        ],
        table: {
          caption: `${ordered.length} Vertex embedding ids with retirement date ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Release date", "Shutdown date", "Replacement model ID"],
          rows: ordered.map((model) => [
            modelLink(model),
            vertexEmbedRelease(model),
            shutdownCell(model),
            "Not published",
          ]),
        },
        sources,
      },
      {
        heading: "The replacement cell is empty",
        paragraphs: [
          empty.length
            ? `The replacements field is empty on ${idList(empty)}. The model page under Replacements then says Not published. The model versions page also leaves the Replacement model ID cell empty.`
            : "Every row in this table stores a replacement.",
          `The get text embeddings page says this about gemini-embedding-001: "${VERTEX_EMBED_UNIFIES}" That sentence names text-embedding-005 and text-multilingual-embedding-002. It does not name text-embedding-004. The same sentence is on the text embeddings API page and on the Agent Retrieval supported-models table. None of those pages put gemini-embedding-001 in the Replacement model ID cell for the April 1 rows.`,
          embedding2
            ? `gemini-embedding-2 is on the same embeddings table. Release date ${vertexEmbedRelease(embedding2)}. The retirement cell is empty. The stored shutdown kind is ${embedding2.shutdown_date_kind}. See [gemini-embedding-2](/models/google-vertex/gemini-embedding-2/).`
            : "The dataset has no gemini-embedding-2 row.",
          embedding001
            ? `gemini-embedding-001 is on that table with release date May 20, 2025 and retirement date No sooner than May 20, 2028. The stored shutdown date is ${embedding001.shutdown_date ?? "Not published"} and the stored kind is ${embedding001.shutdown_date_kind}. The replacement cell is empty. See [gemini-embedding-001](/models/google-vertex/gemini-embedding-001/).`
            : "The dataset has no gemini-embedding-001 row.",
          "On the retired models table, the recommended upgrade for textembedding-gecko@003, textembedding-gecko-multilingual@001, textembedding-gecko@002, and textembedding-gecko@001 is gemini-embedding-001. That column is Recommended upgrade, and those rows are already retired. It is a different table from the embeddings models table.",
          "The multimodal embeddings API page lists gemini-embedding-2 in the supported models table, in the Code column, for Embeddings for Multimodal. The model versions page leaves the Replacement model ID cell empty for multimodalembedding@001. This guide does not copy gemini-embedding-2 into that cell. Code samples on the multimodal embeddings API page still send multimodalembedding@001.",
        ],
        table: {
          caption: "Other rows on the embeddings table of the model versions page.",
          headers: ["Model id", "Release date on the page", "Retirement date on the page", "Replacement model ID"],
          rows: [
            [
              embedding2 ? modelLink(embedding2) : "gemini-embedding-2",
              "April 22, 2026",
              "Empty",
              "Not published",
            ],
            [
              embedding001 ? modelLink(embedding001) : "gemini-embedding-001",
              "May 20, 2025",
              "No sooner than May 20, 2028",
              "Not published",
            ],
          ],
        },
        sources: [
          ...sources,
          { label: "Multimodal embeddings API", url: VERTEX_MULTI_API },
        ],
      },
      {
        heading: "A new model writes different vectors",
        paragraphs: [
          "An embedding model turns text into a list of numbers. Search compares those lists. If you store lists from one model and then ask a second model to embed the query, the numbers are not a pair. You embed the stored text again, or you keep two indexes during the move: the old index for the old model, and a new index for the new model.",
          `The Spanner backfill page says: "${VERTEX_EMBED_SPANNER_DIFF}" Then: "${VERTEX_EMBED_SPANNER_STALE}" Changing the model string on the next request leaves the stored lists as they are.`,
          `The RAG Engine page says: "${VERTEX_EMBED_RAG_FIXED}" Under the heading When Gecko models are discontinued, it says: "${VERTEX_EMBED_GECKO}" That paragraph names Gecko models. It does not name text-embedding-004, text-embedding-005, or text-multilingual-embedding-002.`,
          `The get text embeddings page says: "${VERTEX_EMBED_FULL}" Then: "${VERTEX_EMBED_SIZE}" The text embeddings API says outputDimensionality is: "${VERTEX_EMBED_TRUNCATE}" The Python sample on the get text embeddings page calls that field output_dimensionality. Set the length your index expects. The Spanner page says the same text can still produce different numbers when the model version changes, so embed the corpus with the one model you will keep.`,
        ],
        sources: [
          { label: "Spanner backfill embeddings", url: VERTEX_EMBED_SPANNER },
          { label: "Use embedding models with RAG Engine", url: VERTEX_EMBED_RAG },
          { label: "Get text embeddings", url: VERTEX_EMBED_GET },
          { label: "Text embeddings API", url: VERTEX_EMBED_API },
        ],
      },
      {
        heading: "Output size and task type",
        paragraphs: [
          "The Agent Retrieval page lists max output dimensions 768 for text-embedding-004, text-embedding-005, and text-multilingual-embedding-002. It lists 3072 for gemini-embedding-001 and for gemini-embedding-2. It lists max sequence length 2048 tokens for the three retiring text models and for gemini-embedding-001, and 8192 tokens for gemini-embedding-2. It says text-embedding-004 and text-embedding-005 are English, and text-multilingual-embedding-002 is for multilingual tasks.",
          "The get text embeddings supported-models table says up to 768 for text-embedding-005 and text-multilingual-embedding-002, and up to 3072 for gemini-embedding-001 and gemini-embedding-2. Checked on the page that says Last updated 2026-11-03 UTC, that table does not list text-embedding-004. The model versions page and the Agent Retrieval table still list text-embedding-004.",
          `The text embeddings API says task_type: "${VERTEX_EMBED_DEFAULT_TASK}" It says title is: "${VERTEX_EMBED_TITLE}" The task types page says: "${VERTEX_EMBED_KEY_TASK}" And: "${VERTEX_EMBED_PAIR}" It also says: "${VERTEX_EMBED_CODE_TASK}" Code blocks on that page use RETRIEVAL_DOCUMENT. The query uses CODE_RETRIEVAL_QUERY.`,
          "The task types page says task types are supported by text-embedding-005, text-multilingual-embedding-002, and gemini-embedding-001. That list does not include text-embedding-004 or gemini-embedding-2. The Agent Retrieval sample still sets task_type to RETRIEVAL_DOCUMENT next to model_id text-embedding-004. Use the task type you used when you embedded the corpus. A query and a document need the pair the task types page names.",
          `The Agent Retrieval page also says: "${VERTEX_EMBED_SOON}" The model versions page already lists multimodalembedding@001 with retirement date ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. Those two sentences are on different pages. The Agent Retrieval dimensions table does not list multimodalembedding@001.`,
        ],
        sources: embedSources,
      },
      {
        heading: "Change the model id",
        paragraphs: [
          "The text embeddings API syntax builds the client with TextEmbeddingModel.from_pretrained(MODEL_ID). MODEL_ID is the string you change. The page prints get_embeddings(...) with an ellipsis. This guide keeps that ellipsis.",
          "The get text embeddings page tells you to set GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, and GOOGLE_GENAI_USE_ENTERPRISE=True, then call genai.Client() with no arguments. Its Python sample sets model to gemini-embedding-001 and passes task_type and output_dimensionality on EmbedContentConfig. The sample on the page sends three strings in contents. The copy below sends one string, in the same list. That sample is a call shape. The model versions page does not put gemini-embedding-001 in the Replacement model ID cell.",
          `The predict URL on that page is https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predict. The sample sets the last path segment to gemini-embedding-001. The region in the sample is us-central1.`,
          "Search the repository before the date. A host console or a vector index can hold an id that git does not show. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date. The search below is the four stored rows, including multimodalembedding@001.",
        ],
        codes: [
          {
            caption: "Text embeddings API syntax. Set MODEL_ID to the id in the call you have now.",
            code: `PROJECT_ID = PROJECT_ID
REGION = us-central1
MODEL_ID = MODEL_ID

import vertexai
from vertexai.language_models import TextEmbeddingModel

vertexai.init(project=PROJECT_ID, location=REGION)

model = TextEmbeddingModel.from_pretrained(MODEL_ID)
embeddings = model.get_embeddings(...)
`,
          },
          {
            caption: "Get text embeddings Python sample. The model string in the sample is gemini-embedding-001.",
            code: `from google import genai
from google.genai.types import EmbedContentConfig

client = genai.Client()
response = client.models.embed_content(
    model="gemini-embedding-001",
    contents=[
        "How do I get a driver's license/learner's permit?",
    ],
    config=EmbedContentConfig(
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=3072,
        title="Driver's License",
    ),
)
print(response)
`,
          },
          {
            caption: "ripgrep. These four ids are the stored rows.",
            code: searchCode(ordered),
          },
        ],
        sources: [
          { label: "Text embeddings API", url: VERTEX_EMBED_API },
          { label: "Get text embeddings", url: VERTEX_EMBED_GET },
          { label: "Autogenerating embeddings for Agent Retrieval", url: VERTEX_EMBED_RETRIEVAL },
        ],
      },
      {
        heading: "Checklist before April 1, 2027",
        paragraphs: [
          `Do this before ${when}. The model versions page says: "${VERTEX_EMBED_QUICK}" Then: "${VERTEX_EMBED_UPGRADE}" Then: "${VERTEX_EMBED_TEST}" Then: "${VERTEX_EMBED_DEPLOY}" The replacement cell is empty, so that page does not name the upgrade string. The same page does not print an HTTP status for these embedding rows.`,
          geminiApi
            ? `The Gemini API row for text-embedding-004 stores shutdown date ${geminiApi.shutdown_date ?? "Not published"} and replacement ${publishedReplacementIds(geminiApi).join(", ") || "Not published"}. Its source was last checked ${geminiApi.sources[0]?.last_checked ?? "Not published"}. That row is the Gemini API. These ${ordered.length} rows are Vertex AI. See [Gemini API text-embedding-004](/models/google-gemini-api/text-embedding-004/). OpenAI's April 1, 2027 list is a third date, on [GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027](/guides/${APRIL_1_2027_GUIDE_SLUG}/).`
            : "The dataset has no Gemini API row for text-embedding-004.",
        ],
        bullets: [
          "Write down every place that sends multimodalembedding@001, text-embedding-004, text-embedding-005, or text-multilingual-embedding-002. Include vector indexes, RAG corpora, and Agent Retrieval collections. The Agent Retrieval sample sets model_id to text-embedding-004 inside vertex_embedding_config.",
          "Choose one model id. The Replacement model ID cell is empty. gemini-embedding-001 and gemini-embedding-2 are other rows on the embeddings table. Read their retirement cells before you pin one.",
          "Write down the task_type for documents and the task_type for queries. The task types page pairs RETRIEVAL_DOCUMENT with RETRIEVAL_QUERY. title is only valid with RETRIEVAL_DOCUMENT. A blank task_type uses RETRIEVAL_QUERY on the text embeddings API page.",
          "Write down the vector length you store. The Agent Retrieval table lists 768 for these three ids and 3072 for gemini-embedding-001. output_dimensionality on the Python sample, and outputDimensionality on the API, truncates the vector to the size you set.",
          "Embed a small slice of the corpus with the new id. Then embed one real query with that same id and the query task type. Search the new index. Keep the old index until that search answers the queries you care about.",
          `Move traffic before ${when}. The model versions page says retirement timelines may be extended, and they will not move earlier than the listed date.`,
        ],
        sources: [
          ...sources,
          { label: "Get text embeddings", url: VERTEX_EMBED_GET },
          { label: "Choose an embeddings task type", url: VERTEX_EMBED_TASKS },
          { label: "Gemini API deprecations", url: "https://ai.google.dev/gemini-api/docs/deprecations" },
        ],
      },
    ],
    related: [
      { href: `/shutdowns/google-vertex-${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}/`, label: `Vertex AI shutdowns on ${when}` },
      { href: "/providers/google-vertex/", label: "Google Vertex AI provider page" },
      { href: "/models/google-vertex/multimodalembedding-001/", label: "multimodalembedding@001" },
      { href: "/models/google-vertex/text-embedding-004/", label: "text-embedding-004" },
      { href: "/models/google-vertex/text-embedding-005/", label: "text-embedding-005" },
      { href: "/models/google-vertex/text-multilingual-embedding-002/", label: "text-multilingual-embedding-002" },
      { href: "/models/google-vertex/gemini-embedding-001/", label: "gemini-embedding-001" },
      { href: "/models/google-vertex/gemini-embedding-2/", label: "gemini-embedding-2" },
      { href: "/models/google-gemini-api/text-embedding-004/", label: "Gemini API text-embedding-004" },
      { href: `/guides/${VERTEX_NOV_DEC_GUIDE_SLUG}/`, label: "Vertex AI Gemini retirements in November and December 2026" },
      { href: `/guides/${APRIL_1_2027_GUIDE_SLUG}/`, label: "GPT-5.1, gpt-5.3-codex, and gpt-5.4-nano shutdown on April 1, 2027" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Vertex embedding models retire on ${when}?`,
        answer: `The dataset lists ${idList(ordered)} with shutdown date ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. The model versions page lists retirement date April 1, 2027 for each of them, including multimodalembedding@001.`,
      },
      {
        question: "What is the official replacement?",
        answer: `The Replacement model ID cell is empty for ${idList(ordered)}, and the stored replacements field is empty. The model page says Not published. The get text embeddings page says gemini-embedding-001 unifies text-embedding-005 and text-multilingual-embedding-002. That sentence does not fill the replacement cell, and it does not name text-embedding-004.`,
      },
      {
        question: "Can I keep my stored vectors and only change the model id?",
        answer: `The stored vectors stay as they are. Changing the model id writes new vectors for new requests. The Spanner backfill page says the vectors for the same text might differ by model version, and that updating the model version does not update embeddings already generated. Embed the corpus again, or search a second index while the old index still uses the old model. The RAG Engine page says: "${VERTEX_EMBED_RAG_FIXED}"`,
      },
      {
        question: "What output size and task type should I check?",
        answer: "The Agent Retrieval table lists 768 dimensions for text-embedding-004, text-embedding-005, and text-multilingual-embedding-002, and 3072 for gemini-embedding-001. That table does not list multimodalembedding@001. outputDimensionality truncates the vector to the size you set. The text embeddings API says a blank task_type uses RETRIEVAL_QUERY. Documents use RETRIEVAL_DOCUMENT. The task types page lists task type support for text-embedding-005, text-multilingual-embedding-002, and gemini-embedding-001. It does not list text-embedding-004.",
      },
      {
        question: "What does Google say happens on April 1, 2027?",
        answer: `The model versions page says: "${VERTEX_EXTEND}" It also says to update the application to the recommended upgrades, test mission critical features, and deploy. It does not print an HTTP status for these embedding rows, and the Replacement model ID cell is empty.`,
      },
      {
        question: "Is this the same date as the Gemini API text-embedding-004 row?",
        answer: geminiApi
          ? `No. The Gemini API row stores shutdown date ${geminiApi.shutdown_date ?? "Not published"} and replacement ${publishedReplacementIds(geminiApi).join(", ") || "Not published"}. These Vertex rows store ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. OpenAI's April 1, 2027 list is a third set of ids.`
          : `The Vertex rows store ${VERTEX_EMBED_APRIL1_SHUTDOWN_DATE}. The dataset has no Gemini API text-embedding-004 row.`,
      },
    ],
    citations: [
      GEMINI_VERTEX,
      VERTEX_EMBED_GET,
      VERTEX_EMBED_TASKS,
      VERTEX_EMBED_API,
      VERTEX_EMBED_RETRIEVAL,
      VERTEX_EMBED_RAG,
      VERTEX_EMBED_SPANNER,
      VERTEX_MULTI_API,
      "https://ai.google.dev/gemini-api/docs/deprecations",
    ],
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
const GEMINI_DEPRECATIONS_CURRENT = "https://aistudio.google.com/docs/deprecations";
const GEMINI_38_GUIDE = "https://aistudio.google.com/docs/whats-new-gemini-3.8";
const GEMINI_38_MIGRATE = "https://aistudio.google.com/docs/whats-new-gemini-3.8#migrate-to-gemini-3-8-flash";
const GEMINI_36_GUIDE = "https://aistudio.google.com/docs/whats-new-gemini-3.6";
const GEMINI_35_LITE_MIGRATE = "https://aistudio.google.com/docs/whats-new-gemini-3.6#migrate-to-gemini-3-5-flash-lite";
const GEMINI_36_API_CHANGES = "https://aistudio.google.com/docs/whats-new-gemini-3.6#api-changes-and-parameter-updates";
const GEMINI_PRICING_38 = "https://aistudio.google.com/docs/pricing#gemini-3.8-flash";
const GEMINI_PRICING_35 = "https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite";
const GEMINI_PRO_CALLOUT =
  "gemini-2.5-pro is deprecated and is no longer available to select in Google AI Studio. Access through the API is limited to existing users who have actively used it in the past. Effective December 1, 2026, all API requests to gemini-2.5-pro will automatically route to gemini-3.8-flash and be billed at Gemini 3.8 Flash rates. Review the breaking API changes in the Gemini 3.8 Flash migration guide before December 1, 2026.";
const GEMINI_FLASH_CALLOUT =
  "gemini-2.5-flash is deprecated and is no longer available to select in Google AI Studio. Effective December 1, 2026, all API requests to gemini-2.5-flash will automatically route to gemini-3.5-flash-lite and be billed at Gemini 3.5 Flash-Lite rates. Review the breaking API changes in the Gemini 3.5 Flash-Lite migration guide before December 1, 2026. Access to the 2.5 models is limited to users who have actively used them in the past. gemini-2.5-flash-lite is not deprecated and remains available through the API until further notice.";
const GEMINI_38_PRICE =
  "Gemini 3.8 Flash is available at an introductory rate of $0.75/1M input tokens and $3.75/1M output tokens through December 31, 2026. Standard pricing of $1.50/1M input tokens and $7.50/1M output tokens takes effect January 1, 2027.";
const GEMINI_35_PRICE = "$0.30/1M input tokens and $2.50/1M output tokens";
const GEMINI_38_MINIMAL = "minimal thinking level is not supported for Gemini 3.8 Flash and will return an error.";
const GEMINI_SAMPLING_IGNORED =
  "temperature, top_p, and top_k are deprecated and ignored. In future model generations, supplying these parameters returns an HTTP 400 error.";
const GEMINI_PREFILL_400 =
  "API requests ending with a non-empty model role turn are disallowed and return an HTTP 400 Error.";
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

/** Checked against the Vertex model versions page on 2026-11-02. Veo floors are read from the dataset. */
export const VERTEX_NOV19_SHUTDOWN_DATE = "2026-11-19";
export const VERTEX_DEC13_SHUTDOWN_DATE = "2026-12-13";
export const VERTEX_NOV_DEC_GUIDE_SLUG = "vertex-ai-gemini-retirements-november-december-2026";
export const VERTEX_NOV_DEC_CHECKED = "2026-11-02";
const VERTEX_FLASH_ID = "gemini-3.6-flash";
const VERTEX_LIVE_ID = "gemini-live-2.5-flash-native-audio";
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

const TOGETHER_DEPRECATIONS = "https://docs.together.ai/docs/deprecations";
const TOGETHER_QUICKSTART = "https://docs.together.ai/docs/quickstart";
const TOGETHER_DEDICATED = "https://docs.together.ai/docs/dedicated-endpoints";
const TOGETHER_BASE = "https://api.together.ai/v1";
const TOGETHER_CHAT = "https://api.together.ai/v1/chat/completions";
const TOGETHER_SCHEDULED =
  "The following models are deprecated and will be removed from serverless inference on the date listed. Migrate to the recommended replacement or a dedicated endpoint before that date.";
const TOGETHER_AFTER =
  "After the removal date, the model is no longer available via its serverless endpoint, but migration options are described below.";
const TOGETHER_YES =
  'Models marked "Yes" can be deployed as on-demand dedicated endpoints, either under the listed ID or as the underlying base model of a serving variant (for example, a deprecated -FP8 or -Turbo ID).';
const TOGETHER_NO =
  'Models marked "No" are not available as on-demand endpoints and require migration to a different model or a monthly reserved dedicated endpoint.';
const TOGETHER_REDIRECT =
  "Requests to the original model ID are automatically routed to the upgraded version.";
const TOGETHER_OPENAI_SDK =
  "If you're already using the OpenAI SDK, you can point it at Together's base URL (https://api.together.ai/v1) and keep the rest of your code the same.";
const TOGETHER_REASONING =
  "This is especially helpful with a reasoning model like MiniMax M3.1 Flash, which works through a problem before answering and can produce a lot of output.";
const TOGETHER_THINKING =
  "A reasoning model's response has two parts: the step-by-step thinking and the final answer. The thinking arrives in reasoning_content or reasoning, depending on the model, and the answer arrives in content.";

function togetherOtherNovember(rows: ModelRecord[], catalog: ModelRecord[]): ModelRecord[] {
  const listed = new Set(rows.map((model) => model.id));
  return catalog
    .filter((model) => model.provider === "together"
      && model.shutdown_date_kind === "exact"
      && Boolean(model.shutdown_date?.startsWith("2026-11-"))
      && model.shutdown_date !== TOGETHER_NOV6_SHUTDOWN_DATE
      && !listed.has(model.id))
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
}

function togetherTarget(model: ModelRecord, catalog: ModelRecord[]): ModelRecord | undefined {
  const id = publishedReplacementIds(model)[0];
  if (!id) return undefined;
  return catalog.find((item) => item.provider === model.provider && item.id === id);
}

function togetherMigratePath(model: ModelRecord, catalog: ModelRecord[]): string | null {
  const target = togetherTarget(model, catalog);
  if (!target) return null;
  return `/migrate/${model.provider}__${model.slug}__to__${target.provider}__${target.slug}/`;
}

function togetherPython(id: string): string {
  return `from openai import OpenAI
client = OpenAI(base_url="${TOGETHER_BASE}")
response = client.chat.completions.create(
    model="${id}",
    messages=[{"role": "user", "content": "Hello"}],
)
`;
}

function togetherDedicatedMark(model: ModelRecord): "Yes" | "No" | null {
  const notes = model.region_or_platform_notes ?? "";
  if (notes.includes("Supported by on-demand dedicated endpoints: Yes")) return "Yes";
  if (notes.includes("Supported by on-demand dedicated endpoints: No")) return "No";
  return null;
}

function togetherNov6Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(TOGETHER_NOV6_SHUTDOWN_DATE);
  const others = togetherOtherNovember(rows, catalog);
  const minimax = rowsFor(isMinimaxNov18Shutdown, catalog);
  const sample = rows.find((model) => publishedReplacementIds(model).length > 0) ?? rows[0];
  const sampleReplacement = sample ? publishedReplacementIds(sample)[0] : undefined;
  const sources = [
    { label: "Together AI deprecations", url: TOGETHER_DEPRECATIONS },
    { label: "Together AI quickstart", url: TOGETHER_QUICKSTART },
  ];
  const otherLine = others.length
    ? others.map((model) => {
        const replacement = replacementText(model, catalog);
        const mark = togetherDedicatedMark(model);
        const dedicated = mark ? `On-demand dedicated endpoints are marked ${mark} for that row.` : "The stored note does not say Yes or No for on-demand dedicated endpoints.";
        return `${modelLink(model)} is on the same scheduled table with removal date ${model.shutdown_date}. The recommended replacement cell is ${replacement}. ${dedicated} The stored status is ${model.status}.`;
      }).join(" ")
    : "No other Together row stores a November 2026 shutdown date.";
  const yesRows = rows.filter((model) => togetherDedicatedMark(model) === "Yes");
  const dedicatedSentence = yesRows.length === rows.length
    ? "The scheduled table marks these rows Yes for on-demand dedicated endpoints."
    : rows.map((model) => `${model.id} is marked ${togetherDedicatedMark(model) ?? "unset"} for on-demand dedicated endpoints.`).join(" ");
  return {
    slug: TOGETHER_NOV6_GUIDE_SLUG,
    title: `Together AI model shutdowns on ${when} | SunsetDiff`,
    description: `Together AI serverless ids with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}: ${idList(rows)}. The deprecations page names a recommended replacement for each id.`,
    h1: `Together AI model shutdowns on ${when}`,
    summary: `The Together AI ids in the dataset with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}, and the recommended replacement on the deprecations page.`,
    answer: `The dataset has ${rows.length} Together AI ids with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}: ${idList(rows)}. The deprecations page says these models will be removed from serverless inference on the date listed. Each row stores the recommended replacement from that table. ${dedicatedSentence}`,
    checked: TOGETHER_NOV6_CHECKED,
    steps: [
      {
        name: "Read the ids and the replacement",
        text: `The table is every Together AI id in the dataset whose shutdown date is ${TOGETHER_NOV6_SHUTDOWN_DATE}. The replacement cell is the recommended replacement stored from the scheduled deprecations table. Open the model page before you change a call.`,
      },
      {
        name: "Check on-demand dedicated endpoints",
        text: `${dedicatedSentence} The deprecations page says: "${TOGETHER_YES}" A serverless call is the call the removal date ends. A dedicated endpoint is a separate deployment.`,
      },
      {
        name: "Change the model field",
        text: `The quickstart posts to ${TOGETHER_CHAT} and sets an OpenAI client base_url of ${TOGETHER_BASE}. Put the replacement id from the same row in the model field. The quickstart sample already uses MiniMaxAI/MiniMax-M3.1-Flash.`,
      },
      {
        name: "Test before the date",
        text: `Call the replacement with the prompts you send now. Do that before ${when}. The deprecations page says replacement models rarely behave identically, so validate quality, latency, and cost before committing.`,
      },
    ],
    sections: [
      {
        heading: "Models shutting down",
        paragraphs: [
          `These rows are every Together AI model in the dataset with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}. The model id links to its SunsetDiff model page. Deprecation date, shutdown date, and replacement are the fields stored on that row. Not published means the field is empty. These rows do not store a deprecation_date.`,
          `The deprecations page says: "${TOGETHER_SCHEDULED}"`,
          `${replacementFaq(rows, catalog)} ${dedicatedSentence}`,
          otherLine,
        ],
        table: {
          caption: `${rows.length} Together AI model ids with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(rows, catalog),
        },
        sources: [{ label: "Together AI deprecations", url: TOGETHER_DEPRECATIONS }],
      },
      {
        heading: "Serverless removal and dedicated endpoints",
        paragraphs: [
          `On ${when} these ids reach the shutdown date stored in the dataset. The deprecations page says: "${TOGETHER_AFTER}"`,
          `The same page says: "${TOGETHER_YES}" ${dedicatedSentence} An on-demand dedicated endpoint is one of the migration options on that page.`,
          `The active redirects table is a different list. That section says: "${TOGETHER_REDIRECT}" MiniMaxAI/MiniMax-M3 and thinkingmachines/Inkling are in the scheduled deprecations table. Update the model field to the recommended replacement, or deploy a dedicated endpoint, before ${when}.`,
          others.some((model) => togetherDedicatedMark(model) === "No")
            ? `A November row outside this table is marked No. The page says: "${TOGETHER_NO}"`
            : "The November 6 rows are the Together ids in this table.",
        ],
        sources: [
          { label: "Together AI deprecations", url: TOGETHER_DEPRECATIONS },
          { label: "Together AI dedicated endpoints", url: TOGETHER_DEDICATED },
        ],
      },
      {
        heading: "MiniMax's own API is a different provider",
        paragraphs: [
          minimax.length
            ? `SunsetDiff also stores MiniMax API rows. The guide is [MiniMax M2.5 and M2.7 shutdown on ${longDate(MINIMAX_NOV18_SHUTDOWN_DATE)}](/guides/${MINIMAX_NOV18_GUIDE_SLUG}/). Those ids are ${idList(minimax)}, provider minimax, shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. The provider page is [MiniMax](/providers/minimax/).`
            : "The dataset has no MiniMax API rows for that shutdown.",
          "Together's MiniMaxAI/MiniMax-M3 row is provider together. Its stored replacement is MiniMaxAI/MiniMax-M3.1-Flash. Calls to that id use the Together host on this page.",
        ],
        sources: [{ label: "Together AI deprecations", url: TOGETHER_DEPRECATIONS }],
      },
      {
        heading: "Find the model ids in your code",
        paragraphs: [
          "Search the repository for the ids in the table, then for the replacement ids. A hit is a candidate, not proof the call still runs. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `The quickstart says: "${TOGETHER_OPENAI_SDK}" Its curl posts to ${TOGETHER_CHAT}.`,
        ],
        codes: [{ caption: "ripgrep", code: searchCode(rows) }],
        sources,
      },
      {
        heading: "Test the replacement before the cutoff",
        paragraphs: [
          `The deprecations page says to run a small A/B test comparing the replacement against your current model on representative traffic. It says replacement models rarely behave identically, so validate quality, latency, and cost before committing. Do that before ${when}.`,
          `The quickstart's curl and OpenAI client set model to MiniMaxAI/MiniMax-M3.1-Flash. That is the stored replacement for MiniMaxAI/MiniMax-M3. The quickstart also says: "${TOGETHER_REASONING}" And: "${TOGETHER_THINKING}"`,
          "thinkingmachines/Inkling stores meta-models/Muse-Spark-Open-816B-A42B. Put that id in the same model field. The quickstart sample does not print the Inkling id.",
          "The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list: evals, rejected fields, token limits, tools, price, and latency.",
        ],
        codes: sampleReplacement
          ? rows.flatMap((model) => {
              const id = publishedReplacementIds(model)[0];
              if (!id) return [];
              return [{ caption: `OpenAI-compatible client, model field set to ${id}`, code: togetherPython(id) }];
            })
          : undefined,
        sources,
      },
    ],
    related: [
      { href: `/shutdowns/together-${TOGETHER_NOV6_SHUTDOWN_DATE}/`, label: `Together AI shutdowns on ${when}` },
      { href: "/providers/together/", label: "Together AI provider page" },
      ...rows.flatMap((model) => {
        const target = togetherTarget(model, catalog);
        const migrate = togetherMigratePath(model, catalog);
        return [
          { href: `/models/${model.provider}/${model.slug}/`, label: model.id },
          { href: `/replace/${model.provider}/${model.slug}/`, label: `Replace ${model.id}` },
          ...(target ? [{ href: `/models/${target.provider}/${target.slug}/`, label: target.id }] : []),
          ...(migrate ? [{ href: migrate, label: `Migrate ${model.id}` }] : []),
        ];
      }),
      { href: `/guides/${MINIMAX_NOV18_GUIDE_SLUG}/`, label: `MiniMax API M2.5 and M2.7 shutdown on ${longDate(MINIMAX_NOV18_SHUTDOWN_DATE)}` },
      { href: "/providers/minimax/", label: "MiniMax provider page" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: `Which Together AI ids shut down on ${when}?`,
        answer: `The dataset lists ${idList(rows)} with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}. The deprecations page says: "${TOGETHER_SCHEDULED}"`,
      },
      {
        question: "What is the official replacement?",
        answer: replacementFaq(rows, catalog),
      },
      {
        question: "Do on-demand dedicated endpoints stop on that date?",
        answer: `The deprecations page says: "${TOGETHER_AFTER}" ${dedicatedSentence} The page says: "${TOGETHER_YES}" The scheduled table tells you to migrate to the recommended replacement or a dedicated endpoint before that date.`,
      },
      {
        question: "Is this the MiniMax API retirement?",
        answer: minimax.length
          ? `This page is provider together. The MiniMax API guide covers ${idList(minimax)} on provider minimax, shutdown date ${MINIMAX_NOV18_SHUTDOWN_DATE}. Together's MiniMaxAI/MiniMax-M3 replacement is MiniMaxAI/MiniMax-M3.1-Flash.`
          : "This page is provider together. The dataset has no MiniMax API rows on the November 18, 2026 shutdown.",
      },
      {
        question: "Which host does the call use?",
        answer: `The quickstart says: "${TOGETHER_OPENAI_SDK}" It posts to ${TOGETHER_CHAT}. The sample model on that page is MiniMaxAI/MiniMax-M3.1-Flash.`,
      },
      {
        question: "Why is Qwen/Qwen3.8-2.4T-A95B missing from the table?",
        answer: others.length
          ? `${others.map((model) => `${model.id} stores shutdown date ${model.shutdown_date}`).join(". ")}. This table is shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}. The scheduled table lists ${others.map((model) => `${model.id} with recommended replacement ${publishedReplacementIds(model)[0] ?? "none"}`).join(". ")}.`
          : `This table is every Together id with shutdown date ${TOGETHER_NOV6_SHUTDOWN_DATE}. No other Together row stores a November 2026 shutdown date.`,
      },
    ],
    citations: [TOGETHER_DEPRECATIONS, TOGETHER_QUICKSTART, TOGETHER_DEDICATED],
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
  const hasPage = count >= SHUTDOWN_BATCH_MIN || SMALL_SHUTDOWN_BATCHES.has(`google-vertex|${date}`);
  if (hasPage) {
    return `${date} has ${count} Google Vertex ${count === 1 ? "record" : "records"} with an exact shutdown date, so [${path}](${path}) exists.`;
  }
  const noun = count === 1 ? "record" : "records";
  return `${date} has ${count} Google Vertex ${noun} with an exact shutdown date, so there is no ${path} page.`;
}

function vertexDateCell(model: ModelRecord): string {
  if (!model.shutdown_date) return "Not published";
  if (model.shutdown_date_kind === "not_before") return `${model.shutdown_date} or later`;
  return shutdownCell(model);
}

function veoFloorDates(veo: ModelRecord[]): string[] {
  return [...new Set(veo.map((model) => model.shutdown_date).filter((date): date is string => Boolean(date)))].sort();
}

function veoOneFloor(veo: ModelRecord[]): string | undefined {
  const dates = veoFloorDates(veo);
  return dates.length === 1 ? dates[0] : undefined;
}

function veoFloorWords(date: string): string {
  return `${longDate(date)} or later`;
}

function veoReplacementClause(veo: ModelRecord[]): string {
  return veo.every((model) => publishedReplacementIds(model).length === 0)
    ? "The replacement cell is empty."
    : "See each row for its stored replacement.";
}

function veoFloorSentence(veo: ModelRecord[]): string {
  if (!veo.length) return "The dataset has no Vertex Veo row with a not_before retirement date.";
  const date = veoOneFloor(veo);
  const kinds = [...new Set(veo.map((model) => model.shutdown_date_kind))].join(", ");
  if (date) {
    return `The model versions page lists ${idList(veo)} with retirement date ${veoFloorWords(date)}. ${veoReplacementClause(veo)} The dataset stores shutdown date ${date} and kind ${kinds}.`;
  }
  const lines = veo.map((model) => `${model.id} stores ${model.shutdown_date} with kind ${model.shutdown_date_kind}`);
  return `${lines.join(". ")}. ${veoReplacementClause(veo)}`;
}

function veoAnswerClause(veo: ModelRecord[]): string {
  if (!veo.length) return "The dataset has no Vertex Veo row with a not_before retirement date.";
  const date = veoOneFloor(veo);
  if (date) {
    const empty = veo.every((model) => publishedReplacementIds(model).length === 0);
    return `The Veo ids ${idList(veo)} print ${veoFloorWords(date)}${empty ? ", with an empty replacement cell" : ""}. That is a floor, not a confirmed shutdown on ${longDate(date)}.`;
  }
  return `The Veo rows are floors: ${veo.map((model) => `${model.id} prints ${veoFloorWords(model.shutdown_date!)}`).join("; ")}.`;
}

function veoFloorPageSentence(veo: ModelRecord[]): string {
  if (!veo.length) return "The dataset has no Vertex Veo floor, so this guide does not name a Veo shutdown page.";
  return veoFloorDates(veo).map((date) => {
    const rows = veo.filter((model) => model.shutdown_date === date);
    const counted = rows.length === 1 ? "that row" : `those ${rows.length} rows`;
    const under = rows.length < SHUTDOWN_BATCH_MIN
      ? ` Counting ${counted} as exact would still be under ${SHUTDOWN_BATCH_MIN}.`
      : "";
    return `${idList(rows)} store ${date} with kind not_before. A floor is not an exact shutdown date, so there is no /shutdowns/google-vertex-${date}/ page.${under}`;
  }).join(" ");
}

function veoShutdownAnswer(veo: ModelRecord[]): string {
  if (!veo.length) {
    return `The dataset has no Vertex Veo row with a not_before retirement date. The page says: "${VERTEX_EXTEND}"`;
  }
  const date = veoOneFloor(veo);
  const when = date
    ? veoFloorWords(date)
    : veoFloorDates(veo).map((day) => veoFloorWords(day)).join(", ");
  const empty = veo.every((model) => publishedReplacementIds(model).length === 0);
  const kinds = [...new Set(veo.map((model) => model.shutdown_date_kind))].join(", ");
  const moved = date === "2026-11-17" ? "" : " No Vertex Veo row stores shutdown date 2026-11-17.";
  return `No confirmed day is printed. The model versions page says ${when}, and ${empty ? "the replacement cell is empty" : "the stored replacement is on each row"}. The page says: "${VERTEX_EXTEND}" The dataset kind is ${kinds}.${moved}`;
}

function vertexNovDecGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const ordered = [...rows].sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id));
  const nov19 = vertexExact(catalog, VERTEX_NOV19_SHUTDOWN_DATE);
  const dec13 = vertexExact(catalog, VERTEX_DEC13_SHUTDOWN_DATE);
  const oct20 = vertexExact(catalog, "2026-10-20");
  const veo = vertexVeoFloorRows(catalog);
  const veoDate = veoOneFloor(veo);
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
    description: `Vertex AI retires gemini-3.6-flash on ${VERTEX_NOV19_SHUTDOWN_DATE} and gemini-live-2.5-flash-native-audio on ${VERTEX_DEC13_SHUTDOWN_DATE}. Replacements are gemini-3.8-flash and gemini-3.8-live. ${veoDate ? `Veo rows store ${veoDate} with kind not_before.` : "Veo floors follow the dates stored on each row."}`,
    h1: "Vertex AI Gemini retirements in November and December 2026",
    summary: `The Vertex Gemini ids with exact shutdown dates ${VERTEX_NOV19_SHUTDOWN_DATE} and ${VERTEX_DEC13_SHUTDOWN_DATE}, the replacement on the model versions page, and the Veo rows that only print a floor.`,
    answer: `The dataset has ${ordered.length} Google Vertex Gemini ids with an exact shutdown date in this window: ${idList(ordered)}. The model versions page lists gemini-3.6-flash with retirement date November 19, 2026 and replacement model ID gemini-3.8-flash. It lists gemini-live-2.5-flash-native-audio with retirement date December 13, 2026 and replacement model ID gemini-3.8-live. The 3.6 Flash page says: "${VERTEX_FLASH_BANNER}" ${veoAnswerClause(veo)} [/shutdowns/google-vertex-${VERTEX_NOV19_SHUTDOWN_DATE}/](/shutdowns/google-vertex-${VERTEX_NOV19_SHUTDOWN_DATE}/) lists the gemini-3.6-flash record. [/shutdowns/google-vertex-${VERTEX_DEC13_SHUTDOWN_DATE}/](/shutdowns/google-vertex-${VERTEX_DEC13_SHUTDOWN_DATE}/) lists the gemini-live-2.5-flash-native-audio record. A single-record date gets a page because the guide covers it.`,
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
        text: `Call gemini-3.8-flash before ${longDate(VERTEX_NOV19_SHUTDOWN_DATE)}. Call gemini-3.8-live before ${longDate(VERTEX_DEC13_SHUTDOWN_DATE)}. The model versions page says retirement timelines may be extended, and they will not move earlier. ${veoDate ? `The Veo rows say ${veoFloorWords(veoDate)}. Do not treat that cell as a shutdown on ${longDate(veoDate)}.` : veo.length ? "The Veo rows are floors. Do not treat a floor cell as a shutdown on that day." : "The dataset has no Vertex Veo floor in this guide."}`,
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
            ? `gemini-3.7-flash is on the shorter-availability table with retirement date January 28, 2027 and replacement model ID gemini-3.8-flash. The stored shutdown date is ${flash37.shutdown_date ?? "Not published"} (${flash37.shutdown_date_kind}). January 28, 2027 is after mid-December, so that id is not in the table below.${flash37.shutdown_date && SMALL_SHUTDOWN_BATCHES.has(`google-vertex|${flash37.shutdown_date}`) ? ` The page is [/shutdowns/google-vertex-${flash37.shutdown_date}/](/shutdowns/google-vertex-${flash37.shutdown_date}/).` : ""}`
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
          veoFloorSentence(veo),
          veoDate
            ? `The page says: "${VERTEX_EXTEND}" ${longDate(veoDate)} is the earliest day in that cell. It is not a confirmed shutdown on that day. This guide does not name a replacement the page does not print.`
            : `The page says: "${VERTEX_EXTEND}" A floor is the earliest day in that cell. It is not a confirmed shutdown on that day. This guide does not name a replacement the page does not print.`,
          veo.length
            ? "These Veo ids are not Gemini text or Live ids. A generateContent swap to gemini-3.8-flash does not replace a Veo video model."
            : "A generateContent swap to gemini-3.8-flash does not replace a Veo video model.",
        ],
        table: veo.length
          ? {
              caption: veoDate
                ? `${veo.length} Vertex Veo ids whose retirement cell says ${veoFloorWords(veoDate)}.`
                : `${veo.length} Vertex Veo ids with a not_before retirement date.`,
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
          `Search the repository for the two Gemini ids in the first table${veo.length ? `, and for ${idList(veo)} if you use video models` : ""}. A hit is a candidate. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.`,
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
          veoFloorPageSentence(veo),
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
      { href: `/shutdowns/google-vertex-${VERTEX_NOV19_SHUTDOWN_DATE}/`, label: `Vertex AI shutdowns on ${longDate(VERTEX_NOV19_SHUTDOWN_DATE)}` },
      { href: `/shutdowns/google-vertex-${VERTEX_DEC13_SHUTDOWN_DATE}/`, label: `Vertex AI shutdowns on ${longDate(VERTEX_DEC13_SHUTDOWN_DATE)}` },
      ...(flash37?.shutdown_date && SMALL_SHUTDOWN_BATCHES.has(`google-vertex|${flash37.shutdown_date}`)
        ? [{ href: `/shutdowns/google-vertex-${flash37.shutdown_date}/`, label: `Vertex AI shutdowns on ${longDate(flash37.shutdown_date)}` }]
        : []),
      { href: `/guides/${GEMINI_NOV17_GUIDE_SLUG}/`, label: "Gemini API model shutdowns on November 17, 2026" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/find-model-ids-in-your-codebase/", label: "Find model ids in your codebase" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: `/guides/${VERTEX_EMBED_APRIL1_GUIDE_SLUG}/`, label: "Vertex AI text embedding shutdown on April 1, 2027" },
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
        answer: veoShutdownAnswer(veo),
      },
      {
        question: "Does the Gemini API use these same dates?",
        answer: `No. The Vertex pages say: "${VERTEX_FOOTNOTE}" Checked on ${VERTEX_NOV_DEC_CHECKED}, the Gemini API deprecations page lists gemini-3.6-flash with shutdown cell "No shutdown date announced." It does not list gemini-live-2.5-flash-native-audio. The November 17, 2026 Gemini API ids are on [Gemini API model shutdowns on November 17, 2026](/guides/${GEMINI_NOV17_GUIDE_SLUG}/).`,
      },
      {
        question: "Is there a shutdown page for November 19 or December 13?",
        answer: `A shutdown batch page is published when at least ${SHUTDOWN_BATCH_MIN} model records share one provider and one exact shutdown date, or when a date is explicitly included. ${vertexBatchSentence(VERTEX_NOV19_SHUTDOWN_DATE, nov19.length)} ${vertexBatchSentence(VERTEX_DEC13_SHUTDOWN_DATE, dec13.length)} ${veoFloorDates(veo).map((date) => `There is no /shutdowns/google-vertex-${date}/ page because the Veo date is a floor.`).join(" ") || "The dataset has no Vertex Veo floor to publish as a shutdown page."}`,
      },
      {
        question: "Is gemini-3.7-flash in this window?",
        answer: flash37
          ? `No. The model versions page lists gemini-3.7-flash with retirement date January 28, 2027 and replacement model ID gemini-3.8-flash. The stored shutdown date is ${flash37.shutdown_date ?? "Not published"}.${flash37.shutdown_date && SMALL_SHUTDOWN_BATCHES.has(`google-vertex|${flash37.shutdown_date}`) ? ` [/shutdowns/google-vertex-${flash37.shutdown_date}/](/shutdowns/google-vertex-${flash37.shutdown_date}/) lists that record.` : ""}`
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

function geminiDec1Guide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const when = longDate(GEMINI_DEC1_SHUTDOWN_DATE);
  const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const lite = catalog.find((model) => model.provider === "google-gemini-api" && model.id === "gemini-2.5-flash-lite");
  const sources = [
    { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS_CURRENT },
    { label: "Gemini 3.8 Flash migration guide", url: GEMINI_38_MIGRATE },
    { label: "Gemini 3.5 Flash-Lite migration guide", url: GEMINI_35_LITE_MIGRATE },
  ];
  return {
    slug: GEMINI_DEC1_GUIDE_SLUG,
    title: "Gemini 2.5 Pro and Flash auto-route on December 1, 2026 | SunsetDiff",
    description: `On ${GEMINI_DEC1_SHUTDOWN_DATE}, Gemini API requests to gemini-2.5-pro route to gemini-3.8-flash, and requests to gemini-2.5-flash route to gemini-3.5-flash-lite. The bill follows the replacement. gemini-2.5-flash-lite stays.`,
    h1: "Gemini 2.5 Pro and Flash auto-route on December 1, 2026",
    summary: `What Google says happens to gemini-2.5-pro and gemini-2.5-flash on ${GEMINI_DEC1_SHUTDOWN_DATE}: the replacement id, the bill, existing-user access, and the id that stays.`,
    answer: `On ${when}, Google says API requests to gemini-2.5-pro automatically route to gemini-3.8-flash and are billed at Gemini 3.8 Flash rates. Requests to gemini-2.5-flash automatically route to gemini-3.5-flash-lite and are billed at Gemini 3.5 Flash-Lite rates. The response comes from the replacement model. Both ids are already deprecated, and API access is already limited to people who have used them. gemini-2.5-flash-lite is not deprecated. The deprecations page also says a date in the table is the earliest day a model might be retired.`,
    checked: GEMINI_DEC1_CHECKED,
    steps: [
      {
        name: "Read the two ids",
        text: `The table is gemini-2.5-pro and gemini-2.5-flash. Each shutdown cell is ${GEMINI_DEC1_SHUTDOWN_DATE}. The replacement cell is the id Google names. Open the model page before you change a call.`,
      },
      {
        name: "Pin the replacement and send a test",
        text: `Call gemini-3.8-flash by that id before ${when} if your code uses gemini-2.5-pro. Call gemini-3.5-flash-lite by that id before ${when} if your code uses gemini-2.5-flash. Leaving the old id in the request means Google chooses the replacement and the bill on ${when}.`,
      },
      {
        name: "Read the migration guide before you switch",
        text: "The 3.8 Flash guide says to replace thinking_budget with thinking_level, and that minimal returns an error on gemini-3.8-flash. It says to remove temperature, top_p, top_k, candidate_count, and prefilled model turns. The 3.5 Flash-Lite checklist says to apply the same parameter rules as 3.6 Flash, and that its default thinking_level is minimal.",
      },
      {
        name: "Leave gemini-2.5-flash-lite alone",
        text: "Google says gemini-2.5-flash-lite is not deprecated and remains available through the API until further notice. Its shutdown cell says no shutdown date announced. Do not point those calls at gemini-3.5-flash-lite unless you are choosing a different model on purpose.",
      },
    ],
    sections: [
      {
        heading: "What happens on December 1, 2026",
        paragraphs: [
          `Google's caution for gemini-2.5-pro says: "${GEMINI_PRO_CALLOUT}"`,
          `Google's caution for gemini-2.5-flash says: "${GEMINI_FLASH_CALLOUT}"`,
          `The table lists shutdown date December 1, 2026 for both ids. The pro replacement cell names gemini-3.8-flash. The flash replacement cell names gemini-3.5-flash-lite. Both cells say the id is no longer available to select in Google AI Studio, and that API requests automatically route on ${when}.`,
          `The same page defines shutdown as: "${GEMINI_SHUTDOWN}" The caution for these two ids is more specific: the request is answered by the replacement model, and the bill uses that model's rates. This guide follows the caution for these two ids.`,
          `The page also says: "${GEMINI_EARLIEST}" The caution says the route is effective ${when}. This guide does not pick which sentence wins if Google sends a later day. Until that notice, the stored shutdown date is ${GEMINI_DEC1_SHUTDOWN_DATE}.`,
        ],
        table: {
          caption: `${ordered.length} Gemini API ids with shutdown date ${GEMINI_DEC1_SHUTDOWN_DATE}.`,
          headers: ["Model id", "Deprecation date", "Shutdown date", "Recommended replacement"],
          rows: tableRows(ordered, catalog),
        },
        sources,
      },
      {
        heading: "The bill changes",
        paragraphs: [
          "The deprecations page says gemini-2.5-pro requests are billed at Gemini 3.8 Flash rates, and gemini-2.5-flash requests are billed at Gemini 3.5 Flash-Lite rates. It links the pricing page for each rate. It does not print a dollar amount in the caution.",
          `The Gemini 3.8 Flash page says: "${GEMINI_38_PRICE}" The Gemini 3.6 page's model table prints ${GEMINI_35_PRICE} for gemini-3.5-flash-lite. This guide did not copy cached, batch, or long-context tiers from the pricing page, and it does not compare those figures with the current gemini-2.5-pro or gemini-2.5-flash price.`,
        ],
        sources: [
          { label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS_CURRENT },
          { label: "What's new in Gemini 3.8 Flash", url: GEMINI_38_GUIDE },
          { label: "What's new in Gemini 3.6 Flash and 3.5 Flash-Lite", url: GEMINI_36_GUIDE },
          { label: "Gemini 3.8 Flash pricing anchor", url: GEMINI_PRICING_38 },
          { label: "Gemini 3.5 Flash-Lite pricing anchor", url: GEMINI_PRICING_35 },
        ],
      },
      {
        heading: "Access is already limited",
        paragraphs: [
          "The pro caution says API access is limited to existing users who have actively used gemini-2.5-pro in the past. The flash caution says access to the 2.5 models is limited to users who have actively used them in the past. A new user can already get HTTP 404. That limit is separate from the December 1 route.",
          "The recorded 404 sentences are on [gemini-2.5-flash is no longer available to new users](/errors/gemini-2-5-flash-no-longer-available-to-new-users/) and [This model is no longer available to new users](/errors/gemini-model-no-longer-available-to-new-users/). The deprecations page does not print those sentences.",
          lite
            ? `gemini-2.5-flash-lite is a different id. The flash caution says it is not deprecated and remains available through the API until further notice. The stored row has status ${lite.status}, shutdown kind ${lite.shutdown_date_kind}, and ${lite.shutdown_date ? `shutdown date ${lite.shutdown_date}` : "no shutdown_date"}.`
            : "The dataset has no gemini-2.5-flash-lite row.",
        ],
        sources: [{ label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS_CURRENT }],
      },
      {
        heading: "Pin the replacement before December 1",
        paragraphs: [
          `Set the model field to gemini-3.8-flash or gemini-3.5-flash-lite and send one real request before ${when}. That is the test. An old id left in the client is the id Google routes on ${when}, so the test never runs against the model you will be billed for.`,
          "The samples below use the Interactions API shape from the Gemini 3.8 Flash quickstart. The second sample keeps that shape and uses the model id from the 3.5 Flash-Lite migration checklist. The 3.6 Flash quickstart uses gemini-3.6-flash, so this guide does not present that sample as a 3.5 Flash-Lite quickstart.",
        ],
        codes: [
          {
            caption: "Old id. On December 1, 2026 Google routes this call to gemini-3.8-flash.",
            code: `from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-2.5-pro",
    input="Write a three.js script that renders a realistic 3D black hole."
)

print(interaction.output_text)
`,
          },
          {
            caption: "Pinned replacement, from the Gemini 3.8 Flash quickstart",
            code: `from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Write a three.js script that renders a realistic 3D black hole."
)

print(interaction.output_text)
`,
          },
          {
            caption: "Same client shape, with the gemini-3.5-flash-lite id from the migration checklist",
            code: `from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.5-flash-lite",
    input="Write a three.js script that renders a realistic 3D black hole."
)

print(interaction.output_text)
`,
          },
          {
            caption: "ripgrep",
            code: searchCode(ordered),
          },
        ],
        sources: [
          { label: "What's new in Gemini 3.8 Flash", url: GEMINI_38_GUIDE },
          { label: "Migrate to gemini-3.5-flash-lite", url: GEMINI_35_LITE_MIGRATE },
        ],
      },
      {
        heading: "Breaking changes the migration guides name",
        paragraphs: [
          `The 3.8 Flash checklist says to change the model string to gemini-3.8-flash, and to replace thinking_budget with thinking_level. The values it names are low, medium, and high. Medium is the default. It says: "${GEMINI_38_MINIMAL}"`,
          "The same checklist says to remove temperature, top_p, top_k, and candidate_count. It says candidate_count is unsupported in Gemini 3 and later. It says to remove prefilled model turns and to use previous_interaction_id for multi-turn history. It points at the 3.6 API changes for those parameter rules.",
          `The 3.6 page says: "${GEMINI_SAMPLING_IGNORED}" It also says: "${GEMINI_PREFILL_400}" The 3.8 page tells you to remove the fields. It does not print a sample response body for a temperature field on gemini-3.8-flash. This guide does not add one.`,
          `The 3.5 Flash-Lite checklist says to change the model string to gemini-3.5-flash-lite. It says the default thinking_level is minimal, and to leave minimal for high-volume extraction, routing, or classification. It says to set medium or high for autonomous subagents that use tools, code execution, or multi-step reasoning. It says to apply the same parameter rules as 3.6 Flash.`,
          "Both checklists mention function-calling payload shape and thought signatures. The pages to read are linked below. This guide does not restate a rule it did not quote.",
        ],
        sources: [
          { label: "Migrate to gemini-3.8-flash", url: GEMINI_38_MIGRATE },
          { label: "Migrate to gemini-3.5-flash-lite", url: GEMINI_35_LITE_MIGRATE },
          { label: "Gemini 3.6 API changes", url: GEMINI_36_API_CHANGES },
        ],
      },
      {
        heading: "Find the ids and open the shutdown page",
        paragraphs: [
          "Search for gemini-2.5-pro and gemini-2.5-flash. A hit on gemini-2.5-flash-lite is a different model. [How to find every model ID in your codebase](/guides/find-model-ids-in-your-codebase/) covers SDK argument names. The [scan page](/scan/) builds a search from dataset ids that have a shutdown date.",
          `SunsetDiff publishes a shutdown batch page when at least ${SHUTDOWN_BATCH_MIN} model records share one provider and one exact shutdown date. These two ids are under that count, and the page is published anyway: [Gemini API shutdowns on ${when}](/shutdowns/google-gemini-api-${GEMINI_DEC1_SHUTDOWN_DATE}/). Vertex gemini-2.5-pro already has its own retirement date. See [why shutdown dates differ by platform](/guides/why-shutdown-dates-differ-by-platform/).`,
        ],
        sources: [{ label: "Gemini API deprecations", url: GEMINI_DEPRECATIONS_CURRENT }],
      },
    ],
    related: [
      { href: "/models/google-gemini-api/gemini-2-5-pro/", label: "gemini-2.5-pro" },
      { href: "/models/google-gemini-api/gemini-2-5-flash/", label: "gemini-2.5-flash" },
      { href: "/models/google-gemini-api/gemini-2-5-flash-lite/", label: "gemini-2.5-flash-lite" },
      { href: "/models/google-gemini-api/gemini-3-8-flash/", label: "gemini-3.8-flash" },
      { href: "/models/google-gemini-api/gemini-3-5-flash-lite/", label: "gemini-3.5-flash-lite" },
      { href: "/migrate/google-gemini-api__gemini-2-5-pro__to__google-gemini-api__gemini-3-8-flash/", label: "gemini-2.5-pro to gemini-3.8-flash" },
      { href: "/migrate/google-gemini-api__gemini-2-5-flash__to__google-gemini-api__gemini-3-5-flash-lite/", label: "gemini-2.5-flash to gemini-3.5-flash-lite" },
      { href: `/shutdowns/google-gemini-api-${GEMINI_DEC1_SHUTDOWN_DATE}/`, label: `Gemini API shutdowns on ${when}` },
      { href: "/providers/google-gemini-api/", label: "Google Gemini API" },
      { href: `/guides/${GEMINI_NOV17_GUIDE_SLUG}/`, label: "Gemini API model shutdowns on November 17, 2026" },
      { href: "/guides/why-shutdown-dates-differ-by-platform/", label: "Why shutdown dates differ by platform" },
      { href: "/guides/pre-migration-test-checklist/", label: "Pre-migration test checklist" },
      { href: "/errors/gemini-model-no-longer-available-to-new-users/", label: "New-user 404" },
      { href: "/scan/", label: "Scan retiring ids" },
    ],
    faqs: [
      {
        question: "What happens to gemini-2.5-pro and gemini-2.5-flash on December 1, 2026?",
        answer: `Google says requests to gemini-2.5-pro automatically route to gemini-3.8-flash and are billed at Gemini 3.8 Flash rates. Requests to gemini-2.5-flash automatically route to gemini-3.5-flash-lite and are billed at Gemini 3.5 Flash-Lite rates. The caution says: "${GEMINI_PRO_CALLOUT}"`,
      },
      {
        question: "Does the request start failing on that date?",
        answer: `The caution says the request automatically routes and the bill changes. It does not say the call starts returning an error on ${when}. The page's general shutdown sentence is: "${GEMINI_SHUTDOWN}"`,
      },
      {
        question: "Is gemini-2.5-flash-lite deprecated?",
        answer: `No. The flash caution says: "gemini-2.5-flash-lite is not deprecated and remains available through the API until further notice." The table cell says no shutdown date announced.`,
      },
      {
        question: "Can a new API key call these models today?",
        answer: `The pro caution says access is limited to existing users who have actively used gemini-2.5-pro. The flash caution says access to the 2.5 models is limited to users who have actively used them in the past. That limit is already in effect. It is separate from the ${when} route.`,
      },
      {
        question: "How do I test the replacement before December 1, 2026?",
        answer: `Set model to gemini-3.8-flash or gemini-3.5-flash-lite and send one real request before ${when}. The [pre-migration test checklist](/guides/pre-migration-test-checklist/) is the longer list. The migrate diffs are [gemini-2.5-pro to gemini-3.8-flash](/migrate/google-gemini-api__gemini-2-5-pro__to__google-gemini-api__gemini-3-8-flash/) and [gemini-2.5-flash to gemini-3.5-flash-lite](/migrate/google-gemini-api__gemini-2-5-flash__to__google-gemini-api__gemini-3-5-flash-lite/).`,
      },
      {
        question: "Is December 1, 2026 the final day?",
        answer: `The caution says the route is effective ${when}. The page also says: "${GEMINI_EARLIEST}" The stored shutdown date stays ${GEMINI_DEC1_SHUTDOWN_DATE} until Google prints a later day.`,
      },
    ],
    citations: [
      GEMINI_DEPRECATIONS_CURRENT,
      GEMINI_38_GUIDE,
      GEMINI_38_MIGRATE,
      GEMINI_36_GUIDE,
      GEMINI_35_LITE_MIGRATE,
      GEMINI_36_API_CHANGES,
      GEMINI_PRICING_38,
      GEMINI_PRICING_35,
    ],
  };
}

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

function byShutdownThenId(a: ModelRecord, b: ModelRecord): number {
  return (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id);
}

/** Dated canonical_slug from the scraper note. The id itself when the note has no different slug. */
export function openRouterCanonicalSlug(model: ModelRecord): string {
  const match = model.region_or_platform_notes?.match(/canonical_slug is (\S+)\./);
  return match?.[1] ?? model.id;
}

function newestSourceDay(rows: ModelRecord[], fallback: string): string {
  const days = rows.flatMap((model) => model.sources.map((source) => source.last_checked)).filter(Boolean).sort();
  return days.at(-1) ?? fallback;
}

function datedModelList(models: ModelRecord[]): string {
  const dates = [...new Set(models.map((model) => model.shutdown_date).filter((date): date is string => Boolean(date)))].sort();
  return dates.map((date) => {
    const names = models.filter((model) => model.shutdown_date === date).map((model) => modelLink(model));
    return `${longDate(date)}: ${englishJoin(names)}`;
  }).join(". ");
}

function openRouterSearch(ids: string[]): string {
  const flags = [...new Set(ids)].map((id) => `-e '${id}'`).join(" ");
  return `rg -n -F ${flags}\n`;
}

function openRouterNovDecGuide(rows: ModelRecord[], catalog: ModelRecord[]): GuidePage {
  const day = today();
  const listed = [...rows].sort(byShutdownThenId);
  const count = listed.length;
  const slugWord = count === 1 ? "slug" : "slugs";
  const checked = newestSourceDay(listed, day);
  const first = listed[0]?.shutdown_date ?? OPENROUTER_NOV_DEC_WINDOW_START;
  const last = listed[listed.length - 1]?.shutdown_date ?? OPENROUTER_NOV_DEC_WINDOW_END;
  const canonicalRows = listed.filter((model) => openRouterCanonicalSlug(model) !== model.id);
  const searchIds = listed.flatMap((model) => {
    const canonical = openRouterCanonicalSlug(model);
    return canonical === model.id ? [model.id] : [model.id, canonical];
  });
  const earlier = catalog.filter((model) => isOpenRouterEarlierStored(model, day)).sort(byShutdownThenId);
  const prefixes = [...new Set(listed.map((model) => model.id.split("/")[0]))].sort((a, b) => a.localeCompare(b));
  const imageModels = listed.filter((model) => isOpenRouterDecemberImageModel(model));
  const imageNote = imageModels.length
    ? `OpenRouter lists ${englishJoin(imageModels.map((model) => `${modelLink(model)} with a not-before shutdown of ${longDate(model.shutdown_date!)}`))}. The models API is the source, and ${imageModels.every((model) => model.replacements.length === 0) ? "the stored replacement list is empty, so this page does not name one" : "the replacement cell is the list stored on the row"}. ${imageModels.every((model) => model.shutdown_date === DECEMBER_1_IMAGE_SHUTDOWN_DATE) ? `That day is the same calendar day as OpenAI's direct API image shutdown on ${longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE)}.` : `OpenAI's direct API image shutdown is a separate list, dated ${longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE)}.`} The OpenRouter slugs are not the OpenAI ids. See [OpenAI image models shutting down on ${longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE)}](/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/).`
    : "";
  const replacementSentence = listed.every((model) => model.replacements.length === 0)
    ? "The recommended replacement cell says Not published. That means the stored replacement list is empty. This guide does not invent a slug."
    : `The recommended replacement is the replacement stored on the row. ${listed.map((model) => `${model.id}: ${replacementText(model, catalog)}`).join(" ")}`;
  const sources = [
    { label: "OpenRouter models API", url: OPENROUTER_MODELS_API },
    { label: "OpenRouter models guide", url: OPENROUTER_MODELS_GUIDE },
    { label: "OpenRouter model schema", url: OPENROUTER_MODEL_SCHEMA },
  ];
  const windowLabel = `${longDate(OPENROUTER_NOV_DEC_WINDOW_START)} through ${longDate(OPENROUTER_NOV_DEC_WINDOW_END)}`;
  return {
    slug: OPENROUTER_NOV_DEC_GUIDE_SLUG,
    title: "OpenRouter model expirations in November and December 2026 | SunsetDiff",
    description: `${count} stored OpenRouter ${slugWord} are deprecated with a shutdown date after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}. Each date is a not-before removal floor. Empty replacement lists stay empty.`,
    h1: "OpenRouter model expirations in November and December 2026",
    summary: `The ${count} stored OpenRouter ${slugWord} with a shutdown date after ${longDate(day)} and on or before ${longDate(OPENROUTER_NOV_DEC_WINDOW_END)}, how to read that field, and how to change the model string.`,
    answer: `The dataset has ${count} OpenRouter ${count === 1 ? "model" : "models"} that ${count === 1 ? "is" : "are"} deprecated and whose shutdown date is after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}. The dates in the table run from ${first} through ${last}. The models guide calls expiration_date the deprecation date for the model endpoint. The model schema says it is the date after which the model may be removed, not a day the model is guaranteed to stop. SunsetDiff stores the same day as shutdown_date_kind not_before, which means not before that day. ${replacementSentence} Named not_before dates in this window get a batch page even though the kind is not exact: ${englishJoin(openRouterShutdownLinks())}.`,
    checked,
    steps: [
      {
        name: "Read expiration_date as not before that day",
        text: `The table is every stored OpenRouter row that is deprecated and whose shutdown date is after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}. The models guide says: "${OPENROUTER_DEPRECATION_QUOTE}" The model schema says: "${OPENROUTER_REMOVAL_QUOTE}" Do not treat the day as the morning the model stops.`,
      },
      {
        name: "Find the slugs in your code",
        text: "Search for the id and, when it differs, the canonical_slug. The quickstart puts the slug in the model field. Also check env files, YAML, TOML, and JSON. The scan page leaves not_before ids out, so run the search yourself.",
      },
      {
        name: "Pick a current slug from the same author",
        text: "Read the replacement cell. Not published means the stored list is empty. Do not fill a slug in. Pick a current model from the same author prefix on the OpenRouter catalog. A current slug has expiration_date null. SunsetDiff does not store null dates, so that slug is not on the OpenRouter provider page.",
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
          `These ${count} ${slugWord} are the stored OpenRouter rows that are deprecated and whose shutdown date is after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}. output_modalities=all is the list this site reads, because the default list omits models whose output is not text. Sources on these rows were last checked on ${checked}. The table dates run from ${longDate(first)} through ${longDate(last)}.`,
          `The models guide says expiration_date is: "${OPENROUTER_DEPRECATION_QUOTE}" The model schema says: "${OPENROUTER_REMOVAL_QUOTE}" SunsetDiff copies that day into deprecation_date and shutdown_date and sets shutdown_date_kind to not_before. Model pages say not sooner than that day. Not before and not sooner than are the same floor. OpenRouter did not publish a second date.`,
          replacementSentence,
          ...(imageNote ? [imageNote] : []),
          count
            ? `${count} stored ${count === 1 ? "row matches" : "rows match"} this window and the kind not_before: ${idList(listed)}.`
            : "No stored row is still ahead inside this window.",
        ],
        table: {
          caption: `${count} OpenRouter ${slugWord} with a shutdown date after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}. The window is ${windowLabel}.`,
          headers: ["Model id", "expiration_date", "How to read it", "Recommended replacement"],
          rows: listed.map((model) => [
            modelLink(model),
            longDate(model.shutdown_date!),
            `Not before ${model.shutdown_date}. The model may be removed after it.`,
            replacementText(model, catalog),
          ]),
        },
        sources,
      },
      {
        heading: "canonical_slug is not a replacement",
        paragraphs: [
          "Some rows set canonical_slug to a dated id that is different from the id you send. Search for both strings. The dated slug is not a model OpenRouter told you to switch to.",
          canonicalRows.length
            ? `${canonicalRows.length} ${canonicalRows.length === 1 ? "slug" : "slugs"} in this table ${canonicalRows.length === 1 ? "has" : "have"} a different canonical_slug. The other ${count - canonicalRows.length} use the same string for id and canonical_slug.`
            : "Every slug in this table uses the same string for id and canonical_slug.",
        ],
        table: {
          caption: "Ids in this table whose canonical_slug differs.",
          headers: ["Model id", "canonical_slug"],
          rows: canonicalRows.map((model) => [modelLink(model), openRouterCanonicalSlug(model)]),
        },
        sources: [{ label: "OpenRouter models API", url: OPENROUTER_MODELS_API }],
      },
      {
        heading: "Stored rows with an earlier shutdown date",
        paragraphs: [
          earlier.length
            ? `${earlier.length} stored OpenRouter ${earlier.length === 1 ? "row has" : "rows have"} a shutdown date on or before ${day}, or before ${OPENROUTER_NOV_DEC_WINDOW_START}. ${datedModelList(earlier)}. They stay in the dataset. They are not in the table above, because that table keeps only dates that are still ahead inside ${windowLabel}.`
            : `No stored OpenRouter row has a shutdown date on or before ${day}.`,
          `Most not_before dates do not get a batch page. Named dates in this guide do: ${englishJoin(openRouterShutdownLinks())}. They are labeled as not-before dates on those pages.`,
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
          `The [scan page](/scan/) builds its pattern from exact and month-only shutdown dates. not_before is left out, so these OpenRouter slugs are not in that pattern. The [GitHub Action](/github-action/) says: "${OPENROUTER_ACTION_QUOTE}" The stored rows are deprecated, so a hit on a stored slug is reported. The Action still uses the stored day when it chooses a warning or an error. That does not turn the floor into an exact shutdown day.`,
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
          `The quickstart says: "${OPENROUTER_ALIAS_SENTENCE}" Browse current slugs at the OpenRouter catalog, or read expiration_date from GET /api/v1/models. Pick a slug from the same author prefix whose expiration_date is null. The prefixes in this table are ${englishJoin(prefixes)}. SunsetDiff has one [OpenRouter provider page](/providers/openrouter/). It does not have a separate page for those authors, and it does not list slugs whose expiration_date is null.`,
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
      { href: `/guides/${DECEMBER_1_IMAGE_GUIDE_SLUG}/`, label: `OpenAI image models shutting down on ${longDate(DECEMBER_1_IMAGE_SHUTDOWN_DATE)}` },
      ...openRouterShutdownDates().map((date) => ({ href: `/shutdowns/openrouter-${date}/`, label: `OpenRouter shutdowns on ${longDate(date)}` })),
      ...imageModels.map((model) => ({ href: `/models/openrouter/${model.slug}/`, label: model.id })),
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
        question: `Which OpenRouter models are in this table?`,
        answer: `The table lists ${count} stored OpenRouter ${slugWord} that are deprecated and whose shutdown date is after ${day} and on or before ${OPENROUTER_NOV_DEC_WINDOW_END}: ${listed.map((model) => `${model.id} (${model.shutdown_date})`).join(", ")}.`,
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
        answer: `${replacementSentence} Pick a current slug from the same author prefix whose expiration_date is null. The OpenRouter provider page lists only slugs that have an expiration_date.`,
      },
      {
        question: "Are there OpenRouter shutdown batch pages for these dates?",
        answer: `Named not_before dates in this window get a batch page: ${englishJoin(openRouterShutdownLinks())}. Those pages note that the dates are not-before floors.`,
      },
      {
        question: "Why are some stored OpenRouter rows missing from the table?",
        answer: earlier.length
          ? `Their shutdown date is on or before ${day}, or before ${OPENROUTER_NOV_DEC_WINDOW_START}. The table keeps dates that are still ahead, through ${OPENROUTER_NOV_DEC_WINDOW_END}. ${datedModelList(earlier)}.`
          : `Every stored deprecated OpenRouter row with a not-before shutdown date is still ahead and inside ${windowLabel}.`,
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
