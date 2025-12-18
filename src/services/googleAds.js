const { GoogleAdsApi } = require('google-ads-api');

class GoogleAdsService {
  constructor(accessToken) {
    this.client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    });
    
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    this.managerId = process.env.GOOGLE_ADS_MANAGER_ID;
    this.accessToken = accessToken;
  }
  
  getCustomer() {
    return this.client.Customer({
      customer_id: this.customerId,
      login_customer_id: this.managerId || this.customerId,
      refresh_token: this.accessToken // We use access token here
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT OVERVIEW
  // ═══════════════════════════════════════════════════════════
  async getAccountSummary(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        segments.date
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY segments.date DESC
    `;
    
    const results = await customer.query(query);
    return this.processAccountMetrics(results);
  }
  
  processAccountMetrics(results) {
    let totals = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      revenue: 0,
      daily: []
    };
    
    results.forEach(row => {
      const dayData = {
        date: row.segments.date,
        impressions: Number(row.metrics.impressions) || 0,
        clicks: Number(row.metrics.clicks) || 0,
        conversions: Number(row.metrics.conversions) || 0,
        cost: (Number(row.metrics.cost_micros) || 0) / 1000000,
        revenue: Number(row.metrics.conversions_value) || 0
      };
      
      totals.impressions += dayData.impressions;
      totals.clicks += dayData.clicks;
      totals.conversions += dayData.conversions;
      totals.cost += dayData.cost;
      totals.revenue += dayData.revenue;
      totals.daily.push(dayData);
    });
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
    totals.cpc = totals.clicks > 0 ? (totals.cost / totals.clicks) : 0;
    totals.cpa = totals.conversions > 0 ? (totals.cost / totals.conversions) : 0;
    totals.roas = totals.cost > 0 ? (totals.revenue / totals.cost) : 0;
    
    return totals;
  }

  // ═══════════════════════════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════════════════════════
  async getCampaigns(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      type: this.formatChannelType(row.campaign.advertising_channel_type),
      bidStrategy: this.formatBidStrategy(row.campaign.bidding_strategy_type),
      budget: (Number(row.campaign_budget?.amount_micros) || 0) / 1000000,
      impressions: Number(row.metrics.impressions) || 0,
      clicks: Number(row.metrics.clicks) || 0,
      ctr: Number(row.metrics.ctr) || 0,
      conversions: Number(row.metrics.conversions) || 0,
      revenue: Number(row.metrics.conversions_value) || 0,
      cost: (Number(row.metrics.cost_micros) || 0) / 1000000,
      cpc: (Number(row.metrics.average_cpc) || 0) / 1000000,
      cpa: (Number(row.metrics.cost_per_conversion) || 0) / 1000000,
      impressionShare: Number(row.metrics.search_impression_share) || 0,
      lostISBudget: Number(row.metrics.search_budget_lost_impression_share) || 0,
      lostISRank: Number(row.metrics.search_rank_lost_impression_share) || 0
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // KEYWORDS
  // ═══════════════════════════════════════════════════════════
  async getKeywords(startDate, endDate, campaignId = null) {
    const customer = this.getCustomer();
    
    let whereClause = `segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group_criterion.type = 'KEYWORD'`;
    
    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`;
    }
    
    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        ad_group_criterion.quality_info.creative_quality_score,
        ad_group_criterion.quality_info.post_click_quality_score,
        ad_group_criterion.quality_info.search_predicted_ctr,
        ad_group_criterion.effective_cpc_bid_micros,
        campaign.name,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros,
        metrics.average_cpc,
        metrics.cost_per_conversion
      FROM keyword_view
      WHERE ${whereClause}
      ORDER BY metrics.cost_micros DESC
      LIMIT 500
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.ad_group_criterion.criterion_id,
      keyword: row.ad_group_criterion.keyword?.text || '',
      matchType: this.formatMatchType(row.ad_group_criterion.keyword?.match_type),
      status: row.ad_group_criterion.status,
      qualityScore: row.ad_group_criterion.quality_info?.quality_score || null,
      expectedCtr: row.ad_group_criterion.quality_info?.search_predicted_ctr || 'N/A',
      adRelevance: row.ad_group_criterion.quality_info?.creative_quality_score || 'N/A',
      landingPageExp: row.ad_group_criterion.quality_info?.post_click_quality_score || 'N/A',
      bid: (Number(row.ad_group_criterion.effective_cpc_bid_micros) || 0) / 1000000,
      campaign: row.campaign.name,
      adGroup: row.ad_group.name,
      impressions: Number(row.metrics.impressions) || 0,
      clicks: Number(row.metrics.clicks) || 0,
      ctr: Number(row.metrics.ctr) || 0,
      conversions: Number(row.metrics.conversions) || 0,
      cost: (Number(row.metrics.cost_micros) || 0) / 1000000,
      cpc: (Number(row.metrics.average_cpc) || 0) / 1000000,
      cpa: (Number(row.metrics.cost_per_conversion) || 0) / 1000000
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // ADS
  // ═══════════════════════════════════════════════════════════
  async getAds(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.ad_strength,
        campaign.name,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 200
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.ad_group_ad.ad.id,
      type: this.formatAdType(row.ad_group_ad.ad.type),
      headlines: row.ad_group_ad.ad.responsive_search_ad?.headlines?.map(h => h.text) || [],
      descriptions: row.ad_group_ad.ad.responsive_search_ad?.descriptions?.map(d => d.text) || [],
      finalUrl: row.ad_group_ad.ad.final_urls?.[0] || '',
      status: row.ad_group_ad.status,
      approvalStatus: row.ad_group_ad.policy_summary?.approval_status || 'UNKNOWN',
      adStrength: row.ad_group_ad.ad_strength || 'UNSPECIFIED',
      campaign: row.campaign.name,
      adGroup: row.ad_group.name,
      impressions: Number(row.metrics.impressions) || 0,
      clicks: Number(row.metrics.clicks) || 0,
      ctr: Number(row.metrics.ctr) || 0,
      conversions: Number(row.metrics.conversions) || 0,
      cost: (Number(row.metrics.cost_micros) || 0) / 1000000
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // GEOGRAPHIC PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  async getLocationPerformance(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        geographic_view.country_criterion_id,
        geographic_view.location_type,
        campaign_criterion.location.geo_target_constant,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      locationId: row.geographic_view.country_criterion_id,
      locationType: row.geographic_view.location_type,
      impressions: Number(row.metrics.impressions) || 0,
      clicks: Number(row.metrics.clicks) || 0,
      conversions: Number(row.metrics.conversions) || 0,
      cost: (Number(row.metrics.cost_micros) || 0) / 1000000
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // DEVICE PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  async getDevicePerformance(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        segments.device,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    
    const results = await customer.query(query);
    
    // Aggregate by device
    const deviceData = {};
    results.forEach(row => {
      const device = row.segments.device;
      if (!deviceData[device]) {
        deviceData[device] = { impressions: 0, clicks: 0, conversions: 0, cost: 0 };
      }
      deviceData[device].impressions += Number(row.metrics.impressions) || 0;
      deviceData[device].clicks += Number(row.metrics.clicks) || 0;
      deviceData[device].conversions += Number(row.metrics.conversions) || 0;
      deviceData[device].cost += (Number(row.metrics.cost_micros) || 0) / 1000000;
    });
    
    return Object.entries(deviceData).map(([device, data]) => ({
      device: this.formatDevice(device),
      ...data
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIENCE PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  async getAudiencePerformance(startDate, endDate) {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        campaign_audience_view.resource_name,
        campaign_criterion.criterion_id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign_audience_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.campaign_criterion?.criterion_id,
      impressions: Number(row.metrics.impressions) || 0,
      clicks: Number(row.metrics.clicks) || 0,
      conversions: Number(row.metrics.conversions) || 0,
      cost: (Number(row.metrics.cost_micros) || 0) / 1000000
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // CONVERSION ACTIONS
  // ═══════════════════════════════════════════════════════════
  async getConversionActions() {
    const customer = this.getCustomer();
    
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.status,
        conversion_action.type,
        conversion_action.value_settings.default_value
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
    `;
    
    const results = await customer.query(query);
    return results.map(row => ({
      id: row.conversion_action.id,
      name: row.conversion_action.name,
      category: row.conversion_action.category,
      status: row.conversion_action.status,
      type: row.conversion_action.type,
      defaultValue: row.conversion_action.value_settings?.default_value || 0
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════
  formatChannelType(type) {
    const types = {
      'SEARCH': 'Search',
      'DISPLAY': 'Display',
      'SHOPPING': 'Shopping',
      'VIDEO': 'Video',
      'MULTI_CHANNEL': 'Performance Max',
      'LOCAL': 'Local',
      'SMART': 'Smart',
      'PERFORMANCE_MAX': 'Performance Max',
      'DISCOVERY': 'Discovery',
      'TRAVEL': 'Travel'
    };
    return types[type] || type;
  }
  
  formatBidStrategy(strategy) {
    const strategies = {
      'TARGET_CPA': 'Target CPA',
      'TARGET_ROAS': 'Target ROAS',
      'MAXIMIZE_CONVERSIONS': 'Max Conversions',
      'MAXIMIZE_CONVERSION_VALUE': 'Max Conv Value',
      'MAXIMIZE_CLICKS': 'Max Clicks',
      'MANUAL_CPC': 'Manual CPC',
      'ENHANCED_CPC': 'Enhanced CPC',
      'TARGET_IMPRESSION_SHARE': 'Target Imp Share'
    };
    return strategies[strategy] || strategy;
  }
  
  formatMatchType(type) {
    const types = {
      'EXACT': 'Exact',
      'PHRASE': 'Phrase',
      'BROAD': 'Broad'
    };
    return types[type] || type;
  }
  
  formatAdType(type) {
    const types = {
      'RESPONSIVE_SEARCH_AD': 'RSA',
      'EXPANDED_TEXT_AD': 'ETA',
      'RESPONSIVE_DISPLAY_AD': 'RDA',
      'IMAGE_AD': 'Image',
      'VIDEO_AD': 'Video',
      'CALL_AD': 'Call',
      'APP_AD': 'App'
    };
    return types[type] || type;
  }
  
  formatDevice(device) {
    const devices = {
      'MOBILE': 'Mobile',
      'DESKTOP': 'Desktop',
      'TABLET': 'Tablet',
      'CONNECTED_TV': 'Connected TV',
      'OTHER': 'Other'
    };
    return devices[device] || device;
  }
}

module.exports = GoogleAdsService;
