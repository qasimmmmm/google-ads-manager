/**
 * AI Campaign Manager - Autonomous Google Ads Management System
 * 
 * This service handles:
 * 1. Competitor keyword research (via SEMrush/DataForSEO)
 * 2. Keyword opportunity discovery
 * 3. Automatic campaign creation
 * 4. Ad copy generation
 * 5. Bid optimization
 * 6. Performance monitoring & suggestions
 */

const Anthropic = require('@anthropic-ai/sdk');

class AICampaignManager {
  constructor(config) {
    this.claudeApiKey = config.claudeApiKey;
    this.googleAdsService = config.googleAdsService;
    this.researchApiKey = config.researchApiKey; // SEMrush API key or DataForSEO login:password
    this.researchProvider = config.researchProvider || 'semrush';
    
    if (this.claudeApiKey) {
      this.claude = new Anthropic({ apiKey: this.claudeApiKey });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SEMRUSH API INTEGRATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Get competitor's PAID keywords from SEMrush
   * API Endpoint: domain_adwords
   */
  async getCompetitorKeywordsSEMrush(domain) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    // Clean domain (remove http/https/www)
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    const url = `https://api.semrush.com/?type=domain_adwords&key=${this.researchApiKey}&display_limit=100&domain=${cleanDomain}&database=us&export_columns=Ph,Po,Nq,Cp,Co,Tr,Tc,Ur`;
    
    console.log('SEMrush API call: Competitor Paid Keywords for', cleanDomain);
    
    const response = await fetch(url);
    const text = await response.text();
    
    // Check for errors
    if (text.includes('ERROR')) {
      throw new Error(`SEMrush API Error: ${text}`);
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    // Parse CSV response
    // Ph = Keyword, Po = Position, Nq = Search Volume, Cp = CPC, Co = Competition, Tr = Traffic, Tc = Traffic Cost, Ur = URL
    return lines.slice(1).map(line => {
      const [keyword, position, volume, cpc, competition, traffic, trafficCost, url] = line.split(';');
      return {
        keyword: keyword || '',
        position: parseInt(position) || 0,
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        traffic: parseInt(traffic) || 0,
        trafficCost: parseFloat(trafficCost) || 0,
        url: url || '',
        source: 'semrush'
      };
    }).filter(k => k.keyword);
  }

  /**
   * Get competitor's ORGANIC keywords from SEMrush
   * API Endpoint: domain_organic
   */
  async getCompetitorOrganicKeywords(domain) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const url = `https://api.semrush.com/?type=domain_organic&key=${this.researchApiKey}&display_limit=100&domain=${cleanDomain}&database=us&export_columns=Ph,Po,Nq,Cp,Co,Tr,Tc&display_sort=tr_desc`;
    
    console.log('SEMrush API call: Competitor Organic Keywords for', cleanDomain);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      throw new Error(`SEMrush API Error: ${text}`);
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    return lines.slice(1).map(line => {
      const [keyword, position, volume, cpc, competition, traffic, trafficCost] = line.split(';');
      return {
        keyword: keyword || '',
        position: parseInt(position) || 0,
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        traffic: parseInt(traffic) || 0,
        trafficCost: parseFloat(trafficCost) || 0,
        type: 'organic',
        source: 'semrush'
      };
    }).filter(k => k.keyword);
  }

  /**
   * Get competitor's Ad copies from SEMrush
   * API Endpoint: domain_adwords_unique
   */
  async getCompetitorAdsSEMrush(domain) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const url = `https://api.semrush.com/?type=domain_adwords_unique&key=${this.researchApiKey}&display_limit=50&domain=${cleanDomain}&database=us&export_columns=Ph,Ti,Ds,Vu,Ur,Nq`;
    
    console.log('SEMrush API call: Competitor Ads for', cleanDomain);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      console.log('SEMrush Ad copies error:', text);
      return [];
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    // Ph = Keyword, Ti = Title, Ds = Description, Vu = Visible URL, Ur = Target URL, Nq = Volume
    return lines.slice(1).map(line => {
      const parts = line.split(';');
      return {
        keyword: parts[0] || '',
        title: parts[1] || '',
        description: parts[2] || '',
        visibleUrl: parts[3] || '',
        targetUrl: parts[4] || '',
        searchVolume: parseInt(parts[5]) || 0,
        source: 'semrush'
      };
    }).filter(a => a.title);
  }

