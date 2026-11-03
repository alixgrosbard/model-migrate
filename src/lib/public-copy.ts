export const SENDING_NOTE = "We email you before models shut down. Unsubscribe anytime.";
export const STORED_NOTE = "We store your email for deprecation alerts. We do not send email.";
export const CLOSED_NOTE = "Signup is off. This form is disabled. It does not store your address and it does not send email.";

/** Visible billing sentence. Early access is free. $19 starts only after Pro launches. */
export const PRO_EARLY_ACCESS =
  "Pro is in early access. Join free today. You won't be charged until Pro launches, and we'll email you before your first charge. After that it's $19 a month, and you can cancel anytime.";

export const PRO_TITLE = "SunsetDiff Pro early access | SunsetDiff";

export const PRO_DESCRIPTION =
  "Pro is in early access. Join free today. You won't be charged until Pro launches. After that it's $19 a month, and you can cancel anytime.";

export const PRO_CTA = "Start free early access";

export const PRO_NO_CHECKOUT =
  "There is no checkout link on this build. The form below is the free alert list. It does not start a subscription and it does not charge you.";

export const PRO_FOOTER =
  "Pro is free until launch. You won't be charged until Pro launches. After that it's $19 a month, and you can cancel anytime.";

export const PRO_BILLING_QUESTION = "When will I be charged for SunsetDiff Pro?";

export const PRO_FEATURES: { text: string; status: "Coming at launch" | "Available now" }[] = [
  { text: "Alerts only for the models in your code.", status: "Coming at launch" },
  { text: "Earlier warnings.", status: "Coming at launch" },
  { text: "Pro API access.", status: "Coming at launch" },
  { text: "Public JSON files and /api/v1. They stay free.", status: "Available now" },
];

export function alertsSending(value: string | undefined | null): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return true;
  return !["0", "false", "no", "off"].includes(text);
}

export function alertNote(sending: boolean, open: boolean): string {
  if (sending) return SENDING_NOTE;
  return open ? STORED_NOTE : CLOSED_NOTE;
}

export function proCheckoutUrl(value: string | undefined | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** True when the built HTML would show the <owner> placeholder, including the escaped form. */
export function htmlContainsOwnerPlaceholder(html: string): boolean {
  const decoded = html
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0*60;/g, "<")
    .replace(/&#0*62;/g, ">")
    .replace(/&#x0*3c;/gi, "<")
    .replace(/&#x0*3e;/gi, ">");
  return decoded.includes("<owner>");
}
