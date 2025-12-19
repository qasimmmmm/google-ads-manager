/* ═══════════════════════════════════════════════════════════════════
   Google Ads Intelligence v5.0
   
   FIXES FOR AD DETECTION:
   1. Use premium=true for residential IPs (better ad detection)
   2. Rotate user agents
   3. Multiple search attempts with different settings
   
   COMPETITOR ANALYSIS ALTERNATIVES:
   Since Google Ads Transparency blocks bots, we use:
   1. Search brand name in Google to find their live ads
   2. Search "[brand] reviews" to find shopping ads
   3. Provide links to Meta Ad Library, LinkedIn Ads, etc.
   
   ScraperAPI: https://www.scraperapi.com/signup
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Make HTTP request
   */
  makeRequest(url, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const logUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
      console.log(`[Request] ${logUrl.substring(0, 150)}...`);
      
      const req = client.get(url, { timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Response] Status: ${res.statusCode}, Size: ${data.length}`);
          resolve({ status: res.statusCode, data });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════════
     KEYWORD ADS SEARCH - With Premium IPs for better detection
     
     Credit costs:
     - Standard: 5 credits (may miss some ads)
     - Premium: 10 credits (residential IPs, better ad detection)
     - Premium + Render: 25 credits (best results)
     ═══════════════════════════════════════════════════════════════════ */

  async searchKeywordAds(keyword, apiKey, options = {}) {
    const { country = 'us', usePremium = true } = options;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Keyword Ads] Searching: "${keyword}" | Country: ${country} | Premium: ${usePremium}`);
    console.log(`${'═'.repeat(60)}`);

    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY', message: 'ScraperAPI key required' };
    }

    // Try multiple methods until we get ads
    let result;
    
    // Method 1: Structured API with premium (best for ads)
    result = await this.tryStructuredApiPremium(keyword, apiKey, country, usePremium);
    if (result.totalAds > 0) return result;
    
    // Method 2: Autoparse with premium
    console.log('[Keyword Ads] Method 1 found no ads, trying Method 2...');
    result = await this.tryAutoparsePremium(keyword, apiKey, country, usePremium);
    if (result.totalAds > 0) return result;
    
    // Method 3: Render mode (JavaScript rendering)
    console.log('[Keyword Ads] Method 2 found no ads, trying Method 3 with render...');
    result = await this.tryRenderMode(keyword, apiKey, country);
    
    return result;
  }

  /**
   * Method 1: Structured API with Premium IPs
   */
  async tryStructuredApiPremium(keyword, apiKey, country, usePremium) {
    // Build URL with premium parameter
    let apiUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(keyword)}` +
      `&country=${country}` +
      `&tld=com` +
      `&num=20` +
      `&hl=en`;
    
    // Add premium for residential IPs (costs 10 credits instead of 5)
    if (usePremium) {
      apiUrl += '&premium=true';
    }
    
    console.log(`[Method 1] Structured API ${usePremium ? '+ Premium IPs' : ''}`);
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', totalAds: 0 };
      }
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}`, totalAds: 0 };
      }

      let json;
      try {
        json = JSON.parse(response.data);
      } catch (e) {
        return { success: false, error: 'PARSE_ERROR', totalAds: 0 };
      }

      const allAds = this.extractAllAdTypes(json);
      
      return this.buildResponse(keyword, country, allAds, json, 'Structured API + Premium', usePremium ? 10 : 5);

    } catch (error) {
      console.error('[Method 1] Error:', error.message);
      return { success: false, error: error.message, totalAds: 0 };
    }
  }

  /**
   * Method 2: Autoparse with Premium
   */
  async tryAutoparsePremium(keyword, apiKey, country, usePremium) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en&gl=${country}&num=20`;
    
    let apiUrl = `http://api.scraperapi.com/?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&url=${encodeURIComponent(googleUrl)}` +
      `&autoparse=true` +
      `&country_code=${country}`;
    
    if (usePremium) {
      apiUrl += '&premium=true';
    }
    
    console.log(`[Method 2] Autoparse ${usePremium ? '+ Premium IPs' : ''}`);
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status !== 200) {
        return { success: false, totalAds: 0 };
      }

      let json;
      try {
        json = JSON.parse(response.data);
      } catch (e) {
        return { success: false, totalAds: 0 };
      }

      const allAds = this.extractAllAdTypes(json);
      
      return this.buildResponse(keyword, country, allAds, json, 'Autoparse + Premium', usePremium ? 10 : 5);

    } catch (error) {
      return { success: false, error: error.message, totalAds: 0 };
    }
  }

  /**
   * Method 3: Render mode with JavaScript execution
   */
  async tryRenderMode(keyword, apiKey, country) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en&gl=${country}&num=20`;
    
    // Use render=true for full JavaScript rendering
    const apiUrl = `http://api.scraperapi.com/?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&url=${encodeURIComponent(googleUrl)}` +
      `&render=true` +
      `&country_code=${country}` +
      `&premium=true`;  // Premium + Render = 25 credits but best results
    
    console.log('[Method 3] Render mode + Premium');
    
    try {
      const response = await this.makeRequest(apiUrl, 90000);
      
      if (response.status !== 200) {
        return this.buildEmptyResponse(keyword, country, 'No ads found after all methods');
      }

      // Parse HTML for ads
      const allAds = this.parseHtmlForAds(response.data, keyword);
      
      return this.buildResponse(keyword, country, allAds, {}, 'Render + Premium', 25);

    } catch (error) {
      return this.buildEmptyResponse(keyword, country, error.message);
    }
  }

  /**
   * Parse raw HTML for ads (fallback method)
   */
  parseHtmlForAds(html, keyword) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const all = [];
    
    try {
      // Look for sponsored/ad markers
      const hasAds = html.toLowerCase().includes('sponsored') || 
                     html.includes('data-text-ad') ||
                     html.includes('googleadservices');
      
      if (!hasAds) {
        console.log('[HTML Parse] No ad markers found');
        return { searchAds, shoppingAds, localAds, all };
      }
      
      // Split by "Sponsored" to find ad sections
      const parts = html.split(/Sponsored|Sponsorisé/i);
      console.log(`[HTML Parse] Found ${parts.length - 1} potential ad sections`);
      
      parts.slice(1).forEach((part, idx) => {
        const section = part.substring(0, 3000);
        
        // Extract title
        let title = '';
        const titleMatch = section.match(/<h3[^>]*>([^<]+)<\/h3>/i) ||
                          section.match(/role="heading"[^>]*>([^<]+)</i) ||
                          section.match(/<div[^>]*data-text-ad[^>]*>([^<]+)/i);
        if (titleMatch) title = this.cleanText(titleMatch[1]);
        
        // Extract URL
        let displayUrl = '';
        const urlMatch = section.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|io|co)[^\s<"']*)/i);
        if (urlMatch) displayUrl = urlMatch[1].split('/')[0];
        
        // Extract description
        let description = '';
        const descMatch = section.match(/<span[^>]*>([^<]{30,200})<\/span>/i);
        if (descMatch) description = this.cleanText(descMatch[1]);
        
        // Extract link
        let link = '';
        const linkMatch = section.match(/href="(https?:\/\/[^"]+)"/i);
        if (linkMatch) link = linkMatch[1];
        
        if (title || displayUrl) {
          const adData = {
            position: idx + 1,
            type: 'search',
            placement: idx < 4 ? 'top' : 'bottom',
            title: title || `Ad #${idx + 1}`,
            displayUrl: displayUrl || '',
            description: description || '',
            link: link || '',
            hasCallExtension: section.toLowerCase().includes('call')
          };
          searchAds.push(adData);
          all.push(adData);
        }
      });
      
      // Look for shopping ads
      const shoppingMatch = html.match(/shopping[_-]?results|product[_-]?card/gi);
      if (shoppingMatch) {
        console.log('[HTML Parse] Shopping section detected');
      }

    } catch (e) {
      console.error('[HTML Parse] Error:', e.message);
    }
    
    console.log(`[HTML Parse] Extracted: ${searchAds.length} search, ${shoppingAds.length} shopping`);
    
    return { searchAds, shoppingAds, localAds, all };
  }

  /**
   * Build standardized response
   */
  buildResponse(keyword, country, allAds, json, method, credits) {
    return {
      success: true,
      keyword,
      country,
      method,
      totalAds: allAds.all.length,
      searchAdsCount: allAds.searchAds.length,
      shoppingAdsCount: allAds.shoppingAds.length,
      localAdsCount: allAds.localAds.length,
      searchAds: allAds.searchAds,
      shoppingAds: allAds.shoppingAds,
      localAds: allAds.localAds,
      allAds: allAds.all,
      organicCount: (json.organic_results || []).length,
      relatedSearches: this.extractRelatedSearches(json),
      creditsUsed: credits,
      timestamp: new Date().toISOString(),
      source: `Google SERP (${method})`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
    };
  }

  buildEmptyResponse(keyword, country, message) {
    return {
      success: true,
      keyword,
      country,
      totalAds: 0,
      searchAdsCount: 0,
      shoppingAdsCount: 0,
      localAdsCount: 0,
      searchAds: [],
      shoppingAds: [],
      localAds: [],
      allAds: [],
      organicCount: 0,
      relatedSearches: [],
      creditsUsed: 25,
      timestamp: new Date().toISOString(),
      message: message || 'No ads found. Try a different keyword or check Google directly.',
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
    };
  }

  /**
   * Extract ALL ad types from JSON response
   */
  extractAllAdTypes(json) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const all = [];
    
    // Log available fields for debugging
    console.log('[Extract] Response fields:', Object.keys(json).join(', '));
    
    // 1. SEARCH ADS
    const adFields = ['ads', 'ads_results', 'top_ads', 'ad_results', 'paid_results'];
    for (const field of adFields) {
      if (json[field] && Array.isArray(json[field]) && json[field].length > 0) {
        console.log(`[Extract] Found ${json[field].length} ads in '${field}'`);
        json[field].forEach((ad, i) => {
          const adData = this.parseSearchAd(ad, i, 'top');
          if (adData.title || adData.displayUrl) {
            searchAds.push(adData);
            all.push(adData);
          }
        });
        break;
      }
    }
    
    // Bottom ads
    if (json.bottom_ads && Array.isArray(json.bottom_ads)) {
      json.bottom_ads.forEach((ad, i) => {
        const adData = this.parseSearchAd(ad, searchAds.length + i, 'bottom');
        if (adData.title || adData.displayUrl) {
          searchAds.push(adData);
          all.push(adData);
        }
      });
    }
    
    // 2. SHOPPING ADS
    const shoppingFields = ['shopping_results', 'inline_shopping', 'shopping_ads', 'inline_products'];
    for (const field of shoppingFields) {
      if (json[field] && Array.isArray(json[field]) && json[field].length > 0) {
        console.log(`[Extract] Found ${json[field].length} shopping ads in '${field}'`);
        json[field].forEach((ad, i) => {
          const adData = this.parseShoppingAd(ad, i);
          if (adData.title) {
            shoppingAds.push(adData);
            all.push(adData);
          }
        });
        break;
      }
    }
    
    // 3. LOCAL ADS
    const localFields = ['local_results', 'local_pack', 'places_results'];
    for (const field of localFields) {
      if (json[field] && Array.isArray(json[field]) && json[field].length > 0) {
        console.log(`[Extract] Found ${json[field].length} local results in '${field}'`);
        json[field].forEach((ad, i) => {
          const adData = this.parseLocalAd(ad, i);
          localAds.push(adData);
          if (adData.isSponsored) {
            all.push(adData);
          }
        });
        break;
      }
    }
    
    console.log(`[Extract] Total: ${searchAds.length} search, ${shoppingAds.length} shopping, ${localAds.length} local`);
    
    return { searchAds, shoppingAds, localAds, all };
  }

  parseSearchAd(ad, index, placement) {
    return {
      position: index + 1,
      type: 'search',
      placement,
      title: ad.title || ad.headline || '',
      displayUrl: ad.displayed_link || ad.display_url || ad.visible_url || '',
      description: ad.description || ad.snippet || '',
      link: ad.link || ad.url || '',
      sitelinks: (ad.sitelinks || []).slice(0, 4).map(s => ({ title: s.title, link: s.link })),
      phone: ad.phone || this.extractPhoneFromExtensions(ad),
      hasCallExtension: !!(ad.phone || (ad.extensions || []).some(e => 
        typeof e === 'string' && e.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)
      ))
    };
  }

  parseShoppingAd(ad, index) {
    return {
      position: index + 1,
      type: 'shopping',
      placement: 'shopping',
      title: ad.title || ad.name || '',
      displayUrl: ad.source || ad.merchant || ad.seller || '',
      price: ad.price || ad.extracted_price || '',
      originalPrice: ad.original_price || '',
      rating: ad.rating || ad.stars || null,
      reviews: ad.reviews || ad.reviews_count || null,
      link: ad.link || ad.url || '',
      image: ad.thumbnail || ad.image || '',
      shipping: ad.shipping || '',
      badge: ad.badge || ad.tag || ''
    };
  }

  parseLocalAd(ad, index) {
    const isSponsored = ad.sponsored || ad.ad || ad.label === 'Ad';
    return {
      position: index + 1,
      type: 'local',
      placement: 'local_pack',
      isSponsored,
      title: ad.title || ad.name || '',
      displayUrl: ad.website || '',
      address: ad.address || '',
      phone: ad.phone || ad.phone_number || '',
      rating: ad.rating || null,
      reviews: ad.reviews || null,
      hours: ad.hours || '',
      category: ad.type || ad.category || '',
      link: ad.link || ad.website || '',
      hasCallButton: !!(ad.phone || ad.phone_number)
    };
  }

  extractPhoneFromExtensions(ad) {
    const extensions = ad.extensions || [];
    for (const ext of extensions) {
      if (typeof ext === 'string') {
        const match = ext.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (match) return match[0];
      }
    }
    return null;
  }

  extractRelatedSearches(json) {
    for (const field of ['related_searches', 'related_queries']) {
      if (json[field] && Array.isArray(json[field])) {
        return json[field].map(r => r.query || r.title || r).slice(0, 10);
      }
    }
    return [];
  }

  cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  /**
   * Search multiple keywords
   */
  async searchMultipleKeywords(keywords, apiKey, options = {}) {
    const results = [];
    const maxKw = Math.min(keywords.length, 5);
    
    for (let i = 0; i < maxKw; i++) {
      const result = await this.searchKeywordAds(keywords[i], apiKey, options);
      results.push({ keyword: keywords[i], ...result });
      if (i < maxKw - 1) await new Promise(r => setTimeout(r, 2000));
    }
    
    return {
      success: true,
      totalKeywords: results.length,
      totalAdsFound: results.reduce((sum, r) => sum + (r.totalAds || 0), 0),
      results,
      creditsUsed: results.reduce((sum, r) => sum + (r.creditsUsed || 0), 0)
    };
  }


  /* ═══════════════════════════════════════════════════════════════════
     COMPETITOR ANALYSIS - Alternative Methods
     
     Since Google Ads Transparency Center blocks bots, we use:
     1. Search for brand name to find their Google Ads
     2. Search for "[brand] buy" to find shopping ads
     3. Provide links to other ad libraries (Meta, LinkedIn, etc.)
     ═══════════════════════════════════════════════════════════════════ */

  async getCompetitorAds(domain, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Competitor] Analyzing: ${domain}`);
    console.log(`${'═'.repeat(60)}`);

    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY', message: 'ScraperAPI key required' };
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    const brandName = cleanDomain.split('.')[0];
    
    // Strategy: Run multiple searches to find competitor's ads
    const searches = [
      { query: cleanDomain, type: 'domain' },
      { query: brandName, type: 'brand' },
      { query: `${brandName} official`, type: 'official' },
      { query: `buy ${brandName}`, type: 'commercial' }
    ];
    
    let allFoundAds = [];
    let creditsUsed = 0;
    
    for (const search of searches) {
      console.log(`[Competitor] Searching: "${search.query}"`);
      
      const result = await this.searchKeywordAds(search.query, apiKey, { country, usePremium: true });
      creditsUsed += result.creditsUsed || 10;
      
      if (result.success && result.allAds) {
        // Filter ads that match the brand/domain
        const matchingAds = result.allAds.filter(ad => {
          const adText = `${ad.displayUrl} ${ad.title} ${ad.description}`.toLowerCase();
          return adText.includes(brandName.toLowerCase()) || 
                 adText.includes(cleanDomain.toLowerCase());
        });
        
        matchingAds.forEach(ad => {
          ad.foundVia = search.type;
          if (!allFoundAds.find(a => a.title === ad.title && a.displayUrl === ad.displayUrl)) {
            allFoundAds.push(ad);
          }
        });
      }
      
      // Stop if we have enough ads
      if (allFoundAds.length >= 10) break;
      
      // Small delay between searches
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[Competitor] Found ${allFoundAds.length} total ads for ${cleanDomain}`);

    return {
      success: allFoundAds.length > 0,
      domain: cleanDomain,
      brandName,
      summary: {
        totalAds: allFoundAds.length,
        searchAds: allFoundAds.filter(a => a.type === 'search').length,
        shoppingAds: allFoundAds.filter(a => a.type === 'shopping').length,
        localAds: allFoundAds.filter(a => a.type === 'local').length
      },
      ads: allFoundAds,
      
      // Alternative ad libraries the user can check manually
      alternativeLibraries: [
        {
          name: 'Meta Ad Library',
          description: 'See Facebook & Instagram ads',
          url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(brandName)}&media_type=all`
        },
        {
          name: 'Google Ads Transparency',
          description: 'Official Google ad archive (may need manual access)',
          url: `https://adstransparency.google.com/?domain=${cleanDomain}`
        },
        {
          name: 'LinkedIn Ad Library',
          description: 'See LinkedIn ads',
          url: `https://www.linkedin.com/ad-library/search?q=${encodeURIComponent(brandName)}`
        },
        {
          name: 'TikTok Ad Library',
          description: 'See TikTok ads',
          url: `https://library.tiktok.com/ads?region=US&keyword=${encodeURIComponent(brandName)}`
        }
      ],
      
      creditsUsed,
      source: 'Google Search (brand searches)',
      timestamp: new Date().toISOString(),
      message: allFoundAds.length > 0 
        ? `Found ${allFoundAds.length} ads by searching for "${brandName}" on Google`
        : `No Google Ads found. Check the alternative ad libraries below.`
    };
  }

  /**
   * Test API key
   */
  async testApiKey(apiKey) {
    if (!apiKey) return { valid: false, error: 'No API key' };
    
    try {
      const url = `http://api.scraperapi.com/?api_key=${apiKey}&url=https://httpbin.org/ip`;
      const response = await this.makeRequest(url, 30000);
      
      if (response.status === 200) return { valid: true, message: 'API key works!' };
      if (response.status === 401) return { valid: false, error: 'Invalid API key' };
      return { valid: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsIntelligence();
