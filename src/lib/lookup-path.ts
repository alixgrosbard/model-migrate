/**
 * /api/v1/lookup/<model-id>.json
 *
 * The model id is one path segment. Percent-encode it with encodeURIComponent:
 * a colon is %3A, a slash is %2F, a space is %20, ( is %28, and ) is %29.
 * A colon or a slash may also be sent raw.
 *
 * A static host decodes percent-escapes before it opens a file. Some hosts
 * leave %2F encoded so a slash cannot change directories. lookupDiskPaths
 * writes every mix of those decodes, so both forms resolve.
 */

export function lookupUrlPath(id: string): string {
  return `/api/v1/lookup/${encodeURIComponent(id)}.json`;
}

export function lookupRoundTrip(id: string): string {
  return decodeURIComponent(encodeURIComponent(id));
}

/** Paths relative to the site root, with no leading slash. */
export function lookupDiskPaths(id: string): string[] {
  const encoded = encodeURIComponent(id);
  const tokens = [...new Set(encoded.match(/%[0-9A-F]{2}/g) ?? [])];
  const paths = new Set<string>();
  const masks = 1 << tokens.length;
  for (let mask = 0; mask < masks; mask += 1) {
    let name = encoded;
    tokens.forEach((token, index) => {
      if ((mask & (1 << index)) !== 0) name = name.split(token).join(decodeURIComponent(token));
    });
    paths.add(`api/v1/lookup/${name}.json`);
  }
  return [...paths].sort();
}

/**
 * File a static host opens for this request path.
 * decodeSlash is false when the host leaves %2F encoded.
 */
export function staticLookupPath(requestPath: string, decodeSlash: boolean): string {
  let rel = requestPath.replace(/^\//, "");
  if (!decodeSlash) {
    rel = rel.replace(/%2F/gi, "\u0000");
    rel = decodeURIComponent(rel).replaceAll("\u0000", "%2F");
  } else {
    rel = decodeURIComponent(rel);
  }
  return rel;
}
