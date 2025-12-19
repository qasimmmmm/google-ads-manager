/* ═══════════════════════════════════════════════════════════════════
   State Management - Central application state
   ═══════════════════════════════════════════════════════════════════ */

const AppState = {
  // Current view state
  currentPage: 'login',
  currentBusiness: 'all',
  currentAccount: 'all',
  dateRange: '30',
  
  // Data stores
  businesses: [],
  campaigns: [],
  adGroups: [],
  keywords: [],
  ads: [],
  
  // Research data
  competitorData: {
    domain: '',
    keywords: [],
    ads: [],
    organic: [],
    competitors: []
  },
  kwPlannerData: [],
  
  // UI state
  isTyping: false,
  isLoading: false,
  
  // Charts references
  charts: {},
  
  // Get state value
  get(key) {
    return this[key];
  },
  
  // Set state value
  set(key, value) {
    this[key] = value;
    this.emit(key, value);
  },
  
  // Event listeners for state changes
  listeners: {},
  
  // Subscribe to state changes
  on(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  },
  
  // Emit state change
  emit(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(value));
    }
  },
  
  // Reset state
  reset() {
    this.campaigns = [];
    this.adGroups = [];
    this.keywords = [];
    this.ads = [];
    this.competitorData = { domain: '', keywords: [], ads: [], organic: [], competitors: [] };
    this.kwPlannerData = [];
  }
};

// Make it available globally
window.AppState = AppState;
