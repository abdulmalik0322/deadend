/**
 * Minimal text sanitizer.
 * stripHtml(value): coerces to string, removes HTML tags, collapses
 * whitespace and trims. Non-string inputs become their String() form
 * (empty for null/undefined).
 */

/**
 * Remove HTML tags from a value.
 * @param {*} value
 * @returns {string} the sanitized string
 */
export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
