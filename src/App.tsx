import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Task } from './model/types';
import { useData } from './store/store';
import { useUI, type Route, type Tab } from './store/ui';
import { counts } from './model/views';
import { Header } from './ui/components/Header';
import { TabBar } from './ui/components/TabBar';
import { EmptyState } from './ui/components/EmptyState';
import { Snackbar } from './ui/components/Snackbar';
import { TodayScreen } from './ui/screens/TodayScreen';
import { useToday } from './ui/hooks';
import { BrowseScreen } from './ui/screens/BrowseScreen';
import { ListScreen } from './ui/screens/ListScreen';
import { SheetHost } from './ui/sheets/SheetHost';

function Placeholder({ title }: { title: string }) {
  return (
    <section className="screen">
      <Header title={title} />
      <div className="scroll">
        <EmptyState art="🚧" title="Coming up next" />
      </div>
    </section>
  );
}

function tabScreen(tab: Tab): ReactNode {
  switch (tab) {
    case 'today':
      return <TodayScreen />;
    case 'upcoming':
      return <Placeholder title="Upcoming" />;
    case 'browse':
      return <BrowseScreen />;
    case 'settings':
      return <Placeholder title="Settings" />;
  }
}

function routeScreen(r: Route): ReactNode {
  switch (r.kind) {
    case 'list':
      return <ListScreen key={r.listId} listId={r.listId} />;
    default:
      return <Placeholder title="…" />;
  }
}

/** What a new task gets by default, depending on where you are. */
function fabDefaults(tab: Tab, top: Route | undefined, today: string): Partial<Task> | null {
  if (top?.kind === 'list') return { listId: top.listId };
  if (top) return top.kind === 'search' ? null : {};
  if (tab === 'settings') return null;
  if (tab === 'today') return { dueDate: today };
  return {};
}

export function App() {
  const tab = useUI((s) => s.tab);
  const stack = useUI((s) => s.stack);
  const openSheet = useUI((s) => s.openSheet);
  const tasks = useData((s) => s.data.tasks);
  const snack = useData((s) => s.snack);
  const today = useToday();
  const top = stack[stack.length - 1];
  const c = counts(tasks, today);
  const fab = fabDefaults(tab, top, today);

  return (
    <div className="app">
      {top ? routeScreen(top) : tabScreen(tab)}
      {fab && (
        <button className={`fab ${snack ? 'fab--lifted' : ''}`} aria-label="New task" onClick={() => openSheet({ kind: 'task', draft: fab })}>
          <Plus size={28} strokeWidth={2.6} />
        </button>
      )}
      <Snackbar />
      <TabBar badges={{ today: c.today + c.overdue }} />
      <SheetHost />
    </div>
  );
}
