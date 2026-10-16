import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tup.padelmatch',
  appName: 'PadelMatch',
  webDir: 'dist/tup-padel-match/browser',
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
};

export default config;
