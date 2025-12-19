/* ═══════════════════════════════════════════════════════════════════
   Keywords Module
   ═══════════════════════════════════════════════════════════════════ */

const Keywords = {
  // Load keywords
  async load() {
    try {
      const data = await API.get('/api/keywords');
      AppState.set('keywords', data.keywords || []);
    } catch (error) {
      console.log('Using demo keywords');
      AppState.set('keywords', []);
    }
    this.render();
    this.updateStats();
  },
  
  // Render keywords table
  render() {
    const tbody = document.getElementById('keywordsTableBody');
    const countEl = document.getElementById('keywordCount');
    const keywords = AppState.keywords;
    
    if (countEl) {
      countEl.textContent = keywords.length + ' keywords';
    }
    
    if (!tbody) return;
    
    if (!keywords.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="p-8 text-center" style="color:#5f6368">
            No keywords found. Add keywords to see them here.
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = keywords.map(k => `
      <tr class="table-row">
        <td class="p-4"><input type="checkbox" class="rounded"></td>
        <td class="p-4 font-medium text-sm">${esc(k.keyword)}</td>
        <td class="p-4 text-center"><span class="badge badge-grey">${k.matchType || 'Broad'}</span></td>
        <td class="p-4 text-center">
          <div class="qscore ${this.getQSClass(k.qualityScore)} mx-auto">${k.qualityScore || '-'}</div>
        </td>
        <td class="p-4">
          <span class="inline-flex items-center gap-1">
            <span class="status-dot ${k.status === 'ENABLED' ? 'status-active' : 'status-paused'}"></span>
            <span class="text-sm">${k.status === 'ENABLED' ? 'Active' : 'Paused'}</span>
          </span>
        </td>
        <td class="p-4 text-right text-sm">${fmt(k.impressions || 0)}</td>
        <td class="p-4 text-right text-sm">${fmt(k.clicks || 0)}</td>
        <td class="p-4 text-right text-sm">${formatPercent(k.ctr || 0)}</td>
        <td class="p-4 text-right text-sm">${formatCurrency(k.avgCpc || 0)}</td>
        <td class="p-4 text-right text-sm">${fmt(k.conversions || 0)}</td>
        <td class="p-4 text-right text-sm">${formatCurrency(k.cost || 0, 0)}</td>
        <td class="p-4 text-center">
          <button onclick="Keywords.analyze('${esc(k.keyword)}')" class="p-1.5 rounded hover:bg-gray-100" style="color:#5f6368">
            <span class="material-icons-outlined text-lg">auto_awesome</span>
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  // Get QS CSS class
  getQSClass(qs) {
    if (!qs) return 'qscore-low';
    if (qs >= 7) return 'qscore-high';
    if (qs >= 4) return 'qscore-med';
    return 'qscore-low';
  },
  
  // Update stats
  updateStats() {
    const keywords = AppState.keywords;
    
    const total = keywords.length;
    const active = keywords.filter(k => k.status === 'ENABLED').length;
    const qsArr = keywords.filter(k => k.qualityScore).map(k => k.qualityScore);
    const avgQS = qsArr.length ? (qsArr.reduce((a, b) => a + b, 0) / qsArr.length).toFixed(1) : '0';
    const cpcArr = keywords.filter(k => k.avgCpc).map(k => k.avgCpc);
    const avgCPC = cpcArr.length ? (cpcArr.reduce((a, b) => a + b, 0) / cpcArr.length) : 0;
    const lowQS = keywords.filter(k => k.qualityScore && k.qualityScore <= 4).length;
    
    this.updateStat('totalKeywords', total);
    this.updateStat('activeKeywords', active);
    this.updateStat('avgQS', avgQS);
    this.updateStat('avgKeywordCPC', formatCurrency(avgCPC));
    this.updateStat('lowQSCount', lowQS);
  },
  
  // Update stat element
  updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },
  
  // Analyze keyword
  analyze(keyword) {
    showPage('ai-assistant');
    setTimeout(() => {
      AIChat.quickPrompt(`Analyze keyword "${keyword}" and suggest how to improve its Quality Score and performance.`);
    }, 100);
  },
  
  // Export keywords
  export() {
    exportToCSV(AppState.keywords, 'keywords.csv');
  },
  
  // Add keywords
  add() {
    showPage('keyword-planner');
  }
};

// Register page handler
Router.register('keywords', () => Keywords.load());

// Global functions
function exportKeywords() { Keywords.export(); }
function addKeywords() { Keywords.add(); }
function analyzeKeyword(kw) { Keywords.analyze(kw); }

// Make available globally
window.Keywords = Keywords;
window.exportKeywords = exportKeywords;
window.addKeywords = addKeywords;
window.analyzeKeyword = analyzeKeyword;
