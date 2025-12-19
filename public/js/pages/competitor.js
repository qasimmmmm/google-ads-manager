/* ═══════════════════════════════════════════════════════════════════
   Competitor Intelligence Module
   NOW USING FREE Google Ads Transparency Center - NO API KEY NEEDED!
   ═══════════════════════════════════════════════════════════════════ */

const Competitor = {
  currentTab: 'ads',
  
  // Set domain in input
  setDomain(domain) {
    const input = document.getElementById('competitorDomain');
    if (input) input.value = domain;
  },
  
  // Analyze competitor using FREE Google Ads Transparency
  async analyze() {
    const domain = document.getElementById('competitorDomain')?.value.trim();
    if (!domain) {
      showAlert('Please enter a domain', 'error');
      return;
    }
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Analyzing...';
    }
    
    try {
      // Use FREE endpoint - no API key required!
      const response = await API.post('/automation/free/competitor/full', { domain });
      
      if (!response.success) {
        showAlert(response.message || 'No ads found for this domain', 'warning');
        document.getElementById('competitorResults')?.classList.add('hidden');
        document.getElementById('competitorEmpty')?.classList.remove('hidden');
        return;
      }
      
      // Store data
      AppState.competitorData = {
        domain: response.domain,
        advertiser: response.advertiser,
        ads: response.ads || [],
        summary: response.summary || {},
        keywords: [], // Not available in free version
        organic: [],
        competitors: []
      };
      
      this.renderResults();
      
      document.getElementById('competitorResults')?.classList.remove('hidden');
      document.getElementById('competitorEmpty')?.classList.add('hidden');
      
      showAlert(`Found ${response.summary.totalAds} ads for ${domain}! 🆓 FREE`, 'success');
      
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
    
    const summary = data.summary || {};
    
    overview.innerHTML = `
      <div class="card p-4" style="border-left:4px solid #1a73e8">
        <p class="text-2xl font-medium" style="color:#1a73e8">${summary.totalAds || 0}</p>
        <p class="text-xs" style="color:#5f6368">Total Ads Found</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #34a853">
        <p class="text-2xl font-medium" style="color:#34a853">${summary.textAds || 0}</p>
        <p class="text-xs" style="color:#5f6368">Text Ads</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #fbbc04">
        <p class="text-2xl font-medium" style="color:#b06000">${summary.imageAds || 0}</p>
        <p class="text-xs" style="color:#5f6368">Image Ads</p>
      </div>
      <div class="card p-4" style="border-left:4px solid #ea4335">
        <p class="text-2xl font-medium" style="color:#ea4335">${summary.videoAds || 0}</p>
        <p class="text-xs" style="color:#5f6368">Video Ads</p>
      </div>
    `;
    
    // Show link to full transparency center
    if (data.advertiser?.transparencyUrl) {
      overview.innerHTML += `
        <div class="col-span-4 mt-2">
          <a href="${data.advertiser.transparencyUrl}" target="_blank" 
             class="text-sm flex items-center gap-1 hover:underline" style="color:#1a73e8">
            <span class="material-icons-outlined text-lg">open_in_new</span>
            View all ads on Google Ads Transparency Center
          </a>
        </div>
      `;
    }
    
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
  
  // Render ads tab (FREE DATA!)
  renderAdsTab(ads) {
    if (!ads || !ads.length) {
      return '<p class="text-center py-8" style="color:#5f6368">No ads found for this domain</p>';
    }
    
    return `
      <div class="mb-4 p-3 rounded-lg" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm" style="color:#137333">
          <span class="material-icons-outlined text-lg align-middle">celebration</span>
          <strong>FREE Data!</strong> Showing ${ads.length} ads from Google Ads Transparency Center. No API key needed!
        </p>
      </div>
      ${ads.slice(0, 20).map((ad, i) => `
        <div class="p-4 border rounded-lg mb-3 hover:border-blue-500 transition-colors" style="border-color:#dadce0">
          <div class="flex justify-between mb-2">
            <span class="text-xs" style="color:#5f6368">Ad #${ad.position || i + 1}</span>
            <span class="badge badge-${ad.format === 'video' ? 'red' : ad.format === 'image' ? 'yellow' : 'blue'}">${ad.format || 'text'}</span>
          </div>
          ${ad.imageUrl ? `
            <div class="mb-3">
              <img src="${ad.imageUrl}" alt="Ad preview" class="max-w-full h-auto rounded border" style="max-height:150px">
            </div>
          ` : ''}
          <div class="flex justify-between items-center">
            <a href="${ad.viewUrl || ad.previewUrl}" target="_blank" class="text-sm hover:underline" style="color:#1a73e8">
              <span class="material-icons-outlined text-lg align-middle">visibility</span> View Full Ad
            </a>
            <button onclick="Competitor.analyzeAd(${i})" class="text-sm hover:underline" style="color:#34a853">
              ✨ Get AI Tips
            </button>
          </div>
        </div>
      `).join('')}
    `;
  },
  
  // Render keywords tab
  renderKeywordsTab(keywords) {
    return `
      <div class="p-4 text-center" style="color:#5f6368">
        <span class="material-icons-outlined text-4xl mb-2" style="color:#fbbc04">lock</span>
        <p class="font-medium">Competitor keyword data requires a paid API</p>
        <p class="text-sm mt-1">SEMrush or similar services provide this data</p>
        <button onclick="showPage('keyword-planner')" class="btn-primary px-4 py-2 mt-4 text-sm">
          Use FREE Keyword Planner Instead
        </button>
      </div>
    `;
  },
  
  // Render organic tab
  renderOrganicTab(organic) {
    return `
      <div class="p-4 text-center" style="color:#5f6368">
        <span class="material-icons-outlined text-4xl mb-2" style="color:#fbbc04">lock</span>
        <p class="font-medium">Organic keyword data requires a paid API</p>
        <p class="text-sm mt-1">Use Ahrefs, SEMrush, or Moz for organic data</p>
      </div>
    `;
  },
  
  // Render competitors tab
  renderCompetitorsTab(competitors) {
    return `
      <div class="p-4 text-center" style="color:#5f6368">
        <span class="material-icons-outlined text-4xl mb-2" style="color:#1a73e8">tips_and_updates</span>
        <p class="font-medium">Try searching for similar companies!</p>
        <p class="text-sm mt-1">Enter competitor domains in the search box above</p>
        <div class="flex flex-wrap gap-2 justify-center mt-4">
          <button onclick="Competitor.setDomain('spectrum.com');Competitor.analyze()" class="badge badge-blue cursor-pointer">spectrum.com</button>
          <button onclick="Competitor.setDomain('xfinity.com');Competitor.analyze()" class="badge badge-blue cursor-pointer">xfinity.com</button>
          <button onclick="Competitor.setDomain('att.com');Competitor.analyze()" class="badge badge-blue cursor-pointer">att.com</button>
          <button onclick="Competitor.setDomain('verizon.com');Competitor.analyze()" class="badge badge-blue cursor-pointer">verizon.com</button>
        </div>
      </div>
    `;
  },
  
  // Analyze ad with AI
  analyzeAd(index) {
    const ad = AppState.competitorData.ads[index];
    if (!ad) return;
    
    showPage('ai-assistant');
    setTimeout(() => {
      AIChat.quickPrompt(`Analyze this competitor's ${ad.format} ad and give me tips to create a better one:

Domain: ${AppState.competitorData.domain}
Ad Format: ${ad.format}
Ad Preview: ${ad.viewUrl || ad.previewUrl}

Please suggest:
1. What makes this ad effective (or not)
2. 5 better headline ideas
3. 2 better description ideas
4. Call-to-action improvements`);
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
