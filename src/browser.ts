import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import type { Browser, BrowserContext } from 'playwright-core'

// Add stealth plugin to playwright
chromium.use(stealth())

let browser: Browser | null = null
let context: BrowserContext | null = null

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
}

/**
 * Get HTML content from a URL using the shared browser context
 */
export async function fetchHTML(url: string): Promise<string> {
  if (!context) {
    await init()
  }

  const page = await context!.newPage()
  
  try {
    // Navigate to the page
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    })
    
    // If we got a response, wait for the page to stabilize
    if (response) {
      // Wait for network to be mostly idle
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        // Ignore timeout, continue anyway
      })
    }
    
    // Wait for Cloudflare challenge to complete
    const maxAttempts = 40
    const checkInterval = 500
    
    for (let i = 0; i < maxAttempts; i++) {
      const html = await page.content()
      
      // Check if we're past the Cloudflare challenge
      if (!html.includes('challenge-platform') && !html.includes('cf-browser-verification')) {
        // Success! Wait a tiny bit more for final rendering
        await page.waitForTimeout(1000)
        return await page.content()
      }
      
      // Still in challenge, wait and retry
      await page.waitForTimeout(checkInterval)
    }
    
    // Timeout waiting for challenge - return what we have
    return await page.content()
    
  } finally {
    await page.close()
  }
}

/**
 * Close the browser instance
 */
export async function close(): Promise<void> {
  if (context) {
    await context.close()
    context = null
  }
  
  if (browser) {
    await browser.close()
    browser = null
  }
}
