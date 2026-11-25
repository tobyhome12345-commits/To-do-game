import type { AppData, Settings, Task } from './types';
import { addDays, formatTime, localEpoch, relativeDay, toLocalDate } from './dates';

/*
 * Reminders are DERIVED from task data. planReminders() says what the OS should have scheduled,
 * diffReminders() compares that with what it actually has, and the platform layer applies the difference.
 * Nothing else ever schedules or cancels a notification, so edits/deletes/completes can't leave ghosts.
 */

export const MAX_SCHEDULED = 50;

export interface PlannedReminder {
  id: number; // task.notifId
  at: number; // epoch ms
  taskId: string;
  title: string;
  body: string;
  fp: string; // fingerprint: changes whenever anything visible or the time changes
}

export interface PendingLike {
  id: number;
  extra?: { fp?: string } | null;
}

/** When this task's reminder should fire (epoch ms), ignoring whether that's in the past. */
export function fireTimeFor(t: Task, s: Settings): number | null {
  if (t.completedAt != null || !t.dueDate) return null;
  if (t.snoozedUntil != null) return t.snoozedUntil;
  if (t.reminder == null) return null;
  // Whole days are counted on the calendar (so "1 day before" keeps the same clock time across DST changes),
  // the remaining minutes as real time.
  const days = Math.floor(t.reminder / 1440);
  const mins = t.reminder % 1440;
  return localEpoch(addDays(t.dueDate, -days), t.dueTime ?? s.allDayReminderTime) - mins * 60_000;
}

function bodyFor(t: Task, data: AppData, now: number): string {
  const list = data.lists.find((l) => l.id === t.listId);
  const today = toLocalDate(now);
  let when = '';
  if (t.dueDate) {
    const rel = relativeDay(t.dueDate, today);
    when = `Due ${rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : rel}${t.dueTime ? ` at ${formatTime(t.dueTime)}` : ''}`;
  }
  const firstNote = t.notes.split('\n').find((l) => l.trim())?.trim();
  const parts = [when, list && `${list.emoji ? list.emoji + ' ' : ''}${list.name}`].filter(Boolean);
  const head = parts.join(' · ');
  return firstNote ? `${head}\n${firstNote}` : head;
}

export function planReminders(data: AppData, now: number, max = MAX_SCHEDULED): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const t of data.tasks) {
    const at = fireTimeFor(t, data.settings);
    if (at == null || at <= now) continue;
    const title = `${t.emoji ? t.emoji + ' ' : ''}${t.title}`;
    const body = bodyFor(t, data, now);
    out.push({ id: t.notifId, at, taskId: t.id, title, body, fp: `${at}|${title}|${body}` });
  }
  out.sort((a, b) => a.at - b.at);
  return out.slice(0, max);
}

export function diffReminders(desired: PlannedReminder[], pending: PendingLike[]) {
  const pend = new Map(pending.map((p) => [p.id, p]));
  const want = new Map(desired.map((d) => [d.id, d]));
  const cancel: number[] = [];
  const schedule: PlannedReminder[] = [];
  for (const p of pending) {
    const d = want.get(p.id);
    if (!d || p.extra?.fp !== d.fp) cancel.push(p.id);
  }
  for (const d of desired) {
    const p = pend.get(d.id);
    if (!p || p.extra?.fp !== d.fp) schedule.push(d);
  }
  return { cancel, schedule };
}
