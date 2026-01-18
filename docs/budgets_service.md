# Servicio de Presupuestos (budgets)

Este documento explica el helper `js/services/budgets.js` que centraliza la persistencia de presupuestos en LocalStorage y la comunicación básica dentro de la SPA.

## Propósito

- Centralizar lectura/escritura de presupuestos (clave `budget_<...>`). 
- Mantener y actualizar el índice `budgets_list` (resúmenes para listados). 
- Emitir eventos in-page (`CustomEvent`) y permitir sincronización cross-tab mediante `storage`.

## Archivo

- `js/services/budgets.js`

## Funciones públicas

- `list()` → Array
  - Devuelve la lista de resúmenes (cada elemento incluye `.details` con el objeto completo si está disponible).
- `get(key)` → Object | null
  - Lee y devuelve el objeto presupuesto almacenado en la clave dada (`budget_<...>`).
- `save(data, key?)` → { key, summary }
  - Guarda `data` en `localStorage` bajo `key` si se pasa, o genera `budget_<sanitized-numero>`.
  - Actualiza `budgets_list` con el resumen y dispara `document.dispatchEvent(new CustomEvent('budgets:updated', { detail }))`.
  - Retorna `{ key, summary }`.
- `remove(key)` → void
  - Elimina la clave `key` y actualiza `budgets_list`. Dispara `budgets:updated` con action `delete`.
- `previewNextNumber(sucursal)` / `maxSeqForBranch(sucursal)` / `formatBudgetNumber(sucursal, seq)`
  - Helpers para numeración automática de presupuestos por sucursal.

## Forma de los datos (shape)

Un presupuesto (objeto `data` que se guarda con `save`) suele incluir, al menos:

- `numero` (string)
- `sucursal` (id)
- `fecha` (ISO date string)
- `cliente` (obj) — con campos como `nombre`, `telefono`, `vehiculo`, `patente`, `idCliente`, `idVehiculo`
- `items` (array) — cada item: { cantidad, descripcion, precio|unit, total }
- `subtotal` / `total` (strings o números formateados según UI)
- `done` (boolean)
- `assignedUser`, `estado`, `fechaCreacion` (opcional)

El `budgets_list` almacena un array de resúmenes con campos: `numero, sucursal, sucursalNombre, fecha, cliente, total, estado, done, assignedUser, key`.

## Eventos y sincronización

- In-page: tras `save` o `remove`, se lanza `document.dispatchEvent(new CustomEvent('budgets:updated', { detail }))`.
  - `detail` tiene `{ action: 'create'|'update'|'delete', key, summary? }`.
- Cross-tab: la app existente (por ejemplo `Presupuestos.js`) escucha `window.addEventListener('storage', ...)` para reaccionar cuando otra pestaña modifica `localStorage` (clave `budgets_list` o `budget_*`).

## Uso (ejemplos rápidos)

- Guardar un presupuesto (nuevo):

```js
import budgets from '../services/budgets.js';
const data = { numero: 'N° 0001 - 00000001', sucursal: 's1', fecha: '2025-11-03', cliente: { nombre: 'Juan' }, items: [...], total: '$1234' };
const res = budgets.save(data);
// res.key -> 'budget_N__0001_-_00000001' (sanitizado)
```

- Leer lista para pintar tabla:

```js
import budgets from '../services/budgets.js';
const all = budgets.list();
// each element: { numero, sucursal, fecha, cliente, total, key, details }
```

- Obtener un presupuesto para ver/editar:

```js
const b = budgets.get('budget_N__0001_-_00000001');
```

## Migración a backend (sugerencia)

Cuando se integre una API real, reemplazar o envolver las funciones del servicio por llamadas fetch:

- `list()` → fetch `/api/quotes/list`
- `get(key)` → fetch `/api/quotes/:id` (usando id extraído de `key` o un id explícito)
- `save(data, key?)` → POST/PUT a `/api/quotes/save` y luego actualizar localCache o rehidratar la lista

Mantener el evento `budgets:updated` local es útil para UI; si la persistencia pasa a servidor, emite el evento tras confirmar la operación remota.

## Testing manual rápido

1. Abre la app en el navegador.
2. En DevTools → Application → Local Storage verás `budgets_list` y claves `budget_*`.
3. Crea un presupuesto desde `#/presupuesto` y haz click en Guardar. Deberías ver:
   - Toast de confirmación
   - `budgets_list` actualizado
   - Si la página `#/presupuestos` está abierta, la tabla se actualiza automáticamente.

## Notas y recomendaciones

- El servicio está diseñado para ser pequeño y sin dependencias.
- Si necesitás control de concurrencia o esquemas complejos, considerá usar IndexedDB o un backend.
- Para debug rápido, podés escuchar `document.addEventListener('budgets:updated', e=>console.log(e.detail));`.

---

Si querés, puedo añadir una sección equivalente en el `README.md` y actualizar `Dashboard.js` y `Reportes.js` para usar `budgetsService` también.
