export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  /** Token de padelapi.org. Copiá el valor real solo en environment.ts (no commitear). */
  padelApiToken: '',
  /** Solo Tauri/desktop OAuth. Copiá valores reales en environment.ts (no commitear). */
  googleDesktopClientId: '',
  googleDesktopClientSecret: '',
  sentryDsn: 'https://<key>@o<orgId>.ingest.sentry.io/<projectId>',
  firebase: {
    apiKey: 'AIza...',
    authDomain: 'mi-proyecto.firebaseapp.com',
    projectId: 'mi-proyecto',
    storageBucket: 'mi-proyecto.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456',
  },
};
