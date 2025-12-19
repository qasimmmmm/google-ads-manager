/* ═══════════════════════════════════════════════════════════════════
   Google Ads Intelligence v4.0 - FIXED
   
   FIXES:
   - Use 'country' parameter (not 'country_code') for structured API
   - Better response parsing
   - Fallback to autoparse endpoint
   - Better debugging/logging
   
   ScraperAPI FREE: https://www.scraperapi.com/signup
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  /**
   * Make HTTP request with full response logging
   */
  makeRequest(url, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      // Log URL (hide API key)
      const logUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
      console.log(`[Request] ${logUrl.substring(0, 120)}...`);
      
      const req = client.get(url, { timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Response] Status: ${res.statusCode}, Size: ${data.length} bytes`);
          
          // Log first 500 chars of response for debugging
          if (data.length > 0) {
            console.log(`[Response Preview] ${data.substring(0, 500)}...`);
          }
          
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
     KEYWORD ADS SEARCH - Fixed with correct parameters
     ═══════════════════════════════════════════════════════════════════ */

  async searchKeywordAds(keyword, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Keyword Ads] Searching: "${keyword}" in ${country.toUpperCase()}`);
    console.log(`${'═'.repeat(60)}`);

    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY', message: 'ScraperAPI key required' };
    }

    // Try Method 1: Structured Google SERP API
    // IMPORTANT: Use 'country' not 'country_code'
    let result = await this.tryStructuredApi(keyword, apiKey, country);
    
    // If no ads found, try Method 2: Autoparse
    if (!result.success || result.totalAds === 0) {
      console.log('[Keyword Ads] Structured API returned no ads, trying autoparse...');
      result = await this.tryAutoparseApi(keyword, apiKey, country);
    }
    
    return result;
  }

  /**
   * Method 1: ScraperAPI Structured Google SERP API
   */
  async tryStructuredApi(keyword, apiKey, country) {
    // FIXED: Use 'country' parameter (not 'country_code')
    const apiUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(keyword)}` +
      `&country=${country}` +  // FIXED: was country_code
      `&tld=com` +
      `&num=20` +
      `&hl=en`;
    
    console.log('[Method 1] Using Structured Google SERP API');
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', message: 'Invalid API key' };
      }
      
      if (response.status === 403) {
        return { success: false, error: 'QUOTA_EXCEEDED', message: 'API quota exceeded' };
      }
      
      if (response.status !== 200) {
        console.log(`[Method 1] Failed with status ${response.status}`);
        return { success: false, error: `HTTP_${response.status}` };
      }

      // Parse JSON
      let json;
      try {
        json = JSON.parse(response.data);
        console.log('[Method 1] JSON keys:', Object.keys(json).join(', '));
      } catch (e) {
        console.error('[Method 1] JSON parse error:', e.message);
        return { success: false, error: 'PARSE_ERROR' };
      }

      // Extract ALL ad types
      const allAds = this.extractAllAdTypes(json);
      
      return {
        success: true,
        keyword,
        country,
        method: 'structured',
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
        peopleAlsoAsk: (json.related_questions || json.people_also_ask || []).slice(0, 5),
        creditsUsed: 5,
        timestamp: new Date().toISOString(),
        source: 'Google SERP (ScraperAPI Structured)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[Method 1] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 2: ScraperAPI with autoparse=true (fallback)
   */
  async tryAutoparseApi(keyword, apiKey, country) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en&gl=${country}&num=20`;
    
    // Use autoparse for automatic parsing
    const apiUrl = `http://api.scraperapi.com/?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&url=${encodeURIComponent(googleUrl)}` +
      `&autoparse=true` +
      `&country_code=${country}`;
    
    console.log('[Method 2] Using Autoparse API');
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status !== 200) {
        console.log(`[Method 2] Failed with status ${response.status}`);
        return { success: false, error: `HTTP_${response.status}` };
      }

      let json;
      try {
        json = JSON.parse(response.data);
        console.log('[Method 2] JSON keys:', Object.keys(json).join(', '));
      } catch (e) {
        console.error('[Method 2] JSON parse error');
        return { success: false, error: 'PARSE_ERROR' };
      }

      const allAds = this.extractAllAdTypes(json);
      
      return {
        success: true,
        keyword,
        country,
        method: 'autoparse',
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
        creditsUsed: 5,
        timestamp: new Date().toISOString(),
        source: 'Google SERP (ScraperAPI Autoparse)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[Method 2] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract ALL ad types from SERP response
   * Handles multiple possible field names
   */
  extractAllAdTypes(json) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const all = [];
    
    console.log('[Extract] Looking for ads in response...');
    
    // 1. SEARCH ADS - Check multiple possible field names
    const adFields = ['ads', 'ads_results', 'top_ads', 'ad_results', 'paid_results', 'sponsored_results'];
    let topAds = [];
    
    for (const field of adFields) {
      if (json[field] && Array.isArray(json[field]) && json[field].length > 0) {
        console.log(`[Extract] Found ads in field: ${field} (${json[field].length} items)`);
        topAds = json[field];
        break;
      }
    }
    
    topAds.forEach((ad, i) => {
      const adData = {
        position: i + 1,
        type: 'search',
        placement: 'top',
        title: ad.title || ad.headline || ad.text || '',
        displayUrl: ad.displayed_link || ad.display_url || ad.visible_url || ad.domain || '',
        description: ad.description || ad.snippet || ad.body || '',
        link: ad.link || ad.url || ad.href || '',
        sitelinks: (ad.sitelinks || ad.sitelinks_inline || []).map(s => ({ 
          title: s.title || s.text, 
          link: s.link || s.url 
        })),
        extensions: ad.extensions || [],
        phone: this.extractPhone(ad),
        hasCallExtension: this.hasCallExtension(ad)
      };
      
      if (adData.title || adData.displayUrl) {
        searchAds.push(adData);
        all.push(adData);
      }
    });
    
    // 2. BOTTOM ADS
    const bottomFields = ['bottom_ads', 'bottom_ad_results'];
    let bottomAds = [];
    
    for (const field of bottomFields) {
      if (json[field] && Array.isArray(json[field])) {
        bottomAds = json[field];
        console.log(`[Extract] Found bottom ads: ${bottomAds.length}`);
        break;
      }
    }
    
    bottomAds.forEach((ad, i) => {
      const adData = {
        position: topAds.length + i + 1,
        type: 'search',
        placement: 'bottom',
        title: ad.title || '',
        displayUrl: ad.displayed_link || ad.display_url || '',
        description: ad.description || ad.snippet || '',
        link: ad.link || ad.url || '',
        phone: this.extractPhone(ad),
        hasCallExtension: this.hasCallExtension(ad)
      };
      
      if (adData.title || adData.displayUrl) {
        searchAds.push(adData);
        all.push(adData);
      }
    });
    
    // 3. SHOPPING ADS
    const shoppingFields = ['shopping_results', 'inline_shopping', 'shopping_ads', 'product_results', 'inline_products'];
    let shopping = [];
    
    for (const field of shoppingFields) {
      if (json[field] && Array.isArray(json[field])) {
        shopping = json[field];
        console.log(`[Extract] Found shopping ads in: ${field} (${shopping.length} items)`);
        break;
      }
    }
    
    shopping.forEach((ad, i) => {
      const adData = {
        position: i + 1,
        type: 'shopping',
        placement: 'shopping',
        title: ad.title || ad.name || ad.product_title || '',
        displayUrl: ad.source || ad.merchant || ad.seller || ad.store || '',
        price: ad.price || ad.extracted_price || '',
        originalPrice: ad.original_price || ad.old_price || '',
        rating: ad.rating || ad.stars || ad.review_rating || null,
        reviews: ad.reviews || ad.reviews_count || ad.review_count || null,
        link: ad.link || ad.url || ad.product_link || '',
        image: ad.thumbnail || ad.image || ad.product_image || '',
        shipping: ad.shipping || ad.delivery || '',
        badge: ad.badge || ad.tag || ad.label || ''
      };
      
      if (adData.title) {
        shoppingAds.push(adData);
        all.push(adData);
      }
    });
    
    // 4. LOCAL/MAP ADS
    const localFields = ['local_results', 'local_pack', 'places_results', 'local_ads', 'map_results'];
    let localPack = [];
    
    for (const field of localFields) {
      if (json[field] && Array.isArray(json[field])) {
        localPack = json[field];
        console.log(`[Extract] Found local results in: ${field} (${localPack.length} items)`);
        break;
      }
    }
    
    localPack.forEach((ad, i) => {
      const isSponsored = ad.sponsored || ad.ad || ad.is_ad || 
                          ad.label === 'Ad' || ad.label === 'Sponsored' ||
                          (ad.extensions && ad.extensions.includes('Ad'));
      
      const adData = {
        position: i + 1,
        type: 'local',
        placement: 'local_pack',
        isSponsored,
        title: ad.title || ad.name || ad.business_name || '',
        displayUrl: ad.website || ad.link || '',
        address: ad.address || ad.location || '',
        phone: ad.phone || ad.phone_number || '',
        rating: ad.rating || ad.stars || null,
        reviews: ad.reviews || ad.reviews_count || null,
        hours: ad.hours || ad.opening_hours || '',
        category: ad.type || ad.category || ad.business_type || '',
        link: ad.link || ad.website || '',
        directions: ad.directions || ad.directions_link || '',
        hasCallButton: !!(ad.phone || ad.phone_number)
      };
      
      if (adData.title) {
        localAds.push(adData);
        // Only add to all[] if sponsored
        if (isSponsored) {
          all.push(adData);
        }
      }
    });
    
    console.log(`[Extract] Total: ${searchAds.length} search, ${shoppingAds.length} shopping, ${localAds.length} local`);
    
    return { searchAds, shoppingAds, localAds, all };
  }

  /**
   * Extract related searches
   */
  extractRelatedSearches(json) {
    const fields = ['related_searches', 'related_queries', 'searches_related'];
    
    for (const field of fields) {
      if (json[field] && Array.isArray(json[field])) {
        return json[field].map(r => r.query || r.title || r.text || r).slice(0, 10);
      }
    }
    
    return [];
  }

  /**
   * Extract phone from ad
   */
  extractPhone(ad) {
    if (ad.phone) return ad.phone;
    if (ad.phone_number) return ad.phone_number;
    
    const extensions = ad.extensions || [];
    for (const ext of extensions) {
      if (typeof ext === 'string') {
        const match = ext.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (match) return match[0];
      }
      if (ext && ext.phone) return ext.phone;
    }
    
    const desc = ad.description || ad.snippet || '';
    const phoneMatch = desc.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) return phoneMatch[0];
    
    return null;
  }

  /**
   * Check for call extension
   */
  hasCallExtension(ad) {
    if (ad.phone || ad.phone_number) return true;
    
    const extensions = ad.extensions || [];
    for (const ext of extensions) {
      if (typeof ext === 'string' && ext.toLowerCase().includes('call')) return true;
      if (ext && (ext.type === 'call' || ext.call)) return true;
    }
    
    return false;
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
      creditsUsed: results.length * 5
    };
  }


  /* ═══════════════════════════════════════════════════════════════════
     COMPETITOR ANALYSIS - Google Ads Transparency Center
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
    
    // Method 1: Search Google for the brand name to find their ads
    console.log('[Competitor] Method 1: Searching brand in Google...');
    
    const brandResult = await this.searchKeywordAds(cleanDomain, apiKey, { country });
    let adsFromSearch = [];
    
    if (brandResult.success && brandResult.allAds) {
      // Filter ads matching the domain
      adsFromSearch = brandResult.allAds.filter(ad => {
        const adDomain = (ad.displayUrl || ad.link || '').toLowerCase();
        const searchDomain = cleanDomain.toLowerCase().split('.')[0];
        return adDomain.includes(searchDomain);
      });
      console.log(`[Competitor] Found ${adsFromSearch.length} matching ads from search`);
    }
    
    // Method 2: Try Transparency Center
    console.log('[Competitor] Method 2: Trying Transparency Center...');
    
    const transparencyUrl = `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
    const scraperUrl = `http://api.scraperapi.com/?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&url=${encodeURIComponent(transparencyUrl)}` +
      `&render=true` +
      `&country_code=${country}`;
    
    let tcAds = [];
    let advertiserId = null;
    let advertiserName = cleanDomain;
    
    try {
      const tcResponse = await this.makeRequest(scraperUrl, 90000);
      
      if (tcResponse.status === 200) {
        // Find advertiser ID
        const idMatch = tcResponse.data.match(/AR\d{17,}/);
        if (idMatch) {
          advertiserId = idMatch[0];
          console.log(`[Competitor] Found advertiser: ${advertiserId}`);
          
          // Get ads for this advertiser
          const adsPageUrl = `https://adstransparency.google.com/advertiser/${advertiserId}?region=anywhere`;
          const adsScraperUrl = `http://api.scraperapi.com/?` +
            `api_key=${encodeURIComponent(apiKey)}` +
            `&url=${encodeURIComponent(adsPageUrl)}` +
            `&render=true` +
            `&country_code=${country}`;
          
          const adsResponse = await this.makeRequest(adsScraperUrl, 90000);
          
          if (adsResponse.status === 200) {
            // Find creative IDs
            const creativeIds = [...new Set(adsResponse.data.match(/CR\d{17,}/g) || [])];
            const imageUrls = adsResponse.data.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
            
            console.log(`[Competitor] Found ${creativeIds.length} creatives`);
            
            creativeIds.forEach((id, i) => {
              let format = 'text';
              if (imageUrls[i]) format = 'image';
              
              const idx = adsResponse.data.indexOf(id);
              if (idx > -1) {
                const context = adsResponse.data.substring(Math.max(0, idx - 200), Math.min(adsResponse.data.length, idx + 200)).toLowerCase();
                if (context.includes('video')) format = 'video';
              }
              
              tcAds.push({
                id,
                position: i + 1,
                format,
                imageUrl: imageUrls[i] || null,
                previewUrl: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${id}`,
                source: 'Transparency Center'
              });
            });
          }
        }
      }
    } catch (e) {
      console.error('[Competitor] Transparency Center error:', e.message);
    }

    const allAds = [...tcAds];
    const totalAds = allAds.length + adsFromSearch.length;
    const success = totalAds > 0 || advertiserId;

    return {
      success,
      domain: cleanDomain,
      advertiser: advertiserId ? {
        id: advertiserId,
        name: advertiserName,
        transparencyUrl: `https://adstransparency.google.com/advertiser/${advertiserId}`
      } : null,
      summary: {
        totalAds: allAds.length,
        textAds: allAds.filter(a => a.format === 'text').length,
        imageAds: allAds.filter(a => a.format === 'image').length,
        videoAds: allAds.filter(a => a.format === 'video').length,
        fromSearch: adsFromSearch.length
      },
      ads: allAds.slice(0, 50),
      adsFromSearch: adsFromSearch.slice(0, 10),
      creditsUsed: 25,
      source: 'Google Ads Transparency + Search',
      manualUrl: `https://adstransparency.google.com/?domain=${cleanDomain}`,
      message: success ? null : 'No ads found. The company may not be running Google Ads.'
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
