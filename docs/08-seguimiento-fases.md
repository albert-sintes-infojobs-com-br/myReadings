# 08 · Seguimiento de fases

Tracker de ejecución del plan (ver [05-plan-de-fases.md](05-plan-de-fases.md)).
Estado: ✅ completada · 🚧 en curso · ⬜ pendiente · ⛔ bloqueada.

## Estado general
| Fase | Título | Estado | Notas |
|------|--------|--------|-------|
| 1 | Scaffolding e infraestructura | ✅ | Monorepo, Docker Compose, backend/frontend compilan |
| 2 | Esquema de datos (Prisma) | ✅ | Migración inicial `20260920081006_init` aplicada + seed de datos |
| 3 | Autenticación y usuarios | ✅ | Refactorizado a 3 capas en Fase 5 (ver nota abajo) |
| 4 | Categorías (CRUD) | ✅ | 1ª fase con arquitectura de 3 capas (domain/persistence/transport): 26 tests + smoke HTTP 12/12 |
| 5 | Libros (CRUD) | ✅ | 3 capas + refactor completo de Auth/Users a 3 capas: 31 tests nuevos (77 totales) + smoke HTTP 15/15 (books) + 9/9 (auth/users) |
| 6 | Metas (CRUD) | ✅ | 3 capas; use cases con doble repo (Goal+User) para validar "es mi hijo"; 22 tests nuevos (99 totales) + smoke HTTP 11/11 |
| 7 | Recompensas (CRUD + reglas) | ✅ | 3 capas; use cases con 3-4 repos (Reward+Book+Goal+User); 31 tests nuevos (130 totales) + smoke HTTP 14/14 |
| 8 | Motor de resolución + ledger | ✅ | Nuevo dominio `ledger` (motor de resolución compartido FULFILLED/PENALIZED, saldo derivado, canje de metas) + `@Cron` diario; 24 tests nuevos (154 totales) + smoke HTTP 13/13 |
| 9 | Solicitudes y notificaciones | ✅ | Nuevos dominios `reward-requests` + `notifications`; motor de resolución (Fase 8) ampliado para notificar FULFILLED/PENALIZED/ACHIEVED; 26 tests nuevos (180 totales) + smoke HTTP 16/16 |
| 10 | Estadísticas / dashboards (backend) | ✅ | Nuevo dominio `stats` (agregaciones Prisma `groupBy` + cálculo en memoria); 11 tests nuevos (191 totales) + smoke HTTP 15/15 |
| 11 | Frontend base | ✅ | AuthContext + rutas protegidas por rol + layout con campana de notificaciones; verificado con backend+frontend reales en navegador |
| 12 | Frontend funcionalidades | ✅ | CRUD de libros/categorías/hijos/metas/recompensas + dashboards con gráficos (Recharts) y selector de hijo; flujo E2E verificado en navegador contra backend real |
| 13 | Cierre (tests, Docker final, memoria) | ✅ | 12 tests E2E HTTP reales (reglas de recompensa + notificaciones) sobre el servidor compilado; `docker compose up` completo (db+backend+frontend) verificado de extremo a extremo; Dockerfile backend migrado a `node:20` (Debian) |

## Checklist de detalle

### Fase 1 — Scaffolding ✅
- [x] Monorepo npm workspaces (`backend/`, `frontend/`)
- [x] Backend NestJS: `main.ts` (prefijo `/api`, CORS, `ValidationPipe`, Swagger en `/api-docs`)
- [x] `PrismaService` + `PrismaModule`
- [x] `GET /api/health`
- [x] Schema Prisma completo (todas las entidades y enums)
- [x] Frontend: Vite + TS + MUI + TanStack Query + Recharts, proxy `/api`
- [x] Dockerfiles (backend multi-stage, frontend nginx) + `docker-compose.yml` (db/backend/frontend)
- [x] `.env.example`, `.gitignore`, `README.md`
- [x] Verificado: `nest build` y `vite build` sin errores
- [x] Verificado (completado en Fase 2): servicio `db` (MariaDB) arranca healthy con el healthcheck de compose
- [x] Verificado (completado en Fase 13): `docker compose up` completo (db+backend+frontend) de extremo a extremo

### Fase 2 — Esquema de datos ✅
- [x] `prisma/schema.prisma` (hecho en Fase 1)
- [x] Generar cliente Prisma (`prisma generate`) — Windows y contenedor
- [x] Migración inicial `prisma/migrations/20260920081006_init`
- [x] `seed.ts` completo: 1 padre, 2 hijos, 4 categorías, 6 libros, 1 meta, 2 rewards, 1 request, 3 notificaciones, 1 ledger
- [x] Criterio: migración aplicada + seed cargado y verificado (3 users, 6 books, 4 categories, 1 goal, 2 rewards, 1 request, 3 notifications, 1 ledger)

