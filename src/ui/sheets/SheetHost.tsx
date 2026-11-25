import { useUI } from '../../store/ui';
import { TaskSheet } from './TaskSheet';
import { DeleteListSheet, ListSheet } from './ListSheet';
import { SortSheet } from './SortSheet';

export function SheetHost() {
  const sheet = useUI((s) => s.sheet);
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'task':
      return <TaskSheet taskId={sheet.taskId} draft={sheet.draft} />;
    case 'list':
      return <ListSheet key={sheet.listId ?? 'new'} listId={sheet.listId} />;
    case 'sort':
      return <SortSheet viewKey={sheet.viewKey} allowManual={sheet.allowManual} showListFilter={sheet.showListFilter} />;
    case 'deleteList':
      return <DeleteListSheet listId={sheet.listId} />;
    default:
      return null;
  }
}
