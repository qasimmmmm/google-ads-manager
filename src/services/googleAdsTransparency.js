/* ═══════════════════════════════════════════════════════════════════
   Google Ads Intelligence v3.0
   
   FEATURES:
   1. Keyword Ads Search - Shows ALL ad types:
      - Search Ads (text ads)
      - Shopping Ads (product listings)
      - Local/Map Ads (with call extensions)
      - Call-only Ads
      - Video Ads
   
   2. Competitor Analysis (Transparency Center)
   
   ScraperAPI FREE: https://www.scraperapi.com/signup
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  /**
   * Make HTTP request
   */
  makeRequest(url, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      console.log(`[Request] ${url.substring(0, 80)}...`);
      
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
     KEYWORD ADS SEARCH - Shows ALL Ad Types!
     Uses ScraperAPI Structured Google SERP API
     ═══════════════════════════════════════════════════════════════════ */

  async searchKeywordAds(keyword, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[Keyword Ads] Searching ALL ad types for: "${keyword}"`);
    console.log(`${'═'.repeat(55)}`);

    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY', message: 'ScraperAPI key required' };
    }

    // Use ScraperAPI Structured Google SERP API
    const apiUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(keyword)}` +
      `&country_code=${country}` +
      `&tld=com` +
      `&num=20`;
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', message: 'Invalid API key' };
      }
      
      if (response.status === 403) {
        return { success: false, error: 'QUOTA_EXCEEDED', message: 'API quota exceeded' };
      }
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}` };
      }

      // Parse JSON
      let json;
      try {
        json = JSON.parse(response.data);
      } catch (e) {
        return { success: false, error: 'PARSE_ERROR', message: 'Failed to parse response' };
      }

      // Extract ALL ad types
      const allAds = this.extractAllAdTypes(json);
      
      return {
        success: true,
        keyword,
        country,
        
        // Summary counts
        totalAds: allAds.all.length,
        searchAdsCount: allAds.searchAds.length,
        shoppingAdsCount: allAds.shoppingAds.length,
        localAdsCount: allAds.localAds.length,
        
        // All ads by type
        searchAds: allAds.searchAds,
        shoppingAds: allAds.shoppingAds,
        localAds: allAds.localAds,
        allAds: allAds.all,
        
        // Other data
        organicCount: (json.organic_results || []).length,
        relatedSearches: (json.related_searches || []).map(r => r.query || r).slice(0, 10),
        peopleAlsoAsk: (json.related_questions || json.people_also_ask || []).slice(0, 5),
        
        creditsUsed: 5,
        timestamp: new Date().toISOString(),
        source: 'Google SERP (ScraperAPI)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[Keyword Ads] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract ALL ad types from SERP response
   */
  extractAllAdTypes(json) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const all = [];
    
    // 1. SEARCH ADS (Top text ads)
    const topAds = json.ads || json.ads_results || json.top_ads || [];
    topAds.forEach((ad, i) => {
      const adData = {
        position: i + 1,
        type: 'search',
        placement: 'top',
        title: ad.title || ad.headline || '',
        displayUrl: ad.displayed_link || ad.display_url || ad.visible_url || '',
        description: ad.description || ad.snippet || '',
        link: ad.link || ad.url || '',
        sitelinks: (ad.sitelinks || []).map(s => ({ title: s.title, link: s.link })),
        extensions: ad.extensions || [],
        // Check for call extension
        phone: this.extractPhone(ad),
        hasCallExtension: this.hasCallExtension(ad)
      };
      searchAds.push(adData);
      all.push(adData);
    });
    
    // 2. BOTTOM ADS
    const bottomAds = json.bottom_ads || [];
    bottomAds.forEach((ad, i) => {
      const adData = {
        position: topAds.length + i + 1,
        type: 'search',
        placement: 'bottom',
        title: ad.title || '',
        displayUrl: ad.displayed_link || '',
        description: ad.description || '',
        link: ad.link || '',
        phone: this.extractPhone(ad),
        hasCallExtension: this.hasCallExtension(ad)
      };
      searchAds.push(adData);
      all.push(adData);
    });
    
    // 3. SHOPPING ADS (Product listings)
    const shopping = json.shopping_results || json.inline_shopping || json.shopping_ads || [];
    shopping.forEach((ad, i) => {
      const adData = {
        position: i + 1,
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
      shoppingAds.push(adData);
      all.push(adData);
    });
    
    // 4. LOCAL/MAP ADS (Local pack with potential call ads)
    const localPack = json.local_results || json.local_pack || json.places_results || [];
    localPack.forEach((ad, i) => {
      // Check if this is a sponsored local result
      const isSponsored = ad.sponsored || ad.ad || ad.label === 'Ad' || ad.label === 'Sponsored';
      
      const adData = {
        position: i + 1,
        type: 'local',
        placement: 'local_pack',
        isSponsored,
        title: ad.title || ad.name || '',
        displayUrl: ad.website || ad.link || '',
        address: ad.address || '',
        phone: ad.phone || ad.phone_number || '',
        rating: ad.rating || ad.stars || null,
        reviews: ad.reviews || ad.reviews_count || null,
        hours: ad.hours || ad.opening_hours || '',
        category: ad.type || ad.category || '',
        link: ad.link || ad.website || '',
        directions: ad.directions || '',
        hasCallButton: !!(ad.phone || ad.phone_number)
      };
      
      localAds.push(adData);
      if (isSponsored) {
        all.push(adData);
      }
    });
    
    // 5. Check for CALL-ONLY ADS in the ads
    // These are ads that only show a phone number
    topAds.forEach(ad => {
      if (ad.phone && !ad.link) {
        // This might be a call-only ad
        const existing = all.find(a => a.phone === ad.phone);
        if (existing) {
          existing.isCallOnly = true;
        }
      }
    });
    
    console.log(`[Ads] Found: ${searchAds.length} search, ${shoppingAds.length} shopping, ${localAds.length} local`);
    
    return { searchAds, shoppingAds, localAds, all };
  }

  /**
   * Extract phone number from ad
   */
  extractPhone(ad) {
    if (ad.phone) return ad.phone;
    if (ad.phone_number) return ad.phone_number;
    
    // Check extensions for phone
    const extensions = ad.extensions || [];
    for (const ext of extensions) {
      if (typeof ext === 'string' && ext.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) {
        return ext.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)[0];
      }
      if (ext.phone) return ext.phone;
    }
    
    // Check description for phone
    const desc = ad.description || ad.snippet || '';
    const phoneMatch = desc.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) return phoneMatch[0];
    
    return null;
  }

  /**
   * Check if ad has call extension
   */
  hasCallExtension(ad) {
    if (ad.phone || ad.phone_number) return true;
    
    const extensions = ad.extensions || [];
    for (const ext of extensions) {
      if (typeof ext === 'string' && ext.toLowerCase().includes('call')) return true;
      if (ext.type === 'call' || ext.call) return true;
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
      
      if (i < maxKw - 1) await new Promise(r => setTimeout(r, 1500));
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
     COMPETITOR ANALYSIS (Google Ads Transparency Center)
     Fixed version with better scraping
     ═══════════════════════════════════════════════════════════════════ */

  async getCompetitorAds(domain, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[Competitor] Analyzing: ${domain}`);
    console.log(`${'═'.repeat(55)}`);

    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY', message: 'ScraperAPI key required' };
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    // Method 1: Try searching Google for the company's ads using structured API
    // This is more reliable than scraping Transparency Center directly
    const brandSearchUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(cleanDomain)}` +
      `&country_code=${country}` +
      `&num=20`;
    
    try {
      console.log('[Competitor] Method 1: Searching brand name in Google...');
      
      const searchResponse = await this.makeRequest(brandSearchUrl);
      
      let adsFromSearch = [];
      if (searchResponse.status === 200) {
        try {
          const searchJson = JSON.parse(searchResponse.data);
          const allAds = this.extractAllAdTypes(searchJson);
          
          // Filter ads that match the domain
          adsFromSearch = allAds.all.filter(ad => {
            const adDomain = (ad.displayUrl || ad.link || '').toLowerCase();
            return adDomain.includes(cleanDomain.toLowerCase().split('.')[0]);
          });
          
          console.log(`[Competitor] Found ${adsFromSearch.length} matching ads from search`);
        } catch (e) {
          console.log('[Competitor] Could not parse search response');
        }
      }
      
      // Method 2: Try Transparency Center with render
      console.log('[Competitor] Method 2: Trying Transparency Center...');
      
      const transparencyUrl = `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
      const scraperUrl = `http://api.scraperapi.com/?` +
        `api_key=${encodeURIComponent(apiKey)}` +
        `&url=${encodeURIComponent(transparencyUrl)}` +
        `&render=true` +
        `&country_code=${country}` +
        `&wait_for_selector=.creative-preview`;
      
      const tcResponse = await this.makeRequest(scraperUrl, 90000);
      
      let tcAds = [];
      let advertiserId = null;
      let advertiserName = cleanDomain;
      
      if (tcResponse.status === 200) {
        // Parse Transparency Center HTML
        const parsed = this.parseTransparencyCenter(tcResponse.data, cleanDomain);
        advertiserId = parsed.advertiserId;
        advertiserName = parsed.advertiserName || cleanDomain;
        
        // If we found an advertiser, try to get their ads
        if (advertiserId) {
          console.log(`[Competitor] Found advertiser: ${advertiserId}`);
          
          const adsPageUrl = `https://adstransparency.google.com/advertiser/${advertiserId}?region=anywhere`;
          const adsScraperUrl = `http://api.scraperapi.com/?` +
            `api_key=${encodeURIComponent(apiKey)}` +
            `&url=${encodeURIComponent(adsPageUrl)}` +
            `&render=true` +
            `&country_code=${country}`;
          
          const adsResponse = await this.makeRequest(adsScraperUrl, 90000);
          
          if (adsResponse.status === 200) {
            tcAds = this.parseTransparencyAds(adsResponse.data, advertiserId);
          }
        }
      }
      
      // Combine results
      const allAds = [...tcAds];
      
      // Add search ads if no TC ads found
      if (allAds.length === 0 && adsFromSearch.length > 0) {
        adsFromSearch.forEach((ad, i) => {
          allAds.push({
            id: `search-${i}`,
            position: i + 1,
            format: ad.type === 'shopping' ? 'image' : 'text',
            title: ad.title,
            description: ad.description,
            displayUrl: ad.displayUrl,
            link: ad.link,
            source: 'Google Search'
          });
        });
      }

      const success = allAds.length > 0 || advertiserId;
      
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

    } catch (error) {
      console.error('[Competitor] Error:', error.message);
      return { 
        success: false, 
        error: error.message,
        manualUrl: `https://adstransparency.google.com/?domain=${cleanDomain}`
      };
    }
  }

  /**
   * Parse Transparency Center HTML for advertiser info
   */
  parseTransparencyCenter(html, domain) {
    let advertiserId = null;
    let advertiserName = domain;
    
    // Find advertiser ID (AR + 17+ digits)
    const idMatch = html.match(/AR\d{17,}/);
    if (idMatch) {
      advertiserId = idMatch[0];
    }
    
    // Try to find name
    const namePatterns = [
      /<div[^>]*class="[^"]*advertiser-name[^"]*"[^>]*>([^<]+)</i,
      /"advertiserName"\s*:\s*"([^"]+)"/i,
      /data-advertiser-name="([^"]+)"/i
    ];
    
    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        advertiserName = match[1].trim();
        break;
      }
    }
    
    console.log(`[Parse TC] Advertiser ID: ${advertiserId || 'Not found'}`);
    
    return { advertiserId, advertiserName };
  }

  /**
   * Parse ads from Transparency Center page
   */
  parseTransparencyAds(html, advertiserId) {
    const ads = [];
    
    // Find creative IDs (CR + 17+ digits)
    const creativeIds = [...new Set(html.match(/CR\d{17,}/g) || [])];
    
    // Find images
    const imageUrls = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
    
    // Find more image patterns
    const moreImages = html.match(/https:\/\/[^"'\s]+\/simgad\/\d+/g) || [];
    const allImages = [...new Set([...imageUrls, ...moreImages])];
    
    console.log(`[Parse Ads] Found ${creativeIds.length} creatives, ${allImages.length} images`);
    
    creativeIds.forEach((id, i) => {
      let format = 'text';
      
      // Check context for format
      const idx = html.indexOf(id);
      if (idx > -1) {
        const context = html.substring(Math.max(0, idx - 300), Math.min(html.length, idx + 300)).toLowerCase();
        if (context.includes('video')) format = 'video';
        else if (allImages[i] || context.includes('image') || context.includes('display')) format = 'image';
      }
      
      ads.push({
        id,
        position: i + 1,
        format,
        imageUrl: allImages[i] || null,
        previewUrl: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${id}`,
        source: 'Transparency Center'
      });
    });

    return ads;
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
