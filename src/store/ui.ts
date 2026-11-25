import { create } from 'zustand';
import type { ID, Task } from '../model/types';
import type { ParsedBackup } from './backup';

export type Tab = 'today' | 'upcoming' | 'browse' | 'settings';
export type SmartViewId = 'overdue' | 'completed' | 'all';

export type Route =
  | { kind: 'list'; listId: ID }
  | { kind: 'smart'; view: SmartViewId }
  | { kind: 'search' };

export type Sheet =
  | { kind: 'task'; taskId?: ID; draft?: Partial<Task> }
  | { kind: 'list'; listId?: ID }
  | { kind: 'sort'; viewKey: string; allowManual: boolean; showListFilter: boolean }
  | { kind: 'deleteList'; listId: ID }
  | { kind: 'import'; backup: ParsedBackup }
  | null;

interface UIState {
  tab: Tab;
  stack: Route[];
  sheet: Sheet;
  /** tasks currently playing the tick animation (committed after it finishes) */
  completing: Record<ID, true>;
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  pop: () => void;
  openSheet: (s: NonNullable<Sheet>) => void;
  closeSheet: () => void;
  /** Android back button. Returns false when there's nothing left to go back to. */
  back: () => boolean;
  setCompleting: (id: ID, on: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  tab: 'today',
  stack: [],
  sheet: null,
  completing: {},
  setTab: (tab) => set({ tab, stack: [] }),
  push: (r) => set((s) => ({ stack: [...s.stack, r] })),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  back: () => {
    const s = get();
    if (s.sheet) {
      set({ sheet: null });
      return true;
    }
    if (s.stack.length) {
      set({ stack: s.stack.slice(0, -1) });
      return true;
    }
    if (s.tab !== 'today') {
      set({ tab: 'today' });
      return true;
    }
    return false;
  },
  setCompleting: (id, on) =>
    set((s) => {
      const next = { ...s.completing };
      if (on) next[id] = true;
      else delete next[id];
      return { completing: next };
    }),
}));
