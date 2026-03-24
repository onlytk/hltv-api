# HLTV API

REST API for [HLTV.org](https://www.hltv.org) CS2 esports data. Uses Playwright with stealth to bypass Cloudflare protection.

## Setup

```bash
npm install --legacy-peer-deps
npx playwright install chromium
npm run build
```

## Run

```bash
npm start
# → http://localhost:3000
```

Custom port:
```bash
PORT=8080 npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/matches` | All matches (live + upcoming) |
| `GET /api/matches?eventId=1234` | Matches for a specific event |
| `GET /api/matches/live` | Live matches only |
| `GET /api/matches/upcoming` | Upcoming matches only |
| `GET /api/match/:id` | Match details with player stats |
| `GET /api/results` | Recent match results |
| `GET /api/players` | Top player rankings |
| `GET /api/player/:id` | Player details |
| `GET /api/players/search?name=s1mple` | Search players by name |
| `GET /api/teams` | Team rankings |
| `GET /api/team/:id` | Team details with roster |
| `GET /api/news` | Latest HLTV news |

## Example Response

### `GET /api/matches/live`

```json
[
  {
    "id": 2391946,
    "time": "2026-03-24T11:00:00.000Z",
    "event": {
      "name": "ROG JOURNEY Spring 2026",
      "logo": "https://img-cdn.hltv.org/..."
    },
    "stars": 0,
    "maps": "bo3",
    "teams": [
      { "id": 12604, "name": "Johnny Speeds", "logo": "..." },
      { "id": 13364, "name": "Famalicão", "logo": "..." }
    ],
    "live": true
  }
]
```

## Use as Library

```javascript
const hltv = require('./dist/index').default;
const { init, close } = require('./dist/browser');

(async () => {
  await init();
  
  const matches = await hltv.getMatches();
  const results = await hltv.getResults();
  const teams = await hltv.getTopTeams();
  
  console.log(matches);
  
  await close();
})();
```

## Tech Stack

- **Playwright** + stealth plugin — headless browser for Cloudflare bypass
- **Cheerio** — HTML parsing
- **TypeScript** — type-safe source

## License

MIT
