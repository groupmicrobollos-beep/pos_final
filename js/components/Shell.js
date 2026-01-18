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
        <div id="mobileMenu" data-menu-panel hidden class="fixed inset-0 z-40 md:hidden">
          <div class="absolute left-0 top-0 w-64 h-full bg-slate-900/95 p-4 overflow-auto">
            <div class="mb-4 text-xl font-semibold">Microbollos POS</div>
            <nav class="flex flex-col gap-2">
              <a href="#/dashboard" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-chart-pie" aria-hidden="true"></i> Dashboard</a>
              <a href="#/presupuesto" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-magic" aria-hidden="true"></i> Presupuesto</a>
              <a href="#/presupuestos" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-folder-open" aria-hidden="true"></i> Presupuestos</a>
              <a href="#/reportes" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-chart-line" aria-hidden="true"></i> Reportes</a>
              <a href="#/inventario" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-box" aria-hidden="true"></i> Inventario</a>
              <a href="#/configuracion" class="block px-3 py-2 rounded hover:bg-indigo-500/20"><i class="fas fa-cog" aria-hidden="true"></i> Configuración</a>
            </nav>
            <div class="mt-4">
              <button id="mobile-logout" class="w-full py-2 rounded bg-rose-600/70">Cerrar sesión</button>
            </div>
          </div>
          <div class="absolute inset-0" aria-hidden="true"></div>
        </div>
      </div>
    `;
  },
  mount(root) {
    // Delegar refresco de nombre en Topbar
    mountTopbar(root);

    // Vincular logout del panel móvil
    setTimeout(() => {
      const mobBtn = document.getElementById("mobile-logout");
      if (mobBtn) mobBtn.addEventListener("click", () => { location.hash = "#/logout"; });
    }, 0);
  }
};
