export const SENDING_NOTE = "We email you before models shut down. Unsubscribe anytime.";
export const STORED_NOTE = "We store your email for deprecation alerts. We do not send email.";
export const CLOSED_NOTE = "Signup is off. This form is disabled. It does not store your address and it does not send email.";

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
