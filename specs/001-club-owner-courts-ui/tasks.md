---
description: 'Task list for 001-club-owner-courts-ui (Padel Match frontend + ok_padel API)'
---

# Tasks: Administración de canchas (modo dueño de club)

**Input**: Design documents from `/specs/001-club-owner-courts-ui/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **REQUIRED** per constitution principle II — every component, service, or guard touched needs `*.spec.ts` updates.

**Organization**: Tasks grouped by user story; backend foundational work blocks US3/US4 API consumption.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in same phase)
- **[Story]**: US1–US4 from [spec.md](./spec.md)

## Path Conventions

- **Feature UI**: `src/app/club/`
- **API clients**: `src/app/core/api/`
- **i18n**: `public/assets/i18n/es.json`
- **Backend**: `ok_padel/` (parallel repo, same feature branch when agreed)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Multi-repo alignment and contract handoff before code.

- [x] T001 Confirm with user that **ok_padel** and **tup--padel-match-** are on the agreed feature branch (e.g. `001-club-owner-courts-ui`) via `git branch --show-current` in each repo — do not create/switch branches without explicit agreement
- [x] T002 Copy `tup--padel-match-/specs/001-club-owner-courts-ui/contracts/` into `ok_padel/specs/001-club-owner-courts-ui/contracts/` and add minimal `ok_padel/specs/001-club-owner-courts-ui/plan.md` pointing at frontend spec (per [plan.md](./plan.md) Backend spec section)
- [x] T003 [P] Audit existing `/club` route and club-owner guard in `src/app/club/club.routes.ts` and auth guards — ensure only `club_owner` reaches `ClubOwner` (FR-001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New API in **ok_padel** + typed HTTP client in Angular. **Must complete before US3 and US4**; US1/US2 can start in parallel once T012–T014 are done for courts-only paths, but time slots and walk-in require T004–T011.

**Checkpoint**: Swagger documents time_slots + walk_in_bookings; `ClubsApiService` methods exist with unit tests.

### Backend B1 — Time slots (ok_padel)

- [x] T004 Add migration in `ok_padel/db/migrate/` for `matches.walk_in_guest_name` and `matches.walk_in_guest_phone` (nullable string) per [contracts/api-v1-owner-courts-extension.md](./contracts/api-v1-owner-courts-extension.md)
- [x] T005 [P] Add optional `matches.walk_in` boolean (default false, null: false) in `ok_padel` if used to exclude walk-ins from public `matches#index` (research R4)
- [x] T006 Implement `Api::V1::ClubCourtTimeSlotsController` at `/api/v1/clubs/:club_id/courts/:court_id/time_slots` (GET list, POST, PATCH, DELETE) with `require_club_owner!` and court belongs to owned club
- [x] T007 Register nested routes in `ok_padel/config/routes.rb`; enforce `TimeSlot` validations: `day_of_week` 0–6, `end_time` > `start_time`, no overlapping slot same day/court (`:overlapping` → 422)
- [x] T008 Add `ok_padel/spec/requests/api/v1/owner_club_time_slots_spec.rb` with rswag blocks; document POST/PATCH body and list wrapper `{ "time_slots": [...] }` in Swagger

### Backend B2 — Walk-in bookings (ok_padel)

- [x] T009 Implement `Api::V1::WalkInBookingsController`: POST `/api/v1/clubs/:club_id/walk_in_bookings` (201 + match summary), DELETE `/api/v1/clubs/:club_id/walk_in_bookings/:match_id` (cancel → `cancelled`); owner auth; `join_policy` manual, status confirmed; optional guest fields
- [x] T010 Add `ok_padel/spec/requests/api/v1/walk_in_bookings_spec.rb` covering 422: slot booked for date, weekday mismatch, court inactive; concurrency edge (one booking wins)
- [x] T011 Run `bundle exec rake rswag:specs:swaggerize` in **ok_padel** and verify `/api-docs` matches [data-model.md](./data-model.md) shapes

### Frontend F1 — Types & API service

- [x] T012 Add `OwnerTimeSlot`, time slot list/response types, `WalkInBookingPayload`, and `WalkInBookingResponse` to `src/app/core/api/club.models.ts` (fields per [data-model.md](./data-model.md))
- [x] T013 Extend `src/app/core/api/clubs-api.service.ts` with `listTimeSlots`, `createTimeSlot`, `updateTimeSlot`, `deleteTimeSlot`, `createWalkInBooking`, and `cancelWalkInBooking` using paths from [contracts/api-v1-owner-courts-extension.md](./contracts/api-v1-owner-courts-extension.md)
- [x] T014 [P] Create `src/app/core/api/clubs-api.service.spec.ts` with `HttpClientTestingModule` asserting URLs, methods, and JSON bodies for all new methods

---

## Phase 3: User Story 1 — Grilla operativa del día (Priority: P1) — MVP

