/**
 * Serbian monthly tax payment deadline: 15th of the month.
 * If 15th is Saturday, Sunday, or a national holiday, deadline moves to next business day.
 */

/** Orthodox Easter (Sunday) for given year - common dates 2024-2030 */
const ORTHODOX_EASTER: Record<number, string> = {
  2024: '2024-05-05',
  2025: '2025-04-20',
  2026: '2026-04-12',
  2027: '2027-05-02',
  2028: '2028-04-16',
  2029: '2029-04-08',
  2030: '2030-04-28',
};

function getOrthodoxEaster(year: number): Date | null {
  const s = ORTHODOX_EASTER[year];
  if (!s) return null;
  return new Date(s + 'T12:00:00');
}

/** Returns YYYY-MM-DD for easy comparison */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Check if date is a non-working day in Serbia (weekend or public holiday) */
export function isNonWorkingDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return true; // Sunday, Saturday

  const y = d.getFullYear();
  const m = d.getMonth();
  const dayOfMonth = d.getDate();
  const key = dateKey(d);

  const fixed: string[] = [
    `${y}-01-01`, `${y}-01-02`,
    `${y}-01-07`,
    `${y}-01-27`,
    `${y}-02-15`, `${y}-02-16`, `${y}-02-17`,
    `${y}-05-01`, `${y}-05-02`,
    `${y}-05-09`,
    `${y}-11-11`,
  ];

  if (fixed.includes(key)) return true;

  const easter = getOrthodoxEaster(y);
  if (easter) {
    const easterKey = dateKey(easter);
    const goodFriday = new Date(easter);
    goodFriday.setDate(goodFriday.getDate() - 2);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);
    if (key === easterKey || key === dateKey(goodFriday) || key === dateKey(easterMonday)) return true;
  }

  return false;
}

/**
 * Get the legal payment deadline for monthly taxes for a given month.
 * Default: 15th; if non-working, next working day.
 */
export function getTaxDeadlineForMonth(year: number, month: number): Date {
  const d = new Date(year, month, 15);
  d.setHours(0, 0, 0, 0);
  while (isNonWorkingDay(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Get next upcoming tax deadline from today (for current or next month).
 */
export function getNextTaxDeadline(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const current = getTaxDeadlineForMonth(now.getFullYear(), now.getMonth());
  if (current >= now) return current;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return getTaxDeadlineForMonth(nextMonth.getFullYear(), nextMonth.getMonth());
}

/**
 * Days until next tax deadline (can be negative if past).
 */
export function daysUntilTaxDeadline(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = getNextTaxDeadline();
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Is the current date past the payment deadline for this month?
 * (Used to show "payment is late" and penalty.)
 */
export function isPastDeadlineForCurrentMonth(): boolean {
  const now = new Date();
  const deadline = getTaxDeadlineForMonth(now.getFullYear(), now.getMonth());
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return now > deadline;
}

/**
 * Number of days late for current month's payment (0 if not late).
 */
export function daysLateForCurrentMonth(): number {
  if (!isPastDeadlineForCurrentMonth()) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = getTaxDeadlineForMonth(now.getFullYear(), now.getMonth());
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
}

/** Daily interest rate for late payment (0.0322% = 0.000322) */
export const LATE_PENALTY_RATE_DAILY = 0.000322;

/**
 * Calculate penalty amount for base amount and number of days late.
 * penalty = base * (1 + rate * days) - base = base * rate * days
 */
export function latePenaltyAmount(baseRsd: number, daysLate: number): number {
  if (daysLate <= 0) return 0;
  return Math.round(baseRsd * LATE_PENALTY_RATE_DAILY * daysLate);
}
