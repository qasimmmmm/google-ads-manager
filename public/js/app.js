/* ═══════════════════════════════════════════════════════════════════
   AdsPro AI - Main Application Entry Point
   ═══════════════════════════════════════════════════════════════════ */

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 AdsPro AI Initializing...');
  
  // Initialize components
  Modal.init();
  Router.init();
  
  // Load saved businesses
  Businesses.load();
  
  // Check authentication
  Auth.init();
  
  console.log('✅ AdsPro AI Ready');
});

// Misc global functions
function showNotifications() {
  showAlert('No new notifications', 'info');
}

function showHelp() {
  window.open('https://support.google.com/google-ads', '_blank');
}

// Make available globally
window.showNotifications = showNotifications;
window.showHelp = showHelp;
