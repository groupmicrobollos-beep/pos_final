/**
 * Modal Helper — overlays en document.body, sin conflictos de CSS.
 */

const ModalHelper = (() => {
  let openStack = [];
  let escBound = false;
  const placeholders = new WeakMap();

  const lockScroll = () => {
    document.body.classList.add('modal-scroll-lock');
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  };

  const unlockScroll = () => {
    if (openStack.length > 0) return;
    document.body.classList.remove('modal-scroll-lock');
    document.body.style.paddingRight = '';
  };

  const isOverlay = (el) =>
    el?.nodeType === 1 &&
    (el.hasAttribute('data-modal-overlay') || el.classList?.contains('modal-overlay'));

  const ensureInBody = (modal) => {
    if (modal.parentElement === document.body) return;
    const ph = document.createComment(`modal-ph-${modal.id || 'anon'}`);
    modal.parentElement?.insertBefore(ph, modal);
    placeholders.set(modal, ph);
    document.body.appendChild(modal);
  };

  const restoreParent = (modal) => {
    const ph = placeholders.get(modal);
    if (ph?.parentNode) {
      ph.parentNode.insertBefore(modal, ph);
      ph.remove();
    }
    placeholders.delete(modal);
  };

  const bindEscOnce = () => {
    if (escBound) return;
    escBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || openStack.length === 0) return;
      const top = openStack[openStack.length - 1];
      if (top) ModalHelper.close(top);
    });
  };

  const resolveCloseButtons = (modal, closeButton) => {
    if (!closeButton) return [];
    const sels = typeof closeButton === 'string'
      ? closeButton.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const btns = [];
    if (typeof closeButton === 'string') {
      sels.forEach(sel => {
        if (sel.startsWith('#') && modal.querySelector(sel)) {
          const el = modal.querySelector(sel);
          if (el) btns.push(el);
        } else {
          modal.querySelectorAll(sel).forEach(el => btns.push(el));
        }
      });
    } else if (closeButton instanceof HTMLElement) {
      btns.push(closeButton);
    } else if (closeButton?.forEach) {
      btns.push(...closeButton);
    }
    return btns;
  };

  return {
    open(modal, onOpen) {
      if (!modal || !isOverlay(modal)) {
        console.warn('[ModalHelper] Elemento inválido — falta data-modal-overlay');
        return;
      }

      ensureInBody(modal);
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.removeAttribute('inert');

      if (!openStack.includes(modal)) openStack.push(modal);
      bindEscOnce();
      lockScroll();

      requestAnimationFrame(() => {
        onOpen?.();
        const panel = modal.querySelector('.modal-panel') || modal.querySelector(':scope > div');
        const focusable = panel?.querySelector(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        focusable?.focus?.({ preventScroll: true });
      });
    },

    close(modal, onClose) {
      if (!modal) return;

      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('inert', '');

      openStack = openStack.filter(m => m !== modal);
      unlockScroll();
      restoreParent(modal);
      onClose?.();
    },

    closeAll() {
      [...openStack].reverse().forEach(m => this.close(m));
    },

    /**
     * @param {HTMLElement} modal
     * @param {string|HTMLElement} closeButton - selectores dentro del modal
     * @param {string|HTMLElement} [confirmButton]
     * @param {Function} [onConfirm]
     * @param {Function} [onClose]
     */
    setup(modal, closeButton, confirmButton, onConfirm, onClose) {
      if (!modal || !isOverlay(modal)) return;

      if (!modal.hasAttribute('data-modal-overlay')) {
        modal.setAttribute('data-modal-overlay', '');
      }
      if (!modal.classList.contains('modal-overlay')) {
        modal.classList.add('modal-overlay');
      }

      const handleClose = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.close(modal, onClose);
      };

      resolveCloseButtons(modal, closeButton).forEach(btn => {
        btn.addEventListener('click', handleClose);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleClose(e);
      });

      const confirmBtn = typeof confirmButton === 'string'
        ? modal.querySelector(confirmButton)
        : confirmButton;

      if (confirmBtn && onConfirm) {
        confirmBtn.addEventListener('click', (e) => {
          e.preventDefault();
          onConfirm();
          handleClose(e);
        });
      }
    },
  };
})();

if (typeof window !== 'undefined') {
  window.ModalHelper = ModalHelper;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalHelper;
}
