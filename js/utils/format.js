/**
 * Utilidades de formato numérico y normalización de vehículos.
 */

/** Parsea montos desde texto de celda/UI (incluye "-" como 0). */
export function parseAmount(text) {
  if (text === "-" || text === "—") return 0;
  if (typeof text === "number") return isNaN(text) ? 0 : text;
  const t = String(text || "0")
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}(?:[^\d]|$))/g, "")
    .replace(",", ".");
  const v = parseFloat(t);
  return isNaN(v) ? 0 : v;
}

/** Muestra "-" si el valor es 0; si no, usa formatMoney. */
export function displayAmount(value, formatMoney) {
  const n = Number(value);
  if (!n && n !== 0) return "-";
  if (n === 0) return "-";
  return formatMoney(n);
}

/** Unifica campos ES/EN de vehículo para la API. */
export function normalizeVehicle(v = {}) {
  const yearRaw = v.year ?? v.modelo;
  const yearNum = yearRaw !== undefined && yearRaw !== "" && yearRaw !== null
    ? parseInt(String(yearRaw), 10)
    : null;
  return {
    id: v.id || undefined,
    brand: (v.brand || v.vehiculo || "").trim() || null,
    model: (v.model || "").trim() || null,
    year: Number.isFinite(yearNum) ? yearNum : null,
    plate: (v.plate || v.patente || "").trim() || null,
    vin: (v.vin || v.chasis || "").trim() || null,
    insurance: (v.insurance || v.compania || "").trim() || null,
  };
}

export function normalizeVehiclesList(vehicles) {
  if (!Array.isArray(vehicles)) return [];
  return vehicles.map(normalizeVehicle);
}
