const express = require('express');
const GoogleAdsService = require('../services/googleAds');
const router = express.Router();

// Helper to get tokens from cookie
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

  if (!authData || !authData.tokens || !authData.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated. Please login first.' });
  }

  req.authData = authData;
  next();
};

const createGoogleAdsService = (req) =>
  new GoogleAdsService(req.authData.tokens.access_token, req.authData.tokens.refresh_token);

// Helper to get date range
const getDateRange = (range) => {
  const end = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'last7':
      start.setDate(start.getDate() - 7);
      break;
    case 'last30':
      start.setDate(start.getDate() - 30);
      break;
    case 'last90':
      start.setDate(start.getDate() - 90);
      break;
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

// ═══════════════════════════════════════════════════════════
// ACCOUNT SUMMARY
// ═══════════════════════════════════════════════════════════
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const data = await service.getAccountSummary(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      data
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const campaigns = await service.getCampaigns(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    console.error('Campaigns error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// KEYWORDS
// ═══════════════════════════════════════════════════════════
router.get('/keywords', requireAuth, async (req, res) => {
  try {
    const { range = 'last30', campaignId } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const keywords = await service.getKeywords(startDate, endDate, campaignId);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      count: keywords.length,
      data: keywords
    });
  } catch (error) {
    console.error('Keywords error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ADS
// ═══════════════════════════════════════════════════════════
router.get('/ads', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const ads = await service.getAds(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      count: ads.length,
      data: ads
    });
  } catch (error) {
    console.error('Ads error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════
router.get('/locations', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const locations = await service.getLocationPerformance(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Locations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DEVICES
// ═══════════════════════════════════════════════════════════
router.get('/devices', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const devices = await service.getDevicePerformance(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      data: devices
    });
  } catch (error) {
    console.error('Devices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// AUDIENCES
// ═══════════════════════════════════════════════════════════
router.get('/audiences', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = createGoogleAdsService(req);
    const audiences = await service.getAudiencePerformance(startDate, endDate);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      count: audiences.length,
      data: audiences
    });
  } catch (error) {
    console.error('Audiences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CONVERSIONS
// ═══════════════════════════════════════════════════════════
router.get('/conversions', requireAuth, async (req, res) => {
  try {
    const service = createGoogleAdsService(req);
    const conversions = await service.getConversionActions();
    
    res.json({
      success: true,
      count: conversions.length,
      data: conversions
    });
  } catch (error) {
    console.error('Conversions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD - Combined data for dashboard view
// ═══════════════════════════════════════════════════════════
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { range = 'last30' } = req.query;
    const { startDate, endDate } = getDateRange(range);
    
    const service = new GoogleAdsService(req.authData.tokens.access_token);
    
    // Fetch all data in parallel
    const [summary, campaigns, devices] = await Promise.all([
      service.getAccountSummary(startDate, endDate),
      service.getCampaigns(startDate, endDate),
      service.getDevicePerformance(startDate, endDate)
    ]);
    
    res.json({
      success: true,
      dateRange: { startDate, endDate },
      data: {
        summary,
        campaigns: campaigns.slice(0, 10), // Top 10 campaigns
        devices
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
