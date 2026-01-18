import { Sidebar } from "./Sidebar.js";
import { Topbar, mountTopbar } from "./Topbar.js";

export const Shell = {
  render(contentHtml) {
    return /*html*/`
      <div class="h-dvh w-dvw grid md:grid-cols-[16rem_1fr] gap-3">
        ${Sidebar()}
        <div class="min-h-0 grid grid-rows-[auto_1fr]">
          ${Topbar()}
          <main id="view" class="min-h-0 h-full overflow-auto glass rounded-none p-4 md:p-5">
            ${contentHtml ?? ""}
          </main>
        </div>

        <!-- Mobile menu panel -->
        <div id="mobileMenu" data-menu-panel hidden class="fixed inset-0 z-40 md:hidden font-sans">
          <!-- Backdrop (click to close) -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" data-menu-backdrop></div>
          
          <!-- Content -->
          <div class="absolute left-0 top-0 w-64 h-full bg-slate-900 p-4 shadow-2xl overflow-auto z-50">
            <div class="mb-6 flex items-center justify-between">
              <span class="text-xl font-bold text-white tracking-wide">Microbollos</span>
              <button data-menu-close class="text-slate-400 hover:text-white"><i class="fas fa-times"></i></button>
            </div>
            
            <nav class="flex flex-col gap-1 text-sm font-medium">
              <a href="#/dashboard" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-chart-pie w-6"></i> Dashboard</a>
              <a href="#/presupuesto" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-magic w-6"></i> Presupuesto</a>
              <a href="#/presupuestos" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-folder-open w-6"></i> Lista</a>
              <a href="#/reportes" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-chart-line w-6"></i> Reportes</a>
              <a href="#/inventario" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-box w-6"></i> Inventario</a>
              <a href="#/configuracion" class="block px-3 py-2.5 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-cog w-6"></i> Configuración</a>
            </nav>
            
            <div class="mt-8 pt-4 border-t border-slate-700">
              <button id="mobile-logout" class="flex items-center w-full px-3 py-2.5 rounded text-rose-400 hover:bg-rose-500/10 transition">
                <i class="fas fa-sign-out-alt w-6"></i> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  mount(root) {
    mountTopbar(root);

    const btn = root.querySelector("[data-menu-btn]");
    const menu = root.querySelector("[data-menu-panel]");
    const backdrop = root.querySelector("[data-menu-backdrop]");
    const closeBtn = root.querySelector("[data-menu-close]");
    const links = menu?.querySelectorAll("a");
    const logoutBtn = root.querySelector("#mobile-logout");

    // Toggle
    if (btn && menu) {
      btn.onclick = (e) => {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      };
    }

    // Close Actions
    const closeMenu = () => { if (menu) menu.hidden = true; };
    if (backdrop) backdrop.onclick = closeMenu;
    if (closeBtn) closeBtn.onclick = closeMenu;
    if (links) links.forEach(l => l.addEventListener("click", closeMenu));

    // Logout special logic
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        closeMenu();
        location.hash = "#/logout";
      });
    }
  }
};
