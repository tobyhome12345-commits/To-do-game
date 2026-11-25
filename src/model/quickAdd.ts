import type { ID, List, LocalDate, LocalTime, Priority, Repeat } from './types';
import { addDays, clampedDate, parts, relativeDay, formatTime, weekday } from './dates';
import { describeRepeat } from './recurrence';

/*
 * Quick-add parser. Understands, anywhere in the text:
 *   dates     today · tod · tonight · tomorrow · tmr · mon…sunday · next fri · next week · in 3 days · 25 dec · dec 25
 *   times     5pm · 5:30pm · 17:00 · at 5 · noon
 *   priority  !high !med !low · !!! !! !
 *   list      #School (prefix match on list names, spaces ignored)
 *   repeat    daily · weekly · monthly · yearly · every day/weekday/week/month/year · every mon · every 2 weeks · every other day
 * Recognised words are removed from the title and shown as chips.
 */

export interface QuickChip {
  kind: 'date' | 'time' | 'priority' | 'list' | 'repeat';
  label: string;
}

export interface QuickAddResult {
  title: string;
  dueDate?: LocalDate;
  dueTime?: LocalTime;
  priority?: Priority;
  listId?: ID;
  repeat?: Repeat;
  chips: QuickChip[];
}

interface Ctx {
  today: LocalDate;
  lists: List[];
  weekStart: 0 | 1;
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};
const UNITS: Record<string, Repeat['freq']> = {
  day: 'daily', days: 'daily', week: 'weekly', weeks: 'weekly', month: 'monthly', months: 'monthly', year: 'yearly', years: 'yearly',
};

const pad = (n: number) => String(n).padStart(2, '0');

function nextWeekday(today: LocalDate, wd: number, strict: boolean): LocalDate {
  let diff = (wd - weekday(today) + 7) % 7;
  if (diff === 0 && strict) diff = 7;
  return addDays(today, diff);
}

function parseTime(word: string, next?: string): { time: LocalTime; used: number } | null {
  if (word === 'noon') return { time: '12:00', used: 1 };
  let m = /^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)$/.exec(word);
  let used = 1;
  if (!m && next && /^(am|pm)$/.test(next)) {
    m = /^(\d{1,2})(?::(\d{2}))?$/.exec(word) as RegExpExecArray | null;
    if (m) {
      m = [m[0], m[1], m[2], next] as unknown as RegExpExecArray;
      used = 2;
    }
  }
  if (m) {
    let h = +m[1];
    const min = m[2] ? +m[2] : 0;
    if (h < 1 || h > 12 || min > 59) return null;
    const pm = m[3].startsWith('p');
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    return { time: `${pad(h)}:${pad(min)}`, used };
  }
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(word);
  if (m24 && +m24[1] < 24 && +m24[2] < 60) return { time: `${pad(+m24[1])}:${m24[2]}`, used: 1 };
  return null;
}

