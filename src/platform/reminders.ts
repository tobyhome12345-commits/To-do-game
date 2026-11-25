import { isNative } from './native';

/** Ask for notification permission the first time someone sets a reminder. (Full engine added with Capacitor.) */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isNative) return true;
  return true;
}
