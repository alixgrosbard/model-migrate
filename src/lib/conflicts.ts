/** Prefix of a note written when two official pages name different shutdown dates. */
export const SOURCES_DISAGREE = "Sources disagree.";

export const CONFLICTS_PATH = "/conflicts/";

export function disagreementNote(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const index = notes.indexOf(SOURCES_DISAGREE);
  if (index < 0) return null;
  return notes.slice(index).trim();
}

export function noteWithoutDisagreement(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const index = notes.indexOf(SOURCES_DISAGREE);
  const kept = (index >= 0 ? notes.slice(0, index) : notes).trim();
  return kept || null;
}
