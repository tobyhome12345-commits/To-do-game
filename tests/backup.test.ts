import { describe, expect, it } from 'vitest';
import { defaultData, blankTask, migrate } from '../src/model/data';
import { exportJSON, mergeData, parseBackup } from '../src/store/backup';

describe('backup', () => {
  it('round-trips through export and import', () => {
    const d = defaultData();
    const back = parseBackup(exportJSON(d));
    expect(back.data).toEqual(d);
    expect(back.stats).toMatchObject({ tasks: d.tasks.length, lists: 4 });
  });

  it('rejects junk with friendly messages', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/Doable backup|Missing/);
    expect(() => parseBackup(JSON.stringify({ app: 'Doable', data: { schemaVersion: 99, tasks: [], lists: [] } }))).toThrow(/newer version/);
  });

  it('repairs bad fields instead of crashing', () => {
    const d = migrate({
      schemaVersion: 1,
      lists: [{ id: 'x', name: 'X', color: 'red' }],
      tasks: [
        { id: 'a', title: 'A', listId: 'missing', dueDate: '2026-02-30', priority: 9, notifId: 5 },
        { id: 'b', title: 'B', notifId: 5 },
        { id: 'a', title: 'dupe' },
        { nope: true },
      ],
    });
    expect(d.lists.map((l) => l.id)).toEqual(['inbox', 'x']);
    expect(d.lists[1].color).toBe('#6c5ce7');
    expect(d.tasks).toHaveLength(2);
    expect(d.tasks[0]).toMatchObject({ listId: 'inbox', dueDate: null, priority: 0 });
    expect(d.tasks[0].notifId).not.toBe(d.tasks[1].notifId);
    expect(d.meta.nextNotifId).toBeGreaterThan(Math.max(...d.tasks.map((t) => t.notifId)));
  });

  it('merge: newest edit wins, new things are added, notification ids stay unique', () => {
    const cur = defaultData();
    cur.tasks = [blankTask({ id: 't1', title: 'old', notifId: 1, updatedAt: 100 }), blankTask({ id: 't2', title: 'mine', notifId: 2, updatedAt: 500 })];
    const inc = defaultData();
    inc.lists = [...cur.lists, { id: 'new', name: 'New', color: '#000000', order: 9, createdAt: 1 }];
    inc.tasks = [
      blankTask({ id: 't1', title: 'newer', notifId: 1, updatedAt: 200 }),
      blankTask({ id: 't2', title: 'older', notifId: 2, updatedAt: 100 }),
      blankTask({ id: 't3', title: 'brand new', notifId: 2, updatedAt: 1 }),
    ];
    const m = mergeData(cur, inc);
    const byId = Object.fromEntries(m.tasks.map((t) => [t.id, t]));
    expect(byId.t1.title).toBe('newer');
    expect(byId.t2.title).toBe('mine');
    expect(byId.t3.title).toBe('brand new');
    expect(new Set(m.tasks.map((t) => t.notifId)).size).toBe(3);
    expect(m.lists.some((l) => l.id === 'new')).toBe(true);
  });
});
