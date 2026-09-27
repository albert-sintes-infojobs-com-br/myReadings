# Documentación · MyReadings (TFM)

Aplicación web de gestión de libros/lecturas con recompensas familiares. Índice de la
documentación de diseño e implementación.

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Visión y alcance](01-vision-y-alcance.md) | Objetivo, casos de uso, roles y alcance del MVP |
| 02 | [Modelo de datos](02-modelo-de-datos.md) | Entidades, atributos y diagrama ER |
| 03 | [Reglas de negocio](03-reglas-de-negocio.md) | Recompensas, penalizaciones, metas, flujo hijo→padre, notificaciones |
| 04 | [Arquitectura](04-arquitectura.md) | Stack, monorepo, módulos, Docker |
| 05 | [Plan de fases](05-plan-de-fases.md) | Fases 1-13 con dependencias y verificación |
| 06 | [API / Endpoints](06-api-endpoints.md) | Contrato REST por módulo, roles y validaciones |
| 07 | [Dashboards y métricas](07-dashboards-metricas.md) | Indicadores por rol y su cálculo |
| 08 | [Seguimiento de fases](08-seguimiento-fases.md) | Tracker de estado de cada fase (actualizar en cada avance) |

## Resumen del stack
- **Frontend**: React + Vite + TypeScript, MUI, TanStack Query.
- **Backend**: NestJS + Prisma, JWT, `@nestjs/schedule`.
- **Base de datos**: PostgreSQL (por defecto) o MySQL/MariaDB, seleccionable con `DB_PROVIDER`.
- **Despliegue**: Docker Compose.
