import type { AppData, ID, List, Priority, Repeat, Settings, Subtask, Task } from './types';
import { CURRENT_SCHEMA, INBOX_ID, defaultFilters, defaultSettings } from './types';
import { addDays, isValidDate, isValidTime, todayStr } from './dates';

export function uid(): ID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultLists(now = Date.now()): List[] {
  return [
    { id: INBOX_ID, name: 'Inbox', color: '#6c5ce7', emoji: '📥', order: 0, createdAt: now },
    { id: uid(), name: 'Home', color: '#f59e0b', emoji: '🏠', order: 1, createdAt: now },
    { id: uid(), name: 'School', color: '#3b82f6', emoji: '🎒', order: 2, createdAt: now },
    { id: uid(), name: 'Personal', color: '#10b981', emoji: '🌱', order: 3, createdAt: now },
  ];
}

export function blankTask(p: Partial<Task> & { notifId: number }, now = Date.now()): Task {
  return {
    id: uid(),
    listId: INBOX_ID,
    title: '',
    notes: '',
    priority: 0,
    dueDate: null,
    dueTime: null,
    reminder: null,
    snoozedUntil: null,
    repeat: null,
    subtasks: [],
    completedAt: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
    ...(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<Task>),
    notifId: p.notifId,
  };
}

/** Fresh install: starter lists plus a few friendly tasks that teach the app. */
export function defaultData(now = Date.now()): AppData {
  const today = todayStr(now);
  const lists = defaultLists(now);
  let n = 1;
  const t = (p: Partial<Task>, i: number) => blankTask({ ...p, notifId: n++, order: i }, now);
  const tasks: Task[] = [
    t({ emoji: '👋', title: 'Welcome to Doable! Tap the circle to tick me off', dueDate: today }, 0),
    t({ emoji: '⚡', title: 'Try quick-add: "Read 20 pages tomorrow 7pm !high #School"', dueDate: today }, 1),
    t(
      {
        emoji: '✨',
        title: 'Tap a task to open it',
        notes: 'Add notes, a checklist, reminders, a repeat, a priority and an emoji.',
        dueDate: today,
        subtasks: [
          { id: uid(), title: 'Add a subtask', done: true },
          { id: uid(), title: 'Set a reminder', done: false },
          { id: uid(), title: 'Make it repeat', done: false },
        ],
      },
      2,
    ),
    t({ emoji: '🎨', title: 'Pick your accent colour in Settings', dueDate: addDays(today, 1), listId: lists[3].id }, 3),
  ];
  return {
    schemaVersion: CURRENT_SCHEMA,
    lists,
    tasks,
    settings: defaultSettings(),
    meta: { nextNotifId: n, createdAt: now },
  };
}

/* ---------------- validation / migration ---------------- */

const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown, d = '') => (typeof x === 'string' ? x : d);
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const hex = (x: unknown, d: string) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x.toLowerCase() : d);

function cleanRepeat(x: unknown, due: string | null): Repeat | null {
  if (!isObj(x)) return null;
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(x.freq)) return null;
  const anchor = isValidDate(x.anchor) ? x.anchor : due ?? todayStr();
  const r: Repeat = {
    freq: x.freq,
    interval: Math.max(1, Math.min(999, Math.floor(num(x.interval, 1)))),
    basis: x.basis === 'completion' ? 'completion' : 'due',
    anchor,
  };
  if (Array.isArray(x.weekdays)) {
    const wd = [...new Set(x.weekdays.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))] as number[];
    if (wd.length) r.weekdays = wd.sort();
  }
  if (isValidDate(x.until)) r.until = x.until;
  return r;
}

function cleanTask(x: unknown, listIds: Set<ID>): Task | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null;
  const dueDate = isValidDate(x.dueDate) ? x.dueDate : null;
  const subtasks: Subtask[] = Array.isArray(x.subtasks)
    ? x.subtasks.filter(isObj).map((s) => ({ id: str(s.id) || uid(), title: str(s.title), done: !!s.done }))
    : [];
  const now = Date.now();
  return {
    id: x.id,
    listId: typeof x.listId === 'string' && listIds.has(x.listId) ? x.listId : INBOX_ID,
    title: str(x.title).slice(0, 500),
    notes: str(x.notes).slice(0, 20000),
    emoji: typeof x.emoji === 'string' && x.emoji ? x.emoji.slice(0, 16) : undefined,
    priority: ([0, 1, 2, 3].includes(x.priority) ? x.priority : 0) as Priority,
    dueDate,
    dueTime: dueDate && isValidTime(x.dueTime) ? x.dueTime : null,
    reminder: typeof x.reminder === 'number' && x.reminder >= 0 ? x.reminder : null,
    snoozedUntil: typeof x.snoozedUntil === 'number' ? x.snoozedUntil : null,
    repeat: dueDate ? cleanRepeat(x.repeat, dueDate) : null,
    subtasks,
    completedAt: typeof x.completedAt === 'number' ? x.completedAt : null,
    seriesId: typeof x.seriesId === 'string' ? x.seriesId : undefined,
    order: num(x.order, 0),
    notifId: Number.isInteger(x.notifId) && x.notifId > 0 && x.notifId < 2 ** 31 ? x.notifId : 0,
    createdAt: num(x.createdAt, now),
    updatedAt: num(x.updatedAt, now),
  };
}

