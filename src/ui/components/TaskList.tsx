import { useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { List, Task } from '../../model/types';
import { orderBetween } from '../../model/views';
import { useData } from '../../store/store';
import { TaskRow, type TaskRowProps } from './TaskRow';
import { haptic } from '../../platform/native';
import { dragState } from '../actions';

type RowOpts = Pick<TaskRowProps, 'showDate' | 'showList' | 'collapse'>;

interface Props extends RowOpts {
  tasks: Task[];
  today: string;
  /** enable long-press drag to reorder (only makes sense in manual sort) */
  sortable?: boolean;
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });


export function TaskList({ tasks, today, sortable, ...opts }: Props) {
  const lists = useData((s) => s.data.lists);
  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  if (!sortable || tasks.length < 2) {
    return (
      <div className="task-list">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} list={listMap.get(t.listId)} today={today} {...opts} />
        ))}
      </div>
    );
  }
  return <SortableTaskList tasks={tasks} today={today} listMap={listMap} opts={opts} />;
}

function SortableTaskList({ tasks, today, listMap, opts }: { tasks: Task[]; today: string; listMap: Map<string, List>; opts: RowOpts }) {
  const setOrders = useData((s) => s.setOrders);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = tasks.map((t) => t.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    dragState.lastEnd = Date.now();
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const moved = arrayMove(tasks, from, to);
    const prev = moved[to - 1];
    const next = moved[to + 1];
    const o = orderBetween(prev?.order, next?.order);
    if ((prev && o <= prev.order) || (next && o >= next.order)) {
      // Orders collided: re-space the whole visible list, keeping it inside its current range.
      const lo = Math.min(...tasks.map((t) => t.order));
      setOrders(moved.map((t, i) => [t.id, lo + i]));
    } else {
      setOrders([[String(active.id), o]]);
    }
    haptic('light');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragStart={() => haptic('medium')}
      onDragEnd={onDragEnd}
      onDragCancel={() => (dragState.lastEnd = Date.now())}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.map((t) => (
            <SortableRow key={t.id} task={t} list={listMap.get(t.listId)} today={today} {...opts} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow(props: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 5 : undefined }}
    >
      <TaskRow {...props} dragProps={{ ...attributes, ...listeners, role: 'button' }} dragging={isDragging} />
    </div>
  );
}
