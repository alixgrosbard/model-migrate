import type { MigrationRecord, ModelRecord, Provider } from "./schema.ts";
import { BADGES_DESCRIPTION, BADGES_PATH } from "./lib/badges.ts";
import { modelFaqs, replaceFaqs, type FaqItem } from "./lib/format.ts";
import { deprecatedFaqs, publicName, questionPath, shutdownFaqs } from "./lib/growth.ts";
import { GUIDES_CHECKED, GUIDES_INDEX, guidePath, type GuidePage } from "./lib/guides.ts";
import { GLOSSARY_CHECKED, GLOSSARY_INDEX, glossaryPath, glossaryTerms, type GlossaryTerm } from "./lib/glossary.ts";
import { BREAKING_CHANGES_PATH, breakingChangesChecked, breakingChangesDatasetGraph } from "./lib/breaking-changes.ts";
import { REQUEST_ERRORS_INDEX, requestErrorChecked, requestErrorPath, requestErrorsIndexChecked, type RequestErrorPage } from "./lib/request-errors.ts";

function siteRoot(site: string): string {
  return site.replace(/\/+$/, "");
}

export function websiteGraph(site: string) {
  const root = siteRoot(site);
  return [
    {
      "@type": "WebSite",
      "@id": `${root}/#website`,
      name: "SunsetDiff",
      url: root,
      publisher: { "@id": `${root}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${root}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${root}/#org`,
      name: "SunsetDiff",
      url: root,
    },
  ];
}

export function breadcrumb(site: string, crumbs: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.path, site).href,
    })),
  };
}

export function modelGraph(site: string, model: ModelRecord, provider: Provider, migration?: MigrationRecord | null) {
  const path = `/models/${model.provider}/${model.slug}/`;
  const url = new URL(path, site).href;
  const checked = model.sources[0]?.last_checked;
  return [
    {
      "@type": "TechArticle",
      headline: `When is ${publicName(model)} shut down?`,
      dateModified: checked,
      url,
      citation: model.sources.map((source) => source.url),
      about: {
        "@type": "SoftwareApplication",
        name: publicName(model),
        softwareVersion: model.id,
        provider: { "@type": "Organization", name: provider.name },
      },
    },
    faqNode(modelFaqs(model, provider, migration)),
  ];
}

export function migrateGraph(site: string, model: ModelRecord, migration: MigrationRecord | undefined, provider: Provider) {
  const steps = (migration?.migration_checklist ?? ["Read the official deprecation page."]).map((text, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    text,
  }));
  return [
    {
      "@type": "TechArticle",
      headline: `Replacement for ${publicName(model)}: what changes when you switch`,
      dateModified: migration?.last_checked ?? model.sources[0]?.last_checked,
      url: new URL(`/replace/${model.provider}/${model.slug}/`, site).href,
      citation: (migration?.sources ?? model.sources).map((source) => source.url),
    },
    { "@type": "HowTo", name: `Switch from ${model.id}`, step: steps },
    faqNode(replaceFaqs(model, provider, migration)),
  ];
}

function faqNode(items: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: plainFaq(item.answer) },
    })),
  };
}

