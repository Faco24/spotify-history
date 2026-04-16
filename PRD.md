# PRD — Spotify Listening History Visualizer
**Status:** v1.0 built and working  
**Repo:** https://github.com/Faco24/spotify-history  
**Last updated:** 2026-04-16

---

## 1. Project Overview

A fully client-side React web app that lets the user drag-and-drop their Spotify **Extended Streaming History** JSON files and visualize 12+ years of listening data in a premium, Spotify-themed dashboard. No backend, no API calls, no data leaves the browser.

### To run locally
```bash
npm install
npm start       # opens at http://localhost:5173
```

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Charts | Recharts 3 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) + inline styles |
| Date helpers | date-fns 4 (installed, minimal use) |
| Build | Vite (ESM, no backend) |
| Hosting | Local only (`npm start`) |

**Key design constraint:** Everything runs in the browser. No server, no database, no API keys required.

---

## 3. Input Data Format

Spotify's **Extended Streaming History** (requested via Spotify Privacy settings, delivered as a ZIP after ~30 days). The user gets multiple files named `Streaming_History_Audio_YYYY_N.json`.

### Schema (new Extended format)
Each file is a JSON array. Each entry is an object with these fields:

```json
{
  "ts": "2022-04-15T14:30:00Z",
  "username": "faco24",
  "platform": "Android OS 12",
  "ms_played": 234500,
  "conn_country": "CL",
  "ip_addr_decrypted": "...",
  "user_agent_decrypted": null,
  "master_metadata_track_name": "Song Name",
  "master_metadata_album_artist_name": "Artist Name",
  "master_metadata_album_album_name": "Album Name",
  "spotify_track_uri": "spotify:track:XXXXXXXXXXXXXXXXXXXXXXXX",
  "episode_name": null,
  "episode_show_name": null,
  "spotify_episode_uri": null,
  "reason_start": "trackdone",
  "reason_end": "trackdone",
  "shuffle": false,
  "skipped": null,
  "offline": false,
  "offline_timestamp": 0,
  "incognito_mode": false
}
```

### Key field semantics
- **`ts`** — UTC timestamp when the track **stopped** playing. Format varies: `"YYYY-MM-DDTHH:MM:SSZ"` (ISO 8601) or `"YYYY-MM-DD HH:MM:SS"` (space-separated). Both must be handled.
- **`ms_played`** — milliseconds the stream was actually played (not track duration)
- **Music entries** — identified by `master_metadata_track_name != null`
- **Podcast entries** — identified by `episode_name != null`
- **Entries with both null** — ignored entirely

### Legacy format (also supported)
Older Spotify exports use a different schema with `endTime`, `msPlayed`, `artistName`, `trackName`. The app auto-detects and remaps these so mixed file drops work.

---

## 4. Data Processing Architecture

All processing happens once in `src/utils/dataProcessor.js` → `processData(rawEntries)`. Components never recalculate — they only read pre-computed results.

### Processing pipeline
1. **Normalize** — remap old-format entries to new schema
2. **Coerce** — `ms_played` → `Number()` to handle string/null variants
3. **Filter invalids** — drop entries with null/unparseable `ts` or negative `ms_played`
4. **Deduplicate** — by `ts + spotify_track_uri` key
5. **Split** — separate `music[]` and `podcasts[]` arrays
6. **30-second filter** — drop entries with `ms_played < 30000` (not really listened)
7. **Pre-compute all aggregations** — all charts, rankings, stats computed here and returned as one big object

### Critical `parseTS` function
```js
function parseTS(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const withT = ts.trim().replace(' ', 'T');
  const iso = withT.endsWith('Z') ? withT : withT + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
```
**Never add `'Z'` if it's already there** — this was a critical bug fix. ISO-format timestamps with existing `Z` would become `...ZZ` → Invalid Date → every entry filtered out → all zeros on dashboard.

