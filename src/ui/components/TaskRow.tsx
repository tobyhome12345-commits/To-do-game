import { memo, type HTMLAttributes } from 'react';
import { Bell, FileText, ListChecks, Repeat as RepeatIcon } from 'lucide-react';
import type { List, Task } from '../../model/types';
import { formatTime, relativeDay } from '../../model/dates';
import { Checkbox } from './Checkbox';
import { useUI } from '../../store/ui';
import { dragState, toggleWithAnimation } from '../actions';

export interface TaskRowProps {
  task: Task;
  list?: List;
  today: string;
  showDate?: boolean;
  showList?: boolean;
  /** collapse the row away after ticking (true in views that hide completed tasks) */
  collapse?: boolean;
  dragProps?: HTMLAttributes<HTMLDivElement>;
  dragging?: boolean;
}

function TaskRowInner({ task: t, list, today, showDate = true, showList = true, collapse = true, dragProps, dragging }: TaskRowProps) {
  const animating = useUI((s) => !!s.completing[t.id]);
  const openSheet = useUI((s) => s.openSheet);
  const done = t.completedAt != null;
  const overdue = !done && !!t.dueDate && t.dueDate < today;
  const subDone = t.subtasks.filter((s) => s.done).length;
  const leaving = animating && collapse;
  const isNew = Date.now() - t.createdAt < 1200;

  let due: string | null = null;
  if (t.dueDate) {
    const showD = showDate;
    due = [showD ? relativeDay(t.dueDate, today) : null, t.dueTime ? formatTime(t.dueTime) : null].filter(Boolean).join(', ');
  }

  const meta = [
    due && (
      <span key="due" className={`meta ${overdue ? 'meta--danger' : t.dueDate === today && !done ? 'meta--accent' : ''}`}>
        {due}
      </span>
    ),
    t.repeat && !done && (
      <span key="rep" className="meta" aria-label="Repeats">
        <RepeatIcon size={13} strokeWidth={2.4} />
      </span>
    ),
    t.reminder != null && t.dueDate && !done && (
      <span key="rem" className="meta" aria-label="Reminder set">
        <Bell size={13} strokeWidth={2.4} />
      </span>
    ),
    t.subtasks.length > 0 && (
      <span key="sub" className={`meta ${subDone === t.subtasks.length ? 'meta--ok' : ''}`}>
        <ListChecks size={13} strokeWidth={2.4} />
        {subDone}/{t.subtasks.length}
      </span>
    ),
    t.notes.trim() && (
      <span key="notes" className="meta" aria-label="Has notes">
        <FileText size={13} strokeWidth={2.4} />
      </span>
    ),
    showList && list && (
      <span key="list" className="meta meta--list">
        <i style={{ background: list.color }} />
        {list.name}
      </span>
    ),
  ].filter(Boolean);

  return (
    <div className={`task-wrap ${leaving ? 'task-wrap--out' : ''} ${isNew ? 'task-wrap--new' : ''}`}>
      <div className="task-wrap__inner">
        <div
          className={`task ${done ? 'task--done' : ''} ${animating ? 'task--ticking' : ''} ${dragging ? 'task--dragging' : ''} ${t.priority ? `task--p${t.priority}` : ''}`}
          onClick={() => Date.now() - dragState.lastEnd > 250 && openSheet({ kind: 'task', taskId: t.id })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openSheet({ kind: 'task', taskId: t.id })}
          {...dragProps}
        >
          <Checkbox
            checked={done}
            animating={animating}
            priority={t.priority}
            onToggle={() => toggleWithAnimation(t.id)}
            label={done ? `Mark “${t.title}” as not done` : `Complete “${t.title}”`}
          />
          <div className="task__body">
            <div className="task__title">
              {t.emoji && <span className="task__emoji">{t.emoji}</span>}
              <span className="task__text">{t.title || 'Untitled'}</span>
            </div>
            {meta.length > 0 && <div className="task__meta">{meta}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export const TaskRow = memo(TaskRowInner);
