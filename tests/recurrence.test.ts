import { describe, expect, it } from 'vitest';
import type { Repeat } from '../src/model/types';
import { describeRepeat, nextOccurrence, presetOf, previewOccurrences, stepOnce } from '../src/model/recurrence';

// 2026-11-25 is a Wednesday.
const R = (p: Partial<Repeat>): Repeat => ({ freq: 'daily', interval: 1, basis: 'due', anchor: '2026-11-25', ...p });

describe('stepOnce', () => {
  it('daily and every N days', () => {
    expect(stepOnce(R({}), '2026-11-25')).toBe('2026-11-26');
    expect(stepOnce(R({ interval: 3 }), '2026-11-30')).toBe('2026-12-03');
  });

  it('weekly without weekdays adds 7N days', () => {
    expect(stepOnce(R({ freq: 'weekly' }), '2026-11-25')).toBe('2026-12-02');
    expect(stepOnce(R({ freq: 'weekly', interval: 2 }), '2026-12-28')).toBe('2027-01-11');
  });

  it('weekdays (Mon–Fri) skip the weekend', () => {
    const r = R({ freq: 'weekly', weekdays: [1, 2, 3, 4, 5] });
    expect(stepOnce(r, '2026-11-27')).toBe('2026-11-30'); // Fri → Mon
    expect(stepOnce(r, '2026-11-25')).toBe('2026-11-26'); // Wed → Thu
  });

  it('Mon/Wed/Fri', () => {
    const r = R({ freq: 'weekly', weekdays: [1, 3, 5] });
    expect(stepOnce(r, '2026-11-30')).toBe('2026-12-02');
    expect(stepOnce(r, '2026-12-02')).toBe('2026-12-04');
    expect(stepOnce(r, '2026-12-04')).toBe('2026-12-07');
  });

  it('every 2 weeks on Tue & Thu keeps the cadence from the anchor week', () => {
    const r = R({ freq: 'weekly', interval: 2, weekdays: [2, 4], anchor: '2026-11-24' });
    expect(stepOnce(r, '2026-11-24')).toBe('2026-11-26'); // same week Thu
    expect(stepOnce(r, '2026-11-26')).toBe('2026-12-08'); // skip a week
    expect(stepOnce(r, '2026-12-08')).toBe('2026-12-10');
  });

  it('week boundaries respect weekStart', () => {
    // Every 2 weeks on Sun+Mon, anchored on Mon 2026-11-30.
    const r = R({ freq: 'weekly', interval: 2, weekdays: [0, 1], anchor: '2026-11-30' });
    // Monday-start weeks: Mon 30 Nov and Sun 6 Dec are the SAME week.
    expect(stepOnce(r, '2026-11-30', 1)).toBe('2026-12-06');
    // Sunday-start weeks: Sun 6 Dec starts a new (skipped) week → Sun 13 Dec.
    expect(stepOnce(r, '2026-11-30', 0)).toBe('2026-12-13');
  });

  it('monthly on the 31st clamps but returns to the 31st', () => {
    const r = R({ freq: 'monthly', anchor: '2027-01-31' });
    expect(stepOnce(r, '2027-01-31')).toBe('2027-02-28');
    expect(stepOnce(r, '2027-02-28')).toBe('2027-03-31');
    expect(stepOnce(r, '2027-03-31')).toBe('2027-04-30');
    expect(stepOnce(r, '2027-11-30')).toBe('2027-12-31');
  });

  it('monthly in a leap year', () => {
    const r = R({ freq: 'monthly', anchor: '2028-01-30' });
    expect(stepOnce(r, '2028-01-30')).toBe('2028-02-29');
  });

  it('yearly on Feb 29', () => {
    const r = R({ freq: 'yearly', anchor: '2028-02-29' });
    expect(stepOnce(r, '2028-02-29')).toBe('2029-02-28');
    expect(stepOnce(r, '2031-02-28')).toBe('2032-02-29');
  });
});

describe('nextOccurrence', () => {
  it('normal completion on the due day', () => {
    expect(nextOccurrence(R({}), '2026-11-25', '2026-11-25', '2026-11-25')).toBe('2026-11-26');
  });

  it('completing early moves past the due date', () => {
    expect(nextOccurrence(R({}), '2026-11-27', '2026-11-25', '2026-11-25')).toBe('2026-11-28');
  });

  it('overdue daily task catches up to today instead of leaving a trail', () => {
    expect(nextOccurrence(R({}), '2026-11-20', '2026-11-25', '2026-11-25')).toBe('2026-11-25');
  });

  it('overdue weekly task catches up to the next valid weekday', () => {
    const r = R({ freq: 'weekly', weekdays: [1], anchor: '2026-11-02' }); // Mondays
    expect(nextOccurrence(r, '2026-11-09', '2026-11-25', '2026-11-25')).toBe('2026-11-30');
  });

  it('completion basis counts from the day it was done', () => {
    const r = R({ interval: 3, basis: 'completion' });
    expect(nextOccurrence(r, '2026-11-20', '2026-11-25', '2026-11-25')).toBe('2026-11-28');
    const m = R({ freq: 'monthly', basis: 'completion', anchor: '2026-01-31' });
    expect(nextOccurrence(m, '2026-11-02', '2026-11-10', '2026-11-10')).toBe('2026-12-10');
  });

  it('completion basis ignores weekdays (plain N weeks)', () => {
    const r = R({ freq: 'weekly', basis: 'completion', weekdays: [1] });
    expect(nextOccurrence(r, '2026-11-20', '2026-11-25', '2026-11-25')).toBe('2026-12-02');
  });

  it('stops after the until date', () => {
    expect(nextOccurrence(R({ until: '2026-11-26' }), '2026-11-25', '2026-11-25', '2026-11-25')).toBe('2026-11-26');
    expect(nextOccurrence(R({ until: '2026-11-26' }), '2026-11-26', '2026-11-26', '2026-11-26')).toBeNull();
  });
});

describe('presets & descriptions', () => {
  it('recognises presets', () => {
    expect(presetOf(null)).toBe('none');
    expect(presetOf(R({}))).toBe('daily');
    expect(presetOf(R({ freq: 'weekly', weekdays: [5, 4, 3, 2, 1] }))).toBe('weekdays');
    expect(presetOf(R({ freq: 'weekly', weekdays: [3] }))).toBe('weekly');
    expect(presetOf(R({ freq: 'weekly', weekdays: [1, 3] }))).toBe('custom');
    expect(presetOf(R({ interval: 2 }))).toBe('custom');
  });

  it('describes rules', () => {
    expect(describeRepeat(R({}))).toBe('Daily');
    expect(describeRepeat(R({ freq: 'weekly', interval: 2, weekdays: [3, 1] }))).toBe('Every 2 weeks on Mon, Wed');
    expect(describeRepeat(R({ interval: 3, basis: 'completion' }))).toBe('Every 3 days after done');
  });

  it('previews occurrences', () => {
    expect(previewOccurrences(R({ freq: 'weekly', weekdays: [1, 3, 5] }), '2026-11-25', 3)).toEqual([
      '2026-11-27',
      '2026-11-30',
      '2026-12-02',
    ]);
  });
});
