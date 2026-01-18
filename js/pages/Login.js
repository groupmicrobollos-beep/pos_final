// ./pages/Login.js
import { setAuth } from "../store.js";

// ===== Helpers (modo local heredado) =====
const CFG_USERS_KEY = "cfg_users";
function loadUsers() { try { return JSON.parse(localStorage.getItem(CFG_USERS_KEY) || "[]"); } catch { return []; } }
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function b64utf8(s){ return btoa(unescape(encodeURIComponent(s))); }
async function verifyPassword(passHash, plainInput) {
  if (!passHash) return plainInput === "";
  if (passHash.startsWith("sha256:")) return (await sha256Hex(plainInput)) === passHash.slice(7);
  if (passHash.startsWith("weak:"))   return b64utf8(plainInput) === passHash.slice(5);
  return false;
}
function matchUserIdentifier(user, ident) {
  const id = String(ident||"").trim().toLowerCase();
  if (!id) return false;
  const uEmail = String(user.email||"").trim().toLowerCase();
  const uUser  = String(user.username||"").trim().toLowerCase();
  return id === uEmail || id === uUser;
}
function sanitizeUser(u){ const { passHash, ...rest } = u || {}; return rest; }

import store from "../store.js";

export default {
  render() {
    return /*html*/`
      <div id="login-root" class="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#07071a] via-[#071233] to-[#03102a]">
        <!-- animated neon blobs -->
        <div aria-hidden="true" class="pointer-events-none absolute -top-56 -left-56 h-[520px] w-[520px] rounded-full blur-[100px] opacity-60 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 animate-blob"></div>
        <div aria-hidden="true" class="pointer-events-none absolute -bottom-56 -right-56 h-[520px] w-[520px] rounded-full blur-[100px] opacity-50 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 animate-blob animation-delay-2000"></div>

        <div class="grid place-items-center min-h-dvh p-6">
          <div class="w-full max-w-lg relative">
            <div class="backdrop-blur-sm bg-white/6 dark:bg-black/40 rounded-3xl border border-white/6 p-8 shadow-2xl">
              <form id="loginForm" class="relative space-y-6" data-login aria-labelledby="login-title">
                <div class="flex flex-col items-center">
                  <div id="login-brand" class="mb-3 h-28 w-28 grid place-items-center rounded-full bg-gradient-to-br from-white/10 to-white/6 border border-white/8 overflow-hidden shadow-xl">
                    <!-- logo injected dynamically -->
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="login-silhouette opacity-80">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#fff"/>
                      <path d="M3 20c0-3.866 3.582-7 9-7s9 3.134 9 7v1H3v-1z" fill="#fff"/>
                    </svg>
                  </div>
                  <h1 id="login-title" class="text-2xl font-extrabold text-white tracking-tight">Microbollos POS</h1>
                  <p class="text-sm text-white/70 mt-1">Acceso al panel administrativo</p>
                </div>

                <div class="grid gap-4">
                  <label class="relative">
                    <span class="sr-only">Usuario o email</span>
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-white/80"><i class="fas fa-user"></i></div>
                    <input name="identifier" id="identifier" type="text" autocomplete="username" required placeholder="Usuario o email"
                      class="w-full pl-12 pr-4 h-12 rounded-xl bg-white/6 text-white placeholder-white/60 focus:ring-2 focus:ring-cyan-400 outline-none" autofocus>
                  </label>

                  <label class="relative">
                    <span class="sr-only">Contraseña</span>
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-white/80"><i class="fas fa-lock"></i></div>
                    <input id="pass" name="password" autocomplete="current-password" type="password" required placeholder="Contraseña"
                      class="w-full pl-12 pr-12 h-12 rounded-xl bg-white/6 text-white placeholder-white/60 focus:ring-2 focus:ring-cyan-400 outline-none">
                    <button type="button" id="togglePass" aria-pressed="false" class="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 p-2 rounded-md hover:bg-white/6 focus:outline-none" aria-label="Mostrar contraseña">
                      <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3C5 3 1.73 6.11 1 10c.73 3.89 4 7 9 7s8.27-3.11 9-7c-.73-3.89-4-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10z" clip-rule="evenodd"/></svg>
                    </button>
                  </label>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <label class="flex items-center gap-2 text-white/80"><input type="checkbox" id="remember-me" class="w-4 h-4 rounded" aria-label="Recordarme"> Recordarme</label>
                  <a href="#" class="text-cyan-300 hover:underline text-sm">¿Olvidaste tu contraseña?</a>
                </div>

                <div>
                  <button type="submit" id="submitBtn" class="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 text-white shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-3">
                    <span id="submitLabel">INGRESAR</span>
                    <svg id="submitSpinner" class="hidden animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  </button>
                </div>

                <p id="loginError" class="text-sm text-rose-400 text-center sr-only" role="status" aria-live="polite"></p>
                <p class="text-xs text-white/60 text-center">Usá tu usuario y contraseña para ingresar.</p>
              </form>
            </div>
          </div>
        </div>

        <style>
          /* Forzar estilos del login independientemente del tema global */
          #login-root { color: #fff !important; }
          #login-root input, #login-root button, #login-root a, #login-root p, #login-root label { color: inherit !important; }
          #login-root input { background: rgba(255,255,255,0.06) !important; border: none !important; }
          #login-root input::placeholder { color: rgba(255,255,255,0.56) !important; opacity: 1 !important; }
          #login-root .backdrop-blur-sm { background: rgba(3,6,10,0.6) !important; }
          #login-root .rounded-3xl { border: 1px solid rgba(255,255,255,0.04) !important; }
          #login-root .login-brand { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)) !important; }
          #login-root .sr-only[role="status"] { color: #ffb4b4 !important; }

          /* Mantener inputs y botones con alto specificity frente a variables globales */
          .ui-input, #login-root input, #login-root button { box-shadow: none !important; }
          /* small animations for neon blobs */
          @keyframes blob { 0%{ transform: translate(0,0) scale(1);} 33%{ transform: translate(30px,-20px) scale(1.05);} 66%{ transform: translate(-20px,20px) scale(0.95);} 100%{ transform: translate(0,0) scale(1);} }
          .animate-blob { animation: blob 8s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
        </style>
      </div>
    `;
  },

  mount(root) {
    const form   = root.querySelector("#loginForm");
    const pass   = root.querySelector("#pass");
    const toggle = root.querySelector("#togglePass");
    const eye    = root.querySelector("#eyeIcon");
    const error  = root.querySelector("#loginError");
    const submitBtn = root.querySelector('#submitBtn');
    const submitLabel = root.querySelector('#submitLabel');
    const submitSpinner = root.querySelector('#submitSpinner');

    const showError = (msg)=>{ error.textContent = msg; error.classList.remove('sr-only'); error.classList.add('block'); error.focus?.(); };
    const clearError = ()=>{ error.textContent = ""; error.classList.add('sr-only'); error.classList.remove('block'); };

    // Reemplazar el avatar por el logo del taller (assets) según modo claro/oscuro.
      (async function replaceBrandLogo(){
        try {
          // NO dependemos del tema global: siempre preferimos el logo oscuro (negro) para el badge
          const cfg = JSON.parse(localStorage.getItem("cfg_settings") || "{}");
          const brandEl = root.querySelector("#login-brand");
          const titleEl = root.querySelector("#login-title");
          const pathDark = 'assets/LOGO NUEVO-BLANCO.png';
          const pathLight = 'assets/LOGO NUEVO-BLANCO.png';
          let imgSrc = null;
          try { const resp = await fetch(pathDark, { method: 'GET' }); if (resp.ok) imgSrc = pathDark; } catch(e){}
          if (!imgSrc) {
            try { const resp2 = await fetch(pathLight, { method: 'GET' }); if (resp2.ok) imgSrc = pathLight; } catch(e){}
          }
          if (!imgSrc && cfg?.logoData) imgSrc = cfg.logoData;
          if (imgSrc) {
            brandEl.innerHTML = "";
            const img = document.createElement('img'); img.src = imgSrc; img.alt = cfg?.brandName || cfg?.companyName || 'logo';
            img.style.maxWidth = '70%'; img.style.maxHeight = '70%'; img.style.objectFit = 'contain'; img.style.borderRadius = '8px'; img.style.display = 'block'; img.style.margin = 'auto';
            brandEl.appendChild(img);
            // Forzar apariencia del badge (colores acordes al diseño oscuro)
            brandEl.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))';
            brandEl.style.boxShadow = '0 10px 30px rgba(2,6,23,0.5)';
            brandEl.style.border = '1px solid rgba(255,255,255,0.04)';
          }
          if (cfg?.brandName) titleEl.textContent = cfg.brandName;
        } catch (e) { /* noop */ }
      })();

    toggle?.addEventListener("click", () => {
      const isPass = pass.type === "password";
      pass.type = isPass ? "text" : "password";
      toggle.setAttribute('aria-pressed', String(isPass));
      // swap icon (simple fill toggle)
      if (isPass) {
        eye.innerHTML = '<path d="M4.03 10.97a8 8 0 0111.94-1.94l1.36-1.36A10 10 0 002.68 11a.75.75 0 001.35-.03z" fill="currentColor"/>';
      } else {
        eye.innerHTML = '<path fill-rule="evenodd" d="M10 3C5 3 1.73 6.11 1 10c.73 3.89 4 7 9 7s8.27-3.11 9-7c-.73-3.89-4-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10z" clip-rule="evenodd"/>';
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const FD = new FormData(form);
      const identifier = (FD.get("identifier") || "").toString().trim();
      const password   = (FD.get("password")   || "").toString();

      if (!identifier || !password) {
        showError("Completá usuario/email y contraseña.");
        return;
      }

      // show spinner
      submitBtn.disabled = true;
      submitSpinner.classList.remove('hidden');
      submitLabel.setAttribute('aria-hidden','true');

      try {
        const me = await store.auth.login(identifier, password);
        setAuth({ token: "cookie", user: me });
        location.hash = "#/dashboard";
      } catch (err) {
        const msg = (err && err.message) ? err.message : "Error al iniciar sesión";
        showError(msg);
        console.warn("[login] error", msg);
      } finally {
        submitBtn.disabled = false;
        submitSpinner.classList.add('hidden');
        submitLabel.removeAttribute('aria-hidden');
      }
    });
  }
};
