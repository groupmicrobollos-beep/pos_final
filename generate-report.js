/**
 * Generador de Reportes Completos del Sistema POS
 * Ejecutar: node generate-report.js > reporting.md
 */

const { db, getDBStatus } = require('./db.js');
const fs = require('fs');
const path = require('path');

// Colores ANSI para terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

let report = '';

function log(text = '') {
  report += text + '\n';
  console.log(text);
}

function section(title) {
  log(`\n## ${title}\n`);
}

function subsection(title) {
  log(`\n### ${title}\n`);
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
    table += '| ' + headers.map(h => (row[h] !== undefined && row[h] !== null ? String(row[h]).substring(0, 50) : 'N/A')).join(' | ') + ' |\n';
  });
  return table;
}

async function generateReport() {
  try {
    log('# 📊 Informe Completo del Sistema POS');
    log(`Generado: ${new Date().toLocaleString('es-AR')}`);
    log('');

    // ========================
    // 1. ESTADO DEL SISTEMA
    // ========================
    section('Estado del Sistema');
    
    const dbStatus = getDBStatus();
    log(`**Base de Datos:** ${dbStatus.tursoEnabled ? '🟢 Turso (Remota)' : '🟡 SQLite (Local)'}`);
    log(`**Estado:** ${dbStatus.status}`);
    log(`**Ruta Local:** \`${dbStatus.localDbPath}\``);
    log('');

    // ========================
    // 2. ESTADÍSTICAS GENERALES
    // ========================
    section('📈 Estadísticas Generales');

    const stats = {
      usuarios: await getCount('users'),
      clientes: await getCount('clients'),
      vehiculos: await getCount('vehicles'),
      presupuestos: await getCount('quotes'),
      productos: await getCount('products'),
      proveedores: await getCount('suppliers'),
      sucursales: await getCount('branches'),
    };

    log(`| Entidad | Cantidad |`);
    log(`| --- | --- |`);
    log(`| 👥 **Usuarios** | ${stats.usuarios} |`);
    log(`| 🏢 **Clientes** | ${stats.clientes} |`);
    log(`| 🚗 **Vehículos** | ${stats.vehiculos} |`);
    log(`| 📋 **Presupuestos** | ${stats.presupuestos} |`);
    log(`| 📦 **Productos** | ${stats.productos} |`);
    log(`| 🏭 **Proveedores** | ${stats.proveedores} |`);
    log(`| 🏪 **Sucursales** | ${stats.sucursales} |`);
    log('');

    // ========================
    // 3. USUARIOS
    // ========================
    section('👥 Usuarios');

    const usuarios = await getTableData('SELECT id, username, full_name, email, role, active, branch_id FROM users ORDER BY created_at DESC');
    if (usuarios.length > 0) {
      log(await formatTable(['username', 'full_name', 'email', 'role', 'active'], usuarios));
    } else {
      log('*No hay usuarios registrados*');
    }
    log('');

    // ========================
    // 4. CLIENTES
    // ========================
    section('🏢 Clientes');

    const clientes = await getTableData('SELECT id, name, phone, email, created_at FROM clients ORDER BY created_at DESC LIMIT 20');
    if (clientes.length > 0) {
      log(await formatTable(['name', 'phone', 'email', 'created_at'], clientes));
      if (stats.clientes > 20) {
        log(`\n*Mostrando 20 de ${stats.clientes} clientes*`);
      }
    } else {
      log('*No hay clientes registrados*');
    }
    log('');

    // ========================
    // 5. VEHÍCULOS
    // ========================
    section('🚗 Vehículos');

    const vehiculos = await getTableData(`
      SELECT v.id, v.brand, v.model, v.plate, v.year, c.name as client_name
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
      ORDER BY v.created_at DESC
      LIMIT 20
    `);
    if (vehiculos.length > 0) {
      log(await formatTable(['brand', 'model', 'plate', 'year', 'client_name'], vehiculos));
      if (stats.vehiculos > 20) {
        log(`\n*Mostrando 20 de ${stats.vehiculos} vehículos*`);
      }
    } else {
      log('*No hay vehículos registrados*');
    }
    log('');

    // ========================
    // 6. PRESUPUESTOS
    // ========================
    section('📋 Presupuestos');

    const presupuestos = await getTableData(`
      SELECT id, client_name, vehicle, total, status, date, created_by
      FROM quotes
      ORDER BY date DESC
      LIMIT 20
    `);
    if (presupuestos.length > 0) {
      log(await formatTable(['client_name', 'vehicle', 'total', 'status', 'date'], presupuestos));
      if (stats.presupuestos > 20) {
        log(`\n*Mostrando 20 de ${stats.presupuestos} presupuestos*`);
      }
    } else {
      log('*No hay presupuestos registrados*');
    }
    log('');

    // Análisis de presupuestos
    subsection('Análisis de Presupuestos');

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
    }
    log('');

    // ========================
    // 7. PRODUCTOS
    // ========================
    section('📦 Productos');

    const productos = await getTableData('SELECT id, description, price, type, category, stock FROM products ORDER BY created_at DESC LIMIT 20');
    if (productos.length > 0) {
      log(await formatTable(['description', 'price', 'type', 'category', 'stock'], productos));
      if (stats.productos > 20) {
        log(`\n*Mostrando 20 de ${stats.productos} productos*`);
      }
    } else {
      log('*No hay productos registrados*');
    }
    log('');

    // ========================
    // 8. PROVEEDORES
    // ========================
    section('🏭 Proveedores');

    const proveedores = await getTableData('SELECT id, name, contact_info, created_at FROM suppliers ORDER BY created_at DESC');
    if (proveedores.length > 0) {
      log(await formatTable(['name', 'contact_info', 'created_at'], proveedores));
    } else {
      log('*No hay proveedores registrados*');
    }
    log('');

    // ========================
    // 9. SUCURSALES
    // ========================
    section('🏪 Sucursales');

    const sucursales = await getTableData('SELECT id, name, code, address, phone, cuit FROM branches ORDER BY created_at DESC');
    if (sucursales.length > 0) {
      log(await formatTable(['code', 'name', 'address', 'phone', 'cuit'], sucursales));
    } else {
      log('*No hay sucursales registradas*');
    }
    log('');

    // ========================
    // 10. HEALTH CHECK
    // ========================
    section('🔍 Health Check');

    const checks = [];

    // Verificar integridad de referencias
    const orphanVehicles = await getTableData('SELECT COUNT(*) as count FROM vehicles WHERE client_id NOT IN (SELECT id FROM clients)');
    const orphanQuotes = await getTableData('SELECT COUNT(*) as count FROM quotes WHERE branch_id IS NOT NULL AND branch_id NOT IN (SELECT id FROM branches)');

    log(`| Verificación | Estado |`);
    log(`| --- | --- |`);
    log(`| 🚗 Vehículos huérfanos | ${orphanVehicles[0]?.count || 0} |`);
    log(`| 📋 Presupuestos sin sucursal | ${orphanQuotes[0]?.count || 0} |`);
    log(`| 📦 Productos sin stock | ${(await getTableData('SELECT COUNT(*) as count FROM products WHERE stock = 0'))[0]?.count || 0} |`);
    log('');

    // ========================
    // 11. RECOMENDACIONES
    // ========================
    section('⚠️ Recomendaciones para Testing');

    const recommendations = [];

    if (stats.usuarios === 0) {
      recommendations.push('✓ **Crear usuarios de prueba** - No hay usuarios en el sistema');
    }
    if (stats.clientes === 0) {
      recommendations.push('✓ **Crear clientes de prueba** - No hay clientes registrados');
    }
    if (stats.vehiculos === 0) {
      recommendations.push('✓ **Crear vehículos de prueba** - No hay vehículos registrados');
    }
    if (stats.presupuestos === 0) {
      recommendations.push('✓ **Crear presupuestos de prueba** - No hay presupuestos generados');
    }
    if (stats.productos === 0) {
      recommendations.push('✓ **Crear productos de prueba** - No hay productos en catálogo');
    }
    if (stats.sucursales === 0) {
      recommendations.push('✓ **Crear sucursales** - No hay sucursales configuradas');
    }

    if (recommendations.length === 0) {
      log('✅ El sistema tiene datos de prueba');
    } else {
      recommendations.forEach(r => log(r));
    }
    log('');

    // ========================
    // 12. PROBLEMAS DETECTADOS
    // ========================
    section('🐛 Problemas Potenciales Detectados');

    const issues = [];

    if (orphanVehicles[0]?.count > 0) {
      issues.push(`⚠️ **Vehículos huérfanos:** ${orphanVehicles[0].count} vehículos sin cliente`);
    }
    if (orphanQuotes[0]?.count > 0) {
      issues.push(`⚠️ **Presupuestos inconsistentes:** ${orphanQuotes[0].count} presupuestos sin sucursal válida`);
    }

    // Verificar duplicados
    const duplicateEmails = await getTableData('SELECT email, COUNT(*) as count FROM users WHERE email IS NOT NULL GROUP BY email HAVING count > 1');
    if (duplicateEmails.length > 0) {
      issues.push(`⚠️ **Emails duplicados:** ${duplicateEmails.length} usuarios comparten email`);
    }

    if (issues.length === 0) {
      log('✅ No se detectaron problemas graves');
    } else {
      issues.forEach(i => log(i));
    }
    log('');

    // ========================
    // 13. ENDPOINTS DISPONIBLES
    // ========================
    section('🔌 Endpoints API Disponibles');

    log('#### Autenticación');
    log('- `POST /api/auth/login` - Login de usuario');
    log('- `POST /api/auth/logout` - Logout');
    log('- `GET /api/auth/me` - Datos del usuario actual');
    log('');

    log('#### Usuarios');
    log('- `GET /api/users` - Listar usuarios');
    log('- `POST /api/users` - Crear usuario');
    log('');

    log('#### Clientes');
    log('- `GET /api/clients` - Listar clientes');
    log('- `POST /api/clients` - Crear cliente');
    log('- `GET /api/clients/[id]` - Obtener cliente');
    log('');

    log('#### Presupuestos');
    log('- `GET /api/quotes` - Listar presupuestos');
    log('- `POST /api/quotes` - Crear presupuesto');
    log('- `GET /api/quotes/[id]` - Obtener presupuesto');
    log('');

    log('#### Productos');
    log('- `GET /api/products` - Listar productos');
    log('- `POST /api/products` - Crear producto');
    log('- `GET /api/products/[id]` - Obtener producto');
    log('');

    log('#### Sucursales');
    log('- `GET /api/branches` - Listar sucursales');
    log('- `POST /api/branches` - Crear sucursal');
    log('');

    log('#### Proveedores');
    log('- `GET /api/suppliers` - Listar proveedores');
    log('- `POST /api/suppliers` - Crear proveedor');
    log('');

    // ========================
    // 14. CONCLUSIÓN
    // ========================
    section('📝 Conclusión');

    log('Este reporte proporciona un snapshot completo del estado del sistema POS.');
    log('');
    log('**Para ejecutar tests completos:**');
    log('1. Verificar que el servidor esté corriendo: `npm start`');
    log('2. Utilizar el archivo `test-api.js` para validar endpoints');
    log('3. Crear datos de prueba utilizando los endpoints POST');
    log('4. Validar la integridad de datos verificando referencias cruzadas');
    log('');

    const timestamp = new Date().toISOString();
    log(`---`);
    log(`*Generado automáticamente el ${timestamp}*`);

  } catch (err) {
    log(`\n❌ Error generando reporte: ${err.message}`);
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
generateReport().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
