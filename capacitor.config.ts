import type { CapacitorConfig } from '@capacitor/cli';

// The Android app (APK): Capacitor wraps the same static web build in dist/. `npm run android:sync` copies it in.
// The appId is permanent once the app is installed on phones: changing it makes a different app with separate saves.
const config: CapacitorConfig = {
  appId: 'io.github.ullafreehum.scathingcharter',
  appName: 'The Scathing Charter',
  webDir: 'dist',
  android: { backgroundColor: '#120e0c' },
};

export default config;
