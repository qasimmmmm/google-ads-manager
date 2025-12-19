/* ═══════════════════════════════════════════════════════════════════
   Keyword Planner Module
   NOW USING FREE Google Autocomplete - NO API KEY NEEDED!
   ═══════════════════════════════════════════════════════════════════ */

const KeywordPlanner = {
  // Search for keywords using FREE API
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
      // Use FREE endpoint - no API key required!
      const data = await API.post('/automation/free/keywords/discover', {
        seedKeywords: [keyword],
        maxKeywords: 100
      });
      
      AppState.kwPlannerData = data.keywords || [];
      this.renderResults();
      
      document.getElementById('kwPlannerResults')?.classList.remove('hidden');
      document.getElementById('kwPlannerEmpty')?.classList.add('hidden');
      
      showAlert(`Found ${data.keywords?.length || 0} keywords! 🆓 FREE - No API key needed!`, 'success');
      
    } catch (error) {
      showAlert('Error searching keywords: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Find Keywords';
    }
  },
  
  // Render results
  renderResults() {
    const keywords = AppState.kwPlannerData;
    
    // Render summary
    const summary = document.getElementById('kwPlannerSummary');
    if (summary) {
      const avgCpc = keywords.length 
        ? keywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / keywords.length 
        : 0;
      const lowComp = keywords.filter(k => k.difficulty === 'Easy').length;
      const opportunities = keywords.filter(k => k.opportunityScore >= 60).length;
      
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
  
  // Render keywords table
  renderTable(keywords) {
    const container = document.getElementById('kwPlannerTable');
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-3 rounded-lg mb-4" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm" style="color:#137333">
          <span class="material-icons-outlined text-lg align-middle">celebration</span>
          <strong>100% FREE!</strong> Keywords from Google Autocomplete. No API key needed!
          <span class="text-xs block mt-1">Note: Search volumes & CPC are AI estimates. For exact data, use SEMrush.</span>
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
              <td class="p-3 text-right ${this.getCpcClass(k.cpc)}">${formatCurrency(k.cpc || 0)}</td>
              <td class="p-3 text-center">
                <span class="badge badge-${this.getDifficultyBadge(k.difficulty)}">${k.difficulty || 'Medium'}</span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <div class="w-12 h-1.5 rounded" style="background:#e8eaed">
                    <div class="h-full rounded" 
                         style="width:${k.opportunityScore || 50}%;background:${(k.opportunityScore || 50) >= 60 ? '#34a853' : '#fbbc04'}"></div>
                  </div>
                  <span class="text-xs">${k.opportunityScore || 50}</span>
                </div>
              </td>
              <td class="p-3 text-center">
                <span class="badge ${this.getIntentBadge(k.intent)}">${k.intent || 'Info'}</span>
              </td>
              <td class="p-3 text-center">
                <button onclick="KeywordPlanner.addToList('${esc(k.keyword)}')" class="text-xs hover:underline" style="color:#1a73e8">+ Add</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },
  
  // Get CPC class
  getCpcClass(cpc) {
    if (!cpc) return '';
    if (cpc < 3) return 'trend-up';
    if (cpc < 10) return '';
    return 'trend-down';
  },
  
  // Get difficulty badge
  getDifficultyBadge(difficulty) {
    const badges = { 'Easy': 'green', 'Medium': 'yellow', 'Hard': 'red' };
    return badges[difficulty] || 'grey';
  },
  
  // Get intent badge
  getIntentBadge(intent) {
    if (intent === 'Commercial' || intent === 'Transactional') return 'badge-blue';
    if (intent === 'Local') return 'badge-green';
    return 'badge-grey';
  },
  
  // Filter results
  filter(type) {
    let filtered = [...AppState.kwPlannerData];
    
    switch (type) {
      case 'best':
        filtered = filtered
          .filter(k => (k.opportunityScore || 50) >= 60)
          .sort((a, b) => (b.opportunityScore || 50) - (a.opportunityScore || 50));
        break;
      case 'lowcpc':
        filtered = filtered
          .filter(k => (k.cpc || 0) < 5)
          .sort((a, b) => (a.cpc || 0) - (b.cpc || 0));
        break;
      case 'highvol':
        filtered = filtered.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
        break;
    }
    
    this.renderTable(filtered);
  },
  
  // Add keyword to list (for later use)
  addToList(keyword) {
    showAlert(`Added "${keyword}" to your list!`, 'success');
    // Could store in localStorage for later use
  },
  
  // Export results
  export() {
    const keywords = AppState.kwPlannerData.map(k => ({
      Keyword: k.keyword,
      'Est. Volume': k.searchVolume || 'N/A',
      'Est. CPC': k.cpc || 'N/A',
      Difficulty: k.difficulty || 'Medium',
      Opportunity: k.opportunityScore || 50,
      Intent: k.intent || 'Informational'
    }));
    
    exportToCSV(keywords, 'keyword-research-FREE.csv');
  }
};

// Global functions
function searchKeywords() { KeywordPlanner.search(); }
function filterKwPlanner(type) { KeywordPlanner.filter(type); }
function exportKwPlanner() { KeywordPlanner.export(); }

// Make available globally
window.KeywordPlanner = KeywordPlanner;
window.searchKeywords = searchKeywords;
window.filterKwPlanner = filterKwPlanner;
window.exportKwPlanner = exportKwPlanner;
