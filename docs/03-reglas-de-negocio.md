# 03 · Reglas de negocio

## 1. Recompensas (Reward)

### Creación y edición
- Solo un usuario con rol **PARENT** puede crear o editar recompensas.
- Solo se pueden crear/editar sobre libros de **sus propios hijos** (`book.ownerUserId` es un
  `CHILD` cuyo `parentId` == `parent.id`).
- Solo se pueden crear/editar cuando el libro está en estado **NOT_STARTED**. Si el libro ha
  pasado a `READING` o `FINISHED`, la operación se rechaza.
- `deadline` debe ser una **fecha futura** en el momento de la creación.
- Tipo de recompensa: **POINTS** o **MONEY** (euros), seleccionable por recompensa.
- Si el tipo es **POINTS**, es obligatorio enlazar una **Meta (Goal)** previamente creada y
  perteneciente al mismo hijo (`goalId`).
- `penaltyValue` es opcional.

### Resolución
- **Cumplimiento inmediato**: en cuanto el libro pasa a **FINISHED** dentro del plazo
  (`fecha_fin <= deadline`), la recompensa se marca **FULFILLED** al instante (no espera al
  deadline). Se registra una `LedgerEntry` positiva (`reason = FULFILLED`) y, si es de puntos,
  se acumula hacia la meta enlazada.
- **Penalización**: cuando el `deadline` vence y el libro **no** está en `FINISHED`, la
  recompensa se marca **PENALIZED**. Si tiene `penaltyValue`, se registra una `LedgerEntry`
  negativa (`reason = PENALTY`).
- En **MONEY**, la penalización **puede dejar el saldo de euros en negativo**.

## 2. Metas canjeables (Goal)

- Las metas las crea y gestiona el **PARENT** para un hijo concreto.
- Cada meta define `targetPoints` (p. ej. 1000 puntos = consola).
- Los puntos de las recompensas cumplidas se acumulan hacia la meta enlazada.
- Una meta pasa a **ACHIEVED** cuando los puntos acumulados hacia ella `>= targetPoints`.
- El canje marca la meta como **REDEEMED** y registra una `LedgerEntry` negativa
  (`reason = REDEMPTION`) que descuenta los puntos correspondientes.

## 3. Flujo de solicitud de recompensa (hijo → padre)

1. El **hijo** crea uno de sus libros (estado inicial `NOT_STARTED`).
2. El hijo pulsa **"Solicitar recompensa"** sobre ese libro. Esto:
   - Crea un `RewardRequest` con estado `PENDING`.
   - Genera una `Notification` al **padre** de tipo `REWARD_REQUEST` con el mensaje
     "recompensa pendiente de activar".
3. El **padre** ve la solicitud/notificación en su bandeja y **crea la Reward** asociada
   (siempre que el libro siga en `NOT_STARTED`). Al resolverla, el `RewardRequest` pasa a
   `RESOLVED` (o `DISMISSED` si la descarta).
4. **Sin bloqueo**: el hijo puede pasar el libro a `READING` cuando quiera, pero la interfaz le
   **avisa** de que, si empieza a leer, el padre ya no podrá crear la recompensa (por la regla
   de estado `NOT_STARTED`).

## 4. Notificaciones (in-app)

Notificaciones internas mostradas en el área de usuario (bandeja/campana). Tipos:

| Tipo | Destinatario | Se genera cuando |
|------|--------------|------------------|
| `REWARD_REQUEST` | Padre | El hijo solicita recompensa sobre un libro |
| `REWARD_FULFILLED` | Hijo | Una recompensa suya se cumple |
| `REWARD_PENALIZED` | Hijo | Una recompensa suya se penaliza al vencer el plazo |
| `GOAL_ACHIEVED` | Hijo (y padre) | Una meta alcanza sus puntos objetivo |

> Sin email ni push en el MVP.

## 5. Reglas de acceso y propiedad

- Un usuario solo puede ver y gestionar **sus propias** categorías y libros.
- El **CHILD** no puede crear ni editar recompensas ni metas; solo consultar su progreso,
  saldo y metas, y gestionar sus libros/categorías, además de solicitar recompensa.
- El **PARENT** solo puede operar sobre datos de hijos vinculados a él (`parentId`).

## 6. Validaciones de datos

| Entidad | Regla |
|---------|-------|
| Category | `colorHex` debe ser un color hexadecimal válido (`#RRGGBB`) |
| Book | `rating` entre 0 y 5; `endDate >= startDate` cuando ambas existen |
| Reward | `deadline` futura al crear; `value > 0`; `goalId` requerido si `type = POINTS` |
| Goal | `targetPoints > 0` |
| User | `email` único y con formato válido |
