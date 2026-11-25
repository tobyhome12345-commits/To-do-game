import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { useUI } from '../store/ui';
import { useData } from '../store/store';
import { saveNow } from '../store/persistence';
import { applyTheme, onThemeResolved } from '../ui/theme';
import { initReminders } from './reminders';

/** Phone-only setup: back button, status/navigation bar colours, save-on-pause, reminders. */
export async function initNative() {
  // Android back button: close sheet → go back a screen → back to Today → leave the app (kept in memory).
  await App.addListener('backButton', () => {
    if (!useUI.getState().back()) void App.minimizeApp();
  });

  // Save immediately when the app is sent to the background.
  await App.addListener('pause', () => void saveNow());

  // Status bar icons follow the app theme (not just the phone's), so they stay readable.
  onThemeResolved((t) => {
    void SystemBars.setStyle({ style: t === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  });
  const s = useData.getState().data.settings;
  applyTheme(s.theme, s.accent, s.reduceMotion);

  void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  await initReminders();
}
