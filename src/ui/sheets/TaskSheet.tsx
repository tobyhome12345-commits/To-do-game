import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, Check, Clock, Flag, ListChecks, Plus, Repeat as RepeatIcon, RotateCcw, Smile, Tag, Trash2, X } from 'lucide-react';
import type { ID, Priority, Subtask, Task } from '../../model/types';
import { INBOX_ID, REMINDER_OPTIONS } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { uid } from '../../model/data';
import { addDays, formatTime, relativeDay, startOfWeek, todayStr, toLocalDate } from '../../model/dates';
import { describeRepeat } from '../../model/recurrence';
import { Sheet, useCloseSheet } from '../components/Sheet';
import { Chip, Segmented } from '../components/Controls';
import { EmojiPicker } from '../components/EmojiPicker';
import { RepeatEditor } from '../components/RepeatEditor';
import { Checkbox } from '../components/Checkbox';
import { requestReminderPermission } from '../../platform/reminders';
import { haptic } from '../../platform/native';
import { toggleWithAnimation } from '../actions';

type Draft = Pick<Task, 'title' | 'notes' | 'emoji' | 'priority' | 'dueDate' | 'dueTime' | 'reminder' | 'repeat' | 'subtasks' | 'listId'>;
const FIELDS: (keyof Draft)[] = ['title', 'notes', 'emoji', 'priority', 'dueDate', 'dueTime', 'reminder', 'repeat', 'subtasks', 'listId'];

function toDraft(t: Partial<Task>, defaultReminder: number | null): Draft {
  return {
    title: t.title ?? '',
    notes: t.notes ?? '',
    emoji: t.emoji,
    priority: t.priority ?? 0,
    dueDate: t.dueDate ?? null,
    dueTime: t.dueTime ?? null,
    reminder: t.reminder !== undefined ? t.reminder : t.dueDate ? defaultReminder : null,
    repeat: t.repeat ?? null,
    subtasks: t.subtasks ?? [],
    listId: t.listId ?? INBOX_ID,
  };
}

const PRIORITIES: { value: Priority; label: string; color?: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low', color: 'var(--p1)' },
  { value: 2, label: 'Medium', color: 'var(--p2)' },
  { value: 3, label: 'High', color: 'var(--p3)' },
];

export function TaskSheet({ taskId, draft }: { taskId?: ID; draft?: Partial<Task> }) {
  const closeSheet = useUI((s) => s.closeSheet);
  const existing = useData((s) => (taskId ? s.data.tasks.find((t) => t.id === taskId) : undefined));
  const gone = !!taskId && !existing;
  useEffect(() => {
    if (gone) closeSheet();
  }, [gone, closeSheet]);
  if (gone) return null;
  return <TaskSheetInner key={taskId ?? 'new'} existing={existing} initial={draft} onClose={closeSheet} />;
}

