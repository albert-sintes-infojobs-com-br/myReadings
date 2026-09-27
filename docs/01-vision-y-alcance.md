# 01 · Visión y Alcance

## 1. Objetivo del proyecto (TFM)

**MyReadings** es una aplicación web para la gestión de libros y lecturas orientada a un
entorno familiar. Permite a los usuarios registrar y seguir sus lecturas y a los
progenitores (padre/madre) incentivar la lectura de sus hijos mediante un sistema de
**recompensas** (en puntos o euros) asociadas a la finalización de libros dentro de un plazo,
con **metas canjeables** y **penalizaciones** por incumplimiento.

## 2. Roles de usuario

| Rol | Descripción | Capacidades principales |
|-----|-------------|--------------------------|
| **PARENT** (padre/madre) | Cuenta principal que gestiona a sus hijos | Crear/gestionar cuentas hijo, crear metas y recompensas sobre libros de sus hijos, ver dashboard general con filtro por hijo, gestionar sus propios libros y categorías |
| **CHILD** (hijo) | Cuenta creada por un progenitor | Gestionar sus propios libros y categorías, solicitar recompensa sobre un libro sin empezar, ver su propio dashboard y saldo/metas |

## 3. Casos de uso principales

1. **CU1 — Gestión de libros**: dar de alta y mantener libros con título, autor, estado de
   lectura (sin empezar / leyendo / finalizado), fecha de inicio, fecha de fin, notas,
   puntuación y categoría.
2. **CU2 — Gestión de categorías**: cada usuario crea y gestiona sus propias categorías
   (título, descripción y color identificativo).
3. **CU3 — Gestión de usuarios y roles**: el padre/madre crea y gestiona las cuentas de sus
   hijos; solo el rol padre/madre puede generar recompensas sobre los libros de sus hijos, y
   únicamente cuando el libro está en estado *sin empezar*.
4. **CU4 — Recompensas y penalizaciones**: las recompensas se definen con fecha límite; son
   efectivas si el libro llega a *finalizado* dentro del plazo. Pueden incluir una
   penalización que se contabiliza si el libro no se concluye a tiempo.
5. **CU5 — Solicitud de recompensa (hijo → padre)**: el hijo crea un libro y solicita
   recompensa; el padre recibe una notificación in-app de "recompensa pendiente de activar".
6. **CU6 — Metas canjeables**: el padre define metas globales por hijo (p. ej. 1000 puntos =
   consola); los puntos de las recompensas se acumulan hacia esas metas y se canjean al
   alcanzarlas.
7. **CU7 — Dashboards / estadísticas**: el padre dispone de un dashboard general con filtro
   por hijo; el hijo solo ve el suyo.

## 4. Alcance del MVP

### Incluido
- Autenticación con JWT y dos roles (PARENT / CHILD).
- Gestión de cuentas hijo por parte del padre.
- CRUD de libros y categorías (por usuario).
- Gestión de metas y recompensas con reglas de negocio (ver [03-reglas-de-negocio.md](03-reglas-de-negocio.md)).
- Motor de resolución de recompensas (cumplimiento/penalización) mediante tareas programadas.
- Saldo de puntos y euros por hijo (ledger) y canje de metas.
- Notificaciones **in-app** (bandeja en el área de usuario).
- Flujo de solicitud de recompensa hijo → padre.
- Dashboards con estadísticas por rol.
- Despliegue con Docker (PostgreSQL/MySQL + backend + frontend).

### Excluido (fuera del MVP)
- Integración con APIs externas de libros (ISBN, portadas): alta manual únicamente.
- Notificaciones por email o push.
- Aplicaciones móviles nativas.
- Pasarelas de pago reales (los euros son un valor contable, no un cobro real).

## 5. Documentos relacionados
- [02 · Modelo de datos](02-modelo-de-datos.md)
- [03 · Reglas de negocio](03-reglas-de-negocio.md)
- [04 · Arquitectura](04-arquitectura.md)
- [05 · Plan de fases](05-plan-de-fases.md)
- [06 · API / Endpoints](06-api-endpoints.md)
- [07 · Dashboards y métricas](07-dashboards-metricas.md)
