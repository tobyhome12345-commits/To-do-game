import { describe, expect, it } from 'vitest';
import { defaultData, blankTask } from '../src/model/data';
import { diffReminders, fireTimeFor, planReminders } from '../src/model/reminderPlan';
import type { AppData, Task } from '../src/model/types';

// Tests run with TZ=Europe/London (see package.json) so DST behaviour is deterministic.
const local = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).getTime();

function dataWith(tasks: Partial<Task>[]): AppData {
  const data = defaultData(local(2026, 11, 25, 8, 0));
  data.tasks = tasks.map((p, i) => blankTask({ title: `T${i}`, notifId: 100 + i, ...p }));
  return data;
}

describe('fireTimeFor', () => {
  const s = defaultData().settings;
  it('due time minus offset', () => {
    const t = blankTask({ notifId: 1, dueDate: '2026-11-25', dueTime: '17:00', reminder: 15 });
    expect(fireTimeFor(t, s)).toBe(local(2026, 11, 25, 16, 45));
  });

  it('all-day tasks use the all-day reminder time', () => {
    const t = blankTask({ notifId: 1, dueDate: '2026-11-25', reminder: 0 });
    expect(fireTimeFor(t, s)).toBe(local(2026, 11, 25, 9, 0));
  });

  it('no reminder, no date, or completed → nothing', () => {
    expect(fireTimeFor(blankTask({ notifId: 1, dueDate: '2026-11-25', reminder: null }), s)).toBeNull();
    expect(fireTimeFor(blankTask({ notifId: 1, reminder: 0 }), s)).toBeNull();
    expect(fireTimeFor(blankTask({ notifId: 1, dueDate: '2026-11-25', reminder: 0, completedAt: 1 }), s)).toBeNull();
  });

  it('snooze overrides the normal time', () => {
    const t = blankTask({ notifId: 1, dueDate: '2026-11-25', dueTime: '17:00', reminder: 0, snoozedUntil: 12345 });
    expect(fireTimeFor(t, s)).toBe(12345);
  });

  it('"1 day before" keeps the clock time across a DST change', () => {
    // UK clocks go back on Sun 25 Oct 2026. Reminder for 09:00 on the 25th, one day before → 09:00 on the 24th.
    const t = blankTask({ notifId: 1, dueDate: '2026-10-25', dueTime: '09:00', reminder: 1440 });
    expect(fireTimeFor(t, s)).toBe(local(2026, 10, 24, 9, 0));
    const t2 = blankTask({ notifId: 1, dueDate: '2026-10-25', dueTime: '09:00', reminder: 1440 + 30 });
    expect(fireTimeFor(t2, s)).toBe(local(2026, 10, 24, 8, 30));
  });
});

describe('planReminders', () => {
  const now = local(2026, 11, 25, 12, 0);

  it('skips past reminders and sorts by time', () => {
    const data = dataWith([
      { dueDate: '2026-11-25', dueTime: '18:00', reminder: 0 },
      { dueDate: '2026-11-25', dueTime: '11:00', reminder: 0 }, // past
      { dueDate: '2026-11-25', dueTime: '13:00', reminder: 0, emoji: '📚' },
    ]);
    const plan = planReminders(data, now);
    expect(plan.map((p) => p.id)).toEqual([102, 100]);
    expect(plan[0].title).toBe('📚 T2');
    expect(plan[0].body).toContain('Due today at 1:00 PM');
  });

  it('caps the number scheduled', () => {
    const data = dataWith(Array.from({ length: 80 }, (_, i) => ({ dueDate: '2026-12-01', dueTime: `${String(i % 24).padStart(2, '0')}:00`, reminder: i })));
    expect(planReminders(data, now, 50)).toHaveLength(50);
  });
});

describe('diffReminders', () => {
  const mk = (id: number, fp: string) => ({ id, at: 1, taskId: 't', title: '', body: '', fp });

  it('schedules new, keeps unchanged, replaces changed, cancels stale', () => {
    const desired = [mk(1, 'a'), mk(2, 'b2'), mk(3, 'c')];
    const pending = [
      { id: 1, extra: { fp: 'a' } },
      { id: 2, extra: { fp: 'b' } },
      { id: 9, extra: { fp: 'z' } },
    ];
    const { cancel, schedule } = diffReminders(desired, pending);
    expect(cancel.sort()).toEqual([2, 9]);
    expect(schedule.map((s) => s.id).sort()).toEqual([2, 3]);
  });

  it('is a no-op when everything matches', () => {
    expect(diffReminders([mk(1, 'a')], [{ id: 1, extra: { fp: 'a' } }])).toEqual({ cancel: [], schedule: [] });
  });
});
