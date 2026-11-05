# Data Model: 001-club-owner-courts-ui

Vista **frontend + contratos consumidos**. Fuente de verdad de persistencia: **ok_padel** (`Court`, `TimeSlot`, `Match`).

## Entidades de dominio (backend)

### Club (existente)

| Campo                           | Uso en UI                     |
| ------------------------------- | ----------------------------- |
| id, name, address, phone, email | Cabecera, selector multi-club |

### Court (existente, owner CRUD)

| Campo          | Validación / notas                                                    |
| -------------- | --------------------------------------------------------------------- |
| name           | Requerido                                                             |
| court_type     | `indoor` \| `outdoor`                                                 |
| price_per_hour | Numérico; mostrado en pills/grilla                                    |
| status         | `active` \| `maintenance` \| `inactive` — inactiva → celdas `blocked` |
| description    | Opcional                                                              |

Relación: `Club` 1—N `Court`.

### TimeSlot (existente; API dueño **nueva**)

| Campo                | Validación / notas                                       |
| -------------------- | -------------------------------------------------------- |
| court_id             | Cancha del club propio                                   |
| day_of_week          | 0 (domingo) … 6 (sábado), igual que backend              |
| start_time, end_time | `HH:MM`; fin > inicio; sin solapamiento mismo día/cancha |
| is_available         | `false` → celda `blocked` en grilla                      |

Relación: `Court` 1—N `TimeSlot`.

**Bulk replace (comando):** No persiste fila aparte. Parámetros `open_time`, `close_time`, `duration_minutes`, `day_of_weeks[]` generan N `TimeSlot` por día seleccionado tras borrar los existentes de esos días en la cancha (ver contrato bulk). Bloqueo si hay `Match` no cancelado con `date >= hoy` referenciando un slot a borrar.

### Match (walk-in / alquiler presencial)

| Campo                        | Validación / notas                                  |
| ---------------------------- | --------------------------------------------------- |
| court_id, time_slot_id, date | Deben ser coherentes (`date_matches_time_slot_day`) |
| duration                     | Minutos; típicamente derivado de slot               |
| status                       | `confirmed` al crear walk-in                        |
| join_policy                  | `manual`; sin convocatoria abierta                  |
| creator_id                   | Dueño autenticado                                   |
| walk_in_guest_name           | Opcional (nuevo)                                    |
| walk_in_guest_phone          | Opcional (nuevo)                                    |

**Estado en grilla:** match activo no cancelado en slot+fecha → celda `booked`.

### ClubScheduleCell (proyección, no tabla)

| Campo        | Significado UI      |
| ------------ | ------------------- |
| state        | Ver matriz abajo    |
| time_slot_id | null si `empty`     |
| match_id     | null si no `booked` |

## Matriz celda → UI

| state       | Visual       | Acciones dueño                           |
| ----------- | ------------ | ---------------------------------------- |
| `empty`     | Celda vacía  | Configurar turnos (panel)                |
| `blocked`   | No ofrecido  | Editar turno/cancha                      |
| `available` | CTA reservar | Diálogo alquiler presencial (FR-013)     |
| `booked`    | Ocupado      | Anular/liberar (FR-011) si match walk-in |

## Modelos TypeScript (frontend)

Ubicación actual: `src/app/core/api/club.models.ts` (+ extensiones).

### Existentes (mantener)

- `OwnerClub`, `OwnerCourtPayload`, `ClubScheduleResponse`, `ClubScheduleCell`, etc.

### Nuevos (planificados)

```typescript
export interface OwnerTimeSlot {
  id: number;
  court_id: number;
  day_of_week: number;
  start_time: string; // HH:MM
  end_time: string;
  is_available: boolean;
}

export interface WalkInBookingPayload {
  court_id: number;
  time_slot_id: number;
  date: string; // ISO date
  walk_in_guest_name?: string | null;
  walk_in_guest_phone?: string | null;
}

export interface WalkInBookingResponse {
  match: {
    id: number;
    court_id: number;
    time_slot_id: number;
    date: string;
    status: string;
    walk_in_guest_name?: string | null;
    walk_in_guest_phone?: string | null;
  };
}
```

## Estado local UI (`ClubOwner` y hijos)

| Signal / estado                                 | Propósito            |
| ----------------------------------------------- | -------------------- |
| selectedClubId, selectedDate                    | Contexto grilla      |
| schedule, courts                                | Datos API            |
| dialog: courtForm, timeSlotsCourtId, walkInCell | Overlays FR-012      |
| isLoading, errorMessage                         | Empty/error (FR-010) |

Tras mutación exitosa: refrescar `listCourts` + `getSchedule` (FR-008).

## Transiciones (walk-in)

```text
available --[confirm walk-in]--> booked
booked --[owner cancel]--> available
available --[conflict 422]--> available (sin cambio optimista)
```
