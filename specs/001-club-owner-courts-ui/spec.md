# Feature Specification: Administración de canchas (modo dueño de club)

**Feature Branch**: `[pendiente de acuerdo con el usuario]`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "En este tramo del proyecto estamos trabajando para desarrollar la UI de canchas, en modo club owner. Entonces tenemos que mejorar las vista de modo tal que estas sean adecuadas para esta funcionalidades. Un club owner tiene que poder crear, borrar, canchas, crear los horarios dentro de las canchas y darlas en alquiler a través de la app, por ejemplo de una persona va a la cancha y la reserva personalmente. O sea tiene que poder administrar los horarios de las canchas, luego en otra feature, habrá un desarrollo similar pero para que un jugador pueda reservar la cancha a través de la app."

## Cross-repo impact

| Repo                              | Rol                                  | Referencia                                                                                                             |
| --------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **ok_padel**                      | API y contrato (dueño en full-stack) | Contrato existente en Swagger `/api-docs`; spec backend pendiente si falta API de turnos o reserva en nombre del dueño |
| **tup--padel-match-** (este repo) | UI / consumo API                     | `specs/001-club-owner-courts-ui/`                                                                                      |

**Backend spec link**: N/A por ahora — consumir contratos ya publicados donde existan; cualquier endpoint nuevo para turnos recurrentes o reserva presencial del dueño debe especificarse en `ok_padel` antes de implementar la UI que lo consuma.

**Endpoints consumidos** (`/api/v1/...`): `clubs`, `clubs/:id/courts` (CRUD), `clubs/:id/schedule?date=`; reserva presencial y ABM de turnos recurrentes dependen de contratos que hoy pueden estar solo en panel admin — ver Assumptions.

**Pantallas / rutas afectadas**: `src/app/club/` (vista dueño, ruta `/club`), textos `CLUB_OWNER.*` en i18n.

## Alcance

### Incluye

- Experiencia unificada para el **dueño de club** en la sección **Mis canchas**: ver el club, sus canchas y la grilla de disponibilidad por fecha.
- **Alta, edición y baja** de canchas del club propio, con retroalimentación clara ante errores de negocio (por ejemplo, no poder eliminar una cancha con historial).
- **Administración de horarios** (franjas recurrentes por día de semana) asociados a cada cancha, de forma que la grilla muestre filas y celdas coherentes con esos turnos.
- **Registro de alquiler presencial**: el dueño confirma en la app un turno libre para la fecha seleccionada (cliente en mostrador); el sistema crea un **partido cerrado/privado** asociado al turno (sin convocatoria abierta) y la celda pasa a estado ocupado en la grilla.
- **Anulación de alquiler presencial**: el dueño puede cancelar o liberar un alquiler ya confirmado desde la misma área; el partido asociado deja de reservar el turno y la celda vuelve a libre.
- Mejoras de usabilidad respecto al enfoque anterior (formularios sueltos / reserva solo por mensajería externa): la gestión operativa del día a día MUST hacerse desde la **misma ruta Mis canchas** (`/club`), con la grilla como vista principal y **paneles, modales o drawers** para alta/edición de canchas y turnos (sin subrutas obligatorias para esas tareas).

### No incluye (feature futura explícita)

- Reserva **autogestionada por jugadores** desde la app (buscar club, elegir turno y confirmar sin intervención del dueño).
- Cobro en línea, facturación o conciliación de pagos.
- Gestión de partidos abiertos, políticas de join o resultados (dominio “matchmaking”, no alquiler de cancha).
- Panel de administración global de la plataforma.

## Clarifications

### Session 2026-11-04

