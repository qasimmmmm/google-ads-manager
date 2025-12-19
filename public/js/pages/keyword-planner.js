/* ═══════════════════════════════════════════════════════════════════
   Keyword Planner Module
   
   TWO FEATURES:
   1. Keyword Research (FREE - Google Autocomplete, no API key)
   2. Current Ads on Keywords (ScraperAPI - see LIVE ads on Google)
   ═══════════════════════════════════════════════════════════════════ */

const KeywordPlanner = {
  
  /* ═══════════════════════════════════════════════════════════════════
     FEATURE 1: FREE Keyword Research (Google Autocomplete)
     No API key needed!
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
      // Use FREE Google Autocomplete API - no key needed!
      const data = await API.post('/automation/free/keywords/discover', {
        seedKeywords: [keyword],
        maxKeywords: 100
      });
      
      AppState.kwPlannerData = data.keywords || [];
      this.renderResults();
      
      document.getElementById('kwPlannerResults')?.classList.remove('hidden');
      document.getElementById('kwPlannerEmpty')?.classList.add('hidden');
      
      showAlert(`Found ${data.keywords?.length || 0} keywords! 🆓 100% FREE`, 'success');
      
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
    
    // Render summary cards
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
    
    // Render table
    this.renderTable(keywords);
  },
  
  renderTable(keywords) {
    const container = document.getElementById('kwPlannerTable');
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-3 rounded-lg mb-4" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm" style="color:#137333">
          <span class="material-icons-outlined text-lg align-middle">celebration</span>
          <strong>100% FREE!</strong> Keywords from Google Autocomplete. No API key needed!
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
            <th class="p-3 text-center">Intent</th>
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
                <span class="badge badge-${this.getDiffBadge(k.difficulty)}">${k.difficulty || 'Medium'}</span>
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
                <span class="badge ${k.intent === 'Commercial' || k.intent === 'Transactional' ? 'badge-blue' : 'badge-grey'}">${k.intent || 'Info'}</span>
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
  
  getDiffBadge(diff) {
    if (diff === 'Easy') return 'green';
    if (diff === 'Hard') return 'red';
    return 'yellow';
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
      Opportunity: k.opportunityScore || 50,
      Intent: k.intent || 'Informational'
    }));
    exportToCSV(keywords, 'keyword-research-FREE.csv');
  },
  
  
  /* ═══════════════════════════════════════════════════════════════════
     FEATURE 2: Current Ads on Keywords (ScraperAPI)
     See LIVE ads running on Google for any keyword!
     ═══════════════════════════════════════════════════════════════════ */
  
  // Called when clicking "See Ads" in keyword table
  searchCurrentAds(keyword) {
    const input = document.getElementById('currentAdsInput');
    if (input) input.value = keyword;
    this.searchAds();
  },
  
  // Main function to search current ads
  async searchAds() {
    const keyword = document.getElementById('currentAdsInput')?.value.trim();
    if (!keyword) {
      showAlert('Please enter a keyword', 'error');
      return;
    }
    
    const scraperApiKey = Storage.getKey('scraperapi');
    
    // Check for API key
    if (!scraperApiKey) {
      this.showApiKeyModal();
      return;
    }
    
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching Google...';
    }
    
    try {
      const response = await API.post('/automation/free/keywords/current-ads', {
        keyword,
        scraperApiKey,
        country: 'us'
      });
      
      // Handle errors
      if (response.error === 'NO_API_KEY' || response.error === 'INVALID_API_KEY') {
        this.showApiKeyModal();
        return;
      }
      
      if (!response.success) {
        showAlert(response.message || 'Search failed. Check your API key.', 'error');
        return;
      }
      
      // Render results
      this.renderAdsResults(response);
      
      const creditsMsg = response.creditsUsed ? ` (${response.creditsUsed} credits used)` : '';
      showAlert(`Found ${response.totalAds || 0} LIVE ads for "${keyword}"!${creditsMsg}`, 'success');
      
    } catch (error) {
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  // Render ads results
  renderAdsResults(data) {
    const container = document.getElementById('currentAdsResults');
    if (!container) return;
    
    container.classList.remove('hidden');
    
    const ads = data.ads || [];
    
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="card p-4" style="border-left:4px solid #1a73e8">
          <p class="text-2xl font-medium" style="color:#1a73e8">${data.totalAds || 0}</p>
          <p class="text-xs" style="color:#5f6368">Total Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #34a853">
          <p class="text-2xl font-medium" style="color:#34a853">${data.topAds || 0}</p>
          <p class="text-xs" style="color:#5f6368">Top Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #fbbc04">
          <p class="text-2xl font-medium" style="color:#b06000">${data.bottomAds || 0}</p>
          <p class="text-xs" style="color:#5f6368">Bottom Ads</p>
        </div>
        <div class="card p-4" style="border-left:4px solid #ea4335">
          <p class="text-2xl font-medium" style="color:#ea4335">${data.organicCount || 0}</p>
          <p class="text-xs" style="color:#5f6368">Organic Results</p>
        </div>
      </div>
      
      <!-- Info Banner -->
      <div class="p-3 rounded-lg mb-4" style="background:#e8f0fe;border:1px solid #1a73e8">
        <p class="text-sm" style="color:#1a73e8">
          <span class="material-icons-outlined text-lg align-middle">info</span>
          <strong>LIVE Data!</strong> These ads are currently running on Google for "<strong>${esc(data.keyword)}</strong>"
        </p>
        <p class="text-xs mt-1" style="color:#5f6368">Searched: ${new Date(data.timestamp).toLocaleString()}</p>
      </div>
      
      <!-- Ads List -->
      <div class="space-y-3">
        ${ads.length === 0 ? `
          <div class="p-8 text-center card">
            <span class="material-icons-outlined text-4xl mb-2" style="color:#5f6368">search_off</span>
            <p class="font-medium">No ads found for this keyword</p>
            <p class="text-sm mt-1" style="color:#5f6368">This keyword may not have advertisers right now</p>
            <a href="${data.searchUrl}" target="_blank" class="btn-secondary px-4 py-2 mt-4 inline-flex items-center gap-2 text-sm">
              <span class="material-icons-outlined">open_in_new</span>
              Check Google Manually
            </a>
          </div>
        ` : ads.map((ad, i) => `
          <div class="card p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="badge ${ad.type === 'top' ? 'badge-green' : ad.type === 'shopping' ? 'badge-yellow' : 'badge-grey'}">
                  ${ad.type === 'top' ? 'Top' : ad.type === 'shopping' ? 'Shopping' : 'Bottom'} #${ad.position}
                </span>
                <span class="badge badge-blue">Sponsored</span>
              </div>
              ${ad.link ? `
                <a href="${ad.link}" target="_blank" class="text-xs hover:underline flex items-center gap-1" style="color:#1a73e8">
                  <span class="material-icons-outlined text-sm">open_in_new</span> Visit
                </a>
              ` : ''}
            </div>
            
            <h4 class="font-medium text-lg mb-1" style="color:#1a0dab">${esc(ad.title)}</h4>
            <p class="text-sm mb-2" style="color:#006621">${esc(ad.displayUrl)}</p>
            ${ad.description ? `<p class="text-sm" style="color:#545454">${esc(ad.description)}</p>` : ''}
            ${ad.price ? `<p class="font-medium mt-2" style="color:#202124">${esc(ad.price)}</p>` : ''}
            
            <div class="mt-3 pt-3 border-t flex gap-3" style="border-color:#e8eaed">
              <button onclick="KeywordPlanner.analyzeCompetitor('${esc(ad.displayUrl)}')" 
                      class="text-xs px-3 py-1.5 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">
                🔍 Analyze This Advertiser
              </button>
              <button onclick="KeywordPlanner.getAdTips('${esc(ad.title)}', '${esc(ad.description || '')}')"
                      class="text-xs px-3 py-1.5 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#34a853">
                ✨ AI: Beat This Ad
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Related Searches -->
      ${data.relatedSearches && data.relatedSearches.length > 0 ? `
        <div class="mt-6">
          <h4 class="font-medium mb-3">Related Searches</h4>
          <div class="flex flex-wrap gap-2">
            ${data.relatedSearches.map(s => `
              <button onclick="KeywordPlanner.searchCurrentAds('${esc(s.query || s)}')" 
                      class="px-3 py-1.5 rounded-full text-sm border hover:bg-blue-50" style="border-color:#dadce0">
                ${esc(s.query || s)}
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
          Export Results
        </button>
      </div>
    `;
    
    // Store for export
    AppState.currentAdsData = data;
  },
  
  // Analyze a competitor from ad
  analyzeCompetitor(domain) {
    if (typeof Competitor !== 'undefined') {
      showPage('competitor');
      setTimeout(() => {
        Competitor.setDomain(domain);
        Competitor.analyze();
      }, 100);
    }
  },
  
  // Get AI tips to beat an ad
  getAdTips(title, description) {
    showPage('ai-assistant');
    setTimeout(() => {
      if (typeof AIChat !== 'undefined') {
        AIChat.quickPrompt(`I found this competitor ad on Google. Help me create a BETTER ad:

Competitor Ad:
- Title: "${title}"
- Description: "${description}"

Please provide:
1. 5 better headline ideas (max 30 chars each)
2. 3 better description ideas (max 90 chars each)  
3. Key selling points to highlight
4. Strong call-to-action suggestions`);
      }
    }, 100);
  },
  
  // Export ads data
  exportAds() {
    const data = AppState.currentAdsData;
    if (!data || !data.ads || !data.ads.length) {
      showAlert('No ads to export', 'warning');
      return;
    }
    
    const rows = data.ads.map(ad => ({
      Position: ad.position,
      Type: ad.type,
      Title: ad.title,
      DisplayUrl: ad.displayUrl,
      Description: ad.description || '',
      Link: ad.link || ''
    }));
    
    exportToCSV(rows, `google-ads-${data.keyword.replace(/\s+/g, '-')}.csv`);
  },
  
  // Show API key setup modal
  showApiKeyModal() {
    Modal.show(`
      <div class="p-6 max-w-lg">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#1a73e8">key</span>
          <h2 class="text-xl font-medium">Setup ScraperAPI (FREE!)</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">
          To see current Google ads, you need a FREE ScraperAPI key.
        </p>
        
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
            <div>
              <a href="https://www.scraperapi.com/signup" target="_blank" class="font-medium hover:underline" style="color:#1a73e8">
                Sign up at ScraperAPI.com →
              </a>
              <p class="text-xs" style="color:#5f6368">Free, no credit card</p>
            </div>
          </div>
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:#1a73e8;color:white">2</span>
            <div>
              <p class="font-medium">Copy your API key from dashboard</p>
            </div>
          </div>
          <div class="flex gap-3 items-start">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style="background:#1a73e8;color:white">3</span>
            <div>
              <p class="font-medium">Paste it below</p>
            </div>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">ScraperAPI Key</label>
          <input type="text" id="scraperKeyInput" placeholder="Paste your API key..." 
                 class="w-full p-3 border rounded-lg" style="border-color:#dadce0">
        </div>
        
        <div class="flex gap-3">
          <button onclick="KeywordPlanner.saveApiKey()" class="btn-primary px-6 py-2 flex-1">
            Save & Search
          </button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">
            Cancel
          </button>
        </div>
      </div>
    `);
    
    // Reset button state
    const btn = document.getElementById('currentAdsBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">ads_click</span>Search Current Ads';
    }
  },
  
  // Save API key and retry search
  saveApiKey() {
    const key = document.getElementById('scraperKeyInput')?.value.trim();
    if (!key) {
      showAlert('Please enter an API key', 'error');
      return;
    }
    
    Storage.setKey('scraperapi', key);
    Modal.hide();
    showAlert('API key saved!', 'success');
    
    // Retry search
    setTimeout(() => this.searchAds(), 500);
  }
};

// Global functions
function searchKeywords() { KeywordPlanner.search(); }
function searchCurrentAds() { KeywordPlanner.searchAds(); }
function filterKw(type) { KeywordPlanner.filter(type); }
function exportKw() { KeywordPlanner.export(); }

// Make available globally
window.KeywordPlanner = KeywordPlanner;
window.searchKeywords = searchKeywords;
window.searchCurrentAds = searchCurrentAds;
window.filterKw = filterKw;
window.exportKw = exportKw;
