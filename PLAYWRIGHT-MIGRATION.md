# Playwright Migration

This document describes the migration from `node-fetch` to `playwright-extra` with stealth plugin to bypass Cloudflare protection on HLTV.org.

## Changes Made

### 1. Dependencies Updated

**Removed:**
- `node-fetch` (^2.6.0)
- `user-agents` (^1.0.1017)
- `@types/node-fetch` (^2.5.7)
- `@types/user-agents` (^1.0.2)

**Added:**
- `playwright-extra` (^4.3.6)
- `puppeteer-extra-plugin-stealth` (^2.11.2)
- `playwright-core` (dev dependency for types)

**Updated:**
- `typescript` from ^4.0.2 to ^4.9.5 (required for modern type features)

### 2. New Files

**`src/browser.ts`:**
- Manages a persistent browser instance and context
- Uses `playwright-extra` with stealth plugin to evade detection
- Provides `init()`, `fetchHTML()`, and `close()` functions
- Configures realistic browser settings (viewport, user agent, headers)
- Handles Cloudflare challenges with retry logic

### 3. Modified Files

All API modules now use the shared browser instead of node-fetch:
- `src/config.ts` - Removed USER_AGENT export (handled by browser.ts)
- `src/index.ts` - Exports `init()` and `close()` functions
- `src/matches.ts` - Uses `fetchHTML()` instead of fetch
- `src/results.ts` - Uses `fetchHTML()` instead of fetch
- `src/match.ts` - Uses `fetchHTML()` instead of fetch
- `src/player.ts` - Uses `fetchHTML()` instead of fetch
- `src/players.ts` - Uses `fetchHTML()` instead of fetch
- `src/team.ts` - Uses `fetchHTML()` instead of fetch
- `src/teams.ts` - Uses `fetchHTML()` instead of fetch
- `src/rss.ts` - Uses `fetchHTML()` instead of fetch

### 4. TypeScript Configuration

Updated `tsconfig.json` to add `skipLibCheck: true` to avoid type errors from dependencies.

## Usage

### Initialization

```javascript
const HLTV = require('hltv-api').default

// Initialize the browser before making requests
await HLTV.init()

// Make API calls
const results = await HLTV.getResults()
const matches = await HLTV.getMatches()

// Close the browser when done
await HLTV.close()
```

### Shared Browser Context

The browser instance stays alive between requests, significantly improving performance:
- First request: ~2-5 seconds (browser launch + page load)
- Subsequent requests: ~1-2 seconds (page load only)

### Manual Cleanup

Always call `close()` when you're done to prevent resource leaks:

```javascript
try {
  await HLTV.init()
  const results = await HLTV.getResults()
  // ... do stuff
} finally {
  await HLTV.close()
}
```

## Cloudflare Protection Status

HLTV.org uses Cloudflare protection on its pages. The stealth plugin helps bypass some of these challenges, but effectiveness varies by endpoint:

### ✅ Working Endpoints
- `/results` - Returns match results successfully
- Other endpoints may work depending on Cloudflare's configuration

### ⚠️ Protected Endpoints
- `/matches` - Currently blocked by stricter Cloudflare challenge
  - The challenge page loads but doesn't complete automatically
  - May require additional bypass techniques or headless=false for manual solving

### Why This Happens
Cloudflare uses various techniques to detect automation:
1. TLS fingerprinting
2. JavaScript challenges
3. Browser behavior analysis
4. IP reputation scoring

The stealth plugin masks many automation signals, but some endpoints have stricter protection that may require:
- Running with `headless: false` (visible browser)
- Using residential proxies
- Adding delays between requests
- Solving CAPTCHA challenges manually or via services

## Testing

Run the test script to verify functionality:

```bash
npm run build
node test-live.js
```

The test will:
1. Initialize the browser
2. Test `getResults()` (should work)
3. Test `getMatches()` (may fail due to Cloudflare)
4. Close the browser

## Installation Requirements

After cloning, install dependencies and Playwright browsers:

```bash
npm install --legacy-peer-deps
npx playwright install chromium
npm run build
```

## Future Improvements

If more endpoints need to bypass stricter Cloudflare protection:

1. **Try headless: false**: Some challenges complete when browser UI is visible
2. **Add delays**: Wait longer between requests to appear more human
3. **Use undetected-chromedriver**: More advanced stealth for Chromium
4. **Implement CAPTCHA solving**: Use services like 2captcha or Anti-Captcha
5. **Rotate user agents**: Change browser fingerprint between requests
6. **Use residential proxies**: Bypass IP-based blocking

## Performance Notes

- Browser launch adds ~1-2 seconds overhead on first request
- Shared context means subsequent requests are faster
- Memory usage: ~150-200MB for browser process
- Recommended: Initialize once, make multiple requests, then close

## Debugging

Enable debug mode to save HTML output:

```javascript
const { fetchHTML } = require('./dist/browser.js')
const fs = require('fs')

const html = await fetchHTML('https://www.hltv.org/results')
fs.writeFileSync('debug.html', html)
```

Check for:
- `challenge-platform` - Cloudflare challenge
- `cf-browser-verification` - Browser verification
- `upcomingMatch` or `result-con` - Expected content selectors
