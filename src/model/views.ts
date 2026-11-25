import type { Filters, ID, List, LocalDate, SortKey, Task, ViewPrefs } from './types';
import { defaultFilters } from './types';
import { addDays, toLocalDate } from './dates';

export const isOpen = (t: Task) => t.completedAt == null;
export const isOverdue = (t: Task, today: LocalDate) => isOpen(t) && !!t.dueDate && t.dueDate < today;
export const isDueToday = (t: Task, today: LocalDate) => isOpen(t) && t.dueDate === today;

/* ---------------- sorting ---------------- */

const dueKey = (t: Task) => `${t.dueDate ?? '9999-99-99'} ${t.dueTime ?? '99:99'}`;

export function sortTasks(tasks: Task[], sort: SortKey, lists: List[]): Task[] {
  const listOrder = new Map(lists.map((l) => [l.id, l.order]));
  const byOrder = (a: Task, b: Task) => a.order - b.order || a.createdAt - b.createdAt;
  const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
    manual: byOrder,
    due: (a, b) => dueKey(a).localeCompare(dueKey(b)) || b.priority - a.priority || byOrder(a, b),
    priority: (a, b) => b.priority - a.priority || dueKey(a).localeCompare(dueKey(b)) || byOrder(a, b),
    list: (a, b) => (listOrder.get(a.listId) ?? 1e9) - (listOrder.get(b.listId) ?? 1e9) || byOrder(a, b),
    created: (a, b) => b.createdAt - a.createdAt,
    alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || byOrder(a, b),
  };
  return [...tasks].sort(cmp[sort]);
}

/* ---------------- filtering ---------------- */

export function applyFilters(tasks: Task[], f: Filters, today: LocalDate, ignoreStatus = false): Task[] {
  const weekEnd = addDays(today, 7);
  return tasks.filter((t) => {
    if (!ignoreStatus) {
      if (f.status === 'open' && !isOpen(t)) return false;
      if (f.status === 'done' && isOpen(t)) return false;
    }
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.listIds.length && !f.listIds.includes(t.listId)) return false;
    switch (f.due) {
      case 'overdue':
        return !!t.dueDate && t.dueDate < today && isOpen(t);
      case 'today':
        return t.dueDate === today;
      case 'week':
        return !!t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd;
      case 'nodate':
        return !t.dueDate;
      case 'hasdate':
        return !!t.dueDate;
      default:
        return true;
    }
  });
}

export function filtersActive(f: Filters): number {
  return (f.priorities.length ? 1 : 0) + (f.listIds.length ? 1 : 0) + (f.due !== 'any' ? 1 : 0);
}

/* ---------------- view prefs ---------------- */

export const DEFAULT_SORT: Record<string, SortKey> = {
  today: 'manual',
  upcoming: 'manual',
  overdue: 'due',
  all: 'list',
  search: 'due',
};

export function prefsFor(viewPrefs: Record<string, ViewPrefs>, key: string): ViewPrefs {
  const p = viewPrefs[key];
  const sort = p?.sort ?? DEFAULT_SORT[key] ?? 'manual';
  return { sort, filters: { ...defaultFilters(), ...(p?.filters ?? {}) } };
}

/* ---------------- smart views ---------------- */

export function todayView(tasks: Task[], today: LocalDate) {
  return {
    overdue: tasks.filter((t) => isOverdue(t, today)),
    today: tasks.filter((t) => isDueToday(t, today)),
  };
}

export interface DayGroup {
  key: string; // date or 'later'
  date: LocalDate | null;
  tasks: Task[];
}

/** Upcoming: tomorrow … +14 days, one group per day (empty days included), then "Later". */
export function upcomingView(tasks: Task[], today: LocalDate, days = 14): DayGroup[] {
  const end = addDays(today, days);
  const open = tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate > today);
  const groups: DayGroup[] = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, i);
    groups.push({ key: d, date: d, tasks: open.filter((t) => t.dueDate === d) });
  }
  const later = open.filter((t) => t.dueDate! > end);
  if (later.length) groups.push({ key: 'later', date: null, tasks: later });
  return groups;
}

export function overdueView(tasks: Task[], today: LocalDate) {
  return tasks.filter((t) => isOverdue(t, today));
}

/** Completed, newest first, grouped by the day they were completed. */
export function completedView(tasks: Task[]): DayGroup[] {
  const done = tasks.filter((t) => t.completedAt != null).sort((a, b) => b.completedAt! - a.completedAt!);
  const groups: DayGroup[] = [];
  for (const t of done) {
    const d = toLocalDate(t.completedAt!);
    let g = groups[groups.length - 1];
    if (!g || g.date !== d) {
      g = { key: d, date: d, tasks: [] };
      groups.push(g);
    }
    g.tasks.push(t);
  }
  return groups;
}

export function listView(tasks: Task[], listId: ID) {
  const inList = tasks.filter((t) => t.listId === listId);
  return {
    open: inList.filter(isOpen),
    done: inList.filter((t) => !isOpen(t)).sort((a, b) => b.completedAt! - a.completedAt!),
  };
}

/* ---------------- search ---------------- */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function searchTasks(tasks: Task[], query: string): Task[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return tasks;
  return tasks.filter((t) => {
    const hay = norm([t.title, t.notes, t.emoji ?? '', ...t.subtasks.map((s) => s.title)].join(' \u0001 '));
    return words.every((w) => hay.includes(w));
  });
}

/* ---------------- counts ---------------- */

export function counts(tasks: Task[], today: LocalDate) {
  let todayN = 0,
    overdue = 0,
    upcoming = 0,
    completed = 0,
    all = 0;
  const perList: Record<ID, number> = {};
  for (const t of tasks) {
    if (!isOpen(t)) {
      completed++;
      continue;
    }
    all++;
    perList[t.listId] = (perList[t.listId] ?? 0) + 1;
    if (!t.dueDate) continue;
    if (t.dueDate < today) overdue++;
    else if (t.dueDate === today) todayN++;
    else upcoming++;
  }
  return { today: todayN, overdue, upcoming, completed, all, perList };
}

/* ---------------- ordering helpers ---------------- */

/** Order value to put a task between `before` and `after` (either may be undefined). */
export function orderBetween(before?: number, after?: number): number {
  if (before == null && after == null) return 0;
  if (before == null) return after! - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}