- Q: Cuando el dueño confirma un alquiler presencial en una celda libre, qué debe quedar registrado en el producto? → A: Un partido/reserva de cancha en el sistema (partido privado o cerrado, sin convocatoria abierta a jugadores).
- Q: En este tramo, ¿el dueño debe poder anular o liberar un alquiler presencial ya confirmado desde Mis canchas? → A: Sí; puede cancelar o liberar el alquiler y la celda vuelve a estado libre.
- Q: ¿Dónde debe vivir la gestión de turnos recurrentes y el ABM de canchas respecto de la grilla en Mis canchas? → A: Misma pantalla `/club`: grilla principal más paneles, modales o drawers para canchas y turnos.
- Q: En una celda libre, cuando el alquiler presencial en app esté disponible, ¿cuál debe ser la acción principal? → A: Confirmar alquiler solo en la app (sin reserva por WhatsApp en la celda).
- Q: Al confirmar un alquiler presencial, ¿hay que pedir datos del cliente en mostrador? → A: Opcional: nombre y/o teléfono en el diálogo de confirmación.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Grilla operativa del día (Priority: P1)

Como dueño de club, quiero elegir mi club y una fecha y ver todas mis canchas en columnas con los turnos del día en filas, distinguiendo turnos libres, ocupados y no ofrecidos, para planificar el día sin cambiar de pantalla.

**Why this priority**: Es la base visual sobre la que se apoyan el resto de acciones (CRUD, turnos y alquiler).

**Independent Test**: Con un club que tiene al menos dos canchas y turnos definidos para el día de la semana de la fecha elegida, la grilla muestra columnas por cancha, horas en filas y estados visibles distintos para libre vs ocupado vs sin turno.

**Acceptance Scenarios**:

1. **Given** un dueño autenticado con al menos un club, **When** entra a Mis canchas, **Then** ve el club activo (o puede cambiar si tiene varios), la franja de fechas y la grilla o un mensaje claro si aún no hay canchas.
2. **Given** canchas registradas pero ningún turno para ese día de la semana, **When** selecciona una fecha, **Then** sigue viendo las canchas y un aviso de que no hay horarios configurados (no una pantalla vacía ambigua).
3. **Given** turnos y una reserva existente para una celda, **When** carga la grilla, **Then** esa celda aparece como ocupada y no ofrece acción de alquiler presencial.

---

### User Story 2 - Gestionar canchas del club (Priority: P2)

Como dueño, quiero crear, editar y eliminar canchas de mi club (nombre, tipo, precio por hora, estado activo/inactivo) para reflejar la oferta real del establecimiento.

**Why this priority**: Sin canchas no hay grilla ni turnos; es prerrequisito operativo inmediato.

**Independent Test**: Crear una cancha nueva y comprobar que aparece en la lista y en la grilla; intentar borrar una cancha bloqueada por reglas de negocio y ver mensaje comprensible.

**Acceptance Scenarios**:

1. **Given** un club seleccionado, **When** completa el alta de una cancha con datos válidos, **Then** la cancha aparece en pills/columnas y puede recibir turnos.
2. **Given** una cancha existente, **When** actualiza precio o estado, **Then** los cambios se reflejan en la vista sin recargar manualmente la aplicación completa.
3. **Given** una cancha que el sistema no permite eliminar, **When** confirma la baja, **Then** la operación falla con explicación en lenguaje claro y la cancha permanece listada.

---

### User Story 3 - Configurar turnos recurrentes por cancha (Priority: P3)

Como dueño, quiero definir y mantener los horarios en los que cada cancha se ofrece en alquiler (por día de la semana, hora inicio y fin, disponible o no), para que la grilla muestre solo las franjas comercializables.

**Why this priority**: La grilla depende de turnos; administrarlos desde la misma área evita depender de terceros o de herramientas internas ajenas al dueño.

**Independent Test**: Agregar un turno para un día de la semana y verificar que, al elegir una fecha que cae en ese día, aparece la fila correspondiente en la grilla para esa cancha.

**Acceptance Scenarios**:

1. **Given** una cancha seleccionada, **When** crea un turno con inicio anterior al fin en un día de la semana, **Then** el turno queda guardado y la grilla de una fecha coincidente muestra la celda en estado ofrecible (si la cancha está activa).
2. **Given** turnos existentes, **When** marca un turno como no disponible o lo elimina, **Then** las celdas correspondientes dejan de ofrecer alquiler en fechas futuras.
3. **Given** un intento inválido (horarios incoherentes o duplicados según reglas del sistema), **When** guarda, **Then** recibe errores de validación accionables sin perder el resto del formulario.

