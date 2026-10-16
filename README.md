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

1. Login con Google (Firebase).
2. El front envía el Firebase ID token a `POST /api/v1/oauth/google`.
3. Se guarda el JWT Rails en `localStorage` y se usa en `Authorization: Bearer` para el resto de la API.
4. Si el JWT expira, el front renueva con un nuevo Firebase ID token sin volver a mostrar el popup.

## API consumida

Perfil (`GET/PATCH /api/v1/profile`), canchas, partidos (listado, detalle, alta, join/leave, mis partidos) y resultados. Ver el README de ok_padel → API REST.
