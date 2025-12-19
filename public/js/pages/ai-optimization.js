/* ═══════════════════════════════════════════════════════════════════
   AI Optimization Module
   ═══════════════════════════════════════════════════════════════════ */

const AIOptimization = {
  recommendations: [],
  
  // Load optimizations
  async load() {
    this.recommendations = this.getRecommendations();
    this.render();
  },
  
  // Get recommendations (demo data - would come from AI analysis)
  getRecommendations() {
    return [
      {
        id: '1',
        type: 'budget',
        priority: 'high',
        title: 'Increase budget for "Internet Services" campaign',
        desc: 'This campaign is limited by budget with 85% impression share lost to budget. Increasing by $20/day could generate 150+ more clicks.',
        impact: '+150 clicks/week',
        impactType: 'positive'
      },
      {
        id: '2',
        type: 'keywords',
        priority: 'high',
        title: 'Pause low-performing keyword: "cheap wifi"',
        desc: 'This keyword has 0 conversions with $245 spend in the last 30 days. Quality Score is 3/10.',
        impact: 'Save $245/month',
        impactType: 'positive'
      },
      {
        id: '3',
        type: 'keywords',
        priority: 'medium',
        title: 'Add negative keyword: "free"',
        desc: 'Your ads are showing for "free internet" searches which have 0.1% conversion rate vs 2.5% account average.',
        impact: 'Save $85/month',
        impactType: 'positive'
      },
      {
        id: '4',
        type: 'ads',
        priority: 'medium',
        title: 'Create new ad variations',
        desc: 'Ad Group "Fiber Internet" has only 2 responsive search ads. Adding more variations can improve CTR by 10-15%.',
        impact: '+15% CTR potential',
        impactType: 'positive'
      },
      {
        id: '5',
        type: 'bidding',
        priority: 'low',
        title: 'Switch to Target CPA bidding',
        desc: 'Your campaigns have enough conversion data (50+ conversions/month) to use automated Target CPA bidding effectively.',
        impact: '+20% conversions',
        impactType: 'positive'
      }
    ];
  },
  
  // Render recommendations
  render(filter = 'all') {
    const container = document.getElementById('optimizationsList');
    if (!container) return;
    
    let filtered = this.recommendations;
    if (filter !== 'all') {
      filtered = this.recommendations.filter(r => r.type === filter);
    }
    
    // Update pending actions count
    const pendingEl = document.getElementById('pendingActions');
    if (pendingEl) pendingEl.textContent = filtered.length;
    
    container.innerHTML = filtered.map(r => `
      <div class="card p-5" style="border-left:4px solid ${this.getPriorityColor(r.priority)}">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="badge badge-${this.getPriorityBadge(r.priority)}">${r.priority.toUpperCase()}</span>
              <span class="badge badge-grey">${r.type}</span>
            </div>
            <h4 class="font-medium mb-1" style="color:#202124">${r.title}</h4>
            <p class="text-sm" style="color:#5f6368">${r.desc}</p>
            <p class="text-sm mt-2 font-medium ${r.impactType === 'positive' ? 'trend-up' : 'trend-down'}">
              Impact: ${r.impact}
            </p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="AIOptimization.dismiss('${r.id}')" class="btn-secondary px-4 py-2 text-sm">Dismiss</button>
            <button onclick="AIOptimization.apply('${r.id}')" class="btn-primary px-4 py-2 text-sm">Apply</button>
          </div>
        </div>
      </div>
    `).join('');
  },
  
  // Get priority color
  getPriorityColor(priority) {
    const colors = { high: '#ea4335', medium: '#fbbc04', low: '#1a73e8' };
    return colors[priority] || colors.low;
  },
  
  // Get priority badge class
  getPriorityBadge(priority) {
    const badges = { high: 'red', medium: 'yellow', low: 'blue' };
    return badges[priority] || 'grey';
  },
  
  // Filter recommendations
  filter(type) {
    // Update active tab
    document.querySelectorAll('[data-opt]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-opt="${type}"]`)?.classList.add('active');
    
    this.render(type);
  },
  
  // Apply recommendation
  apply(id) {
    showAlert('Recommendation applied successfully!', 'success');
    this.recommendations = this.recommendations.filter(r => r.id !== id);
    this.render();
  },
  
  // Dismiss recommendation
  dismiss(id) {
    this.recommendations = this.recommendations.filter(r => r.id !== id);
    this.render();
    showAlert('Recommendation dismissed', 'info');
  },
  
  // Run full AI audit
  async runAudit() {
    const btn = document.getElementById('runAuditBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined text-lg animate-spin">sync</span>Analyzing...';
    
    // Simulate audit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-outlined text-lg">auto_awesome</span>Run Full Audit';
    
    showAlert('AI audit complete! Found 5 optimization opportunities.', 'success');
    this.recommendations = this.getRecommendations();
    this.render();
  }
};

// Register page handler
Router.register('ai-optimize', () => AIOptimization.load());

// Global functions
function filterOptimizations(type) { AIOptimization.filter(type); }
function runAIAudit() { AIOptimization.runAudit(); }

// Make available globally
window.AIOptimization = AIOptimization;
window.filterOptimizations = filterOptimizations;
window.runAIAudit = runAIAudit;
