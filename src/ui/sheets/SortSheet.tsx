import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { DEFAULT_SORT, prefsFor } from '../../model/views';
import { defaultFilters } from '../../model/types';
import { Sheet, useCloseSheet } from '../components/Sheet';
import { FilterControls, SortPicker } from '../components/FilterControls';

export function SortSheet({ viewKey, allowManual, showListFilter }: { viewKey: string; allowManual: boolean; showListFilter: boolean }) {
  const closeSheet = useUI((s) => s.closeSheet);
  const viewPrefs = useData((s) => s.data.settings.viewPrefs);
  const setViewPrefs = useData((s) => s.setViewPrefs);
  const prefs = prefsFor(viewPrefs, viewKey);
  return (
    <Sheet onClose={closeSheet} label="Sort and filter" title="Sort & filter" footer={<SortFooter viewKey={viewKey} />}>
      <div className="tform__label">Sort by</div>
      <SortPicker value={prefs.sort} allowManual={allowManual} onChange={(sort) => setViewPrefs(viewKey, { ...prefs, sort })} />
      {prefs.sort === 'manual' && <p className="hint" style={{ textAlign: 'left' }}>Long-press a task and drag it to move it.</p>}
      <div className="tform__label" style={{ marginTop: 20 }}>
        Filter
      </div>
      <FilterControls filters={prefs.filters} onChange={(filters) => setViewPrefs(viewKey, { ...prefs, filters })} showLists={showListFilter} />
    </Sheet>
  );
}

function SortFooter({ viewKey }: { viewKey: string }) {
  const close = useCloseSheet();
  const setViewPrefs = useData((s) => s.setViewPrefs);
  return (
    <>
      <button type="button" className="btn" onClick={() => setViewPrefs(viewKey, { sort: DEFAULT_SORT[viewKey] ?? 'manual', filters: defaultFilters() })}>
        Reset
      </button>
      <button type="button" className="btn btn--primary btn--grow" onClick={close}>
        Done
      </button>
    </>
  );
}
