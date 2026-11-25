import { describe, expect, it } from 'vitest';
import { blankTask } from '../src/model/data';
import { applyFilters, completedView, counts, orderBetween, searchTasks, sortTasks, todayView, upcomingView } from '../src/model/views';
import { defaultFilters, type List, type Task } from '../src/model/types';

const today = '2026-11-25';
let n = 1;
const T = (p: Partial<Task>) => blankTask({ notifId: n++, title: 'x', ...p });

const tasks = [
  T({ id: 'over', dueDate: '2026-11-20', priority: 1 }),
  T({ id: 'today1', dueDate: today, dueTime: '18:00', priority: 3 }),
  T({ id: 'today2', dueDate: today, priority: 2 }),
  T({ id: 'tmr', dueDate: '2026-11-26' }),
  T({ id: 'far', dueDate: '2027-02-01' }),
  T({ id: 'nodate', title: 'Café plans', subtasks: [{ id: 's', title: 'Book table', done: false }] }),
  T({ id: 'done', dueDate: today, completedAt: new Date(2026, 10, 24, 10).getTime() }),
];

describe('smart views', () => {
  it('today splits overdue and today', () => {
    const v = todayView(tasks, today);
    expect(v.overdue.map((t) => t.id)).toEqual(['over']);
    expect(v.today.map((t) => t.id).sort()).toEqual(['today1', 'today2']);
  });

  it('upcoming has 14 day groups plus Later', () => {
    const g = upcomingView(tasks, today);
    expect(g).toHaveLength(15);
    expect(g[0]).toMatchObject({ date: '2026-11-26' });
    expect(g[0].tasks.map((t) => t.id)).toEqual(['tmr']);
    expect(g[14]).toMatchObject({ key: 'later' });
    expect(g[14].tasks.map((t) => t.id)).toEqual(['far']);
  });

  it('completed groups by completion day', () => {
    const g = completedView(tasks);
    expect(g).toHaveLength(1);
    expect(g[0].date).toBe('2026-11-24');
  });

  it('counts', () => {
    expect(counts(tasks, today)).toMatchObject({ today: 2, overdue: 1, upcoming: 2, completed: 1, all: 6 });
  });
});

describe('sort, filter, search', () => {
  const lists: List[] = [];
  it('sort by priority then due', () => {
    expect(sortTasks(tasks.slice(0, 3), 'priority', lists).map((t) => t.id)).toEqual(['today1', 'today2', 'over']);
  });

  it('sort by due: earlier dates first, timed before all-day on the same day, no date last', () => {
    expect(sortTasks([tasks[5], tasks[2], tasks[1], tasks[0]], 'due', lists).map((t) => t.id)).toEqual(['over', 'today1', 'today2', 'nodate']);
  });

  it('filters by priority and due', () => {
    const f = { ...defaultFilters(), priorities: [3 as const] };
    expect(applyFilters(tasks, f, today).map((t) => t.id)).toEqual(['today1']);
    expect(applyFilters(tasks, { ...defaultFilters(), due: 'nodate' }, today).map((t) => t.id)).toEqual(['nodate']);
    expect(applyFilters(tasks, { ...defaultFilters(), status: 'done' }, today).map((t) => t.id)).toEqual(['done']);
  });

  it('search matches subtasks and ignores accents/case', () => {
    expect(searchTasks(tasks, 'cafe').map((t) => t.id)).toEqual(['nodate']);
    expect(searchTasks(tasks, 'BOOK table').map((t) => t.id)).toEqual(['nodate']);
  });

  it('orderBetween', () => {
    expect(orderBetween(1, 2)).toBe(1.5);
    expect(orderBetween(undefined, 2)).toBe(1);
    expect(orderBetween(5, undefined)).toBe(6);
  });
});
