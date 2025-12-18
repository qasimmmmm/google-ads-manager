const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  // System prompt for the Google Ads AI Assistant
  getSystemPrompt() {
    return `You are AdsPro AI, an expert Google Ads campaign manager and marketing assistant. You help users:

1. **Create Campaigns**: When asked to create a campaign, provide a detailed plan including:
   - Campaign name and type (Search, Display, Video, etc.)
   - Recommended daily budget
   - Target locations
   - Suggested keywords (with estimated CPC and volume)
   - Ad copy (headlines and descriptions)
   - Bidding strategy recommendation

2. **Keyword Research**: When asked about keywords:
   - Suggest relevant keywords for their business
   - Explain search intent (commercial, informational, navigational)
   - Provide estimated metrics (volume, CPC, competition)
   - Recommend match types (broad, phrase, exact)

3. **Competitor Analysis**: When asked about competitors:
   - Analyze their likely strategy
   - Suggest keywords they might be targeting
   - Recommend ways to differentiate

4. **Optimization Tips**: Provide actionable advice on:
   - Improving Quality Score
   - Reducing CPC
   - Increasing CTR
   - Better conversion rates

5. **Ad Copy Generation**: Write compelling:
   - Headlines (max 30 characters each)
   - Descriptions (max 90 characters each)
   - Call-to-action phrases

Always be specific, actionable, and data-driven. When suggesting campaigns or keywords, format them clearly so users can implement them.

The user's business is a telecommunications company (The Quantum Leap) selling internet and cable TV services across the US.

When providing campaign plans, use this format:
📊 **Campaign Name**: [Name]
🎯 **Type**: [Search/Display/Video/etc.]
💰 **Daily Budget**: $[amount]
📍 **Locations**: [targets]

**Keywords**:
| Keyword | Match Type | Est. CPC | Est. Volume |
|---------|------------|----------|-------------|
| keyword | Exact/Phrase/Broad | $X.XX | X,XXX |

**Ad Copy**:
Headline 1: [max 30 chars]
Headline 2: [max 30 chars]
Headline 3: [max 30 chars]
Description 1: [max 90 chars]
Description 2: [max 90 chars]

Always end by asking if they want you to create this campaign or make modifications.`;
  }

  // Send message to Claude
  async chat(messages, userMessage) {
    try {
      // Add user message to history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: this.getSystemPrompt(),
        messages: conversationHistory
      });

      return {
        success: true,
        message: response.content[0].text,
        usage: response.usage
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get AI response'
      };
    }
  }

  // Generate ad copy
  async generateAdCopy(product, targetAudience, uniqueSellingPoints) {
    const prompt = `Generate Google Ads copy for:
Product/Service: ${product}
Target Audience: ${targetAudience}
Unique Selling Points: ${uniqueSellingPoints}

Please provide:
- 5 headline options (max 30 characters each)
- 3 description options (max 90 characters each)
- 2 call-to-action variations`;

    return this.chat([], prompt);
  }

  // Generate keyword ideas
  async generateKeywords(seedKeyword, industry, location) {
    const prompt = `Generate keyword ideas for Google Ads:
Seed Keyword: ${seedKeyword}
Industry: ${industry}
Target Location: ${location}

Please provide 15-20 keyword suggestions with:
- The keyword
- Recommended match type
- Estimated search intent (commercial/informational/navigational)
- Estimated competition level (low/medium/high)

Format as a table.`;

    return this.chat([], prompt);
  }

  // Analyze campaign performance
  async analyzeCampaign(campaignData) {
    const prompt = `Analyze this Google Ads campaign performance and provide optimization recommendations:

${JSON.stringify(campaignData, null, 2)}

Please provide:
1. Overall performance assessment
2. Top 3 issues identified
3. Specific recommendations to improve
4. Expected impact of each recommendation`;

    return this.chat([], prompt);
  }

  // Create campaign plan
  async createCampaignPlan(businessType, goals, budget, locations) {
    const prompt = `Create a detailed Google Ads campaign plan:
Business Type: ${businessType}
Goals: ${goals}
Monthly Budget: ${budget}
Target Locations: ${locations}

Please provide a complete campaign structure with keywords, ad copy, and settings.`;

    return this.chat([], prompt);
  }
}

module.exports = AIService;