function cleanList(x: unknown): List | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null;
  return {
    id: x.id,
    name: str(x.name, 'List').slice(0, 80) || 'List',
    color: hex(x.color, '#6c5ce7'),
    emoji: typeof x.emoji === 'string' && x.emoji ? x.emoji.slice(0, 16) : undefined,
    order: num(x.order, 0),
    createdAt: num(x.createdAt, Date.now()),
  };
}

function cleanSettings(x: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(x)) return d;
  const vp: Settings['viewPrefs'] = {};
  if (isObj(x.viewPrefs)) {
    for (const [k, v] of Object.entries(x.viewPrefs)) {
      if (!isObj(v)) continue;
      const f = isObj(v.filters) ? v.filters : {};
      vp[k] = {
        sort: ['manual', 'due', 'priority', 'list', 'created', 'alpha'].includes(v.sort) ? v.sort : 'manual',
        filters: {
          ...defaultFilters(),
          priorities: Array.isArray(f.priorities) ? f.priorities.filter((p: unknown) => [0, 1, 2, 3].includes(p as number)) : [],
          listIds: Array.isArray(f.listIds) ? f.listIds.filter((p: unknown) => typeof p === 'string') : [],
          status: ['open', 'done', 'all'].includes(f.status) ? f.status : 'open',
          due: ['any', 'overdue', 'today', 'week', 'nodate', 'hasdate'].includes(f.due) ? f.due : 'any',
        },
      };
    }
  }
  return {
    theme: ['system', 'light', 'dark'].includes(x.theme) ? x.theme : d.theme,
    accent: hex(x.accent, d.accent),
    allDayReminderTime: isValidTime(x.allDayReminderTime) ? x.allDayReminderTime : d.allDayReminderTime,
    defaultReminder: x.defaultReminder === null ? null : typeof x.defaultReminder === 'number' ? x.defaultReminder : d.defaultReminder,
    weekStart: x.weekStart === 0 ? 0 : 1,
    haptics: typeof x.haptics === 'boolean' ? x.haptics : d.haptics,
    showCompletedInLists: typeof x.showCompletedInLists === 'boolean' ? x.showCompletedInLists : d.showCompletedInLists,
    reduceMotion: typeof x.reduceMotion === 'boolean' ? x.reduceMotion : d.reduceMotion,
    viewPrefs: vp,
  };
}

export class DataError extends Error {}

/**
 * Turn anything loaded from storage or a backup file into valid AppData.
 * Throws DataError if it isn't recognisable Doable data at all.
 */
export function migrate(raw: unknown): AppData {
  if (!isObj(raw)) throw new DataError('Not a Doable data object');
  const version = num(raw.schemaVersion, 0);
  if (version > CURRENT_SCHEMA) throw new DataError(`This backup is from a newer version of Doable (v${version}). Update the app first.`);
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.lists)) throw new DataError('Missing tasks or lists');

  // (Future schema upgrades go here: if (version < 2) { … })

  const lists = raw.lists.map(cleanList).filter((l): l is List => !!l);
  const seenL = new Set<ID>();
  const uniqLists = lists.filter((l) => (seenL.has(l.id) ? false : (seenL.add(l.id), true)));
  if (!uniqLists.some((l) => l.id === INBOX_ID)) {
    uniqLists.unshift({ id: INBOX_ID, name: 'Inbox', color: '#6c5ce7', emoji: '📥', order: -1, createdAt: Date.now() });
  }
  const listIds = new Set(uniqLists.map((l) => l.id));

  const seenT = new Set<ID>();
  const tasks = raw.tasks
    .map((t) => cleanTask(t, listIds))
    .filter((t): t is Task => !!t && (seenT.has(t.id) ? false : (seenT.add(t.id), true)));

  // Make sure every task has a unique notification id.
  let next = Math.max(num(raw.meta?.nextNotifId, 1), 1);
  const usedN = new Set<number>();
  for (const t of tasks) if (t.notifId) next = Math.max(next, t.notifId + 1);
  for (const t of tasks) {
    if (!t.notifId || usedN.has(t.notifId)) t.notifId = next++;
    usedN.add(t.notifId);
  }

  return {
    schemaVersion: CURRENT_SCHEMA,
    lists: uniqLists,
    tasks,
    settings: cleanSettings(raw.settings),
    meta: { nextNotifId: next, createdAt: num(raw.meta?.createdAt, Date.now()) },
  };
}
