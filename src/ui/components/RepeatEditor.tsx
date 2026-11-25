import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { LocalDate, Repeat, RepeatFreq } from '../../model/types';
import { makePreset, presetOf, previewOccurrences, type RepeatPreset } from '../../model/recurrence';
import { relativeDay, todayStr, weekday, weekdayShort } from '../../model/dates';
import { Chip, Segmented } from './Controls';

const PRESETS: { id: RepeatPreset; label: string }[] = [
  { id: 'none', label: 'Never' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom…' },
];

const UNITS: { value: RepeatFreq; one: string; many: string }[] = [
  { value: 'daily', one: 'day', many: 'days' },
  { value: 'weekly', one: 'week', many: 'weeks' },
  { value: 'monthly', one: 'month', many: 'months' },
  { value: 'yearly', one: 'year', many: 'years' },
];

interface Props {
  value: Repeat | null;
  dueDate: LocalDate;
  weekStart: 0 | 1;
  onChange: (r: Repeat | null) => void;
}

export function RepeatEditor({ value, dueDate, weekStart, onChange }: Props) {
  const preset = presetOf(value);
  const [custom, setCustom] = useState(preset === 'custom');
  const today = todayStr();

  const pick = (p: RepeatPreset) => {
    if (p === 'none') {
      setCustom(false);
      onChange(null);
    } else if (p === 'custom') {
      setCustom(true);
      onChange(value ?? { freq: 'weekly', interval: 1, weekdays: [weekday(dueDate)], basis: 'due', anchor: dueDate });
    } else {
      setCustom(false);
      onChange(makePreset(p, dueDate));
    }
  };

  const r = value;
  const set = (patch: Partial<Repeat>) => r && onChange({ ...r, ...patch });
  const days = Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
  const unit = UNITS.find((u) => u.value === r?.freq) ?? UNITS[0];
  const preview = r ? previewOccurrences(r, dueDate, 3, weekStart) : [];

  return (
    <div className="repeat">
      <div className="chips">
        {PRESETS.map((p) => (
          <Chip key={p.id} active={custom ? p.id === 'custom' : preset === p.id} onClick={() => pick(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {custom && r && (
        <div className="repeat__custom">
          <div className="repeat__line">
            <span>Every</span>
            <div className="stepper">
              <button type="button" aria-label="Fewer" onClick={() => set({ interval: Math.max(1, r.interval - 1) })}>
                <Minus size={16} />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={r.interval}
                onChange={(e) => set({ interval: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}
                aria-label="Interval"
              />
              <button type="button" aria-label="More" onClick={() => set({ interval: Math.min(999, r.interval + 1) })}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          <Segmented
            label="Repeat unit"
            value={r.freq}
            onChange={(freq) =>
              set({ freq, weekdays: freq === 'weekly' ? r.weekdays?.length ? r.weekdays : [weekday(dueDate)] : undefined })
            }
            options={UNITS.map((u) => ({ value: u.value, label: r.interval === 1 ? u.one : u.many }))}
          />

          {r.freq === 'weekly' && r.basis === 'due' && (
            <div className="weekdays" role="group" aria-label="On these days">
              {days.map((d) => {
                const on = r.weekdays?.includes(d) ?? false;
                return (
                  <button
                    type="button"
                    key={d}
                    className={`weekday ${on ? 'weekday--on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      const cur = new Set(r.weekdays ?? []);
                      if (on) cur.delete(d);
                      else cur.add(d);
                      set({ weekdays: cur.size ? [...cur].sort() : undefined });
                    }}
                  >
                    {weekdayShort(d).slice(0, 2)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="repeat__label">Repeat from</div>
          <Segmented
            label="Repeat from"
            value={r.basis}
            onChange={(basis) => set({ basis })}
            options={[
              { value: 'due', label: 'Due date' },
              { value: 'completion', label: 'When I finish it' },
            ]}
          />

          <div className="repeat__label">Ends</div>
          <div className="repeat__line">
            <Segmented
              label="Ends"
              value={r.until ? 'on' : 'never'}
              onChange={(v) => set({ until: v === 'on' ? r.until ?? previewOccurrences(r, dueDate, 8, weekStart).pop() ?? dueDate : undefined })}
              options={[
                { value: 'never', label: 'Never' },
                { value: 'on', label: 'On a date' },
              ]}
            />
            {r.until && (
              <input className="input input--small" type="date" value={r.until} min={dueDate} onChange={(e) => e.target.value && set({ until: e.target.value })} aria-label="End date" />
            )}
          </div>
        </div>
      )}

      {r && preview.length > 0 && (
        <div className="repeat__preview">
          {r.basis === 'completion'
            ? `Next one comes ${r.interval} ${r.interval === 1 ? unit.one : unit.many} after you finish it`
            : `Next: ${preview.map((d) => relativeDay(d, today)).join(' · ')}`}
        </div>
      )}
    </div>
  );
}
