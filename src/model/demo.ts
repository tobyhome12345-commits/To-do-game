import type { AppData, Task } from './types';
import { INBOX_ID, defaultSettings } from './types';
import { blankTask, uid } from './data';
import { addDays, localEpoch, todayStr, weekday } from './dates';

/** Realistic sample data for screenshots and trying the app in a browser (?demo=1). Never used on the phone. */
export function demoData(now = Date.now()): AppData {
  const today = todayStr(now);
  const d = (n: number) => addDays(today, n);
  const L = {
    inbox: INBOX_ID,
    home: uid(),
    school: uid(),
    personal: uid(),
    fitness: uid(),
  };
  const lists = [
    { id: L.inbox, name: 'Inbox', color: '#6c5ce7', emoji: '📥', order: 0, createdAt: now },
    { id: L.school, name: 'School', color: '#3b82f6', emoji: '🎒', order: 1, createdAt: now },
    { id: L.home, name: 'Home', color: '#f59e0b', emoji: '🏠', order: 2, createdAt: now },
    { id: L.personal, name: 'Personal', color: '#10b981', emoji: '🌱', order: 3, createdAt: now },
    { id: L.fitness, name: 'Fitness', color: '#ec4899', emoji: '💪', order: 4, createdAt: now },
  ];
  let n = 1;
  let o = 0;
  const T = (p: Partial<Task>): Task => blankTask({ notifId: n++, order: o++, createdAt: now - 86_400_000, updatedAt: now - 86_400_000, ...p });
  const sub = (title: string, done = false) => ({ id: uid(), title, done });
  const at = (date: string, time: string) => localEpoch(date, time);

  const tasks: Task[] = [
    T({ emoji: '🧪', title: 'Science project: volcano model', listId: L.school, dueDate: today, dueTime: '16:00', priority: 3, reminder: 30,
        notes: 'Baking soda + vinegar. Ask Mr Patel about the presentation slot.',
        subtasks: [sub('Buy baking soda', true), sub('Paint the volcano', true), sub('Write the poster'), sub('Practise the demo')] }),
    T({ emoji: '🐶', title: 'Walk Biscuit', listId: L.home, dueDate: today, dueTime: '17:30', reminder: 0,
        repeat: { freq: 'daily', interval: 1, basis: 'due', anchor: d(-20) } }),
    T({ emoji: '🎸', title: 'Guitar practice', listId: L.personal, dueDate: today, dueTime: '18:30', priority: 1, reminder: 10,
        repeat: { freq: 'weekly', interval: 1, weekdays: [1, 3, 5].includes(weekday(today)) ? [1, 3, 5] : [weekday(today), (weekday(today) + 2) % 7], basis: 'due', anchor: d(-14) } }),
    T({ emoji: '🧺', title: 'Put laundry away', listId: L.home, dueDate: today, priority: 2 }),
    T({ emoji: '📖', title: 'Finish reading chapter 5', listId: L.school, dueDate: d(-1), priority: 2 }),
    T({ emoji: '📐', title: 'Maths homework p.42', listId: L.school, dueDate: d(1), dueTime: '17:00', priority: 3, reminder: 60 }),
    T({ emoji: '🎂', title: 'Buy a present for Sam', listId: L.personal, dueDate: d(2), priority: 2, notes: 'Lego set or that comic book' }),
    T({ emoji: '🏃', title: '5k run', listId: L.fitness, dueDate: d(3), dueTime: '08:00',
        repeat: { freq: 'weekly', interval: 1, weekdays: [weekday(d(3))], basis: 'due', anchor: d(3) } }),
    T({ emoji: '🧹', title: 'Clean bedroom', listId: L.home, dueDate: d(4) }),
    T({ emoji: '🗣️', title: 'French vocab quiz', listId: L.school, dueDate: d(6), dueTime: '09:00', priority: 1, reminder: 1440 }),
    T({ emoji: '✈️', title: 'Pack for the trip', listId: L.personal, dueDate: d(9),
        subtasks: [sub('Charger'), sub('Headphones'), sub('Passport'), sub('Snacks')] }),
    T({ emoji: '🏋️', title: 'Stretch for 10 minutes', listId: L.fitness, dueDate: d(1),
        repeat: { freq: 'daily', interval: 1, basis: 'completion', anchor: d(1) } }),
    T({ emoji: '💡', title: 'Ideas for the science fair', listId: L.inbox, notes: 'Solar oven? Bridge strength test?' }),
    T({ emoji: '🎮', title: 'Beat level 7', listId: L.personal, priority: 0 }),
    T({ emoji: '🦷', title: 'Dentist appointment', listId: L.personal, dueDate: today, dueTime: '09:00', completedAt: at(today, '10:05') }),
    T({ emoji: '🛏️', title: 'Make bed', listId: L.home, dueDate: today, completedAt: at(today, '07:40') }),
    T({ emoji: '📝', title: 'English essay draft', listId: L.school, dueDate: d(-1), completedAt: at(d(-1), '20:15') }),
    T({ emoji: '🥦', title: 'Help cook dinner', listId: L.home, dueDate: d(-1), completedAt: at(d(-1), '18:45') }),
  ];

  return {
    schemaVersion: 1,
    lists,
    tasks,
    settings: defaultSettings(),
    meta: { nextNotifId: n, createdAt: now },
  };
}
