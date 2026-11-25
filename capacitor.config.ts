import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doable.app',
  appName: 'Doable',
  webDir: 'dist',
  android: {
    backgroundColor: '#F5F5FA',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
    },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#6C5CE7',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_doable',
      iconColor: '#6C5CE7',
    },
  },
};

export default config;
