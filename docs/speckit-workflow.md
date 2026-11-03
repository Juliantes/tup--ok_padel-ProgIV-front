# Flujo Spec Kit — Padel Match (frontend)

Este repositorio tiene Spec Kit (`specify init` v1.2.5) con integración Cursor. Gobernanza: [`.specify/memory/constitution.md`](../.specify/memory/constitution.md).

## Cuándo usar este repo para Spec Kit

| Tipo de feature                   | Dónde correr Speckit                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Solo pantallas / UX sin API nueva | **tup--padel-match-** (este repo)                                                                                    |
| Full-stack                        | **ok_padel** — spec y `contracts/` en `ok_padel/specs/NNN-nombre/`; acá solo plan/tasks de UI referenciando ese spec |
| Solo backend                      | **ok_padel** — ver `ok_padel/docs/speckit-workflow.md`                                                               |

Contrato API: Swagger del backend o `ok_padel/specs/NNN-*/contracts/`. Errores HTTP: `src/app/core/api/api-errors.ts`.

## Comandos (orden recomendado)

1. `/speckit-specify`
2. `/speckit-clarify`
3. `/speckit-plan`
4. `/speckit-analyze`
5. `/speckit-tasks`
6. `/speckit-checklist` (opcional)
7. `/speckit-implement`
8. `/speckit-converge`

Feature activa: `.specify/feature.json` (local, gitignored).

## Git multi-repo

Rama acordada en **ok_padel** y **tup--padel-match-** antes de implementar. El agente no hace commit/push por defecto.

## Quality gates (frontend)

```bash
npm run lint
npm run format:check
npm test
npm run build
```

## Templates

Overrides en `.specify/templates/overrides/` (`spec-template`, `plan-template`, `tasks-template`).

```bash
.specify/scripts/bash/resolve-template.sh plan-template --json
```
