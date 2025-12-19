/* ═══════════════════════════════════════════════════════════════════
   Competitor Intelligence Module
   ═══════════════════════════════════════════════════════════════════ */

const Competitor = {
  currentTab: 'ads',
  
  // Set domain in input
  setDomain(domain) {
    const input = document.getElementById('competitorDomain');
    if (input) input.value = domain;
  },
  
  // Analyze competitor
  async analyze() {
    const domain = document.getElementById('competitorDomain')?.value.trim();
    if (!domain) {
      showAlert('Please enter a domain', 'error');
      return;
    }
    
    const semrushKey = Storage.getKey('semrush');
    if (!semrushKey) {
      showAlert('Add SEMrush API key in Settings', 'error');
      showPage('settings');
      return;
    }
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Analyzing...';
    }
    
    try {
      const [keywordsRes, adsRes, organicRes, competitorsRes] = await Promise.all([
        API.post('/automation/competitor/keywords', { domain, researchApiKey: semrushKey, researchProvider: 'semrush' }),
        API.post('/automation/competitor/ads', { domain, researchApiKey: semrushKey, researchProvider: 'semrush' }),
        API.post('/automation/competitor/organic', { domain, researchApiKey: semrushKey, researchProvider: 'semrush' }),
        API.post('/automation/competitor/adcompetitors', { domain, researchApiKey: semrushKey, researchProvider: 'semrush' })
      ]);
      
      AppState.competitorData = {
        domain,
        keywords: keywordsRes.keywords || [],
        ads: adsRes.ads || [],
        organic: organicRes.keywords || [],
        competitors: competitorsRes.competitors || []
      };
      
      this.renderResults();
      
      document.getElementById('competitorResults')?.classList.remove('hidden');
      document.getElementById('competitorEmpty')?.classList.add('hidden');
      
    } catch (error) {
      showAlert('Error analyzing competitor: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Analyze';
    }
  },
  
  // Render results overview
  renderResults() {
    const data = AppState.competitorData;
    const overview = document.getElementById('compOverview');
    
    if (!overview) return;
    
    const totalSpend = data.keywords.reduce((sum, k) => sum + (k.trafficCost || 0), 0);
    const avgCpc = data.keywords.length 
      ? data.keywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / data.keywords.length 
      : 0;
    
    overview.innerHTML = `
      <div class="card p-4" style="border-left:4px solid #1a73e8">
        <p class="text-2xl font-medium" style="color:#1a73e8">${data.keywords.length}</p>
        <p class="text-xs" style="color:#5f6368">Paid Keywords</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #34a853">
        <p class="text-2xl font-medium" style="color:#34a853">${data.ads.length}</p>
        <p class="text-xs" style="color:#5f6368">Active Ads</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #fbbc04">
        <p class="text-2xl font-medium" style="color:#b06000">${formatCurrency(totalSpend, 0)}</p>
        <p class="text-xs" style="color:#5f6368">Est. Monthly Spend</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #ea4335">
        <p class="text-2xl font-medium" style="color:#ea4335">${formatCurrency(avgCpc)}</p>
        <p class="text-xs" style="color:#5f6368">Avg CPC</p>
      </div>
    `;
    
    this.showTab('ads');
  },
  
  // Show tab
  showTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('[data-ctab]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-ctab="${tab}"]`)?.classList.add('active');
    
    // Render tab content
    const content = document.getElementById('compTabContent');
    if (!content) return;
    
    const data = AppState.competitorData;
    
    switch (tab) {
      case 'ads':
        content.innerHTML = this.renderAdsTab(data.ads);
        break;
      case 'keywords':
        content.innerHTML = this.renderKeywordsTab(data.keywords);
        break;
      case 'organic':
        content.innerHTML = this.renderOrganicTab(data.organic);
        break;
      case 'competitors':
        content.innerHTML = this.renderCompetitorsTab(data.competitors);
        break;
    }
  },
  
  // Render ads tab
  renderAdsTab(ads) {
    if (!ads.length) return '<p class="text-center py-8" style="color:#5f6368">No ads found</p>';
    
    return ads.slice(0, 15).map((ad, i) => `
      <div class="p-4 border rounded-lg mb-3 hover:border-blue-500 transition-colors" style="border-color:#dadce0">
        <div class="flex justify-between mb-2">
          <span class="text-xs" style="color:#5f6368">Ad #${i + 1}</span>
          <span class="badge badge-blue">${esc(ad.keyword || '')}</span>
        </div>
        <h4 class="font-medium mb-1" style="color:#1a73e8">${esc(ad.title || '')}</h4>
        <p class="text-sm mb-2" style="color:#5f6368">${esc(ad.description || '')}</p>
        <div class="flex justify-between items-center">
          <span class="text-xs" style="color:#34a853">${ad.visibleUrl || ''}</span>
          <button onclick="Competitor.improveAd(${i})" class="text-sm hover:underline" style="color:#1a73e8">✨ Beat This Ad</button>
        </div>
      </div>
    `).join('');
  },
  
  // Render keywords tab
  renderKeywordsTab(keywords) {
    if (!keywords.length) return '<p class="text-center py-8" style="color:#5f6368">No keywords found</p>';
    
    return `
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm">
          <thead class="sticky top-0" style="background:#f8f9fa">
            <tr class="text-xs uppercase" style="color:#5f6368">
              <th class="p-3 text-left">Keyword</th>
              <th class="p-3 text-center">Pos</th>
              <th class="p-3 text-right">Volume</th>
              <th class="p-3 text-right">CPC</th>
              <th class="p-3 text-right">Traffic</th>
              <th class="p-3 text-right">Cost/Mo</th>
            </tr>
          </thead>
          <tbody>
            ${keywords.slice(0, 50).map(k => `
              <tr class="table-row">
                <td class="p-3 font-medium">${esc(k.keyword)}</td>
                <td class="p-3 text-center">
                  <span class="badge ${k.position <= 3 ? 'badge-green' : 'badge-grey'}">#${k.position}</span>
                </td>
                <td class="p-3 text-right">${fmt(k.searchVolume)}</td>
                <td class="p-3 text-right ${k.cpc < 5 ? 'trend-up' : k.cpc < 15 ? '' : 'trend-down'}">${formatCurrency(k.cpc)}</td>
                <td class="p-3 text-right">${fmt(k.traffic)}</td>
                <td class="p-3 text-right" style="color:#1a73e8">${formatCurrency(k.trafficCost, 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  
  // Render organic tab
  renderOrganicTab(organic) {
    if (!organic.length) return '<p class="text-center py-8" style="color:#5f6368">No organic keywords found</p>';
    
    return `
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-sm">
          <thead class="sticky top-0" style="background:#f8f9fa">
            <tr class="text-xs uppercase" style="color:#5f6368">
              <th class="p-3 text-left">Keyword</th>
              <th class="p-3 text-center">Position</th>
              <th class="p-3 text-right">Volume</th>
              <th class="p-3 text-right">Traffic</th>
            </tr>
          </thead>
          <tbody>
            ${organic.slice(0, 50).map(k => `
              <tr class="table-row">
                <td class="p-3 font-medium">${esc(k.keyword)}</td>
                <td class="p-3 text-center"><span class="badge badge-green">#${k.position}</span></td>
                <td class="p-3 text-right">${fmt(k.searchVolume)}</td>
                <td class="p-3 text-right">${fmt(k.traffic)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  
  // Render competitors tab
  renderCompetitorsTab(competitors) {
    if (!competitors.length) return '<p class="text-center py-8" style="color:#5f6368">No competitors found</p>';
    
    return `
      <div class="grid grid-cols-2 gap-4">
        ${competitors.slice(0, 8).map(c => `
          <div class="p-4 border rounded-lg cursor-pointer hover:border-blue-500 transition-colors" 
               style="border-color:#dadce0"
               onclick="Competitor.setDomain('${c.domain}');Competitor.analyze()">
            <div class="flex justify-between mb-2">
              <span class="font-medium">${c.domain}</span>
              <span class="text-xs" style="color:#1a73e8">Analyze →</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p style="color:#5f6368">Common KWs</p>
                <p class="font-medium">${fmt(c.commonKeywords)}</p>
              </div>
              <div>
                <p style="color:#5f6368">Ad Spend</p>
                <p class="font-medium" style="color:#1a73e8">${formatCurrency(c.adsTrafficCost, 0)}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },
  
  // Improve ad with AI
  improveAd(index) {
    const ad = AppState.competitorData.ads[index];
    if (!ad) return;
    
    showPage('ai-assistant');
    setTimeout(() => {
      AIChat.quickPrompt(`Create a BETTER version of this competitor ad:

Title: "${ad.title}"
Description: "${ad.description}"
Keyword: "${ad.keyword}"

Give me 5 better headlines and 2 better descriptions.`);
    }, 100);
  }
};

// Global functions
function setCompDomain(domain) { Competitor.setDomain(domain); }
function analyzeCompetitor() { Competitor.analyze(); }
function showCompTab(tab) { Competitor.showTab(tab); }

// Make available globally
window.Competitor = Competitor;
window.setCompDomain = setCompDomain;
window.analyzeCompetitor = analyzeCompetitor;
window.showCompTab = showCompTab;
