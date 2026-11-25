import { Plus } from 'lucide-react';
import { useUI } from './store/ui';
import { Header } from './ui/components/Header';
import { TabBar } from './ui/components/TabBar';
import { EmptyState } from './ui/components/EmptyState';
import { longDate, todayStr } from './model/dates';

export function App() {
  const tab = useUI((s) => s.tab);
  const today = todayStr();
  return (
    <div className="app">
      {tab === 'today' && (
        <section className="screen">
          <Header eyebrow={longDate(today)} title="Today" />
          <div className="scroll">
            <EmptyState art="🌤️" title="Nothing due today" text="Enjoy the free time — or add something to get ahead." />
          </div>
        </section>
      )}
      {tab === 'upcoming' && (
        <section className="screen">
          <Header eyebrow="Next 2 weeks" title="Upcoming" />
          <div className="scroll"><EmptyState art="🗓️" title="All clear ahead" text="Tasks with future due dates show up here." /></div>
        </section>
      )}
      {tab === 'browse' && (
        <section className="screen">
          <Header title="Lists" />
          <div className="scroll"><EmptyState art="🗂️" title="Your lists" text="Smart views and lists will live here." /></div>
        </section>
      )}
      {tab === 'settings' && (
        <section className="screen">
          <Header title="Settings" search={false} />
          <div className="scroll"><EmptyState art="⚙️" title="Settings" /></div>
        </section>
      )}
      <button className="fab" aria-label="Add task"><Plus size={28} strokeWidth={2.6} /></button>
      <TabBar />
    </div>
  );
}