function TaskSheetInner({ existing, initial, onClose }: { existing?: Task; initial?: Partial<Task>; onClose: () => void }) {
  const defaultReminder = useData((s) => s.data.settings.defaultReminder);
  const updateTask = useData((s) => s.updateTask);
  const [d, setD] = useState<Draft>(() => toDraft(existing ?? initial ?? {}, defaultReminder));
  const latest = useRef(d);
  latest.current = d;
  const id = existing?.id;

  // Editing an existing task saves as you go (and once more when the sheet closes).
  const commit = () => {
    if (!id) return;
    const cur = useData.getState().data.tasks.find((t) => t.id === id);
    if (!cur) return;
    const patch: Partial<Task> = {};
    for (const k of FIELDS) {
      if (JSON.stringify(latest.current[k]) !== JSON.stringify(cur[k])) (patch as Record<string, unknown>)[k] = latest.current[k];
    }
    if (patch.title !== undefined && !patch.title.trim()) delete patch.title;
    if (Object.keys(patch).length) updateTask(id, patch);
  };
  useEffect(() => {
    if (!id) return;
    const h = setTimeout(commit, 250);
    return () => clearTimeout(h);
  });
  useEffect(() => () => commit(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet onClose={onClose} label={id ? 'Edit task' : 'New task'} size="tall" footer={<Footer taskId={id} draft={d} />}>
      <TaskForm d={d} setD={setD} existing={existing} />
    </Sheet>
  );
}

function TaskForm({ d, setD, existing }: { d: Draft; setD: React.Dispatch<React.SetStateAction<Draft>>; existing?: Task }) {
  const settings = useData((s) => s.data.settings);
  const lists = useData((s) => s.data.lists);
  const isNew = !existing;
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [newSub, setNewSub] = useState('');
  const today = todayStr();

  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));

  const setDue = (date: string | null) => {
    setD((p) => {
      const next: Draft = { ...p, dueDate: date };
      if (!date) {
        next.dueTime = null;
        next.repeat = null;
      } else {
        if (!p.dueDate && p.reminder == null && isNew) next.reminder = settings.defaultReminder;
        if (p.repeat) next.repeat = { ...p.repeat, anchor: date };
      }
      return next;
    });
  };

  const setReminder = (r: number | null) => {
    set({ reminder: r });
    if (r != null) void requestReminderPermission();
  };

  const nextWeek = addDays(startOfWeek(today, settings.weekStart), 7);
  const quickDates: { label: string; date: string }[] = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next week', date: nextWeek },
  ];
  const customDate = d.dueDate && !quickDates.some((q) => q.date === d.dueDate);

  const updateSub = (id: string, patch: Partial<Subtask>) => set({ subtasks: d.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const addSub = () => {
    const title = newSub.trim();
    if (!title) return;
    set({ subtasks: [...d.subtasks, { id: uid(), title, done: false }] });
    setNewSub('');
  };
  const subDone = d.subtasks.filter((s) => s.done).length;

  return (
    <div className="tform">
      {existing?.completedAt != null && (
        <div className="tform__done-banner">
          <Check size={16} strokeWidth={3} /> Completed {relativeDay(toLocalDate(existing.completedAt), today).toLowerCase()}
        </div>
      )}

      <div className="tform__head">
        <button
          type="button"
          className={`emoji-btn ${d.emoji ? 'emoji-btn--set' : ''} ${emojiOpen ? 'emoji-btn--open' : ''}`}
          onClick={() => setEmojiOpen((o) => !o)}
          aria-label={d.emoji ? `Emoji ${d.emoji}, change` : 'Add an emoji'}
        >
          {d.emoji ?? <Smile size={22} />}
        </button>
        <textarea
          className="tform__title"
          placeholder="What do you need to do?"
          value={d.title}
          rows={1}
          autoFocus={isNew && !d.title}
          onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          ref={autoGrow}
          aria-label="Task title"
        />
      </div>

      {emojiOpen && (
        <EmojiPicker
          value={d.emoji}
          onPick={(e) => {
            set({ emoji: e });
            setEmojiOpen(false);
            haptic('light');
          }}
        />
      )}

      <textarea className="tform__notes" placeholder="Notes" value={d.notes} onChange={(e) => set({ notes: e.target.value })} ref={autoGrow} rows={2} aria-label="Notes" />

      {/* ---- Subtasks ---- */}
      <section className="tform__section">
        <div className="tform__label">
          <ListChecks size={17} /> Checklist {d.subtasks.length > 0 && <span className="tform__count">{subDone}/{d.subtasks.length}</span>}
        </div>
        <div className="subtasks">
          {d.subtasks.map((s) => (
            <div key={s.id} className={`subtask ${s.done ? 'subtask--done' : ''}`}>
              <Checkbox size="s" checked={s.done} onToggle={() => { updateSub(s.id, { done: !s.done }); haptic('light'); }} label={s.done ? `Untick ${s.title}` : `Tick ${s.title}`} />
              <input className="subtask__input" value={s.title} onChange={(e) => updateSub(s.id, { title: e.target.value })} aria-label="Subtask" />
              <button type="button" className="icon-btn icon-btn--sm" aria-label={`Remove ${s.title}`} onClick={() => set({ subtasks: d.subtasks.filter((x) => x.id !== s.id) })}>
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="subtask subtask--new">
            <Plus size={18} className="subtask__plus" />
            <input
              className="subtask__input"
              placeholder="Add a step"
              value={newSub}
              enterKeyHint="enter"
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSub();
                }
              }}
              onBlur={addSub}
              aria-label="New subtask"
            />
          </div>
        </div>
      </section>

      {/* ---- When ---- */}
      <section className="tform__section">
        <div className="tform__label">
          <CalendarDays size={17} /> Due
        </div>
        <div className="chips">
          <Chip active={!d.dueDate} onClick={() => setDue(null)}>
            No date
          </Chip>
          {quickDates.map((q) => (
            <Chip key={q.label} active={d.dueDate === q.date} onClick={() => setDue(q.date)}>
              {q.label}
            </Chip>
          ))}
          <label className={`chip chip--picker ${customDate ? 'chip--on' : ''}`}>
            <CalendarDays size={15} />
            {customDate ? relativeDay(d.dueDate!, today) : 'Pick date'}
            <input type="date" value={d.dueDate ?? ''} onChange={(e) => e.target.value && setDue(e.target.value)} aria-label="Pick a date" />
          </label>
        </div>

        {d.dueDate && (
          <div className="tform__grid">
            <label className={`field ${d.dueTime ? 'field--set' : ''}`}>
              <Clock size={17} />
              <span className="field__value">{d.dueTime ? formatTime(d.dueTime) : 'Add time'}</span>
              <input type="time" value={d.dueTime ?? ''} onChange={(e) => set({ dueTime: e.target.value || null })} aria-label="Due time" />
              {d.dueTime && (
                <button type="button" className="field__clear" aria-label="Remove time" onClick={(e) => { e.preventDefault(); set({ dueTime: null }); }}>
                  <X size={15} />
                </button>
              )}
            </label>
            <label className={`field ${d.reminder != null ? 'field--set' : ''}`}>
              <Bell size={17} />
              <span className="field__value">{reminderLabel(d.reminder, d.dueTime, settings.allDayReminderTime)}</span>
              <select
                value={d.reminder == null ? '' : String(d.reminder)}
                onChange={(e) => setReminder(e.target.value === '' ? null : Number(e.target.value))}
                aria-label="Reminder"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={String(o.value)} value={o.value == null ? '' : String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      {d.dueDate && (
        <section className="tform__section">
          <div className="tform__label">
            <RepeatIcon size={17} /> Repeat {d.repeat && <span className="tform__count">{describeRepeat(d.repeat, settings.weekStart)}</span>}
          </div>
          <RepeatEditor value={d.repeat} dueDate={d.dueDate} weekStart={settings.weekStart} onChange={(repeat) => set({ repeat })} />
        </section>
      )}

      {/* ---- Priority ---- */}
      <section className="tform__section">
        <div className="tform__label">
          <Flag size={17} /> Priority
        </div>
        <Segmented
          label="Priority"
          value={d.priority}
          onChange={(priority) => set({ priority })}
          options={PRIORITIES.map((p) => ({ value: p.value, color: p.color, label: p.label }))}
        />
      </section>

      {/* ---- List ---- */}
      <section className="tform__section">
        <div className="tform__label">
          <Tag size={17} /> List
        </div>
        <div className="chips">
          {[...lists].sort((a, b) => a.order - b.order).map((l) => (
            <Chip key={l.id} active={d.listId === l.id} color={l.color} onClick={() => set({ listId: l.id })} className="chip--list">
              <i className="chip__dot" />
              {l.emoji && <span>{l.emoji}</span>}
              {l.name}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}

function Footer({ taskId, draft }: { taskId?: ID; draft: Draft }) {
  const close = useCloseSheet();
  const addTask = useData((s) => s.addTask);
  const deleteTask = useData((s) => s.deleteTask);
  const existing = useData((s) => (taskId ? s.data.tasks.find((t) => t.id === taskId) : undefined));

  if (!taskId) {
    const ok = !!draft.title.trim();
    return (
      <>
        <button type="button" className="btn" onClick={close}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary btn--grow"
          disabled={!ok}
          onClick={() => {
            addTask({ ...draft, title: draft.title.trim() });
            haptic('success');
            close();
          }}
        >
          <Plus size={19} strokeWidth={2.6} /> Add task
        </button>
      </>
    );
  }
  const done = existing?.completedAt != null;
  return (
    <>
      <button
        type="button"
        className="btn btn--danger btn--icon"
        aria-label="Delete task"
        onClick={() => {
          close();
          setTimeout(() => deleteTask(taskId), 210);
        }}
      >
        <Trash2 size={19} />
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => {
          close();
          setTimeout(() => toggleWithAnimation(taskId), 230);
        }}
      >
        {done ? <RotateCcw size={18} /> : <Check size={19} strokeWidth={2.6} />}
        {done ? 'Not done' : 'Mark done'}
      </button>
      <button type="button" className="btn btn--primary btn--grow" onClick={close}>
        Done
      </button>
    </>
  );
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const fit = () => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };
  fit();
  el.oninput = fit;
}

function reminderLabel(r: number | null, dueTime: string | null, allDay: string): string {
  if (r == null) return 'No reminder';
  if (r === 0) return dueTime ? 'On time' : `At ${formatTime(allDay)}`;
  return REMINDER_OPTIONS.find((o) => o.value === r)?.label ?? `${r} min before`;
}
