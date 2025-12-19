/* ═══════════════════════════════════════════════════════════════════
   Keyword Planner Module v3.0 - Advanced Scraper Edition
   
   Features:
   - FREE Keyword Research (Google Autocomplete)
   - Advanced Ad Scraper with Residential Proxy Support
   - Browser fingerprint rotation
   - Human-like behavior simulation
   ═══════════════════════════════════════════════════════════════════ */

const KeywordPlanner = {
  
  /* ═══════════════════════════════════════════════════════════════════
     FEATURE 1: FREE Keyword Research (Google Autocomplete)
     ═══════════════════════════════════════════════════════════════════ */
  
  async search() {
    const keyword = document.getElementById('kwPlannerInput')?.value.trim();
    if (!keyword) {
      showAlert('Please enter a keyword', 'error');
      return;
    }
    
    const btn = document.getElementById('kwSearchBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching...';
    }
    
    try {
      const data = await API.post('/automation/free/keywords/discover', {
        seedKeywords: [keyword],
        maxKeywords: 100
      });
      
      AppState.kwPlannerData = data.keywords || [];
      this.renderResults();
      
      document.getElementById('kwPlannerResults')?.classList.remove('hidden');
      document.getElementById('kwPlannerEmpty')?.classList.add('hidden');
      
      showAlert(`Found ${data.keywords?.length || 0} keywords! 🆓 FREE`, 'success');
      
    } catch (error) {
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Find Keywords';
    }
  },
  
  renderResults() {
    const keywords = AppState.kwPlannerData || [];
    
    const summary = document.getElementById('kwPlannerSummary');
    if (summary) {
      const avgCpc = keywords.length ? keywords.reduce((sum, k) => sum + parseFloat(k.cpc || 0), 0) / keywords.length : 0;
      const lowComp = keywords.filter(k => k.difficulty === 'Easy').length;
      const opportunities = keywords.filter(k => (k.opportunityScore || 50) >= 60).length;
      
      summary.innerHTML = `
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Keywords Found</p>
          <p class="text-2xl font-medium" style="color:#1a73e8">${keywords.length}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Est. Avg CPC</p>
          <p class="text-2xl font-medium" style="color:#202124">${formatCurrency(avgCpc)}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Easy Keywords</p>
          <p class="text-2xl font-medium" style="color:#34a853">${lowComp}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Best Opportunities</p>
          <p class="text-2xl font-medium" style="color:#b06000">${opportunities}</p>
        </div>
      `;
    }
    
    this.renderTable(keywords);
  },
  
  renderTable(keywords) {
    const container = document.getElementById('kwPlannerTable');
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-3 rounded-lg mb-4" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm" style="color:#137333">
          <span class="material-icons-outlined text-lg align-middle">celebration</span>
          <strong>100% FREE!</strong> Keywords from Google Autocomplete
        </p>
      </div>
      <table class="w-full text-sm">
        <thead class="sticky top-0" style="background:#f8f9fa">
          <tr class="text-xs uppercase" style="color:#5f6368">
            <th class="p-3 text-left">Keyword</th>
            <th class="p-3 text-right">Est. Volume</th>
            <th class="p-3 text-right">Est. CPC</th>
            <th class="p-3 text-center">Difficulty</th>
            <th class="p-3 text-center">Opportunity</th>
            <th class="p-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          ${keywords.slice(0, 100).map(k => `
            <tr class="table-row">
              <td class="p-3 font-medium">${esc(k.keyword)}</td>
              <td class="p-3 text-right">${fmt(k.searchVolume || 0)}</td>
              <td class="p-3 text-right">${formatCurrency(parseFloat(k.cpc) || 0)}</td>
              <td class="p-3 text-center">
                <span class="badge badge-${k.difficulty === 'Easy' ? 'green' : k.difficulty === 'Hard' ? 'red' : 'yellow'}">${k.difficulty || 'Medium'}</span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <div class="w-12 h-1.5 rounded" style="background:#e8eaed">
                    <div class="h-full rounded" style="width:${k.opportunityScore || 50}%;background:${(k.opportunityScore || 50) >= 60 ? '#34a853' : '#fbbc04'}"></div>
                  </div>
                  <span class="text-xs">${k.opportunityScore || 50}</span>
                </div>
              </td>
              <td class="p-3 text-center">
                <button onclick="KeywordPlanner.searchCurrentAds('${esc(k.keyword)}')" 
                        class="text-xs px-2 py-1 rounded hover:bg-blue-50" style="color:#1a73e8">
                  🔍 See Ads
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },
  
  filter(type) {
    let filtered = [...(AppState.kwPlannerData || [])];
    
    switch (type) {
      case 'best':
        filtered = filtered.filter(k => (k.opportunityScore || 50) >= 60).sort((a, b) => (b.opportunityScore || 50) - (a.opportunityScore || 50));
        break;
      case 'lowcpc':
        filtered = filtered.filter(k => parseFloat(k.cpc || 0) < 5).sort((a, b) => parseFloat(a.cpc || 0) - parseFloat(b.cpc || 0));
        break;
      case 'highvol':
        filtered = filtered.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
        break;
    }
    
    this.renderTable(filtered);
  },
  
  export() {
    const keywords = (AppState.kwPlannerData || []).map(k => ({
      Keyword: k.keyword,
      'Est. Volume': k.searchVolume || 'N/A',
      'Est. CPC': k.cpc || 'N/A',
      Difficulty: k.difficulty || 'Medium',
      Opportunity: k.opportunityScore || 50
    }));
    exportToCSV(keywords, 'keyword-research-FREE.csv');
  },
  
  
  /* ═══════════════════════════════════════════════════════════════════
     FEATURE 2: Current Ads - Advanced Scraper with Residential Proxies
     ═══════════════════════════════════════════════════════════════════ */
  
  searchCurrentAds(keyword) {
    const input = document.getElementById('currentAdsInput');
    if (input) input.value = keyword;
    this.searchAds();
  },
  
  async searchAds() {
    const keyword = document.getElementById('currentAdsInput')?.value.trim();
    if (!keyword) {
      showAlert('Please enter a keyword', 'error');
      return;
    }
    
    // Get proxy config from storage
    const proxyConfig = this.getProxyConfig();
    
    if (!proxyConfig) {
      this.showProxySetup();
      return;
    }
    
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching with ' + (proxyConfig.provider || 'Proxy') + '...';
    }
    
    try {
      const response = await API.post('/automation/free/keywords/current-ads', {
        keyword,
        proxyConfig,
        country: 'us'
      });
      
      if (response.error === 'CAPTCHA_DETECTED') {
        showAlert('CAPTCHA detected! Try a different proxy session.', 'error');
        return;
      }
      
      if (!response.success) {
        showAlert(response.message || 'Search failed: ' + response.error, 'error');
        return;
      }
      
      // Render results
      this.renderAdsResults(response);
      
      const total = response.totalAds || 0;
      showAlert(`Found ${total} ads! (${response.searchAdsCount} search, ${response.shoppingAdsCount} shopping, ${response.localAdsCount} local)`, 'success');
      
    } catch (error) {
      console.error('Search error:', error);
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  // Get proxy config from storage
  getProxyConfig() {
    const saved = localStorage.getItem('proxyConfig');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {}
    }
    return null;
  },
  
  // Save proxy config
  saveProxyConfig(config) {
    localStorage.setItem('proxyConfig', JSON.stringify(config));
  },
  
  // Render ALL ad types
  renderAdsResults(data) {
    const container = document.getElementById('currentAdsResults');
    if (!container) return;
    
    container.classList.remove('hidden');
    
    const searchAds = data.searchAds || [];
    const shoppingAds = data.shoppingAds || [];
    const localAds = data.localAds || [];
    
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="grid grid-cols-5 gap-3 mb-6">
        <div class="card p-4" style="border-left:4px solid #1a73e8">
          <p class="text-2xl font-bold" style="color:#1a73e8">${data.totalAds || 0}</p>
          <p class="text-xs" style="color:#5f6368">Total Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #4285f4">
          <p class="text-2xl font-bold" style="color:#4285f4">${searchAds.length}</p>
          <p class="text-xs" style="color:#5f6368">🔍 Search Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #fbbc04">
          <p class="text-2xl font-bold" style="color:#b06000">${shoppingAds.length}</p>
          <p class="text-xs" style="color:#5f6368">🛒 Shopping Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #34a853">
          <p class="text-2xl font-bold" style="color:#34a853">${localAds.length}</p>
          <p class="text-xs" style="color:#5f6368">📍 Local Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #5f6368">
          <p class="text-2xl font-bold" style="color:#5f6368">${data.organicCount || 0}</p>
          <p class="text-xs" style="color:#5f6368">Organic</p>
        </div>
      </div>
      
      <!-- Fingerprint Info -->
      ${data.fingerprint ? `
        <div class="p-3 rounded-lg mb-4" style="background:#e8f0fe;border:1px solid #1a73e8">
          <p class="text-sm" style="color:#1a73e8">
            <span class="material-icons-outlined text-lg align-middle">fingerprint</span>
            <strong>Session:</strong> ${data.fingerprint.city} • ${data.fingerprint.viewport}
          </p>
        </div>
      ` : ''}
      
      <!-- Tab Navigation -->
      <div class="flex border-b mb-4" style="border-color:#e8eaed">
        <button onclick="KeywordPlanner.showAdTab('all')" id="tab-all" class="px-4 py-2 font-medium text-sm border-b-2" style="border-color:#1a73e8;color:#1a73e8">
          All Ads (${data.totalAds || 0})
        </button>
        <button onclick="KeywordPlanner.showAdTab('search')" id="tab-search" class="px-4 py-2 font-medium text-sm border-b-2" style="border-color:transparent;color:#5f6368">
          🔍 Search (${searchAds.length})
        </button>
        <button onclick="KeywordPlanner.showAdTab('shopping')" id="tab-shopping" class="px-4 py-2 font-medium text-sm border-b-2" style="border-color:transparent;color:#5f6368">
          🛒 Shopping (${shoppingAds.length})
        </button>
        <button onclick="KeywordPlanner.showAdTab('local')" id="tab-local" class="px-4 py-2 font-medium text-sm border-b-2" style="border-color:transparent;color:#5f6368">
          📍 Local (${localAds.length})
        </button>
      </div>
      
      <!-- Tab Content -->
      <div id="adTabContent">
        ${this.renderAllAdsTab(data)}
      </div>
      
      <!-- Related Searches -->
      ${data.relatedSearches && data.relatedSearches.length > 0 ? `
        <div class="mt-6 p-4 card">
          <h4 class="font-medium mb-3">Related Searches</h4>
          <div class="flex flex-wrap gap-2">
            ${data.relatedSearches.map(s => `
              <button onclick="KeywordPlanner.searchCurrentAds('${esc(s)}')" 
                      class="px-3 py-1.5 rounded-full text-sm border hover:bg-blue-50" style="border-color:#dadce0">
                ${esc(s)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Actions -->
      <div class="mt-6 flex gap-3">
        <a href="${data.searchUrl}" target="_blank" class="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">
          <span class="material-icons-outlined">open_in_new</span>
          View on Google
        </a>
        <button onclick="KeywordPlanner.exportAds()" class="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">
          <span class="material-icons-outlined">download</span>
          Export Ads
        </button>
      </div>
    `;
    
    // Store for tab switching and export
    AppState.currentAdsData = data;
  },
  
  showAdTab(tab) {
    const data = AppState.currentAdsData;
    if (!data) return;
    
    ['all', 'search', 'shopping', 'local'].forEach(t => {
      const tabBtn = document.getElementById(`tab-${t}`);
      if (tabBtn) {
        tabBtn.style.borderColor = t === tab ? '#1a73e8' : 'transparent';
        tabBtn.style.color = t === tab ? '#1a73e8' : '#5f6368';
      }
    });
    
    const content = document.getElementById('adTabContent');
    if (!content) return;
    
    switch (tab) {
      case 'search':
        content.innerHTML = this.renderSearchAdsTab(data.searchAds || []);
        break;
      case 'shopping':
        content.innerHTML = this.renderShoppingAdsTab(data.shoppingAds || []);
        break;
      case 'local':
        content.innerHTML = this.renderLocalAdsTab(data.localAds || []);
        break;
      default:
        content.innerHTML = this.renderAllAdsTab(data);
    }
  },
  
  renderAllAdsTab(data) {
    const searchAds = data.searchAds || [];
    const shoppingAds = data.shoppingAds || [];
    const localAds = data.localAds || [];
    
    if (searchAds.length === 0 && shoppingAds.length === 0 && localAds.length === 0) {
      return `
        <div class="p-8 text-center card">
          <span class="material-icons-outlined text-4xl mb-2" style="color:#5f6368">search_off</span>
          <p class="font-medium">No ads found for this keyword</p>
          <p class="text-sm mt-1" style="color:#5f6368">Try a different keyword or check proxy settings</p>
        </div>
      `;
    }
    
    let html = '';
    
    if (searchAds.length > 0) {
      html += `<div class="mb-6"><h4 class="font-medium mb-3">🔍 Search Ads (${searchAds.length})</h4><div class="space-y-3">${searchAds.slice(0, 5).map(ad => this.renderSearchAdCard(ad)).join('')}</div></div>`;
    }
    
    if (shoppingAds.length > 0) {
      html += `<div class="mb-6"><h4 class="font-medium mb-3">🛒 Shopping Ads (${shoppingAds.length})</h4><div class="grid grid-cols-4 gap-3">${shoppingAds.slice(0, 8).map(ad => this.renderShoppingAdCard(ad)).join('')}</div></div>`;
    }
    
    if (localAds.length > 0) {
      html += `<div class="mb-6"><h4 class="font-medium mb-3">📍 Local Results (${localAds.length})</h4><div class="space-y-3">${localAds.slice(0, 5).map(ad => this.renderLocalAdCard(ad)).join('')}</div></div>`;
    }
    
    return html;
  },
  
  renderSearchAdsTab(ads) {
    if (!ads.length) return '<div class="p-6 text-center text-gray-500">No search ads found</div>';
    return `<div class="space-y-3">${ads.map(ad => this.renderSearchAdCard(ad)).join('')}</div>`;
  },
  
  renderShoppingAdsTab(ads) {
    if (!ads.length) return '<div class="p-6 text-center text-gray-500">No shopping ads found</div>';
    return `<div class="grid grid-cols-4 gap-3">${ads.map(ad => this.renderShoppingAdCard(ad)).join('')}</div>`;
  },
  
  renderLocalAdsTab(ads) {
    if (!ads.length) return '<div class="p-6 text-center text-gray-500">No local ads found</div>';
    return `<div class="space-y-3">${ads.map(ad => this.renderLocalAdCard(ad)).join('')}</div>`;
  },
  
  renderSearchAdCard(ad) {
    return `
      <div class="card p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="badge ${ad.placement === 'top' ? 'badge-blue' : 'badge-grey'}">${ad.placement === 'top' ? 'Top' : 'Bottom'} #${ad.position}</span>
          ${ad.hasCallExtension ? '<span class="badge badge-green">📞 Call</span>' : ''}
        </div>
        <h4 class="font-medium text-lg mb-1" style="color:#1a0dab">${esc(ad.title)}</h4>
        <p class="text-sm mb-2" style="color:#006621">${esc(ad.displayUrl)}</p>
        ${ad.description ? `<p class="text-sm" style="color:#545454">${esc(ad.description)}</p>` : ''}
        ${ad.phone ? `<p class="text-sm mt-2 font-medium" style="color:#34a853">📞 ${esc(ad.phone)}</p>` : ''}
        ${ad.sitelinks?.length ? `<div class="mt-2 pt-2 border-t flex flex-wrap gap-2" style="border-color:#e8eaed">${ad.sitelinks.slice(0, 4).map(s => `<span class="text-xs" style="color:#1a73e8">${esc(s.title)}</span>`).join(' · ')}</div>` : ''}
        <div class="mt-3 pt-3 border-t flex gap-2" style="border-color:#e8eaed">
          <button onclick="KeywordPlanner.analyzeCompetitor('${esc(ad.displayUrl)}')" class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">🔍 Analyze</button>
          <button onclick="KeywordPlanner.getAdTips('${esc(ad.title)}', '${esc(ad.description || '')}')" class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#34a853">✨ Beat This</button>
        </div>
      </div>
    `;
  },
  
  renderShoppingAdCard(ad) {
    return `
      <div class="card p-3 hover:shadow-md transition-shadow">
        ${ad.image ? `<div class="h-24 mb-2 rounded overflow-hidden bg-gray-100 flex items-center justify-center"><img src="${ad.image}" alt="${esc(ad.title)}" class="max-h-full max-w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'material-icons-outlined text-3xl\\' style=\\'color:#dadce0\\'>shopping_bag</span>'"></div>` : ''}
        <h5 class="font-medium text-sm mb-1 line-clamp-2">${esc(ad.title)}</h5>
        <p class="font-bold mb-1">${esc(ad.price) || 'Price N/A'}</p>
        <p class="text-xs" style="color:#5f6368">${esc(ad.displayUrl)}</p>
        ${ad.rating ? `<div class="flex items-center gap-1 mt-1"><span class="text-xs" style="color:#fbbc04">★</span><span class="text-xs">${ad.rating}</span></div>` : ''}
      </div>
    `;
  },
  
  renderLocalAdCard(ad) {
    return `
      <div class="card p-4 ${ad.isSponsored ? 'border-l-4' : ''}" style="${ad.isSponsored ? 'border-left-color:#34a853' : ''}">
        <div class="flex items-center gap-2 mb-2">
          <span class="badge badge-green">📍 Local</span>
          ${ad.isSponsored ? '<span class="badge badge-blue">Sponsored</span>' : ''}
          ${ad.hasCallButton ? '<span class="badge badge-yellow">📞 Call</span>' : ''}
        </div>
        <h4 class="font-medium text-lg mb-1">${esc(ad.title)}</h4>
        ${ad.address ? `<p class="text-sm mb-1" style="color:#5f6368">📍 ${esc(ad.address)}</p>` : ''}
        ${ad.phone ? `<p class="text-sm font-medium" style="color:#34a853">📞 ${esc(ad.phone)}</p>` : ''}
        ${ad.rating ? `<div class="flex items-center gap-1"><span style="color:#fbbc04">★</span><span class="text-sm">${ad.rating}</span>${ad.reviews ? `<span class="text-sm" style="color:#5f6368">(${ad.reviews})</span>` : ''}</div>` : ''}
      </div>
    `;
  },
  
  analyzeCompetitor(domain) {
    if (typeof Competitor !== 'undefined') {
      showPage('competitor');
      setTimeout(() => Competitor.setDomain(domain), 100);
    }
  },
  
  getAdTips(title, description) {
    showPage('ai-assistant');
    setTimeout(() => {
      if (typeof AIChat !== 'undefined') {
        AIChat.quickPrompt(`Create BETTER ads than this competitor:\n\nCompetitor Title: "${title}"\nDescription: "${description}"\n\nGive me:\n1. 5 better headlines (max 30 chars)\n2. 3 better descriptions (max 90 chars)\n3. Unique selling points to highlight`);
      }
    }, 100);
  },
  
  exportAds() {
    const data = AppState.currentAdsData;
    if (!data) return;
    
    const rows = [];
    (data.searchAds || []).forEach(ad => rows.push({ Type: 'Search', Position: ad.position, Title: ad.title, URL: ad.displayUrl, Description: ad.description || '', Phone: ad.phone || '' }));
    (data.shoppingAds || []).forEach(ad => rows.push({ Type: 'Shopping', Position: ad.position, Title: ad.title, URL: ad.displayUrl, Description: ad.price || '', Phone: '' }));
    (data.localAds || []).forEach(ad => rows.push({ Type: 'Local', Position: ad.position, Title: ad.title, URL: ad.address || '', Description: '', Phone: ad.phone || '' }));
    
    exportToCSV(rows, `ads-${data.keyword.replace(/\s+/g, '-')}.csv`);
  },
  
  /* ═══════════════════════════════════════════════════════════════════
     PROXY SETUP MODAL
     ═══════════════════════════════════════════════════════════════════ */
  
  showProxySetup() {
    const savedConfig = this.getProxyConfig();
    
    Modal.show(`
      <div class="p-6" style="max-width:600px">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#1a73e8">router</span>
          <h2 class="text-xl font-medium">Setup Residential Proxy</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">
          Configure your residential proxy to scrape Google Ads with a real IP address.
        </p>
        
        <div class="p-4 rounded-lg mb-4" style="background:#e8f0fe;border:1px solid #1a73e8">
          <p class="font-medium mb-2" style="color:#1a73e8">
            <span class="material-icons-outlined align-middle">info</span>
            Why Residential Proxies?
          </p>
          <p class="text-sm" style="color:#1a73e8">Google blocks datacenter IPs. Residential proxies use real home internet IPs that Google trusts.</p>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Provider</label>
            <select id="proxyProvider" class="w-full p-2 border rounded-lg" style="border-color:#dadce0">
              <option value="brightdata" ${savedConfig?.provider === 'brightdata' ? 'selected' : ''}>Bright Data (Luminati)</option>
              <option value="oxylabs" ${savedConfig?.provider === 'oxylabs' ? 'selected' : ''}>Oxylabs</option>
              <option value="smartproxy" ${savedConfig?.provider === 'smartproxy' ? 'selected' : ''}>SmartProxy</option>
              <option value="iproyal" ${savedConfig?.provider === 'iproyal' ? 'selected' : ''}>IPRoyal</option>
              <option value="custom" ${savedConfig?.provider === 'custom' ? 'selected' : ''}>Custom HTTP Proxy</option>
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Host</label>
              <input type="text" id="proxyHost" placeholder="proxy.example.com" value="${savedConfig?.host || ''}"
                     class="w-full p-2 border rounded-lg" style="border-color:#dadce0">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Port</label>
              <input type="text" id="proxyPort" placeholder="22225" value="${savedConfig?.port || ''}"
                     class="w-full p-2 border rounded-lg" style="border-color:#dadce0">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Username</label>
              <input type="text" id="proxyUsername" placeholder="username" value="${savedConfig?.username || ''}"
                     class="w-full p-2 border rounded-lg" style="border-color:#dadce0">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <input type="password" id="proxyPassword" placeholder="password" value="${savedConfig?.password || ''}"
                     class="w-full p-2 border rounded-lg" style="border-color:#dadce0">
            </div>
          </div>
        </div>
        
        <div class="mt-6 p-3 rounded-lg" style="background:#f8f9fa">
          <p class="text-xs font-medium mb-2">Recommended Providers:</p>
          <div class="flex flex-wrap gap-2">
            <a href="https://brightdata.com" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">Bright Data →</a>
            <a href="https://oxylabs.io" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">Oxylabs →</a>
            <a href="https://smartproxy.com" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">SmartProxy →</a>
            <a href="https://iproyal.com" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">IPRoyal →</a>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick="KeywordPlanner.testProxy()" class="px-4 py-2 border rounded-lg hover:bg-gray-50" style="border-color:#dadce0">
            <span class="material-icons-outlined text-sm align-middle">speed</span> Test Connection
          </button>
          <button onclick="KeywordPlanner.saveProxy()" class="btn-primary px-6 py-2 flex-1">Save & Search</button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">Cancel</button>
        </div>
        
        <div id="proxyTestResult" class="mt-4"></div>
      </div>
    `);
    
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  async testProxy() {
    const config = this.getProxyFormData();
    const resultDiv = document.getElementById('proxyTestResult');
    
    if (!config.host || !config.port) {
      resultDiv.innerHTML = '<div class="p-3 rounded-lg" style="background:#fce8e6;color:#c5221f">Please fill in host and port</div>';
      return;
    }
    
    resultDiv.innerHTML = '<div class="p-3 rounded-lg" style="background:#e8f0fe;color:#1a73e8"><span class="material-icons-outlined animate-spin align-middle">sync</span> Testing proxy...</div>';
    
    try {
      const response = await API.post('/automation/free/test-proxy', { proxyConfig: config });
      
      if (response.success) {
        resultDiv.innerHTML = `
          <div class="p-3 rounded-lg" style="background:#e6f4ea;color:#137333">
            <p class="font-medium">✅ Proxy Working!</p>
            <p class="text-sm">IP: ${response.ip}</p>
            <p class="text-sm">Location: ${response.location?.city}, ${response.location?.country}</p>
            <p class="text-sm">ISP: ${response.location?.isp}</p>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `<div class="p-3 rounded-lg" style="background:#fce8e6;color:#c5221f">❌ ${response.error || 'Connection failed'}</div>`;
      }
    } catch (error) {
      resultDiv.innerHTML = `<div class="p-3 rounded-lg" style="background:#fce8e6;color:#c5221f">❌ ${error.message}</div>`;
    }
  },
  
  getProxyFormData() {
    return {
      provider: document.getElementById('proxyProvider')?.value || 'custom',
      host: document.getElementById('proxyHost')?.value.trim(),
      port: document.getElementById('proxyPort')?.value.trim(),
      username: document.getElementById('proxyUsername')?.value.trim(),
      password: document.getElementById('proxyPassword')?.value.trim()
    };
  },
  
  saveProxy() {
    const config = this.getProxyFormData();
    
    if (!config.host || !config.port) {
      showAlert('Please fill in proxy host and port', 'error');
      return;
    }
    
    this.saveProxyConfig(config);
    Modal.hide();
    showAlert('Proxy saved!', 'success');
    
    setTimeout(() => this.searchAds(), 500);
  }
};

// Global functions
function searchKeywords() { KeywordPlanner.search(); }
function searchCurrentAds() { KeywordPlanner.searchAds(); }
function filterKw(type) { KeywordPlanner.filter(type); }
function exportKw() { KeywordPlanner.export(); }

window.KeywordPlanner = KeywordPlanner;
