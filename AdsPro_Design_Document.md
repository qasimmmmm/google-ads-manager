# AdsPro - Google Ads Management Tool
## Design Documentation

---

## 1. Executive Summary

**Company:** The Quantum Leap  
**Website:** https://thequantumleap.us  
**Tool Name:** AdsPro - Internal Google Ads Management Dashboard  
**Purpose:** Internal campaign management and performance monitoring tool  
**Users:** Internal marketing team only (5-10 users)

---

## 2. Business Overview

The Quantum Leap is a telecommunications service provider offering internet and cable TV products across the United States. We heavily rely on Google Ads to acquire customers searching for home internet and broadband services.

### Current Challenges:
- Managing multiple campaigns across different regions
- Tracking performance metrics efficiently
- Generating custom reports for stakeholders
- Optimizing ad spend based on real-time data

### Solution:
We are building an internal dashboard that connects to the Google Ads API to provide our marketing team with a centralized view of all campaign performance data.

---

## 3. Tool Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AdsPro Dashboard                          │
│                  (Internal Web Application)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Backend                           │
│              (Express.js REST API Server)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OAuth 2.0 + REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Ads API                             │
│                    (v14 - Latest)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, Tailwind CSS, Chart.js |
| Backend | Node.js 18+, Express.js |
| API Client | google-ads-api (npm package) |
| Authentication | OAuth 2.0 via Google |
| Hosting | Internal server / Railway / Vercel |

---

## 4. Google Ads API Usage

### 4.1 API Resources Used

| Resource | Purpose | Operations |
|----------|---------|------------|
| Customer | Account overview | READ |
| Campaign | Campaign performance | READ |
| AdGroup | Ad group metrics | READ |
| AdGroupAd | Ad performance | READ |
| AdGroupCriterion | Keyword data | READ |
| GeoTargetConstant | Location performance | READ |
| ConversionAction | Conversion tracking | READ |

### 4.2 API Operations

**We will ONLY use READ operations. No write/mutate operations are planned.**

#### Queries Used:

**1. Account Summary**
```sql
SELECT
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros,
  metrics.conversions_value,
  segments.date
FROM customer
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
```

**2. Campaign Performance**
```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros
FROM campaign
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
```

**3. Keyword Performance**
```sql
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  ad_group_criterion.quality_info.quality_score,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros
FROM keyword_view
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
```

**4. Device Performance**
```sql
SELECT
  segments.device,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros
FROM campaign
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
```

---

## 5. Authentication & Security

### 5.1 OAuth 2.0 Flow

1. User clicks "Sign in with Google"
2. User is redirected to Google OAuth consent screen
3. User grants permission to access Google Ads data
4. Application receives authorization code
5. Backend exchanges code for access token
6. Access token is used for API requests
7. Refresh token is used to maintain session

### 5.2 Security Measures

- All credentials stored in environment variables
- HTTPS enforced for all connections
- Session tokens encrypted
- No credentials exposed to frontend
- Access limited to internal team only

---

## 6. Features & Functionality

### 6.1 Dashboard
- Total impressions, clicks, conversions, cost, revenue
- ROAS and CPA calculations
- Performance trend charts (30/60/90 days)
- Device distribution breakdown

### 6.2 Campaign Management (View Only)
- List all campaigns with performance metrics
- Filter by campaign type and status
- Sort by any metric
- View campaign details

### 6.3 Keyword Analysis (View Only)
- List all keywords with quality scores
- View quality score components (Expected CTR, Ad Relevance, Landing Page)
- Filter by match type
- Identify underperforming keywords

### 6.4 Ad Performance (View Only)
- View all ads with performance data
- See ad strength indicators
- View headlines and descriptions

### 6.5 Reporting
- Custom date range selection
- Export data to CSV
- Performance comparison periods

---

## 7. Rate Limiting & Best Practices

### 7.1 API Call Optimization
- Batch multiple metrics in single queries
- Cache frequently accessed data (5-minute TTL)
- Use appropriate date ranges to limit data volume
- Implement exponential backoff for retries

### 7.2 Rate Limit Compliance
- Monitor daily quota usage
- Implement request throttling
- Log all API calls for auditing

---

## 8. User Access Control

| Role | Access Level |
|------|--------------|
| Admin | Full dashboard access |
| Marketing Manager | Full dashboard access |
| Marketing Analyst | View-only access |

**Total Expected Users:** 5-10 internal employees

---

## 9. Data Handling

### 9.1 Data Storage
- No Google Ads data is permanently stored
- Data is fetched on-demand from API
- Session data stored temporarily in memory
- No data shared with third parties

### 9.2 Data Retention
- API responses cached for 5 minutes maximum
- User sessions expire after 24 hours
- No historical data warehouse

---

## 10. Compliance

### 10.1 Google Ads API Terms
- ✅ Tool is for internal use only
- ✅ No data reselling or sharing
- ✅ READ-only operations
- ✅ Proper OAuth implementation
- ✅ Secure credential storage

### 10.2 Privacy
- No personal user data collected beyond Google profile
- Compliant with Google's Privacy Policy
- No third-party tracking or analytics

---

## 11. Support & Maintenance

**Technical Contact:** qasimarshad1998@gmail.com  
**Company Website:** https://thequantumleap.us

### Maintenance Schedule
- Regular dependency updates
- Security patches as needed
- Feature updates based on team feedback

---

## 12. Screenshots / UI Mockups

### Dashboard View
- 6 KPI cards showing key metrics
- Performance trend line chart
- Device distribution pie chart
- Top campaigns table

### Campaigns View
- Sortable table with all campaigns
- Status indicators
- Performance metrics columns

### Keywords View
- Quality score indicators
- Match type badges
- Performance metrics

---

## 13. Conclusion

AdsPro is a straightforward internal reporting tool designed to help The Quantum Leap's marketing team monitor Google Ads performance more efficiently. The tool:

1. Uses READ-only API operations
2. Is restricted to internal employees
3. Does not store or share any data
4. Follows all Google Ads API best practices

We are committed to maintaining compliance with all Google Ads API policies and terms of service.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Prepared By:** The Quantum Leap Marketing Team
