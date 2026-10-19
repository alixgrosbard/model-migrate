import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MODELS_URL = "https://sunsetdiff.com/data/models.json";
const SITE = "https://sunsetdiff.com";
const CACHE_MS = 60 * 60 * 1000;
const FROM = "SunsetDiff <alerts@send.sunsetdiff.com>";

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "google-gemini-api": "Google Gemini API",
  "google-vertex": "Google Vertex AI",
  "aws-bedrock": "AWS Bedrock",
  "azure-openai": "Azure OpenAI",
  mistral: "Mistral",
};

export interface ShutdownModel {
  id: string;
  slug: string;
  provider: string;
  display_name: string;
  shutdown_date: string | null;
  shutdown_date_kind: string;
}

interface CacheEntry {
  at: number;
  models: ShutdownModel[];
}

let cache: CacheEntry | null = null;

export function resetWelcomeCache() {
  cache = null;
}

export function unsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "";
}

export function signUnsubscribeToken(email: string, secret: string): string {
  const payload = Buffer.from(email, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(email).digest("base64url");
  return `${payload}.${sig}`;
}

export function readUnsubscribeToken(token: string, secret: string): string | null {
  const split = token.split(".");
  if (split.length !== 2 || !split[0] || !split[1] || !secret) return null;
  let email = "";
  try {
    email = Buffer.from(split[0], "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email || email.includes("\0")) return null;
  const expected = createHmac("sha256", secret).update(email).digest("base64url");
  const left = Buffer.from(split[1]);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return email;
}

export function upcomingShutdowns(models: ShutdownModel[], day: string, limit = 5): ShutdownModel[] {
  const best = new Map<string, ShutdownModel>();
  for (const model of models) {
    if (!isOnOrAfterToday(model, day)) continue;
    const key = `${model.provider}:${model.id}`;
    const previous = best.get(key);
    if (!previous || model.slug.length < previous.slug.length) best.set(key, model);
  }
  return [...best.values()]
    .sort((a, b) => (a.shutdown_date ?? "").localeCompare(b.shutdown_date ?? "") || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function otherModelsInNext30Days(models: ShutdownModel[], shown: ShutdownModel[], day: string): number {
  const shownKeys = new Set(shown.map((model) => `${model.provider}:${model.id}`));
  const end = addDays(day, 30);
  const keys = new Set<string>();
  for (const model of models) {
    if (!isOnOrAfterToday(model, day) || !within(model, end)) continue;
    const key = `${model.provider}:${model.id}`;
    if (shownKeys.has(key)) continue;
    keys.add(key);
  }
  return keys.size;
}

export function welcomeSubject(models: ShutdownModel[]): string {
  const first = models[0];
  if (!first?.shutdown_date) return "Welcome to SunsetDiff: upcoming shutdowns";
  return `Welcome to SunsetDiff: ${displayName(first)} on ${whenLabel(first)}`;
}

export function welcomeContent(models: ShutdownModel[], day: string, unsubscribeUrl: string): { subject: string; html: string; text: string } {
  const next = upcomingShutdowns(models, day, 5);
  const others = otherModelsInNext30Days(models, next, day);
  const subject = welcomeSubject(next);
  const lines = next.map((model) => {
    const href = modelUrl(model);
    const label = `${whenLabel(model)}, ${providerName(model.provider)}, ${displayName(model)}`;
    return { href, label };
  });
  const more = `More than ${others} other models shut down in the next 30 days.`;
  const text = [
    "Thanks for signing up.",
    "",
    ...lines.map((line) => `${line.label}: ${line.href}`),
    "",
    `${more} ${SITE}/deadlines/`,
    `Calendar: ${SITE}/calendar/ and ${SITE}/deadlines.ics`,
    "Coming at launch: Pro alerts tuned to just the models you use. You won't be charged until Pro launches. After that it's $19 a month, and you can cancel anytime.",
    "",
    "Thanks, SunsetDiff",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
    "",
  ].join("\n");
  const items = lines
    .map((line) => `<li><a href="${escapeAttr(line.href)}">${escapeHtml(line.label)}</a></li>`)
    .join("");
  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body>
<div lang="en" dir="ltr">
<p>Thanks for signing up.</p>
${items ? `<ol>${items}</ol>` : `<p>Published shutdowns are listed on the deadlines page.</p>`}
<p><a href="${SITE}/deadlines/">${escapeHtml(more)}</a></p>
<p>Calendar: <a href="${SITE}/calendar/">${SITE}/calendar/</a> and <a href="${SITE}/deadlines.ics">${SITE}/deadlines.ics</a></p>
<p>Coming at launch: Pro alerts tuned to just the models you use. You won't be charged until Pro launches. After that it's $19 a month, and you can cancel anytime.</p>
<p>Thanks, SunsetDiff</p>
<p><a href="${escapeAttr(unsubscribeUrl)}">Unsubscribe</a></p>
</div>
</body>
</html>`;
  return { subject, html, text };
}

export function idempotencyKey(email: string): string {
  const digest = createHash("sha256").update(email).digest("hex");
  return `welcome-email/${digest}`;
}

export async function loadShutdownModels(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<ShutdownModel[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.models;
  const response = await fetchImpl(MODELS_URL);
  if (!response.ok) {
    if (cache) return cache.models;
    throw new Error(String(response.status));
  }
  const body = (await response.json()) as { models?: ShutdownModel[] } | ShutdownModel[];
  const models = Array.isArray(body) ? body : body.models ?? [];
  cache = { at: now, models };
  return models;
}

export async function sendWelcomeEmail(options: {
  email: string;
  apiKey: string;
  origin: string;
  fetchImpl?: typeof fetch;
  models?: ShutdownModel[];
  day?: string;
}): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const day = options.day ?? new Date().toISOString().slice(0, 10);
  let models = options.models;
  if (!models) {
    try {
      models = await loadShutdownModels(fetchImpl);
    } catch (error) {
      const status = error instanceof Error ? error.message : "0";
      console.error(`Welcome models status ${status}`);
      models = cache?.models ?? [];
    }
  }
  const secret = unsubscribeSecret();
  const token = signUnsubscribeToken(options.email, secret);
  const unsubscribeUrl = `${options.origin.replace(/\/+$/, "")}/unsubscribe?token=${encodeURIComponent(token)}`;
  const content = welcomeContent(models, day, unsubscribeUrl);
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey(options.email),
    },
    body: JSON.stringify({
      from: FROM,
      to: [options.email],
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (response.ok || response.status === 409) {
    console.log("Welcome email sent");
    return;
  }
  console.error(`Welcome email status ${response.status}`);
}

export function modelUrl(model: ShutdownModel): string {
  return `${SITE}/models/${encodeURIComponent(model.provider)}/${encodeURIComponent(model.slug)}/`;
}

function isOnOrAfterToday(model: ShutdownModel, day: string): boolean {
  if (!model.shutdown_date) return false;
  if (model.shutdown_date_kind === "none" || model.shutdown_date_kind === "not_before") return false;
  if (model.shutdown_date_kind === "month_only") return model.shutdown_date.slice(0, 7) >= day.slice(0, 7);
  return model.shutdown_date >= day;
}

function within(model: ShutdownModel, end: string): boolean {
  if (!model.shutdown_date) return false;
  if (model.shutdown_date_kind === "month_only") return model.shutdown_date.slice(0, 7) <= end.slice(0, 7);
  return model.shutdown_date <= end;
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function displayName(model: ShutdownModel): string {
  const name = model.display_name.trim();
  return /^[A-Za-z0-9]/.test(name) ? name : model.id;
}

function whenLabel(model: ShutdownModel): string {
  if (model.shutdown_date_kind === "month_only" && model.shutdown_date) return model.shutdown_date.slice(0, 7);
  return model.shutdown_date ?? "";
}

function providerName(id: string): string {
  return PROVIDER_NAMES[id] ?? id;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
