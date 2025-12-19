/* ═══════════════════════════════════════════════════════════════════
   Utility Functions
   ═══════════════════════════════════════════════════════════════════ */

// Format numbers (1000 -> 1K, 1000000 -> 1M)
function fmt(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// Escape HTML to prevent XSS
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Format currency
function formatCurrency(amount, decimals = 2) {
  return '$' + (amount || 0).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format percentage
function formatPercent(value, decimals = 2) {
  return (value || 0).toFixed(decimals) + '%';
}

// Show alert notification
function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };
  
  const colors = {
    success: { bg: '#e6f4ea', border: '#34a853', text: '#137333' },
    error: { bg: '#fce8e6', border: '#ea4335', text: '#c5221f' },
    info: { bg: '#e8f0fe', border: '#1a73e8', text: '#1a73e8' },
    warning: { bg: '#fef7e0', border: '#fbbc04', text: '#b06000' }
  };
  
  const color = colors[type] || colors.info;
  
  container.innerHTML = `
    <div class="notification p-4 rounded-lg border mb-4 flex items-center justify-between" 
         style="background:${color.bg};border-color:${color.border};color:${color.text}">
      <div class="flex items-center gap-2">
        <span class="material-icons-outlined">${icons[type] || 'info'}</span>
        ${message}
      </div>
      <button onclick="this.parentElement.remove()" class="opacity-50 hover:opacity-100">
        <span class="material-icons-outlined">close</span>
      </button>
    </div>
  `;
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Deep clone object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Export to CSV
function exportToCSV(data, filename) {
  if (!data || !data.length) {
    showAlert('No data to export', 'warning');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  a.click();
  URL.revokeObjectURL(url);
  
  showAlert('File exported successfully!', 'success');
}

// Make available globally
window.fmt = fmt;
window.esc = esc;
window.formatCurrency = formatCurrency;
window.formatPercent = formatPercent;
window.showAlert = showAlert;
window.debounce = debounce;
window.deepClone = deepClone;
window.generateId = generateId;
window.exportToCSV = exportToCSV;