### Fase 3 — Autenticación y usuarios ✅ (TDD rojo→verde)
- [x] Registro PARENT con hash de contraseña (scrypt, `node:crypto`) — formato `salt:hash` idéntico al seed (las cuentas seedeadas pueden hacer login)
- [x] Login → JWT con claims `sub`/`role`/`email` (solo access; refresh se evaluará si hace falta)
- [x] `JwtAuthGuard` + `RolesGuard` + decorador `@Roles`
- [x] Alta de CHILD por el padre (rol PARENT verificado en servicio): email único, password ≥8
- [x] Listado de hijos propios (`GET /users/children`)
- [x] `GET /auth/me` y `GET /users/me` (proyección sin `passwordHash`)
- [x] Tests unitarios (20, todos verdes): `auth.service.spec.ts`, `users.service.spec.ts`, `roles.guard.spec.ts`
- [x] Criterio verificado por smoke HTTP real: login padre OK; padre crea hijo OK; hijo login OK; hijo en `POST /users/children` → **403**; password mala / sin token → **401**; register → PARENT sin exponer hash
- [x] **Refactor (Fase 5)**: migrado a 3 capas — `src/domain/users/` (entidad `SafeUser`/`UserRecord`, `UserRepository`+token, `password.util.ts` con scrypt, use cases Register/Login/GetMe/ListChildren/CreateChild), `src/persistence/users/` (`PrismaUserRepository`), `src/transport/auth/` y `src/transport/users/` (controllers, guards, decorators, strategy, DTOs movidos desde `src/auth`/`src/users` planos, ya eliminados)
- [x] **Cambio de comportamiento intencional**: password de registro/alta demasiado corta ahora responde **400** (antes 401) — semánticamente es un error de validación, no de autenticación; verificado en `smoke-auth-users.ps1`
- [x] Tests reescritos como dominio/persistencia (31 nuevos entre Fase 5): `users-domain.test.ts`, `users-persistence.test.ts`; `roles-guard.test.ts` actualizado a las nuevas rutas
- [ ] Pendiente (opcional): edición/eliminación de CHILD — no bloquea ninguna otra fase; se hará si hace falta para la demo

### Fase 4 — Categorías ✅ (1ª fase con arquitectura de 3 capas)
- [x] **Refactor**: introducidas las capas `src/domain/` (sin NestJS/Prisma), `src/persistence/` (Prisma) y `src/transport/` (NestJS). Categorías = plantilla para las fases 5–10
- [x] Dominio: `Category` (entidad), `CategoryRepository` (interfaz + token DI), 5 use cases (Create/List/Get/Update/Delete), errores de dominio tipados (`DomainNotFound`/`OwnershipError`/`ConflictError`/`DomainValidation`)
- [x] Persistencia: `PrismaCategoryRepository` — ACOTAMIENTO por `ownerUserId` en cada query (list, get, update, delete, bookCount)
- [x] Transporte: DTOs class-validator (`IsHexColor`), `DomainExceptionFilter` (domain→404/403/409/400), `ActorResolver` (JWT → `ActorView`), DI explícito por token+factory (las interfaces no son tokens de Nest)
- [x] Reglas: colorHex `#RRGGBB` obligatorio; ownership estricto (editar/borrar solo propias); el hijo ve las suyas + las del padre (solo lectura); borrado 409 si tiene libros
- [x] Tests 26 nuevos (Vitest, TDD): `categories-domain.test.ts` (19, use cases con repo-mock) + `categories-persistence.test.ts` (7, acontamiento por owner con Prisma-mock). Total: **46 verdes**
- [x] Smoke HTTP (`smoke-categories.ps1`): 12/12 — create/list/get/put/delete, 400 colorHex, 401 sin token, 404 borrada, hijo no edita cat del padre, hijo ve cat del padre
- [x] Criterio: un usuario solo gestiona sus propias categorías (el hijo solo lee las del padre)

### Fase 5 — Libros ✅ (3 capas) + refactor Auth/Users a 3 capas
- [x] Dominio: `Book`/`BookStatus` (entidad; fechas como `YYYY-MM-DD`), `BookRepository`+token, 5 use cases (Create/List/Get/Update/Delete)
- [x] Persistencia: `PrismaBookRepository` — acotado por `ownerUserId`; conversión `Date` ↔ `YYYY-MM-DD`; `categoryBelongsToOwner` para validar la FK
- [x] Transporte: `BooksController`/`BooksModule` (mismo patrón DI por token que Categories), DTOs (`CreateBookDto`/`UpdateBookDto`/`ListBooksQueryDto`)
- [x] CRUD con filtros (`GET /books?status=&categoryId=`)
- [x] Transiciones de estado válidas: `NOT_STARTED → {NOT_STARTED,READING,FINISHED}`, `READING → {READING,FINISHED}`, `FINISHED` terminal (sin retrocesos)
- [x] Validaciones: `rating` entero 0-5; `endDate >= startDate`; `categoryId` debe pertenecer al mismo propietario
- [x] Propiedad estricta: un libro es SIEMPRE privado del owner (sin vista compartida hijo↔padre, a diferencia de categorías) → 404 si otro usuario intenta acceder
- [x] **Refactor añadido**: Auth y Users migrados a la misma arquitectura de 3 capas (ver nota en Fase 3)
- [x] `ActorResolver` consolidado en `src/transport/shared/` (antes duplicado solo en categories)
- [x] Tests: `books-domain.test.ts` (18) + `books-persistence.test.ts` (7) — total suite **77 tests verdes**
- [x] Smoke HTTP: `smoke-books.ps1` (15/15: CRUD, transiciones válidas/inválidas, rating, fechas, categoryId ajeno, privacidad hijo↔padre) + `smoke-auth-users.ps1` (9/9: regresión register/login/me/children tras el refactor) + `smoke-categories.ps1` (12/12 regresión)
- [x] Criterio: transiciones válidas y propiedad respetadas

