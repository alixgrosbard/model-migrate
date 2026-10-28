import { createHash } from "node:crypto";

const providerIds = [
  "openai",
  "anthropic",
  "google-gemini-api",
  "google-vertex",
  "aws-bedrock",
  "azure-openai",
  "mistral",
  "deepseek",
  "nvidia",
  "xai",
  "cohere",
  "openrouter",
  "nebius",
] as const;

const hits = new Map<string, number[]>();

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

export function hashIp(ip: string, salt = process.env.IP_HASH_SALT || "sunsetdiff-v1"): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function rateLimited(ipHash: string, now = Date.now()): boolean {
  const windowStart = now - 60 * 60 * 1000;
  const recent = (hits.get(ipHash) ?? []).filter((time) => time > windowStart);
  if (recent.length >= 5) {
    hits.set(ipHash, recent);
    return true;
  }
  recent.push(now);
  hits.set(ipHash, recent);
  return false;
}

export function cleanProviders(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map(String))].filter((item) => (providerIds as readonly string[]).includes(item));
}

export const THANK_YOU = "You're on the list.";

export function resetRateLimits() {
  hits.clear();
}
