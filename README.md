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
