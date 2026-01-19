// frontend/js/pages/SavedBudgets.js
// Presupuestos guardados (Vanilla + Tailwind) — INTEGRADO con Configuración
// - Lee sucursales y ajustes (moneda/locale/decimales/datos empresa) desde cfg_* y reacciona a eventos cfg:*
// - Lista + búsqueda + filtros por sucursal y período
// - Ver detalles (modal) + Imprimir simple
// - Editar (reabrir en módulo Presupuesto) + Eliminar
// - PDF (si window.generateBudgetPDF existe) + Exportar Excel (si XLSX existe)
// - Estética dark + stats con gradientes sobrios; selects desplegados legibles

// ====== Vínculo con Configuración (snapshot inicial) ======
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(d)); } catch { return d; } };

let CFG_SETTINGS = (window.CFG?.getSettings?.() || ls("cfg_settings", {}));
let CFG_BRANCHES = (window.CFG?.getBranches?.() || ls("cfg_branches", []));

// moneda/locale/decimales dinámicos desde Ajustes
let CURRENCY = CFG_SETTINGS?.currency || "ARS";
let LOCALE = CFG_SETTINGS?.locale || "es-AR";
let DECIMALS = Number.isInteger(CFG_SETTINGS?.decimals) ? CFG_SETTINGS.decimals : 2;

const money = (n) => (Number(n) || 0).toLocaleString(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: DECIMALS,
  maximumFractionDigits: DECIMALS
});

const parseMoney = (text) => {
  if (typeof text === "number") return text;
  const t = String(text || "0")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:[^\d]|$))/g, "") // saca miles tipo 1.234,56
    .replace(",", ".");
  const v = parseFloat(t);
  return isNaN(v) ? 0 : v;
};

