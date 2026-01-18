// ./pages/Configuracion.js
// Panel de Configuración “full stack” para Microbollos POS
// Gestión de Usuarios, Sucursales, Ajustes del sistema, Seguridad/Backups, Auditoría.
// 100% vanilla JS, UI consistente (glass/cards/tablas/modales).
//
// CAMBIOS RECIENTES:
// - Reemplazo de Emojis por FontAwesome Icons (<i class="fas ...">)
// - Campo "Sucursal" en Usuarios (asignación)
// - Campo "CUIT" en Sucursales
// - Corrección de listados

import store, { users, branches } from "../store.js";

const CFG_USERS_KEY = "cfg_users";
const CFG_BRANCHES_KEY = "cfg_branches";
const CFG_SETTINGS_KEY = "cfg_settings";
const CFG_AUDIT_KEY = "cfg_audit";

// También tomamos claves de otros módulos para backup total
const INV_ITEMS_KEY = "inv_items";
const INV_SUPPLIERS_KEY = "inv_suppliers";
const INV_LIST_KEY = "inv_buy_list";

// ===== Utilidades comunes =====
function rid(p = "id") { return p + "_" + Math.random().toString(36).slice(2, 7); }
function load(key, def) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function toast(msg, type = "info") {
  const c = document.createElement("div");
  // Colores mejorados para toast
  const colors = {
    info: "bg-blue-600",
    success: "bg-green-600",
    error: "bg-red-600",
    warn: "bg-amber-600"
  };
  const color = colors[type] || colors.info;
  c.className = `fixed bottom-4 right-4 ${color} text-white px-6 py-3 rounded-lg shadow-xl z-[9999] animate-bounce-in font-medium flex items-center gap-2`;

  // Icono según tipo
  let icon = "fa-info-circle";
  if (type === 'success') icon = "fa-check-circle";
  if (type === 'error') icon = "fa-exclamation-triangle";
  if (type === 'warn') icon = "fa-exclamation-circle";

  c.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 3000);
}
function todayISO() { return new Date().toISOString().split("T")[0]; }
function fmtDateTime(d) { if (!d) return "-"; return new Date(d).toLocaleString(); }

// Rol y permisos por defecto
const ROLES = [
  { id: "admin", name: "Administrador", desc: "Acceso total", perms: { all: true } },
  { id: "stock", name: "Depósito", desc: "Insumos, Proveedores, compras", perms: { inventory: true, suppliers: true } },
  { id: "ventas", name: "Ventas/Caja", desc: "Presupuestos, POS, cobros", perms: { pos: true, quotes: true, reports: true } },
  { id: "consulta", name: "Consulta", desc: "Sólo lectura", perms: { readonly: true } },
];

// ====== Hash de contraseña (mejor esfuerzo en cliente) ======
async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return "sha256:" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ====== Auditoría ======
function logAudit(action, details = {}) {
  const logs = load(CFG_AUDIT_KEY, []);
  logs.unshift({ id: rid("aud"), date: new Date().toISOString(), user: "admin", action, details });
  if (logs.length > 500) logs.pop();
  save(CFG_AUDIT_KEY, logs);
}

// ====== Ajustes por defecto ======
function defaultSettings() {
  return {
    brandName: "Microbollos Group",
    companyName: "José Heredia",
    address: "Av. Ejemplo 123",
    phone: "351-1234567",
    email: "contacto@microbollos.com",
    taxRate: 21,
    invoiceType: "B",
    logoData: null, // base64
  };
}

// ====== Theme manager (auto / dark / light) ======
const Theme = (() => {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  let mode = "auto";

  function compute(theme) {
    if (theme === "auto") return media?.matches ? "dark" : "light";
    return theme;
  }
  function apply(theme = "auto") {
    mode = theme;
    const real = compute(theme);
    if (real === "dark") document.documentElement.classList.add("dark", "sl-theme-dark");
    else document.documentElement.classList.remove("dark", "sl-theme-dark");
    document.documentElement.setAttribute("data-theme", real);
  }

  media?.addEventListener?.("change", () => { if (mode === "auto") apply("auto"); });

  return { apply };
})();

