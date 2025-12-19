/* ═══════════════════════════════════════════════════════════════════
   Competitor Intelligence Module
   Uses ScraperAPI (FREE 1000 credits/month) + Google Ads Transparency
   Sign up: https://www.scraperapi.com/signup
   ═══════════════════════════════════════════════════════════════════ */

const Competitor = {
  currentTab: 'ads',
  
  // Set domain in input
  setDomain(domain) {
    const input = document.getElementById('competitorDomain');
    if (input) input.value = domain;
  },
  
  // Analyze competitor using ScraperAPI + Google Ads Transparency
  async analyze() {
    const domain = document.getElementById('competitorDomain')?.value.trim();
    if (!domain) {
      showAlert('Please enter a domain', 'error');
      return;
    }
    
    // Get ScraperAPI key from storage
    const scraperApiKey = Storage.getKey('scraperapi');
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Analyzing...';
    }
    
    try {
      // Use FREE endpoint with ScraperAPI
      const response = await API.post('/automation/free/competitor/full', { 
        domain,
        scraperApiKey,
        region: 'US'
      });
      
      // Handle no API key case
      if (response.error === 'NO_API_KEY' || !response.success && response.setupInstructions) {
        this.showApiKeySetup(response);
        return;
      }
      
      if (!response.success) {
        showAlert(response.message || 'No ads found for this domain', 'warning');
        document.getElementById('competitorResults')?.classList.add('hidden');
        document.getElementById('competitorEmpty')?.classList.remove('hidden');
        
        // Show manual search link
        if (response.manualSearchUrl) {
          document.getElementById('competitorEmpty').innerHTML = `
            <div class="text-center py-8">
              <span class="material-icons-outlined text-4xl mb-2" style="color:#5f6368">search_off</span>
              <p class="font-medium mb-2">${response.message || 'No ads found'}</p>
              <p class="text-sm mb-4" style="color:#5f6368">${response.suggestion || ''}</p>
              <a href="${response.manualSearchUrl}" target="_blank" class="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                <span class="material-icons-outlined">open_in_new</span>
                Search Manually on Google
              </a>
            </div>
          `;
        }
        return;
      }
      
      // Store data
      AppState.competitorData = {
        domain: response.domain,
        advertiser: response.advertiser,
        ads: response.ads || [],
        summary: response.summary || {},
        keywords: [],
        organic: [],
        competitors: response.otherAdvertisers || []
      };
      
      this.renderResults();
      
      document.getElementById('competitorResults')?.classList.remove('hidden');
      document.getElementById('competitorEmpty')?.classList.add('hidden');
      
      const creditMsg = response.creditsUsed ? ` (${response.creditsUsed} credits used)` : '';
      showAlert(`Found ${response.summary?.totalAds || 0} ads for ${domain}!${creditMsg}`, 'success');
      
    } catch (error) {
      showAlert('Error analyzing competitor: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Analyze';
    }
  },
  
  // Show API key setup instructions
  showApiKeySetup(response) {
    const setup = response.setupInstructions;
    
    Modal.show(`
      <div class="p-6 max-w-lg">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#1a73e8">key</span>
          <h2 class="text-xl font-medium">Setup Required (FREE!)</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">
          To scrape competitor ads, you need a <strong>FREE</strong> ScraperAPI key.
          It takes 30 seconds to set up!
        </p>
        
        <div class="p-4 rounded-lg mb-4" style="background:#e8f5e9;border:1px solid #4caf50">
          <p class="font-medium mb-2" style="color:#2e7d32">
            <span class="material-icons-outlined align-middle">celebration</span>
            FREE: 1,000 scrapes per month!
          </p>
          <p class="text-sm" style="color:#1b5e20">No credit card required. Perfect for competitor research.</p>
        </div>
        
        <div class="space-y-3 mb-6">
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">1</span>
            <div>
              <a href="https://www.scraperapi.com/signup" target="_blank" class="font-medium hover:underline" style="color:#1a73e8">
                Sign up at ScraperAPI.com →
              </a>
              <p class="text-xs" style="color:#5f6368">Free account, no credit card</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">2</span>
            <div>
              <p class="font-medium">Copy your API key from dashboard</p>
              <p class="text-xs" style="color:#5f6368">It's shown right after signup</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">3</span>
            <div>
              <p class="font-medium">Paste it below</p>
            </div>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">ScraperAPI Key</label>
          <input type="text" id="scraperApiKeyInput" placeholder="Paste your API key here..." 
                 class="w-full p-3 border rounded-lg" style="border-color:#dadce0">
        </div>
        
        <div class="flex gap-3">
          <button onclick="Competitor.saveApiKey()" class="btn-primary px-6 py-2 flex-1">
            Save & Analyze
          </button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">
            Cancel
          </button>
        </div>
        
        <p class="text-xs mt-4 text-center" style="color:#5f6368">
          Or <a href="${response.manualSearchUrl}" target="_blank" class="hover:underline" style="color:#1a73e8">search manually</a> on Google Ads Transparency Center
        </p>
      </div>
    `);
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Analyze';
    }
  },
  
  // Save API key and retry
  saveApiKey() {
    const key = document.getElementById('scraperApiKeyInput')?.value.trim();
    if (!key) {
      showAlert('Please enter an API key', 'error');
      return;
    }
    
    Storage.setKey('scraperapi', key);
    Modal.hide();
    showAlert('API key saved!', 'success');
    
    // Retry analysis
    setTimeout(() => this.analyze(), 500);
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
  
  // Render ads tab
  renderAdsTab(ads) {
    if (!ads || !ads.length) {
      return '<p class="text-center py-8" style="color:#5f6368">No ads found for this domain</p>';
    }
    
    return `
      <div class="mb-4 p-3 rounded-lg" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm" style="color:#137333">
          <span class="material-icons-outlined text-lg align-middle">celebration</span>
          <strong>Showing ${ads.length} ads</strong> from Google Ads Transparency Center via ScraperAPI
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
              <img src="${ad.imageUrl}" alt="Ad preview" class="max-w-full h-auto rounded border" style="max-height:150px"
                   onerror="this.style.display='none'">
            </div>
          ` : ''}
          ${ad.firstShown ? `
            <p class="text-xs mb-2" style="color:#5f6368">
              First shown: ${ad.firstShown} ${ad.lastShown ? `• Last shown: ${ad.lastShown}` : ''}
            </p>
          ` : ''}
          <div class="flex justify-between items-center">
            <a href="${ad.previewUrl}" target="_blank" class="text-sm hover:underline" style="color:#1a73e8">
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
    if (competitors && competitors.length > 0) {
      return `
        <p class="text-sm mb-4" style="color:#5f6368">Other advertisers found for this domain:</p>
        <div class="grid grid-cols-2 gap-4">
          ${competitors.map(c => `
            <div class="p-4 border rounded-lg cursor-pointer hover:border-blue-500 transition-colors" 
                 style="border-color:#dadce0"
                 onclick="window.open('${c.transparencyUrl}', '_blank')">
              <div class="flex justify-between mb-2">
                <span class="font-medium">${c.name || c.advertiserId}</span>
                <span class="text-xs" style="color:#1a73e8">View →</span>
              </div>
              <p class="text-xs" style="color:#5f6368">${c.advertiserId}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
    
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
Ad Preview: ${ad.previewUrl}

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
