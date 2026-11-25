import { CalendarDays, LayoutGrid, Settings, Sun } from 'lucide-react';
import { useUI, type Tab } from '../../store/ui';

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', Icon: Sun },
  { id: 'upcoming', label: 'Upcoming', Icon: CalendarDays },
  { id: 'browse', label: 'Lists', Icon: LayoutGrid },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export function TabBar({ badges }: { badges?: Partial<Record<Tab, number>> }) {
  const tab = useUI((s) => s.tab);
  const stack = useUI((s) => s.stack);
  const setTab = useUI((s) => s.setTab);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id && (stack.length === 0 || id === 'browse');
        const badge = badges?.[id];
        return (
          <button
            key={id}
            className={`tab ${tab === id ? 'tab--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <span className="tab__icon">
              <Icon size={21} strokeWidth={tab === id ? 2.4 : 2} />
              {badge ? <span className="tab__badge">{badge > 99 ? '99+' : badge}</span> : null}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
