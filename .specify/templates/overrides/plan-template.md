# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: TypeScript 5.9, Angular 21

**Primary Dependencies**: Angular Material, RxJS, ngx-translate, Firebase Auth (Capacitor), Sentry Angular, `@angular/build`

**Storage**: N/A (state en memoria/servicios; backend vía HTTP)

**Testing**: Vitest + jsdom (`ng test` / `@angular/build:unit-test`); specs colocated `*.spec.ts`

**Target Platform**: Web PWA, Capacitor Android, Tauri desktop (según feature)

**Project Type**: SPA Angular standalone

**Performance Goals**: [domain-specific or N/A]

**Constraints**: Consumir solo contratos de ok_padel; errores vía `api-errors.ts`

**Scale/Scope**: [feature-specific]

## Backend spec (ok_padel)

**Spec directory (full-stack)**: `../ok_padel/specs/[###-feature-name]/` o ruta acordada en el workspace

**Contratos**: `../ok_padel/specs/[###-feature-name]/contracts/` y/o Swagger desplegado

**Endpoints usados**: [list `/api/v1/...` or N/A for UI-only]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [ ] **I. Contrato**: ¿Servicios alineados con contrato backend y `api-errors.ts`?
- [ ] **II. Tests**: ¿Qué `*.spec.ts` nuevos o actualizados?
- [ ] **III. Angular**: ¿Standalone, rutas en `*.routes.ts`, i18n en `public/i18n/`?
- [ ] **IV. Calidad**: ¿Plan incluye lint, format, test, build?
- [ ] **V. Multi-repo**: ¿Rama acordada en ambos repos si hay cambio API?

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md        # UI/state models if needed
├── quickstart.md
├── contracts/           # optional UI contract notes; API lives in ok_padel
└── tasks.md
```

### Source Code (repository root)

```text
src/app/
├── core/api/              # HTTP clients, api-errors
├── core/interceptors/
├── <feature>/             # components, routes, services
│   ├── *.ts
│   ├── *.html
│   ├── *.css
│   ├── *.routes.ts
│   └── *.spec.ts
└── app.routes.ts

public/i18n/
eslint.config.js
```

**Structure Decision**: Feature folders bajo `src/app/<feature>/`; API compartida en `src/app/core/api/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
|           |            |                                      |
