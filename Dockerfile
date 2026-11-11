# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

ARG API_BASE_URL=http://localhost:3000
ARG FIREBASE_API_KEY=
ARG FIREBASE_AUTH_DOMAIN=
ARG FIREBASE_PROJECT_ID=
ARG FIREBASE_STORAGE_BUCKET=
ARG FIREBASE_MESSAGING_SENDER_ID=
ARG FIREBASE_APP_ID=

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN set -eux; \
  cp src/environments/environment.example.ts src/environments/environment.ts; \
  sed -i "s|apiBaseUrl: 'http://localhost:3000'|apiBaseUrl: '${API_BASE_URL}'|g" src/environments/environment.ts; \
  sed -i "s|sentryDsn: 'https://[^']*'|sentryDsn: ''|g" src/environments/environment.ts; \
  if [ -n "${FIREBASE_API_KEY}" ]; then sed -i "s|apiKey: 'AIza...'|apiKey: '${FIREBASE_API_KEY}'|g" src/environments/environment.ts; fi; \
  if [ -n "${FIREBASE_AUTH_DOMAIN}" ]; then sed -i "s|authDomain: 'mi-proyecto.firebaseapp.com'|authDomain: '${FIREBASE_AUTH_DOMAIN}'|g" src/environments/environment.ts; fi; \
  if [ -n "${FIREBASE_PROJECT_ID}" ]; then sed -i "s|projectId: 'mi-proyecto'|projectId: '${FIREBASE_PROJECT_ID}'|g" src/environments/environment.ts; fi; \
  if [ -n "${FIREBASE_STORAGE_BUCKET}" ]; then sed -i "s|storageBucket: 'mi-proyecto.appspot.com'|storageBucket: '${FIREBASE_STORAGE_BUCKET}'|g" src/environments/environment.ts; fi; \
  if [ -n "${FIREBASE_MESSAGING_SENDER_ID}" ]; then sed -i "s|messagingSenderId: '123456789012'|messagingSenderId: '${FIREBASE_MESSAGING_SENDER_ID}'|g" src/environments/environment.ts; fi; \
  if [ -n "${FIREBASE_APP_ID}" ]; then sed -i "s|appId: '1:123456789012:web:abcdef123456'|appId: '${FIREBASE_APP_ID}'|g" src/environments/environment.ts; fi; \
  cp src/environments/environment.ts src/environments/environment.prod.ts; \
  sed -i "s|production: false|production: true|g" src/environments/environment.prod.ts

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/tup-padel-match/browser /usr/share/nginx/html
EXPOSE 80
