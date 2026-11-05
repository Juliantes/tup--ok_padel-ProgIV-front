# Quickstart: validar 001-club-owner-courts-ui

Guía para comprobar la feature end-to-end tras implementación (backend + frontend). No sustituye `tasks.md`.

## Prerrequisitos

- Rama acordada en **ok_padel** y **tup--padel-match-** (p. ej. `001-club-owner-courts-ui`).
- Backend local con migraciones aplicadas (guest fields + endpoints nuevos).
- Usuario con rol `club_owner` y al menos un club.
- Frontend: `npm install`; API base apuntando a Rails ( `environment.apiBaseUrl` ).

## 1. Backend — contrato

```bash
cd ok_padel
bundle exec rspec spec/requests/api/v1/owner_club_time_slots_spec.rb spec/requests/api/v1/walk_in_bookings_spec.rb
bundle exec rake rswag:specs:swaggerize
```

Esperado: specs verdes; Swagger incluye rutas nuevas.

## 2. Frontend — unit

```bash
cd tup--padel-match-
npm test -- --include='**/club/**'
npm run lint
npm run build
```

Esperado: tests de `club-owner` y diálogos verdes; build OK.

## 3. Manual — grilla (P1)

1. Login como dueño → `/club`.
2. Elegir fecha con turnos configurados.
3. Verificar columnas por cancha y estados distintos libre/ocupado/vacío.

Referencia: User Story 1 en [spec.md](./spec.md).

## 4. Manual — canchas (P2)

1. Abrir overlay ABM desde `/club`.
2. Crear cancha → aparece en pills y grilla.
3. Intentar borrar cancha con partidos asociados → error claro.

API: `contracts/api-v1-owner-courts-extension.md` (CRUD existente).

## 5. Manual — turnos (P3)

1. Abrir panel de turnos de una cancha.
2. Crear turno lunes 10:00–11:30.
3. Elegir un lunes en date strip → fila visible, celda `available` si cancha activa.

## 6. Manual — walk-in (P4)

1. Celda `available` → confirmar sin guest → celda `booked`.
2. Repetir con nombre/teléfono opcionales.
3. Anular reserva → celda `available`.
4. Confirmar que celda libre **no** abre WhatsApp.

## 5. Regresión

- Jugador sin rol dueño no accede a `/club` (guard existente).
- Cabecera WhatsApp sigue abriendo chat genérico del club.

## Artefactos relacionados

- [data-model.md](./data-model.md)
- [contracts/](./contracts/)
- [research.md](./research.md)
