import { SlidersHorizontal } from 'lucide-react';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { DEFAULT_SORT, filtersActive, prefsFor } from '../../model/views';

export function SortButton({ viewKey, allowManual = true, showListFilter = false }: { viewKey: string; allowManual?: boolean; showListFilter?: boolean }) {
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const openSheet = useUI((s) => s.openSheet);
  const p = prefsFor(viewPrefs, viewKey);
  const active = filtersActive(p.filters) > 0 || p.sort !== (DEFAULT_SORT[viewKey] ?? 'manual');
  return (
    <button
      className={`icon-btn ${active ? 'icon-btn--active' : ''}`}
      aria-label="Sort and filter"
      onClick={() => openSheet({ kind: 'sort', viewKey, allowManual, showListFilter })}
    >
      <SlidersHorizontal size={21} />
    </button>
  );
}
