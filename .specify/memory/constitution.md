# Padel Match Frontend Constitution

## Core Principles

### I. Contrato con el backend

La app consume solo contratos definidos en **ok_padel** (Swagger en `/api-docs` o `ok_padel/specs/NNN-*/contracts/`). No inventar formas JSON ni códigos de error: mapear respuestas de error con `src/app/core/api/api-errors.ts` y patrones existentes en `src/app/core/api/`. Cambios de contrato se implementan después de que exista spec/contrato en el backend.

### II. Tests obligatorios (NON-NEGOTIABLE)

Todo componente, servicio, guard o pipe nuevo o modificado de forma material incluye o actualiza su `*.spec.ts` (Vitest vía `@angular/build:unit-test`). Los tests deben describir comportamiento observable (no detalle de implementación trivial). Ejecutar `npm test` antes de dar por cerrada la feature.

### III. Convenciones Angular

Componentes standalone; rutas por feature en `*.routes.ts`; textos de UI vía ngx-translate (`public/i18n/`). Lógica de negocio en servicios/types, no en templates. Reutilizar `src/app/core/` (API, interceptors) antes de duplicar HTTP.

### IV. Calidad y entrega

Antes de cerrar una feature:

- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run build`

No omitir hooks de Husky/lint-staged. Sentry y analytics siguen convenciones existentes del repo.

### V. Multi-repo y git

Workspace acoplado a **ok_padel**. Features full-stack: spec y contratos en `ok_padel/specs/NNN-*`; este repo referencia esa ruta en plan/spec y lista pantallas/servicios afectados bajo `src/app/`. No crear ni cambiar ramas sin acuerdo explícito. El agente no ejecuta `git commit` ni `git push` salvo pedido explícito del usuario.

## Additional Constraints

Stack: Angular 21, TypeScript 5.9, Angular Material, RxJS, ngx-translate, Firebase Auth/Capacitor/Tauri según target. Estructura por dominio: `src/app/<feature>/`, API compartida en `src/app/core/api/`.

## Development Workflow

Para UI pura: Spec Kit solo en este repo. Para full-stack: seguir el spec en ok_padel y usar `/speckit-plan` aquí solo si hay slice UI independiente. Flujo: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-analyze` → `/speckit-tasks` → `/speckit-implement` → `/speckit-converge`. Guía: `docs/speckit-workflow.md`.

## Governance

Esta constitution prevalece sobre plantillas genéricas de Spec Kit. Enmiendas: bump semver en el pie + nota en PR. El backend `AGENTS.md` aplica al API; este documento gobierna el frontend.

**Version**: 1.0.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-03
