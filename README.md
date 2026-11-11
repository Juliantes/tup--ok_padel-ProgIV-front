# TupPadelMatch (Angular)

Front-end Angular para **ok_padel**. Autenticación con Google vía Firebase; la API Rails (`/api/v1`) recibe un JWT propio tras `POST /api/v1/oauth/google`.

## Requisitos

- Node.js y npm (ver `packageManager` en `package.json`)
- Backend [ok_padel](../ok_padel) en `http://localhost:3000` con `FIREBASE_PROJECT_ID=okpadel`

## Desarrollo local

En una terminal (Rails):

```bash
cd ../ok_padel
export FIREBASE_PROJECT_ID=okpadel
bin/rails s
```

En otra terminal (Angular):

```bash
npm install
npm start
```

Abrí **http://localhost:4200** (mismo host que el CORS del backend).

## Configuración

| Variable / archivo                | Descripción                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `src/environments/environment.ts` | `apiBaseUrl` → `http://localhost:3000` en dev                                    |
| `environment.prod.ts`             | `apiBaseUrl` → `https://ok-padel-tup.fly.dev`                                    |
| Firebase (`environment.firebase`) | Debe coincidir con el proyecto configurado en el backend (`FIREBASE_PROJECT_ID`) |

## Scripts

| Comando         | Uso                            |
| --------------- | ------------------------------ |
| `npm start`     | `ng serve` en `localhost:4200` |
| `npm run build` | Build de producción            |
| `npm test`      | Tests (Vitest)                 |
| `npm run lint`  | ESLint                         |

## Seguridad de dependencias (`npm audit`)

Tras los upgrades en `fix-vulnerabilities`, `npm audit` puede seguir reportando **5 high** en `@grpc/grpc-js@1.9.x` arrastrado por `firebase` (Firestore SDK). El advisory [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) aplica a **servidores gRPC** que usan `getAuthContext`; este front solo usa Firebase Auth cliente. Forzar `@grpc/grpc-js` 1.13+ rompe el pin de Firebase 12; subir a Firebase 13 queda fuera de alcance mientras `@capacitor-firebase/authentication` exige `firebase@^12`.

`package.json` incluye `overrides` para transitive de tooling (`glob`, `minimatch`, `tar`, `uuid`, `basic-ftp`). No usar `npm audit fix --force` (propone downgrades de Angular/Firebase/ESLint).

## Flujo de sesión

Hay **dos tokens**. La API Rails no usa el de Firebase en cada request.

1. Login con Google en el cliente (Firebase Auth: popup en web, plugin en Capacitor, OAuth+PKCE en Tauri).
2. El front canjea el Firebase ID token (~1 h) en `POST /api/v1/oauth/google`. Rails verifica el token y devuelve **su** JWT.
3. Ese JWT (24 h) se guarda en `localStorage` y el interceptor lo manda en `Authorization: Bearer` al resto de `/api/v1`.
4. Ante `401` `token_expired` / `token_invalid`, se pide un ID token fresco a Firebase y se vuelve a canjear, sin popup. No se refresca Firebase “antes de cada llamada”.
5. Logout borra el JWT en el cliente. Rails no revoca Bearers ya emitidos; valen hasta `exp`.

Contrato completo (web vs API, linking por email): README de ok_padel → Autenticación: web vs API.

## API consumida

Perfil (`GET/PATCH /api/v1/profile`), canchas, partidos (listado, detalle, alta, join/leave, mis partidos) y resultados. Ver el README de ok_padel → API REST.
