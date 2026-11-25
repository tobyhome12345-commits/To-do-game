import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Filters, SortKey } from '../../model/types';
import { defaultFilters } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { applyFilters, filtersActive, searchTasks, sortTasks } from '../../model/views';
import { TaskList } from '../components/TaskList';
import { EmptyState } from '../components/EmptyState';
import { FilterControls, SORT_OPTIONS, SortPicker } from '../components/FilterControls';
import { useToday } from '../hooks';

export function SearchScreen() {
  const today = useToday();
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const pop = useUI((s) => s.pop);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters(), status: 'all' });
  const [sort, setSort] = useState<SortKey>('due');
  const [panel, setPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const nFilters = filtersActive(filters) + (filters.status !== 'all' ? 1 : 0);
  const active = q.trim().length > 0 || nFilters > 0;

  const results = useMemo(() => {
    if (!active) return [];
    const found = applyFilters(searchTasks(tasks, q), filters, today);
    // Open tasks first, then completed.
    const open = sortTasks(found.filter((t) => t.completedAt == null), sort, lists);
    const done = sortTasks(found.filter((t) => t.completedAt != null), sort, lists);
    return [...open, ...done];
  }, [active, tasks, q, filters, today, sort, lists]);

  return (
    <section className="screen">
      <div className="search-head">
        <button className="icon-btn" aria-label="Back" onClick={pop}>
          <ChevronLeft size={26} />
        </button>
        <div className="search-box">
          <Search size={19} />
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, notes, checklists…" aria-label="Search" enterKeyHint="search" />
          {q && (
            <button className="icon-btn icon-btn--sm" aria-label="Clear search" onClick={() => { setQ(''); inputRef.current?.focus(); }}>
              <X size={17} />
            </button>
          )}
        </div>
        <button className={`icon-btn ${panel || nFilters ? 'icon-btn--active' : ''}`} aria-label="Filters" aria-expanded={panel} onClick={() => setPanel((p) => !p)}>
          <SlidersHorizontal size={21} />
          {nFilters > 0 && <span className="badge-dot">{nFilters}</span>}
        </button>
      </div>

      <div className="scroll">
        {panel && (
          <div className="search-panel">
            <FilterControls filters={filters} onChange={setFilters} showStatus showDue showLists />
            <div className="filters__label" style={{ marginTop: 14 }}>
              Sort by
            </div>
            <SortPicker value={sort} onChange={setSort} allowManual={false} />
            {nFilters > 0 && (
              <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => setFilters({ ...defaultFilters(), status: 'all' })}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {!active && (
          <EmptyState art="🔎" title="Find anything" text="Search titles, notes and checklist items — or tap the sliders to filter by priority, due date or list." />
        )}
        {active && (
          <>
            <div className="section-title">
              {results.length} result{results.length === 1 ? '' : 's'}
              <span className="section-title__action" style={{ color: 'var(--text-3)' }}>
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </span>
            </div>
            {results.length ? <TaskList tasks={results} today={today} collapse={false} /> : <EmptyState art="🤷" title="No matches" text="Try fewer words or clear a filter." />}
          </>
        )}
      </div>
    </section>
  );
}
