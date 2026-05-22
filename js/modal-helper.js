/**
 * Modal Helper - Centralizado para manejo consistente de modales
 * Proporciona apertura/cierre con bloqueo de scroll
 */

const ModalHelper = (() => {
  let openModals = [];

  const toggleBodyScroll = (block) => {
    if (block) {
      document.body.style.overflow = 'hidden';
    } else if (openModals.length === 0) {
      document.body.style.overflow = '';
    }
  };

  return {
    /**
     * Abre un modal (quita 'hidden', bloquea scroll)
     * @param {HTMLElement} modal - Elemento modal
     * @param {Function} onOpen - Callback opcional después de abrir
     */
    open(modal, onOpen) {
      if (!modal) return;
      modal.classList.remove('hidden');
      if (!openModals.includes(modal)) {
        openModals.push(modal);
      }
      toggleBodyScroll(true);
      onOpen?.();
    },

    /**
     * Cierra un modal (añade 'hidden', desbloquea scroll si no hay otros abiertos)
     * @param {HTMLElement} modal - Elemento modal
     * @param {Function} onClose - Callback opcional después de cerrar
     */
    close(modal, onClose) {
      if (!modal) return;
      modal.classList.add('hidden');
      openModals = openModals.filter(m => m !== modal);
      toggleBodyScroll(openModals.length > 0);
      onClose?.();
    },

    /**
     * Cierra todos los modales abiertos
     */
    closeAll() {
      openModals.forEach(modal => {
        modal.classList.add('hidden');
      });
      openModals = [];
      toggleBodyScroll(false);
    },

    /**
     * Configura manejadores estándar para un modal
     * @param {HTMLElement} modal - Elemento modal
     * @param {HTMLElement|string} closeButton - Botón de cierre o selector
     * @param {HTMLElement|string} confirmButton - Botón de confirmación (opcional) o selector
     * @param {Function} onConfirm - Callback para confirmación
     */
    setup(modal, closeButton, confirmButton, onConfirm) {
      if (!modal) return;

      // Resolver elementos desde selectores string
      const closeBtn = typeof closeButton === 'string' 
        ? modal.querySelector(closeButton) 
        : closeButton;
      
      const confirmBtn = typeof confirmButton === 'string' 
        ? modal.querySelector(confirmButton) 
        : confirmButton;

      // Cierre por click en botón
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close(modal));
      }

      // Cierre por click en backdrop (overlay mismo, no contenido)
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close(modal);
        }
      });

      // Cierre por ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape' && openModals.includes(modal)) {
          this.close(modal);
        }
      };
      document.addEventListener('keydown', handleEsc);

      // Confirmación si existe botón
      if (confirmBtn && onConfirm) {
        confirmBtn.addEventListener('click', () => {
          onConfirm();
          this.close(modal);
        });
      }

      // Retornar cleanup function
      return () => {
        if (closeBtn) closeBtn.removeEventListener('click', () => this.close(modal));
        document.removeEventListener('keydown', handleEsc);
        if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
      };
    }
  };
})();

// Asignar a window para disponibilidad global
if (typeof window !== 'undefined') {
  window.ModalHelper = ModalHelper;
}

// Exportar para uso en CommonJS/Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalHelper;
}
