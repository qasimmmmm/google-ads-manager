/**
 * AI Campaign Manager - Autonomous Google Ads Management System
 * 
 * This service handles:
 * 1. Competitor keyword research (via DataForSEO/SEMrush)
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
    this.researchApiKey = config.researchApiKey; // DataForSEO or SEMrush
    this.researchProvider = config.researchProvider || 'dataforseo';
    
    if (this.claudeApiKey) {
      this.claude = new Anthropic({ apiKey: this.claudeApiKey });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // COMPETITOR RESEARCH
  // ═══════════════════════════════════════════════════════════

  /**
   * Spy on competitor's paid keywords
   */
  async getCompetitorKeywords(domain) {
    if (this.researchProvider === 'dataforseo') {
      return this.getCompetitorKeywordsDataForSEO(domain);
    } else if (this.researchProvider === 'semrush') {
      return this.getCompetitorKeywordsSEMrush(domain);
    }
    throw new Error('No research API configured');
  }

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
        location_code: 2840, // USA
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
        difficulty: item.keyword_data?.keyword_info?.competition_level || 'unknown'
      }));
    }
    return [];
  }

  async getCompetitorKeywordsSEMrush(domain) {
    if (!this.researchApiKey) {
      throw new Error('SEMrush API key not configured');
    }

    const response = await fetch(
      `https://api.semrush.com/?type=domain_adwords&key=${this.researchApiKey}&display_limit=100&domain=${domain}&database=us&export_columns=Ph,Po,Nq,Cp,Co,Tr,Tc`
    );

    const text = await response.text();
    const lines = text.trim().split('\n');
    
    if (lines.length <= 1) return [];

    return lines.slice(1).map(line => {
      const [keyword, position, volume, cpc, competition, traffic, trafficCost] = line.split(';');
      return {
        keyword,
        position: parseInt(position) || 0,
        searchVolume: parseInt(volume) || 0,
        cpc: parseFloat(cpc) || 0,
        competition: parseFloat(competition) || 0,
        traffic: parseInt(traffic) || 0,
        trafficCost: parseFloat(trafficCost) || 0
      };
    });
  }

  /**
   * Get competitor's ad copies
   */
  async getCompetitorAds(domain) {
    if (this.researchProvider === 'dataforseo') {
      return this.getCompetitorAdsDataForSEO(domain);
    }
    throw new Error('Ad spy not available for this provider');
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
        displayUrl: item.displayed_link,
        keyword: item.keyword
      }));
    }
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // KEYWORD DISCOVERY
  // ═══════════════════════════════════════════════════════════

  /**
   * Find cost-effective keyword opportunities
   */
  async findKeywordOpportunities(seedKeywords, maxCpc = 10) {
    if (this.researchProvider === 'dataforseo') {
      return this.findKeywordsDataForSEO(seedKeywords, maxCpc);
    }
    throw new Error('Keyword research not available');
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
        opportunityScore: this.calculateOpportunityScore(item.keyword_info)
      }));
    }
    return [];
  }

  calculateDifficulty(competition) {
    if (competition < 0.3) return 'Easy';
    if (competition < 0.6) return 'Medium';
    return 'Hard';
  }

  detectIntent(keyword) {
    const kw = keyword.toLowerCase();
    if (kw.includes('buy') || kw.includes('price') || kw.includes('cost') || kw.includes('cheap') || kw.includes('deal')) {
      return 'Commercial';
    }
    if (kw.includes('best') || kw.includes('top') || kw.includes('review') || kw.includes('vs')) {
      return 'Commercial Investigation';
    }
    if (kw.includes('how') || kw.includes('what') || kw.includes('why') || kw.includes('guide')) {
      return 'Informational';
    }
    return 'Transactional';
  }

  calculateOpportunityScore(keywordInfo) {
    if (!keywordInfo) return 0;
    const volume = keywordInfo.search_volume || 0;
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

  /**
   * Generate a complete campaign plan using AI
   */
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

## Competitor Keywords (Top performing)
${keywords?.slice(0, 20).map(k => `- "${k.keyword}" - Volume: ${k.searchVolume}, CPC: $${k.cpc}, Position: #${k.position}`).join('\n') || 'No competitor data available'}

## Competitor Ad Copies
${competitorAds?.slice(0, 5).map(a => `- Title: "${a.title}"\n  Description: "${a.description}"`).join('\n\n') || 'No competitor ads available'}

## Task
Create a detailed campaign structure with:

1. **Campaign Structure** (3-5 ad groups based on themes)
2. **Keywords for Each Ad Group** (10-15 keywords each with match types)
3. **Ad Copies** (3 responsive search ads per ad group with 15 headlines and 4 descriptions each)
4. **Bidding Strategy Recommendation**
5. **Budget Allocation** across ad groups
6. **Expected Performance Estimates**

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

  /**
   * Generate optimized ad copy based on competitors
   */
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

  // ═══════════════════════════════════════════════════════════
  // CAMPAIGN MANAGEMENT (Requires Google Ads API Basic Access)
  // ═══════════════════════════════════════════════════════════

  /**
   * Create campaign via Google Ads API
   */
  async createCampaign(campaignPlan) {
    if (!this.googleAdsService) {
      throw new Error('Google Ads API not configured');
    }

    // This will use the Google Ads API to create the campaign
    // Requires Basic Access approval from Google
    return this.googleAdsService.createCampaign(campaignPlan);
  }

  /**
   * Analyze campaign performance and suggest optimizations
   */
  async analyzeAndOptimize(campaignId) {
    if (!this.googleAdsService) {
      throw new Error('Google Ads API not configured');
    }

    // Get campaign performance data
    const performance = await this.googleAdsService.getCampaignPerformance(campaignId);
    
    if (!this.claude) {
      return { suggestions: ['Configure Claude API for AI suggestions'] };
    }

    const prompt = `Analyze this Google Ads campaign performance and provide optimization recommendations.

## Campaign Performance (Last 30 Days)
${JSON.stringify(performance, null, 2)}

Provide specific, actionable recommendations in these areas:
1. **Keyword Optimization** - Which keywords to pause, add, or adjust bids
2. **Ad Copy Improvements** - Specific changes to improve CTR
3. **Budget Reallocation** - How to redistribute budget for better ROI
4. **Bid Adjustments** - Device, location, or time-based bid modifiers
5. **New Opportunities** - Additional keywords or ad groups to test

Return JSON:
{
  "overallHealth": "Good" | "Needs Attention" | "Critical",
  "keyMetrics": {
    "ctr": { "value": number, "status": "good" | "low" | "high", "recommendation": "string" },
    "cpc": { "value": number, "status": "good" | "low" | "high", "recommendation": "string" },
    "conversions": { "value": number, "status": "good" | "low", "recommendation": "string" },
    "roas": { "value": number, "status": "good" | "low", "recommendation": "string" }
  },
  "immediateActions": [
    { "type": "pause_keyword" | "increase_bid" | "decrease_bid" | "add_negative" | "update_ad", "target": "string", "reason": "string" }
  ],
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

  // ═══════════════════════════════════════════════════════════
  // AUTOMATED WORKFLOWS
  // ═══════════════════════════════════════════════════════════

  /**
   * Full automated workflow: Research → Plan → Create → Optimize
   */
  async runAutomatedCampaignCreation(options) {
    const results = {
      steps: [],
      errors: [],
      campaignPlan: null,
      created: false
    };

    try {
      // Step 1: Research competitors
      results.steps.push({ step: 'Researching competitors', status: 'running' });
      const competitorKeywords = await this.getCompetitorKeywords(options.competitorDomain);
      results.steps[0].status = 'completed';
      results.steps[0].data = `Found ${competitorKeywords.length} competitor keywords`;

      // Step 2: Get competitor ads
      results.steps.push({ step: 'Analyzing competitor ads', status: 'running' });
      const competitorAds = await this.getCompetitorAds(options.competitorDomain);
      results.steps[1].status = 'completed';
      results.steps[1].data = `Found ${competitorAds.length} competitor ads`;

      // Step 3: Find keyword opportunities
      results.steps.push({ step: 'Finding keyword opportunities', status: 'running' });
      const seedKeywords = competitorKeywords.slice(0, 5).map(k => k.keyword);
      const opportunities = await this.findKeywordOpportunities(seedKeywords, options.maxCpc || 10);
      results.steps[2].status = 'completed';
      results.steps[2].data = `Found ${opportunities.length} keyword opportunities`;

      // Step 4: Generate campaign plan
      results.steps.push({ step: 'Generating campaign plan with AI', status: 'running' });
      const campaignPlan = await this.generateCampaignPlan({
        businessType: options.businessType,
        targetLocation: options.targetLocation,
        budget: options.dailyBudget,
        competitors: [options.competitorDomain],
        keywords: [...competitorKeywords, ...opportunities].slice(0, 50),
        competitorAds: competitorAds
      });
      results.steps[3].status = 'completed';
      results.campaignPlan = campaignPlan;

      // Step 5: Create campaign (if Google Ads API is ready)
      if (options.autoCreate && this.googleAdsService) {
        results.steps.push({ step: 'Creating campaign in Google Ads', status: 'running' });
        try {
          await this.createCampaign(campaignPlan);
          results.steps[4].status = 'completed';
          results.created = true;
        } catch (e) {
          results.steps[4].status = 'failed';
          results.steps[4].error = e.message;
          results.errors.push('Campaign creation failed: ' + e.message);
        }
      }

    } catch (error) {
      results.errors.push(error.message);
      const lastStep = results.steps[results.steps.length - 1];
      if (lastStep && lastStep.status === 'running') {
        lastStep.status = 'failed';
        lastStep.error = error.message;
      }
    }

    return results;
  }
}

module.exports = AICampaignManager;