### Fase 6 — Metas ✅
- [x] Dominio: `Goal`/`GoalStatus` (entidad), `GoalRepository`+token, 5 use cases (Create/ListByChild/ListMine/Update/Delete)
- [x] Los use cases de padre (Create/ListByChild/Update/Delete) dependen de DOS repos: `GoalRepository` + `UserRepository` (del dominio `users`) para comprobar "¿es mi hijo?" (`child.role==='CHILD' && child.parentId===actor.id`) — sin duplicar esa lógica ni acoplar Goals a Prisma de Users
- [x] Persistencia: `PrismaGoalRepository` — sin acotar por owner a nivel de query (la meta no tiene `ownerUserId`; la propiedad se resuelve en el dominio antes de llamar al repo)
- [x] Transporte: `GoalsController` con `@Controller()` vacío y rutas explícitas por handler (`/children/:childId/goals`, `/goals/mine`, `/goals/:id`) tal como documenta `06-api-endpoints.md`
- [x] CRUD por padre, solo sobre sus hijos (`POST`/`GET /children/:childId/goals`, `PATCH`/`DELETE /goals/:id`); el hijo solo lista las suyas (`GET /goals/mine`)
- [x] Validaciones: `targetPoints` entero > 0; `name` no vacío
- [x] Borrado: 409 Conflict si la meta no está `ACTIVE` (ACHIEVED/REDEEMED ya tienen puntos comprometidos/canjeados) — cubierto por test de dominio, no por smoke HTTP (el seed no tiene metas no-ACTIVE)
- [x] **Diferido explícitamente a Fase 8** (motor de resolución + ledger): transición automática a `ACHIEVED` (según puntos acumulados vía `LedgerEntry`), endpoint `POST /goals/:id/redeem` y cálculo de `pointsAccumulated`/progreso — no forman parte del alcance mínimo de esta fase
- [x] Tests 22 nuevos (Vitest, TDD): `goals-domain.test.ts` (17) + `goals-persistence.test.ts` (5). Total: **99 verdes**
- [x] Smoke HTTP (`smoke-goals.ps1`): 11/11 — create/list/mine/update/delete, 400 targetPoints, 404 childId ajeno/inexistente, 403 hijo crea meta, 401 sin token, aislamiento entre hijos
- [x] Regresión verificada: `smoke-books.ps1` (15/15) sigue en verde tras añadir Goals
- [x] Criterio: solo el padre crea metas de sus hijos

### Fase 7 — Recompensas ✅
- [x] Dominio: `Reward`/`RewardType`/`RewardStatus` (entidad; `deadline` como `YYYY-MM-DD`), `RewardRepository`+token, 5 use cases (Create/List/Get/Update/Delete)
- [x] Los use cases dependen de HASTA CUATRO repos: `RewardRepository` + `BookRepository` (para el libro y su estado) + `GoalRepository` (validar `goalId` del mismo hijo) + `UserRepository` (comprobar "¿el libro es de un hijo mío?"). Se añadió `BookRepository.findByIdAny()` (sin acotar por owner) porque Rewards no conoce de antemano el propietario del libro
- [x] Persistencia: `PrismaRewardRepository` — `listByBookOwner` (hijo, via `book.ownerUserId`) y `listByParent` (padre, via `book.owner.parentId`, join a través de la relación Prisma); conversión `Decimal→number` y `Date→YYYY-MM-DD`
- [x] Transporte: `RewardsController` con `@Controller()` vacío (rutas `/books/:bookId/rewards` + `/rewards/*`), self-contained (provee sus propias `PrismaBookRepository`/`PrismaGoalRepository`, sin depender de que BooksModule/GoalsModule exporten sus tokens)
- [x] Reglas: solo PARENT crea/edita/elimina sobre libros de sus propios hijos; libro debe estar `NOT_STARTED` (create/update/delete, si no → 409); `deadline` futura (`YYYY-MM-DD`, al crear y al cambiarla); `value`/`penaltyValue` > 0; `type=POINTS` requiere `goalId` de una meta del mismo hijo
- [x] Visibilidad de lectura (list/get): padre ve recompensas de CUALQUIERA de sus hijos; hijo ve solo las suyas; acceso cruzado → 404 (privacidad, no revela existencia)
- [x] Escritura (create/update/delete): libro de un hijo ajeno → 403 OwnershipError (a diferencia de Categories/Books, aquí la comprobación de propiedad es el camino de aplicación REAL, no defense-in-depth, porque el libro se busca sin acotar por owner)
- [x] **Diferido explícitamente a Fase 8**: resolución automática (FULFILLED al terminar el libro a tiempo, PENALIZED al vencer `deadline`), `LedgerEntry`, tarea programada diaria
- [x] Tests 31 nuevos (Vitest, TDD): `rewards-domain.test.ts` (25) + `rewards-persistence.test.ts` (6). Total: **130 verdes**
- [x] Smoke HTTP (`smoke-rewards.ps1`): 14/14 — create POINTS/MONEY, 400 goalId faltante/deadline pasada, get/list por rol, 404 cruzado entre hijos, 403 hijo crea, 409 create/update/delete cuando el libro deja `NOT_STARTED`, 401 sin token
- [x] Regresión verificada: `smoke-goals.ps1` (11/11) sigue en verde tras añadir Rewards
- [x] Criterio: reject si el libro no está en `NOT_STARTED`

