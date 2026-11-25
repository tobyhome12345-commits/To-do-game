import type { LocalDate, Repeat } from './types';
import { addDays, clampedDate, diffDays, parts, startOfWeek, weekday, weekdayShort } from './dates';

/*
 * Repeating tasks: there is ONE live task per series. When it's completed, a history copy is saved and the
 * live task's due date moves to nextOccurrence(). Everything here is pure and timezone-free.
 */

/** One step forward from `from` according to the rule. */
export function stepOnce(r: Repeat, from: LocalDate, weekStart: 0 | 1 = 1): LocalDate {
  const n = Math.max(1, Math.floor(r.interval) || 1);
  switch (r.freq) {
    case 'daily':
      return addDays(from, n);

    case 'weekly': {
      const days = r.basis === 'due' && r.weekdays && r.weekdays.length ? r.weekdays : null;
      if (!days) return addDays(from, 7 * n);
      const anchorWeek = startOfWeek(r.anchor, weekStart);
      let d = addDays(from, 1);
      // Worst case: N weeks of skipped weeks plus one full week to find a matching weekday.
      for (let i = 0; i < 7 * (n + 1) + 7; i++) {
        if (days.includes(weekday(d))) {
          const weeks = Math.floor(diffDays(anchorWeek, startOfWeek(d, weekStart)) / 7);
          if (((weeks % n) + n) % n === 0) return d;
        }
        d = addDays(d, 1);
      }
      return addDays(from, 7 * n); // unreachable in practice
    }

    case 'monthly': {
      const [y, m, d] = parts(from);
      const day = r.basis === 'due' ? parts(r.anchor)[2] : d;
      const total = y * 12 + (m - 1) + n;
      return clampedDate(Math.floor(total / 12), (total % 12) + 1, day);
    }

    case 'yearly': {
      const [y, m, d] = parts(from);
      const [, am, ad] = r.basis === 'due' ? parts(r.anchor) : [y, m, d];
      return clampedDate(y + n, am, ad);
    }
  }
}

/**
 * The next due date after completing an occurrence, or null if the series has ended.
 * @param dueDate     the occurrence's due date
 * @param completedOn the local date it was completed
 * @param today       the local date right now (usually == completedOn)
 */
export function nextOccurrence(
  r: Repeat,
  dueDate: LocalDate | null,
  completedOn: LocalDate,
  today: LocalDate,
  weekStart: 0 | 1 = 1,
): LocalDate | null {
  const base = r.basis === 'completion' || !dueDate ? completedOn : dueDate;
  let next = stepOnce(r, base, weekStart);
  if (r.basis === 'due') {
    // Catch up: finishing an overdue task shouldn't leave a trail of overdue copies.
    let guard = 0;
    while (next < today && guard++ < 5000) next = stepOnce(r, next, weekStart);
  }
  if (r.until && next > r.until) return null;
  return next;
}

/** Upcoming occurrence dates for previews ("Next: Mon 1 Dec, Wed 3 Dec…"). */
export function previewOccurrences(r: Repeat, start: LocalDate, count: number, weekStart: 0 | 1 = 1): LocalDate[] {
  const out: LocalDate[] = [];
  let d = start;
  for (let i = 0; i < count; i++) {
    d = stepOnce({ ...r, basis: 'due' }, d, weekStart);
    if (r.until && d > r.until) break;
    out.push(d);
  }
  return out;
}

export type RepeatPreset = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export function makePreset(p: Exclude<RepeatPreset, 'none' | 'custom'>, anchor: LocalDate): Repeat {
  switch (p) {
    case 'daily':
      return { freq: 'daily', interval: 1, basis: 'due', anchor };
    case 'weekdays':
      return { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5], basis: 'due', anchor };
    case 'weekly':
      return { freq: 'weekly', interval: 1, weekdays: [weekday(anchor)], basis: 'due', anchor };
    case 'monthly':
      return { freq: 'monthly', interval: 1, basis: 'due', anchor };
    case 'yearly':
      return { freq: 'yearly', interval: 1, basis: 'due', anchor };
  }
}

export function presetOf(r: Repeat | null): RepeatPreset {
  if (!r) return 'none';
  if (r.interval !== 1 || r.basis !== 'due' || r.until) return 'custom';
  if (r.freq === 'daily') return 'daily';
  if (r.freq === 'monthly') return 'monthly';
  if (r.freq === 'yearly') return 'yearly';
  const wd = [...(r.weekdays ?? [])].sort().join(',');
  if (wd === '1,2,3,4,5') return 'weekdays';
  if ((r.weekdays?.length ?? 0) <= 1) return 'weekly';
  return 'custom';
}

const UNIT: Record<Repeat['freq'], [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  yearly: ['year', 'years'],
};

/** Human description: "Every 2 weeks on Mon, Wed", "Weekdays", "Daily". */
export function describeRepeat(r: Repeat, weekStart: 0 | 1 = 1): string {
  const p = presetOf(r);
  if (p === 'daily') return 'Daily';
  if (p === 'weekdays') return 'Weekdays';
  if (p === 'monthly') return 'Monthly';
  if (p === 'yearly') return 'Yearly';
  let s: string;
  if (r.interval === 1) s = r.freq === 'daily' ? 'Daily' : r.freq === 'weekly' ? 'Weekly' : r.freq === 'monthly' ? 'Monthly' : 'Yearly';
  else s = `Every ${r.interval} ${UNIT[r.freq][1]}`;
  if (r.freq === 'weekly' && r.basis === 'due' && r.weekdays?.length) {
    const order = (d: number) => (d - weekStart + 7) % 7;
    const days = [...r.weekdays].sort((a, b) => order(a) - order(b)).map(weekdayShort);
    s += ` on ${days.join(', ')}`;
  }
  if (r.basis === 'completion') s += ' after done';
  if (r.until) s += ` until ${r.until}`;
  return s;
}
