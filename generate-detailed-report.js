/**
 * Generador de Reportes COMPLETO y DETALLADO - Sistema POS
 * Ejecutar: node generate-detailed-report.js
 */

const { db, getDBStatus } = require('./db.js');
const fs = require('fs');
const path = require('path');

let report = '';

function log(text = '') {
  report += text + '\n';
}

function section(title) {
  log(`\n## ${title}\n`);
}

function subsection(title) {
  log(`\n### ${title}\n`);
}

function code(lang, content) {
  log(`\`\`\`${lang}`);
  log(content);
  log('```\n');
}

async function getCount(table) {
  try {
    const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
    return result.rows[0]?.count || 0;
  } catch (err) {
    return 0;
  }
}

async function getTableData(query) {
  try {
    const result = await db.execute(query);
    return result.rows || [];
  } catch (err) {
    return [];
  }
}

async function formatTable(headers, rows) {
  let table = '| ' + headers.join(' | ') + ' |\n';
  table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  rows.forEach(row => {
    table += '| ' + headers.map(h => {
      const val = row[h];
      if (val === undefined || val === null) return 'N/A';
      const str = String(val);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
    }).join(' | ') + ' |\n';
  });
  return table;
}

async function generateDetailedReport() {
  try {
    // ========================
    // PORTADA
    // ========================
    log(`# 📊 INFORME TÉCNICO COMPLETO - SISTEMA POS`);
    log(`\n**Fecha de Generación:** ${new Date().toLocaleString('es-AR')}`);
    log(`**Versión:** 1.0.0`);
    log(`**Estado:** Pre-Producción / Testing`);
    log('');

    // ========================
    // TABLA DE CONTENIDOS
    // ========================
    log('## 📑 Tabla de Contenidos');
    log('');
    log('1. [Estado del Sistema](#estado-del-sistema)');
    log('2. [Estadísticas Generales](#estadísticas-generales)');
    log('3. [Análisis de Datos](#análisis-de-datos)');
    log('4. [Arquitectura del Sistema](#arquitectura-del-sistema)');
    log('5. [Estado de Funcionalidades](#estado-de-funcionalidades)');
    log('6. [Verificación de Integridad](#verificación-de-integridad)');
    log('7. [Problemas Detectados](#problemas-detectados)');
    log('8. [Plan de Testing](#plan-de-testing)');
    log('9. [Endpoints API](#endpoints-api)');
    log('10. [Recomendaciones](#recomendaciones)');
    log('');

    // ========================
    // ESTADO DEL SISTEMA
    // ========================
    section('Estado del Sistema');
    
    const dbStatus = getDBStatus();
    log(`| Componente | Estado |`);
    log(`| --- | --- |`);
    log(`| 🗄️ Base de Datos | ${dbStatus.tursoEnabled ? '🟢 Turso (Remota)' : '🟡 SQLite (Local)'} |`);
    log(`| 📡 Configuración | ${dbStatus.status} |`);
    log(`| 🎯 Modo | ${process.env.NODE_ENV || 'development'} |`);
    log(`| 📍 Ruta Local | \`${dbStatus.localDbPath}\` |`);
    log('');

    // ========================
    // ESTADÍSTICAS GENERALES
    // ========================
    section('Estadísticas Generales');

    const stats = {
      usuarios: await getCount('users'),
      clientes: await getCount('clients'),
      vehiculos: await getCount('vehicles'),
      presupuestos: await getCount('quotes'),
      productos: await getCount('products'),
      proveedores: await getCount('suppliers'),
      sucursales: await getCount('branches'),
    };

    log(`| Entidad | Cantidad | Estado |`);
    log(`| --- | --- | --- |`);
    log(`| 👥 Usuarios | ${stats.usuarios} | ${stats.usuarios > 0 ? '✅' : '⚠️'} |`);
    log(`| 🏢 Clientes | ${stats.clientes} | ${stats.clientes > 0 ? '✅' : '⚠️'} |`);
    log(`| 🚗 Vehículos | ${stats.vehiculos} | ${stats.vehiculos > 0 ? '✅' : '⚠️'} |`);
    log(`| 📋 Presupuestos | ${stats.presupuestos} | ${stats.presupuestos > 0 ? '✅' : '⚠️'} |`);
    log(`| 📦 Productos | ${stats.productos} | ${stats.productos > 0 ? '✅' : '⚠️'} |`);
    log(`| 🏭 Proveedores | ${stats.proveedores} | ${stats.proveedores > 0 ? '✅' : '⚠️'} |`);
    log(`| 🏪 Sucursales | ${stats.sucursales} | ${stats.sucursales > 0 ? '✅' : '⚠️'} |`);
    log('');

    subsection('Índice de Cobertura de Datos');
    
    const totalTables = 7;
    const tablesWithData = Object.values(stats).filter(v => v > 0).length;
    const coverage = Math.round((tablesWithData / totalTables) * 100);
    
    log(`**${coverage}% de tablas pobladas (${tablesWithData}/${totalTables})**`);
    log('');
    log(`[████████${coverage < 50 ? '░░░░░░░░' : '████████'}] ${coverage}%`);
    log('');

    // ========================
    // ANÁLISIS DE DATOS
    // ========================
    section('Análisis de Datos');

    subsection('Usuarios');
    const usuarios = await getTableData('SELECT id, username, full_name, email, role, active, created_at FROM users ORDER BY created_at DESC');
    log(await formatTable(['username', 'full_name', 'email', 'role', 'active'], usuarios));
    log('');

    subsection('Clientes');
    const clientes = await getTableData('SELECT id, name, phone, email, created_at FROM clients ORDER BY created_at DESC LIMIT 20');
    log(await formatTable(['name', 'phone', 'email', 'created_at'], clientes));
    if (stats.clientes > 20) log(`\n*Mostrando 20 de ${stats.clientes} registros*\n`);
    log('');

    subsection('Vehículos');
    const vehiculos = await getTableData(`
      SELECT v.id, v.brand, v.model, v.plate, v.year, c.name as client_name
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
      ORDER BY v.created_at DESC
      LIMIT 20
    `);
    log(await formatTable(['brand', 'model', 'plate', 'year', 'client_name'], vehiculos));
    if (stats.vehiculos > 20) log(`\n*Mostrando 20 de ${stats.vehiculos} registros*\n`);
    log('');

    subsection('Presupuestos');
    const presupuestos = await getTableData(`
      SELECT id, client_name, vehicle, total, status, date, created_by
      FROM quotes
      ORDER BY date DESC
      LIMIT 20
    `);
    log(await formatTable(['client_name', 'vehicle', 'total', 'status', 'date'], presupuestos));
    if (stats.presupuestos > 20) log(`\n*Mostrando 20 de ${stats.presupuestos} registros*\n`);
    log('');

    subsection('Análisis de Presupuestos por Estado');
    const presupuestosAnalisis = await getTableData(`
      SELECT 
        status,
        COUNT(*) as cantidad,
        ROUND(AVG(total), 2) as promedio,
        ROUND(SUM(total), 2) as total_acumulado
      FROM quotes
      GROUP BY status
    `);
    if (presupuestosAnalisis.length > 0) {
      log(await formatTable(['status', 'cantidad', 'promedio', 'total_acumulado'], presupuestosAnalisis));
    } else {
      log('*Sin presupuestos*');
    }
    log('');

    subsection('Productos');
    const productos = await getTableData('SELECT id, description, price, type, category, stock FROM products ORDER BY created_at DESC LIMIT 15');
    log(await formatTable(['description', 'price', 'type', 'stock'], productos));
    log('');

    subsection('Sucursales');
    const sucursales = await getTableData('SELECT id, name, code, address, phone FROM branches ORDER BY created_at DESC');
    log(await formatTable(['code', 'name', 'address', 'phone'], sucursales));
    log('');

    // ========================
    // ARQUITECTURA
    // ========================
    section('Arquitectura del Sistema');

    subsection('Stack Tecnológico');
    log(`| Capa | Tecnología |`);
    log(`| --- | --- |`);
    log(`| **Backend** | Node.js + Express.js |`);
    log(`| **Base de Datos** | SQLite (local) / Turso (remota) |`);
    log(`| **Frontend** | Vanilla JavaScript (DOM) |`);
    log(`| **Autenticación** | Token-based (sesiones) |`);
    log(`| **Estilos** | Tailwind CSS |`);
    log(`| **Routing** | Client-side routing (hash-based) |`);
    log('');

    subsection('Estructura de Carpetas');
    code('text', `
pos_final-main/
├── functions/
│   └── api/
│       ├── auth/        (login, logout, me)
│       ├── users/       (CRUD usuarios)
│       ├── clients/     (CRUD clientes)
│       ├── quotes/      (CRUD presupuestos)
│       ├── products/    (CRUD productos)
│       ├── branches/    (CRUD sucursales)
│       ├── suppliers/   (CRUD proveedores)
│       └── stock/       (movimientos)
├── routes/              (rutas backend)
├── js/
│   ├── store.js         (gestor de estado central)
│   ├── router.js        (enrutamiento frontend)
│   ├── components/      (componentes reutilizables)
│   ├── pages/           (páginas principales)
│   ├── services/        (lógica de negocio)
│   └── utils/           (utilidades)
├── db.js                (conexión BD)
├── server.js            (punto de entrada)
└── schema.sql           (estructura BD)
    `);

    subsection('Flujo de Datos');
    log('**Frontend → Backend:**');
    log('1. Usuario interactúa con página (js/pages/*.js)');
    log('2. Servicio llamado (js/services/*.js)');
    log('3. Store realiza fetch (js/store.js)');
    log('4. Endpoint API recibe petición (functions/api/*.js)');
    log('5. BD actualizada (db.js)');
    log('');

    log('**Backend → Frontend:**');
    log('1. Endpoint retorna JSON');
    log('2. Store actualiza estado local');
    log('3. localStorage sincronizado');
    log('4. Componentes escuchan eventos personalizados');
    log('5. DOM re-renderizado');
    log('');

    // ========================
    // ESTADO DE FUNCIONALIDADES
    // ========================
    section('Estado de Funcionalidades');

    subsection('✅ Implementado');
    log('- Autenticación de usuarios (login/logout)');
    log('- CRUD de Clientes con vehículos asociados');
    log('- CRUD de Usuarios');
    log('- CRUD de Presupuestos');
    log('- CRUD de Productos');
    log('- CRUD de Sucursales');
    log('- Asociación usuario-sucursal en presupuestos');
    log('- Historial de presupuestos');
    log('- Asignación de presupuestos a usuarios');
    log('');

    subsection('🟡 Parcialmente Implementado');
    log('- Dashboard (UI básica, sin métricas completas)');
    log('- Modales (funcionan pero con issues de posicionamiento)');
    log('- Reportes (solo presupuestos)');
    log('- Búsqueda y filtrado (básico)');
    log('');

    subsection('🔴 No Implementado');
    log('- Movimientos de stock avanzados');
    log('- Facturación electrónica');
    log('- Integración de pagos');
    log('- Email automáticos');
    log('- Exportación a PDF (parcial)');
    log('- Gráficos y estadísticas avanzadas');
    log('- Sistema de permisos granular');
    log('');

    // ========================
    // VERIFICACIÓN DE INTEGRIDAD
    // ========================
    section('Verificación de Integridad');

    const orphanVehicles = await getTableData('SELECT COUNT(*) as count FROM vehicles WHERE client_id NOT IN (SELECT id FROM clients)');
    const orphanQuotes = await getTableData('SELECT COUNT(*) as count FROM quotes WHERE branch_id IS NOT NULL AND branch_id NOT IN (SELECT id FROM branches)');
    const usersNoBranch = await getTableData('SELECT COUNT(*) as count FROM users WHERE branch_id IS NOT NULL AND branch_id NOT IN (SELECT id FROM branches)');
    const duplicateEmails = await getTableData('SELECT email, COUNT(*) as count FROM users WHERE email IS NOT NULL GROUP BY email HAVING count > 1');
    const duplicateUsernames = await getTableData('SELECT username, COUNT(*) as count FROM users GROUP BY username HAVING count > 1');

    log(`| Verificación | Resultado | Estado |`);
    log(`| --- | --- | --- |`);
    log(`| 🚗 Vehículos huérfanos | ${orphanVehicles[0]?.count || 0} | ${(orphanVehicles[0]?.count || 0) === 0 ? '✅' : '⚠️'} |`);
    log(`| 📋 Presupuestos inconsistentes | ${orphanQuotes[0]?.count || 0} | ${(orphanQuotes[0]?.count || 0) === 0 ? '✅' : '⚠️'} |`);
    log(`| 👤 Usuarios sin sucursal válida | ${usersNoBranch[0]?.count || 0} | ${(usersNoBranch[0]?.count || 0) === 0 ? '✅' : '⚠️'} |`);
    log(`| 📧 Emails duplicados | ${duplicateEmails.length} | ${duplicateEmails.length === 0 ? '✅' : '⚠️'} |`);
    log(`| 👤 Usernames duplicados | ${duplicateUsernames.length} | ${duplicateUsernames.length === 0 ? '✅' : '⚠️'} |`);
    log('');

    // ========================
    // PROBLEMAS DETECTADOS
    // ========================
    section('Problemas Detectados');

    const issues = [];

    if (stats.usuarios === 0) {
      issues.push({
        severity: 'alto',
        title: 'Sin usuarios de prueba',
        description: 'No hay usuarios registrados en el sistema',
        solution: 'Crear usuarios de prueba mediante POST /api/users'
      });
    }

    if (stats.clientes < 3) {
      issues.push({
        severity: 'medio',
        title: 'Pocos datos de clientes',
        description: `Solo ${stats.clientes} clientes para testing`,
        solution: 'Crear al menos 10 clientes de prueba'
      });
    }

    if (stats.presupuestos === 0) {
      issues.push({
        severity: 'medio',
        title: 'Sin presupuestos generados',
        description: 'No hay presupuestos para validar funcionalidad',
        solution: 'Generar presupuestos de prueba'
      });
    }

    if (orphanVehicles[0]?.count > 0) {
      issues.push({
        severity: 'alto',
        title: 'Vehículos huérfanos detectados',
        description: `${orphanVehicles[0].count} vehículos sin cliente asociado`,
        solution: 'Ejecutar consulta de limpieza: DELETE FROM vehicles WHERE client_id NOT IN (SELECT id FROM clients)'
      });
    }

    if (duplicateEmails.length > 0) {
      issues.push({
        severity: 'alto',
        title: 'Emails duplicados en usuarios',
        description: `${duplicateEmails.length} email(s) duplicado(s)`,
        solution: 'Revisar y consolidar usuarios con emails duplicados'
      });
    }

    if (issues.length === 0) {
      log('✅ **No se detectaron problemas críticos**');
      log('');
    } else {
      issues.forEach((issue, idx) => {
        const severityIcon = {
          'alto': '🔴',
          'medio': '🟡',
          'bajo': '🟢'
        }[issue.severity];

        log(`${severityIcon} **Problema ${idx + 1}: ${issue.title}**`);
        log(`- **Severidad:** ${issue.severity.toUpperCase()}`);
        log(`- **Descripción:** ${issue.description}`);
        log(`- **Solución:** \`${issue.solution}\``);
        log('');
      });
    }

    // ========================
    // PLAN DE TESTING
    // ========================
    section('Plan de Testing');

    subsection('Fase 1: Validación de Infraestructura');
    log('- [ ] Verificar que el servidor inicia: `npm start`');
    log('- [ ] Verificar que la BD se conecta correctamente');
    log('- [ ] Ejecutar migrations: `node verify_system.js`');
    log('- [ ] Verificar archivos de logs');
    log('');

    subsection('Fase 2: Testing de Endpoints Críticos');
    log('');
    log('#### Autenticación');
    log('- [ ] POST /api/auth/login con credenciales válidas');
    log('- [ ] POST /api/auth/login con credenciales inválidas (debe rechazar)');
    log('- [ ] GET /api/auth/me (debe retornar usuario actual)');
    log('- [ ] POST /api/auth/logout (debe borrar sesión)');
    log('');

    log('#### Usuarios');
    log('- [ ] GET /api/users (debe retornar lista)');
    log('- [ ] POST /api/users con datos válidos');
    log('- [ ] POST /api/users con email duplicado (debe rechazar)');
    log('- [ ] Validar que nuevo usuario aparece en lista');
    log('');

    log('#### Clientes');
    log('- [ ] GET /api/clients');
    log('- [ ] POST /api/clients con vehículos');
    log('- [ ] Verificar que vehículos se guardan correctamente');
    log('- [ ] GET /api/clients/[id]');
    log('');

    log('#### Presupuestos');
    log('- [ ] GET /api/quotes');
    log('- [ ] POST /api/quotes con items');
    log('- [ ] Verificar que created_by se guarda');
    log('- [ ] Validar cálculo de total');
    log('');

    subsection('Fase 3: Testing de UI');
    log('- [ ] Navegar a Presupuestos');
    log('- [ ] Crear nuevo presupuesto');
    log('- [ ] Seleccionar cliente, usuario, sucursal');
    log('- [ ] Agregar items');
    log('- [ ] Guardar presupuesto');
    log('- [ ] Verificar que aparece en lista');
    log('- [ ] Navegar a Clientes');
    log('- [ ] Crear nuevo cliente con vehículos');
    log('- [ ] Navegar a Configuración/Usuarios');
    log('- [ ] Crear nuevo usuario');
    log('');

    subsection('Fase 4: Testing de Integridad de Datos');
    log('- [ ] Verificar que no hay vehículos huérfanos');
    log('- [ ] Verificar que presupuestos tienen sucursal válida');
    log('- [ ] Verificar que no hay emails duplicados');
    log('- [ ] Validar totales de presupuestos');
    log('');

    // ========================
    // ENDPOINTS API
    // ========================
    section('Endpoints API');

    subsection('Autenticación');
    log('```');
    log('POST   /api/auth/login       - Login (body: {identifier, password})');
    log('POST   /api/auth/logout      - Logout');
    log('GET    /api/auth/me          - Usuario actual');
    log('```');
    log('');

    subsection('Usuarios');
    log('```');
    log('GET    /api/users            - Listar usuarios');
    log('POST   /api/users            - Crear usuario');
    log('```');
    log('');

    subsection('Clientes');
    log('```');
    log('GET    /api/clients          - Listar clientes');
    log('POST   /api/clients          - Crear cliente');
    log('GET    /api/clients/[id]     - Obtener cliente');
    log('```');
    log('');

    subsection('Presupuestos');
    log('```');
    log('GET    /api/quotes           - Listar presupuestos');
    log('POST   /api/quotes           - Crear presupuesto');
    log('GET    /api/quotes/[id]      - Obtener presupuesto');
    log('```');
    log('');

    subsection('Productos');
    log('```');
    log('GET    /api/products         - Listar productos');
    log('POST   /api/products         - Crear producto');
    log('GET    /api/products/[id]    - Obtener producto');
    log('```');
    log('');

    subsection('Sucursales');
    log('```');
    log('GET    /api/branches         - Listar sucursales');
    log('POST   /api/branches         - Crear sucursal');
    log('```');
    log('');

    subsection('Proveedores');
    log('```');
    log('GET    /api/suppliers        - Listar proveedores');
    log('POST   /api/suppliers        - Crear proveedor');
    log('```');
    log('');

    // ========================
    // RECOMENDACIONES
    // ========================
    section('Recomendaciones');

    subsection('Para Desarrollo');
    log('1. **Crear datos de prueba robustos**');
    log('   - Ejecutar script: `node create_user.js`');
    log('   - Poblar con clientes y presupuestos');
    log('');

    log('2. **Habilitar debugging**');
    log('   - Revisar console del navegador (F12)');
    log('   - Revisar logs del servidor');
    log('   - Usar `verify_system.js` para diagnóstico');
    log('');

    log('3. **Implementar validaciones faltantes**');
    log('   - Validar valores 0.00 en presupuestos');
    log('   - Validar campos requeridos en formularios');
    log('   - Sanitizar inputs en backend');
    log('');

    log('4. **Mejorar manejo de errores**');
    log('   - Agregar try-catch en servicios');
    log('   - Mostrar mensajes de error claros al usuario');
    log('   - Loggear errores en backend');
    log('');

    subsection('Para Testing');
    log('1. Usar postman/insomnia para probar endpoints directamente');
    log('2. Escribir tests unitarios para servicios críticos');
    log('3. Automatizar testing con scripts (node test-api.js)');
    log('4. Revisar cobertura de casos de uso');
    log('5. Hacer test de carga (múltiples usuarios simultáneamente)');
    log('');

    subsection('Para Producción');
    log('1. **Configurar variables de entorno:**');
    log('   - TURSO_DATABASE_URL');
    log('   - TURSO_AUTH_TOKEN');
    log('   - NODE_ENV=production');
    log('');

    log('2. **Implementar validaciones de seguridad:**');
    log('   - Autenticación en todos los endpoints');
    log('   - Validación de permisos (RBAC)');
    log('   - Rate limiting');
    log('   - HTTPS obligatorio');
    log('');

    log('3. **Optimizaciones:**');
    log('   - Cacheo de consultas frecuentes');
    log('   - Índices en BD para queries lentas');
    log('   - Minificación de assets Frontend');
    log('   - CDN para assets estáticos');
    log('');

    // ========================
    // CONCLUSIÓN
    // ========================
    section('Conclusión');

    log(`**Estado General:** ${coverage >= 80 ? '🟢 BUENO' : coverage >= 50 ? '🟡 REGULAR' : '🔴 CRÍTICO'}`);
    log('');
    log('Este sistema POS está en fase de **pre-producción** con funcionalidades core implementadas.');
    log(`Actualmente tiene **${stats.usuarios} usuarios, ${stats.clientes} clientes, ${stats.presupuestos} presupuestos** para testing.`);
    log('');
    log('### Próximos Pasos:');
    log('1. Ejecutar plan de testing completo');
    log('2. Corregir los problemas detectados');
    log('3. Implementar validaciones faltantes');
    log('4. Generar datos de prueba masivos');
    log('5. Realizar testing de carga');
    log('6. Documentar APIs');
    log('');

    // ========================
    // FOOTER
    // ========================
    log('---');
    log(`\n*Reporte generado automáticamente el ${new Date().toISOString()}`);
    log('Contactar al equipo técnico para soporte adicional.*');

  } catch (err) {
    log(`\n❌ **Error generando reporte:** ${err.message}`);
    console.error(err);
  }

  // Guardar a archivo
  try {
    fs.writeFileSync(path.join(__dirname, 'reporting.md'), report);
    console.log('\n✅ Reporte guardado en: reporting.md');
  } catch (err) {
    console.error('Error guardando reporte:', err);
  }

  process.exit(0);
}

// Ejecutar
generateDetailedReport().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
