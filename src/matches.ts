import cheerio from 'cheerio'
import { fetchHTML } from './browser'
import { CONFIG, MAPS } from './config'

interface IEvent {
  name: string
  logo: string
}

interface ITeam {
  id: number
  name: string
  logo: string
}

interface IMatch {
  id: number
  time: string
  event: IEvent
  stars: number
  maps: string
  teams: ITeam[]
  live: boolean
}

export async function getMatches(eventId?: number) {
  const url =
    eventId !== undefined
      ? `${CONFIG.BASE}/events/${eventId}/${CONFIG.MATCHES}`
      : `${CONFIG.BASE}/${CONFIG.MATCHES}`

  try {
    const body = await fetchHTML(url)

    const $ = cheerio.load(body, {
      normalizeWhitespace: true,
    })

    const matches: IMatch[] = []

    // New HLTV structure uses .match-wrapper divs
    $('.match-wrapper').each((_i, element) => {
      const el = $(element)

      const id = Number(el.attr('data-match-id'))
      const stars = Number(el.attr('data-stars') || 0)
      const isLive = el.attr('live') === 'true'
      const team1Id = Number(el.attr('team1'))
      const team2Id = Number(el.attr('team2'))

      // Time from data-zonedgrouping-entry-unix on parent or match-time element
      const timeUnix = el.find('.match-time').attr('data-unix')
      const time = timeUnix
        ? new Date(parseInt(timeUnix, 10)).toISOString()
        : new Date().toISOString()

      // Event info
      const eventEl = el.find('.match-event')
      const eventName = eventEl.attr('data-event-headline') || eventEl.text().trim()
      const eventLogo = eventEl.find('.match-event-logo.day-only').attr('src') || ''

      // Map info
      const mapText = el.find('.match-meta').not('.match-meta-live').text().trim()
      const map: keyof typeof MAPS = mapText as any

      // Teams - live matches use .match-team without team1/team2 classes
      const teamEls = el.find('.match-team').not('.match-teams')
      const team1El = teamEls.eq(0)
      const team2El = teamEls.eq(1)
      const team1Name = team1El.find('.match-teamname').text().trim() || 'TBD'
      const team1Logo = team1El.find('.match-team-logo.day-only, .match-team-logo').first().attr('src') || ''
      const team2Name = team2El.find('.match-teamname').text().trim() || 'TBD'
      const team2Logo = team2El.find('.match-team-logo.day-only, .match-team-logo').first().attr('src') || ''

      if (!id) return

      const response: IMatch = {
        id,
        time,
        event: {
          name: eventName,
          logo: eventLogo,
        },
        stars,
        maps: MAPS[map] || mapText || 'TBD',
        teams: [
          { id: team1Id, name: team1Name, logo: team1Logo },
          { id: team2Id, name: team2Name, logo: team2Logo },
        ],
        live: isLive,
      }

      matches.push(response)
    })

    if (!matches.length) {
      throw new Error(
        'There are no matches available, something went wrong. Please contact the library maintainer on https://github.com/dajk/hltv-api'
      )
    }

    return matches
  } catch (error) {
    throw new Error(error as any)
  }
}