const toDMY = (iso) => {
  const d = new Date((iso || "").slice(0, 10) + "T00:00:00");
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

import budgetsService from "../services/budgets.js";

const daysFrom = (iso) => {
  const d = new Date((iso || "").slice(0, 10) + "T00:00:00");
  const t = new Date();
  return Math.floor((t - d) / (1000 * 60 * 60 * 24));
};

function toast(msg, type = "info") {
  const bg = type === "error" ? "bg-rose-600" : type === "success" ? "bg-emerald-600" : "bg-sky-700";
  const el = document.createElement("div");
  el.className = `fixed top-4 right-4 z-[4000] px-4 py-3 rounded-xl text-white shadow-2xl ${bg}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(12px)"; setTimeout(() => el.remove(), 180); }, 2400);
}

// Helpers sucursales / empresa
const getBranchName = (id) => {
  const b = (CFG_BRANCHES || []).find(x => x.id === id);
  return b ? `${b.name} (${b.address || "S/Dir"})` : (id || "-");
};
const getCompany = () => ({
  companyName: CFG_SETTINGS?.companyName || "",
  brandName: CFG_SETTINGS?.brandName || "",
  address: CFG_SETTINGS?.address || "",
  phone: CFG_SETTINGS?.phone || "",
  email: CFG_SETTINGS?.email || ""
});

export default {
  render() {
    return /*html*/ `
<section data-page="saved-budgets" class="space-y-4">
  <style>
    /* Onda dark sobria + legibilidad de selects al desplegar */
  [data-page="saved-budgets"] .glass{ background:var(--bg-glass); backdrop-filter:var(--glass-blur); }
  [data-page="saved-budgets"] .stat{ position:relative; overflow:hidden; border:1px solid var(--border-main); }
  [data-page="saved-budgets"] .stat .k{ font-size:.80rem; color:var(--text-secondary) }
    [data-page="saved-budgets"] .stat .v{ font-size:1.25rem; font-weight:700 }
    /* Gradientes sobrios */
    [data-page="saved-budgets"] .g-purple{ background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(99,102,241,.08)); }
    [data-page="saved-budgets"] .g-green { background:linear-gradient(135deg,rgba(16,185,129,.18),rgba(16,185,129,.08)); }
    [data-page="saved-budgets"] .g-pink  { background:linear-gradient(135deg,rgba(236,72,153,.18),rgba(236,72,153,.08)); }
    [data-page="saved-budgets"] .g-cyan  { background:linear-gradient(135deg,rgba(6,182,212,.18),rgba(6,182,212,.08)); }
    /* Tabla */
  [data-page="saved-budgets"] .table-wrap{ border:1px solid var(--border-main); overflow-x: auto; }
    [data-page="saved-budgets"] .table th{ font-weight:600; color:#cbd5e1; white-space:nowrap; }
    [data-page="saved-budgets"] .table td, .table th{ padding:.6rem .75rem; border-bottom:1px solid rgba(255,255,255,.06) }
    /* Badges estado */
    [data-page="saved-budgets"] .badge{ font-size:.72rem; padding:.20rem .5rem; border-radius:.5rem }
        const res = budgetsService.save(data, wasEditing ? currentBudgetKey : null, { update: !!wasEditing });
    [data-page="saved-budgets"] .status-expired{ background:#dc262633; color:#fca5a5 }
    /* Modal */
    [data-page="saved-budgets"] .modal{ background:rgba(0,0,0,.6) }
    /* Fix: opciones de <select> no se veían */
    [data-page="saved-budgets"] select option{
      color:#e2e8f0;                 /* slate-200 */
      background-color:#0b1220;      /* deep slate bg */
    }
  </style>

  <h1 class="text-2xl font-semibold">Presupuestos guardados</h1>

  <!-- Stats con gradientes sobrios -->
  <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
    <div class="stat g-purple rounded-xl p-4 flex items-center gap-3">
      <div class="text-xl"><i class="fas fa-file-alt" aria-hidden="true"></i></div>
      <div><div class="k">Total Presupuestos</div><div id="stat-total" class="v">0</div></div>
    </div>
    <div class="stat g-green rounded-xl p-4 flex items-center gap-3">
      <div class="text-xl"><i class="fas fa-calendar-alt" aria-hidden="true"></i></div>
      <div><div class="k">Hoy</div><div id="stat-today" class="v">0</div></div>
    </div>
    <div class="stat g-pink rounded-xl p-4 flex items-center gap-3">
      <div class="text-xl"><i class="fas fa-money-bill-wave" aria-hidden="true"></i></div>
      <div><div class="k">Monto Total</div><div id="stat-amount" class="v">$0,00</div></div>
    </div>
    <div class="stat g-cyan rounded-xl p-4 flex items-center gap-3">
      <div class="text-xl"><i class="fas fa-building" aria-hidden="true"></i></div>
      <div><div class="k">Presupuestos hechos</div><div id="stat-done" class="v">0</div></div>
    </div>
    <div class="stat g-cyan rounded-xl p-4 flex items-center gap-3">
      <div class="text-xl"><i class="fas fa-clock" aria-hidden="true"></i></div>
      <div><div class="k">Presupuestos pendientes</div><div id="stat-pending" class="v">0</div></div>
    </div>
  </div>

  <!-- Filtros -->
  <div class="glass rounded-xl p-3 flex flex-wrap gap-2 items-center">
    <label class="relative flex-1 min-w-[220px]">
      <span class="absolute left-3 top-2.5 text-slate-400"><i class="fas fa-search" aria-hidden="true"></i></span>
      <input id="q" placeholder="Buscar por número, cliente o vehículo..." class="w-full h-10 pl-9 pr-3 rounded bg-white/10 border border-white/10">
    </label>
    <label class="relative z-50">
      <select id="branch" class="h-10 px-3 rounded bg-white/10 border border-white/10 text-slate-100">
        <option value="">Todas las sucursales</option>
      </select>
    </label>
    <label class="relative z-50">
      <select id="period" class="h-10 px-3 rounded bg-white/10 border border-white/10 text-slate-100">
        <option value="" selected>Todas las fechas</option>
        <option value="today">Hoy</option>
        <option value="week">Esta semana</option>
        <option value="month">Este mes</option>
      </select>
    </label>
  <button id="export-xlsx" class="h-10 px-3 rounded bg-emerald-600/80 hover:bg-emerald-600 hidden"><i class="fas fa-file-excel" aria-hidden="true"></i> Exportar Excel</button>
  </div>

  <!-- Paginación -->
  <div id="pagination" class="flex items-center gap-2 text-sm"></div>

  <!-- Tabla -->
  <div class="table-wrap glass rounded-xl overflow-hidden">
    <table class="table w-full text-sm">
      <thead class="bg-white/5">
        <tr>
          <th>Número</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Vehículo</th>
          <th>Sucursal</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>

  <!-- Empty state -->
  <div id="empty" class="glass rounded-xl p-10 text-center hidden">
  <div class="text-3xl opacity-70"><i class="fas fa-inbox" aria-hidden="true"></i></div>
    <div class="mt-2 text-lg font-medium">No hay presupuestos guardados</div>
    <div class="text-slate-400 text-sm">Los presupuestos que crees aparecerán aquí para que puedas gestionarlos.</div>
  <a href="#/presupuesto" class="inline-flex items-center gap-2 mt-4 px-4 h-10 rounded bg-indigo-600/80 hover:bg-indigo-600"><i class="fas fa-plus" aria-hidden="true"></i> Crear primer presupuesto</a>
  </div>

  <!-- Modal Detalle -->
  <div id="detail-modal" class="fixed inset-0 z-[1000] hidden items-center justify-center modal">
    <div class="bg-slate-900 border border-white/10 rounded-xl w-[min(92vw,980px)] max-h-[86vh] overflow-auto">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
        <h2 class="text-lg font-semibold"><i class="fas fa-eye" aria-hidden="true"></i> Detalles del Presupuesto</h2>
        <div class="flex gap-2">
          <button id="modal-print" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-print" aria-hidden="true"></i> Imprimir</button>
          <button id="modal-pdf" class="px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-600 hidden"><i class="fas fa-download" aria-hidden="true"></i> PDF</button>
          <button id="modal-close" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
        </div>
      </div>
      <div id="detail-body" class="p-4 space-y-5"></div>
    </div>
  </div>
</section>
    `;
  },

  mount(root) {
    // Refs
    const statTotal = root.querySelector("#stat-total");
    const statToday = root.querySelector("#stat-today");
    const statAmount = root.querySelector("#stat-amount");
    const statDone = root.querySelector("#stat-done");
    const statPending = root.querySelector("#stat-pending");

    const q = root.querySelector("#q");
    const branch = root.querySelector("#branch");
    const period = root.querySelector("#period");
    const exportBtn = root.querySelector("#export-xlsx");

    const rows = root.querySelector("#rows");
    const empty = root.querySelector("#empty");

    const modal = root.querySelector("#detail-modal");
    const modalBody = root.querySelector("#detail-body");
    const modalClose = root.querySelector("#modal-close");
    const modalPrint = root.querySelector("#modal-print");
    const modalPdf = root.querySelector("#modal-pdf");

    // Estado
    let all = [];         // lista con { numero, sucursal, fecha, cliente, total, key, details? }
    let filtered = [];    // vista filtrada
    let current = null;   // presupuesto abierto en modal
    // Paginación
    let currentPage = 1;
    let pageSize = 10; // muestras por página por defecto
    const pageSizeOptions = [10, 15, 25];

    // Pinta opciones sucursales
    function paintBranchesFilter(keep = null) {
      const prev = keep ?? branch.value;
      branch.innerHTML = `<option value="">Todas las sucursales</option>` +
        (CFG_BRANCHES || []).map(b => `<option value="${b.id}">${b.name || b.address || b.id}</option>`).join("");
      branch.value = (CFG_BRANCHES || []).some(b => b.id === prev) ? prev : "";
    }
    paintBranchesFilter();

    // Reaccionar a cambios desde Configuración
    document.addEventListener("cfg:branches-updated", (e) => {
      CFG_BRANCHES = e.detail?.branches || [];
      paintBranchesFilter();
      renderTable(); // refresca nombres de sucursal
    });
    document.addEventListener("cfg:settings-updated", (e) => {
      CFG_SETTINGS = e.detail?.settings || CFG_SETTINGS;
      CURRENCY = CFG_SETTINGS.currency || CURRENCY;
      LOCALE = CFG_SETTINGS.locale || LOCALE;
      DECIMALS = Number.isInteger(CFG_SETTINGS.decimals) ? CFG_SETTINGS.decimals : DECIMALS;
      renderStats();
      renderTable();
      toast("Ajustes aplicados en Presupuestos guardados ✅", "success");
    });

    // Escuchar eventos de actualización de presupuestos (emitidos por Presupuesto.js)
    document.addEventListener("budgets:updated", (e) => {
      try {
        // recargar desde localStorage y refrescar vista
        load();
        refresh();
        toast("Lista de presupuestos actualizada", "success");
      } catch (err) {
        console.debug("budgets:updated handler error", err);
      }
    });

    // También reacciona a eventos storage (otras pestañas/navegadores)
    window.addEventListener("storage", (e) => {
      try {
        if (!e.key) return;
        if (e.key === "budgets_list" || e.key.startsWith("budget_")) {
          load(); refresh();
        }
      } catch (err) { console.debug("storage handler error", err); }
    });

    // Init
    if (window.XLSX) exportBtn.classList.remove("hidden");
    load(); // Async call, fire and forget for init (refresh will be called when done)

    // === Carga ===
    async function load() {
      // Usar el servicio centralizado para obtener la lista (incluye details)
      try {
        // Parallel load: Budgets + Branches (to ensure names/addresses are up to date)
        const [list, branches] = await Promise.all([
          budgetsService.list(),
          fetch("/api/branches").then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        if (branches.length) CFG_BRANCHES = branches; // Update local cache

        all = list.map(s => ({ ...s, details: s }));
      } catch (e) {
        console.error("Error loading budgets", e);
        all = [];
      }
      paintBranchesFilter(); // Refresh filter options with new branches
      filtered = [...all];
      refresh();
    }

    // === Stats + Tabla/Empty ===
    function refresh() {
      renderStats();
      applyFilters();
      renderTable();
      renderEmptyState();
    }
    function renderStats() {
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayCount = all.filter(b => b.fecha === todayISO).length;
      const totalAmount = all.reduce((acc, b) => acc + parseMoney(b.total), 0);
      const branches = new Set(all.map(b => b.sucursal)).size;

      statTotal.textContent = all.length;
      statToday.textContent = todayCount;
      statAmount.textContent = money(totalAmount);
      // cantidad hechos / pendientes
      const doneCount = all.filter(b => (b.details && b.details.done)).length;
      statDone.textContent = doneCount;
      statPending.textContent = Math.max(0, all.length - doneCount);
    }
    function renderEmptyState() {
      if (!filtered.length) { empty.classList.remove("hidden"); }
      else { empty.classList.add("hidden"); }
    }
    function applyFilters() {
      const term = (q.value || "").toLowerCase().trim();
      const br = branch.value;
      const per = period.value;

      filtered = all.filter(b => {
        // búsqueda por número, cliente o vehículo
        const vehInfo = vehicleInfo(b);
        const matchesTerm =
          !term ||
          (b.numero || "").toLowerCase().includes(term) ||
          (b.cliente || "").toLowerCase().includes(term) ||
          vehInfo.toLowerCase().includes(term);

        // sucursal
        const matchesBranch = !br || b.sucursal === br;

        // período
        let matchesPeriod = true;
        if (per) {
          const bd = new Date(b.fecha.slice(0, 10) + "T00:00:00");
          const now = new Date();
          if (per === "today") {
            matchesPeriod = bd.toDateString() === now.toDateString();
          } else if (per === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesPeriod = bd >= weekAgo;
          } else if (per === "month") {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesPeriod = bd >= first;
          }
        }

        return matchesTerm && matchesBranch && matchesPeriod;
      });
      // reset paginación al cambiar filtros
      currentPage = 1;
    }
    function renderTable() {
      // paginar la vista filtrada
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);
      rows.innerHTML = pageItems.map(rowTpl).join("");
      renderPagination();
    }

    function renderPagination() {
      const pagination = root.querySelector('#pagination');
      if (!pagination) return;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const end = Math.min(total, currentPage * pageSize);
      // build HTML
      pagination.innerHTML = `
        <div class="flex items-center gap-3 w-full">
          <div class="flex items-center gap-2">
            <button id="pg-prev" class="px-3 py-1 rounded bg-white/5" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left" aria-hidden="true"></i> Anterior</button>
            <button id="pg-next" class="px-3 py-1 rounded bg-white/5" ${currentPage >= totalPages ? 'disabled' : ''}>Siguiente <i class="fas fa-chevron-right" aria-hidden="true"></i></button>
          </div>
          <div class="text-sm text-slate-400">${start} - ${end} de ${total}</div>
          <div class="ml-auto flex items-center gap-2">
            <label class="text-sm text-slate-400">Por página:</label>
            <select id="pg-size" class="h-8 px-2 rounded bg-white/5">
              ${pageSizeOptions.map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
      // attach listeners
      const prev = pagination.querySelector('#pg-prev');
      const next = pagination.querySelector('#pg-next');
      const sizeSel = pagination.querySelector('#pg-size');
      if (prev) prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); renderEmptyState(); } });
      if (next) next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderTable(); renderEmptyState(); } });
      if (sizeSel) sizeSel.addEventListener('change', (e) => { pageSize = Number(e.target.value) || 10; currentPage = 1; renderTable(); renderEmptyState(); });
    }
    function rowTpl(b) {
      const dd = daysFrom(b.fecha);
      const expired = dd > 30;
      const sucName = getBranchName(b.sucursal);
      return `
        <tr class="hover:bg-white/5">
          <td class="font-medium">${b.numero}</td>
          <td>${toDMY(b.fecha)}</td>
          <td class="max-w-[240px] truncate">${b.cliente?.nombre || b.cliente || "Sin especificar"}</td>
          <td class="max-w-[260px] truncate">${vehicleInfo(b)}</td>
          <td>${sucName}</td>
          <td class="font-medium">${b.total}</td>
          <td>${b.details?.done ? `<span class="badge status-active">Hecho</span>` : `<span class="badge ${expired ? "status-expired" : "status-active"}">${expired ? "Vencido" : "Vigente"}</span>`}</td>
          <td class="whitespace-nowrap">
            <button data-act="view" data-key="${b.key}" class="px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Ver"><i class="fas fa-eye" aria-hidden="true"></i></button>
            <button data-act="toggle" data-key="${b.key}" class="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 mx-1" title="Marcar hecho"><i class="fas fa-check" aria-hidden="true"></i></button>
            <button data-act="edit" data-key="${b.key}" class="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
            <button data-act="del" data-key="${b.key}" data-num="${b.numero}" class="px-2 py-1 rounded bg-rose-700/80 hover:bg-rose-700" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </td>
        </tr>
      `;
    }
    function vehicleInfo(b) {
      const c = b.details?.cliente || b.cliente || {};
      const v = c.vehiculo || "";
      const m = c.modelo || "";
      const p = c.patente || "";
      const parts = [v, m, p].filter(Boolean);
      return parts.length ? parts.join(" - ") : "No especificado";
    }

    // === Eventos Filtros ===
    q.addEventListener("input", () => { applyFilters(); renderTable(); renderEmptyState(); });
    branch.addEventListener("change", () => { applyFilters(); renderTable(); renderEmptyState(); });
    period.addEventListener("change", () => { applyFilters(); renderTable(); renderEmptyState(); });

    // === Delegación acciones fila ===
    rows.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const act = btn.dataset.act; const key = btn.dataset.key; const num = btn.dataset.num;

      if (act === "view") openDetail(key);
      if (act === "edit") editBudget(key);
      if (act === "toggle") toggleDone(key);
      if (act === "print") printBudget(key);
      if (act === "del") deleteBudget(key, num);
    });

    async function toggleDone(key) {
      const b = await budgetsService.get(key);
      if (!b) { toast("No se encontró el presupuesto", "error"); return; }
      b.done = !b.done;
      await budgetsService.save(b, key, { update: true });
      load(); // refresh
      toast(`Presupuesto ${b.numero} marcado ${b.done ? 'como hecho' : 'como pendiente'}`, "success");
    }

    // === Modal ===
    async function openDetail(key) {
      const budget = await budgetsService.get(key);
      if (!budget) { toast("No se encontró el presupuesto", "error"); return; }
      current = budget;
      modalBody.innerHTML = renderDetail(budget);
      // PDF botón visible solo si existe el generador
      if (typeof window.generateBudgetPDF === "function") modalPdf.classList.remove("hidden");
      else modalPdf.classList.add("hidden");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
    function closeDetail() { modal.classList.add("hidden"); modal.classList.remove("flex"); current = null; }
    modalClose.addEventListener("click", closeDetail);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeDetail(); });
    if (modalPrint) modalPrint.addEventListener("click", () => { if (current) simplePrint(current); });
    if (modalPdf) modalPdf.addEventListener("click", async () => {
      if (!current) return;
      try {
        const data = normalizeForPdf(current);
        const pdf = await window.generateBudgetPDF?.(data);
        if (pdf) {
          const clean = (data.numero || "SIN").replace(/[^\w\d]/g, "-");
          pdf.save(`Presupuesto-${clean}.pdf`);
        }
      } catch (e) { console.error(e); toast("No se pudo generar el PDF", "error"); }
    });

    function renderDetail(b) {
      const sucName = getBranchName(b.sucursal);
      const c = b.cliente || {};
      const items = (b.items || []);
      const totalNum = items.reduce((s, it) => s + (parseMoney(it.total)), 0);
      const dd = daysFrom(b.fecha);
      const expired = dd > 30;
      const status = expired ? `Vencido (${dd} días)` : `Vigente (${Math.max(0, 30 - dd)} días restantes)`;

      return `
        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-1">Información general</div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            <div><div class="text-slate-400">Número</div><div class="font-semibold">${b.numero}</div></div>
            <div><div class="text-slate-400">Fecha</div><div>${toDMY(b.fecha)}</div></div>
            <div><div class="text-slate-400">Sucursal</div><div>${sucName}</div></div>
            <div><div class="text-slate-400">Estado</div><div class="${expired ? 'text-rose-400' : 'text-emerald-400'} font-medium">${status}</div></div>
            <div><div class="text-slate-400">Hecho</div><div class="font-medium">${b.done ? 'Sí' : 'No'}</div></div>
            <div><div class="text-slate-400">Subtotal</div><div>${b.subtotal || money(totalNum)}</div></div>
            <div><div class="text-slate-400">Total</div><div class="font-semibold">${b.total || money(totalNum)}</div></div>
          </div>
        </div>

        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-1">Datos del cliente</div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            <div><div class="text-slate-400">Nombre</div><div>${c.nombre || "-"}</div></div>
            <div><div class="text-slate-400">Teléfono</div><div>${c.telefono || "-"}</div></div>
            <div><div class="text-slate-400">Vehículo</div><div>${c.vehiculo || "-"}</div></div>
            <div><div class="text-slate-400">Patente</div><div>${c.patente || "-"}</div></div>
            <div><div class="text-slate-400">Modelo</div><div>${c.modelo || "-"}</div></div>
            <div><div class="text-slate-400">Compañía de seguro</div><div>${c.compania || "-"}</div></div>
          </div>
        </div>

        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-2">Ítems</div>
          <div class="overflow-auto rounded border border-white/10">
            <table class="w-full text-sm">
              <thead class="bg-white/5">
                <tr>
                  <th class="text-left px-3 py-2 w-20">Cant.</th>
                  <th class="text-left px-3 py-2">Descripción</th>
                  <th class="text-right px-3 py-2 w-40">Precio Unit.</th>
                  <th class="text-right px-3 py-2 w-40">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.length
          ? items.map(it => `
                        <tr>
                          <td class="px-3 py-2">${it.cantidad ?? "-"}</td>
                          <td class="px-3 py-2">${it.descripcion ?? "-"}</td>
                          <td class="px-3 py-2 text-right">${it.precio ?? (it.unit ? money(it.unit) : "-")}</td>
                          <td class="px-3 py-2 text-right">${it.total ?? "-"}</td>
                        </tr>
                      `).join("")
          : `<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">No hay ítems</td></tr>`
        }
              </tbody>
              <tfoot class="bg-white/5">
                <tr>
                  <td colspan="3" class="px-3 py-2 text-right font-medium">TOTAL</td>
                  <td class="px-3 py-2 text-right font-semibold">${b.total || money(totalNum)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    // === Acciones ===
    function editBudget(key) {
      try { sessionStorage.setItem("editBudgetKey", key); } catch { }
      location.hash = "#/presupuesto"; // ajustá si tu router usa otra ruta
    }

    async function printBudget(key) {
      const b = await budgetsService.get(key);
      if (!b) return toast("No se encontró el presupuesto", "error");
      simplePrint(b);
    }

    async function deleteBudget(key, numero) {
      if (!confirm(`¿Eliminar el presupuesto ${numero}? Esta acción no se puede deshacer.`)) return;
      await budgetsService.remove(key);
      await load();
      toast(`Presupuesto ${numero} eliminado ✅`, "success");
    }

    // === Utilidades impresión & PDF ===
    function simplePrint(b) {
      const c = b.cliente || {};
      const items = b.items || [];
      const comp = getCompany();
      const brand = (comp.brandName || comp.companyName || "Presupuesto");
      const html = `
        <html><head><title>${b.numero}</title>
        <meta charset="utf-8" />
        <style>
          body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:24px}
          h1{margin:0 0 6px 0} .muted{color:#555}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          th,td{border:1px solid #ddd;padding:8px;text-align:left}
          th{background:#f2f2f2}
          .right{text-align:right}
        </style></head><body>
        <h1>${brand}</h1>
        <div class="muted">Presupuesto</div>
        <hr>
        <p><strong>Número:</strong> ${b.numero} &nbsp; | &nbsp; <strong>Fecha:</strong> ${toDMY(b.fecha)}</p>
        <p><strong>Sucursal:</strong> ${getBranchName(b.sucursal)}</p>
        <h3>Cliente</h3>
        <p>
          <strong>Nombre:</strong> ${c.nombre || "-"}<br>
          <strong>Teléfono:</strong> ${c.telefono || "-"}<br>
          <strong>Vehículo:</strong> ${c.vehiculo || "-"} &nbsp; <strong>Patente:</strong> ${c.patente || "-"}
        </p>
        <h3>Ítems</h3>
        <table>
          <thead><tr><th>Cant.</th><th>Descripción</th><th class="right">Precio Unit.</th><th class="right">Total</th></tr></thead>
          <tbody>
            ${items.length
          ? items.map(it => `<tr><td>${it.cantidad ?? "-"}</td><td>${it.descripcion ?? "-"}</td><td class="right">${it.precio ?? (it.unit ? money(it.unit) : "-")}</td><td class="right">${it.total ?? "-"}</td></tr>`).join("")
          : `<tr><td colspan="4" class="right">Sin ítems</td></tr>`
        }
          </tbody>
          <tfoot><tr><td colspan="3" class="right"><strong>TOTAL</strong></td><td class="right"><strong>${b.total || "-"}</strong></td></tr></tfoot>
        </table>
        </body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html); w.document.close(); w.focus(); w.print();
    }

    function normalizeForPdf(b) {
      // Convierte al formato que espera generateBudgetPDF del módulo Presupuesto
      const subtotalNum = (b.items || []).reduce((s, it) => s + (parseMoney(it.total)), 0);
      return {
        numero: b.numero || "",
        fecha: (b.fecha || new Date().toISOString().slice(0, 10)),
        sucursalId: b.sucursal || "",
        sucursalNombre: getBranchName(b.sucursal),
        cliente: {
          nombre: b.cliente?.nombre || "",
          telefono: b.cliente?.telefono || "",
          vehiculo: b.cliente?.vehiculo || "",
          patente: b.cliente?.patente || "",
          modelo: b.cliente?.modelo || "",
          compania: b.cliente?.compania || "",
          chasis: b.cliente?.chasis || ""
        },
        items: (b.items || []).map(x => ({
          cantidad: Number(x.cantidad) || 1,
          descripcion: x.descripcion || "-",
          unit: parseMoney(x.unit ?? x.precio),
          total: parseMoney(x.total)
        })),
        subtotal: subtotalNum,
        total: subtotalNum,
        firmaDataUrl: localStorage.getItem("digital_signature") || null,
        company: { ...getCompany(), logoData: CFG_SETTINGS.logoData },
        taxRate: CFG_SETTINGS.taxRate || 0,
        taxAmount: (subtotalNum * (CFG_SETTINGS.taxRate || 0)) / 100, // naive tax calc for display if needed
        total: subtotalNum * (1 + (CFG_SETTINGS.taxRate || 0) / 100), // simplistic logic, budget might save its own total though
        sucursalCuit: (CFG_BRANCHES || []).find(b => b.id === b.sucursal)?.cuit || ""
      };
      // Important: Use saved total if available to avoid recalc diffs
      if (b.total) ret.total = parseMoney(b.total);
      return ret;
    }

    // === Exportar Excel (si XLSX existe) ===
    exportBtn.addEventListener("click", () => {
      if (!window.XLSX) return;
      const data = filtered.map(b => ({
        "Número": b.numero,
        "Fecha": toDMY(b.fecha),
        "Cliente": b.cliente?.nombre || b.cliente || "Sin nombre",
        "Vehículo": vehicleInfo(b),
        "Sucursal": getBranchName(b.sucursal),
        "Total": b.total,
        "Estado": daysFrom(b.fecha) > 30 ? "Vencido" : "Vigente"
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 26 }, { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Presupuestos");
      const f = `Presupuestos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, f);
      toast(`Excel "${f}" exportado ✅`, "success");
    });
  }
};
