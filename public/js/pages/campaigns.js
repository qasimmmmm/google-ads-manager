/* ═══════════════════════════════════════════════════════════════════
   Campaigns Module
   ═══════════════════════════════════════════════════════════════════ */

const Campaigns = {
  // Load campaigns
  async load() {
    try {
      const data = await API.get('/api/campaigns');
      AppState.set('campaigns', data.campaigns || []);
    } catch (error) {
      console.log('Using demo campaigns');
      AppState.set('campaigns', []);
    }
    this.render();
  },
  
  // Render campaigns table
  render() {
    const tbody = document.getElementById('campaignsTableBody');
    const countEl = document.getElementById('campaignCount');
    const campaigns = AppState.campaigns;
    
    if (countEl) {
      countEl.textContent = campaigns.length + ' campaigns';
    }
    
    if (!tbody) return;
    
    if (!campaigns.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" class="p-8 text-center" style="color:#5f6368">
            No campaigns found. Connect Google Ads to see your campaigns.
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = campaigns.map(c => `
      <tr class="table-row">
        <td class="p-4">
          <input type="checkbox" class="rounded campaign-check" data-id="${c.id}">
        </td>
        <td class="p-4">
          <div class="font-medium text-sm">${esc(c.name)}</div>
          <div class="text-xs" style="color:#5f6368">${c.id}</div>
        </td>
        <td class="p-4">
          <span class="inline-flex items-center gap-1">
            <span class="status-dot ${c.status === 'ENABLED' ? 'status-active' : 'status-paused'}"></span>
            <span class="text-sm">${c.status === 'ENABLED' ? 'Active' : 'Paused'}</span>
          </span>
        </td>
        <td class="p-4"><span class="badge badge-grey">${c.type || 'Search'}</span></td>
        <td class="p-4 text-right text-sm">${formatCurrency(c.budget || 0, 0)}/day</td>
        <td class="p-4 text-right text-sm">${fmt(c.impressions || 0)}</td>
        <td class="p-4 text-right text-sm">${fmt(c.clicks || 0)}</td>
        <td class="p-4 text-right text-sm">${formatPercent(c.ctr || 0)}</td>
        <td class="p-4 text-right text-sm">${formatCurrency(c.avgCpc || 0)}</td>
        <td class="p-4 text-right text-sm">${fmt(c.conversions || 0)}</td>
        <td class="p-4 text-right text-sm">${formatCurrency(c.cost || 0, 0)}</td>
        <td class="p-4 text-right text-sm">${c.clicks ? formatPercent((c.conversions / c.clicks) * 100) : '0%'}</td>
        <td class="p-4 text-right text-sm">${c.conversions ? formatCurrency(c.cost / c.conversions) : '$0'}</td>
        <td class="p-4 text-center">
          <button onclick="Campaigns.analyze('${c.id}')" class="p-1.5 rounded hover:bg-gray-100" style="color:#5f6368" title="AI Analysis">
            <span class="material-icons-outlined text-lg">auto_awesome</span>
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  // Filter campaigns
  filter() {
    const search = document.getElementById('campaignSearch')?.value.toLowerCase() || '';
    const status = document.getElementById('campaignStatusFilter')?.value || 'all';
    const type = document.getElementById('campaignTypeFilter')?.value || 'all';
    
    // Implementation for filtering
    this.render();
  },
  
  // Analyze campaign with AI
  analyze(id) {
    showPage('ai-assistant');
    setTimeout(() => {
      AIChat.quickPrompt(`Analyze campaign ${id} and suggest improvements to increase conversions.`);
    }, 100);
  },
  
  // Bulk action
  bulkAction(action) {
    const selected = document.querySelectorAll('.campaign-check:checked');
    if (!selected.length) {
      showAlert('Select campaigns first', 'warning');
      return;
    }
    showAlert(`Bulk action: ${action} on ${selected.length} campaigns`, 'info');
  },
  
  // Toggle all checkboxes
  toggleAll(checkbox) {
    const checkboxes = document.querySelectorAll('.campaign-check');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
  },
  
  // Create new campaign
  create() {
    showPage('ai-assistant');
    setTimeout(() => {
      AIChat.quickPrompt('Help me create a new Google Ads search campaign. Ask me about my business goals and target audience.');
    }, 100);
  }
};

// Register page handler
Router.register('campaigns', () => Campaigns.load());

// Global functions
function filterCampaigns() { Campaigns.filter(); }
function toggleAllCampaigns(el) { Campaigns.toggleAll(el); }
function bulkAction(action) { Campaigns.bulkAction(action); }
function createCampaign() { Campaigns.create(); }
function analyzeCampaign(id) { Campaigns.analyze(id); }

// Make available globally
window.Campaigns = Campaigns;
window.filterCampaigns = filterCampaigns;
window.toggleAllCampaigns = toggleAllCampaigns;
window.bulkAction = bulkAction;
window.createCampaign = createCampaign;
window.analyzeCampaign = analyzeCampaign;
