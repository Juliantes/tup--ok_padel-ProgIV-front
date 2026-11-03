---
description: 'Task list template for feature implementation (Padel Match frontend)'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md; contrato API en ok_padel si full-stack

**Tests**: Tests are **REQUIRED** per constitution principle II — every component, service, or guard touched needs `*.spec.ts` updates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Feature UI**: `src/app/<feature>/` (`.ts`, `.html`, `.css`, `*.routes.ts`, `*.spec.ts`)
- **API clients**: `src/app/core/api/`
- **Interceptors**: `src/app/core/interceptors/`
- **i18n**: `public/i18n/es.json` (y otros locales si aplica)
- **Routes root**: `src/app/app.routes.ts` o lazy `*.routes.ts`

<!--
  SAMPLE TASKS — /speckit-tasks MUST replace with real tasks from spec/plan/contracts.
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Routing, modules, shared types

- [ ] T001 Register routes in `src/app/<feature>/<feature>.routes.ts` and `app.routes.ts`
- [ ] T002 [P] i18n keys in `public/i18n/`
- [ ] T003 [P] API service methods in `src/app/core/api/` if new endpoints

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth guards, shared state, error handling

- [ ] T004 Wire guards/interceptors if feature requires auth
- [ ] T005 Map API errors via `src/app/core/api/api-errors.ts`

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description]

**Independent Test**: [How to verify]

### Tests for User Story 1 (REQUIRED — write first)

- [ ] T010 [P] [US1] Component spec `src/app/<feature>/<component>.spec.ts`
- [ ] T011 [P] [US1] Service spec if logic in service

### Implementation for User Story 1

- [ ] T012 [US1] Component(s) and templates
- [ ] T013 [US1] Styles and a11y basics
- [ ] T014 [US1] Hook to API services

**Checkpoint**: US1 testable with `npm test`

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

### Tests for User Story 2 (REQUIRED)

- [ ] T018 [P] [US2] Specs for US2 files

### Implementation for User Story 2

- [ ] T020 [US2] Implementation per plan.md

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX Run `npm run lint`
- [ ] TXXX Run `npm run format:check`
- [ ] TXXX Run `npm test`
- [ ] TXXX Run `npm run build`
- [ ] TXXX Manual check against ok_padel contract / staging API if full-stack

---

## Dependencies & Execution Order

- Setup → Foundational → User stories (P1 → P2 → …) → Polish
- Tests before implementation when feasible (Vitest RED then GREEN)

## Notes

- [P] = parallel-safe (different files)
- Document ok_padel PR/branch dependency in task descriptions when API not merged yet