### Fase 8 — Resolución + ledger ✅
- [x] Dominio nuevo `src/domain/ledger/`: `LedgerEntry` (entidad), `LedgerRepository`+token (`create`/`sumByChild`/`sumByGoal`/`listByChild` — el saldo y el progreso de metas se DERIVAN sumando `amount`, nunca se guardan como columna)
- [x] Motor de resolución unificado (`resolvePendingReward`, función interna compartida): compara `hoy` vs `deadline` — si el libro está `FINISHED` y `hoy <= deadline` → `FULFILLED` + `LedgerEntry` positiva; si `hoy > deadline` (esté o no `FINISHED`) → `PENALIZED` + `LedgerEntry` negativa (si hay `penaltyValue`). Si es `POINTS` con `goalId` y el acumulado (`sumByGoal`) alcanza `targetPoints` → `Goal.status = ACHIEVED`
- [x] `ResolveBookFinishedUseCase`: resolución INMEDIATA, invocada desde `BooksController.updateOne` justo después de un `PATCH /books/:id` que deja el libro en `FINISHED` (antes de responder al cliente)
- [x] `PenalizeOverdueRewardsUseCase`: recorre TODAS las recompensas `PENDING` del sistema; usada por la tarea programada diaria (misma función de resolución, red de seguridad si la inmediata no se disparara)
- [x] `RewardPenalizationScheduler` (`src/transport/ledger/`): `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)` sobre `@nestjs/schedule` (ya presente en `AppModule`)
- [x] `RedeemGoalUseCase`: solo si `status === 'ACHIEVED'`; crea `LedgerEntry` `REDEMPTION` negativa (`-targetPoints`) y pasa la meta a `REDEEMED`
- [x] `GetMyBalanceUseCase` (`GET /ledger/balance`, hijo) y `GetChildLedgerUseCase` (`GET /children/:childId/ledger`, padre, con ownership vía `assertOwnsChild` reexportado de `domain/goals`)
- [x] Extensiones a dominios existentes: `GoalRepository.setStatus()` (transición de estado gestionada por el sistema, separada del `update()` editable por el padre); `RewardRepository.resolve()`/`listPendingByBook()`/`listAllPending()`; `BookRepository.findByIdAny()` (ya existía desde Fase 7, reutilizado)
- [x] `BooksModule`/`LedgerModule` self-contained (como Rewards): cada uno provee sus PROPIAS instancias de los repos Prisma que necesita, sin depender de exports de otros módulos
- [x] Tests 24 nuevos (Vitest, TDD): `ledger-domain.test.ts` (19 — cubre FULFILLED/PENALIZED/ACHIEVED/redeem/balance con fechas pasadas/futuras fijas, SIN mockear el reloj) + `ledger-persistence.test.ts` (5). Total: **154 verdes**
- [x] Smoke HTTP (`smoke-ledger.ps1`): 13/13 — flujo completo libro→FULFILLED→meta ACHIEVED→balance+50→redeem→REDEEMED→balance vuelve al baseline, 409 redeem duplicado, ledger de hijo (padre), 403 cruzado por rol, 401 sin token
- [x] Regresión verificada: `smoke-rewards.ps1` (14/14) sigue en verde
- [x] Criterio: tests de cumplimiento a tiempo (FULFILLED) y penalización por vencimiento (PENALIZED) — ambos cubiertos exhaustivamente en `ledger-domain.test.ts` con fechas deterministas (`'2020-01-01'` como "pasado", `hoy+30d` como "futuro"), sin necesidad de mockear `Date`

