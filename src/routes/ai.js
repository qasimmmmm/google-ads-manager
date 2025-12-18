const express = require('express');
const AIService = require('../services/aiService');
const router = express.Router();

// Store conversation history in memory (per session)
const conversations = new Map();

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

// Get or create conversation ID
const getConversationId = (req) => {
  const authData = getAuthData(req);
  return authData?.user?.email || 'anonymous';
};

// Chat endpoint
router.post('/chat', requireAuth, async (req, res) => {
  const { message, apiKey } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!apiKey) {
    return res.status(400).json({ 
      error: 'Claude API key is required',
      needsApiKey: true 
    });
  }

  try {
    const aiService = new AIService(apiKey);
    const conversationId = getConversationId(req);
    
    // Get conversation history
    let history = conversations.get(conversationId) || [];
    
    // Send message to AI
    const response = await aiService.chat(history, message);
    
    if (response.success) {
      // Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response.message });
      
      // Keep only last 20 messages to manage context window
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      conversations.set(conversationId, history);
      
      res.json({
        success: true,
        message: response.message,
        usage: response.usage
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat'
    });
  }
});

// Clear conversation history
router.post('/chat/clear', requireAuth, (req, res) => {
  const conversationId = getConversationId(req);
  conversations.delete(conversationId);
  res.json({ success: true, message: 'Conversation cleared' });
});

// Generate ad copy endpoint
router.post('/generate/adcopy', requireAuth, async (req, res) => {
  const { product, targetAudience, uniqueSellingPoints, apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Claude API key is required', needsApiKey: true });
  }

  try {
    const aiService = new AIService(apiKey);
    const response = await aiService.generateAdCopy(product, targetAudience, uniqueSellingPoints);
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate keywords endpoint
router.post('/generate/keywords', requireAuth, async (req, res) => {
  const { seedKeyword, industry, location, apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Claude API key is required', needsApiKey: true });
  }

  try {
    const aiService = new AIService(apiKey);
    const response = await aiService.generateKeywords(seedKeyword, industry, location);
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create campaign plan endpoint
router.post('/generate/campaign', requireAuth, async (req, res) => {
  const { businessType, goals, budget, locations, apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Claude API key is required', needsApiKey: true });
  }

  try {
    const aiService = new AIService(apiKey);
    const response = await aiService.createCampaignPlan(businessType, goals, budget, locations);
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze campaign endpoint
router.post('/analyze/campaign', requireAuth, async (req, res) => {
  const { campaignData, apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Claude API key is required', needsApiKey: true });
  }

  try {
    const aiService = new AIService(apiKey);
    const response = await aiService.analyzeCampaign(campaignData);
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
