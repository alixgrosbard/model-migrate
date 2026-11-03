export interface SanityResult {
  ok: boolean;
  reason?: string;
}

export function sanityCheck(provider: string, nextCount: number, previousCount: number): SanityResult {
  if (nextCount === 0) {
    return { ok: false, reason: `${provider} returned 0 rows` };
  }
  if (previousCount > 0 && nextCount < previousCount * 0.7) {
    return {
      ok: false,
      reason: `${provider} returned ${nextCount} rows, more than 30% below the previous ${previousCount}`,
    };
  }
  return { ok: true };
}

/** These providers decide for themselves, before the zero-row gate. */
export const GATE_EXEMPT = new Set([
  "openrouter",
  "nebius",
  "together",
  "fireworks",
  "github-copilot",
  "minimax",
  "cloudflare-workers-ai",
]);

export const PROVIDER_FAILURE_PREFIX = "SCRAPER_PROVIDER_FAILURE";

export function providerKeptLine(provider: string): string {
  return `${provider} row change was not applied. Stored rows stay.`;
}

/**
 * A provider that returned nothing, or dropped by more than 30 percent, is
 * removed from the map. Callers still write every provider that remains.
 * Stored rows for a removed provider stay because merge keeps providers
 * that are absent from the map.
 */
export function applyProviderGate<T>(
  scraped: Map<string, T>,
  previousCounts: Map<string, number>,
  exempt: ReadonlySet<string> = GATE_EXEMPT,
): { provider: string; reason: string }[] {
  const skips: { provider: string; reason: string }[] = [];
  for (const [provider, models] of [...scraped]) {
    if (exempt.has(provider)) continue;
    const count = Array.isArray(models) ? models.length : 0;
    const result = sanityCheck(provider, count, previousCounts.get(provider) ?? 0);
    if (!result.ok && result.reason) {
      skips.push({ provider, reason: result.reason });
      scraped.delete(provider);
    }
  }
  return skips;
}
