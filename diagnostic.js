/**
 * Script de diagnóstico para problemas de usuarios y presupuestos
 * Ejecutar: node diagnostic.js
 */

const { db, initDB } = require('./db');

async function diagnose() {
  console.log('\n=== DIAGNÓSTICO DEL SISTEMA POS ===\n');
  
  try {
    await initDB();
    console.log('✓ Base de datos inicializada\n');
    
    // 1. Verificar tabla de usuarios
    console.log('--- USUARIOS ---');
    try {
      const userCountResult = await db.execute("SELECT COUNT(*) as count FROM users");
      const userCount = userCountResult.rows[0]?.count || 0;
      console.log(`Total de usuarios: ${userCount}`);
      
      if (userCount > 0) {
        const usersResult = await db.execute("SELECT id, username, role, email, active FROM users");
        console.log('Usuarios encontrados:');
        usersResult.rows.forEach(u => {
          console.log(`  - ${u.username} (${u.role}) - ${u.email || 'sin email'} - ${u.active ? 'activo' : 'inactivo'}`);
        });
      } else {
        console.log('⚠️  NO HAY USUARIOS EN LA BD');
      }
    } catch (e) {
      console.error('❌ Error consultando usuarios:', e.message);
    }
    
    // 2. Verificar tabla de presupuestos
    console.log('\n--- PRESUPUESTOS ---');
    try {
      const quoteCountResult = await db.execute("SELECT COUNT(*) as count FROM quotes");
      const quoteCount = quoteCountResult.rows[0]?.count || 0;
      console.log(`Total de presupuestos: ${quoteCount}`);
      
      if (quoteCount > 0) {
        const quotesResult = await db.execute("SELECT id, client_name, total, status, date FROM quotes ORDER BY date DESC LIMIT 5");
        console.log('Presupuestos encontrados (últimos 5):');
        quotesResult.rows.forEach(q => {
          const date = new Date(q.date).toLocaleDateString();
          console.log(`  - ${q.id} | ${q.client_name} | $${q.total} | ${q.status} | ${date}`);
        });
      } else {
        console.log('⚠️  NO HAY PRESUPUESTOS EN LA BD');
      }
    } catch (e) {
      console.error('❌ Error consultando presupuestos:', e.message);
    }
    
    // 3. Verificar tabla de sucursales
    console.log('\n--- SUCURSALES ---');
    try {
      const branchCountResult = await db.execute("SELECT COUNT(*) as count FROM branches");
      const branchCount = branchCountResult.rows[0]?.count || 0;
      console.log(`Total de sucursales: ${branchCount}`);
      
      if (branchCount > 0) {
        const branchesResult = await db.execute("SELECT id, name, address FROM branches");
        console.log('Sucursales encontradas:');
        branchesResult.rows.forEach(b => {
          console.log(`  - ${b.name} (${b.address || 'sin dirección'})`);
        });
      }
    } catch (e) {
      console.error('❌ Error consultando sucursales:', e.message);
    }
    
    // 4. Verificar tabla de clientes
    console.log('\n--- CLIENTES ---');
    try {
      const clientCountResult = await db.execute("SELECT COUNT(*) as count FROM clients");
      const clientCount = clientCountResult.rows[0]?.count || 0;
      console.log(`Total de clientes: ${clientCount}`);
      
      if (clientCount > 0) {
        const clientsResult = await db.execute("SELECT id, name, phone, email FROM clients LIMIT 3");
        console.log('Clientes encontrados:');
        clientsResult.rows.forEach(c => {
          console.log(`  - ${c.name} (${c.phone || c.email || 'sin contacto'})`);
        });
      }
    } catch (e) {
      console.error('❌ Error consultando clientes:', e.message);
    }
    
    console.log('\n=== FIN DEL DIAGNÓSTICO ===\n');
    
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
  }
  
  process.exit(0);
}

diagnose();
