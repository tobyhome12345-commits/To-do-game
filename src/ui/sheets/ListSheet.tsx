import { useState } from 'react';
import { Check, Palette, Trash2 } from 'lucide-react';
import type { ID } from '../../model/types';
import { INBOX_ID, LIST_COLORS } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { Sheet, useCloseSheet } from '../components/Sheet';
import { EmojiPicker } from '../components/EmojiPicker';
import { inkFor } from '../theme';

export function ListSheet({ listId }: { listId?: ID }) {
  const closeSheet = useUI((s) => s.closeSheet);
  const existing = useData((s) => (listId ? s.data.lists.find((l) => l.id === listId) : undefined));
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)]);
  const [emoji, setEmoji] = useState<string | undefined>(existing?.emoji);
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <Sheet
      onClose={closeSheet}
      label={existing ? 'Edit list' : 'New list'}
      title={existing ? 'Edit list' : 'New list'}
      footer={<ListFooter listId={listId} name={name} color={color} emoji={emoji} />}
    >
      <div className="list-preview" style={{ ['--lc' as string]: color }}>
        <button type="button" className="list-preview__badge" onClick={() => setEmojiOpen((o) => !o)} aria-label="Choose emoji">
          {emoji ?? <span className="list-preview__plus">+</span>}
        </button>
        <input
          className="list-preview__name"
          value={name}
          placeholder="List name"
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          autoFocus={!existing}
          aria-label="List name"
        />
      </div>
      {emojiOpen && (
        <EmojiPicker
          value={emoji}
          onPick={(e) => {
            setEmoji(e);
            setEmojiOpen(false);
          }}
        />
      )}

      <div className="tform__label" style={{ marginTop: 18 }}>
        <Palette size={17} /> Colour
      </div>
      <div className="swatches">
        {LIST_COLORS.map((c) => (
          <button key={c} type="button" className={`swatch ${c === color ? 'swatch--on' : ''}`} style={{ background: c, color: inkFor(c) }} onClick={() => setColor(c)} aria-label={`Colour ${c}`}>
            {c === color && <Check size={18} strokeWidth={3} />}
          </button>
        ))}
        <label className={`swatch swatch--custom ${!LIST_COLORS.includes(color) ? 'swatch--on' : ''}`} aria-label="Custom colour" style={!LIST_COLORS.includes(color) ? { background: color, color: inkFor(color) } : undefined}>
          {!LIST_COLORS.includes(color) ? <Check size={18} strokeWidth={3} /> : <span>+</span>}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
    </Sheet>
  );
}

function ListFooter({ listId, name, color, emoji }: { listId?: ID; name: string; color: string; emoji?: string }) {
  const close = useCloseSheet();
  const addList = useData((s) => s.addList);
  const updateList = useData((s) => s.updateList);
  const openSheet = useUI((s) => s.openSheet);
  const push = useUI((s) => s.push);
  const ok = name.trim().length > 0;
  return (
    <>
      {listId && listId !== INBOX_ID && (
        <button type="button" className="btn btn--danger btn--icon" aria-label="Delete list" onClick={() => openSheet({ kind: 'deleteList', listId })}>
          <Trash2 size={19} />
        </button>
      )}
      <button type="button" className="btn" onClick={close}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn--primary btn--grow"
        disabled={!ok}
        onClick={() => {
          if (listId) updateList(listId, { name: name.trim(), color, emoji });
          else {
            const l = addList({ name: name.trim(), color, emoji });
            setTimeout(() => push({ kind: 'list', listId: l.id }), 220);
          }
          close();
        }}
      >
        {listId ? 'Save' : 'Create list'}
      </button>
    </>
  );
}

export function DeleteListSheet({ listId }: { listId: ID }) {
  const closeSheet = useUI((s) => s.closeSheet);
  const pop = useUI((s) => s.pop);
  const list = useData((s) => s.data.lists.find((l) => l.id === listId));
  const n = useData((s) => s.data.tasks.filter((t) => t.listId === listId).length);
  const deleteList = useData((s) => s.deleteList);
  if (!list) return null;
  const go = (mode: 'move' | 'delete') => {
    closeSheet();
    const stack = useUI.getState().stack;
    if (stack[stack.length - 1]?.kind === 'list') pop();
    deleteList(listId, mode);
  };
  return (
    <Sheet onClose={closeSheet} label="Delete list" title={`Delete “${list.name}”?`}>
      <p className="sheet__text">{n ? `It has ${n} task${n === 1 ? '' : 's'}. What should happen to ${n === 1 ? 'it' : 'them'}?` : 'This list is empty.'} You can undo this straight after.</p>
      <div className="stack">
        {n > 0 && (
          <button className="btn btn--block" onClick={() => go('move')}>
            Move {n === 1 ? 'it' : `all ${n}`} to Inbox, delete the list
          </button>
        )}
        <button className="btn btn--danger btn--block" onClick={() => go('delete')}>
          {n ? `Delete the list and its ${n} task${n === 1 ? '' : 's'}` : 'Delete list'}
        </button>
        <button className="btn btn--ghost btn--block" onClick={closeSheet}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
