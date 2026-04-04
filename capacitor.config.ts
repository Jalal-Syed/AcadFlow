import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.acadflow.app',
  appName: 'AcadFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0D0D14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0D0D14',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6C63FF',
      sound: 'beep.wav',
    },
  },
  android: {
    minWebViewVersion: 60,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
}

export default config
