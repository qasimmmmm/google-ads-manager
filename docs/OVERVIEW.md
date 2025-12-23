# Google Ads Manager Backend Overview

This document explains how the backend is structured, what each module does, and where the risky areas live so new contributors can get productive quickly.

## Runtime & Entry Point
- **Server:** `src/server.js` boots an Express 4 app, enables CORS + JSON + cookies, serves static assets from `public/`, wires route modules, exposes `/health`, and falls back to `index.html` for unmatched routes.
- **Environment:** Node 18+ is required (per `package.json`). Critical variables: Google Ads (`GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, optional `GOOGLE_ADS_MANAGER_ID`), OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_CALLBACK_URL`), and Anthropic/SEM/other API keys depending on features invoked.
- **Static SPA:** The backend serves the prebuilt frontend from `public/`; SPA routing relies on the `app.get('*')` catch-all.

## Authentication
- **OAuth flow:** `src/routes/auth.js` wraps a Google OAuth2 client, issues secure, HTTP-only `auth_data` cookies (base64-encoded tokens + profile), and exposes `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/status`, and `/auth/tokens`.
- **Token access:** API routes parse `auth_data` manually (lightweight helper inside `api.js`). Missing/expired tokens return `401`.
- **Session scope:** Cookies are 24h, `secure`, and `sameSite=lax`; there is no refresh-token reuse in backend calls yet.

## Route Map (all under `/`)
- **`/auth` (`src/routes/auth.js`):** Google OAuth login/logout/status + token retrieval.
- **`/api` (`src/routes/api.js`, auth required):**
  - `GET /summary` — account metrics aggregated by day.
  - `GET /campaigns` — campaign list with performance stats.
  - `GET /keywords` — keyword stats with optional `campaignId` filter.
  - `GET /ads` — responsive/expanded ad performance highlights.
  - `GET /locations` — geo performance aggregated by city/region/country.
  - `GET /devices` — device breakdown.
  - `GET /audiences` — user list/interest audience performance.
  - `GET /conversions` — configured conversion actions.
  - `GET /dashboard` — combined summary + top campaigns + device split.
- **`/ai` (`src/routes/ai.js`):** Anthropic Claude chat endpoints (streaming + buffered) with in-memory histories keyed by user email.
- **`/automation` (`src/routes/automation.js`):** Paid automation flows (competitor research, keyword discovery, campaign/ad generation, optimization analysis, and an end-to-end orchestrator).
- **`/freeAutomation` (`src/routes/freeAutomation.js`):** Public keyword research and scraping utilities that rely on third-party APIs.

## Services & Responsibilities
- **`GoogleAdsService` (`src/services/googleAds.js`):** Thin REST client around GAQL search streams. Handles account summary, campaigns, keywords (with match-type formatting), ads, devices, geo performance, audience performance, conversion actions, and formatting helpers for enums.
- **`aiCampaignManager.js`:** Orchestrates SEMrush/DataForSEO research, keyword scoring, campaign planning, ad copy drafting, and optimization analysis with Anthropic.
- **`advancedScraper.js`, `googleAdsTransparency.js`, `freeKeywordResearch.js`:** Scrapers and enrichment utilities backing free automation endpoints.

## Data Flow (example: `/api/keywords`)
1) `requireAuth` in `api.js` decodes `auth_data` and injects access token.
2) Date range is derived via `getDateRange(range)` (defaults to `last30`).
3) `GoogleAdsService.getKeywords(startDate, endDate, campaignId)` builds a GAQL query; invalid `campaignId` is rejected before the request is sent.
4) Results are normalized (cost/revenue micros → currency, enum formatting) and returned to the caller.

## Operational Risks & Gaps
- **In-memory chat history:** AI chat histories are not persisted; multi-instance deployments will not share context.
- **Secret handling:** API keys are accepted in request bodies for some automation endpoints; there is no central secret vault or rate limiting.
- **Error handling:** Most routes return raw error messages; upstream provider errors can leak details.
- **Token refresh:** Google Ads calls now attempt a single access-token refresh on 401/403 responses when a refresh token exists; sessions without refresh tokens will still expire.

## Recent Fixes
- **Keyword filtering:** `/api/keywords` now respects `campaignId` and validates it is numeric before injecting into GAQL.
- **Missing Google Ads handlers:** Added Google Ads service methods for geo locations, audiences, and conversion actions so `/api/locations`, `/api/audiences`, and `/api/conversions` return data instead of failing.
- **Access token refresh:** Google Ads requests retry once after refreshing the access token when valid refresh credentials are available.
