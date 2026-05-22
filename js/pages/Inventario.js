// Helper para cargar datos de localStorage
function load(key, def) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } }
// ./pages/Inventario.js
// Inventario con solapas: Insumos + Proveedores (CRUD completo) + Lista de compra + Envíos + KPIs
// ✅ Insumos independientes de Proveedores (supplierId opcional)
// ✅ Sin colisiones de nombres en <form> (usamos form.elements y campos ocultos iid/sid)
// ✅ Forzamos pestaña "Insumos" al guardar/importar y repintamos
// ✅ FIX TDZ: viewItems se declara ANTES de usar refreshItems()
// ✅ Lista de compra completa: marcar 🛒, editar cantidad/nota, limpiar, WhatsApp/Email por proveedor
// ✅ FIXES técnicos:
//    - Se cablea el botón "Enviar a proveedores" (abrir modal con mensajes por proveedor)
//    - Se cablea "Limpiar" lista de compra
//    - Se agrega delegación de eventos para editar qty/nota y eliminar líneas de la lista de compra
//    - Se restaura la pestaña activa desde localStorage (si existe), pero se fuerza "Insumos" al guardar/importar
//    - Se actualizan KPIs al modificar lista de compra

const INV_ACTIVE_TAB = "inv_active_tab";
const INV_LIST_KEY = "inv_buy_list";
const INV_ITEMS_KEY = "inv_items";
const INV_SUPPLIERS_KEY = "inv_suppliers";

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
const ARS = { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 };
const money = (n) => (Number(n) || 0).toLocaleString("es-AR", ARS);
const todayISO = () => new Date().toISOString().slice(0, 10);
const rid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

import store from "../store.js";

