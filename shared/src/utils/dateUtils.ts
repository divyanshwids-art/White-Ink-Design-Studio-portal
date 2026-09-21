/**
 * Normalizes a date-only string (e.g. YYYY-MM-DD from <input type="date">)
 * to an ISO string pointing to the END of that calendar day in local time (23:59:59.999).
 * If the string already includes time, it parses it properly.
 */
export function normalizeDateToDayEnd(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    return d.toISOString();
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/**
 * Calculates the effective deadline Date object for comparison.
 * If a stored date is date-only or has 00:00:00 (which happens when UTC midnight was saved),
 * it treats the deadline as expiring at the END of that calendar day (23:59:59.999 local time).
 */
export function getEffectiveDueDate(dueDateStr?: string | null): Date | null {
  if (!dueDateStr) return null;
  const d = new Date(dueDateStr);
  if (isNaN(d.getTime())) return null;

  // If saved as date-only or midnight UTC/local (e.g. T00:00:00.000Z or date-only)
  if (dueDateStr.includes('T00:00:00') || /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr.trim())) {
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }
  return d;
}

/**
 * Returns true only if the task or project is past its effective deadline and not completed.
 */
export function isTaskOrProjectOverdue(dueDateStr?: string | null, status?: string | null): boolean {
  if (!dueDateStr) return false;
  if (status === 'COMPLETED') return false;
  const effectiveDue = getEffectiveDueDate(dueDateStr);
  if (!effectiveDue) return false;
  return effectiveDue.getTime() < Date.now();
}

