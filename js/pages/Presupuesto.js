// frontend/js/pages/Presupuesto.js
// SPA Vanilla + Tailwind — Módulo Presupuesto (completo) INTEGRADO con Configuración
// - Sucursales y Ajustes (moneda/locale/decimales/datos empresa) se leen de cfg_* y reaccionan a eventos cfg:*
// - Selects legibles al desplegar (opciones con fondo oscuro y texto claro) + z-index alto
// - Eliminar Vehículo / Eliminar Cliente con modales y confirmación
// - Otros Trabajos + Repuestos (UX anterior), con servicios personalizados (usar/editar/eliminar)
// - Clientes persistentes (localStorage) + múltiples vehículos
// - Totales live, firma digital, guardar presupuesto
// - Generación de PDF integrada (jsPDF + autoTable on-demand)

// === Vínculo con Configuración (snapshot inicial) ===
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(d)); } catch { return d; } };

let CFG_SETTINGS = (window.CFG?.getSettings?.() || ls("cfg_settings", {}));
let CFG_BRANCHES = (window.CFG?.getBranches?.() || ls("cfg_branches", []));

// moneda/locale/decimales dinámicos desde Ajustes
let CURRENCY = CFG_SETTINGS?.currency || "ARS";
let LOCALE = CFG_SETTINGS?.locale || "es-AR";
let DECIMALS = Number.isInteger(CFG_SETTINGS?.decimals) ? CFG_SETTINGS.decimals : 2;

const money = (n) => (Number(n) || 0).toLocaleString(LOCALE, {
  style: "currency", currency: CURRENCY,
  minimumFractionDigits: DECIMALS, maximumFractionDigits: DECIMALS
});

// Clients DB replaced by store