function toast(msg, type = "info") {
  const bg = type === "error" ? "bg-rose-600" : type === "success" ? "bg-emerald-600" : "bg-sky-700";
  const el = document.createElement("div");
  el.className = `fixed top-4 right-4 z-[4000] px-3 py-2 rounded-lg text-white shadow-2xl text-xs ${bg}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(10px)"; setTimeout(() => el.remove(), 150); }, 1900);
}

function parseNum(v) {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export default {
  render() {
    return /*html*/`
<section data-page="inventory" class="space-y-6 text-[13px]">
  <style>
    /* ===== Respaldo sin Tailwind ===== */
    [data-page="inventory"] .hidden{display:none!important} [data-page="inventory"] .flex{display:flex!important}
  [data-page="inventory"] .glass{background:var(--bg-glass);backdrop-filter:var(--glass-blur)}
  [data-page="inventory"] .card{border:1px solid var(--border-main);border-radius:.6rem}
  [data-page="inventory"] .k{font-size:.74rem;color:var(--text-secondary)} [data-page="inventory"] .v{font-size:1.06rem;font-weight:700}
  [data-page="inventory"] .ctrl,[data-page="inventory"] .btn{height:36px;line-height:34px;font-size:12.5px}
  [data-page="inventory"] .btn{display:inline-flex;align-items:center;gap:.4rem;padding:0 .7rem;border-radius:.45rem;border:1px solid var(--border-main);background:rgba(255,255,255,.08);cursor:pointer}
  [data-page="inventory"] .btn:hover{background:rgba(255,255,255,.14)}
  [data-page="inventory"] .btn-primary{background:rgba(16,185,129,.86);border-color:transparent} .btn-primary:hover{background:rgba(16,185,129,1)}
  [data-page="inventory"] .btn-indigo{background:rgba(99,102,241,.86);border-color:transparent} .btn-indigo:hover{background:rgba(99,102,241,1)}
  [data-page="inventory"] .btn-rose{background:rgba(244,63,94,.86);border-color:transparent} .btn-rose:hover{background:rgba(244,63,94,1)}
  [data-page="inventory"] .tab{padding:.45rem .7rem;border-radius:.5rem;border:1px solid var(--border-main);background:rgba(255,255,255,.05);cursor:pointer}
  [data-page="inventory"] .tab.active{background:rgba(99,102,241,.9);border-color:transparent}
  [data-page="inventory"] .pill{font-size:.7rem;padding:.12rem .45rem;border-radius:.45rem;background:var(--bg-main);border:1px solid var(--border-main)}
  [data-page="inventory"] .table-wrap{border:1px solid var(--border-main);border-radius:.5rem;overflow:hidden}
  [data-page="inventory"] .table td,.table th{padding:.45rem .6rem;border-bottom:1px solid var(--border-main)} th{font-weight:600;color:var(--text-secondary);white-space:nowrap}
  [data-page="inventory"] select option{color:var(--text-main);background-color:var(--bg-main)}
  [data-page="inventory"] .status-ok{color:#86efac;background:#16a34a33} [data-page="inventory"] .status-low{color:#fca5a5;background:#dc262633}
  [data-page="inventory"] .mini-btn{height:26px;line-height:24px;padding:0 .45rem;border-radius:.35rem}
    /* anclas mini para WhatsApp/Email */
    [data-page="inventory"] .mini{height:26px;line-height:24px;padding:0 .45rem;border-radius:.35rem}
    [data-page="inventory"] textarea{width:100%;min-height:120px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);border-radius:.45rem;padding:.5rem;color:#e2e8f0}
  </style>

  <div class="flex items-center justify-between">
    <h1 class="text-[18px] font-semibold leading-none">Inventario</h1>
      <div class="flex gap-2">
      <button id="tab-items" class="tab"><i class="fas fa-box" aria-hidden="true"></i> Insumos</button>
      <button id="tab-suppliers" class="tab"><i class="fas fa-tags" aria-hidden="true"></i> Proveedores</button>
    </div>
  </div>

  <!-- Barra acciones común (sólo Insumos usa filtros) -->
  <div class="flex flex-wrap items-center gap-2">
    <label class="relative">
      <span class="absolute left-2 top-2 text-slate-400"><i class="fas fa-search" aria-hidden="true"></i></span>
      <input id="q" placeholder="Buscar insumo o categoría..." class="ctrl pl-8 pr-2 rounded bg-white/10 border border-white/10">
    </label>
    <select id="filter-supplier" class="ctrl px-2.5 rounded bg-white/10 border border-white/10 text-slate-100">
      <option value="">Todos los proveedores</option>
    </select>
    <select id="filter-status" class="ctrl px-2.5 rounded bg-white/10 border border-white/10 text-slate-100">
      <option value="">Estado</option>
      <option value="low">Faltantes</option>
      <option value="ok">En stock</option>
    </select>
    <button id="btn-add-item" class="btn btn-primary" type="button"><i class="fas fa-plus" aria-hidden="true"></i> Insumo</button>
    <button id="btn-add-supp" class="btn btn-indigo" type="button"><i class="fas fa-tags" aria-hidden="true"></i> Proveedor</button>
    <button id="btn-export" class="btn" type="button"><i class="fas fa-file-export" aria-hidden="true"></i> Exportar</button>
    <label class="btn">
      <i class="fas fa-file-import" aria-hidden="true"></i> Importar
      <input id="import-file" type="file" accept=".json" class="hidden">
    </label>
  </div>

  <!-- KPIs (Insumos) -->
  <div id="kpis" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
  ${kpi("<i class='fas fa-box' aria-hidden='true'></i>", "Insumos", "kpi-count")}
  ${kpi("<i class='fas fa-exclamation-triangle' aria-hidden='true'></i>", "Faltantes", "kpi-low")}
  ${kpi("<i class='fas fa-dollar-sign' aria-hidden='true'></i>", "Valor de stock", "kpi-value")}
  ${kpi("<i class='fas fa-shopping-cart' aria-hidden='true'></i>", "Lista de compra", "kpi-list")}
  </div>

  <!-- PANEL: INSUMOS -->
  <div id="panel-items" class="grid lg:grid-cols-[2fr_1fr] gap-4">
    <div class="glass card p-4">
      <div class="table-wrap">
        <table class="table w-full text-[12.5px]">
          <thead class="bg-white/5">
            <tr>
              <th>Código</th><th>Nombre</th><th>Categoría</th>
              <th class="text-right">Stock</th><th class="text-right">Mín.</th>
              <th>Unidad</th><th class="text-right">Costo</th>
              <th>Proveedor</th><th>Actualizado</th><th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="rows-items"></tbody>
        </table>
      </div>
      <div id="empty-items" class="text-slate-400 text-xs py-2 text-center hidden">No hay insumos cargados.</div>
    </div>

    <div class="glass card p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-medium text-[13px] leading-none"><i class="fas fa-shopping-cart" aria-hidden="true"></i> Lista de compra</h2>
        <div class="flex gap-2">
          <button id="btn-send" class="btn btn-primary" type="button"><i class="fas fa-mobile-alt" aria-hidden="true"></i> Enviar a proveedores</button>
          <button id="btn-clear-list" class="btn btn-rose" type="button"><i class="fas fa-broom" aria-hidden="true"></i> Limpiar</button>
        </div>
      </div>
      <div id="buy-list"></div>
      <div id="buy-empty" class="text-slate-400 text-xs py-2 text-center">Vacía. Marcá insumos como “Falta” o bajá el stock debajo del mínimo.</div>
    </div>
  </div>

  <!-- PANEL: PROVEEDORES -->
  <div id="panel-suppliers" class="hidden">
    <div class="glass card p-4">
      <div class="table-wrap">
        <table class="table w-full text-[12.5px]">
          <thead class="bg-white/5">
            <tr>
              <th>Nombre</th><th>Empresa</th><th>Contacto</th><th>WhatsApp/Tel</th><th>Email</th><th>Tags</th><th>Notas</th><th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="rows-suppliers"></tbody>
        </table>
      </div>
      <div id="empty-suppliers" class="text-slate-400 text-xs py-2 text-center hidden">No hay proveedores cargados.</div>
    </div>
  </div>

  <!-- Modales -->
  ${modalItem()}
  ${modalSupplier()}
  ${modalSend()}
</section>`;
  },

  mount(root) {
    // Estado
    let items = [];
    let suppliers = [];
    let buyList = load(INV_LIST_KEY, []);
    let viewItems = [];
    let editingItemId = null;
    let editingSupplierId = null;

    const findSupplier = (id) => suppliers.find(s => s.id === id) || null;

    async function loadData() {
      try {
        const [rawItems, rawSuppliers] = await Promise.all([
          store.products.list(),
          store.suppliers.list(),
        ]);
        items = (rawItems || []).map(p => ({
          ...p,
          name: p.name || p.description || "",
          cost: p.cost ?? p.price ?? 0,
          unit: p.unit || "u",
          min: p.min ?? p.min_stock ?? 0,
          supplierId: p.supplierId || p.supplier_id || "",
        }));
        suppliers = rawSuppliers || [];
        save(INV_ITEMS_KEY, items);
        save(INV_SUPPLIERS_KEY, suppliers);
        refreshItems();
        refreshSuppliers();
      } catch (err) {
        console.error(err);
        toast("Error al cargar inventario: " + (err.message || err), "error");
      }
    }

    // Refs generales
    const q = root.querySelector("#q");
    const fSupp = root.querySelector("#filter-supplier");
    const fStatus = root.querySelector("#filter-status");
    const btnAddItem = root.querySelector("#btn-add-item");
    const btnAddSupp = root.querySelector("#btn-add-supp");
    const btnExport = root.querySelector("#btn-export");
    const importFile = root.querySelector("#import-file");

    // KPIs
    const kCount = root.querySelector("#kpi-count");
    const kLow = root.querySelector("#kpi-low");
    const kValue = root.querySelector("#kpi-value");
    const kList = root.querySelector("#kpi-list");

    // Tabs
    const tabItems = root.querySelector("#tab-items");
    const tabSupps = root.querySelector("#tab-suppliers");
    const panelItems = root.querySelector("#panel-items");
    const panelSupps = root.querySelector("#panel-suppliers");
    const kpis = root.querySelector("#kpis");

    // Tabla insumos
    const rowsItems = root.querySelector("#rows-items");
    const emptyItems = root.querySelector("#empty-items");

    // Tabla proveedores
    const rowsSuppliers = root.querySelector("#rows-suppliers");
    const emptySuppliers = root.querySelector("#empty-suppliers");

    // Lista de compra
    const listWrap = root.querySelector("#buy-list");
    const listEmpty = root.querySelector("#buy-empty");
    const btnSend = root.querySelector("#btn-send");
    const btnClearList = root.querySelector("#btn-clear-list");

    // Modales / formularios
    const itemModal = root.querySelector("#item-modal");
    const itemForm = root.querySelector("#item-form");
    const itemClose = root.querySelector("#item-close");
    const itemCancel = root.querySelector("#item-cancel");
    const itemSave = root.querySelector("#item-save");
    const itemSaveNew = root.querySelector("#item-save-new");

    const suppModal = root.querySelector("#supp-modal");
    const suppForm = root.querySelector("#supp-form");
    const suppClose = root.querySelector("#supp-close");
    const suppCancel = root.querySelector("#supp-cancel");
    const suppSave = root.querySelector("#supp-save");
    const suppSaveNew = root.querySelector("#supp-save-new");

    const sendModal = root.querySelector("#send-modal");
    const sendClose = root.querySelector("#send-close");
    const sendBody = root.querySelector("#send-body");

    // === Tabs ===
    function setTab(which) {
      if (which === "items") {
        tabItems.classList.add("active"); tabSupps.classList.remove("active");
        panelItems.classList.remove("hidden"); panelSupps.classList.add("hidden"); kpis.classList.remove("hidden");
      } else {
        tabSupps.classList.add("active"); tabItems.classList.remove("active");
        panelSupps.classList.remove("hidden"); panelItems.classList.add("hidden"); kpis.classList.add("hidden");
      }
      save(INV_ACTIVE_TAB, which);
    }
    tabItems.addEventListener("click", () => setTab("items"));
    tabSupps.addEventListener("click", () => setTab("suppliers"));

    // Restaurar pestaña anterior (si existe)
    setTab(load(INV_ACTIVE_TAB, "items"));

    // === Acciones generales ===
    btnAddItem.addEventListener("click", () => openItem());
    btnAddSupp.addEventListener("click", () => openSupplier());
    btnExport.addEventListener("click", exportData);
    importFile.addEventListener("change", importData);
    q.addEventListener("input", refreshItems);
    fSupp.addEventListener("change", refreshItems);
    fStatus.addEventListener("change", refreshItems);

    // Lista de compra: enviar / limpiar
    btnSend.addEventListener("click", openSend);
    btnClearList.addEventListener("click", () => {
      if (!buyList.length) return toast("La lista ya está vacía");
      if (!confirm("¿Vaciar la lista de compra?")) return;
      buyList = [];
      save(INV_LIST_KEY, buyList);
      paintBuyList();
      refreshKPIs();
      toast("Lista de compra vaciada ✅", "success");
    });

    listWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-blid]");
      if (!btn) return;
      const id = btn.dataset.blid;
      buyList = buyList.filter(b => b.id !== id);
      save(INV_LIST_KEY, buyList);
      paintBuyList();
      refreshKPIs();
    });

    listWrap.addEventListener("input", (e) => {
      const row = e.target.closest("[data-blid]");
      if (!row) return;
      const id = row.getAttribute("data-blid");
      const item = buyList.find(b => b.id === id);
      if (!item) return;
      if (e.target.classList.contains("bl-qty")) {
        item.qty = Math.max(1, parseInt(e.target.value || "1", 10));
        e.target.value = item.qty;
      }
      if (e.target.classList.contains("bl-note")) {
        item.note = e.target.value || "";
      }
      save(INV_LIST_KEY, buyList);
    });

    // Cerrar modales
    ModalHelper.setup(itemModal, "#item-close, #item-cancel");
    ModalHelper.setup(suppModal, "#supp-close, #supp-cancel");
    ModalHelper.setup(sendModal, "#send-close");

    // Guardado (sin submit nativo)
    itemSave.addEventListener("click", () => saveItem("close"));
    itemSaveNew.addEventListener("click", () => saveItem("new"));
    suppSave.addEventListener("click", () => saveSupplier("close"));
    suppSaveNew.addEventListener("click", () => saveSupplier("new"));

    // Delegados tabla Insumos
    rowsItems.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "inc") changeStock(id, +1);
      if (btn.dataset.act === "dec") changeStock(id, -1);
      if (btn.dataset.act === "need") toggleNeed(id);
      if (btn.dataset.act === "edit") openItem(items.find(x => x.id === id) || null);
      if (btn.dataset.act === "del") delItem(id);
    });

    // Delegados tabla Proveedores
    rowsSuppliers.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "edit") openSupplier(suppliers.find(s => s.id === id) || null);
      if (btn.dataset.act === "del") delSupplier(id);
    });

    // ====== INSUMOS ======
    function applyFiltersItems() {
      const term = (q.value || "").toLowerCase().trim();
      const fs = String(fSupp.value || "");
      const st = fStatus.value;

      viewItems = items.filter(it => {
        const matchesTerm = !term || [it.code, it.name, it.category].join(" ").toLowerCase().includes(term);
        const matchesSupp = !fs || String(it.supplierId || "") === fs; // opcional
        const low = (it.stock || 0) < (it.min || 0);
        const matchesStatus = !st || (st === "low" ? low : !low);
        return matchesTerm && matchesSupp && matchesStatus;
      });
    }
    function paintItems() {
      if (!viewItems.length) {
        rowsItems.innerHTML = "";
        emptyItems.classList.remove("hidden");
        return;
      }
      emptyItems.classList.add("hidden");
      rowsItems.innerHTML = viewItems.map(it => {
        const supp = it.supplierId ? (findSupplier(it.supplierId)?.name || "-") : "—";
        const low = (it.stock || 0) < (it.min || 0);
        const badge = low ? `<span class="pill status-low">Falta</span>` : `<span class="pill status-ok">OK</span>`;
        return `
          <tr class="hover:bg-white/5">
            <td>${it.code || "-"}</td>
            <td class="font-medium">${it.name}</td>
            <td>${it.category || "-"}</td>
            <td class="text-right">${it.stock ?? 0}</td>
            <td class="text-right">${it.min ?? 0}</td>
            <td>${it.unit || "-"}</td>
            <td class="text-right">${money(it.cost)}</td>
            <td class="max-w-[180px] truncate">${supp}</td>
            <td>${(it.updatedAt || "").slice(0, 10) || "-"}</td>
            <td>${badge}</td>
            <td class="text-right whitespace-nowrap">
              <button class="mini-btn btn" data-act="dec" data-id="${it.id}" title="Quitar 1"><i class="fas fa-minus" aria-hidden="true"></i></button>
              <button class="mini-btn btn" data-act="inc" data-id="${it.id}" title="Sumar 1"><i class="fas fa-plus" aria-hidden="true"></i></button>
              <button class="mini-btn btn" data-act="need" data-id="${it.id}" title="Marcar en lista"><i class="fas fa-shopping-cart" aria-hidden="true"></i></button>
              <button class="mini-btn btn btn-indigo" data-act="edit" data-id="${it.id}" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
              <button class="mini-btn btn btn-rose" data-act="del" data-id="${it.id}" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </td>
          </tr>`;
      }).join("");
    }
    function refreshItems() { applyFiltersItems(); paintItems(); paintBuyList(); refreshKPIs(); }
    function refreshKPIs() {
      kCount.textContent = items.length;
      kLow.textContent = items.filter(i => (i.stock || 0) < (i.min || 0)).length;
      kValue.textContent = money(items.reduce((s, i) => s + (Number(i.stock || 0) * Number(i.cost || 0)), 0));
      kList.textContent = buyList.length;
    }

    function openItem(data = null) {
      const E = itemForm.elements;
      itemForm.reset();
      editingItemId = data?.id || null;
      E.iid.value = data?.id || rid("itm");
      E.code.value = data?.code || "";
      E.name.value = data?.name || "";
      E.category.value = data?.category || "";
      E.unit.value = data?.unit || "u";
      E.cost.value = data?.cost ?? "";
      E.stock.value = data?.stock ?? 0;
      E.min.value = data?.min ?? 1;
      paintSupplierSelect(E.supplierId, data?.supplierId || "");
      E.everyDays.value = data?.alerts?.everyDays ?? "";
      E.nextDate.value = data?.alerts?.nextDate || "";
      E.threshold.value = data?.alerts?.threshold ?? "";
      ModalHelper.open(itemModal, () => {
        setTimeout(() => E.name?.focus(), 0);
      });
    }
    function readItemForm(form) {
      const E = form.elements;
      return {
        id: E.iid.value,
        code: E.code.value.trim(),
        name: E.name.value.trim(),
        category: E.category.value.trim(),
        unit: E.unit.value,
        cost: parseNum(E.cost.value || "0"),
        stock: Math.max(0, parseNum(E.stock.value || "0")),
        min: Math.max(0, parseNum(E.min.value || "0")),
        supplierId: E.supplierId.value || "", // opcional
        updatedAt: new Date().toISOString(),
        alerts: {
          everyDays: E.everyDays.value ? Math.max(1, parseInt(E.everyDays.value, 10)) : "",
          nextDate: E.nextDate.value || "",
          threshold: E.threshold.value ? Math.max(0, parseInt(E.threshold.value, 10)) : ""
        }
      };
    }

    async function saveItem(mode = "close") {
      const data = readItemForm(itemForm);
      if (!data.name) return toast("Nombre obligatorio", "error");
      if (!data.unit) return toast("Unidad obligatoria", "error");

      try {
        const exists = editingItemId && items.some(x => x.id === editingItemId);
        if (exists) {
          await store.products.update(editingItemId, data);
        } else {
          await store.products.create(data);
        }

        await loadData();
        const saved = items.find(x => x.id === data.id) || data;
        autoNeed(saved);

        setTab("items");
        toast("Insumo guardado ✅", "success");

        if (mode === "new") {
          editingItemId = null;
          openItem(null);
        } else {
          ModalHelper.close(itemModal);
        }
      } catch (err) {
        console.error(err);
        toast("Error al guardar el insumo: " + (err.message || err), "error");
      }
    }
    async function delItem(id) {
      if (!confirm("¿Eliminar insumo?")) return;

      try {
        await store.products.remove(id);
        buyList = buyList.filter(b => b.itemId !== id);
        save(INV_LIST_KEY, buyList);

        await loadData();
        toast("Insumo eliminado", "success");
      } catch (err) {
        console.error(err);
        toast("Error al eliminar el insumo", "error");
      }
    }

    async function changeStock(id, delta) {
      const it = items.find(x => x.id === id);
      if (!it) return;

      try {
        const newStock = Math.max(0, (Number(it.stock) || 0) + delta);
        await store.products.update(id, { ...it, stock: newStock });
        await loadData();
        const updatedItem = items.find(x => x.id === id);
        if (updatedItem) autoNeed(updatedItem);
      } catch (err) {
        console.error(err);
        toast("Error al actualizar el stock: " + (err.message || err), "error");
      }
    }
    function autoNeed(it) {
      const exists = buyList.find(b => b.itemId === it.id);
      const needs = (it.stock || 0) < (it.min || 0);
      if (needs && !exists) {
        buyList.push({ id: rid("bl"), itemId: it.id, qty: Math.max(1, (it.min || 1) - (it.stock || 0)), note: "", supplierId: it.supplierId || "" });
        save(INV_LIST_KEY, buyList);
      }
      if (!needs && exists) {
        buyList = buyList.filter(b => b.itemId !== it.id);
        save(INV_LIST_KEY, buyList);
      }
    }
    function toggleNeed(id) {
      const it = items.find(x => x.id === id);
      if (!it) return;
      const exists = buyList.find(b => b.itemId === id);
      if (exists) {
        buyList = buyList.filter(b => b.itemId !== id);
      } else {
        buyList.push({
          id: rid("bl"),
          itemId: id,
          qty: Math.max(1, (it.min || 1) - (it.stock || 0)),
          note: "",
          supplierId: it.supplierId || "",
        });
      }
      save(INV_LIST_KEY, buyList);
      paintBuyList();
      refreshKPIs();
    }

    // ====== LISTA DE COMPRA ======
    function paintBuyList() {
      if (!buyList.length) {
        listWrap.innerHTML = "";
        listEmpty.classList.remove("hidden");
        return;
      }
      listEmpty.classList.add("hidden");

      const groups = {};
      buyList.forEach(b => {
        const it = items.find(i => i.id === b.itemId);
        const sid = b.supplierId || it?.supplierId || "__sin__";
        (groups[sid] ||= []).push({ ...b, item: it || {} });
      });

      listWrap.innerHTML = Object.entries(groups).map(([sid, arr]) => {
        const s = sid === "__sin__" ? null : findSupplier(sid);
        const head = s ? `${s.name}${s.company ? " — " + s.company : ""}` : "Sin proveedor";
        const contact = s ? `<div class="text-xs text-slate-400">${s.phone ? `<i class=\"fas fa-phone\" aria-hidden=\"true\"></i> ${s.phone}` : ""} ${s.email ? ` · <i class=\"fas fa-envelope\" aria-hidden=\"true\"></i> ${s.email}` : ""}</div>` : "";
        return `
          <div class="glass rounded-lg p-2 mb-2">
            <div class="flex items-center justify-between">
              <div><div class="font-medium">${head}</div>${contact}</div>
              <div class="flex gap-2">
                ${s?.phone ? `<a class="btn mini" target="_blank" href="${waHref(arr, s)}"><i class=\"fab fa-whatsapp\" aria-hidden=\"true\"></i> WhatsApp</a>` : ""}
                ${s?.email ? `<a class="btn mini" href="${mailtoHref(arr, s)}"><i class=\"fas fa-envelope\" aria-hidden=\"true\"></i> Email</a>` : ""}
              </div>
            </div>
            <div class="mt-2 space-y-1">
              ${arr.map(b => `
                <div class="flex items-center gap-2" data-blid="${b.id}">
                  <div class="flex-1 truncate">${b.item?.name || "(eliminado)"} <span class="text-slate-400">(${b.item?.unit || "-"})</span></div>
                  <input type="number" min="1" class="bl-qty w-16 h-7 px-2 rounded bg-white/10 border border-white/10 text-right" value="${b.qty || 1}"/>
                  <input type="text" class="bl-note flex-1 h-7 px-2 rounded bg-white/10 border border-white/10" placeholder="Nota..." value="${b.note || ""}"/>
                  <button class="mini-btn btn" data-blid="${b.id}" title="Quitar de la lista"><i class="fas fa-trash" aria-hidden="true"></i></button>
                </div>`).join("")}
            </div>
          </div>`;
      }).join("");
    }
    function buildMessage(block, supplier) {
      const lines = [];
      const saludo = supplier?.contact || supplier?.name || "";
      lines.push(`Hola${saludo ? " " + saludo : ""}, ¿cómo estás?`);
      lines.push(`Necesito cotizar / comprar:`); lines.push("");
      block.forEach(b => { const n = b.item?.name || "(sin nombre)"; lines.push(`• ${n} — ${b.qty} ${b.item?.unit || ""}${b.note ? ` (${b.note})` : ""}`); });
      lines.push(""); lines.push("¡Gracias! — Microbollos Group");
      return lines.join("\n");
    }
    function waHref(block, supplier) {
      const phone = (supplier?.phone || "").replace(/[^\d]/g, "");
      const text = encodeURIComponent(buildMessage(block, supplier));
      return `https://wa.me/${phone}?text=${text}`;
    }
    function mailtoHref(block, supplier) {
      const subj = encodeURIComponent("Pedido / Cotización – Microbollos Group");
      const body = encodeURIComponent(buildMessage(block, supplier));
      return `mailto:${supplier.email}?subject=${subj}&body=${body}`;
    }
    function openSend() {
      if (!buyList.length) { toast("La lista está vacía", "error"); return; }
      ModalHelper.open(sendModal, () => {
        const groups = {};
        buyList.forEach(b => {
          const it = items.find(i => i.id === b.itemId);
          const sid = b.supplierId || it?.supplierId || "__sin__";
          (groups[sid] ||= []).push({ ...b, item: it || {} });
        });
        sendBody.innerHTML = Object.entries(groups).map(([sid, block]) => {
          const s = findSupplier(sid);
          const msg = buildMessage(block, s);
          return `
            <div class="glass rounded-lg p-2">
              <div class="flex items-center justify-between">
                <div class="font-medium">${s ? (s.name + (s.company ? " — " + s.company : "")) : "Sin proveedor"}</div>
                <div class="flex gap-2">
                  ${s?.phone ? `<a class="btn mini-btn" target="_blank" href="${waHref(block, s)}"><i class=\"fab fa-whatsapp\" aria-hidden=\"true\"></i> WhatsApp</a>` : ""}
                  ${s?.email ? `<a class="btn mini-btn" href="${mailtoHref(block, s)}"><i class=\"fas fa-envelope\" aria-hidden=\"true\"></i> Email</a>` : ""}
                </div>
              </div>
              <textarea rows="7">${msg}</textarea>
            </div>`;
        }).join("");
      });
    }

    // ========== PROVEEDORES ==========
    function paintSuppliers() {
      if (!suppliers.length) {
        rowsSuppliers.innerHTML = "";
        emptySuppliers.classList.remove("hidden");
      } else {
        emptySuppliers.classList.add("hidden");
        rowsSuppliers.innerHTML = suppliers.map(s => {
          const tags = Array.isArray(s.tags) ? s.tags : [];
          return `
          <tr class="hover:bg-white/5">
            <td class="font-medium">${s.name}</td>
            <td>${s.company || "-"}</td>
            <td>${s.contact || "-"}</td>
            <td>${s.phone || "-"}</td>
            <td>${s.email || "-"}</td>
            <td class="max-w-[220px] truncate">${tags.join(", ") || "-"}</td>
            <td class="max-w-[240px] truncate">${s.notes || "-"}</td>
            <td class="text-right whitespace-nowrap">
              <button class="mini-btn btn btn-indigo" data-act="edit" data-id="${s.id}" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
              <button class="mini-btn btn btn-rose" data-act="del" data-id="${s.id}" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </td>
          </tr>`;
        }).join("");
      }
    }

    async function refreshSuppliers() {
      paintSuppliers();
      repaintSupplierFilter();
    }

    function openSupplier(data = null) {
      const S = suppForm.elements;
      suppForm.reset();
      editingSupplierId = data?.id || null;
      S.sid.value = data?.id || rid("supp");
      S.name.value = data?.name || "";
      S.company.value = data?.company || "";
      S.contact.value = data?.contact || "";
      S.phone.value = data?.phone || "";
      S.email.value = data?.email || "";
      S.tags.value = (data?.tags || []).join(", ");
      S.notes.value = data?.notes || "";
      ModalHelper.open(suppModal, () => {
        setTimeout(() => S.name?.focus(), 0);
      });
    }
    function readSupplierForm(form) {
      const S = form.elements;
      return {
        id: S.sid.value,
        name: S.name.value.trim(),
        company: S.company.value.trim(),
        contact: S.contact.value.trim(),
        phone: S.phone.value.trim(),
        email: S.email.value.trim(),
        tags: (S.tags.value || "").split(",").map(s => s.trim()).filter(Boolean),
        notes: S.notes.value.trim(),
        updatedAt: new Date().toISOString()
      };
    }
    async function saveSupplier(mode = "close") {
      const data = readSupplierForm(suppForm);
      if (!data.name) return toast("Nombre del proveedor obligatorio", "error");

      try {
        const exists = editingSupplierId && suppliers.some(s => s.id === editingSupplierId);
        if (exists) {
          await store.suppliers.update(editingSupplierId, data);
        } else {
          await store.suppliers.create(data);
        }

        await loadData();
        toast("Proveedor guardado ✅", "success");

        if (mode === "new") {
          editingSupplierId = null;
          openSupplier(null);
        } else {
          ModalHelper.close(suppModal);
        }
      } catch (err) {
        console.error(err);
        toast("Error al guardar el proveedor: " + (err.message || err), "error");
      }
    }

    async function delSupplier(id) {
      if (!confirm("¿Eliminar proveedor? (los insumos quedarán sin proveedor)")) return;

      try {
        await store.suppliers.remove(id);
        await loadData();
        toast("Proveedor eliminado", "success");
      } catch (err) {
        console.error(err);
        toast("Error al eliminar el proveedor: " + (err.message || err), "error");
      }
    }

    // ====== Select de proveedor en formulario de insumo + filtro ======
    function paintSupplierSelect(select, value = "") {
      const list = load(INV_SUPPLIERS_KEY, suppliers);
      select.innerHTML = `<option value="">(Opcional)</option>` + list.map(s => `<option value="${s.id}">${s.name}${s.company ? " — " + s.company : ""}</option>`).join("");
      select.value = value;
    }
    function repaintSupplierFilter() {
      const list = load(INV_SUPPLIERS_KEY, suppliers);
      fSupp.innerHTML = `<option value="">Todos los proveedores</option>` + list.map(s => `<option value="${s.id}">${s.name}${s.company ? " — " + s.company : ""}</option>`).join("");
      fSupp.value = ""; // reset para evitar filtros colgados
    }

    loadData();

    // ====== Export / Import ======
    function exportData() {
      const payload = { items, suppliers, buyList, exportedAt: new Date().toISOString(), version: 1 };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `inventario_${todayISO().replace(/-/g, "")}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 300);
    }
    function importData(ev) {
      const f = ev.target.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data.items)) items = data.items;
          if (Array.isArray(data.suppliers)) suppliers = data.suppliers;
          if (Array.isArray(data.buyList)) buyList = data.buyList;
          save(INV_ITEMS_KEY, items); save(INV_SUPPLIERS_KEY, suppliers); save(INV_LIST_KEY, buyList);
          setTab("items"); // forzar insumos tras importar
          refreshItems(); refreshSuppliers();
          toast("Importado correctamente ✅", "success");
        } catch { toast("Archivo inválido", "error"); }
        importFile.value = "";
      };
      reader.readAsText(f);
    }
  }
};

