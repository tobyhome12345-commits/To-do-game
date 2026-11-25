import { useEffect } from 'react';
import { useData } from '../../store/store';
import { haptic } from '../../platform/native';

export function Snackbar() {
  const snack = useData((s) => s.snack);
  const dismiss = useData((s) => s.dismissSnack);
  const undo = useData((s) => s.undo);

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [snack, dismiss]);

  if (!snack) return null;
  return (
    <div className="snackbar" key={snack.id} role="status" onClick={dismiss}>
      {snack.emoji && <span className="snackbar__emoji">{snack.emoji}</span>}
      <span className="snackbar__text">{snack.text}</span>
      {snack.undoId != null && (
        <button
          className="snackbar__undo"
          onClick={(e) => {
            e.stopPropagation();
            haptic('medium');
            undo(snack.undoId);
          }}
        >
          UNDO
        </button>
      )}
      <span className="snackbar__timer" />
    </div>
  );
}