### Returned data shape (abbreviated)
```js
{
  // Metadata
  totalEntries, musicEntries, podcastEntries,
  totalHours, workweeksCount, firstDate, lastDate,
  uniqueArtistsCount, uniqueTracksCount, uniqueAlbumsCount,
  years[],

  // All-time tops
  topArtists[],   // [{name, ms, plays}] top 10
  topAlbums[],    // [{name, ms, plays, artist, album}] top 10
  topTracks[],    // [{name, ms, plays, artist, album}] top 10

  // Per-year
  yearlyHours[],          // [{year, hours, plays}]
  yearlyTop1Artist[],     // [{year, artist, hours}]
  yearlyTop1Track[],      // [{year, track, artist, plays}]

  // Loyalty
  loyaltyScores[],  // [{artist, yearsActive, score}] top 10

  // Streak
  longestStreak, bestStreakStart, bestStreakEnd,
  bestDay, bestDayHours, bestDayTracks[],

  // Time series
  monthlySeries[],   // [{month: "YYYY-MM", hours}]

  // Heatmap [7][24] — hours by day-of-week × hour-of-day (UTC)
  heatmap,

  // Platform
  platformByYear[],  // [{year, Android, iOS, Mac, Windows, ...}]
  allPlatforms[],

  // Behavioral
  offlineByYear[], shuffleByYear[],
  skipRates[], mostSkipped[], leastSkipped[],
  reasonStartBreakdown[], reasonEndBreakdown[],
  lateNightByYear[],
  weekendHours, weekdayHours,
  seasonalData[],
  countryData[],
  incognitoByYear[],

  // Fun stats
  topLateNightArtist[], comfortFood[], ghostTracks[],
  patientTracks[], instantSkip[],
  podcastMusicByYear[], oneHitWonders[],
  rabbitHoles[], obsessionPhases[],

  // For search tab (raw data)
  raw: { music[], podcasts[] },
  artistMap,  // Map<name, {ms, plays}>
  trackMap,   // Map<uri, {ms, plays, name, artist}>
  top5ByYear[],
}
```

---

## 5. File Structure

```
src/
├── App.jsx                      # Tab router + file loading state machine
├── index.css                    # Global styles + Tailwind import
├── main.jsx                     # React root
├── components/
│   ├── Card.jsx                 # Reusable Card, StatNumber, RankList, SectionHeader, COLORS
│   ├── DataLoader.jsx           # Drag-and-drop file upload screen
│   ├── WrappedDashboard.jsx     # Tab 1: All-Time Wrapped
│   ├── EvolutionSection.jsx     # Tab 2: Evolution Over Time
│   ├── DeviceSection.jsx        # Tab 3: Devices & Platforms
│   ├── BehaviorSection.jsx      # Tab 4: Behavioral Insights
│   ├── SearchSection.jsx        # Tab 5: Search & Explore
│   └── FunStatsSection.jsx      # Tab 6: Fun Stats
└── utils/
    └── dataProcessor.js         # All data processing (single export: processData)
```

---

## 6. UI Structure

### Global layout
- **Dark theme** — `#191414` background, `#121212` header/nav, `#282828` cards
- **Spotify green** — `#1DB954` for accents, active states, highlights
- **Sticky header** with logo + "Load new files" button
- **Sticky tab bar** below header — 6 tabs
- **Max-width 1280px** centered content

### Tab 1 — All-Time Wrapped (`WrappedDashboard.jsx`)
- Summary stats row: total hours, streams, unique artists/tracks/albums, work-weeks
- "If this were a job" card — total hours converted to 40h work-weeks
- Top 10 Artists / Albums / Tracks — ranked by hours, with inline progress bars (3-column grid)
- Listening hours per year — bar chart (Recharts `BarChart`)
- Monthly listening time series — line chart with 3-month moving average trend overlay
- **#1 Artist & Track by year table** — 4 columns: Year | Hours | #1 Artist (by time) | #1 Track. Track artist shown as grey subtitle only when different from #1 artist (fixes double-artist display bug)
- Loyalty Score — top 10 artists ranked by `yearsActive × log10(totalHours)`
- Longest listening streak card (consecutive days)
- Most listened single day card (date + hours + top 5 tracks that day)

