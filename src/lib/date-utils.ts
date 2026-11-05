// src/lib/date-utils.ts
/**
 * Lightweight, zero-dependency date utilities for Chitra Sampada.
 */

/**
 * Checks if a given creation timestamp is within the last `days` (default 7 days).
 *
 * @param createdAt - Date string, number, or Date object
 * @param days - Number of days threshold (default 7)
 * @returns boolean
 */
export function isRecentlyAdded(
  createdAt: string | number | Date | null | undefined,
  days: number = 7
): boolean {
  if (!createdAt) return false;
  // Handle SQLite format 'YYYY-MM-DD HH:MM:SS'
  const normalized = typeof createdAt === 'string' && createdAt.includes(' ') && !createdAt.includes('T')
    ? createdAt.replace(' ', 'T') + 'Z'
    : createdAt;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return false;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

/**
 * Formats a date string or timestamp into a smart hybrid updated string:
 * - Within 30 days: 'Updated today', 'Updated yesterday', or 'Updated Xd ago'
 * - Older than 30 days: 'Updated MMM D, YYYY' (e.g. 'Updated Nov 5, 2026')
 *
 * @param dateInput - Date string, number, or Date object
 * @param referenceDate - Optional reference Date (defaults to now)
 * @returns Formatted string or null if invalid date
 */
export function formatSmartUpdatedDate(
  dateInput: string | number | Date | null | undefined,
  referenceDate: Date = new Date()
): string | null {
  if (!dateInput) return null;

  const normalized = typeof dateInput === 'string' && dateInput.includes(' ') && !dateInput.includes('T')
    ? dateInput.replace(' ', 'T') + 'Z'
    : dateInput;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return null;

  // Calendar day difference
  const nowDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((nowDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 30) return `Updated ${diffDays}d ago`;

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `Updated ${formatted}`;
}
