import { beforeEach, describe, expect, it } from 'vitest';
import { useData } from '../src/store/store';
import { defaultData } from '../src/model/data';
import { addDays, todayStr } from '../src/model/dates';
import { INBOX_ID } from '../src/model/types';

const S = () => useData.getState();
const task = (id: string) => S().data.tasks.find((t) => t.id === id)!;

beforeEach(() => {
  const d = defaultData();
  d.tasks = [];
  S().init(d);
});

describe('tasks', () => {
  it('adds at the top with a unique notification id and the default reminder', () => {
    const a = S().addTask({ title: 'A' });
    const b = S().addTask({ title: 'B', dueDate: todayStr() });
    expect(b.order).toBeLessThan(a.order);
    expect(a.notifId).not.toBe(b.notifId);
    expect(a.reminder).toBeNull();
    expect(b.reminder).toBe(0);
  });

  it('complete + undo', () => {
    const a = S().addTask({ title: 'A' });
    S().toggleComplete(a.id);
    expect(task(a.id).completedAt).not.toBeNull();
    expect(S().snack?.undoId).toBeDefined();
    S().undo(S().snack!.undoId);
    expect(task(a.id).completedAt).toBeNull();
  });

  it('completing a repeating task rolls it forward and keeps a history copy', () => {
    const today = todayStr();
    const a = S().addTask({
      title: 'Walk dog',
      dueDate: today,
      dueTime: '08:00',
      repeat: { freq: 'daily', interval: 1, basis: 'due', anchor: today },
      subtasks: [{ id: 's1', title: 'Leash', done: true }],
    });
    S().toggleComplete(a.id);
    const live = task(a.id);
    expect(live.completedAt).toBeNull();
    expect(live.dueDate).toBe(addDays(today, 1));
    expect(live.dueTime).toBe('08:00');
    expect(live.subtasks[0].done).toBe(false);
    const history = S().data.tasks.filter((t) => t.seriesId === a.id && t.id !== a.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ completedAt: expect.any(Number), repeat: null, dueDate: today });
    expect(history[0].notifId).not.toBe(live.notifId);

    S().undo();
    expect(task(a.id).dueDate).toBe(today);
    expect(task(a.id).subtasks[0].done).toBe(true);
    expect(S().data.tasks).toHaveLength(1);
  });

  it('undo only restores what the action touched', () => {
    const a = S().addTask({ title: 'A' });
    const b = S().addTask({ title: 'B' });
    S().toggleComplete(a.id);
    const undoId = S().snack!.undoId;
    S().updateTask(b.id, { title: 'B edited' });
    S().undo(undoId);
    expect(task(a.id).completedAt).toBeNull();
    expect(task(b.id).title).toBe('B edited');
  });

  it('delete + undo', () => {
    const a = S().addTask({ title: 'A', notes: 'hello' });
    S().deleteTask(a.id);
    expect(S().data.tasks).toHaveLength(0);
    S().undo();
    expect(task(a.id).notes).toBe('hello');
  });

  it('changing the due date clears snooze and re-anchors the repeat', () => {
    const today = todayStr();
    const a = S().addTask({ title: 'A', dueDate: today, repeat: { freq: 'monthly', interval: 1, basis: 'due', anchor: today } });
    S().snooze(a.id, 10);
    expect(task(a.id).snoozedUntil).not.toBeNull();
    const nd = addDays(today, 3);
    S().updateTask(a.id, { dueDate: nd });
    expect(task(a.id).snoozedUntil).toBeNull();
    expect(task(a.id).repeat!.anchor).toBe(nd);
  });

  it('removing the due date removes time and repeat', () => {
    const today = todayStr();
    const a = S().addTask({ title: 'A', dueDate: today, dueTime: '10:00', repeat: { freq: 'daily', interval: 1, basis: 'due', anchor: today } });
    S().updateTask(a.id, { dueDate: null });
    expect(task(a.id)).toMatchObject({ dueTime: null, repeat: null });
  });
});

describe('lists', () => {
  it('delete list moving tasks to Inbox, then undo', () => {
    const l = S().addList({ name: 'Gym', color: '#ff0000' });
    const a = S().addTask({ title: 'Squats', listId: l.id });
    S().deleteList(l.id, 'move');
    expect(task(a.id).listId).toBe(INBOX_ID);
    S().undo();
    expect(S().data.lists.some((x) => x.id === l.id)).toBe(true);
    expect(task(a.id).listId).toBe(l.id);
  });

  it('delete list with its tasks', () => {
    const l = S().addList({ name: 'Gym' });
    S().addTask({ title: 'Squats', listId: l.id });
    S().deleteList(l.id, 'delete');
    expect(S().data.tasks).toHaveLength(0);
  });

  it('Inbox cannot be deleted', () => {
    S().deleteList(INBOX_ID, 'delete');
    expect(S().data.lists.some((x) => x.id === INBOX_ID)).toBe(true);
  });
});
