import type { LocalDate, LocalTime } from './types';

/*
 * Calendar maths on 'YYYY-MM-DD' strings.
 * Date-only arithmetic is done in UTC so daylight-saving changes can never shift a day.
 * Only localEpoch() touches the device timezone, because reminders need a real instant.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function parts(d: LocalDate): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
}

function fromUTC(dt: Date): LocalDate {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function toUTC(d: LocalDate): Date {
  const [y, m, day] = parts(d);
  return new Date(Date.UTC(y, m - 1, day));
}

export function make(y: number, m: number, day: number): LocalDate {
  return fromUTC(new Date(Date.UTC(y, m - 1, day)));
}

/** Local calendar date of a JS Date / epoch in the device timezone. */
export function toLocalDate(dt: Date | number = new Date()): LocalDate {
  const x = typeof dt === 'number' ? new Date(dt) : dt;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export const todayStr = (now: Date | number = new Date()) => toLocalDate(now);

export function addDays(d: LocalDate, n: number): LocalDate {
  const dt = toUTC(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

/** b − a in whole days */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: LocalDate): number {
  return toUTC(d).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Date in year y / month m (1-12) on `day`, clamped to the month length (31 → 30/29/28). */
export function clampedDate(y: number, m: number, day: number): LocalDate {
  return make(y, m, Math.min(day, daysInMonth(y, m)));
}

export function startOfWeek(d: LocalDate, weekStart: 0 | 1): LocalDate {
  const wd = weekday(d);
  const back = (wd - weekStart + 7) % 7;
  return addDays(d, -back);
}

export function isValidDate(s: unknown): s is LocalDate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function isValidTime(s: unknown): s is LocalTime {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Real instant (epoch ms) for a local date + time in the device timezone. */
export function localEpoch(d: LocalDate, t: LocalTime): number {
  const [y, m, day] = parts(d);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh, mm, 0, 0).getTime();
}

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const weekdayShort = (i: number) => WD_SHORT[i];
export const weekdayLong = (i: number) => WD_LONG[i];
export const monthShort = (m: number) => MON_SHORT[m - 1];

/** "Wednesday, 25 November" */
export function longDate(d: LocalDate): string {
  const [, m, day] = parts(d);
  return `${WD_LONG[weekday(d)]}, ${day} ${MON_LONG[m - 1]}`;
}

/** "25 Nov" (+ year if not the current year) */
export function shortDate(d: LocalDate, today: LocalDate): string {
  const [y, m, day] = parts(d);
  const [ty] = parts(today);
  return `${day} ${MON_SHORT[m - 1]}${y !== ty ? ` ${y}` : ''}`;
}

/** Friendly relative label: Today, Tomorrow, Yesterday, Fri, 3 Dec */
export function relativeDay(d: LocalDate, today: LocalDate): string {
  const diff = diffDays(today, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WD_LONG[weekday(d)];
  return `${WD_SHORT[weekday(d)]} ${shortDate(d, today)}`;
}

/** '17:30' → '5:30 PM' */
export function formatTime(t: LocalTime): string {
  const [hh, mm] = t.split(':').map(Number);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${pad(mm)} ${hh < 12 ? 'AM' : 'PM'}`;
}

export function nowTime(now = new Date()): LocalTime {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
