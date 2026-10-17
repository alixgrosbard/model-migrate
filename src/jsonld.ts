import type { MigrationRecord, ModelRecord, Provider } from "./schema.ts";
import { answerSentence } from "./lib/format.ts";

export function websiteGraph(site: string) {
  return [
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: "SunsetDiff",
      url: site,
      publisher: { "@id": `${site}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${site}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${site}/#org`,
      name: "SunsetDiff",
      url: site,
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

export function modelGraph(site: string, model: ModelRecord, provider: Provider) {
  const path = `/models/${model.provider}/${model.slug}/`;
  const url = new URL(path, site).href;
  const answer = answerSentence(model, provider);
  const replacement = model.replacements[0];
  const checked = model.sources[0]?.last_checked;
  return [
    {
      "@type": "TechArticle",
      headline: `When is ${model.display_name} shut down?`,
      dateModified: checked,
      url,
      citation: model.sources.map((source) => source.url),
      about: {
        "@type": "SoftwareApplication",
        name: model.display_name,
        softwareVersion: model.id,
        provider: { "@type": "Organization", name: provider.name },
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `When is ${model.display_name} shut down?`, acceptedAnswer: { "@type": "Answer", text: answer } },
        {
          "@type": "Question",
          name: `What replaces ${model.display_name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: replacement ? `The official replacement is ${replacement.model_id}.` : "No official replacement is published on that page.",
          },
        },
        {
          "@type": "Question",
          name: `Is ${model.display_name} deprecated?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${model.display_name} status is ${model.status}.`,
          },
        },
      ],
    },
  ];
}

export function migrateGraph(site: string, model: ModelRecord, migration: MigrationRecord | undefined, provider: Provider) {
  const replacement = migration?.to.model_id ?? model.replacements[0]?.model_id;
  const cheaper = priceAnswer(migration, "cheaper");
  const context = contextAnswer(migration);
  const steps = (migration?.migration_checklist ?? ["Read the official deprecation page."]).map((text, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    text,
  }));
  return [
    {
      "@type": "TechArticle",
      headline: `Replacement for ${model.display_name}: what changes when you switch`,
      dateModified: migration?.last_checked ?? model.sources[0]?.last_checked,
      citation: (migration?.sources ?? model.sources).map((source) => source.url),
    },
    { "@type": "HowTo", name: `Switch from ${model.id}`, step: steps },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is the replacement for ${model.display_name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: replacement
              ? `The official replacement for ${model.display_name} is ${replacement}.`
              : `No official replacement is published for ${model.display_name}.`,
          },
        },
        {
          "@type": "Question",
          name: replacement ? `Is ${replacement} cheaper than ${model.id}?` : `Is the replacement cheaper than ${model.id}?`,
          acceptedAnswer: { "@type": "Answer", text: cheaper },
        },
        {
          "@type": "Question",
          name: replacement ? `Does ${replacement} have a bigger context window than ${model.id}?` : `Does the replacement have a bigger context window than ${model.id}?`,
          acceptedAnswer: { "@type": "Answer", text: context },
        },
      ],
    },
  ];
}

export function datasetGraph(site: string, modified: string) {
  return [
    {
      "@type": "Dataset",
      name: "SunsetDiff model retirement dataset",
      description: "Shutdown dates, replacements, and migration diffs for AI models, cited to official provider pages.",
      url: new URL("/data/", site).href,
      license: "https://creativecommons.org/licenses/by/4.0/",
      creator: { "@type": "Organization", name: "SunsetDiff" },
      dateModified: modified,
      temporalCoverage: "2022/..",
      distribution: [
        { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: new URL("/dataset/sunsetdiff.json", site).href },
        { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: new URL("/dataset/sunsetdiff.csv", site).href },
      ],
    },
  ];
}

function priceAnswer(migration: MigrationRecord | undefined, _kind: string): string {
  if (!migration) return "Price comparison is not published yet.";
  const oldCost = migration.price_diff.example_monthly_cost_old;
  const newCost = migration.price_diff.example_monthly_cost_new;
  if (oldCost == null || newCost == null) return "A full price comparison is not published. One or both prices are missing from the official pages we checked.";
  if (newCost < oldCost) return `Yes. The labeled example monthly cost is $${oldCost} for the old model and $${newCost} for the replacement.`;
  if (newCost > oldCost) return `No. The labeled example monthly cost is $${oldCost} for the old model and $${newCost} for the replacement.`;
  return `The labeled example monthly cost is the same: $${oldCost}.`;
}

function contextAnswer(migration: MigrationRecord | undefined): string {
  const oldTokens = migration?.context_diff.old_tokens;
  const newTokens = migration?.context_diff.new_tokens;
  if (oldTokens == null || newTokens == null) return "Context window sizes are not both published on the official pages we checked.";
  if (newTokens > oldTokens) return `Yes. The context window changes from ${oldTokens.toLocaleString("en-US")} to ${newTokens.toLocaleString("en-US")} tokens.`;
  if (newTokens < oldTokens) return `No. The context window changes from ${oldTokens.toLocaleString("en-US")} to ${newTokens.toLocaleString("en-US")} tokens.`;
  return `The context window stays ${oldTokens.toLocaleString("en-US")} tokens.`;
}

export function graph(nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
