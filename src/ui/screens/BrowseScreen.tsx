import { useMemo } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, GripVertical, Inbox, Layers, Plus, Sun } from 'lucide-react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { List } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { counts } from '../../model/views';
import { Header } from '../components/Header';
import { useToday } from '../hooks';
import { haptic } from '../../platform/native';
import { dragState } from '../actions';

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function BrowseScreen() {
  const today = useToday();
  const tasks = useData((s) => s.data.tasks);
  const lists = useData((s) => s.data.lists);
  const setListOrder = useData((s) => s.setListOrder);
  const setTab = useUI((s) => s.setTab);
  const push = useUI((s) => s.push);
  const openSheet = useUI((s) => s.openSheet);
  const c = useMemo(() => counts(tasks, today), [tasks, today]);
  const sorted = useMemo(() => [...lists].sort((a, b) => a.order - b.order), [lists]);

  const cards = [
    { id: 'today', label: 'Today', n: c.today + c.overdue, Icon: Sun, color: '#3b82f6', go: () => setTab('today') },
    { id: 'upcoming', label: 'Upcoming', n: c.upcoming, Icon: CalendarDays, color: '#f59e0b', go: () => setTab('upcoming') },
    { id: 'overdue', label: 'Overdue', n: c.overdue, Icon: AlertCircle, color: '#ef4444', go: () => push({ kind: 'smart', view: 'overdue' }) },
    { id: 'completed', label: 'Completed', n: c.completed, Icon: CheckCircle2, color: '#10b981', go: () => push({ kind: 'smart', view: 'completed' }) },
    { id: 'all', label: 'All tasks', n: c.all, Icon: Layers, color: '#64748b', go: () => push({ kind: 'smart', view: 'all' }) },
  ];

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    dragState.lastEnd = Date.now();
    if (!over || active.id === over.id) return;
    const ids = sorted.map((l) => l.id);
    setListOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    haptic('light');
  };

  return (
    <section className="screen">
      <Header title="Lists" />
      <div className="scroll">
        <div className="smart-grid">
          {cards.map(({ id, label, n, Icon, color, go }) => (
            <button key={id} className={`smart-card ${id === 'all' ? 'smart-card--wide' : ''}`} onClick={go} style={{ ['--card' as string]: color }}>
              <span className="smart-card__icon">
                <Icon size={20} strokeWidth={2.4} />
              </span>
              <span className="smart-card__n">{n}</span>
              <span className="smart-card__label">{label}</span>
            </button>
          ))}
        </div>

        <div className="section-title">
          My lists
          <button className="section-title__action" onClick={() => openSheet({ kind: 'list' })}>
            <Plus size={15} strokeWidth={2.8} style={{ verticalAlign: '-2px' }} /> New list
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragStart={() => haptic('medium')} onDragEnd={onDragEnd}>
          <SortableContext items={sorted.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="group lists-group">
              {sorted.map((l) => (
                <ListRow key={l.id} list={l} count={c.perList[l.id] ?? 0} onOpen={() => push({ kind: 'list', listId: l.id })} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <p className="hint">Long-press a list to drag it into a new order.</p>
      </div>
    </section>
  );
}

function ListRow({ list, count, onOpen }: { list: List; count: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' }}
      className={`list-row ${isDragging ? 'list-row--dragging' : ''}`}
      {...attributes}
      {...listeners}
      role="button"
      onClick={() => Date.now() - dragState.lastEnd > 250 && onOpen()}
    >
      <span className="list-badge" style={{ ['--lc' as string]: list.color }}>
        {list.emoji ?? (list.id === 'inbox' ? <Inbox size={18} /> : <span className="list-badge__dot" />)}
      </span>
      <span className="list-row__name">{list.name}</span>
      <span className="list-row__count">{count || ''}</span>
      {isDragging ? <GripVertical size={18} className="list-row__chev" /> : <ChevronRight size={18} className="list-row__chev" />}
    </div>
  );
}