// ======= helpers UI =======
function kpi(icon, label, id) {
  return /*html*/`
  <div class="glass card p-3.5 flex items-center gap-3 min-h-[64px]">
    <div>${icon}</div>
    <div><div class="k">${label}</div><div id="${id}" class="v">—</div></div>
  </div>`;
}

function modalItem() {
  return /*html*/`
  <div id="item-modal" data-modal-overlay data-modal-size="lg" class="modal-overlay fixed inset-0 z-[9999] hidden items-center justify-center p-4 bg-black/60" aria-hidden="true">
    <div class="modal-panel bg-slate-900 border border-white/10 rounded-xl w-full max-w-[880px] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
  <h2 class="text-lg font-semibold"><i class="fas fa-plus" aria-hidden="true"></i> Insumo</h2>
  <button id="item-close" type="button" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <form id="item-form" onsubmit="return false;" class="p-4 space-y-3">
        <input type="hidden" name="iid">
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Código</span>
            <input name="code" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
          <label class="text-sm block sm:col-span-2"><span class="block mb-1 text-slate-300">Nombre *</span>
            <input name="name" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" required></label>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Categoría</span>
            <input name="category" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Unidad *</span>
            <select name="unit" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10">
              <option value="u">Unidad</option><option value="kg">Kg</option><option value="g">g</option>
              <option value="lt">Lt</option><option value="ml">ml</option><option value="m2">m²</option></select></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Costo</span>
            <input type="number" step="0.01" min="0" name="cost" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
        </div>
        <div class="grid sm:grid-cols-4 gap-3">
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Stock</span>
            <input type="number" min="0" name="stock" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" value="0"></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Mínimo</span>
            <input type="number" min="0" name="min" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" value="1"></label>
          <label class="text-sm block sm:col-span-2"><span class="block mb-1 text-slate-300">Proveedor</span>
            <select name="supplierId" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></select></label>
        </div>
        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-2"><i class="fas fa-bell" aria-hidden="true"></i> Alertas (opcional)</div>
          <div class="grid sm:grid-cols-3 gap-3">
            <label class="text-sm block"><span class="block mb-1 text-slate-300">Cada (días)</span>
              <input type="number" min="1" name="everyDays" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" placeholder="ej: 30"></label>
            <label class="text-sm block"><span class="block mb-1 text-slate-300">Fecha</span>
              <input type="date" name="nextDate" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
            <label class="text-sm block"><span class="block mb-1 text-slate-300">Umbral stock</span>
              <input type="number" min="0" name="threshold" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" placeholder="ej: 2"></label>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn" id="item-cancel"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
          <button type="button" class="btn" id="item-save-new"><i class="fas fa-save" aria-hidden="true"></i> Guardar y nuevo</button>
          <button type="button" class="btn btn-primary" id="item-save"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;
}

function modalSupplier() {
  return /*html*/`
  <div id="supp-modal" data-modal-overlay data-modal-size="md" class="modal-overlay fixed inset-0 z-[9999] hidden items-center justify-center p-4 bg-black/60" aria-hidden="true">
    <div class="modal-panel bg-slate-900 border border-white/10 rounded-xl w-full max-w-[760px] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
  <h2 class="text-lg font-semibold"><i class="fas fa-tag" aria-hidden="true"></i> Proveedor</h2>
  <button id="supp-close" type="button" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <form id="supp-form" onsubmit="return false;" class="p-4 space-y-3">
        <input type="hidden" name="sid">
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Nombre *</span>
            <input name="name" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" required></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Empresa</span>
            <input name="company" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Contacto</span>
            <input name="contact" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">WhatsApp / Tel</span>
            <input name="phone" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" placeholder="+54 9 ..."></label>
          <label class="text-sm block"><span class="block mb-1 text-slate-300">Email</span>
            <input type="email" name="email" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10"></label>
        </div>
        <label class="text-sm block"><span class="block mb-1 text-slate-300">Rubros / Tags</span>
          <input name="tags" class="w-full h-10 px-3 rounded bg-white/10 border border-white/10" placeholder="pinturas, repuestos, ..."></label>
        <label class="text-sm block"><span class="block mb-1 text-slate-300">Notas</span>
          <textarea name="notes" rows="3" class="w-full px-3 py-2 rounded bg-white/10 border border-white/10"></textarea></label>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn" id="supp-cancel"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
          <button type="button" class="btn" id="supp-save-new"><i class="fas fa-save" aria-hidden="true"></i> Guardar y nuevo</button>
          <button type="button" class="btn btn-primary" id="supp-save"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>`;
}

function modalSend() {
  return /*html*/`
  <div id="send-modal" data-modal-overlay data-modal-size="lg" class="modal-overlay fixed inset-0 z-[9999] hidden items-center justify-center p-4 bg-black/60" aria-hidden="true">
    <div class="modal-panel bg-slate-900 border border-white/10 rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
        <h2 class="text-lg font-semibold">Enviar lista de compra</h2>
  <button id="send-close" type="button" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <div id="send-body" class="p-4 space-y-3"></div>
    </div>
  </div>`;
}
