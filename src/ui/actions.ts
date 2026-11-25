import type { ID } from '../model/types';
import { useData } from '../store/store';
import { useUI } from '../store/ui';
import { haptic } from '../platform/native';

export function prefersReducedMotion() {
  return useData.getState().data.settings.reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Tick (or untick) with the celebration animation first, then commit the change. */
export function toggleWithAnimation(id: ID) {
  const ui = useUI.getState();
  if (ui.completing[id]) return;
  const t = useData.getState().data.tasks.find((x) => x.id === id);
  if (!t) return;
  haptic(t.completedAt == null ? 'success' : 'light');
  ui.setCompleting(id, true);
  setTimeout(
    () => {
      useData.getState().toggleComplete(id);
      useUI.getState().setCompleting(id, false);
    },
    prefersReducedMotion() ? 150 : 760,
  );
}

/** Time of the last drag drop, so the click that ends a drag doesn't also open the task. */
export const dragState = { lastEnd: 0 };
