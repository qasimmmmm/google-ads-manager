/* ═══════════════════════════════════════════════════════════════════
   Dashboard Module
   ═══════════════════════════════════════════════════════════════════ */

const Dashboard = {
  // Load all dashboard data
  async load() {
    this.loadMetrics();
    this.loadTopCampaigns();
    this.loadRecommendations();
    this.renderChart();
    this.showAIBriefButton(); // Show button instead of auto-generating
  },
  
  // Load key metrics
  async loadMetrics() {
    try {
      const data = await API.get('/api/dashboard');
      
      this.updateMetric('totalImpressions', fmt(data.impressions || 0));
      this.updateMetric('totalClicks', fmt(data.clicks || 0));
      this.updateMetric('avgCTR', formatPercent(data.ctr || 0));
      this.updateMetric('totalConversions', fmt(data.conversions || 0));
      this.updateMetric('totalCost', formatCurrency(data.cost || 0, 0));
      this.updateMetric('avgROAS', (data.roas || 0).toFixed(1) + 'x');
    } catch (error) {
      console.log('Using demo metrics');
      // Demo data
      this.updateMetric('totalImpressions', '125.4K');
      this.updateMetric('totalClicks', '8.2K');
      this.updateMetric('avgCTR', '6.54%');
      this.updateMetric('totalConversions', '342');
      this.updateMetric('totalCost', '$4,250');
      this.updateMetric('avgROAS', '3.2x');
    }
  },
  
  // Update metric element
  updateMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },
  
  // Load top campaigns
  loadTopCampaigns() {
    const container = document.getElementById('topCampaigns');
    if (!container) return;
    
    container.innerHTML = `
      <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="status-dot status-active"></span>
          <div>
            <p class="text-sm font-medium">Search - Internet Services</p>
            <p class="text-xs" style="color:#5f6368">$2,450 spent</p>
          </div>
        </div>
        <span class="text-xs trend-up">↑12% CTR</span>
      </div>
      <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="status-dot status-active"></span>
          <div>
            <p class="text-sm font-medium">Search - Cable TV</p>
            <p class="text-xs" style="color:#5f6368">$1,890 spent</p>
          </div>
        </div>
        <span class="text-xs trend-up">↑8% CTR</span>
      </div>
      <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
        <div class="flex items-center gap-3">
          <span class="status-dot status-paused"></span>
          <div>
            <p class="text-sm font-medium">Display - Bundles</p>
            <p class="text-xs" style="color:#5f6368">$950 spent</p>
          </div>
        </div>
        <span class="text-xs trend-down">↓2% CTR</span>
      </div>
    `;
  },
  
  // Load AI recommendations
  loadRecommendations() {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-3 rounded-lg" style="background:#e6f4ea;border:1px solid #34a853">
        <p class="text-sm font-medium" style="color:#137333">💰 Increase budget for "internet service"</p>
        <p class="text-xs mt-1" style="color:#5f6368">High conversion rate, limited by budget</p>
      </div>
      <div class="p-3 rounded-lg" style="background:#fef7e0;border:1px solid #fbbc04">
        <p class="text-sm font-medium" style="color:#b06000">⚠️ 3 keywords with low Quality Score</p>
        <p class="text-xs mt-1" style="color:#5f6368">Review and optimize ad relevance</p>
      </div>
    `;
  },
  
  // Render performance chart
  renderChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx || AppState.charts.performance) return;
    
    AppState.charts.performance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Clicks',
          data: [120, 145, 132, 178, 190, 165, 210],
          borderColor: '#1a73e8',
          backgroundColor: 'rgba(26,115,232,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#1a73e8'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#5f6368' } },
          y: { grid: { color: '#e8eaed' }, ticks: { color: '#5f6368' } }
        }
      }
    });
  },
  
  // Show AI Brief button (does NOT auto-start)
  showAIBriefButton() {
    const el = document.getElementById('aiDailyBrief');
    if (!el) return;
    
    const claudeKey = Storage.getKey('claude');
    if (!claudeKey) {
      el.innerHTML = `
        <p class="text-sm mb-2" style="color:#5f6368">Add Claude API key in Settings to enable AI insights.</p>
        <button onclick="showPage('settings')" class="text-sm px-3 py-1.5 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#1a73e8">
          Go to Settings
        </button>
      `;
      return;
    }
    
    // Show button to generate AI brief (not auto)
    el.innerHTML = `
      <p class="text-sm mb-3" style="color:#5f6368">Click to generate AI analysis of your campaigns:</p>
      <button onclick="Dashboard.generateAIBrief()" id="generateAIBriefBtn" 
              class="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
        <span class="material-icons-outlined text-lg">auto_awesome</span>
        Analyze & Give Suggestions
      </button>
    `;
  },
  
  // Generate AI daily brief (called on button click)
  async generateAIBrief() {
    const el = document.getElementById('aiDailyBrief');
    const btn = document.getElementById('generateAIBriefBtn');
    if (!el) return;
    
    const claudeKey = Storage.getKey('claude');
    if (!claudeKey) {
      showAlert('Please add Claude API key in Settings', 'error');
      return;
    }
    
    // Show loading state
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined animate-spin">sync</span> Analyzing...';
    }
    
    try {
      const data = await API.post('/ai/chat', {
        message: `Analyze my Google Ads performance and give me:
1. A brief summary of current performance (2-3 sentences)
2. Top 3 actionable suggestions to improve results
3. Any warnings or issues I should address

Be specific and actionable.`,
        claudeApiKey: claudeKey
      });
      
      // Show result with ability to regenerate
      el.innerHTML = `
        <div class="p-4 rounded-lg" style="background:#e8f0fe;border:1px solid #1a73e8">
          <div class="flex items-start gap-2 mb-2">
            <span class="material-icons-outlined" style="color:#1a73e8">auto_awesome</span>
            <p class="font-medium" style="color:#1a73e8">AI Analysis</p>
          </div>
          <div class="text-sm whitespace-pre-line" style="color:#202124">${data.message || 'Unable to generate analysis.'}</div>
        </div>
        <button onclick="Dashboard.generateAIBrief()" class="mt-3 text-sm px-3 py-1.5 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#5f6368">
          <span class="material-icons-outlined text-sm align-middle">refresh</span> Regenerate
        </button>
      `;
    } catch (error) {
      el.innerHTML = `
        <div class="p-4 rounded-lg" style="background:#fce8e6;border:1px solid #d93025">
          <p class="text-sm" style="color:#c5221f">Unable to generate AI analysis. Check your Claude API key in Settings.</p>
        </div>
        <button onclick="Dashboard.showAIBriefButton()" class="mt-3 text-sm px-3 py-1.5 rounded border hover:bg-gray-50" style="border-color:#dadce0;color:#5f6368">
          Try Again
        </button>
      `;
    }
  }
};

// Refresh data
function refreshData() {
  Dashboard.load();
  showAlert('Data refreshed', 'info');
}

// Handle date range change
function handleDateChange() {
  const dateRange = document.getElementById('dateRange')?.value;
  AppState.set('dateRange', dateRange);
  Dashboard.load();
}

// Register dashboard page handler
Router.register('overview', () => Dashboard.load());

// Make available globally
window.Dashboard = Dashboard;
window.refreshData = refreshData;
window.handleDateChange = handleDateChange;
