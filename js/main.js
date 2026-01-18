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
});
