/* ═══════════════════════════════════════════════════════════════════
   FREE Keyword Research Service
   Uses Google Autocomplete + scraping - No API key required!
   ═══════════════════════════════════════════════════════════════════ */

const fetch = require('node-fetch');

class FreeKeywordResearch {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9'
    };
  }

  // Get keyword suggestions from Google Autocomplete (100% FREE)
  async getAutocompleteSuggestions(keyword, language = 'en', country = 'us') {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}&hl=${language}&gl=${country}`;
      
      const response = await fetch(url, { headers: this.headers });
      const data = await response.json();
      
      // Google returns: [query, [suggestions], [], {"google:suggesttype":[]}, ...]
      const suggestions = data[1] || [];
      
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
      return { success: false, suggestions: [], error: error.message };
    }
  }

  // Get expanded keywords using alphabet soup method
  async getExpandedKeywords(seedKeyword, language = 'en', country = 'us') {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const prefixes = ['', 'how to ', 'what is ', 'best ', 'why ', 'when ', 'where ', 'who '];
    const suffixes = ['', ' vs', ' for', ' with', ' without', ' near me', ' online', ' free'];
    
    const allKeywords = new Map();
    
    try {
      // Search with alphabet additions
      const promises = [];
      
      // Add letter after keyword
      for (const letter of alphabet.slice(0, 10)) { // First 10 letters to avoid rate limiting
        promises.push(this.getAutocompleteSuggestions(`${seedKeyword} ${letter}`, language, country));
      }
      
      // Add common prefixes
      for (const prefix of prefixes.slice(0, 4)) {
        promises.push(this.getAutocompleteSuggestions(`${prefix}${seedKeyword}`, language, country));
      }
      
      // Add common suffixes
      for (const suffix of suffixes.slice(0, 4)) {
        promises.push(this.getAutocompleteSuggestions(`${seedKeyword}${suffix}`, language, country));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success && result.suggestions) {
          result.suggestions.forEach(s => {
            if (!allKeywords.has(s.keyword.toLowerCase())) {
              allKeywords.set(s.keyword.toLowerCase(), s);
            }
          });
        }
      });
      
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

  // Get "People Also Ask" questions (simulated based on patterns)
  async getRelatedQuestions(keyword) {
    const questionPatterns = [
      `what is ${keyword}`,
      `how does ${keyword} work`,
      `why is ${keyword} important`,
      `how much does ${keyword} cost`,
      `what are the benefits of ${keyword}`,
      `how to get ${keyword}`,
      `is ${keyword} worth it`,
      `what is the best ${keyword}`,
      `how to choose ${keyword}`,
      `${keyword} vs alternatives`
    ];

    try {
      const promises = questionPatterns.map(q => this.getAutocompleteSuggestions(q));
      const results = await Promise.all(promises);
      
      const questions = [];
      results.forEach((result, index) => {
        if (result.success) {
          questions.push({
            question: questionPatterns[index],
            relatedSuggestions: result.suggestions.slice(0, 3)
          });
        }
      });

      return {
        success: true,
        keyword,
        questions
      };
    } catch (error) {
      return { success: false, questions: [], error: error.message };
    }
  }

  // Estimate keyword metrics (basic estimation without paid API)
  estimateKeywordMetrics(keyword) {
    // These are rough estimates based on keyword characteristics
    // In production, you'd want to use actual data
    const wordCount = keyword.split(' ').length;
    const hasCommercialIntent = /buy|price|cost|cheap|best|review|vs|compare|deal|discount|free|download/i.test(keyword);
    const hasLocalIntent = /near me|in \w+|local/i.test(keyword);
    const hasQuestionIntent = /^(how|what|why|when|where|who|which|is|can|do|does)/i.test(keyword);
    
    // Estimate difficulty (longer = easier, commercial = harder)
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

  // Full keyword research combining all methods
  async fullKeywordResearch(seedKeyword, options = {}) {
    const { maxKeywords = 100, language = 'en', country = 'us' } = options;
    
    try {
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
      
      return {
        success: true,
        seedKeyword,
        totalKeywords: keywordsWithMetrics.length,
        keywords: keywordsWithMetrics,
        questions: questions.questions || [],
        summary: {
          avgDifficulty: Math.round(keywordsWithMetrics.reduce((a, k) => a + k.difficulty, 0) / keywordsWithMetrics.length),
          avgCpc: parseFloat((keywordsWithMetrics.reduce((a, k) => a + k.estimatedCpc, 0) / keywordsWithMetrics.length).toFixed(2)),
          easyKeywords: keywordsWithMetrics.filter(k => k.difficultyLabel === 'Easy').length,
          commercialKeywords: keywordsWithMetrics.filter(k => k.intent === 'Commercial' || k.intent === 'Transactional').length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FreeKeywordResearch();
