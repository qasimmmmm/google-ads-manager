/* ═══════════════════════════════════════════════════════════════════
   Competitor Intelligence Module v2.0
   
   Two Methods:
   1. SEMrush API - Paid, provides keyword data, ad history, traffic
   2. Google Ads Transparency - Via ScraperAPI, shows actual ad creatives
   ═══════════════════════════════════════════════════════════════════ */

const Competitor = {
  currentTab: 'ads',
  currentMethod: 'transparency', // 'transparency' or 'semrush'
  
  // Set domain in input
  setDomain(domain) {
    const input = document.getElementById('competitorDomain');
    if (input) input.value = domain;
  },
  
  // Switch method
  switchMethod(method) {
    this.currentMethod = method;
    
    // Update tab styles
    document.querySelectorAll('[data-method]').forEach(btn => {
      if (btn.dataset.method === method) {
        btn.classList.add('active');
        btn.style.borderColor = '#1a73e8';
        btn.style.color = '#1a73e8';
        btn.style.background = '#e8f0fe';
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = '#dadce0';
        btn.style.color = '#5f6368';
        btn.style.background = 'white';
      }
    });
    
    // Show/hide API key inputs
    document.getElementById('semrushKeySection')?.classList.toggle('hidden', method !== 'semrush');
    document.getElementById('scraperKeySection')?.classList.toggle('hidden', method !== 'transparency');
    
    // Update button text
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.innerHTML = method === 'semrush' 
        ? '<span class="material-icons-outlined">analytics</span>Analyze with SEMrush'
        : '<span class="material-icons-outlined">search</span>Search Transparency Center';
    }
  },
  
  // Main analyze function
  async analyze() {
    const domain = document.getElementById('competitorDomain')?.value.trim();
    if (!domain) {
      showAlert('Please enter a domain', 'error');
      return;
    }
    
    if (this.currentMethod === 'semrush') {
      await this.analyzeWithSemrush(domain);
    } else {
      await this.analyzeWithTransparency(domain);
    }
  },
  
  // Method 1: SEMrush API
  async analyzeWithSemrush(domain) {
    const semrushApiKey = document.getElementById('semrushApiKey')?.value.trim() || Storage.getKey('semrush');
    
    if (!semrushApiKey) {
      this.showSemrushSetup();
      return;
    }
    
    // Save key for future use
    Storage.setKey('semrush', semrushApiKey);
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Analyzing...';
    }
    
    try {
      const response = await API.post('/automation/free/competitor/full', {
        domain,
        method: 'semrush',
        semrushApiKey,
        country: 'us'
      });
      
      if (!response.success) {
        if (response.error === 'NO_SEMRUSH_KEY') {
          this.showSemrushSetup();
        } else {
          showAlert(response.message || 'SEMrush API error', 'error');
        }
        return;
      }
      
      // Store and render
      AppState.competitorData = {
        domain: response.domain,
        method: 'semrush',
        summary: response.summary || {},
        ads: response.ads || []
      };
      
      this.renderSemrushResults(response);
      
      document.getElementById('competitorResults')?.classList.remove('hidden');
      document.getElementById('competitorEmpty')?.classList.add('hidden');
      
      showAlert(`SEMrush: Found ${response.ads?.length || 0} ad keywords for ${domain}`, 'success');
      
    } catch (error) {
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">analytics</span>Analyze with SEMrush';
    }
  },
  
  // Method 2: Google Ads Transparency
  async analyzeWithTransparency(domain) {
    const scraperApiKey = document.getElementById('scraperApiKey')?.value.trim() || Storage.getKey('scraperapi');
    
    if (!scraperApiKey) {
      this.showScraperSetup();
      return;
    }
    
    // Save key
    Storage.setKey('scraperapi', scraperApiKey);
    
    const btn = document.getElementById('analyzeCompBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span>Searching...';
    }
    
    try {
      const response = await API.post('/automation/free/competitor/full', {
        domain,
        method: 'transparency',
        scraperApiKey,
        country: 'us'
      });
      
      if (!response.success && response.error === 'NO_API_KEY') {
        this.showScraperSetup();
        return;
      }
      
      // Store and render
      AppState.competitorData = {
        domain: response.domain,
        method: 'transparency',
        advertiser: response.advertiser,
        summary: response.summary || {},
        ads: response.ads || [],
        manualUrl: response.manualUrl
      };
      
      this.renderTransparencyResults(response);
      
      document.getElementById('competitorResults')?.classList.remove('hidden');
      document.getElementById('competitorEmpty')?.classList.add('hidden');
      
      const credits = response.creditsUsed ? ` (${response.creditsUsed} credits)` : '';
      if (response.ads?.length > 0) {
        showAlert(`Found ${response.ads.length} ads from Transparency Center${credits}`, 'success');
      } else {
        showAlert(`No ads found. Try checking manually.${credits}`, 'warning');
      }
      
    } catch (error) {
      showAlert('Error: ' + error.message, 'error');
    }
    
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined">search</span>Search Transparency Center';
    }
  },
  
  // Render SEMrush results
  renderSemrushResults(data) {
    const container = document.getElementById('compTabContent');
    if (!container) return;
    
    const summary = data.summary || {};
    const ads = data.ads || [];
    
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Paid Keywords</p>
          <p class="text-2xl font-bold" style="color:#1a73e8">${summary.paidKeywords || '0'}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Paid Traffic</p>
          <p class="text-2xl font-bold" style="color:#34a853">${summary.paidTraffic || '0'}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Ads Budget</p>
          <p class="text-2xl font-bold" style="color:#ea4335">$${summary.adsBudget || '0'}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Organic Keywords</p>
          <p class="text-2xl font-bold" style="color:#5f6368">${summary.organicKeywords || '0'}</p>
        </div>
      </div>
      
      <!-- Source badge -->
      <div class="mb-4 p-3 rounded-lg" style="background:#fef7e0;border:1px solid #fbbc04">
        <p class="text-sm" style="color:#b06000">
          <span class="material-icons-outlined text-lg align-middle">analytics</span>
          Data from <strong>SEMrush API</strong>
        </p>
      </div>
      
      <!-- Ad Keywords Table -->
      ${ads.length > 0 ? `
        <h4 class="font-medium mb-3">Top Ad Keywords</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead style="background:#f8f9fa">
              <tr class="text-xs uppercase" style="color:#5f6368">
                <th class="p-3 text-left">Keyword</th>
                <th class="p-3 text-right">Position</th>
                <th class="p-3 text-right">Volume</th>
                <th class="p-3 text-right">CPC</th>
                <th class="p-3 text-right">Traffic</th>
              </tr>
            </thead>
            <tbody>
              ${ads.map(ad => `
                <tr class="border-b" style="border-color:#e8eaed">
                  <td class="p-3 font-medium">${esc(ad.keyword)}</td>
                  <td class="p-3 text-right">${ad.position || '-'}</td>
                  <td class="p-3 text-right">${ad.searchVolume || '-'}</td>
                  <td class="p-3 text-right">$${ad.cpc || '-'}</td>
                  <td class="p-3 text-right">${ad.traffic || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="p-6 text-center" style="color:#5f6368">
          <span class="material-icons-outlined text-4xl mb-2">search_off</span>
          <p>No ad keywords found for this domain</p>
        </div>
      `}
    `;
  },
  
  // Render Transparency Center results
  renderTransparencyResults(data) {
    const container = document.getElementById('compTabContent');
    if (!container) return;
    
    const summary = data.summary || {};
    const ads = data.ads || [];
    const advertiser = data.advertiser;
    
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Total Ads</p>
          <p class="text-2xl font-bold" style="color:#1a73e8">${summary.totalAds || 0}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Text Ads</p>
          <p class="text-2xl font-bold" style="color:#4285f4">${summary.textAds || 0}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Image/Display</p>
          <p class="text-2xl font-bold" style="color:#fbbc04">${summary.imageAds || 0}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs" style="color:#5f6368">Video Ads</p>
          <p class="text-2xl font-bold" style="color:#ea4335">${summary.videoAds || 0}</p>
        </div>
      </div>
      
      <!-- Source badge -->
      <div class="mb-4 p-3 rounded-lg" style="background:#e8f0fe;border:1px solid #1a73e8">
        <p class="text-sm" style="color:#1a73e8">
          <span class="material-icons-outlined text-lg align-middle">verified</span>
          Data from <strong>Google Ads Transparency Center</strong>
          ${advertiser ? ` • Advertiser ID: ${advertiser.id}` : ''}
        </p>
      </div>
      
      <!-- Ads Grid -->
      ${ads.length > 0 ? `
        <h4 class="font-medium mb-3">Ad Creatives</h4>
        <div class="grid grid-cols-3 gap-4">
          ${ads.slice(0, 15).map((ad, i) => `
            <div class="card p-4">
              <div class="flex justify-between mb-2">
                <span class="badge badge-${ad.format === 'video' ? 'red' : ad.format === 'image' ? 'yellow' : 'blue'}">
                  ${ad.format || 'text'}
                </span>
                <span class="text-xs" style="color:#5f6368">#${ad.position}</span>
              </div>
              ${ad.imageUrl ? `
                <img src="${ad.imageUrl}" alt="Ad ${i+1}" class="w-full h-24 object-cover rounded mb-2" onerror="this.style.display='none'">
              ` : `
                <div class="w-full h-24 rounded mb-2 flex items-center justify-center" style="background:#f8f9fa">
                  <span class="material-icons-outlined text-3xl" style="color:#dadce0">
                    ${ad.format === 'video' ? 'videocam' : ad.format === 'image' ? 'image' : 'article'}
                  </span>
                </div>
              `}
              <a href="${ad.previewUrl}" target="_blank" class="text-xs hover:underline" style="color:#1a73e8">
                View Full Ad →
              </a>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="p-6 text-center rounded-lg" style="background:#f8f9fa">
          <span class="material-icons-outlined text-4xl mb-2" style="color:#5f6368">search_off</span>
          <p class="font-medium mb-2">No ads found in Transparency Center</p>
          <p class="text-sm mb-4" style="color:#5f6368">The company may not be running Google Ads, or try checking manually.</p>
          <a href="${data.manualUrl || `https://adstransparency.google.com/?domain=${data.domain}`}" target="_blank" 
             class="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            <span class="material-icons-outlined">open_in_new</span>
            Check Manually
          </a>
        </div>
      `}
      
      <!-- Manual Link -->
      ${ads.length > 0 ? `
        <div class="mt-6 p-3 rounded-lg text-center" style="background:#f8f9fa">
          <a href="${advertiser?.transparencyUrl || data.manualUrl}" target="_blank" class="text-sm hover:underline" style="color:#1a73e8">
            <span class="material-icons-outlined text-sm align-middle">open_in_new</span>
            View all ads on Google Ads Transparency Center
          </a>
        </div>
      ` : ''}
    `;
  },
  
  // Show SEMrush setup
  showSemrushSetup() {
    Modal.show(`
      <div class="p-6 max-w-lg">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#ff642d">analytics</span>
          <h2 class="text-xl font-medium">Setup SEMrush API</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">
          SEMrush provides detailed competitor ad data including keywords, traffic, and spend estimates.
        </p>
        
        <div class="p-4 rounded-lg mb-4" style="background:#fff3e0;border:1px solid #ff9800">
          <p class="font-medium" style="color:#e65100">
            <span class="material-icons-outlined align-middle">info</span>
            SEMrush API requires a paid subscription
          </p>
          <p class="text-sm mt-1" style="color:#bf360c">Plans start at $129.95/month</p>
        </div>
        
        <div class="space-y-3 mb-6">
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#ff642d;color:white">1</span>
            <a href="https://www.semrush.com/api-analytics/" target="_blank" class="font-medium hover:underline" style="color:#ff642d">
              Get API access at SEMrush →
            </a>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#ff642d;color:white">2</span>
            <p class="font-medium">Copy your API key</p>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#ff642d;color:white">3</span>
            <p class="font-medium">Paste below</p>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">SEMrush API Key</label>
          <input type="text" id="semrushKeyInput" placeholder="Paste your API key..." 
                 class="w-full p-3 border rounded-lg" style="border-color:#dadce0">
        </div>
        
        <div class="flex gap-3">
          <button onclick="Competitor.saveSemrushKey()" class="px-6 py-2 rounded-lg text-white flex-1" style="background:#ff642d">
            Save & Analyze
          </button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">Cancel</button>
        </div>
      </div>
    `);
    
    document.getElementById('analyzeCompBtn').disabled = false;
    document.getElementById('analyzeCompBtn').innerHTML = '<span class="material-icons-outlined">analytics</span>Analyze with SEMrush';
  },
  
  // Show ScraperAPI setup
  showScraperSetup() {
    Modal.show(`
      <div class="p-6 max-w-lg">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons-outlined text-3xl" style="color:#1a73e8">key</span>
          <h2 class="text-xl font-medium">Setup ScraperAPI (FREE!)</h2>
        </div>
        
        <p class="mb-4" style="color:#5f6368">
          ScraperAPI lets us access Google Ads Transparency Center to see competitor ad creatives.
        </p>
        
        <div class="p-4 rounded-lg mb-4" style="background:#e8f5e9;border:1px solid #4caf50">
          <p class="font-medium" style="color:#2e7d32">
            <span class="material-icons-outlined align-middle">celebration</span>
            FREE: 1,000 credits/month!
          </p>
          <p class="text-sm mt-1" style="color:#1b5e20">No credit card required</p>
        </div>
        
        <div class="space-y-3 mb-6">
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">1</span>
            <a href="https://www.scraperapi.com/signup" target="_blank" class="font-medium hover:underline" style="color:#1a73e8">
              Sign up at ScraperAPI.com →
            </a>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">2</span>
            <p class="font-medium">Copy your API key from dashboard</p>
          </div>
          <div class="flex gap-3">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background:#1a73e8;color:white">3</span>
            <p class="font-medium">Paste below</p>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">ScraperAPI Key</label>
          <input type="text" id="scraperKeyInput" placeholder="Paste your API key..." 
                 class="w-full p-3 border rounded-lg" style="border-color:#dadce0">
        </div>
        
        <div class="flex gap-3">
          <button onclick="Competitor.saveScraperKey()" class="btn-primary px-6 py-2 flex-1">Save & Analyze</button>
          <button onclick="Modal.hide()" class="px-4 py-2 border rounded-lg" style="border-color:#dadce0">Cancel</button>
        </div>
      </div>
    `);
    
    document.getElementById('analyzeCompBtn').disabled = false;
    document.getElementById('analyzeCompBtn').innerHTML = '<span class="material-icons-outlined">search</span>Search Transparency Center';
  },
  
  // Save SEMrush key
  saveSemrushKey() {
    const key = document.getElementById('semrushKeyInput')?.value.trim();
    if (!key) {
      showAlert('Please enter an API key', 'error');
      return;
    }
    Storage.setKey('semrush', key);
    Modal.hide();
    showAlert('SEMrush API key saved!', 'success');
    setTimeout(() => this.analyze(), 500);
  },
  
  // Save ScraperAPI key
  saveScraperKey() {
    const key = document.getElementById('scraperKeyInput')?.value.trim();
    if (!key) {
      showAlert('Please enter an API key', 'error');
      return;
    }
    Storage.setKey('scraperapi', key);
    Modal.hide();
    showAlert('ScraperAPI key saved!', 'success');
    setTimeout(() => this.analyze(), 500);
  },
  
  // Analyze ad (for AI tips)
  analyzeAd(index) {
    const data = AppState.competitorData;
    const ad = data?.ads?.[index];
    
    if (!ad) return;
    
    showPage('ai-assistant');
    setTimeout(() => {
      if (typeof AIChat !== 'undefined') {
        const prompt = ad.keyword 
          ? `Analyze this competitor's ad strategy for keyword "${ad.keyword}". They're ranking position ${ad.position || 'unknown'} with CPC $${ad.cpc || 'unknown'}. Help me create better ads to outrank them.`
          : `Help me create better Google Ads than this competitor. Their ad format is "${ad.format || 'text'}". Give me 5 headline ideas and 3 description ideas.`;
        
        AIChat.quickPrompt(prompt);
      }
    }, 100);
  },
  
  // Render results wrapper
  renderResults() {
    // Results are rendered by the specific method functions
  }
};

// Global functions
function analyzeCompetitor() { Competitor.analyze(); }
function switchCompMethod(method) { Competitor.switchMethod(method); }

window.Competitor = Competitor;
