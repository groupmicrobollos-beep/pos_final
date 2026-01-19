
import store from "../store.js";

const rid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default {
  render() {
    return /*html*/`
<section data-page="clients" class="space-y-6 text-[13px]">
  <div class="flex items-center justify-between">
    <h1 class="text-[18px] font-semibold leading-none">Clientes</h1>
    <div class="flex gap-2">
      <!-- Filtros -->
    </div>
  </div>

  <!-- Barra acciones -->
  <div class="flex flex-wrap items-center gap-2">
    <label class="relative">
      <span class="absolute left-2 top-2 text-slate-400"><i class="fas fa-search" aria-hidden="true"></i></span>
      <input id="q-clients" placeholder="Buscar cliente..." class="ctrl pl-8 pr-2 rounded bg-white/10 border border-white/10 w-64">
    </label>
    <button id="btn-add-client" class="btn btn-primary"><i class="fas fa-plus" aria-hidden="true"></i> Nuevo Cliente</button>
  </div>

  <!-- Tablas -->
  <div class="glass card p-4">
    <div class="table-wrap">
      <table class="table w-full text-[12.5px]">
        <thead class="bg-white/5">
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th class="text-right">Vehículos</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody id="rows-clients"></tbody>
      </table>
    </div>
    <div id="empty-clients" class="text-slate-400 text-xs py-2 text-center hidden">No hay clientes registrados.</div>
  </div>

  <!-- Modal Cliente -->
  <div id="client-modal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-black/60">
    <div class="bg-slate-900 border border-white/10 rounded-xl w-[min(92vw,600px)] max-h-[90vh] overflow-auto flex flex-col">
      <div class="flex items-center justify-between p-3 border-b border-white/10">
        <h2 class="text-lg font-semibold" id="modal-title">Cliente</h2>
        <button id="client-close" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"><i class="fas fa-times" aria-hidden="true"></i></button>
      </div>
      
      <div class="p-4 space-y-4 flex-1">
        <form id="client-form" class="space-y-3">
          <input type="hidden" name="cid">
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 text-xs mb-1">Nombre *</label>
              <input name="name" class="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 focus:border-indigo-500 outline-none" required>
            </div>
            <div>
              <label class="block text-slate-400 text-xs mb-1">Teléfono *</label>
              <input name="phone" class="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 focus:border-indigo-500 outline-none">
            </div>
          </div>
          <div>
              <label class="block text-slate-400 text-xs mb-1">Email</label>
              <input name="email" type="email" class="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 focus:border-indigo-500 outline-none">
          </div>

          <!-- Sección Vehículos dentro del modal -->
          <div class="border-t border-white/10 pt-3">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-sm">Vehículos</h3>
              <button type="button" id="btn-add-veh-modal" class="btn mini-btn btn-indigo"><i class="fas fa-plus"></i></button>
            </div>
            <div id="veh-list-modal" class="space-y-2 max-h-[200px] overflow-auto pr-1">
              <!-- Lista de inputs de vehículos -->
            </div>
          </div>

        </form>
      </div>

      <div class="p-3 border-t border-white/10 flex justify-end gap-2 bg-slate-900 sticky bottom-0">
        <button id="client-cancel" class="btn">Cancelar</button>
        <button id="client-save" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>

</section>
    `;
  },

  mount(root) {
    // Refs
    const q = root.querySelector("#q-clients");
    const btnAdd = root.querySelector("#btn-add-client");
    const tableBody = root.querySelector("#rows-clients");
    const emptyMsg = root.querySelector("#empty-clients");

    const modal = root.querySelector("#client-modal");
    const form = root.querySelector("#client-form");
    const modalTitle = root.querySelector("#modal-title");
    const btnClose = root.querySelector("#client-close");
    const btnCancel = root.querySelector("#client-cancel");
    const btnSave = root.querySelector("#client-save");

    const btnAddVeh = root.querySelector("#btn-add-veh-modal");
    const vehList = root.querySelector("#veh-list-modal");

    // State
    let clients = [];
    let currentVehicles = []; // {id, brand, model, Year, plate...} (temp in modal)

    // Load
    async function loadData() {
      try {
        clients = await store.clients.list();
        renderTable();
      } catch (e) { console.error(e); }
    }
    loadData();

    // Render Table
    function renderTable() {
      const term = (q.value || "").toLowerCase().trim();
      const filtered = clients.filter(c =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.phone || "").includes(term)
      );

      if (!filtered.length) {
        tableBody.innerHTML = "";
        emptyMsg.classList.remove("hidden");
        return;
      }
      emptyMsg.classList.add("hidden");
      tableBody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-white/5">
          <td class="font-medium">${c.name}</td>
          <td>${c.phone || "-"}</td>
          <td>${c.email || "-"}</td>
          <td>${c.address || "-"}</td>
          <td class="text-right">${(c.vehicles || []).length}</td>
          <td class="text-right whitespace-nowrap">
            <button class="btn mini-btn btn-indigo" data-act="edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn mini-btn btn-rose" data-act="del" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join("");
    }
    q.addEventListener("input", renderTable);

    // Modal logic
    function openModal(c = null) {
      form.reset();
      currentVehicles = c ? JSON.parse(JSON.stringify(c.vehicles || [])) : [];
      if (c) {
        modalTitle.textContent = "Editar Cliente";
        form.cid.value = c.id;
        form.name.value = c.name;
        form.phone.value = c.phone || "";
        form.email.value = c.email || "";
      } else {
        modalTitle.textContent = "Nuevo Cliente";
        form.cid.value = "";
      }
      renderVehiclesForm();
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
    function closeModal() { modal.classList.add("hidden"); modal.classList.remove("flex"); }

    btnAdd.addEventListener("click", () => openModal(null));
    btnClose.addEventListener("click", closeModal);
    btnCancel.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // Table Actions
    tableBody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "edit") {
        const c = clients.find(x => x.id === id);
        if (c) openModal(c);
      }
      if (btn.dataset.act === "del") {
        if (!confirm("¿Eliminar cliente y sus vehículos?")) return;
        try {
          await store.clients.remove(id);
          loadData();
          // toast success?
        } catch (err) { console.error(err); alert("Error al eliminar"); }
      }
    });

    // Vehicle Form List (Dynamic inputs)
    function renderVehiclesForm() {
      vehList.innerHTML = currentVehicles.map((v, i) => `
        <div class="glass p-2 rounded flex flex-col gap-2 relative group">
          <div class="flex gap-2">
             <input placeholder="Marca/Vehículo" class="w-1/2 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.brand || v.vehiculo || ""}" data-idx="${i}" data-field="brand">
             <input placeholder="Patente" class="w-1/2 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.plate || v.patente || ""}" data-idx="${i}" data-field="plate">
          </div>
          <div class="flex gap-2">
             <input placeholder="Modelo" class="w-1/3 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.model || v.modelo || ""}" data-idx="${i}" data-field="model">
             <input placeholder="Año" class="w-1/3 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.year || ""}" data-idx="${i}" data-field="year">
             <input placeholder="Seguro" class="w-1/3 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.insurance || v.compania || ""}" data-idx="${i}" data-field="insurance">
          </div>
          <input placeholder="VIN/Chasis" class="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs" value="${v.vin || v.chasis || ""}" data-idx="${i}" data-field="vin">
          
          <button type="button" class="absolute top-1 right-1 text-rose-400 hover:text-rose-300 opacity-60 hover:opacity-100" data-del-veh="${i}"><i class="fas fa-times"></i></button>
        </div>
      `).join("");
    }

    btnAddVeh.addEventListener("click", () => {
      currentVehicles.push({ id: rid("v"), brand: "", plate: "" }); // new ID
      renderVehiclesForm();
    });

    vehList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-del-veh]");
      if (btn) {
        const idx = parseInt(btn.dataset.delVeh);
        currentVehicles.splice(idx, 1);
        renderVehiclesForm();
      }
    });

    vehList.addEventListener("input", (e) => {
      if (e.target.dataset.field) {
        const idx = parseInt(e.target.dataset.idx);
        const f = e.target.dataset.field;
        currentVehicles[idx][f] = e.target.value;
      }
    });

    // Save
    btnSave.addEventListener("click", async (e) => {
      e.preventDefault(); // in case of form submit
      const data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        vehicles: currentVehicles
      };
      if (!data.name) return alert("Nombre obligatorio");
      if (!data.phone) return alert("Teléfono obligatorio");

      try {
        if (form.cid.value) {
          await store.clients.update(form.cid.value, data);
        } else {
          await store.clients.create(data);
        }
        closeModal();
        loadData();
      } catch (err) {
        console.error(err);
        alert("Error al guardar cliente");
      }
    });
  }
}
