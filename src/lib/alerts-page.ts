import { CLOSED_NOTE, PRO_FEATURES, SENDING_NOTE, STORED_NOTE } from "./public-copy.ts";
import { ALERTS_PATH } from "./trust-pages.ts";

export { ALERTS_PATH };

export const ALERTS_TITLE = "Shutdown alerts | SunsetDiff";
export const ALERTS_DESCRIPTION =
  "What the free SunsetDiff shutdown-alert signup stores and sends today, and the free feeds that need no signup.";

export const ALERTS_ANSWER =
  "This is the same free signup form used on the rest of the site. It does not charge you. It does not start Pro. What it stores, and the one email it can send, depend on settings that are not all turned on in this repository.";

export interface AlertSection {
  heading: string;
  paragraphs: string[];
}

export const ALERT_SECTIONS: AlertSection[] = [
  {
    heading: "What the form does on this build",
    paragraphs: [
      "render.yaml does not set PUBLIC_SERVICE_URL or PUBLIC_ALERTS_SENDING on the static site. When PUBLIC_SERVICE_URL is missing, the email field and the button are disabled. Submitting does not post, does not store the address, and does not send email.",
      `PUBLIC_ALERTS_SENDING defaults to on. While it is on, the note on the form is "${SENDING_NOTE}" even when the fields are disabled. Set it to false, 0, no, or off to change the note. If the form is open, the note becomes "${STORED_NOTE}" If the form is closed, the note becomes "${CLOSED_NOTE}"`,
      "The Node service does not read PUBLIC_ALERTS_SENDING. That flag changes the note on the form. It does not turn the welcome email on or off.",
    ],
  },
  {
    heading: "What a subscriber gets when signup is open",
    paragraphs: [
      "When PUBLIC_SERVICE_URL is set, the form POSTs the address to that service at /api/subscribe. Optional provider checkboxes are on the form. The subscribe route does not read them, so they do not filter anything.",
      "The service stores the address only when RESEND_API_KEY and RESEND_SEGMENT_ID are both set on the Node service. render.yaml lists those two variables with sync: false. Their values are not in this repository. If either is missing, the service returns 503 and the message \"Signup storage is not configured yet.\" The form does not show that sentence. It tries the request once more, then says: \"The signup service is unavailable. Nothing was stored and no email was sent.\"",
      "A new stored address gets one welcome email from SunsetDiff <alerts@send.sunsetdiff.com>. The mail lists up to five upcoming shutdowns from https://sunsetdiff.com/data/models.json, with the provider, the model name, the date, and a link to the model page. It then says \"More than N other models shut down in the next 30 days,\" where N is the count of other models in that window, and links to /deadlines/. It also links to /calendar/ and /deadlines.ics. The footer has an unsubscribe link. That link marks the contact unsubscribed. A second signup for an address that already exists does not send another welcome email.",
      "The welcome also says: \"Coming at launch: Pro alerts tuned to just the models you use. You won't be charged until Pro launches. After that it's $19 a month, and you can cancel anytime.\" This form does not start that subscription and it does not charge you.",
      "There is no scheduled job in this repository that emails subscribers before a later shutdown. The only email the subscribe route sends is that one welcome message.",
      "A sixth signup from the same network inside one hour is refused with \"Too many signups from this network. Try again later.\" The form still shows the unavailable sentence above, because it does not display the error body.",
    ],
  },
  {
    heading: "What this signup is not",
    paragraphs: [
      `On the Pro page, "${PRO_FEATURES.find((feature) => feature.text.startsWith("Alerts only"))?.text ?? ""}" is marked Coming at launch. Earlier warnings and Pro API access are marked Coming at launch too. The public JSON files are marked Available now. This signup does not do the Coming at launch items.`,
    ],
  },
];

export const ALERT_ALTERNATIVES: { href: string; label: string; detail: string }[] = [
  {
    href: "/feed.xml",
    label: "RSS",
    detail: "New deprecations. /rss.xml is the same document as /feed.xml. No signup.",
  },
  {
    href: "/calendar/",
    label: "Calendar",
    detail: "The calendar page, plus /deadlines.ics for the next 365 days and /calendar.ics for all dated shutdowns. No signup.",
  },
  {
    href: "/api/",
    label: "JSON API",
    detail: "Static JSON and CSV files. No API key and no signup.",
  },
  {
    href: "/mcp/",
    label: "MCP server",
    detail: "Free streamable HTTP MCP server. No API key and no signup.",
  },
  {
    href: "/badges/",
    label: "Badges",
    detail: "Free SVG status badges. No signup.",
  },
];
