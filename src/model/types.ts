/** Doable data model, schema v1. See docs/ARCHITECTURE.md for the reasoning. */

export type ID = string;
/** A calendar date in the user's local calendar, 'YYYY-MM-DD'. "Floating": not tied to a timezone. */
export type LocalDate = string;
/** A local wall-clock time, 'HH:mm' (24h). */
export type LocalTime = string;
/** 0 = none, 1 = low, 2 = medium, 3 = high */
export type Priority = 0 | 1 | 2 | 3;

export const INBOX_ID = 'inbox';

export interface List {
  id: ID;
  name: string;
  color: string; // hex
  emoji?: string;
  order: number;
  createdAt: number;
}

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export type RepeatFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Repeat {
  freq: RepeatFreq;
  /** every N units, ≥ 1 */
  interval: number;
  /** weekly only: 0 = Sun … 6 = Sat. Empty/undefined = same weekday as the due date. */
  weekdays?: number[];
  /** 'due': next date comes from the scheduled date. 'completion': from the day you finished it. */
  basis: 'due' | 'completion';
  /** Series start. Keeps monthly day-of-month and N-week cadence stable as the task rolls forward. */
  anchor: LocalDate;
  /** Optional last allowed date (inclusive). */
  until?: LocalDate;
}

export interface Task {
  id: ID;
  listId: ID;
  title: string;
  notes: string;
  emoji?: string;
  priority: Priority;
  dueDate: LocalDate | null;
  /** null = all-day */
  dueTime: LocalTime | null;
  /** minutes before due; null = no reminder */
  reminder: number | null;
  /** epoch ms; when set (and in the future) it replaces the normal reminder time */
  snoozedUntil: number | null;
  repeat: Repeat | null;
  subtasks: Subtask[];
  /** epoch ms; null = open */
  completedAt: number | null;
  /** links completed history copies of a repeating task to their series */
  seriesId?: ID;
  /** manual sort key (smaller = higher). Fractional values are fine. */
  order: number;
  /** stable 31-bit integer id for the OS notification */
  notifId: number;
  createdAt: number;
  updatedAt: number;
}

export type SortKey = 'manual' | 'due' | 'priority' | 'list' | 'created' | 'alpha';
export type DueFilter = 'any' | 'overdue' | 'today' | 'week' | 'nodate' | 'hasdate';
export type StatusFilter = 'open' | 'done' | 'all';

export interface Filters {
  priorities: Priority[]; // empty = any
  listIds: ID[]; // empty = any
  status: StatusFilter;
  due: DueFilter;
}

export interface ViewPrefs {
  sort: SortKey;
  filters: Filters;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  accent: string;
  /** reminder time used for all-day tasks */
  allDayReminderTime: LocalTime;
  /** applied to new tasks that get a due date; null = off */
  defaultReminder: number | null;
  /** 0 = Sunday, 1 = Monday */
  weekStart: 0 | 1;
  haptics: boolean;
  showCompletedInLists: boolean;
  reduceMotion: boolean;
  viewPrefs: Record<string, ViewPrefs>;
}

export interface AppData {
  schemaVersion: 1;
  lists: List[];
  tasks: Task[];
  settings: Settings;
  meta: { nextNotifId: number; createdAt: number };
}

export const CURRENT_SCHEMA = 1 as const;

export const ACCENTS = [
  '#6c5ce7', // violet (default)
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // green
  '#84cc16', // lime
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#64748b', // slate
  '#14b8a6', // teal
];

export const LIST_COLORS = [
  '#6c5ce7', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#84cc16',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b',
];

export const PRIORITY_LABEL: Record<Priority, string> = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At due time' },
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

export const defaultFilters = (): Filters => ({ priorities: [], listIds: [], status: 'open', due: 'any' });

export const defaultSettings = (): Settings => ({
  theme: 'system',
  accent: ACCENTS[0],
  allDayReminderTime: '09:00',
  defaultReminder: 0,
  weekStart: 1,
  haptics: true,
  showCompletedInLists: false,
  reduceMotion: false,
  viewPrefs: {},
});
