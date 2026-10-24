import { ENDPOINTS, type EndpointDoc } from "./endpoints.ts";

export const OPENAPI_PATH = "/openapi.json";
export const OPENAPI_SERVER = "https://sunsetdiff.com";

const ARRAY_PATHS = new Set([
  "/api/v1/providers.json",
  "/api/v1/models.json",
  "/api/v1/upcoming.json",
  "/api/v1/changes.json",
  "/search-index.json",
]);

const ONE_OF_PATHS = new Set(["/api/v1/lookup/<model-id>.json"]);

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    summary: string;
    description: string;
    license: { name: string; url: string };
  };
  servers: { url: string; description: string }[];
  security: [];
  externalDocs: { description: string; url: string };
  paths: Record<string, unknown>;
}

/** OpenAPI 3.1 description of the static files documented on /api/. No auth. */
export function openApiDocument(version: string): OpenApiDocument {
  const datasetVersion = version.trim();
  const paths: Record<string, unknown> = {};
  for (const endpoint of ENDPOINTS) {
    const openPath = openApiPath(endpoint.path);
    if (paths[openPath]) throw new Error(`Duplicate OpenAPI path ${openPath}`);
    paths[openPath] = {
      get: {
        operationId: operationId(endpoint.path),
        summary: endpoint.title,
        description: operationDescription(endpoint),
        security: [],
        parameters: pathParameters(endpoint.path),
        responses: {
          "200": {
            description: endpoint.summary,
            content: {
              [endpoint.format]: {
                schema: responseSchema(endpoint),
              },
            },
          },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "SunsetDiff API",
      version: datasetVersion || "v1",
      summary: "Free static JSON, CSV, ICS, and RSS files of AI model shutdown dates. No API key.",
      description: [
        "These are the static files documented at https://sunsetdiff.com/api/.",
        "They need no API key and no account.",
        "JSON and CSV dataset files are CC BY 4.0. Credit SunsetDiff and link the license.",
        "A null or blank field was not on the official page.",
        datasetVersion ? `Dataset version ${datasetVersion}. That date is the newest changelog date.` : "",
        "The API index version string is v1.",
      ].filter(Boolean).join(" "),
      license: {
        name: "CC BY 4.0",
        url: "https://creativecommons.org/licenses/by/4.0/",
      },
    },
    servers: [{ url: OPENAPI_SERVER, description: "SunsetDiff" }],
    security: [],
    externalDocs: { description: "Human-readable field list", url: `${OPENAPI_SERVER}/api/` },
    paths,
  };
}

export function openApiPath(path: string): string {
  return path.replace(/<([^>]+)>/g, "{$1}");
}

function operationId(path: string): string {
  return `get_${path.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

function operationDescription(endpoint: EndpointDoc): string {
  const fields = endpoint.fields.map((field) => `- ${field.name}: ${field.detail}`).join("\n");
  return [endpoint.summary, ...endpoint.notes, fields ? `Fields:\n${fields}` : ""].filter(Boolean).join("\n\n");
}

function pathParameters(path: string): { name: string; in: "path"; required: true; description: string; schema: { type: "string" } }[] {
  return [...path.matchAll(/<([^>]+)>/g)].map((match) => ({
    name: match[1],
    in: "path" as const,
    required: true as const,
    description: parameterDescription(match[1]),
    schema: { type: "string" as const },
  }));
}

function parameterDescription(name: string): string {
  if (name === "provider" || name === "from-provider" || name === "to-provider") {
    return "Provider id. The ids are listed in /api/v1/providers.json.";
  }
  if (name === "slug" || name === "from-slug" || name === "to-slug") return "Model URL slug.";
  if (name === "model-id") return "Model id. Characters that are not safe in a URL are percent-encoded in the filename.";
  return name;
}

function responseSchema(endpoint: EndpointDoc): Record<string, unknown> {
  if (endpoint.body !== "json") return { type: "string" };
  if (ONE_OF_PATHS.has(endpoint.path)) {
    return {
      oneOf: [
        {
          type: "object",
          additionalProperties: true,
          description: "One model record when a single provider uses this id.",
        },
        {
          type: "array",
          items: { type: "object", additionalProperties: true },
          description: "One model record per provider when several providers use this id.",
        },
      ],
    };
  }
  if (ARRAY_PATHS.has(endpoint.path)) {
    return {
      type: "array",
      items: { type: "object", additionalProperties: true, description: fieldSummary(endpoint) },
    };
  }
  return { type: "object", additionalProperties: true, description: fieldSummary(endpoint) };
}

function fieldSummary(endpoint: EndpointDoc): string {
  return endpoint.fields.map((field) => `${field.name}: ${field.detail}`).join(" ");
}
