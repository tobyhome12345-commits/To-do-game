import type { ReactNode } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useUI } from '../../store/ui';

interface Props {
  eyebrow?: string;
  title: ReactNode;
  color?: string;
  back?: boolean;
  actions?: ReactNode;
  search?: boolean;
}

export function Header({ eyebrow, title, color, back, actions, search = true }: Props) {
  const pop = useUI((s) => s.pop);
  const push = useUI((s) => s.push);
  return (
    <header className="header">
      <div className="header__titles">
        {(back || eyebrow) && (
          <div className="header__top">
            {back && (
              <button className="icon-btn back-btn" onClick={pop} aria-label="Back">
                <ChevronLeft size={24} strokeWidth={2.4} />
              </button>
            )}
            {eyebrow && <div className="header__eyebrow">{eyebrow}</div>}
          </div>
        )}
        <h1 className="header__title">
          {color && <span className="dot" style={{ background: color }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </h1>
      </div>
      <div className="header__actions">
        {actions}
        {search && (
          <button className="icon-btn" aria-label="Search" onClick={() => push({ kind: 'search' })}>
            <Search size={22} />
          </button>
        )}
      </div>
    </header>
  );
}
