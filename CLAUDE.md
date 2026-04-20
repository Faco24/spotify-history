# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # dev server at http://localhost:5173 (alias for `npm run dev`)
npm run build    # production build into dist/
npm run lint     # ESLint
```

No test suite exists yet.

## What This App Does

Client-side React app that visualizes Spotify Extended Streaming History. The user drag-drops their `Streaming_History_Audio_*.json` files; everything is parsed and computed in the browser — no backend. Optional genre analysis makes one API call to Anthropic using the user's own key.

## Architecture

### Data flow (read this first)

**Step 1 — Web Worker.** `App.jsx` spawns `src/workers/processWorker.js` (a Web Worker) in `handleFiles` and posts the raw entries array to it. The worker calls `processData()` off the main thread and posts back `{ ok, result }`. Do not call `processData()` directly from a component or the main thread.

**Step 2 — Primary processing.** `processData(rawEntries[])` in `src/utils/dataProcessor.js` returns a single large object that every component reads via a `data` prop. Components never recompute — they only destructure from `data`.

**Step 3 — Genre data (opt-in).** If the user supplies an Anthropic API key, `App.jsx` sends the top-50 artist names to Claude Haiku 4.5 and gets back a `{ [artist]: genre }` map. It then calls `computeGenreData(data, genreMap)` — a second export in `dataProcessor.js` — and merges the result into app state via `setData(prev => ({ ...prev, ...genreData }))`. This is the **only exception** to the "processData is the single source of truth" rule.

`App.jsx` owns the state machine: no data → `<DataLoader>` → loading spinner → tab dashboard. The `data` object is passed down to whichever tab component is active.

### Critical invariants

**`parseTS(ts)`** — the only safe way to parse Spotify timestamps. Spotify files use two formats: `"YYYY-MM-DD HH:MM:SS"` and `"YYYY-MM-DDTHH:MM:SSZ"`. The function normalizes both. Never use `new Date(ts + 'Z')` directly — if `ts` already ends with `Z` this produces `...ZZ` → Invalid Date → silent data loss.

**All times are UTC.** Use `.getUTCHours()`, `.getUTCDay()`, `.getUTCFullYear()` everywhere. Never use local-time equivalents.

**`SearchSection.jsx`** has its own copy of this logic as `tsToDate()` — keep them in sync if `parseTS` changes.

### Adding a new stat or chart

1. Add the aggregation to `processData()` in `dataProcessor.js` and include it in the returned object. **Exception:** if the stat depends on genre labels, add it to `computeGenreData()` instead — `processData` runs before the user opts into genre analysis.
2. Destructure it in the relevant tab component — do not compute inside a component.
3. Use `<Card>`, `<RankList>`, `<StatNumber>` from `Card.jsx` for consistent styling.
4. Use `tooltipStyle` from `Card.jsx` for custom Recharts tooltips.
5. Wrap all charts in `<ResponsiveContainer>`.

### Data shape key points

- **Music entries**: `master_metadata_track_name != null`
- **Podcast entries**: `episode_name != null`
- **30-second filter**: entries with `ms_played < 30000` are excluded everywhere
- **Old-format support**: legacy files use `endTime`/`msPlayed`/`artistName` — `normalizeEntry()` remaps these before any processing

### Styling convention

Inline `style={{}}` for component-specific styles. Tailwind utility classes for layout only. Spotify palette: `#191414` bg, `#121212` header, `#282828` cards, `#1DB954` green, `#B3B3B3` subtext. Color array for multi-series charts: `COLORS` exported from `Card.jsx`.
