/**
 * Script de prueba de API
 * Simula las peticiones del frontend para verificar que todo funciona
 * Ejecutar: node test-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    opts.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(`${BASE_URL}/api${path}`, opts);
    const text = await res.text();
    
    if (!res.ok) {
      console.error(`❌ ${method} ${path} - Status ${res.status}`);
      console.error(`   Response: ${text.substring(0, 200)}`);
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch {
      console.error(`❌ ${method} ${path} - Invalid JSON response`);
      return null;
    }
  } catch (err) {
    console.error(`❌ ${method} ${path} - ${err.message}`);
    return null;
  }
}

async function test() {
  console.log(`\n=== PRUEBA DE API (${BASE_URL}) ===\n`);
  
  // 1. Health check
  console.log('1. Verificando salud del servidor...');
  let health = await api('/health');
  if (health) {
    console.log(`   ✓ Servidor OK`);
    console.log(`   Database: ${health.database?.status || 'unknown'}`);
    console.log(`   Turso: ${health.database?.tursoEnabled ? 'Habilitado' : 'Deshabilitado (usando local)'}`);
  } else {
    console.log('   ❌ Servidor NO responde');
    return;
  }
  
  // 2. Obtener usuarios
  console.log('\n2. Obteniendo usuarios...');
  let users = await api('/users');
  if (users) {
    console.log(`   ✓ ${users.length} usuarios encontrados`);
    users.slice(0, 3).forEach(u => {
      console.log(`     - ${u.username} (${u.role})`);
    });
  } else {
    console.log('   ❌ Error al obtener usuarios');
  }
  
  // 3. Obtener presupuestos
  console.log('\n3. Obteniendo presupuestos...');
  let quotes = await api('/quotes');
  if (quotes) {
    console.log(`   ✓ ${quotes.length} presupuestos encontrados`);
    quotes.slice(0, 3).forEach(q => {
      console.log(`     - ${q.id} | ${q.client_name} | $${q.total}`);
    });
  } else {
    console.log('   ❌ Error al obtener presupuestos');
  }
  
  // 4. Obtener sucursales
  console.log('\n4. Obteniendo sucursales...');
  let branches = await api('/branches');
  if (branches) {
    console.log(`   ✓ ${branches.length} sucursales encontradas`);
    branches.forEach(b => {
      console.log(`     - ${b.name}`);
    });
  } else {
    console.log('   ❌ Error al obtener sucursales');
  }
  
  // 5. Obtener clientes
  console.log('\n5. Obteniendo clientes...');
  let clients = await api('/clients');
  if (clients) {
    console.log(`   ✓ ${clients.length} clientes encontrados`);
    clients.slice(0, 3).forEach(c => {
      console.log(`     - ${c.name} (${c.phone})`);
    });
  } else {
    console.log('   ❌ Error al obtener clientes');
  }
  
  console.log('\n=== FIN DE PRUEBAS ===\n');
}

// Verificar que hay un servidor ejecutándose
console.log('Esperando a que el servidor esté disponible...');

const checkServer = setInterval(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) {
      clearInterval(checkServer);
      test().catch(console.error);
    }
  } catch (err) {
    // Ignorar, seguir esperando
  }
}, 1000);

// Timeout después de 10 segundos
setTimeout(() => {
  clearInterval(checkServer);
  console.error('❌ Servidor no responde después de 10 segundos');
  console.error(`   ¿Está ejecutándose en ${BASE_URL}?`);
  process.exit(1);
}, 10000);
