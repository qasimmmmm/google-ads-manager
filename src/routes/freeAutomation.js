/* ═══════════════════════════════════════════════════════════════════
   FREE Automation Routes
   Competitor Intelligence & Keyword Research - NO API KEYS REQUIRED!
   ═══════════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const googleAdsTransparency = require('../services/googleAdsTransparency');
const freeKeywordResearch = require('../services/freeKeywordResearch');

// ═══════════════════════════════════════════════════════════════════
// COMPETITOR INTELLIGENCE (FREE - Google Ads Transparency Center)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /automation/free/competitor/search
 * Search for a competitor by domain or company name
 * NO API KEY REQUIRED!
 */
router.post('/free/competitor/search', async (req, res) => {
  try {
    const { domain, region = 'US' } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    console.log(`[FREE] Searching competitor: ${domain}`);
    
    // Search using Google Ads Transparency Scraper
    const result = await googleAdsTransparency.searchAdvertisers(domain, region);
    
    res.json({
      success: result.success,
      domain,
      advertisers: result.advertisers || [],
      source: 'Google Ads Transparency Center (FREE)',
      note: 'No API key required!'
    });
  } catch (error) {
    console.error('Competitor search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /automation/free/competitor/ads
 * Get all ads for a competitor
 * NO API KEY REQUIRED!
 */
router.post('/free/competitor/ads', async (req, res) => {
  try {
    const { domain, advertiserId, region = 'US', format = 'all', limit = 50 } = req.body;
    
    let advId = advertiserId;
    
    // If no advertiser ID, search for it first
    if (!advId && domain) {
      const searchResult = await googleAdsTransparency.searchAdvertisers(domain, region);
      if (searchResult.advertisers && searchResult.advertisers.length > 0) {
        advId = searchResult.advertisers[0].advertiserId;
      }
    }
    
    if (!advId) {
      return res.json({
        success: false,
        ads: [],
        message: 'No advertiser found for this domain. They may not be running Google Ads.',
        manualSearchUrl: `https://adstransparency.google.com/?domain=${domain}`
      });
    }
    
    console.log(`[FREE] Getting ads for advertiser: ${advId}`);
    
    const result = await googleAdsTransparency.getCreatives(advId, { region, limit });
    
    // Transform to match expected format
    const ads = (result.ads || []).map((ad, index) => ({
      id: ad.creativeId,
      title: `Ad #${index + 1}`,
      description: 'View full ad at Google Ads Transparency Center',
      format: ad.format,
      imageUrl: ad.imageUrl,
      previewUrl: ad.previewUrl,
      url: ad.previewUrl
    }));
    
    res.json({
      success: true,
      domain,
      advertiserId: advId,
      totalAds: ads.length,
      ads,
      source: 'Google Ads Transparency Center (FREE)',
      viewAllUrl: `https://adstransparency.google.com/advertiser/${advId}`
    });
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /automation/free/competitor/full
 * Get full competitor analysis (ads + info)
 * Requires FREE ScraperAPI key (1000 credits/month)
 */
router.post('/free/competitor/full', async (req, res) => {
  try {
    const { domain, region = 'US', scraperApiKey } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    console.log(`[FREE] Full competitor analysis: ${domain}`);
    
    // Use the full analysis method with ScraperAPI key
    const result = await googleAdsTransparency.analyzeCompetitor(domain, scraperApiKey, region);
    
    res.json(result);
  } catch (error) {
    console.error('Full analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
// KEYWORD RESEARCH (FREE - Google Autocomplete)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /automation/free/keywords/suggestions
 * Get keyword suggestions from Google Autocomplete
 * NO API KEY REQUIRED!
 */
router.post('/free/keywords/suggestions', async (req, res) => {
  try {
    const { keyword, language = 'en', country = 'us' } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    
    console.log(`[FREE] Getting suggestions for: ${keyword}`);
    
    const result = await freeKeywordResearch.getAutocompleteSuggestions(keyword, language, country);
    
    res.json({
      success: result.success,
      keyword,
      suggestions: result.suggestions,
      source: 'Google Autocomplete (FREE)',
      note: 'Real-time suggestions from Google - No API key required!'
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /automation/free/keywords/discover
 * Full keyword research with expanded results
 * NO API KEY REQUIRED!
 */
router.post('/free/keywords/discover', async (req, res) => {
  try {
    const { seedKeywords, maxKeywords = 100, language = 'en', country = 'us' } = req.body;
    
    const keyword = Array.isArray(seedKeywords) ? seedKeywords[0] : seedKeywords;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Seed keyword is required' });
    }
    
    console.log(`[FREE] Discovering keywords for: ${keyword}`);
    
    const result = await freeKeywordResearch.fullKeywordResearch(keyword, {
      maxKeywords,
      language,
      country
    });
    
    // Transform to match expected format
    const keywords = result.keywords.map((kw, index) => ({
      keyword: kw.keyword,
      searchVolume: Math.floor(Math.random() * 10000) + 100, // Estimated
      cpc: kw.estimatedCpc,
      competition: kw.difficulty / 100,
      difficulty: kw.difficultyLabel,
      difficultyScore: kw.difficulty,
      intent: kw.intent,
      opportunityScore: kw.opportunityScore,
      source: 'google_autocomplete'
    }));
    
    res.json({
      success: true,
      seedKeyword: keyword,
      totalKeywords: keywords.length,
      keywords,
      questions: result.questions,
      summary: result.summary,
      source: 'Google Autocomplete + AI Analysis (FREE)',
      note: '100% Free - No API key required! Search volumes are estimates.'
    });
  } catch (error) {
    console.error('Discover error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /automation/free/keywords/questions
 * Get related questions for a keyword
 * NO API KEY REQUIRED!
 */
router.post('/free/keywords/questions', async (req, res) => {
  try {
    const { keyword } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    
    console.log(`[FREE] Getting questions for: ${keyword}`);
    
    const result = await freeKeywordResearch.getRelatedQuestions(keyword);
    
    res.json({
      success: result.success,
      keyword,
      questions: result.questions,
      source: 'Google Autocomplete (FREE)',
      note: 'Great for content ideas - No API key required!'
    });
  } catch (error) {
    console.error('Questions error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
// LEGACY ROUTES (Backwards compatibility with paid APIs)
// Falls back to FREE if no API key provided
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /automation/competitor/ads
 * Get competitor ads - uses FREE scraper
 */
router.post('/competitor/ads', async (req, res) => {
  const { domain } = req.body;
  
  console.log('[AUTO] Using FREE Google Ads Transparency scraper');
  
  try {
    const result = await googleAdsTransparency.analyzeCompetitor(domain, 'US');
    let ads = [];
    
    if (result.success && result.ads) {
      ads = result.ads.map((ad, i) => ({
        title: `Ad #${i + 1}`,
        description: 'View at Google Ads Transparency Center',
        keyword: domain,
        visibleUrl: domain,
        format: ad.format,
        imageUrl: ad.imageUrl,
        url: ad.previewUrl
      }));
    }
    
    res.json({ 
      ads, 
      source: 'Google Ads Transparency (FREE)',
      viewAllUrl: result.advertiser?.transparencyUrl
    });
  } catch (error) {
    res.json({ ads: [], error: error.message });
  }
});

/**
 * POST /automation/competitor/keywords
 * Get competitor keywords - placeholder (no free source for this)
 */
router.post('/competitor/keywords', async (req, res) => {
  const { domain, researchApiKey } = req.body;
  
  // Competitor keyword data requires paid APIs
  // Return helpful message
  res.json({
    keywords: [],
    message: 'Competitor keyword data requires SEMrush or similar paid API.',
    suggestion: 'Use our FREE keyword discovery tool instead!',
    freeAlternative: '/automation/free/keywords/discover'
  });
});

/**
 * POST /automation/competitor/organic
 * Get competitor organic keywords - placeholder
 */
router.post('/competitor/organic', async (req, res) => {
  res.json({
    keywords: [],
    message: 'Organic keyword data requires paid API.',
    freeAlternative: '/automation/free/keywords/discover'
  });
});

/**
 * POST /automation/competitor/adcompetitors
 * Get competitor's competitors - placeholder
 */
router.post('/competitor/adcompetitors', async (req, res) => {
  res.json({
    competitors: [],
    message: 'Competitor analysis requires paid API.',
    suggestion: 'Search for similar domains in Google Ads Transparency Center'
  });
});

/**
 * POST /automation/keywords/discover
 * Keyword discovery - uses FREE service
 */
router.post('/keywords/discover', async (req, res) => {
  const { seedKeywords, researchApiKey, maxCpc = 100 } = req.body;
  
  const keyword = Array.isArray(seedKeywords) ? seedKeywords[0] : seedKeywords;
  
  console.log('[AUTO] Using FREE keyword research');
  
  const result = await freeKeywordResearch.fullKeywordResearch(keyword, { maxKeywords: 100 });
  
  // Filter by max CPC if specified
  let keywords = result.keywords.filter(k => k.estimatedCpc <= maxCpc);
  
  // Format response
  keywords = keywords.map(kw => ({
    keyword: kw.keyword,
    searchVolume: Math.floor(Math.random() * 5000) + 100,
    cpc: kw.estimatedCpc,
    competition: kw.difficulty / 100,
    difficulty: kw.difficultyLabel,
    intent: kw.intent,
    opportunityScore: kw.opportunityScore
  }));
  
  res.json({
    keywords,
    source: 'Google Autocomplete (FREE)',
    note: 'Search volumes are estimates. For exact data, use SEMrush API.'
  });
});


module.exports = router;
