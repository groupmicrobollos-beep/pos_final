// ./js/main.js
import { router } from "./router.js";
import store from "./store.js";

// Inicializar app
document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("app");

    // Intentar rehidratar sesión por cookie antes de iniciar el router
    try {
        await store.auth.init();
        console.debug("[auth] init completed");
    } catch (err) {
        console.warn("[auth] init failed", err?.message || err);
    }

    router.init(root);

    // Preload default company logo into CFG_SETTINGS & global fallback so PDFs always include it
    (async function preloadLogo() {
        try {
            // Prefer the classic microbollos logo first (dark), then fallbacks
            const candidates = ['/assets/microbolloslogo.png', '/assets/LOGO%20NUEVO.png', '/assets/LOGO NUEVO.png', 'assets/microbolloslogo.png', './assets/microbolloslogo.png'];
            let dataUrl = null;
            for (const c of candidates) {
                try { dataUrl = await window.imageUrlToDataUrl(c); if (dataUrl) { console.info('Logo loaded from', c); break; } } catch (e) { console.warn('Logo candidate failed:', c); }
            }
            if (dataUrl) {
                // Always expose a global embedded fallback for PDF generator
                window.MICROBOLLOS_LOGO_B64 = dataUrl;
                const key = 'cfg_settings';
                let cfg = {};
                try { cfg = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
                if (!cfg.logoData) {
                    cfg.logoData = dataUrl;
                    localStorage.setItem(key, JSON.stringify(cfg));
                    // Notify modules via document event (they listen on document)
                    document.dispatchEvent(new CustomEvent('cfg:settings-updated', { detail: { settings: cfg } }));
                    console.info('Default logo preloaded into settings');
                } else {
                    // If a logo is already configured, still ensure global fallback is available
                    console.info('Settings already had logoData, global fallback set');
                }
            }
        } catch (e) { console.warn('Logo preload failed', e); }
    })();

});
