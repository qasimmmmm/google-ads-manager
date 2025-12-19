/* ═══════════════════════════════════════════════════════════════════
   Google Ads Intelligence - ScraperAPI Integration
   
   Uses ScraperAPI's STRUCTURED GOOGLE SERP API
   This returns clean JSON with ads included - no HTML parsing needed!
   
   Endpoint: https://api.scraperapi.com/structured/google/search
   
   FREE: 1,000 credits/month at https://www.scraperapi.com/signup
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  /**
   * Make HTTP/HTTPS request
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      console.log(`[Request] ${url.substring(0, 100)}...`);
      
      const req = client.get(url, { timeout: 120000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Response] Status: ${res.statusCode}, Size: ${data.length} bytes`);
          resolve({ status: res.statusCode, data });
        });
      });
      
      req.on('error', err => {
        console.error(`[Error] ${err.message}`);
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════════
     KEYWORD ADS SEARCH 2.0
     Uses ScraperAPI's Structured Google SERP API
     Returns CLEAN JSON with ads - no parsing needed!
     
     Endpoint: https://api.scraperapi.com/structured/google/search
     ═══════════════════════════════════════════════════════════════════ */

  async searchKeywordAds(keyword, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[Keyword Ads 2.0] Searching: "${keyword}"`);
    console.log(`${'═'.repeat(55)}`);

    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'ScraperAPI key required',
        setupUrl: 'https://www.scraperapi.com/signup'
      };
    }

    // Use ScraperAPI's STRUCTURED Google SERP API
    // This returns JSON directly with ads included!
    const apiUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${apiKey}` +
      `&query=${encodeURIComponent(keyword)}` +
      `&country_code=${country}` +
      `&tld=com` +
      `&num=20`;
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', message: 'Invalid ScraperAPI key' };
      }
      
      if (response.status === 403) {
        return { success: false, error: 'QUOTA_EXCEEDED', message: 'API quota exceeded. Check your ScraperAPI dashboard.' };
      }
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}`, message: `Request failed: ${response.status}` };
      }

      // Parse JSON response
      let json;
      try {
        json = JSON.parse(response.data);
      } catch (e) {
        console.error('[Parse] Failed to parse JSON:', e.message);
        return { success: false, error: 'PARSE_ERROR', message: 'Failed to parse response' };
      }

      // Extract ads from the structured response
      const ads = this.extractAdsFromSERP(json);
      const organicResults = json.organic_results || [];
      
      return {
        success: true,
        keyword,
        country,
        totalAds: ads.length,
        topAds: ads.filter(a => a.position <= 4).length,
        bottomAds: ads.filter(a => a.position > 4).length,
        ads,
        organicCount: organicResults.length,
        relatedSearches: (json.related_searches || []).slice(0, 10),
        searchInfo: json.search_information || {},
        creditsUsed: 5,  // Structured API uses 5 credits
        timestamp: new Date().toISOString(),
        source: 'Google SERP (ScraperAPI Structured API)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[Keyword Ads] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract ads from ScraperAPI's structured response
   */
  extractAdsFromSERP(json) {
    const ads = [];
    
    // Top Ads (ads_results or top_ads)
    const topAds = json.ads || json.ads_results || json.top_ads || [];
    topAds.forEach((ad, i) => {
      ads.push({
        position: i + 1,
        type: 'top',
        title: ad.title || ad.headline || '',
        displayUrl: ad.displayed_link || ad.display_url || ad.visible_url || '',
        description: ad.description || ad.snippet || '',
        link: ad.link || ad.url || '',
        sitelinks: ad.sitelinks || [],
        isSponsored: true
      });
    });
    
    // Bottom Ads
    const bottomAds = json.bottom_ads || [];
    bottomAds.forEach((ad, i) => {
      ads.push({
        position: topAds.length + i + 1,
        type: 'bottom',
        title: ad.title || ad.headline || '',
        displayUrl: ad.displayed_link || ad.display_url || '',
        description: ad.description || ad.snippet || '',
        link: ad.link || ad.url || '',
        isSponsored: true
      });
    });
    
    // Shopping Ads
    const shoppingAds = json.shopping_results || json.inline_shopping || [];
    shoppingAds.forEach((ad, i) => {
      ads.push({
        position: ads.length + 1,
        type: 'shopping',
        title: ad.title || ad.name || '',
        displayUrl: ad.source || ad.merchant || '',
        description: ad.price || '',
        link: ad.link || ad.url || '',
        image: ad.thumbnail || ad.image || '',
        price: ad.price || '',
        isSponsored: true
      });
    });

    console.log(`[Ads] Found: ${topAds.length} top, ${bottomAds.length} bottom, ${shoppingAds.length} shopping`);
    
    return ads;
  }

  /**
   * Search multiple keywords
   */
  async searchMultipleKeywords(keywords, apiKey, options = {}) {
    const results = [];
    const maxKw = Math.min(keywords.length, 5);
    
    for (let i = 0; i < maxKw; i++) {
      console.log(`\n[Batch] Keyword ${i + 1}/${maxKw}: "${keywords[i]}"`);
      const result = await this.searchKeywordAds(keywords[i], apiKey, options);
      results.push({ keyword: keywords[i], ...result });
      
      // 1 second delay between requests
      if (i < maxKw - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    return {
      success: true,
      totalKeywords: results.length,
      totalAdsFound: results.reduce((sum, r) => sum + (r.totalAds || 0), 0),
      results,
      creditsUsed: results.length * 5
    };
  }


  /* ═══════════════════════════════════════════════════════════════════
     COMPETITOR ADS (Google Ads Transparency Center)
     Uses autoparse=true for structured response
     ═══════════════════════════════════════════════════════════════════ */

  async getCompetitorAds(domain, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[Competitor] Analyzing: ${domain}`);
    console.log(`${'═'.repeat(55)}`);

    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'ScraperAPI key required',
        setupUrl: 'https://www.scraperapi.com/signup'
      };
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    // Use ScraperAPI with render=true for Transparency Center
    const targetUrl = `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
    const apiUrl = `http://api.scraperapi.com/?` +
      `api_key=${apiKey}` +
      `&url=${encodeURIComponent(targetUrl)}` +
      `&render=true` +
      `&country_code=${country}`;
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status !== 200) {
        return { 
          success: false, 
          error: `HTTP_${response.status}`,
          message: 'Failed to fetch transparency data',
          manualUrl: targetUrl
        };
      }

      // Parse the HTML response
      const result = this.parseTransparencyHTML(response.data, cleanDomain);
      
      // If found an advertiser, get their ads
      if (result.advertiserId) {
        const adsUrl = `https://adstransparency.google.com/advertiser/${result.advertiserId}?region=anywhere`;
        const adsApiUrl = `http://api.scraperapi.com/?` +
          `api_key=${apiKey}` +
          `&url=${encodeURIComponent(adsUrl)}` +
          `&render=true` +
          `&country_code=${country}`;
        
        console.log(`[Competitor] Getting ads for: ${result.advertiserId}`);
        
        const adsResponse = await this.makeRequest(adsApiUrl);
        if (adsResponse.status === 200) {
          result.ads = this.parseAdsHTML(adsResponse.data, result.advertiserId);
        }
      }

      const ads = result.ads || [];
      
      return {
        success: result.advertiserId ? true : false,
        domain: cleanDomain,
        advertiser: result.advertiserId ? {
          id: result.advertiserId,
          name: result.advertiserName || cleanDomain,
          transparencyUrl: `https://adstransparency.google.com/advertiser/${result.advertiserId}`
        } : null,
        summary: {
          totalAds: ads.length,
          textAds: ads.filter(a => a.format === 'text').length,
          imageAds: ads.filter(a => a.format === 'image').length,
          videoAds: ads.filter(a => a.format === 'video').length
        },
        ads: ads.slice(0, 50),
        creditsUsed: 20,
        source: 'Google Ads Transparency Center',
        manualUrl: targetUrl
      };

    } catch (error) {
      console.error('[Competitor] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse Transparency Center HTML
   */
  parseTransparencyHTML(html, domain) {
    // Find advertiser ID (AR + 17+ digits)
    const idMatch = html.match(/AR\d{17,}/);
    const advertiserId = idMatch ? idMatch[0] : null;
    
    console.log(`[Parse] Advertiser ID: ${advertiserId || 'Not found'}`);
    
    return {
      advertiserId,
      advertiserName: domain,
      ads: []
    };
  }

  /**
   * Parse ads from Transparency page HTML
   */
  parseAdsHTML(html, advertiserId) {
    const ads = [];
    
    // Find creative IDs (CR + 17+ digits)
    const creativeIds = [...new Set(html.match(/CR\d{17,}/g) || [])];
    
    // Find image URLs
    const imageUrls = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
    
    console.log(`[Parse] Found ${creativeIds.length} creatives, ${imageUrls.length} images`);
    
    creativeIds.forEach((id, i) => {
      let format = 'text';
      if (imageUrls[i]) format = 'image';
      
      // Check for video
      const idx = html.indexOf(id);
      if (idx > -1) {
        const context = html.substring(Math.max(0, idx - 200), Math.min(html.length, idx + 200));
        if (context.toLowerCase().includes('video')) format = 'video';
      }
      
      ads.push({
        id,
        position: i + 1,
        format,
        imageUrl: imageUrls[i] || null,
        previewUrl: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${id}`
      });
    });

    return ads;
  }

  /**
   * Test API key
   */
  async testApiKey(apiKey) {
    if (!apiKey) return { valid: false, error: 'No API key provided' };
    
    try {
      const url = `http://api.scraperapi.com/?api_key=${apiKey}&url=https://httpbin.org/ip`;
      const response = await this.makeRequest(url);
      
      if (response.status === 200) {
        return { valid: true, message: 'API key is working!' };
      } else if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      } else {
        return { valid: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsIntelligence();
