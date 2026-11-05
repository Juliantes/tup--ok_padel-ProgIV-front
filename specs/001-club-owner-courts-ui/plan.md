# Implementation Plan: Administración de canchas (modo dueño de club)

**Branch**: `001-club-owner-courts-ui` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-club-owner-courts-ui/spec.md`

## Summary

Unificar en **`/club`** la operación del dueño: grilla diaria de canchas (existente), ABM de canchas, ABM de turnos recurrentes y alquiler presencial (partido cerrado) con anulación, todo vía overlays en la misma ruta. El frontend consume contratos **ok_padel**; hoy faltan API de `time_slots` y walk-in booking — se implementan en backend en paralelo según [contracts/api-v1-owner-courts-extension.md](./contracts/api-v1-owner-courts-extension.md). Decisiones consolidadas en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9, Angular 21 (frontend); Ruby 3.x / Rails 8 (backend acoplado)

**Primary Dependencies**: Angular Material, RxJS, ngx-translate, Firebase Auth; backend JWT + Devise roles

**Storage**: N/A en cliente; PostgreSQL vía API

**Testing**: Vitest (`npm test`); backend `bundle exec rspec` + rswag

**Target Platform**: Web PWA (prioridad tablet mostrador); Capacitor/Tauri sin cambios específicos

**Project Type**: SPA Angular + API Rails multi-repo

**Performance Goals**: Recarga de grilla tras mutación < percepción instantánea en red local; sin paginación en grilla de un club típico (<20 canchas, <24 filas)

**Constraints**: Constitution frontend — solo contratos publicados; `readApiErrorMessage`; i18n `CLUB_OWNER.*`

**Scale/Scope**: Un feature folder `src/app/club/` ampliado; ~3–4 dialogs/panels; 2 bloques API nuevos en ok_padel

## Backend spec (ok_padel)

**Spec directory (full-stack):** `../ok_padel/specs/001-club-owner-courts-ui/` — **crear en implementación** copiando contratos desde este repo (`specs/001-club-owner-courts-ui/contracts/`).

**Contratos:** [contracts/](./contracts/) (propuesta); Swagger canónico tras rswag.

**Endpoints usados hoy:**

- `GET/POST/PATCH/DELETE /api/v1/clubs`, `.../courts`
- `GET /api/v1/clubs/:id/schedule?date=`

**Endpoints nuevos (planificados):** time_slots anidados; `walk_in_bookings` create/cancel — ver [api-v1-owner-courts-extension.md](./contracts/api-v1-owner-courts-extension.md).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Contrato**: Servicios extendidos solo tras contrato backend; tipos en `club.models.ts`; errores vía `api-errors.ts`.
- [x] **II. Tests**: Actualizar `club-owner.spec.ts`; specs para nuevos componentes dialog/panel; mocks HTTP alineados a contratos.
- [x] **III. Angular**: Standalone; rutas en `club.routes.ts`; textos en `public/assets/i18n/es.json`.
- [x] **IV. Calidad**: quickstart incluye lint, test, build (+ rspec backend).
- [x] **V. Multi-repo**: Cambios API en ok_padel en misma rama feature; usuario confirma rama antes de implement (spec branch placeholder).

**Post-design:** Sin violaciones; no rellenar Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-club-owner-courts-ui/
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── api-v1-owner-courts-extension.md
│   └── ui-club-owner-screen.md
├── spec.md
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (target)

```text
tup--padel-match-/
├── src/app/club/
│   ├── club-owner.ts|html|css
│   ├── club-schedule.utils.ts
│   ├── court-form-dialog/          # new
│   ├── time-slots-panel/           # new
│   ├── walk-in-booking-dialog/     # new
│   └── club.routes.ts
├── src/app/core/api/
│   ├── clubs-api.service.ts        # extend
│   └── club.models.ts              # extend
└── public/assets/i18n/es.json

ok_padel/
├── app/controllers/api/v1/club_court_time_slots_controller.rb  # new
├── app/controllers/api/v1/walk_in_bookings_controller.rb       # new
├── spec/requests/api/v1/...
└── db/migrate/*_add_walk_in_guest_to_matches.rb
```

**Structure Decision**: Monolito de pantalla en `club-owner` + componentes dialog standalone; lógica HTTP en `ClubsApiService` (o `OwnerScheduleApiService` si crece).

## Phase 0 — Research

**Status:** Complete → [research.md](./research.md). Sin NEEDS CLARIFICATION pendientes (clarify session 2026-11-04).

## Phase 1 — Design

**Status:** Complete.

| Artifact           | Path                             |
| ------------------ | -------------------------------- |
| Data model         | [data-model.md](./data-model.md) |
| API + UI contracts | [contracts/](./contracts/)       |
| Validation guide   | [quickstart.md](./quickstart.md) |

## Implementation slices (for `/speckit-tasks`)

1. **Backend B1:** Migración guest fields (+ flag walk-in opcional); model validations; time_slots API owner; request specs + Swagger.
2. **Backend B2:** Walk-in create/cancel; unicidad slot+fecha; excluir walk-in de listado público si aplica.
3. **Frontend F1:** Tipos + `ClubsApiService` methods; tests servicio.
4. **Frontend F2:** Court form dialog + integración grilla (P2).
5. **Frontend F3:** Time slots panel (P3).
6. **Frontend F4:** Walk-in + cancel dialogs; quitar WhatsApp en celda (P4).
7. **Converge:** quickstart manual + `/speckit-converge`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
