// js/services/budgets.js
import store from "../store.js";

// Helper para convertir la respuesta del backend al formato que espera el frontend (legacy wrapper)
function makeSummary(data) {
  return {
    ...data,
    sucursalNombre: data.branch_id ? labelForBranch(data.branch_id) : (data.sucursal || ""),
    // Map flattened DB columns to nested object for Frontend
    cliente: {
      nombre: data.client_name || data.cliente || "Sin nombre",
      telefono: data.client_phone,
      email: data.client_email,
      address: data.client_address,
      vehiculo: data.vehicle
    },
    siniestro: data.siniestro,
    items: data.items || [],
    total: data.total || 0,
    numero: data.numero || data.id,
    key: data.id,
    fecha: data.date || data.fecha || new Date().toISOString(),
    sucursal: data.branch_id || data.sucursal,
    estado: data.status || data.estado,
    done: data.status === "realizado" || data.done // Map status to done boolean if needed, or keep separate
  };
}

async function list() {
  const [quotes, clients] = await Promise.all([
    store.quotes.list(),
    store.clients.list().catch(() => []) // fail safe
  ]);

  return quotes.map(q => {
    const summary = makeSummary(q);
    // Enrich with client data if available
    const cName = (summary.cliente?.nombre || summary.cliente || "").toLowerCase();
    const clientMatch = clients.find(c => c.name.toLowerCase() === cName);

    if (clientMatch) {
      // If we found the client, try to match the vehicle or default to first
      const vName = (summary.cliente?.vehiculo || "").toLowerCase();
      // Try to find a vehicle in client's list that includes the stored vehicle string or vice versa
      const vMatch = (clientMatch.vehicles || []).find(v =>
        (v.brand?.toLowerCase() || "").includes(vName) ||
        (v.vehiculo?.toLowerCase() || "").includes(vName) ||
        vName.includes((v.brand || "").toLowerCase())
      ) || clientMatch.vehicles?.[0];

      if (vMatch) {
        if (typeof summary.cliente === "object") {
          summary.cliente.patente = vMatch.plate || vMatch.patente || summary.cliente.patente;
          summary.cliente.modelo = vMatch.model || vMatch.modelo || summary.cliente.modelo;
          summary.cliente.compania = vMatch.insurance || vMatch.compania || summary.cliente.compania;
          // Si el nombre del vehiculo en budget es muy generico, quizás podríamos enriquecerlo, pero mejor respetar lo guardado.
        }
      }
    }
    return summary;
  });
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
    // Sync status/done
    status: (data.status === "realizado" || data.done === true || data.done === 1) ? "realizado" : (data.status || "pendiente"),
    done: (data.status === "realizado" || data.done === true || data.done === 1) ? true : false,
    // si key existe es update
    id: key
  };

  let result;
  // If a key is provided, perform an update. Previously this required options.update=true
  // which caused edits to create duplicate budgets instead of updating. Use key presence
  // as the signal to update by default.
  if (key) {
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
// Helpers visuales (sin cambios de lógica, solo lectura de config)
function labelForBranch(id) {
  // Necesitamos leer de store.branches o localStorage config si está cacheado
  const branches = JSON.parse(localStorage.getItem("cfg_branches") || "[]");
  const b = branches.find(x => x.id === id);
  // Prioridad: 
  // 1. b.code (si es numérico, usarlo como POS de 4 dígitos)
  // 2. Index+1 (si no hay code, usar índice como POS)
  // 3. Fallback a '0001' (nunca ID)

  if (b && b.code) {
    const clean = b.code.replace(/\D/g, ''); // Solo números
    if (clean.length > 0) return clean.padStart(4, "0").slice(-4);
  }

  const idx = branches.findIndex(x => x.id === id);
  if (idx >= 0) return String(idx + 1).padStart(4, "0");

  return "0001";
}

function formatBudgetNumber(sucursalId, seq) {
  const label = labelForBranch(sucursalId);
  // Formato estricto: 0001-00000001
  return `${label}-${String(seq).padStart(8, "0")}`;
}

async function previewNextNumber(sucursal) {
  // Backend should handle this preferably, but for now we fetch list and count
  const all = await list();

  let max = 0;
  // Extraer secuencia numérica de los presupuestos existentes
  all.filter(b => b.branch_id === sucursal || b.sucursal === sucursal).forEach(b => {
    // Intentar extraer la parte derecha del guión (xxxx-SSSSSS)
    // O si es formato viejo "N° xxxx - SSSSSS"
    const parsed = String(b.numero || "");
    let seqPart = "0";

    if (parsed.includes("-")) {
      const parts = parsed.split("-");
      seqPart = parts[parts.length - 1]; // Tomar el último segmento
    } else {
      // Fallback regex
      const m = parsed.match(/(\d+)\s*$/);
      if (m) seqPart = m[1];
    }

    // Limpiar y parsear
    const seqNum = parseInt(seqPart.replace(/\D/g, ''), 10);
    if (!isNaN(seqNum)) max = Math.max(max, seqNum);
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

