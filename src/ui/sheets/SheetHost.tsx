import { useUI } from '../../store/ui';
import { TaskSheet } from './TaskSheet';
import { DeleteListSheet, ListSheet } from './ListSheet';

export function SheetHost() {
  const sheet = useUI((s) => s.sheet);
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'task':
      return <TaskSheet taskId={sheet.taskId} draft={sheet.draft} />;
    case 'list':
      return <ListSheet key={sheet.listId ?? 'new'} listId={sheet.listId} />;
    case 'deleteList':
      return <DeleteListSheet listId={sheet.listId} />;
    default:
      return null;
  }
}
