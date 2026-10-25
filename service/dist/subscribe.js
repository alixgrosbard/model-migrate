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
];
const hits = new Map();
export function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}
export function hashIp(ip, salt = process.env.IP_HASH_SALT || "sunsetdiff-v1") {
    return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
export function rateLimited(ipHash, now = Date.now()) {
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
export function cleanProviders(value) {
    const list = Array.isArray(value) ? value : [];
    return [...new Set(list.map(String))].filter((item) => providerIds.includes(item));
}
export const THANK_YOU = "You're on the list.";
export function resetRateLimits() {
    hits.clear();
}
