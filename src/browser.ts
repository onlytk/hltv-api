import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import type { Browser, BrowserContext, Page } from 'playwright-core'

// Add stealth plugin to playwright
chromium.use(stealth())

let browser: Browser | null = null
let context: BrowserContext | null = null

// Cache: url -> { html, timestamp }
const cache: Map<string, { html: string; ts: number }> = new Map()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

// Keep a persistent page alive to maintain cookies/session
let warmPage: Page | null = null

/**
 * Initialize the browser instance
 */
export async function init(): Promise<void> {
  if (browser) {
    return // Already initialized
  }

  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  })

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    javaScriptEnabled: true,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // Warm up: visit HLTV once to pass Cloudflare and establish cookies
  console.log('⏳ Warming up HLTV session...')
  warmPage = await context.newPage()
  await warmPage.goto('https://www.hltv.org', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  // Wait for Cloudflare to pass
  const maxAttempts = 40
  for (let i = 0; i < maxAttempts; i++) {
    const html = await warmPage.content()
    if (!html.includes('challenge-platform') && !html.includes('cf-browser-verification')) {
      console.log('✅ HLTV session warmed up, Cloudflare passed')
      break
    }
    await warmPage.waitForTimeout(500)
  }
}

/**
 * Get HTML content from a URL using the shared browser context
 * Uses cache to avoid hammering HLTV
 */
export async function fetchHTML(url: string): Promise<string> {
  // Check cache first
  const cached = cache.get(url)
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return cached.html
  }

  if (!context) {
    await init()
  }

  const page = await context!.newPage()

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    // Wait for Cloudflare challenge to complete
    const maxAttempts = 40
    const checkInterval = 500

    for (let i = 0; i < maxAttempts; i++) {
      const html = await page.content()

      if (!html.includes('challenge-platform') && !html.includes('cf-browser-verification')) {
        await page.waitForTimeout(1000)
        const finalHtml = await page.content()

        // Cache the result
        cache.set(url, { html: finalHtml, ts: Date.now() })
        return finalHtml
      }

      await page.waitForTimeout(checkInterval)
    }

    // Return what we have even if challenge didn't pass
    const html = await page.content()
    return html

  } finally {
    await page.close()
  }
}

/**
 * Clear the cache (useful if you want fresh data)
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Close the browser instance
 */
export async function close(): Promise<void> {
  if (warmPage) {
    await warmPage.close().catch(() => {})
    warmPage = null
  }

  if (context) {
    await context.close().catch(() => {})
    context = null
  }

  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }

  cache.clear()
}
