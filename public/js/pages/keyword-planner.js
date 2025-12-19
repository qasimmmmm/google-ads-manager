/* ═══════════════════════════════════════════════════════════════════
   Keyword Planner Module v3.0
   
   Shows ALL Ad Types:
   - Search Ads (text ads at top/bottom)
   - Shopping Ads (product listings with images/prices)
   - Local/Call Ads (with phone numbers and call buttons)
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
                  🔍 See All Ads
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
        filtered = filtered.filter(k => (k.opportunityScore || 50) >= 60)
          .sort((a, b) => (b.opportunityScore || 50) - (a.opportunityScore || 50));
        break;
      case 'lowcpc':
        filtered = filtered.filter(k => parseFloat(k.cpc || 0) < 5)
          .sort((a, b) => parseFloat(a.cpc || 0) - parseFloat(b.cpc || 0));
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
     FEATURE 2: Current Ads on Keywords - ALL AD TYPES!
     Shows: Search Ads, Shopping Ads, Call/Local Ads
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
    
    const scraperApiKey = Storage.getKey('scraperapi');
    
    if (!scraperApiKey) {
      this.showApiKeyModal();
      return;
    }
    
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching All Ad Types...';
    }
    
    try {
      const response = await API.post('/automation/free/keywords/current-ads', {
        keyword,
        scraperApiKey,
        country: 'us'
      });
      
      if (response.error === 'NO_API_KEY' || response.error === 'INVALID_API_KEY') {
        this.showApiKeyModal();
        return;
      }
      
      if (!response.success) {
        showAlert(response.message || 'Search failed', 'error');
        return;
      }
      
      // Render ALL ad types
      this.renderAllAdsResults(response);
      
      const total = response.totalAds || 0;
      const search = response.searchAdsCount || 0;
      const shopping = response.shoppingAdsCount || 0;
      const local = response.localAdsCount || 0;
      
      showAlert(`Found ${total} ads: ${search} Search, ${shopping} Shopping, ${local} Local/Call`, 'success');
      
    } catch (error) {
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  // Render ALL ad types with tabs
  renderAllAdsResults(data) {
    const container = document.getElementById('currentAdsResults');
    if (!container) return;
    
    container.classList.remove('hidden');
    
    const searchAds = data.searchAds || [];
    const shoppingAds = data.shoppingAds || [];
    const localAds = data.localAds || [];
    
    container.innerHTML = `
      <!-- Summary Cards - ALL AD TYPES -->
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
          <p class="text-xs" style="color:#5f6368">📍 Local/Call Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #ea4335">
          <p class="text-2xl font-bold" style="color:#ea4335">${data.organicCount || 0}</p>
          <p class="text-xs" style="color:#5f6368">Organic Results</p>
        </div>
      </div>
      
      <!-- Info Banner -->
      <div class="p-3 rounded-lg mb-4" style="background:#e8f0fe;border:1px solid #1a73e8">
        <p class="text-sm" style="color:#1a73e8">
          <span class="material-icons-outlined text-lg align-middle">info</span>
          <strong>LIVE Ads</strong> for "<strong>${esc(data.keyword)}</strong>" in the US
          <span class="text-xs ml-2">${new Date(data.timestamp).toLocaleString()}</span>
        </p>
      </div>
      
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
          📍 Local/Call (${localAds.length})
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
          Export All Ads
        </button>
      </div>
    `;
    
    // Store data for tab switching and export
    AppState.currentAdsData = data;
  },
  
  // Tab switching
  showAdTab(tab) {
    const data = AppState.currentAdsData;
    if (!data) return;
    
    // Update tab styles
    ['all', 'search', 'shopping', 'local'].forEach(t => {
      const tabBtn = document.getElementById(`tab-${t}`);
      if (tabBtn) {
        if (t === tab) {
          tabBtn.style.borderColor = '#1a73e8';
          tabBtn.style.color = '#1a73e8';
        } else {
          tabBtn.style.borderColor = 'transparent';
          tabBtn.style.color = '#5f6368';
        }
      }
    });
    
    // Render tab content
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
  
  // Render ALL ads tab
  renderAllAdsTab(data) {
    const searchAds = data.searchAds || [];
    const shoppingAds = data.shoppingAds || [];
    const localAds = data.localAds || [];
    
    if (searchAds.length === 0 && shoppingAds.length === 0 && localAds.length === 0) {
      return `
        <div class="p-8 text-center card">
          <span class="material-icons-outlined text-4xl mb-2" style="color:#5f6368">search_off</span>
          <p class="font-medium">No ads found for this keyword</p>
          <p class="text-sm mt-1" style="color:#5f6368">Try a different keyword or check Google manually</p>
        </div>
      `;
    }
    
    let html = '';
    
    // Search Ads Section
    if (searchAds.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <span style="color:#4285f4">🔍</span> Search Ads (${searchAds.length})
          </h4>
          <div class="space-y-3">
            ${searchAds.slice(0, 5).map(ad => this.renderSearchAdCard(ad)).join('')}
          </div>
        </div>
      `;
    }
    
    // Shopping Ads Section
    if (shoppingAds.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <span style="color:#fbbc04">🛒</span> Shopping Ads (${shoppingAds.length})
          </h4>
          <div class="grid grid-cols-4 gap-3">
            ${shoppingAds.slice(0, 8).map(ad => this.renderShoppingAdCard(ad)).join('')}
          </div>
        </div>
      `;
    }
    
    // Local/Call Ads Section
    if (localAds.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <span style="color:#34a853">📍</span> Local & Call Ads (${localAds.length})
          </h4>
          <div class="space-y-3">
            ${localAds.slice(0, 5).map(ad => this.renderLocalAdCard(ad)).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  },
  
  // Render Search Ads tab
  renderSearchAdsTab(ads) {
    if (ads.length === 0) {
      return '<div class="p-6 text-center text-gray-500">No search ads found for this keyword</div>';
    }
    
    return `<div class="space-y-3">${ads.map(ad => this.renderSearchAdCard(ad)).join('')}</div>`;
  },
  
  // Render Shopping Ads tab
  renderShoppingAdsTab(ads) {
    if (ads.length === 0) {
      return '<div class="p-6 text-center text-gray-500">No shopping ads found for this keyword</div>';
    }
    
    return `<div class="grid grid-cols-4 gap-3">${ads.map(ad => this.renderShoppingAdCard(ad)).join('')}</div>`;
  },
  
  // Render Local Ads tab
  renderLocalAdsTab(ads) {
    if (ads.length === 0) {
      return '<div class="p-6 text-center text-gray-500">No local/call ads found for this keyword</div>';
    }
    
    return `<div class="space-y-3">${ads.map(ad => this.renderLocalAdCard(ad)).join('')}</div>`;
  },
  
  // Single Search Ad Card
  renderSearchAdCard(ad) {
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="badge ${ad.placement === 'top' ? 'badge-blue' : 'badge-grey'}">
              ${ad.placement === 'top' ? 'Top' : 'Bottom'} #${ad.position}
            </span>
            <span class="badge badge-yellow">Search Ad</span>
            ${ad.hasCallExtension ? '<span class="badge badge-green">📞 Call</span>' : ''}
          </div>
          ${ad.link ? `
            <a href="${ad.link}" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">
              <span class="material-icons-outlined text-sm">open_in_new</span>
            </a>
          ` : ''}
        </div>
        
        <h4 class="font-medium text-lg mb-1" style="color:#1a0dab">${esc(ad.title)}</h4>
        <p class="text-sm mb-2" style="color:#006621">${esc(ad.displayUrl)}</p>
        ${ad.description ? `<p class="text-sm" style="color:#545454">${esc(ad.description)}</p>` : ''}
        ${ad.phone ? `<p class="text-sm mt-2 font-medium" style="color:#34a853">📞 ${esc(ad.phone)}</p>` : ''}
        
        ${ad.sitelinks && ad.sitelinks.length > 0 ? `
          <div class="mt-2 pt-2 border-t flex flex-wrap gap-2" style="border-color:#e8eaed">
            ${ad.sitelinks.slice(0, 4).map(s => `
              <a href="${s.link || '#'}" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">${esc(s.title)}</a>
            `).join(' · ')}
          </div>
        ` : ''}
        
        <div class="mt-3 pt-3 border-t flex gap-2" style="border-color:#e8eaed">
          <button onclick="KeywordPlanner.analyzeCompetitor('${esc(ad.displayUrl)}')" 
                  class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">
            🔍 Analyze
          </button>
          <button onclick="KeywordPlanner.getAdTips('${esc(ad.title)}', '${esc(ad.description || '')}')"
                  class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#34a853">
            ✨ Beat This Ad
          </button>
        </div>
      </div>
    `;
  },
  
  // Single Shopping Ad Card
  renderShoppingAdCard(ad) {
    return `
      <div class="card p-3 hover:shadow-md transition-shadow">
        ${ad.image ? `
          <div class="h-32 mb-2 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <img src="${ad.image}" alt="${esc(ad.title)}" class="max-h-full max-w-full object-contain" onerror="this.style.display='none'">
          </div>
        ` : `
          <div class="h-32 mb-2 rounded bg-gray-100 flex items-center justify-center">
            <span class="material-icons-outlined text-3xl" style="color:#dadce0">shopping_bag</span>
          </div>
        `}
        
        <span class="badge badge-yellow text-xs mb-1">🛒 Shopping</span>
        
        <h5 class="font-medium text-sm mb-1 line-clamp-2" style="color:#202124">${esc(ad.title)}</h5>
        
        <p class="font-bold mb-1" style="color:#202124">${esc(ad.price) || 'Price N/A'}</p>
        ${ad.originalPrice ? `<p class="text-xs line-through" style="color:#5f6368">${esc(ad.originalPrice)}</p>` : ''}
        
        <p class="text-xs" style="color:#5f6368">${esc(ad.displayUrl)}</p>
        
        ${ad.rating ? `
          <div class="flex items-center gap-1 mt-1">
            <span class="text-xs" style="color:#fbbc04">★</span>
            <span class="text-xs">${ad.rating}</span>
            ${ad.reviews ? `<span class="text-xs" style="color:#5f6368">(${ad.reviews})</span>` : ''}
          </div>
        ` : ''}
        
        ${ad.shipping ? `<p class="text-xs mt-1" style="color:#34a853">${esc(ad.shipping)}</p>` : ''}
        
        ${ad.link ? `
          <a href="${ad.link}" target="_blank" class="block mt-2 text-xs text-center py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">
            View Product
          </a>
        ` : ''}
      </div>
    `;
  },
  
  // Single Local/Call Ad Card
  renderLocalAdCard(ad) {
    return `
      <div class="card p-4 ${ad.isSponsored ? 'border-l-4' : ''}" style="${ad.isSponsored ? 'border-left-color:#34a853' : ''}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="badge badge-green">📍 Local</span>
            ${ad.isSponsored ? '<span class="badge badge-blue">Sponsored</span>' : ''}
            ${ad.hasCallButton ? '<span class="badge badge-yellow">📞 Call Button</span>' : ''}
          </div>
        </div>
        
        <h4 class="font-medium text-lg mb-1" style="color:#202124">${esc(ad.title)}</h4>
        
        ${ad.address ? `<p class="text-sm mb-1" style="color:#5f6368">📍 ${esc(ad.address)}</p>` : ''}
        
        ${ad.phone ? `
          <p class="text-sm font-medium mb-1" style="color:#34a853">
            <a href="tel:${ad.phone}" class="hover:underline">📞 ${esc(ad.phone)}</a>
          </p>
        ` : ''}
        
        ${ad.rating ? `
          <div class="flex items-center gap-1 mb-1">
            <span style="color:#fbbc04">★</span>
            <span class="text-sm font-medium">${ad.rating}</span>
            ${ad.reviews ? `<span class="text-sm" style="color:#5f6368">(${ad.reviews} reviews)</span>` : ''}
          </div>
        ` : ''}
        
        ${ad.hours ? `<p class="text-xs" style="color:#5f6368">🕐 ${esc(ad.hours)}</p>` : ''}
        ${ad.category ? `<p class="text-xs" style="color:#5f6368">${esc(ad.category)}</p>` : ''}
        
        <div class="mt-3 pt-3 border-t flex gap-2" style="border-color:#e8eaed">
          ${ad.link ? `
            <a href="${ad.link}" target="_blank" class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">
              🌐 Website
            </a>
          ` : ''}
          ${ad.phone ? `
            <a href="tel:${ad.phone}" class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#34a853">
              📞 Call Now
            </a>
          ` : ''}
          ${ad.directions ? `
            <a href="${ad.directions}" target="_blank" class="text-xs px-2 py-1 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#4285f4">
              🗺️ Directions
            </a>
          ` : ''}
        </div>
      </div>
    `;
  },
  
  // Analyze competitor
  analyzeCompetitor(domain) {
    if (typeof Competitor !== 'undefined') {
      showPage('competitor');
      setTimeout(() => {
        Competitor.setDomain(domain);
        Competitor.analyze();
      }, 100);
    }
  },
  
  // Get AI tips
  getAdTips(title, description) {
    showPage('ai-assistant');
    setTimeout(() => {
      if (typeof AIChat !== 'undefined') {
        AIChat.quickPrompt(`Help me create a BETTER ad than this competitor:

Competitor Ad Title: "${title}"
Competitor Description: "${description}"

Please provide:
1. 5 better headline ideas (max 30 chars each)
2. 3 better description ideas (max 90 chars each)
3. Unique selling points to highlight
4. Strong call-to-action suggestions`);
      }
    }, 100);
  },
  
  // Export all ads
  exportAds() {
    const data = AppState.currentAdsData;
    if (!data) {
      showAlert('No ads to export', 'warning');
      return;
    }
    
    const rows = [];
    
    // Add search ads
    (data.searchAds || []).forEach(ad => {
      rows.push({
        Type: 'Search Ad',
        Position: ad.position,
        Placement: ad.placement,
        Title: ad.title,
        DisplayUrl: ad.displayUrl,
        Description: ad.description || '',
        Phone: ad.phone || '',
        HasCall: ad.hasCallExtension ? 'Yes' : 'No'
      });
    });
    
    // Add shopping ads
    (data.shoppingAds || []).forEach(ad => {
      rows.push({
        Type: 'Shopping Ad',
        Position: ad.position,
        Placement: 'shopping',
        Title: ad.title,
        DisplayUrl: ad.displayUrl,
        Description: ad.price || '',
        Phone: '',
        HasCall: 'No'
      });
    });
    
    // Add local ads
    (data.localAds || []).forEach(ad => {
      rows.push({
        Type: 'Local/Call Ad',
        Position: ad.position,
        Placement: 'local_pack',
        Title: ad.title,
        DisplayUrl: ad.displayUrl || ad.address || '',
        Description: ad.category || '',
        Phone: ad.phone || '',
        HasCall: ad.hasCallButton ? 'Yes' : 'No'
      });
    });
    
    exportToCSV(rows, `all-ads-${data.keyword.replace(/\s+/g, '-')}.csv`);
  },
  
  // Show API key modal
  showApiKeyModal() {
    Modal.show(`
      <div class="p-6 max-w-lg">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#1a73e8">key</span>
          <h2 class="text-xl font-medium">Setup ScraperAPI (FREE!)</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">To see current Google ads, you need a FREE ScraperAPI key.</p>
        
        <div class="p-4 rounded-lg mb-4" style="background:#e8f5e9;border:1px solid #4caf50">
          <p class="font-medium" style="color:#2e7d32">
            <span class="material-icons-outlined align-middle">celebration</span>
            FREE: 1,000 searches per month!
          </p>
          <p class="text-sm mt-1" style="color:#1b5e20">No credit card required</p>
        </div>
        
        <div class="space-y-3 mb-6">
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:#1a73e8;color:white">1</span>
            <a href="https://www.scraperapi.com/signup" target="_blank" class="font-medium hover:underline" style="color:#1a73e8">
              Sign up at ScraperAPI.com →
            </a>
          </div>
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:#1a73e8;color:white">2</span>
            <p class="font-medium">Copy your API key from dashboard</p>
          </div>
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:#1a73e8;color:white">3</span>
            <p class="font-medium">Paste it below</p>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">ScraperAPI Key</label>
          <input type="text" id="scraperKeyInput" placeholder="Paste your API key..." 
                 class="w-full p-3 border rounded-lg" style="border-color:#dadce0">
        </div>
        
        <div class="flex gap-3">
          <button onclick="KeywordPlanner.saveApiKey()" class="btn-primary px-6 py-2 flex-1">Save & Search</button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">Cancel</button>
        </div>
      </div>
    `);
    
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  saveApiKey() {
    const key = document.getElementById('scraperKeyInput')?.value.trim();
    if (!key) {
      showAlert('Please enter an API key', 'error');
      return;
    }
    
    Storage.setKey('scraperapi', key);
    Modal.hide();
    showAlert('API key saved!', 'success');
    
    setTimeout(() => this.searchAds(), 500);
  }
};

// Global functions
function searchKeywords() { KeywordPlanner.search(); }
function searchCurrentAds() { KeywordPlanner.searchAds(); }
function filterKw(type) { KeywordPlanner.filter(type); }
function exportKw() { KeywordPlanner.export(); }

window.KeywordPlanner = KeywordPlanner;
