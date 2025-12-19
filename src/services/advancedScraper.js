/* ═══════════════════════════════════════════════════════════════════════════
   ADVANCED GOOGLE ADS SCRAPER v1.0
   World-Class Browser Emulation + Residential Proxy Support
   
   FEATURES:
   ✓ Full browser emulation with Puppeteer + Stealth
   ✓ Residential proxy rotation (Bright Data, Oxylabs, SmartProxy, etc.)
   ✓ Browser fingerprint randomization
   ✓ Human-like behavior simulation
   ✓ Anti-detection measures
   ✓ All ad types: Search, Shopping, Local, Call
   ✓ Serverless compatible (@sparticuz/chromium)
   
   SUPPORTED PROXY PROVIDERS:
   - Bright Data (formerly Luminati)
   - Oxylabs
   - SmartProxy
   - IPRoyal
   - Proxy-Seller
   - Custom HTTP/SOCKS5 proxies
   
   ═══════════════════════════════════════════════════════════════════════════ */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Detect if running in serverless environment
const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL || process.env.NETLIFY;

class AdvancedGoogleAdsScraper {
  
  constructor() {
    // Browser fingerprints database - randomized each request
    this.fingerprints = {
      viewports: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 },
        { width: 2560, height: 1440 },
        { width: 1680, height: 1050 }
      ],
      
      userAgents: [
        // Chrome Windows
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        // Chrome Mac
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        // Edge
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        // Firefox
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
      ],
      
