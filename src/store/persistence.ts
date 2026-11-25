import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { AppData } from '../model/types';
import { defaultData, migrate } from '../model/data';
import { useData } from './store';

/*
 * Storage: Android SharedPreferences (via Capacitor Preferences) on the phone — private to the app,
 * survives updates. localStorage in a browser. One JSON document + a "last good" copy for recovery.
 */

const KEY = 'doable.data';
const PREV = 'doable.data.prev';
export const PRE_IMPORT = 'doable.data.preimport';

const native = Capacitor.isNativePlatform();

export const kv = {
  async get(key: string): Promise<string | null> {
    if (native) return (await Preferences.get({ key })).value;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (native) return Preferences.set({ key, value });
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('save failed', e);
    }
  },
};

export async function loadData(): Promise<{ data: AppData; source: 'main' | 'backup' | 'new' }> {
  const raw = await kv.get(KEY);
  if (raw) {
    try {
      const data = migrate(JSON.parse(raw));
      await kv.set(PREV, raw); // remember the last copy that loaded fine
      return { data, source: 'main' };
    } catch (e) {
      console.error('main data unreadable, trying backup', e);
    }
    const prev = await kv.get(PREV);
    if (prev) {
      try {
        return { data: migrate(JSON.parse(prev)), source: 'backup' };
      } catch (e) {
        console.error('backup unreadable too', e);
      }
    }
  }
  return { data: defaultData(), source: 'new' };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: AppData | null = null;

async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!pending) return;
  const d = pending;
  pending = null;
  await kv.set(KEY, JSON.stringify(d));
}

export const saveNow = flush;

/** Save shortly after every change, and immediately when the app goes to the background. */
export function startAutosave() {
  useData.subscribe((s, prev) => {
    if (!s.ready || s.data === prev.data) return;
    pending = s.data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 300);
  });
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => void flush());
}
