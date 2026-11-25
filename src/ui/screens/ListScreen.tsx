import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import type { ID } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { applyFilters, listView, prefsFor, sortTasks } from '../../model/views';
import { Header } from '../components/Header';
import { QuickAdd } from '../components/QuickAdd';
import { TaskList } from '../components/TaskList';
import { EmptyState } from '../components/EmptyState';
import { SortButton } from '../components/SortButton';
import { useToday } from '../hooks';

export function ListScreen({ listId }: { listId: ID }) {
  const today = useToday();
  const list = useData((s) => s.data.lists.find((l) => l.id === listId));
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const showCompletedDefault = useData((s) => s.data.settings.showCompletedInLists);
  const clearCompleted = useData((s) => s.clearCompleted);
  const openSheet = useUI((s) => s.openSheet);
  const pop = useUI((s) => s.pop);
  const [showDone, setShowDone] = useState(showCompletedDefault);
  const key = `list:${listId}`;
  const prefs = prefsFor(viewPrefs, key);

  const { open, done } = useMemo(() => {
    const v = listView(tasks, listId);
    return { open: sortTasks(applyFilters(v.open, prefs.filters, today, true), prefs.sort, lists), done: v.done };
  }, [tasks, listId, lists, today, prefs.sort, prefs.filters]);

  useEffect(() => {
    if (!list) pop();
  }, [list, pop]);
  if (!list) return null;

  return (
    <section className="screen" style={{ ['--list' as string]: list.color }}>
      <Header
        back
        eyebrow={`${open.length} open${done.length ? ` · ${done.length} done` : ''}`}
        title={
          <>
            {list.emoji && <span className="header__emoji">{list.emoji}</span>}
            {list.name}
          </>
        }
        color={list.emoji ? undefined : list.color}
        actions={
          <>
            <SortButton viewKey={key} allowManual />
            <button className="icon-btn" aria-label="Edit list" onClick={() => openSheet({ kind: 'list', listId })}>
              <Pencil size={20} />
            </button>
          </>
        }
      />
      <div className="list-accent" />
      <div className="scroll">
        <QuickAdd defaults={{ listId }} placeholder={`Add to ${list.name}…`} />
        {open.length > 0 ? (
          <TaskList tasks={open} today={today} showList={false} sortable={prefs.sort === 'manual'} />
        ) : (
          <EmptyState art={list.emoji ?? '✨'} title={done.length ? 'All done here!' : 'This list is empty'} text={done.length ? 'Every task in this list is ticked off.' : 'Type above to add your first task.'} />
        )}

        {done.length > 0 && (
          <>
            <div className="section-title">
              <button className="collapse-btn" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                <ChevronDown size={16} strokeWidth={2.6} style={{ transform: showDone ? 'none' : 'rotate(-90deg)', transition: 'transform 200ms' }} />
                Completed <span className="section-title__count">{done.length}</span>
              </button>
              {showDone && (
                <button className="section-title__action" onClick={() => clearCompleted(done.map((t) => t.id))}>
                  Clear
                </button>
              )}
            </div>
            {showDone && <TaskList tasks={done} today={today} showList={false} />}
          </>
        )}
      </div>
    </section>
  );
}