**Goal**: Dueño elige club y fecha; grilla con columnas por cancha, filas por turno, estados `empty` | `blocked` | `available` | `booked` (FR-003, FR-004).

**Independent Test**: Club con ≥2 canchas y turnos para el día de la semana de la fecha elegida → grilla legible; sin turnos → aviso claro, no pantalla vacía; celda ocupada sin CTA de alquiler.

### Tests for User Story 1 (REQUIRED — write/update first)

- [x] T015 [P] [US1] Expand `src/app/club/club-owner.spec.ts`: multi-club selection reloads schedule; empty courts message; no-slots-for-weekday notice; mocked cells show distinct states and no walk-in CTA on `booked`

### Implementation for User Story 1

- [x] T016 [US1] Update `src/app/club/club-owner.html` for empty courts, missing slots warning, and grid table headers with `scope="col"` / `scope="row"` per [contracts/ui-club-owner-screen.md](./contracts/ui-club-owner-screen.md)
- [x] T017 [P] [US1] Update `src/app/club/club-owner.css` so `empty`, `blocked`, `available`, and `booked` are visually distinct (FR-004)
- [x] T018 [US1] Add `refreshAfterMutation()` (or equivalent) in `src/app/club/club-owner.ts` that reloads `listCourts` + `getSchedule` for current `selectedClubId` and `selectedDate` (FR-008 foundation)

**Checkpoint**: US1 verifiable with `npm test -- --include='**/club-owner.spec.ts'` and manual quickstart §3.

---

## Phase 4: User Story 2 — Gestionar canchas del club (Priority: P2)

**Goal**: ABM canchas (nombre, `court_type` `indoor`|`outdoor`, `price_per_hour`, `status` `active`|`maintenance`|`inactive`, `description` opcional) desde overlays en `/club` (FR-005, FR-012).

**Independent Test**: Crear cancha → aparece en pills/grilla; borrar bloqueado por negocio → mensaje claro vía `readApiErrorMessage`.

### Tests for User Story 2 (REQUIRED)

- [x] T019 [P] [US2] Create standalone `src/app/club/court-form-dialog/` (`court-form-dialog.ts`, `.html`, `.css`, `court-form-dialog.spec.ts`) covering create, edit, delete confirm, and validation of required `name`

### Implementation for User Story 2

- [x] T020 [US2] Wire `MatDialog` from `src/app/club/club-owner.ts` / `club-owner.html` (“Gestionar canchas” or FAB) to open court form for create/edit; call existing `createCourt` / `updateCourt` / `deleteCourt` on `ClubsApiService`
- [x] T021 [P] [US2] Add `CLUB_OWNER.COURT_FORM.*` strings in `public/assets/i18n/es.json` (labels, errors, delete confirm)
- [x] T022 [US2] On successful court mutation call `refreshAfterMutation()`; on delete failure show Spanish message from `readApiErrorMessage` without removing court from UI (acceptance scenario US2.3)

**Checkpoint**: US2 testable with dialog specs + manual quickstart §4.

---

## Phase 5: User Story 3 — Configurar turnos recurrentes por cancha (Priority: P3)

**Goal**: CRUD turnos semanales por cancha (`day_of_week` 0–6, `start_time`/`end_time` `HH:MM`, `is_available`); grilla refleja filas en fechas coincidentes (FR-006).

**Independent Test**: Crear turno lunes 10:00–11:30 → elegir un lunes en date strip → celda ofrecible si cancha `active`.

**Depends on**: Phase 2 backend T006–T008 and frontend T012–T014.

### Tests for User Story 3 (REQUIRED)

- [x] T023 [P] [US3] Create `src/app/club/time-slots-panel/` with `time-slots-panel.spec.ts`: list slots, create valid slot, show server 422 overlapping without wiping form

### Implementation for User Story 3

- [x] T024 [US3] Integrate time slots panel trigger from court pills or grid column header in `club-owner.html` / `club-owner.ts` (`MatSidenav`, bottom sheet, or dialog per [contracts/ui-club-owner-screen.md](./contracts/ui-club-owner-screen.md))
- [x] T025 [P] [US3] Add `CLUB_OWNER.TIME_SLOTS.*` in `public/assets/i18n/es.json` (días, disponible/no disponible, errores)
- [x] T026 [US3] After slot CRUD success call `refreshAfterMutation()`; inactive court (`status` `inactive`) still shows `blocked` cells per data-model matrix

**Checkpoint**: US3 + manual quickstart §5.

---

## Phase 6: User Story 4 — Alquiler presencial desde la grilla (Priority: P4)

**Goal**: Confirmar walk-in en celda `available` (partido cerrado); optional guest name/phone (FR-014); anular en celda `booked` (FR-011); no WhatsApp en celda (FR-013).

**Independent Test**: Celda libre → confirmar → `booked` persiste al cambiar fecha y volver; anular → `available`; error de red no deja UI inconsistente.

