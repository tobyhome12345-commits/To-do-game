import type { AppData, Task } from '../model/types';
import { DataError, migrate } from '../model/data';
import { todayStr } from '../model/dates';

export interface BackupFile {
  app: 'Doable';
  format: 1;
  exportedAt: string;
  data: AppData;
}

export function backupFileName(now = Date.now()) {
  return `doable-backup-${todayStr(now)}.json`;
}

export function exportJSON(data: AppData, now = Date.now()): string {
  const file: BackupFile = { app: 'Doable', format: 1, exportedAt: new Date(now).toISOString(), data };
  return JSON.stringify(file, null, 2);
}

export interface ParsedBackup {
  data: AppData;
  stats: { tasks: number; open: number; lists: number; exportedAt?: string };
}

/** Accepts a Doable backup file (or bare AppData). Throws DataError with a friendly message. */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DataError("That file isn't valid JSON.");
  }
  const obj = json as Record<string, any>;
  const payload = obj && typeof obj === 'object' && obj.app === 'Doable' && obj.data ? obj.data : obj;
  let data: AppData;
  try {
    data = migrate(payload);
  } catch (e) {
    throw new DataError(e instanceof DataError ? e.message : "That doesn't look like a Doable backup.");
  }
  return {
    data,
    stats: {
      tasks: data.tasks.length,
      open: data.tasks.filter((t) => t.completedAt == null).length,
      lists: data.lists.length,
      exportedAt: typeof obj?.exportedAt === 'string' ? obj.exportedAt : undefined,
    },
  };
}

/**
 * Merge a backup into the current data. Lists and tasks are matched by id;
 * for tasks the most recently updated copy wins. Settings stay as they are.
 */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const lists = new Map(current.lists.map((l) => [l.id, l]));
  for (const l of incoming.lists) if (!lists.has(l.id)) lists.set(l.id, l);

  const tasks = new Map(current.tasks.map((t) => [t.id, t]));
  for (const t of incoming.tasks) {
    const mine = tasks.get(t.id);
    if (!mine || t.updatedAt > mine.updatedAt) tasks.set(t.id, t);
  }

  // Re-run validation so notification ids stay unique across both sets.
  const merged = [...tasks.values()].map((t): Task => ({ ...t }));
  const usedByOther = new Map<number, string>();
  let next = Math.max(current.meta.nextNotifId, incoming.meta.nextNotifId);
  for (const t of merged) {
    const owner = usedByOther.get(t.notifId);
    if (owner && owner !== t.id) t.notifId = next++;
    usedByOther.set(t.notifId, t.id);
  }
  return migrate({ ...current, lists: [...lists.values()], tasks: merged, meta: { ...current.meta, nextNotifId: next } });
}
