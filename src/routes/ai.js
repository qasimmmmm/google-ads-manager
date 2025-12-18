const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
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

// System prompt
const SYSTEM_PROMPT = `You are AdsPro AI, an expert Google Ads campaign manager and marketing assistant. You help users:

1. **Create Campaigns**: When asked to create a campaign, provide a detailed plan including:
   - Campaign name and type (Search, Display, Video, etc.)
   - Recommended daily budget
   - Target locations
   - Suggested keywords (with estimated CPC and volume)
   - Ad copy (headlines and descriptions)
   - Bidding strategy recommendation

2. **Keyword Research**: When asked about keywords:
   - Suggest relevant keywords for their business
   - Explain search intent (commercial, informational, navigational)
   - Provide estimated metrics (volume, CPC, competition)
   - Recommend match types (broad, phrase, exact)

3. **Competitor Analysis**: When asked about competitors:
   - Analyze their likely strategy
   - Suggest keywords they might be targeting
   - Recommend ways to differentiate

4. **Optimization Tips**: Provide actionable advice on:
   - Improving Quality Score
   - Reducing CPC
   - Increasing CTR
   - Better conversion rates

5. **Ad Copy Generation**: Write compelling:
   - Headlines (max 30 characters each)
   - Descriptions (max 90 characters each)
   - Call-to-action phrases

Always be specific, actionable, and data-driven. Format responses with markdown for clarity.

The user's business is a telecommunications company (The Quantum Leap) selling internet and cable TV services across the US.`;

// Streaming chat endpoint
router.post('/chat/stream', requireAuth, async (req, res) => {
  const { message, apiKey, claudeApiKey } = req.body;
  const actualApiKey = apiKey || claudeApiKey;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!actualApiKey) {
    return res.status(400).json({ 
      error: 'Claude API key is required',
      needsApiKey: true 
    });
  }

  // Set headers for SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const client = new Anthropic({ apiKey: actualApiKey });
    const conversationId = getConversationId(req);
    
    // Get conversation history
    let history = conversations.get(conversationId) || [];
    
    // Build messages array
    const messages = [
      ...history,
      { role: 'user', content: message }
    ];

    let fullResponse = '';

    // Create streaming message
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages
    });

    // Handle stream events
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const text = event.delta.text;
        fullResponse += text;
        
        // Send chunk to client
        res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      }
    }

    // Update conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: fullResponse });
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history = history.slice(-20);
    }
    conversations.set(conversationId, history);

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'done', fullMessage: fullResponse })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Non-streaming chat endpoint (fallback)
router.post('/chat', requireAuth, async (req, res) => {
  const { message, apiKey, claudeApiKey } = req.body;
  const actualApiKey = apiKey || claudeApiKey;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!actualApiKey) {
    return res.status(400).json({ 
      error: 'Claude API key is required',
      needsApiKey: true 
    });
  }

  try {
    const client = new Anthropic({ apiKey: actualApiKey });
    const conversationId = getConversationId(req);
    
    let history = conversations.get(conversationId) || [];
    
    const messages = [
      ...history,
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Update history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: assistantMessage });
    
    if (history.length > 20) {
      history = history.slice(-20);
    }
    conversations.set(conversationId, history);

    res.json({
      success: true,
      message: assistantMessage,
      usage: response.usage
    });
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

module.exports = router;