### Fase 9 — Solicitudes y notificaciones ✅
- [x] Dominio nuevo `src/domain/notifications/`: `Notification` (entidad), `NotificationRepository`+token (`create`/`findById`/`listByRecipient`/`countUnread`/`markRead`/`markAllRead`); bandeja propia por `recipientUserId`, acceso cruzado → 404 (privacidad)
- [x] Dominio nuevo `src/domain/reward-requests/`: `RewardRequest` (entidad), `RewardRequestRepository`+token, 3 use cases (`CreateRewardRequestUseCase`, `ListPendingRewardRequestsUseCase`, `ResolveRewardRequestUseCase`)
- [x] `CreateRewardRequestUseCase` (hijo): libro debe ser propio y `NOT_STARTED` (409 si no); crea `RewardRequest` `PENDING` + `Notification` `REWARD_REQUEST` al padre — el destinatario es `actor.parentId`, ya resuelto por `ActorResolver` desde el JWT (sin consulta extra a `UserRepository`)
- [x] `ResolveRewardRequestUseCase` (padre): reusa `assertOwnsChild` exportado de `domain/goals`; solo si `status === 'PENDING'` (409 si ya se resolvió); transiciona a `RESOLVED` o `DISMISSED`
- [x] **Motor de resolución (Fase 8) ampliado**: `resolvePendingReward` ahora recibe también `NotificationRepository` y genera `REWARD_FULFILLED`/`REWARD_PENALIZED` al hijo, y `GOAL_ACHIEVED` al hijo Y al padre (dos notificaciones) cuando una meta alcanza `targetPoints`
- [x] Transporte: `NotificationsController` (`/notifications`, `/notifications/unread-count`, `/notifications/:id/read`, `/notifications/read-all`) y `RewardRequestsController` (`/books/:id/request-reward`, `/reward-requests`, `/reward-requests/:id`) — ambos `self-contained` como Rewards/Ledger
- [x] `BooksModule`/`LedgerModule` actualizados con `PrismaNotificationRepository` (5º parámetro de `ResolveBookFinishedUseCase`/`PenalizeOverdueRewardsUseCase`)
- [x] Tests 26 nuevos (Vitest, TDD): `notifications-domain.test.ts` (9) + `notifications-persistence.test.ts` (6) + `reward-requests-domain.test.ts` (10) + `reward-requests-persistence.test.ts` (4) + tests existentes de `ledger-domain.test.ts` ampliados con aserciones de notificación. Total: **180 verdes**
- [x] Smoke HTTP (`smoke-reward-requests-notifications.ps1`): 16/16 — solicitud→notificación al padre, 409 libro no NOT_STARTED, 403 padre solicita / hijo lista, resolver 2 veces → 409, marcar leída + unread-count decrementa, 404 notificación ajena, read-all, filtro `?unread=true`, 401 sin token
- [x] Regresión verificada: `smoke-ledger.ps1` (13/13) sigue en verde (incluye las nuevas notificaciones automáticas del motor de resolución)
- [x] Criterio: solicitud genera `RewardRequest` + `Notification`

### Fase 10 — Stats backend ✅
- [x] Dominio nuevo `src/domain/stats/`: formas de resultado (`ChildStats`, `OverviewStats`, `GoalProgress`, `ChildRankingEntry`…) + `StatsRepository`+token (`booksByStatus`/`finishedBooksByPeriod`/`rewardsByStatus`/`avgReadingDays`); reusa `GoalRepository`/`LedgerRepository` para `goalsProgress`/`balance` (sin duplicar esa lógica de Fases 6/8)
- [x] `GetMyStatsUseCase` (`GET /stats/me`, solo hijo) y `GetOverviewStatsUseCase` (`GET /stats/overview`, solo padre): sin `childId` agrega TODOS sus hijos + `ranking` ordenado por libros terminados; con `childId` filtra a ese hijo (`assertOwnsChild` reexportado de `domain/goals`, mismo helper que Ledger/RewardRequests) y omite `ranking`
- [x] Persistencia: `PrismaStatsRepository` — `booksByStatus`/`rewardsByStatus` usan Prisma `groupBy`+`_count` (agregación real en BD); `finishedBooksByPeriod`/`avgReadingDays` se calculan en memoria sobre un `findMany` acotado (Prisma no expresa `YEAR()`/`DATEDIFF()` de forma portable en `groupBy`/`aggregate` sin `$queryRaw`, y el volumen por hijo es pequeño)
- [x] `goalsProgress[].progressPct` acotado a 100 aunque el acumulado supere `targetPoints`
- [x] Transporte: `StatsController` (`/stats/me`, `/stats/overview?childId=`), self-contained (propias `PrismaGoalRepository`/`PrismaLedgerRepository`, reusa `USER_REPOSITORY` de `AuthModule`)
- [x] Tests 11 nuevos (Vitest, TDD): `stats-domain.test.ts` (6) + `stats-persistence.test.ts` (5). Total: **191 verdes**
- [x] Smoke HTTP (`smoke-stats.ps1`): 15/15 — `/stats/me` (booksByStatus/balance/goalsProgress/rewardsByStatus/avgReadingDays), 403 padre en `/stats/me` y 403 hijo en `/stats/overview`, overview sin `childId` (2 hijos + ranking) y con `childId` (1 hijo, sin ranking), 404 `childId` inexistente, aislamiento entre hijos, 401 sin token
- [x] Regresión verificada: `smoke-reward-requests-notifications.ps1` (16/16) sigue en verde
- [x] Criterio: padre solo ve sus hijos; hijo solo los suyos (403/404 si no)

