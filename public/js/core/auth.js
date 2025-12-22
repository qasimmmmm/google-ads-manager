/* ═══════════════════════════════════════════════════════════════════
   Authentication Module
   ═══════════════════════════════════════════════════════════════════ */

const Auth = {
  user: null,
  isAuthenticated: false,
  
  // Check authentication status
  async checkStatus() {
    try {
      const data = await API.get('/auth/status');
      
      if (data.authenticated) {
        this.user = data.user;
        this.isAuthenticated = true;
        this.updateUserUI();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  },
  
  // Login with Google
  login() {
    window.location.href = '/auth/google';
  },
  
  // Logout
  async logout() {
    try {
      await API.get('/auth/logout');
    } catch (e) {}
    
    this.user = null;
    this.isAuthenticated = false;
    AppState.reset();
    showPage('login');
  },
  
  // Update user info in UI
  updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo || !this.user) return;
    
    const initial = (this.user.name?.charAt(0) || 'U').toUpperCase();
    
    userInfo.innerHTML = `
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" 
           style="background:#1a73e8">${initial}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate" style="color:#202124">${this.user.name || 'User'}</p>
        <p class="text-xs truncate" style="color:#5f6368">${this.user.email || ''}</p>
      </div>
    `;
  },
  
  // Initialize auth
  async init() {
    const isAuthed = await this.checkStatus();
    
    if (isAuthed) {
      // Load saved API keys
      loadSavedKeys();
      // Go to overview
      showPage('overview');
      // Load initial data
      Dashboard.load();
    } else {
      showPage('login');
    }
  }
};

// Load saved API keys into settings form
function loadSavedKeys() {
  const semrushKey = Storage.getKey('semrush');
  const claudeKey = Storage.getKey('claude');
  
  const semrushInput = document.getElementById('semrushKey');
  const claudeInput = document.getElementById('claudeKey');
  
  if (semrushInput && semrushKey) semrushInput.value = semrushKey;
  if (claudeInput && claudeKey) claudeInput.value = claudeKey;
}

// Save SEMrush key
function saveSemrushKey() {
  const key = document.getElementById('semrushKey')?.value.trim();
  if (key) {
    Storage.setKey('semrush', key);
    showAlert('SEMrush API key saved!', 'success');
    updateApiStatusUI();
  } else {
    showAlert('Please enter a valid API key', 'error');
  }
}

// Save Claude key
function saveClaudeKey() {
  const key = document.getElementById('claudeKey')?.value.trim();
  if (key) {
    Storage.setKey('claude', key);
    showAlert('Claude API key saved!', 'success');
    updateApiStatusUI();
  } else {
    showAlert('Please enter a valid API key', 'error');
  }
}

// Login button handler
function loginWithGoogle() {
  Auth.login();
}

// Make available globally
window.Auth = Auth;
window.loadSavedKeys = loadSavedKeys;
window.saveSemrushKey = saveSemrushKey;
window.saveClaudeKey = saveClaudeKey;
window.loginWithGoogle = loginWithGoogle;
