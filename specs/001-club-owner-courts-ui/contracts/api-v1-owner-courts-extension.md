# API v1 extension (proposal) — owner time slots & walk-in bookings

**Owner:** ok_padel  
**Consumer:** `ClubsApiService` (+ tests + Swagger)

## Time slots (nested)

Base: `/api/v1/clubs/:club_id/courts/:court_id/time_slots`

| Method | Path                                | Description                                      |
| ------ | ----------------------------------- | ------------------------------------------------ |
| GET    | `.../time_slots`                    | List weekly template slots (`effective_on` null) |
| GET    | `.../time_slots?date=`              | Effective slots for one calendar date            |
| POST   | `.../time_slots`                    | Create weekly template slot                      |
| PATCH  | `.../time_slots/:id`                | Update weekly template slot                      |
| DELETE | `.../time_slots/:id`                | Delete weekly template slot                      |
| PUT    | `.../time_slots/day_override`       | Replace slots for one date only                  |
| DELETE | `.../time_slots/day_override?date=` | Remove date override (back to weekly)            |

**Authorization:** `require_club_owner!` + court belongs to `club_id` owned by user.

**POST/PATCH body (JSON):**

```json
{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "11:30",
  "is_available": true
}
```

**422:** overlapping slot (`TimeSlot` validation `:overlapping`), invalid times.

**Response item:**

```json
{
  "time_slot": {
    "id": 1,
    "court_id": 10,
    "day_of_week": 1,
    "effective_on": null,
    "start_time": "10:00",
    "end_time": "11:30",
    "is_available": true
  }
}
```

List wrapper: `{ "time_slots": [ ... ] }`.

**GET with `date`:** `{ "date", "day_of_week", "customized", "time_slots" }` where `time_slots` are either weekly template for that weekday or override slots when `customized` is true.

**PUT day_override body:** `{ "date": "2026-11-10", "slots": [{ "start_time", "end_time", "is_available" }] }`. Empty `slots` closes the court that date. **422** if the date has active bookings.

### Bulk replace (generator)

**POST** `.../time_slots/bulk`

Replaces **all** time slots for the given weekdays on that court with consecutive slots from open to close.

**Body:**

```json
{
  "open_time": "08:00",
  "close_time": "23:00",
  "duration_minutes": 90,
  "day_of_weeks": [1, 2, 3, 4, 5]
}
```

| Field                     | Rules                                                   |
| ------------------------- | ------------------------------------------------------- |
| `open_time`, `close_time` | `HH:MM`; `open_time` < `close_time` (same calendar day) |
| `duration_minutes`        | Integer > 0                                             |
| `day_of_weeks`            | 1–7 unique integers, each 0–6                           |

**Generation:** For each day, create slots `[open, open+dur)`, `[open+dur, open+2dur)`, … while `end <= close`. Partial remainder at the end is dropped. All created with `is_available: true`.

**Transaction:** Delete existing **weekly** slots (`effective_on` null) on those weekdays for the court, then insert new ones. Does not remove date overrides. **422 without changes** if any slot to delete has a non-cancelled match with `date >= today`. Past/cancelled matches are nullified on slot delete (existing behavior).

**Success 201:** `{ "time_slots": [ ... ] }` — **all** slots for the court (same shape as GET list), ordered by `day_of_week`, `start_time`.

**422 examples:**

- No full slot fits in `[open, close]` with given duration
- Invalid params (empty days, bad times, duration ≤ 0)
- Future bookings block replace (`base` or dedicated key)

## Walk-in booking (owner)

**POST** `/api/v1/clubs/:club_id/walk_in_bookings`

**Body:**

```json
{
  "court_id": 10,
  "time_slot_id": 5,
  "date": "2026-11-04",
  "walk_in_guest_name": "Juan",
  "walk_in_guest_phone": "+54911..."
}
```

`walk_in_guest_*` optional; omit or null allowed.

**Success 201:** `WalkInBookingResponse` (match summary as in `data-model.md`).

**422 examples:**

- Slot not available / court inactive
- Slot already booked for date
- Date weekday mismatch with slot

**DELETE** `/api/v1/clubs/:club_id/walk_in_bookings/:match_id`

- Cancels walk-in match (status → `cancelled`) if owner authorized and business rules allow.
- **404** foreign club/match; **422** if not cancellable.

## Schedule cell (optional enhancement)

If tooltip needs guest label without second fetch, extend `cells[]` with optional:

```json
{
  "walk_in_guest_name": "Juan"
}
```

Only when state is `booked` and match is walk-in. **Defer** if match detail fetch is enough for v1.

## Migration (ok_padel)

```ruby
add_column :matches, :walk_in_guest_name, :string
add_column :matches, :walk_in_guest_phone, :string
# optional: add_column :matches, :walk_in, :boolean, default: false, null: false
```

Index/uniqueness: consider unique partial index on `(time_slot_id, date)` for non-cancelled matches to enforce concurrency (research edge case).
