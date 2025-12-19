/* ═══════════════════════════════════════════════════════════════════
   Google Ads Transparency Center Scraper
   100% FREE - No API key required!
   Reverse-engineered from Google's internal API
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');

class GoogleAdsTransparencyScraper {
  constructor() {
    this.baseUrl = 'adstransparency.google.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Make HTTPS request with proper headers
   */
  makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            // Google returns )]}' prefix for security, remove it
            const cleanData = data.replace(/^\)\]\}'\n?/, '');
            resolve({ status: res.statusCode, data: cleanData });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * Search for advertisers by domain or text
   * This hits Google's internal search endpoint
   */
  async searchAdvertisers(query, region = 'US') {
    console.log(`[Scraper] Searching advertisers: ${query}`);
    
    // Clean query
    const cleanQuery = query.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    const requestBody = JSON.stringify({
      '1': cleanQuery,
      '2': this.getRegionCode(region),
      '3': 30,  // Number of results
      '7': 1
    });

    const options = {
      hostname: this.baseUrl,
      port: 443,
      path: '/anji/_/rpc/SearchService/SearchAdvertisers?authuser=0',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://adstransparency.google.com',
        'Referer': 'https://adstransparency.google.com/',
        'X-Same-Domain': '1',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    try {
      const response = await this.makeRequest(options, requestBody);
      return this.parseAdvertiserResponse(response.data, cleanQuery);
    } catch (error) {
      console.error('[Scraper] Search error:', error.message);
      return { success: false, advertisers: [], error: error.message };
    }
  }

  /**
   * Get creatives/ads for an advertiser
   */
  async getCreatives(advertiserId, options = {}) {
    const {
      region = 'US',
      limit = 100,
      format = null  // null = all, 1 = text, 2 = image, 3 = video
    } = options;

    console.log(`[Scraper] Getting ads for: ${advertiserId}`);

    const requestBody = JSON.stringify({
      '1': advertiserId,
      '2': this.getRegionCode(region),
      '3': limit,
      '6': format
    });

    const reqOptions = {
      hostname: this.baseUrl,
      port: 443,
      path: '/anji/_/rpc/SearchService/SearchCreatives?authuser=0',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://adstransparency.google.com',
        'Referer': `https://adstransparency.google.com/advertiser/${advertiserId}`,
        'X-Same-Domain': '1',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    try {
      const response = await this.makeRequest(reqOptions, requestBody);
      return this.parseCreativesResponse(response.data, advertiserId);
    } catch (error) {
      console.error('[Scraper] Creatives error:', error.message);
      return { success: false, ads: [], error: error.message };
    }
  }

  /**
   * Get detailed info for a specific creative
   */
  async getCreativeDetails(advertiserId, creativeId) {
    const requestBody = JSON.stringify({
      '1': advertiserId,
      '2': creativeId
    });

    const options = {
      hostname: this.baseUrl,
      port: 443,
      path: '/anji/_/rpc/SearchService/GetCreativeById?authuser=0',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Accept': '*/*',
        'Origin': 'https://adstransparency.google.com',
        'Referer': `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${creativeId}`,
        'X-Same-Domain': '1',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    try {
      const response = await this.makeRequest(options, requestBody);
      return this.parseCreativeDetails(response.data, advertiserId, creativeId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse advertiser search response
   */
  parseAdvertiserResponse(data, query) {
    const advertisers = [];
    
    try {
      // Extract advertiser IDs (format: AR followed by numbers)
      const idMatches = data.match(/AR\d{17,}/g) || [];
      const uniqueIds = [...new Set(idMatches)];
      
      // Try to extract names from the response
      // Google's response has names near the IDs
      uniqueIds.forEach((id, index) => {
        // Try to find name associated with this ID
        const namePattern = new RegExp(`"([^"]{2,50})"[^"]*${id}|${id}[^"]*"([^"]{2,50})"`, 'g');
        const nameMatch = namePattern.exec(data);
        
        advertisers.push({
          advertiserId: id,
          name: nameMatch ? (nameMatch[1] || nameMatch[2] || query) : query,
          position: index + 1,
          transparencyUrl: `https://adstransparency.google.com/advertiser/${id}`,
          verified: data.includes(`${id}`) && data.includes('verified')
        });
      });

      // If no IDs found, try alternate parsing
      if (advertisers.length === 0) {
        // Sometimes the response has a different format
        const altPattern = /"AR(\d{17,})"/g;
        let match;
        while ((match = altPattern.exec(data)) !== null) {
          const id = 'AR' + match[1];
          if (!advertisers.find(a => a.advertiserId === id)) {
            advertisers.push({
              advertiserId: id,
              name: query,
              transparencyUrl: `https://adstransparency.google.com/advertiser/${id}`
            });
          }
        }
      }

    } catch (e) {
      console.error('[Parser] Error:', e.message);
    }

    return {
      success: advertisers.length > 0,
      query,
      count: advertisers.length,
      advertisers
    };
  }

  /**
   * Parse creatives/ads response
   */
  parseCreativesResponse(data, advertiserId) {
    const ads = [];
    
    try {
      // Extract creative IDs (format: CR followed by numbers)
      const creativeIds = data.match(/CR\d{17,}/g) || [];
      const uniqueCreatives = [...new Set(creativeIds)];
      
      // Extract image URLs from Google's CDN
      const imageUrls = data.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
      
      // Try to extract dates
      const datePattern = /(\d{4}-\d{2}-\d{2})/g;
      const dates = data.match(datePattern) || [];
      
      // Determine formats from the data
      const hasVideo = data.toLowerCase().includes('video');
      const hasImage = imageUrls.length > 0;
      
      uniqueCreatives.forEach((creativeId, index) => {
        // Determine format for this ad
        let format = 'text';
        if (imageUrls[index]) format = 'image';
        
        // Check if this specific creative is video
        const creativeSection = data.substring(
          Math.max(0, data.indexOf(creativeId) - 100),
          Math.min(data.length, data.indexOf(creativeId) + 500)
        );
        if (creativeSection.toLowerCase().includes('video')) format = 'video';
        
        ads.push({
          creativeId,
          advertiserId,
          position: index + 1,
          format,
          imageUrl: imageUrls[index] || null,
          previewUrl: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${creativeId}`,
          firstShown: dates[index * 2] || null,
          lastShown: dates[index * 2 + 1] || null
        });
      });

    } catch (e) {
      console.error('[Parser] Creatives error:', e.message);
    }

    return {
      success: ads.length > 0,
      advertiserId,
      totalAds: ads.length,
      ads
    };
  }

  /**
   * Parse single creative details
   */
  parseCreativeDetails(data, advertiserId, creativeId) {
    try {
      const imageUrl = (data.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/) || [])[0];
      const dates = data.match(/\d{4}-\d{2}-\d{2}/g) || [];
      
      let format = 'text';
      if (data.toLowerCase().includes('video')) format = 'video';
      else if (imageUrl) format = 'image';
      
      return {
        success: true,
        creativeId,
        advertiserId,
        format,
        imageUrl,
        firstShown: dates[0] || null,
        lastShown: dates[1] || null,
        previewUrl: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${creativeId}`
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Get region code
   */
  getRegionCode(region) {
    const codes = {
      'US': 'US',
      'UK': 'GB', 
      'GB': 'GB',
      'CA': 'CA',
      'AU': 'AU',
      'DE': 'DE',
      'FR': 'FR',
      'IN': 'IN',
      'JP': 'JP',
      'BR': 'BR',
      'anywhere': '',
      'all': ''
    };
    return codes[region?.toUpperCase()] || region || '';
  }

  /**
   * Full competitor analysis - main entry point
   */
  async analyzeCompetitor(domain, region = 'US') {
    console.log(`\n[Scraper] ═══════════════════════════════════════`);
    console.log(`[Scraper] Analyzing competitor: ${domain}`);
    console.log(`[Scraper] Region: ${region}`);
    console.log(`[Scraper] ═══════════════════════════════════════\n`);

    // Step 1: Search for advertiser
    const searchResult = await this.searchAdvertisers(domain, region);
    
    if (!searchResult.success || searchResult.advertisers.length === 0) {
      // Try alternate search with just domain name
      const domainName = domain.split('.')[0];
      const altSearch = await this.searchAdvertisers(domainName, region);
      
      if (!altSearch.success || altSearch.advertisers.length === 0) {
        return {
          success: false,
          domain,
          message: 'No advertisers found. They may not be running Google Ads.',
          suggestion: 'Try searching for the company name instead of domain.',
          manualSearchUrl: `https://adstransparency.google.com/?region=${region}&domain=${domain}`
        };
      }
      searchResult.advertisers = altSearch.advertisers;
    }

    // Step 2: Get ads for the first advertiser found
    const primaryAdvertiser = searchResult.advertisers[0];
    const adsResult = await this.getCreatives(primaryAdvertiser.advertiserId, { region, limit: 100 });

    // Categorize ads
    const ads = adsResult.ads || [];
    const textAds = ads.filter(a => a.format === 'text');
    const imageAds = ads.filter(a => a.format === 'image');
    const videoAds = ads.filter(a => a.format === 'video');

    return {
      success: true,
      domain,
      advertiser: {
        id: primaryAdvertiser.advertiserId,
        name: primaryAdvertiser.name || domain,
        verified: primaryAdvertiser.verified || false,
        transparencyUrl: primaryAdvertiser.transparencyUrl
      },
      summary: {
        totalAds: ads.length,
        textAds: textAds.length,
        imageAds: imageAds.length,
        videoAds: videoAds.length,
        otherAdvertisers: searchResult.advertisers.length - 1
      },
      ads: ads.slice(0, 50).map((ad, i) => ({
        id: ad.creativeId,
        position: i + 1,
        format: ad.format,
        imageUrl: ad.imageUrl,
        previewUrl: ad.previewUrl,
        firstShown: ad.firstShown,
        lastShown: ad.lastShown
      })),
      otherAdvertisers: searchResult.advertisers.slice(1, 5),
      source: '100% FREE - Google Ads Transparency Center Scraper',
      note: 'No API key required!'
    };
  }

  /**
   * Quick search - just get advertiser IDs
   */
  async quickSearch(query) {
    const result = await this.searchAdvertisers(query);
    return {
      success: result.success,
      query,
      advertisers: result.advertisers.map(a => ({
        id: a.advertiserId,
        name: a.name,
        url: a.transparencyUrl
      }))
    };
  }
}

module.exports = new GoogleAdsTransparencyScraper();
