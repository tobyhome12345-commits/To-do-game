import { LocalNotifications, type ActionPerformed, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { isNative } from './native';
import { useData } from '../store/store';
import { useUI } from '../store/ui';
import { diffReminders, planReminders, type PlannedReminder } from '../model/reminderPlan';

/*
 * Real OS-scheduled reminders (Android AlarmManager via @capacitor/local-notifications).
 *
 * The task data is the single source of truth. syncReminders() works out what *should* be scheduled
 * (planReminders), compares it with what Android *has* pending (getPending), and cancels/schedules the
 * difference. It runs after every change, on start and on resume — so edits, deletes, completes,
 * repeats rolling forward, timezone changes and imports can never leave a stale or missing alarm.
 * Android itself restores pending alarms after a reboot (the plugin's boot receiver).
 */

const CHANNEL = 'reminders';
const ACTION_TYPE = 'TASK_REMINDER';
const TEST_ID = 2_000_000_000;

export type ReminderStatus =
  | { platform: 'web' }
  | { platform: 'native'; permission: string; exact: string; scheduled: number };

let initialised = false;

export async function initReminders() {
  if (!isNative || initialised) return;
  initialised = true;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Task reminders',
      description: 'Reminders at the time your tasks are due',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#6C5CE7',
    });
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE,
          actions: [
            { id: 'done', title: '✓ Done' },
            { id: 'snooze', title: 'Snooze 10 min' },
          ],
        },
      ],
    });
  } catch (e) {
    console.error('reminder setup failed', e);
  }

  await LocalNotifications.addListener('localNotificationActionPerformed', onAction);

  // Re-sync whenever anything that affects reminders changes.
  let timer: ReturnType<typeof setTimeout> | null = null;
  useData.subscribe((s, prev) => {
    const a = s.data;
    const b = prev.data;
    if (a.tasks === b.tasks && a.lists === b.lists && a.settings.allDayReminderTime === b.settings.allDayReminderTime) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncReminders(), 500);
  });
  await App.addListener('resume', () => void syncReminders());
  await syncReminders();
}

function toNotification(p: PlannedReminder, exact: boolean): LocalNotificationSchema {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    largeBody: p.body,
    schedule: { at: new Date(p.at), allowWhileIdle: true },
    isExactNotification: exact,
    channelId: CHANNEL,
    actionTypeId: ACTION_TYPE,
    smallIcon: 'ic_stat_doable',
    iconColor: useData.getState().data.settings.accent,
    autoCancel: true,
    extra: { taskId: p.taskId, fp: p.fp },
  } as LocalNotificationSchema;
}

async function canExact(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return true; // older Android: always allowed
  }
}

let running: Promise<void> | null = null;
let again = false;
let askedThisSession = false;

/** Make Android's pending alarms match the task data. Safe to call any time. */
export function syncReminders(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        const desired = planReminders(useData.getState().data, Date.now());
        let perm = await LocalNotifications.checkPermissions();
        // First task that needs a reminder (from the sheet, quick-add or an import): ask once per session.
        if (perm.display !== 'granted' && perm.display !== 'denied' && desired.length && !askedThisSession) {
          askedThisSession = true;
          perm = await LocalNotifications.requestPermissions();
        }
        if (perm.display !== 'granted') return; // nothing can be shown; we'll sync once allowed
        const exact = await canExact();
        const { notifications } = await LocalNotifications.getPending();
        const ours = notifications.filter((n) => n.id !== TEST_ID).map((n) => ({ id: n.id, extra: n.extra }));
        const { cancel, schedule } = diffReminders(desired, ours);
        if (cancel.length) await LocalNotifications.cancel({ notifications: cancel.map((id) => ({ id })) });
        if (schedule.length) await LocalNotifications.schedule({ notifications: schedule.map((p) => toNotification(p, exact)) });
      } catch (e) {
        console.error('syncReminders failed', e);
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

function onAction(a: ActionPerformed) {
  const taskId = (a.notification.extra as { taskId?: string } | undefined)?.taskId;
  if (!taskId) return;
  const store = useData.getState();
  const task = store.data.tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (a.actionId === 'done') {
    if (task.completedAt == null) store.toggleComplete(taskId);
  } else if (a.actionId === 'snooze') {
    store.snooze(taskId, 10);
    store.showSnack(`Snoozed “${task.title}” for 10 minutes`, undefined, '😴');
  } else {
    useUI.getState().openSheet({ kind: 'task', taskId });
  }
  void LocalNotifications.removeDeliveredNotifications({ notifications: [{ id: a.notification.id, title: '', body: '' }] }).catch(() => {});
}

/** Ask for notification permission (first time someone sets a reminder). */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isNative) return true;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') return true;
    const res = await LocalNotifications.requestPermissions();
    const ok = res.display === 'granted';
    if (ok) void syncReminders();
    return ok;
  } catch {
    return false;
  }
}

export async function getReminderStatus(): Promise<ReminderStatus> {
  if (!isNative) return { platform: 'web' };
  try {
    const [perm, exact, pending] = await Promise.all([
      LocalNotifications.checkPermissions(),
      LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: 'granted' })),
      LocalNotifications.getPending(),
    ]);
    return { platform: 'native', permission: perm.display, exact: exact.exact_alarm, scheduled: pending.notifications.filter((n) => n.id !== TEST_ID).length };
  } catch {
    return { platform: 'native', permission: 'unknown', exact: 'unknown', scheduled: 0 };
  }
}

/** Opens Android's "Alarms & reminders" screen so reminders can fire on the exact minute. */
export async function openExactAlarmSettings() {
  if (!isNative) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } finally {
    void syncReminders();
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (!isNative) return false;
  if (!(await requestReminderPermission())) return false;
  const exact = await canExact();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: TEST_ID,
        title: '🔔 Doable test reminder',
        body: 'Reminders are working! This is what they will look like.',
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        isExactNotification: exact,
        channelId: CHANNEL,
        smallIcon: 'ic_stat_doable',
        iconColor: useData.getState().data.settings.accent,
      } as LocalNotificationSchema,
    ],
  });
  return true;
}