---

### User Story 4 - Alquiler presencial desde la grilla (Priority: P4)

Como dueño, cuando una persona llega al club y paga el turno en mostrador, quiero confirmar la reserva en la app sobre una celda libre, para que quede registrada la ocupación y no se venda dos veces el mismo horario.

**Why this priority**: Cierra el ciclo operativo que hoy puede delegarse a canales externos; es el valor distintivo de este tramo frente a solo “ver” la grilla.

**Independent Test**: En una celda libre, confirmar alquiler presencial y comprobar que la celda pasa a ocupada y persiste al cambiar de fecha y volver.

**Acceptance Scenarios**:

1. **Given** una celda en estado libre para la fecha seleccionada, **When** el dueño confirma alquiler presencial (con confirmación explícita), **Then** el sistema registra un partido cerrado/privado para ese turno y fecha, la celda pasa a ocupada y ya no permite otra reserva para ese turno y fecha.
2. **Given** el diálogo de confirmación de alquiler presencial, **When** el dueño confirma sin completar campos opcionales o ingresando nombre y/o teléfono del cliente, **Then** la reserva se registra igualmente y la celda queda ocupada.
3. **Given** una celda ocupada o sin turno, **When** intenta reservar, **Then** la acción no está disponible o se informa por qué no aplica.
4. **Given** error de red o rechazo del servidor, **When** confirma alquiler, **Then** la celda no queda en estado inconsistente y se muestra mensaje para reintentar.
5. **Given** una celda ocupada por alquiler presencial registrado por el dueño, **When** confirma anular o liberar la reserva, **Then** la celda vuelve a libre y el turno queda disponible para otra acción en esa fecha.

---

### Edge Cases

- Dueño sin clubes registrados: mensaje orientador para crear club (fuera de esta spec si el flujo de alta de club ya existe en otra pantalla).
- Cancha inactiva: turnos pueden existir pero las celdas deben mostrarse como no ofrecidas para alquiler.
- Cambio de fecha cruzando medianoche o zona horaria del club: la fecha seleccionada debe ser la referencia única para “día operativo”.
- Múltiples clubes: cambiar de club recarga canchas y grilla sin mezclar datos.
- Concurrencia: dos acciones sobre el mismo turno libre; solo una reserva debe prevalecer y la otra debe informar conflicto.
- Anulación simultánea con otra acción sobre la misma celda: solo un resultado consistente (libre u ocupado) y mensaje claro si la operación ya no aplica.
- Eliminar turno con reservas futuras: comportamiento según reglas del backend (bloqueo o advertencia), siempre comunicado al usuario.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Solo usuarios con rol de dueño de club MUST acceder a la gestión de Mis canchas; otros roles MUST ser redirigidos o ver mensaje de acceso denegado acorde al producto.
- **FR-002**: El sistema MUST permitir listar los clubes del dueño y seleccionar uno activo para todas las operaciones de la pantalla.
- **FR-003**: El sistema MUST mostrar una grilla por fecha con columnas por cancha y filas por franja horaria derivada de los turnos configurados.
- **FR-004**: El sistema MUST distinguir visualmente al menos tres situaciones de celda: turno libre para alquiler, turno ocupado, y celda sin turno o no ofrecida.
- **FR-005**: El dueño MUST poder crear, actualizar y eliminar canchas de su club con validación de campos obligatorios y mensajes de error comprensibles.
- **FR-006**: El dueño MUST poder crear, actualizar y eliminar turnos recurrentes por cancha (día de semana, hora inicio, hora fin, disponibilidad).
- **FR-007**: El dueño MUST poder registrar un alquiler presencial sobre un turno libre para la fecha visible creando un **partido cerrado/privado** (sin convocatoria abierta) vinculado a cancha, turno y fecha; la celda MUST mostrarse ocupada mientras ese partido mantenga la reserva del turno.
- **FR-011**: El dueño MUST poder anular o liberar un alquiler presencial confirmado desde Mis canchas, con confirmación explícita; tras éxito, la celda MUST volver a libre para esa fecha y turno.
- **FR-008**: Tras cualquier mutación exitosa (cancha, turno o reserva), la grilla o listados MUST actualizarse para reflejar el estado actual sin exigir cierre de sesión.
- **FR-012**: La gestión de canchas y turnos recurrentes MUST ser accesible desde la misma pantalla Mis canchas mediante paneles, modales o drawers superpuestos a la grilla, sin exigir navegar a otra ruta principal de la app.
- **FR-013**: En celdas libres con alquiler presencial habilitado, la acción principal MUST ser confirmar la reserva en la app; MUST NOT ofrecerse reserva del turno mediante WhatsApp (u otro mensajero) desde la celda de la grilla.
- **FR-014**: El diálogo de confirmación de alquiler presencial MUST permitir ingresar **opcionalmente** nombre y/o teléfono del cliente en mostrador; MUST permitir confirmar sin esos datos.
- **FR-009**: La reserva autogestionada por jugadores MUST NOT exponerse en esta pantalla como flujo principal (puede mencionarse como futuro en copy, sin implementar el journey del jugador).
- **FR-010**: Mensajes de error del servidor MUST presentarse al usuario en español claro, sin detalles técnicos internos.