**Backend completo**: Fases 1–10 finalizadas. Suite total: 191 tests unitarios/persistencia + 8 scripts de smoke HTTP (categories, books, auth-users, goals, rewards, ledger, reward-requests-notifications, stats) cubriendo el ciclo de vida completo de la API.

### Fase 11 — Frontend base ✅
- [x] `types/auth.ts` (`Role`, `AuthUser`) + `api/client.ts`: instancia Axios (`baseURL` por `VITE_API_URL` o proxy `/api`), token en `localStorage` (`myreadings_token`), interceptor de request (`Authorization: Bearer`) e interceptor de response que dispara un handler de 401 registrable (`setUnauthorizedHandler`), salvo en `/auth/login`/`/auth/register`
- [x] `api/auth.api.ts` (`loginRequest`/`registerRequest`/`meRequest`) y `api/notifications.api.ts` (`listNotifications`/`getUnreadCount`/`markNotificationRead`/`markAllNotificationsRead`)
- [x] `auth/AuthContext.tsx`: `AuthProvider` con `login()`/`logout()`, comprueba `getToken()` antes de llamar a `/auth/me` al montar (evita 401 innecesario), registra `logout` como handler global de 401; `useAuth()` lanza si se usa fuera del provider
- [x] `auth/ProtectedRoute.tsx`: `CircularProgress` mientras `status==='loading'`, `<Navigate to="/login">` si no autenticado, y si se pasa `roles` y no coincide con el rol del usuario redirige a su propio home (`/parent` o `/child`)
- [x] `auth/RoleHomeRedirect.tsx`: redirige `/` a `/parent` o `/child` según `user.role`
- [x] `components/layout/NotificationBell.tsx`: `Badge` con contador de no leídas (TanStack Query, `refetchInterval` 30s) + `Menu` con bandeja perezosa (`enabled: open`), clic marca como leída, botón "Marcar todas", ambas mutaciones invalidan `['notifications']`
- [x] `components/layout/AppLayout.tsx`: `AppBar` con título, `Chip` de rol (Padre/Madre · Hijo/a), `NotificationBell`, nombre de usuario y botón "Salir"
- [x] `pages/LoginPage.tsx`, `pages/RegisterPage.tsx` (solo padres se registran), `pages/ParentDashboardPage.tsx`/`ChildDashboardPage.tsx` (placeholders envueltos en `AppLayout`, contenido real en Fase 12)
- [x] `App.tsx` reescrito: `AuthProvider` + `Routes` (`/login`, `/register`, `/parent` y `/child` protegidas por rol, `/` con `RoleHomeRedirect`, `*` → `/`); eliminado `pages/Home.tsx` (código muerto)
- [x] Añadido `src/vite-env.d.ts` (`/// <reference types="vite/client" />`), requerido por `import.meta.env` con `tsc -b` estricto (hueco del scaffolding inicial)
- [x] Verificado: `tsc -b` limpio y `vite build` (1021 módulos, sin errores)
- [x] Verificado en navegador con backend real (`node dist/main.js`) + `vite dev`: login padre (maria@familia.dev) → `/parent`, campana muestra la notificación real del seed (solicitud de recompensa de Anaïs), logout → `/login`; login hijo (lucas@familia.dev) → `/child`; navegación manual a `/parent` como hijo redirige de vuelta a `/child` (guard de rol operativo)
- [x] Criterio cumplido: login/logout y redirección por rol

