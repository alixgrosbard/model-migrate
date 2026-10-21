import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRecord } from "../schema.ts";
import type { FaqItem } from "./format.ts";

export const BADGES_PATH = "/badges/";
export const BADGES_NAV = "Badges";
export const BADGES_TITLE = "Status badges for AI model shutdowns | SunsetDiff";
export const BADGES_DESCRIPTION =
  "Free SVG status badges for every AI model SunsetDiff tracks. Copy Markdown or HTML. The badge links to the model page.";

/** Browsers and shields.io can keep a badge for an hour. The next data refresh rewrites the file. */
export const BADGE_CACHE_SECONDS = 3600;

export const badgeFaqs: FaqItem[] = [
  {
    question: "How do I add a SunsetDiff badge to a README?",
    answer:
      "Copy the Markdown snippet and paste it into the README. The image is the badge. The link opens the model page on SunsetDiff.",
  },
  {
    question: "What do the badge colors mean?",
    answer:
      "Red means the model is retired, or the published shutdown date is under 30 days away. A date that is already past is red too. Amber means the published shutdown date is under 90 days away. Green means a later date, or the model is active and no shutdown date is published. Gray means the date is only a not-sooner-than floor, or the status has no shutdown date.",
  },
  {
    question: "Where does the badge date come from?",
    answer:
      "The badge uses the same model record as the model page. It does not add a date that is not in that record. If no shutdown date is published, the message says so.",
  },
  {
    question: "When does a badge update?",
    answer:
      "The SVG and the JSON file are rewritten when SunsetDiff refreshes the dataset and rebuilds the site. Browsers and shields.io may keep a copy for about an hour.",
  },
];

export type BadgeColor = "red" | "amber" | "green" | "gray";

export interface BadgeView {
  label: string;
  message: string;
  color: BadgeColor;
  /** Flat shields.io fill for the message half. */
  fill: string;
  /** shields.io endpoint color. Hex colors have no #. */
  shieldsColor: string;
}

const FILLS: Record<BadgeColor, { fill: string; shieldsColor: string }> = {
  red: { fill: "#e05d44", shieldsColor: "red" },
  amber: { fill: "#dfb317", shieldsColor: "dfb317" },
  green: { fill: "#4c1", shieldsColor: "4c1" },
  gray: { fill: "#9f9f9f", shieldsColor: "9f9f9f" },
};

/**
 * Verdana 11px advances for code points 32 through 126.
 * Same widths shields.io uses, so the flat badge matches that style.
 */
const VERDANA_11 = [
  3.87, 4.33, 5.05, 9, 6.99, 11.84, 7.99, 2.95, 5, 5, 6.99, 9, 4, 5, 4, 5, 6.99, 6.99, 6.99, 6.99, 6.99, 6.99, 6.99,
  6.99, 6.99, 6.99, 5, 5, 9, 9, 9, 6, 11, 7.52, 7.54, 7.68, 8.48, 6.96, 6.32, 8.53, 8.27, 4.63, 5, 7.62, 6.12, 9.27,
  8.23, 8.66, 6.63, 8.66, 7.65, 7.52, 6.78, 8.05, 7.52, 10.88, 7.54, 6.77, 7.54, 5, 5, 5, 9, 6.99, 6.99, 6.61, 6.85,
  5.73, 6.85, 6.55, 3.87, 6.85, 6.96, 3.02, 3.79, 6.51, 3.02, 10.7, 6.96, 6.68, 6.85, 6.85, 4.69, 5.73, 4.33, 6.96,
  6.51, 9, 6.51, 6.51, 5.78, 6.98, 5, 6.98, 9,
];

export function badgeSvgPath(model: { provider: string; slug: string }): string {
  return `/badge/${model.provider}/${model.slug}.svg`;
}

export function badgeJsonPath(model: { provider: string; slug: string }): string {
  return `/badge/${model.provider}/${model.slug}.json`;
}

export function modelPagePath(model: { provider: string; slug: string }): string {
  return `/models/${model.provider}/${model.slug}/`;
}

