import { describe, expect, it } from "vitest";
import { loadModels } from "../src/lib/load.ts";
import { lookupDiskPaths, lookupRoundTrip, lookupUrlPath, staticLookupPath } from "../src/lib/lookup-path.ts";
import { openApiDocument } from "../src/lib/openapi.ts";
import { ENDPOINTS } from "../src/lib/endpoints.ts";

describe("lookup URLs", () => {
  it("round-trips every model id, including colons, slashes, and spaces", async () => {
    const models = await loadModels();
    const ids = [...new Set(models.map((model) => model.id))];
    expect(ids.some((id) => id.includes(":"))).toBe(true);
    expect(ids.some((id) => id.includes("/"))).toBe(true);
    expect(ids.some((id) => id.includes(" "))).toBe(true);
    for (const id of ids) {
      expect(lookupRoundTrip(id)).toBe(id);
      const files = lookupDiskPaths(id);
      const encoded = lookupUrlPath(id).slice(1);
      expect(files).toContain(staticLookupPath(encoded, false));
      expect(files).toContain(staticLookupPath(encoded, true));
      expect(files).toContain(`api/v1/lookup/${id}.json`);
      expect(files).toContain(encoded);
    }
    const haiku = "anthropic.claude-3-haiku-20240307-v1:0";
    expect(lookupUrlPath(haiku)).toBe("/api/v1/lookup/anthropic.claude-3-haiku-20240307-v1%3A0.json");
    expect(lookupDiskPaths(haiku)).toEqual([
      "api/v1/lookup/anthropic.claude-3-haiku-20240307-v1%3A0.json",
      "api/v1/lookup/anthropic.claude-3-haiku-20240307-v1:0.json",
    ]);
    const fireworks = ids.find((id) => id.startsWith("accounts/fireworks/models/"));
    expect(fireworks).toBeTruthy();
    expect(lookupDiskPaths(fireworks!)).toContain(`api/v1/lookup/${encodeURIComponent(fireworks!)}.json`);
    expect(lookupDiskPaths(fireworks!)).toContain(`api/v1/lookup/${fireworks}.json`);
  });

  it("documents the encoding on the API notes and in OpenAPI", () => {
    const endpoint = ENDPOINTS.find((item) => item.path === "/api/v1/lookup/<model-id>.json");
    expect(endpoint?.notes.join(" ")).toContain("%3A");
    expect(endpoint?.notes.join(" ")).toContain("anthropic.claude-3-haiku-20240307-v1:0");
    expect(endpoint?.notes.join(" ")).toContain("%2F");
    const spec = openApiDocument("2026-10-29");
    const operation = spec.paths["/api/v1/lookup/{model-id}.json"] as {
      get: { description: string; parameters: { description: string }[] };
    };
    expect(operation.get.description).toContain("%3A");
    expect(operation.get.parameters[0]?.description).toContain("%3A");
    expect(operation.get.parameters[0]?.description).toContain("%2F");
  });
});
