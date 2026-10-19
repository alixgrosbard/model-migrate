import type { MigrationRecord, ModelRecord, Provider } from "./schema.ts";
import { modelFaqs, replaceFaqs, type FaqItem } from "./lib/format.ts";
import { deprecatedFaqs, publicName, questionPath, shutdownFaqs } from "./lib/growth.ts";

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

export function graph(nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
