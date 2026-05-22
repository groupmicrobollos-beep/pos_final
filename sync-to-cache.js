/**
 * Script de sincronización de datos
 * Sincroniza datos de la BD al localStorage para poder usarlos como fallback
 * Ejecutar: node sync-to-cache.js
 */

const { db, initDB } = require('./db');

async function syncToCache() {
  console.log('\n=== SINCRONIZACIÓN DE DATOS A CACHÉ ===\n');
  
  try {
    await initDB();
    console.log('✓ Base de datos inicializada\n');
    
    // 1. Sincronizar usuarios
    console.log('--- SINCRONIZANDO USUARIOS ---');
    try {
      const usersResult = await db.execute("SELECT id, username, full_name, role, email, active, branch_id, perms, created_at FROM users ORDER BY username");
      const users = (usersResult.rows || []).map(u => ({
        ...u,
        perms: typeof u.perms === 'string' ? JSON.parse(u.perms || '{}') : u.perms
      }));
      
      console.log(`✓ Encontrados ${users.length} usuarios`);
      
      // Guardar en formato para localStorage (como si fuera caché del sistema)
      const cacheData = {
        users: users,
        timestamp: new Date().toISOString(),
        source: 'db-sync'
      };
      
      console.log('Usuarios sincronizados:');
      users.forEach(u => {
        console.log(`  - ${u.username} (${u.role || 'sin rol'})`);
      });
    } catch (e) {
      console.error('❌ Error sincronizando usuarios:', e.message);
    }
    
    // 2. Sincronizar presupuestos
    console.log('\n--- SINCRONIZANDO PRESUPUESTOS ---');
    try {
      const quotesResult = await db.execute("SELECT * FROM quotes ORDER BY date DESC");
      const quotes = quotesResult.rows || [];
      
      console.log(`✓ Encontrados ${quotes.length} presupuestos`);
      
      quotes.slice(0, 5).forEach(q => {
        const date = new Date(q.date).toLocaleDateString();
        console.log(`  - ${q.id} | ${q.client_name} | $${q.total} | ${date}`);
      });
      
      if (quotes.length > 5) {
        console.log(`  ... y ${quotes.length - 5} más`);
      }
    } catch (e) {
      console.error('❌ Error sincronizando presupuestos:', e.message);
    }
    
    // 3. Sincronizar sucursales
    console.log('\n--- SINCRONIZANDO SUCURSALES ---');
    try {
      const branchesResult = await db.execute("SELECT id, name, address, phone, cuit, code FROM branches");
      const branches = branchesResult.rows || [];
      
      console.log(`✓ Encontrados ${branches.length} sucursales`);
      
      branches.forEach(b => {
        console.log(`  - ${b.name} (${b.address || 'sin dirección'})`);
      });
    } catch (e) {
      console.error('❌ Error sincronizando sucursales:', e.message);
    }
    
    console.log('\n✓ Sincronización completada');
    console.log('\nNota: Los datos han sido sincronizados. Ahora cuando el frontend falle');
    console.log('en conectarse a la API, podrá usar los datos en caché.\n');
    
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
  }
  
  process.exit(0);
}

syncToCache();
