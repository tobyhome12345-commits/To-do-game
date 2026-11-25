import { useState } from 'react';
import { GitMerge, Replace } from 'lucide-react';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { mergeData, type ParsedBackup } from '../../store/backup';
import { kv, PRE_IMPORT, saveNow } from '../../store/persistence';
import { Sheet } from '../components/Sheet';
import { haptic } from '../../platform/native';

export function ImportSheet({ backup }: { backup: ParsedBackup }) {
  const closeSheet = useUI((s) => s.closeSheet);
  const replaceData = useData((s) => s.replaceData);
  const showSnack = useData((s) => s.showSnack);
  const current = useData((s) => s.data);
  const [busy, setBusy] = useState(false);
  const { stats } = backup;
  const when = stats.exportedAt ? new Date(stats.exportedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

  const run = async (mode: 'merge' | 'replace') => {
    setBusy(true);
    await kv.set(PRE_IMPORT, JSON.stringify(current)); // safety copy first
    const next = mode === 'merge' ? mergeData(current, backup.data) : backup.data;
    replaceData(next);
    await saveNow();
    haptic('success');
    closeSheet();
    showSnack(mode === 'merge' ? `Merged — you now have ${next.tasks.length} tasks` : `Restored ${next.tasks.length} tasks from backup`, undefined, '📦');
  };

  return (
    <Sheet onClose={closeSheet} label="Import backup" title="Import backup">
      <div className="import-card">
        <div className="import-card__emoji">📦</div>
        <div>
          <div className="import-card__title">
            {stats.tasks} tasks · {stats.lists} lists
          </div>
          <div className="import-card__sub">
            {stats.open} still to do{when ? ` · saved ${when}` : ''}
          </div>
        </div>
      </div>
      <p className="sheet__text">
        <b>Merge</b> adds anything new and keeps the newest version of tasks you have in both. <b>Replace</b> swaps everything for the backup. A safety copy of your current tasks is kept either way.
      </p>
      <div className="stack">
        <button className="btn btn--primary btn--block" disabled={busy} onClick={() => run('merge')}>
          <GitMerge size={18} /> Merge with my tasks
        </button>
        <button className="btn btn--danger btn--block" disabled={busy} onClick={() => run('replace')}>
          <Replace size={18} /> Replace everything
        </button>
        <button className="btn btn--ghost btn--block" onClick={closeSheet}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