/** Visible FAQ answers may use [label](/path) links. Schema text keeps the label and the path. */
export function plainFaq(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

export function datasetGraph(site: string, modified: string) {
  return [
    {
      "@type": "Dataset",
      name: "SunsetDiff model retirement dataset",
      description: "Shutdown dates, replacements, and migration diffs for AI models, cited to official provider pages.",
      url: new URL("/data/", site).href,
      license: "https://creativecommons.org/licenses/by/4.0/",
      sameAs: "https://huggingface.co/datasets/sunsetdiff/ai-model-deprecations",
      creator: { "@type": "Organization", name: "SunsetDiff" },
      dateModified: modified,
      temporalCoverage: "2022/..",
      distribution: [
        { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: new URL("/dataset/sunsetdiff.json", site).href },
        { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: new URL("/dataset/sunsetdiff.csv", site).href },
        { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: new URL("/data/models.json", site).href },
        { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: new URL("/data/deprecations.csv", site).href },
        { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: new URL("/data/changelog.json", site).href },
      ],
    },
  ];
}

export function questionGraph(site: string, model: ModelRecord, provider: Provider, kind: "deprecated" | "shutdown-date", migration?: MigrationRecord | null) {
  const items = kind === "deprecated" ? deprecatedFaqs(model, provider) : shutdownFaqs(model, provider, migration);
  const path = questionPath(model, kind);
  const headline = kind === "deprecated" ? `Is ${publicName(model)} being deprecated?` : `${publicName(model)} shutdown date`;
  return [
    {
      "@type": "TechArticle",
      headline,
      dateModified: model.sources[0]?.last_checked,
      url: new URL(path, site).href,
      citation: model.sources.map((source) => source.url),
    },
    {
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];
}

export function shutdownEventGraph(
  site: string,
  headline: string,
  description: string,
  path: string,
  published: string,
  modified: string,
  citations: string[],
  faqs: FaqItem[],
  items: { name: string; path: string }[] = [],
) {
  const url = new URL(path, site).href;
  const nodes: Record<string, unknown>[] = [
    {
      "@type": "Article",
      headline,
      description,
      datePublished: published,
      dateModified: modified,
      url,
      mainEntityOfPage: url,
      inLanguage: "en",
      author: { "@type": "Organization", name: "SunsetDiff" },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      citation: citations,
    },
    faqNode(faqs),
  ];
  if (items.length) {
    nodes.push({
      "@type": "ItemList",
      name: headline,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    });
  }
  return nodes;
}

export function collectionGraph(
  site: string,
  page: { path: string; name: string; description: string },
  items: { name: string; path: string }[],
) {
  const url = new URL(page.path, site).href;
  return [
    {
      "@type": "CollectionPage",
      name: page.name,
      description: page.description,
      url,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: page.name,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
  ];
}

export function statusHubGraph(
  site: string,
  page: {
    path: string;
    h1: string;
    description: string;
    version: string;
    items: { name: string; path: string }[];
    faqs: FaqItem[];
  },
) {
  const url = new URL(page.path, site).href;
  const modified = /^\d{4}-\d{2}-\d{2}$/.test(page.version) ? page.version : undefined;
  const nodes: Record<string, unknown>[] = [
    {
      "@type": "CollectionPage",
      name: page.h1,
      description: page.description,
      url,
      ...(modified ? { dateModified: modified } : {}),
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: page.h1,
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
  ];
  if (page.faqs.length) nodes.push(faqNode(page.faqs));
  return nodes;
}

export function shutdownIndexGraph(site: string, items: { name: string; path: string }[]) {
  const url = new URL("/shutdowns/", site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "AI model shutdown batches",
      url,
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
    },
    {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
  ];
}

export function faqPage(items: FaqItem[]) {
  return faqNode(items);
}

export function scheduleGraph(
  site: string,
  page: {
    path: string;
    name: string;
    description: string;
    modified?: string;
    datasetName: string;
    temporalCoverage?: string;
    aboutUrl: string;
  },
  items: { name: string; path: string }[],
  faqs: FaqItem[],
) {
  const url = new URL(page.path, site).href;
  const nodes: Record<string, unknown>[] = [
    {
      "@type": "CollectionPage",
      name: page.name,
      description: page.description,
      url,
      ...(page.modified ? { dateModified: page.modified } : {}),
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: page.name,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    faqNode(faqs),
    {
      "@type": "Dataset",
      name: page.datasetName,
      description: page.description,
      url,
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@type": "Organization", name: "SunsetDiff" },
      ...(page.modified ? { dateModified: page.modified } : {}),
      ...(page.temporalCoverage ? { temporalCoverage: page.temporalCoverage } : {}),
      isBasedOn: new URL(page.aboutUrl, site).href,
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: page.aboutUrl.endsWith(".csv") ? "text/csv" : "application/json",
          contentUrl: new URL(page.aboutUrl, site).href,
        },
      ],
    },
  ];
  return nodes;
}

export function comparisonGraph(
  site: string,
  page: {
    title: string;
    description: string;
    path: string;
    modified: string;
    aboutName: string;
    aboutUrl: string;
    citations: string[];
    faqs: FaqItem[];
  },
) {
  const url = new URL(page.path, site).href;
  return [
    {
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url,
      dateModified: page.modified,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      about: { "@type": "WebSite", name: page.aboutName, url: page.aboutUrl },
      citation: page.citations,
    },
    faqNode(page.faqs),
  ];
}

export function alternativesGraph(site: string, modified: string, items: { name: string; path: string }[], faqs: FaqItem[]) {
  const url = new URL("/alternatives/", site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "Where to track AI model deprecations",
      description: "SunsetDiff compared with other public AI model deprecation trackers, from pages checked on the date shown.",
      url,
      dateModified: modified,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: "AI model deprecation trackers",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    faqNode(faqs),
  ];
}

export function apiDocsGraph(site: string, modified: string, faqs: FaqItem[]) {
  const url = new URL("/api/", site).href;
  const root = siteRoot(site);
  return [
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      name: "SunsetDiff API",
      url,
      dateModified: modified,
      inLanguage: "en",
      isPartOf: { "@id": `${root}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      mainEntity: { "@id": `${url}#api` },
    },
    {
      "@type": "WebAPI",
      "@id": `${url}#api`,
      name: "SunsetDiff static API",
      description: "Free static JSON, CSV, RSS, and iCalendar files of AI model shutdown dates and migration diffs. No API key.",
      documentation: url,
      url: root,
      provider: { "@id": `${root}/#org` },
    },
    ...datasetGraph(site, modified),
    breakingChangesDatasetGraph(site),
    faqNode(faqs),
  ];
}

export function breakingChangesIndexGraph(
  site: string,
  items: { name: string; path: string }[],
  faqs: FaqItem[],
) {
  const url = new URL(BREAKING_CHANGES_PATH, site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "Request breaking changes",
      description:
        "Request settings and endpoints a replacement AI model rejects, plus API-version rules such as Claude API version 2026-10-21. Each rule cites an official page or a public issue.",
      url,
      dateModified: breakingChangesChecked(),
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      mainEntity: { "@id": `${url}#list` },
    },
    {
      "@type": "ItemList",
      "@id": `${url}#list`,
      name: "Request breaking changes",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    breakingChangesDatasetGraph(site),
    faqNode(faqs),
  ];
}

export function requestErrorsIndexGraph(
  site: string,
  items: { name: string; path: string }[],
  faqs: FaqItem[],
) {
  const url = new URL(REQUEST_ERRORS_INDEX, site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "Request errors",
      description: "HTTP errors developers see after an AI model change, each linked to the official source that was checked.",
      url,
      dateModified: requestErrorsIndexChecked(),
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: "Request errors",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    faqNode(faqs),
  ];
}

export function requestErrorGraph(site: string, page: RequestErrorPage) {
  const path = requestErrorPath(page.slug);
  const url = new URL(path, site).href;
  return [
    {
      "@type": "TechArticle",
      headline: page.h1,
      description: `${page.errorText.endsWith(".") ? page.errorText : `${page.errorText}.`} ${page.lead}`,
      dateModified: requestErrorChecked(page),
      url,
      mainEntityOfPage: url,
      inLanguage: "en",
      author: { "@type": "Organization", name: "SunsetDiff" },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      citation: page.citations,
    },
    faqNode(page.faqs),
  ];
}

export function badgesGraph(site: string, items: { name: string; path: string }[], faqs: FaqItem[]) {
  const url = new URL(BADGES_PATH, site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "Status badges",
      description: BADGES_DESCRIPTION,
      url,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: "Status badges",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    faqNode(faqs),
  ];
}

export function guidesIndexGraph(site: string, items: { name: string; path: string }[], faqs: FaqItem[]) {
  const url = new URL(GUIDES_INDEX, site).href;
  return [
    {
      "@type": "CollectionPage",
      name: "Guides",
      description: "Practical guides for AI model aliases, shutdown notices, and the day a model stops.",
      url,
      dateModified: GUIDES_CHECKED,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
    },
    {
      "@type": "ItemList",
      name: "Guides",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: new URL(item.path, site).href,
      })),
    },
    faqNode(faqs),
  ];
}

