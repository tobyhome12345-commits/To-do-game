import { useMemo, useRef, useState } from 'react';
import { ArrowUp, CalendarDays, Clock, Flag, Maximize2, Plus, Repeat, Tag } from 'lucide-react';
import type { Task } from '../../model/types';
import { parseQuickAdd } from '../../model/quickAdd';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { relativeDay, todayStr } from '../../model/dates';
import { haptic } from '../../platform/native';

const CHIP_ICON = { date: CalendarDays, time: Clock, priority: Flag, list: Tag, repeat: Repeat };

export function QuickAdd({ defaults, placeholder }: { defaults: Partial<Task>; placeholder?: string }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lists = useData((s) => s.data.lists);
  const weekStart = useData((s) => s.data.settings.weekStart);
  const addTask = useData((s) => s.addTask);
  const showSnack = useData((s) => s.showSnack);
  const openSheet = useUI((s) => s.openSheet);

  const parsed = useMemo(
    () => (text.trim() ? parseQuickAdd(text, { today: todayStr(), lists, weekStart }) : null),
    [text, lists, weekStart],
  );

  const draft = (): Partial<Task> => {
    const p = parsed!;
    const d: Partial<Task> = { ...defaults, title: p.title };
    if (p.dueDate) d.dueDate = p.dueDate;
    if (p.dueTime) d.dueTime = p.dueTime;
    if (p.priority) d.priority = p.priority;
    if (p.listId) d.listId = p.listId;
    if (p.repeat) d.repeat = p.repeat;
    return d;
  };

  const submit = () => {
    if (!parsed) return;
    const d = draft();
    const t = addTask(d);
    haptic('light');
    // If the new task lands somewhere other than the screen you're on, say where it went.
    const otherDay = (defaults.dueDate ?? null) !== (t.dueDate ?? null);
    const otherList = defaults.listId != null && defaults.listId !== t.listId;
    if (otherDay || otherList) {
      const l = lists.find((x) => x.id === t.listId);
      const bits = [t.dueDate ? `for ${relativeDay(t.dueDate, todayStr()).replace(/^(Today|Tomorrow)$/, (m) => m.toLowerCase())}` : 'with no date', l && `${l.emoji ?? ''} ${l.name}`.trim()];
      showSnack(`Added ${bits.filter(Boolean).join(' · ')}`, undefined, '📅');
    }
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="quickadd">
      <form
        className="quickadd__bar"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span className="quickadd__plus" aria-hidden>
          <Plus size={22} strokeWidth={2.6} />
        </span>
        <input
          ref={inputRef}
          className="quickadd__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? 'Add a task…'}
          enterKeyHint="done"
          aria-label="Quick add a task"
          autoComplete="off"
          autoCapitalize="sentences"
        />
        {parsed && (
          <button
            type="button"
            className="quickadd__go"
            aria-label="More options"
            onClick={() => {
              openSheet({ kind: 'task', draft: draft() });
              setText('');
            }}
          >
            <Maximize2 size={19} />
          </button>
        )}
        <button type="submit" className={`quickadd__go ${parsed ? 'quickadd__go--send' : ''}`} aria-label="Add task" disabled={!parsed}>
          <ArrowUp size={20} strokeWidth={2.6} />
        </button>
      </form>
      {parsed && parsed.chips.length > 0 && (
        <div className="quickadd__chips" aria-live="polite">
          {parsed.chips.map((c) => {
            const Icon = CHIP_ICON[c.kind];
            return (
              <span key={c.kind} className={`qchip qchip--${c.kind}`}>
                <Icon size={13} strokeWidth={2.6} />
                {c.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
