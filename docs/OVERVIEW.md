# Google Ads Manager Backend Overview

This document summarizes the current backend implementation to help orient contributors and highlight risky areas that need extra attention.

## Runtime & Entry Point
- **Server:** `src/server.js` boots an Express 4 app, enables CORS + JSON + cookies, serves static assets from `public/`, wires route modules, exposes `/health`, and falls back to `index.html` for unmatched routes.
- **Environment:** Requires Node 18+ (per `package.json`). Critical environment variables include Google Ads credentials (`GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, optional `GOOGLE_ADS_MANAGER_ID`), OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_CALLBACK_URL`), and Anthropic/SEM/other API keys depending on enabled features.

## Authentication
- **OAuth flow:** `src/routes/auth.js` wraps a Google OAuth2 client, issues secure, HTTP-only `auth_data` cookies (base64-encoded tokens + profile), and exposes `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/status`, and `/auth/tokens`.
- **Auth helpers:** Several routes re-implement lightweight cookie parsing instead of reusing a shared helper. Missing/expired tokens produce `401` responses.

## Core Routes
- **Google Ads data (`src/routes/api.js`):**
  - Uses `GoogleAdsService` to fetch account summaries, campaigns, keywords, ads, locations, devices, audiences, conversion actions, and a combined dashboard view.
  - All endpoints require auth; date ranges are derived from query parameters (e.g., `last30`, `last7`, `today`).
- **AI chat (`src/routes/ai.js`):**
  - Integrates Anthropic Claude via streaming (`/ai/chat/stream`) and non-streaming (`/ai/chat`) endpoints with per-user in-memory histories keyed by authenticated email.
- **Automation (`src/routes/automation.js`):**
  - Coordinates competitor research, keyword discovery, campaign plan/ad copy generation, optimization analysis, and an end-to-end automation pipeline. Requires both Claude and research API keys depending on the endpoint.
- **Free automation (`src/routes/freeAutomation.js`):**
  - Public utilities for autocomplete-based keyword research and Google SERP/Transparency Center scraping for ads and competitor intel (API key requirements vary by feature).

## Services
- **`GoogleAdsService` (`src/services/googleAds.js`):** REST client for Google Ads GAQL search streams, with helpers to format metrics, channel types, bid strategies, match types, and devices.
- **`aiCampaignManager.js`:** High-level AI orchestration, including SEMrush/DataForSEO research, keyword opportunity scoring, campaign planning, ad copy generation, and optimization analysis via Anthropic.
- **`advancedScraper.js`, `googleAdsTransparency.js`, `freeKeywordResearch.js`:** Scraping and data-enrichment utilities used by free automation endpoints.

## Notable Behaviors & Risks
- **In-memory state:** AI chat histories live in memory, so they reset on process restart and are not per-session when deployed to multiple instances.
- **Credential handling:** Routes expect API keys in request bodies for research/AI providers; there is no centralized secret management or rate limiting.
- **Error handling:** Most routes send `500` on failure with minimal redaction; upstream API errors can leak details to clients.
- **Static client:** The backend serves a prebuilt frontend from `public/` (not included in this overview), so SPA routing depends on the `app.get('*')` catch-all.

## Recent Bug Fix
- **Keyword filtering:** The keywords endpoint (`GET /api/keywords`) now respects the optional `campaignId` query parameter by injecting a GAQL filter before querying Google Ads, ensuring results are scoped correctly to the requested campaign.