export function guideGraph(site: string, page: GuidePage) {
  const url = new URL(guidePath(page.slug), site).href;
  const nodes: Record<string, unknown>[] = [
    {
      "@type": "Article",
      headline: page.h1,
      description: page.description,
      datePublished: GUIDES_CHECKED,
      dateModified: GUIDES_CHECKED,
      url,
      mainEntityOfPage: url,
      inLanguage: "en",
      author: { "@type": "Organization", name: "SunsetDiff" },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      citation: page.citations,
    },
  ];
  if (page.steps.length) {
    nodes.push({
      "@type": "HowTo",
      name: page.h1,
      description: plainFaq(page.answer),
      step: page.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    });
  }
  if (page.faqs.length) nodes.push(faqNode(page.faqs));
  return nodes;
}

export function glossaryIndexGraph(site: string, faqs: FaqItem[]) {
  const url = new URL(GLOSSARY_INDEX, site).href;
  return [
    {
      "@type": "DefinedTermSet",
      "@id": `${url}#termset`,
      name: "SunsetDiff glossary",
      description: "Definitions for AI model deprecation words, with how each provider uses them.",
      url,
      dateModified: GLOSSARY_CHECKED,
      inLanguage: "en",
      isPartOf: { "@id": `${siteRoot(site)}/#website` },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      hasDefinedTerm: glossaryTerms.map((term) => definedTermNode(site, term)),
    },
    {
      "@type": "ItemList",
      name: "SunsetDiff glossary",
      numberOfItems: glossaryTerms.length,
      itemListElement: glossaryTerms.map((term, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: term.name,
        url: new URL(glossaryPath(term.slug), site).href,
      })),
    },
    faqNode(faqs),
  ];
}

export function glossaryTermGraph(site: string, term: GlossaryTerm) {
  const url = new URL(glossaryPath(term.slug), site).href;
  return [
    definedTermNode(site, term),
    {
      "@type": "Article",
      headline: term.h1,
      description: term.description,
      datePublished: GLOSSARY_CHECKED,
      dateModified: GLOSSARY_CHECKED,
      url,
      mainEntityOfPage: url,
      mainEntity: { "@id": `${url}#term` },
      inLanguage: "en",
      author: { "@type": "Organization", name: "SunsetDiff" },
      publisher: { "@type": "Organization", name: "SunsetDiff" },
      citation: term.citations,
    },
  ];
}

function definedTermNode(site: string, term: GlossaryTerm) {
  const url = new URL(glossaryPath(term.slug), site).href;
  const node: Record<string, unknown> = {
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: term.name,
    description: term.definition,
    url,
    termCode: term.slug,
    inDefinedTermSet: `${new URL(GLOSSARY_INDEX, site).href}#termset`,
  };
  if (term.alternateNames?.length) node.alternateName = term.alternateNames;
  return node;
}

export function graph(nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
