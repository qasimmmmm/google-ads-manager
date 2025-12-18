const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/callback'
);

// Scopes needed for Google Ads API
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Check authentication status
router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session.tokens && req.session.tokens.access_token);
  res.json({
    authenticated: isAuthenticated,
    user: req.session.user || null,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID
  });
});

// Start OAuth flow
router.get('/login', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to get refresh token
  });
  res.redirect(authUrl);
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens in session
    req.session.tokens = tokens;
    
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    req.session.user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    };
    
    console.log('✅ User authenticated:', userInfo.email);
    
    res.redirect('/?success=true');
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Get fresh access token (handles refresh)
router.get('/token', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    oauth2Client.setCredentials(req.session.tokens);
    
    // Check if token needs refresh
    if (req.session.tokens.expiry_date && req.session.tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      req.session.tokens = credentials;
    }
    
    res.json({ access_token: req.session.tokens.access_token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