  /**
   * Get related keywords from SEMrush
   * API Endpoint: phrase_related
   */
  async getRelatedKeywords(seedKeyword, limit = 100) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const url = `https://api.semrush.com/?type=phrase_related&key=${this.researchApiKey}&phrase=${encodeURIComponent(seedKeyword)}&database=us&display_limit=${limit}&export_columns=Ph,Nq,Cp,Co,Nr,Td&display_sort=nq_desc`;
    
    console.log('SEMrush API call: Related Keywords for', seedKeyword);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      throw new Error(`SEMrush API Error: ${text}`);
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    // Ph = Keyword, Nq = Volume, Cp = CPC, Co = Competition, Nr = Results, Td = Trend
    return lines.slice(1).map(line => {
      const [keyword, volume, cpc, competition, results, trend] = line.split(';');
      return {
        keyword: keyword || '',
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        results: parseInt(results) || 0,
        trend: trend || '',
        difficulty: this.calculateDifficulty(parseFloat(competition) || 0),
        intent: this.detectIntent(keyword || ''),
        opportunityScore: this.calculateOpportunityScore({
          search_volume: parseInt(volume) || 0,
          cpc: parseFloat(cpc) || 0,
          competition: parseFloat(competition) || 0
        }),
        source: 'semrush'
      };
    }).filter(k => k.keyword);
  }

  /**
   * Get keyword overview/details from SEMrush
   * API Endpoint: phrase_this
   */
  async getKeywordDetails(keyword) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const url = `https://api.semrush.com/?type=phrase_this&key=${this.researchApiKey}&phrase=${encodeURIComponent(keyword)}&database=us&export_columns=Ph,Nq,Cp,Co,Nr`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      return null;
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return null;

    const [kw, volume, cpc, competition, results] = lines[1].split(';');
    return {
      keyword: kw,
      searchVolume: parseInt(volume) || 0,
      cpc: parseFloat(cpc) || 0,
      competition: parseFloat(competition) || 0,
      results: parseInt(results) || 0
    };
  }

  /**
   * Get keyword ideas (broad match) from SEMrush
   * API Endpoint: phrase_fullsearch
   */
  async getKeywordIdeas(seedKeyword, limit = 100) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const url = `https://api.semrush.com/?type=phrase_fullsearch&key=${this.researchApiKey}&phrase=${encodeURIComponent(seedKeyword)}&database=us&display_limit=${limit}&export_columns=Ph,Nq,Cp,Co,Nr&display_sort=nq_desc`;
    
    console.log('SEMrush API call: Keyword Ideas for', seedKeyword);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      // Fall back to related keywords
      return this.getRelatedKeywords(seedKeyword, limit);
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    return lines.slice(1).map(line => {
      const [keyword, volume, cpc, competition, results] = line.split(';');
      return {
        keyword: keyword || '',
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        results: parseInt(results) || 0,
        difficulty: this.calculateDifficulty(parseFloat(competition) || 0),
        intent: this.detectIntent(keyword || ''),
        opportunityScore: this.calculateOpportunityScore({
          search_volume: parseInt(volume) || 0,
          cpc: parseFloat(cpc) || 0,
          competition: parseFloat(competition) || 0
        }),
        source: 'semrush'
      };
    }).filter(k => k.keyword);
  }

  /**
   * Get advertising competitors from SEMrush
   * API Endpoint: domain_adwords_adwords
   */
  async getAdCompetitors(domain) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const url = `https://api.semrush.com/?type=domain_adwords_adwords&key=${this.researchApiKey}&display_limit=20&domain=${cleanDomain}&database=us&export_columns=Dn,Cr,Np,Ad,At,Ac`;
    
    console.log('SEMrush API call: Ad Competitors for', cleanDomain);
    
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ERROR')) {
      return [];
    }

    const lines = text.trim().split('\n');
    if (lines.length <= 1) return [];

    // Dn = Domain, Cr = Competition Level, Np = Common Keywords, Ad = Ads Keywords, At = Ads Traffic, Ac = Ads Traffic Cost
    return lines.slice(1).map(line => {
      const [domain, competitionLevel, commonKeywords, adsKeywords, adsTraffic, adsTrafficCost] = line.split(';');
      return {
        domain: domain || '',
        competitionLevel: parseFloat(competitionLevel) || 0,
        commonKeywords: parseInt(commonKeywords) || 0,
        adsKeywords: parseInt(adsKeywords) || 0,
        adsTraffic: parseInt(adsTraffic) || 0,
        adsTrafficCost: parseFloat(adsTrafficCost) || 0,
        source: 'semrush'
      };
    }).filter(c => c.domain);
  }

  // ═══════════════════════════════════════════════════════════
  // UNIFIED COMPETITOR RESEARCH (Routes to correct provider)
  // ═══════════════════════════════════════════════════════════

  async getCompetitorKeywords(domain) {
    if (this.researchProvider === 'semrush') {
      return this.getCompetitorKeywordsSEMrush(domain);
    } else if (this.researchProvider === 'dataforseo') {
      return this.getCompetitorKeywordsDataForSEO(domain);
    }
    throw new Error('No research API configured');
  }

  async getCompetitorAds(domain) {
    if (this.researchProvider === 'semrush') {
      return this.getCompetitorAdsSEMrush(domain);
    } else if (this.researchProvider === 'dataforseo') {
      return this.getCompetitorAdsDataForSEO(domain);
    }
    throw new Error('No research API configured');
  }

  async findKeywordOpportunities(seedKeywords, maxCpc = 10) {
    if (this.researchProvider === 'semrush') {
      // For SEMrush, get related keywords for each seed
      const keywords = Array.isArray(seedKeywords) ? seedKeywords : [seedKeywords];
      let allKeywords = [];
      
      for (const seed of keywords.slice(0, 3)) { // Limit to 3 seeds to save API units
        try {
          const related = await this.getRelatedKeywords(seed, 50);
          allKeywords = [...allKeywords, ...related];
        } catch (e) {
          console.log('Error getting related keywords for', seed, e.message);
        }
      }
      
      // Filter by max CPC and dedupe
      const seen = new Set();
      return allKeywords
        .filter(k => {
          if (seen.has(k.keyword.toLowerCase())) return false;
          seen.add(k.keyword.toLowerCase());
          return k.cpc <= maxCpc && k.searchVolume >= 100;
        })
        .sort((a, b) => b.opportunityScore - a.opportunityScore);
    } else if (this.researchProvider === 'dataforseo') {
      return this.findKeywordsDataForSEO(seedKeywords, maxCpc);
    }
    throw new Error('No research API configured');
  }

  // ═══════════════════════════════════════════════════════════
  // DATAFORSEO INTEGRATION (Fallback)
  // ═══════════════════════════════════════════════════════════

  async getCompetitorKeywordsDataForSEO(domain) {
    const [login, password] = (this.researchApiKey || '').split(':');
    if (!login || !password) {
      throw new Error('DataForSEO credentials not configured');
    }

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        target1: domain,
        target2: domain,
        language_code: 'en',
        location_code: 2840,
        limit: 100,
        item_types: ['paid'],
        filters: ['keyword_data.keyword_info.search_volume', '>', 100]
      }])
    });

    const data = await response.json();
    
    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items.map(item => ({
        keyword: item.keyword,
        searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
        cpc: item.keyword_data?.keyword_info?.cpc || 0,
        competition: item.keyword_data?.keyword_info?.competition || 0,
        position: item.target1_position || 0,
        difficulty: item.keyword_data?.keyword_info?.competition_level || 'unknown',
        source: 'dataforseo'
      }));
    }
    return [];
  }

  async getCompetitorAdsDataForSEO(domain) {
    const [login, password] = (this.researchApiKey || '').split(':');
    if (!login || !password) {
      throw new Error('DataForSEO credentials not configured');
    }

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/domain_ads/live', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        target: domain,
        language_code: 'en',
        location_code: 2840,
        limit: 50
      }])
    });

    const data = await response.json();
    
    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items.map(item => ({
        title: item.title,
        description: item.description,
        visibleUrl: item.displayed_link,
        keyword: item.keyword,
        source: 'dataforseo'
      }));
    }
    return [];
  }

  async findKeywordsDataForSEO(seedKeywords, maxCpc) {
    const [login, password] = (this.researchApiKey || '').split(':');
    if (!login || !password) {
      throw new Error('DataForSEO credentials not configured');
    }

    const keywords = Array.isArray(seedKeywords) ? seedKeywords : [seedKeywords];

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keywords: keywords,
        language_code: 'en',
        location_code: 2840,
        limit: 200,
        include_seed_keyword: true,
        filters: [
          ['keyword_info.cpc', '<=', maxCpc],
          'and',
          ['keyword_info.search_volume', '>=', 100]
        ],
        order_by: ['keyword_info.search_volume,desc']
      }])
    });

    const data = await response.json();
    
    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items.map(item => ({
        keyword: item.keyword,
        searchVolume: item.keyword_info?.search_volume || 0,
        cpc: item.keyword_info?.cpc || 0,
        competition: item.keyword_info?.competition || 0,
        difficulty: this.calculateDifficulty(item.keyword_info?.competition || 0),
        intent: this.detectIntent(item.keyword),
        opportunityScore: this.calculateOpportunityScore(item.keyword_info),
        source: 'dataforseo'
      }));
    }
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  calculateDifficulty(competition) {
    if (competition < 0.3) return 'Easy';
    if (competition < 0.6) return 'Medium';
    return 'Hard';
  }

  detectIntent(keyword) {
    const kw = (keyword || '').toLowerCase();
    if (kw.includes('buy') || kw.includes('price') || kw.includes('cost') || kw.includes('cheap') || kw.includes('deal') || kw.includes('order')) {
      return 'Commercial';
    }
    if (kw.includes('best') || kw.includes('top') || kw.includes('review') || kw.includes('vs') || kw.includes('compare')) {
      return 'Commercial Investigation';
    }
    if (kw.includes('how') || kw.includes('what') || kw.includes('why') || kw.includes('guide') || kw.includes('tutorial')) {
      return 'Informational';
    }
    return 'Transactional';
  }

  calculateOpportunityScore(keywordInfo) {
    if (!keywordInfo) return 0;
    const volume = keywordInfo.search_volume || keywordInfo.searchVolume || 0;
    const cpc = keywordInfo.cpc || 0;
    const competition = keywordInfo.competition || 0;
    
    // High volume, low competition, reasonable CPC = high score
    const volumeScore = Math.min(volume / 1000, 10);
    const competitionScore = (1 - competition) * 10;
    const cpcScore = Math.max(10 - cpc, 0);
    
    return Math.round((volumeScore + competitionScore + cpcScore) / 3 * 10);
  }

  // ═══════════════════════════════════════════════════════════
  // AI CAMPAIGN CREATION
  // ═══════════════════════════════════════════════════════════

  async generateCampaignPlan(options) {
    const {
      businessType,
      targetLocation,
      budget,
      competitors,
      keywords,
      competitorAds
    } = options;

    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `You are an expert Google Ads campaign strategist. Based on the following data, create a comprehensive campaign plan.

## Business Information
- Business Type: ${businessType || 'Telecommunications (Internet & Cable TV)'}
- Target Location: ${targetLocation || 'United States'}
- Daily Budget: $${budget || 100}

## Competitor Keywords (Top performing paid keywords)
${keywords?.slice(0, 30).map(k => `- "${k.keyword}" - Volume: ${k.searchVolume}, CPC: $${k.cpc?.toFixed(2)}, Position: #${k.position || 'N/A'}`).join('\n') || 'No competitor data available'}

## Competitor Ad Copies (What they're running)
${competitorAds?.slice(0, 10).map(a => `- Title: "${a.title}"\n  Description: "${a.description}"\n  For keyword: "${a.keyword}"`).join('\n\n') || 'No competitor ads available'}

## Task
Create a detailed campaign structure that will BEAT these competitors with:

1. **Campaign Structure** (3-5 ad groups based on keyword themes)
2. **Keywords for Each Ad Group** (10-15 keywords each with match types)
3. **Ad Copies** (3 responsive search ads per ad group with 15 headlines and 4 descriptions each)
4. **Bidding Strategy Recommendation**
5. **Budget Allocation** across ad groups
6. **Expected Performance Estimates**

Make ad copy BETTER than competitors - more compelling, clearer value proposition, stronger CTAs.

Format the response as a structured JSON object that can be used to create the campaign via API.

Return ONLY valid JSON with this structure:
{
  "campaignName": "string",
  "campaignType": "SEARCH",
  "dailyBudget": number,
  "biddingStrategy": "MAXIMIZE_CONVERSIONS" | "TARGET_CPA" | "MAXIMIZE_CLICKS",
  "targetCpa": number (optional),
  "locations": ["string"],
  "adGroups": [
    {
      "name": "string",
      "keywords": [
        {"text": "string", "matchType": "EXACT" | "PHRASE" | "BROAD"}
      ],
      "ads": [
        {
          "headlines": ["string (max 30 chars)"],
          "descriptions": ["string (max 90 chars)"],
          "finalUrl": "string"
        }
      ]
    }
  ],
  "negativeKeywords": ["string"],
  "expectedMetrics": {
    "estimatedClicks": number,
    "estimatedImpressions": number,
    "estimatedCtr": number,
    "estimatedCpc": number
  },
  "recommendations": ["string"]
}`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error('Failed to parse campaign plan');
      }
    }
    throw new Error('No valid campaign plan generated');
  }

  async generateAdCopy(options) {
    const { keyword, competitorAds, businessName, uniqueSellingPoints } = options;

    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `You are a Google Ads copywriter. Create compelling ad copy that outperforms these competitor ads.

## Target Keyword: "${keyword}"

## Competitor Ads:
${competitorAds?.map(a => `- "${a.title}" | "${a.description}"`).join('\n') || 'No competitor ads'}

## Our Business: ${businessName || 'The Quantum Leap - Internet & TV Services'}
## USPs: ${uniqueSellingPoints || 'Fast speeds, Reliable service, Great prices, No contracts'}

Create a Responsive Search Ad with:
- 15 unique headlines (max 30 characters each)
- 4 descriptions (max 90 characters each)

Headlines should include:
- Brand name variations
- Price/offer mentions
- Speed/feature highlights
- Call-to-action phrases
- Location if relevant

Return ONLY valid JSON:
{
  "headlines": ["string"],
  "descriptions": ["string"],
  "keywordRelevance": number (1-10)
}`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to generate ad copy');
  }

  // Campaign creation placeholder (requires Google Ads API Basic Access)
  async createCampaign(campaignPlan) {
    if (!this.googleAdsService) {
      throw new Error('Google Ads API not configured');
    }
    return this.googleAdsService.createCampaign(campaignPlan);
  }

  // Performance analysis
  async analyzeAndOptimize(campaignData) {
    if (!this.googleAdsService) {
      throw new Error('Google Ads API not configured');
    }

    const performance = await this.googleAdsService.getCampaignPerformance(campaignData.campaignId);
    
    if (!this.claude) {
      return { suggestions: ['Configure Claude API for AI suggestions'] };
    }

    const prompt = `Analyze this Google Ads campaign performance and provide optimization recommendations.

## Campaign Performance (Last 30 Days)
${JSON.stringify(performance, null, 2)}

Provide specific, actionable recommendations:
1. **Keyword Optimization** - Which keywords to pause, add, or adjust bids
2. **Ad Copy Improvements** - Specific changes to improve CTR
3. **Budget Reallocation** - How to redistribute budget
4. **Bid Adjustments** - Device, location, or time-based modifiers

Return JSON:
{
  "overallHealth": "Good" | "Needs Attention" | "Critical",
  "immediateActions": [{ "type": "string", "target": "string", "reason": "string" }],
  "weeklyActions": ["string"],
  "estimatedImpact": "string"
}`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { suggestions: ['Unable to generate suggestions'] };
  }
}

module.exports = AICampaignManager;
