/* ═══════════════════════════════════════════════════════════════════
   Keyword Planner Module
   ═══════════════════════════════════════════════════════════════════ */

const KeywordPlanner = {
  // Search for keywords
  async search() {
    const keyword = document.getElementById('kwPlannerInput')?.value.trim();
    if (!keyword) {
      showAlert('Please enter a keyword', 'error');
      return;
    }
    
    const semrushKey = Storage.getKey('semrush');
    if (!semrushKey) {
      showAlert('Add SEMrush API key in Settings', 'error');
      showPage('settings');
      return;
    }
    
    const btn = document.getElementById('kwSearchBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching...';
    }
    
    try {
      const maxCpc = parseFloat(document.getElementById('kwMaxCpc')?.value || 100);
      
      const data = await API.post('/automation/keywords/discover', {
        seedKeywords: [keyword],
        maxCpc,
        researchApiKey: semrushKey,
        researchProvider: 'semrush'
      });
      
      AppState.kwPlannerData = data.keywords || [];
      this.renderResults();
      
      document.getElementById('kwPlannerResults')?.classList.remove('hidden');
      document.getElementById('kwPlannerEmpty')?.classList.add('hidden');
      
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
          <p class="text-xs" style="color:#5f6368">Avg CPC</p>
          <p class="text-2xl font-medium" style="color:#202124">${formatCurrency(avgCpc)}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Low Competition</p>
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
      <table class="w-full text-sm">
        <thead class="sticky top-0" style="background:#f8f9fa">
          <tr class="text-xs uppercase" style="color:#5f6368">
            <th class="p-3 text-left">Keyword</th>
            <th class="p-3 text-right">Volume</th>
            <th class="p-3 text-right">CPC</th>
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
              <td class="p-3 text-right">${fmt(k.searchVolume)}</td>
              <td class="p-3 text-right ${this.getCpcClass(k.cpc)}">${formatCurrency(k.cpc)}</td>
              <td class="p-3 text-center">
                <span class="badge badge-${this.getDifficultyBadge(k.difficulty)}">${k.difficulty}</span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <div class="w-12 h-1.5 rounded" style="background:#e8eaed">
                    <div class="h-full rounded ${k.opportunityScore >= 60 ? 'bg-green-500' : 'bg-yellow-500'}" 
                         style="width:${k.opportunityScore}%;background:${k.opportunityScore >= 60 ? '#34a853' : '#fbbc04'}"></div>
                  </div>
                  <span class="text-xs">${k.opportunityScore}</span>
                </div>
              </td>
              <td class="p-3 text-center">
                <span class="badge ${this.getIntentBadge(k.intent)}">${k.intent}</span>
              </td>
              <td class="p-3 text-center">
                <button class="text-xs hover:underline" style="color:#1a73e8">+ Add</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },
  
  // Get CPC class
  getCpcClass(cpc) {
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
    return 'badge-grey';
  },
  
  // Filter results
  filter(type) {
    let filtered = [...AppState.kwPlannerData];
    
    switch (type) {
      case 'best':
        filtered = filtered
          .filter(k => k.opportunityScore >= 60)
          .sort((a, b) => b.opportunityScore - a.opportunityScore);
        break;
      case 'lowcpc':
        filtered = filtered
          .filter(k => k.cpc < 5)
          .sort((a, b) => a.cpc - b.cpc);
        break;
      case 'highvol':
        filtered = filtered.sort((a, b) => b.searchVolume - a.searchVolume);
        break;
    }
    
    this.renderTable(filtered);
  },
  
  // Export results
  export() {
    const keywords = AppState.kwPlannerData.map(k => ({
      Keyword: k.keyword,
      Volume: k.searchVolume,
      CPC: k.cpc,
      Difficulty: k.difficulty,
      Opportunity: k.opportunityScore,
      Intent: k.intent
    }));
    
    exportToCSV(keywords, 'keyword-research.csv');
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
