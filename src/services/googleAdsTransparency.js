/* ═══════════════════════════════════════════════════════════════════
   FREE Google Ads Transparency Center Scraper
   No API key required - scrapes directly from Google's public data
   ═══════════════════════════════════════════════════════════════════ */

const fetch = require('node-fetch');

class GoogleAdsTransparency {
  constructor() {
    this.baseUrl = 'https://adstransparency.google.com';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://adstransparency.google.com',
      'Referer': 'https://adstransparency.google.com/'
    };
  }

  // Search for advertiser by domain or company name
  async searchAdvertiser(query) {
    try {
      // Clean the query - remove http/https and www
      const cleanQuery = query.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      
      const url = `${this.baseUrl}/anji/_/rpc/SearchService/SearchAdvertisers`;
      
      // Google's protobuf-like request format
      const requestBody = JSON.stringify([[cleanQuery], null, null, null, 20]);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `f.req=${encodeURIComponent(requestBody)}`
      });

      const text = await response.text();
      return this.parseAdvertiserSearch(text, cleanQuery);
    } catch (error) {
      console.error('Search error:', error);
      return { success: false, advertisers: [], error: error.message };
    }
  }

  // Alternative: Direct URL-based search (more reliable)
  async searchByDomain(domain) {
    try {
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      
      // Use the public search page and extract data
      const searchUrl = `${this.baseUrl}/?domain=${encodeURIComponent(cleanDomain)}&region=anywhere`;
      
      const response = await fetch(searchUrl, {
        headers: this.headers
      });

      const html = await response.text();
      return this.parseSearchPage(html, cleanDomain);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get all ads for an advertiser ID
  async getAds(advertiserId, options = {}) {
    const {
      region = 'anywhere',
      startDate = null,
      endDate = null,
      format = 'all', // text, image, video
      platform = 'all', // SEARCH, YOUTUBE, MAPS, PLAY, SHOPPING
      limit = 100
    } = options;

    try {
      let url = `${this.baseUrl}/?advertiser_id=${advertiserId}&region=${region}`;
      
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (format !== 'all') url += `&format=${format}`;
      if (platform !== 'all') url += `&platform=${platform.toUpperCase()}`;

      const response = await fetch(url, { headers: this.headers });
      const html = await response.text();
      
      return this.parseAdsPage(html, advertiserId);
    } catch (error) {
      return { success: false, ads: [], error: error.message };
    }
  }

  // Parse advertiser search results
  parseAdvertiserSearch(text, query) {
    const advertisers = [];
    
    try {
      // Try to find advertiser IDs in the response (format: AR followed by numbers)
      const idMatches = text.match(/AR\d{17,}/g) || [];
      const uniqueIds = [...new Set(idMatches)];
      
      // Try to find company names
      const namePattern = /"([^"]+)"[^"]*AR\d{17,}/g;
      let match;
      
      if (uniqueIds.length > 0) {
        uniqueIds.slice(0, 10).forEach((id, index) => {
          advertisers.push({
            advertiserId: id,
            name: query,
            domain: query,
            url: `${this.baseUrl}/advertiser/${id}`
          });
        });
      }
    } catch (e) {
      console.error('Parse error:', e);
    }

    return {
      success: advertisers.length > 0,
      query,
      advertisers
    };
  }

  // Parse the search page HTML
  parseSearchPage(html, domain) {
    const advertisers = [];
    
    try {
      // Extract advertiser IDs from the page
      const idMatches = html.match(/AR\d{17,}/g) || [];
      const uniqueIds = [...new Set(idMatches)];
      
      // Extract company names (usually near the advertiser ID)
      uniqueIds.slice(0, 10).forEach(id => {
        advertisers.push({
          advertiserId: id,
          domain: domain,
          url: `${this.baseUrl}/advertiser/${id}`
        });
      });
    } catch (e) {
      console.error('Parse error:', e);
    }

    return {
      success: advertisers.length > 0,
      domain,
      advertisers
    };
  }

  // Parse ads page HTML and extract ad data
  parseAdsPage(html, advertiserId) {
    const ads = [];
    
    try {
      // Extract creative IDs (format: CR followed by numbers)
      const creativeIds = html.match(/CR\d{17,}/g) || [];
      const uniqueCreatives = [...new Set(creativeIds)];
      
      // Extract image URLs from Google's CDN
      const imageUrls = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
      
      // Extract ad text content
      const textMatches = html.match(/<div[^>]*class="[^"]*creative-text[^"]*"[^>]*>([^<]+)</g) || [];
      
      uniqueCreatives.slice(0, 100).forEach((creativeId, index) => {
        ads.push({
          creativeId,
          advertiserId,
          format: imageUrls[index] ? 'image' : 'text',
          imageUrl: imageUrls[index] || null,
          previewUrl: `${this.baseUrl}/advertiser/${advertiserId}/creative/${creativeId}`,
          url: `${this.baseUrl}/advertiser/${advertiserId}/creative/${creativeId}`
        });
      });
    } catch (e) {
      console.error('Parse ads error:', e);
    }

    return {
      success: ads.length > 0,
      advertiserId,
      totalAds: ads.length,
      ads
    };
  }

  // Get detailed info for a specific ad creative
  async getAdDetails(advertiserId, creativeId) {
    try {
      const url = `${this.baseUrl}/advertiser/${advertiserId}/creative/${creativeId}`;
      const response = await fetch(url, { headers: this.headers });
      const html = await response.text();
      
      return this.parseAdDetails(html, advertiserId, creativeId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Parse individual ad details
  parseAdDetails(html, advertiserId, creativeId) {
    try {
      // Extract dates
      const firstShownMatch = html.match(/First shown[:\s]*([^<]+)/i);
      const lastShownMatch = html.match(/Last shown[:\s]*([^<]+)/i);
      
      // Extract image
      const imageMatch = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/);
      
      // Extract ad format
      let format = 'text';
      if (html.includes('video')) format = 'video';
      else if (imageMatch) format = 'image';

      return {
        success: true,
        advertiserId,
        creativeId,
        format,
        imageUrl: imageMatch ? imageMatch[0] : null,
        firstShown: firstShownMatch ? firstShownMatch[1].trim() : null,
        lastShown: lastShownMatch ? lastShownMatch[1].trim() : null,
        url: `${this.baseUrl}/advertiser/${advertiserId}/creative/${creativeId}`
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// Export singleton instance
module.exports = new GoogleAdsTransparency();
