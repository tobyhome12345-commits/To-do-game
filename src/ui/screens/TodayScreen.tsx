import { useMemo } from 'react';
import { useData } from '../../store/store';
import { Header } from '../components/Header';
import { QuickAdd } from '../components/QuickAdd';
import { TaskList } from '../components/TaskList';
import { EmptyState } from '../components/EmptyState';
import { SortButton } from '../components/SortButton';
import { applyFilters, prefsFor, sortTasks, todayView } from '../../model/views';
import { longDate, toLocalDate } from '../../model/dates';
import { useToday } from '../hooks';

export function TodayScreen() {
  const today = useToday();
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const moveTasksToDate = useData((s) => s.moveTasksToDate);
  const prefs = prefsFor(viewPrefs, 'today');

  const { overdue, todays, doneToday } = useMemo(() => {
    const v = todayView(tasks, today);
    const f = (ts: typeof tasks) => sortTasks(applyFilters(ts, prefs.filters, today, true), prefs.sort, lists);
    return {
      overdue: sortTasks(applyFilters(v.overdue, prefs.filters, today, true), 'due', lists),
      todays: f(v.today),
      doneToday: tasks.filter((t) => t.completedAt != null && toLocalDate(t.completedAt) === today).length,
    };
  }, [tasks, lists, today, prefs.sort, prefs.filters]);

  const total = todays.length + overdue.length + doneToday;
  const pct = total ? doneToday / total : 0;
  const C = 2 * Math.PI * 19;

  return (
    <section className="screen">
      <Header eyebrow={longDate(today)} title="Today" actions={<SortButton viewKey="today" allowManual />} />
      <div className="scroll">
        <QuickAdd defaults={{ dueDate: today }} placeholder="Add to today…  try “Gym 6pm !high”" />

        {total > 0 && (
          <div className="progress">
            <svg className="progress__ring" viewBox="0 0 44 44" aria-hidden>
              <circle className="bg" cx="22" cy="22" r="19" />
              <circle className="fg" cx="22" cy="22" r="19" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
            </svg>
            <div>
              <div className="progress__title">
                {doneToday === total ? 'All done for today! 🎉' : `${doneToday} of ${total} done today`}
              </div>
              <div className="progress__sub">
                {doneToday === total
                  ? 'Go enjoy yourself.'
                  : pct >= 0.5
                    ? 'Over halfway there — keep going! 💪'
                    : todays.length + overdue.length === 1
                      ? 'Just one thing left.'
                      : `${todays.length + overdue.length} things left.`}
              </div>
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <>
            <div className="section-title section-title--danger">
              Overdue <span className="section-title__count">{overdue.length}</span>
              <button className="section-title__action" onClick={() => moveTasksToDate(overdue.map((t) => t.id), today)}>
                Move to today
              </button>
            </div>
            <TaskList tasks={overdue} today={today} />
          </>
        )}

        {todays.length > 0 && (
          <>
            {overdue.length > 0 && (
              <div className="section-title">
                Today <span className="section-title__count">{todays.length}</span>
              </div>
            )}
            <TaskList tasks={todays} today={today} showDate={false} sortable={prefs.sort === 'manual'} />
          </>
        )}

        {todays.length === 0 && overdue.length === 0 && (
          <EmptyState
            art={doneToday ? '🏆' : '🌤️'}
            title={doneToday ? 'You cleared today!' : 'Nothing due today'}
            text={doneToday ? `${doneToday} task${doneToday === 1 ? '' : 's'} done. Legendary.` : 'Enjoy the free time — or add something above to get ahead.'}
          />
        )}
      </div>
    </section>
  );
}
