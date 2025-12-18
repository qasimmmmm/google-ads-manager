const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// OAuth2 client setup
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/callback'
  );
};

// Scopes needed for Google Ads API
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Helper to set secure cookie
const setTokenCookie = (res, tokens, user) => {
  const data = JSON.stringify({ tokens, user });
  const encoded = Buffer.from(data).toString('base64');
  
  res.cookie('auth_data', encoded, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });
};

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

// Check authentication status
router.get('/status', (req, res) => {
  const authData = getAuthData(req);
  
  if (authData && authData.tokens) {
    res.json({
      authenticated: true,
      user: authData.user || null,
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID
    });
  } else {
    res.json({
      authenticated: false,
      user: null,
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID
    });
  }
});

// Start OAuth flow
router.get('/login', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
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
    const oauth2Client = getOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    const user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    };
    
    console.log('✅ User authenticated:', userInfo.email);
    
    // Store in cookie
    setTokenCookie(res, tokens, user);
    
    res.redirect('/?success=true');
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.redirect('/?error=auth_failed&message=' + encodeURIComponent(error.message));
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('auth_data', { path: '/' });
  res.redirect('/');
});

// Get tokens (for API calls)
router.get('/tokens', (req, res) => {
  const authData = getAuthData(req);
  
  if (!authData || !authData.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({ 
    access_token: authData.tokens.access_token,
    refresh_token: authData.tokens.refresh_token
  });
});

// Export helper for use in API routes
router.getAuthData = getAuthData;

module.exports = router;
