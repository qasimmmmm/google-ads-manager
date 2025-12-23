# AdsPro v13 - Advanced Google Ads Scraper

## 🌟 Works on Vercel with Residential Proxies!

### Features
- ✅ **Residential Proxy Support** - Bright Data, Oxylabs, SmartProxy, IPRoyal
- ✅ **Session Rotation** - New IP for each search
- ✅ **Anti-Detection** - Randomized headers
- ✅ **All Ad Types** - Search, Shopping, Local, Call
- ✅ **Vercel Compatible** - No Puppeteer needed!

---

## 🚀 Quick Start

### 1. Deploy to Vercel
Push to GitHub → Import to Vercel → Deploy

### 2. Get Residential Proxy
Sign up with one of these providers:

| Provider | Website | Price |
|----------|---------|-------|
| Bright Data | brightdata.com | $15/GB |
| SmartProxy | smartproxy.com | $8/GB |
| IPRoyal | iproyal.com | $7/GB |

### 3. Configure Proxy
In Keyword Planner, click "Search Current Ads" and enter:
- Provider (e.g., `brightdata`)
- Host (e.g., `brd.superproxy.io`)
- Port (e.g., `22225`)
- Username
- Password

### 4. Search!
Each search gets a NEW residential IP automatically.

---

## 🔧 Proxy Configuration Examples

### Bright Data
```
Provider: brightdata
Host: brd.superproxy.io
Port: 22225
Username: brd-customer-XXXXX-zone-residential
Password: your-password
```

### SmartProxy
```
Provider: smartproxy
Host: gate.smartproxy.com
Port: 7000
Username: spXXXXXXX
Password: your-password
```

### IPRoyal
```
Provider: iproyal
Host: geo.iproyal.com
Port: 12321
Username: your-username
Password: your-password
```

---

## ⚠️ Important Notes

### Vercel Timeout
- **Free Plan:** 10 seconds (may timeout)
- **Pro Plan ($20/mo):** 60 seconds (recommended)

### If You Get CAPTCHA
Click "Search" again - each request gets a new IP!

### Cost Estimation
~$0.02-0.05 per search (300KB data)

---

## 📞 Support
Open a GitHub issue for help.

## 🧭 Backend Overview
For route structure, authentication flow, and integration notes, see [docs/OVERVIEW.md](docs/OVERVIEW.md).
