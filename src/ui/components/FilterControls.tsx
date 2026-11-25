import { ArrowDownAZ, CalendarClock, Clock3, Flag, GripVertical, Tag } from 'lucide-react';
import type { DueFilter, Filters, Priority, SortKey, StatusFilter } from '../../model/types';
import { useData } from '../../store/store';
import { Chip, Segmented } from './Controls';

export const SORT_OPTIONS: { value: SortKey; label: string; Icon: typeof Flag }[] = [
  { value: 'manual', label: 'My order (drag)', Icon: GripVertical },
  { value: 'due', label: 'Due date', Icon: CalendarClock },
  { value: 'priority', label: 'Priority', Icon: Flag },
  { value: 'list', label: 'List', Icon: Tag },
  { value: 'created', label: 'Newest first', Icon: Clock3 },
  { value: 'alpha', label: 'A–Z', Icon: ArrowDownAZ },
];

const PRIOS: { value: Priority; label: string; color: string }[] = [
  { value: 3, label: 'High', color: 'var(--p3)' },
  { value: 2, label: 'Medium', color: 'var(--p2)' },
  { value: 1, label: 'Low', color: 'var(--p1)' },
  { value: 0, label: 'None', color: 'var(--text-3)' },
];

const DUES: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'nodate', label: 'No date' },
];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function SortPicker({ value, onChange, allowManual }: { value: SortKey; onChange: (s: SortKey) => void; allowManual: boolean }) {
  return (
    <div className="sort-list" role="radiogroup" aria-label="Sort by">
      {SORT_OPTIONS.filter((o) => allowManual || o.value !== 'manual').map(({ value: v, label, Icon }) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} className={`sort-opt ${v === value ? 'sort-opt--on' : ''}`} onClick={() => onChange(v)}>
          <Icon size={17} />
          {label}
        </button>
      ))}
    </div>
  );
}

export function FilterControls({
  filters,
  onChange,
  showStatus,
  showDue,
  showLists,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  showStatus?: boolean;
  showDue?: boolean;
  showLists?: boolean;
}) {
  const lists = useData((s) => s.data.lists);
  return (
    <div className="filters">
      {showStatus && (
        <div className="filters__row">
          <div className="filters__label">Show</div>
          <Segmented<StatusFilter>
            label="Status"
            value={filters.status}
            onChange={(status) => onChange({ ...filters, status })}
            options={[
              { value: 'open', label: 'To do' },
              { value: 'done', label: 'Done' },
              { value: 'all', label: 'Everything' },
            ]}
          />
        </div>
      )}
      <div className="filters__row">
        <div className="filters__label">Priority</div>
        <div className="chips">
          {PRIOS.map((p) => (
            <Chip key={p.value} active={filters.priorities.includes(p.value)} color={p.color} onClick={() => onChange({ ...filters, priorities: toggle(filters.priorities, p.value) })}>
              <Flag size={14} style={{ color: p.color }} />
              {p.label}
            </Chip>
          ))}
        </div>
      </div>
      {showDue && (
        <div className="filters__row">
          <div className="filters__label">Due</div>
          <div className="chips">
            {DUES.map((d) => (
              <Chip key={d.value} active={filters.due === d.value} onClick={() => onChange({ ...filters, due: d.value })}>
                {d.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {showLists && (
        <div className="filters__row">
          <div className="filters__label">Lists</div>
          <div className="chips">
            {[...lists]
              .sort((a, b) => a.order - b.order)
              .map((l) => (
                <Chip key={l.id} active={filters.listIds.includes(l.id)} color={l.color} className="chip--list" onClick={() => onChange({ ...filters, listIds: toggle(filters.listIds, l.id) })}>
                  <i className="chip__dot" />
                  {l.emoji && <span>{l.emoji}</span>}
                  {l.name}
                </Chip>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
