# Doable architecture

## Layout

```
src/
  model/       pure logic, no UI: types, dates, recurrence, reminder planning, quick-add parser, views, demo data
  store/       Zustand stores: data (with undo), UI/navigation, persistence, backup
  platform/    Capacitor bits: reminders, haptics, backup files, native start-up (no-ops in a browser)
  ui/          components, screens and bottom sheets
  styles/      CSS with design tokens (light/dark + runtime accent colour)
tests/         vitest suites for everything in model/ and store/
android/       Capacitor Android project (manifest, icons, signing)
```

## Data model (schema v1)

All data is one `AppData` JSON document: `{ schemaVersion, lists, tasks, settings, meta }`. See `src/model/types.ts`.

- **Dates are "floating"**: `dueDate` is a `'YYYY-MM-DD'` string and `dueTime` is `'HH:mm'` (or `null` for all-day). "Today", "Overdue" and repeats are calendar ideas, so storing calendar values means nothing drifts when clocks change or you travel. The real instant is only worked out when scheduling a reminder (`localEpoch`).
- **Date maths happens in UTC** on those strings (`src/model/dates.ts`), so a daylight-saving change can never shift a day.
- Every task has a stable integer **`notifId`** (handed out from `meta.nextNotifId`) for its OS notification.
- **`order`** is a fractional manual-sort key. Dropping a task between two others sets it to their midpoint.
- `migrate()` (`src/model/data.ts`) cleans anything loaded from storage or a backup file: it fixes bad fields, removes duplicate ids, makes sure the Inbox exists and makes notification ids unique. Future schema versions upgrade here too.

## Repeating tasks

**One live task rolls forward, and a completed copy is saved as history.** There are never pre-generated future copies, so editing the series means editing one task.

Completing a repeating task, in a single undoable action (`toggleComplete` in `src/store/store.ts`):
1. A **history copy** is saved (new id, `repeat: null`, `completedAt: now`, `seriesId` linking it to the series), so it appears in *Completed*.
2. The live task's `dueDate` moves to `nextOccurrence(...)`, its checklist is unticked and any snooze is cleared. The time of day stays the same.
3. If the next date would be past the rule's `until`, the series ends and the task is simply completed.

`nextOccurrence()` (`src/model/recurrence.ts`) is pure and heavily tested:
- **Basis:** `'due'` counts from the scheduled date; `'completion'` counts from the day you finished it.
- **Weekly with weekdays** (e.g. Mon/Wed/Fri, or every 2 weeks on Tue & Thu): it steps day by day. A day matches if its weekday is chosen **and** its week number (counted from the `anchor` week, respecting week-start Mon/Sun) is a multiple of N.
- **Monthly / yearly** use the **anchor's** day, clamped to the month. So *31 Jan → 28 Feb → 31 Mar* (not stuck on the 28th), and Feb 29 birthdays fall on Feb 28 in normal years.
- **Catch-up:** finishing an overdue daily task gives you *today's* occurrence, not a trail of overdue copies.
- Moving a repeating task's date re-anchors the series on the new date.

## Reminders

**The task data is the only source of truth. Android's pending alarms are always rebuilt to match it.** Nothing schedules or cancels a notification directly.

`syncReminders()` (`src/platform/reminders.ts`) runs 0.5 s after any change, on start-up and whenever the app resumes:
1. **Plan** (`planReminders`, pure): for every open task with a date and a reminder, fire time = `snoozedUntil` or *(due date + time, or the all-day reminder time) − offset*. Whole-day offsets ("1 day before") are counted on the calendar so they keep the same clock time across DST. Past times are skipped, and only the soonest **50** are kept, well under Android's ~500-alarm limit. The rest get scheduled as these fire or are completed.
2. **Compare** (`diffReminders`, pure) with `LocalNotifications.getPending()`. Each notification carries a fingerprint (time + title + body) in `extra`.
3. **Apply**: cancel anything stale or changed, and schedule anything missing (`id = task.notifId`, `allowWhileIdle`, channel `reminders`).

So edits, deletes, completions, repeats rolling forward, imports and timezone changes can never leave a ghost or missing reminder.

Android details:
- `POST_NOTIFICATIONS` is requested the first time you set a reminder, and Settings shows a banner if it's denied.
- `USE_EXACT_ALARM` (granted automatically for sideloaded apps on Android 13+) makes reminders ring on the exact minute, even in Doze. If exact alarms are ever unavailable, Doable schedules inexact alarms instead of nagging, and Settings offers a button to fix it.
- After a reboot, the plugin's boot receiver restores pending alarms, and the next app open re-syncs anyway.
- The notification buttons **✓ Done** (completes the task, rolling repeats forward) and **Snooze 10 min** (sets `snoozedUntil`) open the app and update the data. The sync does the rest.

## Undo

Every undoable action goes through `transact()`, which records a *before* copy of each task or list it touches. Undo puts back exactly those, so it can't wipe out unrelated edits made afterwards. The snackbar offers it for 5 seconds.

## Persistence & backups

- On the phone, data is saved with Capacitor Preferences (Android SharedPreferences, private to the app and kept across updates). In a browser it uses `localStorage`. Saves happen 300 ms after a change, and immediately when the app goes to the background.
- Every successful load also stores a *last good copy*, which is used if the main copy is ever unreadable.
- **Export** writes `doable-backup-YYYY-MM-DD.json` and opens the Android share sheet (Drive, Files, email…). **Import** validates the file, shows what's in it, then **merges** (newest edit wins) or **replaces**. A safety copy of the current data is saved first either way.

## Build & release

`.github/workflows/android.yml`: tests → web build → `cap sync` → `gradlew assembleRelease` (signed with the committed key) → `apksigner verify` → GitHub Release `build-N` marked *latest*, with `Doable.apk` attached. `versionCode` = the workflow run number, so each build installs over the previous one.
