# Research: 001-club-owner-courts-ui

## R1 — Estado actual del frontend (`/club`)

**Decision:** Extender la pantalla existente `ClubOwner` (grilla + pills + date strip) con overlays Material (dialog/sidenav) para ABM y reservas; no nuevas rutas hijas.

**Rationale:** Alineado con clarificaciones FR-012 y WIP en `docs/wip-mis-canchas-ui.md`. Ya consume `listClubs`, `listCourts`, `getSchedule`.

**Alternatives considered:**

- Subrutas `/club/courts/:id` — rechazado por spec.
- Reemplazar grilla por formularios — rechazado; la grilla es P1.

## R2 — Contrato de grilla (`GET /api/v1/clubs/:id/schedule`)

**Decision:** Mantener `ClubScheduleResponse` y `ClubScheduleCell` (`empty` | `blocked` | `booked` | `available`); usar `time_slot_id` y `match_id` de celdas `available`/`booked` para acciones de reserva/anulación.

**Rationale:** `ClubScheduleBuilder` ya deriva estados desde `TimeSlot` + `Match` en la fecha.

**Alternatives considered:**

- Segunda API solo UI — duplicaría lógica de negocio.

## R3 — API de turnos recurrentes para dueño

**Decision:** Implementar en **ok_padel** CRUD anidado bajo club/cancha propia (mirror admin, con `club_owner` auth), p. ej. `/api/v1/clubs/:club_id/courts/:court_id/time_slots`. Payload alineado a `TimeSlot`: `day_of_week` (0–6), `start_time`, `end_time`, `is_available`.

**Rationale:** Hoy turnos solo existen en `Admin::TimeSlots`; no hay rutas en `api/v1` (confirmado en `config/routes.rb` y Swagger).

**Alternatives considered:**

- Reutilizar admin HTML — inaccesible al dueño en producto.
- Turnos solo en frontend — viola constitution (no inventar contrato).

## R4 — Alquiler presencial (partido cerrado)

**Decision:** Endpoint dedicado de dueño (no `POST /api/v1/matches` público) que cree un `Match` con: `court_id`, `time_slot_id`, `date` (día visible), `duration` derivada del slot, `status: confirmed`, `join_policy: manual`, sin auto-inscripción del creador como jugador activo (o `auto_join: false`), excluido del listado público `matches#index` (open/full).

**Rationale:** `POST /matches` exige jugador creador, puede dejar partido `open` visible en convocatorias; no hay campos guest en schema actual.

**Alternatives considered:**

- `POST /matches` + filtros — riesgo de mezclar matchmaking y mostrador; validación de ownership de cancha ausente en create genérico.

## R5 — Datos opcionales cliente mostrador

**Decision:** Persistir en backend con migración en `matches`: `walk_in_guest_name` (string, nullable), `walk_in_guest_phone` (string, nullable); exponer en respuesta del booking y opcionalmente en schedule cell meta si hace falta tooltip (fase UI).

**Rationale:** Spec FR-014; no existe campo genérico en `matches` hoy.

**Alternatives considered:**

- Solo UI local — pierde dato al recargar.
- Tabla aparte `court_rentals` — más scope; partido ya reserva slot.

## R6 — Anulación de alquiler presencial

**Decision:** `DELETE` (o `POST .../cancel`) sobre el partido walk-in, autorizado solo si `current_user` es dueño del club de la cancha y el partido es cancelable (p. ej. no `completed` con consenso). Transición a `cancelled` y celda vuelve a `available`.

**Rationale:** FR-011; `ClubScheduleBuilder` deja de indexar match cancelado en slot.

**Alternatives considered:**

- Borrado físico — inconsistente con historial de partidos.

## R7 — UX celdas y WhatsApp

**Decision:** Eliminar `reserveViaWhatsApp` en celdas `available`; mantener enlace WhatsApp solo en cabecera del club. Acciones: `available` → abrir diálogo confirmación; `booked` con `match_id` → acción anular (si API lo permite).

**Rationale:** FR-013, clarificación sesión 2026-11-04.

## R8 — Orden de implementación multi-repo

**Decision:** Backend primero (time_slots API + walk-in booking + guest fields + rswag); luego frontend servicios + UI; rama `001-club-owner-courts-ui` en ambos repos cuando el usuario lo confirme.

**Rationale:** Constitution I y V; frontend no debe adelantar shapes JSON.

**Alternatives considered:**

- Mocks prolongados — retrasa converge y E2E real.