      languages: ['en-US,en;q=0.9', 'en-US,en;q=0.9,es;q=0.8', 'en-GB,en;q=0.9,en-US;q=0.8'],
      platforms: ['Win32', 'MacIntel', 'Linux x86_64'],
      webglVendors: ['Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Google Inc. (NVIDIA)'],
      webglRenderers: ['Intel Iris OpenGL Engine', 'ANGLE (NVIDIA GeForce GTX 1080)', 'ANGLE (AMD Radeon RX 580)']
    };
    
    // US cities for geolocation
    this.usLocations = [
      { city: 'New York', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
      { city: 'Los Angeles', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles' },
      { city: 'Chicago', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
      { city: 'Houston', lat: 29.7604, lng: -95.3698, timezone: 'America/Chicago' },
      { city: 'Phoenix', lat: 33.4484, lng: -112.0740, timezone: 'America/Phoenix' },
      { city: 'Dallas', lat: 32.7767, lng: -96.7970, timezone: 'America/Chicago' },
      { city: 'San Francisco', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
      { city: 'Seattle', lat: 47.6062, lng: -122.3321, timezone: 'America/Los_Angeles' },
      { city: 'Miami', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York' },
      { city: 'Atlanta', lat: 33.7490, lng: -84.3880, timezone: 'America/New_York' }
    ];
  }

  random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  generateFingerprint() {
    const viewport = this.random(this.fingerprints.viewports);
    const location = this.random(this.usLocations);
    return {
      viewport,
      userAgent: this.random(this.fingerprints.userAgents),
      language: this.random(this.fingerprints.languages),
      platform: this.random(this.fingerprints.platforms),
      webglVendor: this.random(this.fingerprints.webglVendors),
      webglRenderer: this.random(this.fingerprints.webglRenderers),
      location,
      deviceMemory: this.random([4, 8, 16, 32]),
      hardwareConcurrency: this.random([4, 6, 8, 12, 16])
    };
  }

  formatProxyUrl(proxyConfig) {
    const { provider, username, password, host, port, country = 'us', session } = proxyConfig;
    const sessionId = session || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (provider?.toLowerCase()) {
      case 'brightdata':
      case 'luminati':
        return { server: `http://${host}:${port}`, username: `${username}-country-${country}-session-${sessionId}`, password };
      case 'oxylabs':
        return { server: `http://${host}:${port}`, username: `${username}-cc-${country}-sessid-${sessionId}`, password };
      case 'smartproxy':
        return { server: `http://${host}:${port}`, username: `${username}-country-${country}-session-${sessionId}`, password };
      case 'iproyal':
        return { server: `http://${host}:${port}`, username, password: `${password}_country-${country}_session-${sessionId}` };
      default:
        return username && password ? { server: `http://${host}:${port}`, username, password } : { server: `http://${host}:${port}` };
    }
  }

  async humanDelay(min = 500, max = 2000) {
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
  }

  async humanMouseMove(page) {
    const { width, height } = page.viewport();
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(Math.floor(Math.random() * width), Math.floor(Math.random() * height), { steps: Math.floor(Math.random() * 10) + 5 });
      await this.humanDelay(100, 300);
    }
  }

  async humanScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = Math.floor(Math.random() * 100) + 50;
        const maxScroll = Math.floor(Math.random() * 1500) + 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= maxScroll) { clearInterval(timer); resolve(); }
        }, Math.floor(Math.random() * 100) + 50);
      });
    });
  }

  /**
   * Get browser executable path
   */
  async getExecutablePath() {
    if (isServerless) {
      try {
        const chromium = require('@sparticuz/chromium');
        return await chromium.executablePath();
      } catch (e) {
        console.log('[Browser] @sparticuz/chromium not available, using puppeteer default');
      }
    }
    
    const { executablePath } = require('puppeteer');
    return executablePath();
  }

  /**
   * MAIN SCRAPING FUNCTION
   */
  async searchKeywordAds(keyword, proxyConfig, options = {}) {
    const { country = 'us', debug = false } = options;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`[ADVANCED SCRAPER] Keyword: "${keyword}" | Proxy: ${proxyConfig?.provider || 'None'}`);
    console.log(`${'═'.repeat(70)}`);

    if (!proxyConfig || !proxyConfig.host) {
      return { success: false, error: 'NO_PROXY', message: 'Residential proxy configuration required' };
    }

    const fingerprint = this.generateFingerprint();
    console.log(`[Fingerprint] ${fingerprint.location.city} | ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);

    let browser = null;
    
    try {
      const execPath = await this.getExecutablePath();
      
      const launchOptions = {
        headless: 'new',
        executablePath: execPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          `--lang=${fingerprint.language.split(',')[0]}`
        ],
        ignoreHTTPSErrors: true
      };

      // Add proxy
      const proxy = this.formatProxyUrl(proxyConfig);
      launchOptions.args.push(`--proxy-server=${proxy.server}`);
      console.log(`[Proxy] ${proxy.server}`);

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // Authenticate proxy
      if (proxy.username && proxy.password) {
        await page.authenticate({ username: proxy.username, password: proxy.password });
      }

      await page.setViewport(fingerprint.viewport);
      await page.setUserAgent(fingerprint.userAgent);
      await page.setExtraHTTPHeaders({
        'Accept-Language': fingerprint.language,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      });

      // Anti-detection overrides
      await page.evaluateOnNewDocument((fp) => {
        Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
        Object.defineProperty(navigator, 'languages', { get: () => fp.language.split(',') });
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
      }, fingerprint);

      await page.setGeolocation({ latitude: fingerprint.location.lat, longitude: fingerprint.location.lng, accuracy: 100 });
      await page.emulateTimezone(fingerprint.location.timezone);

      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en&gl=${country}&num=20`;
      console.log(`[Navigation] Loading Google...`);
      
      await page.goto(googleUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.humanDelay(1000, 2000);

      // CAPTCHA check
      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerText.includes('unusual traffic') || document.body.innerText.includes('CAPTCHA');
      });

      if (hasCaptcha) {
        await browser.close();
        return { success: false, error: 'CAPTCHA_DETECTED', message: 'CAPTCHA detected. Try different proxy session.' };
      }

      await this.humanMouseMove(page);
      await this.humanScroll(page);
      await this.humanDelay(500, 1000);

      // Extract ads
      console.log('[Extraction] Extracting ads...');
      const adsData = await page.evaluate(() => {
        const result = { searchAds: [], shoppingAds: [], localAds: [], organicCount: 0, relatedSearches: [] };
        const clean = (text) => (text || '').trim().replace(/\s+/g, ' ');

        // SEARCH ADS
        document.querySelectorAll('div').forEach((div, index) => {
          const text = div.innerText || '';
          const hasAd = text.startsWith('Sponsored') || text.startsWith('Ad ·');
          const hasAdLink = div.querySelector('a[href*="googleadservices"]') || div.querySelector('a[href*="aclk"]');
          
          if (hasAd && hasAdLink) {
            const titleEl = div.querySelector('h3') || div.querySelector('[role="heading"]');
            const title = clean(titleEl?.innerText);
            
            const linkEl = div.querySelector('a[href*="googleadservices"]') || div.querySelector('a[href*="aclk"]');
            const link = linkEl?.href || '';
            
            const displayUrlEl = div.querySelector('cite') || div.querySelector('[data-dtld]');
            let displayUrl = clean(displayUrlEl?.innerText);
            if (!displayUrl && link) try { displayUrl = new URL(link).hostname; } catch(e) {}
            
            const descEl = div.querySelector('.MUxGbd') || div.querySelector('[role="text"]');
            const description = clean(descEl?.innerText);
            
            const phoneMatch = div.innerText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            
            if (title || displayUrl) {
              result.searchAds.push({
                position: result.searchAds.length + 1,
                type: 'search',
                placement: result.searchAds.length < 4 ? 'top' : 'bottom',
                title: title || `Ad ${index + 1}`,
                displayUrl: displayUrl || '',
                description: description || '',
                link,
                phone: phoneMatch ? phoneMatch[0] : null,
                hasCallExtension: !!phoneMatch
              });
            }
          }
        });

        // SHOPPING ADS
        document.querySelectorAll('.sh-dgr__grid-result, .mnr-c, .pla-unit').forEach((el, index) => {
          const title = clean(el.querySelector('h3, h4, .pymv4e')?.innerText);
          const price = clean(el.querySelector('.a8Pemb, .e10twf')?.innerText);
          const merchant = clean(el.querySelector('.aULzUe, .LbUacb')?.innerText);
          const image = el.querySelector('img')?.src || '';
          const link = el.querySelector('a')?.href || '';
          
          if (title && (price || merchant)) {
            result.shoppingAds.push({ position: index + 1, type: 'shopping', placement: 'shopping', title, displayUrl: merchant, price, link, image });
          }
        });

        // LOCAL ADS
        document.querySelectorAll('.VkpGBb, [data-local-attribute]').forEach((el, index) => {
          const title = clean(el.querySelector('[role="heading"], .dbg0pd')?.innerText);
          const address = clean(el.querySelector('.LrzXr')?.innerText);
          const phoneMatch = el.innerText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
          const ratingMatch = el.innerText.match(/(\d+\.?\d*)\s*star/i);
          const isSponsored = el.innerText.toLowerCase().includes('sponsored');
          
          if (title) {
            result.localAds.push({
              position: index + 1, type: 'local', placement: 'local_pack', isSponsored, title, address,
              phone: phoneMatch ? phoneMatch[0] : '', rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
              hasCallButton: !!phoneMatch
            });
          }
        });

        result.organicCount = document.querySelectorAll('.g:not([data-text-ad])').length;
        document.querySelectorAll('.k8XOCe, .s75CSd').forEach(el => {
          const query = clean(el.innerText);
          if (query && query.length > 2 && query.length < 100) result.relatedSearches.push(query);
        });
        
        return result;
      });

      await browser.close();

      const allAds = [...adsData.searchAds, ...adsData.shoppingAds, ...adsData.localAds.filter(a => a.isSponsored)];
      console.log(`[Results] Search: ${adsData.searchAds.length}, Shopping: ${adsData.shoppingAds.length}, Local: ${adsData.localAds.length}`);

      return {
        success: true,
        keyword,
        country,
        fingerprint: { city: fingerprint.location.city, viewport: `${fingerprint.viewport.width}x${fingerprint.viewport.height}`, userAgent: fingerprint.userAgent.substring(0, 50) + '...' },
        totalAds: allAds.length,
        searchAdsCount: adsData.searchAds.length,
        shoppingAdsCount: adsData.shoppingAds.length,
        localAdsCount: adsData.localAds.length,
        searchAds: adsData.searchAds,
        shoppingAds: adsData.shoppingAds,
        localAds: adsData.localAds,
        allAds,
        organicCount: adsData.organicCount,
        relatedSearches: adsData.relatedSearches.slice(0, 10),
        timestamp: new Date().toISOString(),
        source: 'Advanced Scraper (Residential Proxy)',
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      };

    } catch (error) {
      console.error('[SCRAPER ERROR]', error.message);
      if (browser) try { await browser.close(); } catch(e) {}
      return { success: false, error: error.message, keyword };
    }
  }

  async searchMultipleKeywords(keywords, proxyConfig, options = {}) {
    const results = [];
    for (let i = 0; i < Math.min(keywords.length, 10); i++) {
      const result = await this.searchKeywordAds(keywords[i], { ...proxyConfig, session: `kw_${i}_${Date.now()}` }, options);
      results.push(result);
      if (i < keywords.length - 1) await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));
    }
    return { success: true, totalKeywords: results.length, totalAdsFound: results.reduce((s, r) => s + (r.totalAds || 0), 0), results };
  }

  async testProxy(proxyConfig) {
    console.log('[Proxy Test] Testing...');
    try {
      const execPath = await this.getExecutablePath();
      const proxy = this.formatProxyUrl(proxyConfig);
      
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${proxy.server}`]
      });
      
      const page = await browser.newPage();
      if (proxy.username) await page.authenticate({ username: proxy.username, password: proxy.password });
      
      await page.goto('https://api.ipify.org?format=json', { timeout: 30000 });
      const ipContent = await page.content();
      const ip = (ipContent.match(/(\d+\.\d+\.\d+\.\d+)/) || [])[1] || 'Unknown';
      
      await page.goto('https://ipapi.co/json/', { timeout: 30000 });
      const geoContent = await page.evaluate(() => document.body.innerText);
      let geo = {}; try { geo = JSON.parse(geoContent); } catch(e) {}
      
      await browser.close();
      
      return { success: true, ip, location: { city: geo.city || 'Unknown', country: geo.country_name || 'Unknown', isp: geo.org || 'Unknown' } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AdvancedGoogleAdsScraper();
