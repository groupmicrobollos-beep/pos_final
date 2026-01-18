// js/services/budgets.js
import store from "../store.js";

// Helper para convertir la respuesta del backend al formato que espera el frontend (legacy wrapper)
function makeSummary(data) {
  return {
    ...data,
    sucursalNombre: data.branch_id ? labelForBranch(data.branch_id) : (data.sucursal || ""),
    cliente: data.client_name || data.cliente || "Sin nombre",
    // Aseguramos que items y total vengan bien
    items: data.items || [],
    total: data.total || 0,
    numero: data.numero || data.id, // Si el backend no tiene numero secuencial aun
    key: data.id
  };
}

async function list() {
  const quotes = await store.quotes.list();
  return quotes.map(makeSummary);
}

async function get(id) {
  const data = await store.quotes.get(id);
  if (!data) return null;
  return makeSummary(data);
}

async function save(data, key = null, options = {}) {
  // data viene del formulario. Mapear a esquema backend
  const payload = {
    ...data,
    client_name: data.cliente?.nombre || data.cliente,
    client_dni: data.cliente?.dni,
    client_address: data.cliente?.address,
    client_phone: data.cliente?.telefono,
    client_email: data.cliente?.email,
    vehicle: data.cliente?.vehiculo, // Ojo, estructura de cliente
    total: parseFloat(data.total) || 0,
    items: data.items,
    branch_id: data.sucursal,
    siniestro: data.siniestro, // New field support
    signature: data.firmaDataUrl, // New field support
    // si key existe es update
    id: key
  };

  let result;
  if (key && options.update) {
    await store.quotes.update(key, payload);
    result = { id: key };
  } else {
    const res = await store.quotes.create(payload);
    result = res;
  }

  // Dispatch event
  try {
    document.dispatchEvent(new CustomEvent("budgets:updated", {
      detail: { action: key ? "update" : "create", key: result.id }
    }));
  } catch (e) { }

  return result;
}

async function remove(key) {
  await store.quotes.remove(key);
  try { document.dispatchEvent(new CustomEvent("budgets:updated", { detail: { action: "delete", key } })); } catch (e) { }
}

// Helpers visuales (sin cambios de lógica, solo lectura de config)
function labelForBranch(id) {
  // Necesitamos leer de store.branches o localStorage config si está cacheado
  // Por simplicidad, leemos del localStorage que mantiene la configuración
  const branches = JSON.parse(localStorage.getItem("cfg_branches") || "[]");
  const b = branches.find(x => x.id === id);
  if (!b) return String(id || "");
  if (b.code) return b.code;
  const idx = branches.findIndex(x => x.id === id);
  return String(idx >= 0 ? idx + 1 : 0).padStart(4, "0");
}

function formatBudgetNumber(sucursalId, seq) {
  const label = labelForBranch(sucursalId);
  return `N° ${label || "----"} - ${String(seq).padStart(8, "0")}`;
}

async function previewNextNumber(sucursal) {
  // Backend should handle this preferably, but for now we fetch list and count
  const all = await list();
  // Filter by branch? The current backend `list` returns all.
  // Assuming backend returns an array.
  let max = 0;
  all.filter(b => b.branch_id === sucursal || b.sucursal === sucursal).forEach(b => {
    const m = String(b.numero || "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return formatBudgetNumber(sucursal, max + 1);
}

function maxSeqForBranch(sucursal) {
  // Deprecated sync version, kept to avoid immediate crashes if called sync
  // But it won't work correctly without async.
  // Try to rely on previewNextNumber which is async.
  return 0;
}

export default { list, get, save, remove, previewNextNumber, maxSeqForBranch, formatBudgetNumber };

