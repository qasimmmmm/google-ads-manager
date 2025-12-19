/* ═══════════════════════════════════════════════════════════════════
   Businesses Management Module
   ═══════════════════════════════════════════════════════════════════ */

const Businesses = {
  // Load businesses from storage
  load() {
    AppState.businesses = Storage.get('businesses') || [];
    this.updateSelector();
  },
  
  // Save businesses to storage
  save() {
    Storage.set('businesses', AppState.businesses);
    this.updateSelector();
  },
  
  // Update business selector in sidebar
  updateSelector() {
    const select = document.getElementById('businessSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Businesses</option>' +
      AppState.businesses.map((b, i) => `<option value="${i}">${esc(b.name)}</option>`).join('');
  },
  
  // Render businesses list
  render() {
    const container = document.getElementById('businessesList');
    if (!container) return;
    
    if (!AppState.businesses.length) {
      container.innerHTML = `
        <div class="card p-8 text-center col-span-full">
          <p style="color:#5f6368" class="mb-4">No businesses added yet</p>
          <button onclick="Businesses.showAdd()" class="btn-primary px-4 py-2 text-sm">
            Add Your First Business
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = AppState.businesses.map((b, i) => `
      <div class="card p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-medium"
               style="background:linear-gradient(135deg, #1a73e8, #34a853)">
            ${b.name.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1">
            <h3 class="font-medium" style="color:#202124">${esc(b.name)}</h3>
            <p class="text-xs" style="color:#5f6368">${b.accounts?.length || 0} accounts connected</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs mb-4">
          <div>
            <p style="color:#5f6368">Industry</p>
            <p class="font-medium">${b.industry || 'Not set'}</p>
          </div>
          <div>
            <p style="color:#5f6368">Monthly Budget</p>
            <p class="font-medium">${formatCurrency(b.monthlyBudget || 0, 0)}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="Businesses.switch('${i}')" class="flex-1 btn-secondary px-3 py-2 text-sm">Switch</button>
          <button onclick="Businesses.edit(${i})" class="btn-secondary px-3 py-2 text-sm">
            <span class="material-icons-outlined text-lg">edit</span>
          </button>
          <button onclick="Businesses.remove(${i})" class="btn-secondary px-3 py-2 text-sm" style="color:#ea4335">
            <span class="material-icons-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  },
  
  // Show add business modal
  showAdd() {
    Modal.show(`
      <div class="p-6">
        <h3 class="text-lg font-medium mb-4" style="color:#202124">Add Business</h3>
        <div class="space-y-4">
          <div>
            <label class="text-sm block mb-1" style="color:#5f6368">Business Name *</label>
            <input type="text" id="bizName" class="w-full px-4 py-2.5 border rounded" style="border-color:#dadce0" placeholder="My Business">
          </div>
          <div>
            <label class="text-sm block mb-1" style="color:#5f6368">Google Ads Account ID</label>
            <input type="text" id="bizAccountId" class="w-full px-4 py-2.5 border rounded" style="border-color:#dadce0" placeholder="123-456-7890">
          </div>
          <div>
            <label class="text-sm block mb-1" style="color:#5f6368">Industry</label>
            <select id="bizIndustry" class="w-full px-4 py-2.5 border rounded" style="border-color:#dadce0">
              <option>Telecommunications</option>
              <option>E-commerce</option>
              <option>SaaS</option>
              <option>Healthcare</option>
              <option>Real Estate</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label class="text-sm block mb-1" style="color:#5f6368">Monthly Budget</label>
            <input type="number" id="bizBudget" class="w-full px-4 py-2.5 border rounded" style="border-color:#dadce0" placeholder="5000">
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button onclick="Modal.hide()" class="flex-1 btn-secondary px-4 py-2.5">Cancel</button>
          <button onclick="Businesses.saveNew()" class="flex-1 btn-primary px-4 py-2.5">Save</button>
        </div>
      </div>
    `);
  },
  
  // Save new business
  saveNew() {
    const name = document.getElementById('bizName')?.value.trim();
    if (!name) {
      showAlert('Please enter a business name', 'error');
      return;
    }
    
    AppState.businesses.push({
      name,
      accounts: [{ id: document.getElementById('bizAccountId')?.value.trim(), name: 'Primary Account' }],
      industry: document.getElementById('bizIndustry')?.value,
      monthlyBudget: parseFloat(document.getElementById('bizBudget')?.value) || 0
    });
    
    this.save();
    Modal.hide();
    this.render();
    showAlert('Business added successfully!', 'success');
  },
  
  // Remove business
  remove(index) {
    if (!confirm('Are you sure you want to remove this business?')) return;
    
    AppState.businesses.splice(index, 1);
    this.save();
    this.render();
    showAlert('Business removed', 'info');
  },
  
  // Switch to business
  switch(id) {
    AppState.currentBusiness = id;
    document.getElementById('businessSelect').value = id;
    
    const name = id === 'all' ? 'All Businesses' : AppState.businesses[id]?.name;
    showAlert('Switched to ' + name, 'info');
  }
};

// Register page handler
Router.register('businesses', () => Businesses.render());

// Global functions
function showAddBusiness() { Businesses.showAdd(); }
function switchBusiness(id) { Businesses.switch(id); }
function switchAccount(id) { AppState.currentAccount = id; }

// Make available globally
window.Businesses = Businesses;
window.showAddBusiness = showAddBusiness;
window.switchBusiness = switchBusiness;
window.switchAccount = switchAccount;
