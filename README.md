# 📚 MyReadings

Aplicación web de gestión de libros/lecturas con recompensas familiares (TFM).

## 📖 Descripción general

**MyReadings** convierte la lectura en una aventura familiar: los padres/madres
incentivan la lectura de sus hijos mediante un sistema de **recompensas** (en puntos
o euros) asociadas a la finalización de libros dentro de un plazo, con **metas
canjeables** (p. ej. 1000 puntos = una consola) y **penalizaciones** por incumplimiento.

Dos roles:
- **Padre/Madre**: gestiona las cuentas de sus hijos, crea metas y recompensas sobre
  sus libros, y ve un dashboard general filtrable por hijo.
- **Hijo/Hija**: gestiona sus propios libros y categorías, solicita recompensas y ve
  su propio dashboard con su progreso y saldo.

## 🛠️ Stack tecnológico

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| [Node.js](https://nodejs.org) | 24.x (dev) / 20-alpine (contenedor) | Runtime |
| [NestJS](https://nestjs.com) | ^10.3 | Framework de la API REST (`/api` prefix) |
| [TypeScript](https://www.typescriptlang.org) | ^5.3 | Lenguaje (strict) |
| [Prisma](https://www.prisma.io) | ^5.10 | ORM + migraciones |
| `@nestjs/jwt` + `passport-jwt` | ^10.2 / ^4.0 | Autenticación JWT (claims `sub`, `role`, `email`) |
| `class-validator` + `class-transformer` | ^0.14 / ^0.5 | Validación de DTOs (`ValidationPipe` global) |
| `@nestjs/schedule` | ^4.0 | Tarea programada de vencimientos de recompensas |
| `@nestjs/swagger` | ^7.3 | Docs OpenAPI en `/api-docs` |

**Decisiones:**
- Contraseñas con **scrypt nativo** (`node:crypto`) — sin dependencias nativas (compatible
  Windows y contenedores Linux). Formato `saltHex:hashHex` de 161 chars, verificado en
  tiempo constante (`timingSafeEqual`).
- Roles `PARENT` / `CHILD` con cadena de guards `JwtAuthGuard → RolesGuard` + `@Roles()`.
- Monorepo **npm workspaces** (`backend/`, `frontend/`).

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| [React](https://react.dev) | ^18.2 | UI |
| [Vite](https://vitejs.dev) | ^5.2 | Build tool + dev server (proxy `/api` → `:3000`) |
| [TypeScript](https://www.typescriptlang.org) | ^5.3 | Lenguaje |
| [MUI](https://mui.com) (Material UI) | ^5.15 | Componentes y tema |
| [TanStack Query](https://tanstack.com/query) | ^5.32 | Estado de servidor / caché |
| [React Router](https://reactrouter.com) | ^6.22 | Rutas (protegidas por auth y rol) |
| [Recharts](https://recharts.org) | ^2.12 | Gráficos de los dashboards |
| [Axios](https://axios-http.com) | ^1.6 | Cliente HTTP con interceptor de token |

### Base de datos
| Tecnología | Versión | Uso |
|------------|---------|-----|
| [PostgreSQL](https://www.postgresql.org) (por defecto) | 16 (imagen `postgres:16-alpine`) | Base de datos relacional; dev local en `127.0.0.1:15432`, en Docker `db:5432` |
| [MariaDB](https://mariadb.org) (alternativa) | 11 (imagen `mariadb:11`) | Motor alternativo seleccionable con `DB_PROVIDER=mysql`; dev local en `127.0.0.1:13306`, en Docker `db:3306` |

El motor se selecciona con la variable `DB_PROVIDER` (`postgresql` por defecto o
`mysql`), que elige el schema/migraciones correspondientes en `backend/prisma/postgresql/`
o `backend/prisma/mysql/` (ver [`backend/scripts/run-prisma.js`](backend/scripts/run-prisma.js)).
Modelo completo (idéntico en ambos motores) en
[`backend/prisma/postgresql/schema.prisma`](backend/prisma/postgresql/schema.prisma)
(Usuarios, Categorías, Libros, Metas, Recompensas, Solicitudes, Notificaciones, Ledger).

### Pruebas e infraestructura
| Tecnología | Uso |
|------------|-----|
| [Vitest](https://vitest.dev) | Tests unitarios (TDD rojo→verde) y e2e — `npm test` en `backend/`, tests en `backend/src/tests/<entidad>.test.ts` |
| [Docker Compose](https://docs.docker.com/compose/) | `db` + `backend` + `frontend` (Nginx) |
| Nginx | Sirve el frontend estático y proxy de `/api` |

## 🌐 Instalación y ejecución

### Opción 1 — Docker (recomendado)

```bash
# Por defecto: Postgres
docker compose up --build

# Alternativa: MariaDB/MySQL
docker compose -f docker-compose.yml -f docker-compose.mysql.yml up --build
```

Servicios:
- Frontend: http://localhost:4173
- API: http://localhost:3000/api — health en `/api/health`, docs en `/api-docs`
- Base de datos: Postgres en `localhost:15432` (por defecto) o MariaDB en
  `localhost:13306` (con el override de arriba), usuario/clave `myreadings`/`myreadings`

> Nota: al arrancar, el backend ejecuta `prisma migrate deploy` y aplica las
> migraciones del motor activo (`backend/prisma/postgresql/migrations/` o
> `backend/prisma/mysql/migrations/`).

### Opción 2 — Desarrollo local

```bash
# Instalar dependencias del monorepo
npm install

# Backend (desarrollo, watch) en :3000
npm run dev:backend

# Frontend (Vite) en :5173 con proxy /api
npm run dev:frontend
```

Backend (en `backend/`):

```bash
npm test            # tests unitarios (Vitest, enfoque TDD)
npm run test:watch  # mismo, en modo watch
npm run prisma:seed # carga datos de ejemplo (idempotente)
```

Requisito de desarrollo: una instancia de Postgres o MySQL/MariaDB accesible, la
variable `DB_PROVIDER` (`postgresql` por defecto o `mysql`) y `DATABASE_URL` en
`backend/.env` (usa `backend/.env.example` como plantilla). Al cambiar de motor hay
que regenerar el cliente de Prisma: `DB_PROVIDER=mysql npm run prisma:generate`.

## 🗂️ Estructura del proyecto

```
├── backend/    # API NestJS + Prisma (domain/persistence/transport)
├── frontend/   # SPA React + Vite
├── docs/       # documentación del proyecto (visión, modelo de datos, API...)
└── docker-compose.yml
```

Ver [`docs/`](docs/) para el diseño completo: visión, modelo de datos, reglas de
negocio, arquitectura, plan de fases, API y dashboards.

## ✨ Funcionalidades principales

- 👨‍👩‍👧 **Perfiles familiares**: cuentas independientes para padres/madres (gestores) e
  hijos (lectores).
- 📗 **Gestión de libros**: alta y seguimiento con estado (sin empezar / leyendo /
  finalizado), fechas, notas, puntuación y categoría (tablero Kanban).
- 🏷️ **Categorías**: organización de libros por género o temática, con color identificativo.
- 🎁 **Metas y recompensas**: recompensas en puntos o euros con fecha límite,
  penalizaciones por incumplimiento, y metas canjeables por hijo.
- 🙋 **Solicitud de recompensa (hijo → padre)**: el hijo solicita recompensa sobre un
  libro sin empezar; el padre/madre la activa.
- 🔔 **Notificaciones in-app**: bandeja de notificaciones (solicitudes, recompensas
  cumplidas/penalizadas, metas alcanzadas).
- 📊 **Dashboards y estadísticas**: progreso de metas, libros por estado, recompensas
  por estado y tiempo medio de lectura; el padre puede filtrar por hijo.
- ⏰ **Motor de resolución automático**: tarea programada diaria que resuelve
  recompensas vencidas (cumplida/penalizada).

## 🔑 Usuario y contraseña de prueba

Tras ejecutar `npm run prisma:seed` (o al arrancar por Docker, que aplica el mismo seed),
quedan disponibles estas cuentas de prueba:

| Rol | Email | Contraseña |
|-----|-------|-------------|
| Padre/Madre | `maria@familia.dev` | `password123` |
| Hijo | `lucas@familia.dev` | `password123` |
| Hija | `anais@familia.dev` | `password123` |

## 🚀 Despliegue (Demo)

El proyecto está desplegado en los servicios gratuitos de Vercel para su demostración.

| Servicio | URL                                        |
|----------|--------------------------------------------|
|Frontend  |   https://my-readings-bice.vercel.app/     |
|Backend   |   https://my-readings-bice.vercel.app/api  |

Base de datos alojada en Neon. Storage en el propio Verel

### Credenciales de pruebas

| Usuario | Email              | Password | Rol       |
|---------|--------------------|----------|-----------|
| Albert  | alberttfm@tfm.com  | pwd12345 | PARENT    |
| Pedro   | pedro@tfm.com      | pwd12345 | CHILDREN  |
| Maria   | maria@tfm.com      | pwd12345 | CHILDREN  |
| Juan    | juan@tfm.com       | pwd12345 | CHILDREN  |

> Nota: se ha utilizado `vercel.json` para que el backend y el frontend puedan convivir en Vercel, ejecutándose el backend como una función serverless.