**Depends on**: Phase 2 T009–T011 and T012–T014.

### Tests for User Story 4 (REQUIRED)

- [x] T027 [P] [US4] Create `src/app/club/walk-in-booking-dialog/` with `walk-in-booking-dialog.spec.ts`: confirm with/without optional guest fields; cancel closes without API call
- [x] T028 [P] [US4] Extend `club-owner.spec.ts` for opening walk-in dialog on `available`, cancel flow on `booked` with `match_id`, and assert `reserveViaWhatsApp` is not invoked for available cells

### Implementation for User Story 4

- [x] T029 [US4] Remove `reserveViaWhatsApp` from available cells in `club-owner.html`; keep `whatsappHref` only in club hero/header (research R7)
- [x] T030 [US4] On `available` cell click open walk-in dialog; POST via `createWalkInBooking`; on success `refreshAfterMutation()` without optimistic cell update
- [x] T031 [US4] On `booked` cell with walk-in `match_id`, show explicit confirm then `cancelWalkInBooking`; handle 422/409 with `readApiErrorMessage` and refresh schedule
- [x] T032 [P] [US4] Add `CLUB_OWNER.WALK_IN.*` and `CLUB_OWNER.CANCEL.*` in `public/assets/i18n/es.json`

**Checkpoint**: US4 + manual quickstart §6.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 Execute manual scenarios in [quickstart.md](./quickstart.md) §3–§6 and regression §5 (non-owner blocked from `/club`)
- [x] T034 [P] Run `npm run lint` and `npm run format:check` in **tup--padel-match-**
- [x] T035 Run `npm test` in **tup--padel-match-**
- [ ] T036 Run `npm run build` in **tup--padel-match-**
- [x] T037 Run `bundle exec rspec spec/requests/api/v1/owner_club_time_slots_spec.rb spec/requests/api/v1/walk_in_bookings_spec.rb` in **ok_padel**
- [x] T038 Run `/speckit-converge` against [spec.md](./spec.md) and contracts when implementation complete

## Phase 9: Convergence

- [ ] T041 Fix `npm run build` failure: `match-detail.css` exceeds Angular component budget (8 kB error at ~9.95 kB) per Constitution IV / T036 (partial)

---

## Dependencies & Execution Order

```text
Phase 1 (Setup)
    ↓
Phase 2 Backend B1 → B2 → Swagger (T004–T011)
    ↓
Phase 2 Frontend F1 (T012–T014) — can start after T011 or in parallel with late B2 if mocks used temporarily (constitution prefers real contract)
    ↓
Phase 3 US1 (T015–T018) — MVP; mostly existing grilla
    ↓
Phase 4 US2 (T019–T022) — courts dialog; uses existing court CRUD
    ↓
Phase 5 US3 (T023–T026) — requires T006–T014
    ↓
Phase 6 US4 (T027–T032) — requires T009–T014
    ↓
Phase 7 Polish
```

**User story completion order (priority)**: US1 → US2 → US3 → US4. US2 does not strictly require US1 code complete but shares `club-owner` shell; US3/US4 require foundational API.

---

## Parallel Execution Examples

### After Phase 2 complete

- **US1**: T015 ∥ T017 (spec vs CSS)
- **US2**: T019 ∥ T021 (dialog component ∥ i18n)
- **US3**: T023 ∥ T025 (panel ∥ i18n)
- **US4**: T027 ∥ T032 (walk-in dialog ∥ i18n); T028 can follow T029 template changes

### Cross-repo

- Developer A: ok_padel T004–T011
- Developer B: tup--padel-match- T012–T014 then US1–US2 while waiting for walk-in API

---

## Implementation Strategy

1. **MVP**: Phase 1 + Phase 2 (minimal: schedule API already exists) + **Phase 3 US1** — operable grilla for dueño.
2. **Increment 2**: US2 court dialog on same route.
3. **Increment 3**: Backend time slots + US3 panel.
4. **Increment 4**: Backend walk-in + US4 dialogs; remove WhatsApp cell booking.
5. **Done**: Phase 7 quality gates + converge.

---

## Notes

- Do not implement UI that calls endpoints absent from Swagger; align with **ok_padel** PR/branch before merging frontend walk-in/slots UI.
- `[P]` tasks touch different files; still respect story checkpoints for independent testing.
- Constitution i18n path: `public/assets/i18n/es.json` (plan also references this path).

## Phase 8: Convergence

- [x] T039 Wire court **edit** and **delete** entry points on `/club` (court pill, grid header, or manage flow) to open `CourtFormDialog` with a full `Court` from `listCourts` — `openEditCourt` exists but is unused; `openCreateCourt` only supports alta per US2/AC2, FR-005, plan:ui-club-owner-screen (partial)
- [x] T040 Extend `club-owner.spec.ts` to cover opening the court form in edit mode and saving via PATCH (and optional delete confirm path) per Constitution II and US2 (partial)
