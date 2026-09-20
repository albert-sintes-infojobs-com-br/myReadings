# 06 · API / Endpoints

Base URL: `/api`. Todos los endpoints (salvo registro/login) requieren `Authorization: Bearer <JWT>`.
Roles: **P** = PARENT, **C** = CHILD, **A** = cualquiera autenticado.

## Auth
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/auth/register` | — | Registro de padre/madre | email único, password fuerte |
| POST | `/auth/login` | — | Login, devuelve JWT | credenciales válidas |
| GET | `/auth/me` | A | Perfil del usuario autenticado | — |

## Users (gestión de hijos)
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/children` | P | Crear cuenta hijo | email único |
| GET | `/children` | P | Listar hijos del padre | solo sus hijos |
| GET | `/children/:id` | P | Detalle de un hijo | debe ser su hijo |
| PATCH | `/children/:id` | P | Editar hijo | debe ser su hijo |
| DELETE | `/children/:id` | P | Eliminar hijo | debe ser su hijo |

## Categories
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/categories` | A | Crear categoría propia | `colorHex` válido |
| GET | `/categories` | A | Listar categorías propias | solo del usuario |
| PATCH | `/categories/:id` | A | Editar categoría propia | propiedad |
| DELETE | `/categories/:id` | A | Eliminar categoría propia | propiedad |

## Books
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/books` | A | Crear libro propio | `rating` 0-5 |
| GET | `/books` | A | Listar libros propios (filtros por estado/categoría) | propiedad |
| GET | `/books/:id` | A | Detalle de libro | propiedad |
| PATCH | `/books/:id` | A | Editar libro / cambiar estado | `endDate >= startDate` |
| DELETE | `/books/:id` | A | Eliminar libro | propiedad |
| POST | `/books/:id/request-reward` | C | Solicitar recompensa (crea RewardRequest + Notification) | libro `NOT_STARTED` y propio |

## Goals (metas)
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/children/:childId/goals` | P | Crear meta para un hijo | `targetPoints > 0`, hijo propio |
| GET | `/children/:childId/goals` | P | Listar metas de un hijo | hijo propio |
| GET | `/goals/mine` | C | Listar mis metas y progreso | — |
| PATCH | `/goals/:id` | P | Editar meta | hijo propio |
| DELETE | `/goals/:id` | P | Eliminar meta | hijo propio, sin puntos comprometidos |
| POST | `/goals/:id/redeem` | P | Canjear meta alcanzada | estado `ACHIEVED` |

## Rewards
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| POST | `/books/:bookId/rewards` | P | Crear recompensa sobre libro de un hijo | libro `NOT_STARTED`, hijo propio, `deadline` futura, `goalId` si POINTS |
| GET | `/rewards` | A | Listar recompensas (padre: de sus hijos; hijo: las suyas) | ámbito por rol |
| GET | `/rewards/:id` | A | Detalle de recompensa | ámbito |
| PATCH | `/rewards/:id` | P | Editar recompensa | libro sigue `NOT_STARTED` |
| DELETE | `/rewards/:id` | P | Eliminar recompensa | libro `NOT_STARTED` |

## Reward Requests
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| GET | `/reward-requests` | P | Listar solicitudes pendientes de sus hijos | solo sus hijos |
| PATCH | `/reward-requests/:id` | P | Resolver/descartar solicitud | debe ser de un hijo suyo |

## Notifications
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| GET | `/notifications` | A | Listar notificaciones propias | — |
| GET | `/notifications/unread-count` | A | Nº de no leídas | — |
| PATCH | `/notifications/:id/read` | A | Marcar como leída | propiedad |
| PATCH | `/notifications/read-all` | A | Marcar todas como leídas | — |

## Ledger (saldo)
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| GET | `/ledger/balance` | C | Saldo propio (puntos y euros) | — |
| GET | `/children/:childId/ledger` | P | Movimientos y saldo de un hijo | hijo propio |

## Stats (dashboards)
| Método | Ruta | Rol | Descripción | Validaciones |
|--------|------|-----|-------------|--------------|
| GET | `/stats/me` | C | Estadísticas del propio hijo | — |
| GET | `/stats/overview` | P | Estadísticas agregadas (query `childId` opcional para filtrar) | hijos propios |

> Detalle de las métricas devueltas en [07-dashboards-metricas.md](07-dashboards-metricas.md).

## Códigos de error de referencia
| Código | Situación |
|--------|-----------|
| 400 | Validación de datos fallida |
| 401 | Token ausente o inválido |
| 403 | Rol o propiedad insuficiente (p. ej. recompensa sobre libro no `NOT_STARTED`) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email duplicado, meta ya canjeada, etc.) |