### Key Entities _(include if feature involves data)_

- **Club**: Establecimiento del dueño; agrupa canchas y datos de contacto visibles en cabecera.
- **Cancha**: Unidad alquilable con nombre, tipo, precio por hora y estado operativo.
- **Turno (franja recurrente)**: Patrón semanal (día + rango horario + disponibilidad) que genera celdas en la grilla para fechas concretas.
- **Partido (alquiler presencial)**: Registro de juego cerrado/privado creado por el dueño al confirmar mostrador; vincula cancha, turno recurrente y fecha concreta y determina celda ocupada en la grilla. Puede asociar **opcionalmente** nombre y/o teléfono del cliente en mostrador (sin cuenta de jugador).
- **Celda de grilla**: Intersección cancha × franja × fecha con estado derivado de turno, cancha activa y ocupación.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un dueño con club, canchas y turnos configurados puede identificar en menos de 30 segundos qué turnos están libres u ocupados para la fecha de hoy.
- **SC-002**: El 90% de las tareas rutinarias del dueño en esta pantalla (alta de cancha, alta de turno, una reserva presencial) se completan en tres pasos o menos desde la grilla o **paneles/modales en la misma ruta `/club`**, sin navegar a otras secciones de la app.
- **SC-003**: Tras registrar un alquiler presencial, el 100% de los casos exitosos muestran la celda ocupada de forma consistente al recargar la vista de la misma fecha.
- **SC-004**: En pruebas con usuarios representativos del rol dueño, al menos 4 de 5 califican la pantalla como “adecuada para operar el club en mostrador” frente al flujo anterior basado solo en formularios sueltos o reserva externa.

## Assumptions

- El dueño ya puede autenticarse y el producto ya distingue rol `club_owner` frente a jugador.
- Los contratos de listado y CRUD de clubes y canchas del dueño existen y se respetan; cualquier gap para turnos o reserva presencial se cerrará en el backend antes o en paralelo, sin inventar formas de datos en el frontend.
- Un alquiler presencial crea un partido cerrado/privado en la fecha y turno elegidos; el dueño puede añadir **opcionalmente** nombre y/o teléfono del cliente en el diálogo de confirmación; no exige cuenta de jugador ni procesar pago en la app.
- Los turnos son recurrentes por día de la semana (modelo ya usado por la grilla actual del backend); no se exigen excepciones por feriados en este tramo salvo decisión posterior.
- La referencia visual “estilo grilla de reservas” prioriza claridad operativa (estados, densidad legible en tablet) sobre paridad pixel-perfect con terceros.
- WhatsApp u otros mensajeros MAY permanecer como **contacto del club** en cabecera; MUST NOT usarse como acción de reserva de turno en celdas libres una vez habilitado el alquiler presencial en app.
