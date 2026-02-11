// ./js/main.js
import { router } from "./router.js";
import store from "./store.js";

// Inicializar app
document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("app");

    // Intentar rehidratar sesión por cookie antes de iniciar el router
    try {
        console.log('[main] Inicializando auth...');
        await store.auth.init();
        const state = store.getState();
        console.log('[main] auth.init completed, state:', state);
    } catch (err) {
        console.warn("[auth] init failed", err?.message || err);
    }

    router.init(root);

    // Preload default company logo into CFG_SETTINGS & global fallback so PDFs always include it
    (async function preloadLogo() {
        try {
            // Prefer an explicit final JPG logo if present, then fallbacks
            const candidates = ['/assets/Logo-Final.jpg', '/assets/logo-final.jpg', '/assets/Logo-Final.JPG', '/assets/microbolloslogo.png', '/assets/LOGO%20NUEVO.png', '/assets/LOGO NUEVO.png', 'assets/microbolloslogo.png', './assets/microbolloslogo.png'];
            let dataUrl = null;
            for (const c of candidates) {
                try {
                    // If candidate looks like JPG, ask for JPEG data directly
                    const isJpg = /\.jpe?g$/i.test(c);
                    dataUrl = isJpg ? await window.imageUrlToDataUrl(c, 'image/jpeg') : await window.imageUrlToDataUrl(c);
                    if (dataUrl) { console.info('Logo loaded from', c); break; }
                } catch (e) { console.warn('Logo candidate failed:', c); }
            }
            if (dataUrl) {
                // Always expose a global embedded fallback for PDF generator
                window.MICROBOLLOS_LOGO_B64 = dataUrl;
                const key = 'cfg_settings';
                let cfg = {};
                try { cfg = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
                // FORCE the logoData to the final JPG so the app uses it consistently
                cfg.logoData = dataUrl;
                try {
                    localStorage.setItem(key, JSON.stringify(cfg));
                    // Notify modules via document event (they listen on document)
                    document.dispatchEvent(new CustomEvent('cfg:settings-updated', { detail: { settings: cfg } }));
                    console.info('Default logo set and saved to settings (Logo-Final.jpg)');
                    if (window.toast) window.toast('Logo por defecto activado: Logo-Final.jpg', 'success');
                } catch (eSave) { console.warn('Failed to persist default logo', eSave); }
            }
        } catch (e) { console.warn('Logo preload failed', e); }
    })();

});