const todayISO = () => new Date().toISOString().split("T")[0];
const sanitizeKey = (s) => String(s).replace(/[^\w\d]/g, "_");
const rid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function toast(msg, type = "info") {
  const bg = type === "error" ? "bg-rose-600" : type === "success" ? "bg-emerald-600" : "bg-sky-700";
  const el = document.createElement("div");
  el.className = `fixed top-4 right-4 z-[4000] px-4 py-3 rounded-xl text-white shadow-2xl ${bg}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(12px)";
    setTimeout(() => el.remove(), 180);
  }, 2400);
}

import store from "../store.js";
import budgetsService from "../services/budgets.js";

function setupCanvas(ctx) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
}

// Clientes (persistencia) -> Ahora usa store.clients


// (PDF generation logic removed to fix conflict with services/pdf-generator.js)
// Now using the shared service directly via window.generateBudgetPDF

export default {
  render() {
    return /*html*/ `
      <section data-page="budget" class="space-y-4">
        <!-- Estilado local para selects en glassmorphism -->
        <style>
          /* Fix específico para opciones de select en modo oscuro/glass */
          [data-page="budget"] select option {
             background-color: var(--color-bg-card);
             color: var(--color-text);
          }
          /* Placeholder de firma */
          .signature-placeholder { pointer-events: none; margin-top: -50px; position: relative; z-index: 10; }
        </style>

        <h1 class="text-2xl font-semibold text-main">Presupuesto</h1>

        <!-- Información del Presupuesto -->
        <div class="glass rounded-xl p-4 space-y-3">
          <div class="font-medium text-main">Información del Presupuesto</div>
          <div class="grid md:grid-cols-3 gap-3 budget-info-row">
            <label class="text-sm relative z-50 overflow-visible">
              <span class="block mb-1 text-muted-custom">Sucursal:</span>
              <select id="sucursal"
                class="w-full h-10 px-3 rounded surface text-main border border-white/10
                       focus:outline-none focus:ring focus:ring-indigo-500/40">
                <option value="">Seleccionar sucursal...</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Usuario responsable:</span>
              <select id="budget-user" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                <option value="">(Asignar usuario)</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Estado:</span>
              <select id="budget-status" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                <option value="pendiente">Pendiente (solo presupuesto)</option>
                <option value="realizado">Realizado (vehículo llevado)</option>
              </select>
            </label>
            <label class="text-sm flex items-center gap-2">
              <input id="budget-done" type="checkbox" class="h-4 w-4 rounded accent-emerald-500" />
              <span class="block mb-1 text-muted-custom">Hecho</span>
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Número de Presupuesto:</span>
              <input id="budget-number" type="text" readonly placeholder="Selecciona una sucursal"
                class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Fecha:</span>
              <input id="budget-date" type="date" readonly class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
            </label>
          </div>
        </div>

        <!-- Datos del Cliente -->
        <div class="glass rounded-xl p-4 space-y-5">
          <div class="font-medium text-main">Datos del Cliente</div>

          <div class="grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <label class="text-sm relative z-40">
              <span class="block mb-1 text-muted-custom">Cliente Existente:</span>
              <select id="existing-client" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                <option value="">Seleccionar cliente existente...</option>
              </select>
            </label>
              <div class="flex gap-2">
              <button id="new-client-btn" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-user-tie" aria-hidden="true"></i> Nuevo Cliente</button>
              <button id="delete-client-btn" class="px-3 py-2 rounded bg-rose-700/80 hover:bg-rose-700 disabled:opacity-40"><i class="fas fa-trash" aria-hidden="true"></i> Eliminar Cliente</button>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-3">
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Nombre o Razón Social *</span>
              <input id="nombre" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Teléfono *</span>
              <input id="telefono" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
            </label>
            <label class="text-sm">
              <span class="block mb-1 text-muted-custom">Email</span>
              <input id="email" type="email" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" placeholder="cliente@email.com" />
            </label>
          </div>

          <!-- Bloque: vehículos del cliente -->
          <div id="client-vehicles-block" class="hidden">
            <div class="font-medium mt-3 mb-2 text-main">Vehículos del cliente</div>
            <div class="flex flex-wrap gap-2 items-end">
              <label class="text-sm flex-1 min-w-[240px] relative z-40">
                <span class="block mb-1 text-muted-custom">Seleccionar vehículo</span>
                <select id="client-vehicle" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                  <option value="">(Sin seleccionar)</option>
                </select>
              </label>
              <button id="add-vehicle-btn" class="px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600"><i class="fas fa-car-side" aria-hidden="true"></i> Añadir vehículo</button>
              <button id="delete-vehicle-btn" class="px-3 py-2 rounded bg-rose-700/80 hover:bg-rose-700 disabled:opacity-40" disabled><i class="fas fa-trash" aria-hidden="true"></i> Eliminar vehículo</button>
            </div>
            <div class="text-xs text-muted-custom mt-1" id="vehicle-hint">Seleccioná un vehículo para rellenar el formulario de abajo, o usá “+ Añadir vehículo”.</div>
          </div>

          <!-- Información del Vehículo (form de edición / creación) -->
          <div class="space-y-3 mt-2">
            <div class="font-medium text-main">Información del Vehículo</div>
            <div class="grid md:grid-cols-2 gap-3">
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Vehículo *</span>
                <input id="vehiculo" placeholder="Marca y Modelo (ej: Fiat Palio)" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
              </label>
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Patente *</span>
                <input id="patente" placeholder="Patente (ej: AAA111)" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
              </label>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Año del Modelo</span>
                <input id="modelo" type="number" min="1900" max="2030" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
              </label>
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Compañía de Seguro</span>
                <input id="compania" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
              </label>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Número de Chasis</span>
                <input id="chasis" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" />
              </label>
              <label class="text-sm">
                <span class="block mb-1 text-muted-custom">Nro. Siniestro</span>
                <input id="siniestro-input" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" placeholder="Opcional" />
              </label>
            </div>

            <div class="flex flex-wrap gap-2">
              <button id="save-client-btn" class="px-3 py-2 rounded bg-indigo-600/80 hover:bg-indigo-600"><i class="fas fa-save" aria-hidden="true"></i> Guardar Cliente</button>
            </div>
          </div>
        </div>

        <!-- Tabla de Items -->
        <div class="glass rounded-xl p-4 space-y-3">
          <div class="flex justify-between items-center">
             <div class="font-medium">Ítems</div>
             <div class="text-xs text-slate-400 md:hidden">(Deslizar <i class="fas fa-arrows-alt-h"></i>)</div>
          </div>
          <div class="overflow-x-auto rounded-lg border border-white/10">
            <table class="w-full text-sm whitespace-nowrap">
              <thead class="bg-white/5">
                <tr>
                  <th class="text-left px-3 py-2 w-20">Cantidad</th>
                  <th class="text-left px-3 py-2">Descripción</th>
                  <th class="text-left px-3 py-2 w-40">Precio Unitario</th>
                  <th class="text-left px-3 py-2 w-40">Total</th>
                  <th class="text-left px-3 py-2 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody id="budget-items"></tbody>
            </table>
          </div>

            <div class="flex flex-wrap gap-2 items-center">
            <button id="add-item" class="px-3 py-2 rounded bg-amber-600/80 hover:bg-amber-600"><i class="fas fa-plus-circle" aria-hidden="true"></i> Añadir ítem</button>
            <button id="other-services" class="px-3 py-2 rounded bg-orange-500/80 hover:bg-orange-500"><i class="fas fa-tools" aria-hidden="true"></i> Otros Trabajos</button>
            <button id="parts-manager" class="px-3 py-2 rounded bg-cyan-600/80 hover:bg-cyan-600"><i class="fas fa-cogs" aria-hidden="true"></i> Repuestos</button>
            <span class="ml-auto text-sm">
              Subtotal: <span id="subtotal">$0.00</span> &nbsp;&nbsp;
              IVA (<input id="tax-rate" type="number" min="0" max="100" step="0.1" value="21" style="width:56px; display:inline-block; vertical-align:middle;">%) 
              <select id="vat-policy" class="bg-slate-900 border border-white/10 rounded px-1 ml-1 text-xs text-slate-300 h-6">
                <option value="all">Todo</option>
                <option value="services">Solo Serv.</option>
                <option value="parts">Solo Rep.</option>
              </select> : <span id="tax-amount">$0.00</span> &nbsp;&nbsp;
              <strong>Total (con IVA): <span id="total">$0.00</span></strong>
            </span>
          </div>

          <div class="flex flex-wrap gap-2 justify-end">
            <button id="signature-btn" class="px-3 py-2 rounded bg-sky-700/80 hover:bg-sky-700"><i class="fas fa-pen" aria-hidden="true"></i> Firma</button>
            <button id="save-budget" class="px-3 py-2 rounded bg-green-600/80 hover:bg-green-600"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
            <button id="download-pdf-direct" class="px-3 py-2 rounded bg-rose-600/80 hover:bg-rose-600"><i class="fas fa-file-pdf" aria-hidden="true"></i> PDF</button>
            <button id="share-wa" class="px-3 py-2 rounded bg-emerald-500/80 hover:bg-emerald-500 flex items-center gap-2" title="Compartir WhatsApp">
              <i class="fab fa-whatsapp" aria-hidden="true"></i> <span>WhatsApp</span>
            </button>
            <button id="share-mail" class="px-3 py-2 rounded bg-blue-500/80 hover:bg-blue-500 flex items-center gap-2" title="Compartir Mail">
              <i class="fas fa-envelope" aria-hidden="true"></i> <span>Email</span>
            </button>
          </div>
        </div>

        <!-- Sección de impresión (firma/fecha) -->
        <div class="print-only hidden">
          <div class="signature-section flex items-center gap-6">
            <div>
              <canvas id="signature-canvas" width="300" height="100" class="bg-white rounded"></canvas>
              <div class="text-center text-xs text-slate-400 signature-placeholder">Firma Digital</div>
            </div>
            <div class="text-sm">
              <p><strong>Fecha de emisión:</strong> <span id="print-date"></span></p>
              <p><strong>Válido por:</strong> 30 días</p>
            </div>
          </div>
        </div>

        <!-- Modal: Añadir Item -->
        <div id="add-item-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60 p-4">
          <div class="surface rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 shadow-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-main"><i class="fas fa-plus" aria-hidden="true"></i> Añadir Nuevo Ítem</h2>
              <button class="close-modal px-2 py-1 rounded hover:bg-white/10 text-main"><i class="fas fa-times" aria-hidden="true"></i></button>
            </div>
              <div class="mt-4 space-y-5">
              <div class="grid md:grid-cols-2 gap-4">
                <label class="text-sm block">
                  <span class="block mb-1 text-muted-custom">Piezas del Vehículo</span>
                  <select id="part" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                    <option value="">Seleccionar pieza...</option>
                    <option>Paragolpes Delantero</option><option>Paragolpes Trasero</option>
                    <option>Puerta Delantera Izquierda</option><option>Puerta Delantera Derecha</option>
                    <option>Puerta Trasera Izquierda</option><option>Puerta Trasera Derecha</option>
                    <option>Capó</option><option>Baúl</option><option>Guardabarro Delantero Izq</option>
                    <option>Guardabarro Delantero Der</option><option>Guardabarro Trasero Izq</option>
                    <option>Guardabarro Trasero Der</option><option>Techo</option>
                    <option>Lateral Izquierdo</option><option>Lateral Derecho</option>
                    <option value="__otro__">Otro...</option>
                  </select>
                  <div id="custom-part-container" class="mt-2 hidden">
                    <div class="flex gap-2">
                      <input id="custom-part-input" class="flex-1 h-10 px-3 rounded surface border border-white/10 text-main" placeholder="Escriba la pieza..." />
                      <button id="add-custom-part" class="px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"><i class="fas fa-plus" aria-hidden="true"></i> Agregar</button>
                    </div>
                    <div id="custom-parts-list" class="mt-2 text-xs text-muted-custom"></div>
                  </div>
                </label>

                <label class="text-sm block">
                  <span class="block mb-1 text-muted-custom">Tipo de Trabajo</span>
                  <select id="work" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                    <option value="">Seleccionar trabajo...</option>
                    <option>Pintura Completa</option><option>Pintura Parcial</option>
                    <option>Chapa y Pintura</option><option>Desabolladura</option>
                    <option>Cambio de Pieza</option><option>Reparación de Chapa</option>
                    <option>Pulido</option><option>Masillado</option>
                    <option value="__otro__">Otro...</option>
                  </select>
                  <div id="custom-work-container" class="mt-2 hidden">
                    <div class="flex gap-2">
                      <input id="custom-work-input" class="flex-1 h-10 px-3 rounded surface border border-white/10 text-main" placeholder="Escriba el trabajo..." />
                      <button id="add-custom-work" class="px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"><i class="fas fa-plus" aria-hidden="true"></i> Agregar</button>
                    </div>
                    <div id="custom-works-list" class="mt-2 text-xs text-muted-custom"></div>
                  </div>
                </label>
              </div>

              <label class="text-sm block">
                <span class="block mb-1 text-muted-custom">Costo del Trabajo (ARS)</span>
                <input id="work-cost" type="number" min="0" step="0.01" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" placeholder="0.00">
              </label>

              <div>
                <div class="text-sm font-medium mb-1 text-main">Opciones</div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  ${["Cambiar Pieza", "Reparar", "Pintar", "Desabollar"].map(t => `
                    <label class="flex items-center gap-2 surface rounded px-3 py-2 text-main border border-white/10">
                      <input type="checkbox" class="accent-indigo-500"><span>${t}</span>
                    </label>
                  `).join("")}
                </div>
              </div>
            </div>

              <div class="mt-4 flex justify-end gap-2">
              <button class="btn-secondary close-modal px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
              <button id="confirm-add" class="btn-primary px-3 py-2 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white"><i class="fas fa-plus" aria-hidden="true"></i> Añadir ítem</button>
            </div>
          </div>
        </div>

        <!-- Modal: Otros Trabajos -->
        <div id="other-services-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60 p-4">
          <div class="surface rounded-xl w-[min(92vw,980px)] max-h-[90vh] overflow-y-auto p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-main"><i class="fas fa-tools" aria-hidden="true"></i> Otros Trabajos y Servicios</h2>
              <button id="close-services-modal" class="px-2 py-1 rounded hover:bg-white/10 text-main"><i class="fas fa-times" aria-hidden="true"></i></button>
            </div>

            <div class="mt-4 grid md:grid-cols-2 gap-4">
              <!-- Servicios disponibles -->
              <div class="glass rounded-lg p-3">
                <h3 class="font-medium mb-2 text-main">Servicios Disponibles</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="services-grid">
                  ${[
        ["desmontaje-montaje", "<i class=\"fas fa-wrench\" aria-hidden=\"true\"></i>", "Desmontaje/Montaje"],
        ["repuestos", "<i class=\"fas fa-cog\" aria-hidden=\"true\"></i>", "Repuestos"],
        ["pintura", "<i class=\"fas fa-palette\" aria-hidden=\"true\"></i>", "Pintura"],
        ["pulido", "<i class=\"fas fa-star\" aria-hidden=\"true\"></i>", "Pulido"],
        ["masillado", "<i class=\"fas fa-hammer\" aria-hidden=\"true\"></i>", "Masillado"],
        ["lavado", "<i class=\"fas fa-tint\" aria-hidden=\"true\"></i>", "Lavado"],
        ["limpieza", "<i class=\"fas fa-eraser\" aria-hidden=\"true\"></i>", "Limpieza"],
        ["diagnostico", "<i class=\"fas fa-search\" aria-hidden=\"true\"></i>", "Diagnóstico"],
        ["otro-predef", "<i class=\"fas fa-plus\" aria-hidden=\"true\"></i>", "Otro (rápido)"]
      ].map(([key, icon, label]) => `
                    <button class="service-item w-full text-left bg-white/5 hover:bg-white/10 rounded px-3 py-2 text-main border border-white/5" data-service="${key}">
                      <div class="text-xl">${icon}</div>
                      <div class="text-sm">${label}</div>
                    </button>
                  `).join("")}
                </div>

                <div class="mt-4">
                  <h4 class="font-medium mb-1 text-main">Servicios Personalizados</h4>
                  <div class="flex gap-2">
                    <input id="custom-service-name" class="flex-1 h-10 px-3 rounded surface border border-white/10 text-main" placeholder="Nombre del servicio personalizado">
                    <button id="add-custom-service" class="px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"><i class="fas fa-plus" aria-hidden="true"></i> Agregar</button>
                  </div>
                  <div id="custom-services-list" class="mt-2 grid sm:grid-cols-2 gap-2 text-sm text-main"></div>
                </div>
              </div>

              <!-- Formulario del servicio elegido -->
              <div class="glass rounded-lg p-3">
                <h3 class="font-medium mb-2 text-main">Detalles del Servicio</h3>
                <div class="grid grid-cols-2 gap-3">
                  <label class="text-sm block">
                    <span class="block mb-1 text-muted-custom">Cantidad</span>
                    <input id="service-quantity" type="number" min="1" value="1" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                  </label>
                  <label class="text-sm block">
                    <span class="block mb-1 text-muted-custom">Costo (ARS)</span>
                    <input id="service-cost" type="number" min="0" step="0.01" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                  </label>
                </div>
                <label class="text-sm block mt-3">
                  <span class="block mb-1 text-muted-custom">Descripción adicional (opcional)</span>
                  <textarea id="service-description" rows="3" class="w-full px-3 py-2 rounded surface border border-white/10 text-main" placeholder="Detalles extra..."></textarea>
                </label>
              </div>
            </div>

            <div class="mt-4 flex justify-end gap-2">
              <button id="cancel-service" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
              <button id="confirm-service" class="px-3 py-2 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white" disabled><i class="fas fa-plus" aria-hidden="true"></i> Agregar al presupuesto</button>
            </div>
          </div>
        </div>

        <!-- Modal: Repuestos -->
        <div id="parts-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60 p-4">
          <div class="surface rounded-xl w-[min(92vw,980px)] max-h-[90vh] overflow-y-auto p-4">
            <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-main"><i class="fas fa-cogs" aria-hidden="true"></i> Repuestos</h2>
                    <button id="close-parts-modal" class="px-2 py-1 rounded hover:bg-white/10 text-main"><i class="fas fa-times" aria-hidden="true"></i></button>
                  </div>

            <div class="mt-4 grid md:grid-cols-2 gap-4">
              <!-- Formulario -->
              <div class="glass rounded-lg p-3">
                <h3 class="font-medium mb-2 text-main">Formulario</h3>
                <label class="text-sm block">
                  <span class="block mb-1 text-muted-custom">Nombre del repuesto</span>
                  <input id="part-name" class="w-full h-10 px-3 rounded surface border border-white/10 text-main" placeholder="Ej: Farol delantero">
                </label>
                <div class="grid grid-cols-2 gap-3 mt-3">
                  <label class="text-sm block">
                    <span class="block mb-1 text-muted-custom">Cantidad</span>
                    <input id="part-quantity" type="number" min="1" value="1" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                  </label>
                  <label class="text-sm block">
                    <span class="block mb-1 text-muted-custom">Precio (ARS)</span>
                    <input id="part-price" type="number" min="0" step="0.01" class="w-full h-10 px-3 rounded surface border border-white/10 text-main">
                  </label>
                </div>
                <label class="text-sm block mt-3">
                  <span class="block mb-1 text-muted-custom">Descripción adicional (opcional)</span>
                  <textarea id="part-description" rows="2" class="w-full px-3 py-2 rounded surface border border-white/10 text-main" placeholder="Detalles adicionales del repuesto"></textarea>
                </label>
                <div class="flex items-center justify-between mt-3">
                  <div class="text-sm text-main">Total ítem: <span id="part-total" class="font-medium">$0.00</span></div>
                  <div class="flex gap-2">
                    <button id="add-part" class="px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white" disabled><i class="fas fa-plus" aria-hidden="true"></i> Agregar repuesto</button>
                    <button id="clear-part-form" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-broom" aria-hidden="true"></i> Limpiar</button>
                  </div>
                </div>
              </div>

              <!-- Vista previa -->
              <div class="glass rounded-lg p-3">
                <h3 class="font-medium mb-2 text-main">Repuestos a agregar <span id="parts-count" class="text-muted-custom">(0)</span></h3>
                <div id="parts-preview" class="space-y-2 text-sm">
                  <div class="text-muted-custom">No hay repuestos agregados aún</div>
                </div>
                <div class="mt-3 text-right text-sm text-main">
                  Total de repuestos: <span id="parts-total-amount" class="font-medium">$0.00</span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex justify-end gap-2">
                    <button id="cancel-parts" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
                    <button id="confirm-parts" class="px-3 py-2 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white"><i class="fas fa-plus" aria-hidden="true"></i> Agregar al presupuesto</button>
                  </div>
          </div>
        </div>

        <!-- Modal: Firma digital -->
        <div id="signature-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60 p-4">
          <div class="surface border border-white/10 rounded-xl w-[min(92vw,720px)] max-h-[90vh] overflow-y-auto p-4">
            <div class="flex items-center justify-between">
              <div class="font-medium text-main">Firma Digital</div>
              <button id="close-signature" class="px-2 py-1 rounded hover:bg-white/10 text-main"><i class="fas fa-times" aria-hidden="true"></i></button>
            </div>
            <div class="mt-3 glass rounded-lg p-2">
              <canvas id="signature-canvas-modal" class="w-full h-60 surface rounded"></canvas>
            </div>
            <div class="mt-3 flex justify-end gap-2">
              <button id="clear-signature" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-broom" aria-hidden="true"></i> Limpiar</button>
              <button id="save-signature" class="px-3 py-2 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white"><i class="fas fa-save" aria-hidden="true"></i> Guardar firma</button>
            </div>
          </div>
        </div>

        <!-- Modal: Confirmar eliminación de vehículo -->
        <div id="confirm-del-veh-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60">
          <div class="surface border border-white/10 rounded-xl w-[min(92vw,560px)] p-4">
            <h2 class="text-lg font-semibold text-main">Eliminar vehículo</h2>
            <p class="mt-2 text-muted-custom">¿Seguro que querés eliminar este vehículo? <strong>La acción no es reversible.</strong></p>
            <div id="del-veh-summary" class="mt-2 text-sm text-muted-custom"></div>
            <div class="mt-4 flex justify-end gap-2">
              <button id="cancel-del-veh" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
              <button id="confirm-del-veh" class="px-3 py-2 rounded bg-rose-700/80 hover:bg-rose-700 text-white"><i class="fas fa-trash" aria-hidden="true"></i> Eliminar</button>
            </div>
          </div>
        </div>

        <!-- Modal: Confirmar eliminación de cliente -->
        <div id="confirm-del-cli-modal"
             class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-black/60">
          <div class="surface border border-white/10 rounded-xl w-[min(92vw,560px)] p-4">
            <h2 class="text-lg font-semibold text-main">Eliminar cliente</h2>
            <p class="mt-2 text-muted-custom">¿Seguro que querés eliminar este cliente y <strong>todos sus vehículos</strong>? <strong>La acción no es irreversible.</strong></p>
            <div id="del-cli-summary" class="mt-2 text-sm text-muted-custom"></div>
            <div class="mt-4 flex justify-end gap-2">
              <button id="cancel-del-cli" class="px-3 py-2 rounded surface hover:bg-white/20 text-main"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
              <button id="confirm-del-cli" class="px-3 py-2 rounded bg-rose-700/80 hover:bg-rose-700 text-white"><i class="fas fa-trash" aria-hidden="true"></i> Eliminar cliente</button>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  mount(root) {
    // --- Refs base
    const selSucursal = root.querySelector("#sucursal");
    const selUser = root.querySelector("#budget-user");
    const selStatus = root.querySelector("#budget-status");
    const budgetDone = root.querySelector("#budget-done");
    const numInput = root.querySelector("#budget-number");
    const dateInput = root.querySelector("#budget-date");

    // --- Sync status/done UI immediately (moved to top)
    if (selStatus && budgetDone) {
      const syncStatus = () => {
        if (budgetDone.checked) selStatus.value = "realizado";
        else if (selStatus.value === "realizado") selStatus.value = "pendiente";
      };
      const syncCheck = () => {
        // Si el usuario pone "realizado", marcamos "hecho".
        // Si pone "pendiente", desmarcamos.
        if (selStatus.value === "realizado") budgetDone.checked = true;
        else budgetDone.checked = false;
      };

      budgetDone.addEventListener("change", syncStatus);
      selStatus.addEventListener("change", syncCheck);
    }

    // Cliente/vehículos
    const existingClientSel = root.querySelector("#existing-client");
    const newClientBtn = root.querySelector("#new-client-btn");
    const deleteClientBtn = root.querySelector("#delete-client-btn");
    const saveClientBtn = root.querySelector("#save-client-btn");
    const nombre = root.querySelector("#nombre");
    const telefono = root.querySelector("#telefono");
    const email = root.querySelector("#email");

    const vehiclesBlock = root.querySelector("#client-vehicles-block");
    const vehicleSel = root.querySelector("#client-vehicle");
    const addVehicleBtn = root.querySelector("#add-vehicle-btn");
    const deleteVehicleBtn = root.querySelector("#delete-vehicle-btn");
    const vehiculo = root.querySelector("#vehiculo");
    const patente = root.querySelector("#patente");
    const modelo = root.querySelector("#modelo");
    const compania = root.querySelector("#compania");
    const composania = root.querySelector("#compania");
    const chasis = root.querySelector("#chasis");
    const siniestroInput = root.querySelector("#siniestro-input");

    // Modales confirm
    const delVehModal = root.querySelector("#confirm-del-veh-modal");
    const delVehSummary = root.querySelector("#del-veh-summary");
    const cancelDelVeh = root.querySelector("#cancel-del-veh");
    const confirmDelVeh = root.querySelector("#confirm-del-veh");

    const delCliModal = root.querySelector("#confirm-del-cli-modal");
    const delCliSummary = root.querySelector("#del-cli-summary");
    const cancelDelCli = root.querySelector("#cancel-del-cli");
    const confirmDelCli = root.querySelector("#confirm-del-cli");

    const itemsBody = root.querySelector("#budget-items");
    const subtotalEl = root.querySelector("#subtotal");
    const taxRateEl = root.querySelector("#tax-rate");
    const vatPolicySel = root.querySelector("#vat-policy");
    const taxAmountEl = root.querySelector("#tax-amount");
    const totalEl = root.querySelector("#total");

    // Toolbar
    const addItemBtn = root.querySelector("#add-item");
    const othersBtn = root.querySelector("#other-services");
    const partsBtn = root.querySelector("#parts-manager");
    const signBtn = root.querySelector("#signature-btn");
    const saveBtn = root.querySelector("#save-budget");
    const pdfBtn = root.querySelector("#download-pdf-direct");

    // Modal Add Item
    const addItemModal = root.querySelector("#add-item-modal");
    const closeAddItem = addItemModal.querySelectorAll(".close-modal");
    const partSelect = addItemModal.querySelector("#part");
    const workSelect = addItemModal.querySelector("#work");
    const workCost = addItemModal.querySelector("#work-cost");
    const confirmAdd = addItemModal.querySelector("#confirm-add");
    const customPartContainer = addItemModal.querySelector("#custom-part-container");
    const customPartInput = addItemModal.querySelector("#custom-part-input");
    const addCustomPart = addItemModal.querySelector("#add-custom-part");
    const customPartsList = addItemModal.querySelector("#custom-parts-list");
    const customWorkContainer = addItemModal.querySelector("#custom-work-container");
    const customWorkInput = addItemModal.querySelector("#custom-work-input");
    const addCustomWork = addItemModal.querySelector("#add-custom-work");
    const customWorksList = addItemModal.querySelector("#custom-works-list");
    const optionChecks = addItemModal.querySelectorAll("input[type='checkbox']");

    // Otros Trabajos
    const othersModal = root.querySelector("#other-services-modal");
    const closeServicesModal = root.querySelector("#close-services-modal");
    const cancelServiceBtn = root.querySelector("#cancel-service");
    const confirmServiceBtn = root.querySelector("#confirm-service");
    const serviceQuantity = root.querySelector("#service-quantity");
    const serviceCost = root.querySelector("#service-cost");
    const serviceDescription = root.querySelector("#service-description");
    const customServiceName = root.querySelector("#custom-service-name");
    const addCustomServiceBtn = root.querySelector("#add-custom-service");
    const customServicesList = root.querySelector("#custom-services-list");

    // Repuestos
    const partsModal = root.querySelector("#parts-modal");
    const closePartsModal = root.querySelector("#close-parts-modal");
    const cancelPartsBtn = root.querySelector("#cancel-parts");
    const confirmPartsBtn = root.querySelector("#confirm-parts");
    const partNameInput = root.querySelector("#part-name");
    const partQuantityInput = root.querySelector("#part-quantity");
    const partPriceInput = root.querySelector("#part-price");
    const partTotalInput = root.querySelector("#part-total");
    const partDescriptionInput = root.querySelector("#part-description");
    const addPartBtn = root.querySelector("#add-part");
    const clearPartFormBtn = root.querySelector("#clear-part-form");
    const partsPreview = root.querySelector("#parts-preview");
    const partsCount = root.querySelector("#parts-count");
    const partsTotalAmount = root.querySelector("#parts-total-amount");

    // Firma
    const signModal = root.querySelector("#signature-modal");
    const closeSign = root.querySelector("#close-signature");
    const clearSign = root.querySelector("#clear-signature");
    const saveSign = root.querySelector("#save-signature");
    const signCanvas = root.querySelector("#signature-canvas-modal");
    const printCanvas = root.querySelector("#signature-canvas");
    const printDate = root.querySelector("#print-date");
    const signCtx = signCanvas.getContext("2d");
    const printCtx = printCanvas.getContext("2d");

    // ===== Init
    dateInput.value = todayISO();

    // Pintar usuarios desde store (cfg_users)
    function paintUsersIntoSelect() {
      try {
        const users = JSON.parse(localStorage.getItem("cfg_users") || "[]");
        selUser.innerHTML = `<option value="">(Asignar usuario)</option>` + users.map(u => `<option value="${u.id}">${u.full_name || u.username}</option>`).join("");
      } catch { selUser.innerHTML = `<option value="">(Asignar usuario)</option>`; }
    }
    paintUsersIntoSelect();

    async function paintBranchesIntoSelect(keepValue = null) {
      try {
        const branches = await store.branches.list();
        CFG_BRANCHES = branches; // Update module-level var for helpers

        const current = keepValue ?? selSucursal.value;
        // Use class text-main and surface for options to fix visibility
        selSucursal.innerHTML = `<option value="" class="bg-slate-900 text-slate-100">Seleccionar sucursal...</option>` +
          (branches || []).map(b => `<option value="${b.id}" class="bg-slate-900 text-slate-100">${b.name || b.address || b.cuit || b.id}</option>`).join("");

        // conservar selección si sigue existiendo
        selSucursal.value = (branches || []).some(b => b.id === current) ? current : "";
      } catch (e) {
        console.error("Error fetching branches:", e);
        // Fallback
        const current = keepValue ?? selSucursal.value;
        selSucursal.innerHTML = `<option value="" class="bg-slate-900 text-slate-100">Seleccionar sucursal...</option>` +
          (CFG_BRANCHES || []).map(b => `<option value="${b.id}" class="bg-slate-900 text-slate-100">${b.name || b.address || b.cuit || b.id}</option>`).join("");
        selSucursal.value = (CFG_BRANCHES || []).some(b => b.id === current) ? current : "";
      }

      if (!selSucursal.value) {
        numInput.value = "";
        numInput.placeholder = "Selecciona una sucursal";
      }
    }
    paintBranchesIntoSelect();
    loadClientsIntoSelect();

    // Reaccionar a cambios del panel de Configuración
    document.addEventListener("cfg:branches-updated", (e) => {
      CFG_BRANCHES = e.detail?.branches || [];
      paintBranchesIntoSelect();
    });
    document.addEventListener("cfg:settings-updated", (e) => {
      CFG_SETTINGS = e.detail?.settings || CFG_SETTINGS;
      CURRENCY = CFG_SETTINGS.currency || CURRENCY;
      LOCALE = CFG_SETTINGS.locale || LOCALE;
      DECIMALS = Number.isInteger(CFG_SETTINGS.decimals) ? CFG_SETTINGS.decimals : DECIMALS;
      // refrescar valores formateados
      updateTotals();
      try { if (printDate) printDate.textContent = new Date().toLocaleDateString(LOCALE); } catch { }
      toast("Ajustes aplicados al módulo Presupuesto ✅", "success");
    });

    // también reaccionamos si cambian usuarios/sucursales vía cfg
    document.addEventListener("cfg:users-updated", (e) => { paintUsersIntoSelect(); });

    // === Numeración vinculada a budgets_list ==========================
    // Estado de edición
    let currentBudgetKey = null;
    let isEditing = false;

    // Vista previa al elegir sucursal (no persiste nada)
    selSucursal.addEventListener("change", async () => {
      if (!selSucursal.value) {
        numInput.value = "";
        numInput.placeholder = "Selecciona una sucursal";
        return;
      }
      // Si estoy editando, no toco el número original
      if (isEditing) return;
      numInput.value = await budgetsService.previewNextNumber(selSucursal.value);
      toast(`Número sugerido: ${numInput.value}`, "success");
    });

    // === CLIENTES & VEHÍCULOS ===
    let selectedClientId = null;
    let selectedVehicleId = null; // null => creando uno nuevo

    // Local cache for UI
    let localClients = [];

    async function loadClientsIntoSelect(selectId = existingClientSel, keepId = null) {
      try {
        localClients = await store.clients.list();
        selectId.innerHTML = `<option value="">Seleccionar cliente existente...</option>` +
          localClients.map(c => {
            const vInfo = (c.vehicles && c.vehicles.length)
              ? ` [${c.vehicles.map(v => v.brand || v.vehiculo || "Vehículo").join(", ")}]`
              : "";
            return `<option value="${c.id}">${c.name} — ${c.phone || "s/tel"}${vInfo}</option>`;
          }).join("");
        if (keepId) selectId.value = keepId;
        deleteClientBtn.disabled = !selectId.value;
      } catch (e) { console.error(e); toast("Error cargando clientes", "error"); }
    }

    function loadVehiclesIntoSelect(client, keepVehicleId = null) {
      // API returns 'vehicles' as array attached to client
      if (!client) {
        vehiclesBlock.classList.add("hidden");
        return;
      }

      vehiclesBlock.classList.remove("hidden");

      if (!client.vehicles?.length) {
        vehicleSel.innerHTML = `<option value="">(Nuevo vehículo)</option>`;
        vehicleSel.value = "";
        selectedVehicleId = null;
        deleteVehicleBtn.disabled = true;
        fillVehicleForm(null); // Clear form for new entry
        return;
      }
      vehiclesBlock.classList.remove("hidden");
      vehicleSel.innerHTML = client.vehicles.map(v => {
        const label = `${v.brand || v.vehiculo || "Vehículo"} ${v.plate || v.patente ? `— ${v.plate || v.patente}` : ""}`;
        return `<option value="${v.id}">${label}</option>`;
      }).join("");
      vehicleSel.insertAdjacentHTML("afterbegin", `<option value="">(Nuevo vehículo)</option>`);

      // Select first if keepVehicleId is null
      vehicleSel.value = keepVehicleId ?? (client.vehicles[0] ? client.vehicles[0].id : "");
      selectedVehicleId = vehicleSel.value || null;
      deleteVehicleBtn.disabled = !selectedVehicleId;

      const current = client.vehicles.find(v => v.id === selectedVehicleId);
      fillVehicleForm(current || null);
    }

    // ... helpers ...

    function getClientFormData() {
      return {
        name: nombre.value.trim(),
        phone: telefono.value.trim(),
        email: email.value.trim()
      };
    }

    function getVehicleFormData() {
      return {
        id: selectedVehicleId, // null si es nuevo
        vehiculo: vehiculo.value.trim(),
        patente: patente.value.trim(),
        modelo: modelo.value.trim(),
        compania: compania.value.trim(),
        chasis: chasis.value.trim(),
        siniestro: siniestroInput.value.trim()
      };
    }

    function fillClientForm(c) {
      if (!c) {
        nombre.value = "";
        telefono.value = "";
        email.value = "";
        return;
      }
      nombre.value = c.name || "";
      telefono.value = c.phone || "";
      email.value = c.email || "";
    }

    function clearClientForm() {
      selectedClientId = null;
      existingClientSel.value = "";
      fillClientForm(null);
      loadVehiclesIntoSelect(null); // Clear vehicle list
      deleteClientBtn.disabled = true;
    }

    function fillVehicleForm(v) {
      if (!v) {
        vehiculo.value = "";
        patente.value = "";
        modelo.value = "";
        compania.value = "";
        chasis.value = "";
        siniestroInput.value = "";
        return;
      }
      vehiculo.value = v.brand || v.vehiculo || "";
      patente.value = v.plate || v.patente || "";
      modelo.value = v.year || v.modelo || "";
      compania.value = v.insurance || v.compania || "";
      chasis.value = v.vin || v.chasis || "";
      siniestroInput.value = v.siniestro || "";
    }


    // Selección de cliente existente
    existingClientSel.addEventListener("change", () => {
      const id = existingClientSel.value || null;
      selectedClientId = id;
      const client = localClients.find(c => c.id === id) || null;
      fillClientForm(client);
      loadVehiclesIntoSelect(client);
      deleteClientBtn.disabled = !id;
    });

    // Botón Nuevo Cliente
    newClientBtn.addEventListener("click", () => {
      clearClientForm();
      toast("Modo: Nuevo cliente", "info");
    });

    // Botón Añadir vehículo (prepara el form en blanco y marca 'nuevo')
    addVehicleBtn.addEventListener("click", () => {
      vehiclesBlock.classList.remove("hidden");
      selectedVehicleId = null; // nuevo
      vehicleSel.value = "";
      deleteVehicleBtn.disabled = true;
      fillVehicleForm(null);
      toast("Completá los datos para añadir un vehículo nuevo", "info");
    });

    // Cambio de vehículo seleccionado
    vehicleSel.addEventListener("change", () => {
      selectedVehicleId = vehicleSel.value || null;
      deleteVehicleBtn.disabled = !selectedVehicleId;
      const clients = getClients();
      const client = clients.find(c => c.id === selectedClientId);
      if (!client) return;
      const v = client.vehicles?.find(v => v.id === selectedVehicleId) || null;
      fillVehicleForm(v); // si es null => deja el form en blanco (nuevo)
    });

    // Guardar Cliente (crea/actualiza cliente + agrega/actualiza vehículo)
    // Guardar Cliente (async store)
    saveClientBtn.addEventListener("click", async () => {
      const clientData = getClientFormData();
      if (!clientData.name) { toast("El nombre del cliente es obligatorio", "error"); return; }
      if (!clientData.phone) { toast("El teléfono es obligatorio", "error"); return; }

      // Get current vehicles list from local object or empty
      let currentClient = selectedClientId ? localClients.find(c => c.id === selectedClientId) : null;
      let vehicles = currentClient ? [...(currentClient.vehicles || [])] : [];

      // If adding/editing a vehicle in the form
      const vData = getVehicleFormData();
      // Check if user filled vehicle data
      if (vData.vehiculo && vData.patente) {
        const idxV = vehicles.findIndex(v => v.id === selectedVehicleId);
        if (idxV >= 0) vehicles[idxV] = vData;
        else vehicles.push(vData);
      } else if (selectedVehicleId) {
        // Maybe updating existing vehicle but cleared fields? Assume required.
        // Or just user didn't touch vehicle form.
      } else {
        // No vehicle data provided, if required warn?
        // User said "vehiculo y patente obligatorios" in original code.
        if (vData.vehiculo || vData.patente) { // Partial data
          if (!vData.vehiculo || !vData.patente) { toast("Vehículo y patente son obligatorios", "error"); return; }
        }
      }

      // Payload
      const payload = {
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email || "", // Fix: Include email
        address: clientData.address || "", // Fix: Include address
        vehicles: vehicles
      };

      try {
        let savedId;
        if (selectedClientId) {
          await store.clients.update(selectedClientId, payload);
          savedId = selectedClientId;
          toast("Cliente actualizado ✅", "success");
        } else {
          const res = await store.clients.create(payload);
          savedId = res.id;
          toast("Cliente creado ✅", "success");
        }
        await loadClientsIntoSelect(existingClientSel, savedId);
        // Refetch to get full object with IDs
        currentClient = localClients.find(c => c.id === savedId);
        selectedClientId = savedId;

        // Determine active vehicle
        const savedVehicleId = vData.id || (currentClient.vehicles[0]?.id);
        loadVehiclesIntoSelect(currentClient, savedVehicleId);
        selectedVehicleId = savedVehicleId;

        deleteClientBtn.disabled = false;
      } catch (e) { toast("Error guardando cliente: " + e.message, "error"); }
    });

    // --- Eliminar Vehículo (modal)
    function openDelVehModal() { delVehModal.classList.remove("hidden"); }
    function closeDelVehModal() { delVehModal.classList.add("hidden"); }
    deleteVehicleBtn.addEventListener("click", () => {
      if (!selectedClientId || !selectedVehicleId) return;
      const client = localClients.find(c => c.id === selectedClientId);
      const v = client?.vehicles?.find(v => v.id === selectedVehicleId);
      delVehSummary.textContent = v ? `${v.brand || v.vehiculo || ""} ${v.plate || v.patente ? "— " + (v.plate || v.patente) : ""}` : "";
      openDelVehModal();
    });
    cancelDelVeh.addEventListener("click", closeDelVehModal);
    delVehModal.addEventListener("click", (e) => { if (e.target === delVehModal) closeDelVehModal(); });
    confirmDelVeh.addEventListener("click", async () => {
      if (!selectedClientId || !selectedVehicleId) return;
      const client = localClients.find(c => c.id === selectedClientId);
      if (!client) return;

      const newVehicles = (client.vehicles || []).filter(v => v.id !== selectedVehicleId);
      const payload = {
        name: client.name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        vehicles: newVehicles
      };

      try {
        await store.clients.update(client.id, payload);
        // Refetch to get updated list
        await loadClientsIntoSelect(existingClientSel, client.id);
        const updatedClient = localClients.find(c => c.id === client.id) || client; // fallback

        loadVehiclesIntoSelect(updatedClient, null);
        selectedVehicleId = null;
        deleteVehicleBtn.disabled = true;
        fillVehicleForm(null);
        toast("Vehículo eliminado", "info");
        closeDelVehModal();
      } catch (e) { toast("Error eliminando vehículo: " + e.message, "error"); }
    });

    // --- Eliminar Cliente (modal)
    function openDelCliModal() { delCliModal.classList.remove("hidden"); }
    function closeDelCliModal() { delCliModal.classList.add("hidden"); }
    deleteClientBtn.addEventListener("click", () => {
      if (!selectedClientId) return;
      const cli = localClients.find(c => c.id === selectedClientId);
      delCliSummary.textContent = cli ? `${cli.name} — ${cli.phone || "s/tel"} (${(cli.vehicles || []).length} vehículo/s)` : "";
      openDelCliModal();
    });
    cancelDelCli.addEventListener("click", closeDelCliModal);
    delCliModal.addEventListener("click", (e) => { if (e.target === delCliModal) closeDelCliModal(); });
    confirmDelCli.addEventListener("click", async () => {
      if (!selectedClientId) return;
      try {
        await store.clients.remove(selectedClientId);
        toast("Cliente eliminado", "info");
        await loadClientsIntoSelect(existingClientSel);
        clearClientForm();
        closeDelCliModal();
      } catch (e) { toast("Error eliminando cliente", "error"); }
    });

    // === Tabla + Totales
    function updateTotals() {
      let subtotal = 0;
      let taxableSubtotal = 0;
      const policy = vatPolicySel ? vatPolicySel.value : "all";

      itemsBody.querySelectorAll("tr").forEach(tr => {
        const descCell = tr.querySelector("td:nth-child(2)");
        const cell = tr.querySelector("td:nth-child(4)");
        if (!cell) return;
        const num = parseFloat(
          cell.textContent.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")
        ) || 0;

        subtotal += num;

        let isTaxable = true;
        const desc = descCell ? descCell.textContent.toUpperCase() : "";
        if (policy === "services" && desc.includes("[REPUESTO]")) isTaxable = false;
        if (policy === "parts" && desc.includes("[SERVICIO]")) isTaxable = false;

        if (isTaxable) taxableSubtotal += num;
      });

      const rate = Number(localStorage.getItem('tax_rate')) || (taxRateEl ? Number(taxRateEl.value || 0) : 0);
      if (taxRateEl) localStorage.setItem('tax_rate', String(Number(taxRateEl.value || rate)));

      const taxAmount = +(taxableSubtotal * (rate / 100));
      const totalWithTax = subtotal + taxAmount;

      subtotalEl.textContent = money(subtotal);
      if (taxAmountEl) taxAmountEl.textContent = money(taxAmount);
      totalEl.textContent = money(totalWithTax);
      return { subtotal, taxAmount, totalWithTax, rate, vatPolicy: policy };
    }
    if (vatPolicySel) vatPolicySel.addEventListener("change", updateTotals);
    if (taxRateEl) taxRateEl.addEventListener("input", updateTotals);
    function appendRow({ cantidad = 1, descripcion, unit, total }) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-3 py-2">${cantidad}</td>
        <td class="px-3 py-2 text-left">${descripcion}</td>
        <td class="px-3 py-2">${money(unit)}</td>
        <td class="px-3 py-2">${money(total)}</td>
        <td class="px-3 py-2">
          <button class="delete-item px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
        </td>`;
      tr.querySelector(".delete-item").addEventListener("click", () => {
        tr.remove();
        updateTotals();
      });
      itemsBody.appendChild(tr);
      updateTotals();
    }
    function collectItemsForPdf() {
      const arr = [];
      itemsBody.querySelectorAll("tr").forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length >= 4) {
          const cantidad = parseFloat((tds[0].textContent || "1").replace(",", "."));
          const unit = parseFloat(tds[2].textContent.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
          const total = parseFloat(tds[3].textContent.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
          arr.push({
            cantidad: isNaN(cantidad) ? 1 : cantidad,
            descripcion: tds[1].textContent.trim(),
            unit: isNaN(unit) ? 0 : unit,
            total: isNaN(total) ? 0 : total
          });
        }
      });
      return arr;
    }

    // === Modal "Añadir Item"
    function showAddItem() { addItemModal.classList.remove("hidden"); }
    function hideAddItem() { addItemModal.classList.add("hidden"); }
    addItemBtn.addEventListener("click", showAddItem);
    addItemModal.addEventListener("click", (e) => { if (e.target === addItemModal) hideAddItem(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [addItemModal, othersModal, partsModal, signModal, delVehModal, delCliModal].forEach(m => !m.classList.contains("hidden") && m.classList.add("hidden"));
      }
    });
    closeAddItem.forEach(b => b.addEventListener("click", hideAddItem));

    partSelect.addEventListener("change", () => customPartContainer.classList.toggle("hidden", partSelect.value !== "__otro__"));
    workSelect.addEventListener("change", () => customWorkContainer.classList.toggle("hidden", workSelect.value !== "__otro__"));
    addCustomPart.addEventListener("click", () => {
      const v = customPartInput.value.trim(); if (!v) return;
      partSelect.add(new Option(v, v)); partSelect.value = v; customPartsList.textContent = `Agregada: ${v}`;
    });
    addCustomWork.addEventListener("click", () => {
      const v = customWorkInput.value.trim(); if (!v) return;
      workSelect.add(new Option(v, v)); workSelect.value = v; customWorksList.textContent = `Agregado: ${v}`;
    });
    confirmAdd.addEventListener("click", () => {
      if (!partSelect.value) { toast("Seleccioná una pieza", "error"); return; }
      if (!workSelect.value) { toast("Seleccioná un trabajo", "error"); return; }
      const cost = parseFloat(workCost.value);
      if (!cost || cost <= 0) { toast("Costo inválido", "error"); return; }
      const opts = [...optionChecks].filter(c => c.checked).map(c => c.nextElementSibling.textContent.trim());
      const desc = `[SERVICIO] ${partSelect.value} - ${workSelect.value}${opts.length ? ` (${opts.join(", ")})` : ""}`;
      appendRow({ cantidad: 1, descripcion: desc, unit: cost, total: cost });
      hideAddItem();
      toast("Ítem agregado", "success");
    });

    // === Otros Trabajos (con servicios personalizados CRUD)
    let selectedService = null;
    let customServices = JSON.parse(localStorage.getItem("customServices") || "[]");

    const openOthers = () => { othersModal.classList.remove("hidden"); resetOthers(); loadCustomServices(); };
    const closeOthers = () => { othersModal.classList.add("hidden"); resetOthers(); };

    othersBtn.addEventListener("click", openOthers);
    closeServicesModal.addEventListener("click", closeOthers);
    cancelServiceBtn.addEventListener("click", closeOthers);
    othersModal.addEventListener("click", (e) => { if (e.target === othersModal) closeOthers(); });

    function clearAllServiceSelections() {
      othersModal.querySelectorAll(".service-item").forEach(i => i.classList.remove("ring", "ring-indigo-500/50"));
      customServicesList.querySelectorAll(".service-card").forEach(i => i.classList.remove("ring", "ring-indigo-500/50"));
    }

    function resetOthers() {
      selectedService = null;
      serviceQuantity.value = "1";
      serviceCost.value = "";
      serviceDescription.value = "";
      confirmServiceBtn.disabled = true;
      clearAllServiceSelections();
    }

    function updateConfirmBtn() {
      const hasService = selectedService !== null;
      const hasCost = parseFloat(serviceCost.value) > 0;
      confirmServiceBtn.disabled = !(hasService && hasCost);
    }



    // Selección de servicios predefinidos
    othersModal.addEventListener("click", (e) => {
      const item = e.target.closest(".service-item");
      if (!item) return;
      clearAllServiceSelections();
      item.classList.add("ring", "ring-indigo-500/50");
      selectedService = item.dataset.service || item.textContent.trim();
      updateConfirmBtn();
    });

    // ----- Servicios personalizados CRUD -----
    function persistCustomServices() {
      localStorage.setItem("customServices", JSON.stringify(customServices));
    }

    function loadCustomServices(selectedId = null) {
      if (!Array.isArray(customServices)) customServices = [];
      if (!customServices.length) {
        customServicesList.innerHTML = `<div class="text-slate-400 text-sm">No hay servicios personalizados aún</div>`;
        return;
      }
      customServicesList.innerHTML = customServices.map(s => `
        <div class="service-card group flex items-center justify-between bg-white/5 hover:bg-white/10 rounded px-3 py-2"
             data-id="${s.id}">
          <button class="use-service text-left flex-1 truncate">${s.name}</button>
          <div class="ml-2 opacity-90 flex gap-1 shrink-0">
            <button class="edit-service px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
            <button class="delete-service px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-xs" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </div>
        </div>
      `).join("");

      if (selectedId) {
        const card = customServicesList.querySelector(`.service-card[data-id="${selectedId}"]`);
        card?.classList.add("ring", "ring-indigo-500/50");
      }
    }

    function renderServiceCardEditing(card, currentName) {
      card.innerHTML = `
        <input type="text" class="edit-input flex-1 h-9 mr-2 px-3 rounded bg-white/10 border border-white/10"
               value="${currentName}">
        <div class="flex gap-1">
          <button class="save-service px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-xs"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
          <button class="cancel-edit px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
        </div>
      `;
    }

    addCustomServiceBtn.addEventListener("click", () => {
      const name = customServiceName.value.trim();
      if (!name) { toast("Ingresá un nombre", "error"); return; }
      const obj = { id: rid("srv"), name };
      customServices.push(obj);
      persistCustomServices();
      customServiceName.value = "";
      loadCustomServices(obj.id);
      toast("Servicio agregado a favoritos", "success");
    });

    customServicesList.addEventListener("click", (e) => {
      const card = e.target.closest(".service-card");
      if (!card) return;
      const id = card.dataset.id;
      const idx = customServices.findIndex(s => s.id === id);
      if (idx < 0) return;

      if (e.target.classList.contains("use-service")) {
        clearAllServiceSelections();
        card.classList.add("ring", "ring-indigo-500/50");
        selectedService = customServices[idx].name;
        updateConfirmBtn();
        return;
      }

      if (e.target.classList.contains("edit-service")) {
        renderServiceCardEditing(card, customServices[idx].name);
        card.querySelector(".edit-input")?.focus();
        return;
      }

      if (e.target.classList.contains("save-service")) {
        const input = card.querySelector(".edit-input");
        const newName = (input?.value || "").trim();
        if (!newName) { toast("El nombre no puede estar vacío", "error"); return; }
        customServices[idx].name = newName;
        persistCustomServices();
        loadCustomServices(id);
        toast("Servicio modificado ✅", "success");
        if (selectedService) { selectedService = newName; updateConfirmBtn(); }
        return;
      }

      if (e.target.classList.contains("cancel-edit")) {
        loadCustomServices();
        return;
      }

      if (e.target.classList.contains("delete-service")) {
        if (!confirm("¿Eliminar este servicio personalizado?")) return;
        customServices.splice(idx, 1);
        persistCustomServices();
        loadCustomServices();
        clearAllServiceSelections();
        selectedService = null;
        updateConfirmBtn();
        toast("Servicio eliminado", "info");
        return;
      }
    });

    confirmServiceBtn.addEventListener("click", () => {
      if (!selectedService) return;
      const quantity = Math.max(1, parseInt(serviceQuantity.value || "1", 10));
      const cost = parseFloat(serviceCost.value || "0");
      if (!(cost > 0)) { toast("Costo inválido", "error"); return; }
      const extra = serviceDescription.value.trim();
      const fullDesc = extra ? `${selectedService} - ${extra}` : selectedService;
      appendRow({ cantidad: quantity, descripcion: `[SERVICIO] ${fullDesc}`, unit: cost, total: quantity * cost });
      closeOthers();
      toast("Servicio agregado al presupuesto", "success");
    });

    // === Repuestos
    let tempParts = [];
    const openParts = () => {
      partsModal.classList.remove("hidden");
      partsModal.classList.add("flex"); // Ensure centering logic works
      document.body.style.overflow = "hidden"; // Lock scroll
      resetParts();
    };
    const closeParts = () => {
      partsModal.classList.add("hidden");
      partsModal.classList.remove("flex");
      document.body.style.overflow = ""; // Unlock scroll
      resetParts();
    };
    partsBtn.addEventListener("click", openParts);
    closePartsModal.addEventListener("click", closeParts);
    cancelPartsBtn.addEventListener("click", closeParts);
    partsModal.addEventListener("click", (e) => { if (e.target === partsModal) closeParts(); });

    function calcPartTotal() {
      const q = Math.max(1, parseInt(partQuantityInput.value || "1", 10));
      const p = parseFloat(partPriceInput.value || "0");
      const t = q * (p > 0 ? p : 0);
      partTotalInput.textContent = money(t);
      addPartBtn.disabled = !(partNameInput.value.trim() && p > 0 && q > 0);
    }
    function clearPartForm() {
      partNameInput.value = ""; partQuantityInput.value = "1"; partPriceInput.value = ""; partDescriptionInput.value = "";
      calcPartTotal();
    }
    function resetParts() {
      tempParts = [];
      clearPartForm();
      updatePartsPreview();
    }
    partQuantityInput.addEventListener("input", calcPartTotal);
    partPriceInput.addEventListener("input", calcPartTotal);
    partNameInput.addEventListener("input", calcPartTotal);

    addPartBtn.addEventListener("click", () => {
      const name = partNameInput.value.trim(); if (!name) return;
      const quantity = Math.max(1, parseInt(partQuantityInput.value || "1", 10));
      const price = parseFloat(partPriceInput.value || "0"); if (!(price > 0)) return;
      const desc = partDescriptionInput.value.trim();
      const newPart = { id: rid("rep"), name, quantity, price, total: quantity * price, description: desc };
      tempParts.push(newPart);
      clearPartForm();
      updatePartsPreview();
      toast("Repuesto agregado a la lista", "success");
    });
    clearPartFormBtn.addEventListener("click", clearPartForm);

    function updatePartsPreview() {
      if (!tempParts.length) {
        partsPreview.innerHTML = `<div class="text-slate-400">No hay repuestos agregados aún</div>`;
      } else {
        partsPreview.innerHTML = tempParts.map(p => `
          <div class="flex items-start justify-between gap-3 glass rounded p-2" data-id="${p.id}">
            <div>
              <div class="font-medium">${p.name}</div>
              ${p.description ? `<div class="text-xs text-slate-400">${p.description}</div>` : ""}
              <div class="text-xs">${p.quantity} × ${money(p.price)} = <strong>${money(p.total)}</strong></div>
            </div>
            <button class="del-part px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-xs"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </div>
        `).join("");
      }
      partsCount.textContent = `(${tempParts.length})`;
      const totalAmount = tempParts.reduce((s, p) => s + p.total, 0);
      partsTotalAmount.textContent = money(totalAmount);
    }
    partsPreview.addEventListener("click", (e) => {
      const btn = e.target.closest(".del-part"); if (!btn) return;
      const card = btn.closest("[data-id]"); const id = card?.dataset.id;
      tempParts = tempParts.filter(p => p.id !== id);
      updatePartsPreview();
      toast("Repuesto eliminado de la lista", "info");
    });

    confirmPartsBtn.addEventListener("click", () => {
      if (!tempParts.length) { toast("No hay repuestos para agregar", "error"); return; }
      tempParts.forEach(p => {
        const fullDesc = p.description ? `${p.name} - ${p.description}` : p.name;
        appendRow({ cantidad: p.quantity, descripcion: `[REPUESTO] ${fullDesc}`, unit: p.price, total: p.total });
      });
      closeParts();
      toast(`${tempParts.length} repuesto(s) agregado(s)`, "success");
    });

    // === Firma digital
    function resizeSignCanvas() {
      const rect = signCanvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
      signCanvas.width = rect.width * ratio; signCanvas.height = rect.height * ratio;
      signCtx.setTransform(ratio, 0, 0, ratio, 0, 0); setupCanvas(signCtx);
    }
    let drawing = false, last = null;
    const pos = (ev, canvas) => { const r = canvas.getBoundingClientRect(); const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top; return { x, y }; };
    function showSign() {
      signModal.classList.remove("hidden");
      signModal.classList.add("flex");
      document.body.style.overflow = "hidden";
      resizeSignCanvas();
      loadSignatureToEdit();
    }
    function hideSign() {
      signModal.classList.add("hidden");
      signModal.classList.remove("flex");
      document.body.style.overflow = "";
    }
    function clearSignature() { signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height); }
    function saveSignature() {
      const data = signCanvas.toDataURL("image/png"); localStorage.setItem("digital_signature", data);
      const img = new Image();
      img.onload = () => {
        printCtx.clearRect(0, 0, printCanvas.width, printCanvas.height);
        printCtx.drawImage(img, 0, 0, printCanvas.width, printCanvas.height);
        root.querySelector(".signature-placeholder")?.classList.add("hidden");
      };
      img.src = data;
      toast("Firma guardada ✅", "success"); hideSign();
    }
    function loadSignatureToEdit() {
      const data = localStorage.getItem("digital_signature"); if (!data) return;
      const img = new Image(); img.onload = () => { signCtx.drawImage(img, 0, 0, signCanvas.width, signCanvas.height); }; img.src = data;
    }
    signCanvas.addEventListener("mousedown", e => { drawing = true; last = pos(e, signCanvas); });
    signCanvas.addEventListener("mousemove", e => { if (!drawing) return; const p = pos(e, signCanvas); signCtx.beginPath(); signCtx.moveTo(last.x, last.y); signCtx.lineTo(p.x, p.y); signCtx.stroke(); last = p; });
    window.addEventListener("mouseup", () => drawing = false);
    signCanvas.addEventListener("touchstart", e => { e.preventDefault(); drawing = true; last = pos(e, signCanvas); });
    signCanvas.addEventListener("touchmove", e => { e.preventDefault(); if (!drawing) return; const p = pos(e, signCanvas); signCtx.beginPath(); signCtx.moveTo(last.x, last.y); signCtx.lineTo(p.x, p.y); signCtx.stroke(); last = p; });
    window.addEventListener("touchend", () => drawing = false);
    signBtn.addEventListener("click", showSign);
    closeSign.addEventListener("click", hideSign);
    clearSign.addEventListener("click", clearSignature);
    saveSign.addEventListener("click", saveSignature);
    if (printDate) printDate.textContent = new Date().toLocaleDateString(LOCALE);

    // === Guardar presupuesto
    function collectItems() {
      const arr = [];
      itemsBody.querySelectorAll("tr").forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if (tds.length >= 4) {
          arr.push({
            cantidad: tds[0].textContent.trim(),
            descripcion: tds[1].textContent.trim(),
            precio: tds[2].textContent.trim(),
            total: tds[3].textContent.trim()
          });
        }
      });
      return arr;
    }

    async function saveBudget() {
      const suc = selSucursal.value;
      let num = (numInput.value || "").trim();

      if (!suc) { toast("Seleccioná una sucursal", "error"); return; }
      if (itemsBody.children.length === 0) { toast("Agregá al menos un ítem", "error"); return; }

      // Si es NUEVO, asignamos número real ahora (derivado de budgets_list)
      if (!isEditing) {
        // Usa la lógica del backend/servicio para obtener el próximo número
        num = await budgetsService.previewNextNumber(suc);
        numInput.value = num; // reflejar en UI
      }

      const clientData = {
        idCliente: selectedClientId,
        nombre: nombre.value,
        telefono: telefono.value,
        email: email ? email.value : "",
        vehiculo: vehiculo.value,
        patente: patente.value,
        modelo: modelo.value,
        compania: compania.value,
        chasis: chasis.value,
        idVehiculo: selectedVehicleId
      };

      const items = collectItems();
      const sucName = (CFG_BRANCHES.find(b => b.id === suc)?.name) || "";

      const totals = updateTotals();
      const data = {
        numero: num,
        sucursal: suc,
        sucursalNombre: sucName,
        fecha: dateInput.value || todayISO(),
        cliente: clientData,
        siniestro: siniestroInput ? siniestroInput.value : "", // Nuevo field
        vatPolicy: totals.vatPolicy || "all",
        items,
        subtotal: typeof totals === 'object' ? totals.subtotal : subtotalEl.textContent,
        taxRate: typeof totals === 'object' ? totals.rate : (Number(localStorage.getItem('tax_rate')) || 0),
        taxAmount: typeof totals === 'object' ? totals.taxAmount : 0,
        total: typeof totals === 'object' ? totals.totalWithTax : totalEl.textContent,
        estado: selStatus?.value || "pendiente",
        done: (budgetDone && budgetDone.checked) || false,
        assignedUser: selUser?.value || null,
        fechaCreacion: new Date().toISOString()
      };

      // Guardar: si estamos en modo edición, pasar la key para actualizar; si no, crear nueva entrada
      const wasEditing = !!isEditing;

      // Sync Status <-> Done
      let finalStatus = selStatus?.value || "pendiente";
      let finalDone = (budgetDone && budgetDone.checked) || false;

      // Si el check "Hecho" está marcado, forzamos status "realizado" (para stats)
      if (finalDone) {
        finalStatus = "realizado";
      } else if (finalStatus === "realizado") {
        // Si el usuario eligió "Realizado" en el select, marcamos el check también
        finalDone = true;
      }

      // Asegurar que los presupuestos nuevos no reutilicen un número ya existente.
      try {
        const list = await budgetsService.list();
        const existing = list.find(x => String(x.numero || "") === String(num || ""));
        if (existing && (!wasEditing || existing.key !== currentBudgetKey)) {
          // Si estamos creando (no editando) y el número ya existe, forzamos el siguiente número disponible.
          if (!wasEditing) {
            num = await budgetsService.previewNextNumber(suc);
            data.numero = num;
            numInput.value = num;
          }
        }
      } catch (e) { /* no crítico */ }

      // Actualizar payload con status sincronizado
      data.estado = finalStatus;
      data.done = finalDone;

      const res = await budgetsService.save(data, wasEditing ? currentBudgetKey : null);
      const key = res.id || res.key; // API returns id

      // Si veníamos editando, mantener el modo edición sobre ese key; si no, limpiar el estado de edición
      if (wasEditing) {
        isEditing = true;
        currentBudgetKey = key;
      } else {
        isEditing = false;
        currentBudgetKey = null;
      }

      toast(`Presupuesto ${num} ${wasEditing ? "actualizado" : "guardado"} ✅`, "success");
      if (!wasEditing) {
        // Actualizar vista previa del próximo número para la misma sucursal
        numInput.value = await budgetsService.previewNextNumber(suc);
      }
    }
    saveBtn.addEventListener("click", saveBudget);

    // === PDF integrado
    function collectBudgetDataForPdf() {
      const sucVal = selSucursal.value;
      const branch = CFG_BRANCHES.find(b => b.id === sucVal);
      const suc = branch?.name || "";
      const items = collectItemsForPdf();
      const subtotalNum = items.reduce((s, i) => s + (i.total || 0), 0);
      const rate = Number(localStorage.getItem('tax_rate')) || (taxRateEl ? Number(taxRateEl.value || 0) : 0);
      const taxAmount = +(subtotalNum * (rate / 100));
      const totalWithTax = subtotalNum + taxAmount;
      const signature = localStorage.getItem("digital_signature") || null;

      const company = {
        companyName: CFG_SETTINGS?.companyName || "",
        brandName: CFG_SETTINGS?.brandName || "",
        address: CFG_SETTINGS?.address || "",
        phone: CFG_SETTINGS?.phone || "",
        email: CFG_SETTINGS?.email || "",
        cuit: CFG_SETTINGS?.cuit || ""
      };

      // incluir logoData si está configurado
      if (CFG_SETTINGS?.logoData) company.logoData = CFG_SETTINGS.logoData;

      return {
        numero: numInput.value || "",
        fecha: dateInput.value || todayISO(),
        sucursalId: sucVal,
        sucursalNombre: suc,
        sucursalCuit: branch?.cuit || "",
        cliente: {
          id: selectedClientId,
          nombre: nombre.value || "",
          telefono: telefono.value || "",
          vehiculo: vehiculo.value || "",
          patente: patente.value || "",
          modelo: modelo.value || "",
          compania: compania.value || "",
          chasis: chasis.value || "",
          idVehiculo: selectedVehicleId
        },
        items,
        subtotal: subtotalNum,
        taxRate: rate,
        taxAmount,
        total: totalWithTax,
        subtotalStr: money(subtotalNum),
        taxAmountStr: money(taxAmount),
        totalStr: money(totalWithTax),
        firmaDataUrl: signature,
        estado: selStatus?.value || "pendiente",
        assignedUser: selUser?.value || null,
        company
      };
    }

    pdfBtn.addEventListener("click", async () => {
      let data = collectBudgetDataForPdf();
      try {
        // si no hay logoData en CFG_SETTINGS/company, intentar cargar desde assets según modo
        if (!data.company?.logoData) {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
          // Intenta cargar el logo desde assets con varias rutas posibles
          const candidates = isDark
            ? ['assets/LOGO%20NUEVO-BLANCO.png', '/assets/LOGO%20NUEVO-BLANCO.png', './assets/LOGO%20NUEVO-BLANCO.png', 'frontend/assets/LOGO%20NUEVO-BLANCO.png']
            : ['assets/LOGO%20NUEVO.png', '/assets/LOGO%20NUEVO.png', './assets/LOGO%20NUEVO.png', 'frontend/assets/LOGO%20NUEVO.png'];

          for (const c of candidates) {
            try {
              const urlData = await imageUrlToDataUrl(c);
              if (urlData) { data.company.logoData = urlData; break; }
            } catch (e) { console.warn("Logo not found:", c); }
          }
        }
        await ensurePdfLoaded();
        const pdf = await generateBudgetPDF(data);
        const cleanNum = (data.numero || "SIN").replace(/[^\w\d]/g, "-");
        pdf.save(`Presupuesto-${cleanNum}.pdf`);
      } catch (e) {
        console.error("PDF error:", e);
        window.print();
      }
    });

    // === Share Buttons
    const shareWaBtn = root.querySelector("#share-wa");
    const shareMailBtn = root.querySelector("#share-mail");

    if (shareWaBtn) {
      shareWaBtn.addEventListener("click", async () => {
        const tel = telefono.value.replace(/[^\d]/g, "");
        if (!tel) { toast("Ingresá un teléfono para WhatsApp", "warning"); return; }

        const toastId = toast("Generando PDF para compartir...", "info");
        try {
          // 1. Generate PDF
          let data = collectBudgetDataForPdf();
          if (!data.company?.logoData) {
            // Try to load logo if missing
            try {
              const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
              const candidates = isDark ? ['assets/LOGO%20NUEVO-BLANCO.png'] : ['assets/LOGO%20NUEVO.png'];
              for (const c of candidates) {
                const urlData = await imageUrlToDataUrl(c);
                if (urlData) { data.company.logoData = urlData; break; }
              }
            } catch (e) { }
          }
          await ensurePdfLoaded();
          const pdf = await generateBudgetPDF(data);
          const cleanNum = (data.numero || "S_N").replace(/[^\w\d]/g, "-");
          const filename = `Presupuesto-${cleanNum}.pdf`;
          const pdfBlob = pdf.output("blob");
          const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

          // 2. Try Web Share API (Mobile)
          if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: `Presupuesto ${data.numero}`,
              text: `Hola ${nombre.value || "Cliente"}, adjunto el presupuesto #${data.numero}.`
            });
            toast("Compartido correctamente ✅", "success");
          } else {
            // 3. Fallback (Desktop)
            pdf.save(filename); // Auto download
            const msg = `Hola ${nombre.value || "Cliente"}, te envío el presupuesto #${data.numero}. (El archivo se ha descargado en tu dispositivo).`;
            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank");
            toast("PDF descargado. Abriendo WhatsApp...", "success");
          }
        } catch (e) {
          console.error(e);
          toast("No se pudo compartir el PDF", "error");
        }
      });
    }
    if (shareMailBtn) {
      shareMailBtn.addEventListener("click", () => {
        const mail = email ? email.value : "";
        if (!mail) { toast("Ingresá un email", "warning"); return; }
        const subject = `Presupuesto ${numInput.value || ""} - ${CFG_SETTINGS?.brandName || "Microbollos"}`;
        const body = `Hola ${nombre.value || "Cliente"},\n\nAdjunto el detalle de su presupuesto.\nTotal: ${totalEl.textContent}\n\nSaludos,\n${CFG_SETTINGS?.brandName || ""}`;
        window.open(`mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
      });
    }

    // === Cargar presupuesto para editar (si venís desde "Presupuestos")
    (async function loadEditIfAny() {
      const editKey = sessionStorage.getItem("editBudgetKey");
      if (!editKey) return;

      sessionStorage.removeItem("editBudgetKey");
      const b = await budgetsService.get(editKey);
      if (!b) { toast("No se encontró el presupuesto para editar", "error"); return; }

      isEditing = true;
      currentBudgetKey = editKey;

      // Sucursal y número (conservar número original)
      if (b.sucursal) selSucursal.value = b.sucursal;
      // refrescar opciones por si no existen aún
      paintBranchesIntoSelect(b.sucursal);
      if (b.numero) {
        numInput.value = b.numero;
      } else {
        numInput.value = selSucursal.value ? await budgetsService.previewNextNumber(selSucursal.value) : "";
      }
      dateInput.value = (b.fecha || todayISO()).slice(0, 10);

      // Estado y usuario asignado
      if (b.estado && selStatus) selStatus.value = b.estado;
      if (b.assignedUser && selUser) selUser.value = b.assignedUser;
      if (typeof budgetDone !== 'undefined' && budgetDone) budgetDone.checked = !!b.done;

      // Cliente / vehículo
      selectedClientId = b.cliente?.idCliente || null;
      selectedVehicleId = b.cliente?.idVehiculo || null;

      nombre.value = b.cliente?.nombre || "";
      telefono.value = b.cliente?.telefono || "";
      vehiculo.value = b.cliente?.vehiculo || "";
      patente.value = b.cliente?.patente || "";
      modelo.value = b.cliente?.modelo || "";
      compania.value = b.cliente?.compania || "";
      chasis.value = b.cliente?.chasis || "";

      // Ítems
      itemsBody.innerHTML = "";
      (b.items || []).forEach(it => {
        const cantidad = parseFloat(String(it.cantidad || "1").replace(",", ".")) || 1;
        const unit = typeof it.unit === "number"
          ? it.unit
          : parseFloat(String(it.precio ?? it.unit ?? "0").replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
        const total = typeof it.total === "number"
          ? it.total
          : parseFloat(String(it.total || "0").replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
        appendRow({
          cantidad,
          descripcion: it.descripcion || "-",
          unit: isNaN(unit) ? 0 : unit,
          total: isNaN(total) ? cantidad * (isNaN(unit) ? 0 : unit) : total
        });
      });

      updateTotals();
      toast(`Editando ${b.numero}`, "info");
    })();
  }
};
