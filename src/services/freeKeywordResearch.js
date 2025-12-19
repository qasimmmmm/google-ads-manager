/* ═══════════════════════════════════════════════════════════════════
   FREE Keyword Research Service
   Uses Google Autocomplete - No API key required!
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');

class FreeKeywordResearch {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Make HTTPS GET request
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Get keyword suggestions from Google Autocomplete (100% FREE)
   */
  async getAutocompleteSuggestions(keyword, language = 'en', country = 'us') {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}&hl=${language}&gl=${country}`;
      
      const data = await this.makeRequest(url);
      
      // Google returns: [query, [suggestions], [], {"google:suggesttype":[]}, ...]
      const suggestions = (Array.isArray(data) && data[1]) ? data[1] : [];
      
      return {
        success: true,
        keyword,
        suggestions: suggestions.map((s, i) => ({
          keyword: s,
          source: 'google_autocomplete',
          rank: i + 1
        }))
      };
    } catch (error) {
      console.error('[Keyword] Autocomplete error:', error.message);
      return { success: false, suggestions: [], error: error.message };
    }
  }

  /**
   * Get expanded keywords using alphabet soup method
   */
  async getExpandedKeywords(seedKeyword, language = 'en', country = 'us') {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const prefixes = ['', 'how to ', 'what is ', 'best ', 'why ', 'when '];
    const suffixes = ['', ' vs', ' for', ' with', ' near me', ' online'];
    
    const allKeywords = new Map();
    
    try {
      // Search with alphabet additions (first 10 letters)
      for (const letter of alphabet.slice(0, 10)) {
        const result = await this.getAutocompleteSuggestions(`${seedKeyword} ${letter}`, language, country);
        if (result.success) {
          result.suggestions.forEach(s => {
            if (!allKeywords.has(s.keyword.toLowerCase())) {
              allKeywords.set(s.keyword.toLowerCase(), s);
            }
          });
        }
        // Small delay to avoid rate limiting
        await this.sleep(100);
      }
      
      // Add common prefixes
      for (const prefix of prefixes.slice(0, 3)) {
        const result = await this.getAutocompleteSuggestions(`${prefix}${seedKeyword}`, language, country);
        if (result.success) {
          result.suggestions.forEach(s => {
            if (!allKeywords.has(s.keyword.toLowerCase())) {
              allKeywords.set(s.keyword.toLowerCase(), s);
            }
          });
        }
        await this.sleep(100);
      }
      
      // Add common suffixes
      for (const suffix of suffixes.slice(0, 3)) {
        const result = await this.getAutocompleteSuggestions(`${seedKeyword}${suffix}`, language, country);
        if (result.success) {
          result.suggestions.forEach(s => {
            if (!allKeywords.has(s.keyword.toLowerCase())) {
              allKeywords.set(s.keyword.toLowerCase(), s);
            }
          });
        }
        await this.sleep(100);
      }
      
      return {
        success: true,
        seedKeyword,
        totalKeywords: allKeywords.size,
        keywords: Array.from(allKeywords.values())
      };
    } catch (error) {
      return { success: false, keywords: [], error: error.message };
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get "People Also Ask" style questions
   */
  async getRelatedQuestions(keyword) {
    const questionPatterns = [
      `what is ${keyword}`,
      `how does ${keyword} work`,
      `how much does ${keyword} cost`,
      `${keyword} vs`,
      `best ${keyword}`
    ];

    try {
      const questions = [];
      
      for (const q of questionPatterns) {
        const result = await this.getAutocompleteSuggestions(q);
        if (result.success) {
          questions.push({
            question: q,
            relatedSuggestions: result.suggestions.slice(0, 3)
          });
        }
        await this.sleep(100);
      }

      return {
        success: true,
        keyword,
        questions
      };
    } catch (error) {
      return { success: false, questions: [], error: error.message };
    }
  }

  /**
   * Estimate keyword metrics (AI-based estimation)
   */
  estimateKeywordMetrics(keyword) {
    const wordCount = keyword.split(' ').length;
    const hasCommercialIntent = /buy|price|cost|cheap|best|review|vs|compare|deal|discount|free|download/i.test(keyword);
    const hasLocalIntent = /near me|in \w+|local/i.test(keyword);
    const hasQuestionIntent = /^(how|what|why|when|where|who|which|is|can|do|does)/i.test(keyword);
    
    // Estimate difficulty
    let difficulty = 50;
    if (wordCount >= 4) difficulty -= 20;
    if (wordCount >= 6) difficulty -= 15;
    if (hasCommercialIntent) difficulty += 15;
    if (hasLocalIntent) difficulty -= 10;
    if (hasQuestionIntent) difficulty -= 5;
    difficulty = Math.max(10, Math.min(95, difficulty));
    
    // Estimate CPC
    let estimatedCpc = 1.5;
    if (hasCommercialIntent) estimatedCpc *= 2.5;
    if (hasLocalIntent) estimatedCpc *= 1.5;
    if (wordCount >= 4) estimatedCpc *= 0.7;
    
    // Determine intent
    let intent = 'Informational';
    if (hasCommercialIntent) intent = 'Commercial';
    if (/buy|order|purchase|subscribe|sign up/i.test(keyword)) intent = 'Transactional';
    if (hasLocalIntent) intent = 'Local';
    if (hasQuestionIntent && !hasCommercialIntent) intent = 'Informational';
    
    // Difficulty label
    let difficultyLabel = 'Medium';
    if (difficulty <= 30) difficultyLabel = 'Easy';
    else if (difficulty <= 60) difficultyLabel = 'Medium';
    else difficultyLabel = 'Hard';

    return {
      keyword,
      difficulty,
      difficultyLabel,
      estimatedCpc: parseFloat(estimatedCpc.toFixed(2)),
      intent,
      wordCount,
      opportunityScore: Math.round(100 - difficulty + (hasCommercialIntent ? 20 : 0))
    };
  }

  /**
   * Full keyword research combining all methods
   */
  async fullKeywordResearch(seedKeyword, options = {}) {
    const { maxKeywords = 100, language = 'en', country = 'us' } = options;
    
    try {
      console.log(`[Keyword] Starting research for: ${seedKeyword}`);
      
      // Get expanded keywords
      const expanded = await this.getExpandedKeywords(seedKeyword, language, country);
      
      // Add metrics to each keyword
      const keywordsWithMetrics = expanded.keywords.slice(0, maxKeywords).map(kw => ({
        ...kw,
        ...this.estimateKeywordMetrics(kw.keyword)
      }));
      
      // Sort by opportunity score
      keywordsWithMetrics.sort((a, b) => b.opportunityScore - a.opportunityScore);
      
      // Get related questions
      const questions = await this.getRelatedQuestions(seedKeyword);
      
      console.log(`[Keyword] Found ${keywordsWithMetrics.length} keywords`);
      
      return {
        success: true,
        seedKeyword,
        totalKeywords: keywordsWithMetrics.length,
        keywords: keywordsWithMetrics,
        questions: questions.questions || [],
        summary: {
          avgDifficulty: keywordsWithMetrics.length > 0 
            ? Math.round(keywordsWithMetrics.reduce((a, k) => a + k.difficulty, 0) / keywordsWithMetrics.length)
            : 0,
          avgCpc: keywordsWithMetrics.length > 0
            ? parseFloat((keywordsWithMetrics.reduce((a, k) => a + k.estimatedCpc, 0) / keywordsWithMetrics.length).toFixed(2))
            : 0,
          easyKeywords: keywordsWithMetrics.filter(k => k.difficultyLabel === 'Easy').length,
          commercialKeywords: keywordsWithMetrics.filter(k => k.intent === 'Commercial' || k.intent === 'Transactional').length
        }
      };
    } catch (error) {
      console.error('[Keyword] Research error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FreeKeywordResearch();
