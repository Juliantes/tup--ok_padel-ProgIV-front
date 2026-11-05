# WIP — UI Mis canchas (`/club`)

Resumen para retomar el proyecto. Copia ampliada en el store personal del usuario (`ok-padel-estado-proyecto.md`).

## Qué estábamos haciendo

Modificar la UI de **Mis canchas** en `http://localhost:4200/club`: vista estilo grilla de reservas (referencia “Punto de Oro”), en lugar de chips + formularios CRUD.

## Archivos clave (frontend)

- `src/app/club/club-owner.ts|html|css`
- `src/app/club/club-schedule.utils.ts`
- `src/app/core/api/clubs-api.service.ts` → `getSchedule()`
- `public/assets/i18n/es.json` → claves `CLUB_OWNER.*`

## Archivos clave (backend)

- `app/services/club_schedule_builder.rb`
- `app/controllers/api/v1/club_schedules_controller.rb`
- `GET /api/v1/clubs/:id/schedule?date=`

## Último fix

Mostrar **todas las canchas** vía `listCourts` + pills + columnas, aunque no haya turnos para la fecha elegida.
