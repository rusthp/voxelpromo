/**
 * Escapes special regex characters to prevent ReDoS attacks.
 * Use this before passing any user input to MongoDB $regex queries.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes a search string: trims, limits length, and escapes regex chars.
 */
export function sanitizeSearchTerm(str: string, maxLength = 100): string {
  return escapeRegex(str.trim().slice(0, maxLength));
}
