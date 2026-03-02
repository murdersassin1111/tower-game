import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.tower.defense.game',
  appName: 'TOWER',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  ios: { contentInset: 'always', backgroundColor: '#0a0f0d' },
  android: { backgroundColor: '#0a0f0d' },
};
export default config;