### Tab 2 — Evolution (`EvolutionSection.jsx`)
- **Bump chart** — top 5 artists ranked year-by-year (y-axis inverted, #1 at top). Only shows artists who appeared in top 5 in ≥2 years. Built with Recharts `LineChart`.
- **Listening heatmap** — 7 rows (days of week) × 24 columns (hours). Color intensity = total hours. Custom CSS grid, not a Recharts component.
- **Obsession phases** — list of artist-month pairs where listening was 3× the artist's monthly average AND ≥5 hours

### Tab 3 — Devices & Platforms (`DeviceSection.jsx`)
- Platform stacked area chart by year (Android/iOS/Mac/Windows/Web/Chromecast/etc.)
- Offline vs Online listening % per year (stacked bar)
- Shuffle mode % per year (line chart)
- Incognito mode % per year (bar chart)

### Tab 4 — Behavior (`BehaviorSection.jsx`)
- Most skipped artists (min 20 plays) — skip rate % bar
- Least skipped artists (min 20 plays) — skip rate % bar
- How tracks start — `reason_start` breakdown (horizontal bars)
- How tracks end — `reason_end` breakdown
- Late Night Index — % of listening midnight–5am per year
- Weekend vs Weekday total hours (horizontal bar chart)
- Seasonal patterns — hours by Winter/Spring/Summer/Fall
- Country analysis — top streaming countries by hours
- Rabbit Holes — sessions of 10+ consecutive plays of the same artist (with 30-min gap tolerance)

### Tab 5 — Search & Explore (`SearchSection.jsx`)
- Toggle: Artist / Track search
- On artist search: total plays, total hours, first listen date, avg time of day, plays-per-year bar chart, platforms used
- On track search: same stats minus platforms
- **Avg time of day** — uses `tsToDate()` helper that handles both ISO and space-separated timestamps (critical bug fix — naive parsing produced `NaN` → `NaN || 12` → always "12 AM")

### Tab 6 — Fun Stats (`FunStatsSection.jsx`)
- 🌙 The 3am Artist — top artists listened to 2–5am UTC
- 🍕 Comfort Food — tracks played in ≥60% of active years
- 👻 Ghost Tracks — 30+ plays, ≥70% via shuffle/autoplay
- ⏳ Most Patient — tracks with highest avg ms_played per listen (min 5 plays)
- ⏭️ Instant Skip — tracks with lowest avg ms_played per listen (min 5 plays)
- ☄️ One-Hit Wonders — artists played heavily for exactly one month
- Podcasts vs Music — stacked bar chart by year

---

## 7. Reusable Components (`Card.jsx`)

```jsx
<Card title="..." accent={bool} style={{}}>   // base container
<StatNumber value="..." label="..." green />   // big number display
<RankList items={[]} labelKey valueKey valueFormat />  // ranked list with bars
<SectionHeader title subtitle />

// Shared constants
COLORS[]       // 12-color palette for charts
tooltipStyle   // standard dark tooltip object
```

---

## 8. Platform Normalization

`normalizePlatform(p)` in `dataProcessor.js` maps raw Spotify platform strings to clean categories:

| Raw (examples) | Normalized |
|---|---|
| "Android OS 12", "android" | Android |
| "iOS 16", "iPhone OS" | iOS |
| "Windows 11", "windows" | Windows |
| "OS X", "macOS", "Mac" | Mac |
| "web_player", "browser" | Web |
| "Google Chromecast" | Chromecast |
| "Linux" | Linux |
| "Smart TV", "Samsung TV" | Smart TV |
| anything else | Other |

---

## 9. Known Bugs Fixed

### Bug 1: `Cannot read properties of undefined (reading 'NaN')`
- **Cause:** `heatmap[d.getUTCDay()]` where `d` was an Invalid Date → `NaN` index → `undefined[NaN]`
- **Root cause:** `parseTS` was calling `.replace(' ', 'T') + 'Z'` on already-ISO timestamps → double `Z` → Invalid Date
- **Fix:** Check if string ends with `Z` before appending it

### Bug 2: All stats showing zero
- **Cause:** Same double-Z bug caused `parseTS` to return null for ALL entries → entire dataset filtered out
- **Fix:** Same as above — the `parseTS` rewrite fixed both bugs simultaneously

### Bug 3: Search "Avg time of day" always showing "12 AM"
- **Cause:** `SearchSection.jsx` had its own inline date parsing that also did `+ 'Z'` unconditionally → `NaN` hours → `NaN % 12` → `NaN || 12 = 12` (NaN is falsy in JS) → always "12 AM"
- **Fix:** Extracted `tsToDate()` helper in SearchSection with same safe-Z logic

### Bug 4: Year table showing artist name twice
- **Cause:** Table had 5 columns: Year | Hours | #1 Artist | #1 Track | Artist-of-track. When #1 artist and track artist were the same person, the name appeared in both column 3 and column 5.
- **Fix:** Merged into 4 columns. Track artist now appears as a grey subtitle under the track name, only rendered when it differs from #1 Artist.

---

## 10. Design Decisions & Constraints

- **All times are UTC** — Spotify stores `ts` as UTC. All hour-of-day calculations use `.getUTCHours()`. This means "3am artist" is 3am UTC, not local time.
- **30-second minimum** — entries with `ms_played < 30000` are excluded from all analyses. This filters out accidental plays, previews, and skips.
- **Deduplication** — entries with the same `ts + uri` are deduplicated (handles re-exporting the same period multiple times)
- **Loyalty score formula** — `yearsActive × log10(1 + totalHours)` — rewards consistency over raw volume
- **Ghost tracks threshold** — 30+ plays AND ≥70% via shuffle/autoplay
- **Obsession phases threshold** — 3× monthly average AND ≥5 hours in that month
- **Rabbit hole detection** — 10+ consecutive same-artist plays with <30 min gap between plays
- **Comfort food threshold** — present in ≥60% of active years (and ≥3 years minimum)

---

## 11. What Is NOT Yet Built

The following features were specified in the original brief but not yet implemented:

### Missing analyses
- [ ] **Rabbit holes detection in Behavior tab** — logic exists in `dataProcessor.js`, card exists in `BehaviorSection.jsx`, but the `rabbitHoles` data may not display correctly (needs QA)
- [ ] **"Reason start/end over time"** — currently shows all-time aggregate, not year-by-year trend
- [ ] **Top 5 artist bump chart polish** — currently works but may need label overlays on the lines for readability

### Missing UI features
- [ ] **Export / share** — no way to screenshot or share a specific stat card
- [ ] **Date range filter** — no way to filter the entire dashboard to a custom year range
- [ ] **Mobile layout** — app is desktop-first; some charts overflow on small screens
- [ ] **Loading progress bar** — currently just shows text; no visual progress indicator
- [ ] **Empty state handling** — if search returns no results, UX is minimal

### Performance
- [ ] **Virtualized lists** — long lists (e.g., 200k entries in Search) are not virtualized
- [ ] **Web Worker** — `processData()` runs on the main thread and can freeze the UI for 2–5 seconds on large datasets; should be moved to a Web Worker

---

## 12. Possible Next Features

Ordered by user value:

1. **Date range filter** — slider or year picker to filter the whole dashboard to a time window
2. **Web Worker for processing** — move `processData()` off the main thread to prevent UI freeze
3. **Export stats as image** — "share your wrapped" card export
4. **Mobile responsive layout** — current layout breaks on phones
5. **"Listening sessions" analysis** — detect contiguous listening sessions and analyze session length over time
6. **Genre analysis** — requires Spotify API lookup (can't be inferred from the data alone)
7. **Listening clock** — radial chart of hours by time of day (polar area chart)
8. **Comparison mode** — if user has multiple Spotify accounts' data, compare them

---

## 13. Handoff Notes for Next Agent

1. **Read `src/utils/dataProcessor.js` first** — it is the single source of truth for all data shapes. Every component just destructures from `data` prop which is the return value of `processData()`.
2. **Do not add new aggregations inside components** — if a new stat is needed, add it to `dataProcessor.js` and pass it through the data object.
3. **The `parseTS` function is critical** — any code that parses timestamps must use this function or the identical `tsToDate()` helper in `SearchSection.jsx`. Never use `new Date(ts + 'Z')` directly.
4. **All times are UTC** — use `.getUTCHours()`, `.getUTCDay()`, `.getUTCFullYear()`, etc., not the local-time equivalents.
5. **Styling convention** — the project uses inline `style={{}}` objects for component-specific styles and Tailwind utility classes for layout. `Card.jsx` exports the reusable primitives; prefer those over custom containers.
6. **Chart library** — Recharts. All charts use `<ResponsiveContainer>` for sizing. Custom tooltips use `tooltipStyle` from `Card.jsx`.
7. **The bump chart in EvolutionSection** — the Y-axis is inverted (`reversed` prop) so rank #1 appears at the top.
