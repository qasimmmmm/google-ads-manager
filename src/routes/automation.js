const express = require('express');
const AICampaignManager = require('../services/aiCampaignManager');
const router = express.Router();

// Helper to get auth data from cookie
const getAuthData = (req) => {
  try {
    const cookie = req.cookies?.auth_data;
    if (!cookie) return null;
    const decoded = Buffer.from(cookie, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  const authData = getAuthData(req);
  if (!authData || !authData.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.authData = authData;
  next();
};

// Create manager instance from request
const getManager = (req) => {
  const { claudeApiKey, researchApiKey, researchProvider } = req.body;
  return new AICampaignManager({
    claudeApiKey,
    researchApiKey,
    researchProvider: researchProvider || 'dataforseo'
  });
};

// ═══════════════════════════════════════════════════════════
// COMPETITOR RESEARCH ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * Get competitor's paid keywords
 * POST /automation/competitor/keywords
 */
router.post('/competitor/keywords', requireAuth, async (req, res) => {
  const { domain, researchApiKey, researchProvider } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ 
      error: 'Research API key required',
      message: 'Please add DataForSEO or SEMrush API key in Settings'
    });
  }

  try {
    const manager = new AICampaignManager({
      researchApiKey,
      researchProvider: researchProvider || 'dataforseo'
    });

    const keywords = await manager.getCompetitorKeywords(domain);
    
    res.json({
      success: true,
      domain,
      totalKeywords: keywords.length,
      keywords: keywords.slice(0, 100) // Limit response size
    });
  } catch (error) {
    console.error('Competitor keywords error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get competitor's ad copies
 * POST /automation/competitor/ads
 */
router.post('/competitor/ads', requireAuth, async (req, res) => {
  const { domain, researchApiKey, researchProvider } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ error: 'Research API key required' });
  }

  try {
    const manager = new AICampaignManager({
      researchApiKey,
      researchProvider: researchProvider || 'dataforseo'
    });

    const ads = await manager.getCompetitorAds(domain);
    
    res.json({
      success: true,
      domain,
      totalAds: ads.length,
      ads
    });
  } catch (error) {
    console.error('Competitor ads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get competitor's organic keywords
 * POST /automation/competitor/organic
 */
router.post('/competitor/organic', requireAuth, async (req, res) => {
  const { domain, researchApiKey, researchProvider } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ error: 'Research API key required' });
  }

  try {
    const manager = new AICampaignManager({
      researchApiKey,
      researchProvider: researchProvider || 'semrush'
    });

    const keywords = await manager.getCompetitorOrganicKeywords(domain);
    
    res.json({
      success: true,
      domain,
      totalKeywords: keywords.length,
      keywords: keywords.slice(0, 100)
    });
  } catch (error) {
    console.error('Organic keywords error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get competitor's ad competitors
 * POST /automation/competitor/adcompetitors
 */
router.post('/competitor/adcompetitors', requireAuth, async (req, res) => {
  const { domain, researchApiKey, researchProvider } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ error: 'Research API key required' });
  }

  try {
    const manager = new AICampaignManager({
      researchApiKey,
      researchProvider: researchProvider || 'semrush'
    });

    const competitors = await manager.getAdCompetitors(domain);
    
    res.json({
      success: true,
      domain,
      totalCompetitors: competitors.length,
      competitors: competitors.slice(0, 20)
    });
  } catch (error) {
    console.error('Ad competitors error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// KEYWORD DISCOVERY ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * Find keyword opportunities
 * POST /automation/keywords/discover
 */
router.post('/keywords/discover', requireAuth, async (req, res) => {
  const { seedKeywords, maxCpc, researchApiKey, researchProvider } = req.body;

  if (!seedKeywords || !seedKeywords.length) {
    return res.status(400).json({ error: 'Seed keywords are required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ error: 'Research API key required' });
  }

  try {
    const manager = new AICampaignManager({
      researchApiKey,
      researchProvider: researchProvider || 'dataforseo'
    });

    const keywords = await manager.findKeywordOpportunities(seedKeywords, maxCpc || 10);
    
    // Sort by opportunity score
    keywords.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    res.json({
      success: true,
      totalKeywords: keywords.length,
      keywords: keywords.slice(0, 200),
      summary: {
        avgVolume: Math.round(keywords.reduce((a, k) => a + k.searchVolume, 0) / keywords.length),
        avgCpc: (keywords.reduce((a, k) => a + k.cpc, 0) / keywords.length).toFixed(2),
        easyKeywords: keywords.filter(k => k.difficulty === 'Easy').length,
        commercialKeywords: keywords.filter(k => k.intent === 'Commercial' || k.intent === 'Transactional').length
      }
    });
  } catch (error) {
    console.error('Keyword discovery error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// AI CAMPAIGN GENERATION ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * Generate a complete campaign plan
 * POST /automation/campaign/generate
 */
router.post('/campaign/generate', requireAuth, async (req, res) => {
  const { 
    businessType, 
    targetLocation, 
    dailyBudget, 
    keywords, 
    competitorAds,
    claudeApiKey 
  } = req.body;

  if (!claudeApiKey) {
    return res.status(400).json({ error: 'Claude API key required' });
  }

  try {
    const manager = new AICampaignManager({ claudeApiKey });

    const campaignPlan = await manager.generateCampaignPlan({
      businessType,
      targetLocation,
      budget: dailyBudget,
      keywords,
      competitorAds
    });
    
    res.json({
      success: true,
      campaignPlan
    });
  } catch (error) {
    console.error('Campaign generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate ad copy for a keyword
 * POST /automation/adcopy/generate
 */
router.post('/adcopy/generate', requireAuth, async (req, res) => {
  const { 
    keyword, 
    competitorAds, 
    businessName, 
    uniqueSellingPoints,
    claudeApiKey 
  } = req.body;

  if (!claudeApiKey) {
    return res.status(400).json({ error: 'Claude API key required' });
  }

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  try {
    const manager = new AICampaignManager({ claudeApiKey });

    const adCopy = await manager.generateAdCopy({
      keyword,
      competitorAds,
      businessName,
      uniqueSellingPoints
    });
    
    res.json({
      success: true,
      adCopy
    });
  } catch (error) {
    console.error('Ad copy generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// FULL AUTOMATION ENDPOINT
// ═══════════════════════════════════════════════════════════

/**
 * Run full automated campaign creation workflow
 * POST /automation/run
 * 
 * This endpoint:
 * 1. Researches competitor keywords
 * 2. Analyzes competitor ads
 * 3. Finds keyword opportunities
 * 4. Generates complete campaign plan
 * 5. (Optional) Creates campaign in Google Ads
 */
router.post('/run', requireAuth, async (req, res) => {
  const {
    competitorDomain,
    businessType,
    targetLocation,
    dailyBudget,
    maxCpc,
    autoCreate,
    claudeApiKey,
    researchApiKey,
    researchProvider
  } = req.body;

  if (!competitorDomain) {
    return res.status(400).json({ error: 'Competitor domain is required' });
  }

  if (!claudeApiKey) {
    return res.status(400).json({ error: 'Claude API key required' });
  }

  if (!researchApiKey) {
    return res.status(400).json({ error: 'Research API key required' });
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const manager = new AICampaignManager({
      claudeApiKey,
      researchApiKey,
      researchProvider: researchProvider || 'dataforseo'
    });

    // Step 1: Research competitor keywords
    sendUpdate({ step: 1, message: 'Researching competitor keywords...', status: 'running' });
    let competitorKeywords = [];
    try {
      competitorKeywords = await manager.getCompetitorKeywords(competitorDomain);
      sendUpdate({ 
        step: 1, 
        message: `Found ${competitorKeywords.length} competitor keywords`, 
        status: 'completed',
        data: competitorKeywords.slice(0, 10)
      });
    } catch (e) {
      sendUpdate({ step: 1, message: 'Could not fetch competitor keywords: ' + e.message, status: 'warning' });
    }

    // Step 2: Get competitor ads
    sendUpdate({ step: 2, message: 'Analyzing competitor ad copies...', status: 'running' });
    let competitorAds = [];
    try {
      competitorAds = await manager.getCompetitorAds(competitorDomain);
      sendUpdate({ 
        step: 2, 
        message: `Found ${competitorAds.length} competitor ads`, 
        status: 'completed',
        data: competitorAds.slice(0, 5)
      });
    } catch (e) {
      sendUpdate({ step: 2, message: 'Could not fetch competitor ads: ' + e.message, status: 'warning' });
    }

    // Step 3: Find keyword opportunities
    sendUpdate({ step: 3, message: 'Discovering keyword opportunities...', status: 'running' });
    let opportunities = [];
    try {
      const seeds = competitorKeywords.slice(0, 5).map(k => k.keyword);
      if (seeds.length > 0) {
        opportunities = await manager.findKeywordOpportunities(seeds, maxCpc || 10);
        sendUpdate({ 
          step: 3, 
          message: `Found ${opportunities.length} keyword opportunities`, 
          status: 'completed',
          data: opportunities.slice(0, 10)
        });
      } else {
        sendUpdate({ step: 3, message: 'No seed keywords available', status: 'skipped' });
      }
    } catch (e) {
      sendUpdate({ step: 3, message: 'Could not find opportunities: ' + e.message, status: 'warning' });
    }

    // Step 4: Generate campaign plan with AI
    sendUpdate({ step: 4, message: 'AI is creating your campaign plan...', status: 'running' });
    const allKeywords = [...competitorKeywords, ...opportunities].slice(0, 50);
    
    const campaignPlan = await manager.generateCampaignPlan({
      businessType: businessType || 'Telecommunications (Internet & Cable TV)',
      targetLocation: targetLocation || 'United States',
      budget: dailyBudget || 100,
      competitors: [competitorDomain],
      keywords: allKeywords,
      competitorAds: competitorAds
    });

    sendUpdate({ 
      step: 4, 
      message: 'Campaign plan generated successfully!', 
      status: 'completed',
      campaignPlan
    });

    // Step 5: Summary
    sendUpdate({ 
      step: 5, 
      message: 'Automation complete!', 
      status: 'done',
      summary: {
        competitorKeywords: competitorKeywords.length,
        competitorAds: competitorAds.length,
        keywordOpportunities: opportunities.length,
        adGroups: campaignPlan.adGroups?.length || 0,
        estimatedBudget: campaignPlan.dailyBudget
      }
    });

    res.end();

  } catch (error) {
    console.error('Automation error:', error);
    sendUpdate({ step: 0, message: 'Error: ' + error.message, status: 'error' });
    res.end();
  }
});

/**
 * Get optimization suggestions for existing campaign
 * POST /automation/optimize
 */
router.post('/optimize', requireAuth, async (req, res) => {
  const { campaignData, claudeApiKey } = req.body;

  if (!claudeApiKey) {
    return res.status(400).json({ error: 'Claude API key required' });
  }

  if (!campaignData) {
    return res.status(400).json({ error: 'Campaign data is required' });
  }

  try {
    const manager = new AICampaignManager({ claudeApiKey });
    
    // Use AI to analyze and suggest optimizations
    const analysis = await manager.analyzeAndOptimize(campaignData);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
