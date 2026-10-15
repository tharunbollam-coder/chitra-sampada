// src/lib/slug-validator.js
// Standardized slug & internal ID validation and sanitization.

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Trims leading/trailing whitespace and converts value to lowercase.
 * Does NOT silently alter or delete intermediate characters.
 * @param {string|null|undefined} val
 * @returns {string}
 */
export function cleanSlug(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Check if the given value (after trimming & lowercasing) matches the slug/ID rules:
 * - Lowercase alphanumeric characters and single hyphens only
 * - No spaces, underscores, or special characters
 * - No double hyphens
 * - No hyphen at the start or end
 * @param {string|null|undefined} val
 * @returns {boolean}
 */
export function isValidSlug(val) {
  const cleaned = cleanSlug(val);
  if (!cleaned) return false;
  return SLUG_REGEX.test(cleaned);
}

/**
 * Returns a human-friendly validation error message, or null if valid.
 * @param {string|null|undefined} val
 * @param {string} [fieldLabel='Value']
 * @returns {string|null}
 */
export function getSlugValidationError(val, fieldLabel = 'Value') {
  const raw = String(val ?? '');
  const cleaned = cleanSlug(raw);

  if (!cleaned) {
    return `${fieldLabel} is required.`;
  }

  if (cleaned.startsWith('-') || cleaned.endsWith('-')) {
    return `${fieldLabel} cannot start or end with a hyphen.`;
  }

  if (cleaned.includes('--')) {
    return `${fieldLabel} cannot contain consecutive hyphens.`;
  }

  if (/[^a-z0-9-]/.test(cleaned)) {
    return `${fieldLabel} can only contain lowercase letters, numbers, and single hyphens (no spaces or special characters).`;
  }

  if (!SLUG_REGEX.test(cleaned)) {
    return `${fieldLabel} must only contain lowercase letters, numbers, and single hyphens.`;
  }

  return null;
}
