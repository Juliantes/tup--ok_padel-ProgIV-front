import * as Sentry from '@sentry/angular';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

Sentry.init({
  dsn: environment.sentryDsn,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', '127.0.0.1', /^https:\/\/okpadel\.firebaseapp\.com/],
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
