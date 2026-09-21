// src/lib/filler-utils.js

export const FILLER_TYPES = [
  'Manga Canon',
  'Anime Canon',
  'Mixed Canon/Filler',
  'Filler'
];

/**
 * Validate an episode range string (e.g. "1-44, 48-49, 52-53, 62-67, 100, 103-130").
 * Performs light validation:
 * - Allows single episode numbers (e.g. "100")
 * - Allows hyphenated ranges (e.g. "1-44", "1–44")
 * - Separated by commas
 * - Flags errors for non-numeric characters or where start > end
 * 
 * @param {string} str 
 * @returns {{ valid: boolean, error?: string, count: number, normalized: string }}
 */
export function validateEpisodeString(str) {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return { valid: true, count: 0, normalized: '' };
  }

  const parts = str.split(',').map(p => p.trim()).filter(Boolean);
  let totalCount = 0;
  const normalizedParts = [];

  for (const part of parts) {
    // Match range with standard hyphen, en-dash, or em-dash
    const rangeMatch = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start > end) {
        return {
          valid: false,
          error: `Invalid range "${part}": start episode (${start}) cannot be greater than end episode (${end}).`,
          count: 0,
          normalized: ''
        };
      }
      totalCount += (end - start + 1);
      normalizedParts.push(`${start}-${end}`);
      continue;
    }

    // Match single episode number
    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const num = parseInt(singleMatch[1], 10);
      totalCount += 1;
      normalizedParts.push(String(num));
      continue;
    }

    // Malformed token
    return {
      valid: false,
      error: `Invalid episode entry "${part}". Expected numbers or ranges (e.g. "1-24, 50") separated by commas.`,
      count: 0,
      normalized: ''
    };
  }

  return {
    valid: true,
    count: totalCount,
    normalized: normalizedParts.join(', ')
  };
}
