import http from 'http'
import { URL } from 'url'
import { init, close } from './browser'
import { getMatches } from './matches'
import { getMatchById } from './match'
import { getResults } from './results'
import { getTopPlayers } from './players'
import { getPlayerById, getPlayersByName } from './player'
import { getTopTeams } from './teams'
import { getTeamById } from './team'
import getRSS from './rss'

const PORT = parseInt(process.env.PORT || '3000', 10)

function json(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

function error(res: http.ServerResponse, message: string, status = 400) {
  json(res, { error: message }, status)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const params = url.searchParams

  try {
    // GET /api/matches — all upcoming matches
    // GET /api/matches?eventId=1234 — matches for specific event
    if (path === '/api/matches') {
      const eventId = params.get('eventId')
      const data = await getMatches(eventId ? Number(eventId) : undefined)
      return json(res, data)
    }

    // GET /api/matches/live — live matches only
    if (path === '/api/matches/live') {
      const data = await getMatches()
      const live = data.filter((m: any) => m.live)
      return json(res, live)
    }

    // GET /api/matches/upcoming — upcoming matches only
    if (path === '/api/matches/upcoming') {
      const data = await getMatches()
      const upcoming = data.filter((m: any) => !m.live)
      return json(res, upcoming)
    }

    // GET /api/match/:id — specific match details
    const matchIdMatch = path.match(/^\/api\/match\/(\d+)$/)
    if (matchIdMatch) {
      const data = await getMatchById(Number(matchIdMatch[1]))
      return json(res, data)
    }

    // GET /api/results — recent results
    if (path === '/api/results') {
      const data = await getResults()
      return json(res, data)
    }

    // GET /api/players — top players
    if (path === '/api/players') {
      const data = await getTopPlayers()
      return json(res, data)
    }

    // GET /api/player/:id — player by id
    const playerIdMatch = path.match(/^\/api\/player\/(\d+)$/)
    if (playerIdMatch) {
      const data = await getPlayerById(Number(playerIdMatch[1]))
      return json(res, data)
    }

    // GET /api/players/search?name=s1mple — search players
    if (path === '/api/players/search') {
      const name = params.get('name')
      if (!name) return error(res, 'Missing ?name= parameter')
      const data = await getPlayersByName(name)
      return json(res, data)
    }

    // GET /api/teams — top teams
    if (path === '/api/teams') {
      const data = await getTopTeams()
      return json(res, data)
    }

    // GET /api/team/:id — team by id
    const teamIdMatch = path.match(/^\/api\/team\/(\d+)$/)
    if (teamIdMatch) {
      const data = await getTeamById(Number(teamIdMatch[1]))
      return json(res, data)
    }

    // GET /api/news — RSS news
    if (path === '/api/news') {
      const data = await getRSS('news')
      return json(res, data)
    }

    // GET / — API docs
    if (path === '/') {
      return json(res, {
        name: 'HLTV API',
        version: '3.1.0',
        endpoints: [
          'GET /api/matches — all matches (live + upcoming)',
          'GET /api/matches?eventId=1234 — matches for event',
          'GET /api/matches/live — live matches only',
          'GET /api/matches/upcoming — upcoming only',
          'GET /api/match/:id — match details with stats',
          'GET /api/results — recent results',
          'GET /api/players — top players',
          'GET /api/player/:id — player details',
          'GET /api/players/search?name=s1mple — search players',
          'GET /api/teams — top teams ranking',
          'GET /api/team/:id — team details',
          'GET /api/news — latest news (RSS)',
        ],
      })
    }

    error(res, 'Not found', 404)
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Error on ${path}:`, err.message)
    error(res, err.message, 500)
  }
})

async function start() {
  console.log('🚀 Initializing browser...')
  await init()
  console.log('✅ Browser ready')

  server.listen(PORT, () => {
    console.log(`\n🎮 HLTV API running on http://localhost:${PORT}`)
    console.log(`📖 Docs: http://localhost:${PORT}/`)
    console.log('\nEndpoints:')
    console.log('  GET /api/matches')
    console.log('  GET /api/matches/live')
    console.log('  GET /api/matches/upcoming')
    console.log('  GET /api/match/:id')
    console.log('  GET /api/results')
    console.log('  GET /api/players')
    console.log('  GET /api/player/:id')
    console.log('  GET /api/players/search?name=...')
    console.log('  GET /api/teams')
    console.log('  GET /api/team/:id')
    console.log('  GET /api/news')
  })
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  await close()
  server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await close()
  server.close()
  process.exit(0)
})

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
