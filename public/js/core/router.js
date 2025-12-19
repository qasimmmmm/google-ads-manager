/* ═══════════════════════════════════════════════════════════════════
   Navigation & Routing
   ═══════════════════════════════════════════════════════════════════ */

const Router = {
  // Page titles
  titles: {
    'login': 'Sign In',
    'overview': 'Overview',
    'campaigns': 'All Campaigns',
    'adgroups': 'Ad Groups',
    'ads': 'Ads & Assets',
    'keywords': 'Keywords',
    'audiences': 'Audiences',
    'negatives': 'Negative Keywords',
    'ai-optimize': 'AI Optimization',
    'competitor': 'Competitor Intelligence',
    'keyword-planner': 'Keyword Planner',
    'ai-assistant': 'AI Assistant',
    'insights': 'Insights',
    'reports': 'Reports',
    'auction': 'Auction Insights',
    'businesses': 'Manage Businesses',
    'settings': 'Settings'
  },
  
  // Page load handlers
  handlers: {},
  
  // Register page handler
  register(page, handler) {
    this.handlers[page] = handler;
  },
  
  // Navigate to page
  goto(page) {
    // Update state
    AppState.set('currentPage', page);
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    
    // Show target page
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
      targetPage.classList.add('active');
      targetPage.style.display = 'block';
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active');
    });
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }
    
    // Update page title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      titleEl.textContent = this.titles[page] || 'AdsPro AI';
    }
    
    // Call page handler if exists
    if (this.handlers[page]) {
      this.handlers[page]();
    }
    
    // Update API status
    updateApiStatusUI();
    
    // Update URL hash
    window.location.hash = page;
  },
  
  // Initialize router
  init() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.slice(1) || 'overview';
      if (page !== AppState.currentPage) {
        this.goto(page);
      }
    });
    
    // Check initial hash
    const initialPage = window.location.hash.slice(1);
    if (initialPage && initialPage !== 'login') {
      // Will be handled after auth check
    }
  }
};

// Shortcut function
function showPage(page) {
  Router.goto(page);
}

// Make available globally
window.Router = Router;
window.showPage = showPage;
