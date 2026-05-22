// js/services/budgets.js
import store from "../store.js";

function labelForBranch(id, branches) {
  const list = branches || JSON.parse(localStorage.getItem("cfg_branches") || "[]");
  const b = list.find(x => x.id === id);
  if (b && b.code) {
    const clean = String(b.code).replace(/\D/g, '');
    if (clean.length > 0) return clean.padStart(4, "0").slice(-4);
  }
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) return String(idx + 1).padStart(4, "0");
  return "0001";
}

function resolveUserName(userId, users) {
  if (!userId) return null;
  const u = (users || []).find(x => x.id === userId);
  return u ? (u.full_name || u.username) : userId;
}

function makeSummary(data, users = [], branches = []) {
  const createdBy = data.created_by || data.assignedUser || null;
  const fecha = (data.date || data.fecha || "").toString().slice(0, 10);
  const status = data.status || data.estado || "pendiente";
  const done = status === "realizado" || data.done === true || data.done === 1;

  return {
    ...data,
    sucursalNombre: data.branch_id ? labelForBranch(data.branch_id, branches) : (data.sucursalNombre || ""),
    cliente: {
      nombre: data.client_name || data.cliente?.nombre || data.cliente || "Sin nombre",
      telefono: data.client_phone || data.cliente?.telefono,
      email: data.client_email || data.cliente?.email,
      address: data.client_address || data.cliente?.address,
      vehiculo: data.vehicle || data.cliente?.vehiculo,
      dni: data.client_dni || data.cliente?.dni,
    },
    siniestro: data.siniestro,
    items: data.items || [],
    total: Number(data.total) || 0,
    numero: data.numero || data.id,
    key: data.id,
    fecha,
    sucursal: data.branch_id || data.sucursal,
    estado: status,
    done,
    assignedUser: createdBy,
    assignedUserName: resolveUserName(createdBy, users),
    created_by: createdBy,
  };
}

async function list() {
  console.log('[budgetsService.list] Starting...');
  
  try {
    const [quotes, clients, users, branches] = await Promise.all([
      store.quotes.list().catch(err => {
        console.error('[budgetsService.list] Error loading quotes:', err.message);
        return [];
      }),
      store.clients.list().catch(err => {
        console.error('[budgetsService.list] Error loading clients:', err.message);
        return [];
      }),
      store.users.list().catch(err => {
        console.error('[budgetsService.list] Error loading users:', err.message);
        return [];
      }),
      store.branches.list().catch(err => {
        console.error('[budgetsService.list] Error loading branches:', err.message);
        return [];
      }),
    ]);

    // Store successful data in cache
    if (branches.length) {
      try { localStorage.setItem("cfg_branches", JSON.stringify(branches)); } catch { /* ignore */ }
    }
    if (users.length) {
      try { localStorage.setItem("cfg_users", JSON.stringify(users)); } catch { /* ignore */ }
    }

    console.log(`[budgetsService.list] Loaded: ${quotes.length} quotes, ${clients.length} clients, ${users.length} users, ${branches.length} branches`);

    // If we got no quotes but have cached data, try to use that
    if (!quotes || quotes.length === 0) {
      console.warn('[budgetsService.list] No quotes returned from API, checking for cached data...');
      try {
        const cached = JSON.parse(localStorage.getItem("budgets_list") || "[]");
        if (cached && cached.length > 0) {
          console.log(`[budgetsService.list] Found ${cached.length} cached quotes, using those`);
          quotes = cached;
        }
      } catch (e) {
        console.error('[budgetsService.list] Error loading cached quotes:', e.message);
      }
    }

    return (quotes || []).map(q => {
      const summary = makeSummary(q, users, branches);
      const cName = (summary.cliente?.nombre || "").toLowerCase();
      const clientMatch = clients.find(c => (c.name || "").toLowerCase() === cName);

      if (clientMatch) {
        const vName = (summary.cliente?.vehiculo || "").toLowerCase();
        const vMatch = (clientMatch.vehicles || []).find(v =>
          (v.brand || "").toLowerCase().includes(vName) ||
          (v.vehiculo || "").toLowerCase().includes(vName) ||
          vName.includes((v.brand || "").toLowerCase())
        ) || clientMatch.vehicles?.[0];

        if (vMatch && typeof summary.cliente === "object") {
          summary.cliente.patente = vMatch.plate || vMatch.patente || summary.cliente.patente;
          summary.cliente.modelo = vMatch.year || vMatch.model || vMatch.modelo || summary.cliente.modelo;
          summary.cliente.compania = vMatch.insurance || vMatch.compania || summary.cliente.compania;
        }
      }
      return summary;
    });
  } catch (err) {
    console.error('[budgetsService.list] Fatal error:', err.message);
    return [];
  }
}

async function get(id) {
  const [data, users, branches] = await Promise.all([
    store.quotes.get(id),
    store.users.list().catch(() => []),
    store.branches.list().catch(() => []),
  ]);
  if (!data) return null;
  return makeSummary(data, users, branches);
}

async function save(data, key = null) {
  const payload = {
    ...data,
    client_name: data.cliente?.nombre || data.cliente,
    client_dni: data.cliente?.dni,
    client_address: data.cliente?.address,
    client_phone: data.cliente?.telefono,
    client_email: data.cliente?.email,
    vehicle: data.cliente?.vehiculo,
    total: parseFloat(data.total) || 0,
    items: data.items,
    branch_id: data.sucursal,
    siniestro: data.siniestro,
    signature: data.firmaDataUrl,
    created_by: data.assignedUser || data.created_by || null,
    status: (data.status === "realizado" || data.done === true || data.done === 1) ? "realizado" : (data.status || "pendiente"),
    done: (data.status === "realizado" || data.done === true || data.done === 1),
    id: key,
    numero: data.numero,
    fecha: data.fecha,
    vat_policy: data.vatPolicy || data.vat_policy || "all",
  };

  let result;
  if (key) {
    await store.quotes.update(key, payload);
    result = { id: key };
  } else {
    const res = await store.quotes.create(payload);
    result = res;
  }

  try {
    document.dispatchEvent(new CustomEvent("budgets:updated", {
      detail: { action: key ? "update" : "create", key: result.id }
    }));
  } catch (e) { /* ignore */ }

  return result;
}

async function remove(key) {
  await store.quotes.remove(key);
  try {
    document.dispatchEvent(new CustomEvent("budgets:updated", { detail: { action: "delete", key } }));
  } catch (e) { /* ignore */ }
}

function formatBudgetNumber(sucursalId, seq, branches) {
  const label = labelForBranch(sucursalId, branches);
  return `${label}-${String(seq).padStart(8, "0")}`;
}

async function previewNextNumber(sucursal) {
  const [all, branches] = await Promise.all([
    list(),
    store.branches.list().catch(() => []),
  ]);

  let max = 0;
  all.filter(b => b.branch_id === sucursal || b.sucursal === sucursal).forEach(b => {
    const parsed = String(b.numero || "");
    let seqPart = "0";
    if (parsed.includes("-")) {
      const parts = parsed.split("-");
      seqPart = parts[parts.length - 1];
    } else {
      const m = parsed.match(/(\d+)\s*$/);
      if (m) seqPart = m[1];
    }
    const seqNum = parseInt(String(seqPart).replace(/\D/g, ''), 10);
    if (!isNaN(seqNum)) max = Math.max(max, seqNum);
  });

  return formatBudgetNumber(sucursal, max + 1, branches);
}

function maxSeqForBranch() {
  return 0;
}

export default { list, get, save, remove, previewNextNumber, maxSeqForBranch, formatBudgetNumber };
