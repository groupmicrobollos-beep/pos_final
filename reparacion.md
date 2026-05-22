Actuá como un arquitecto de software senior y desarrollador full stack especializado en debugging crítico, estabilidad de sistemas y refactorización segura. 

OBJETIVO:
Reparar los siguientes problemas SIN romper funcionalidades existentes, SIN modificar lógica ya estable y SIN introducir nuevos errores, bugs visuales, problemas de estado, conflictos de dependencias ni inconsistencias en base de datos.

REQUISITOS OBLIGATORIOS:
- Mantener compatibilidad total con el sistema actual.
- No eliminar funcionalidades existentes.
- Validar cada cambio antes de aplicarlo.
- Aplicar principios de programación defensiva.
- Agregar manejo de errores y validaciones.
- Mantener consistencia entre frontend, backend y base de datos.
- Verificar relaciones, foreign keys, estados y sincronización de datos.
- Garantizar persistencia real de datos.
- Optimizar UX/UI sin romper estilos existentes.
- Todo cambio debe quedar completamente funcional y probado.

========================
PROBLEMAS CRÍTICOS A REPARAR
========================

# 1) FUNCIONAMIENTO DE BASE DE DATOS (PRIORIDAD MÁXIMA)

## A. Clientes y Vehículos NO se guardan
Actualmente:
- No guarda clientes.
- No guarda vehículos asociados.
- No persiste información en base de datos.
- No existe gestión correcta de edición.

REPARAR:
- Persistencia completa de clientes.
- Persistencia completa de vehículos asociados.
- Relación correcta entre cliente y vehículo.
- Crear o reparar CRUD completo:
    - Crear
    - Editar
    - Actualizar
    - Eliminar
    - Listar
- Crear pestaña o módulo de gestión para:
    - Clientes
    - Vehículos
- Permitir editar datos importantes posteriormente.
- Validar integridad de datos.
- Validar IDs y relaciones.
- Evitar duplicados.
- Verificar respuestas del backend.
- Corregir posibles errores de:
    - rutas
    - controladores
    - ORM
    - consultas SQL
    - estados frontend
    - requests
    - mutations
    - fetch/axios
    - manejo async/await

IMPORTANTE:
Verificar que:
- Los datos realmente se guarden en DB.
- Se reflejen inmediatamente en UI.
- Persista luego de recargar.
- No haya errores silenciosos.

--------------------------------

## B. Gestión de usuarios NO funciona
Actualmente:
- No se pueden agregar usuarios.
- No se pueden actualizar.
- No se pueden eliminar.
- No se pueden asociar a sucursales.
- Al crear presupuesto no se puede asociar el usuario creador.

REPARAR:
- CRUD completo de usuarios.
- Asociación correcta usuario ↔ sucursal.
- Persistencia real en base de datos.
- Reparar formularios y validaciones.
- Reparar endpoints/API.
- Reparar estados frontend.
- Permitir seleccionar usuario creador al generar presupuesto.
- Guardar correctamente:
    - usuario creador
    - sucursal
    - fecha
    - presupuesto asociado

Además:
- Mostrar luego quién creó cada presupuesto.
- Validar permisos y roles.
- Evitar errores de referencias null/undefined.
- Corregir problemas de sincronización entre frontend y backend.

VALIDAR:
- Alta correcta.
- Edición correcta.
- Eliminación correcta.
- Asociación correcta.
- Persistencia correcta.
- Visualización correcta.

========================
PROBLEMAS ESTÉTICOS / UX
========================

# 2) Modales defectuosos

Actualmente:
- Los modales se abren mal.
- Mala experiencia de usuario.
- Posibles problemas de:
    - z-index
    - overflow
    - centrado
    - scroll
    - responsive
    - focus
    - animaciones
    - backdrop

REPARAR COMPLETAMENTE:
- Centrado correcto.
- Responsive.
- Overlay correcto.
- Scroll interno funcional.
- Evitar desbordes.
- Evitar modales fuera de pantalla.
- Corregir stacking/context.
- Bloquear scroll del body al abrir.
- Restaurar scroll al cerrar.
- Corregir cierre accidental.
- Corregir problemas mobile.
- Mantener accesibilidad.
- Mantener diseño moderno y profesional.

IMPORTANTE:
Todos los modales del sistema deben comportarse correctamente:
- Repuestos
- Clientes
- Vehículos
- Usuarios
- Presupuestos
- Cualquier modal reutilizable

========================

# 3) Permitir valor 0.00

Actualmente:
- El sistema no permite guardar 0.00.

REPARAR:
- Permitir guardar valores:
    - 0
    - 0.0
    - 0.00

En cualquier campo numérico necesario.

Además:
- Si el valor es 0.00:
    - Mostrar “-” visualmente en presupuestos.
    - Igual que el comportamiento actual del número de siniestro.

IMPORTANTE:
- SOLO cambiar visualización.
- El valor real debe seguir siendo 0 en base de datos.
- No romper cálculos.
- No generar NaN.
- No romper totales.
- Mantener compatibilidad matemática.

========================

# 4) Dashboard roto

Actualmente:
- Los dashboards muestran información incorrecta.
- Mala estructura visual.
- Componentes inconsistentes.

RECREAR COMPLETAMENTE:
- Dashboard principal.
- Widgets.
- Cards.
- Gráficos.
- KPIs.
- Tablas resumidas.

OBJETIVO:
- Dashboard limpio.
- Moderno.
- Responsive.
- Profesional.
- Datos reales.
- Actualización correcta.
- Buen rendimiento.

VALIDAR:
- Métricas correctas.
- Datos sincronizados.
- Sin errores de render.
- Sin consultas innecesarias.
- Sin loops infinitos.
- Sin warnings de React/Vue/etc.

========================
REGLAS CRÍTICAS
========================

ANTES DE MODIFICAR:
1. Analizar arquitectura actual.
2. Detectar dependencias.
3. Identificar impacto de cambios.
4. Verificar modelos y relaciones.
5. Revisar estados globales.

AL IMPLEMENTAR:
- Aplicar cambios incrementales.
- Verificar funcionamiento después de cada cambio.
- No refactorizar innecesariamente.
- No cambiar nombres críticos si no hace falta.
- Mantener compatibilidad total.

AL FINALIZAR:
REALIZAR TESTING COMPLETO:
- CRUD clientes
- CRUD vehículos
- CRUD usuarios
- Asociación sucursal
- Presupuestos
- Persistencia DB
- Modales
- Dashboard
- Valores 0.00
- Responsive
- Mobile
- Estados frontend
- Validaciones
- Renderizado

ENTREGAR:
- Código corregido.
- Código limpio.
- Sin errores de consola.
- Sin warnings.
- Sin errores de compilación.
- Sin errores de tipado.
- Sin errores de persistencia.
- Sistema completamente funcional y estable.
