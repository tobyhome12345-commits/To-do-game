import { useUI } from '../../store/ui';
import { TaskSheet } from './TaskSheet';

export function SheetHost() {
  const sheet = useUI((s) => s.sheet);
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'task':
      return <TaskSheet taskId={sheet.taskId} draft={sheet.draft} />;
    default:
      return null;
  }
}
