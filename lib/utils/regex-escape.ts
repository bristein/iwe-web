/**
 * Escapes special regex characters to prevent regex injection attacks
 * @param str The string to escape
 * @returns The escaped string safe for use in regex patterns
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a safe regex pattern for case-insensitive search
 * @param query The search query
 * @returns A safe regex pattern
 */
export function createSafeSearchRegex(query: string): RegExp {
  const escaped = escapeRegex(query);
  return new RegExp(escaped, 'i');
}

/**
 * Creates a MongoDB regex query object with escaped input
 * @param query The search query
 * @returns A MongoDB regex query object
 */
export function createMongoRegexQuery(query: string): { $regex: string; $options: string } {
  return {
    $regex: escapeRegex(query),
    $options: 'i',
  };
}
