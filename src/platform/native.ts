import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useData } from '../store/store';

export const isNative = Capacitor.isNativePlatform();

export function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!isNative || !useData.getState().data.settings.haptics) return;
  try {
    if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
    else if (kind === 'warning') void Haptics.notification({ type: NotificationType.Warning });
    else void Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}
