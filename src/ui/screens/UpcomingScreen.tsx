import { useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { applyFilters, prefsFor, sortTasks, upcomingView } from '../../model/views';
import { addDays, parts, relativeDay, shortDate, weekday, weekdayShort } from '../../model/dates';
import { Header } from '../components/Header';
import { QuickAdd } from '../components/QuickAdd';
import { TaskList } from '../components/TaskList';
import { SortButton } from '../components/SortButton';
import { useToday } from '../hooks';

export function UpcomingScreen() {
  const today = useToday();
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const openSheet = useUI((s) => s.openSheet);
  const prefs = prefsFor(viewPrefs, 'upcoming');
  const scrollRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () =>
      upcomingView(tasks, today).map((g) => ({
        ...g,
        tasks: sortTasks(applyFilters(g.tasks, prefs.filters, today, true), prefs.sort === 'manual' ? 'manual' : prefs.sort, lists),
      })),
    [tasks, today, lists, prefs.sort, prefs.filters],
  );
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);

  const jump = (key: string) => {
    const el = scrollRef.current?.querySelector(`[data-day="${key}"]`) as HTMLElement | null;
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  };

  return (
    <section className="screen">
      <Header eyebrow={total ? `${total} task${total === 1 ? '' : 's'} coming up` : 'Next 2 weeks'} title="Upcoming" actions={<SortButton viewKey="upcoming" allowManual />} />
      <div className="day-strip" role="tablist" aria-label="Jump to day">
        {groups
          .filter((g) => g.date)
          .map((g) => {
            const d = g.date!;
            const [, , day] = parts(d);
            const n = g.tasks.length;
            return (
              <button key={g.key} className={`day-pill ${n ? 'day-pill--has' : ''} ${weekday(d) === 0 || weekday(d) === 6 ? 'day-pill--weekend' : ''}`} onClick={() => jump(g.key)} aria-label={`${relativeDay(d, today)}: ${n} tasks`}>
                <span className="day-pill__wd">{weekdayShort(weekday(d)).slice(0, 2)}</span>
                <span className="day-pill__n">{day}</span>
                <span className="day-pill__dots">
                  {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </button>
            );
          })}
      </div>
      <div className="scroll" ref={scrollRef}>
        <QuickAdd defaults={{ dueDate: addDays(today, 1) }} placeholder="Add for tomorrow…  or type “fri 4pm”" />
        {groups.map((g) => (
          <div key={g.key} data-day={g.key} className={`day ${g.tasks.length ? '' : 'day--empty'}`}>
            <div className="day-head">
              <span className="day-head__title">{g.date ? relativeDay(g.date, today) : 'Later'}</span>
              {g.date && <span className="day-head__sub">{diffLabel(g.date, today)}</span>}
              {g.date && (
                <button className="icon-btn icon-btn--sm day-head__add" aria-label={`Add task for ${relativeDay(g.date, today)}`} onClick={() => openSheet({ kind: 'task', draft: { dueDate: g.date! } })}>
                  <Plus size={18} />
                </button>
              )}
            </div>
            {g.tasks.length > 0 ? (
              <TaskList tasks={g.tasks} today={today} showDate={!g.date} sortable={prefs.sort === 'manual' && !!g.date} />
            ) : (
              <div className="day-empty">Nothing planned</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function diffLabel(d: string, today: string) {
  const rel = relativeDay(d, today);
  // relativeDay already shows weekday names for this week; add the calendar date
  return rel === 'Tomorrow' ? `${weekdayShort(weekday(d))} ${shortDate(d, today)}` : rel.includes(' ') ? '' : shortDate(d, today);
}
