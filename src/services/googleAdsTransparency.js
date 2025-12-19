/* ═══════════════════════════════════════════════════════════════════
   Google Ads Transparency Center Scraper with Proxy Support
   
   Uses ScraperAPI (FREE 1,000 credits/month - no credit card!)
   Sign up at: https://www.scraperapi.com/signup
   
   How it works:
   1. ScraperAPI acts as a proxy to bypass Google's blocks
   2. We scrape the actual Google Ads Transparency Center pages
   3. Parse the HTML to extract ad data
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');
const http = require('http');

class GoogleAdsTransparencyScraper {
  constructor() {
    this.baseUrl = 'https://adstransparency.google.com';
    this.scraperApiUrl = 'http://api.scraperapi.com';
  }

  /**
   * Make HTTP/HTTPS request
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const reqOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers
        },
        timeout: 60000
      };

      client.get(url, reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')));
    });
  }

  /**
   * Build ScraperAPI URL
   */
  buildProxyUrl(targetUrl, apiKey) {
    if (!apiKey) return targetUrl;
    
    const params = new URLSearchParams({
      api_key: apiKey,
      url: targetUrl,
      render: 'true',  // Enable JavaScript rendering
      country_code: 'us'
    });
    
    return `${this.scraperApiUrl}?${params.toString()}`;
  }

  /**
   * Search for advertisers by domain
   */
  async searchAdvertisers(domain, apiKey) {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    console.log(`[Scraper] Searching for: ${cleanDomain}`);
    console.log(`[Scraper] Using proxy: ${apiKey ? 'ScraperAPI' : 'Direct (may fail)'}`);
    
    // Build the target URL
    const targetUrl = `${this.baseUrl}/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
    const requestUrl = this.buildProxyUrl(targetUrl, apiKey);
    
    try {
      const response = await this.makeRequest(requestUrl);
      
      if (response.status !== 200) {
        console.log(`[Scraper] Response status: ${response.status}`);
        return { 
          success: false, 
          error: `HTTP ${response.status}`,
          hint: apiKey ? 'Check your ScraperAPI key' : 'Add ScraperAPI key for better results'
        };
      }
      
      return this.parseSearchResults(response.data, cleanDomain);
    } catch (error) {
      console.error('[Scraper] Error:', error.message);
      return { 
        success: false, 
        error: error.message,
        hint: 'Try adding a ScraperAPI key in Settings'
      };
    }
  }

  /**
   * Parse search results HTML
   */
  parseSearchResults(html, domain) {
    const advertisers = [];
    
    try {
      // Extract advertiser IDs (format: AR followed by 17+ digits)
      const idMatches = html.match(/AR\d{17,}/g) || [];
      const uniqueIds = [...new Set(idMatches)];
      
      console.log(`[Scraper] Found ${uniqueIds.length} advertiser IDs`);
      
      // Try to extract names - look for patterns near IDs
      uniqueIds.forEach((id, index) => {
        // Look for name in various patterns
        let name = domain;
        
        // Pattern 1: "name" ... AR123
        const namePattern1 = new RegExp(`"([^"]{2,60})"[^"]{0,100}${id}`, 's');
        const match1 = html.match(namePattern1);
        if (match1) name = match1[1];
        
        // Pattern 2: AR123 ... "name"
        const namePattern2 = new RegExp(`${id}[^"]{0,100}"([^"]{2,60})"`, 's');
        const match2 = html.match(namePattern2);
        if (match2 && match2[1].length > name.length) name = match2[1];
        
        advertisers.push({
          advertiserId: id,
          name: this.cleanName(name),
          domain: domain,
          position: index + 1,
          transparencyUrl: `${this.baseUrl}/advertiser/${id}`
        });
      });
      
      // Also try text search for company names
      if (advertisers.length === 0) {
        // Try alternate approach - look for advertiser cards
        const cardPattern = /advertiser\/AR(\d{17,})/g;
        let match;
        while ((match = cardPattern.exec(html)) !== null) {
          const id = 'AR' + match[1];
          if (!advertisers.find(a => a.advertiserId === id)) {
            advertisers.push({
              advertiserId: id,
              name: domain,
              domain: domain,
              transparencyUrl: `${this.baseUrl}/advertiser/${id}`
            });
          }
        }
      }

    } catch (e) {
      console.error('[Parser] Error:', e.message);
    }

    return {
      success: advertisers.length > 0,
      domain,
      count: advertisers.length,
      advertisers,
      note: advertisers.length === 0 ? 'No advertisers found. Try company name instead of domain.' : null
    };
  }

  /**
   * Get ads for an advertiser
   */
  async getAdvertiserAds(advertiserId, apiKey, options = {}) {
    const { region = 'anywhere', format = null } = options;
    
    console.log(`[Scraper] Getting ads for: ${advertiserId}`);
    
    // Build the target URL
    let targetUrl = `${this.baseUrl}/advertiser/${advertiserId}?region=${region}`;
    if (format) targetUrl += `&format=${format}`;
    
    const requestUrl = this.buildProxyUrl(targetUrl, apiKey);
    
    try {
      const response = await this.makeRequest(requestUrl);
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      
      return this.parseAdsPage(response.data, advertiserId);
    } catch (error) {
      console.error('[Scraper] Error getting ads:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse ads page HTML
   */
  parseAdsPage(html, advertiserId) {
    const ads = [];
    
    try {
      // Extract creative IDs (format: CR followed by 17+ digits)
      const creativeIds = html.match(/CR\d{17,}/g) || [];
      const uniqueCreatives = [...new Set(creativeIds)];
      
      console.log(`[Scraper] Found ${uniqueCreatives.length} creatives`);
      
      // Extract image URLs from Google's CDN
      const imagePattern = /https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g;
      const imageUrls = html.match(imagePattern) || [];
      
      // Extract video indicators
      const hasVideo = html.toLowerCase().includes('video-creative') || 
                       html.toLowerCase().includes('format":"video');
      
      // Extract dates (format: YYYY-MM-DD or Month DD, YYYY)
      const datePattern = /(\d{4}-\d{2}-\d{2})|((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/gi;
      const dates = html.match(datePattern) || [];
      
      uniqueCreatives.forEach((creativeId, index) => {
        // Determine format
        let format = 'text';
        
        // Check if this creative has an image
        const creativeContext = html.substring(
          Math.max(0, html.indexOf(creativeId) - 200),
          Math.min(html.length, html.indexOf(creativeId) + 500)
        );
        
        if (creativeContext.toLowerCase().includes('video') || 
            creativeContext.includes('video-creative')) {
          format = 'video';
        } else if (imageUrls[index] || creativeContext.includes('simgad')) {
          format = 'image';
        }
        
        ads.push({
          creativeId,
          advertiserId,
          position: index + 1,
          format,
          imageUrl: imageUrls[index] || null,
          firstShown: dates[index * 2] || null,
          lastShown: dates[index * 2 + 1] || null,
          previewUrl: `${this.baseUrl}/advertiser/${advertiserId}/creative/${creativeId}`
        });
      });

    } catch (e) {
      console.error('[Parser] Ads error:', e.message);
    }

    return {
      success: ads.length > 0,
      advertiserId,
      totalAds: ads.length,
      ads
    };
  }

  /**
   * Full competitor analysis - main entry point
   */
  async analyzeCompetitor(domain, apiKey, region = 'US') {
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[Scraper] Analyzing: ${domain}`);
    console.log(`[Scraper] API Key: ${apiKey ? 'Provided ✓' : 'Not provided ✗'}`);
    console.log(`${'═'.repeat(55)}\n`);

    if (!apiKey) {
      return {
        success: false,
        domain,
        message: 'ScraperAPI key required for competitor analysis.',
        error: 'NO_API_KEY',
        setupInstructions: {
          step1: 'Go to https://www.scraperapi.com/signup',
          step2: 'Sign up for FREE (no credit card needed)',
          step3: 'Copy your API key from the dashboard',
          step4: 'Paste it in Settings > ScraperAPI Key',
          benefit: '1,000 FREE scrapes per month!'
        },
        manualSearchUrl: `${this.baseUrl}/?domain=${domain}`
      };
    }

    // Step 1: Search for advertiser
    const searchResult = await this.searchAdvertisers(domain, apiKey);
    
    if (!searchResult.success || searchResult.advertisers.length === 0) {
      // Try with just the domain name (without TLD)
      const domainName = domain.split('.')[0];
      console.log(`[Scraper] Retrying with: ${domainName}`);
      
      const altSearch = await this.searchAdvertisers(domainName, apiKey);
      
      if (!altSearch.success || altSearch.advertisers.length === 0) {
        return {
          success: false,
          domain,
          message: 'No advertisers found for this domain.',
          suggestion: 'Try the company name (e.g., "Tesla" instead of "tesla.com")',
          manualSearchUrl: `${this.baseUrl}/?domain=${domain}`,
          creditsUsed: 1
        };
      }
      searchResult.advertisers = altSearch.advertisers;
    }

    // Step 2: Get ads for the primary advertiser
    const primaryAdvertiser = searchResult.advertisers[0];
    const adsResult = await this.getAdvertiserAds(primaryAdvertiser.advertiserId, apiKey, { region });

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
      source: 'Google Ads Transparency Center (via ScraperAPI)',
      creditsUsed: 2,  // 1 for search + 1 for ads
      note: 'FREE 1,000 credits/month with ScraperAPI!'
    };
  }

  /**
   * Clean extracted name
   */
  cleanName(name) {
    if (!name) return 'Unknown';
    // Remove common junk
    return name
      .replace(/\\u[\dA-Fa-f]{4}/g, '')  // Unicode escapes
      .replace(/\\[nrt]/g, ' ')           // Escape sequences
      .replace(/\s+/g, ' ')               // Multiple spaces
      .trim()
      .slice(0, 60);                      // Max length
  }

  /**
   * Quick test if API key works
   */
  async testApiKey(apiKey) {
    if (!apiKey) return { valid: false, error: 'No API key provided' };
    
    try {
      const testUrl = `${this.scraperApiUrl}?api_key=${apiKey}&url=https://httpbin.org/ip`;
      const response = await this.makeRequest(testUrl);
      
      if (response.status === 200 && response.data.includes('origin')) {
        return { valid: true, message: 'API key is working!' };
      } else if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      } else {
        return { valid: false, error: `Unexpected response: ${response.status}` };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsTransparencyScraper();
