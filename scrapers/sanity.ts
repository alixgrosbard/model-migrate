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
