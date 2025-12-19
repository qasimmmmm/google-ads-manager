/* ═══════════════════════════════════════════════════════════════════
   Modal Component
   ═══════════════════════════════════════════════════════════════════ */

const Modal = {
  // Show modal with content
  show(content) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
    modalContent.innerHTML = content;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },
  
  // Hide modal
  hide() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Restore body scroll
    document.body.style.overflow = '';
  },
  
  // Initialize modal (click outside to close)
  init() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        this.hide();
      }
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }
};

// Global function
function closeModal() { Modal.hide(); }

// Make available globally
window.Modal = Modal;
window.closeModal = closeModal;
