/**
 * Verificación autónoma de APIs críticas del POS.
 * Ejecutar: node verify_system.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:3000';

const results = [];
let failed = 0;

function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, err) {
  failed++;
  const msg = err?.message || String(err);
  results.push({ ok: false, name, detail: msg });
  console.error(`✗ ${name} — ${msg}`);
}

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const err = new Error(data?.error || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function run() {
  console.log(`\n=== Verificación POS — ${BASE} ===\n`);

  try {
    const health = await api('/health');
    if (health?.status === 'ok') pass('Health check');
    else fail('Health check', new Error(JSON.stringify(health)));
  } catch (e) { fail('Health check', e); return finish(1); }

  try {
    const login = await api('/auth/login', 'POST', {
      identifier: 'admin',
      password: 'admin123',
    });
    if (!login?.user?.id) throw new Error('Login sin usuario');
    pass('Login admin', login.user.username);
  } catch (e) {
    fail('Login admin', e);
  }

  // --- Clientes + vehículos ---
  let clientId, vehicleId;
  try {
    const created = await api('/clients', 'POST', {
      name: `AutoTest ${Date.now()}`,
      phone: '3510000001',
      email: 'autotest@test.com',
      vehicles: [{
        vehiculo: 'Toyota Corolla',
        patente: 'AUT-001',
        modelo: '2020',
        compania: 'TestSeguro',
        chasis: 'CHASIS-AUTO-1',
      }],
    });
    clientId = created.id;
    if (!clientId) throw new Error('Sin id de cliente');
    pass('POST cliente + vehículo (campos ES)', clientId);

    const one = await api(`/clients/${clientId}`);
    const v = (one.vehicles || [])[0];
    if (!v) throw new Error('Sin vehículos');
    if (!v.brand || v.brand !== 'Toyota Corolla') throw new Error(`brand incorrecto: ${v.brand}`);
    if (!v.plate || v.plate !== 'AUT-001') throw new Error(`plate incorrecto: ${v.plate}`);
    if (v.year !== 2020) throw new Error(`year incorrecto: ${v.year}`);
    vehicleId = v.id;
    pass('GET cliente — vehículo persistido y normalizado');

    await api(`/clients/${clientId}`, 'PUT', {
      name: one.name,
      phone: one.phone,
      email: one.email,
      address: 'Calle Test 123',
      vehicles: [{
        id: vehicleId,
        brand: 'Toyota Corolla',
        model: 'XEI',
        year: 2020,
        plate: 'AUT-001',
        vin: 'CHASIS-AUTO-1',
        insurance: 'TestSeguro',
      }],
    });
    const updated = await api(`/clients/${clientId}`);
    if (updated.address !== 'Calle Test 123') throw new Error('address no actualizado');
    if ((updated.vehicles[0].model || '') !== 'XEI') throw new Error('model no actualizado');
    pass('PUT cliente — edición');
  } catch (e) { fail('CRUD clientes/vehículos', e); }

  // --- Usuarios ---
  let userId;
  const uname = `autouser_${Date.now().toString(36).slice(2, 8)}`;
  try {
    const branches = await api('/branches');
    const branchId = branches[0]?.id || null;

    const u = await api('/users', 'POST', {
      username: uname,
      password: 'TestPass123!',
      full_name: 'Usuario Auto Test',
      role: 'ventas',
      email: `${uname}@test.com`,
      active: true,
      branch_id: branchId,
      perms: { quotes: true, pos: true },
    });
    userId = u.id;
    if (!userId) throw new Error('Sin id de usuario');
    pass('POST usuario', uname);

    await api(`/users/${userId}`, 'PUT', {
      full_name: 'Usuario Auto Test Editado',
      branch_id: branchId,
    });
    const users = await api('/users');
    const found = users.find(x => x.id === userId);
    if (!found || found.full_name !== 'Usuario Auto Test Editado') {
      throw new Error('Usuario no actualizado en listado');
    }
    pass('PUT usuario + listado');

    // Rechazo sin contraseña
    try {
      await api('/users', 'POST', { username: `bad_${uname}`, role: 'user' });
      fail('Validación usuario sin password', new Error('Debería fallar'));
    } catch (e) {
      if (e.status === 400) pass('Validación — password requerido en alta');
      else throw e;
    }
  } catch (e) { fail('CRUD usuarios', e); }

  // --- Presupuesto con created_by y total 0 ---
  let quoteId;
  try {
    const branches = await api('/branches');
    const branchId = branches[0]?.id;
    if (!branchId) throw new Error('No hay sucursales — crear una en /api/branches');

    quoteId = `TEST-${Date.now()}`;
    await api('/quotes', 'POST', {
      numero: quoteId,
      id: quoteId,
      client_name: 'Cliente Presupuesto Auto',
      branch_id: branchId,
      sucursal: branchId,
      total: 0,
      siniestro: '',
      created_by: userId || null,
      assignedUser: userId || null,
      items: JSON.stringify([
        { cantidad: 1, descripcion: '[SERVICIO] Item cero', unit: 0, total: 0 },
      ]),
      status: 'pendiente',
    });
    pass('POST presupuesto total 0 + created_by', quoteId);

    const q = await api(`/quotes/${quoteId}`);
    if (Number(q.total) !== 0) throw new Error(`total esperado 0, got ${q.total}`);
    if (userId && q.created_by !== userId) {
      throw new Error(`created_by esperado ${userId}, got ${q.created_by}`);
    }
    pass('GET presupuesto — total 0 y created_by');

    await api(`/quotes/${quoteId}`, 'PUT', {
      total: 1500.5,
      created_by: userId,
      status: 'realizado',
      items: [{ cantidad: 1, descripcion: 'Item', unit: 1500.5, total: 1500.5 }],
    });
    const q2 = await api(`/quotes/${quoteId}`);
    if (Number(q2.total) !== 1500.5) throw new Error('PUT total falló');
    pass('PUT presupuesto');
  } catch (e) { fail('CRUD presupuestos', e); }

  // --- Inventario (productos) ---
  let productId = null;
  try {
    productId = `prod_test_${Date.now()}`;
    const created = await api('/products', 'POST', {
      id: productId,
      name: 'Insumo Test',
      code: 'TST01',
      category: 'Prueba',
      unit: 'u',
      cost: 0,
      stock: 5,
      min: 2,
    });
    if (!created.id) throw new Error('Sin id de producto');
    pass('POST producto inventario', productId);

    const list = await api('/products');
    const found = list.find(p => p.id === productId);
    if (!found || found.name !== 'Insumo Test') throw new Error('Producto no en listado');
    pass('GET productos — insumo visible');

    await api(`/products/${productId}`, 'PUT', { name: 'Insumo Test Editado', stock: 10, min: 3, unit: 'u', cost: 15.5 });
    const one = await api(`/products/${productId}`);
    if (Number(one.stock) !== 10) throw new Error('Stock no actualizado');
    pass('PUT producto — edición stock');
  } catch (e) { fail('Inventario productos', e); }

  // --- Limpieza ---
  try {
    if (quoteId) await api(`/quotes/${quoteId}`, 'DELETE');
    if (clientId) await api(`/clients/${clientId}`, 'DELETE');
    if (userId) await api(`/users/${userId}`, 'DELETE');
    if (productId) await api(`/products/${productId}`, 'DELETE');
    pass('Limpieza datos de prueba');
  } catch (e) {
    console.warn('⚠ Limpieza parcial:', e.message);
  }

  return finish(failed);
}

function finish(exitCode) {
  const ok = results.filter(r => r.ok).length;
  const bad = results.filter(r => !r.ok).length;
  console.log(`\n=== Resumen: ${ok} OK, ${bad} fallos ===\n`);
  process.exit(exitCode > 0 ? 1 : bad > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
