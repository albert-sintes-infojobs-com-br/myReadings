# 07 · Dashboards y métricas

## 1. Alcance por rol

| Rol | Dashboard |
|-----|-----------|
| **PARENT** | Dashboard **general** con **filtro por hijo** (o vista agregada de todos sus hijos) |
| **CHILD** | Dashboard **solo con sus propios datos** |

El acceso está restringido en el backend: el padre solo agrega datos de hijos vinculados a él;
el hijo solo puede consultar sus propios indicadores (cualquier otro acceso → 403).

## 2. Métricas del MVP

| Métrica | Descripción | Visualización sugerida | Ámbito |
|---------|-------------|------------------------|--------|
| **Libros por estado** | Recuento de libros en `NOT_STARTED` / `READING` / `FINISHED` | Gráfico de anillo / barras | Padre (por hijo) y hijo |
| **Libros finalizados por periodo** | Nº de libros `FINISHED` agrupados por mes/año | Gráfico de líneas o barras temporales | Padre (por hijo) y hijo |
| **Saldo actual** | Puntos y euros acumulados (agregación del ledger) | Tarjetas KPI | Padre (por hijo) y hijo |
| **Progreso de metas** | % de avance hacia cada meta (`puntos acumulados / targetPoints`) | Barras de progreso | Padre (por hijo) y hijo |
| **Recompensas cumplidas vs penalizadas** | Recuento de `FULFILLED` frente a `PENALIZED` | Barras comparativas | Padre (por hijo) y hijo |
| **Tiempo medio de lectura** | Media de días entre `startDate` y `endDate` de libros finalizados | Tarjeta KPI | Padre (por hijo) y hijo |
| **Ranking entre hijos** | Comparativa entre hijos (libros finalizados, saldo, etc.) | Tabla / barras | **Solo padre** |

## 3. Definición de cálculo

- **Libros por estado**: `COUNT(*)` de `Book` agrupado por `status` para el/los hijo(s) del ámbito.
- **Libros finalizados por periodo**: `COUNT(*)` de `Book` con `status = FINISHED` agrupado por
  `YEAR(endDate)`, `MONTH(endDate)`.
- **Saldo actual**: `SUM(amount)` de `LedgerEntry` por `kind` (POINTS / MONEY) del hijo.
- **Progreso de metas**: por cada `Goal`, suma de `LedgerEntry` de puntos asociadas
  (`goalId`) dividida entre `targetPoints`, acotada al 100 % para la barra.
- **Recompensas cumplidas vs penalizadas**: `COUNT(*)` de `Reward` agrupado por `status`
  (`FULFILLED`, `PENALIZED`).
- **Tiempo medio de lectura**: `AVG(DATEDIFF(endDate, startDate))` sobre libros finalizados con
  ambas fechas informadas.
- **Ranking entre hijos**: agregación de los indicadores anteriores por hijo, ordenada según el
  criterio elegido (p. ej. libros finalizados en el periodo).

## 4. Endpoints asociados

- `GET /api/stats/me` — devuelve el conjunto de métricas del propio hijo.
- `GET /api/stats/overview?childId=<id>` — para el padre; sin `childId` agrega todos sus hijos
  e incluye el ranking; con `childId` filtra a ese hijo.

> Implementación de agregaciones con Prisma (`groupBy`, `count`, `aggregate`/`avg`). Ver
> [06-api-endpoints.md](06-api-endpoints.md) para el contrato de la API.
