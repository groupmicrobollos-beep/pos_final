// ./pages/Configuracion.js
// Panel de Configuración “full stack” para Microbollos POS
// Gestión de Usuarios, Sucursales, Ajustes del sistema, Seguridad/Backups, Auditoría.
// 100% vanilla JS, UI consistente (glass/cards/tablas/modales).
//
// Integra con el resto del sistema mediante window.CFG (si existe):
// - window.CFG.setBranches(list)   -> emite "cfg:branches-updated"
import store from "../store.js";
//
// - window.CFG.setUsers(list)      -> emite "cfg:users-updated"
// - window.CFG.setSettings(obj)    -> emite "cfg:settings-updated"

// ===== Claves de almacenamiento =====
const CFG_USERS_KEY = "cfg_users";
const CFG_BRANCHES_KEY = "cfg_branches";
const CFG_SETTINGS_KEY = "cfg_settings";
const CFG_AUDIT_KEY = "cfg_audit";

// También tomamos claves de otros módulos para backup total
const INV_ITEMS_KEY = "inv_items";
const INV_SUPPLIERS_KEY = "inv_suppliers";
const INV_LIST_KEY = "inv_buy_list";

// ===== Utilidades comunes =====
const rid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
function load(key, def) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function toast(msg, type = "info") {
  const bg = type === "error" ? "bg-rose-600" : type === "success" ? "bg-emerald-600" : "bg-sky-700";
  const el = document.createElement("div");
  el.className = `fixed top-4 right-4 z-[4000] px-3 py-2 rounded-lg text-white shadow-2xl text-xs ${bg}`;
  el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(10px)"; setTimeout(() => el.remove(), 150); }, 1900);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDateTime(d) { try { const x = new Date(d); return `${x.toLocaleDateString()} ${x.toLocaleTimeString()}`; } catch { return d; } }

// Rol y permisos por defecto
const ROLES = [
  { id: "admin", name: "Administrador", desc: "Acceso total", perms: { all: true } },
  { id: "stock", name: "Depósito", desc: "Insumos, Proveedores, compras", perms: { inventory: true, suppliers: true } },
  { id: "ventas", name: "Ventas/Caja", desc: "Presupuestos, POS, cobros", perms: { pos: true, quotes: true, reports: true } },
  { id: "consulta", name: "Consulta", desc: "Sólo lectura", perms: { readonly: true } },
];

// ====== Hash de contraseña (mejor esfuerzo en cliente) ======
async function hashPassword(plain) {
  if (!plain) return "";
  try {
    const enc = new TextEncoder().encode(plain);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const bytes = Array.from(new Uint8Array(buf));
    const hex = bytes.map(b => b.toString(16).padStart(2, "0")).join("");
    return `sha256:${hex}`;
  } catch {
    // Fallback MUY básico si no hay WebCrypto (mejor que plano)
    return "weak:" + btoa(unescape(encodeURIComponent(plain)));
  }
}

// ====== Auditoría ======
function logAudit(action, details = {}) {
  const audit = load(CFG_AUDIT_KEY, []);
  audit.unshift({ id: rid("evt"), ts: new Date().toISOString(), action, details });
  save(CFG_AUDIT_KEY, audit.slice(0, 500)); // guardamos últimos 500 eventos
}

// ====== Ajustes por defecto ======
function defaultSettings() {
  return {
    companyName: "", brandName: "", cuit: "", iibb: "", address: "", email: "", phone: "",
    currency: "ARS", locale: "es-AR", decimals: 2, iva: 21,
    invoicePrefix: "MB-", invoiceNext: 1, theme: "auto", printTickets: false, enableWA: true,
    msgSign: "¡Gracias! — Microbollos Group",
    updatedAt: new Date().toISOString()
  };
}

// ====== Theme manager (auto / dark / light) ======
const Theme = (() => {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  let mode = "auto";

  function compute(theme) { return theme === "auto" ? (media && media.matches ? "dark" : "light") : theme; }

  function apply(theme = "auto") {
    mode = theme;
    const finalMode = compute(theme);
    document.documentElement.setAttribute("data-theme", finalMode);
  }

  media?.addEventListener?.("change", () => { if (mode === "auto") apply("auto"); });

  return { apply };
})();

// ===== Export default =====
export default {
  render() {
    return /*html*/`
<section data-page="config" class="space-y-6 text-[13px]">
  <style>
    /* Forzar texto oscuro sólo en TEMA CLARO: aplicar sólo cuando <html data-theme="light"> */
    /* Usa !important para sobreescribir estilos previos y garantizar texto negro fuerte en este modo */
    html[data-theme="light"] [data-page="config"], html[data-theme="light"] [data-page="config"] * { color: #000000 !important; }
    [data-page="config"] .hidden{display:none!important} [data-page="config"] .flex{display:flex!important}
  [data-page="config"] .glass{background:var(--bg-glass);backdrop-filter:var(--glass-blur)}
  [data-page="config"] .card{border:1px solid var(--border-main);border-radius:.6rem}
  [data-page="config"] .btn{display:inline-flex;align-items:center;gap:.4rem;padding:0 .7rem;height:36px;line-height:34px;font-size:12.5px;border-radius:.45rem;border:1px solid var(--border-main);background:rgba(255,255,255,.08);cursor:pointer}
  [data-page="config"] .btn:hover{background:rgba(255,255,255,.14)}
  [data-page="config"] .btn-primary{background:rgba(16,185,129,.86);border-color:transparent} .btn-primary:hover{background:rgba(16,185,129,1)}
  [data-page="config"] .btn-indigo{background:rgba(99,102,241,.86);border-color:transparent} .btn-indigo:hover{background:rgba(99,102,241,1)}
  [data-page="config"] .btn-rose{background:rgba(244,63,94,.86);border-color:transparent} .btn-rose:hover{background:rgba(244,63,94,1)}
    [data-page="config"] .mini{height:26px;line-height:24px;padding:0 .45rem;border-radius:.35rem}
    [data-page="config"] .tab{padding:.45rem .7rem;border-radius:.5rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer}
    [data-page="config"] .tab.active{background:rgba(99,102,241,.9);border-color:transparent}
    [data-page="config"] .table-wrap{border:1px solid rgba(255,255,255,.08);border-radius:.5rem;overflow:hidden}
    [data-page="config"] .table td,.table th{padding:.45rem .6rem;border-bottom:1px solid rgba(255,255,255,.06)} th{font-weight:600;color:#cbd5e1;white-space:nowrap}
    [data-page="config"] .pill{font-size:.7rem;padding:.12rem .45rem;border-radius:.45rem;background:#0b1220;border:1px solid rgba(255,255,255,.08)}

    [data-page="config"] input, [data-page="config"] select, [data-page="config"] textarea{
      background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);
      border-radius:.45rem;color:#e2e8f0;padding:.5rem;width:100%;
    }
    [data-page="config"] textarea{min-height:90px}
    [data-page="config"] .switch{appearance:none;width:40px;height:22px;border-radius:999px;background:#374151;position:relative;outline:0;cursor:pointer;border:1px solid rgba(255,255,255,.12)}
    [data-page="config"] .switch:checked{background:#10b981}
    [data-page="config"] .switch:before{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:999px;background:#fff;transition:all .15s}
    [data-page="config"] .switch:checked:before{left:20px}

    /* ===== SELECT: forzar modo oscuro + flecha visible ===== */
    [data-page="config"] select{
      background: var(--ctrl-bg, rgba(255,255,255,.08))
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
                  no-repeat right .65rem center / 12px;
      border: 1px solid var(--ctrl-bd, rgba(255,255,255,.10));
      color: var(--text, #e2e8f0);
      padding-right: 2rem;
      appearance: none; -webkit-appearance:none; -moz-appearance:none;
      color-scheme: dark;
    }
    [data-page="config"] select:focus{
      outline: 2px solid rgba(99,102,241,.55);
      outline-offset: 1px;
    }
    [data-page="config"] select option{
      background-color: var(--bg, #0b1220);
      color: var(--text, #e2e8f0);
    }
    html[data-theme="light"] [data-page="config"] select{
      color-scheme: light;
      background: #fff
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
                  no-repeat right .65rem center / 12px;
      color:#111827; border-color: rgba(0,0,0,.1);
    }
    html[data-theme="light"] [data-page="config"] select option{
      background-color:#fff; color:#111827;
    }
    [data-page="config"] select::-ms-expand{ display:none; }

    /* ===== Search input con icono (mejora lupa) ===== */
    [data-page="config"] .search{position:relative}
    [data-page="config"] .search input{height:36px;padding-left:34px}
    [data-page="config"] .search .icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:.7;pointer-events:none}
    [data-page="config"] .search .icon svg{width:16px;height:16px;display:block}

    /* ===== Etiquetas finas en forms ===== */
    [data-page="config"] .field span{display:block;margin:0 0 .35rem .15rem;color:#cbd5e1;font-size:.75rem}

    /* ===== Diálogos (modales unificados, sin scroll horizontal) ===== */
    [data-page="config"] .overlay{background:rgba(0,0,0,.6)}
    [data-page="config"] .dialog{
      background:#0c1220;border-radius:1rem;border:1px solid rgba(255,255,255,.12);
      width:min(92vw,860px);max-height:90vh;display:flex;flex-direction:column;
      box-shadow:0 30px 80px rgba(0,0,0,.55)
    }
    [data-page="config"] .dialog-head{
      padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);
      background:linear-gradient(180deg, rgba(99,102,241,.18), rgba(99,102,241,.06))
    }
    [data-page="config"] .dialog-body{padding:1rem;overflow-y:auto;overflow-x:hidden}
    [data-page="config"] .dialog-foot{
      padding:.8rem 1rem;border-top:1px solid rgba(255,255,255,.1);
      background:rgba(255,255,255,.03);display:flex;justify-content:flex-end;gap:.5rem
    }

    /* ===== Grilla utilitaria 12 columnas (para modales) ===== */
    [data-page="config"] .row{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:.75rem}
    [data-page="config"] .col-12{grid-column:span 12}
    [data-page="config"] .col-7{grid-column:span 7}
    [data-page="config"] .col-6{grid-column:span 6}
    [data-page="config"] .col-5{grid-column:span 5}
    [data-page="config"] .col-4{grid-column:span 4}
    [data-page="config"] .col-3{grid-column:span 3}
    [data-page="config"] .col-2{grid-column:span 2}
    @media (max-width: 900px){
      [data-page="config"] .col-7,
      [data-page="config"] .col-6,
      [data-page="config"] .col-5,
      [data-page="config"] .col-4,
      [data-page="config"] .col-3,
      [data-page="config"] .col-2{grid-column:span 12}
    }
  </style>

  <div class="flex items-center justify-between">
    <h1 class="text-[18px] font-semibold leading-none">Configuración</h1>
    <div class="flex gap-2">
      <button id="tab-users" class="tab"><i class="fas fa-user" aria-hidden="true"></i> Usuarios</button>
      <button id="tab-branches" class="tab"><i class="fas fa-building" aria-hidden="true"></i> Sucursales</button>
      <button id="tab-settings" class="tab"><i class="fas fa-cog" aria-hidden="true"></i> Sistema</button>
      <button id="tab-security" class="tab"><i class="fas fa-shield-alt" aria-hidden="true"></i> Seguridad & Backups</button>
    </div>
  </div>


  <!-- PANEL: USUARIOS -->
  <div id="panel-users" class="glass card p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex gap-2">
        <label class="search" title="Buscar usuario, nombre, email...">
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input id="qUsers" placeholder="Buscar usuario, nombre, email...">
        </label>
        <select id="filterRole" class="h-9">
          <option value="">Todos los roles</option>
        </select>
        <select id="filterBranch" class="h-9">
          <option value="">Todas las sucursales</option>
        </select>
      </div>
        <div class="flex gap-2">
        <button id="btnAddUser" class="btn btn-primary"><i class="fas fa-plus" aria-hidden="true"></i> Usuario</button>
        <button id="btnExportUsers" class="btn"><i class="fas fa-file-export" aria-hidden="true"></i> Exportar</button>
        <label class="btn"><i class="fas fa-file-import" aria-hidden="true"></i> Importar<input id="importUsers" type="file" accept=".json" class="hidden"></label>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table w-full text-[12.5px]">
        <thead class="bg-white/5">
          <tr>
            <th>Usuario</th><th>Nombre</th><th>Rol</th><th>Email</th><th>Sucursal</th><th>Activo</th><th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody id="rows-users"></tbody>
      </table>
    </div>
    <div id="empty-users" class="text-slate-400 text-xs py-2 text-center hidden">No hay usuarios cargados.</div>
  </div>

  <!-- PANEL: SUCURSALES -->
  <div id="panel-branches" class="glass card p-4 hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex gap-2">
        <label class="search" title="Buscar sucursal, dirección...">
          <span class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input id="qBranches" placeholder="Buscar sucursal, dirección...">
        </label>
      </div>
      <div class="flex gap-2">
        <button id="btnAddBranch" class="btn btn-primary"><i class="fas fa-plus" aria-hidden="true"></i> Sucursal</button>
        <button id="btnExportBranches" class="btn"><i class="fas fa-file-export" aria-hidden="true"></i> Exportar</button>
        <label class="btn"><i class="fas fa-file-import" aria-hidden="true"></i> Importar<input id="importBranches" type="file" accept=".json" class="hidden"></label>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table w-full text-[12.5px]">
        <thead class="bg-white/5">
          <tr>
            <th>Nombre</th><th>Responsable</th><th>Tel</th><th>Email</th><th>Dirección</th><th>CUIT</th><th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody id="rows-branches"></tbody>
      </table>
    </div>
    <div id="empty-branches" class="text-slate-400 text-xs py-2 text-center hidden">No hay sucursales cargadas.</div>
  </div>

  <!-- PANEL: AJUSTES DEL SISTEMA -->
  <div id="panel-settings" class="glass card p-4 hidden">
    <form id="form-settings" onsubmit="return false;" class="space-y-4">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-2"><i class="fas fa-id-badge" aria-hidden="true"></i> Datos de la empresa</div>
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="text-sm block field"><span>Razón social</span><input name="companyName"></label>
            <label class="text-sm block field"><span>Nombre de fantasía</span><input name="brandName"></label>
            <label class="text-sm block field"><span>CUIT</span><input name="cuit"></label>
            <label class="text-sm block field"><span>Ing. Brutos</span><input name="iibb"></label>
            <label class="text-sm block field sm:col-span-2"><span>Domicilio</span><input name="address"></label>
            <label class="text-sm block field"><span>Email</span><input name="email" type="email"></label>
            <label class="text-sm block field"><span>Teléfono</span><input name="phone"></label>
          </div>
        </div>
        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-2"><i class="fas fa-receipt" aria-hidden="true"></i> POS / Facturación</div>
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="text-sm block field"><span>Moneda</span>
              <select name="currency"><option>ARS</option><option>USD</option><option>EUR</option></select></label>
            <label class="text-sm block field"><span>Locale</span>
              <select name="locale"><option>es-AR</option><option>es-ES</option><option>en-US</option></select></label>
            <label class="text-sm block field"><span>Decimales</span><input name="decimals" type="number" min="0" max="4" value="2"></label>
            <label class="text-sm block field"><span>IVA (%)</span><input name="iva" type="number" min="0" step="0.01" value="21"></label>
            <label class="text-sm block field"><span>Prefijo comprobante</span><input name="invoicePrefix" placeholder="MB-"></label>
            <label class="text-sm block field"><span>Próximo número</span><input name="invoiceNext" type="number" min="1" value="1"></label>
            <label class="text-sm block field"><span>Tema</span>
              <select name="theme">
                <option value="auto">Auto</option>
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
              </select>
            </label>
            <label class="text-sm block field"><span>Impresión tickets</span><input name="printTickets" type="checkbox" class="switch"></label>
            <label class="text-sm block field"><span>Mensajería WhatsApp</span><input name="enableWA" type="checkbox" class="switch"></label>
            <label class="text-sm block field sm:col-span-2"><span>Despedida en mensajes</span><input name="msgSign" placeholder="¡Gracias! — Microbollos Group"></label>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button id="btnSaveSettings" class="btn btn-primary"><i class="fas fa-save" aria-hidden="true"></i> Guardar ajustes</button>
      </div>
    </form>
  </div>

  <!-- PANEL: SEGURIDAD / BACKUPS -->
  <div id="panel-security" class="hidden grid md:grid-cols-2 gap-4">
    <div class="glass card p-4">
  <div class="font-medium mb-2"><i class="fas fa-archive" aria-hidden="true"></i> Respaldos locales</div>
      <div class="flex flex-wrap gap-2">
        <button id="btnExportAll" class="btn"><i class="fas fa-file-export" aria-hidden="true"></i> Exportar TODO</button>
        <label class="btn"><i class="fas fa-file-import" aria-hidden="true"></i> Importar TODO<input id="importAll" type="file" accept=".json" class="hidden"></label>
        <button id="btnClearAll" class="btn btn-rose"><i class="fas fa-bomb" aria-hidden="true"></i> Borrar datos (local)</button>
      </div>
      <p class="text-xs text-slate-400 mt-2">La exportación incluye claves: cfg_*, inv_* y otros módulos compatibles.</p>
    </div>
    <div class="glass card p-4">
  <div class="font-medium mb-2"><i class="fas fa-scroll" aria-hidden="true"></i> Auditoría</div>
      <div id="audit-list" class="space-y-2 max-h-[380px] overflow-auto"></div>
      <div class="flex justify-end mt-2">
        <button id="btnClearAudit" class="btn"><i class="fas fa-broom" aria-hidden="true"></i> Limpiar auditoría</button>
      </div>
    </div>
  </div>

  <!-- Modales -->
  ${modalUser()}
  ${modalBranch()}
</section>
    `;
  },

  mount(root) {
    // Helpers modales
    const show = (el) => { el?.classList.remove("hidden"); el?.classList.add("flex"); el && (el.style.display = "flex"); };
    const hide = (el) => { el?.classList.add("hidden"); el?.classList.remove("flex"); el && (el.style.display = "none"); };

    // Estado
    let users = [];
    let branches = [];
    let settings = load(CFG_SETTINGS_KEY, defaultSettings());

    // Config persists in localStorage for now (hybrid)
    save(CFG_SETTINGS_KEY, settings);

    // Aplicar tema inicial siempre que se monta la página
    Theme.apply(settings.theme || "auto");

    // Refs pestañas
    const tabUsers = root.querySelector("#tab-users");
    const tabBranches = root.querySelector("#tab-branches");
    const tabSettings = root.querySelector("#tab-settings");
    const tabSecurity = root.querySelector("#tab-security");
    const panelUsers = root.querySelector("#panel-users");
    const panelBranches = root.querySelector("#panel-branches");
    const panelSettings = root.querySelector("#panel-settings");
    const panelSecurity = root.querySelector("#panel-security");

    // Navegación tabs
    function setTab(which) {
      const map = { users: [tabUsers, panelUsers], branches: [tabBranches, panelBranches], settings: [tabSettings, panelSettings], security: [tabSecurity, panelSecurity] };
      Object.values(map).forEach(([t, p]) => {
        if (t) t.classList.remove("active");
        if (p) p.classList.add("hidden");
      });
      if (map[which] && map[which][0]) map[which][0].classList.add("active");
      if (map[which] && map[which][1]) map[which][1].classList.remove("hidden");
      localStorage.setItem("cfg_active_tab", which);
    }
    tabUsers.addEventListener("click", () => setTab("users"));
    tabBranches.addEventListener("click", () => setTab("branches"));
    tabSettings.addEventListener("click", () => setTab("settings"));
    tabSecurity.addEventListener("click", () => setTab("security"));
    setTab(localStorage.getItem("cfg_active_tab") || "users");

    // ====== USERS ======
    const qUsers = root.querySelector("#qUsers");
    const filterRole = root.querySelector("#filterRole");
    const filterBranch = root.querySelector("#filterBranch");
    const rowsUsers = root.querySelector("#rows-users");
    const emptyUsers = root.querySelector("#empty-users");
    const btnAddUser = root.querySelector("#btnAddUser");
    const btnExportUsers = root.querySelector("#btnExportUsers");
    const importUsers = root.querySelector("#importUsers");

    // Relleno combos
    paintRoles(filterRole, true);
    paintBranchesSelect(filterBranch, branches, "", true);

    // Modal usuario
    const userModal = root.querySelector("#user-modal");
    const userForm = root.querySelector("#user-form");
    const userClose = root.querySelector("#user-close");
    const userCancel = root.querySelector("#user-cancel");
    const userSave = root.querySelector("#user-save");
    const userSaveNew = root.querySelector("#user-save-new");
    const togglePass = root.querySelector("#user-pass-toggle");

    function openUser(data = null) {
      const F = userForm.elements;
      userForm.reset();
      F.uid.value = data?.id || rid("usr");
      F.username.value = data?.username || "";
      F.name.value = data?.full_name || "";
      F.role.value = data?.role || "admin";
      F.email.value = data?.email || "";
      F.phone.value = data?.phone || "";
      paintBranchesSelect(F.branchId, branches, data?.branch_id || "", false);
      F.active.checked = data?.active ?? true;

      // Permisos avanzados
      const p = data?.perms || {};
      F.perm_inventory.checked = !!(p.all || p.inventory);
      F.perm_suppliers.checked = !!(p.all || p.suppliers);
      F.perm_pos.checked = !!(p.all || p.pos);
      F.perm_quotes.checked = !!(p.all || p.quotes);
      F.perm_reports.checked = !!(p.all || p.reports);
      F.perm_settings.checked = !!(p.all || p.settings);
      F.perm_users.checked = !!(p.all || p.users);
      F.perm_readonly.checked = !!p.readonly;

      // Passwords vacíos -> no cambiar
      F.pass.value = "";
      F.pass2.value = "";
      show(userModal);
      setTimeout(() => F.username?.focus(), 0);
    }
    function readUserForm() {
      const F = userForm.elements;
      const perms = {
        inventory: F.perm_inventory.checked,
        suppliers: F.perm_suppliers.checked,
        pos: F.perm_pos.checked,
        quotes: F.perm_quotes.checked,
        reports: F.perm_reports.checked,
        settings: F.perm_settings.checked,
        users: F.perm_users.checked,
        readonly: F.perm_readonly.checked
      };
      const onCount = Object.values(perms).filter(Boolean).length;
      const pFinal = onCount >= 7 ? { all: true } : perms;
      return {
        id: F.uid.value,
        username: F.username.value.trim(),
        full_name: F.name.value.trim(),
        role: F.role.value,
        email: F.email.value.trim(),
        branch_id: F.branchId.value || "",
        active: !!F.active.checked,
        perms: pFinal
      };
    }
    async function saveUser(mode = "close") {
      const F = userForm.elements;
      const data = readUserForm();
      if (!data.username) return toast("Usuario obligatorio", "error");
      if (!data.full_name) return toast("Nombre obligatorio", "error");

      const pass = F.pass.value || "";
      const pass2 = F.pass2.value || "";
      if (pass || pass2) {
        if (pass.length < 4) return toast("Contraseña muy corta (mín. 4)", "error");
        if (pass !== pass2) return toast("Las contraseñas no coinciden", "error");
      }
      if (pass) data.password = pass;

      try {
        if (users.find(u => u.id === data.id)) {
          await store.users.update(data.id, data);
          toast("Usuario actualizado ✅", "success");
          logAudit("user.update", { id: data.id, username: data.username });
        } else {
          await store.users.create(data);
          toast("Usuario creado ✅", "success");
          logAudit("user.create", { username: data.username });
        }

        await loadUsers();
        if (mode === "new") openUser(null); else hide(userModal);
      } catch (err) {
        console.error(err);
        toast(err.message || "Error al guardar usuario", "error");
      }
    }
    async function delUser(id) {
      const u = users.find(x => x.id === id);
      if (!u) return;
      if (!confirm(`¿Eliminar usuario "${u.username}"?`)) return;
      try {
        await store.users.remove(id);
        await loadUsers();
        toast("Usuario eliminado", "success");
        logAudit("user.delete", { id: u.id, username: u.username });
      } catch (e) { toast(e.message, "error"); }
    }
    function toggleActive(id) {
      const u = users.find(x => x.id === id); if (!u) return;
      u.active = !u.active; u.updatedAt = new Date().toISOString();
      save(CFG_USERS_KEY, users);
      window.CFG?.setUsers(users); // 🔔
      repaintUsers();
      logAudit("user.toggleActive", { id: u.id, active: u.active });
    }
    function paintRoles(select, includeAll = false) {
      const opts = (includeAll ? [`<option value="">Todos los roles</option>`] : [])
        .concat(ROLES.map(r => `<option value="${r.id}">${r.name}</option>`));
      select.innerHTML = opts.join("");
    }
    function paintBranchesSelect(select, list, value = "", includeAll = false) {
      const base = includeAll ? `<option value="">Todas las sucursales</option>` : `<option value="">(Ninguna)</option>`;
      select.innerHTML = base + (list || []).map(b => `<option value="${b.id}">${b.name}</option>`).join("");
      select.value = value || "";
    }
    async function loadUsers() {
      try {
        users = await store.users.list();
        repaintUsers();
        window.CFG?.setUsers(users);
      } catch (err) {
        console.error("[loadUsers] error:", err);
        // Fallback or empty
        users = [];
        repaintUsers();
      }
    }


    // Cargar usuarios al iniciar
    loadUsers();

    function repaintUsers() {
      const term = (qUsers.value || "").toLowerCase().trim();
      const fr = filterRole.value || "";
      const fb = filterBranch.value || "";

      const view = users.filter(u => {
        const matchesTerm = !term || [u.username, u.full_name, u.email].join(" ").toLowerCase().includes(term);
        const matchesRole = !fr || u.role === fr;
        const matchesBranch = !fb || (u.branch_id || "") === fb;
        return matchesTerm && matchesRole && matchesBranch;
      });
      const rows = view.map(u => {
        const roleName = ROLES.find(r => r.id === u.role)?.name || u.role || "-";
        const bName = (branches.find(b => b.id === u.branch_id)?.name) || "—";
        const st = u.active ? `<span class="pill" style="color:#86efac;background:#16a34a33">Activo</span>` : `<span class="pill" style="color:#fca5a5;background:#dc262633">Inactivo</span>`;
        return `
        <tr class="hover:bg-white/5">
          <td class="font-medium">${u.username}</td>
          <td>${u.full_name || "-"}</td>
          <td>${roleName}</td>
          <td>${u.email || "-"}</td>
          <td>-</td>
          <td>${bName}</td>
          <td>${st}</td>
          <td class="text-right whitespace-nowrap">
              <button class="btn mini" data-act="toggle" data-id="${u.id}" title="Activar/Desactivar"><i class="fas fa-toggle-on" aria-hidden="true"></i></button>
              <button class="btn mini btn-indigo" data-act="edit" data-id="${u.id}" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
              <button class="btn mini btn-rose" data-act="del" data-id="${u.id}" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </td>
        </tr>`;
      }).join("");
      rowsUsers.innerHTML = rows;
      emptyUsers.classList.toggle("hidden", view.length > 0);
    }

    // Eventos user panel
    btnAddUser.addEventListener("click", () => openUser(null));
    userClose.addEventListener("click", () => hide(userModal));
    userCancel.addEventListener("click", () => hide(userModal));
    userModal.addEventListener("click", (e) => { if (e.target === userModal) hide(userModal); });
    userSave.addEventListener("click", () => saveUser("close"));
    userSaveNew.addEventListener("click", () => saveUser("new"));
    togglePass.addEventListener("click", () => {
      const F = userForm.elements;
      const type = F.pass.type === "password" ? "text" : "password";
      F.pass.type = type; F.pass2.type = type;
    });

    rowsUsers.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "edit") openUser(users.find(u => u.id === id));
      if (btn.dataset.act === "del") delUser(id);
      if (btn.dataset.act === "toggle") toggleActive(id);
    });
    [qUsers, filterRole, filterBranch].forEach(el => el.addEventListener("input", repaintUsers));

    btnExportUsers.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(users, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `usuarios_${todayISO().replace(/-/g, "")}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 300);
    });
    importUsers.addEventListener("change", (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (Array.isArray(data)) {
            users = data; save(CFG_USERS_KEY, users);
            window.CFG?.setUsers(users); // 🔔
            repaintUsers(); toast("Usuarios importados ✅", "success"); logAudit("users.import", { count: users.length });
          } else toast("Archivo inválido", "error");
        } catch { toast("Archivo inválido", "error"); }
        importUsers.value = "";
      };
      r.readAsText(f);
    });

    // ====== BRANCHES ======
    const qBranches = root.querySelector("#qBranches");
    const rowsBranches = root.querySelector("#rows-branches");
    const emptyBranches = root.querySelector("#empty-branches");
    const btnAddBranch = root.querySelector("#btnAddBranch");
    const btnExportBranches = root.querySelector("#btnExportBranches");
    const importBranches = root.querySelector("#importBranches");

    const branchModal = root.querySelector("#branch-modal");
    const branchForm = root.querySelector("#branch-form");
    const branchClose = root.querySelector("#branch-close");
    const branchCancel = root.querySelector("#branch-cancel");
    const branchSave = root.querySelector("#branch-save");
    const branchSaveNew = root.querySelector("#branch-save-new");

    function openBranch(data = null) {
      const F = branchForm.elements;
      branchForm.reset();
      F.bid.value = data?.id || rid("br");
      F.name.value = data?.name || "";
      F.manager.value = data?.manager || "";
      F.phone.value = data?.phone || "";
      F.email.value = data?.email || "";
      F.address.value = data?.address || "";
      F.city.value = data?.city || "";
      F.state.value = data?.state || "";
      F.zip.value = data?.zip || "";
      F.hours.value = data?.hours || "";
      F.cuit.value = data?.cuit || "";
      F.notes.value = data?.notes || "";
      show(branchModal);
      setTimeout(() => F.name?.focus(), 0);
    }
    function readBranchForm() {
      const F = branchForm.elements;
      return {
        id: F.bid.value,
        name: F.name.value.trim(),
        manager: F.manager.value.trim(),
        phone: F.phone.value.trim(),
        email: F.email.value.trim(),
        address: F.address.value.trim(),
        city: F.city.value.trim(),
        state: F.state.value.trim(),
        zip: F.zip.value.trim(),
        hours: F.hours.value.trim(),
        cuit: F.cuit.value.trim(),
        notes: F.notes.value.trim(),
        updatedAt: new Date().toISOString()
      };
    }
    async function saveBranch(mode = "close") {
      const data = readBranchForm();
      if (!data.name) return toast("Nombre de sucursal obligatorio", "error");

      try {
        let isNew = !branches.find(b => b.id === data.id);
        if (isNew) {
          await store.branches.create(data);
          logAudit("branch.create", { name: data.name });
        } else {
          await store.branches.update(data.id, data);
          logAudit("branch.update", { name: data.name });
        }

        await loadBranches();
        toast("Sucursal guardada ✅", "success");
        if (mode === "new") { openBranch(null); } else { hide(branchModal); }
      } catch (e) { toast(e.message, "error"); }
    }
    async function delBranch(id) {
      const b = branches.find(x => x.id === id); if (!b) return;
      if (!confirm(`¿Eliminar sucursal "${b.name}"?`)) return;
      try {
        await store.branches.remove(id);
        await loadBranches();
        toast("Sucursal eliminada", "success");
        logAudit("branch.delete", { id: b.id, name: b.name });
      } catch (e) { toast(e.message, "error"); }
    }

    async function loadBranches() {
      try {
        branches = await store.branches.list();
        repaintBranches();
        paintBranchesSelect(filterBranch, branches, filterBranch.value, true);
        window.CFG?.setBranches(branches);
      } catch (e) { console.error(e); }
    }
    loadBranches();
    function repaintBranches() {
      const term = (qBranches.value || "").toLowerCase().trim();
      const view = branches.filter(b => {
        const matchesTerm = !term || [b.name, b.manager, b.address, b.city, b.state, b.cuit].join(" ").toLowerCase().includes(term);
        return matchesTerm;
      });
      rowsBranches.innerHTML = view.map(b => `
        <tr class="hover:bg-white/5">
          <td class="font-medium">${b.name}</td>
          <td>${b.manager || "-"}</td>
          <td>${b.phone || "-"}</td>
          <td>${b.email || "-"}</td>
          <td>${[b.address, b.city, b.state].filter(Boolean).join(", ") || "-"}</td>
          <td>${b.cuit || "-"}</td>
          <td class="text-right whitespace-nowrap">
            <button class="btn mini btn-indigo" data-act="edit" data-id="${b.id}" title="Editar"><i class="fas fa-edit" aria-hidden="true"></i></button>
            <button class="btn mini btn-rose" data-act="del" data-id="${b.id}" title="Eliminar"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </td>
        </tr>`).join("");
      emptyBranches.classList.toggle("hidden", view.length > 0);
    }

    // Eventos branches
    btnAddBranch.addEventListener("click", () => openBranch(null));
    branchClose.addEventListener("click", () => hide(branchModal));
    branchCancel.addEventListener("click", () => hide(branchModal));
    branchModal.addEventListener("click", (e) => { if (e.target === branchModal) hide(branchModal); });
    branchSave.addEventListener("click", () => saveBranch("close"));
    branchSaveNew.addEventListener("click", () => saveBranch("new"));
    qBranches.addEventListener("input", repaintBranches);
    rowsBranches.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "edit") openBranch(branches.find(b => b.id === id));
      if (btn.dataset.act === "del") delBranch(id);
    });
    btnExportBranches.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(branches, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `sucursales_${todayISO().replace(/-/g, "")}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 300);
    });
    importBranches.addEventListener("change", (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (Array.isArray(data)) {
            branches = data; save(CFG_BRANCHES_KEY, branches);
            window.CFG?.setBranches(branches); // 🔔
            repaintBranches(); paintBranchesSelect(filterBranch, branches, "", true);
            toast("Sucursales importadas ✅", "success"); logAudit("branches.import", { count: branches.length });
          } else toast("Archivo inválido", "error");
        } catch { toast("Archivo inválido", "error"); }
        importBranches.value = "";
      };
      r.readAsText(f);
    });

    // ====== SETTINGS ======
    const formSettings = root.querySelector("#form-settings");
    const btnSaveSettings = root.querySelector("#btnSaveSettings");

    function fillSettingsForm() {
      const S = formSettings.elements; const s = settings;
      S.companyName.value = s.companyName || ""; S.brandName.value = s.brandName || "";
      S.cuit.value = s.cuit || ""; S.iibb.value = s.iibb || ""; S.address.value = s.address || "";
      S.email.value = s.email || ""; S.phone.value = s.phone || "";
      S.currency.value = s.currency || "ARS"; S.locale.value = s.locale || "es-AR";
      S.decimals.value = s.decimals ?? 2; S.iva.value = s.iva ?? 21;
      S.invoicePrefix.value = s.invoicePrefix || "MB-"; S.invoiceNext.value = s.invoiceNext ?? 1;
      S.theme.value = s.theme || "auto"; S.printTickets.checked = !!s.printTickets; S.enableWA.checked = !!s.enableWA;
      S.msgSign.value = s.msgSign || "";
    }
    function readSettingsForm() {
      const S = formSettings.elements;
      return {
        companyName: S.companyName.value.trim(),
        brandName: S.brandName.value.trim(),
        cuit: S.cuit.value.trim(),
        iibb: S.iibb.value.trim(),
        address: S.address.value.trim(),
        email: S.email.value.trim(),
        phone: S.phone.value.trim(),
        currency: S.currency.value,
        locale: S.locale.value,
        decimals: Math.min(4, Math.max(0, parseInt(S.decimals.value || "2", 10))),
        iva: parseFloat(S.iva.value || "21") || 0,
        invoicePrefix: S.invoicePrefix.value.trim(),
        invoiceNext: Math.max(1, parseInt(S.invoiceNext.value || "1", 10)),
        theme: S.theme.value,
        printTickets: !!S.printTickets.checked,
        enableWA: !!S.enableWA.checked,
        msgSign: S.msgSign.value.trim(),
        updatedAt: new Date().toISOString()
      };
    }
    btnSaveSettings.addEventListener("click", () => {
      const data = readSettingsForm();
      settings = { ...settings, ...data };
      save(CFG_SETTINGS_KEY, settings);
      // 🔔 avisar al sistema
      window.CFG?.setSettings(settings);
      // Aplicar tema inmediatamente
      Theme.apply(settings.theme);

      toast("Ajustes guardados ✅", "success");
      logAudit("settings.update", { currency: settings.currency, locale: settings.locale, theme: settings.theme });
    });
    fillSettingsForm();

    // ====== SECURITY / BACKUPS / AUDIT ======
    const btnExportAll = root.querySelector("#btnExportAll");
    const importAll = root.querySelector("#importAll");
    const btnClearAll = root.querySelector("#btnClearAll");
    const auditList = root.querySelector("#audit-list");
    const btnClearAudit = root.querySelector("#btnClearAudit");

    function snapshotAll() {
      // Sólo claves del sistema (cfg_* e inv_*) + futuras "pos_" etc.
      const out = { exportedAt: new Date().toISOString(), version: 1, data: {} };
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^(cfg_|inv_|pos_)/.test(k)) out.data[k] = localStorage.getItem(k);
      }
      return out;
    }
    function renderAudit() {
      const a = load(CFG_AUDIT_KEY, []);
      if (!a.length) { auditList.innerHTML = `<div class="text-slate-400 text-xs">Aún sin eventos.</div>`; return; }
      auditList.innerHTML = a.map(e => `
        <div class="glass rounded p-2 text-xs">
          <div class="flex items-center justify-between">
            <div class="font-medium">${e.action}</div>
            <div class="text-slate-400">${fmtDateTime(e.ts)}</div>
          </div>
          <pre class="mt-1 whitespace-pre-wrap">${JSON.stringify(e.details || {}, null, 2)}</pre>
        </div>`).join("");
    }
    btnExportAll.addEventListener("click", () => {
      const snap = snapshotAll();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `backup_total_${todayISO().replace(/-/g, "")}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 300);
      logAudit("backup.export", { keys: Object.keys(snap.data).length });
      renderAudit();
    });
    importAll.addEventListener("change", (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          if (!parsed || !parsed.data) throw new Error("formato");
          const keys = Object.keys(parsed.data);
          keys.forEach(k => {
            localStorage.setItem(k, parsed.data[k]);
          });
          // Reload estado local
          users = load(CFG_USERS_KEY, users);
          branches = load(CFG_BRANCHES_KEY, branches);
          settings = load(CFG_SETTINGS_KEY, settings);

          // 🔔 avisos globales
          window.CFG?.setUsers(users);
          window.CFG?.setBranches(branches);
          window.CFG?.setSettings(settings);

          // Aplicar tema importado
          Theme.apply(settings.theme);

          repaintUsers(); repaintBranches(); paintBranchesSelect(filterBranch, branches, "", true); fillSettingsForm();
          toast("Backup importado ✅", "success");
          logAudit("backup.import", { keys: keys.length });
          renderAudit();
        } catch { toast("Archivo inválido", "error"); }
        importAll.value = "";
      };
      r.readAsText(f);
    });
    btnClearAll.addEventListener("click", () => {
      if (!confirm("Esto borrará TODOS los datos locales del sistema (cfg_*, inv_*, pos_*). ¿Continuar?")) return;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^(cfg_|inv_|pos_)/.test(k)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      users = []; branches = []; settings = defaultSettings();
      save(CFG_SETTINGS_KEY, settings);

      // 🔔 avisos globales
      window.CFG?.setUsers(users);
      window.CFG?.setBranches(branches);
      window.CFG?.setSettings(settings);

      // Tema vuelve a default (auto)
      Theme.apply(settings.theme);

      repaintUsers(); repaintBranches(); fillSettingsForm(); paintBranchesSelect(filterBranch, branches, "", true);
      renderAudit();
      toast("Datos locales borrados ✅", "success");
      logAudit("backup.clearAll", { removed: toRemove.length });
    });
    btnClearAudit.addEventListener("click", () => {
      if (!confirm("¿Limpiar la auditoría local?")) return;
      save(CFG_AUDIT_KEY, []); renderAudit(); toast("Auditoría limpiada", "success");
    });
    renderAudit();

    // ====== Pintado inicial ======
    repaintUsers();
    repaintBranches();
  }
};

// ===== Modales =====
function modalUser() {
  return /*html*/`
  <div id="user-modal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-black/60" style="display:none">
    <div class="bg-slate-900 border border-white/10 rounded-xl w-[min(92vw,900px)] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
  <h2 class="text-lg font-semibold"><i class="fas fa-user" aria-hidden="true"></i> Usuario</h2>
  <button id="user-close" type="button" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <form id="user-form" onsubmit="return false;" class="p-4 space-y-3">
        <input type="hidden" name="uid">
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block field"><span>Usuario *</span>
            <input name="username" required></label>
          <label class="text-sm block field sm:col-span-2"><span>Nombre *</span>
            <input name="name" required></label>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block field"><span>Rol</span>
            <select name="role">
              <option value="admin">Administrador</option>
              <option value="stock">Depósito</option>
              <option value="ventas">Ventas/Caja</option>
              <option value="consulta">Consulta</option>
            </select></label>
          <label class="text-sm block field"><span>Email</span>
            <input type="email" name="email"></label>
          <label class="text-sm block field"><span>Teléfono</span>
            <input name="phone"></label>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="text-sm block field sm:col-span-2"><span>Sucursal</span>
            <select name="branchId"></select></label>
          <label class="text-sm block field"><span>Activo</span><br>
            <input type="checkbox" name="active" class="switch"></label>
        </div>
        <div class="glass rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div class="font-medium"><i class="fas fa-key" aria-hidden="true"></i> Contraseña</div>
              <button id="user-pass-toggle" type="button" class="btn mini"><i class="fas fa-eye" aria-hidden="true"></i> Mostrar/Ocultar</button>
          </div>
          <div class="grid sm:grid-cols-2 gap-3 mt-2">
            <label class="text-sm block field"><span>Nueva contraseña</span>
              <input name="pass" type="password" placeholder="Dejar en blanco para no cambiar"></label>
            <label class="text-sm block field"><span>Repetir</span>
              <input name="pass2" type="password" placeholder="Repite la clave"></label>
          </div>
          <div class="text-xs text-slate-400 mt-1">Tip: mínimo 4 caracteres. La contraseña se guarda hasheada en local.</div>
        </div>
        <div class="glass rounded-lg p-3">
          <div class="font-medium mb-2"><i class="fas fa-cogs" aria-hidden="true"></i> Permisos avanzados</div>
          <div class="grid sm:grid-cols-3 gap-2 text-sm">
            <label><input type="checkbox" name="perm_inventory"> Inventario</label>
            <label><input type="checkbox" name="perm_suppliers"> Proveedores</label>
            <label><input type="checkbox" name="perm_pos"> POS</label>
            <label><input type="checkbox" name="perm_quotes"> Presupuestos</label>
            <label><input type="checkbox" name="perm_reports"> Reportes</label>
            <label><input type="checkbox" name="perm_settings"> Configuración</label>
            <label><input type="checkbox" name="perm_users"> Usuarios</label>
            <label><input type="checkbox" name="perm_readonly"> Sólo lectura</label>
          </div>
          <div class="text-xs text-slate-400 mt-1">Si activás casi todo, el sistema lo tratará como “Acceso total”.</div>
        </div>
          <div class="flex justify-end gap-2">
          <button type="button" class="btn" id="user-cancel"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
          <button type="button" class="btn" id="user-save-new"><i class="fas fa-save" aria-hidden="true"></i> Guardar y nuevo</button>
          <button type="button" class="btn btn-primary" id="user-save"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
`;
}

// ===== Modal Sucursal (rehecho y sin scroll horizontal) =====
function modalBranch() {
  return /*html*/`
  <div id="branch-modal" class="fixed inset-0 z-[1000] hidden items-center justify-center overlay" style="display:none">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="branch-title">
        <div class="dialog-head flex items-center justify-between">
        <h2 id="branch-title" class="dialog-title"><i class="fas fa-building" aria-hidden="true"></i> Sucursal</h2>
        <button id="branch-close" type="button" class="btn mini"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>

      <form id="branch-form" onsubmit="return false;" class="dialog-body">
        <input type="hidden" name="bid">

        <div class="row">
          <label class="field col-6"><span>Nombre *</span><input name="name" required></label>
          <label class="field col-6"><span>Responsable</span><input name="manager"></label>
        </div>

        <div class="row" style="margin-top:.75rem">
          <label class="field col-4"><span>Teléfono</span><input name="phone"></label>
          <label class="field col-5"><span>Email</span><input name="email" type="email"></label>
          <label class="field col-3"><span>CUIT</span><input name="cuit"></label>
        </div>

        <div class="row" style="margin-top:.75rem">
          <label class="field col-12"><span>Dirección</span><input name="address"></label>
        </div>

        <div class="row" style="margin-top:.75rem">
          <label class="field col-5"><span>Ciudad</span><input name="city"></label>
          <label class="field col-5"><span>Provincia</span><input name="state"></label>
          <label class="field col-2"><span>CP</span><input name="zip"></label>
        </div>

        <div class="row" style="margin-top:.75rem">
          <label class="field col-5"><span>Horario</span>
            <input name="hours" placeholder="Lun a Vie 9–18h"></label>
          <label class="field col-7"><span>Notas</span><textarea name="notes"></textarea></label>
        </div>
      </form>

      <div class="dialog-foot">
        <button type="button" class="btn" id="branch-cancel"><i class="fas fa-times" aria-hidden="true"></i> Cancelar</button>
        <button type="button" class="btn" id="branch-save-new"><i class="fas fa-save" aria-hidden="true"></i> Guardar y nuevo</button>
        <button type="button" class="btn btn-primary" id="branch-save"><i class="fas fa-save" aria-hidden="true"></i> Guardar</button>
      </div>
    </div>
  </div>
`;
}
