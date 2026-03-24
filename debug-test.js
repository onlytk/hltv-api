const HLTV = require('./dist/index.js').default
const fs = require('fs')

async function test() {
  console.log('🔍 Debug test - checking what HTML we get...\n')

  try {
    await HLTV.init()
    console.log('✅ Browser initialized\n')

    // Get the fetchHTML function directly
    const { fetchHTML } = require('./dist/browser.js')
    
    const html = await fetchHTML('https://www.hltv.org/matches')
    fs.writeFileSync('debug-matches.html', html)
    console.log('✅ Saved HTML to debug-matches.html')
    console.log(`HTML length: ${html.length} bytes`)
    console.log(`Contains "upcomingMatch": ${html.includes('upcomingMatch')}`)
    console.log(`Contains "Cloudflare": ${html.includes('Cloudflare')}`)
    console.log(`Contains "challenge": ${html.includes('challenge')}`)
    
    // Also try results
    const resultsHtml = await fetchHTML('https://www.hltv.org/results')
    fs.writeFileSync('debug-results.html', resultsHtml)
    console.log('\n✅ Saved results HTML to debug-results.html')
    console.log(`Results HTML length: ${resultsHtml.length} bytes`)
    console.log(`Contains "result-con": ${resultsHtml.includes('result-con')}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await HLTV.close()
  }
}

test()
