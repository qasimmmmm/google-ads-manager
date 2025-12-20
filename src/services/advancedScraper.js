/* ═══════════════════════════════════════════════════════════════════════════
   ADVANCED GOOGLE ADS SCRAPER v2.0 - VERCEL COMPATIBLE
   
   Uses HTTP requests through residential proxies (no Puppeteer needed!)
   Works on Vercel serverless functions!
   
   SUPPORTED PROXY PROVIDERS:
   - Bright Data (formerly Luminati)
   - Oxylabs  
   - SmartProxy
   - IPRoyal
   - Custom HTTP proxies
   ═══════════════════════════════════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const tls = require('tls');

class AdvancedGoogleAdsScraper {
  
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Format proxy credentials for different providers
   */
  formatProxy(config) {
    const { provider, username, password, host, port, country = 'us' } = config;
    const session = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    let proxyUser = username;
    let proxyPass = password;
    
    switch (provider?.toLowerCase()) {
      case 'brightdata':
      case 'luminati':
        proxyUser = `${username}-country-${country}-session-${session}`;
        break;
      case 'oxylabs':
        proxyUser = `${username}-cc-${country}-sessid-${session}`;
        break;
      case 'smartproxy':
        proxyUser = `${username}-country-${country}-session-${session}`;
        break;
      case 'iproyal':
        proxyPass = `${password}_country-${country}_session-${session}`;
        break;
    }
    
    return { host, port: parseInt(port), username: proxyUser, password: proxyPass };
  }

  /**
   * Make HTTPS request through HTTP proxy using CONNECT tunnel
   */
  makeProxyRequest(url, proxyConfig, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const proxy = this.formatProxy(proxyConfig);
      const targetUrl = new URL(url);
      const userAgent = this.random(this.userAgents);
      
      const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');
      
      console.log(`[Proxy] ${proxy.host}:${proxy.port} -> ${targetUrl.hostname}`);
      
      const connectOptions = {
        host: proxy.host,
        port: proxy.port,
        method: 'CONNECT',
        path: `${targetUrl.hostname}:443`,
        headers: {
          'Proxy-Authorization': `Basic ${auth}`,
          'Host': `${targetUrl.hostname}:443`
        },
        timeout
      };
      
      const proxyReq = http.request(connectOptions);
      
      proxyReq.on('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy();
          reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
          return;
        }
        
        // Create TLS connection through the proxy tunnel
        const tlsSocket = tls.connect({
          socket: socket,
          servername: targetUrl.hostname,
          rejectUnauthorized: false
        }, () => {
          // Send HTTP request through TLS
          const request = [
            `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
            `Host: ${targetUrl.hostname}`,
            `User-Agent: ${userAgent}`,
            `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8`,
            `Accept-Language: en-US,en;q=0.9`,
            `Accept-Encoding: identity`,
            `Connection: close`,
            `Upgrade-Insecure-Requests: 1`,
            `Sec-Fetch-Dest: document`,
            `Sec-Fetch-Mode: navigate`,
            `Sec-Fetch-Site: none`,
            `Sec-Fetch-User: ?1`,
            `Cache-Control: max-age=0`,
            '',
            ''
          ].join('\r\n');
          
          tlsSocket.write(request);
          
          let rawData = '';
          
          tlsSocket.on('data', (chunk) => {
            rawData += chunk.toString('utf8');
          });
          
          tlsSocket.on('end', () => {
            // Parse HTTP response
            const headerEnd = rawData.indexOf('\r\n\r\n');
            if (headerEnd === -1) {
              resolve({ status: 200, data: rawData });
              return;
            }
            
            const headers = rawData.substring(0, headerEnd);
            let body = rawData.substring(headerEnd + 4);
            
            // Get status code
            const statusMatch = headers.match(/HTTP\/[\d.]+ (\d+)/);
            const status = statusMatch ? parseInt(statusMatch[1]) : 200;
            
            // Handle chunked encoding
            if (headers.toLowerCase().includes('transfer-encoding: chunked')) {
              body = this.decodeChunked(body);
            }
            
            resolve({ status, data: body });
          });
          
          tlsSocket.on('error', (err) => {
            reject(err);
          });
        });
        
        tlsSocket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
      });
      
      proxyReq.on('error', (err) => {
        reject(err);
      });
      
      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        reject(new Error('Proxy connection timeout'));
      });
      
      proxyReq.end();
    });
  }

  /**
   * Decode chunked transfer encoding
   */
  decodeChunked(data) {
    let result = '';
    let pos = 0;
    
    while (pos < data.length) {
      const lineEnd = data.indexOf('\r\n', pos);
      if (lineEnd === -1) break;
      
      const sizeHex = data.substring(pos, lineEnd).trim();
      const size = parseInt(sizeHex, 16);
      
      if (isNaN(size) || size === 0) break;
      
      const chunkStart = lineEnd + 2;
      result += data.substring(chunkStart, chunkStart + size);
      pos = chunkStart + size + 2;
    }
    
    return result || data;
  }

  /**
   * MAIN: Search Google for keyword ads
   */
  async searchKeywordAds(keyword, proxyConfig, options = {}) {
    const { country = 'us' } = options;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[SCRAPER] Keyword: "${keyword}" | Provider: ${proxyConfig?.provider || 'None'}`);
    console.log(`${'═'.repeat(60)}`);

    if (!proxyConfig || !proxyConfig.host) {
      return { 
        success: false, 
        error: 'NO_PROXY', 
        message: 'Residential proxy required. Configure in Keyword Planner.',
        setupRequired: true
      };
    }

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en&gl=${country}&num=20`;
    
    try {
      const response = await this.makeProxyRequest(googleUrl, proxyConfig);
      
      console.log(`[Response] Status: ${response.status}, Size: ${response.data.length}`);
      
      if (response.status === 403 || response.status === 429) {
        return { success: false, error: 'BLOCKED', message: 'IP blocked by Google. Click search again for new IP.' };
      }
      
      if (response.status !== 200) {
        return { success: false, error: `HTTP_${response.status}`, message: `Google returned ${response.status}` };
      }

      const html = response.data;
      
      // Check for CAPTCHA
      if (html.toLowerCase().includes('unusual traffic') || html.includes('captcha')) {
        return { success: false, error: 'CAPTCHA', message: 'CAPTCHA detected. Click search again for new IP.' };
      }

      // Extract ads
      const ads = this.extractAds(html);
      
      console.log(`[Results] Search: ${ads.searchAds.length}, Shopping: ${ads.shoppingAds.length}, Local: ${ads.localAds.length}`);

      return {
        success: true,
        keyword,
        country,
        totalAds: ads.allAds.length,
        searchAdsCount: ads.searchAds.length,
        shoppingAdsCount: ads.shoppingAds.length,
        localAdsCount: ads.localAds.length,
        searchAds: ads.searchAds,
        shoppingAds: ads.shoppingAds,
        localAds: ads.localAds,
        allAds: ads.allAds,
        organicCount: ads.organicCount,
        relatedSearches: ads.relatedSearches,
        timestamp: new Date().toISOString(),
        proxyProvider: proxyConfig.provider,
        source: 'Google SERP (Residential Proxy)',
        searchUrl: googleUrl
      };

    } catch (error) {
      console.error('[Scraper Error]', error.message);
      return { 
        success: false, 
        error: error.message,
        message: `Request failed: ${error.message}. Check proxy settings.`
      };
    }
  }

  /**
   * Extract ads from HTML
   */
  extractAds(html) {
    const searchAds = [];
    const shoppingAds = [];
    const localAds = [];
    const allAds = [];
    const relatedSearches = [];
    
    const clean = (text) => {
      if (!text) return '';
      return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // ═══════════════════════════════════════════════════════════
    // SEARCH ADS
    // ═══════════════════════════════════════════════════════════
    
    // Split by "Sponsored" to find ad sections
    const sections = html.split(/Sponsored|Sponsorisé/i);
    
    sections.slice(1, 10).forEach((section, idx) => {
      const chunk = section.substring(0, 4000);
      
      // Must have ad link
      if (!chunk.includes('googleadservices') && !chunk.includes('/aclk?')) {
        return;
      }
      
      // Title
      let title = '';
      const titleMatch = chunk.match(/<h3[^>]*>([^<]+)<\/h3>/i) ||
                        chunk.match(/role="heading"[^>]*>([^<]+)</i);
      if (titleMatch) title = clean(titleMatch[1]);
      
      // Display URL
      let displayUrl = '';
      const urlMatch = chunk.match(/(?:^|[^a-z])([a-z0-9][-a-z0-9]*\.(?:com|org|net|io|co|gov|edu)[a-z.]*)/i);
      if (urlMatch) displayUrl = urlMatch[1].toLowerCase();
      
      // Description
      let description = '';
      const descMatch = chunk.match(/<span[^>]*>([^<]{40,200})<\/span>/i);
      if (descMatch) description = clean(descMatch[1]);
      
      // Link
      let link = '';
      const linkMatch = chunk.match(/href="([^"]*(?:googleadservices|aclk)[^"]*)"/i);
      if (linkMatch) link = linkMatch[1];
      
      // Phone
      const phoneMatch = chunk.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      
      if (title && title.length > 3) {
        const ad = {
          position: searchAds.length + 1,
          type: 'search',
          placement: searchAds.length < 4 ? 'top' : 'bottom',
          title,
          displayUrl,
          description,
          link,
          phone: phoneMatch ? phoneMatch[1] : null,
          hasCallExtension: !!phoneMatch
        };
        searchAds.push(ad);
        allAds.push(ad);
      }
    });

    // ═══════════════════════════════════════════════════════════
    // SHOPPING ADS
    // ═══════════════════════════════════════════════════════════
    
    // Look for shopping patterns
    const shoppingMatch = html.match(/commercial-unit|pla-unit|shopping_result/gi);
    if (shoppingMatch || html.includes('$') && html.includes('product')) {
      // Find price patterns with context
      const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
      const prices = [...html.matchAll(priceRegex)];
      
      prices.slice(0, 12).forEach((match, idx) => {
        const start = Math.max(0, match.index - 300);
        const end = Math.min(html.length, match.index + 300);
        const context = html.substring(start, end);
        
        // Find title near price
        const titleMatch = context.match(/<(?:h3|h4|span)[^>]*>([^<]{10,80})<\/(?:h3|h4|span)>/i);
        if (titleMatch && !titleMatch[1].includes('$')) {
          // Avoid duplicates
          const title = clean(titleMatch[1]);
          if (!shoppingAds.find(a => a.title === title)) {
            const merchantMatch = context.match(/(?:from|by|at)\s+([A-Za-z0-9\s&'-]+)/i);
            const imgMatch = context.match(/src="(https:\/\/[^"]*(?:encrypted|shopping|product)[^"]*)"/i);
            
            const ad = {
              position: shoppingAds.length + 1,
              type: 'shopping',
              placement: 'shopping',
              title,
              price: match[0],
              displayUrl: merchantMatch ? clean(merchantMatch[1]) : '',
              image: imgMatch ? imgMatch[1] : ''
            };
            shoppingAds.push(ad);
            allAds.push(ad);
          }
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // LOCAL ADS
    // ═══════════════════════════════════════════════════════════
    
    if (html.includes('local') || html.includes('map')) {
      // Find local business patterns
      const localPattern = /(?:rating|stars?|reviews?)[^>]*>[\s\S]{0,500}?(?:address|location|\d{3}[-.\s]\d{3}[-.\s]\d{4})/gi;
      const localMatches = html.match(localPattern) || [];
      
      localMatches.slice(0, 5).forEach((match, idx) => {
        const titleMatch = match.match(/(?:heading|title)[^>]*>([^<]+)</i) ||
                          match.match(/<(?:span|div)[^>]*>([A-Z][^<]{5,40})<\//i);
        const phoneMatch = match.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
        const ratingMatch = match.match(/(\d+\.?\d*)\s*(?:star|rating)/i);
        const isSponsored = match.toLowerCase().includes('sponsored');
        
        if (titleMatch) {
          const ad = {
            position: localAds.length + 1,
            type: 'local',
            placement: 'local_pack',
            isSponsored,
            title: clean(titleMatch[1]),
            phone: phoneMatch ? phoneMatch[1] : '',
            rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
            hasCallButton: !!phoneMatch
          };
          localAds.push(ad);
          if (isSponsored) allAds.push(ad);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // RELATED SEARCHES
    // ═══════════════════════════════════════════════════════════
    
    const relatedRegex = /\/search\?[^"]*q=([^&"]+)/gi;
    const relatedMatches = html.matchAll(relatedRegex);
    for (const match of relatedMatches) {
      try {
        const query = decodeURIComponent(match[1]).replace(/\+/g, ' ');
        if (query.length > 2 && query.length < 60 && !relatedSearches.includes(query)) {
          relatedSearches.push(query);
        }
      } catch(e) {}
      if (relatedSearches.length >= 10) break;
    }

    // Organic count estimate
    const organicCount = (html.match(/class="g"/g) || []).length;

    return { searchAds, shoppingAds, localAds, allAds, relatedSearches, organicCount };
  }

  /**
   * Search multiple keywords
   */
  async searchMultipleKeywords(keywords, proxyConfig, options = {}) {
    const results = [];
    const max = Math.min(keywords.length, 10);
    
    for (let i = 0; i < max; i++) {
      const result = await this.searchKeywordAds(keywords[i], proxyConfig, options);
      results.push(result);
      
      if (i < max - 1) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
    }
    
    return {
      success: true,
      totalKeywords: results.length,
      totalAdsFound: results.reduce((s, r) => s + (r.totalAds || 0), 0),
      results
    };
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyConfig) {
    console.log('[Test] Testing proxy...');
    
    if (!proxyConfig?.host) {
      return { success: false, error: 'No proxy configured' };
    }
    
    try {
      // Test with httpbin
      const response = await this.makeProxyRequest('https://httpbin.org/ip', proxyConfig);
      
      if (response.status === 200) {
        const ipMatch = response.data.match(/"origin":\s*"([^"]+)"/);
        return {
          success: true,
          ip: ipMatch ? ipMatch[1] : 'Unknown',
          message: 'Proxy working!',
          provider: proxyConfig.provider
        };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AdvancedGoogleAdsScraper();