### Fase 12 — Frontend funcionalidades ✅
- [x] Capa API (`api/{categories,books,children,goals,rewards,reward-requests,ledger,stats}.api.ts`) + tipos (`types/{category,book,goal,reward,reward-request,ledger,stats}.ts`) reflejando exactamente los DTOs/respuestas del backend (contrato extraído del código, no solo de la doc)
- [x] `components/layout/AppLayout.tsx` ampliado con navegación por `Tabs` (react-router `Link`): menú distinto por rol (padre: Dashboard/Libros/Categorías/Hijos/Metas/Recompensas; hijo: Dashboard/Libros/Categorías); `Container` pasa a `maxWidth="lg"` para las tablas/gráficos
- [x] `pages/CategoriesPage.tsx`: tabla + diálogo crear/editar (color picker, título, descripción); hijo ve además las categorías de su padre en modo solo-lectura (sin botones de editar/borrar si `ownerUserId !== user.id`)
- [x] `pages/BooksPage.tsx` (lista con filtro por estado + diálogo de alta) y `pages/BookDetailPage.tsx` (edición completa, `MenuItem` de estado acotado a las transiciones válidas según estado actual, aviso `Alert` de "perderás la opción de recompensa" y botón "Solicitar recompensa" solo si `role===CHILD && status===NOT_STARTED`)
- [x] `pages/ChildrenPage.tsx` (solo padre): tabla + alta de hijo (nombre/email/contraseña)
- [x] `pages/GoalsPage.tsx` (solo padre): selector de hijo + tabla de metas con crear/editar/eliminar (solo si `ACTIVE`) y botón "Canjear" (solo si `ACHIEVED`)
- [x] `pages/RewardsPage.tsx` (solo padre): bandeja de "Solicitudes pendientes" (`GET /reward-requests`) con acciones "Crear recompensa" (diálogo que crea la `Reward` sobre el `bookId` de la solicitud y a continuación resuelve la solicitud a `RESOLVED`) y "Descartar" (`DISMISSED`); tabla de recompensas existentes con editar/eliminar (solo si `PENDING`); el `goalId` del formulario usa un `MenuItem` con las metas reales del hijo de la solicitud (`listGoalsByChild`)
- [x] `components/stats/ChildStatsPanel.tsx` (reutilizable): KPIs (puntos, euros, tiempo medio de lectura, libros terminados) + `BarChart` (Recharts) de libros por estado y recompensas por estado + barras de progreso de metas
- [x] `pages/ParentDashboardPage.tsx` reescrito: selector de hijo ("Todos" o uno concreto) sobre `GET /stats/overview`; con "Todos" muestra tabla de ranking + un `ChildStatsPanel` por hijo; con un hijo concreto solo su panel (sin ranking, tal como responde el backend)
- [x] `pages/ChildDashboardPage.tsx` reescrito: `ChildStatsPanel` sobre `GET /stats/me`
- [x] `App.tsx`: añadidas rutas `/categories`, `/books`, `/books/:id` (cualquier rol autenticado) y `/children`, `/goals`, `/rewards` (`ProtectedRoute roles={['PARENT']}`)
- [x] Nota de arquitectura: `Book` NO tiene vista compartida entre hijo y padre (a diferencia de `Category`) — el padre NUNCA puede listar ni ver el detalle de un libro de su hijo (`GET /books`/`GET /books/:id` acotan por `ownerUserId` del actor). Por eso el único punto de entrada del padre a la creación de una `Reward` es la bandeja de `RewardRequest` (que sí incluye `bookId`+`childId`), nunca una navegación libre por los libros del hijo
- [x] Verificado: `tsc -b` limpio y `vite build` (1811 módulos; único warning no bloqueante de tamaño de chunk, aceptable para un TFM sin code-splitting)
- [x] Verificado en navegador con backend real, flujo E2E completo: login padre → dashboard con ranking + gráficos reales de 2 hijos → crear categoría → ver/editar libro propio → listar hijos → ver/editar metas de Lucas → en Recompensas, resolver la solicitud pendiente real del seed creando una `Reward` (pasa a lista de recompensas, la solicitud desaparece de pendientes) → login hijo (Lucas) → dashboard con KPIs/gráficos propios → libro `NOT_STARTED` con aviso y botón "Solicitar recompensa" funcional (crea `RewardRequest` + `Notification` al padre)
- [x] Datos de prueba creados durante la verificación (categoría "Aventuras", 1 `Reward` y 1 `RewardRequest`/`Notification` adicionales) limpiados tras la verificación (UI para lo borrable vía API; `UPDATE`/`DELETE` SQL directo por id conocido para la solicitud ya resuelta, ya que no existe endpoint para "reabrir" una `RewardRequest`) — el estado de la BD quedó igual que el baseline del seed
- [x] Criterio cumplido: flujo E2E manual completo del plan

### Fase 13 — Cierre ✅
- [x] Tests unitarios de servicios: ya cubiertos por las 191 pruebas de dominio/persistencia de las Fases 4-10 (verificados de nuevo sin regresión: `npm test -w backend` → 191/191 verdes)
- [x] Tests E2E (reglas de recompensa y notificaciones) — nuevo `backend/src/tests-e2e/rewards-notifications.e2e.test.ts` (12 tests, Vitest + `fetch`, `npm run test:e2e -w backend`): levanta el `dist/main.js` COMPILADO como proceso hijo contra la BD de desarrollo (no in-process, ver nota de arquitectura) y ejercita por HTTP real:
  registro de padre + alta de hijo → solicitud de recompensa (`RewardRequest`+`Notification`) → validaciones 400 (POINTS sin `goalId`, `deadline` pasada) → 403 (hijo no crea recompensas) → creación de meta+recompensa de puntos → resolución de la solicitud → 409 (recompensa sobre libro que ya no es `NOT_STARTED`) → libro `FINISHED` a tiempo → `FULFILLED` + ledger positivo + meta `ACHIEVED` + notificaciones al hijo → canje de meta → `REDEEMED` + ledger `REDEMPTION` + saldo a 0 → recompensa con `deadline` backdateada en BD → libro `FINISHED` → `PENALIZED` + ledger negativo + notificación → solicitud descartada (`DISMISSED`) → aislamiento 403 entre `/stats/me` y `/stats/overview` → 401 sin token. Usa un padre/hijo con email único (timestamp) y limpia todo al final borrando el usuario padre (cascade del schema), dejando el seed baseline intacto (verificado: 3 usuarios tras la limpieza)