export function parseQuickAdd(input: string, ctx: Ctx): QuickAddResult {
  const { today } = ctx;
  const raw = input.trim().split(/\s+/).filter(Boolean);
  const low = raw.map((w) => w.toLowerCase().replace(/[,.;]$/, ''));
  const keep: boolean[] = raw.map(() => true);
  const r: QuickAddResult = { title: '', chips: [] };
  let repeatWeekdays: number[] | null = null;

  const take = (i: number, n: number) => {
    for (let k = i; k < i + n; k++) keep[k] = false;
  };

  for (let i = 0; i < raw.length; i++) {
    if (!keep[i]) continue;
    const w = low[i];
    const n1 = low[i + 1];
    const n2 = low[i + 2];

    // ---- priority ----
    if (r.priority == null) {
      const pr: Record<string, Priority> = { '!!!': 3, '!high': 3, '!h': 3, '!!': 2, '!med': 2, '!medium': 2, '!m': 2, '!': 1, '!low': 1, '!l': 1 };
      if (w in pr) {
        r.priority = pr[w];
        take(i, 1);
        continue;
      }
    }

    // ---- list ----
    if (r.listId == null && w.startsWith('#') && w.length > 1) {
      const q = w.slice(1).replace(/[^\p{L}\p{N}]/gu, '');
      const key = (l: List) => l.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const hit = ctx.lists.find((l) => key(l) === q) ?? ctx.lists.find((l) => key(l).startsWith(q));
      if (hit) {
        r.listId = hit.id;
        take(i, 1);
        continue;
      }
    }

    // ---- repeat ----
    if (r.repeat == null) {
      const simple: Record<string, Repeat['freq']> = { daily: 'daily', everyday: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly', annually: 'yearly' };
      if (w in simple) {
        r.repeat = { freq: simple[w], interval: 1, basis: 'due', anchor: today };
        take(i, 1);
        continue;
      }
      if (w === 'every' && n1) {
        if (n1 === 'weekday' || n1 === 'weekdays') {
          repeatWeekdays = [1, 2, 3, 4, 5];
          r.repeat = { freq: 'weekly', interval: 1, weekdays: repeatWeekdays, basis: 'due', anchor: today };
          take(i, 2);
          continue;
        }
        if (n1 in UNITS) {
          r.repeat = { freq: UNITS[n1], interval: 1, basis: 'due', anchor: today };
          take(i, 2);
          continue;
        }
        if (n1 in WEEKDAYS) {
          repeatWeekdays = [WEEKDAYS[n1]];
          r.repeat = { freq: 'weekly', interval: 1, weekdays: repeatWeekdays, basis: 'due', anchor: today };
          take(i, 2);
          continue;
        }
        const num = n1 === 'other' ? 2 : /^\d+$/.test(n1) ? +n1 : 0;
        if (num >= 1 && n2 && n2 in UNITS) {
          r.repeat = { freq: UNITS[n2], interval: num, basis: 'due', anchor: today };
          take(i, 3);
          continue;
        }
      }
    }

    // ---- date ----
    if (r.dueDate == null) {
      let d: LocalDate | null = null;
      let used = 1;
      if (w === 'today' || w === 'tod') d = today;
      else if (w === 'tonight') {
        d = today;
        if (r.dueTime == null) r.dueTime = '20:00';
      } else if (w === 'tomorrow' || w === 'tmr' || w === 'tmrw' || w === 'tomorow') d = addDays(today, 1);
      else if (w in WEEKDAYS) d = nextWeekday(today, WEEKDAYS[w], false);
      else if (w === 'next' && n1 && n1 in WEEKDAYS) {
        d = nextWeekday(today, WEEKDAYS[n1], true);
        used = 2;
      } else if (w === 'next' && n1 === 'week') {
        d = nextWeekday(today, ctx.weekStart, true);
        used = 2;
      } else if (w === 'in' && n1 && n2 && (/^\d+$/.test(n1) || n1 === 'a') && /^(day|days|week|weeks)$/.test(n2)) {
        const num = n1 === 'a' ? 1 : +n1;
        d = addDays(today, n2.startsWith('week') ? num * 7 : num);
        used = 3;
      } else if (n1 && (w in MONTHS || n1 in MONTHS)) {
        const [mw, dw] = w in MONTHS ? [w, n1] : [n1, w];
        const dm = /^(\d{1,2})(st|nd|rd|th)?$/.exec(dw);
        if (dm && +dm[1] >= 1 && +dm[1] <= 31) {
          const [ty] = parts(today);
          let cand = clampedDate(ty, MONTHS[mw], +dm[1]);
          if (cand < today) cand = clampedDate(ty + 1, MONTHS[mw], +dm[1]);
          d = cand;
          used = 2;
        }
      }
      if (d) {
        r.dueDate = d;
        take(i, used);
        continue;
      }
    }

    // ---- time ----
    if (r.dueTime == null) {
      if (w === 'at' && n1) {
        const t = parseTime(n1, low[i + 2]) ?? (/^\d{1,2}$/.test(n1) && +n1 >= 1 && +n1 <= 23 ? { time: guessHour(+n1), used: 1 } : null);
        if (t) {
          r.dueTime = t.time;
          take(i, 1 + t.used);
          continue;
        }
      }
      const t = parseTime(w, n1);
      if (t) {
        r.dueTime = t.time;
        take(i, t.used);
        continue;
      }
    }
  }

  // A repeat or time without a date starts today (or on the chosen weekday).
  if (r.repeat && !r.dueDate) {
    r.dueDate = repeatWeekdays && repeatWeekdays.length === 1 ? nextWeekday(today, repeatWeekdays[0], false) : today;
  }
  if (r.dueTime && !r.dueDate) r.dueDate = today;
  if (r.repeat && r.dueDate) r.repeat.anchor = r.dueDate;

  r.title = raw.filter((_, i) => keep[i]).join(' ').trim() || input.trim();

  if (r.dueDate) r.chips.push({ kind: 'date', label: relativeDay(r.dueDate, today) });
  if (r.dueTime) r.chips.push({ kind: 'time', label: formatTime(r.dueTime) });
  if (r.repeat) r.chips.push({ kind: 'repeat', label: describeRepeat(r.repeat, ctx.weekStart) });
  if (r.priority) r.chips.push({ kind: 'priority', label: ['', 'Low', 'Medium', 'High'][r.priority] + ' priority' });
  if (r.listId) {
    const l = ctx.lists.find((x) => x.id === r.listId)!;
    r.chips.push({ kind: 'list', label: `${l.emoji ? l.emoji + ' ' : ''}${l.name}` });
  }
  return r;
}

/** "at 5" → 17:00 (afternoon guess for 1–7), "at 9" → 09:00, "at 14" → 14:00 */
function guessHour(h: number): LocalTime {
  if (h >= 13) return `${pad(h)}:00`;
  if (h >= 1 && h <= 7) return `${pad(h + 12)}:00`;
  return `${pad(h)}:00`;
}

