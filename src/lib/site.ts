export const DEFAULT_SITE_URL = "https://sunsetdiff.onrender.com";

export function siteOrigin(): string {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");
}