// ===== Export default =====
export default {
  render() {
    return /*html*/`
      <div class="h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <!-- Header -->
        <header class="flex-none surface-alt border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <i class="fas fa-cogs text-blue-600"></i> Configuración
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Sistema y Usuarios</p>
          </div>
          <!-- Tabs Navigation -->
          <nav class="flex gap-2">
            ${[
        { id: "tab-gral", label: "General", icon: "fa-sliders-h" },
        { id: "tab-suc", label: "Sucursales", icon: "fa-store-alt" },
        { id: "tab-usr", label: "Usuarios", icon: "fa-users-cog" },
        { id: "tab-sec", label: "Seguridad", icon: "fa-shield-alt" }
      ].map(t => `
              <button id="${t.id}" onclick="window.mount.setTab('${t.id}')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                       hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                 <i class="fas ${t.icon}"></i> ${t.label}
              </button>
            `).join("")}
          </nav>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-6 relative">
          
          <!-- TAB: General -->
          <section id="panel-tab-gral" class="config-panel space-y-6 max-w-4xl mx-auto hidden animate-fade-in">
            <div class="surface rounded-xl shadow-sm overflow-hidden">
              <div class="p-4 border-b border-slate-200 dark:border-slate-700 surface-alt flex items-center gap-2">
                 <i class="fas fa-building text-blue-500"></i> <h3 class="font-bold text-lg">Datos de la Empresa</h3>
              </div>
              <div class="p-6 grid gap-6 md:grid-cols-2">
                <div class="md:col-span-2 flex justify-center mb-4">
                   <div class="relative group cursor-pointer" onclick="document.getElementById('logoInput').click()">
                     <img id="previewLogo" src="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQxYjJjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDE1diRhMnIgMiAwIDAgMS0yIDJIMUM1YTIgMjAgMCAwIDEtMi0ydjRhMiAyIDAgMCAxIDItMmgzIi8+PHBhdGggZD0iTTE2IDEzbC00LTRsLTQgNCIvPjxwYXRoIGQ9Ik0xMiA5djEzIi8+PC9zdmc+'" alt="Logo" class="h-32 w-auto object-contain rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900" />
                     <div class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-xs">
                        <i class="fas fa-camera text-2xl mb-1"></i>
                        <span>Cambiar Logo</span>
                     </div>
                     <input type="file" id="logoInput" accept="image/*" class="hidden">
                   </div>
                </div>

                <label class="block">
                  <span class="text-sm font-medium text-main">Nombre de Fantasía</span>
                  <input id="cfg-brand" type="text" class="ui-input w-full mt-1 surface" placeholder="Ej: Microbollos">
                </label>
                <label class="block">
                   <span class="text-sm font-medium text-main">Razón Social</span>
                   <input id="cfg-company" type="text" class="ui-input w-full mt-1 surface" placeholder="Ej: José Heredia">
                </label>
                <label class="block md:col-span-2">
                   <span class="text-sm font-medium text-main">Dirección</span>
                   <input id="cfg-addr" type="text" class="ui-input w-full mt-1 surface">
                </label>
                <label class="block">
                   <span class="text-sm font-medium text-main">Teléfono</span>
                   <input id="cfg-phone" type="text" class="ui-input w-full mt-1 surface">
                </label>
                <label class="block">
                   <span class="text-sm font-medium text-main">Email</span>
                   <input id="cfg-email" type="email" class="ui-input w-full mt-1 surface">
                </label>
                <label class="block">
                    <span class="text-sm font-medium text-main">Impuestos default (%)</span>
                    <input id="cfg-tax" type="number" step="0.5" class="ui-input w-full mt-1 surface">
                </label>
                <label class="block">
                    <span class="text-sm font-medium text-main">Tipo Factura</span>
                    <select id="cfg-inv" class="ui-input w-full mt-1 surface">
                       <option value="A">Factura A</option>
                       <option value="B">Factura B</option>
                       <option value="C">Factura C</option>
                       <option value="X">Presupuesto X</option>
                    </select>
                </label>
              </div>
              <div class="p-4 border-t border-slate-200 dark:border-slate-700 surface-alt flex justify-end">
                <button onclick="window.mount.saveSettings()" class="btn-primary flex items-center gap-2">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
              </div>
            </div>

            <div class="surface rounded-xl shadow-sm overflow-hidden">
               <div class="p-4 border-b border-slate-200 dark:border-slate-700 surface-alt flex items-center gap-2">
                  <i class="fas fa-paint-brush text-purple-500"></i> <h3 class="font-bold text-lg">Apariencia</h3>
               </div>
               <div class="p-6 flex items-center gap-4">
                  <span class="text-sm font-medium">Tema:</span>
                  <button onclick="window.mount.setTheme('light')" class="px-3 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 surface"><i class="fas fa-sun text-amber-500"></i> Claro</button>
                  <button onclick="window.mount.setTheme('dark')" class="px-3 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 surface"><i class="fas fa-moon text-indigo-400"></i> Oscuro</button>
                  <button onclick="window.mount.setTheme('auto')" class="px-3 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 surface"><i class="fas fa-adjust"></i> Auto</button>
               </div>
            </div>
          </section>

          <!-- TAB: Sucursales -->
          <section id="panel-tab-suc" class="config-panel space-y-6 max-w-6xl mx-auto hidden animate-fade-in">
             <div class="flex justify-between items-center mb-4">
                <div class="relative">
                   <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                   <input type="text" id="branchSearch" onkeyup="window.mount.filterBranches()" placeholder="Buscar sucursal..." class="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 surface focus:ring-2 focus:ring-blue-500 outline-none w-64">
                </div>
                <button onclick="window.mount.openBranch()" class="btn-primary flex items-center gap-2">
                   <i class="fas fa-plus"></i> Nueva Sucursal
                </button>
             </div>
             <div class="surface rounded-xl shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse">
                   <thead class="surface-alt text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                      <tr>
                         <th class="p-4">Nombre</th>
                         <th class="p-4">Dirección</th>
                         <th class="p-4">Teléfono</th>
                         <th class="p-4">CUIT</th>
                         <th class="p-4 text-right">Acciones</th>
                      </tr>
                   </thead>
                   <tbody id="branchTableBody" class="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <!-- dynamics -->
                   </tbody>
                </table>
             </div>
          </section>

          <!-- TAB: Usuarios -->
          <section id="panel-tab-usr" class="config-panel space-y-6 max-w-6xl mx-auto hidden animate-fade-in">
             <div class="flex justify-between items-center mb-4">
                <div class="relative">
                   <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                     <i class="fas fa-search"></i>
                   </div>
                   <input type="text" id="userSearch" onkeyup="window.mount.filterUsers()" placeholder="Buscar usuarios..." class="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 surface focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-slate-50 dark:bg-slate-900 shadow-inner">
                </div>
                <button onclick="window.mount.openUser()" class="btn-primary flex items-center gap-2">
                   <i class="fas fa-user-plus"></i> Nuevo Usuario
                </button>
             </div>
             <div class="surface rounded-xl shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse">
                   <thead class="surface-alt text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                      <tr>
                         <th class="p-4">Usuario</th>
                         <th class="p-4">Nombre</th>
                         <th class="p-4">Rol</th>
                         <th class="p-4">Sucursal</th>
                         <th class="p-4 text-center">Estado</th>
                         <th class="p-4 text-right">Acciones</th>
                      </tr>
                   </thead>
                   <tbody id="userTableBody" class="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <!-- dynamics -->
                   </tbody>
                </table>
             </div>
          </section>

          <!-- TAB: Seguridad & Backup -->
          <section id="panel-tab-sec" class="config-panel space-y-6 max-w-4xl mx-auto hidden animate-fade-in">
             <div class="grid md:grid-cols-2 gap-6">
                <!-- Backup -->
                <div class="surface rounded-xl shadow-sm p-6">
                   <div class="flex items-center gap-3 mb-4 text-blue-600">
                      <i class="fas fa-database text-2xl"></i> <h3 class="font-bold text-lg">Copia de Seguridad</h3>
                   </div>
                   <p class="text-sm text-slate-500 mb-6">Descarga toda la base de datos local en formato JSON.</p>
                   <button onclick="window.mount.downloadBackup()" class="w-full btn-outline flex justify-center items-center gap-2">
                       <i class="fas fa-download"></i> Descargar Backup
                   </button>
                   <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <label class="block text-sm mb-2 font-medium">Restaurar copia</label>
                      <input type="file" id="restoreFile" class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-500">
                      <button onclick="window.mount.restoreBackup()" class="mt-2 w-full btn-secondary text-xs">
                          <i class="fas fa-upload"></i> Restaurar
                      </button>
                   </div>
                </div>
                
                <!-- Auditoría -->
                <div class="surface rounded-xl shadow-sm p-6 flex flex-col">
                   <div class="flex items-center gap-3 mb-4 text-amber-600">
                      <i class="fas fa-list-alt text-2xl"></i> <h3 class="font-bold text-lg">Log de Auditoría</h3>
                   </div>
                   <div class="flex-1 overflow-auto max-h-60 surface-alt rounded border border-slate-200 dark:border-slate-700 p-2 text-xs font-mono space-y-1" id="auditLogContainer">
                      <!-- logs -->
                      <div class="text-slate-400 italic text-center py-4">Sin registros recientes</div>
                   </div>
                   <button onclick="window.mount.clearAudit()" class="mt-4 text-xs text-red-500 hover:underline text-right">
                       <i class="fas fa-trash-alt"></i> Limpiar historial
                   </button>
                </div>
             </div>
          </section>

        </main>

        <!-- MODAL USUARIO -->
        ${this.modalUser()}
        <!-- MODAL SUCURSAL -->
        ${this.modalBranch()}
      </div>
    `;
  },

  mount(root) {
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => root.querySelectorAll(s);

    // Initial global export to support inline onclick="mount.action()"
    window.mount = {};

    // Estado local de data
    let localUsers = [];
    let localBranches = [];
    let activeTab = "tab-gral";

    // --- Tab Navigation ---
    const setTab = (id) => {
      activeTab = id;
      $$(".config-panel").forEach(p => p.classList.add("hidden"));
      const target = root.querySelector("#panel-" + id);
      if (target) {
        target.classList.remove("hidden");
        // Trigger animations
        target.classList.remove("animate-fade-in");
        void target.offsetWidth;
        target.classList.add("animate-fade-in");
      }

      // Update nav styles
      $$("nav button").forEach(b => {
        if (b.id === id) {
          b.classList.add("bg-blue-100", "dark:bg-slate-700", "text-blue-700", "dark:text-blue-300");
          b.classList.remove("text-slate-600", "dark:text-slate-300");
        } else {
          b.classList.remove("bg-blue-100", "dark:bg-slate-700", "text-blue-700", "dark:text-blue-300");
          b.classList.add("text-slate-600", "dark:text-slate-300");
        }
      });

      // Reload data if needed
      if (id === "tab-usr") loadUsers();
      if (id === "tab-suc") loadBranches();
      if (id === "tab-gral") fillSettingsForm();
      if (id === "tab-sec") renderAudit();
    };
    window.mount.setTab = setTab;

    // --- SETTINGS LOGIC ---
    const logoInput = $("#logoInput");
    const previewLogo = $("#previewLogo");

    if (logoInput) {
      logoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => { previewLogo.src = ev.target.result; };
          reader.readAsDataURL(file);
        }
      });
    }

    const fillSettingsForm = () => {
      const cfg = load(CFG_SETTINGS_KEY, defaultSettings());
      if (!$("#cfg-brand")) return; // safety
      $("#cfg-brand").value = cfg.brandName || "";
      $("#cfg-company").value = cfg.companyName || "";
      $("#cfg-addr").value = cfg.address || "";
      $("#cfg-phone").value = cfg.phone || "";
      $("#cfg-email").value = cfg.email || "";
      $("#cfg-tax").value = cfg.taxRate || 21;
      $("#cfg-inv").value = cfg.invoiceType || "B";
      if (previewLogo) previewLogo.src = cfg.logoData || "assets/logo-placeholder.png";
    };

    window.mount.saveSettings = () => {
      const cfg = load(CFG_SETTINGS_KEY, defaultSettings());
      cfg.brandName = $("#cfg-brand").value;
      cfg.companyName = $("#cfg-company").value;
      cfg.address = $("#cfg-addr").value;
      cfg.phone = $("#cfg-phone").value;
      cfg.email = $("#cfg-email").value;
      cfg.taxRate = parseFloat($("#cfg-tax").value) || 0;
      cfg.invoiceType = $("#cfg-inv").value;

      // Logo?
      if (previewLogo && previewLogo.src && previewLogo.src.startsWith("data:image")) {
        cfg.logoData = previewLogo.src;
      }

      save(CFG_SETTINGS_KEY, cfg);
      toast("Configuración guardada", "success");
      logAudit("SAVE_SETTINGS");
    };

    window.mount.setTheme = (t) => {
      Theme.apply(t);
      toast("Tema actualizado: " + t);
    };

    // --- USERS LOGIC ---
    const loadUsers = async () => {
      const tbody = $("#userTableBody");
      try {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center"><i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;
        localUsers = await store.users.list();
        if (!Array.isArray(localUsers)) localUsers = []; // safety
        repaintUsers();
      } catch (e) {
        toast("Error cargando usuarios: " + e.message, "error");
        console.error(e);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error cargando usuarios. Intenta recargar la página.</td></tr>`;
      }
    };
    window.mount.loadUsers = loadUsers;

    const repaintUsers = () => {
      const term = ($("#userSearch").value || "").toLowerCase();
      const tbody = $("#userTableBody");
      if (!tbody) return;
      tbody.innerHTML = "";

      const filters = term ? localUsers.filter(u => u.username.toLowerCase().includes(term) || (u.full_name || "").toLowerCase().includes(term)) : localUsers;

      if (filters.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 italic">No se encontraron usuarios. <button onclick="mount.loadUsers()" class="underline text-blue-500">Recargar</button></td></tr>`;
        return;
      }

      filters.forEach(u => {
        // Find branch name
        const bName = localBranches.find(b => b.id == u.branch_id)?.name || "-";

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors";
        tr.innerHTML = `
              <td class="p-4 font-medium">${u.username}</td>
              <td class="p-4 text-slate-500 dark:text-slate-400">${u.full_name || ""}</td>
              <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600">${ROLES.find(r => r.id === u.role)?.name || u.role}</span></td>
              <td class="p-4">${bName}</td>
              <td class="p-4 text-center">
                 ${u.active ? '<span class="text-green-500"><i class="fas fa-check"></i></span>' : '<span class="text-slate-300"><i class="fas fa-times"></i></span>'}
              </td>
              <td class="p-4 text-right space-x-2">
                 <button onclick="mount.openUser('${u.id}')" class="text-blue-500 hover:text-blue-700 p-1" title="Editar"><i class="fas fa-edit"></i></button>
                 ${u.username !== 'admin' ? `<button onclick="mount.delUser('${u.id}')" class="text-red-500 hover:text-red-700 p-1" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
              </td>
           `;
        tbody.appendChild(tr);
      });
    };
    window.mount.filterUsers = repaintUsers;

    // Modal Users
    const uModal = $("#user-modal");
    let editingUserId = null;

    window.mount.openUser = (uid = null) => {
      editingUserId = uid;
      uModal.classList.remove("hidden");
      // Paint roles & branches
      const rSel = $("#u-role");
      rSel.innerHTML = ROLES.map(r => `<option value="${r.id}">${r.name}</option>`).join("");

      const bSel = $("#u-branch");
      // Ensure branches loaded
      if (localBranches.length === 0) store.branches.list().then(l => { localBranches = l; paintBranchOptions(bSel); });
      else paintBranchOptions(bSel);

      if (uid) {
        const u = localUsers.find(x => x.id === uid);
        if (!u) return;
        $("#u-user").value = u.username;
        $("#u-fullname").value = u.full_name || "";
        $("#u-email").value = u.email || "";
        $("#u-pass").value = ""; // blank logic
        $("#u-pass").placeholder = "(Dejar vacío para no cambiar)";
        $("#u-role").value = u.role;
        $("#u-active").checked = !!u.active;
        $("#u-branch").value = u.branch_id || "";
        $("#u-title").innerText = "Editar Usuario";
      } else {
        $("#u-user").value = "";
        $("#u-fullname").value = "";
        $("#u-email").value = "";
        $("#u-pass").value = "";
        $("#u-pass").placeholder = "Contraseña";
        $("#u-role").value = "user";
        $("#u-active").checked = true;
        $("#u-branch").value = "";
        $("#u-title").innerText = "Nuevo Usuario";
      }
    };

    const paintBranchOptions = (sel) => {
      sel.innerHTML = `<option value="">-- Sin asignar --</option>` +
        localBranches.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
    };

    window.mount.closeUser = () => { uModal.classList.add("hidden"); };

    window.mount.saveUser = async () => {
      const username = $("#u-user").value.trim();
      const full_name = $("#u-fullname").value.trim();
      const email = $("#u-email").value.trim();
      const role = $("#u-role").value;
      const active = $("#u-active").checked;
      const branch_id = $("#u-branch").value;
      const pass = $("#u-pass").value;

      if (!username) return toast("Falta usuario", "error");

      const data = { username, full_name, email, role, active, branch_id };
      // Validar unique username locally? Backend will fail anyway.

      let ro = ROLES.find(r => r.id === role);
      data.perms = ro ? ro.perms : {};

      try {
        if (editingUserId) {
          if (pass) data.password = pass;
          await store.users.update(editingUserId, data);
          toast("Usuario actualizado", "success");
        } else {
          if (!pass) return toast("Falta contraseña para nuevo usuario", "error");
          data.password = pass;
          await store.users.create(data);
          toast("Usuario creado", "success");
        }
        window.mount.closeUser();
        loadUsers();
      } catch (e) {
        toast(e.message || "Error al guardar usuario", "error");
      }
    };

    window.mount.delUser = async (uid) => {
      if (!confirm("¿Seguro de eliminar este usuario?")) return;
      try {
        await store.users.remove(uid);
        toast("Usuario eliminado", "success");
        loadUsers();
      } catch (e) { toast(e.message, "error"); }
    };

    // --- BRANCHES LOGIC ---
    const loadBranches = async () => {
      try {
        localBranches = await store.branches.list();
        repaintBranches();
      } catch (e) { toast("Error cargando sucursales", "error"); }
    };
    window.mount.loadBranches = loadBranches;

    const repaintBranches = () => {
      const term = ($("#branchSearch").value || "").toLowerCase();
      const tbody = $("#branchTableBody");
      if (!tbody) return;
      tbody.innerHTML = "";

      const filtered = localBranches.filter(b => b.name.toLowerCase().includes(term));

      filtered.forEach(b => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors";
        tr.innerHTML = `
             <td class="p-4 font-bold text-slate-700 dark:text-slate-200">${b.name}</td>
             <td class="p-4 text-slate-500">${b.address || "-"}</td>
             <td class="p-4 text-slate-500">${b.phone || "-"}</td>
             <td class="p-4 font-mono text-slate-600 dark:text-slate-400">${b.cuit || "-"}</td>
             <td class="p-4 text-right space-x-2">
                 <button onclick="mount.openBranch('${b.id}')" class="text-blue-500 hover:text-blue-700 p-1" title="Editar"><i class="fas fa-edit"></i></button>
                 <button onclick="mount.delBranch('${b.id}')" class="text-red-500 hover:text-red-700 p-1" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
             </td>
           `;
        tbody.appendChild(tr);
      });
    };
    window.mount.filterBranches = repaintBranches;

    // Modal Branch
    const bModal = $("#branch-modal");
    let editingBranchId = null;

    window.mount.openBranch = (bid = null) => {
      editingBranchId = bid;
      bModal.classList.remove("hidden");
      if (bid) {
        const b = localBranches.find(x => x.id === bid);
        $("#b-name").value = b.name;
        $("#b-addr").value = b.address || "";
        $("#b-phone").value = b.phone || "";
        $("#b-cuit").value = b.cuit || "";
        $("#b-code").value = b.code || "";
        $("#b-title").innerText = "Editar Sucursal";
      } else {
        $("#b-name").value = "";
        $("#b-addr").value = "";
        $("#b-phone").value = "";
        $("#b-cuit").value = "";
        $("#b-code").value = "";
        $("#b-title").innerText = "Nueva Sucursal";
      }
    };
    window.mount.closeBranch = () => bModal.classList.add("hidden");

    window.mount.saveBranch = async () => {
      const name = $("#b-name").value.trim();
      const address = $("#b-addr").value.trim();
      const phone = $("#b-phone").value.trim();
      const cuit = $("#b-cuit").value.trim();
      const code = $("#b-code").value.trim();

      if (!name) return toast("Nombre requerido", "error");

      const data = { name, address, phone, cuit, code };

      try {
        if (editingBranchId) {
          await store.branches.update(editingBranchId, data);
          toast("Sucursal actualizada", "success");
        } else {
          await store.branches.create(data);
          toast("Sucursal creada", "success");
        }
        window.mount.closeBranch();
        loadBranches();
      } catch (e) { toast(e.message, "error"); }
    };

    window.mount.delBranch = async (bid) => {
      if (!confirm("¿Eliminar sucursal? Esto no borrará los datos asociados pero podría causar inconsistencias.")) return;
      try {
        await store.branches.remove(bid);
        toast("Sucursal eliminada", "success");
        loadBranches();
      } catch (e) { toast(e.message, "error"); }
    };

    // --- SECURITY / AUDIT ---
    window.mount.downloadBackup = () => {
      const fullData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        fullData[k] = localStorage.getItem(k);
      }
      const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup_microbollos_${todayISO()}.json`;
      a.click();
      logAudit("DOWNLOAD_BACKUP");
    };

    const restoreFile = $("#restoreFile");
    window.mount.restoreBackup = () => {
      const file = restoreFile.files[0];
      if (!file) return toast("Selecciona un archivo JSON", "warn");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (confirm("⚠ ESTO SOBREESCRIBIRÁ TODA LA DB LOCAL. ¿CONTINUAR?")) {
            localStorage.clear();
            Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
            toast("Restauración completa. Recargando...");
            setTimeout(() => location.reload(), 1500);
          }
        } catch (ex) { toast("JSON inválido", "error"); }
      };
      reader.readAsText(file);
    };

    const renderAudit = () => {
      const logs = load(CFG_AUDIT_KEY, []);
      const cont = $("#auditLogContainer");
      if (!cont) return;
      if (logs.length === 0) {
        cont.innerHTML = `<div class="text-slate-400 italic text-center py-4">Sin registros</div>`;
        return;
      }
      cont.innerHTML = logs.map(l => `
            <div class="hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">
               <span class="text-slate-400">[${fmtDateTime(l.date)}]</span>
               <span class="font-bold text-blue-600">${l.action}</span>
               <span class="text-slate-500 text-xs">${JSON.stringify(l.details || {})}</span>
            </div>
        `).join("");
    };
    window.mount.clearAudit = () => {
      if (confirm("¿Borrar logs?")) { save(CFG_AUDIT_KEY, []); renderAudit(); }
    };

    // Init
    window.mount.setTab("tab-gral");
    // Preload for lookups
    store.branches.list().then(l => localBranches = l);
  },

  modalUser() {
    return /*html*/`
      <div id="user-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden animate-fade-in">
         <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
             <div class="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                 <h3 id="u-title" class="font-bold text-lg text-slate-800 dark:text-slate-200">Usuario</h3>
                 <button onclick="mount.closeUser()" class="text-slate-400 hover:text-red-500 text-xl">&times;</button>
             </div>
             <div class="p-6 space-y-4">
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Usuario</span>
                    <input id="u-user" type="text" class="ui-input w-full mt-1">
                 </label>
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Nombre Completo</span>
                    <input id="u-fullname" type="text" class="ui-input w-full mt-1">
                 </label>
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Email</span>
                    <input id="u-email" type="email" class="ui-input w-full mt-1">
                 </label>
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Contraseña</span>
                    <input id="u-pass" type="password" class="ui-input w-full mt-1">
                 </label>
                 <div class="grid grid-cols-2 gap-4">
                     <label class="block">
                        <span class="text-xs font-bold uppercase text-slate-500">Rol</span>
                        <select id="u-role" class="ui-input w-full mt-1"></select>
                     </label>
                     <label class="block">
                        <span class="text-xs font-bold uppercase text-slate-500">Sucursal</span>
                        <select id="u-branch" class="ui-input w-full mt-1"></select>
                     </label>
                 </div>
                 <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="u-active" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500">
                    <span class="text-sm font-medium">Activo (Permitir acceso)</span>
                 </label>
             </div>
             <div class="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                 <button onclick="mount.closeUser()" class="btn-secondary">Cancelar</button>
                 <button onclick="mount.saveUser()" class="btn-primary">Guardar</button>
             </div>
         </div>
      </div>
    `;
  },

  modalBranch() {
    return /*html*/`
      <div id="branch-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden animate-fade-in">
         <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
             <div class="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                 <h3 id="b-title" class="font-bold text-lg text-slate-800 dark:text-slate-200">Sucursal</h3>
                 <button onclick="mount.closeBranch()" class="text-slate-400 hover:text-red-500 text-xl">&times;</button>
             </div>
             <div class="p-6 space-y-4">
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Nombre</span>
                    <input id="b-name" type="text" class="ui-input w-full mt-1" placeholder="Ej: Centro">
                 </label>
                 <label class="block">
                    <span class="text-xs font-bold uppercase text-slate-500">Dirección</span>
                    <input id="b-addr" type="text" class="ui-input w-full mt-1">
                 </label>
                  <div class="grid grid-cols-2 gap-4">
                      <label class="block">
                         <span class="text-xs font-bold uppercase text-slate-500">Teléfono</span>
                         <input id="b-phone" type="text" class="ui-input w-full mt-1">
                      </label>
                      <label class="block">
                         <span class="text-xs font-bold uppercase text-slate-500">CUIT</span>
                         <input id="b-cuit" type="text" class="ui-input w-full mt-1" placeholder="Ej: 30-12345678-9">
                      </label>
                  </div>
                  <label class="block">
                     <span class="text-xs font-bold uppercase text-slate-500">Código / Prefijo (para numeración)</span>
                     <input id="b-code" type="text" class="ui-input w-full mt-1" placeholder="Ej: 0001, BAK, CABA...">
                  </label>
             </div>
             <div class="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                 <button onclick="mount.closeBranch()" class="btn-secondary">Cancelar</button>
                 <button onclick="mount.saveBranch()" class="btn-primary">Guardar</button>
             </div>
         </div>
      </div>
     `;
  }
};
