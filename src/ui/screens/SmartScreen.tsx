import { useMemo } from 'react';
import { useData } from '../../store/store';
import type { SmartViewId } from '../../store/ui';
import { applyFilters, completedView, isOpen, overdueView, prefsFor, sortTasks } from '../../model/views';
import { relativeDay } from '../../model/dates';
import { Header } from '../components/Header';
import { TaskList } from '../components/TaskList';
import { EmptyState } from '../components/EmptyState';
import { SortButton } from '../components/SortButton';
import { useToday } from '../hooks';

const META: Record<SmartViewId, { title: string; color: string }> = {
  overdue: { title: 'Overdue', color: '#ef4444' },
  completed: { title: 'Completed', color: '#10b981' },
  all: { title: 'All tasks', color: '#64748b' },
};

export function SmartScreen({ view }: { view: SmartViewId }) {
  const today = useToday();
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const moveTasksToDate = useData((s) => s.moveTasksToDate);
  const clearCompleted = useData((s) => s.clearCompleted);
  const prefs = prefsFor(viewPrefs, view);
  const m = META[view];

  const body = useMemo(() => {
    if (view === 'completed') {
      const groups = completedView(applyFilters(tasks, { ...prefs.filters, status: 'done' }, today));
      const n = groups.reduce((a, g) => a + g.tasks.length, 0);
      return { kind: 'groups' as const, groups, n };
    }
    if (view === 'overdue') {
      const ts = sortTasks(applyFilters(overdueView(tasks, today), prefs.filters, today, true), prefs.sort, lists);
      return { kind: 'flat' as const, tasks: ts, n: ts.length };
    }
    const open = applyFilters(tasks.filter(isOpen), prefs.filters, today, true);
    if (prefs.sort === 'list') {
      const byList = [...lists]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({ key: l.id, list: l, tasks: sortTasks(open.filter((t) => t.listId === l.id), 'manual', lists) }))
        .filter((g) => g.tasks.length);
      return { kind: 'lists' as const, groups: byList, n: open.length };
    }
    const ts = sortTasks(open, prefs.sort, lists);
    return { kind: 'flat' as const, tasks: ts, n: ts.length };
  }, [view, tasks, lists, today, prefs.sort, prefs.filters]);

  const action =
    view === 'overdue' && body.kind === 'flat' && body.n > 0 ? (
      <button className="section-title__action" onClick={() => moveTasksToDate(body.tasks.map((t) => t.id), today)}>
        Move all to today
      </button>
    ) : view === 'completed' && body.n > 0 && body.kind === 'groups' ? (
      <button className="section-title__action" onClick={() => clearCompleted(body.groups.flatMap((g) => g.tasks.map((t) => t.id)))}>
        Clear all
      </button>
    ) : null;

  return (
    <section className="screen">
      <Header back eyebrow={`${body.n} task${body.n === 1 ? '' : 's'}`} title={m.title} color={m.color} actions={<SortButton viewKey={view} allowManual={view === 'all'} showListFilter />} />
      <div className="scroll">
        {action && <div className="section-title" style={{ marginTop: 4 }}>{action}</div>}
        {body.n === 0 && (
          <EmptyState
            art={view === 'overdue' ? '😌' : view === 'completed' ? '🌱' : '🎈'}
            title={view === 'overdue' ? 'Nothing overdue' : view === 'completed' ? 'Nothing completed yet' : 'No open tasks'}
            text={view === 'overdue' ? "You're right on track. Nice!" : view === 'completed' ? 'Tick something off and it will show up here.' : 'Add a task from any screen with the + button.'}
          />
        )}
        {body.kind === 'flat' && <TaskList tasks={body.tasks} today={today} sortable={view === 'all' && prefs.sort === 'manual'} />}
        {body.kind === 'groups' &&
          body.groups.map((g) => (
            <div key={g.key}>
              <div className="day-head">
                <span className="day-head__title">{relativeDay(g.date!, today)}</span>
                <span className="day-head__sub">{g.tasks.length} done</span>
              </div>
              <TaskList tasks={g.tasks} today={today} />
            </div>
          ))}
        {body.kind === 'lists' &&
          body.groups.map((g) => (
            <div key={g.key}>
              <div className="day-head">
                <span className="list-dot" style={{ background: g.list.color }} />
                <span className="day-head__title">
                  {g.list.emoji ? `${g.list.emoji} ` : ''}
                  {g.list.name}
                </span>
                <span className="day-head__sub">{g.tasks.length}</span>
              </div>
              <TaskList tasks={g.tasks} today={today} showList={false} />
            </div>
          ))}
      </div>
    </section>
  );
}