- [x] `docker compose up` verificado de extremo a extremo: **bug real encontrado y corregido** — el contenedor `db` había quedado `unhealthy` porque su healthcheck (definido al crearlo en una fase anterior) no coincidía con el binario disponible; se corrigió recreándolo (`docker compose up -d --force-recreate --no-deps db`, datos preservados en el volumen). Con `backend`/`frontend` construidos y arrancados (`docker compose up -d`), se verificó: `GET /api/health` (backend) → 200; `GET /` (frontend, nginx) → 200; login real a través del proxy nginx del frontend (`http://localhost:4173/api/auth/login` → 200, token válido) confirmando la cadena completa `frontend(nginx) → backend(Nest) → db(MariaDB)`; navegador contra `http://localhost:4173` con login+dashboard reales
- [x] **Corrección de Dockerfile backend**: `node:20-alpine` fallaba en tiempo de build/ejecución (`prisma migrate deploy` necesitaba descargar el schema-engine de nuevo en el arranque del contenedor, y Alpine/musl hace que Prisma no detecte bien OpenSSL). Se cambió a `node:20` (Debian/glibc) en ambas etapas, tal como ya recomendaba el bloqueo #1 documentado en Fase 1
- [x] **CA corporativa opcional y portable**: en vez de hornear el certificado personal en el Dockerfile (rompería el build para cualquier otra persona), se añadió `backend/certs/extra-ca.pem` y `frontend/certs/extra-ca.pem` — ficheros VACÍOS por defecto, copiados a la imagen y referenciados vía `NODE_EXTRA_CA_CERTS`; en un entorno con proxy de inspección TLS basta sustituir el contenido por el bundle de CA local antes de `docker compose build` (sin tocar el Dockerfile). Verificado en este entorno copiando temporalmente el bundle real, construyendo, y restaurando el fichero a vacío al terminar (0 bytes en el repo, nunca se commitea el certificado corporativo)
- [x] Documentación final: este documento (seguimiento de fases) y `docs/04-arquitectura.md` actualizados con el estado completo del proyecto (Fases 1-13)
- [x] Criterio cumplido: suite de tests en verde (191 unitarios/persistencia + 12 E2E) y `docker compose up` reproduce el entorno completo

## Bloqueos conocidos
| # | Bloqueo | Estado | Detalle |
|---|---------|--------|---------|
| 1 | Descarga de binarios Prisma desde Windows local / contenedores | ✅ resuelto (aplicado en Fase 13) | El tráfico va por **Netskope (proxy de Redarbor)** que hace inspección TLS (emisor `ca.redarbor.goskope.com`), cuya CA no está confiada por Node en contenedores. Solución definitiva en los Dockerfiles: `backend/certs/extra-ca.pem` y `frontend/certs/extra-ca.pem` (VACíOS por defecto, portables) copiados a la imagen + `ENV NODE_EXTRA_CA_CERTS=/app/certs/extra-ca.pem` en build Y en runtime (el backend necesita descargar el schema-engine de Prisma tanto en `prisma generate` como en `prisma migrate deploy` al arrancar). Para reproducir en un entorno con este proxy: sustituir el contenido de esos 2 ficheros por el bundle de CA local antes de `docker compose build` (nunca commitear el contenido real). En Windows local (sin Docker) basta `set NODE_EXTRA_CA_CERTS=%TEMP%\myr-ca\netskope-chain.pem`. Dockerfile backend migrado a **`node:20` (Debian), no `node:20-alpine`**, para que Prisma detecte bien OpenSSL (alpine/musl daba warnings de detección y arriesgaba descargar el binario equivocado). |
| 2 | Puerto 3306 ocupado por WSL2 | ✅ resuelto | La BD de Compose expone `13306:3306` en el host; entre servicios sigue siendo `db:3306`. Dev local: `DATABASE_URL=...127.0.0.1:13306/myreadings` (ver `backend/.env`). |
| 3 | Privilegios para shadow database | ✅ resuelto | `migrate dev` requiere crear BDs: `GRANT ALL PRIVILEGES ON *.* TO 'myreadings'@'%'` (aplicado en la BD del compose). |
