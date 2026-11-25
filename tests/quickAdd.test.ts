import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../src/model/quickAdd';
import type { List } from '../src/model/types';

const lists: List[] = [
  { id: 'inbox', name: 'Inbox', color: '#000000', order: 0, createdAt: 0 },
  { id: 'home', name: 'Home', color: '#000000', order: 1, createdAt: 0 },
  { id: 'school', name: 'School', color: '#000000', order: 2, createdAt: 0 },
  { id: 'side', name: 'Side Projects', color: '#000000', order: 3, createdAt: 0 },
];
const ctx = { today: '2026-11-25', lists, weekStart: 1 as const }; // Wednesday
const p = (s: string) => parseQuickAdd(s, ctx);

describe('quick-add parser', () => {
  it('parses the full example', () => {
    const r = p('Essay tomorrow 5pm !high #School');
    expect(r).toMatchObject({ title: 'Essay', dueDate: '2026-11-26', dueTime: '17:00', priority: 3, listId: 'school' });
    expect(r.chips.map((c) => c.kind)).toEqual(['date', 'time', 'priority', 'list']);
  });

  it('weekday + "at 6" guesses evening', () => {
    expect(p('Call grandma fri at 6')).toMatchObject({ title: 'Call grandma', dueDate: '2026-11-27', dueTime: '18:00' });
  });

  it('a weekday that is today means today; "next" means next week', () => {
    expect(p('Swim wed').dueDate).toBe('2026-11-25');
    expect(p('Swim next wed').dueDate).toBe('2026-12-02');
  });

  it('repeats', () => {
    expect(p('Gym every mon')).toMatchObject({ title: 'Gym', dueDate: '2026-11-30', repeat: { freq: 'weekly', weekdays: [1], anchor: '2026-11-30' } });
    expect(p('Water plants every 3 days')).toMatchObject({ title: 'Water plants', dueDate: '2026-11-25', repeat: { freq: 'daily', interval: 3 } });
    expect(p('Read daily 9pm')).toMatchObject({ title: 'Read', dueDate: '2026-11-25', dueTime: '21:00', repeat: { freq: 'daily' } });
    expect(p('Bins every other week').repeat).toMatchObject({ freq: 'weekly', interval: 2 });
    expect(p('Standup every weekday 9:30am').repeat).toMatchObject({ weekdays: [1, 2, 3, 4, 5] });
  });

  it('month dates roll into next year when already past', () => {
    expect(p('Pay rent dec 1').dueDate).toBe('2026-12-01');
    expect(p('Birthday 3 jan').dueDate).toBe('2027-01-03');
    expect(p('Party 25th december').dueDate).toBe('2026-12-25');
  });

  it('relative dates', () => {
    expect(p('Plan trip next week').dueDate).toBe('2026-11-30');
    expect(p('Dentist in 3 days').dueDate).toBe('2026-11-28');
    expect(p('Review in 2 weeks').dueDate).toBe('2026-12-09');
    expect(p('tonight movie')).toMatchObject({ title: 'movie', dueDate: '2026-11-25', dueTime: '20:00' });
  });

  it('times', () => {
    expect(p('Lunch noon').dueTime).toBe('12:00');
    expect(p('Wake 6:45 am').dueTime).toBe('06:45');
    expect(p('Match 18:30').dueTime).toBe('18:30');
    expect(p('Snack 12am')).toMatchObject({ title: 'Snack', dueTime: '00:00' });
  });

  it('leaves ordinary text alone', () => {
    const r = p('Buy 3 apples');
    expect(r.title).toBe('Buy 3 apples');
    expect(r.dueDate).toBeUndefined();
    expect(r.dueTime).toBeUndefined();
    expect(p('Do it!').title).toBe('Do it!');
    expect(p('Do it!').priority).toBeUndefined();
    expect(p('#unknown thing').title).toBe('#unknown thing');
    expect(p('#unknown thing').listId).toBeUndefined();
  });

  it('lists by prefix, ignoring spaces', () => {
    expect(p('#home clean room')).toMatchObject({ title: 'clean room', listId: 'home' });
    expect(p('Build robot #sideprojects')).toMatchObject({ listId: 'side' });
    expect(p('Build robot #side')).toMatchObject({ listId: 'side' });
  });

  it('priority shorthands', () => {
    expect(p('A !!!').priority).toBe(3);
    expect(p('A !!').priority).toBe(2);
    expect(p('A !').priority).toBe(1);
    expect(p('A !med').priority).toBe(2);
  });

  it('never returns an empty title', () => {
    expect(p('tomorrow').title).toBe('tomorrow');
  });
});