/** Whole days from day to date, using UTC dates. Negative when the date is in the past. */
export function daysUntil(day: string, date: string): number {
  const start = Date.parse(`${day}T00:00:00Z`);
  const end = Date.parse(`${date}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function badgeView(model: ModelRecord, day: string): BadgeView {
  const label = model.id;
  if (model.status === "retired") return paint(label, "retired", "red");
  if (model.shutdown_date && model.shutdown_date_kind === "exact") {
    return paint(label, `retires ${model.shutdown_date}`, colorForDays(daysUntil(day, model.shutdown_date)));
  }
  if (model.shutdown_date && model.shutdown_date_kind === "month_only") {
    return paint(label, `retires ${model.shutdown_date.slice(0, 7)}`, colorForDays(daysUntil(day, model.shutdown_date)));
  }
  if (model.shutdown_date && model.shutdown_date_kind === "not_before") {
    return paint(label, `not before ${model.shutdown_date}`, "gray");
  }
  if (model.status === "active") return paint(label, "active / no shutdown announced", "green");
  if (model.status === "legacy") return paint(label, "legacy / no shutdown announced", "gray");
  if (model.status === "deprecated") return paint(label, "deprecated / no shutdown announced", "gray");
  return paint(label, `${model.status} / no shutdown announced`, "gray");
}

function colorForDays(days: number): BadgeColor {
  if (days < 30) return "red";
  if (days < 90) return "amber";
  return "green";
}

function paint(label: string, message: string, color: BadgeColor): BadgeView {
  return { label, message, color, ...FILLS[color] };
}

export interface BadgeEndpoint {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  cacheSeconds: number;
}

export function badgeEndpoint(model: ModelRecord, day: string): BadgeEndpoint {
  const view = badgeView(model, day);
  return {
    schemaVersion: 1,
    label: view.label,
    message: view.message,
    color: view.shieldsColor,
    cacheSeconds: BADGE_CACHE_SECONDS,
  };
}

export function badgeAlt(model: ModelRecord, day: string): string {
  const view = badgeView(model, day);
  return `${view.label}: ${view.message}`;
}

export function badgeMarkdown(origin: string, model: ModelRecord, day: string): string {
  const root = trimOrigin(origin);
  const alt = badgeAlt(model, day).replace(/\]/g, "");
  return `[![${alt}](${root}${badgeSvgPath(model)})](${root}${modelPagePath(model)})`;
}

export function badgeHtml(origin: string, model: ModelRecord, day: string): string {
  const root = trimOrigin(origin);
  const alt = escapeAttr(badgeAlt(model, day));
  const src = escapeAttr(`${root}${badgeSvgPath(model)}`);
  const href = escapeAttr(`${root}${modelPagePath(model)}`);
  return `<a href="${href}"><img src="${src}" alt="${alt}"></a>`;
}

export function badgeShieldsMarkdown(origin: string, model: ModelRecord, day: string): string {
  const root = trimOrigin(origin);
  const alt = badgeAlt(model, day).replace(/\]/g, "");
  const endpoint = `https://img.shields.io/endpoint?url=${encodeURIComponent(`${root}${badgeJsonPath(model)}`)}`;
  return `[![${alt}](${endpoint})](${root}${modelPagePath(model)})`;
}

/** Shields flat style. Widths use the Verdana 11px table above. */
export function badgeSvg(model: ModelRecord, day: string): string {
  const view = badgeView(model, day);
  return flatBadgeSvg(view.label, view.message, view.fill);
}

export function flatBadgeSvg(label: string, message: string, fill: string): string {
  const horizPadding = 5;
  const labelWidth = verdanaWidth(label);
  const messageWidth = verdanaWidth(message);
  const leftWidth = labelWidth + 2 * horizPadding;
  const rightWidth = messageWidth + 2 * horizPadding;
  const width = leftWidth + rightWidth;
  const labelX = 10 * (1 + 0.5 * labelWidth + horizPadding);
  const messageX = 10 * (leftWidth - 1 + 0.5 * messageWidth + horizPadding);
  const accessible = escapeXml(`${label}: ${message}`);
  const labelText = escapeXml(label);
  const messageText = escapeXml(message);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${accessible}"><title>${accessible}</title><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="${leftWidth}" height="20" fill="#555"/><rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${fill}"/><rect width="${width}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><g transform="scale(.1)"><g aria-hidden="true" fill="#010101"><text x="${labelX}" y="150" fill-opacity=".8" filter="url(#blur)" textLength="${labelWidth * 10}">${labelText}</text><text x="${labelX}" y="150" fill-opacity=".3" textLength="${labelWidth * 10}">${labelText}</text></g><text x="${labelX}" y="140" textLength="${labelWidth * 10}">${labelText}</text></g><g transform="scale(.1)"><g aria-hidden="true" fill="#010101"><text x="${messageX}" y="150" fill-opacity=".8" filter="url(#blur)" textLength="${messageWidth * 10}">${messageText}</text><text x="${messageX}" y="150" fill-opacity=".3" textLength="${messageWidth * 10}">${messageText}</text></g><text x="${messageX}" y="140" textLength="${messageWidth * 10}">${messageText}</text></g></g></svg>`;
}

export function verdanaWidth(text: string): number {
  let sum = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    sum += code >= 32 && code <= 126 ? VERDANA_11[code - 32] : 8;
  }
  const floored = sum | 0;
  return floored % 2 === 0 ? floored + 1 : floored;
}

export async function writeBadgeFiles(dir: string, models: ModelRecord[], day: string): Promise<number> {
  const badgeDir = path.join(dir, "badge");
  await rm(badgeDir, { recursive: true, force: true });
  const seen = new Set<string>();
  for (const model of models) {
    const svgPath = badgeSvgPath(model);
    if (seen.has(svgPath)) throw new Error(`Duplicate badge path ${svgPath}`);
    seen.add(svgPath);
    const folder = path.join(badgeDir, model.provider);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${model.slug}.svg`), badgeSvg(model, day));
    await writeFile(path.join(folder, `${model.slug}.json`), JSON.stringify(badgeEndpoint(model, day)));
  }
  return models.length;
}

function trimOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeXml(value);
}
