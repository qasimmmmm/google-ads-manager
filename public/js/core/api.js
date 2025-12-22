/* ═══════════════════════════════════════════════════════════════════
   API & Storage Utilities
   ═══════════════════════════════════════════════════════════════════ */

const Storage = {
  // Prefix for all keys
  prefix: 'adspro_',
  
  // Get API key
  getKey(name) {
    return localStorage.getItem(this.prefix + name + '_key');
  },
  
  // Set API key
  setKey(name, key) {
    localStorage.setItem(this.prefix + name + '_key', key);
  },
  
  // Get generic item
  get(key) {
    const item = localStorage.getItem(this.prefix + key);
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  },
  
  // Set generic item
  set(key, value) {
    const item = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(this.prefix + key, item);
  },
  
  // Remove item
  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }
};

const API = {
  // Base fetch wrapper
  async fetch(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // GET request
  async get(url) {
    return this.fetch(url);
  },
  
  // POST request
  async post(url, data) {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // Streaming fetch for AI
  async stream(url, data, onChunk, onDone) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') {
              fullText += data.text;
              onChunk(fullText);
            } else if (data.type === 'done') {
              onDone(fullText);
            }
          } catch (e) {}
        }
      }
    }
    
    return fullText;
  }
};

// Check API status
function checkApiStatus() {
  const semrush = Storage.getKey('semrush');
  const claude = Storage.getKey('claude');
  
  return {
    semrush: !!semrush,
    claude: !!claude,
    allConnected: !!semrush && !!claude,
    anyConnected: !!semrush || !!claude
  };
}

// Update API status in UI
function updateApiStatusUI() {
  const status = checkApiStatus();
  const el = document.getElementById('apiStatusHeader');
  if (!el) return;
  
  if (status.allConnected) {
    el.innerHTML = '<span class="status-dot status-active"></span><span class="text-sm" style="color:#34a853">All APIs connected</span>';
    el.className = 'flex items-center gap-2 px-3 py-1.5 rounded border text-sm';
    el.style.borderColor = '#34a853';
    el.style.background = '#e6f4ea';
  } else if (status.anyConnected) {
    el.innerHTML = '<span class="status-dot status-paused"></span><span class="text-sm" style="color:#b06000">Some APIs missing</span>';
    el.className = 'flex items-center gap-2 px-3 py-1.5 rounded border text-sm';
    el.style.borderColor = '#fbbc04';
    el.style.background = '#fef7e0';
  } else {
    el.innerHTML = '<span class="status-dot" style="background:#9aa0a6"></span><span class="text-sm" style="color:#5f6368">Setup required</span>';
    el.className = 'flex items-center gap-2 px-3 py-1.5 rounded border text-sm';
    el.style.borderColor = '#dadce0';
    el.style.background = 'white';
  }
}

// Make available globally
window.Storage = Storage;
window.API = API;
window.checkApiStatus = checkApiStatus;
window.updateApiStatusUI = updateApiStatusUI;
