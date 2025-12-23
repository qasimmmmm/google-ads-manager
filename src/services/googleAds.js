class GoogleAdsService {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    this.managerId = process.env.GOOGLE_ADS_MANAGER_ID;
    
    // Base URL for Google Ads REST API
    this.baseUrl = 'https://googleads.googleapis.com/v18';
  }

  // Get headers for API requests
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
      ...(this.managerId && { 'login-customer-id': this.managerId })
    };
  }

  // Make API request
  async query(query) {
    const url = `${this.baseUrl}/customers/${this.customerId}/googleAds:searchStream`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', JSON.stringify(error, null, 2));
        throw new Error(error.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the streaming response
      let results = [];
      if (Array.isArray(data)) {
        data.forEach(batch => {
          if (batch.results) {
            results = results.concat(batch.results);
          }
        });
      }
      
      return results;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACCOUNT OVERVIEW
  // ═══════════════════════════════════════════════════════════
  async getAccountSummary(startDate, endDate) {
    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value,
        segments.date
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY segments.date DESC
    `;
    
    try {
      const results = await this.query(query);
      return this.processAccountMetrics(results);
    } catch (error) {
      console.error('Account summary error:', error);
      return this.getEmptyMetrics();
    }
  }
  
  getEmptyMetrics() {
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      revenue: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0,
      daily: []
    };
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
      const metrics = row.metrics || {};
      const segments = row.segments || {};
      
      const dayData = {
        date: segments.date,
        impressions: Number(metrics.impressions) || 0,
        clicks: Number(metrics.clicks) || 0,
        conversions: Number(metrics.conversions) || 0,
        cost: (Number(metrics.costMicros) || 0) / 1000000,
        revenue: Number(metrics.conversionsValue) || 0
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
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;
    
    try {
      const results = await this.query(query);
      return results.map(row => {
        const campaign = row.campaign || {};
        const metrics = row.metrics || {};
        const budget = row.campaignBudget || {};
        
        return {
          id: campaign.id,
          name: campaign.name || 'Unknown',
          status: campaign.status || 'UNKNOWN',
          type: this.formatChannelType(campaign.advertisingChannelType),
          bidStrategy: this.formatBidStrategy(campaign.biddingStrategyType),
          budget: (Number(budget.amountMicros) || 0) / 1000000,
          impressions: Number(metrics.impressions) || 0,
          clicks: Number(metrics.clicks) || 0,
          ctr: Number(metrics.ctr) || 0,
          conversions: Number(metrics.conversions) || 0,
          revenue: Number(metrics.conversionsValue) || 0,
          cost: (Number(metrics.costMicros) || 0) / 1000000,
          cpc: (Number(metrics.averageCpc) || 0) / 1000000,
          cpa: (Number(metrics.costPerConversion) || 0) / 1000000
        };
      });
    } catch (error) {
      console.error('Campaigns error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // KEYWORDS
  // ═══════════════════════════════════════════════════════════
  async getKeywords(startDate, endDate, campaignId = null) {
    const normalizedCampaignId = campaignId ? String(campaignId).trim() : null;

    if (normalizedCampaignId && !/^\d+$/.test(normalizedCampaignId)) {
      throw new Error('Invalid campaignId. Must be a numeric ID.');
    }

    const campaignFilter = normalizedCampaignId ? `\n        AND campaign.id = ${normalizedCampaignId}` : '';

    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
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
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND ad_group_criterion.status != 'REMOVED'${campaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;
    
    try {
      const results = await this.query(query);
      return results.map(row => {
        const criterion = row.adGroupCriterion || {};
        const keyword = criterion.keyword || {};
        const qualityInfo = criterion.qualityInfo || {};
        const metrics = row.metrics || {};
        
        return {
          id: criterion.criterionId,
          keyword: keyword.text || '',
          matchType: this.formatMatchType(keyword.matchType),
          status: criterion.status,
          qualityScore: qualityInfo.qualityScore || null,
          campaign: row.campaign?.name || '',
          adGroup: row.adGroup?.name || '',
          impressions: Number(metrics.impressions) || 0,
          clicks: Number(metrics.clicks) || 0,
          ctr: Number(metrics.ctr) || 0,
          conversions: Number(metrics.conversions) || 0,
          cost: (Number(metrics.costMicros) || 0) / 1000000,
          cpc: (Number(metrics.averageCpc) || 0) / 1000000,
          cpa: (Number(metrics.costPerConversion) || 0) / 1000000
        };
      });
    } catch (error) {
      console.error('Keywords error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ADS
  // ═══════════════════════════════════════════════════════════
  async getAds(startDate, endDate) {
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
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
      LIMIT 50
    `;
    
    try {
      const results = await this.query(query);
      return results.map(row => {
        const adGroupAd = row.adGroupAd || {};
        const ad = adGroupAd.ad || {};
        const rsa = ad.responsiveSearchAd || {};
        const metrics = row.metrics || {};
        
        return {
          id: ad.id,
          type: this.formatAdType(ad.type),
          headlines: (rsa.headlines || []).map(h => h.text).filter(Boolean),
          descriptions: (rsa.descriptions || []).map(d => d.text).filter(Boolean),
          finalUrl: (ad.finalUrls || [])[0] || '',
          status: adGroupAd.status,
          adStrength: adGroupAd.adStrength || 'UNSPECIFIED',
          campaign: row.campaign?.name || '',
          adGroup: row.adGroup?.name || '',
          impressions: Number(metrics.impressions) || 0,
          clicks: Number(metrics.clicks) || 0,
          ctr: Number(metrics.ctr) || 0,
          conversions: Number(metrics.conversions) || 0,
          cost: (Number(metrics.costMicros) || 0) / 1000000
        };
      });
    } catch (error) {
      console.error('Ads error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DEVICE PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  async getDevicePerformance(startDate, endDate) {
    const query = `
      SELECT
        segments.device,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
    `;
    
    try {
      const results = await this.query(query);
      
      // Aggregate by device
      const deviceData = {};
      results.forEach(row => {
        const device = row.segments?.device || 'UNKNOWN';
        const metrics = row.metrics || {};
        
        if (!deviceData[device]) {
          deviceData[device] = { impressions: 0, clicks: 0, conversions: 0, cost: 0 };
        }
        deviceData[device].impressions += Number(metrics.impressions) || 0;
        deviceData[device].clicks += Number(metrics.clicks) || 0;
        deviceData[device].conversions += Number(metrics.conversions) || 0;
        deviceData[device].cost += (Number(metrics.costMicros) || 0) / 1000000;
      });
      
      return Object.entries(deviceData).map(([device, data]) => ({
        device: this.formatDevice(device),
        ...data
      }));
    } catch (error) {
      console.error('Device error:', error);
      return [];
    }
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
      'PERFORMANCE_MAX': 'Performance Max',
      'DISCOVERY': 'Discovery',
      'LOCAL': 'Local',
      'SMART': 'Smart',
      'TRAVEL': 'Travel'
    };
    return types[type] || type || 'Unknown';
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
    return strategies[strategy] || strategy || 'Unknown';
  }
  
  formatMatchType(type) {
    const types = {
      'EXACT': 'Exact',
      'PHRASE': 'Phrase',
      'BROAD': 'Broad'
    };
    return types[type] || type || 'Unknown';
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
    return types[type] || type || 'Unknown';
  }
  
  formatDevice(device) {
    const devices = {
      'MOBILE': 'Mobile',
      'DESKTOP': 'Desktop',
      'TABLET': 'Tablet',
      'CONNECTED_TV': 'Connected TV',
      'OTHER': 'Other'
    };
    return devices[device] || device || 'Unknown';
  }
}

module.exports = GoogleAdsService;
