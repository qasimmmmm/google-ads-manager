/* ═══════════════════════════════════════════════════════════════════════════
   Google Ads Intelligence Service
   Routes to appropriate scraper based on configuration
   
   Methods:
   1. Advanced Scraper (Puppeteer + Residential Proxies) - RECOMMENDED
   2. ScraperAPI (Simple, but less reliable for ads)
   3. SEMrush API (Competitor keyword data)
   ═══════════════════════════════════════════════════════════════════════════ */

const advancedScraper = require('./advancedScraper');
const https = require('https');
const http = require('http');

class GoogleAdsIntelligence {

  /**
   * Make HTTP request (for SEMrush/ScraperAPI)
   */
  makeRequest(url, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.get(url, { timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  /**
   * MAIN: Search keyword for ads
   * Uses Advanced Scraper with residential proxies
   */
  async searchKeywordAds(keyword, proxyConfig, options = {}) {
    // Route to advanced scraper
    return await advancedScraper.searchKeywordAds(keyword, proxyConfig, options);
  }

  /**
   * Search multiple keywords
   */
  async searchMultipleKeywords(keywords, proxyConfig, options = {}) {
    return await advancedScraper.searchMultipleKeywords(keywords, proxyConfig, options);
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyConfig) {
    return await advancedScraper.testProxy(proxyConfig);
  }

  /**
   * COMPETITOR ANALYSIS
   */
  async getCompetitorAds(domain, apiConfig, options = {}) {
    const { method = 'transparency', semrushApiKey, scraperApiKey, country = 'us' } = options;
    
    if (method === 'semrush' && semrushApiKey) {
      return await this.getCompetitorSemrush(domain, semrushApiKey);
    } else if (method === 'transparency' && scraperApiKey) {
      return await this.getCompetitorTransparency(domain, scraperApiKey, country);
    } else {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: 'API key required for competitor analysis'
      };
    }
  }

  /**
   * SEMrush competitor analysis
   */
  async getCompetitorSemrush(domain, apiKey) {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    try {
      // Domain overview
      const overviewUrl = `https://api.semrush.com/?type=domain_ranks&key=${apiKey}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${cleanDomain}&database=us`;
      const overviewRes = await this.makeRequest(overviewUrl);
      
      if (overviewRes.status !== 200) {
        return { success: false, error: 'SEMrush API error' };
      }
      
      const lines = overviewRes.data.trim().split('\n');
      const headers = lines[0].split(';');
      const values = lines[1] ? lines[1].split(';') : [];
      const summary = {};
      headers.forEach((h, i) => summary[h] = values[i] || '0');

      // Ad keywords
      const adsUrl = `https://api.semrush.com/?type=domain_adwords&key=${apiKey}&export_columns=Ph,Po,Nq,Cp,Co,Tr,Tc&domain=${cleanDomain}&database=us&display_limit=20`;
      const adsRes = await this.makeRequest(adsUrl);
      
      let ads = [];
      if (adsRes.status === 200) {
        const adLines = adsRes.data.trim().split('\n');
        const adHeaders = adLines[0].split(';');
        ads = adLines.slice(1).map(line => {
          const vals = line.split(';');
          const ad = {};
          adHeaders.forEach((h, i) => ad[h] = vals[i]);
          return {
            keyword: ad.Ph || '',
            position: ad.Po || '',
            searchVolume: ad.Nq || '',
            cpc: ad.Cp || '',
            traffic: ad.Tr || ''
          };
        }).filter(a => a.keyword);
      }

      return {
        success: true,
        domain: cleanDomain,
        method: 'semrush',
        summary: {
          organicKeywords: summary.Or || '0',
          organicTraffic: summary.Ot || '0',
          paidKeywords: summary.Ad || '0',
          paidTraffic: summary.At || '0',
          adsBudget: summary.Ac || '0'
        },
        ads,
        source: 'SEMrush API'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Ads Transparency (via ScraperAPI)
   */
  async getCompetitorTransparency(domain, scraperApiKey, country) {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    
    try {
      const transparencyUrl = `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(cleanDomain)}`;
      const scraperUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(transparencyUrl)}&render=true&premium=true&country_code=${country}`;
      
      const response = await this.makeRequest(scraperUrl, 90000);
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP ${response.status}`, manualUrl: transparencyUrl };
      }

      const html = response.data;
      const advertiserIdMatch = html.match(/AR\d{17,}/);
      const advertiserId = advertiserIdMatch ? advertiserIdMatch[0] : null;
      const creativeIds = [...new Set(html.match(/CR\d{17,}/g) || [])];
      const imageUrls = html.match(/https:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+/g) || [];
      
      const ads = creativeIds.slice(0, 30).map((id, i) => ({
        id,
        position: i + 1,
        format: imageUrls[i] ? 'image' : 'text',
        imageUrl: imageUrls[i] || null,
        previewUrl: advertiserId 
          ? `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${id}`
          : transparencyUrl
      }));

      return {
        success: ads.length > 0,
        domain: cleanDomain,
        method: 'transparency',
        advertiser: advertiserId ? { id: advertiserId, transparencyUrl: `https://adstransparency.google.com/advertiser/${advertiserId}` } : null,
        summary: {
          totalAds: ads.length,
          textAds: ads.filter(a => a.format === 'text').length,
          imageAds: ads.filter(a => a.format === 'image').length
        },
        ads,
        manualUrl: transparencyUrl,
        source: 'Google Ads Transparency'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GoogleAdsIntelligence();
