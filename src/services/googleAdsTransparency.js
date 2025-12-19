/* ═══════════════════════════════════════════════════════════════════
   Google Ads Intelligence v6.0 - SIMPLIFIED
   
   Changes:
   - Uses ONLY ONE method (premium structured API) to save credits
   - Cost: 10 credits per search (not 25-40 like before)
   - Competitor Analysis: Two options (SEMrush API or Google Ads Transparency)
   
   ScraperAPI: https://www.scraperapi.com/signup (FREE 1000 credits)
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  /**
   * Make HTTP request
   */
  makeRequest(url, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const logUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
      console.log(`[Request] ${logUrl.substring(0, 120)}...`);
      
      const req = client.get(url, { timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Response] Status: ${res.statusCode}, Size: ${data.length}`);
          resolve({ status: res.statusCode, data });
        });
      });
      
      req.on('error', err => {
        console.error(`[Request Error] ${err.message}`);
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════════
     KEYWORD ADS SEARCH - Single Premium Method (10 credits)
     ═══════════════════════════════════════════════════════════════════ */

  async searchKeywordAds(keyword, apiKey, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n[Keyword Ads] Searching: "${keyword}" | Country: ${country}`);

    if (!apiKey) {
      return { 
        success: false, 
        error: 'NO_API_KEY', 
        message: 'ScraperAPI key required',
        setupUrl: 'https://www.scraperapi.com/signup'
      };
    }

    // Single method: Structured API with Premium IPs (10 credits)
    const apiUrl = `https://api.scraperapi.com/structured/google/search?` +
      `api_key=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(keyword)}` +
      `&country=${country}` +
      `&tld=com` +
      `&num=20` +
      `&hl=en` +
      `&premium=true`;
    
    try {
      const response = await this.makeRequest(apiUrl);
      
      // Handle errors
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', message: 'Invalid API key' };
      }
      
      if (response.status === 403) {
        return { success: false, error: 'QUOTA_EXCEEDED', message: 'API quota exceeded. Check your ScraperAPI dashboard.' };
      }
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}`, message: `Server returned ${response.status}` };
      }

      // Parse JSON
      let json;
      try {
        json = JSON.parse(response.data);
      } catch (e) {
        console.error('[Parse Error]', e.message);
        return { success: false, error: 'PARSE_ERROR', message: 'Failed to parse response' };
      }

      // Extract ads
      const allAds = this.extractAllAdTypes(json);
      
      return {
        success: true,
        keyword,
        country,
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
        creditsUsed: 10,
        timestamp: new Date().toISOString(),
        source: 'Google SERP (ScraperAPI Premium)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[Keyword Ads Error]', error.message);
      return { 
        success: false, 
        error: 'REQUEST_FAILED', 
        message: error.message || 'Failed to fetch ads'
      };
    }
  }

  /**
   * Extract ALL ad types from JSON response
   */
  extractAllAdTypes(json) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const all = [];
    
    console.log('[Extract] Response fields:', Object.keys(json).join(', '));
    
    // 1. SEARCH ADS (top)
    const adFields = ['ads', 'ads_results', 'top_ads', 'ad_results', 'paid_results'];
    for (const field of adFields) {
      if (json[field] && Array.isArray(json[field]) && json[field].length > 0) {
        console.log(`[Extract] Found ${json[field].length} search ads in '${field}'`);
        json[field].forEach((ad, i) => {
          const adData = {
            position: i + 1,
            type: 'search',
            placement: 'top',
            title: ad.title || ad.headline || '',
            displayUrl: ad.displayed_link || ad.display_url || ad.visible_url || '',
            description: ad.description || ad.snippet || '',
            link: ad.link || ad.url || '',
            sitelinks: (ad.sitelinks || []).slice(0, 4).map(s => ({ title: s.title, link: s.link })),
            phone: ad.phone || null,
            hasCallExtension: !!(ad.phone || (ad.extensions || []).toString().match(/\d{3}[-.]?\d{3}[-.]?\d{4}/))
          };
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
        const adData = {
          position: searchAds.length + i + 1,
          type: 'search',
          placement: 'bottom',
          title: ad.title || '',
          displayUrl: ad.displayed_link || '',
          description: ad.description || '',
          link: ad.link || ''
        };
        if (adData.title) {
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
            shipping: ad.shipping || ''
          };
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
          const isSponsored = ad.sponsored || ad.ad || ad.label === 'Ad';
          const adData = {
            position: i + 1,
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
          if (adData.title) {
            localAds.push(adData);
            if (isSponsored) all.push(adData);
          }
        });
        break;
      }
    }
    
    console.log(`[Extract] Total: ${searchAds.length} search, ${shoppingAds.length} shopping, ${localAds.length} local`);
    
    return { searchAds, shoppingAds, localAds, all };
  }

  extractRelatedSearches(json) {
    for (const field of ['related_searches', 'related_queries']) {
      if (json[field] && Array.isArray(json[field])) {
        return json[field].map(r => r.query || r.title || r).slice(0, 10);
      }
    }
    return [];
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
      creditsUsed: results.length * 10
    };
  }


  /* ═══════════════════════════════════════════════════════════════════
     COMPETITOR ANALYSIS - Two Methods:
     1. SEMrush API (if user has API key)
     2. Google Ads Transparency (via ScraperAPI)
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * Main competitor analysis - routes to correct method
   */
  async getCompetitorAds(domain, apiKey, options = {}) {
    const { method = 'transparency', semrushApiKey, country = 'us' } = options;
    
    console.log(`\n[Competitor] Analyzing: ${domain} | Method: ${method}`);

    if (method === 'semrush' && semrushApiKey) {
      return await this.getCompetitorAdsSemrush(domain, semrushApiKey);
    } else {
      return await this.getCompetitorAdsTransparency(domain, apiKey, country);
    }
  }

  /**
   * Method 1: SEMrush API
   * Requires SEMrush API key (paid)
   * Docs: https://www.semrush.com/api-analytics/
   */
  async getCompetitorAdsSemrush(domain, semrushApiKey) {
    console.log('[Competitor] Using SEMrush API');
    
    if (!semrushApiKey) {
      return {
        success: false,
        error: 'NO_SEMRUSH_KEY',
        message: 'SEMrush API key required',
        setupUrl: 'https://www.semrush.com/api-analytics/'
      };
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    try {
      // SEMrush Domain Overview API
      const apiUrl = `https://api.semrush.com/?type=domain_ranks&key=${semrushApiKey}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${cleanDomain}&database=us`;
      
      const response = await this.makeRequest(apiUrl, 30000);
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}`, message: 'SEMrush API error' };
      }
      
      // SEMrush returns CSV, parse it
      const lines = response.data.trim().split('\n');
      const headers = lines[0].split(';');
      const data = lines[1] ? lines[1].split(';') : [];
      
      const result = {};
      headers.forEach((h, i) => result[h] = data[i]);
      
      // Get ad history
      const adHistoryUrl = `https://api.semrush.com/?type=domain_adwords&key=${semrushApiKey}&export_columns=Ph,Po,Nq,Cp,Co,Tr,Tc,Nr,Td&domain=${cleanDomain}&database=us&display_limit=20`;
      
      const adResponse = await this.makeRequest(adHistoryUrl, 30000);
      
      let ads = [];
      if (adResponse.status === 200) {
        const adLines = adResponse.data.trim().split('\n');
        const adHeaders = adLines[0].split(';');
        
        ads = adLines.slice(1).map(line => {
          const values = line.split(';');
          const ad = {};
          adHeaders.forEach((h, i) => ad[h] = values[i]);
          return {
            keyword: ad.Ph || '',
            position: ad.Po || '',
            searchVolume: ad.Nq || '',
            cpc: ad.Cp || '',
            competition: ad.Co || '',
            traffic: ad.Tr || '',
            trafficCost: ad.Tc || ''
          };
        }).filter(a => a.keyword);
      }

      return {
        success: true,
        domain: cleanDomain,
        method: 'semrush',
        summary: {
          organicKeywords: result.Or || '0',
          organicTraffic: result.Ot || '0',
          paidKeywords: result.Ad || '0',
          paidTraffic: result.At || '0',
          adsBudget: result.Ac || '0'
        },
        ads: ads.slice(0, 20),
        source: 'SEMrush API',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SEMrush Error]', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 2: Google Ads Transparency Center
   * Uses ScraperAPI to scrape transparency.google.com
   */
  async getCompetitorAdsTransparency(domain, scraperApiKey, country) {
    console.log('[Competitor] Using Google Ads Transparency');
    
    if (!scraperApiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'ScraperAPI key required for Google Ads Transparency',
        setupUrl: 'https://www.scraperapi.com/signup'
      };
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    try {
      // Scrape Google Ads Transparency Center
      const transparencyUrl = `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
      
      const scraperUrl = `http://api.scraperapi.com/?` +
        `api_key=${encodeURIComponent(scraperApiKey)}` +
        `&url=${encodeURIComponent(transparencyUrl)}` +
        `&render=true` +
        `&premium=true` +
        `&country_code=${country}`;
      
      const response = await this.makeRequest(scraperUrl, 90000);
      
      if (response.status === 401) {
        return { success: false, error: 'INVALID_API_KEY', message: 'Invalid ScraperAPI key' };
      }
      
      if (response.status !== 200) {
        return { 
          success: false, 
          error: `HTTP_${response.status}`,
          manualUrl: transparencyUrl
        };
      }

      // Parse HTML for advertiser info and ads
      const html = response.data;
      
      // Find advertiser ID
      const advertiserIdMatch = html.match(/AR\d{17,}/);
      const advertiserId = advertiserIdMatch ? advertiserIdMatch[0] : null;
      
      // Find creative IDs
      const creativeIds = [...new Set(html.match(/CR\d{17,}/g) || [])];
      
      // Find ad images
      const imageUrls = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
      
      console.log(`[Transparency] Advertiser: ${advertiserId}, Creatives: ${creativeIds.length}`);
      
      const ads = creativeIds.slice(0, 30).map((id, i) => {
        // Check context for ad format
        let format = 'text';
        const idx = html.indexOf(id);
        if (idx > -1) {
          const context = html.substring(Math.max(0, idx - 200), Math.min(html.length, idx + 200)).toLowerCase();
          if (context.includes('video')) format = 'video';
          else if (imageUrls[i] || context.includes('image') || context.includes('display')) format = 'image';
        }
        
        return {
          id,
          position: i + 1,
          format,
          imageUrl: imageUrls[i] || null,
          previewUrl: advertiserId 
            ? `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${id}`
            : `https://adstransparency.google.com/?domain=${cleanDomain}`,
          source: 'Google Ads Transparency'
        };
      });

      return {
        success: ads.length > 0 || advertiserId !== null,
        domain: cleanDomain,
        method: 'transparency',
        advertiser: advertiserId ? {
          id: advertiserId,
          name: cleanDomain,
          transparencyUrl: `https://adstransparency.google.com/advertiser/${advertiserId}`
        } : null,
        summary: {
          totalAds: ads.length,
          textAds: ads.filter(a => a.format === 'text').length,
          imageAds: ads.filter(a => a.format === 'image').length,
          videoAds: ads.filter(a => a.format === 'video').length
        },
        ads,
        creditsUsed: 25,
        source: 'Google Ads Transparency Center',
        manualUrl: `https://adstransparency.google.com/?domain=${cleanDomain}`,
        timestamp: new Date().toISOString(),
        message: ads.length === 0 ? 'No ads found. Try checking manually or use SEMrush.' : null
      };

    } catch (error) {
      console.error('[Transparency Error]', error.message);
      return { 
        success: false, 
        error: error.message,
        manualUrl: `https://adstransparency.google.com/?domain=${domain}`
      };
    }
  }

  /**
   * Test API key
   */
  async testApiKey(apiKey) {
    if (!apiKey) return { valid: false, error: 'No API key' };
    
    try {
      const url = `http://api.scraperapi.com/?api_key=${apiKey}&url=https://httpbin.org/ip`;
      const response = await this.makeRequest(url, 20000);
      
      if (response.status === 200) return { valid: true, message: 'API key works!' };
      if (response.status === 401) return { valid: false, error: 'Invalid API key' };
      return { valid: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsIntelligence();
