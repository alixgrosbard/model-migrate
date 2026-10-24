/** Gemini API 2.5 ids Google limits to people who have already used them. */
const GEMINI_25_RESTRICTED = new Set(["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]);

export const GEMINI_25_ACCESS_CHECKED = "2026-10-21";
export const GEMINI_25_ACCESS_SOURCE = "https://ai.google.dev/gemini-api/docs/deprecations";

/** Note above the Gemini 2.5 Pro and Gemini 2.5 Flash tables on the deprecations page. */
export const GEMINI_25_ACCESS_QUOTE =
  "To ensure reliable performance for everyone, we are limiting access to the 2.5 models to users who have actively used them in the past. These models are not deprecated and will continue to be served until further notice through the API. For any new projects, use our latest models: 3.5 Flash-Lite or 3.8 Flash. This helps us maintain sufficient capacity for both ongoing legacy workflows and new applications.";

export function gemini25Restricted(model: { provider: string; id: string }): boolean {
  return model.provider === "google-gemini-api" && GEMINI_25_RESTRICTED.has(model.id);
}
